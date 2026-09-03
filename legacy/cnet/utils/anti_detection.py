"""Anti-detection utilities for Instagram scraping."""
import random
from config import (
    SCROLL_BASE_DELAY,
    SCROLL_STD_DEV,
    SCROLL_MIN_DELAY,
    SCROLL_MAX_DELAY
)


def human_random(
    base_delay=SCROLL_BASE_DELAY,
    std_dev=SCROLL_STD_DEV,
    min_delay=SCROLL_MIN_DELAY,
    max_delay=SCROLL_MAX_DELAY,
    outlier_chance=0.16,
    outlier_factor=2.4,
    recursion_limit=100
):
    """
    Returns a human-like delay in seconds.
    Uses recursive resampling instead of clamping.
    
    Args:
        base_delay: Base delay in milliseconds
        std_dev: Standard deviation in milliseconds
        min_delay: Minimum delay in milliseconds
        max_delay: Maximum delay in milliseconds
        outlier_chance: Probability of generating an outlier
        outlier_factor: Factor to multiply std_dev for outliers
        recursion_limit: Maximum recursion depth
        
    Returns:
        float: Delay in seconds
    """
    if recursion_limit <= 0:
        return round(base_delay / 1000, 3)

    delay = random.gauss(base_delay, std_dev)

    if random.random() < outlier_chance:
        if random.random() < 0.5:
            delay += outlier_factor * std_dev
        else:
            delay -= outlier_factor * std_dev

    if delay < min_delay or delay > max_delay:
        return human_random(
            base_delay=base_delay,
            std_dev=std_dev,
            min_delay=min_delay,
            max_delay=max_delay,
            outlier_chance=outlier_chance,
            outlier_factor=outlier_factor,
            recursion_limit=recursion_limit - 1,
        )

    return round(delay / 1000, 3)


def get_random_viewport():
    """Get a random viewport size to avoid fingerprinting."""
    viewports = [
        {"width": 1920, "height": 1080},
        {"width": 1366, "height": 768},
        {"width": 1536, "height": 864},
        {"width": 1440, "height": 900},
        {"width": 1280, "height": 720},
    ]
    return random.choice(viewports)
