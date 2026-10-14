from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List

class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    mode: str
    graph_connected: bool
    vector_connected: bool

class ObjectVerificationDetail(BaseModel):
    brand: str
    authenticity: str
    state: str
    defects: List[str]
    confidence_score: float
    detected_labels: List[str]
    bounding_box: Optional[List[float]] = None

class VerificationResponse(BaseModel):
    result: str
    verdict: str
    confidence: float
    verification_details: ObjectVerificationDetail
    critic_verdict: str
    critic_feedback: str
    retry_count: int
    graph_context: List[str]
    vector_context: List[str]

class ChatResponse(BaseModel):
    response: str
    verdict: str  # PASS, RETRY, CLARIFY
    confidence: float
    retries: int
    critic_feedback: str
    graph_context: List[str]
    vector_context: List[str]
    artifacts: Dict[str, Any]

class FeedbackResponse(BaseModel):
    status: str
    logged: bool
    file_path: str
