from app.agents.state import AgentState
from app.agents.nodes.retriever import neo4j_memory, chroma_memory
import logging

logger = logging.getLogger("node_writeback")

def memory_writeback_node(state: AgentState) -> dict:
    """
    Memory Writeback Node:
    Commits validated facts, verified entities, and confirmed agent deductions
    back into the Neo4j Knowledge Graph and ChromaDB episodic memory.
    """
    user_id = state.get("user_id", "user_01")
    query = state.get("query", "")
    final_output = state.get("final_output", "")
    action_artifacts = state.get("action_artifacts", {})
    confidence = state.get("confidence_score", 0.90)

    try:
        # 1. Write verification details to Neo4j if multimodal verification took place
        if "verification" in action_artifacts:
            v = action_artifacts["verification"]
            entity_name = v.get("entity_name", "Target Object")
            status = v.get("state", "Verified")
            attributes = {
                "brand": v.get("brand", "OEM"),
                "authenticity": v.get("authenticity", "Verified"),
                "confidence": str(confidence),
                "defects_count": str(len(v.get("defects", [])))
            }
            neo4j_memory.link_entity_verification(user_id, entity_name, status, attributes)
            logger.info("Committed verified entity '%s' to Neo4j for user '%s'", entity_name, user_id)

        # 2. Commit episodic memory to ChromaDB
        summary_text = f"User Query: {query} | Agent Deduction: {final_output[:250]}"
        chroma_memory.add_memory(
            user_id=user_id,
            text=summary_text,
            metadata={"confidence": confidence, "verdict": state.get("critic_verdict", "PASS")}
        )
        logger.info("Committed interaction summary to ChromaDB episodic store.")
    except Exception as e:
        logger.error("Memory writeback encountered error: %s", e)

    return {}
