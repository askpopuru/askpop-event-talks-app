// State Management
let releaseNotes = [];
let filteredNotes = [];
let selectedNotes = [];
let currentFilter = 'all';
let currentSearch = '';
let currentPreset = 'news';

// Constants
const CHAR_LIMIT = 280;
const TWEET_TAGS = ' #BigQuery #GoogleCloud';

// DOM Elements
const refreshBtn = document.getElementById('refresh-btn');
const refreshSpinner = document.getElementById('refresh-spinner');
const cacheIndicator = document.getElementById('cache-indicator');
const lastUpdatedText = document.getElementById('last-updated-text');
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search');
const filterPillsContainer = document.getElementById('filter-pills-container');
const releaseCardsContainer = document.getElementById('release-cards');

const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const emptyState = document.getElementById('empty-state');
const errorMessageEl = document.getElementById('error-message');
const retryBtn = document.getElementById('retry-btn');
const resetFiltersBtn = document.getElementById('reset-filters-btn');

// Stats Elements
const statTotal = document.getElementById('stat-total');
const statFeatures = document.getElementById('stat-features');
const statAnnouncements = document.getElementById('stat-announcements');
const statBreaking = document.getElementById('stat-breaking');
const statIssues = document.getElementById('stat-issues');
const statCards = document.querySelectorAll('.stat-card');

// Composer Elements
const selectedListContainer = document.getElementById('selected-list');
const tweetTextarea = document.getElementById('tweet-textarea');
const charCountEl = document.getElementById('char-count');
const charWarningEl = document.getElementById('char-warning');
const clearComposerBtn = document.getElementById('clear-composer');
const formatShortBtn = document.getElementById('format-short-btn');
const addHashtagsBtn = document.getElementById('add-hashtags-btn');
const tweetBtn = document.getElementById('tweet-btn');
const presetButtons = document.querySelectorAll('.preset-btn');

