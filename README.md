# BigQuery Release Radar 📡

A modern, responsive web application that fetches, parses, and formats the official Google BigQuery Release Notes. Built with **Python Flask** on the backend and **vanilla HTML, CSS, and JavaScript** on the frontend, it enables users to search, filter, and compose styled posts about specific releases to share on X (Twitter).

---

## 🌟 Key Features

* **Atomic Update Separation**: Google Cloud bundles all notes for a single calendar day together. This application splits date entries by category headings (`Feature`, `Announcement`, `Change`, `Issue`, `Breaking`) so you can select and tweet *individual updates*.
* **5-Minute Cache Protection**: The backend caches RSS responses in memory for 300 seconds (5 minutes) to protect against API rate-limiting and guarantee instant page loads. Clicking the **Refresh** button bypasses the cache to fetch the latest feed live.
* **Category Pill Filters & Live Search**: Dynamic client-side filtering lets you instantly search descriptions or filter updates by category pills (with distinct color tags).
* **Interactive Tweet Composer**:
  * **Vibe Presets**: Instantly switch draft formatting style between `🚀 News`, `💻 Technical`, and `🔥 Hyped` tones.
  * **Multi-Select Drafts**: Selecting multiple cards compiles them into a unified bulletin post.
  * **Smart Auto-Fit**: Intelligently truncates long descriptions to remain under X's **280-character limit** while preserving critical details (title, release date, docs link, and tags).
  * **X Sharing Web Intent**: Opens X's post composition screen in a new window with your pre-populated text.

---

## 🛠️ Technology Stack

* **Backend**: Python 3, Flask, and standard libraries (`urllib`, `xml.etree.ElementTree`, `re`, `time`).
* **Frontend**: Vanilla HTML5, CSS3 (CSS Variables, Flexbox/Grid layouts, custom scrollbars), and ES6 JavaScript.
* **Design Language**: Premium glassmorphic dark theme, curated status alerts (emerald green, sapphire blue, purple, amber, coral red), and custom vector SVG icons.

---

## 🚀 Getting Started

### Prerequisites

* Python 3.8 or higher.
* Git (optional, for tracking code updates).

### Installation & Run

1. **Activate the Virtual Environment**:
   * **Windows (PowerShell)**:
     ```pwsh
     .\.venv\Scripts\Activate.ps1
     ```
   * **Linux/macOS**:
     ```bash
     source .venv/bin/activate
     ```

2. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the Flask Application**:
   ```bash
   python app.py
   ```

4. **Access the Application**:
   Open your browser and navigate to **[http://127.0.0.1:5000](http://127.0.0.1:5000)**.

---

## 📂 Code Map

* **[app.py](file:///C:/CodingProjects/agy-cli-projects/bq-releases-notes/app.py)**: Backend Python Flask server. Contains parsing regex patterns, standard library Atom XML fetching, cache mechanisms, and endpoint definitions.
* **[requirements.txt](file:///C:/CodingProjects/agy-cli-projects/bq-releases-notes/requirements.txt)**: Lists required packages (`Flask` and `requests`).
* **[templates/index.html](file:///C:/CodingProjects/agy-cli-projects/bq-releases-notes/templates/index.html)**: Frontend markup template. Houses layouts, filter inputs, cards grid wrappers, and composer sidebars.
* **[static/css/style.css](file:///C:/CodingProjects/agy-cli-projects/bq-releases-notes/static/css/style.css)**: Custom responsive styles, animation keyframes, and the glassmorphism color palette.
* **[static/js/app.js](file:///C:/CodingProjects/agy-cli-projects/bq-releases-notes/static/js/app.js)**: Frontend logic. Binds inputs, makes AJAX requests, aggregates selected cards, and builds tweet intents.
* **[.gitignore](file:///C:/CodingProjects/agy-cli-projects/bq-releases-notes/.gitignore)**: Configures version control exclusions (compiled binaries, virtual environments, local caches).
