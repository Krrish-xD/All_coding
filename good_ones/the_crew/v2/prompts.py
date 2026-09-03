"""
Centralized prompt templates for the Deep Research Agent v2.

This module contains all LLM prompts with getter functions for formatting.
Prompts incorporate best practices from deep research methodology:
- Epistemic reasoning (verifying facts across sources)
- Reflective prompting (self-critique and planning)
- Multi-source triangulation
- Explicit citation requirements
- Confidence assessment
"""

from typing import List, Dict, Any, Tuple


# ============================================================================
# Initial Questions Prompts
# ============================================================================

INITIAL_QUESTIONS_SYSTEM = """You are an expert research strategist specializing in problem decomposition.

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
- Phrased to elicit evidence-based answers

IMPORTANT: Return ONLY a JSON array of strings. Each element must be a plain string, not an object."""

INITIAL_QUESTIONS_USER_TEMPLATE = """Topic: {topic}
Research Preferences: {preferences}

Generate 5-8 research questions that decompose this topic into distinct, investigable sub-questions.

CRITICAL: You MUST return ONLY a valid JSON array of strings. No other text or formatting.
Example format: ["question 1", "question 2", "question 3"]

Do NOT return objects like {{"question": "..."}}, only plain strings in an array."""


def get_initial_questions_prompt(topic: str, preferences: str) -> Tuple[str, str]:
    """
    Get formatted prompt for initial question generation.
    
    Args:
        topic: Research topic
        preferences: User preferences
        
    Returns:
        Tuple of (system_prompt, user_prompt)
    """
    user_prompt = INITIAL_QUESTIONS_USER_TEMPLATE.format(
        topic=topic,
        preferences=preferences if preferences else "No specific preferences"
    )
    return (INITIAL_QUESTIONS_SYSTEM, user_prompt)


# ============================================================================
# Follow-up Questions Prompts
# ============================================================================

FOLLOWUP_QUESTIONS_SYSTEM = """You are a research analyst conducting a gap analysis.

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

FOLLOWUP_QUESTIONS_USER_TEMPLATE = """Previous Research Rounds:
{previous_rounds_summary}

Based on the findings so far, what questions remain unanswered or need deeper investigation?

CRITICAL: You MUST return ONLY a valid JSON array of strings. No other text or formatting.
Example format: ["question 1", "question 2", "question 3"]

Do NOT return objects like {{"question": "..."}}, only plain strings in an array."""


def get_followup_questions_prompt(previous_rounds: List[Dict[str, Any]]) -> Tuple[str, str]:
    """
    Get formatted prompt for follow-up question generation.
    
    Args:
        previous_rounds: List of previous research round data with summaries
        
    Returns:
        Tuple of (system_prompt, user_prompt)
    """
    # Summarize previous rounds with actual findings
    summary_parts = []
    for i, round_data in enumerate(previous_rounds, 1):
        questions = round_data.get("questions", [])
        summaries = round_data.get("summaries", [])
        
        summary_parts.append(f"\n### Round {i}")
        summary_parts.append(f"Questions investigated: {len(questions)}")
        
        # Include actual findings from summaries
        for j, summary_data in enumerate(summaries, 1):
            question = summary_data.get("question", "")
            summary = summary_data.get("summary", {})
            
            short_summary = summary.get("short_summary", "")
            key_facts = summary.get("key_facts", [])
            confidence = summary.get("confidence", "unknown")
            conflicts = summary.get("conflicts", "")
            
            summary_parts.append(f"\nQ{j}: {question}")
            if short_summary:
                summary_parts.append(f"Finding: {short_summary}")
            if key_facts:
                # Handle both list of strings and list of dicts
                if isinstance(key_facts, str):
                    # If it's a string (from cache), try to parse it
                    import ast
                    try:
                        key_facts = ast.literal_eval(key_facts)
                    except:
                        key_facts = [key_facts]
                
                # Convert to strings if they're dicts
                facts_str = []
                for fact in key_facts[:3]:
                    if isinstance(fact, dict):
                        facts_str.append(str(fact.get('text', fact)))
                    else:
                        facts_str.append(str(fact))
                
                if facts_str:
                    summary_parts.append(f"Key facts: {'; '.join(facts_str)}")
            if conflicts:
                summary_parts.append(f"Conflicts noted: {conflicts}")
            summary_parts.append(f"Confidence: {confidence}")
    
    rounds_summary = "\n".join(summary_parts) if summary_parts else "No previous rounds"
    
    user_prompt = FOLLOWUP_QUESTIONS_USER_TEMPLATE.format(
        previous_rounds_summary=rounds_summary
    )
    return (FOLLOWUP_QUESTIONS_SYSTEM, user_prompt)


# ============================================================================
# Summarization Prompt (for gemini CLI)
# ============================================================================

SUMMARIZATION_FULL_PROMPT_TEMPLATE = """You are a critical research analyst. Your task is to synthesize information from multiple sources while maintaining accuracy and identifying key insights.