// Toast Notification Helper
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '⚠️';
    
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);
    
    // Auto remove after 3.5s
    setTimeout(() => {
        toast.style.animation = 'toastIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// Format Unix Timestamp
function formatTime(timestamp) {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// Fetch Release Notes from API
async function fetchReleases(forceRefresh = false) {
    showLoading();
    refreshSpinner.classList.remove('paused');
    
    try {
        const url = `/api/releases?refresh=${forceRefresh}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Server returned status ${response.status}`);
        }
        
        const data = await response.json();
        if (data.status === 'success') {
            releaseNotes = data.updates;
            
            // UI updates
            if (data.cached) {
                cacheIndicator.classList.remove('hidden');
            } else {
                cacheIndicator.classList.add('hidden');
                showToast('Release notes fetched live from Google Cloud feed!');
            }
            
            lastUpdatedText.textContent = `Updated: ${formatTime(data.timestamp)}`;
            updateStats();
            applyFiltersAndRender();
        } else {
            throw new Error(data.message || 'Unknown error occurred');
        }
    } catch (error) {
        console.error('Error fetching release notes:', error);
        showError(error.message);
        showToast('Failed to update release notes', 'error');
    } finally {
        refreshSpinner.classList.add('paused');
    }
}

// View States Controllers
function showLoading() {
    loadingState.classList.remove('hidden');
    errorState.classList.add('hidden');
    emptyState.classList.add('hidden');
    releaseCardsContainer.classList.add('hidden');
}

function showError(message) {
    loadingState.classList.add('hidden');
    errorState.classList.remove('hidden');
    emptyState.classList.add('hidden');
    releaseCardsContainer.classList.add('hidden');
    errorMessageEl.textContent = message || 'Failed to fetch release notes.';
}

function showEmpty() {
    loadingState.classList.add('hidden');
    errorState.classList.add('hidden');
    emptyState.classList.remove('hidden');
    releaseCardsContainer.classList.add('hidden');
}

function showContent() {
    loadingState.classList.add('hidden');
    errorState.classList.add('hidden');
    emptyState.classList.add('hidden');
    releaseCardsContainer.classList.remove('hidden');
}

// Stats counter update
function updateStats() {
    statTotal.textContent = releaseNotes.length;
    statFeatures.textContent = releaseNotes.filter(n => n.type === 'Feature').length;
    statAnnouncements.textContent = releaseNotes.filter(n => n.type === 'Announcement').length;
    statBreaking.textContent = releaseNotes.filter(n => n.type === 'Breaking').length;
    statIssues.textContent = releaseNotes.filter(n => n.type === 'Issue').length;
}

// Filter and search logic
function applyFiltersAndRender() {
    filteredNotes = releaseNotes.filter(note => {
        // Apply category pill filter
        const matchesCategory = currentFilter === 'all' || 
            note.type.toLowerCase() === currentFilter.toLowerCase();
            
        // Apply keyword search filter
        const searchLower = currentSearch.toLowerCase();
        const matchesSearch = !currentSearch || 
            note.type.toLowerCase().includes(searchLower) ||
            note.date.toLowerCase().includes(searchLower) ||
            note.text_summary.toLowerCase().includes(searchLower);
            
        return matchesCategory && matchesSearch;
    });

    if (filteredNotes.length === 0) {
        showEmpty();
    } else {
        showContent();
        renderReleaseCards();
    }
}

// Render release card items
function renderReleaseCards() {
    releaseCardsContainer.innerHTML = '';
    
    filteredNotes.forEach(note => {
        const isSelected = selectedNotes.some(sn => sn.id === note.id);
        const typeClass = `type-${note.type.toLowerCase()}`;
        const badgeClass = `badge-${note.type.toLowerCase()}`;
        
        const card = document.createElement('div');
        card.className = `release-card ${typeClass} ${isSelected ? 'selected' : ''}`;
        card.dataset.id = note.id;
        
        card.innerHTML = `
            <div class="card-top">
                <div class="card-meta">
                    <span class="badge ${badgeClass}">${note.type}</span>
                    <span class="card-date">${note.date}</span>
                </div>
                <div class="card-selectors">
                    <div class="selection-checkbox" title="Select to Tweet"></div>
                </div>
            </div>
            <div class="card-body">
                ${note.content_html}
            </div>
            <div class="card-footer">
                <a href="${note.link}" target="_blank" class="read-more-link" onclick="event.stopPropagation();">
                    View in Official Docs
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                </a>
                <div class="card-actions">
                    <button class="btn-small copy-btn" onclick="event.stopPropagation(); copyTweetToClipboard('${note.id}');" title="Copy formatted tweet to clipboard">
                        Copy
                    </button>
                    <button class="btn-small quick-tweet-btn" onclick="event.stopPropagation(); quickTweet('${note.id}');">
                        Quick Tweet
                    </button>
                </div>
            </div>
        `;
        
        // Handle select clicking
        card.addEventListener('click', () => toggleSelection(note));
        
        releaseCardsContainer.appendChild(card);
    });
}

// Toggle selection state of cards
function toggleSelection(note) {
    const idx = selectedNotes.findIndex(sn => sn.id === note.id);
    if (idx > -1) {
        // Remove selection
        selectedNotes.splice(idx, 1);
    } else {
        // Add selection
        selectedNotes.push(note);
    }
    
    // Update card classes
    const cardEl = document.querySelector(`.release-card[data-id="${note.id}"]`);
    if (cardEl) {
        cardEl.classList.toggle('selected');
    }
    
    updateSelectedList();
    generateTweetContent();
}

// Update the composer selected stack
function updateSelectedList() {
    selectedListContainer.innerHTML = '';
    
    if (selectedNotes.length === 0) {
        selectedListContainer.innerHTML = `
            <div class="no-selection-hint">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
                <span>Click on any update card to select it and start writing your tweet.</span>
            </div>
        `;
        return;
    }
    
    selectedNotes.forEach(note => {
        const item = document.createElement('div');
        item.className = 'selected-badge-item';
        
        // Shorten title/summary
        const summarySnippet = note.text_summary.substring(0, 35) + (note.text_summary.length > 35 ? '...' : '');
        
        item.innerHTML = `
            <div class="selected-badge-info">
                <span class="badge badge-${note.type.toLowerCase()}">${note.type}</span>
                <span class="selected-badge-title" title="${note.text_summary}">${summarySnippet}</span>
            </div>
            <button class="remove-badge-btn" title="Deselect">&times;</button>
        `;
        
        item.querySelector('.remove-badge-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            toggleSelection(note);
        });
        
        selectedListContainer.appendChild(item);
    });
}

