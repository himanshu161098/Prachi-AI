from typing import TypedDict, List, Optional, Any, Dict

class AgentState(TypedDict):
    user_id: str
    query: str
    image_data: Optional[str]
    graph_context: List[str]
    vector_context: List[str]
    draft_response: str
    critic_verdict: str  # 'PASS', 'RETRY', 'CLARIFY'
    confidence_score: float
    critic_feedback: str
    retry_count: int
    final_output: str
    action_artifacts: Dict[str, Any]
