"""
Summarizer module for the Deep Research Agent v2.

This module generates structured summaries using the gemini CLI tool
via subprocess, with semantic cache integration.
"""

import subprocess
from typing import List, Dict, Any, Optional

from models import ResearchConfig, ScrapedDocument, Summary
from cache import check_summary_cache, save_summary
from prompts import get_summarization_prompt
from utils import safe_json_parse


def summarize_documents(
    question: str,
    documents: List[ScrapedDocument],
    config: ResearchConfig,
    cache_db_path: Optional[str] = None
) -> Dict[str, Any]:
    """
    Main entry point for document summarization.
    
    Checks semantic cache for each document first, then calls gemini CLI
    for uncached documents. Aggregates results if some are cached.
    
    Args:
        question: Research question
        documents: List of scraped documents
        config: Research configuration
        cache_db_path: Optional cache database path
        
    Returns:
        Summary dictionary
    """
    if not documents:
        return {
            "short_summary": "No documents available",
            "long_summary": "No documents were provided for summarization.",
            "key_facts": [],
            "conflicts": "",
            "confidence": "low",
            "sources": [],
            "cached": False
        }
    
    # Select documents (limit to docs_per_question)
    # Filter out documents with too little content (< 2000 chars)
    MIN_CHARS = 2000
    selected_docs = [d for d in documents if d.text and len(d.text) >= MIN_CHARS][:config.docs_per_question]
    
    if not selected_docs:
        return {
            "short_summary": "No valid documents",
            "long_summary": "All documents failed to scrape or had no content.",
            "key_facts": [],
            "conflicts": "",
            "confidence": "low",
            "sources": [{"url": d.url, "relevance_score": 1} for d in documents],
            "cached": False
        }
    
    # Check cache for each document individually
    cached_summaries = []
    uncached_docs = []
    
    for doc in selected_docs:
        cached = check_summary_cache(
            url=doc.url,
            question=question,
            threshold=config.similarity_threshold,
            db_path=cache_db_path
        )
        
        if cached:
            cached_summaries.append((doc.url, cached))
        else:
            uncached_docs.append(doc)
    
    from logger import get_logger
    logger = get_logger("summarizer")
    
    # Report cache status
    if cached_summaries:
        logger.info(f"  ✓ Cache hit for {len(cached_summaries)}/{len(selected_docs)} documents")
        logger.debug(f"  Cached URLs: {[url for url, _ in cached_summaries]}")
    
    # If all documents are cached, aggregate and return
    if not uncached_docs:
        logger.info(f"  ✓ All documents cached, aggregating results")
        return aggregate_cached_summaries(cached_summaries, selected_docs)
    
    # Cache miss for some/all documents - call gemini CLI
    logger.info(f"  → Calling gemini CLI for {len(uncached_docs)} uncached documents...")
    summary = call_gemini_cli_for_summary(question, uncached_docs, config)
    
    # Only cache if we're summarizing a SINGLE document
    # (Multi-document summaries shouldn't be cached per-document)
    if summary and not summary.get("error") and len(uncached_docs) == 1:
        doc = uncached_docs[0]
        try:
            save_summary(doc.url, question, summary, cache_db_path)
            logger.info(f"  ✓ Cached summary for single document")
        except Exception as e:
            logger.warning(f"  Failed to cache summary: {e}")
    elif len(uncached_docs) > 1:
        logger.debug(f"  Skipping cache for multi-document summary ({len(uncached_docs)} docs)")
    
    # If we have both cached and new summaries, merge them
    if cached_summaries:
        summary = merge_summaries(cached_summaries, summary, selected_docs)
        summary["partially_cached"] = True
        logger.info(f"  ✓ Merged cached and new summaries")
    
    return summary


