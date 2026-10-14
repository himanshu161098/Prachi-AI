# API Conventions

- JSON unless binary transfer is required.
- Version public APIs.
- Validate input at the boundary.
- Consistent error shape.
- Pagination for large collections.
- Idempotency for retried writes where relevant.
- Correlation/request ID for observability.
- Never return secrets.
- Authorization is mandatory on protected endpoints.
