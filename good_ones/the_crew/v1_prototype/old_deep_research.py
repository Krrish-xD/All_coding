#!/usr/bin/env python3
import argparse
import json
import os
import re
import sys
import time
import uuid
import shutil
import subprocess
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, asdict
from typing import Any, Dict, List, Optional

# Get the absolute path of the directory where the script is located
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# Add the script's directory to the Python path to ensure local imports work
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

import config
GEMINI_API_KEY = config.GEMINI_API_KEY
GEMINI_API_KEY_SUMMARY = config.GEMINI_API_KEY_SUMMARY
model_1 = config.model_t1
model_2 = config.model_t2
model_3 = config.model_t3

# LLM client (Gemini)
import google.generativeai as genai

# Retrieval deps
from ddgs import DDGS
import requests
import trafilatura
from tqdm import tqdm
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, BarColumn, TextColumn, TimeElapsedColumn
from rich.panel import Panel
from rich.table import Table

console = Console()
DATA_ROOT = os.path.join(SCRIPT_DIR, "deep_research_sessions")
os.makedirs(DATA_ROOT, exist_ok=True)


# ============= C++ EXTENSION HANDLING =============

CPP_MOD_NAME = "dresearch_cpp"
dresearch_cpp = None

try:
    import importlib
    dresearch_cpp = importlib.import_module(CPP_MOD_NAME)
except Exception:
    dresearch_cpp = None


def try_build_cpp_extension() -> None:
    """Build C++ extension if not already available"""
    setup_path = os.path.join(SCRIPT_DIR, "setup_ext.py")
    if not os.path.exists(setup_path):
        return
    cmd = f"{sys.executable} {setup_path} build_ext --inplace"
    os.system(cmd)
    try:
        import importlib
        global dresearch_cpp
        dresearch_cpp = importlib.import_module(CPP_MOD_NAME)
        console.print("[green]✓ C++ extension built and loaded successfully[/green]")
    except Exception:
        dresearch_cpp = None
        console.print("[yellow]⚠️  C++ extension not available, using Python fallback[/yellow]")


# ============= UTILITY FUNCTIONS =============

def ensure_dir(path: str) -> None:
    os.makedirs(path, exist_ok=True)


def now_iso() -> str:
    return time.strftime("%Y-%m-%dT%H-%M-%S")


def json_dump(path: str, obj: Any) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)


def jsonl_dump(path: str, rows: List[Dict[str, Any]]) -> None:
    with open(path, "w", encoding="utf-8") as f:
        for row in rows:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")


def jsonl_load(path: str) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                rows.append(json.loads(line))
            except Exception:
                continue
    return rows


