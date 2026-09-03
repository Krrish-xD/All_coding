# Design Document

## Overview

The Deep Research Agent v2 is a modular, Python-based autonomous research system that conducts multi-round investigations on complex topics. The architecture emphasizes separation of concerns, with distinct modules for orchestration, search, scraping, caching, summarization, and report generation. The system uses intelligent semantic caching to reduce costs, implements source quality assessment for reliability, and employs multi-tier model orchestration to balance quality and efficiency.

### Key Design Principles

1. **Modularity**: Each component has a single, well-defined responsibility
2. **Caching-First**: Semantic cache reduces redundant API calls and scraping
3. **Quality-Aware**: Source scoring and fact cross-referencing ensure reliability
4. **Cost-Conscious**: Model tiering uses expensive models only when necessary
5. **Pure Python**: No C++ dependencies; all helpers are Python modules
6. **Persistence**: All artifacts saved for auditability and resumption

## Architecture

### High-Level System Flow

```
User Input (Topic + Preferences)
         ↓
   [Main Orchestrator]
         ↓
   Initialize Session
         ↓
   Generate Initial Questions ──→ [Question Generator]
         ↓
   ┌─────────────────────────────────────┐
   │  Research Loop (Rounds 1 to N)      │
   │  ┌──────────────────────────────┐   │
   │  │ 1. Search Phase              │   │
   │  │    - Query Expansion         │   │
   │  │    - Multi-query Search      │   │
   │  │    - URL Deduplication       │   │
   │  │    - Quality Scoring         │   │
   │  │    - Diversity Enforcement   │   │
   │  └──────────────────────────────┘   │
   │  ┌──────────────────────────────┐   │
   │  │ 2. Scraping Phase            │   │
   │  │    - Content Cache Check     │   │
   │  │    - Concurrent Scraping     │   │
   │  │    - Text Extraction         │   │
   │  └──────────────────────────────┘   │
   │  ┌──────────────────────────────┐   │
   │  │ 3. Summarization Phase       │   │
   │  │    - Semantic Cache Check    │   │
   │  │    - LLM Summarization       │   │
   │  │    - Cache Update            │   │
   │  └──────────────────────────────┘   │
   │  ┌──────────────────────────────┐   │
   │  │ 4. Reflection Phase          │   │
   │  │    - Gap Analysis            │   │
   │  │    - Question Deduplication  │   │
   │  │    - Generate Follow-ups     │   │
   │  └──────────────────────────────┘   │
   └─────────────────────────────────────┘
         ↓
   Quality Assessment (Extend?)
         ↓
   Final Report Compilation
         ↓
   Save Report & Display
```


## Components and Interfaces

### 1. Main Orchestrator (`main.py`)

**Responsibility**: Entry point and high-level workflow coordination

**Key Functions**:
- `main()`: Parse arguments, initialize session, execute research loop, compile report
- `run_research_session(config)`: Orchestrate all research rounds
- `execute_round(round_num, questions, config, cache)`: Execute a single research round

**Dependencies**: All other modules

**Data Flow**: Receives user input → initializes components → coordinates workflow → outputs final report

### 2. Configuration Module (`config.py`)

**Responsibility**: Centralized configuration management

**Data Structures**:
```python
@dataclass
class ResearchConfig:
    topic: str
    preferences: str
    max_depth: int
    top_k_per_round: int
    docs_per_question: int
    reddit_min_first_round: int
    cache_ttl_days: int
    similarity_threshold: float
    max_urls_per_domain: int
    
    # Model configuration
    model_lightweight: str  # For API calls (with "models/" prefix)
    model_midtier: str      # For API calls (with "models/" prefix)
    model_premium: str      # For API calls (with "models/" prefix)
    summariser: str         # For gemini CLI (without "models/" prefix)
    
    # API keys
    gemini_api_key: str     # For Gemini API calls
    
    # Session metadata
    session_id: str
    session_dir: str
    timestamp: str
```

