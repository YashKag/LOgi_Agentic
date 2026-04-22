"""
Agent tools configuration and custom tools.
- SerperDevTool for web search (always available)
- ScrapeWebsiteTool for deep content extraction (deep mode only)
"""

import os
from crewai_tools import SerperDevTool, ScrapeWebsiteTool


def get_tools(depth: str = "standard") -> list:
    """
    Returns a list of tools based on the research depth.
    - 'standard': Web search only
    - 'deep': Web search + website scraper for full content extraction
    
    Raises ValueError if SERPER_API_KEY is missing or placeholder.
    """
    serper_key = os.getenv("SERPER_API_KEY", "")
    if not serper_key or serper_key == "your_serper_api_key_here":
        raise ValueError(
            "SERPER_API_KEY is not set. "
            "Get a free key (2500 searches) at https://serper.dev and add it to backend/.env"
        )

    search_tool = SerperDevTool()
    tools = [search_tool]

    if depth == "deep":
        scraper_tool = ScrapeWebsiteTool()
        tools.append(scraper_tool)

    return tools


# Backwards-compatible alias used by old code
def get_search_tool() -> SerperDevTool:
    """Legacy helper — returns only the search tool. Prefer get_tools() for new code."""
    return SerperDevTool()
