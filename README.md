# Prachi AI — Multimodal AI Virtual Personal Assistant & Conversational Workspace

> **Version**: 1.0.0 (Production Ready)  
> **Backend & Frontend Host**: `http://localhost:3001`  
> **Health Check**: `http://localhost:3001/health`

---

## 🌟 Executive Overview
**Prachi AI** is a state-of-the-art, multimodal virtual personal assistant and collaborative workspace platform built according to the complete factory specification kit. It delivers private, multi-tenant conversational intelligence, personalized memory control, grounded RAG citations, statistical time-series forecasting, computer vision analysis, voice interaction, and explicit confirmation safety gates for high-impact actions.

---

## 🚀 Quick Start

### 1. The Application is Already Running!
The unified server is actively running on port **3001**:
- **Application URL**: [http://localhost:3001](http://localhost:3001)
- **API Health Probe**: [http://localhost:3001/health](http://localhost:3001/health)

### 2. Ready-To-Use Demo Accounts
You can log in instantly or click the 1-click quick-fill buttons in the Auth Modal:
- **Standard User**:
  - Email: `demo@prachi.ai`
  - Password: `PrachiAI2026!`
- **Administrator**:
  - Email: `admin@prachi.ai`
  - Password: `AdminPass2026!`

---

## 🛠️ Key Capabilities & Modules

1. **AI Chat & Orchestration (`/chat`)**:
   - Multi-provider adapters for Gemini, Claude, OpenAI, and a fast offline Local Heuristic fallback.
   - Intelligent tool routing (Calculator, Web Search, Weather, Task Scheduler, Code Sandbox).
   - Grounded RAG citations with expandable context cards.

2. **Personalized Memory Bank (`/memory`)**:
   - Inspect, create, edit, disable, or delete personalized facts, preferences, and project context.
   - Strict tenant isolation guarantees private records never leak between users.

3. **Multimodal Vision Studio (`/vision`)**:
   - Object detection with normalized bounding boxes `[ymin, xmin, ymax, xmax]`.
   - OCR text extraction (invoices, receipts, dashboards) and visual Q&A.

4. **Statistical Forecasting Engine (`/forecast`)**:
   - Linear Regression OLS, Exponential Smoothing, and Moving Average time-series forecasting.
   - 95% Confidence Interval uncertainty bounds and rigorous model metrics ($R^2$, $RMSE$, $MAE$).
   - Prominent statistical uncertainty disclaimer labels.

5. **Tool Registry & High-Impact Policy Gates (`/tools`)**:
   - Safe tools (Calculator, Weather) execute directly.
   - High-impact external actions (`email_sender`) require an explicit cryptographic confirmation token approval step before execution.

6. **Voice Assistant Studio (`/voice`)**:
   - Web Speech API integration for real-time speech recognition (STT) and synthesized speech responses (TTS).
   - Animated 12-bar equalizer audio waveform visualizer.

7. **Document Intelligence & Grounded RAG (`/documents`)**:
   - Ingest documents across TXT, MD, CSV, JSON, PDF, and code files.
   - Vector chunking with sliding overlap and TF-IDF / cosine similarity retrieval.

8. **Admin Console & Observability (`/admin`)**:
   - Real-time system telemetry (CPU, heap memory, active users, error counts).
   - Live feature flag toggles (enable/disable RAG, vision, web search, memory on the fly).
   - Security audit trail with automatic secret scrubbing.

9. **OmniCognitive Brain & GraphRAG Studio (`/omnibrain` & `/api/brain`)**:
   - Attached from the `Updated Prachi Ai` build kit (`Build kit 2/Updated Prachi Ai` & `./brain`).
   - **LangGraph Stateful Graph**: Features hybrid GraphRAG context retriever (Neo4j + ChromaDB), Actor reasoner, and Critic reflection gateway.
   - **Confidence Policy Gate**: Enforces strict confidence threshold ($\ge 0.85$) with automated reflection retries and polite human-in-the-loop escalation (`CLARIFY`).
   - **Multimodal Verification**: Real-time camera image ingestion and verification (brand, authenticity, state, defects) with structured JSON responses.
   - **Continuous Alignment (DPO)**: Logs preference pairs (`prompt`, `chosen`, `rejected`) for weekly LoRA fine-tuning.

---

## 🏗️ Architecture & Technical Stack

- **Backend**:
  - Node.js 20+ with TypeScript.
  - Zero-native embedded SQL engine (`EmbeddedDatabase`) with ACID atomic JSON persistence to `./backend/data/prachi.db.json`. Eliminates all Windows C++ Visual Studio build dependencies.
  - Native Node.js `crypto.scryptSync` password hashing and HMAC-SHA256 JWT tokens.
  - Express.js with rate limiting, centralized error handling, and file upload validation.
- **Frontend**:
  - React 18 with modern component architecture.
  - Bespoke Vanilla CSS design system with HSL dark/light mode tokens, glassmorphism, and micro-animations.
  - Pre-bundled with esbuild into `frontend/dist` and served statically by the backend server for a zero-CORS single-port deployment.

---

## 🧪 Testing & Verification

- **Unit Test Suite**:
  ```bash
  cd backend
  npm test
  ```
  *(10/10 tests passing)*

- **End-to-End System Verification Suite**:
  ```bash
  cd backend
  node tests/e2e_verify.mjs
  ```
  *(10/10 verifications passing across all 10 core requirements)*
