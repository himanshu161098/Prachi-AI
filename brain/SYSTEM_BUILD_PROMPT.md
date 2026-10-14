# AUTONOMOUS AGENT BUILD SPECIFICATION & SYSTEM PROMPT

You are an expert Principal AI Systems Architect and Lead Full-Stack Engineer. Your task is to implement and scaffold an international-grade, production-ready **Autonomous Cognitive Personal Assistant** based on the following comprehensive specifications.

---

## 1. PROJECT OVERVIEW & ARCHITECTURAL OBJECTIVE
Build a full-stack, enterprise-grade AI system featuring:
- **Centralized Brain**: Python 3.11+ backend using **FastAPI** with WebSocket and REST support.
- **Multimodal Perception & Verification**: Real-time camera image ingestion and multimodal object verification (brand, authenticity, state, defects) with structured outputs.
- **Cognitive Orchestration (LangGraph)**: Stateful multi-agent graph with:
  - `graphrag_retriever`: Hybrid context fetching from Neo4j (entities, ownership, rules, past corrections) + ChromaDB (semantic memory).
  - `actor_agent`: Primary reasoner for tool execution and vision analysis.
  - `critic_agent`: Reflection gateway enforcing confidence threshold (>= 0.85) and fact-checking against ground truth.
  - `memory_writeback`: Commits validated facts, feedback, and user corrections.
- **Continuous Learning & Human-in-the-Loop**: Escalates queries politely to the user if confidence is low after 2 retries; logs DPO (Direct Preference Optimization) preference pairs (`prompt`, `chosen`, `rejected`) for iterative tuning.
- **Autonomy & Tool Execution**: Web search, browser automation via Playwright, and scheduled task management.
- **Cross-Platform Client Readiness**: Structured JSON/WebSocket responses designed for Flutter / React Native (Android, Web, iOS).

---

## 2. DIRECTORY STRUCTURE TO IMPLEMENT
You must scaffold and implement the following structure:

```
omni_ai_project/
├── .env.example
├── README.md
├── docker-compose.yml
├── requirements.txt
├── backend/
│   ├── Dockerfile
│   └── app/
│       ├── __init__.py
│       ├── main.py                     # FastAPI app, CORS, WebSockets, REST endpoints
│       ├── core/
│       │   ├── __init__.py
│       │   └── config.py               # Pydantic v2 settings (Neo4j, LLM, ChromaDB)
│       ├── agents/
│       │   ├── __init__.py
│       │   ├── state.py                # LangGraph TypedDict state
│       │   ├── graph.py                # StateGraph workflow wiring & routing
│       │   └── nodes/
│       │       ├── __init__.py
│       │       ├── retriever.py        # GraphRAG node
│       │       ├── actor.py            # Actor / Reasoner node
│       │       ├── critic.py           # Critic / Verifier node
│       │       └── writeback.py        # Memory writeback node
│       ├── memory/
│       │   ├── __init__.py
│       │   ├── neo4j_client.py         # Knowledge graph CRUD & Cypher queries
│       │   └── vector_store.py         # ChromaDB embedding & similarity search
│       ├── tools/
│       │   ├── __init__.py
│       │   ├── vision_tool.py          # Multimodal image verification logic
│       │   ├── browser_tool.py         # Playwright headless browser tool
│       │   └── search_tool.py          # Web search interface
│       └── schemas/
│           ├── __init__.py
│           ├── requests.py             # Pydantic models for incoming requests
│           └── responses.py            # Structured verification & chat schemas
└── dpo_pipeline/
    ├── logger.py                       # Logs user feedback to JSONL pairs
    └── fine_tune_spec.md               # Weekly LoRA fine-tuning run specification
```

---

## 3. COMPONENT IMPLEMENTATION REQUIREMENTS

### A. Core Configuration (`backend/app/core/config.py`)
- Use `pydantic_settings.BaseSettings`.
- Include settings for `PROJECT_NAME`, `DEBUG`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`, `CHROMA_PERSIST_DIR`, `HOST`, and `PORT`.

### B. GraphRAG & Memory Layer
1. **Neo4j (`backend/app/memory/neo4j_client.py`)**:
   - Maintain schema: `(:User {id})`, `(:Entity {name, category})`, `(:Correction {text, timestamp})`, `(:Attribute {key, value})`.
   - Provide query functions:
     - `get_user_context(user_id: str) -> list[str]`
     - `add_user_correction(user_id: str, entity_name: str, correction: str)`
     - `link_entity_verification(user_id: str, entity_name: str, status: str, attributes: dict)`
2. **Vector Store (`backend/app/memory/vector_store.py`)**:
   - Manage ChromaDB collection for episodic chat logs and semantic memories.

### C. LangGraph Multi-Agent Architecture
- **State (`backend/app/agents/state.py`)**:
  ```python
  from typing import TypedDict, List, Optional, Any, Dict

  class AgentState(TypedDict):
      user_id: str
      query: str
      image_data: Optional[str]
      graph_context: List[str]
      vector_context: List[str]
      draft_response: str
      critic_verdict: str  # 'PASS', 'RETRY', 'CLARIFY'
      confidence_score: float
      critic_feedback: str
      retry_count: int
      final_output: str
      action_artifacts: Dict[str, Any]
  ```
- **Critic Reflection (`backend/app/agents/nodes/critic.py`)**:
  - Validates draft outputs against Neo4j knowledge and confidence score.
  - If `confidence < 0.85` and `retry_count < 2` -> Return `RETRY` with actionable critique.
  - If `confidence < 0.85` and `retry_count >= 2` -> Return `CLARIFY` (escalate politely to human).
  - If `confidence >= 0.85` -> Return `PASS`.

### D. FastAPI Endpoints & WebSockets (`backend/app/main.py`)
- `GET /health`: System diagnostic check.
- `POST /api/verify-object`: Multipart image file upload endpoint with structured JSON response.
- `POST /api/feedback`: Ingests user thumbs-up/down or corrections for DPO logging.
- `WebSocket /ws/stream`: Full-duplex real-time communication stream.

---

## 4. INSTRUCTIONS FOR THE CODING AGENT
1. Generate complete, valid, type-hinted code for every single file. Do not use placeholder comments like `// implement here`.
2. Ensure asynchronous execution where appropriate (`async/await`).
3. Make sure all imports and dependencies in `requirements.txt` match the actual usage.
4. Verify that Docker Compose configuration properly links the backend, Neo4j, and ChromaDB.
