---
inclusion: always
---

# Project Structure

## Root Directory

```
.
├── config.py                    # API keys and model configuration (gitignored)
├── GEMINI.md                    # Project documentation for AI assistants
├── future_ideas                 # Feature backlog
├── articles to refer/           # Research and improvement suggestions
│   ├── cache_system.txt
│   ├── ideas1.txt
│   ├── ideas2.txt
│   └── suggested_improvements_for_v1
├── cpp/                         # C++ performance extensions (v1 only)
│   ├── bindings.cpp            # pybind11 module definition
│   ├── scraper.cpp             # Parallel web scraper with libcurl
│   ├── textutils.cpp           # Fast text cleaning
│   └── urltools.cpp            # URL normalization
├── v1_prototype/                # Original hybrid Python/C++ implementation
│   ├── config.py               # Configuration (copy from sample_config.py)
│   ├── sample_config.py        # Template configuration file
│   ├── old_deep_research.py    # Main research agent script
│   ├── setup_ext.py            # C++ extension build script
│   ├── requirements.txt        # Python dependencies
│   ├── dresearch_cpp.*.so      # Compiled C++ extension (generated)
│   └── deep_research_sessions/ # Research session artifacts (generated)
└── v2/                          # Current development - modular pure Python
    ├── main.py                 # Entry point and orchestration
    ├── config.py               # User configuration file (created from sample_config.py)
    ├── sample_config.py        # Template configuration file with API keys and settings
    ├── models.py               # Dataclasses and configuration loading/validation
    ├── session.py              # Session initialization and artifact management
    ├── question_generator.py   # Question generation and deduplication
    ├── search.py               # Web search with quality scoring and diversity
    ├── scraper.py              # Concurrent web scraping
    ├── cache.py                # Semantic caching system
    ├── summarizer.py           # Gemini CLI-based summarization
    ├── report_compiler.py      # Final report generation with fact cross-referencing
    ├── llm_client.py           # Unified Gemini API interface with retry logic
    ├── utils.py                # Common helper functions
    ├── prompts.py              # Centralized prompt templates
    ├── requirements.txt        # Python dependencies
    ├── research_cache.db       # Global SQLite cache (persistent across sessions)
    └── deep_research_sessions/ # Research session artifacts (generated)
```

## Key Directories

### `/v1_prototype`
Original implementation with hybrid Python/C++ architecture for performance.
- Main script: `old_deep_research.py`
- C++ extensions for scraping and text processing
- Sessions saved to `deep_research_sessions/[session_id]/`

### `/v2` (Current Development)
Modular pure Python architecture emphasizing maintainability and cost efficiency.

**Module Responsibilities**:
- `main.py` - Entry point, CLI argument parsing, workflow orchestration
- `config.py` - User configuration file with API keys and settings (created from sample_config.py)
- `sample_config.py` - Template configuration file with placeholder values
- `models.py` - All dataclasses (ResearchConfig, SearchResult, Summary, etc.) and configuration loading/validation
- `session.py` - Session directory creation, artifact saving, logging
- `question_generator.py` - Initial and follow-up question generation, deduplication
- `search.py` - Query expansion, DuckDuckGo search, quality scoring, diversity enforcement
- `scraper.py` - Concurrent URL scraping with trafilatura, content extraction
- `cache.py` - Global SQLite database (v2/research_cache.db), embedding model, semantic similarity matching
- `summarizer.py` - Gemini CLI subprocess calls for summarization with cache integration
- `report_compiler.py` - Final report synthesis, fact cross-referencing, markdown formatting
- `llm_client.py` - Gemini API calls with retry decorator and error handling
- `utils.py` - URL normalization, text cleaning, JSON parsing, keyword extraction
- `prompts.py` - Centralized prompt templates with getter functions for formatting

### `/cpp`
C++ source files for v1 performance-critical operations (not used in v2).

### `/articles to refer`
Design documents and improvement suggestions that informed v2 architecture.

## Generated Artifacts

### v2 Session Directory Structure
```
v2/
├── research_cache.db            # Global cache (persistent across ALL sessions)
└── deep_research_sessions/
    └── [timestamp]_[session_id]/
        ├── config.json              # Session configuration
        ├── session.log              # Execution log with timestamps
        ├── round_1/
        │   ├── search_results.json  # URLs found per question with quality scores
        │   ├── scraped.jsonl        # Raw scraped content
        │   └── round.json           # Complete round data (questions, summaries, metadata)
        ├── round_2/
        │   └── ...
        └── final_report.md          # Compiled research report with citations
```

## Code Organization Patterns (v2)

### Modular Design Principles
- **Single Responsibility**: Each module handles one aspect of the research workflow
- **Clear Interfaces**: Dataclasses define contracts between modules
- **Dependency Injection**: Configuration and cache passed to functions
- **Pure Python**: No C++ dependencies, easier to maintain and extend
- **Caching-First**: Semantic cache integrated throughout to reduce costs

### Data Flow
```
User Input → ResearchConfig → Session Init → Question Generation
    ↓
Search (with expansion, scoring, diversity) → URLs
    ↓
Scraping (with content cache) → ScrapedDocuments
    ↓
Summarization (with semantic cache) → Summaries
    ↓
Reflection → Follow-up Questions → [Loop or Compile]
    ↓
Report Compilation (with fact cross-referencing) → Final Report
```

### Error Handling
- Graceful degradation (continue with partial results)
- Retry logic for API calls with exponential backoff
- Comprehensive logging to session.log
- User feedback for critical vs non-critical errors

### Naming Conventions
- Snake_case for Python functions and variables
- PascalCase for dataclasses (ResearchConfig, ScrapedDocument, Summary)
- Descriptive function names (generate_initial_questions, enforce_diversity, cross_reference_facts)
- Module names match their primary responsibility
