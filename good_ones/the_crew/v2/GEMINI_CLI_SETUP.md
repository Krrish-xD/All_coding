# Gemini CLI Integration Setup

This guide shows how to integrate Deep Research Agent v2 with the Gemini CLI as a custom command.

## Installation

### 1. Copy the TOML file

Copy the updated command definition to your Gemini CLI commands directory:

```bash
cp v2/deepresearch.toml ~/.gemini/commands/deepresearch.toml
```

### 2. Verify the paths in the TOML

The TOML file assumes your project is at `~/.gemini/the_crew/`. If it's elsewhere, edit the TOML file:

```bash
nano ~/.gemini/commands/deepresearch.toml
```

Update these paths:
- `~/.gemini/the_crew/venv/bin/activate` → your venv path
- `~/.gemini/the_crew/v2` → your v2 directory path

### 3. Ensure your venv has all dependencies

```bash
source ~/.gemini/the_crew/venv/bin/activate
cd ~/.gemini/the_crew/v2
pip install -r requirements.txt
deactivate
```

### 4. Test the command

```bash
gemini deepresearch
```

The Gemini CLI should now recognize the `deepresearch` command and guide you through the research process.

## Usage

### Interactive Mode

```bash
gemini deepresearch
```

The CLI will:
1. Ask you for a research topic (or infer from conversation)
2. Ask 3-4 clarifying questions about scope and preferences
3. Ask about run options (depth, URLs, etc.)
4. Execute the research
5. Return the final report

### Example Interaction

```
User: I want to research quantum computing applications

Gemini: 
1. Which specific application areas interest you most? (e.g., cryptography, drug discovery, optimization)
2. What depth of technical detail do you need? (high-level overview vs. deep technical analysis)
3. What time horizon? (recent developments, historical context, future outlook)
4. Would you like to tweak any default run options?
   - --depth (default: 2) - Number of research rounds
   - --top_k (default: 8) - URLs per round
   - --docs_per_q (default: 5) - Documents per question
   - --reddit_min (default: 1) - Reddit links in first round

[After answers, runs research and returns report]
```

## Key Differences from v1

### Command Changes

**v1:**
```bash
python deep_research.py --topic "..." --preferences '{{json}}' --no_cleanup
```

**v2:**
```bash
python main.py --topic "..." --preferences "{{text}}" --depth 2
```

### Changes:
- ✅ `--preferences` is now simple text (not JSON)
- ✅ Removed `--no_cleanup` flag (v2 manages sessions differently)
- ✅ Added semantic caching (automatic, no flag needed)
- ✅ Global cache at `v2/research_cache.db`
- ✅ Reports saved to `deep_research_sessions/[timestamp]_[id]/`

## Troubleshooting

### "Command not found: deepresearch"

Reload Gemini CLI or check the TOML file location:

```bash
ls ~/.gemini/commands/deepresearch.toml
```

### "Python script error"

Check paths in the TOML file and ensure:
1. Virtual environment exists and has dependencies
2. `v2/config.py` exists with your API key
3. You're in the correct directory

### "API key error"

Ensure `v2/config.py` has your Gemini API key:

```bash
cat v2/config.py | grep GEMINI_API_KEY
```

## Advanced Configuration

### Custom Model Selection

Edit `v2/config.py` to change models:

```python
MODEL_LIGHTWEIGHT = "models/gemini-2.0-flash-lite"  # For summaries
MODEL_MIDTIER = "models/gemini-2.5-flash"           # For questions
MODEL_PREMIUM = "models/gemini-2.5-pro"             # For final report
SUMMARISER = "gemini-2.5-flash-lite"                # For CLI
```

### Cache Management

View cache statistics:

```bash
sqlite3 v2/research_cache.db "SELECT COUNT(*) FROM summary_cache;"
```

Clear cache if needed:

```bash
rm v2/research_cache.db
```

The cache will be recreated on next run.

## Benefits of CLI Integration

1. **Conversational Interface**: Natural language interaction with the research agent
2. **Guided Setup**: Gemini asks clarifying questions automatically
3. **Smart Defaults**: Infers preferences from conversation context
4. **Seamless Execution**: Handles all command-line arguments automatically
5. **Report Delivery**: Returns formatted report directly in chat

Enjoy your enhanced research workflow! 🚀
