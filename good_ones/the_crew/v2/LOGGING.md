# Structured Logging in Deep Research Agent v2

## Overview

The v2 codebase uses Python's built-in `logging` module with custom formatters for structured, color-coded logging. All `print()` statements have been replaced with proper logging calls.

---

## Features

### 1. Color-Coded Console Output
- **DEBUG**: Gray - Detailed diagnostic information
- **INFO**: Cyan - General informational messages
- **WARNING**: Yellow - Warning messages (non-critical issues)
- **ERROR**: Red - Error messages
- **CRITICAL**: Red - Critical errors

### 2. Dual Output
- **Console**: Color-coded, INFO level and above
- **File**: Detailed, DEBUG level and above, saved to `session.log`

### 3. Structured Format
```
[TIMESTAMP] | LEVEL | MODULE | MESSAGE
```

Example:
```
2025-11-13 14:30:15 | INFO     | main                 | Session initialized: abc123
2025-11-13 14:30:16 | DEBUG    | cache                | Loading embedding model...
2025-11-13 14:30:20 | WARNING  | search               | Search error for query 'test': timeout
2025-11-13 14:30:25 | ERROR    | llm_client           | Error calling Gemini API: rate limit
```

---

## Usage

### Basic Logging

```python
from logger import get_logger

logger = get_logger(__name__)

logger.debug("Detailed diagnostic information")
logger.info("General information")
logger.warning("Warning message")
logger.error("Error message")
logger.critical("Critical error")
```

### Logging with Context

```python
from logger import log_error_with_context

try:
    risky_operation()
except Exception as e:
    log_error_with_context(
        logger, 
        e, 
        "Failed to process document",
        include_traceback=True
    )
```

### Section Headers

```python
from logger import log_section, log_subsection

log_section(logger, "Research Round 1")
# Outputs:
# ============================================================
# Research Round 1
# ============================================================

log_subsection(logger, "Search Phase")
# Outputs:
# ----------------------------------------
# Search Phase
# ----------------------------------------
```

### Metrics Logging

```python
from logger import log_metrics

metrics = {
    "success_rate": 0.85,
    "total_documents": 1500,
    "cache_hits": 42
}

log_metrics(logger, metrics)
# Outputs:
#   success_rate: 85.0%
#   total_documents: 1,500
#   cache_hits: 42
```

### Progress Logging

```python
from logger import log_progress

log_progress(logger, current=5, total=10, item="URLs")
# Outputs:
# Progress: 5/10 URLs (50.0%)
```

---

## Configuration

### Setup Logging

```python
from logger import setup_logging

# Basic setup (console only)
setup_logging()

# With file output
setup_logging(
    session_dir="./logs",
    console_level=logging.INFO,
    file_level=logging.DEBUG,
    log_to_file=True
)
```

### Log Levels

| Level | Value | When to Use |
|-------|-------|-------------|
| DEBUG | 10 | Detailed diagnostic information for debugging |
| INFO | 20 | General informational messages about progress |
| WARNING | 30 | Non-critical issues that should be noted |
| ERROR | 40 | Errors that affect functionality |
| CRITICAL | 50 | Critical errors that may cause failure |

---

## Module-Specific Loggers

Each module has its own logger for better traceability:

```python
# In main.py
logger = get_logger("main")

# In cache.py
logger = get_logger("cache")

# In search.py
logger = get_logger("search")

# In scraper.py
logger = get_logger("scraper")

# In summarizer.py
logger = get_logger("summarizer")

# In llm_client.py
logger = get_logger("llm_client")

# In report_compiler.py
logger = get_logger("report_compiler")

# In session.py
logger = get_logger("session")
```

---

## Log File Location

Logs are saved to: `{session_dir}/session.log`

Example:
```
v2/deep_research_sessions/2025-11-13T14-30-15_abc123/session.log
```

---

## Best Practices

### 1. Use Appropriate Log Levels

```python
# ✅ Good
logger.debug(f"Processing document: {url}")
logger.info("Search completed successfully")
logger.warning("Cache miss, fetching from API")
logger.error(f"Failed to scrape URL: {url}")

# ❌ Bad
logger.info(f"Variable x = {x}")  # Use DEBUG for this
logger.error("Search completed")  # Use INFO for this
```

### 2. Include Context

```python
# ✅ Good
logger.error(f"Failed to parse JSON from {url}: {error}")

# ❌ Bad
logger.error("Parse error")
```

