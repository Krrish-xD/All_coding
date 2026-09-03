"""Main entry point for Instagram Reels scraper."""
import asyncio
from playwright.async_api import async_playwright
from playwright_stealth import stealth_async
from utils.logger import get_logger
from utils.anti_detection import get_random_viewport
from auth.instagram_auth import InstagramAuth
from scraper.reels_scraper import ReelsScraper
from models.database import init_database
from config import HEADLESS, MAX_REELS_PER_SESSION

logger = get_logger(__name__)


async def main():
    """Main execution flow."""
    logger.info("=" * 60)
    logger.info("Instagram Reels Scraper - Starting")
    logger.info("=" * 60)
    
    # Initialize database
    logger.info("Initializing database...")
    init_database()
    logger.success("Database initialized")
    
    # Start Playwright
    async with async_playwright() as p:
        # Launch browser
        logger.info(f"Launching browser (headless={HEADLESS})...")
        browser = await p.chromium.launch(
            headless=HEADLESS,
            args=[
                '--disable-blink-features=AutomationControlled',
                '--disable-dev-shm-usage',
                '--no-sandbox'
            ]
        )
        
        # Create context with random viewport
        viewport = get_random_viewport()
        logger.info(f"Using viewport: {viewport['width']}x{viewport['height']}")
        
        context = await browser.new_context(
            viewport=viewport,
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        )
        
        # Create page
        page = await context.new_page()
        
        # Apply stealth mode
        await stealth_async(page)
        logger.info("Stealth mode applied")
        
        # Authenticate
        auth = InstagramAuth()
        authenticated = await auth.authenticate(context, page)
        
        if not authenticated:
            logger.error("Authentication failed. Exiting.")
            await browser.close()
            return
        
        logger.success("Authentication successful!")
        
        # Start scraping
        scraper = ReelsScraper(page)
        
        try:
            await scraper.scrape_reels(max_reels=MAX_REELS_PER_SESSION)
        except KeyboardInterrupt:
            logger.warning("Scraping interrupted by user")
        except Exception as e:
            logger.error(f"Error during scraping: {e}")
        finally:
            # Save session before closing
            await auth.save_session(context)
            await browser.close()
            logger.info("Browser closed")
    
    logger.info("=" * 60)
    logger.info("Instagram Reels Scraper - Complete")
    logger.info("=" * 60)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.warning("\nScraper stopped by user")
    except Exception as e:
        logger.error(f"Fatal error: {e}")
