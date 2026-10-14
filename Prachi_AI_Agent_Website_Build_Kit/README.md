# Prachi AI — Agent-Ready Website Factory Build Kit

This kit is designed to be handed to a capable coding agent so the agent can build, test, document, and prepare a complete production-oriented website/application from a single source of truth.

## Primary goal

Build **Prachi AI** as a multi-user, personalized, multimodal AI virtual personal assistant + general AI chatbot. The system should be able to evolve into a full AI workspace where users can chat, plan, remember, research, analyze images/documents, create/edit files, use tools, and receive data-based forecasts.

## How to use this kit

1. Give the entire folder or ZIP to your coding agent.
2. Tell the agent to read `MASTER_AGENT_PROMPT.md` first.
3. Require the agent to read `AGENTS.md`, `00_PROJECT_CONTROL/PROJECT_STATUS.md`, `01_PRD/PRD.md`, `02_AGENT_INSTRUCTIONS/OUTPUT_CONTRACT.md`, and the current phase file before changing code.
4. The agent must execute phases in order and pass the gate/checklist before moving to the next phase.
5. The agent must update memory, decisions, changelog, project status, and tests as it works.
6. The agent must never silently drop requirements. Deferred work must be recorded in `03_PHASES/DEFERRED_WORK.md`.

## What this kit contains

- Product requirements document (PRD)
- Master agent prompt
- Agent operating rules
- Phase-by-phase execution plan
- Project memory protocol
- Architecture and ADR templates
- Design system and UX rules
- Backend/frontend/API/data guidance
- AI orchestration, RAG, memory, vision, document, voice, tool and prediction modules
- Security/privacy/compliance guidance
- Testing strategy and acceptance criteria
- Deployment and operations runbooks
- Definition of Done and quality gates
- Changelog and decision records
- Context packs for handing the project between agents
- Reusable templates for future websites
- Example task files
- CI workflow starter

## Key principle

The agent is not only a coder. It acts as a **planner + product engineer + designer + tester + documentation maintainer + release engineer**, but must follow the source-of-truth documents and explicit approval gates.

## Important limitation

No documentation kit can guarantee that an agent will build an entire production system without external dependencies, credentials, infrastructure, or human review. This kit is structured to maximize autonomous execution while keeping risky, irreversible, security-sensitive, or expensive actions behind explicit gates.
