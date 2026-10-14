# Rules for the Coding Agent

## Architecture

- Use adapters for AI providers, search providers, speech, vision, storage, and external connectors.
- Keep domain logic independent of provider SDKs.
- Do not mix authorization with business logic in ways that make audits difficult.

## Data

- Every tenant-owned table must carry an ownership/tenant relation.
- Every read/write path must enforce ownership.
- Use migrations for schema changes.

## AI

- The model is a component, not the application.
- Never give the model direct unrestricted database or shell access.
- Tool arguments must be validated server-side.
- Tool execution must have explicit policy checks.
- Store useful provenance for retrieval, generation, and prediction.

## UX

- Handle loading, empty, error, success, and partial-result states.
- Keep destructive actions confirmable.
- Preserve user drafts where practical.
- Make artifact versions visible.

## Testing

Minimum expectation for critical features:
- unit test;
- integration/API test;
- authorization test;
- one negative/error case.

## Documentation

Update docs when behavior, endpoints, schemas, deployment, or architecture changes.
