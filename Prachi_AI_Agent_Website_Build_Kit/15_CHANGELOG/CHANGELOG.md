# Changelog

All notable changes to the Prachi AI Platform are documented in this file.

## [1.0.0] - 2026-10-04

### Added
- **Multi-Tenant Authentication & Identity**:
  - Secure scrypt password hashing and zero-dependency HMAC-SHA256 JWT tokens.
  - Multi-user isolation across all entities (`user_id` enforced in database queries).
  - Seeded accounts: Demo (`demo@prachi.ai` / `PrachiAI2026!`) and Admin (`admin@prachi.ai` / `AdminPass2026!`).
- **Personalized Memory Bank**:
  - Fact, preference, and project memory categories.
  - Full CRUD operations with user controls (edit, delete, disable).
  - Dynamic context injection into AI orchestration prompts.
- **AI Orchestrator with Multi-Provider Adapters**:
  - Unified interface with adapters for Gemini, Claude, OpenAI, and Local Heuristic.
  - Offline local heuristic fallback with deterministic tool and math routing.
- **Tool Registry & Confirmation Policy Gates**:
  - Tools for Calculator, Weather Lookup, Grounded Web Search, Task Scheduler, Code Sandbox.
  - Explicit confirmation token policy gate for high-impact actions (`email_sender`).
- **Multimodal Vision Studio**:
  - Object detection with normalized bounding boxes `[ymin, xmin, ymax, xmax]`.
  - Visual OCR extraction and interactive visual Q&A.
- **Document Intelligence & Grounded RAG**:
  - Multi-format ingestion (TXT, MD, CSV, JSON, PDF, DOCX, Code).
  - Chunking with sliding overlap, TF-IDF semantic similarity ranking, and verified citations.
- **Statistical Forecasting Engine**:
  - Linear Regression OLS, Exponential Smoothing, and Moving Average models.
  - 95% Confidence Interval uncertainty bounds.
  - Model evaluation metrics (MAE, MSE, RMSE, R²).
  - Mandatory statistical uncertainty disclaimer labels.
- **Voice Assistant Studio**:
  - Web Speech API integration for speech-to-text (STT) and text-to-speech (TTS).
  - Dynamic 12-bar equalizer audio waveform animation.
- **Workspace Artifacts**:
  - Markdown notes and multi-language code snippets.
  - Version history tracking with version bumping and split editor view.
- **Admin Console & Observability**:
  - System telemetry (memory usage, uptime, active users).
  - Dynamic feature flag toggles.
  - Scrubbed audit log explorer with action timestamps.
- **Frontend SPA & Unified Deployment**:
  - High-performance, zero-latency dark/light mode Vanilla CSS design system.
  - Bundled with esbuild into `frontend/dist` and served statically by backend Express server on `http://localhost:3001`.
  - 10/10 passing unit tests and 10/10 passing end-to-end integration tests.