**Key Functions**:
- `load_config_from_args(args)`: Create config from CLI arguments
- `validate_config(config)`: Ensure all required fields are present
- `save_config(config, path)`: Persist config to JSON

### 3. Session Manager (`session.py`)

**Responsibility**: Session initialization and artifact management

**Key Functions**:
- `initialize_session(topic, preferences, ...)`: Create session directory and config
- `save_round_artifacts(round_num, data, session_dir)`: Save round results
- `log_event(session_dir, message)`: Append to session log
- `save_final_report(report, session_dir)`: Write markdown report

**Directory Structure**:
```
deep_research_sessions/
└── {timestamp}_{session_id}/
    ├── config.json
    ├── session.log
    ├── round_1/
    │   ├── search_results.json
    │   ├── scraped.jsonl
    │   └── round.json
    ├── round_2/
    │   └── ...
    └── final_report.md

Note: research_cache.db is stored at v2/research_cache.db (global, persistent across all sessions)
```

### 4. Question Generator (`question_generator.py`)

**Responsibility**: Generate and refine research questions

**Key Functions**:
- `generate_initial_questions(topic, preferences, config)`: Create 5-6 starting questions
- `generate_followup_questions(previous_rounds, config)`: Reflect and create 3-4 new questions
- `deduplicate_questions(new_questions, previous_questions)`: Filter redundant questions using keyword overlap

**Algorithm for Deduplication**:
1. Extract keywords (4+ characters) from all questions
2. Calculate keyword overlap percentage between new and previous questions
3. Filter out questions with >60% overlap
4. Ensure at least 2 unique questions remain

**LLM Prompts**: Uses mid-tier model with structured prompts for question generation and reflection


### 5. Search Module (`search.py`)

**Responsibility**: Web search with query expansion and URL management

**Key Functions**:
- `expand_query(question, topic)`: Generate multiple search query variants
- `search_with_expansion(question, topic, max_results)`: Execute multi-query search
- `merge_search_results(results_list)`: Combine and deduplicate results
- `score_source_quality(url)`: Assign quality score (1-5) based on domain
- `prioritize_urls(urls)`: Sort by quality score (academic first)
- `enforce_diversity(urls, max_per_domain)`: Limit URLs per domain

**Query Expansion Strategy**:
```python
def expand_query(question: str, topic: str) -> List[str]:
    return [
        question,                           # Original
        f"{topic} {question}",             # With context
        f"{question} research study",      # Academic variant
        f"{question} 2024 2025"           # Recent variant
    ]
```

**Source Quality Scoring**:
- Base score: 3
- Academic/Gov (.edu, .gov, arxiv.org, nature.com, science.org): +2
- Established news (reuters.com, apnews.com, bbc.com, nytimes.com): +1
- Personal blogs (wordpress, medium.com, blogspot): -1
- Content quality signals (length >3000, contains "study"/"research"): +1
- Final score clamped to 1-5

**URL Prioritization**:
1. Sort URLs by quality score (descending)
2. Group academic sources (score ≥4) at the top
3. Apply diversity enforcement (max 3 per domain)
4. In first round only: Ensure minimum number of Reddit URLs (default: 1) for community perspectives
5. Return top K URLs

**Reddit Integration**:
- In the first research round, ensure at least `reddit_min_first_round` URLs from reddit.com are included
- Reddit provides valuable community perspectives and real-world experiences
- If search results don't naturally include enough Reddit links, explicitly search "site:reddit.com {topic}"
- Reddit URLs are subject to the same quality scoring and diversity rules

### 6. Scraper Module (`scraper.py`)

**Responsibility**: Concurrent web scraping and content extraction

**Key Functions**:
- `scrape_urls(urls, timeout)`: Scrape multiple URLs concurrently
- `scrape_single_url(url, timeout)`: Fetch and extract content from one URL
- `extract_content(html)`: Use trafilatura to extract main text
- `clean_text(text)`: Normalize whitespace and formatting

