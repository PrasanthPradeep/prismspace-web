from __future__ import annotations
import numpy as np

def classification_metrics(y_true, y_pred, probabilities=None):
    from sklearn.metrics import accuracy_score, brier_score_loss, confusion_matrix, precision_recall_fscore_support, roc_auc_score
    p, r, f, _ = precision_recall_fscore_support(y_true, y_pred, average="weighted", zero_division=0)
    labels = sorted(set(y_true) | set(y_pred))
    per_p, per_r, per_f, support = precision_recall_fscore_support(y_true, y_pred, labels=labels, zero_division=0)
    macro_p, macro_r, macro_f, _ = precision_recall_fscore_support(y_true, y_pred, average="macro", zero_division=0)
    result = {
        "accuracy": float(accuracy_score(y_true, y_pred)), "precision": float(p), "recall": float(r), "f1": float(f),
        "macro_precision": float(macro_p), "macro_recall": float(macro_r), "macro_f1": float(macro_f),
        "labels": labels,
        "per_class": {label: {"precision": float(class_p), "recall": float(class_r), "f1": float(class_f), "support": int(class_support)} for label, class_p, class_r, class_f, class_support in zip(labels, per_p, per_r, per_f, support)},
        "confusion_matrix": confusion_matrix(y_true, y_pred, labels=labels).tolist(),
    }
    if probabilities is not None and len(set(y_true)) > 1:
        probabilities = np.asarray(probabilities)
        try: result["roc_auc"] = float(roc_auc_score(y_true, probabilities, multi_class="ovr", average="weighted"))
        except ValueError: pass
        confidence = probabilities.max(axis=1)
        correct = np.asarray(y_true) == np.asarray(y_pred)
        bins = np.linspace(0.0, 1.0, 11)
        ece = 0.0
        for lower, upper in zip(bins[:-1], bins[1:]):
            mask = (confidence >= lower) & ((confidence < upper) if upper < 1 else (confidence <= upper))
            if mask.any(): ece += float(mask.mean() * abs(correct[mask].mean() - confidence[mask].mean()))
        result["calibration"] = {"expected_calibration_error": ece, "mean_confidence": float(confidence.mean()), "empirical_accuracy": float(correct.mean())}
        if probabilities.shape[1] == 2:
            positive = probabilities[:, 1]
            binary = (np.asarray(y_true) == labels[1]).astype(int)
            result["calibration"]["brier_score"] = float(brier_score_loss(binary, positive))
    return result

def multilabel_metrics(y_true, y_pred, labels):
    from sklearn.metrics import accuracy_score, f1_score, hamming_loss, precision_recall_fscore_support
    p, r, f, _ = precision_recall_fscore_support(y_true, y_pred, average="micro", zero_division=0)
    return {"subset_accuracy": float(accuracy_score(y_true, y_pred)), "micro_precision": float(p), "micro_recall": float(r), "micro_f1": float(f), "macro_f1": float(f1_score(y_true, y_pred, average="macro", zero_division=0)), "hamming_loss": float(hamming_loss(y_true, y_pred)), "labels": list(labels)}

def regression_metrics(y_true, y_pred):
    from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
    return {"mae": float(mean_absolute_error(y_true,y_pred)), "rmse": float(np.sqrt(mean_squared_error(y_true,y_pred))), "r2": float(r2_score(y_true,y_pred))}
