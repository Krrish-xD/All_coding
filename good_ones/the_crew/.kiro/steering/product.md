---
inclusion: always
---

# Deep Research Agent

An autonomous LLM-based research system that conducts comprehensive, multi-round investigations on complex topics using AI-powered analysis and intelligent web scraping.

## Core Functionality

The agent performs iterative research cycles:
1. Generates strategic research questions from a high-level topic
2. Expands queries and searches for relevant sources using DuckDuckGo
3. Scrapes and extracts content from discovered URLs with quality scoring
4. Checks semantic cache to reuse previous work on similar questions
5. Summarizes findings using tiered Gemini AI models with proper citations
6. Reflects on gaps and generates deduplicated follow-up questions
7. Cross-references facts across sources and compiles comprehensive markdown reports

## Key Features

- **Intelligent Semantic Caching**: Vector-based caching reduces API costs by reusing summaries for similar questions
- **Source Quality Assessment**: Prioritizes academic, government, and authoritative sources
- **Multi-Tier Model Orchestration**: Uses expensive models only when necessary (lightweight for summaries, premium for final reports)
- **URL Diversity Enforcement**: Limits sources per domain to avoid echo chambers
- **Question Deduplication**: Prevents redundant questions across research rounds
- **Query Expansion**: Generates multiple search variants per question for comprehensive coverage
- **Fact Cross-Referencing**: Identifies multi-source claims vs single-source claims in final reports
- **Modular Architecture**: Pure Python with clear separation of concerns
- **Session Management**: All artifacts saved for auditability and resumption

## Current Status

- v1 prototype is functional and located in `v1_prototype/` (hybrid Python/C++ architecture)
- v2 is the current development focus with pure Python modular architecture
- v2 emphasizes cost efficiency, caching, and source quality over raw performance
