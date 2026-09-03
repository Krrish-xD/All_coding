"""
Web scraper module for the Deep Research Agent v2.

This module handles concurrent web scraping with content extraction
using trafilatura and requests.
"""

import requests
import trafilatura
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List
from datetime import datetime
import threading

from models import ScrapedDocument
from utils import clean_text, now_iso


# User agent for requests
USER_AGENT = "Mozilla/5.0 (compatible; DeepResearchBot/2.0; +https://github.com/research-agent)"

# Thread lock for cache operations
_cache_lock = threading.Lock()


def scrape_single_url(url: str, timeout: int = 15) -> ScrapedDocument:
    """
    Fetch and extract content from a single URL.
    
    Checks content cache first to avoid re-scraping recently fetched URLs.
    
    Args:
        url: URL to scrape
        timeout: Request timeout in seconds
        
    Returns:
        ScrapedDocument with extracted content or error (includes cached flag)
    """
    # Check content cache first (with thread lock)
    from cache import get_cached_content, save_content
    
    with _cache_lock:
        cached_text = get_cached_content(url, ttl_days=7)
    
    if cached_text:
        doc = ScrapedDocument(
            url=url,
            text=cached_text,
            error="",
            timestamp=now_iso(),
            char_count=len(cached_text)
        )
        # Mark as cached (add attribute dynamically)
        doc.cached = True
        return doc
    
    try:
        # Fetch HTML
        headers = {'User-Agent': USER_AGENT}
        response = requests.get(url, headers=headers, timeout=timeout)
        response.raise_for_status()
        
        html = response.text
        
        # Extract main content using trafilatura
        text = trafilatura.extract(html)
        
        if not text:
            return ScrapedDocument(
                url=url,
                text="",
                error="No content extracted",
                timestamp=now_iso(),
                char_count=0
            )
        
        # Clean text
        text = clean_text(text)
        
        # Save to content cache (with thread lock)
        if text:
            try:
                with _cache_lock:
                    save_content(url, text)
            except Exception:
                pass  # Don't fail scraping if cache save fails
        
        doc = ScrapedDocument(
            url=url,
            text=text,
            error="",
            timestamp=now_iso(),
            char_count=len(text)
        )
        # Mark as freshly scraped
        doc.cached = False
        return doc
    
    except requests.Timeout:
        doc = ScrapedDocument(
            url=url,
            text="",
            error="Timeout",
            timestamp=now_iso(),
            char_count=0
        )
        doc.cached = False
        return doc
    
    except requests.RequestException as e:
        doc = ScrapedDocument(
            url=url,
            text="",
            error=f"Request error: {str(e)}",
            timestamp=now_iso(),
            char_count=0
        )
        doc.cached = False
        return doc
    
    except Exception as e:
        doc = ScrapedDocument(
            url=url,
            text="",
            error=f"Error: {str(e)}",
            timestamp=now_iso(),
            char_count=0
        )
        doc.cached = False
        return doc


def scrape_urls(
    urls: List[str],
    timeout: int = 15,
    max_workers: int = 8,
    show_progress: bool = True
) -> List[ScrapedDocument]:
    """
    Scrape multiple URLs concurrently.
    
    Args:
        urls: List of URLs to scrape
        timeout: Request timeout in seconds
        max_workers: Maximum concurrent workers
        show_progress: Whether to show progress
        
    Returns:
        List of ScrapedDocument objects
    """
    documents = []
    
    if show_progress:
        try:
            from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn
            
            with Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                BarColumn(),
                TextColumn("[progress.percentage]{task.percentage:>3.0f}%"),
            ) as progress:
                task = progress.add_task(f"Scraping {len(urls)} URLs...", total=len(urls))
                
                with ThreadPoolExecutor(max_workers=max_workers) as executor:
                    # Submit all tasks
                    future_to_url = {
                        executor.submit(scrape_single_url, url, timeout): url
                        for url in urls
                    }
                    
                    # Collect results as they complete
                    for future in as_completed(future_to_url):
                        doc = future.result()
                        documents.append(doc)
                        progress.advance(task)
        
        except ImportError:
            # Fallback without progress bar
            show_progress = False
    
    if not show_progress:
        # Simple concurrent scraping without progress bar
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = [executor.submit(scrape_single_url, url, timeout) for url in urls]
            documents = [future.result() for future in as_completed(futures)]
    
    return documents


def extract_content(html: str) -> str:
    """
    Extract main content from HTML.
    
    Args:
        html: HTML content
        
    Returns:
        Extracted text content
    """
    text = trafilatura.extract(html)
    return text if text else ""


def get_scraping_stats(documents: List[ScrapedDocument]) -> dict:
    """
    Calculate scraping statistics including cache hits.
    
    Args:
        documents: List of ScrapedDocument objects
        
    Returns:
        Dictionary with statistics
    """
    total = len(documents)
    successful = sum(1 for doc in documents if doc.text and not doc.error)
    failed = total - successful
    total_chars = sum(doc.char_count for doc in documents)
    
    # Count cached vs freshly scraped
    cached = sum(1 for doc in documents if hasattr(doc, 'cached') and doc.cached and doc.text)
    fresh = successful - cached
    
    return {
        "total": total,
        "successful": successful,
        "failed": failed,
        "cached": cached,
        "fresh": fresh,
        "success_rate": successful / total if total > 0 else 0.0,
        "total_chars": total_chars,
        "avg_chars": total_chars / successful if successful > 0 else 0
    }