**Critical Analysis Framework:**
1. Extract verifiable facts and data points with source citations
2. Note any conflicting information between sources
3. Identify consensus vs. contested claims
4. Highlight particularly credible or unique insights
5. Note limitations or gaps in the available information
6. Assess overall confidence based on source quality and agreement
7. If possible, retain keywords used in the original website.

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


def get_summarization_prompt(question: str, documents: str) -> str:
    """
    Get formatted prompt for document summarization (gemini CLI).
    
    This combines system and user prompts for CLI compatibility.
    
    Args:
        question: Research question
        documents: Formatted documents with numbers
        
    Returns:
        Complete prompt string
    """
    return SUMMARIZATION_FULL_PROMPT_TEMPLATE.format(
        question=question,
        documents=documents
    )


# ============================================================================
# Final Report Prompt
# ============================================================================

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

# ============================================================================
# Round Findings Prompts
# ============================================================================

ROUND_FINDINGS_SYSTEM = """You are a research analyst synthesizing findings from a single research round.

Your task is to:
1. Review all questions investigated and their summaries
2. Identify key themes and patterns across the findings
3. Synthesize the information into a coherent narrative
4. Highlight important facts, insights, and any contradictions
5. Note confidence levels and information gaps

Create a well-structured markdown document that:
- Summarizes the main discoveries from this round
- Groups related findings together
- Distinguishes high-confidence facts from uncertain claims
- Notes any contradictions or conflicting information
- Is concise but comprehensive (aim for 500-1000 words)

Use clear headings, bullet points, and formatting for readability."""

ROUND_FINDINGS_USER_TEMPLATE = """Research Topic: {topic}
Round Number: {round_num}

Questions Investigated:
{questions_list}

Detailed Findings:
{summaries_data}

Synthesize these findings into a coherent markdown document that captures the key discoveries, patterns, and insights from this research round."""


def get_round_findings_prompt(
    round_num: int,
    round_data: Dict[str, Any],
    topic: str
) -> Tuple[str, str]:
    """
    Get formatted prompt for round findings synthesis.
    
    Args:
        round_num: Round number
        round_data: Round data with questions and summaries
        topic: Research topic
        
    Returns:
        Tuple of (system_prompt, user_prompt)
    """
    # Format questions list
    questions = round_data.get("questions", [])
    questions_list = "\n".join([f"{i}. {q}" for i, q in enumerate(questions, 1)])
    
    # Format summaries data
    summaries_parts = []
    summaries = round_data.get("summaries", [])
    
    for i, summary_data in enumerate(summaries, 1):
        question = summary_data.get("question", "")
        summary = summary_data.get("summary", {})
        
        summaries_parts.append(f"\n### Question {i}: {question}\n")
        
        short_summary = summary.get("short_summary", "")
        long_summary = summary.get("long_summary", "")
        key_facts = summary.get("key_facts", [])
        confidence = summary.get("confidence", "unknown")
        conflicts = summary.get("conflicts", "")
        
        if short_summary:
            summaries_parts.append(f"**Summary:** {short_summary}\n")
        
        if long_summary:
            summaries_parts.append(f"**Details:** {long_summary}\n")
        
        if key_facts:
            summaries_parts.append("**Key Facts:**")
            for fact in key_facts:
                summaries_parts.append(f"- {fact}")
            summaries_parts.append("")
        
        if conflicts:
            summaries_parts.append(f"**Conflicts:** {conflicts}\n")
        
        summaries_parts.append(f"**Confidence:** {confidence}\n")
    
    summaries_data = "\n".join(summaries_parts)
    
    user_prompt = ROUND_FINDINGS_USER_TEMPLATE.format(
        topic=topic,
        round_num=round_num,
        questions_list=questions_list,
        summaries_data=summaries_data
    )
    
    return (ROUND_FINDINGS_SYSTEM, user_prompt)