**Implementation Details**:
- Uses `ThreadPoolExecutor` with max 8 workers
- HTTP requests with custom User-Agent header
- 15-second timeout per request
- Graceful error handling (logs errors, continues with successful results)
- Progress bar display using `rich` library

**Data Structure**:
```python
@dataclass
class ScrapedDocument:
    url: str
    text: str
    error: str
    timestamp: str
    char_count: int
```

### 7. Cache System (`cache.py`)

**Responsibility**: Semantic caching for summaries and content

**Key Components**:
- SQLite database (`research_cache.db`)
- Local embedding model (sentence-transformers/all-MiniLM-L6-v2)
- Cosine similarity calculation

**Database Schema**:
```sql
CREATE TABLE content_cache (
    url TEXT PRIMARY KEY,
    text TEXT,
    timestamp REAL,
    char_count INTEGER
);

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

**Key Functions**:
- `initialize_cache(db_path)`: Create database and load embedding model
- `get_cached_content(url, ttl_days)`: Check content cache
- `save_content(url, text)`: Store scraped content
- `check_summary_cache(url, question, threshold)`: Find similar cached summaries
- `save_summary(url, question, summary_data)`: Store new summary
- `embed_text(text)`: Generate vector embedding

**Semantic Cache Workflow**:
1. Generate embedding for new question
2. Query database for all summaries for the given URL
3. Calculate cosine similarity between new embedding and cached embeddings
4. If max similarity > threshold (0.95), return cached summary
5. Otherwise, return None (cache miss)


### 8. Summarizer Module (`summarizer.py`)

**Responsibility**: Generate structured summaries with citations using gemini CLI tool

**Key Functions**:
- `summarize_documents(question, documents, config, cache)`: Main summarization entry point
- `call_gemini_cli_for_summary(question, documents, model)`: Call gemini CLI via subprocess
- `parse_summary_response(response)`: Extract structured data from CLI output
- `validate_summary(summary)`: Ensure required fields are present

**Summary Data Structure**:
```python
@dataclass
class Summary:
    short_summary: str
    long_summary: str
    key_facts: List[str]
    conflicts: str
    confidence: str  # "high", "medium", "low"
    sources: List[Dict[str, Any]]  # [{"url": str, "relevance_score": int}]
