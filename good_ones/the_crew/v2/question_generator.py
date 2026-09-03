"""
Question generator module for the Deep Research Agent v2.

This module generates initial and follow-up research questions
with deduplication logic.
"""

from typing import List, Dict, Any

from models import ResearchConfig
from llm_client import call_gemini_json
from utils import extract_keywords


def generate_initial_questions(
    topic: str,
    preferences: str,
    config: ResearchConfig
) -> List[str]:
    """
    Generate 5-8 initial research questions covering multiple dimensions.
    
    Args:
        topic: Research topic
        preferences: User preferences/guidance
        config: Research configuration
        
    Returns:
        List of research questions
    """
    # Import prompts module (will be created in Task 8)
    try:
        from prompts import get_initial_questions_prompt
        system_prompt, user_prompt = get_initial_questions_prompt(topic, preferences)
    except ImportError:
        # Fallback prompt if prompts module not yet created
        system_prompt = """You are an expert research strategist specializing in problem decomposition.

Your task is to break down a research topic into 5-8 focused sub-questions that cover multiple dimensions:
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
        
        user_prompt = f"""Topic: {topic}
Research Preferences: {preferences}

Generate 5-8 research questions that decompose this topic into distinct, investigable sub-questions.
Return as a JSON array of strings: ["question 1", "question 2", ...]"""
    
    # Retry logic for malformed responses
    max_retries = 3
    for attempt in range(max_retries):
        # Call LLM with premium model
        response = call_gemini_json(
            model=config.model_premium,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            temperature=0.7
        )
        
        # Check for API errors
        if isinstance(response, dict) and "error" in response:
            if attempt < max_retries - 1:
                continue  # Retry
            else:
                from rich.console import Console
                console = Console()
                console.print(f"[red]✗ API Error:[/red] Failed to generate initial questions: {response['error']}")
                console.print("[yellow]Using fallback questions...[/yellow]")
                # Fallback
                return [
                    f"What is {topic}?",
                    f"How does {topic} work?",
                    f"What are the benefits of {topic}?",
                    f"What are the challenges with {topic}?",
                    f"What is the future of {topic}?",
                    f"What are the current trends in {topic}?",
                    f"What are the limitations of {topic}?",
                    f"How is {topic} being applied in practice?"
                ][:8]
        
        # Extract questions
        if isinstance(response, list):
            questions = response
        elif isinstance(response, dict) and "questions" in response:
            questions = response["questions"]
        else:
            questions = []
        
        # Ensure all questions are strings (not dicts)
        validated_questions = []
        for q in questions:
            if isinstance(q, str):
                validated_questions.append(q)
            elif isinstance(q, dict):
                # Try to extract text from dict
                text = q.get('question', q.get('text', str(q)))
                if isinstance(text, str):
                    validated_questions.append(text)
        
        # If we got valid questions, return them
        if validated_questions:
            return validated_questions[:8]  # Success!
        
        # No valid questions, retry
        if attempt < max_retries - 1:
            continue
    
    # All retries failed, use fallback
    from rich.console import Console
    console = Console()
    console.print("[yellow]⚠ API returned malformed responses. Using fallback questions...[/yellow]")
    return [
        f"What is {topic}?",
        f"How does {topic} work?",
        f"What are the benefits of {topic}?",
        f"What are the challenges with {topic}?",
        f"What is the future of {topic}?",
        f"What are the current trends in {topic}?",
        f"What are the limitations of {topic}?",
        f"How is {topic} being applied in practice?"
    ][:8]


def generate_followup_questions(
    previous_rounds: List[Dict[str, Any]],
    config: ResearchConfig
) -> List[str]:
    """
    Generate 3-6 follow-up questions based on previous research.
    
    Args:
        previous_rounds: List of previous research round data
        config: Research configuration
        
    Returns:
        List of follow-up questions
    """
    # Import prompts module
    try:
        from prompts import get_followup_questions_prompt
        system_prompt, user_prompt = get_followup_questions_prompt(previous_rounds)
    except ImportError:
        # Fallback prompt
        system_prompt = """You are a research analyst conducting a gap analysis.

