import json
import os
import threading
from datetime import datetime
from typing import Dict, Any, Optional

class DPOLogger:
    """
    Direct Preference Optimization (DPO) logger.
    Collects pairwise feedback tuples (prompt, chosen, rejected) along with
    ground-truth annotations and optical metrics for fine-tuning multimodal LLMs.
    """
    def __init__(self, filepath: str = "dpo_training_pairs.jsonl"):
        self.filepath = filepath
        self._lock = threading.Lock()
        # Ensure parent directory exists
        dirname = os.path.dirname(filepath)
        if dirname:
            os.makedirs(dirname, exist_ok=True)

    def log_preference(
        self,
        prompt: str,
        chosen: str,
        rejected: str,
        user_id: str = "user_01",
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Appends a verified preference pair formatted for standard HuggingFace TRL DPOTrainer.
        """
        record = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "user_id": user_id,
            "prompt": prompt,
            "chosen": chosen,
            "rejected": rejected,
            "metadata": metadata or {}
        }
        with self._lock:
            with open(self.filepath, "a", encoding="utf-8") as f:
                f.write(json.dumps(record, ensure_ascii=False) + "\n")
        
        return record

dpo_logger = DPOLogger()
