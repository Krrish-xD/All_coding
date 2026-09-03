"""
Report compiler module for the Deep Research Agent v2.

This module synthesizes all research findings into a final markdown report
with fact cross-referencing and source attribution.
"""

from typing import List, Dict, Any, Set
from collections import defaultdict
from pathlib import Path

from models import ResearchConfig
from llm_client import call_gemini_text
from prompts import get_final_report_prompt, get_round_findings_prompt
from cache import embed_text
from utils import calculate_cosine_similarity


def compile_round_findings(
    round_num: int,
    round_data: Dict[str, Any],
    config: ResearchConfig,
    session_dir: str
) -> str:
    """
    Generate synthesized findings for a single research round.
    
    Args:
        round_num: Round number
        round_data: Round data with questions and summaries
        config: Research configuration
        session_dir: Session directory path
        
    Returns:
        Markdown findings string
    """
    from logger import get_logger
    logger = get_logger("report_compiler")
    
    logger.info(f"Compiling findings for round {round_num}...")
    
    # Get prompt from prompts module
    system_prompt, user_prompt = get_round_findings_prompt(
        round_num=round_num,
        round_data=round_data,
        topic=config.topic
    )
    
    # Call mid-tier model for round synthesis (cheaper than premium)
    max_retries = 3
    findings = None
    
    for attempt in range(max_retries):
        findings = call_gemini_text(
            model=config.model_midtier,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            temperature=0.7
        )
        
        # Check for API errors
        if findings.startswith("Error:"):
            if attempt < max_retries - 1:
                logger.warning(f"Round findings generation failed (attempt {attempt + 1}/{max_retries}), retrying...")
                continue
            else:
                logger.error(f"Failed to generate round findings after {max_retries} attempts")
                # Fallback: create basic findings from summaries
                findings = create_fallback_round_findings(round_num, round_data)
                break
        
        # Validate findings has minimum content
        if len(findings) > 200:
            break
        else:
            if attempt < max_retries - 1:
                logger.warning(f"Round findings seem too short (attempt {attempt + 1}/{max_retries}), retrying...")
                continue
    
    # Save findings to round directory
    round_path = Path(session_dir) / f"round_{round_num}"
    findings_path = round_path / "findings.md"
    
    with open(findings_path, 'w') as f:
        f.write(findings)
    
    logger.info(f"✓ Round {round_num} findings saved to {findings_path}")
    
    return findings


def create_fallback_round_findings(round_num: int, round_data: Dict[str, Any]) -> str:
    """
    Create basic findings markdown when LLM fails.
    
    Args:
        round_num: Round number
        round_data: Round data
        
    Returns:
        Basic markdown findings
    """
    findings_parts = [f"# Round {round_num} Findings\n"]
    
    summaries = round_data.get("summaries", [])
    
    for i, summary_data in enumerate(summaries, 1):
        question = summary_data.get("question", "")
        summary = summary_data.get("summary", {})
        
        findings_parts.append(f"\n## Question {i}: {question}\n")
        findings_parts.append(f"{summary.get('long_summary', summary.get('short_summary', 'No summary available'))}\n")
        
        key_facts = summary.get("key_facts", [])
        if key_facts:
            findings_parts.append("\n**Key Facts:**\n")
            for fact in key_facts:
                findings_parts.append(f"- {fact}\n")
    
    return "\n".join(findings_parts)


