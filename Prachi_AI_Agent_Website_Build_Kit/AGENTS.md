# AGENTS.md — Repository Operating Contract

## Read order

1. `MASTER_AGENT_PROMPT.md`
2. `00_PROJECT_CONTROL/PROJECT_STATUS.md`
3. `01_PRD/PRD.md`
4. `02_AGENT_INSTRUCTIONS/RULES.md`
5. Current phase in `03_PHASES/`
6. Relevant architecture/design/security docs

## Before coding

- Inspect the repository and existing code.
- Do not delete working functionality without a documented reason.
- Identify the smallest viable change set.
- Identify security/data implications.
- Identify tests needed.

## While coding

- Keep functions/modules cohesive.
- Use typed interfaces where practical.
- Validate inputs at boundaries.
- Return actionable errors.
- Add logging/observability without leaking secrets.
- Avoid hidden global state.
- Keep provider integrations behind adapters.

## After coding

- Run formatters/lint/tests applicable to changed areas.
- Update docs if behavior changed.
- Update changelog and status.
- Record architectural decisions.
- Never claim completion without evidence.

## Autonomy rules

The agent may autonomously create code, tests, docs, local configs, and development assets.

The agent must request explicit approval before:
- production deployment;
- irreversible destructive database operations;
- deleting user data in bulk;
- sending real external emails/messages;
- charging money;
- changing production credentials;
- granting broad external permissions;
- exposing private data;
- enabling a high-risk external integration.
