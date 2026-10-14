from langgraph.graph import StateGraph, END
from app.agents.state import AgentState
from app.agents.nodes.retriever import graphrag_retriever_node
from app.agents.nodes.actor import actor_node
from app.agents.nodes.critic import critic_node
from app.agents.nodes.writeback import memory_writeback_node
import logging

logger = logging.getLogger("agent_graph")

def route_critic(state: AgentState) -> str:
    """
    Conditional edge router based on critic's verification verdict.
    """
    verdict = state.get("critic_verdict", "PASS")
    if verdict == "RETRY":
        return "actor"
    elif verdict == "CLARIFY":
        return END
    return "memory_writeback"

# 1. Initialize StateGraph with typed state
builder = StateGraph(AgentState)

# 2. Add cognitive pipeline nodes
builder.add_node("graphrag_retriever", graphrag_retriever_node)
builder.add_node("actor", actor_node)
builder.add_node("critic", critic_node)
builder.add_node("memory_writeback", memory_writeback_node)

# 3. Define execution flow & edges
builder.set_entry_point("graphrag_retriever")
builder.add_edge("graphrag_retriever", "actor")
builder.add_edge("actor", "critic")

# 4. Conditional reflection loop edge
builder.add_conditional_edges(
    "critic",
    route_critic,
    {
        "actor": "actor",
        "memory_writeback": "memory_writeback",
        END: END
    }
)
builder.add_edge("memory_writeback", END)

# 5. Compile into runnable agent graph
compiled_agent = builder.compile()

async def run_omni_agent(user_id: str, query: str, image_data: str = None) -> AgentState:
    """
    Convenience async invoker for the compiled LangGraph workflow.
    """
    initial_state: AgentState = {
        "user_id": user_id,
        "query": query,
        "image_data": image_data,
        "graph_context": [],
        "vector_context": [],
        "draft_response": "",
        "critic_verdict": "",
        "confidence_score": 0.0,
        "critic_feedback": "",
        "retry_count": 0,
        "final_output": "",
        "action_artifacts": {}
    }
    return await compiled_agent.ainvoke(initial_state)