def safe_json_from_text(txt: str) -> Any:
    txt = txt.strip()
    txt = re.sub(r"^```(json)?", "", txt.strip(), flags=re.IGNORECASE | re.MULTILINE)
    txt = re.sub(r"```$", "", txt.strip(), flags=re.MULTILINE)
    start = min([i for i in [txt.find("{"), txt.find("[")] if i != -1] or [0])
    candidate = txt[start:]
    candidate = candidate[:200000]
    try:
        return json.loads(candidate)
    except Exception:
        match = re.search(r"(\{.*\}|\[.*\])", candidate, flags=re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except Exception:
                pass
    return None


def log_to_file(cfg: "SessionConfig", message: str):
    """Appends a message to the session log."""
    if not cfg or not cfg.session_dir:
        return
    log_file = os.path.join(cfg.session_dir, "session.log")
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
    with open(log_file, "a", encoding="utf-8") as f:
        f.write(f"[{timestamp}] {message}\n")


# ============= GEMINI API CALLS =============

def configure_gemini(api_key: Optional[str] = None) -> None:
    key = api_key or GEMINI_API_KEY
    if not key:
        raise ValueError("Gemini API key is not configured.")
    genai.configure(api_key=key)


def call_gemini_json(model: str, system_prompt: str, user_prompt: str, 
                     max_retries: int = 3, temperature: float = 0.7, 
                     api_key: Optional[str] = None) -> Any:
    configure_gemini(api_key=api_key)
    err: Optional[Exception] = None
    
    for i in range(max_retries):
        try:
            client = genai.GenerativeModel(model_name=model, system_instruction=system_prompt)
            resp = client.generate_content(user_prompt)
            
            if hasattr(resp, "text"):
                data = safe_json_from_text(resp.text or "")
                if data is not None:
                    return data
            
            if hasattr(resp, "candidates"):
                for c in resp.candidates or []:
                    parts = getattr(c, "content", None)
                    if parts and getattr(parts, "parts", None):
                        buf = "".join([getattr(p, "text", "") or "" for p in parts.parts])
                        data = safe_json_from_text(buf)
                        if data is not None:
                            return data
        except Exception as e:
            if "429" in str(e) and "resource exhausted" in str(e).lower():
                wait = (2**i) + 1
                console.print(f"[yellow]⚠️  Rate limit hit. Waiting {wait}s...[/yellow]")
                time.sleep(wait)
                err = e
                continue
            err = e
        time.sleep(0.5)
    
    raise RuntimeError(f"Gemini JSON call failed after {max_retries} retries: {err}")


def call_gemini_text(model: str, system_prompt: str, user_prompt: str, 
                     max_retries: int = 3, temperature: float = 0.7, 
                     api_key: Optional[str] = None) -> str:
    configure_gemini(api_key=api_key)
    err: Optional[Exception] = None
    
    for i in range(max_retries):
        try:
            client = genai.GenerativeModel(model_name=model, system_instruction=system_prompt)
            resp = client.generate_content(user_prompt)
            
            if hasattr(resp, "text") and resp.text:
                return resp.text
            
            if hasattr(resp, "candidates"):
                for c in resp.candidates or []:
                    parts = getattr(c, "content", None)
                    if parts and getattr(parts, "parts", None):
                        buf = "".join([getattr(p, "text", "") or "" for p in parts.parts])
                        if buf.strip():
                            return buf
        except Exception as e:
            if "429" in str(e) and "resource exhausted" in str(e).lower():
                wait = (2**i) + 1
                console.print(f"[yellow]⚠️  Rate limit hit. Waiting {wait}s...[/yellow]")
                time.sleep(wait)
                err = e
                continue
            err = e
        time.sleep(0.5)
    
    raise RuntimeError(f"Gemini text call failed after {max_retries} retries: {err}")


# ============= WEB SCRAPING WITH C++ FALLBACK =============

def normalize_and_dedupe_urls(urls: List[str]) -> List[str]:
    """Use C++ if available, otherwise Python fallback"""
    if dresearch_cpp and hasattr(dresearch_cpp, "normalize_urls"):
        try:
            return dresearch_cpp.normalize_urls(urls)
        except Exception:
            pass
    
    # Python fallback
    seen = set()
    normed: List[str] = []
    for u in urls:
        if not u:
            continue
        nu = u.strip()
        nu = re.sub(r"#.*$", "", nu)
        nu = re.sub(r"/+$", "", nu)
        try:
            from urllib.parse import urlparse, urlunparse
            parts = urlparse(nu)
            nu = urlunparse((parts.scheme.lower(), parts.netloc.lower(), 
                           parts.path, parts.params, parts.query, ""))
        except Exception:
            pass
        if nu not in seen:
            seen.add(nu)
            normed.append(nu)
    return normed


def ddg_search(query: str, max_results: int = 20) -> List[Dict[str, str]]:
    results: List[Dict[str, str]] = []
    try:
        with DDGS() as ddgs:
            for r in ddgs.text(query, max_results=max_results):
                url = r.get("href") or r.get("url")
                if url:
                    results.append({
                        "title": r.get("title") or "", 
                        "snippet": r.get("body") or "", 
                        "url": url
                    })
    except Exception as e:
        console.print(f"[red]Search error: {e}[/red]")
    return results


def cpp_scrape(urls: List[str]) -> List[Dict[str, Any]]:
    """Use C++ scraper if available"""
    if dresearch_cpp and hasattr(dresearch_cpp, "scrape"):
        try:
            return dresearch_cpp.scrape(urls)
        except Exception:
            return []
    return []


def py_scrape(urls: List[str], timeout: float = 15.0) -> List[Dict[str, Any]]:
    """Python fallback scraper"""
    headers = {"User-Agent": "Mozilla/5.0 (compatible; dresearch/1.0)"}
    
    def fetch(u: str) -> Dict[str, Any]:
        item: Dict[str, Any] = {"url": u, "text": "", "error": ""}
        try:
            r = requests.get(u, headers=headers, timeout=timeout)
            ct = r.headers.get("content-type", "")
            if r.status_code != 200 or ("text/html" not in ct and "text/plain" not in ct):
                item["error"] = f"bad-status-or-ctype:{r.status_code}:{ct}"
            else:
                extracted = trafilatura.extract(r.text, include_comments=False, include_tables=False)
                item["text"] = extracted or r.text
        except Exception as e:
            item["error"] = str(e)
        return item
    
    out: List[Dict[str, Any]] = []
    if not urls:
        return out
    
    with ThreadPoolExecutor(max_workers=min(8, len(urls))) as ex:
        futures = [ex.submit(fetch, u) for u in urls]
        for fut in as_completed(futures):
            try:
                out.append(fut.result())
            except Exception as e:
                out.append({"url": "", "text": "", "error": str(e)})
    return out


def scrape_urls(urls: List[str]) -> List[Dict[str, Any]]:
    """Try C++ first, fallback to Python with progress bar"""
    if not urls:
        return []
    
    # Try C++ scraper first
    results = cpp_scrape(urls)
    
    # If C++ failed or returned nothing, use Python with progress bar
    if not results or all(not (r.get("text") or "").strip() for r in results):
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            BarColumn(),
            TextColumn("[progress.percentage]{task.percentage:>3.0f}%"),
            TimeElapsedColumn(),
            console=console
        ) as progress:
            task = progress.add_task("[cyan]Scraping URLs...", total=len(urls))
            
            results = []
            headers = {"User-Agent": "Mozilla/5.0 (compatible; dresearch/1.0)"}
            
            def fetch(u: str) -> Dict[str, Any]:
                item: Dict[str, Any] = {"url": u, "text": "", "error": ""}
                try:
                    r = requests.get(u, headers=headers, timeout=15.0)
                    ct = r.headers.get("content-type", "")
                    if r.status_code == 200 and ("text/html" in ct or "text/plain" in ct):
                        extracted = trafilatura.extract(r.text, include_comments=False, include_tables=False)
                        item["text"] = extracted or r.text
                    else:
                        item["error"] = f"Status {r.status_code}"
                except Exception as e:
                    item["error"] = str(e)[:100]
                return item
            
            with ThreadPoolExecutor(max_workers=min(8, len(urls))) as ex:
                futures = {ex.submit(fetch, u): u for u in urls}
                for fut in as_completed(futures):
                    try:
                        results.append(fut.result())
                    except Exception as e:
                        results.append({"url": "", "text": "", "error": str(e)[:100]})
                    progress.update(task, advance=1)
    
    # Clean texts
    for r in results:
        r["text"] = clean_texts([r.get("text", "")])[0]
    
    successful = sum(1 for r in results if r.get("text") and not r.get("error"))
    console.print(f"[green]✓ Scraped {successful}/{len(urls)} URLs successfully[/green]")
    return results


