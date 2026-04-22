"""
CrewAI Orchestration
Defines the agents and tasks for the Logistics Researcher Agent.

Supports flexible configuration:
  - model_name: which Gemini model to use
  - domain: logistics sub-domain context (e.g., "Last-Mile Delivery", "Cold Chain")
  - depth: 'standard' (search only) or 'deep' (search + scraper)
"""

import os
from crewai import Agent, Task, Crew, Process, LLM
from .tools import get_tools

# Available models exposed to the API layer.
# Maps the frontend legacy identifiers to the actual valid Google API Studio models.
SUPPORTED_MODELS = {
    "gemini-1.5-flash": "gemini-flash-latest",
    "gemini-1.5-pro": "gemini-pro-latest",
    "gemini-2.0-flash": "gemini-2.0-flash",
}


def get_llm(model_name: str = "gemini-1.5-flash", temperature: float = 0.3):
    """
    Initialize the Google Gemini LLM via LangChain.
    Validates the API key and model name before initialising.
    """
    api_key = os.getenv("GOOGLE_API_KEY", "")
    if not api_key or api_key == "your_google_api_key_here":
        raise ValueError(
            "GOOGLE_API_KEY is not set. "
            "Get a free key at https://aistudio.google.com and add it to backend/.env"
        )

    resolved_model = SUPPORTED_MODELS.get(model_name, "gemini-1.5-flash")

    # LiteLLM (used by CrewAI) strictly requires GEMINI_API_KEY for Google AI Studio,
    # otherwise it falls back to Vertex AI and fails with a VertexAIException.
    os.environ["GEMINI_API_KEY"] = api_key

    return LLM(
        model=f"gemini/{resolved_model}",
        api_key=api_key,
        temperature=temperature,
    )