Review the research conducted so far and identify:
1. Information gaps or unanswered aspects of the topic
2. Contradictions or uncertainties that need clarification
3. Promising leads or subtopics that deserve deeper investigation
4. Perspectives or sources that haven't been explored

Generate 3-6 follow-up questions that:
- Address identified gaps
- Are distinct from previously asked questions
- Build on existing findings
- Lead to actionable new research"""
        
        # Summarize previous rounds
        summary_parts = []
        for i, round_data in enumerate(previous_rounds, 1):
            questions = round_data.get("questions", [])
            summary_parts.append(f"Round {i} Questions: {', '.join(questions)}")
        
        rounds_summary = "\n".join(summary_parts)
        
        user_prompt = f"""Previous Research Rounds:
{rounds_summary}

Based on the findings so far, what questions remain unanswered or need deeper investigation?
Return as a JSON array of strings: ["question 1", "question 2", ...]"""
    
    # Retry logic for malformed responses
    max_retries = 3
    for attempt in range(max_retries):
        # Call LLM with premium model
        response = call_gemini_json(
            model=config.model_premium,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            temperature=0.7
        )
        
        # Check for API errors
        if isinstance(response, dict) and "error" in response:
            if attempt < max_retries - 1:
                continue  # Retry
            else:
                from rich.console import Console
                console = Console()
                console.print(f"[red]✗ API Error:[/red] Failed to generate follow-up questions: {response['error']}")
                return []
        
        # Extract questions
        if isinstance(response, list):
            questions = response
        elif isinstance(response, dict) and "questions" in response:
            questions = response["questions"]
        else:
            questions = []
        
        # Ensure all questions are strings (not dicts)
        validated_questions = []
        for q in questions:
            if isinstance(q, str):
                validated_questions.append(q)
            elif isinstance(q, dict):
                # Try to extract text from dict
                text = q.get('question', q.get('text', str(q)))
                if isinstance(text, str):
                    validated_questions.append(text)
        
        # If we got valid questions, return them
        if validated_questions:
            return validated_questions[:6]  # Success! Max 6 follow-up questions
        
        # No valid questions, retry
        if attempt < max_retries - 1:
            continue
    
    # All retries failed
    from rich.console import Console
    console = Console()
    console.print("[yellow]⚠ API returned malformed responses. No follow-up questions generated.[/yellow]")
    return []


def deduplicate_questions(
    new_questions: List[str],
    previous_questions: List[str]
) -> List[str]:
    """
    Filter out redundant questions using keyword overlap analysis.
    
    Args:
        new_questions: Candidate questions
        previous_questions: Previously asked questions
        
    Returns:
        Filtered list of unique questions (at least 2)
    """
    if not previous_questions:
        return new_questions
    
    unique_questions = []
    
    for new_q in new_questions:
        # Safety check: ensure new_q is a string
        if not isinstance(new_q, str):
            continue
        
        # Extract keywords from new question
        new_keywords = set(extract_keywords(new_q, min_length=4))
        
        if not new_keywords:
            # Keep if no keywords extracted
            unique_questions.append(new_q)
            continue
        
        # Check overlap with each previous question
        is_duplicate = False
        
        for prev_q in previous_questions:
            # Safety check: ensure prev_q is a string
            if not isinstance(prev_q, str):
                continue
            
            prev_keywords = set(extract_keywords(prev_q, min_length=4))
            
            if not prev_keywords:
                continue
            
            # Calculate overlap percentage
            overlap = len(new_keywords & prev_keywords)
            total = len(new_keywords | prev_keywords)
            
            if total > 0:
                overlap_pct = overlap / total
                
                # Filter if >60% overlap
                if overlap_pct > 0.6:
                    is_duplicate = True
                    break
        
        if not is_duplicate:
            unique_questions.append(new_q)
    
    # Ensure at least 2 questions
    if len(unique_questions) < 2 and len(new_questions) >= 2:
        # Take first 2 from new questions
        unique_questions = new_questions[:2]
    
    return unique_questions
