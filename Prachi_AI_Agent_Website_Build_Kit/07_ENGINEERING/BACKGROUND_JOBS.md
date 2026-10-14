# Background Jobs

Long-running jobs should be asynchronous:
- document parsing;
- embeddings;
- large exports;
- image generation;
- ML training;
- research.

Jobs need:
- ID;
- status;
- progress;
- retry policy;
- timeout;
- cancellation where practical;
- error details safe for users;
- audit trail.
