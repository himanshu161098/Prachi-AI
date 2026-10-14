# Deployment Guide

## Environments
- local
- development
- staging
- production

## Recommended production components
- frontend hosting/CDN;
- API service;
- managed PostgreSQL;
- private object storage;
- vector store/pgvector;
- cache/queue;
- secret manager;
- logging/metrics.

## Deployment sequence
1. build immutable artifacts;
2. run migrations safely;
3. deploy backend;
4. deploy frontend;
5. run smoke tests;
6. enable traffic;
7. monitor.

Production deployment requires human approval unless explicitly delegated.
