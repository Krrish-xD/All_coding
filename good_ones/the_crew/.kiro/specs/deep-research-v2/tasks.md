# Implementation Plan

- [x] 1. Set up project structure and core utilities
  - Create directory structure for v2 modules
  - Implement utility functions (URL normalization, text cleaning, JSON parsing, keyword extraction)
  - Create data models and dataclasses for configuration and data structures
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 1.1 Create project directory structure
  - Create `v2/` directory in project root
  - Create subdirectories: `v2/modules/`, `v2/tests/`
  - Create `v2/main.py` as entry point
  - _Requirements: 1.1_

- [x] 1.2 Implement utils.py module
  - Write `normalize_url()` function to clean and standardize URLs
  - Write `deduplicate_urls()` function to remove duplicate URLs
  - Write `clean_text()` function to normalize whitespace
  - Write `safe_json_parse()` function to extract JSON from LLM responses
  - Write `extract_keywords()` function for text analysis
  - Write `now_iso()` and `ensure_dir()` helper functions
  - _Requirements: 1.5_

- [x] 1.3 Create data models in config.py
  - Define `ResearchConfig` dataclass with all configuration fields including `reddit_min_first_round` and `summariser` for CLI model
  - Include model fields with correct prefixes: API models with "models/", CLI model without
  - Define `SearchResult` dataclass for search results
  - Define `ScrapedDocument` dataclass for scraped content
  - Define `Summary` dataclass for structured summaries
  - Define `ResearchRound` dataclass for round data
  - Define `CacheStats` dataclass for cache metrics
  - _Requirements: 1.3, 12.1, 12.2, 12.3_

- [x] 1.4 Implement configuration loading
  - Write `load_config_from_args()` to parse CLI arguments
  - Write `validate_config()` to check required fields
  - Write `save_config()` to persist configuration
  - Support environment variable overrides for API keys
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 2. Implement session management
  - Create session initialization logic
  - Implement artifact saving functions
  - Create logging system for session events
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

- [x] 2.1 Create session.py module
  - Write `initialize_session()` to create session directory and config
  - Write `save_round_artifacts()` to save round data as JSON
  - Write `log_event()` to append timestamped messages to session log
  - Write `save_final_report()` to write markdown report
  - Display session directory path to user at initialization
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.6_

- [x] 2.2 Implement directory structure creation
  - Create `deep_research_sessions/` root directory
  - Create session-specific subdirectory with timestamp and ID
  - Create round subdirectories as needed
  - _Requirements: 10.1, 10.5_

- [x] 3. Implement LLM client module
  - Create unified Gemini API interface
  - Implement retry logic with exponential backoff
  - Add error handling for rate limits
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 3.1 Create llm_client.py module
  - Write `configure_gemini()` to set up API client
  - Write `call_gemini_json()` for JSON responses
  - Write `call_gemini_text()` for text responses
  - Implement `handle_rate_limits()` for 429 errors
  - Implement `retry_with_backoff()` decorator with max 3 retries
  - Log all API calls and errors
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_


- [x] 4. Implement cache system with semantic search
  - Set up global SQLite database at v2/research_cache.db
  - Integrate local embedding model
  - Implement content caching
  - Implement semantic summary caching with similarity search
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 4.1 Create cache.py module structure
  - Import sentence-transformers library
  - Define database schema for content_cache and summary_cache tables
  - Write `initialize_cache()` to create global database at v2/research_cache.db
  - Ensure cache persists across all sessions for long-term learning
  - _Requirements: 2.1, 2.2_

- [x] 4.2 Implement content caching
  - Write `get_cached_content()` to check content cache with TTL
  - Write `save_content()` to store scraped content with timestamp
  - Use URL as primary key
  - _Requirements: 2.5_

- [x] 4.3 Implement semantic summary caching
  - Write `embed_text()` to generate vector embeddings using local model
  - Write `calculate_cosine_similarity()` for vector comparison
  - Write `check_summary_cache()` to find similar cached summaries
  - Query database for URL-specific summaries and compare embeddings
  - Return cached summary if similarity > threshold (0.95)
  - _Requirements: 2.1, 2.3, 2.4_

- [x] 4.4 Implement cache updates
  - Write `save_summary()` to store new summaries with embeddings
  - Store question text, embedding blob, and summary data
  - Update cache statistics (hits/misses)
  - _Requirements: 2.6_

- [x] 5. Implement search module with quality scoring
  - Create query expansion logic
  - Integrate DuckDuckGo search
  - Implement source quality scoring
  - Add URL prioritization and diversity enforcement
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 5.1, 5.2, 5.3, 5.4, 5.5, 8.1, 8.2, 8.3_