def clean_texts(texts: List[str]) -> List[str]:
    """Use C++ if available, otherwise Python fallback"""
    if dresearch_cpp and hasattr(dresearch_cpp, "clean_texts"):
        try:
            return dresearch_cpp.clean_texts(texts)
        except Exception:
            pass
    
    # Python fallback
    cleaned: List[str] = []
    for t in texts:
        x = re.sub(r"\s+", " ", (t or "")).strip()
        cleaned.append(x)
    return cleaned


def enforce_reddit_min(urls: List[str], min_count: int) -> List[str]:
    if min_count <= 0:
        return urls
    reddit_urls = [u for u in urls if "reddit.com" in u.lower()]
    if len(reddit_urls) >= min_count:
        return urls
    
    needed = min_count - len(reddit_urls)
    if needed > 0:
        extra = ddg_search("site:reddit.com " + " ".join(re.findall(r'\w+', " ".join(urls))[:5]), 
                          max_results=needed * 3)
        extra_urls = [e["url"] for e in extra if "reddit.com" in (e.get("url") or "").lower()]
        merged = normalize_and_dedupe_urls(urls + extra_urls)
        return merged
    return urls


# ============= SESSION & CONFIG =============

@dataclass
class SessionConfig:
    topic: str
    preferences: str
    max_depth: int
    top_k_per_round: int
    num_docs_per_question: int
    reddit_min_first_round: int
    model_t1: str
    model_t2: str
    model_t3: str
    gemini_api_key_summary: Optional[str]
    timestamp: str
    session_id: str
    session_dir: str


