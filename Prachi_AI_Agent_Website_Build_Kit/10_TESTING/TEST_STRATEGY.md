# Test Strategy

## Layers
- unit
- API/integration
- database
- authorization/security
- UI component
- end-to-end
- performance
- model/ML evaluation

## Critical flows
- signup/login;
- user isolation;
- chat;
- memory;
- file upload;
- RAG retrieval;
- artifact generation;
- tool confirmation;
- deletion/export.

## Release gate
No critical regression; security smoke tests pass; build succeeds; migrations apply cleanly.
