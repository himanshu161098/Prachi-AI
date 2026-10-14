# Security Baseline

## Authentication
- modern password hashing or managed identity provider;
- secure sessions/tokens;
- MFA-ready architecture.

## Authorization
- server-side ownership checks;
- least privilege;
- admin separation;
- deny by default.

## Data
- TLS in transit;
- encryption at rest where supported;
- private object storage;
- secret manager in production.

## Files
- MIME/extension validation;
- size limits;
- malware scanning where appropriate;
- parser isolation for untrusted formats.

## AI/tool security
- tool allowlist;
- argument validation;
- SSRF protection for URL tools;
- command execution sandboxing;
- rate/cost limits;
- prompt injection defenses in retrieval/tool layers.

## Monitoring
- audit logs;
- auth anomaly detection;
- rate-limit events;
- provider errors;
- security alerts.
