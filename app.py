from flask import Flask, jsonify, render_template, request
import requests
import xml.etree.ElementTree as ET
import re
import os
import time

app = Flask(__name__)

# Feed URL
FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# In-memory cache for release notes
cache = {
    'data': None,
    'last_fetched': 0,
    'expiry': 300 # 5 minutes cache expiry
}

def parse_updates(date, content_html, base_link):
    """
    Parse HTML content of a day's entry and split it by <h3> tags 
    to extract individual release note updates.
    """
    # Find all <h3>Tags</h3> to split the content into individual updates
    matches = list(re.finditer(r'<h3>(.*?)</h3>', content_html, re.IGNORECASE))
    
    updates = []
    
    # Simple HTML tag stripper for text summaries
    def strip_tags(html_str):
        # Replace <a> tags with text + url in parentheses if possible, or just remove tags
        text = re.sub(r'<a[^>]*href=["\']([^"\']*)["\'][^>]*>(.*?)</a>', r'\2 (\1)', html_str)
        # Strip all other HTML tags
        text = re.sub(r'<[^>]+>', '', text)
        # Replace multiple spaces/newlines
        text = re.sub(r'\s+', ' ', text).strip()
        # Unescape basic HTML entities
        text = text.replace('&nbsp;', ' ').replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>').replace('&quot;', '"')
        return text

    for i, match in enumerate(matches):
        update_type = match.group(1).strip()  # e.g., "Feature", "Issue", "Announcement"
        start_idx = match.end()
        end_idx = matches[i+1].start() if i + 1 < len(matches) else len(content_html)
        update_html = content_html[start_idx:end_idx].strip()
        
        # Clean HTML slightly (ensure target="_blank" on links)
        clean_html = re.sub(r'<a\s+(?!.*?target=)', r'<a target="_blank" ', update_html)
        
        # Generate a plain text summary for tweet suggestions
        text_summary = strip_tags(update_html)
        
        # Unique ID for the update card
        update_id = f"{date.replace(' ', '_').replace(',', '')}_{i}"
        
        updates.append({
            'id': update_id,
            'date': date,
            'type': update_type,
            'content_html': clean_html,
            'text_summary': text_summary,
            'link': base_link
        })
        
    # Fallback if no <h3> tags found
    if not updates and content_html.strip():
        text_summary = strip_tags(content_html)
        updates.append({
            'id': f"{date.replace(' ', '_').replace(',', '')}_0",
            'date': date,
            'type': 'Update',
            'content_html': content_html,
            'text_summary': text_summary,
            'link': base_link
        })
        
    return updates

def fetch_and_parse_feed(force_refresh=False):
    """
    Fetch the XML feed from Google Cloud docs and parse it.
    Uses cached data if it's still fresh and force_refresh is False.
    """
    current_time = time.time()
    
    if not force_refresh and cache['data'] is not None and (current_time - cache['last_fetched'] < cache['expiry']):
        return cache['data'], True # True indicating cached response
        
    try:
        # Fetch RSS Feed
        response = requests.get(FEED_URL, timeout=10)
        response.raise_for_status()
        xml_content = response.text
        
        # Parse Atom XML
        root = ET.fromstring(xml_content)
        # Atom Namespace
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        
        all_updates = []
        
        for entry in root.findall('atom:entry', ns):
            date_str = entry.find('atom:title', ns).text  # e.g., "June 17, 2026"
            content_el = entry.find('atom:content', ns)
            content_html = content_el.text if content_el is not None else ""
            
            # Extract link
            link_el = entry.find("atom:link[@rel='alternate']", ns)
            link = link_el.attrib.get('href') if link_el is not None else "https://cloud.google.com/bigquery/docs/release-notes"
            
            # Parse individual updates inside this entry
            day_updates = parse_updates(date_str, content_html, link)
            all_updates.extend(day_updates)
            
        # Update cache
        cache['data'] = all_updates
        cache['last_fetched'] = current_time
        return all_updates, False # False indicating fresh response
        
    except Exception as e:
        print(f"Error fetching feed: {e}")
        # Return cache if available even if expired, otherwise return empty list with error
        if cache['data'] is not None:
            return cache['data'], True
        raise e

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases', methods=['GET'])
def get_releases():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    try:
        updates, is_cached = fetch_and_parse_feed(force_refresh)
        return jsonify({
            'status': 'success',
            'cached': is_cached,
            'timestamp': cache['last_fetched'],
            'count': len(updates),
            'updates': updates
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f"Failed to retrieve release notes: {str(e)}"
        }), 500

if __name__ == '__main__':
    # Bind to all interfaces for local network access if needed
    app.run(debug=True, port=5000)
