# System Architecture

```text
Browser / Mobile Web
        |
        v
   API Gateway
        |
  Auth + Policy
        |
   AI Orchestrator
    /  |  |  \\
   v   v  v   v  v
 Chat RAG Vision Docs Tools
   |   |    |    |    |
   +---+----+----+----+
            |
     Verification Layer
            |
     Response / Artifact
            |
      User Workspace

Supporting systems:
- relational DB
- vector store
- object storage
- cache/queue
- telemetry
- audit logs
```

## Architectural principles

- Domain-first, provider-agnostic boundaries
- Secure by default
- User/tenant isolation
- Explicit tool contracts
- Observable workflows
- Versioned artifacts
- Replaceable providers
