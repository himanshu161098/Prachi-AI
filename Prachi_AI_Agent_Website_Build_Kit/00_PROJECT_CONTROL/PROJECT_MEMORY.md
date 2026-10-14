# Project Memory

## Product identity
- Name: Prachi AI
- Positioning: Personalized AI assistant + general AI chatbot + multimodal AI workspace

## Core user promise
A user gets a private AI workspace that understands approved context, helps with conversations and tasks, analyzes multimodal inputs, creates/edits artifacts, and uses tools responsibly.

## Non-negotiables
- User data isolation
- User-controlled memory
- No secret exposure
- Honest uncertainty
- Confirmation before impactful external actions
- Auditable changes

## Current tech assumptions
- Frontend: modern React-based web app (implementation may choose TypeScript)
- Backend: API service with strong typed contracts
- Data: relational database for transactional data
- Vector retrieval: pgvector or managed vector store
- Files: private object storage in production
- AI: provider adapter pattern

## Known constraints
- External provider credentials are not embedded.
- Forecasting cannot guarantee future outcomes.
- Image/document capabilities depend on configured providers/libraries.