// Clear all card selections
function clearSelection() {
    // Clear selection classes on DOM
    selectedNotes.forEach(note => {
        const cardEl = document.querySelector(`.release-card[data-id="${note.id}"]`);
        if (cardEl) cardEl.classList.remove('selected');
    });
    
    selectedNotes = [];
    updateSelectedList();
    generateTweetContent();
    showToast('Composer selection cleared', 'info');
}

// Generate pre-formatted Tweet text based on selections and vibe
function generateTweetContent() {
    if (selectedNotes.length === 0) {
        tweetTextarea.value = '';
        updateCharCount();
        return;
    }
    
    let text = '';
    
    if (selectedNotes.length === 1) {
        const note = selectedNotes[0];
        const dateStr = note.date;
        const typeStr = note.type;
        const summary = note.text_summary;
        const link = note.link;
        
        if (currentPreset === 'news') {
            text = `🚀 New BigQuery ${typeStr} (${dateStr}):\n\n${summary}\n\nDocs: ${link}`;
        } else if (currentPreset === 'dev') {
            text = `💻 BigQuery Dev Alert | ${typeStr} (${dateStr})\n\n🛠️ Details:\n${summary}\n\n🔗 ${link}`;
        } else if (currentPreset === 'hype') {
            text = `🔥 Massive BigQuery Update! (${dateStr})\n\nCheck out this fresh ${typeStr.toLowerCase()}! 👇\n\n"${summary}"\n\nRead more here: ${link}`;
        }
    } else {
        // Multi-select summaries aggregation
        text = `📡 Latest Google BigQuery Updates:\n`;
        selectedNotes.forEach((note, index) => {
            const num = index + 1;
            // Get a shortened sentence for multi-select
            let sentence = note.text_summary.split('.')[0] + '.';
            if (sentence.length > 80) sentence = sentence.substring(0, 77) + '...';
            text += `\n${num}️⃣ [${note.type}] ${sentence}`;
        });
        
        // Use generic link of the feed or the first selected card's link
        text += `\n\n🔗 Full notes: ${selectedNotes[0].link}`;
    }
    
    // Append tags automatically
    text += TWEET_TAGS;
    
    tweetTextarea.value = text;
    updateCharCount();
}

// Update Character Counter
function updateCharCount() {
    const len = tweetTextarea.value.length;
    charCountEl.textContent = len;
    
    if (len > CHAR_LIMIT) {
        charCountEl.classList.add('error');
        charWarningEl.classList.remove('hidden');
    } else {
        charCountEl.classList.remove('error');
        charWarningEl.classList.add('hidden');
    }
    
    // Enable/disable Tweet button
    tweetBtn.disabled = len === 0;
}

// Auto-shorten content to fit inside 280 characters
function autoFitTweet() {
    if (selectedNotes.length === 0) return;
    
    let text = tweetTextarea.value;
    if (text.length <= CHAR_LIMIT) {
        showToast('Tweet already fits character limit', 'info');
        return;
    }
    
    if (selectedNotes.length === 1) {
        const note = selectedNotes[0];
        const dateStr = note.date;
        const typeStr = note.type;
        const link = note.link;
        
        // Calculate overhead space
        let prefix = '';
        if (currentPreset === 'news') prefix = `🚀 New BigQuery ${typeStr} (${dateStr}):\n\n`;
        else if (currentPreset === 'dev') prefix = `💻 BigQuery Dev Alert | ${typeStr} (${dateStr})\n\n🛠️ `;
        else if (currentPreset === 'hype') prefix = `🔥 Massive BigQuery Update! (${dateStr})\n\nCheck out this ${typeStr.toLowerCase()}! 👇\n\n`;
        
        const suffix = `\n\nDocs: ${link}${TWEET_TAGS}`;
        const allowedLength = CHAR_LIMIT - prefix.length - suffix.length - 4; // 4 char buffer
        
        if (allowedLength > 10) {
            const truncatedSummary = note.text_summary.substring(0, allowedLength) + '...';
            tweetTextarea.value = `${prefix}${truncatedSummary}${suffix}`;
            updateCharCount();
            showToast('Intelligently shortened to fit 280 characters!');
        } else {
            // Extreme truncation fallback
            tweetTextarea.value = `BigQuery ${typeStr} (${dateStr})\n\n🔗 ${link}${TWEET_TAGS}`;
            updateCharCount();
        }
    } else {
        // Multi-select auto-fit
        let header = `📡 BigQuery Updates:\n`;
        let footer = `\n\n🔗 ${selectedNotes[0].link}${TWEET_TAGS}`;
        let itemSpace = CHAR_LIMIT - header.length - footer.length;
        let perItemSpace = Math.floor(itemSpace / selectedNotes.length) - 8;
        
        let newText = header;
        selectedNotes.forEach((note, index) => {
            const num = index + 1;
            let sentence = note.text_summary;
            if (sentence.length > perItemSpace) {
                sentence = sentence.substring(0, perItemSpace) + '...';
            }
            newText += `\n${num}️⃣ [${note.type}] ${sentence}`;
        });
        newText += footer;
        
        tweetTextarea.value = newText;
        updateCharCount();
        showToast('Summaries shortened to fit!');
    }
}

