import logging
from typing import Dict, Any, Optional
import urllib.request
import re

logger = logging.getLogger("browser_tool")

try:
    from playwright.async_api import async_playwright
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False

class BrowserAutomationTool:
    """
    Playwright headless browser automation tool for autonomous scraping,
    web verification, and page rendering. Includes a graceful HTTP fallback.
    """
    def __init__(self):
        self.playwright_available = PLAYWRIGHT_AVAILABLE

    async def extract_page_content(self, url: str) -> Dict[str, Any]:
        """
        Navigates to a webpage and extracts title, inner text, and metadata.
        """
        if self.playwright_available:
            try:
                async with async_playwright() as p:
                    browser = await p.chromium.launch(headless=True)
                    page = await browser.new_page()
                    await page.goto(url, timeout=15000)
                    title = await page.title()
                    text_content = await page.inner_text("body")
                    await browser.close()
                    return {
                        "url": url,
                        "title": title,
                        "content_snippet": text_content[:1500],
                        "status": "success",
                        "engine": "Playwright Chromium Headless"
                    }
            except Exception as e:
                logger.warning("Playwright navigation error (%s). Falling back to standard HTTP.", e)

        # Resilient HTTP request fallback
        try:
            req = urllib.request.Request(
                url,
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) PrachiAI/2.0"}
            )
            with urllib.request.urlopen(req, timeout=10) as response:
                html = response.read().decode("utf-8", errors="ignore")
                # Strip tags
                clean_text = re.sub(r"<[^>]+>", " ", html)
                clean_text = re.sub(r"\s+", " ", clean_text).strip()
                title_match = re.search(r"<title>(.*?)</title>", html, re.IGNORECASE)
                title = title_match.group(1).strip() if title_match else url
                return {
                    "url": url,
                    "title": title,
                    "content_snippet": clean_text[:1500],
                    "status": "success",
                    "engine": "Native HTTP Client"
                }
        except Exception as e:
            logger.error("HTTP browser fallback failed: %s", e)
            return {
                "url": url,
                "title": "Unreachable Destination",
                "content_snippet": f"Could not retrieve webpage content: {str(e)}",
                "status": "error",
                "engine": "Failed"
            }

browser_tool = BrowserAutomationTool()
