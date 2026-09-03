# Requirements Document

## Introduction

The Deep Research Agent v2 is an autonomous LLM-based research system that conducts comprehensive, multi-round investigations on complex topics. It iteratively decomposes research questions, retrieves information from web sources, synthesizes findings with proper citations, and produces detailed research reports. Version 2 represents a complete architectural redesign from v1, emphasizing modularity, intelligent caching, source quality assessment, and cost efficiency while maintaining the core iterative research loop.

## Glossary

- **Research Agent**: The autonomous system that orchestrates the entire research workflow
- **Research Round**: A single iteration of question generation, search, scraping, and summarization
- **Session**: A complete research investigation from initial topic to final report
- **Semantic Cache**: A vector embedding-based caching system that reuses summaries for semantically similar questions
- **Source Quality Score**: A numerical rating (1-5) indicating the reliability and authority of a web source
- **LLM Orchestrator**: The component that manages which AI models handle which tasks based on complexity and cost
- **Scraper**: The component responsible for extracting clean text content from web URLs
- **Summarizer**: The component that condenses scraped content into structured summaries with citations
- **Question Generator**: The component that creates research questions based on topic analysis and previous findings
- **Report Compiler**: The component that synthesizes all research findings into a final markdown report

## Requirements

### Requirement 1: Modular Architecture

**User Story:** As a developer, I want the codebase organized into logical modules, so that I can easily understand, maintain, and extend specific components without affecting others.

#### Acceptance Criteria

1. THE Research Agent SHALL organize code into separate Python modules for distinct responsibilities (main loop, search, scraping, summarization, caching, utilities)
2. THE Research Agent SHALL implement a main orchestration file that imports and coordinates module functions without containing implementation details
3. THE Research Agent SHALL define clear interfaces between modules using type hints and dataclasses
4. THE Research Agent SHALL limit each module to a single primary responsibility following separation of concerns
5. THE Research Agent SHALL provide utility modules for common operations (JSON handling, text cleaning, URL normalization) that are imported by other modules

### Requirement 2: Intelligent Semantic Caching

**User Story:** As a researcher, I want the system to remember and reuse previous work on similar questions, so that I save time and API costs on repeated or related research sessions.

#### Acceptance Criteria

1. THE Research Agent SHALL use a local embedding model to generate vector representations of research questions
2. THE Research Agent SHALL store question embeddings, summaries, and metadata in a SQLite database
3. WHEN a new question is asked for a previously scraped URL, THE Research Agent SHALL calculate cosine similarity between the new question vector and cached question vectors
4. IF similarity exceeds 0.95 for a cached question-URL pair, THEN THE Research Agent SHALL retrieve and reuse the cached summary without making an API call
5. THE Research Agent SHALL cache scraped web content with timestamps to avoid re-scraping URLs within a configurable time window (default 7 days)
6. THE Research Agent SHALL update the cache with new summaries after each successful API call

### Requirement 3: Source Quality Assessment and Prioritization

**User Story:** As a researcher, I want the system to prioritize high-quality, authoritative sources, so that my research findings are more reliable and trustworthy.

#### Acceptance Criteria

1. THE Research Agent SHALL assign a quality score (1-5) to each source URL based on domain authority patterns
2. THE Research Agent SHALL boost scores by 2 points for academic/government domains (.edu, .gov, arxiv.org, nature.com, science.org)
3. THE Research Agent SHALL boost scores by 1 point for established news organizations (reuters.com, apnews.com, bbc.com, nytimes.com)
4. THE Research Agent SHALL reduce scores by 1 point for personal blog platforms (wordpress, medium.com, blogspot)
5. THE Research Agent SHALL sort URLs by quality score before selection, placing academic sources first
6. THE Research Agent SHALL prioritize higher-scored sources during URL selection and summarization
7. THE Research Agent SHALL include source quality scores in summary metadata for transparency

### Requirement 4: Question Deduplication

**User Story:** As a researcher, I want the system to avoid asking redundant questions across rounds, so that research time is spent exploring new angles rather than repeating previous work.

#### Acceptance Criteria

1. THE Research Agent SHALL maintain a list of all previously asked questions across all rounds
2. WHEN generating new follow-up questions, THE Research Agent SHALL compare each candidate question against the history using keyword overlap analysis
3. IF keyword overlap exceeds 60% between a new question and any previous question, THEN THE Research Agent SHALL filter out the new question as redundant
4. THE Research Agent SHALL extract keywords of 4+ characters for overlap comparison
5. THE Research Agent SHALL ensure at least 2 unique follow-up questions are generated per round after deduplication

### Requirement 5: URL Diversity Enforcement

**User Story:** As a researcher, I want sources from multiple domains and perspectives, so that my research avoids echo chambers and provides balanced coverage.

#### Acceptance Criteria

1. THE Research Agent SHALL limit URLs from any single domain to a maximum of 3 per research round
2. THE Research Agent SHALL track domain counts during URL collection and filtering
3. WHEN selecting URLs for scraping, THE Research Agent SHALL prioritize domain diversity over raw search ranking
4. THE Research Agent SHALL extract domain names from URLs using standard URL parsing
5. THE Research Agent SHALL apply diversity enforcement after initial search but before scraping

### Requirement 6: Multi-Tier Model Orchestration

**User Story:** As a cost-conscious user, I want the system to use expensive models only when necessary, so that I minimize API costs while maintaining research quality.

