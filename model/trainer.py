from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Literal
import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import LabelEncoder, MultiLabelBinarizer, StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import IsolationForest
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier, XGBRegressor

def _xgb_device() -> str:
    """Return 'cuda' if a CUDA GPU is available, else 'cpu'."""
    try:
        import xgboost as xgb
        # XGBoost >= 2.0 raises an error on fit() if CUDA is unavailable;
        # probing here keeps the rest of the code simple.
        probe = xgb.XGBRegressor(device='cuda', n_estimators=1, verbosity=0)
        import numpy as _np
        probe.fit(_np.zeros((2, 1)), _np.zeros(2))
        return 'cuda'
    except Exception:
        return 'cpu'

from .dataset_loader import DatasetLoader
from .feature_engineering import FeatureEngineer
from .metrics import classification_metrics, regression_metrics
from .utils import get_logger, write_json

LOG = get_logger(__name__)
TARGETS = {"intent": ["intentlabel", "intent", "ability", "type", "category"], "agent": ["agentlabel"], "provider": ["providerlabel"], "success": ["successlabel", "success", "outcome", "completed", "status"], "approval": ["approvallabel", "approval", "approved", "humanapproval", "ambiguityclass"], "latency": ["latencylabel", "latency", "duration", "executiontime"], "cost": ["costlabel", "cost", "tokencost", "price"]}

@dataclass
class TrainResult: model_name: str; trained: bool; reason: str = ""; metrics: dict | None = None

class TabularTrainer:
    def __init__(self, name: str, task: Literal["classification","regression","multilabel"], output_dir: Path, seed: int=42):
        self.name, self.task, self.output_dir, self.seed = name, task, output_dir, seed

    def fit(self, frame: pd.DataFrame, target: str | None = None) -> TrainResult:
        target = target or DatasetLoader.infer_column(list(frame.columns), TARGETS.get(self.name, [self.name]))
        if not target: return TrainResult(self.name, False, f"No compatible label column for {self.name}")
        y = frame[target].astype(str)
        valid = ~y.str.strip().isin(["", "nan", "None"])
        frame, y = frame.loc[valid].copy(), y.loc[valid].copy()
        if self.task == "regression":
            y = pd.to_numeric(frame[target], errors="coerce"); keep = y.notna(); frame, y = frame.loc[keep], y.loc[keep]
        if len(y) < 8 or y.nunique() < 2: return TrainResult(self.name, False, "Need at least 8 rows and 2 target values")
        features = FeatureEngineer().transform(frame)
        X = pd.DataFrame({"text": features.texts, **{f"numeric_{i}": features.numeric[:,i] for i in range(features.numeric.shape[1])}})
        num_cols = [c for c in X if c != "text"]
        preprocessor = ColumnTransformer([("text", TfidfVectorizer(ngram_range=(1,2), max_features=10000, token_pattern=r"(?u)\b\w+\b"), "text"), ("num", Pipeline([("impute",SimpleImputer()),("scale",StandardScaler())]), num_cols)])
        num_only_preprocessor = ColumnTransformer([("num", Pipeline([("impute",SimpleImputer()),("scale",StandardScaler())]), num_cols)])
        if self.task == "multilabel":
            labels = y.map(lambda v: [x.strip() for x in v.strip("[]").replace("'", "").split(",") if x.strip()]); encoder = MultiLabelBinarizer(); encoded = encoder.fit_transform(labels)
            from sklearn.multiclass import OneVsRestClassifier
            estimator = OneVsRestClassifier(LogisticRegression(max_iter=1000, class_weight="balanced")); model = Pipeline([("features",preprocessor),("model",estimator)])
            try: model.fit(X, encoded)
            except ValueError:
                LOG.warning("%s: TF-IDF produced empty vocabulary; falling back to numeric-only features.", self.name)
                model = Pipeline([("features",num_only_preprocessor),("model",estimator)]); model.fit(X, encoded)
            bundle={"model":model,"label_encoder":encoder,"target":target}; metrics={"samples":len(y),"labels":len(encoder.classes_)}
        else:
            label_enc = None
            stratify = y if self.task == "classification" and y.value_counts().min() >= 2 else None
            Xtr, Xte, ytr, yte = train_test_split(X,y,test_size=.2,random_state=self.seed,stratify=stratify)
            if self.task == "classification":
                label_enc = LabelEncoder()
                ytr = pd.Series(label_enc.fit_transform(ytr), index=ytr.index)
                known = yte.isin(label_enc.classes_).values; Xte, yte = Xte[known], yte[known]
                yte = pd.Series(label_enc.transform(yte), index=yte.index)
            device = _xgb_device()
            LOG.info("%s: XGBoost device = %s", self.name, device)
            estimator = XGBClassifier(n_estimators=100, max_depth=6, learning_rate=0.1, device=device, random_state=self.seed, verbosity=0, eval_metric='mlogloss') if self.task == "classification" else XGBRegressor(n_estimators=100, max_depth=6, learning_rate=0.1, device=device, random_state=self.seed, verbosity=0)
            try: model=Pipeline([("features",preprocessor),("model",estimator)]); model.fit(Xtr,ytr)
            except ValueError as exc:
                if "empty vocabulary" not in str(exc): raise
                LOG.warning("%s: TF-IDF produced empty vocabulary; falling back to numeric-only features.", self.name)
                model=Pipeline([("features",num_only_preprocessor),("model",estimator)]); model.fit(Xtr,ytr)
            pred=model.predict(Xte)
            if label_enc is not None:
                pred_labels = label_enc.inverse_transform(pred); yte_labels = label_enc.inverse_transform(yte)
                metrics = classification_metrics(yte_labels, pred_labels, model.predict_proba(Xte))
            else:
                metrics = regression_metrics(yte, pred)
            bundle={"model":model,"target":target,"task":self.task,"label_encoder":label_enc}
        artifact_names = {"intent": "intent_classifier", "agent": "agent_router", "provider": "model_router", "success": "workflow_success_predictor", "approval": "approval_predictor", "latency": "latency_predictor", "cost": "cost_predictor"}
        path=self.output_dir / f"{artifact_names.get(self.name, self.name + '_predictor')}.joblib"; joblib.dump(bundle,path); write_json(self.output_dir / "logs" / f"{self.name}_metrics.json",metrics)
        return TrainResult(self.name,True,metrics=metrics)

    def fit_anomaly(self, frame: pd.DataFrame) -> TrainResult:
        x=FeatureEngineer().transform(frame).numeric; model=IsolationForest(random_state=self.seed, contamination="auto").fit(x); joblib.dump({"model":model},self.output_dir/"anomaly_detector.joblib"); return TrainResult("anomaly",True,metrics={"samples":len(x)})
