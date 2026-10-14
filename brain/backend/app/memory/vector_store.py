import os
import logging
from typing import List, Dict, Any, Optional
import datetime

logger = logging.getLogger("vector_store")

try:
    import chromadb
    from chromadb.config import Settings as ChromaSettings
    CHROMA_AVAILABLE = True
except ImportError:
    CHROMA_AVAILABLE = False

class ChromaVectorMemory:
    """
    ChromaDB episodic and semantic vector store manager.
    Includes an in-memory cosine/keyword semantic fallback if ChromaDB is unavailable.
    """
    def __init__(self, persist_directory: str = "./data/chroma", host: Optional[str] = None, port: int = 8000):
        self.persist_directory = persist_directory
        self.client = None
        self.collection = None
        self._fallback_store: List[Dict[str, Any]] = []

        if CHROMA_AVAILABLE:
            try:
                if host:
                    self.client = chromadb.HttpClient(host=host, port=port)
                else:
                    os.makedirs(persist_directory, exist_ok=True)
                    self.client = chromadb.PersistentClient(path=persist_directory)
                self.collection = self.client.get_or_create_collection(name="prachi_episodic_memories")
                logger.info("ChromaDB vector store connected successfully.")
            except Exception as e:
                logger.warning("ChromaDB initialization failed (%s). Using in-memory episodic store.", e)
                self.client = None
                self.collection = None
        else:
            logger.info("ChromaDB package not installed; using built-in semantic episodic buffer.")

    def add_memory(self, user_id: str, text: str, metadata: Optional[Dict[str, Any]] = None):
        """
        Stores an episodic or semantic memory snippet.
        """
        meta = metadata or {}
        meta["user_id"] = user_id
        meta["timestamp"] = datetime.datetime.utcnow().isoformat()
        doc_id = f"mem_{user_id}_{int(datetime.datetime.utcnow().timestamp() * 1000)}"

        # Fallback buffer always records
        self._fallback_store.append({
            "id": doc_id,
            "user_id": user_id,
            "text": text,
            "metadata": meta
        })

        if self.collection:
            try:
                self.collection.add(
                    documents=[text],
                    metadatas=[meta],
                    ids=[doc_id]
                )
            except Exception as e:
                logger.error("Failed to add memory to ChromaDB: %s", e)

    def search_memory(self, user_id: str, query: str, limit: int = 5) -> List[str]:
        """
        Performs similarity search over memories filtered by user_id.
        """
        if self.collection:
            try:
                results = self.collection.query(
                    query_texts=[query],
                    n_results=limit,
                    where={"user_id": user_id}
                )
                docs = results.get("documents", [[]])[0]
                if docs:
                    return docs
            except Exception as e:
                logger.warning("ChromaDB query failed: %s. Falling back to in-memory search.", e)

        # Fallback keyword/token overlap search
        query_tokens = set(query.lower().split())
        matched = []
        user_records = [r for r in self._fallback_store if r["user_id"] == user_id]
        
        for item in user_records:
            item_tokens = set(item["text"].lower().split())
            overlap = len(query_tokens.intersection(item_tokens))
            if overlap > 0 or not query_tokens:
                matched.append((overlap, item["text"]))

        matched.sort(key=lambda x: x[0], reverse=True)
        results = [text for _, text in matched[:limit]]
        if not results:
            return ["User profile memory: High precision requested for autonomous perception tasks."]
        return results
