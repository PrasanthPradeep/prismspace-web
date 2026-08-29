from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Iterable

import numpy as np
import pandas as pd

from .dataset_loader import DatasetLoader

TEXT_CANDIDATES = ["text", "objective", "prompt", "question", "originalprompt", "underspecifiedprompt", "instruction"]

@dataclass
class FeatureSet:
    texts: list[str]
    numeric: np.ndarray


class FeatureEngineer:
    def text_column(self, frame: pd.DataFrame) -> str | None: return DatasetLoader.infer_column(list(frame.columns), TEXT_CANDIDATES)

    def texts(self, frame: pd.DataFrame) -> list[str]:
        column = self.text_column(frame)
        if column: return frame[column].map(DatasetLoader.flatten_value).tolist()
        return frame.apply(lambda row: " ".join(DatasetLoader.flatten_value(x) for x in row.values), axis=1).tolist()

    def numeric(self, texts: Iterable[str]) -> np.ndarray:
        rows = []
        for text in texts:
            rows.append([len(text), len(text.split()), len(re.findall(r"\w+", text)), text.count("?"), text.count("\n")])
        return np.asarray(rows, dtype=np.float32)

    def transform(self, frame: pd.DataFrame) -> FeatureSet:
        texts = self.texts(frame); return FeatureSet(texts, self.numeric(texts))