### 3. Use Structured Logging Helpers

```python
# ✅ Good
log_metrics(logger, {"success": 10, "failed": 2})

# ❌ Bad
logger.info(f"Success: 10, Failed: 2")
```

### 4. Don't Log Sensitive Information

```python
# ✅ Good
logger.info("API key configured")

# ❌ Bad
logger.info(f"API key: {api_key}")
```

### 5. Use Exception Logging

```python
# ✅ Good
try:
    risky_operation()
except Exception as e:
    logger.error(f"Operation failed: {e}", exc_info=True)

# ❌ Bad
try:
    risky_operation()
except Exception as e:
    logger.error(str(e))
```

---

## Migration from print()

All `print()` statements have been replaced:

| Old | New |
|-----|-----|
| `print("Starting...")` | `logger.info("Starting...")` |
| `print(f"Error: {e}")` | `logger.error(f"Error: {e}")` |
| `print("="*60)` | `log_section(logger, "Title")` |
| `print(f"Progress: {i}/{n}")` | `log_progress(logger, i, n)` |

---

## Debugging

### Enable DEBUG Level

```python
# In code
setup_logging(console_level=logging.DEBUG)

# Or set environment variable
export LOG_LEVEL=DEBUG
```

### View Only Specific Module

```python
import logging

# Set root to WARNING
logging.getLogger().setLevel(logging.WARNING)

# Set specific module to DEBUG
logging.getLogger("cache").setLevel(logging.DEBUG)
```

### Disable Console Colors

If colors cause issues in your terminal:

```python
# Modify logger.py
# Comment out ColoredFormatter and use standard Formatter
```

---

## Performance Considerations

- Logging has minimal performance impact
- DEBUG level logs are only written to file, not console
- String formatting is lazy (only evaluated if logged)
- File I/O is buffered

---

## Examples from Codebase

### main.py
```python
from logger import setup_logging, get_logger, log_section, log_metrics

# Setup at start
setup_logging(session_dir=session_dir, console_level=logging.INFO)
logger = get_logger("main")

# Section headers
log_section(logger, "Deep Research Agent v2")

# Info messages
logger.info(f"Topic: {config.topic}")
logger.info(f"Session directory: {session_dir}")

# Metrics
log_metrics(logger, cache_stats, prefix="Cache: ")
```

### cache.py
```python
from logger import get_logger

logger = get_logger("cache")

logger.info("Loading embedding model...")
logger.info("Embedding model loaded successfully")
```

### llm_client.py
```python
from logger import get_logger

logger = get_logger("llm_client")

logger.warning(f"Rate limit hit. Waiting {wait_time}s before retry...")
logger.error(f"Error calling Gemini API: {str(e)}")
```

### summarizer.py
```python
from logger import get_logger

logger = get_logger("summarizer")

logger.info(f"  ✓ Cache hit for {len(cached)}/{len(docs)} documents")
logger.info(f"  → Calling gemini CLI for {len(uncached)} uncached documents...")
logger.warning(f"  Failed to cache summary for {url}: {e}")
logger.error(f"  CLI summarization timed out after 120 seconds")
```

---

## Troubleshooting

### Logs Not Appearing

1. Check log level: `setup_logging(console_level=logging.DEBUG)`
2. Verify logger name: `logger = get_logger(__name__)`
3. Check if logging is initialized: Call `setup_logging()` before any logging

### Colors Not Working

1. Check terminal supports ANSI colors
2. Try disabling colors (use standard Formatter)
3. Check if output is redirected (colors disabled for pipes)

### File Not Created

1. Verify session_dir exists and is writable
2. Check `log_to_file=True` in setup_logging()
3. Verify permissions on directory

---

## Future Enhancements

Potential improvements for logging:

1. **Rotating File Handler**: Prevent log files from growing too large
2. **JSON Logging**: Structured logs for parsing/analysis
3. **Remote Logging**: Send logs to centralized service
4. **Performance Metrics**: Track timing for operations
5. **Log Aggregation**: Combine logs from multiple sessions

---

## Summary

Structured logging provides:
- ✅ Better debugging with detailed file logs
- ✅ Clean console output with color coding
- ✅ Module-level traceability
- ✅ Consistent formatting
- ✅ Professional-grade logging practices

All modules now use proper logging instead of print statements, making the codebase more maintainable and production-ready.
