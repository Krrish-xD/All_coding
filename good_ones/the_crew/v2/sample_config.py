"""
Sample configuration file for Deep Research Agent v2.

Copy this file to config.py and add your Gemini API key.

Usage:
    cp sample_config.py config.py
    # Edit config.py and add your API key
"""

# ============================================================================
# API Configuration
# ============================================================================

# Gemini API Key (required)
# Get your API key from: https://makersuite.google.com/app/apikey
GEMINI_API_KEY = "your-api-key-here"


# ============================================================================
# Model Configuration
# ============================================================================

# Model names for API calls (require "models/" prefix)
MODEL_LIGHTWEIGHT = "models/gemini-2.0-flash-lite"  # For API calls
MODEL_MIDTIER = "models/gemini-2.5-flash"           # For questions/reflection
MODEL_PREMIUM = "models/gemini-2.5-pro"             # For final reports

# Model name for gemini CLI (NO "models/" prefix)
SUMMARISER = "gemini-2.5-flash-lite"                # For gemini CLI subprocess


# ============================================================================
# Cache Configuration
# ============================================================================

# Content cache time-to-live in days
# Scraped content older than this will be re-fetched
CACHE_TTL_DAYS = 7

# Semantic similarity threshold for summary cache
# Higher values (closer to 1.0) require more similar questions for cache hits
# Lower values allow more cache reuse but may be less precise
SIMILARITY_THRESHOLD = 0.95


# ============================================================================
# Search & Diversity Configuration
# ============================================================================

# Maximum URLs from any single domain per research round
# Enforces source diversity to avoid echo chambers
MAX_URLS_PER_DOMAIN = 3


# ============================================================================
# Notes
# ============================================================================

# The global cache database (research_cache.db) is stored at v2/research_cache.db
# This cache persists across all research sessions, enabling the agent to learn
# and reuse knowledge over time.

# The gemini CLI tool must be installed separately:
#   pip install google-generativeai
#   # Then the 'gemini' command should be available

# Environment variable override:
# You can also set GEMINI_API_KEY as an environment variable instead of
# editing this file:
#   export GEMINI_API_KEY="your-key-here"
