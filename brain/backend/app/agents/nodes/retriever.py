from app.agents.state import AgentState
from app.memory.neo4j_client import Neo4jMemory
from app.memory.vector_store import ChromaVectorMemory
from app.core.config import settings
import logging

logger = logging.getLogger("node_retriever")

# Global singleton memory instances
neo4j_memory = Neo4jMemory(settings.NEO4J_URI, settings.NEO4J_USER, settings.NEO4J_PASSWORD)
chroma_memory = ChromaVectorMemory(persist_directory=settings.CHROMA_PERSIST_DIR, host=settings.CHROMA_HOST, port=settings.CHROMA_PORT)

def graphrag_retriever_node(state: AgentState) -> dict:
    """
    Hybrid GraphRAG Node:
    Queries Neo4j for structural entity relations, owner policies, and prior human corrections.
    Queries ChromaDB for episodic and conversational similarity matches.
    """
    user_id = state.get("user_id", "user_01")
    query = state.get("query", "")

    # 1. Neo4j Knowledge Graph retrieval
    try:
        graph_facts = neo4j_memory.get_user_context(user_id)
    except Exception as e:
        logger.error("Neo4j retriever error: %s", e)
        graph_facts = ["Neo4j fallback: Standard user authorization; high certainty required."]

    # 2. ChromaDB Vector memory retrieval
    try:
        vector_facts = chroma_memory.search_memory(user_id, query, limit=3)
    except Exception as e:
        logger.error("Chroma retriever error: %s", e)
        vector_facts = ["Vector fallback: User prefers concise, verifiable insights with citations."]

    return {
        "graph_context": graph_facts,
        "vector_context": vector_facts
    }
