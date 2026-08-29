from __future__ import annotations
import numpy as np

def classification_metrics(y_true, y_pred, probabilities=None):
    from sklearn.metrics import accuracy_score, precision_recall_fscore_support, roc_auc_score
    p, r, f, _ = precision_recall_fscore_support(y_true, y_pred, average="weighted", zero_division=0)
    result = {"accuracy": float(accuracy_score(y_true, y_pred)), "precision": float(p), "recall": float(r), "f1": float(f)}
    if probabilities is not None and len(set(y_true)) > 1:
        try: result["roc_auc"] = float(roc_auc_score(y_true, probabilities, multi_class="ovr", average="weighted"))
        except ValueError: pass
    return result

def regression_metrics(y_true, y_pred):
    from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
    return {"mae": float(mean_absolute_error(y_true,y_pred)), "rmse": float(np.sqrt(mean_squared_error(y_true,y_pred))), "r2": float(r2_score(y_true,y_pred))}
