"""
Semantic cache system for the Deep Research Agent v2.

This module implements a global, persistent cache using SQLite and
sentence-transformers for semantic similarity matching. The cache
stores both raw content and summaries with vector embeddings.
"""

import sqlite3
import pickle
import time
import json
import threading
from pathlib import Path
from typing import Optional, Dict, Any, List, Tuple

from sentence_transformers import SentenceTransformer

from utils import calculate_cosine_similarity


# Global cache database path (at v2/ root level)
CACHE_DB_PATH = Path(__file__).parent / "research_cache.db"

# Global embedding model
_embedding_model = None

# Thread lock for cache operations
_cache_lock = threading.Lock()


def initialize_cache(db_path: Optional[str] = None) -> SentenceTransformer:
    """
    Initialize cache database and load embedding model.
    
    Creates database tables if they don't exist and loads the
    sentence-transformers model for generating embeddings.
    
    Args:
        db_path: Optional custom database path (defaults to v2/research_cache.db)
        
    Returns:
        Loaded SentenceTransformer model
    """
    global _embedding_model
    
    # Use default path if not specified
    if db_path is None:
        db_path = str(CACHE_DB_PATH)
    
    # Create database and tables
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Content cache table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS content_cache (
            url TEXT PRIMARY KEY,
            text TEXT,
            timestamp REAL,
            char_count INTEGER
        )
    """)
    
    # Summary cache table with embeddings
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS summary_cache (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            url TEXT,
            question TEXT,
            question_embedding BLOB,
            short_summary TEXT,
            long_summary TEXT,
            key_facts TEXT,
            confidence TEXT,
            timestamp REAL,
            UNIQUE(url, question)
        )
    """)
    
    conn.commit()
    conn.close()
    
    # Load embedding model (small, efficient model)
    from logger import get_logger
    logger = get_logger("cache")
    logger.info("Loading embedding model (sentence-transformers/all-MiniLM-L6-v2)...")
    
    # Disable progress bars from sentence-transformers
    import os
    os.environ['TOKENIZERS_PARALLELISM'] = 'false'
    
    # Retry logic for model loading
    max_retries = 3
    for attempt in range(max_retries):
        try:
            _embedding_model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
            
            # Disable progress bars after initialization
            if hasattr(_embedding_model, 'show_progress_bar'):
                _embedding_model.show_progress_bar = False
            
            logger.info("Embedding model loaded successfully")
            return _embedding_model
            
        except Exception as e:
            if attempt < max_retries - 1:
                logger.warning(f"Failed to load embedding model (attempt {attempt + 1}/{max_retries}): {e}")
                time.sleep(1.0)  # Wait before retry
                continue
            else:
                logger.error(f"Failed to load embedding model after {max_retries} attempts: {e}")
                raise RuntimeError(f"Could not initialize embedding model: {e}")


def embed_text(text: str, max_retries: int = 3) -> List[float]:
    """
    Generate vector embedding for text with retry logic.
    
    Args:
        text: Text to embed
        max_retries: Maximum retry attempts
        
    Returns:
        Vector embedding as list of floats
    """
    if _embedding_model is None:
        raise RuntimeError("Embedding model not initialized. Call initialize_cache() first.")
    
    # Retry logic for embedding generation
    for attempt in range(max_retries):
        try:
            # Generate embedding (with progress bar disabled)
            embedding = _embedding_model.encode(text, convert_to_numpy=True, show_progress_bar=False)
            return embedding.tolist()
        except Exception as e:
            if attempt < max_retries - 1:
                from logger import get_logger
                logger = get_logger("cache")
                logger.warning(f"Embedding generation failed (attempt {attempt + 1}/{max_retries}): {e}")
                import time
                time.sleep(0.5)  # Brief pause before retry
                continue
            else:
                # All retries failed
                raise RuntimeError(f"Failed to generate embedding after {max_retries} attempts: {e}")


def get_cached_content(
    url: str,
    ttl_days: int = 7,
    db_path: Optional[str] = None
) -> Optional[str]:
    """
    Check content cache for a URL.
    
    Args:
        url: URL to check
        ttl_days: Time-to-live in days
        db_path: Optional custom database path
        
    Returns:
        Cached text if found and not expired, None otherwise
    """
    if db_path is None:
        db_path = str(CACHE_DB_PATH)
    
    conn = sqlite3.connect(db_path, timeout=10.0, check_same_thread=False)
    cursor = conn.cursor()
    
    try:
        cursor.execute(
            "SELECT text, timestamp FROM content_cache WHERE url = ?",
            (url,)
        )
        
        result = cursor.fetchone()
    finally:
        conn.close()
    
    if result is None:
        return None
    
    text, timestamp = result
    
    # Check if expired
    age_days = (time.time() - timestamp) / (24 * 3600)
    if age_days > ttl_days:
        return None
    
    return text