```

**Gemini CLI Integration**:
- Uses subprocess to call `gemini -m <model>` command
- Passes full prompt (system + user) via stdin
- Captures JSON output from stdout
- 120-second timeout per call
- Error handling for timeouts and CLI failures

**Prompt Structure**:
- System instruction: Define role as critical research analyst
- User prompt: Include question, numbered documents, output format specification
- Output format: Strict JSON with all required fields
- Special handling: If documents lack relevant info, return low-confidence summary
- Critical instruction: Always return JSON structure even if documents are not relevant

**Caching Integration**:
1. Check semantic cache before CLI call
2. If cache hit, return cached summary immediately
3. If cache miss, call gemini CLI and save result to cache
4. Track cache hit rate for monitoring

### 9. Report Compiler (`report_compiler.py`)

**Responsibility**: Synthesize all findings into final markdown report

**Key Functions**:
- `compile_final_report(all_rounds, config)`: Generate complete report
- `extract_all_sources(rounds)`: Collect unique sources with metadata
- `cross_reference_facts(rounds)`: Identify multi-source vs single-source claims
- `format_markdown_report(sections)`: Assemble final markdown

**Report Structure**:
1. **Executive Summary**: 3-4 key findings, methodology note, limitations
2. **Introduction**: Context, importance, scope
3. **Main Findings**: 3-5 thematic sections with evidence and citations
4. **Key Insights & Analysis**: Patterns, implications, connections
5. **Limitations & Uncertainties**: Gaps, conflicts, confidence levels
6. **Sources**: Numbered list with URLs
7. **Conclusion**: Takeaways and future outlook

**Fact Cross-Referencing Algorithm**:
1. Extract all factual claims from summaries across rounds
2. Group claims by semantic similarity (using embeddings)
3. Count source occurrences for each claim cluster
4. Tag claims with source count metadata
5. In final report, flag single-source claims as "preliminary" or "according to limited sources"

**LLM Prompt Requirements**:
- Explicitly instruct to identify multi-source claims
- Require flagging of single-source claims
- Request confidence qualifiers for uncertain information
- Specify markdown formatting with inline citations

### 10. Utilities Module (`utils.py`)

**Responsibility**: Common helper functions

**Key Functions**:
- `normalize_url(url)`: Remove fragments, trailing slashes, lowercase domain
- `deduplicate_urls(urls)`: Remove duplicates after normalization
- `clean_text(text)`: Normalize whitespace
- `safe_json_parse(text)`: Extract JSON from LLM responses (handles markdown code blocks)
- `calculate_cosine_similarity(vec1, vec2)`: Vector similarity calculation
- `extract_keywords(text, min_length)`: Extract words for deduplication
- `now_iso()`: Current timestamp in ISO format
- `ensure_dir(path)`: Create directory if not exists

### 11. Prompts Module (`prompts.py`)

**Responsibility**: Centralized prompt templates and formatting

**Key Functions**:
- `get_initial_questions_prompt(topic, preferences)`: Format prompt for initial question generation
- `get_followup_questions_prompt(previous_rounds)`: Format prompt for reflection and follow-ups
- `get_summarization_prompt(question, documents)`: Format prompt for document summarization (for gemini CLI)
- `get_final_report_prompt(all_rounds)`: Format prompt for final report compilation
- `get_quality_assessment_prompt(all_rounds, max_depth)`: Format prompt for extension decision

**Design Principles**:
- All prompts stored as constants or template strings
- Getter functions use f-strings for dynamic formatting
- System and user prompts combined for gemini CLI (no separate --system flag)
- Prompts incorporate best practices: epistemic reasoning, reflective inference, multi-source triangulation
- Prompts emphasize faithfulness (grounding in sources), confidence assessment, and explicit citation
- Easy to update and improve without searching through code

**Prompt Best Practices** (from reference articles):
1. **Epistemic Reasoning**: Prompts ask models to verify facts across sources and assess confidence
2. **Reflective Prompting**: Include self-critique instructions ("What facts are missing?", "Are there contradictions?")
3. **Multi-Source Triangulation**: Explicitly instruct to compare claims across documents
4. **Traceability**: Require inline citations [1], [2] for all factual claims
5. **Uncertainty Handling**: Request confidence qualifiers (high/medium/low) and explicit gap identification
6. **Structured Output**: Specify exact JSON or markdown format to ensure parseable responses
7. **Critical Analysis**: Encourage questioning assumptions and noting limitations

**Prompt Templates**:

```python
# Initial Questions - Uses problem decomposition strategy
INITIAL_QUESTIONS_SYSTEM = """You are an expert research strategist specializing in problem decomposition.

Your task is to break down a research topic into 5-6 focused sub-questions that cover multiple dimensions:
- Factual/definitional aspects (what is it?)
- Causal/mechanistic aspects (how does it work?)
- Comparative aspects (how does it compare to alternatives?)
- Temporal aspects (trends, history, future outlook)
- Practical/applied aspects (real-world implications, use cases)

Each question should be:
- Specific and answerable through web research
- Non-overlapping with other questions
- Focused on a distinct dimension of the topic
- Phrased to elicit evidence-based answers"""

INITIAL_QUESTIONS_USER_TEMPLATE = """Topic: {topic}
Research Preferences: {preferences}

Generate 5-6 research questions that decompose this topic into distinct, investigable sub-questions.
Return as a JSON array of strings: ["question 1", "question 2", ...]"""

# Follow-up Questions - Uses reflection and gap analysis
FOLLOWUP_QUESTIONS_SYSTEM = """You are a research analyst conducting a gap analysis.

Review the research conducted so far and identify:
1. Information gaps or unanswered aspects of the topic
2. Contradictions or uncertainties that need clarification
3. Promising leads or subtopics that deserve deeper investigation
4. Perspectives or sources that haven't been explored

Generate 3-4 follow-up questions that:
- Address identified gaps
- Are distinct from previously asked questions
- Build on existing findings
- Lead to actionable new research"""

