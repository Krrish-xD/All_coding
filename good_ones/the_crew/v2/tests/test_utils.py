"""
Unit tests for utils.py module.
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from utils import (
    normalize_url,
    deduplicate_urls,
    clean_text,
    safe_json_parse,
    extract_keywords,
    calculate_cosine_similarity
)


def test_normalize_url():
    """Test URL normalization."""
    # Test lowercase domain
    assert normalize_url("https://Example.com/path") == "https://example.com/path"
    
    # Test trailing slash removal
    assert normalize_url("https://example.com/path/") == "https://example.com/path"
    
    # Test fragment removal
    assert normalize_url("http://site.com#fragment") == "http://site.com"
    assert normalize_url("http://site.com/page#section") == "http://site.com/page"
    
    # Test combined
    assert normalize_url("https://Example.COM/Path/#fragment") == "https://example.com/Path"
    
    print("✓ test_normalize_url passed")


def test_deduplicate_urls():
    """Test URL deduplication."""
    urls = [
        "https://example.com/page",
        "https://Example.com/page/",  # Duplicate (different case and trailing slash)
        "https://example.com/other",
        "https://example.com/page#section"  # Duplicate (fragment)
    ]
    
    result = deduplicate_urls(urls)
    
    # Should have 2 unique URLs
    assert len(result) == 2
    assert "https://example.com/page" in result
    assert "https://example.com/other" in result
    
    print("✓ test_deduplicate_urls passed")


def test_clean_text():
    """Test text cleaning."""
    # Test multiple whitespace
    assert clean_text("hello    world") == "hello world"
    
    # Test newlines and tabs
    assert clean_text("hello\n\n\tworld") == "hello world"
    
    # Test leading/trailing whitespace
    assert clean_text("  hello world  ") == "hello world"
    
    # Test empty string
    assert clean_text("") == ""
    
    # Test None
    assert clean_text(None) == ""
    
    print("✓ test_clean_text passed")


def test_safe_json_parse():
    """Test JSON parsing from various formats."""
    # Test direct JSON
    result = safe_json_parse('{"key": "value"}')
    assert result == {"key": "value"}
    
    # Test JSON in markdown code block
    result = safe_json_parse('```json\n{"key": "value"}\n```')
    assert result == {"key": "value"}
    
    # Test JSON without language specifier
    result = safe_json_parse('```\n{"key": "value"}\n```')
    assert result == {"key": "value"}
    
    # Test JSON with surrounding text
    result = safe_json_parse('Here is the result: {"key": "value"} and more text')
    assert result == {"key": "value"}
    
    # Test array
    result = safe_json_parse('["item1", "item2"]')
    assert result == ["item1", "item2"]
    
    # Test invalid JSON
    result = safe_json_parse('not json at all')
    assert result == {}
    
    # Test empty string
    result = safe_json_parse('')
    assert result == {}
    
    print("✓ test_safe_json_parse passed")


def test_extract_keywords():
    """Test keyword extraction."""
    text = "What are the benefits of solar power?"
    keywords = extract_keywords(text)
    
    # Should extract words >= 4 characters
    assert "what" in keywords
    assert "benefits" in keywords
    assert "solar" in keywords
    assert "power" in keywords
    
    # Should not include short words
    assert "are" not in keywords
    assert "the" not in keywords
    assert "of" not in keywords
    
    # Test minimum length parameter
    keywords = extract_keywords(text, min_length=6)
    assert "benefits" in keywords
    assert "solar" not in keywords  # Only 5 characters
    
    # Test empty string
    assert extract_keywords("") == []
    
    print("✓ test_extract_keywords passed")


def test_calculate_cosine_similarity():
    """Test cosine similarity calculation."""
    # Test identical vectors
    vec1 = [1.0, 0.0, 0.0]
    vec2 = [1.0, 0.0, 0.0]
    assert abs(calculate_cosine_similarity(vec1, vec2) - 1.0) < 0.001
    
    # Test orthogonal vectors
    vec1 = [1.0, 0.0, 0.0]
    vec2 = [0.0, 1.0, 0.0]
    assert abs(calculate_cosine_similarity(vec1, vec2) - 0.0) < 0.001
    
    # Test opposite vectors
    vec1 = [1.0, 0.0, 0.0]
    vec2 = [-1.0, 0.0, 0.0]
    assert abs(calculate_cosine_similarity(vec1, vec2) - (-1.0)) < 0.001
    
    # Test similar vectors
    vec1 = [1.0, 1.0, 0.0]
    vec2 = [1.0, 0.9, 0.0]
    similarity = calculate_cosine_similarity(vec1, vec2)
    assert 0.9 < similarity < 1.0
    
    # Test zero vector
    vec1 = [0.0, 0.0, 0.0]
    vec2 = [1.0, 1.0, 1.0]
    assert calculate_cosine_similarity(vec1, vec2) == 0.0
    
    print("✓ test_calculate_cosine_similarity passed")


def run_all_tests():
    """Run all tests."""
    print("\nRunning utils.py tests...\n")
    
    test_normalize_url()
    test_deduplicate_urls()
    test_clean_text()
    test_safe_json_parse()
    test_extract_keywords()
    test_calculate_cosine_similarity()
    
    print("\n✅ All utils.py tests passed!\n")


if __name__ == "__main__":
    run_all_tests()