// Add Custom Hashtags helper
function appendHashtags() {
    const currentVal = tweetTextarea.value;
    const devTag = ' #GoogleCloudPlatform #Dataform #DevOps';
    
    if (!currentVal.includes('#GoogleCloudPlatform')) {
        tweetTextarea.value = currentVal + devTag;
        updateCharCount();
        showToast('Appended dev tags!');
    } else {
        showToast('Tags already present', 'info');
    }
}

// Post Tweet via Web Intent
function postTweet() {
    const text = tweetTextarea.value;
    if (!text) return;
    
    const xIntentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(xIntentUrl, '_blank', 'noopener,noreferrer');
    showToast('Redirecting to X / Twitter composer...', 'success');
}

// Quick Tweet button handler on cards (bypasses composer stack, tweets directly)
function quickTweet(noteId) {
    const note = releaseNotes.find(n => n.id === noteId);
    if (!note) return;
    
    const dateStr = note.date;
    const typeStr = note.type;
    let summary = note.text_summary;
    const link = note.link;
    
    let tweetText = `🚀 New BigQuery ${typeStr} (${dateStr}):\n\n${summary}\n\nDocs: ${link}${TWEET_TAGS}`;
    
    // Auto-fit check
    if (tweetText.length > CHAR_LIMIT) {
        const prefix = `🚀 BigQuery ${typeStr} (${dateStr}):\n\n`;
        const suffix = `\n\nDocs: ${link}${TWEET_TAGS}`;
        const allowedLength = CHAR_LIMIT - prefix.length - suffix.length - 4;
        
        if (allowedLength > 10) {
            summary = summary.substring(0, allowedLength) + '...';
            tweetText = `${prefix}${summary}${suffix}`;
        } else {
            tweetText = `BigQuery ${typeStr} (${dateStr})\n\n🔗 ${link}${TWEET_TAGS}`;
        }
    }
    
    const xIntentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    window.open(xIntentUrl, '_blank', 'noopener,noreferrer');
    showToast('Redirecting quick tweet to X...');
}

// Copy single tweet text to clipboard
function copyTweetToClipboard(noteId) {
    const note = releaseNotes.find(n => n.id === noteId);
    if (!note) return;
    
    const dateStr = note.date;
    const typeStr = note.type;
    let summary = note.text_summary;
    const link = note.link;
    
    let tweetText = `🚀 New BigQuery ${typeStr} (${dateStr}):\n\n${summary}\n\nDocs: ${link}${TWEET_TAGS}`;
    
    // Auto-fit check
    if (tweetText.length > CHAR_LIMIT) {
        const prefix = `🚀 BigQuery ${typeStr} (${dateStr}):\n\n`;
        const suffix = `\n\nDocs: ${link}${TWEET_TAGS}`;
        const allowedLength = CHAR_LIMIT - prefix.length - suffix.length - 4;
        
        if (allowedLength > 10) {
            summary = summary.substring(0, allowedLength) + '...';
            tweetText = `${prefix}${summary}${suffix}`;
        } else {
            tweetText = `BigQuery ${typeStr} (${dateStr})\n\n🔗 ${link}${TWEET_TAGS}`;
        }
    }
    
    navigator.clipboard.writeText(tweetText)
        .then(() => {
            showToast('Tweet copied to clipboard!');
        })
        .catch(err => {
            console.error('Could not copy text: ', err);
            showToast('Failed to copy to clipboard', 'error');
        });
}

