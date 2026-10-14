# Example Agent Task — P03 Memory

Read:
- MASTER_AGENT_PROMPT.md
- AGENTS.md
- 01_PRD/PRD.md
- 02_AGENT_INSTRUCTIONS/RULES.md
- 03_PHASES/P03_MEMORY_PROFILE.md
- 04_MEMORY/*

Objective:
Implement secure user-approved memory with view/edit/delete controls.

Acceptance:
1. Memory belongs to authenticated user.
2. Cross-user reads fail.
3. User can create/update/delete memory.
4. Memory can be injected into chat only after authorization/relevance checks.
5. Tests cover happy path and isolation.
6. Docs/status/changelog are updated.
