"""
Search module for the Deep Research Agent v2.

This module handles web search with query expansion, source quality scoring,
URL prioritization, and diversity enforcement.
"""

from typing import List, Dict, Tuple
from urllib.parse import urlparse
from collections import defaultdict

from ddgs import DDGS

from models import SearchResult
from utils import deduplicate_urls
from logger import get_logger

logger = get_logger("search")


def expand_query(question: str, topic: str) -> List[str]:
    """
    Generate multiple search query variants for comprehensive coverage.
    
    Args:
        question: Research question
        topic: Main research topic
        
    Returns:
        List of query variants
    """
    queries = [
        question,                           # Original question
        f"{topic} {question}",             # With topic context
        f"{question} research study",      # Academic variant
        f"{question} 2024 2025"           # Recent variant
    ]
    
    return queries


def should_skip_url(url: str) -> bool:
    """
    Filter out irrelevant or non-English domains.
    
    Args:
        url: URL to check
        
    Returns:
        True if URL should be skipped
    """
    skip_domains = [
        'zhidao.baidu.com',
        'zhihu.com',
        'baidu.com',
        'yahoo.co.jp',
        'chiebukuro.yahoo.co.jp',
        'tieba.baidu.com',
        'weibo.com'
    ]
    
    try:
        parsed = urlparse(url.lower())
        domain = parsed.netloc
        
        # Skip if domain matches skip list
        if any(skip in domain for skip in skip_domains):
            return True
        
        # Skip if URL contains Chinese characters
        if any('\u4e00' <= char <= '\u9fff' for char in url):
            return True
        
        return False
    except:
        return False


def search_with_expansion(
    question: str,
    topic: str,
    max_results: int = 10
) -> List[SearchResult]:
    """
    Execute multi-query search with expansion and filtering.
    
    Args:
        question: Research question
        topic: Main research topic
        max_results: Maximum results per query
        
    Returns:
        List of SearchResult objects (filtered for relevance)
    """
    # Generate query variants
    queries = expand_query(question, topic)
    
    all_results = []
    
    # Execute each query
    for query in queries:
        try:
            with DDGS() as ddgs:
                # Use India region for search results
                results = list(ddgs.text(
                    query, 
                    max_results=max_results,
                    region='in-en',  # India, English results
                    safesearch='moderate'
                ))
                
                for result in results:
                    url = result.get('href', '')
                    
                    # Filter out non-English and irrelevant sites
                    if should_skip_url(url):
                        logger.debug(f"Skipping irrelevant URL: {url}")
                        continue
                    
                    search_result = SearchResult(
                        title=result.get('title', ''),
                        snippet=result.get('body', ''),
                        url=url
                    )
                    all_results.append(search_result)
        
        except Exception as e:
            logger.warning(f"Search error for query '{query}': {e}")
            continue
    
    return all_results


def merge_search_results(results_list: List[SearchResult]) -> List[SearchResult]:
    """
    Combine and deduplicate search results.
    
    Args:
        results_list: List of SearchResult objects
        
    Returns:
        Deduplicated list of SearchResult objects
    """
    # Use URL as deduplication key
    seen_urls = set()
    unique_results = []
    
    for result in results_list:
        normalized_url = result.url.lower().rstrip('/')
        if normalized_url not in seen_urls:
            seen_urls.add(normalized_url)
            unique_results.append(result)
    
    return unique_results


def score_source_quality(url: str) -> int:
    """
    Assign quality score to a source URL based on domain authority.
    
    Scoring:
    - Base score: 3
    - Academic/Gov (.edu, .gov, arxiv.org, nature.com, science.org): +2
    - Established news (reuters.com, apnews.com, bbc.com, nytimes.com): +1
    - Personal blogs (wordpress, medium.com, blogspot): -1
    - Final score clamped to 1-5
    
    Args:
        url: URL to score
        
    Returns:
        Quality score (1-5)
    """
    score = 3  # Base score
    
    try:
        parsed = urlparse(url.lower())
        domain = parsed.netloc
        
        # Academic and government sources
        academic_gov = ['.edu', '.gov', 'arxiv.org', 'nature.com', 'science.org',
                       'sciencedirect.com', 'springer.com', 'ieee.org', 'acm.org']
        if any(d in domain for d in academic_gov):
            score += 2
        
        # Established news organizations
        news_orgs = ['reuters.com', 'apnews.com', 'bbc.com', 'bbc.co.uk',
                    'nytimes.com', 'wsj.com', 'theguardian.com', 'economist.com']
        if any(d in domain for d in news_orgs):
            score += 1
        
        # Personal blog platforms
        blog_platforms = ['wordpress', 'medium.com', 'blogspot', 'tumblr']
        if any(d in domain for d in blog_platforms):
            score -= 1
        
        # Clamp to 1-5 range
        score = max(1, min(5, score))
        
    except Exception:
        score = 3  # Default on error
    
    return score