def init_session(topic: str, preferences: str, max_depth: int, top_k_per_round: int, 
                num_docs_per_question: int, reddit_min_first_round: int) -> SessionConfig:
    session_id = f"{now_iso()}_{uuid.uuid4().hex[:8]}"
    session_dir = os.path.join(DATA_ROOT, session_id)
    ensure_dir(session_dir)
    
    console.print(Panel.fit(
        f"[bold cyan]Research Topic:[/bold cyan] {topic}\n"
        f"[bold cyan]Session ID:[/bold cyan] {session_id}\n"
        f"[bold cyan]Artifacts Path:[/bold cyan] {session_dir}",
        title="🔬 Research Session Initialized",
        border_style="cyan"
    ))
    
    cfg = SessionConfig(
        topic=topic, preferences=preferences, max_depth=max_depth,
        top_k_per_round=top_k_per_round, num_docs_per_question=num_docs_per_question,
        reddit_min_first_round=reddit_min_first_round,
        model_t1=model_1, model_t2=model_2, model_t3=model_3,
        gemini_api_key_summary=GEMINI_API_KEY_SUMMARY,
        timestamp=now_iso(), session_id=session_id, session_dir=session_dir
    )
    log_to_file(cfg, "Session initialized.")
    json_dump(os.path.join(session_dir, "config.json"), asdict(cfg))
    log_to_file(cfg, "config.json saved.")
    return cfg


# ============= CORE RESEARCH FUNCTIONS =============

def generate_initial_questions(cfg: SessionConfig) -> List[str]:
    with console.status("[bold green]Generating initial research questions..."):
        system = """You are an expert research strategist specializing in comprehensive topic analysis. 
Your goal is to break down complex topics into investigable sub-questions that cover different angles: 
factual/historical, technical/mechanical, social/impact, comparative, and future-oriented perspectives.

Return ONLY a JSON array of 5-6 research questions. Each question should:
- Be specific and answerable through research
- Cover a distinct aspect of the topic
- Be neither too broad nor too narrow
- Enable finding concrete sources and data"""
        user = f"""Topic: {cfg.topic}
Research Preferences: {cfg.preferences}

Generate 5-6 research questions that would enable a comprehensive understanding of this topic.
Ensure questions cover multiple dimensions: background/context, current state, mechanisms/processes, 
impacts/implications, and future outlook.

Return format: ["question 1", "question 2", ...]"""
        qs = call_gemini_json(cfg.model_t2, system, user)
        
        if not isinstance(qs, list):
            raise RuntimeError("Question generation did not return a list.")
        qs = [str(x).strip() for x in qs if str(x).strip()]
        if not (4 <= len(qs) <= 6):
            qs = qs[:6] if len(qs) > 6 else (qs + ["Context and background?"])[:4]
    
    table = Table(title="Research Questions", show_header=True, header_style="bold magenta")
    table.add_column("#", style="cyan", width=4)
    table.add_column("Question", style="white")
    for i, q in enumerate(qs, 1):
        table.add_row(str(i), q)
    console.print(table)
    
    return qs


