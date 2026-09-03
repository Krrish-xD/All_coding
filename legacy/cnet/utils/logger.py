"""Logging configuration for Instagram Reels scraper."""
from loguru import logger
import sys
from config import LOG_FILE, LOG_LEVEL

# Remove default handler
logger.remove()

# Add console handler with colors
logger.add(
    sys.stdout,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
    level=LOG_LEVEL,
    colorize=True
)

# Add file handler
logger.add(
    LOG_FILE,
    format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}",
    level=LOG_LEVEL,
    rotation="10 MB",
    retention="7 days",
    compression="zip"
)

def get_logger(name: str):
    """Get a logger instance with the given name."""
    return logger.bind(name=name)