- [x] 5.1 Create search.py module
  - Import duckduckgo-search library
  - Write `expand_query()` to generate query variants (original, with topic, academic, recent)
  - Write `search_with_expansion()` to execute multiple searches
  - Write `merge_search_results()` to combine and deduplicate results
  - _Requirements: 8.1, 8.2, 8.3_

- [x] 5.2 Implement source quality scoring
  - Write `score_source_quality()` function
  - Assign base score of 3
  - Add +2 for academic/government domains
  - Add +1 for established news organizations
  - Subtract 1 for personal blog platforms
  - Add +1 for content quality signals (length, keywords)
  - Clamp final score to 1-5 range
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.7_

- [x] 5.3 Implement URL prioritization
  - Write `prioritize_urls()` function
  - Sort URLs by quality score in descending order
  - Group academic sources (score ≥4) at the top
  - _Requirements: 3.5, 3.6_

- [x] 5.4 Implement diversity enforcement and Reddit integration
  - Write `enforce_diversity()` function
  - Extract domain from each URL
  - Track domain counts and limit to max 3 per domain
  - Apply after prioritization but before final selection
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 5.5 Implement Reddit minimum enforcement (first round only)
  - Write `ensure_reddit_minimum()` function
  - Count Reddit URLs in search results
  - If below minimum, execute additional search "site:reddit.com {topic}"
  - Add Reddit results to URL list while respecting diversity rules
  - Only apply in first research round
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 6. Implement web scraper module
  - Create concurrent scraping with thread pool
  - Integrate trafilatura for content extraction
  - Add progress indicators
  - Implement error handling
  - _Requirements: 8.4, 8.5, 8.6, 8.7, 8.8, 8.9_

- [x] 6.1 Create scraper.py module
  - Import requests, trafilatura, and ThreadPoolExecutor
  - Write `scrape_single_url()` to fetch and extract content from one URL
  - Use custom User-Agent header
  - Set 15-second timeout
  - Handle HTTP errors gracefully
  - _Requirements: 8.4, 8.5, 8.6_

- [x] 6.2 Implement concurrent scraping
  - Write `scrape_urls()` to scrape multiple URLs in parallel
  - Use ThreadPoolExecutor with max 8 workers
  - Collect results as they complete
  - Log errors but continue with successful results
  - _Requirements: 8.7, 8.8_

- [x] 6.3 Add progress indicators
  - Integrate rich library for progress bars
  - Display scraping progress with URL count
  - Show success/failure statistics
  - _Requirements: 8.9_

- [x] 6.4 Implement text extraction and cleaning
  - Write `extract_content()` using trafilatura
  - Write `clean_text()` to normalize whitespace
  - Return ScrapedDocument dataclass with metadata
  - _Requirements: 8.5_

- [x] 7. Implement question generator module
  - Create initial question generation
  - Implement reflection and follow-up question generation
  - Add question deduplication logic
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [x] 7.1 Create question_generator.py module
  - Write `generate_initial_questions()` function
  - Use mid-tier model with structured prompt
  - Request 5-6 questions covering multiple dimensions
  - Parse JSON response and validate question count
  - _Requirements: 7.1_

- [x] 7.2 Implement follow-up question generation
  - Write `generate_followup_questions()` function
  - Analyze previous round findings
  - Identify gaps and contradictions
  - Generate 3-4 new questions using mid-tier model
  - _Requirements: 7.3_

- [x] 7.3 Implement question deduplication
  - Write `deduplicate_questions()` function
  - Extract keywords (4+ characters) from all questions
  - Calculate keyword overlap percentage
  - Filter questions with >60% overlap
  - Ensure at least 2 unique questions remain
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 8. Implement prompts module
  - Create centralized prompt templates
  - Implement getter functions for formatted prompts
  - Incorporate best practices from reference articles
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 8.1 Create prompts.py module structure
  - Define all prompt templates as module constants
  - Separate system and user prompts for clarity
  - Add docstrings explaining each prompt's purpose
  - _Requirements: 1.1_

- [x] 8.2 Implement initial questions prompt
  - Create `get_initial_questions_prompt()` function
  - Use problem decomposition strategy from reference articles
  - Format with topic and preferences using f-strings
  - Emphasize multiple dimensions (factual, causal, comparative, temporal, practical)
  - _Requirements: 1.2_