def search_for_question(q: str, top_k: int) -> List[str]:
    results = ddg_search(q, max_results=top_k * 3)
    urls = [r["url"] for r in results]
    urls = normalize_and_dedupe_urls(urls)
    return urls[: max(10, top_k * 2)]


def summarize_docs(cfg: SessionConfig, question: str, docs: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Summarizes documents by calling the 'gemini' CLI tool as a subprocess.
    """
    # 1. Select documents and prepare for the prompt
    selected = [d for d in docs if (d.get("text") or "").strip()][: cfg.num_docs_per_question]
    sources = [{"url": d["url"], "chars": len(d.get("text", ""))} for d in selected]
    joined_text = "\n\n".join([f"[{i+1}] {d.get('text','')[:6000]}" for i, d in enumerate(selected)])

    # 2. Construct the full prompt. Since the CLI has no '--system' flag,
    # the system instructions are prepended to the main prompt.
    full_prompt = f"""You are a critical research analyst. Your task is to synthesize information from multiple sources 
while maintaining accuracy and identifying key insights.

When summarizing:
1. Extract verifiable facts and data points
2. Note any conflicting information between sources
3. Identify consensus vs. contested claims
4. Highlight particularly credible or unique insights
5. Note limitations or gaps in the available information

Return strict JSON format with these fields:
- short_summary: 2-3 sentence overview with key findings
- long_summary: Detailed analysis (150-250 words) covering main points, evidence quality, and notable patterns
- key_facts: Array of 3-5 most important factual claims with [source_number] citations
- conflicts: Any contradictions found between sources (or empty string if none)
- confidence: "high"/"medium"/"low" based on source quality and agreement
- sources: Array of {{url, relevance_score}} where relevance_score is 1-5

---
**CRITICAL INSTRUCTION:** If the provided documents do not contain enough information to answer the research question, you MUST still return the JSON structure. In this case, `short_summary` and `long_summary` should state that the documents were not relevant, `key_facts` should be an empty array, and `confidence` should be "low". DO NOT write a conversational response.
---

Research Question: {question}

Documents (numbered for citation):
{joined_text}

Analyze these documents and return the JSON structure. In your summaries, cite sources using [1], [2], etc. 
Focus on answering the research question while noting what the sources reveal and what remains unclear.
"""

    try:
        # 3. Define the command and execute it, passing the prompt to stdin
        command = [
            "gemini",
            "-m", config.summariser,
            # The prompt is passed via the 'input' argument below, which maps to stdin
        ]
        
        result = subprocess.run(
            command, 
            input=full_prompt,
            capture_output=True, 
            text=True, 
            check=True,
            timeout=120 # 2-minute timeout
        )
        
        # 4. Parse the JSON output from the CLI
        response_json = safe_json_from_text(result.stdout)
        if not response_json:
             raise ValueError(f"CLI returned empty or invalid JSON. Raw output: {result.stdout}")
        
        if not response_json.get("sources"):
            response_json["sources"] = sources
        return response_json

    except subprocess.TimeoutExpired as e:
        console.print(f"[red]CLI summarization for question '{question}' timed out.[/red]")
        return {"short_summary": "Error: Summarization timed out.", "long_summary": f"The command did not complete within 120 seconds.", "sources": sources}
    except subprocess.CalledProcessError as e:
        console.print(f"[red]CLI summarization failed:\\n{e.stderr}[/red]")
        return {"short_summary": "Error during CLI execution.", "long_summary": e.stderr, "sources": sources}
    except (ValueError, KeyError) as e:
        console.print(f"[red]Error parsing CLI output: {e}[/red]")
        return {"short_summary": "Error parsing CLI output.", "long_summary": str(e), "sources": sources}


def reflect_new_questions(cfg: SessionConfig, prev_round: Dict[str, Any]) -> List[str]:
    with console.status("[bold yellow]Reflecting on findings..."):
        system = """You are a strategic research director evaluating research progress. Your role is to:
1. Identify gaps, contradictions, or underexplored areas in existing findings
2. Determine which directions would yield the highest-value new insights
3. Avoid redundancy with previous questions
4. Consider practical constraints (findability of information)

Return JSON format:
{
  "assessment": "Brief evaluation of what's been learned and what's missing (2-3 sentences)",
  "questions": ["question 1", "question 2", "question 3"],
  "rationale": ["why question 1 matters", "why question 2 matters", "why question 3 matters"]
}"""
        user = f"""Previous Research Rounds:
{json.dumps(prev_round)[:8000]}

Analyze what we've learned so far. What critical questions remain unanswered? 
What contradictions need resolution? What important angles haven't been explored?

Generate 3-4 follow-up questions that would most significantly deepen understanding. 
Prioritize questions likely to have discoverable, reliable sources."""
        
        res = call_gemini_json(cfg.model_t2, system, user)
        
        if not isinstance(res, dict) or "questions" not in res:
            qs = []
        else:
            qs = res["questions"]

        out = [str(x).strip() for x in qs if str(x).strip()][:4]
    
    if out:
        console.print(f"[green]✓ Generated {len(out)} follow-up questions[/green]")
    else:
        console.print("[yellow]⚠️  No new questions generated[/yellow]")
    return out


def final_compile(cfg: SessionConfig, all_rounds: List[Dict[str, Any]]) -> str:
    console.print("\n[bold cyan]═══════════════════════════════════════[/bold cyan]")
    console.print("[bold cyan]  Compiling Final Report[/bold cyan]")
    console.print("[bold cyan]═══════════════════════════════════════[/bold cyan]\n")
    
    with console.status("[bold green]Synthesizing findings..."):
        system = """You are a senior research analyst creating a professional research report. 
Your report should demonstrate:
- Clear synthesis of findings from multiple sources
- Critical evaluation of evidence quality
- Acknowledgment of uncertainties and limitations
- Well-organized narrative flow
- Proper source attribution

The report should be accessible to educated non-experts while maintaining analytical rigor."""
        user = f"""Research Data from Multiple Rounds:
{json.dumps(all_rounds)[:35000]}

Create a comprehensive Markdown research report with this structure:

# [Topic Title]

## Executive Summary
- 3-4 key findings (most important insights)
- 1-2 sentences on methodology
- Brief note on limitations

## Introduction
- Context and background
- Why this topic matters
- Scope of this research

## Main Findings
[Organize into 3-5 thematic sections, each with:]
- Clear section heading
- Narrative explanation of findings
- Supporting evidence with [source citations]
- Any notable contradictions or debates

## Key Insights & Analysis
- Patterns across findings
- Implications and significance
- Connections between different aspects
- What surprised you or stands out

## Limitations & Uncertainties
- Information gaps
- Conflicting evidence
- Areas needing further research
- Confidence levels for major claims

## Sources
[Organized, numbered list with URLs]

## Conclusion
- Summary of most important takeaways
- Future outlook if relevant

---

Important guidelines:
- Use [1], [2], etc. for inline citations
- Flag low-confidence claims as "preliminary" or "according to limited sources"
- Present multiple perspectives when sources conflict
- Write in clear, engaging prose
- Aim for 1500-2500 words total"""
        md = call_gemini_text(cfg.model_t3, system, user)
    
    console.print("[bold green]✓ Report compilation complete[/bold green]")
    return md


def should_extend(cfg: SessionConfig, all_rounds: List[Dict[str, Any]]) -> bool:
    system = """You are a research quality evaluator assessing whether additional research rounds would provide meaningful value.

Evaluate based on:
- Coverage: Are major aspects of the topic well-explored?
- Depth: Is information superficial or substantive?
- Gaps: Are there critical unanswered questions?
- Contradictions: Are there unresolved conflicts that need investigation?
- Diminishing returns: Would another round likely yield significant new insights?

Return JSON:
{
  "extend": true/false,
  "confidence": 0-100,
  "reason": "2-3 sentence explanation",
  "coverage_score": 0-100,
  "specific_gaps": ["gap 1", "gap 2"] or []
}"""
    user = f"""Current Research State:
- Rounds completed: {len(all_rounds)}
- Maximum allowed: {cfg.max_depth}
- Research data: {json.dumps(all_rounds)[:12000]}

Assess whether another research round would meaningfully improve the report quality. 
Consider if we have enough information for a comprehensive report or if critical gaps remain."""
    res = call_gemini_json(cfg.model_t3, system, user)
    if isinstance(res, dict):
        return bool(res.get("extend", False))
    return False


def run_round(cfg: SessionConfig, round_idx: int, questions: List[str]) -> Dict[str, Any]:
    log_to_file(cfg, f"Starting round {round_idx}.")
    console.print(f"\n[bold blue]{'━' * 60}[/bold blue]")
    console.print(f"[bold blue]  Round {round_idx} - Deep Research[/bold blue]")
    console.print(f"[bold blue]{'━' * 60}[/bold blue]\n")
    
    round_dir = os.path.join(cfg.session_dir, f"round_{round_idx}")
    ensure_dir(round_dir)
    round_data: Dict[str, Any] = {"round": round_idx, "questions": questions, "items": []}
    
    # Search phase
    log_to_file(cfg, "Starting search phase.")
    question_to_urls: Dict[str, List[str]] = {}
    all_urls_in_round: List[str] = []
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        TextColumn("[progress.percentage]{task.percentage:>3.0f}%"),
        console=console
    ) as progress:
        task = progress.add_task("[cyan]Searching for sources...", total=len(questions))
        
        for q in questions:
            urls = search_for_question(q, cfg.top_k_per_round)
            if round_idx == 1 and cfg.reddit_min_first_round > 0:
                urls = enforce_reddit_min(urls, cfg.reddit_min_first_round)
            
            # Store the URLs for this specific question
            urls_for_q = normalize_and_dedupe_urls(urls[:cfg.top_k_per_round])
            question_to_urls[q] = urls_for_q
            all_urls_in_round.extend(urls_for_q)
            progress.update(task, advance=1)

    # Get a single list of unique URLs to scrape for the entire round
    unique_urls_to_scrape = normalize_and_dedupe_urls(all_urls_in_round)
    log_to_file(cfg, f"Search phase complete. Found {len(unique_urls_to_scrape)} unique URLs across {len(questions)} questions.")
    console.print(f"[green]✓ Found {len(unique_urls_to_scrape)} unique URLs to process[/green]")
    json_dump(os.path.join(round_dir, "search_results.json"), question_to_urls)
    
    # Scrape phase
    log_to_file(cfg, "Starting scrape phase.")
    all_scraped_docs = scrape_urls(unique_urls_to_scrape)
    # Create a quick lookup map from URL to its scraped content
    scraped_docs_map = {doc['url']: doc for doc in all_scraped_docs if doc.get('url')}
    log_to_file(cfg, f"Scrape phase complete. Scraped {len(all_scraped_docs)} URLs.")
    jsonl_dump(os.path.join(round_dir, "scraped.jsonl"), all_scraped_docs)
    
    # Summarization phase
    log_to_file(cfg, "Starting summarization phase.")
    console.print(f"\n[cyan]Summarizing content for {len(questions)} questions...[/cyan]")
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        TextColumn("[progress.percentage]{task.percentage:>3.0f}%"),
        console=console
    ) as progress:
        task = progress.add_task("[cyan]Processing summaries...", total=len(questions))
        
        with ThreadPoolExecutor(max_workers=min(4, len(questions) or 1)) as executor:
            future_to_question = {}
            for q in questions:
                # Get the URLs specifically for this question
                urls_for_q = question_to_urls.get(q, [])
                # Get the corresponding scraped documents from the map
                docs_for_q = [scraped_docs_map[url] for url in urls_for_q if url in scraped_docs_map]
                
                # Submit the task with only the relevant documents
                future = executor.submit(summarize_docs, cfg, q, docs_for_q)
                future_to_question[future] = q

            for future in as_completed(future_to_question):
                q = future_to_question[future]
                try:
                    summary = future.result()
                except Exception as e:
                    console.print(f"[bold red]Error summarizing '{q}': {e}[/bold red]")
                    summary = {"short_summary": "An unexpected error occurred during summarization.", "long_summary": f"Error: {str(e)}", "sources": []}
                round_data["items"].append({"question": q, "summary": summary})
                progress.update(task, advance=1)
    
    log_to_file(cfg, "Summarization phase complete.")
    console.print(f"[bold green]✓ Round {round_idx} complete[/bold green]\n")
    log_to_file(cfg, "Saving round.json.")
    json_dump(os.path.join(round_dir, "round.json"), round_data)
    log_to_file(cfg, "round.json saved.")
    return round_data


# ============= MAIN =============

def main():
    parser = argparse.ArgumentParser(description="Deep Research Agent (Python + C++)")
    parser.add_argument("--topic", type=str, required=True, help="Research topic")
    parser.add_argument("--preferences", type=str, default="", help="Research preferences")
    parser.add_argument("--depth", type=int, default=2, help="Max number of rounds")
    parser.add_argument("--top_k", type=int, default=8, help="URLs per round (pre-dedup)")
    parser.add_argument("--docs_per_q", type=int, default=5, help="Max docs summarized per question")
    parser.add_argument("--reddit_min", type=int, default=1, help="Minimum reddit links in first round")
    parser.add_argument("--no_cleanup", action="store_true", help="Do not delete temp files")
    args = parser.parse_args()
    
    # Try building C++ extension if not present
    if dresearch_cpp is None:
        try_build_cpp_extension()
    
    cfg = init_session(args.topic, args.preferences, args.depth, args.top_k, 
                      args.docs_per_q, args.reddit_min)
    log_to_file(cfg, "main() started.")
    
    all_rounds: List[Dict[str, Any]] = []
    
    # Round 1
    questions = generate_initial_questions(cfg)
    r1 = run_round(cfg, 1, questions)
    all_rounds.append(r1)
    
    # Subsequent rounds
    for ridx in range(2, cfg.max_depth + 1):
        followups = reflect_new_questions(cfg, all_rounds[-1])
        if not followups:
            break
        rn = run_round(cfg, ridx, followups)
        all_rounds.append(rn)
    
    # Optional extension
    if len(all_rounds) >= cfg.max_depth and should_extend(cfg, all_rounds):
        if len(all_rounds) < cfg.max_depth + 1:
            followups = reflect_new_questions(cfg, all_rounds[-1])
            if followups:
                rn = run_round(cfg, len(all_rounds) + 1, followups)
                all_rounds.append(rn)
    
    # Final compilation
    log_to_file(cfg, "All rounds complete. Starting final compilation.")
    final_md = final_compile(cfg, all_rounds)
    log_to_file(cfg, "Final compilation complete.")
    out_path = os.path.join(cfg.session_dir, "final_report.md")
    log_to_file(cfg, "Saving final_report.md.")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(final_md)
    log_to_file(cfg, "final_report.md saved.")
    
    console.print(Panel.fit(
        f"[bold green]Research Complete![/bold green]\n"
        f"Report saved to: [cyan]{out_path}[/cyan]",
        title="✓ Success",
        border_style="green"
    ))
    
    print("\n" + final_md)
    
    # Optional cleanup
    if not args.no_cleanup:
        # Keep session artifacts by default
        pass


if __name__ == "__main__":
    main()