FOLLOWUP_QUESTIONS_USER_TEMPLATE = """Previous Research Rounds:
{previous_rounds_summary}

Based on the findings so far, what questions remain unanswered or need deeper investigation?
Return as a JSON array of strings: ["question 1", "question 2", ...]"""

# Summarization - Uses critical analysis and multi-source verification
# Note: This is for gemini CLI, so system + user are combined
SUMMARIZATION_FULL_PROMPT_TEMPLATE = """You are a critical research analyst. Your task is to synthesize information from multiple sources while maintaining accuracy and identifying key insights.

**Critical Analysis Framework:**
1. Extract verifiable facts and data points with source citations
2. Note any conflicting information between sources
3. Identify consensus vs. contested claims
4. Highlight particularly credible or unique insights
5. Note limitations or gaps in the available information
6. Assess overall confidence based on source quality and agreement

**Output Requirements:**
Return strict JSON format with these fields:
- short_summary: 2-3 sentence overview with key findings
- long_summary: Detailed analysis (150-250 words) covering main points, evidence quality, and notable patterns
- key_facts: Array of 3-5 most important factual claims with [source_number] citations
- conflicts: Any contradictions found between sources (or empty string if none)
- confidence: "high"/"medium"/"low" based on source quality and agreement
- sources: Array of {{url, relevance_score}} where relevance_score is 1-5

**CRITICAL INSTRUCTION:** If the provided documents do not contain enough information to answer the research question, you MUST still return the JSON structure. In this case, `short_summary` and `long_summary` should state that the documents were not relevant, `key_facts` should be an empty array, and `confidence` should be "low". DO NOT write a conversational response.

---

Research Question: {question}

Documents (numbered for citation):
{documents}

Analyze these documents and return the JSON structure. In your summaries, cite sources using [1], [2], etc.
Focus on answering the research question while noting what the sources reveal and what remains unclear."""

# Final Report - Uses synthesis and fact cross-referencing
FINAL_REPORT_SYSTEM = """You are a senior research analyst compiling a comprehensive research report.

Your task is to synthesize findings from multiple research rounds into a coherent, well-structured report.

**Report Requirements:**
1. **Executive Summary**: 3-4 key findings, methodology note, limitations
2. **Introduction**: Context, importance, scope of research
3. **Main Findings**: 3-5 thematic sections with evidence and inline citations [1], [2]
4. **Key Insights & Analysis**: Patterns, implications, connections across findings
5. **Limitations & Uncertainties**: Gaps, conflicts, confidence levels
6. **Sources**: Numbered list with URLs
7. **Conclusion**: Takeaways and future outlook

**Critical Instructions:**
- Use inline citations [1], [2] for ALL factual claims
- Explicitly identify claims supported by multiple independent sources
- Flag single-source claims as "preliminary" or "according to limited sources"
- Use confidence qualifiers for uncertain information ("likely", "possibly", "unclear")
- Acknowledge contradictions and information gaps
- Target 1500-2500 words
- Use markdown formatting with proper headers"""

FINAL_REPORT_USER_TEMPLATE = """Research Topic: {topic}
Research Preferences: {preferences}

All Research Rounds:
{all_rounds_data}

Compile a comprehensive research report following the specified structure.
Ensure all claims are cited and multi-source claims are distinguished from single-source claims."""

# Quality Assessment - Uses meta-reasoning about research completeness
QUALITY_ASSESSMENT_SYSTEM = """You are a research quality assessor.

Evaluate whether the research conducted so far is sufficient or if additional rounds would add significant value.

Consider:
1. Coverage: Are all major aspects of the topic addressed?
2. Depth: Are key points explored in sufficient detail?
3. Source diversity: Are multiple perspectives represented?
4. Confidence: Are there significant uncertainties or gaps?
5. Contradictions: Are there unresolved conflicts that need clarification?

Recommend extending research ONLY if:
- Major aspects of the topic remain unexplored
- Critical uncertainties could be resolved with more investigation
- Important contradictions need clarification"""

