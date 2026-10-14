# OmniCognitive Assistant — Prachi AI V2 Cognitive Brain

Autonomous Cognitive Personal Assistant featuring **LangGraph Actor-Critic Reflection Loops**, **Hybrid GraphRAG (Neo4j + ChromaDB)**, **Multimodal Verification**, and **Direct Preference Optimization (DPO)** continuous alignment.

---

## 🏗️ Architecture Overview

```
                                [ User / Frontend Stream ]
                                            │
                                            ▼
                                   FastAPI Brain Server
                                (app/main.py - Port 8000)
                                            │
                         ┌──────────────────┴──────────────────┐
                         │                                     │
                         ▼                                     ▼
                  REST Endpoints                        WebSocket Stream
            (/api/chat, /api/verify-object)              (/ws/stream)
                         │                                     │
                         └──────────────────┬──────────────────┘
                                            │
                                            ▼
                                LangGraph Stateful Agent
                                            │
                       ┌────────────────────┴────────────────────┐
                       │                                         │
                       ▼                                         ▼
           [GraphRAG Context Retriever]                 [Perception Tools]
           ├── Neo4j: Relations & Corrections           ├── Vision Verification
           └── ChromaDB: Episodic Memory                └── Live Web Grounding
                       │                                         │
                       └────────────────────┬────────────────────┘
                                            │
                                            ▼
                                      Actor Reasoner
                                            │
                                            ▼
                                  Critic Reflection Gate
                                  (Confidence >= 0.85?)
                                      /          \
                         [No: < 2 retries]     [No: >= 2 retries]
                                /                      \
                               ▼                        ▼
                       RETRY Cycle                 CLARIFY Gate
                     (Feedback to Actor)       (Escalate to Human)
                                \                       /
                                 ▼                     ▼
                           [Yes: >= 0.85]         Human in the Loop
                                │
                                ▼
                       Memory Writeback Node
                     (Commit Facts & Epics)
                                │
                                ▼
                        Final Verified Output
                                │
                                ▼
                     DPO Feedback Pipeline
                   (Prompt/Chosen/Rejected)
```

---

## 🚀 Quick Start

### 1. Running with Docker Compose (Recommended)
```bash
docker-compose up --build
```
This automatically launches:
- **FastAPI Brain**: `http://localhost:8000`
- **Neo4j Graph Database**: `bolt://localhost:7687` (Browser: `http://localhost:7474`)
- **ChromaDB Vector Store**: `http://localhost:8001`

### 2. Running Locally with Python
```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Launch FastAPI brain
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
*Note: Resilient in-memory fallbacks activate automatically if Neo4j or ChromaDB instances are not currently running.*

---

## 📡 API Contract

### Diagnostics
- **`GET /health`**: Health probe reporting status of GraphRAG, Neo4j, and Vector memory.

### Multimodal Object Verification
- **`POST /api/verify-object`**: Multipart image upload endpoint (`file` or `image_base64`).
  Returns structured verification report:
  - `brand`: Identified manufacturer / standard.
  - `authenticity`: Genuine vs Compromised status.
  - `state`: Operational / Intact vs Anomaly.
  - `defects`: List of detected cosmetic or structural anomalies.
  - `confidence_score`: Optical clarity and certainty ($0.0 - 1.0$).
  - `critic_verdict`: `PASS`, `RETRY`, or `CLARIFY`.

### Cognitive Chat & Reasoning
- **`POST /api/chat`**:
  ```json
  {
    "user_id": "user_01",
    "query": "Verify the authenticity and integrity of our primary hardware prototype."
  }
  ```

### Continuous Alignment (DPO)
- **`POST /api/feedback`**: Records human thumbs-up/down preference pair for weekly LoRA tuning.
- **`POST /api/correct`**: Commits a verified ground-truth correction into Neo4j graph memory.

### Real-Time Video/Frame WebSocket
- **`WebSocket /ws/stream`**: Bidirectional real-time perception stream.

---

## 🔬 Weekly DPO LoRA Fine-Tuning
See [`dpo_pipeline/fine_tune_spec.md`](./dpo_pipeline/fine_tune_spec.md) for the complete QLoRA training script, dataset splitting, hyperparameters, and HuggingFace TRL `DPOTrainer` pipeline.
