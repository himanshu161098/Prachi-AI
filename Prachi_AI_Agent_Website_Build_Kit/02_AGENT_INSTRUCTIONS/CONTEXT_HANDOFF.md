# Context Handoff Protocol

When another agent takes over:

1. Read `PROJECT_STATUS.md`.
2. Read the latest `TASK_LOG.md` entries.
3. Read the latest `DECISION_LOG.md` entries.
4. Read `PROJECT_MEMORY.md`.
5. Read `CHANGELOG.md`.
6. Read the current phase and deferred work.
7. Run the smoke test before modifying code.

The outgoing agent must leave enough evidence for the incoming agent to reproduce the current state.