def prioritize_urls(results: List[SearchResult]) -> List[SearchResult]:
    """
    Sort URLs by quality score (academic sources first).
    
    Args:
        results: List of SearchResult objects
        
    Returns:
        Sorted list with quality scores assigned
    """
    # Assign quality scores
    for result in results:
        result.quality_score = score_source_quality(result.url)
    
    # Sort by quality score (descending)
    sorted_results = sorted(results, key=lambda x: x.quality_score, reverse=True)
    
    return sorted_results


def enforce_diversity(
    results: List[SearchResult],
    max_per_domain: int = 3
) -> List[SearchResult]:
    """
    Limit URLs from any single domain to enforce diversity.
    
    Args:
        results: List of SearchResult objects
        max_per_domain: Maximum URLs per domain
        
    Returns:
        Filtered list with diversity enforced
    """
    domain_counts: Dict[str, int] = defaultdict(int)
    diverse_results = []
    
    for result in results:
        try:
            parsed = urlparse(result.url.lower())
            domain = parsed.netloc
            
            if domain_counts[domain] < max_per_domain:
                diverse_results.append(result)
                domain_counts[domain] += 1
        
        except Exception:
            # Include if we can't parse domain
            diverse_results.append(result)
    
    return diverse_results


def ensure_reddit_minimum(
    results: List[SearchResult],
    topic: str,
    min_reddit: int = 1
) -> List[SearchResult]:
    """
    Ensure minimum number of Reddit URLs in results (first round only).
    
    Args:
        results: Current search results
        topic: Research topic
        min_reddit: Minimum Reddit links required
        
    Returns:
        Results with Reddit links added if needed
    """
    # Count existing Reddit URLs
    reddit_count = sum(1 for r in results if 'reddit.com' in r.url.lower())
    
    if reddit_count >= min_reddit:
        return results
    
    # Need more Reddit links
    needed = min_reddit - reddit_count
    
    try:
        # Search specifically on Reddit
        reddit_query = f"site:reddit.com {topic}"
        
        with DDGS() as ddgs:
            reddit_results = list(ddgs.text(reddit_query, max_results=needed * 2))
            
            for result in reddit_results:
                if needed <= 0:
                    break
                
                url = result.get('href', '')
                if 'reddit.com' in url.lower():
                    search_result = SearchResult(
                        title=result.get('title', ''),
                        snippet=result.get('body', ''),
                        url=url,
                        quality_score=3  # Neutral score for Reddit
                    )
                    results.append(search_result)
                    needed -= 1
    
    except Exception as e:
        from logger import get_logger
        logger = get_logger("search")
        logger.warning(f"Error fetching Reddit links: {e}")
    
    return results


def search_for_question(
    question: str,
    topic: str,
    top_k: int = 8,
    max_per_domain: int = 3,
    is_first_round: bool = False,
    reddit_min: int = 1
) -> List[str]:
    """
    Complete search pipeline for a research question.
    
    Args:
        question: Research question
        topic: Main research topic
        top_k: Number of URLs to return
        max_per_domain: Maximum URLs per domain
        is_first_round: Whether this is the first research round
        reddit_min: Minimum Reddit links (first round only)
        
    Returns:
        List of URLs
    """
    # Execute search with expansion
    results = search_with_expansion(question, topic, max_results=10)
    
    # Merge and deduplicate
    results = merge_search_results(results)
    
    # Score and prioritize
    results = prioritize_urls(results)
    
    # Enforce diversity
    results = enforce_diversity(results, max_per_domain)
    
    # Ensure Reddit minimum (first round only)
    if is_first_round and reddit_min > 0:
        results = ensure_reddit_minimum(results, topic, reddit_min)
    
    # Select top K
    top_results = results[:top_k]
    
    # Extract URLs
    urls = [r.url for r in top_results]
    
    return urls
