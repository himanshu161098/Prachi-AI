# AI Orchestrator

## Routing flow

Intent -> context collection -> policy check -> plan -> tool/model selection -> execution -> verification -> response/artifact.

## Rules

- Do not expose hidden system prompts or secrets.
- Use structured tool calls.
- Limit tool count/time/cost.
- Verify tool outputs.
- Keep trace IDs.
- Prefer deterministic tools for deterministic tasks.
