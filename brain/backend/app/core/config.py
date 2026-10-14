from pydantic_settings import BaseSettings
from typing import Optional
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "OmniCognitive Assistant (Prachi AI V2 Brain)"
    VERSION: str = "2.0.0"
    DEBUG: bool = True
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # API Keys
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    
    # Neo4j Graph Database
    NEO4J_URI: str = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    NEO4J_USER: str = os.getenv("NEO4J_USER", "neo4j")
    NEO4J_PASSWORD: str = os.getenv("NEO4J_PASSWORD", "secretpassword")
    
    # ChromaDB Vector Store
    CHROMA_PERSIST_DIR: str = os.getenv("CHROMA_PERSIST_DIR", "./data/chroma")
    CHROMA_HOST: Optional[str] = os.getenv("CHROMA_HOST", None)
    CHROMA_PORT: int = int(os.getenv("CHROMA_PORT", "8000"))
    
    # Cognitive Agent Policies
    CONFIDENCE_THRESHOLD: float = 0.85
    MAX_RETRIES: int = 2
    
    # DPO Feedback Pipeline
    DPO_LOG_FILE: str = os.getenv("DPO_LOG_FILE", "dpo_training_pairs.jsonl")

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
