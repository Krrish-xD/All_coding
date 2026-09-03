"""Instagram authentication handler with session persistence."""
import json
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright, Page, BrowserContext
from playwright_stealth import stealth_async
from utils.logger import get_logger
from utils.anti_detection import get_random_viewport
from config import (
    SESSION_STORAGE_PATH,
    INSTAGRAM_BASE_URL,
    BROWSER_TIMEOUT,
    HEADLESS
)

logger = get_logger(__name__)


class InstagramAuth:
    """Handle Instagram authentication and session management."""
    
    def __init__(self):
        self.session_file = SESSION_STORAGE_PATH
        self.context: BrowserContext = None
        self.page: Page = None
        
    async def load_session(self, context: BrowserContext) -> bool:
        """
        Load saved session cookies if they exist.
        
        Args:
            context: Playwright browser context
            
        Returns:
            bool: True if session loaded successfully, False otherwise
        """
        if not self.session_file.exists():
            logger.info("No saved session found")
            return False
            
        try:
            with open(self.session_file, 'r') as f:
                session_data = json.load(f)
                
            # Load cookies
            if 'cookies' in session_data:
                await context.add_cookies(session_data['cookies'])
                logger.info("Loaded saved session cookies")
                return True
                
        except Exception as e:
            logger.error(f"Failed to load session: {e}")
            return False
            
        return False
    
    async def save_session(self, context: BrowserContext):
        """
        Save current session cookies for reuse.
        
        Args:
            context: Playwright browser context
        """
        try:
            cookies = await context.cookies()
            session_data = {
                'cookies': cookies
            }
            
            # Ensure directory exists
            self.session_file.parent.mkdir(parents=True, exist_ok=True)
            
            with open(self.session_file, 'w') as f:
                json.dump(session_data, f, indent=2)
                
            logger.info(f"Session saved to {self.session_file}")
            
        except Exception as e:
            logger.error(f"Failed to save session: {e}")
    
    async def is_logged_in(self, page: Page) -> bool:
        """
        Check if currently logged into Instagram.
        
        Args:
            page: Playwright page
            
        Returns:
            bool: True if logged in, False otherwise
        """
        try:
            # Navigate to Instagram
            await page.goto(INSTAGRAM_BASE_URL, wait_until="networkidle", timeout=BROWSER_TIMEOUT)
            await asyncio.sleep(2)
            
            # Check for login indicators
            # If we see the login form, we're not logged in
            login_form = await page.query_selector('input[name="username"]')
            if login_form:
                logger.info("Not logged in - login form detected")
                return False
                
            # Check for logged-in indicators (profile icon, home feed, etc.)
            # Instagram's main navigation appears when logged in
            nav_home = await page.query_selector('a[href="/"]')
            if nav_home:
                logger.info("Already logged in - navigation detected")
                return True
                
            return False
            
        except Exception as e:
            logger.error(f"Error checking login status: {e}")
            return False
    
    async def manual_login(self, page: Page):
        """
        Prompt user to manually log in to Instagram.
        This is a one-time process - session will be saved for reuse.
        
        Args:
            page: Playwright page
        """
        logger.info("=" * 60)
        logger.info("MANUAL LOGIN REQUIRED")
        logger.info("=" * 60)
        logger.info("Please log in to Instagram in the browser window.")
        logger.info("Complete any 2FA or verification steps if prompted.")
        logger.info("Once you see your Instagram feed, the session will be saved.")
        logger.info("Press Enter here when you've successfully logged in...")
        logger.info("=" * 60)
        
        # Navigate to Instagram login page
        await page.goto(f"{INSTAGRAM_BASE_URL}/accounts/login/", wait_until="networkidle")
        
        # Wait for user to manually log in
        # We'll check periodically if they're logged in
        input("Press Enter after you've logged in successfully...")
        
        # Verify login was successful
        if await self.is_logged_in(page):
            logger.success("Login successful! Session will be saved.")
            return True
        else:
            logger.error("Login verification failed. Please try again.")
            return False
    
    async def authenticate(self, context: BrowserContext, page: Page) -> bool:
        """
        Main authentication flow - load session or prompt for manual login.
        
        Args:
            context: Playwright browser context
            page: Playwright page
            
        Returns:
            bool: True if authenticated successfully
        """
        self.context = context
        self.page = page
        
        # Try to load existing session
        session_loaded = await self.load_session(context)
        
        if session_loaded:
            # Verify the session is still valid
            if await self.is_logged_in(page):
                logger.success("Authenticated using saved session")
                return True
            else:
                logger.warning("Saved session expired or invalid")
        
        # Need manual login
        logger.info("Manual login required (one-time setup)")
        success = await self.manual_login(page)
        
        if success:
            # Save the session for future use
            await self.save_session(context)
            return True
            
        return False
