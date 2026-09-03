"""
Centralized logging configuration for Deep Research Agent v2.

This module provides structured logging with multiple handlers:
- Console output with color-coded levels
- File output with detailed formatting
- Configurable log levels per module
"""

import logging
import sys
from pathlib import Path
from typing import Optional
from datetime import datetime


# ANSI color codes for console output
class LogColors:
    """ANSI color codes for terminal output."""
    RESET = '\033[0m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    GREEN = '\033[92m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GRAY = '\033[90m'


class ColoredFormatter(logging.Formatter):
    """Custom formatter with color-coded log levels."""
    
    COLORS = {
        'DEBUG': LogColors.GRAY,
        'INFO': LogColors.CYAN,
        'WARNING': LogColors.YELLOW,
        'ERROR': LogColors.RED,
        'CRITICAL': LogColors.RED
    }
    
    def format(self, record):
        # Add color to level name
        levelname = record.levelname
        if levelname in self.COLORS:
            record.levelname = f"{self.COLORS[levelname]}{levelname}{LogColors.RESET}"
        
        return super().format(record)


def setup_logging(
    session_dir: Optional[str] = None,
    console_level: int = logging.WARNING,  # Changed default to WARNING
    file_level: int = logging.DEBUG,
    log_to_file: bool = True
) -> logging.Logger:
    """
    Configure logging for the application.
    
    Args:
        session_dir: Directory for log file (if log_to_file=True)
        console_level: Logging level for console output (default: WARNING)
        file_level: Logging level for file output (default: DEBUG)
        log_to_file: Whether to write logs to file
        
    Returns:
        Configured root logger
    """
    # Get root logger
    logger = logging.getLogger()
    logger.setLevel(logging.DEBUG)  # Capture all levels
    
    # Remove existing handlers
    logger.handlers.clear()
    
    # Console handler with colors (only warnings and errors by default)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(console_level)
    
    console_format = ColoredFormatter(
        '%(levelname)s | %(name)s | %(message)s'
    )
    console_handler.setFormatter(console_format)
    logger.addHandler(console_handler)
    
    # File handler (if enabled) - captures everything
    if log_to_file and session_dir:
        log_dir = Path(session_dir)
        log_dir.mkdir(parents=True, exist_ok=True)
        
        log_file = log_dir / "session.log"
        
        file_handler = logging.FileHandler(log_file, mode='a', encoding='utf-8')
        file_handler.setLevel(file_level)
        
        file_format = logging.Formatter(
            '%(asctime)s | %(levelname)-8s | %(name)-20s | %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        file_handler.setFormatter(file_format)
        logger.addHandler(file_handler)
    
    # Suppress noisy third-party loggers ONLY in console (not in file)
    # We do this by adding a filter to the console handler, not changing logger levels
    class ConsoleFilter(logging.Filter):
        """Filter to suppress third-party library logs in console only."""
        SUPPRESSED = {
            'urllib3', 'cookie_store', 'rquest', 'primp', 'ddgs', 
            'duckduckgo_search', 'sentence_transformers', 'transformers', 
            'torch', 'trafilatura'
        }
        
        def filter(self, record):
            # Block all logs from suppressed libraries in console
            if any(record.name.startswith(lib) for lib in self.SUPPRESSED):
                return False
            # Allow everything else through
            return True
    
    # Add filter to console handler only
    console_handler.addFilter(ConsoleFilter())
    
    return logger


def get_logger(name: str) -> logging.Logger:
    """
    Get a logger for a specific module.
    
    Args:
        name: Module name (typically __name__)
        
    Returns:
        Logger instance
    """
    return logging.getLogger(name)


def log_section(logger: logging.Logger, title: str, width: int = 60) -> None:
    """
    Log a section header for better readability.
    
    Args:
        logger: Logger instance
        title: Section title
        width: Width of separator line
    """
    logger.info("=" * width)
    logger.info(title)
    logger.info("=" * width)


def log_subsection(logger: logging.Logger, title: str, width: int = 40) -> None:
    """
    Log a subsection header.
    
    Args:
        logger: Logger instance
        title: Subsection title
        width: Width of separator line
    """
    logger.info("-" * width)
    logger.info(title)
    logger.info("-" * width)


def log_metrics(logger: logging.Logger, metrics: dict, prefix: str = "") -> None:
    """
    Log metrics in a structured format.
    
    Args:
        logger: Logger instance
        metrics: Dictionary of metric name -> value
        prefix: Optional prefix for metric names
    """
    for key, value in metrics.items():
        metric_name = f"{prefix}{key}" if prefix else key
        
        # Format value based on type
        if isinstance(value, float):
            if 0 < value < 1:
                formatted_value = f"{value:.1%}"
            else:
                formatted_value = f"{value:.2f}"
        elif isinstance(value, int) and value > 1000:
            formatted_value = f"{value:,}"
        else:
            formatted_value = str(value)
        
        logger.info(f"  {metric_name}: {formatted_value}")


def log_progress(logger: logging.Logger, current: int, total: int, item: str = "items") -> None:
    """
    Log progress information.
    
    Args:
        logger: Logger instance
        current: Current count
        total: Total count
        item: Item description (e.g., "URLs", "documents")
    """
    percentage = (current / total * 100) if total > 0 else 0
    logger.info(f"Progress: {current}/{total} {item} ({percentage:.1f}%)")


def log_error_with_context(
    logger: logging.Logger,
    error: Exception,
    context: str,
    include_traceback: bool = False
) -> None:
    """
    Log an error with contextual information.
    
    Args:
        logger: Logger instance
        error: Exception that occurred
        context: Context description
        include_traceback: Whether to include full traceback
    """
    logger.error(f"{context}: {type(error).__name__}: {str(error)}")
    
    if include_traceback:
        import traceback
        logger.debug(traceback.format_exc())


# Module-level loggers for common use
main_logger = get_logger("main")
cache_logger = get_logger("cache")
search_logger = get_logger("search")
scraper_logger = get_logger("scraper")
summarizer_logger = get_logger("summarizer")
llm_logger = get_logger("llm_client")