QUALITY_ASSESSMENT_USER_TEMPLATE = """Research Topic: {topic}
Maximum Depth: {max_depth}
Current Round: {current_round}

Research Summary:
{research_summary}

Should we conduct another research round? Return JSON:
{{"extend": true/false, "reasoning": "brief explanation"}}"""
```

### 12. LLM Client (`llm_client.py`)

**Responsibility**: Unified interface for Gemini API calls

**Key Functions**:
- `configure_gemini(api_key)`: Set up API client
- `call_gemini_json(model, system_prompt, user_prompt, **kwargs)`: JSON response
- `call_gemini_text(model, system_prompt, user_prompt, **kwargs)`: Text response
- `handle_rate_limits(exception)`: Exponential backoff for 429 errors
- `retry_with_backoff(func, max_retries)`: Decorator for retry logic

**Error Handling**:
- Automatic retry with exponential backoff for rate limits
- Maximum 3 retries per call
- Graceful degradation (return error summary if all retries fail)
- Logging of all API calls and errors


## Data Models

### Core Data Classes

```python
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional

@dataclass
class ResearchConfig:
    """Main configuration for research session"""
    topic: str
    preferences: str
    max_depth: int
    top_k_per_round: int
    docs_per_question: int
    reddit_min_first_round: int
    cache_ttl_days: int = 7
    similarity_threshold: float = 0.95
    max_urls_per_domain: int = 3
    model_lightweight: str = "models/gemini-2.0-flash-lite"
    model_midtier: str = "models/gemini-2.5-flash"
    model_premium: str = "models/gemini-2.5-pro"
    summariser: str = "gemini-2.5-flash-lite"
    gemini_api_key: str = ""
    session_id: str = ""
    session_dir: str = ""
    timestamp: str = ""

@dataclass
class SearchResult:
    """Single search result from DuckDuckGo"""
    title: str
    snippet: str
    url: str
    quality_score: int = 3

@dataclass
class ScrapedDocument:
    """Scraped web content"""
    url: str
    text: str
    error: str = ""
    timestamp: str = ""
    char_count: int = 0

@dataclass
class Summary:
    """Structured summary of documents"""
    short_summary: str
    long_summary: str
    key_facts: List[str]
    conflicts: str
    confidence: str
    sources: List[Dict[str, Any]]
    cached: bool = False

@dataclass
class ResearchRound:
    """Complete data for one research round"""
    round_number: int
    questions: List[str]
    search_results: Dict[str, List[str]]  # question -> urls
    scraped_documents: List[ScrapedDocument]
    summaries: List[Dict[str, Any]]  # question + summary pairs
    timestamp: str

@dataclass
class CacheStats:
    """Cache performance metrics"""
    content_hits: int = 0
    content_misses: int = 0
    summary_hits: int = 0
    summary_misses: int = 0
    
    @property
    def content_hit_rate(self) -> float:
        total = self.content_hits + self.content_misses
        return self.content_hits / total if total > 0 else 0.0
    
    @property
    def summary_hit_rate(self) -> float:
        total = self.summary_hits + self.summary_misses
        return self.summary_hits / total if total > 0 else 0.0
```

### Data Flow Between Components

```
User Input
    ↓
ResearchConfig (config.py)
    ↓
Session Initialization (session.py)
    ↓
Questions (question_generator.py) → List[str]
    ↓
Search (search.py) → List[SearchResult]
    ↓
URL Processing (search.py) → List[str] (scored, prioritized, diversified)
    ↓
Scraping (scraper.py) → List[ScrapedDocument]
    ↓
Summarization (summarizer.py + cache.py) → List[Summary]
    ↓
