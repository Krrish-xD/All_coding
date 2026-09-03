"""
Unit tests for search.py module.
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from search import (
    expand_query,
    score_source_quality,
    prioritize_urls,
    enforce_diversity
)
from models import SearchResult


def test_expand_query():
    """Test query expansion."""
    queries = expand_query("What is solar power?", "renewable energy")
    
    assert len(queries) == 4
    assert "What is solar power?" in queries
    assert "renewable energy What is solar power?" in queries
    assert "What is solar power? research study" in queries
    assert "What is solar power? 2024 2025" in queries
    
    print("✓ test_expand_query passed")


def test_score_source_quality():
    """Test source quality scoring."""
    # Academic sources
    assert score_source_quality("https://arxiv.org/paper") >= 4
    assert score_source_quality("https://mit.edu/research") >= 4
    assert score_source_quality("https://nature.com/article") >= 4
    
    # News sources
    assert score_source_quality("https://reuters.com/article") >= 3
    assert score_source_quality("https://bbc.com/news") >= 3
    
    # Blog platforms
    assert score_source_quality("https://myblog.wordpress.com") <= 3
    assert score_source_quality("https://medium.com/@user/post") <= 3
    
    # Regular sites
    assert score_source_quality("https://example.com") == 3
    
    print("✓ test_score_source_quality passed")


def test_prioritize_urls():
    """Test URL prioritization."""
    results = [
        SearchResult("Title 1", "Snippet 1", "https://example.com"),
        SearchResult("Title 2", "Snippet 2", "https://arxiv.org/paper"),
        SearchResult("Title 3", "Snippet 3", "https://myblog.wordpress.com"),
    ]
    
    prioritized = prioritize_urls(results)
    
    # Academic source should be first
    assert "arxiv.org" in prioritized[0].url
    assert prioritized[0].quality_score >= 4
    
    # Blog should be last
    assert "wordpress" in prioritized[-1].url
    assert prioritized[-1].quality_score <= 3
    
    print("✓ test_prioritize_urls passed")


def test_enforce_diversity():
    """Test diversity enforcement."""
    results = [
        SearchResult("Title 1", "Snippet 1", "https://example.com/page1", quality_score=5),
        SearchResult("Title 2", "Snippet 2", "https://example.com/page2", quality_score=5),
        SearchResult("Title 3", "Snippet 3", "https://example.com/page3", quality_score=5),
        SearchResult("Title 4", "Snippet 4", "https://example.com/page4", quality_score=5),
        SearchResult("Title 5", "Snippet 5", "https://other.com/page1", quality_score=3),
    ]
    
    diverse = enforce_diversity(results, max_per_domain=2)
    
    # Should have max 2 from example.com
    example_count = sum(1 for r in diverse if "example.com" in r.url)
    assert example_count <= 2
    
    # Should include other.com
    assert any("other.com" in r.url for r in diverse)
    
    print("✓ test_enforce_diversity passed")


def run_all_tests():
    """Run all tests."""
    print("\nRunning search.py tests...\n")
    
    test_expand_query()
    test_score_source_quality()
    test_prioritize_urls()
    test_enforce_diversity()
    
    print("\n✅ All search.py tests passed!\n")


if __name__ == "__main__":
    run_all_tests()
