"""Instagram Reels scraper - main scraping logic."""
import asyncio
import re
from playwright.async_api import Page, BrowserContext
from playwright_stealth import stealth_async
from utils.logger import get_logger
from utils.anti_detection import human_random
from models.database import Reel, Comment, get_session
from config import INSTAGRAM_REELS_URL, MAX_REELS_PER_SESSION

logger = get_logger(__name__)


class ReelsScraper:
    """Main scraper for Instagram Reels."""
    
    def __init__(self, page: Page):
        self.page = page
        self.scraped_reels = []
        self.seen_reel_ids = set()
        
    async def navigate_to_reels(self):
        """Navigate to Instagram Reels feed."""
        logger.info(f"Navigating to {INSTAGRAM_REELS_URL}")
        await self.page.goto(INSTAGRAM_REELS_URL, wait_until="networkidle")
        await asyncio.sleep(3)  # Wait for initial load
        
    async def extract_reel_data(self) -> dict:
        """
        Extract data from the currently visible reel.
        
        Returns:
            dict: Reel data including caption, likes, shares, comments, etc.
        """
        try:
            reel_data = {}
            
            # Extract reel URL and ID
            current_url = self.page.url
            reel_data['reel_url'] = current_url
            
            # Extract reel ID from URL (format: /reel/REEL_ID/)
            reel_id_match = re.search(r'/reel/([^/]+)', current_url)
            if reel_id_match:
                reel_data['reel_id'] = reel_id_match.group(1)
            else:
                logger.warning(f"Could not extract reel ID from URL: {current_url}")
                return None
                
            # Skip if already scraped
            if reel_data['reel_id'] in self.seen_reel_ids:
                logger.debug(f"Skipping already seen reel: {reel_data['reel_id']}")
                return None
                
            logger.info(f"Extracting data for reel: {reel_data['reel_id']}")
            
            # Extract author username
            try:
                author_elem = await self.page.query_selector('header a[role="link"]')
                if author_elem:
                    reel_data['author_username'] = await author_elem.inner_text()
            except Exception as e:
                logger.warning(f"Could not extract author: {e}")
                reel_data['author_username'] = None
            
            # Extract caption
            try:
                # Caption is usually in a span with specific structure
                caption_elem = await self.page.query_selector('h1 + span, h1 ~ div span')
                if caption_elem:
                    reel_data['caption'] = await caption_elem.inner_text()
                else:
                    reel_data['caption'] = ""
            except Exception as e:
                logger.warning(f"Could not extract caption: {e}")
                reel_data['caption'] = ""
            
            # Extract engagement metrics (likes, comments, shares)
            # These are typically in button or span elements with specific aria-labels or text
            try:
                # Try to find likes count
                likes_elem = await self.page.query_selector('section button span[class*="x193iq5w"]')
                if likes_elem:
                    likes_text = await likes_elem.inner_text()
                    reel_data['likes_count'] = self._parse_count(likes_text)
                else:
                    reel_data['likes_count'] = 0
            except Exception as e:
                logger.warning(f"Could not extract likes: {e}")
                reel_data['likes_count'] = 0
            
            # Extract comments count
            try:
                # Comments button usually has specific text or aria-label
                comments_elems = await self.page.query_selector_all('section button span')
                for elem in comments_elems:
                    text = await elem.inner_text()
                    if 'comment' in text.lower() or text.isdigit():
                        reel_data['comments_count'] = self._parse_count(text)
                        break
                else:
                    reel_data['comments_count'] = 0
            except Exception as e:
                logger.warning(f"Could not extract comments count: {e}")
                reel_data['comments_count'] = 0
            
            # Views count
            try:
                views_elem = await self.page.query_selector('span:has-text("views")')
                if views_elem:
                    views_text = await views_elem.inner_text()
                    reel_data['views_count'] = self._parse_count(views_text)
                else:
                    reel_data['views_count'] = 0
            except Exception as e:
                logger.warning(f"Could not extract views: {e}")
                reel_data['views_count'] = 0
            
            # Shares - harder to get, often not directly visible
            reel_data['shares_count'] = 0  # Placeholder
            
            # Extract video URL (if accessible)
            try:
                video_elem = await self.page.query_selector('video')
                if video_elem:
                    reel_data['video_url'] = await video_elem.get_attribute('src')
                else:
                    reel_data['video_url'] = None
            except Exception as e:
                logger.warning(f"Could not extract video URL: {e}")
                reel_data['video_url'] = None
            
            # Extract thumbnail
            try:
                img_elem = await self.page.query_selector('video + img, img[alt*="Photo"]')
                if img_elem:
                    reel_data['thumbnail_url'] = await img_elem.get_attribute('src')
                else:
                    reel_data['thumbnail_url'] = None
            except Exception as e:
                logger.warning(f"Could not extract thumbnail: {e}")
                reel_data['thumbnail_url'] = None
            
            # Mark as seen
            self.seen_reel_ids.add(reel_data['reel_id'])
            
            logger.success(f"Extracted reel data: {reel_data['reel_id']} by @{reel_data['author_username']}")
            return reel_data
            
        except Exception as e:
            logger.error(f"Error extracting reel data: {e}")
            return None
    
    async def extract_comments(self, max_comments=20) -> list:
        """
        Extract top comments from the current reel.
        
        Args:
            max_comments: Maximum number of comments to extract (default 20)
            
        Returns:
            list: List of comment dictionaries
        """
        comments = []
        
        try:
            # Click on comments to expand if needed
            # Sometimes comments are already visible, sometimes need to click
            await asyncio.sleep(1)
            
            # Find all comment elements
            # Instagram's comment structure varies, this is a general approach
            comment_elems = await self.page.query_selector_all('ul li[role="menuitem"], div[role="button"] + div')
            
            logger.info(f"Found {len(comment_elems)} comment elements")
            
            for idx, elem in enumerate(comment_elems[:max_comments]):
                try:
                    comment_data = {}
                    
                    # Extract username
                    username_elem = await elem.query_selector('a[role="link"]')
                    if username_elem:
                        comment_data['username'] = await username_elem.inner_text()
                    
                    # Extract comment text
                    text_elem = await elem.query_selector('span')
                    if text_elem:
                        comment_data['comment_text'] = await text_elem.inner_text()
                    
                    # Extract likes on comment (if visible)
                    likes_elem = await elem.query_selector('button span')
                    if likes_elem:
                        likes_text = await likes_elem.inner_text()
                        comment_data['likes_count'] = self._parse_count(likes_text) if likes_text else 0
                    else:
                        comment_data['likes_count'] = 0
                    
                    # Rank based on order
                    comment_data['rank'] = idx + 1
                    comment_data['posted_at'] = ""  # Placeholder
                    
                    if comment_data.get('username') and comment_data.get('comment_text'):
                        comments.append(comment_data)
                        logger.debug(f"Extracted comment {idx+1} from @{comment_data['username']}")
                    
                except Exception as e:
                    logger.warning(f"Error extracting comment {idx}: {e}")
                    continue
            
            logger.info(f"Extracted {len(comments)} comments")
            
        except Exception as e:
            logger.error(f"Error extracting comments: {e}")
        
        return comments
    
    async def scroll_to_next_reel(self):
        """Scroll to the next reel in the feed."""
        # Instagram Reels can be scrolled with arrow down or by swiping
        await self.page.keyboard.press('ArrowDown')
        
        # Human-like delay
        delay = human_random()
        logger.debug(f"Waiting {delay}s before next action")
        await asyncio.sleep(delay)
    
    async def scrape_reels(self, max_reels=MAX_REELS_PER_SESSION):
        """
        Main scraping loop - scroll through reels and extract data.
        
        Args:
            max_reels: Maximum number of reels to scrape
        """
        await self.navigate_to_reels()
        
        logger.info(f"Starting to scrape up to {max_reels} reels")
        
        db_session = get_session()
        scraped_count = 0
        attempts = 0
        max_attempts = max_reels * 3  # Allow some failed attempts
        
        while scraped_count < max_reels and attempts < max_attempts:
            attempts += 1
            
            # Extract current reel data
            reel_data = await self.extract_reel_data()
            
            if reel_data:
                # Extract comments
                comments_data = await self.extract_comments(max_comments=20)
                
                # Save to database
                try:
                    # Create Reel object
                    reel = Reel(
                        reel_url=reel_data['reel_url'],
                        reel_id=reel_data['reel_id'],
                        author_username=reel_data.get('author_username'),
                        caption=reel_data.get('caption'),
                        likes_count=reel_data.get('likes_count', 0),
                        comments_count=reel_data.get('comments_count', 0),
                        shares_count=reel_data.get('shares_count', 0),
                        views_count=reel_data.get('views_count', 0),
                        video_url=reel_data.get('video_url'),
                        thumbnail_url=reel_data.get('thumbnail_url')
                    )
                    
                    db_session.add(reel)
                    db_session.flush()  # Get the reel.id
                    
                    # Create Comment objects
                    for comment_data in comments_data:
                        comment = Comment(
                            reel_id=reel.id,
                            username=comment_data.get('username'),
                            comment_text=comment_data.get('comment_text'),
                            likes_count=comment_data.get('likes_count', 0),
                            rank=comment_data.get('rank'),
                            posted_at=comment_data.get('posted_at', '')
                        )
                        db_session.add(comment)
                    
                    db_session.commit()
                    scraped_count += 1
                    logger.success(f"Saved reel {scraped_count}/{max_reels}: {reel_data['reel_id']}")
                    
                except Exception as e:
                    logger.error(f"Error saving to database: {e}")
                    db_session.rollback()
            
            # Scroll to next reel
            await self.scroll_to_next_reel()
        
        db_session.close()
        logger.success(f"Scraping complete! Scraped {scraped_count} reels")
    
    def _parse_count(self, text: str) -> int:
        """
        Parse engagement count from text (handles K, M suffixes).
        
        Args:
            text: Text containing count (e.g., "1.2K", "500", "1M")
            
        Returns:
            int: Parsed count
        """
        if not text:
            return 0
            
        text = text.strip().upper().replace(',', '')
        
        try:
            if 'K' in text:
                return int(float(text.replace('K', '')) * 1000)
            elif 'M' in text:
                return int(float(text.replace('M', '')) * 1000000)
            else:
                # Extract just the number
                numbers = re.findall(r'\d+', text)
                return int(numbers[0]) if numbers else 0
        except:
            return 0
