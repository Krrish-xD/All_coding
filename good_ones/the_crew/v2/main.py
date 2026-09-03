#!/usr/bin/env python3
"""
Deep Research Agent v2 - Main Entry Point

This is the main orchestrator for the Deep Research Agent v2.
It coordinates the entire research workflow from initial question generation
through multiple research rounds to final report compilation.
"""

import argparse
import sys
from pathlib import Path
from typing import List, Dict, Any

from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.progress import Progress, SpinnerColumn, BarColumn, TextColumn

from models import load_config_from_args, validate_config, ResearchConfig
from session import initialize_session, save_round_artifacts, save_final_report
from cache import initialize_cache
from llm_client import configure_gemini
from question_generator import generate_initial_questions, generate_followup_questions, deduplicate_questions
from search import search_for_question
from scraper import scrape_urls, get_scraping_stats
from summarizer import summarize_documents
from report_compiler import compile_final_report, compile_round_findings
from logger import setup_logging, get_logger

console = Console()


def main():
    """Main entry point for the Deep Research Agent v2."""
    parser = argparse.ArgumentParser(
        description="Deep Research Agent v2 - Autonomous multi-round research system",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python main.py --topic "renewable energy trends" --depth 3
  python main.py --topic "AI safety" --preferences "focus on recent developments" --top_k 10
        """
    )
    
    # Required arguments
    parser.add_argument(
        "--topic",
        type=str,
        required=True,
        help="Research topic (required)"
    )
    
    # Optional arguments
    parser.add_argument(
        "--preferences",
        type=str,
        default="",
        help="Additional guidance for research (optional)"
    )
    parser.add_argument(
        "--depth",
        type=int,
        default=2,
        help="Maximum number of research rounds (default: 2)"
    )
    parser.add_argument(
        "--top_k",
        type=int,
        default=8,
        help="URLs to process per round (default: 8)"
    )
    parser.add_argument(
        "--docs_per_q",
        type=int,
        default=5,
        help="Documents to summarize per question (default: 5)"
    )
    parser.add_argument(
        "--reddit_min",
        type=int,
        default=1,
        help="Minimum Reddit links in first round (default: 1)"
    )
    
    args = parser.parse_args()
    
    # Load configuration
    try:
        config = load_config_from_args(args)
        validate_config(config)
    except ValueError as e:
        # Use basic logging before session is initialized
        logger = get_logger("main")
        logger.error(f"Configuration error: {e}")
        return 1
    
    # Run research session
    try:
        run_research_session(config)
        return 0
    except Exception as e:
        logger = get_logger("main")
        logger.error(f"Fatal error: {e}", exc_info=True)
        return 1


def run_research_session(config: ResearchConfig) -> None:
    """
    Orchestrate the complete research workflow.
    
    Args:
        config: Research configuration
    """
    # Initialize session first to get log directory
    session_dir = initialize_session(config)
    
    # Setup logging with session directory (WARNING level for console)
    setup_logging(session_dir=session_dir, console_level=30)  # WARNING level
    logger = get_logger("main")
    
    # Show clean header
    console.print()
    console.print(Panel.fit(
        f"[bold cyan]Deep Research Agent v2[/bold cyan]\n\n"
        f"[white]Topic:[/white] {config.topic}\n"
        f"[white]Depth:[/white] {config.max_depth} rounds | "
        f"[white]URLs/round:[/white] {config.top_k_per_round} | "
        f"[white]Docs/question:[/white] {config.docs_per_question}",
        border_style="cyan",
        title="[bold]Research Session[/bold]"
    ))
    console.print()
    
    # Initialize with minimal output
    with console.status("[bold green]Initializing cache system..."):
        initialize_cache()
    console.print("✓ Cache system ready")
    
    with console.status("[bold green]Configuring Gemini API..."):
        configure_gemini(config.gemini_api_key)
    console.print("✓ Gemini API configured")
    console.print()
    
    # Generate initial questions
    with console.status("[bold green]Generating research questions..."):
        questions = generate_initial_questions(config.topic, config.preferences, config)
    
    console.print(f"✓ Generated [bold]{len(questions)}[/bold] research questions\n")
    
    # Show questions in table
    table = Table(show_header=True, header_style="bold magenta", border_style="dim")
    table.add_column("#", style="cyan", width=3, justify="right")
    table.add_column("Research Question")
    
    for i, q in enumerate(questions, 1):
        table.add_row(str(i), q)
    
    console.print(table)
    console.print()
    
    # Track all rounds
    all_rounds = []
    all_questions_asked = questions.copy()
    
    # Execute research rounds
    for round_num in range(1, config.max_depth + 1):
        console.print(Panel(
            f"[bold white]Round {round_num} of {config.max_depth}[/bold white]",
            border_style="blue",
            expand=False
        ))
        
        round_data = execute_round(
            round_num=round_num,
            questions=questions,
            config=config,
            is_first_round=(round_num == 1)
        )
        
        all_rounds.append(round_data)
        
        # Save round artifacts
        save_round_artifacts(round_num, round_data, config.session_dir)
        
        # Compile round findings
        console.print()
        with console.status(f"[bold green]Synthesizing round {round_num} findings..."):
            compile_round_findings(round_num, round_data, config, config.session_dir)
        console.print(f"[dim]✓ Round {round_num} findings saved[/dim]")
        
        # Generate follow-up questions for next round
        if round_num < config.max_depth:
            with console.status("[bold green]Generating follow-up questions..."):
                new_questions = generate_followup_questions(all_rounds, config)
            
            if new_questions:
                # Deduplicate against all previously asked questions
                questions = deduplicate_questions(new_questions, all_questions_asked)
                
                if questions:
                    console.print(f"✓ Generated [bold]{len(questions)}[/bold] follow-up questions\n")
                    
                    # Show questions in table
                    table = Table(show_header=True, header_style="bold magenta", border_style="dim")
                    table.add_column("#", style="cyan", width=3, justify="right")
                    table.add_column("Follow-up Question")
                    
                    for i, q in enumerate(questions, 1):
                        table.add_row(str(i), q)
                    
                    console.print(table)
                    console.print()
                    
                    all_questions_asked.extend(questions)
                else:
                    console.print("[yellow]No new unique questions. Ending research.[/yellow]\n")
                    break
            else:
                console.print("[yellow]No follow-up questions needed. Ending research.[/yellow]\n")
                break
    
    # Compile final report
    console.print()
    with console.status("[bold green]Compiling final report..."):
        report = compile_final_report(all_rounds, config)
    
    # Save report
    report_path = save_final_report(report, config.session_dir)
    
    # Display cache statistics
    from cache import get_cache_stats
    cache_stats = get_cache_stats()
    
    # Show completion
    console.print()
    console.print(Panel.fit(
        f"[bold green]✓ Research Complete![/bold green]\n\n"
        f"[white]Report:[/white] {report_path}\n"
        f"[white]Session:[/white] {config.session_dir}\n\n"
        f"[dim]Cache: {cache_stats['content_entries']} content | "
        f"{cache_stats['summary_entries']} summaries[/dim]",
        border_style="green",
        title="[bold]Success[/bold]"
    ))
    console.print()


def execute_round(
    round_num: int,
    questions: List[str],
    config: ResearchConfig,
    is_first_round: bool = False
) -> Dict[str, Any]:
    """
    Execute a single research round.
    
    Args:
        round_num: Round number
        questions: Research questions for this round
        config: Research configuration
        is_first_round: Whether this is the first round
        
    Returns:
        Dictionary with round data
    """
    from utils import now_iso
    
    logger = get_logger("main")
    
    round_data = {
        "round_number": round_num,
        "questions": questions,
        "search_results": {},
        "scraped_documents": [],
        "summaries": [],
        "timestamp": now_iso()
    }
    
    # Search phase
    console.print("\n[bold]Phase 1:[/bold] Searching for sources")
    
    all_urls = []
    for i, question in enumerate(questions, 1):
        console.print(f"  [{i}/{len(questions)}] Searching...", end=" ")
        
        urls = search_for_question(
            question=question,
            topic=config.topic,
            top_k=config.top_k_per_round,
            max_per_domain=config.max_urls_per_domain,
            is_first_round=is_first_round,
            reddit_min=config.reddit_min_first_round
        )
        
        console.print(f"[green]✓[/green] {len(urls)} URLs")
        round_data["search_results"][question] = urls
        all_urls.extend(urls)
    
    # Deduplicate URLs across questions
    from utils import deduplicate_urls
    unique_urls = deduplicate_urls(all_urls)
    console.print(f"\n  Total: [bold]{len(unique_urls)}[/bold] unique URLs\n")
    
    # Scraping phase
    console.print("[bold]Phase 2:[/bold] Scraping content")
    
    documents = scrape_urls(unique_urls, timeout=15, show_progress=True)
    round_data["scraped_documents"] = [
        {
            "url": doc.url,
            "text": doc.text,
            "error": doc.error,
            "timestamp": doc.timestamp,
            "char_count": doc.char_count
        }
        for doc in documents
    ]
    
    # Show scraping stats
    stats = get_scraping_stats(documents)
    console.print(f"  [green]✓[/green] Scraped {stats['successful']}/{stats['total']} URLs "
                 f"({stats['success_rate']:.0%} success)")
    
    # Show cache statistics
    if stats['cached'] > 0:
        console.print(f"  [cyan]↻[/cyan] {stats['cached']} from cache, {stats['fresh']} freshly scraped")
    console.print()
    
    # Summarization phase
    console.print("[bold]Phase 3:[/bold] Generating summaries")
    
    # Prepare summarization tasks
    summarization_tasks = []
    for i, question in enumerate(questions, 1):
        question_urls = round_data["search_results"].get(question, [])
        question_docs = [doc for doc in documents if doc.url in question_urls]
        
        if question_docs:
            summarization_tasks.append((i, question, question_docs))
        else:
            console.print(f"  [{i}/{len(questions)}] [yellow]⚠[/yellow] No documents")
    
    # Run summarizations in parallel (max 5 concurrent)
    from concurrent.futures import ThreadPoolExecutor, as_completed
    
    summaries_dict = {}
    with ThreadPoolExecutor(max_workers=5) as executor:
        # Submit all tasks (explicitly pass cache_db_path=None to use default)
        future_to_task = {
            executor.submit(summarize_documents, question, docs, config, None): (idx, question)
            for idx, question, docs in summarization_tasks
        }
        
        # Collect results as they complete
        for future in as_completed(future_to_task):
            idx, question = future_to_task[future]
            try:
                summary = future.result()
                summaries_dict[question] = summary
                
                # Show progress with cache status
                cached = summary.get("cached", False)
                partially_cached = summary.get("partially_cached", False)
                confidence = summary.get('confidence', 'unknown')
                
                if cached:
                    status = "[cyan]✓ Cached[/cyan]"
                elif partially_cached:
                    status = "[blue]✓ Partial cache[/blue]"
                else:
                    status = "[green]✓ Generated[/green]"
                
                console.print(f"  [{idx}/{len(questions)}] {status} ({confidence} confidence)")
                
            except Exception as e:
                logger.error(f"Summarization failed for question {idx}: {e}")
                console.print(f"  [{idx}/{len(questions)}] [red]✗ Failed:[/red] {str(e)[:50]}...")
    
    # Add summaries to round data in original order
    for _, question, _ in summarization_tasks:
        if question in summaries_dict:
            round_data["summaries"].append({
                "question": question,
                "summary": summaries_dict[question]
            })
    
    console.print(f"\n[dim]Round {round_num} complete: {len(questions)} questions, "
                 f"{stats['successful']} sources analyzed[/dim]\n")
    
    return round_data


if __name__ == "__main__":
    sys.exit(main())