def call_gemini_cli_for_summary(
    question: str,
    documents: List[ScrapedDocument],
    config: ResearchConfig
) -> Dict[str, Any]:
    """
    Call gemini CLI via subprocess for summarization.
    
    Args:
        question: Research question
        documents: List of scraped documents
        config: Research configuration
        
    Returns:
        Summary dictionary
    """
    from logger import get_logger
    logger = get_logger("summarizer")
    
    # Format documents for prompt
    doc_texts = []
    sources = []
    
    for i, doc in enumerate(documents, 1):
        # Truncate to 6000 chars
        text = doc.text[:6000] if doc.text else ""
        doc_texts.append(f"[{i}] {text}")
        sources.append({"url": doc.url, "relevance_score": 3})
    
    joined_docs = "\n\n".join(doc_texts)
    
    # Get prompt from prompts module
    full_prompt = get_summarization_prompt(question, joined_docs)
    
    # Retry logic: 1 retry after original attempt (max_retries = 1)
    max_retries = 1
    
    for attempt in range(max_retries + 1):  # 0 = original, 1 = retry
        try:
            # Call gemini CLI
            command = [
                "gemini",
                "-m", config.summariser
            ]
            
            result = subprocess.run(
                command,
                input=full_prompt,
                capture_output=True,
                text=True,
                check=True,
                timeout=240  # 4-minute timeout (increased from 2)
            )
            
            # Parse JSON output
            response_json = safe_json_parse(result.stdout)
            
            if not response_json:
                if attempt < max_retries:
                    logger.warning(f"  CLI returned invalid JSON (attempt {attempt + 1}/{max_retries + 1}), retrying...")
                    continue
                else:
                    raise ValueError(f"CLI returned empty or invalid JSON. Raw output: {result.stdout[:200]}")
            
            # Validate the response has required fields
            if not validate_summary(response_json):
                if attempt < max_retries:
                    logger.warning(f"  CLI returned malformed summary (attempt {attempt + 1}/{max_retries + 1}), retrying...")
                    continue
                else:
                    logger.warning(f"  CLI returned malformed summary after retries, using fallback structure")
                    # Add missing fields with defaults
                    response_json.setdefault("short_summary", "Summary unavailable")
                    response_json.setdefault("long_summary", "")
                    response_json.setdefault("key_facts", [])
                    response_json.setdefault("conflicts", "")
                    response_json.setdefault("confidence", "low")
            
            # Ensure sources are included
            if not response_json.get("sources"):
                response_json["sources"] = sources
            
            response_json["cached"] = False
            
            return response_json
        
        except subprocess.TimeoutExpired:
            logger.error(f"  CLI summarization timed out after 240 seconds")
            return {
                "short_summary": "Error: Summarization timed out.",
                "long_summary": "The gemini CLI command did not complete within 240 seconds.",
                "key_facts": [],
                "conflicts": "",
                "confidence": "low",
                "sources": sources,
                "cached": False,
                "error": "timeout"
            }
        
        except subprocess.CalledProcessError as e:
            logger.error(f"  CLI summarization failed: {e.stderr}")
            return {
                "short_summary": "Error during CLI execution.",
                "long_summary": f"CLI error: {e.stderr}",
                "key_facts": [],
                "conflicts": "",
                "confidence": "low",
                "sources": sources,
                "cached": False,
                "error": str(e)
            }
        
        except (ValueError, KeyError) as e:
            if attempt < max_retries:
                logger.warning(f"  Error parsing CLI output (attempt {attempt + 1}/{max_retries + 1}), retrying...")
                continue
            else:
                logger.error(f"  Error parsing CLI output after retries: {e}")
                return {
                    "short_summary": "Error parsing CLI output.",
                    "long_summary": str(e),
                    "key_facts": [],
                    "conflicts": "",
                    "confidence": "low",
                    "sources": sources,
                    "cached": False,
                    "error": str(e)
                }
        
        except FileNotFoundError:
            logger.error(f"  gemini CLI not found. Please install: pip install google-generativeai")
            return {
                "short_summary": "Error: gemini CLI not installed.",
                "long_summary": "The 'gemini' command was not found. Please install google-generativeai package.",
                "key_facts": [],
                "conflicts": "",
                "confidence": "low",
                "sources": sources,
                "cached": False,
                "error": "gemini CLI not found"
            }


