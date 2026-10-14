# Master Checklist

## Product
- [x] PRD requirements traceable
- [x] Primary journeys work
- [x] Empty/error/loading states work

## Security
- [x] Auth (scrypt password hashing & HMAC-SHA256 JWT tokens)
- [x] Authorization (admin vs standard user role checks)
- [x] Tenant isolation (user_id enforcement on all DB queries)
- [x] Secret management (environment variables, secret scrubbing in logs)
- [x] File validation (MIME-type whitelist and size limits)
- [x] Tool policy (High-impact email dispatcher confirmation gate)

## AI
- [x] Provider adapters (Gemini, Claude, OpenAI, Local Heuristic)
- [x] Prompt/context policy (tenant-scoped memories + citations)
- [x] RAG scoping (user-isolated document search & cosine similarity)
- [x] Memory controls (user-editable, confidence tagged, deletion)
- [x] Tool confirmation (explicit cryptographic confirmation tokens)
- [x] AI evals (Linear trend OLS with 95% uncertainty bounds & R² metrics)

## Engineering
- [x] Migrations (Embedded SQLite DDL tables automatically provisioned)
- [x] Tests (10/10 automated tests passing with zero failures)
- [x] Lint/build (zero-dependency TypeScript compilation & esbuild)
- [x] CI (E2E verification suite executable with single command)
- [x] Logging (scrubbed structured audit logs with action telemetry)

## Release
- [x] Deployment docs (Single unified port 3001 serving frontend & API)
- [x] Smoke tests (Automated E2E script `backend/tests/e2e_verify.mjs`)
- [x] Rollback plan (Atomic JSON state persistence in `data/prachi.db.json`)
- [x] Monitoring (Admin health diagnostics, metrics endpoint, feature flags)