def compile_final_report(
    all_rounds: List[Dict[str, Any]],
    config: ResearchConfig
) -> str:
    """
    Generate complete research report from synthesized round findings.
    
    Args:
        all_rounds: List of all research round data
        config: Research configuration
        
    Returns:
        Markdown report string
    """
    from logger import get_logger, log_metrics
    logger = get_logger("report_compiler")
    
    logger.info("Starting final report compilation...")
    
    # Load all round findings
    round_findings = []
    for i, round_data in enumerate(all_rounds, 1):
        round_path = Path(config.session_dir) / f"round_{i}"
        findings_path = round_path / "findings.md"
        
        if findings_path.exists():
            with open(findings_path, 'r') as f:
                findings = f.read()
                round_findings.append({
                    "round_num": i,
                    "findings": findings
                })
        else:
            logger.warning(f"No findings.md found for round {i}, skipping")
    
    # Extract all sources
    sources = extract_all_sources(all_rounds)
    logger.info(f"Total unique sources: {len(sources)}")
    
    # Cross-reference facts
    fact_analysis = cross_reference_facts(all_rounds)
    log_metrics(logger, {
        "Multi-source claims": fact_analysis['multi_source_count'],
        "Single-source claims": fact_analysis['single_source_count']
    })
    
    # Get prompt from prompts module (now uses round findings instead of raw summaries)
    system_prompt, user_prompt = get_final_report_prompt(
        topic=config.topic,
        preferences=config.preferences,
        round_findings=round_findings,
        total_rounds=len(all_rounds)
    )
    
    # Add fact analysis to prompt
    user_prompt += f"\n\n**Research Statistics:**\n"
    user_prompt += f"- Total rounds: {len(all_rounds)}\n"
    user_prompt += f"- Multi-source claims: {fact_analysis['multi_source_count']}\n"
    user_prompt += f"- Single-source claims: {fact_analysis['single_source_count']}\n"
    user_prompt += f"- Total sources: {len(sources)}\n"
    
    # Call premium model for report generation with retry logic
    logger.info("Generating report with premium model...")
    
    max_retries = 3
    report = None
    
    for attempt in range(max_retries):
        report = call_gemini_text(
            model=config.model_premium,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            temperature=0.7
        )
        
        # Check for API errors
        if report.startswith("Error:"):
            if attempt < max_retries - 1:
                logger.warning(f"Report generation failed (attempt {attempt + 1}/{max_retries}), retrying...")
                continue  # Retry
            else:
                # All retries failed
                from rich.console import Console
                console = Console()
                console.print(f"[red]✗ API Error:[/red] Failed to generate final report after {max_retries} attempts")
                console.print(f"[dim]{report}[/dim]")
                # Return a minimal error report
                report = f"# Research Report\n\n**Error:** Failed to compile final report due to API error after {max_retries} attempts.\n\nPlease check the session logs for details.\n\n## Sources\n\n"
                for i, source in enumerate(sources, 1):
                    report += f"{i}. {source['url']}\n"
                return report
        
        # Validate report has minimum content
        if len(report) > 500 and ("##" in report or "**" in report):
            # Looks like a valid markdown report
            break
        else:
            # Report seems too short or malformed
            if attempt < max_retries - 1:
                logger.warning(f"Report seems malformed (attempt {attempt + 1}/{max_retries}), retrying...")
                continue
            else:
                logger.warning("Report may be incomplete but using it anyway")
                break
    
    # Format and add sources section if not present
    if "## Sources" not in report and "## References" not in report:
        report += "\n\n## Sources\n\n"
        for i, source in enumerate(sources, 1):
            report += f"{i}. {source['url']}\n"
    
    logger.info("✓ Report compiled successfully")
    
    return report


