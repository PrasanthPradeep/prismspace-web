from __future__ import annotations
from pathlib import Path
import json
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from .feature_engineering import FeatureEngineer

class RetrievalRanker:
    """Builds a portable sparse retrieval index; upgrades to FAISS when installed."""
    def fit(self, frame, output: Path, max_samples: int = 20_000) -> dict:
        texts=FeatureEngineer().texts(frame)
        if len(texts) > max_samples:
            rng = np.random.RandomState(42); idx = rng.choice(len(texts), max_samples, replace=False)
            texts = [texts[i] for i in idx]
        vectorizer=TfidfVectorizer(max_features=10000,ngram_range=(1,2)); matrix=vectorizer.fit_transform(texts)
        try:
            import faiss
            dense=matrix.astype(np.float32).toarray(); faiss.normalize_L2(dense); index=faiss.IndexFlatIP(dense.shape[1]); index.add(dense); faiss.write_index(index,str(output));
            import joblib; joblib.dump(vectorizer,output.with_suffix(".vectorizer.joblib")); return {"backend":"faiss","documents":len(texts)}
        except ImportError:
            import joblib; joblib.dump({"vectorizer":vectorizer,"matrix":matrix,"texts":texts},output.with_suffix(".joblib")); return {"backend":"sklearn","documents":len(texts)}