// Export filtered notes to CSV file
function exportFilteredToCSV() {
    if (filteredNotes.length === 0) {
        showToast('No notes to export', 'error');
        return;
    }
    
    // Header
    let csvContent = '"Date","Category","Documentation URL","Plain Text Summary"\r\n';
    
    filteredNotes.forEach(note => {
        // Escape quotes by doubling them
        const escapedDate = note.date.replace(/"/g, '""');
        const escapedType = note.type.replace(/"/g, '""');
        const escapedLink = note.link.replace(/"/g, '""');
        const escapedSummary = note.text_summary.replace(/"/g, '""');
        
        csvContent += `"${escapedDate}","${escapedType}","${escapedLink}","${escapedSummary}"\r\n`;
    });
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `bigquery_releases_export_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast(`Exported ${filteredNotes.length} updates to CSV!`);
}

// Theme (Dark / Light Mode) Controller
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    const sunIcon = document.getElementById('theme-sun');
    const moonIcon = document.getElementById('theme-moon');
    
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
        sunIcon.classList.remove('hidden');
        moonIcon.classList.add('hidden');
    } else {
        document.body.classList.remove('light-mode');
        sunIcon.classList.add('hidden');
        moonIcon.classList.remove('hidden');
    }
}

function toggleTheme() {
    const isLightNow = document.body.classList.toggle('light-mode');
    const sunIcon = document.getElementById('theme-sun');
    const moonIcon = document.getElementById('theme-moon');
    
    if (isLightNow) {
        localStorage.setItem('theme', 'light');
        sunIcon.classList.remove('hidden');
        moonIcon.classList.add('hidden');
        showToast('Swapped to Light Mode!', 'info');
    } else {
        localStorage.setItem('theme', 'dark');
        sunIcon.classList.add('hidden');
        moonIcon.classList.remove('hidden');
        showToast('Swapped to Dark Mode!', 'info');
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Theme toggle click
    const themeToggleBtn = document.getElementById('theme-toggle');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', toggleTheme);
    }
    
    // Export CSV click
    const exportCsvBtn = document.getElementById('export-csv-btn');
    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', exportFilteredToCSV);
    }

    // Refresh button click
    refreshBtn.addEventListener('click', () => fetchReleases(true));
    
    // Search inputs
    searchInput.addEventListener('input', (e) => {
        currentSearch = e.target.value;
        if (currentSearch) {
            clearSearchBtn.classList.remove('hidden');
        } else {
            clearSearchBtn.classList.add('hidden');
        }
        applyFiltersAndRender();
    });
    
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        currentSearch = '';
        clearSearchBtn.classList.add('hidden');
        applyFiltersAndRender();
    });
    
    // Filters (pill clicks)
    filterPillsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('pill')) {
            document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
            e.target.classList.add('active');
            
            currentFilter = e.target.dataset.filter;
            applyFiltersAndRender();
        }
    });
    
    // Stats cards clicking translates to pill clicks
    statCards.forEach(card => {
        card.addEventListener('click', () => {
            const filterType = card.dataset.filter || card.dataset.type;
            const targetPill = document.querySelector(`.pill[data-filter="${filterType}"]`);
            if (targetPill) {
                targetPill.click();
                targetPill.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        });
    });
    
    // Composer elements
    clearComposerBtn.addEventListener('click', clearSelection);
    formatShortBtn.addEventListener('click', autoFitTweet);
    addHashtagsBtn.addEventListener('click', appendHashtags);
    tweetBtn.addEventListener('click', postTweet);
    
    // Textarea input watcher
    tweetTextarea.addEventListener('input', updateCharCount);
    
    // Tweet presets (vibe) click
    presetButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            presetButtons.forEach(p => p.classList.remove('active'));
            e.target.classList.add('active');
            
            currentPreset = e.target.dataset.preset;
            generateTweetContent();
        });
    });
    
    // State error retries
    retryBtn.addEventListener('click', () => fetchReleases(true));
    resetFiltersBtn.addEventListener('click', () => {
        searchInput.value = '';
        currentSearch = '';
        clearSearchBtn.classList.add('hidden');
        
        const firstPill = document.querySelector('.pill[data-filter="all"]');
        if (firstPill) firstPill.click();
    });
}

// Initialise App
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    setupEventListeners();
    fetchReleases(); // Load on start (will hit cache or fetch live)
});