- [x] 8.3 Implement follow-up questions prompt
  - Create `get_followup_questions_prompt()` function
  - Use reflection and gap analysis strategy
  - Format with previous rounds summary
  - Emphasize identifying gaps, contradictions, and promising leads
  - _Requirements: 1.2_

- [x] 8.4 Implement summarization prompt
  - Create `get_summarization_prompt()` function
  - Combine system and user prompts for gemini CLI compatibility
  - Incorporate critical analysis framework from reference articles
  - Emphasize multi-source verification, confidence assessment, and explicit citations
  - Include instruction to return JSON even if documents are not relevant
  - _Requirements: 1.2, 1.3_

- [x] 8.5 Implement final report prompt
  - Create `get_final_report_prompt()` function
  - Use synthesis and fact cross-referencing strategy
  - Emphasize distinguishing multi-source vs single-source claims
  - Request confidence qualifiers and explicit gap acknowledgment
  - Specify complete markdown structure with all required sections
  - _Requirements: 1.2, 1.3_

- [x] 8.6 Implement quality assessment prompt
  - Create `get_quality_assessment_prompt()` function
  - Use meta-reasoning about research completeness
  - Request JSON response with extend decision and reasoning
  - _Requirements: 1.2_

- [x] 9. Implement summarizer module
  - Create document summarization using gemini CLI subprocess
  - Integrate with cache system
  - Parse and validate summary responses
  - _Requirements: 2.3, 2.4, 2.6, 6.1, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [x] 9.1 Create summarizer.py module
  - Write `summarize_documents()` as main entry point
  - Check semantic cache before CLI call
  - Return cached summary if found
  - _Requirements: 2.3, 2.4_

- [x] 9.2 Implement gemini CLI summarization
  - Write `call_gemini_cli_for_summary()` function
  - Use subprocess to call `gemini -m <model>` command
  - Pass full prompt (from prompts.py) via stdin
  - Capture JSON output from stdout
  - Set 120-second timeout per call
  - Handle timeouts and CLI failures gracefully
  - _Requirements: 6.1, 9.1, 9.2, 9.6_

- [x] 9.3 Implement summary parsing and validation
  - Write `parse_summary_response()` to extract structured data from CLI output
  - Write `validate_summary()` to ensure required fields
  - Create Summary dataclass instance
  - Save to cache after successful generation
  - _Requirements: 2.6, 9.1, 9.3, 9.4, 9.5_


- [x] 10. Implement report compiler module
  - Create final report generation with fact cross-referencing
  - Implement markdown formatting
  - Add source collection and citation management
  - _Requirements: 6.3, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8, 11.9_

- [x] 10.1 Create report_compiler.py module
  - Write `compile_final_report()` as main entry point
  - Use premium model for high-quality synthesis
  - Get formatted prompt from prompts.py
  - Construct comprehensive prompt with all round data
  - _Requirements: 6.3_

- [x] 10.2 Implement fact cross-referencing
  - Write `cross_reference_facts()` function
  - Extract factual claims from all summaries
  - Group claims by semantic similarity using embeddings
  - Count source occurrences for each claim cluster
  - Tag claims with source count metadata
  - _Requirements: 11.3, 11.4_

- [x] 10.3 Implement source collection
  - Write `extract_all_sources()` function
  - Collect unique sources from all rounds
  - Include URLs and relevance metadata
  - Create numbered reference list
  - _Requirements: 11.2, 11.5_

- [x] 10.4 Implement markdown formatting
  - Write `format_markdown_report()` function
  - Assemble sections: executive summary, introduction, main findings, insights, limitations, sources, conclusion
  - Ensure proper markdown syntax
  - Target 1500-2500 words
  - _Requirements: 11.1, 11.5, 11.9_

- [x] 11. Implement main orchestrator
  - Create command-line interface
  - Implement research loop coordination
  - Add quality assessment for round extension
  - Integrate all modules
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 12.1_

- [x] 11.1 Create main.py entry point
  - Set up argument parser with all CLI options including --reddit_min
  - Parse and validate command-line arguments
  - Display help text and usage examples
  - _Requirements: 12.1_

- [x] 11.2 Implement session initialization
  - Call `initialize_session()` from session module
  - Load or create global cache database at v2/research_cache.db
  - Display session information to user
  - _Requirements: 10.1, 10.6_

- [x] 11.3 Implement research round execution
  - Write `execute_round()` function
  - Coordinate search (with Reddit enforcement in round 1), scraping, and summarization phases
  - Save round artifacts after completion
  - Display progress and results
  - _Requirements: 7.2, 7.3, 7.4, 7.5_