def parse_summary_response(response: str) -> Dict[str, Any]:
    """
    Extract structured data from CLI output.
    
    Args:
        response: Raw CLI response
        
    Returns:
        Parsed summary dictionary
    """
    return safe_json_parse(response)


def aggregate_cached_summaries(
    cached_summaries: List[tuple],
    all_docs: List[ScrapedDocument]
) -> Dict[str, Any]:
    """
    Aggregate multiple cached summaries into a single summary.
    
    Args:
        cached_summaries: List of (url, summary_dict) tuples
        all_docs: All documents for source information
        
    Returns:
        Aggregated summary dictionary
    """
    if not cached_summaries:
        return {
            "short_summary": "No cached summaries available",
            "long_summary": "",
            "key_facts": [],
            "conflicts": "",
            "confidence": "low",
            "sources": [],
            "cached": True
        }
    
    # Collect all key facts
    all_facts = []
    all_conflicts = []
    confidence_levels = []
    
    for url, summary in cached_summaries:
        # key_facts should already be a list from cache
        key_facts = summary.get("key_facts", [])
        if isinstance(key_facts, list):
            all_facts.extend(key_facts)
        
        conflicts = summary.get("conflicts", "")
        if conflicts:
            all_conflicts.append(conflicts)
        
        confidence = summary.get("confidence", "medium")
        confidence_levels.append(confidence)
    
    # Deduplicate facts (simple string matching)
    unique_facts = list(set(all_facts))[:10]  # Limit to top 10
    
    # Aggregate confidence (take lowest)
    confidence_order = {"low": 0, "medium": 1, "high": 2}
    min_confidence = min(confidence_levels, key=lambda c: confidence_order.get(c, 1))
    
    # Create sources list
    sources = [{"url": doc.url, "relevance_score": 3} for doc in all_docs]
    
    return {
        "short_summary": f"Aggregated findings from {len(cached_summaries)} cached documents.",
        "long_summary": f"This summary combines cached results from {len(cached_summaries)} documents. " + 
                       (f"Key facts: {'; '.join(unique_facts[:3])}" if unique_facts else ""),
        "key_facts": unique_facts,
        "conflicts": "; ".join(all_conflicts) if all_conflicts else "",
        "confidence": min_confidence,
        "sources": sources,
        "cached": True
    }


def merge_summaries(
    cached_summaries: List[tuple],
    new_summary: Dict[str, Any],
    all_docs: List[ScrapedDocument]
) -> Dict[str, Any]:
    """
    Merge cached summaries with a newly generated summary.
    
    Args:
        cached_summaries: List of (url, summary_dict) tuples
        new_summary: Newly generated summary
        all_docs: All documents for source information
        
    Returns:
        Merged summary dictionary
    """
    # Collect facts from cached summaries
    cached_facts = []
    for url, summary in cached_summaries:
        # key_facts should already be a list from cache
        key_facts = summary.get("key_facts", [])
        if isinstance(key_facts, list):
            cached_facts.extend(key_facts)
    
    # Combine with new facts
    new_facts = new_summary.get("key_facts", [])
    all_facts = cached_facts + new_facts
    
    # Deduplicate
    unique_facts = list(set(all_facts))[:10]
    
    # Update new summary with merged facts
    new_summary["key_facts"] = unique_facts
    new_summary["cached"] = False  # Partially cached
    
    # Update sources to include all documents
    new_summary["sources"] = [{"url": doc.url, "relevance_score": 3} for doc in all_docs]
    
    return new_summary


def validate_summary(summary: Dict[str, Any]) -> bool:
    """
    Ensure summary has required fields.
    
    Args:
        summary: Summary dictionary
        
    Returns:
        True if valid, False otherwise
    """
    required_fields = [
        "short_summary",
        "long_summary",
        "key_facts",
        "conflicts",
        "confidence",
        "sources"
    ]
    
    return all(field in summary for field in required_fields)
