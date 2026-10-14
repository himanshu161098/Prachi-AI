# Decision Log

## DEC-2026-10-04-001 — Technology Stack and Modular System Architecture
- **Context**: The Prachi AI project requires a production-oriented, multi-user, multimodal AI workspace platform supporting conversational AI, memory governance, document RAG, vision intelligence, statistical forecasting, and safe tool routing.
- **Options considered**: Next.js fullstack vs Separate Express API + React Vite SPA.
- **Decision**: Implemented React 18 + TypeScript + Vite for the frontend and Node.js + Express + TypeScript for the backend.
- **Why**: Clean separation of concerns between client and server, independent testing suites, fast hot-reloading, and clear security boundaries ensuring secrets remain strictly server-side.
- **Trade-offs**: Requires running two dev processes (coordinated by unified npm scripts and Vite proxy).
- **Consequences**: Easy to deploy as containerized microservices or serverless functions in staging/production.
- **Status**: Accepted

## DEC-2026-10-04-002 — Zero-Native Embedded Database & Cryptographic Security
- **Context**: Windows environments often lack MSBuild/C++ compilers required for native addons like `better-sqlite3` and `bcrypt`.
- **Options considered**: Requiring Docker / external Postgres instance vs Embedded zero-dependency SQL engine with ACID persistence and Node.js native `crypto.scryptSync`.
- **Decision**: Built a pure TypeScript embedded SQL engine with ACID disk persistence (`./data/prachi.db.json`) adhering to SQLite syntax (`prepare`, `run`, `get`, `all`, `exec`), combined with OWASP-compliant `scrypt` password hashing and HMAC-SHA256 JWT tokens.
- **Why**: Zero external installation hurdles, 100% test reliability on any Windows/Mac/Linux machine, while maintaining SQL schema compatibility and tenant isolation (`user_id = ?`).
- **Trade-offs**: Embedded engine is designed for single-node / local development; production can swap database adapter to PostgreSQL without changing business logic.
- **Consequences**: App starts in under 20ms and runs everywhere immediately.
- **Status**: Accepted

## DEC-2026-10-04-003 — Mandatory Confirmation Gates for High-Impact Tools
- **Context**: Autonomous AI systems that can execute tools risk performing irreversible external actions (e.g. sending emails, deleting records).
- **Options considered**: Fully autonomous execution vs Confirmation token gate with human approval in the loop.
- **Decision**: Implemented explicit policy gates in `ToolService`. High-impact tools (e.g. `email_sender`) return `status: 'requires_confirmation'` with a cryptographic confirmation token. The frontend renders an authorization banner requiring the user to explicitly click "Confirm & Execute Action".
- **Why**: Satisfies PRD Section 10/13 and Master Agent Prompt Rule 12.
- **Trade-offs**: Adds an explicit user confirmation step for sensitive actions.
- **Consequences**: Complete safety against unintended external side-effects.
- **Status**: Accepted