- [x] 11.4 Implement main research loop
  - Generate initial questions using prompts.py
  - Execute first research round (with Reddit minimum enforcement)
  - Loop for subsequent rounds up to max depth
  - Generate follow-up questions after each round using prompts.py
  - Break loop if no new questions generated
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 11.5 Implement quality assessment
  - Write `should_extend_research()` function
  - Use premium model with prompt from prompts.py to evaluate coverage and gaps
  - Decide whether to extend beyond max depth
  - Execute additional round if approved
  - _Requirements: 7.5_

- [x] 11.6 Implement final compilation
  - Call `compile_final_report()` with all round data
  - Save final report to session directory
  - Display report path and success message
  - Optionally print report to console
  - _Requirements: 7.6_

- [x] 12. Add display and user feedback
  - Implement rich console output with progress bars
  - Add informative status messages
  - Display cache statistics
  - Show research progress and results
  - _Requirements: 8.9, 10.6_

- [x] 12.1 Integrate rich library for console output
  - Use Panel for session initialization display
  - Use Progress bars for search, scraping, and summarization
  - Use Table for displaying questions
  - Add color-coded status messages (success, warning, error)
  - _Requirements: 8.9_

- [x] 12.2 Add cache statistics display
  - Show cache hit rates at end of session
  - Display content cache and summary cache metrics
  - Estimate cost savings from cache hits
  - _Requirements: 2.6_

- [x] 12.3 Add round completion summaries
  - Display question count and URL count per round
  - Show scraping success rate
  - Indicate cache usage and Reddit link count (round 1)
  - _Requirements: 10.6_

- [x] 13. Create requirements.txt and documentation
  - List all Python dependencies with versions
  - Create README with installation and usage instructions
  - Document configuration options
  - _Requirements: 12.1, 12.2, 12.3_

- [x] 13.1 Create requirements.txt
  - List google-generativeai, duckduckgo-search, trafilatura, requests, sentence-transformers, rich, numpy
  - Specify compatible version ranges
  - Note: gemini CLI tool must be installed separately
  - _Requirements: 12.1, 12.2_

- [x] 13.2 Create README.md
  - Document installation steps (pip install + gemini CLI setup)
  - Provide usage examples with CLI arguments including --reddit_min
  - Explain configuration file setup (copy sample_config.py to config.py)
  - Describe output structure and global cache location
  - Explain how semantic cache enables cross-session learning
  - _Requirements: 12.1, 12.2, 12.3_

- [x] 13.3 Create sample_config.py
  - Provide template with placeholder API key
  - Document all configuration options with comments
  - Include model name formats (API with "models/", CLI without)
  - Explain cache TTL, similarity threshold, and diversity settings
  - _Requirements: 12.2, 12.3_

- [x] 14. Write unit tests for core utilities
  - Test URL normalization and deduplication
  - Test text cleaning and keyword extraction
  - Test quality scoring logic
  - Test question deduplication
  - Test similarity calculation
  - _Requirements: 1.5, 3.1, 3.2, 3.3, 3.4, 4.3, 4.4, 4.5_

- [x] 14.1 Create test_utils.py
  - Test `normalize_url()` with various URL formats
  - Test `deduplicate_urls()` with duplicate and unique URLs
  - Test `clean_text()` with whitespace variations
  - Test `safe_json_parse()` with valid and malformed JSON
  - Test `extract_keywords()` with different text inputs
  - _Requirements: 1.5_

- [x] 14.2 Create test_search.py
  - Test `score_source_quality()` with different domain types
  - Test `prioritize_urls()` with mixed quality scores
  - Test `enforce_diversity()` with domain clustering
  - Test `expand_query()` output format
  - Test `ensure_reddit_minimum()` with various Reddit URL counts
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 14.3 Create test_question_generator.py
  - Test `deduplicate_questions()` with overlapping questions
  - Test keyword extraction and overlap calculation
  - Test edge cases (empty lists, identical questions)
  - _Requirements: 4.3, 4.4, 4.5_

- [x] 14.4 Create test_cache.py
  - Test `calculate_cosine_similarity()` with known vectors
  - Test cache hit/miss logic with mock database
  - Test TTL expiration for content cache
  - Test global cache persistence across sessions
  - _Requirements: 2.3, 2.4, 2.5_

- [x] 14.5 Create test_prompts.py
  - Test all prompt getter functions return properly formatted strings
  - Test f-string substitution with various inputs
  - Verify prompts include key instructions (citations, confidence, etc.)
  - _Requirements: 1.2, 1.3_
