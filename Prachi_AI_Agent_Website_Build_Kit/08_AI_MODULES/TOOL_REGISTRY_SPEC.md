# Tool Registry Specification

Each tool should declare:
- tool ID;
- description;
- JSON schema/input contract;
- auth requirements;
- risk level;
- confirmation requirement;
- timeout;
- retry policy;
- idempotency;
- audit events.

Example tools:
search, calculator, file_read, file_write, task_create, calendar_read, calendar_write, email_draft, email_send, code_sandbox, spreadsheet_analyze.
