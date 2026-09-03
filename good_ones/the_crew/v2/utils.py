"""
Utility functions for the Deep Research Agent v2.

This module provides common helper functions used throughout the application:
- URL normalization and deduplication
- Text cleaning and processing
- JSON parsing from LLM responses
- Keyword extraction
- File system utilities
"""

import json
import re
from datetime import datetime
from pathlib import Path
from typing import List, Set
from urllib.parse import urlparse, urlunparse


def normalize_url(url: str) -> str:
    """
    Normalize a URL by removing fragments, trailing slashes, and lowercasing the domain.
    
    Args:
        url: The URL to normalize
        
    Returns:
        Normalized URL string
        
    Examples:
        >>> normalize_url("https://Example.com/path/")
        'https://example.com/path'
        >>> normalize_url("http://site.com#fragment")
        'http://site.com'
    """
    parsed = urlparse(url)
    
    # Lowercase the domain
    netloc = parsed.netloc.lower()
    
    # Remove trailing slash from path
    path = parsed.path.rstrip('/')
    
    # Reconstruct without fragment
    normalized = urlunparse((
        parsed.scheme,
        netloc,
        path,
        parsed.params,
        parsed.query,
        ''  # Remove fragment
    ))
    
    return normalized


def deduplicate_urls(urls: List[str]) -> List[str]:
    """
    Remove duplicate URLs after normalization.
    
    Args:
        urls: List of URLs to deduplicate
        
    Returns:
        List of unique URLs (normalized)
    """
    seen: Set[str] = set()
    unique_urls: List[str] = []
    
    for url in urls:
        normalized = normalize_url(url)
        if normalized not in seen:
            seen.add(normalized)
            unique_urls.append(normalized)
    
    return unique_urls


def clean_text(text: str) -> str:
    """
    Normalize whitespace and formatting in text.
    
    Args:
        text: Text to clean
        
    Returns:
        Cleaned text with normalized whitespace
    """
    if not text:
        return ""
    
    # Replace multiple whitespace with single space
    text = re.sub(r'\s+', ' ', text)
    
    # Strip leading/trailing whitespace
    text = text.strip()
    
    return text


def safe_json_parse(text: str) -> dict:
    """
    Extract and parse JSON from LLM responses.
    
    Handles cases where JSON is wrapped in markdown code blocks or
    has additional text before/after.
    
    Args:
        text: Text potentially containing JSON
        
    Returns:
        Parsed JSON as dictionary, or empty dict if parsing fails
    """
    if not text:
        return {}
    
    # Try direct parsing first
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    
    # Try to extract JSON from markdown code blocks
    json_pattern = r'```(?:json)?\s*(\{.*?\}|\[.*?\])\s*```'
    matches = re.findall(json_pattern, text, re.DOTALL)
    
    if matches:
        try:
            return json.loads(matches[0])
        except json.JSONDecodeError:
            pass
    
    # Try to find JSON object or array in text
    # Look for { ... } or [ ... ]
    brace_pattern = r'(\{(?:[^{}]|(?:\{[^{}]*\}))*\})'
    bracket_pattern = r'(\[(?:[^\[\]]|(?:\[[^\[\]]*\]))*\])'
    
    for pattern in [brace_pattern, bracket_pattern]:
        matches = re.findall(pattern, text, re.DOTALL)
        for match in matches:
            try:
                return json.loads(match)
            except json.JSONDecodeError:
                continue
    
    return {}


def extract_keywords(text: str, min_length: int = 4) -> List[str]:
    """
    Extract keywords from text for deduplication analysis.
    
    Args:
        text: Text to extract keywords from
        min_length: Minimum keyword length (default: 4)
        
    Returns:
        List of lowercase keywords
    """
    if not text:
        return []
    
    # Convert to lowercase
    text = text.lower()
    
    # Extract words (alphanumeric sequences)
    words = re.findall(r'\b[a-z0-9]+\b', text)
    
    # Filter by minimum length
    keywords = [w for w in words if len(w) >= min_length]
    
    return keywords


def calculate_cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    """
    Calculate cosine similarity between two vectors.
    
    Args:
        vec1: First vector
        vec2: Second vector
        
    Returns:
        Cosine similarity score (0 to 1)
    """
    if len(vec1) != len(vec2):
        raise ValueError("Vectors must have the same length")
    
    if len(vec1) == 0:
        return 0.0
    
    # Dot product
    dot_product = sum(a * b for a, b in zip(vec1, vec2))
    
    # Magnitudes
    mag1 = sum(a * a for a in vec1) ** 0.5
    mag2 = sum(b * b for b in vec2) ** 0.5
    
    if mag1 == 0 or mag2 == 0:
        return 0.0
    
    return dot_product / (mag1 * mag2)


def now_iso() -> str:
    """
    Get current timestamp in ISO format.
    
    Returns:
        ISO formatted timestamp string
    """
    return datetime.now().isoformat()


def ensure_dir(path: Path) -> None:
    """
    Create directory if it doesn't exist.
    
    Args:
        path: Path to directory
    """
    path.mkdir(parents=True, exist_ok=True)
