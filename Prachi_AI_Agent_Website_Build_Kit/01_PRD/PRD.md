# PRD — Prachi AI

## 1. Product summary

Prachi AI is a multi-user, personalized, multimodal AI platform combining a general conversational assistant with a virtual personal assistant and AI workspace.

## 2. Vision

Make AI useful at the personal-workspace level: not only answering questions, but understanding authorized context, helping users plan and execute tasks, analyzing information, producing artifacts, and connecting to tools safely.

## 3. Target users

- Students
- Professionals
- Creators
- Developers
- Researchers
- General users who want one personal AI workspace

## 4. Account model

Every authenticated user gets an isolated personal environment containing:
- profile
- preferences
- chats
- memories
- tasks
- files
- projects
- generated artifacts
- permissions

## 5. Memory

Memory is opt-in/user-approved. It supports:
- current conversation context;
- long-term user-approved facts/preferences;
- project context;
- document/knowledge retrieval.

Users must be able to inspect, edit, and delete memories.

## 6. General AI chat

Users can ask questions, request explanations, write/transform content, code, reason over information, and hold multi-turn conversations.

## 7. Vision

Support image upload/camera integrations where available. Capabilities include:
- image understanding;
- object detection;
- OCR;
- image question answering;
- contextual analysis.

## 8. Document intelligence

Support uploads and operations for common office/document formats. Capabilities include:
- extraction;
- summarization;
- question answering;
- structured extraction;
- creation;
- editing;
- export;
- version history.

## 9. ML and prediction

Add a dedicated analytics/forecasting subsystem. Predictions must:
- use appropriate validated data;
- version the model;
- expose feature/data provenance internally;
- label uncertainty;
- never be presented as guaranteed future knowledge.

## 10. Tools and agents

The AI orchestrator may route work to tools such as:
- search/research;
- tasks/reminders;
- calendar;
- email/messaging (with confirmation);
- files;
- calculators;
- code execution/sandboxing;
- data analysis;
- external APIs.

## 11. Voice

Provide voice input/output through an adapter layer so providers can be changed without rewriting the application.

## 12. Research

Research mode should gather sources, compare evidence, synthesize findings, and present citations. Current information should use live retrieval rather than relying on model memory alone.

## 13. Security/privacy

Minimum requirements:
- secure authentication;
- authorization on every protected resource;
- encrypted transport;
- secure secret handling;
- upload validation;
- malware/content scanning where appropriate;
- audit logs;
- rate limits;
- deletion/export controls;
- least-privilege integrations.

## 14. Admin

Admin capabilities may include:
- user management;
- feature flags;
- model/provider settings;
- knowledge-base administration;
- usage metrics;
- audit logs;
- content moderation controls;
- system health.

## 15. Non-goals for initial release

- fully autonomous irreversible actions;
- guaranteed future prediction;
- unrestricted file execution;
- unrestricted internet access;
- unreviewed high-impact decision automation.

## 16. Success criteria

- User can sign up and reach a private workspace.
- User can chat with Prachi AI.
- User can save/manage approved memories.
- User can upload supported documents/images.
- User can analyze supported files.
- User can create/export artifacts.
- Core tools route through an orchestrator.
- Critical paths have tests.
- Deployment is documented and reproducible.