Round Data (session.py) → ResearchRound
    ↓
Reflection (question_generator.py) → List[str] (new questions)
    ↓
[Loop back to Search or continue to Report]
    ↓
Final Report (report_compiler.py) → str (markdown)
    ↓
Save & Display (session.py)
```

## Error Handling

### Strategy

1. **Graceful Degradation**: Continue with partial results rather than failing completely
2. **Explicit Logging**: All errors logged to session log with timestamps
3. **User Feedback**: Display warnings for non-critical errors, errors for critical failures
4. **Retry Logic**: Automatic retries for transient failures (rate limits, network issues)

### Error Categories

**Critical Errors** (stop execution):
- Invalid API key
- Unable to create session directory
- All search queries fail
- LLM completely unavailable

**Non-Critical Errors** (log and continue):
- Individual URL scraping failures
- Single search query failures (if others succeed)
- Cache read/write errors (fall back to no caching)
- Individual summarization failures (skip that question)

### Error Handling Patterns

```python
# Pattern 1: Try-except with logging
try:
    result = risky_operation()
except Exception as e:
    log_event(session_dir, f"Error in operation: {e}")
    result = fallback_value

# Pattern 2: Retry with backoff
@retry_with_backoff(max_retries=3)
def api_call():
    return call_gemini_json(...)

# Pattern 3: Partial success collection
results = []
for item in items:
    try:
        results.append(process(item))
    except Exception as e:
        log_error(e)
        continue
return results  # Return what we got
```


## Testing Strategy

### Unit Testing

**Modules to Test**:
- `utils.py`: URL normalization, text cleaning, JSON parsing, keyword extraction
- `search.py`: Query expansion, quality scoring, diversity enforcement
- `question_generator.py`: Question deduplication logic
- `cache.py`: Similarity calculation, cache hit/miss logic

**Testing Approach**:
- Use `pytest` framework
- Mock external dependencies (LLM calls, web requests, database)
- Test edge cases (empty inputs, malformed data, boundary conditions)
- Verify data transformations and calculations

**Example Test Cases**:
```python
def test_normalize_url():
    assert normalize_url("https://Example.com/path/") == "https://example.com/path"
    assert normalize_url("http://site.com#fragment") == "http://site.com"

def test_score_source_quality():
    assert score_source_quality("https://arxiv.org/paper") >= 4
    assert score_source_quality("https://myblog.wordpress.com") <= 3

def test_deduplicate_questions():
    previous = ["What is machine learning?"]
    new = ["What is machine learning?", "How does deep learning work?"]
    result = deduplicate_questions(new, previous)
    assert len(result) == 1
    assert "deep learning" in result[0]
