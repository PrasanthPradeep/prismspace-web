from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
import os


def _default_device() -> str:
    visible_devices = os.environ.get("CUDA_VISIBLE_DEVICES")
    if visible_devices is not None:
        return "cuda" if visible_devices.strip() not in {"", "-1"} else "cpu"
    try:
        import torch
        return "cuda" if torch.cuda.is_available() else "cpu"
    except ImportError:
        return "auto"


@dataclass(frozen=True)
class Settings:
    root: Path = Path(__file__).resolve().parent
    dataset_dir: Path = root / "datasets"
    output_dir: Path = root / "artifacts"
    seed: int = 42
    test_size: float = 0.2
    embedding_model: str = "BAAI/bge-m3"
    fallback_embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    batch_size: int = 32
    epochs: int = 3
    max_length: int = 384
    device: str = field(default_factory=_default_device)

    def ensure_directories(self) -> None:
        self.output_dir.mkdir(parents=True, exist_ok=True)
        (self.output_dir / "logs").mkdir(exist_ok=True)
        (self.output_dir / "checkpoints").mkdir(exist_ok=True)


SETTINGS = Settings()
