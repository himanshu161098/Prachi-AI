# Memory System Specification

## Memory types

1. Conversation memory — short-lived context.
2. User memory — user-approved facts/preferences.
3. Project memory — project-specific context.
4. Knowledge memory — retrieved document/source content.
5. Operational memory — task state and workflow state.

## Rules

- Store only what is needed.
- Mark source and timestamp.
- Allow deletion/export.
- Apply retention/expiry where practical.
- Never cross tenant boundaries.
- Do not store secrets in AI memory.

## Retrieval

Retrieve by relevance + recency + authorization + source quality.

## Memory write policy

Do not automatically convert every conversational statement into permanent memory. Use explicit user action or a transparent memory suggestion/approval flow.
