# Critical Issues Found & Fixes Needed

**Date:** November 13, 2025  
**Session Analyzed:** 2025-11-13T15-12-05_5c749bb7

---

## Issue 1: Search Returns Irrelevant Results ❌ CRITICAL

### Problem
The DuckDuckGo search is returning completely irrelevant Chinese Q&A sites (Baidu Zhidao, Zhihu) and random websites instead of relevant English sources about apple farming economics.

### Evidence
From `search_results.json`:
- Question about "apple orchard investment costs" returned:
  - `zhidao.baidu.com` (Chinese Q&A site)
  - `zhihu.com` (Chinese Q&A site)  
  - Random sites like `current.com` (financial app)
  - `mayoclinic.org` (medical site)

### Root Cause
The v2 `search.py` module uses `duckduckgo_search` library but may not be:
1. Properly filtering results by language
2. Using the correct search parameters
3. Handling the API correctly

### Fix Needed
1. Add language filtering (`region='us-en'` or similar)
2. Improve query formulation
3. Add result validation to filter out non-English sites
4. Consider using different search backends or APIs

---

## Issue 2: Excessive Logging in Terminal 🔴 HIGH PRIORITY

### Problem
The terminal is flooded with DEBUG logs from:
- `urllib3.connectionpool` - HTTP connection details
- `cookie_store.cookie_store` - Cookie management
- `rquest.util.client` - Request client internals
- `duckduckgo_search.DDGS` - Search library internals
- `sentence_transformers` - Model loading details

### Evidence
From `session.log` - 1965 lines of logs, mostly DEBUG level noise.

### User Feedback
> "i like the logging but printing all the logs in the terminal output is not what i like to see
> id just like to see live updates on the terminal and the logs stored elsewhere"

### Fix Needed
1. Set console logging to WARNING level (only show warnings/errors)
2. Keep file logging at DEBUG level for troubleshooting
3. Add clean progress indicators like v1 (using rich library)
4. Suppress third-party library DEBUG logs

---

## Issue 3: Poor Terminal UX 🟡 MEDIUM PRIORITY

### Problem
Current terminal output is verbose and technical. User prefers v1's clean output style.

### User Feedback
> "i really liked how v1_prototype printed stuff in the terminal so maybe you can take that as a reference point and improve on it somehow"

### V1 Style (Good Example)
- Clean section headers with rich panels
- Progress bars for scraping
- Minimal text, maximum information
- Color-coded status indicators

### V2 Current Style (Needs Improvement)
- Too many INFO logs
- No visual progress indicators
- Technical log format in console
- Cluttered output

### Fix Needed
1. Use `rich` library for clean console output
2. Add progress bars for long operations
3. Show only essential information in terminal
4. Keep detailed logs in file only

---

## Recommended Fixes

### Fix 1: Improve Search Module

```python
# v2/search.py

def search_with_expansion(
    question: str,
    topic: str,
    max_results: int = 10
) -> List[SearchResult]:
    """Execute multi-query search with proper filtering."""
    queries = expand_query(question, topic)
    all_results = []
    
    for query in queries:
        try:
            with DDGS() as ddgs:
                # Add region parameter for English results
                results = list(ddgs.text(
                    query, 
                    max_results=max_results,
                    region='wt-wt',  # Worldwide, no region bias
                    safesearch='moderate'
                ))
                
                for result in results:
                    url = result.get('href', '')
                    
                    # Filter out non-English sites
                    if should_skip_url(url):
                        continue
                    
                    search_result = SearchResult(
                        title=result.get('title', ''),
                        snippet=result.get('body', ''),
                        url=url
                    )
                    all_results.append(search_result)
        
        except Exception as e:
            logger.warning(f"Search error for query '{query}': {e}")
            continue
    
    return all_results


def should_skip_url(url: str) -> bool:
    """Filter out irrelevant domains."""
    skip_domains = [
        'zhidao.baidu.com',
        'zhihu.com',
        'baidu.com',
        'yahoo.co.jp',
        'chiebukuro.yahoo.co.jp'
    ]
    
    parsed = urlparse(url.lower())
    domain = parsed.netloc
    
    return any(skip in domain for skip in skip_domains)
```

### Fix 2: Clean Up Logging

```python
# v2/logger.py - Update setup_logging()

def setup_logging(
    session_dir: Optional[str] = None,
    console_level: int = logging.WARNING,  # Changed from INFO
    file_level: int = logging.DEBUG,
    log_to_file: bool = True
) -> logging.Logger:
    """Configure logging with clean console output."""
    
    # ... existing code ...
    
    # Suppress noisy third-party loggers
    logging.getLogger('urllib3').setLevel(logging.WARNING)
    logging.getLogger('cookie_store').setLevel(logging.WARNING)
    logging.getLogger('rquest').setLevel(logging.WARNING)
    logging.getLogger('primp').setLevel(logging.WARNING)
    logging.getLogger('duckduckgo_search').setLevel(logging.WARNING)
    logging.getLogger('sentence_transformers').setLevel(logging.INFO)
    
    return logger
```

### Fix 3: Add Rich Console Output

```python
# v2/main.py - Use rich for clean output

from rich.console import Console
from rich.progress import Progress, SpinnerColumn, BarColumn, TextColumn
from rich.panel import Panel
from rich.table import Table

console = Console()

def run_research_session(config: ResearchConfig) -> None:
    """Orchestrate research with clean console output."""
    
    # Show clean header
    console.print(Panel.fit(
        f"[bold cyan]Deep Research Agent v2[/bold cyan]\n"
        f"Topic: {config.topic}\n"
        f"Depth: {config.max_depth} rounds",
        border_style="cyan"
    ))
    
    # Initialize with minimal output
    console.print("🔧 Initializing cache system...")
    initialize_cache()
    
    console.print("🔑 Configuring Gemini API...")
    configure_gemini(config.gemini_api_key)
    
    # Generate questions with spinner
    with console.status("[bold green]Generating research questions..."):
        questions = generate_initial_questions(config.topic, config.preferences, config)
    
    console.print(f"✓ Generated {len(questions)} questions\n")
    
    # Show questions in table
    table = Table(show_header=True, header_style="bold magenta")
    table.add_column("#", style="dim", width=3)
    table.add_column("Question")
    
    for i, q in enumerate(questions, 1):
        table.add_row(str(i), q)
    
    console.print(table)
    console.print()
    
    # ... rest of implementation with clean output ...
```

---

## Priority Order

1. **CRITICAL**: Fix search to return relevant English results
2. **HIGH**: Reduce console logging noise
3. **MEDIUM**: Improve terminal UX with rich library

---

## Testing Plan

1. Test search with various queries, verify English results
2. Run research session, verify clean console output
3. Check session.log has detailed DEBUG logs
4. Compare terminal output to v1 for UX improvements

