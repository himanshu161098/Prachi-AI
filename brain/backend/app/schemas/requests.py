from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List

class ChatRequest(BaseModel):
    query: str = Field(..., description="User query or command for the autonomous agent")
    user_id: str = Field(default="user_01", description="Tenant or user identifier")
    session_id: Optional[str] = Field(default=None, description="Optional conversational session ID")
    image_data: Optional[str] = Field(default=None, description="Base64 or image URI for multimodal context")

class VerifyObjectRequest(BaseModel):
    user_id: str = Field(default="user_01", description="User identifier")
    entity_name: Optional[str] = Field(default="Target Object", description="Expected or known entity name")
    category: Optional[str] = Field(default="General", description="Expected category")
    image_base64: Optional[str] = Field(default=None, description="Base64 encoded image string")

class FeedbackRequest(BaseModel):
    prompt: str = Field(..., description="Prompt that generated the agent response")
    chosen: str = Field(..., description="Preferred or corrected response")
    rejected: str = Field(..., description="Disapproved response")
    user_id: str = Field(default="user_01", description="User ID providing feedback")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Contextual metadata for DPO training")

class CorrectionRequest(BaseModel):
    user_id: str = Field(default="user_01", description="User ID providing ground-truth correction")
    entity_name: str = Field(..., description="Name of the entity being corrected")
    correction: str = Field(..., description="Ground truth correction text to write into Neo4j")
