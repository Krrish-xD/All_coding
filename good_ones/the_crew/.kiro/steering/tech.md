---
inclusion: always
---

# Technology Stack

## Core Technologies

### v1 (Prototype)
- **Language**: Python 3.13+ with C++20 extensions
- **Performance**: Hybrid Python/C++ with pybind11 bindings
- **Web Scraping**: libcurl (C++), trafilatura, BeautifulSoup4

### v2 (Current Development)
- **Language**: Pure Python 3.9+
- **AI/LLM**: Google Gemini API with multi-tier orchestration
  - `gemini-2.5-flash-lite` - Lightweight for summaries
  - `gemini-2.5-flash` - Mid-tier for questions/reflection
  - `gemini-2.5-pro` - Premium for final reports
- **Search**: DuckDuckGo Search API with query expansion
- **Web Scraping**: trafilatura, requests (pure Python)
- **Caching**: SQLite + sentence-transformers for semantic caching
- **Embeddings**: sentence-transformers/all-MiniLM-L6-v2 (local model)
- **CLI Output**: rich library for progress bars and formatting

## Key Dependencies (v2)

```
google-generativeapi>=0.7.0
ddgs>=6.2.6
trafilatura>=1.8.0
requests>=2.32.3
sentence-transformers>=2.2.0
numpy>=1.24.0
rich>=13.0.0
```

## Common Commands

### v1 (Prototype)
```bash
# Install dependencies
pip install -r v1_prototype/requirements.txt

# Build C++ extension
cd v1_prototype
python setup_ext.py build_ext --inplace

# Run research agent
python old_deep_research.py --topic "Your Topic" --depth 2 --top_k 8
```

### v2 (Current Development)
```bash
# Install dependencies
pip install -r v2/requirements.txt

# Run research agent
cd v2
python main.py \
  --topic "renewable energy trends" \
  --preferences "focus on recent developments" \
  --depth 3 \
  --top_k 10 \
  --docs_per_q 5

# Configuration
# Copy sample config or create config.py with API keys
cp sample_config.py config.py
# Edit config.py to add GEMINI_API_KEY
```

## Configuration (v2)

Configuration is split between two files:

### `v2/config.py` (User Configuration)
User creates this file from `sample_config.py` and adds their API keys and settings:

```python
# API Keys
GEMINI_API_KEY = "your-key-here"

# Model Tier Selection (API calls require "models/" prefix)
MODEL_LIGHTWEIGHT = "models/gemini-2.0-flash-lite"  # For API calls
MODEL_MIDTIER = "models/gemini-2.5-flash"           # For API calls
MODEL_PREMIUM = "models/gemini-2.5-pro"             # For API calls

# Gemini CLI Model (no "models/" prefix)
SUMMARISER = "gemini-2.5-flash-lite"                # For gemini CLI subprocess

# Cache Configuration
CACHE_TTL_DAYS = 7                # Content cache expiration
SIMILARITY_THRESHOLD = 0.95       # Semantic cache similarity threshold

# Diversity Configuration
MAX_URLS_PER_DOMAIN = 3           # URL diversity enforcement
```

### `v2/models.py` (Data Models & Loading)
Contains all dataclasses and configuration loading/validation logic:
- `ResearchConfig` - Main configuration dataclass
- `SearchResult`, `ScrapedDocument`, `Summary` - Data models
- `load_config_from_args()` - Creates ResearchConfig from CLI args
- `validate_config()` - Validates configuration completeness

Environment variable overrides are supported:
```bash
export GEMINI_API_KEY="your-key"
python main.py --topic "Your Topic"
```

## Architecture Notes

### v1 Architecture
- **Hybrid Performance**: C++ handles I/O-bound (scraping) and CPU-bound (text cleaning) operations
- **Graceful Degradation**: Python fallbacks ensure functionality without C++ compilation
- **Parallel Processing**: ThreadPoolExecutor for concurrent operations
- **5-10x Speedup**: C++ extensions provide significant performance gains

### v2 Architecture
- **Pure Python**: No compilation required, easier to maintain and extend
- **Modular Design**: Clear separation of concerns across 12 modules
- **Intelligent Caching**: Semantic cache reduces API costs by 60-70%
- **Cost Optimization**: Multi-tier model orchestration uses expensive models only when necessary
- **Quality-First**: Source scoring and fact cross-referencing prioritize reliability
- **Concurrent Operations**: ThreadPoolExecutor for scraping and summarization
- **Local Embeddings**: sentence-transformers runs locally (no API calls for embeddings)
- **Retry Logic**: Decorator-based retry with exponential backoff for API resilience

### Performance Characteristics (v2)
- **Single Round**: 2-5 minutes (depending on URL count)
- **Full Session (3 rounds)**: 10-20 minutes
- **Cache Hit Rate Target**: >50% content, >30% summaries (after first run)
- **API Cost per Session**: $0.10-$0.50 (with caching and model tiering)

## Data Storage

### v2 Storage Systems
- **SQLite Database**: `v2/research_cache.db` - Global cache persistent across ALL sessions
  - Content cache: URL → text, timestamp
  - Summary cache: URL + question embedding → summary, metadata
  - Single database file enables long-term learning and cost savings
- **JSON Files**: Session artifacts (config, search results, round data)
- **JSONL Files**: Scraped documents (one JSON object per line)
- **Markdown Files**: Final research reports

### Cache Schema
```sql
-- Content cache (avoid re-scraping)
CREATE TABLE content_cache (
    url TEXT PRIMARY KEY,
    text TEXT,
    timestamp REAL,
    char_count INTEGER
);

-- Semantic summary cache (avoid redundant LLM calls)
CREATE TABLE summary_cache (
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
);
```

## Development Workflow

### Adding New Features (v2)
1. Identify the appropriate module for the feature
2. Update dataclasses in `models.py` if needed
3. Implement feature with type hints
4. Add error handling and logging
5. Update tests in corresponding test file
6. Document in module docstring

### Testing Strategy
- **Unit Tests**: pytest for individual module functions
- **Integration Tests**: Test module interactions with mocked external APIs
- **Manual Tests**: End-to-end research sessions on real topics

### Code Quality
- Type hints for all function signatures
- Docstrings for all public functions
- Error handling with graceful degradation
- Comprehensive logging to session.log
