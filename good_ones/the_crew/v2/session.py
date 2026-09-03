"""
Session management for the Deep Research Agent v2.

This module handles session initialization, artifact saving,
and logging for research sessions.
"""

import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List

from models import ResearchConfig
from utils import ensure_dir, now_iso
from logger import get_logger


def initialize_session(config: ResearchConfig) -> str:
    """
    Initialize a new research session.
    
    Creates session directory structure and saves initial configuration.
    
    Args:
        config: ResearchConfig for this session
        
    Returns:
        Path to session directory
    """
    # Create session directory
    session_path = Path(config.session_dir)
    ensure_dir(session_path)
    
    # Save configuration
    config_path = session_path / "config.json"
    save_config_to_session(config, str(config_path))
    
    logger = get_logger("session")
    logger.info(f"Session initialized: {config.session_id}")
    logger.debug(f"Topic: {config.topic}")
    logger.debug(f"Max depth: {config.max_depth}")
    logger.debug(f"URLs per round: {config.top_k_per_round}")
    logger.debug(f"Docs per question: {config.docs_per_question}")
    logger.debug(f"Reddit minimum (round 1): {config.reddit_min_first_round}")
    
    return str(session_path)


def save_config_to_session(config: ResearchConfig, path: str) -> None:
    """
    Save configuration to session directory.
    
    Args:
        config: ResearchConfig to save
        path: Path to save JSON file
    """
    from dataclasses import asdict
    
    with open(path, 'w') as f:
        json.dump(asdict(config), f, indent=2)


def save_round_artifacts(
    round_num: int,
    data: Dict[str, Any],
    session_dir: str
) -> None:
    """
    Save research round artifacts to disk.
    
    Args:
        round_num: Round number
        data: Dictionary containing round data
        session_dir: Path to session directory
    """
    # Create round directory
    round_path = Path(session_dir) / f"round_{round_num}"
    ensure_dir(round_path)
    
    # Save search results
    if "search_results" in data:
        search_path = round_path / "search_results.json"
        with open(search_path, 'w') as f:
            json.dump(data["search_results"], f, indent=2)
    
    # Save scraped documents (JSONL format)
    if "scraped_documents" in data:
        scraped_path = round_path / "scraped.jsonl"
        with open(scraped_path, 'w') as f:
            for doc in data["scraped_documents"]:
                f.write(json.dumps(doc) + '\n')
    
    # Save complete round data
    round_data_path = round_path / "round.json"
    with open(round_data_path, 'w') as f:
        json.dump(data, f, indent=2)
    
    logger = get_logger("session")
    logger.debug(f"Round {round_num} artifacts saved to {round_path}")


def save_final_report(report: str, session_dir: str) -> str:
    """
    Save final research report to session directory.
    
    Args:
        report: Markdown report content
        session_dir: Path to session directory
        
    Returns:
        Path to saved report file
    """
    report_path = Path(session_dir) / "final_report.md"
    
    with open(report_path, 'w') as f:
        f.write(report)
    
    logger = get_logger("session")
    logger.info(f"Final report saved to {report_path}")
    
    return str(report_path)


def load_round_data(round_num: int, session_dir: str) -> Dict[str, Any]:
    """
    Load round data from disk.
    
    Args:
        round_num: Round number
        session_dir: Path to session directory
        
    Returns:
        Dictionary containing round data
    """
    round_path = Path(session_dir) / f"round_{round_num}" / "round.json"
    
    if not round_path.exists():
        return {}
    
    with open(round_path, 'r') as f:
        return json.load(f)


def get_all_rounds(session_dir: str) -> List[Dict[str, Any]]:
    """
    Load all round data from session.
    
    Args:
        session_dir: Path to session directory
        
    Returns:
        List of round data dictionaries
    """
    session_path = Path(session_dir)
    rounds = []
    
    # Find all round directories
    round_dirs = sorted(session_path.glob("round_*"))
    
    for round_dir in round_dirs:
        round_file = round_dir / "round.json"
        if round_file.exists():
            with open(round_file, 'r') as f:
                rounds.append(json.load(f))
    
    return rounds