```

### Integration Testing

**Scenarios to Test**:
1. End-to-end research session with mocked LLM and search
2. Cache system integration (save and retrieve)
3. Multi-round workflow with question generation
4. Error handling and recovery

**Testing Approach**:
- Use temporary directories for session artifacts
- Mock external APIs but test real component interactions
- Verify data persistence and retrieval
- Test with realistic data volumes

### Manual Testing

**Test Cases**:
1. Run research on a simple topic (e.g., "solar energy benefits")
2. Verify cache reuse on second run with similar questions
3. Check final report quality and citation accuracy
4. Test with rate limit scenarios (use low-tier API key)
5. Verify session artifacts are properly saved

## Performance Considerations

### Optimization Strategies

1. **Concurrent Operations**:
   - Scrape multiple URLs in parallel (ThreadPoolExecutor)
   - Generate summaries for multiple questions concurrently
   - Limit concurrency to avoid overwhelming APIs or network

2. **Caching**:
   - Content cache reduces scraping time and bandwidth
   - Semantic cache reduces LLM API calls (major cost savings)
   - Target >75% cache hit rate for mature research topics

3. **Model Tiering**:
   - Use lightweight models for repetitive tasks (summaries)
   - Reserve premium models for complex reasoning (final report)
   - Estimated cost reduction: 60-70% vs using premium model for everything

4. **Query Optimization**:
   - Limit search results per query (avoid processing hundreds of URLs)
   - Deduplicate URLs early to minimize scraping
   - Prioritize high-quality sources to reduce noise

### Performance Metrics

**Target Metrics**:
- Single round completion: 2-5 minutes (depending on URL count)
- Full research session (3 rounds): 10-20 minutes
- Cache hit rate: >50% for content, >30% for summaries (after first run)
- API cost per session: $0.10-$0.50 (depending on depth and cache hits)

**Monitoring**:
- Log timestamps for each phase
- Track cache hit/miss rates
- Count API calls and estimate costs
- Measure scraping success rate

## Security and Privacy

### API Key Management

- Store API keys in `config.py` (not committed to version control)
- Support environment variable overrides (`GEMINI_API_KEY`)
- Validate keys at startup before making requests
- Use separate keys for different model tiers if needed

### Web Scraping Ethics

- Respect robots.txt (trafilatura handles this)
- Use reasonable request timeouts (15 seconds)
- Implement rate limiting (concurrent scraping limited to 8 workers)
- Include descriptive User-Agent header
- Cache content to avoid repeated requests

### Data Privacy

- All data stored locally (no external databases)
- Session directories contain only public web content
- No PII collection or storage
- Users can delete session directories at any time

## Deployment and Configuration

### Installation Requirements

```
Python 3.9+
Dependencies:
- google-generativeai
- duckduckgo-search
- trafilatura
- requests
- sentence-transformers
- rich
- numpy
```

### Configuration Files

**v2/config.py** (user-editable):
```python
GEMINI_API_KEY = "your-key-here"

# Model names for API calls (require "models/" prefix)
MODEL_LIGHTWEIGHT = "models/gemini-2.0-flash-lite"
MODEL_MIDTIER = "models/gemini-2.5-flash"
MODEL_PREMIUM = "models/gemini-2.5-pro"

# Model name for gemini CLI (no "models/" prefix)
SUMMARISER = "gemini-2.5-flash-lite"

CACHE_TTL_DAYS = 7
SIMILARITY_THRESHOLD = 0.95
MAX_URLS_PER_DOMAIN = 3
```

### Command-Line Interface

```bash
cd v2
python main.py \
  --topic "renewable energy trends" \
  --preferences "focus on recent developments" \
  --depth 3 \
  --top_k 10 \
  --docs_per_q 5
```

**Arguments**:
- `--topic`: Research topic (required)
- `--preferences`: Additional guidance for research (optional)
- `--depth`: Maximum number of rounds (default: 2)
- `--top_k`: URLs to process per round (default: 8)
- `--docs_per_q`: Documents to summarize per question (default: 5)
- `--reddit_min`: Minimum Reddit links in first round (default: 1)

### Output Structure

```
v2/
├── research_cache.db           # Global cache (persistent across all sessions)
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

## Future Enhancements

### Potential Improvements

1. **Multi-Source Search**: Add Google Scholar, arXiv API for academic papers
2. **PDF Support**: Extract and process PDF documents
3. **Image Analysis**: Use multimodal models to analyze charts and figures
4. **Checkpoint System**: Save progress to resume interrupted sessions
5. **Cost Tracking**: Detailed token usage and cost estimation
6. **Interactive Mode**: Allow user to guide research direction mid-session
7. **Export Formats**: Support PDF, HTML, or JSON output
8. **Collaborative Research**: Multiple users contributing to same session
9. **Knowledge Graph**: Build entity-relationship graph from findings
10. **Automated Fact-Checking**: Cross-reference with fact-checking APIs

### Extensibility Points

- **Custom Search Providers**: Plugin system for additional search engines
- **Custom Scrapers**: Specialized scrapers for specific domains (e.g., academic sites)
- **Custom LLM Providers**: Support for OpenAI, Anthropic, or local models
- **Custom Report Templates**: User-defined report structures
- **Custom Quality Scorers**: Domain-specific source quality assessment