def extract_all_sources(rounds: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Collect unique sources from all rounds.
    
    Args:
        rounds: List of research round data
        
    Returns:
        List of source dictionaries with URLs and metadata
    """
    seen_urls: Set[str] = set()
    sources = []
    
    for round_data in rounds:
        summaries = round_data.get("summaries", [])
        
        for summary_data in summaries:
            summary = summary_data.get("summary", {})
            source_list = summary.get("sources", [])
            
            for source in source_list:
                url = source.get("url", "")
                if url and url not in seen_urls:
                    seen_urls.add(url)
                    sources.append({
                        "url": url,
                        "relevance_score": source.get("relevance_score", 3)
                    })
    
    return sources


def cross_reference_facts(rounds: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Identify multi-source vs single-source claims.
    
    Uses semantic similarity to group related facts and count
    how many independent sources support each claim.
    
    Args:
        rounds: List of research round data
        
    Returns:
        Dictionary with fact analysis
    """
    # Extract all key facts with their sources
    all_facts = []
    
    for round_data in rounds:
        summaries = round_data.get("summaries", [])
        
        for summary_data in summaries:
            summary = summary_data.get("summary", {})
            key_facts = summary.get("key_facts", [])
            sources = summary.get("sources", [])
            
            for fact in key_facts:
                if isinstance(fact, str) and fact.strip():
                    all_facts.append({
                        "text": fact,
                        "sources": [s.get("url") for s in sources if s.get("url")]
                    })
    
    if not all_facts:
        return {
            "multi_source_count": 0,
            "single_source_count": 0,
            "fact_clusters": []
        }
    
    # Group similar facts using embeddings
    fact_clusters = cluster_similar_facts(all_facts)
    
    # Count multi-source vs single-source
    multi_source_count = sum(1 for cluster in fact_clusters if len(cluster["sources"]) > 1)
    single_source_count = len(fact_clusters) - multi_source_count
    
    return {
        "multi_source_count": multi_source_count,
        "single_source_count": single_source_count,
        "fact_clusters": fact_clusters
    }


def cluster_similar_facts(
    facts: List[Dict[str, Any]],
    similarity_threshold: float = 0.85
) -> List[Dict[str, Any]]:
    """
    Group semantically similar facts together.
    
    Args:
        facts: List of fact dictionaries
        similarity_threshold: Minimum similarity to cluster
        
    Returns:
        List of fact clusters with combined sources
    """
    if not facts:
        return []
    
    # Generate embeddings for all facts
    try:
        fact_embeddings = []
        for fact in facts:
            embedding = embed_text(fact["text"])
            fact_embeddings.append(embedding)
    except Exception as e:
        from logger import get_logger
        logger = get_logger("report_compiler")
        logger.warning(f"Could not generate embeddings for fact clustering: {e}")
        # Return each fact as its own cluster
        return [
            {
                "representative_text": fact["text"],
                "sources": set(fact["sources"]),
                "count": 1
            }
            for fact in facts
        ]
    
    # Cluster facts by similarity
    clusters = []
    used = set()
    
    for i, fact in enumerate(facts):
        if i in used:
            continue
        
        # Start new cluster
        cluster_sources = set(fact["sources"])
        cluster_facts = [fact["text"]]
        used.add(i)
        
        # Find similar facts
        for j, other_fact in enumerate(facts):
            if j <= i or j in used:
                continue
            
            similarity = calculate_cosine_similarity(
                fact_embeddings[i],
                fact_embeddings[j]
            )
            
            if similarity >= similarity_threshold:
                cluster_sources.update(other_fact["sources"])
                cluster_facts.append(other_fact["text"])
                used.add(j)
        
        clusters.append({
            "representative_text": fact["text"],  # Use first fact as representative
            "sources": cluster_sources,
            "count": len(cluster_facts)
        })
    
    return clusters


def format_markdown_report(sections: Dict[str, str]) -> str:
    """
    Assemble sections into final markdown report.
    
    Args:
        sections: Dictionary of section name -> content
        
    Returns:
        Complete markdown report
    """
    report_parts = []
    
    # Title
    if "title" in sections:
        report_parts.append(f"# {sections['title']}\n")
    
    # Executive Summary
    if "executive_summary" in sections:
        report_parts.append("## Executive Summary\n")
        report_parts.append(sections["executive_summary"])
        report_parts.append("\n")
    
    # Introduction
    if "introduction" in sections:
        report_parts.append("## Introduction\n")
        report_parts.append(sections["introduction"])
        report_parts.append("\n")
    
    # Main Findings
    if "main_findings" in sections:
        report_parts.append("## Main Findings\n")
        report_parts.append(sections["main_findings"])
        report_parts.append("\n")
    
    # Key Insights
    if "insights" in sections:
        report_parts.append("## Key Insights & Analysis\n")
        report_parts.append(sections["insights"])
        report_parts.append("\n")
    
    # Limitations
    if "limitations" in sections:
        report_parts.append("## Limitations & Uncertainties\n")
        report_parts.append(sections["limitations"])
        report_parts.append("\n")
    
    # Sources
    if "sources" in sections:
        report_parts.append("## Sources\n")
        report_parts.append(sections["sources"])
        report_parts.append("\n")
    
    # Conclusion
    if "conclusion" in sections:
        report_parts.append("## Conclusion\n")
        report_parts.append(sections["conclusion"])
        report_parts.append("\n")
    
    return "\n".join(report_parts)
