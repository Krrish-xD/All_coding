"""
Unit tests for cache.py module.
"""

import sys
import tempfile
import os
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from cache import (
    initialize_cache,
    embed_text,
    get_cached_content,
    save_content,
    check_summary_cache,
    save_summary,
    get_cache_stats
)
from utils import calculate_cosine_similarity


def test_initialize_cache():
    """Test cache initialization."""
    # Use temporary database
    with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as tmp:
        db_path = tmp.name
    
    try:
        # Initialize cache
        model = initialize_cache(db_path)
        
        # Check model loaded
        assert model is not None
        
        # Check database exists
        assert os.path.exists(db_path)
        
        print("✓ test_initialize_cache passed")
    finally:
        # Cleanup
        if os.path.exists(db_path):
            os.unlink(db_path)


def test_embed_text():
    """Test text embedding generation."""
    # Initialize cache first
    with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as tmp:
        db_path = tmp.name
    
    try:
        initialize_cache(db_path)
        
        # Generate embeddings
        text1 = "What are the benefits of solar power?"
        text2 = "What are the advantages of photovoltaic energy?"
        text3 = "What is the capital of France?"
        
        emb1 = embed_text(text1)
        emb2 = embed_text(text2)
        emb3 = embed_text(text3)
        
        # Check embeddings are lists of floats
        assert isinstance(emb1, list)
        assert len(emb1) > 0
        assert all(isinstance(x, float) for x in emb1)
        
        # Similar texts should have high similarity
        sim_similar = calculate_cosine_similarity(emb1, emb2)
        assert sim_similar > 0.7, f"Similar texts similarity too low: {sim_similar}"
        
        # Different texts should have lower similarity
        sim_different = calculate_cosine_similarity(emb1, emb3)
        assert sim_different < sim_similar, f"Different texts similarity not lower: {sim_different} vs {sim_similar}"
        
        print("✓ test_embed_text passed")
    finally:
        if os.path.exists(db_path):
            os.unlink(db_path)


def test_content_cache():
    """Test content caching."""
    with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as tmp:
        db_path = tmp.name
    
    try:
        initialize_cache(db_path)
        
        url = "https://example.com/article"
        text = "This is the article content."
        
        # Initially no cache
        cached = get_cached_content(url, ttl_days=7, db_path=db_path)
        assert cached is None
        
        # Save content
        save_content(url, text, db_path=db_path)
        
        # Should now be cached
        cached = get_cached_content(url, ttl_days=7, db_path=db_path)
        assert cached == text
        
        # Test TTL expiration (set to 0 days)
        cached = get_cached_content(url, ttl_days=0, db_path=db_path)
        assert cached is None  # Should be expired
        
        print("✓ test_content_cache passed")
    finally:
        if os.path.exists(db_path):
            os.unlink(db_path)


def test_summary_cache():
    """Test semantic summary caching."""
    with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as tmp:
        db_path = tmp.name
    
    try:
        initialize_cache(db_path)
        
        url = "https://example.com/article"
        question1 = "What are the benefits of solar power?"
        question2 = "What are the advantages of solar energy?"  # Similar
        question3 = "What is the capital of France?"  # Different
        
        summary_data = {
            "short_summary": "Solar power has many benefits.",
            "long_summary": "Solar power provides clean, renewable energy...",
            "key_facts": ["Reduces carbon emissions", "Lower energy costs"],
            "confidence": "high"
        }
        
        # Initially no cache
        cached = check_summary_cache(url, question1, threshold=0.95, db_path=db_path)
        assert cached is None
        
        # Save summary
        save_summary(url, question1, summary_data, db_path=db_path)
        
        # Should find exact match
        cached = check_summary_cache(url, question1, threshold=0.95, db_path=db_path)
        assert cached is not None
        assert cached["short_summary"] == summary_data["short_summary"]
        assert cached["cached"] is True
        
        # Should find similar question (lower threshold)
        cached = check_summary_cache(url, question2, threshold=0.7, db_path=db_path)
        assert cached is not None
        
        # Should NOT find different question
        cached = check_summary_cache(url, question3, threshold=0.95, db_path=db_path)
        assert cached is None
        
        print("✓ test_summary_cache passed")
    finally:
        if os.path.exists(db_path):
            os.unlink(db_path)


def test_cache_persistence():
    """Test that cache persists across sessions."""
    with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as tmp:
        db_path = tmp.name
    
    try:
        # First session
        initialize_cache(db_path)
        url = "https://example.com/test"
        text = "Test content"
        save_content(url, text, db_path=db_path)
        
        # Second session (reinitialize)
        initialize_cache(db_path)
        cached = get_cached_content(url, ttl_days=7, db_path=db_path)
        assert cached == text
        
        print("✓ test_cache_persistence passed")
    finally:
        if os.path.exists(db_path):
            os.unlink(db_path)


def test_cache_stats():
    """Test cache statistics."""
    with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as tmp:
        db_path = tmp.name
    
    try:
        initialize_cache(db_path)
        
        # Initially empty
        stats = get_cache_stats(db_path=db_path)
        assert stats["content_entries"] == 0
        assert stats["summary_entries"] == 0
        
        # Add content
        save_content("https://example.com/1", "Content 1", db_path=db_path)
        save_content("https://example.com/2", "Content 2", db_path=db_path)
        
        stats = get_cache_stats(db_path=db_path)
        assert stats["content_entries"] == 2
        
        # Add summary
        summary_data = {
            "short_summary": "Summary",
            "long_summary": "Long summary",
            "key_facts": [],
            "confidence": "high"
        }
        save_summary("https://example.com/1", "Question?", summary_data, db_path=db_path)
        
        stats = get_cache_stats(db_path=db_path)
        assert stats["summary_entries"] == 1
        
        print("✓ test_cache_stats passed")
    finally:
        if os.path.exists(db_path):
            os.unlink(db_path)


def run_all_tests():
    """Run all cache tests."""
    print("\nRunning cache.py tests...\n")
    
    test_initialize_cache()
    test_embed_text()
    test_content_cache()
    test_summary_cache()
    test_cache_persistence()
    test_cache_stats()
    
    print("\n✅ All cache.py tests passed!\n")


if __name__ == "__main__":
    run_all_tests()
