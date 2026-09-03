"""
LLM Client for the Deep Research Agent v2.

This module provides a unified interface for calling the Gemini API
with retry logic, error handling, and rate limit management.
"""

import time
from typing import Any, Dict, Optional
import google.generativeai as genai

from utils import safe_json_parse


# Global client instance
_client = None


def configure_gemini(api_key: str) -> None:
    """
    Configure the Gemini API client.
    
    Args:
        api_key: Gemini API key
    """
    global _client
    genai.configure(api_key=api_key)
    _client = genai


def handle_rate_limits(exception: Exception) -> bool:
    """
    Check if exception is a rate limit error.
    
    Args:
        exception: Exception to check
        
    Returns:
        True if rate limit error, False otherwise
    """
    error_msg = str(exception).lower()
    return "429" in error_msg or "quota" in error_msg or "rate limit" in error_msg


def retry_with_backoff(max_retries: int = 3):
    """
    Decorator for retry logic with exponential backoff.
    
    Args:
        max_retries: Maximum number of retries
        
    Returns:
        Decorated function with retry logic
    """
    def decorator(func):
        def wrapper(*args, **kwargs):
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    if attempt < max_retries - 1:
                        from logger import get_logger
                        logger = get_logger("llm_client")
                        if handle_rate_limits(e):
                            wait_time = (2 ** attempt) * 2
                            logger.warning(f"Rate limit hit. Waiting {wait_time}s before retry...")
                            time.sleep(wait_time)
                        else:
                            wait_time = 2 ** attempt
                            logger.warning(f"Transient error. Waiting {wait_time}s before retry...")
                            time.sleep(wait_time)
                    else:
                        raise
        return wrapper
    return decorator


def _call_gemini_json_impl(
    model: str,
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.7
) -> Dict[str, Any]:
    """
    Internal implementation of Gemini JSON API call.
    
    Args:
        model: Model name (with "models/" prefix)
        system_prompt: System instruction
        user_prompt: User prompt
        temperature: Sampling temperature
        
    Returns:
        Parsed JSON response as dictionary
    """
    if _client is None:
        raise RuntimeError("Gemini client not configured. Call configure_gemini() first.")
    
    # Create model instance
    model_instance = genai.GenerativeModel(
        model_name=model,
        system_instruction=system_prompt
    )
    
    # Generate response
    response = model_instance.generate_content(
        user_prompt,
        generation_config=genai.GenerationConfig(
            temperature=temperature,
            response_mime_type="application/json"
        )
    )
    
    # Parse JSON response
    result = safe_json_parse(response.text)
    
    if result:
        return result
    else:
        raise ValueError(f"Failed to parse JSON from response: {response.text[:200]}")


@retry_with_backoff(max_retries=3)
def call_gemini_json(
    model: str,
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.7
) -> Dict[str, Any]:
    """
    Call Gemini API and expect JSON response with automatic retry logic.
    
    Args:
        model: Model name (with "models/" prefix)
        system_prompt: System instruction
        user_prompt: User prompt
        temperature: Sampling temperature
        
    Returns:
        Parsed JSON response as dictionary
    """
    from logger import get_logger
    logger = get_logger("llm_client")
    try:
        return _call_gemini_json_impl(model, system_prompt, user_prompt, temperature)
    except Exception as e:
        logger.error(f"Error calling Gemini API (JSON): {str(e)}")
        return {"error": str(e)}


def _call_gemini_text_impl(
    model: str,
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.7
) -> str:
    """
    Internal implementation of Gemini text API call.
    
    Args:
        model: Model name (with "models/" prefix)
        system_prompt: System instruction
        user_prompt: User prompt
        temperature: Sampling temperature
        
    Returns:
        Text response
    """
    if _client is None:
        raise RuntimeError("Gemini client not configured. Call configure_gemini() first.")
    
    # Create model instance
    model_instance = genai.GenerativeModel(
        model_name=model,
        system_instruction=system_prompt
    )
    
    # Generate response
    response = model_instance.generate_content(
        user_prompt,
        generation_config=genai.GenerationConfig(
            temperature=temperature
        )
    )
    
    return response.text


@retry_with_backoff(max_retries=3)
def call_gemini_text(
    model: str,
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.7
) -> str:
    """
    Call Gemini API and expect text response with automatic retry logic.
    
    Args:
        model: Model name (with "models/" prefix)
        system_prompt: System instruction
        user_prompt: User prompt
        temperature: Sampling temperature
        
    Returns:
        Text response
    """
    from logger import get_logger
    logger = get_logger("llm_client")
    try:
        return _call_gemini_text_impl(model, system_prompt, user_prompt, temperature)
    except Exception as e:
        logger.error(f"Error calling Gemini API (text): {str(e)}")
        return f"Error: {str(e)}"
