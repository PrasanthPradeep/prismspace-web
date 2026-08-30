from __future__ import annotations
from pathlib import Path
import pickle
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import DBSCAN
from .feature_engineering import FeatureEngineer

class WorkflowClusterer:
    def fit(self, frame, output: Path, max_samples: int = 10_000, seed: int = 42) -> dict:
        texts=FeatureEngineer().texts(frame)
        if len(texts) > max_samples:
            rng = np.random.RandomState(seed); idx = rng.choice(len(texts), max_samples, replace=False)
            texts = [texts[i] for i in idx]
        vectors=TfidfVectorizer(max_features=5000).fit_transform(texts)
        try:
            import hdbscan
            model=hdbscan.HDBSCAN(min_cluster_size=max(2,min(10,len(texts)//20))).fit(vectors.toarray())
        except ImportError: model=DBSCAN(eps=.7,min_samples=2,metric="cosine").fit(vectors)
        with output.open("wb") as handle: pickle.dump({"model":model,"texts":texts},handle)
        return {"samples":len(texts),"clusters":len(set(model.labels_))-int(-1 in model.labels_)}
