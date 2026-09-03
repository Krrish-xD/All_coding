"""Configuration management for Instagram Reels scraper."""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Project paths
PROJECT_ROOT = Path(__file__).parent
DATA_DIR = PROJECT_ROOT / "data"
SESSION_DIR = PROJECT_ROOT / "session"
LOGS_DIR = PROJECT_ROOT / "logs"

# Create directories if they don't exist
DATA_DIR.mkdir(exist_ok=True)
SESSION_DIR.mkdir(exist_ok=True)
LOGS_DIR.mkdir(exist_ok=True)

# Instagram Configuration
INSTAGRAM_USERNAME = os.getenv("INSTAGRAM_USERNAME", "")
INSTAGRAM_PASSWORD = os.getenv("INSTAGRAM_PASSWORD", "")

# Scraping Configuration
MAX_REELS_PER_SESSION = int(os.getenv("MAX_REELS_PER_SESSION", "100"))
SCROLL_BASE_DELAY = int(os.getenv("SCROLL_BASE_DELAY", "721"))
SCROLL_STD_DEV = int(os.getenv("SCROLL_STD_DEV", "81"))
SCROLL_MIN_DELAY = int(os.getenv("SCROLL_MIN_DELAY", "418"))
SCROLL_MAX_DELAY = int(os.getenv("SCROLL_MAX_DELAY", "1176"))

# Storage Configuration
DATABASE_PATH = Path(os.getenv("DATABASE_PATH", str(DATA_DIR / "reels_data.db")))
SESSION_STORAGE_PATH = Path(os.getenv("SESSION_STORAGE_PATH", str(SESSION_DIR / "instagram_session.json")))

# Logging Configuration
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
LOG_FILE = Path(os.getenv("LOG_FILE", str(LOGS_DIR / "scraper.log")))

# Browser Configuration
HEADLESS = os.getenv("HEADLESS", "False").lower() == "true"
BROWSER_TIMEOUT = 30000  # 30 seconds

# Instagram URLs
INSTAGRAM_BASE_URL = "https://www.instagram.com"
INSTAGRAM_REELS_URL = f"{INSTAGRAM_BASE_URL}/reels/"
