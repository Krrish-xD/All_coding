# Gemini Code Assistant Context

This file provides context for the Gemini Code Assistant to understand the "Deep Research Agent" project.

## Project Overview

This project is a "Deep Research Agent" that automates the process of researching a given topic. It's a Python application that uses the Gemini API for language understanding and generation, and DuckDuckGo for search. It also includes a C++ extension to accelerate web scraping and data cleaning.

The agent works in a multi-round process:
1.  It starts with a high-level topic and generates a set of initial research questions.
2.  For each question, it searches for relevant URLs.
3.  It scrapes the content of these URLs, using a C++ extension for performance.
4.  It uses a Gemini model to summarize the scraped content.
5.  It then reflects on the summaries and generates follow-up questions for the next round of research.
6.  Finally, it compiles all the gathered information into a comprehensive Markdown report.

## Building and Running

### Dependencies

The project requires Python 3 and the dependencies listed in `requirements.txt`. To install them, run:

```bash
pip install -r requirements.txt
```

### Building the C++ Extension

The C++ extension is built using `setuptools`. The `deep_research.py` script will attempt to build the extension automatically if it's not already built. To build it manually, run:

```bash
python setup_ext.py build_ext --inplace
```

### Running the Agent

The main script is `deep_research.py`. It requires a `GEMINI_API_KEY` to be set as an environment variable or in a `config.py` file.

To run the agent, use the following command:

```bash
python deep_research.py --topic "Your research topic"
```

You can customize the research process with the following command-line arguments:

*   `--preferences`: Specify any preferences for the research.
*   `--depth`: The number of research rounds (default: 2).
*   `--top_k`: The number of URLs to consider per question (default: 8).
*   `--docs_per_q`: The maximum number of documents to summarize per question (default: 5).
*   `--reddit_min`: The minimum number of Reddit links in the first round (default: 1).

## Development Conventions

*   **C++ Extension:** The project uses a C++ extension for performance-critical tasks like web scraping and text cleaning. The extension is built with `pybind11`.
*   **Python Fallbacks:** For every function in the C++ extension, there is a pure Python fallback implementation. This ensures the script can run even if the C++ extension is not available.
*   **Configuration:** The project uses environment variables and a `config.py` file for configuration. This allows for easy configuration of the Gemini API key and models.
*   **Modular Design:** The code is well-structured, with different modules for different functionalities (e.g., `scraper.cpp`, `textutils.cpp`, `urltools.cpp`).
*   **Error Handling:** The code includes error handling and retries for network requests and API calls.