# ============================================================================
# Final Report Prompts
# ============================================================================

FINAL_REPORT_USER_TEMPLATE = """Research Topic: {topic}
Research Preferences: {preferences}

Synthesized Findings from All Rounds:
{round_findings_data}

Compile a comprehensive research report following the specified structure.
Ensure all claims are well-supported and distinguish between high-confidence and uncertain findings."""


def get_final_report_prompt(
    topic: str,
    preferences: str,
    round_findings: List[Dict[str, Any]],
    total_rounds: int
) -> Tuple[str, str]:
    """
    Get formatted prompt for final report compilation.
    
    Args:
        topic: Research topic
        preferences: User preferences
        round_findings: List of synthesized findings from each round
        total_rounds: Total number of rounds
        
    Returns:
        Tuple of (system_prompt, user_prompt)
    """
    # Format round findings (much more concise than raw summaries)
    findings_parts = []
    
    for finding_data in round_findings:
        round_num = finding_data.get("round_num", 0)
        findings = finding_data.get("findings", "")
        
        findings_parts.append(f"\n## Round {round_num} Findings\n")
        findings_parts.append(findings)
        findings_parts.append("\n---\n")
    
    round_findings_data = "\n".join(findings_parts) if findings_parts else "No rounds completed"
    
    user_prompt = FINAL_REPORT_USER_TEMPLATE.format(
        topic=topic,
        preferences=preferences if preferences else "No specific preferences",
        round_findings_data=round_findings_data
    )
    return (FINAL_REPORT_SYSTEM, user_prompt)


# ============================================================================
# Quality Assessment Prompt
# ============================================================================

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


def get_quality_assessment_prompt(
    topic: str,
    max_depth: int,
    current_round: int,
    all_rounds: List[Dict[str, Any]]
) -> Tuple[str, str]:
    """
    Get formatted prompt for quality assessment.
    
    Args:
        topic: Research topic
        max_depth: Maximum depth configured
        current_round: Current round number
        all_rounds: All research round data with summaries
        
    Returns:
        Tuple of (system_prompt, user_prompt)
    """
    # Summarize research with findings
    summary_parts = []
    for i, round_data in enumerate(all_rounds, 1):
        questions = round_data.get("questions", [])
        summaries = round_data.get("summaries", [])
        
        summary_parts.append(f"\nRound {i}: {len(questions)} questions investigated")
        
        # Include confidence levels and conflicts
        high_conf = sum(1 for s in summaries if s.get("summary", {}).get("confidence") == "high")
        medium_conf = sum(1 for s in summaries if s.get("summary", {}).get("confidence") == "medium")
        low_conf = sum(1 for s in summaries if s.get("summary", {}).get("confidence") == "low")
        
        summary_parts.append(f"  Confidence: {high_conf} high, {medium_conf} medium, {low_conf} low")
        
        # Note any conflicts
        conflicts = [s.get("summary", {}).get("conflicts", "") for s in summaries]
        conflicts = [c for c in conflicts if c]
        if conflicts:
            summary_parts.append(f"  Conflicts found: {len(conflicts)} questions have contradictory information")
        
        # Sample key findings
        for j, summary_data in enumerate(summaries[:2], 1):  # Show first 2 questions
            question = summary_data.get("question", "")
            short_summary = summary_data.get("summary", {}).get("short_summary", "")
            if short_summary:
                summary_parts.append(f"  Q{j}: {question[:60]}...")
                summary_parts.append(f"      {short_summary[:100]}...")
    
    research_summary = "\n".join(summary_parts) if summary_parts else "No rounds completed"
    
    user_prompt = QUALITY_ASSESSMENT_USER_TEMPLATE.format(
        topic=topic,
        max_depth=max_depth,
        current_round=current_round,
        research_summary=research_summary
    )
    return (QUALITY_ASSESSMENT_SYSTEM, user_prompt)
