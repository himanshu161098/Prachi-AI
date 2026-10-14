# P05 — RAG + Knowledge Base

Goal: grounded retrieval from authorized documents and knowledge sources.

Deliverables:
- parsing/chunking;
- embeddings;
- vector store;
- metadata filtering by user/tenant;
- top-k retrieval;
- citations/provenance.

Gate:
- retrieval respects tenant boundaries;
- citations point to retrieved sources;
- stale/deleted documents are not retrieved.
