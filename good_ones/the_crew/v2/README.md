# Deep Research Agent v2

An autonomous LLM-based research system that conducts comprehensive, multi-round investigations on complex topics using AI-powered analysis and intelligent web scraping.

## Features

- **Intelligent Semantic Caching**: Vector-based caching reduces API costs by reusing summaries for similar questions
- **Source Quality Assessment**: Prioritizes academic, government, and authoritative sources
- **Multi-Tier Model Orchestration**: Uses expensive models only when necessary
- **URL Diversity Enforcement**: Limits sources per domain to avoid echo chambers
- **Question Deduplication**: Prevents redundant questions across research rounds
- **Query Expansion**: Generates multiple search variants per question for comprehensive coverage
- **Fact Cross-Referencing**: Identifies multi-source claims vs single-source claims in final reports
- **Session Management**: All artifacts saved for auditability and resumption

## Installation

### Prerequisites

- Python 3.9+
- pip or conda package manager

### Step 1: Install Python Dependencies

```bash
cd v2
pip install -r requirements.txt
```

### Step 2: Install Gemini CLI

The agent uses the `gemini` CLI tool for summarization:

```bash
pip install google-generativeai
```

Verify installation:

```bash
gemini --version
```

### Step 3: Configure API Key

Create a `config.py` file from the sample and add your Gemini API key:

```bash
cp sample_config.py config.py
```

Edit `config.py` and add your API key:

```python
GEMINI_API_KEY = "your-api-key-here"
```

**Note**: `config.py` is gitignored and contains your API keys. `models.py` contains the data models and should not be modified.

Get your API key from: https://makersuite.google.com/app/apikey

Alternatively, set as environment variable:

```bash
export GEMINI_API_KEY="your-api-key-here"
```

## Usage

### Basic Usage

```bash
python main.py --topic "renewable energy trends"
```

### Advanced Usage

```bash
python main.py \
  --topic "artificial intelligence safety" \
  --preferences "focus on recent developments and technical approaches" \
  --depth 3 \
  --top_k 10 \
  --docs_per_q 5 \
  --reddit_min 2
```

### Command-Line Arguments

- `--topic` (required): Research topic
- `--preferences` (optional): Additional guidance for research
- `--depth` (default: 2): Maximum number of research rounds
- `--top_k` (default: 8): URLs to process per round
- `--docs_per_q` (default: 5): Documents to summarize per question
- `--reddit_min` (default: 1): Minimum Reddit links in first round

## How It Works

### Research Workflow

1. **Initial Question Generation**: Breaks down the topic into 5-6 focused sub-questions
2. **Research Rounds** (iterative):
   - **Search Phase**: Expands queries, searches DuckDuckGo, scores sources, enforces diversity
   - **Scraping Phase**: Concurrently scrapes URLs, extracts content with trafilatura
   - **Summarization Phase**: Checks semantic cache, calls gemini CLI if needed, saves to cache
3. **Reflection**: Analyzes gaps, generates follow-up questions, deduplicates
4. **Final Report**: Synthesizes findings, cross-references facts, generates markdown report

### Global Cache

The agent maintains a global cache at `v2/research_cache.db` that persists across all sessions:

- **Content Cache**: Stores scraped web content (TTL: 7 days)
- **Semantic Summary Cache**: Stores summaries with vector embeddings for similarity matching

This enables the agent to learn and reuse knowledge over time, significantly reducing API costs.

### Output Structure

```
v2/
├── research_cache.db           # Global cache (persistent)
└── deep_research_sessions/
    └── 2025-01-15T10-30-00_abc123/
        ├── config.json
        ├── session.log
        ├── round_1/
        │   ├── search_results.json
        │   ├── scraped.jsonl
        │   └── round.json
        ├── round_2/
        │   └── ...
        └── final_report.md
```

## Configuration

Edit `config.py` to customize:

### Model Configuration

```python
# API models (require "models/" prefix)
MODEL_LIGHTWEIGHT = "models/gemini-2.0-flash-lite"  # For API calls
MODEL_MIDTIER = "models/gemini-2.5-flash"           # For questions/reflection
MODEL_PREMIUM = "models/gemini-2.5-pro"             # For final reports

# CLI model (NO "models/" prefix)
SUMMARISER = "gemini-2.5-flash-lite"                # For gemini CLI
```

### Cache Configuration

```python
CACHE_TTL_DAYS = 7                # Content cache expiration
SIMILARITY_THRESHOLD = 0.95       # Semantic cache similarity threshold
```

### Diversity Configuration

```python
MAX_URLS_PER_DOMAIN = 3           # URL diversity enforcement
```

## Architecture

### Modules

- `main.py` - Entry point and workflow orchestration
- `config.py` - Configuration and data models
- `session.py` - Session management and artifact saving
- `cache.py` - Semantic caching with SQLite + embeddings
- `llm_client.py` - Gemini API interface with retry logic
- `search.py` - Web search with quality scoring
- `scraper.py` - Concurrent web scraping
- `question_generator.py` - Question generation and deduplication
- `summarizer.py` - Gemini CLI subprocess for summarization
- `report_compiler.py` - Final report with fact cross-referencing
- `prompts.py` - Centralized prompt templates
- `utils.py` - Common helper functions

### Key Design Principles

1. **Modularity**: Each component has a single, well-defined responsibility
2. **Caching-First**: Semantic cache reduces redundant API calls and scraping
3. **Quality-Aware**: Source scoring and fact cross-referencing ensure reliability
4. **Cost-Conscious**: Model tiering uses expensive models only when necessary
5. **Pure Python**: No C++ dependencies; all helpers are Python modules
6. **Persistence**: All artifacts saved for auditability and resumption

## Troubleshooting

### "gemini CLI not found"

Install the google-generativeai package:

```bash
pip install google-generativeai
```

### "GEMINI_API_KEY is required"

Set your API key in `config.py` or as an environment variable:

```bash
export GEMINI_API_KEY="your-key-here"
```

### Cache Issues

If you encounter cache errors, you can delete and rebuild the cache:

```bash
rm v2/research_cache.db
```

The cache will be recreated on the next run.

### Import Errors

Ensure all dependencies are installed:

```bash
pip install -r requirements.txt
```

## Performance

### Target Metrics

- Single round completion: 2-5 minutes (depending on URL count)
- Full research session (3 rounds): 10-20 minutes
- Cache hit rate: >50% for content, >30% for summaries (after first run)
- API cost per session: $0.10-$0.50 (depending on depth and cache hits)

### Optimization Tips

1. **Use caching**: Run similar research topics to benefit from cache reuse
2. **Adjust depth**: Start with `--depth 2` for faster results
3. **Limit URLs**: Use `--top_k 5` for quicker rounds
4. **Monitor costs**: Check cache statistics at the end of each session

## License

[Your License Here]

## Contributing

[Your Contributing Guidelines Here]

## Support

For issues and questions, please [open an issue](your-repo-url).