def run_research_crew(
    query: str,
    step_callback=None,
    domain: str = "General Logistics",
    depth: str = "standard",
    model_name: str = "gemini-1.5-flash",
) -> str:
    """
    Runs the Logistics Research Crew for a given query.

    Args:
        query:         The user's research question.
        step_callback: Optional callable(str) to stream progress messages.
        domain:        Logistics sub-domain (e.g., "Last-Mile", "Cold Chain", "Freight").
        depth:         'standard' (fast) or 'deep' (includes web scraper).
        model_name:    Gemini model to use (see SUPPORTED_MODELS).
    """
    def _log(msg: str):
        if step_callback:
            step_callback(msg)

    _log(f"System: Initializing crew — model={model_name}, domain={domain}, depth={depth}")

    llm = get_llm(model_name=model_name)
    tools = get_tools(depth=depth)

    # ── Agent 1: Research Planner ──────────────────────────────────────────────
    planner = Agent(
        role="Logistics Research Planner",
        goal=(
            f"Break down the user's logistics query into 3-5 precise, targeted search queries "
            f"tailored for the '{domain}' sub-domain of logistics."
        ),
        backstory=(
            "You are a seasoned supply chain analyst with 15+ years of experience. "
            "You understand that great research starts with great questions. "
            "You dissect complex logistics problems and identify exactly what data is needed."
        ),
        verbose=True,
        allow_delegation=False,
        llm=llm,
    )

    # ── Agent 2: Web Researcher ────────────────────────────────────────────────
    web_researcher = Agent(
        role="Web Researcher",
        goal=(
            "Execute the search plan and harvest accurate, up-to-date information "
            "from authoritative logistics and supply chain sources."
        ),
        backstory=(
            "You are a tenacious digital investigator who knows how to find the signal in the noise. "
            "You prioritize industry reports, government data, and trusted news outlets. "
            "You always note the source URL alongside every fact you extract."
        ),
        verbose=True,
        allow_delegation=False,
        tools=tools,
        llm=llm,
    )

    # ── Agent 3: Domain Specialist ─────────────────────────────────────────────
    domain_specialist = Agent(
        role=f"{domain} Logistics Specialist",
        goal=(
            f"Review the raw research and apply deep expertise in '{domain}' to identify "
            "nuances, regulatory factors, regional differences, and practical implications "
            "that a general researcher might miss."
        ),
        backstory=(
            f"You are a domain expert in '{domain}' logistics with hands-on operational experience. "
            "You spot missing context instantly — whether it's EU transport regulations, "
            "last-mile carrier economics, cold chain temperature thresholds, or freight market cycles. "
            "You enrich raw findings with expert commentary."
        ),
        verbose=True,
        allow_delegation=False,
        llm=llm,
    )

    # ── Agent 4: Synthesis & Report Writer ────────────────────────────────────
    synthesizer = Agent(
        role="Synthesis & Report Writer",
        goal=(
            "Synthesize all findings into a single, comprehensive, well-structured "
            "markdown report that directly answers the original query for a logistics professional."
        ),
        backstory=(
            "You are a technical writer who has authored hundreds of supply chain intelligence briefs. "
            "You transform raw data and expert commentary into crisp, actionable reports "
            "with clear structure, executive summaries, and data-backed conclusions."
        ),
        verbose=True,
        allow_delegation=False,
        llm=llm,
    )

    # ── Task 1: Plan ───────────────────────────────────────────────────────────
    plan_task = Task(
        description=(
            f"Analyze this logistics research query:\n\n"
            f"  QUERY: {query}\n"
            f"  DOMAIN: {domain}\n\n"
            f"Create a step-by-step search plan with 3-5 specific, targeted search queries "
            f"that will uncover the most relevant and up-to-date information. "
            f"Focus specifically on the '{domain}' aspect of logistics."
        ),
        expected_output=(
            "A numbered list of 3-5 specific search queries, each on its own line, "
            "tailored to the domain and designed to find comprehensive, up-to-date data."
        ),
        agent=planner,
    )

    # ── Task 2: Research ───────────────────────────────────────────────────────
    research_task = Task(
        description=(
            "Execute ALL search queries from the Research Plan. "
            "For each query, record:\n"
            "  1. Key facts and statistics found\n"
            "  2. Source URLs\n"
            "  3. Publication dates (if available)\n\n"
            "Prioritize recent data (2023-2026). "
            "Cover multiple perspectives: industry, regulatory, economic, and technological."
        ),
        expected_output=(
            "Structured research notes organized by search query. "
            "Each section must include: facts, statistics, source URLs, and dates. "
            "Minimum 5 distinct data points with sources."
        ),
        agent=web_researcher,
        context=[plan_task],
    )

    # ── Task 3: Domain Expert Review ───────────────────────────────────────────
    specialist_task = Task(
        description=(
            f"Review the raw research notes from the Web Researcher. "
            f"Apply your expertise in '{domain}' logistics to:\n"
            f"  1. Validate the findings for accuracy and relevance\n"
            f"  2. Add missing context (regulations, regional factors, market dynamics)\n"
            f"  3. Identify the 3 most important implications for a logistics operator\n"
            f"  4. Flag any gaps or contradictions in the data\n\n"
            f"Original query: {query}"
        ),
        expected_output=(
            f"An expert commentary section covering: validation notes, "
            f"added domain context for '{domain}', top 3 practical implications, "
            "and any identified data gaps."
        ),
        agent=domain_specialist,
        context=[research_task],
    )

    # ── Task 4: Final Report ───────────────────────────────────────────────────
    synthesis_task = Task(
        description=(
            f"Write the final comprehensive intelligence report that answers: '{query}'\n\n"
            f"Use ALL previous outputs (research notes + domain expert commentary). "
            f"Structure the report in markdown with:\n"
            f"  - **Executive Summary** (3-4 sentences)\n"
            f"  - **Key Findings** (bullet points with data)\n"
            f"  - **Domain Analysis: {domain}** (from specialist)\n"
            f"  - **Market Implications** (practical takeaways)\n"
            f"  - **Sources** (numbered list of URLs)\n\n"
            f"Write for a logistics director or supply chain VP. Be specific, data-driven, and actionable."
        ),
        expected_output=(
            "A complete markdown report with proper headings (##), bullet points, "
            "bold key terms, and a sources section. Minimum 600 words."
        ),
        agent=synthesizer,
        context=[research_task, specialist_task],
    )

    # ── Assemble Crew ──────────────────────────────────────────────────────────
    crew = Crew(
        agents=[planner, web_researcher, domain_specialist, synthesizer],
        tasks=[plan_task, research_task, specialist_task, synthesis_task],
        process=Process.sequential,
        verbose=True,
    )

    _log("System: Crew assembled. Kicking off research pipeline...")
    result = crew.kickoff()
    _log("System: Research pipeline complete.")

    return str(result)