#### Acceptance Criteria

1. THE Research Agent SHALL use a lightweight model (gemini-2.5-flash-lite) for summarization tasks
2. THE Research Agent SHALL use a mid-tier model (gemini-2.5-flash) for question generation and reflection
3. THE Research Agent SHALL use a premium model (gemini-2.5-pro) for final report compilation and quality assessment
4. THE Research Agent SHALL configure model selection through a centralized configuration system
5. THE Research Agent SHALL log model usage and estimated costs for each API call

### Requirement 7: Iterative Research Loop

**User Story:** As a researcher, I want the system to conduct multiple rounds of investigation, so that it can explore topics in depth and follow promising leads.

#### Acceptance Criteria

1. THE Research Agent SHALL generate 5-6 initial research questions covering multiple dimensions of the topic
2. THE Research Agent SHALL execute at least one research round with search, scraping, and summarization
3. AFTER each round, THE Research Agent SHALL reflect on findings to identify gaps and generate 3-4 follow-up questions
4. THE Research Agent SHALL continue rounds until reaching the configured maximum depth or determining sufficient coverage
5. THE Research Agent SHALL evaluate whether to extend research beyond max depth based on information gain assessment
6. THE Research Agent SHALL compile all rounds into a final comprehensive report with citations

### Requirement 8: Robust Web Scraping with Query Expansion

**User Story:** As a researcher, I want reliable content extraction from diverse web sources with comprehensive search coverage, so that I can gather information from various types of websites and perspectives.

#### Acceptance Criteria

1. THE Research Agent SHALL generate multiple search query variants for each research question (original question, question + topic context, academic variant with "research study", recent variant with year filters)
2. THE Research Agent SHALL use DuckDuckGo search API to find relevant URLs for each query variant
3. THE Research Agent SHALL merge and deduplicate results from all query variants
4. THE Research Agent SHALL scrape web content using HTTP requests with appropriate headers and timeouts
5. THE Research Agent SHALL extract main content from HTML using trafilatura library
6. THE Research Agent SHALL handle scraping failures gracefully by logging errors and continuing with successful results
7. THE Research Agent SHALL normalize and deduplicate URLs before scraping to avoid redundant requests
8. THE Research Agent SHALL implement concurrent scraping with thread pooling for efficiency
9. THE Research Agent SHALL display progress indicators during search and scraping operations

### Requirement 9: Structured Summarization

**User Story:** As a researcher, I want summaries that are well-structured with citations, so that I can trace claims back to their sources and assess evidence quality.

#### Acceptance Criteria

1. THE Research Agent SHALL generate summaries containing short overview, detailed analysis, key facts, conflicts, confidence level, and source metadata
2. THE Research Agent SHALL include inline citations using [1], [2] notation in summary text
3. THE Research Agent SHALL assess confidence as "high", "medium", or "low" based on source agreement and quality
4. THE Research Agent SHALL identify and report contradictions between sources
5. THE Research Agent SHALL assign relevance scores (1-5) to each source used in a summary
6. THE Research Agent SHALL handle cases where documents lack relevant information by returning low-confidence summaries

### Requirement 10: Session Management and Persistence

**User Story:** As a researcher, I want all research artifacts saved to disk, so that I can review intermediate results, resume interrupted sessions, and audit the research process.

#### Acceptance Criteria

1. THE Research Agent SHALL create a unique session directory for each research investigation
2. THE Research Agent SHALL save configuration, search results, scraped content, and round summaries as JSON files
3. THE Research Agent SHALL maintain a session log file with timestamped events
4. THE Research Agent SHALL save the final report as a markdown file in the session directory
5. THE Research Agent SHALL organize artifacts by round number in subdirectories
6. THE Research Agent SHALL display the session directory path to the user at initialization

### Requirement 11: Final Report Generation with Fact Cross-Referencing

**User Story:** As a researcher, I want a comprehensive, well-formatted report with explicit fact verification, so that I can easily understand, trust, and share the research findings.

#### Acceptance Criteria

1. THE Research Agent SHALL generate a markdown report with sections for executive summary, introduction, main findings, insights, limitations, sources, and conclusion
2. THE Research Agent SHALL include inline citations throughout the report using numbered references
3. THE Research Agent SHALL identify and highlight claims that appear across multiple independent sources
4. THE Research Agent SHALL explicitly flag claims supported by only a single source as "preliminary" or "according to limited sources"
5. THE Research Agent SHALL provide a complete sources section with URLs
6. THE Research Agent SHALL synthesize findings across all research rounds into coherent narratives
7. THE Research Agent SHALL highlight key insights, patterns, and contradictions discovered during research
8. THE Research Agent SHALL acknowledge limitations and information gaps in the report
9. THE Research Agent SHALL target 1500-2500 words for the final report

### Requirement 12: Configuration and Extensibility

**User Story:** As a user, I want to customize research parameters, so that I can adapt the system to different research needs and constraints.

#### Acceptance Criteria

1. THE Research Agent SHALL accept command-line arguments for topic, preferences, max depth, URLs per round, and documents per question
2. THE Research Agent SHALL load API keys and model names from a configuration file
3. THE Research Agent SHALL provide sensible defaults for all configuration parameters
4. THE Research Agent SHALL validate configuration values at startup
5. THE Research Agent SHALL support environment variable overrides for sensitive configuration like API keys
