# Instagram Reels Scraper

A Python-based tool to automatically scrape Instagram Reels data including captions, likes, shares, comments, and more.

## Features

- 🔐 One-time manual login with session persistence
- 🤖 Anti-detection measures (stealth mode, human-like delays)
- 📊 Extracts comprehensive reel data (caption, likes, shares, views, comments)
- 💬 Scrapes top 20 comments per reel
- 💾 SQLite database storage
- 📝 Detailed logging

## Setup

1. **Create virtual environment and install dependencies:**
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   playwright install chromium
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env if needed (optional - defaults work fine)
   ```

3. **Run the scraper:**
   ```bash
   python main.py
   ```

## First Run

On the first run, you'll be prompted to manually log in to Instagram:
1. A browser window will open
2. Log in to your Instagram account
3. Complete any 2FA if required
4. Press Enter in the terminal when logged in

Your session will be saved and reused for future runs - no need to log in again!

## Configuration

Edit `.env` to customize:
- `MAX_REELS_PER_SESSION`: Number of reels to scrape (default: 100)
- `SCROLL_BASE_DELAY`, `SCROLL_STD_DEV`: Delay parameters for human-like scrolling
- `HEADLESS`: Run browser in headless mode (default: False)

## Data Storage

Data is stored in `data/reels_data.db` (SQLite database) with two tables:
- `reels`: Reel metadata (URL, author, caption, likes, shares, views, etc.)
- `comments`: Top 20 comments per reel

## Important Notes

⚠️ **Terms of Service**: Automated scraping violates Instagram's ToS. Use at your own risk.

⚠️ **Account Safety**: Consider using a dedicated test account to avoid potential bans.

⚠️ **Rate Limiting**: The scraper includes delays to mimic human behavior, but Instagram may still detect automation.

## Project Structure

```
cnet/
├── auth/               # Authentication and session management
├── models/             # Database models
├── scraper/            # Scraping logic
├── utils/              # Utilities (logging, anti-detection)
├── config.py           # Configuration
├── main.py             # Entry point
└── requirements.txt    # Dependencies
```

## Target Rate

Configured for ~50 reels per hour with human-like delays.
