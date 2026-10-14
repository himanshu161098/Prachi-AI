# RAG Specification

Pipeline:

ingest -> parse -> normalize -> chunk -> embed -> store -> retrieve -> rerank -> cite -> answer

Metadata:
- tenant/user owner
- source URI/path
- document ID
- page/section
- timestamp
- content type
- version

Deletion must propagate to the retrieval index.
