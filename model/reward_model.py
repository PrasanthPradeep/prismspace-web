from __future__ import annotations
from pathlib import Path
from .trainer import TabularTrainer, TrainResult

class RewardModel(TabularTrainer):
    """Pairwise preference adapter. Uses ORPO only when chosen/rejected fields are present."""
    def __init__(self, output_dir, seed=42): super().__init__("reward", "classification", output_dir, seed)
    def fit_preferences(self, frame) -> TrainResult:
        chosen=next((c for c in frame if c.lower() in {"_chosen","chosen","accepted","preferred"}),None); rejected=next((c for c in frame if c.lower() in {"_rejected","rejected","dispreferred"}),None)
        if not chosen or not rejected: return TrainResult("reward",False,"No chosen/rejected preference pairs; ORPO training skipped")
        # TRL ORPO is intentionally optional to keep tabular orchestration training usable without an LLM checkpoint.
        return TrainResult("reward",False,"Preference pairs detected; run a TRL ORPO fine-tune with a licensed base model")
