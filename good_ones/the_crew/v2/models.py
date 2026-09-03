"""
Configuration and data models for the Deep Research Agent v2.

This module defines all dataclasses used throughout the application
and provides configuration loading/validation functions.
"""

from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional


@dataclass
class ResearchConfig:
    """Main configuration for a research session."""
    
    # Research parameters
    topic: str
    preferences: str
    max_depth: int
    top_k_per_round: int
    docs_per_question: int
    reddit_min_first_round: int
    
    # Cache configuration
    cache_ttl_days: int = 7
    similarity_threshold: float = 0.9
    max_urls_per_domain: int = 3
    
    # Model configuration
    # API models require "models/" prefix
    model_lightweight: str = "models/gemini-2.0-flash-lite"
    model_midtier: str = "models/gemini-2.5-flash"
    model_premium: str = "models/gemini-2.5-pro"
    
    # CLI model does NOT use "models/" prefix
    summariser: str = "gemini-2.5-flash-lite"
    
    # API keys
    gemini_api_key: str = ""
    
    # Session metadata
    session_id: str = ""
    session_dir: str = ""
    timestamp: str = ""


@dataclass
class SearchResult:
    """Single search result from DuckDuckGo."""
    title: str
    snippet: str
    url: str
    quality_score: int = 3


@dataclass
class ScrapedDocument:
    """Scraped web content."""
    url: str
    text: str
    error: str = ""
    timestamp: str = ""
    char_count: int = 0


@dataclass
class Summary:
    """Structured summary of documents."""
    short_summary: str
    long_summary: str
    key_facts: List[str]
    conflicts: str
    confidence: str  # "high", "medium", or "low"
    sources: List[Dict[str, Any]]  # [{"url": str, "relevance_score": int}]
    cached: bool = False


@dataclass
class ResearchRound:
    """Complete data for one research round."""
    round_number: int
    questions: List[str]
    search_results: Dict[str, List[str]]  # question -> urls
    scraped_documents: List[ScrapedDocument]
    summaries: List[Dict[str, Any]]  # question + summary pairs
    timestamp: str


@dataclass
class CacheStats:
    """Cache performance metrics."""
    content_hits: int = 0
    content_misses: int = 0
    summary_hits: int = 0
    summary_misses: int = 0
    
    @property
    def content_hit_rate(self) -> float:
        """Calculate content cache hit rate."""
        total = self.content_hits + self.content_misses
        return self.content_hits / total if total > 0 else 0.0
    
    @property
    def summary_hit_rate(self) -> float:
        """Calculate summary cache hit rate."""
        total = self.summary_hits + self.summary_misses
        return self.summary_hits / total if total > 0 else 0.0


def load_config_from_args(args) -> ResearchConfig:
    """
    Create ResearchConfig from command-line arguments.
    
    Args:
        args: Parsed command-line arguments
        
    Returns:
        ResearchConfig instance
    """
    import os
    from datetime import datetime
    import uuid
    
    # Try to load configuration from config file or environment
    api_key = os.getenv("GEMINI_API_KEY", "")
    model_lightweight = None
    model_midtier = None
    model_premium = None
    summariser = None
    cache_ttl_days = None
    similarity_threshold = None
    max_urls_per_domain = None
    
    # Try to import from user's config.py file
    try:
        import config
        api_key = api_key or getattr(config, 'GEMINI_API_KEY', '')
        model_lightweight = getattr(config, 'MODEL_LIGHTWEIGHT', None)
        model_midtier = getattr(config, 'MODEL_MIDTIER', None)
        model_premium = getattr(config, 'MODEL_PREMIUM', None)
        summariser = getattr(config, 'SUMMARISER', None)
        cache_ttl_days = getattr(config, 'CACHE_TTL_DAYS', None)
        similarity_threshold = getattr(config, 'SIMILARITY_THRESHOLD', None)
        max_urls_per_domain = getattr(config, 'MAX_URLS_PER_DOMAIN', None)
    except ImportError:
        pass
    
    # Generate session metadata
    timestamp = datetime.now().strftime("%Y-%m-%dT%H-%M-%S")
    session_id = str(uuid.uuid4())[:8]
    session_dir = f"deep_research_sessions/{timestamp}_{session_id}"
    
    # Build config with loaded values (use defaults if not in config.py)
    config_dict = {
        "topic": args.topic,
        "preferences": args.preferences,
        "max_depth": args.depth,
        "top_k_per_round": args.top_k,
        "docs_per_question": args.docs_per_q,
        "reddit_min_first_round": args.reddit_min,
        "gemini_api_key": api_key,
        "session_id": session_id,
        "session_dir": session_dir,
        "timestamp": timestamp
    }
    
    # Add optional config values if they were loaded
    if model_lightweight:
        config_dict["model_lightweight"] = model_lightweight
    if model_midtier:
        config_dict["model_midtier"] = model_midtier
    if model_premium:
        config_dict["model_premium"] = model_premium
    if summariser:
        config_dict["summariser"] = summariser
    if cache_ttl_days is not None:
        config_dict["cache_ttl_days"] = cache_ttl_days
    if similarity_threshold is not None:
        config_dict["similarity_threshold"] = similarity_threshold
    if max_urls_per_domain is not None:
        config_dict["max_urls_per_domain"] = max_urls_per_domain
    
    config = ResearchConfig(**config_dict)
    
    return config


def validate_config(config: ResearchConfig) -> bool:
    """
    Validate configuration has all required fields.
    
    Args:
        config: ResearchConfig to validate
        
    Returns:
        True if valid, raises ValueError if invalid
    """
    if not config.topic:
        raise ValueError("Topic is required")
    
    if not config.gemini_api_key:
        raise ValueError("GEMINI_API_KEY is required (set in config.py or environment)")
    
    if config.max_depth < 1:
        raise ValueError("max_depth must be at least 1")
    
    if config.top_k_per_round < 1:
        raise ValueError("top_k_per_round must be at least 1")
    
    if config.docs_per_question < 1:
        raise ValueError("docs_per_question must be at least 1")
    
    return True


def save_config(config: ResearchConfig, path: str) -> None:
    """
    Save configuration to JSON file.
    
    Args:
        config: ResearchConfig to save
        path: Path to save JSON file
    """
    import json
    from dataclasses import asdict
    
    with open(path, 'w') as f:
        json.dump(asdict(config), f, indent=2)