def save_content(
    url: str,
    text: str,
    db_path: Optional[str] = None
) -> None:
    """
    Store scraped content in cache.
    
    Args:
        url: URL of the content
        text: Scraped text content
        db_path: Optional custom database path
    """
    if db_path is None:
        db_path = str(CACHE_DB_PATH)
    
    conn = sqlite3.connect(db_path, timeout=10.0, check_same_thread=False)
    cursor = conn.cursor()
    
    try:
        cursor.execute(
            """
            INSERT OR REPLACE INTO content_cache (url, text, timestamp, char_count)
            VALUES (?, ?, ?, ?)
            """,
            (url, text, time.time(), len(text))
        )
        
        conn.commit()
    finally:
        conn.close()


def check_summary_cache(
    url: str,
    question: str,
    threshold: float = 0.95,
    db_path: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """
    Check semantic cache for similar summaries.
    
    Generates embedding for the question and searches for cached
    summaries with high cosine similarity.
    
    Args:
        url: URL of the document
        question: Research question
        threshold: Similarity threshold (default: 0.95)
        db_path: Optional custom database path
        
    Returns:
        Cached summary if found with similarity > threshold, None otherwise
    """
    if db_path is None:
        db_path = str(CACHE_DB_PATH)
    
    # Thread-safe cache access
    with _cache_lock:
        # Generate embedding for new question
        question_embedding = embed_text(question)
        
        conn = sqlite3.connect(db_path, timeout=10.0, check_same_thread=False)
        cursor = conn.cursor()
        
        try:
            # Get all cached summaries for this URL
            cursor.execute(
                """
                SELECT question, question_embedding, short_summary, long_summary,
                       key_facts, confidence
                FROM summary_cache
                WHERE url = ?
                """,
                (url,)
            )
            
            results = cursor.fetchall()
        finally:
            conn.close()
        
        if not results:
            return None
        
        # Find best match
        best_similarity = 0.0
        best_match = None
        
        for row in results:
            cached_question, cached_embedding_blob, short_summary, long_summary, key_facts_json, confidence = row
            
            # Deserialize embedding
            cached_embedding = pickle.loads(cached_embedding_blob)
            
            # Calculate similarity
            similarity = calculate_cosine_similarity(question_embedding, cached_embedding)
            
            if similarity > best_similarity:
                best_similarity = similarity
                
                # Parse key_facts from JSON
                try:
                    key_facts = json.loads(key_facts_json)
                except (json.JSONDecodeError, TypeError):
                    key_facts = []
                
                best_match = {
                    "short_summary": short_summary,
                    "long_summary": long_summary,
                    "key_facts": key_facts,
                    "confidence": confidence,
                    "cached": True,
                    "similarity": similarity
                }
        
        # Return if above threshold
        if best_similarity >= threshold:
            return best_match
        
        return None


def save_summary(
    url: str,
    question: str,
    summary_data: Dict[str, Any],
    db_path: Optional[str] = None
) -> None:
    """
    Store summary with embedding in cache.
    
    Args:
        url: URL of the document
        question: Research question
        summary_data: Summary dictionary with required fields
        db_path: Optional custom database path
    """
    if db_path is None:
        db_path = str(CACHE_DB_PATH)
    
    # Thread-safe cache access
    with _cache_lock:
        # Generate embedding for question
        question_embedding = embed_text(question)
        
        # Serialize embedding
        embedding_blob = pickle.dumps(question_embedding)
        
        # Extract key facts as JSON string
        key_facts = summary_data.get("key_facts", [])
        key_facts_json = json.dumps(key_facts)
        
        conn = sqlite3.connect(db_path, timeout=10.0, check_same_thread=False)
        cursor = conn.cursor()
        
        try:
            cursor.execute(
                """
                INSERT OR REPLACE INTO summary_cache
                (url, question, question_embedding, short_summary, long_summary,
                 key_facts, confidence, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    url,
                    question,
                    embedding_blob,
                    summary_data.get("short_summary", ""),
                    summary_data.get("long_summary", ""),
                    key_facts_json,
                    summary_data.get("confidence", "medium"),
                    time.time()
                )
            )
            
            conn.commit()
        finally:
            conn.close()


def get_cache_stats(db_path: Optional[str] = None) -> Dict[str, int]:
    """
    Get cache statistics.
    
    Args:
        db_path: Optional custom database path
        
    Returns:
        Dictionary with cache statistics
    """
    if db_path is None:
        db_path = str(CACHE_DB_PATH)
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Count content cache entries
    cursor.execute("SELECT COUNT(*) FROM content_cache")
    content_count = cursor.fetchone()[0]
    
    # Count summary cache entries
    cursor.execute("SELECT COUNT(*) FROM summary_cache")
    summary_count = cursor.fetchone()[0]
    
    conn.close()
    
    return {
        "content_entries": content_count,
        "summary_entries": summary_count
    }
