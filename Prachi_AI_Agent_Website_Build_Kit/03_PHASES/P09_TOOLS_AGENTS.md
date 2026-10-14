# P09 — Tools + Agent Actions

Goal: let Prachi safely perform useful actions through controlled tools.

Deliverables:
- tool registry;
- tool schemas;
- policy engine;
- confirmation step;
- execution logs;
- timeout/retry controls;
- idempotency where applicable.

Gate:
- no unrestricted tool execution;
- invalid arguments are rejected;
- impactful actions require confirmation;
- tool failures are recoverable.
