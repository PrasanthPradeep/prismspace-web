"""Run exported PrismSpace routing models against a held-out dataset folder."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from .dataset_loader import DatasetLoader
from .feature_engineering import FeatureEngineer
from .predict import _decode_prediction
from .utils import write_json


def _feature_frame(frame: pd.DataFrame) -> pd.DataFrame:
    features = FeatureEngineer().transform(frame)
    return pd.DataFrame({
        "text": features.texts,
        **{f"numeric_{index}": features.numeric[:, index] for index in range(features.numeric.shape[1])},
    })


def _confidences(model, features: pd.DataFrame, rows: int) -> list[float | None]:
    if not hasattr(model, "predict_proba"):
        return [None] * rows
    try:
        probabilities = model.predict_proba(features)
        if isinstance(probabilities, list):
            return [max(float(item[row].max()) for item in probabilities) for row in range(rows)]
        return [float(row.max()) for row in probabilities]
    except Exception:
        return [None] * rows


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate routing predictions for held-out benchmark files.")
    parser.add_argument("--dataset-dir", default="model/datasets/test_datasets")
    parser.add_argument("--artifacts-dir", default="model/artifacts")
    parser.add_argument("--output-dir", default="model/artifacts/holdout_evaluation")
    parser.add_argument("--max-rows-per-file", type=int, default=50_000)
    args = parser.parse_args()

    source = Path(args.dataset_dir)
    output = Path(args.output_dir)
    output.mkdir(parents=True, exist_ok=True)
    # GAIA ships one full metadata file plus per-level copies and many task
    # attachments. Evaluate only canonical task records; attachments are input
    # resources for an end-to-end agent, not independent routing prompts.
    files = [path for path in source.rglob("*.parquet") if path.name == "metadata.parquet"]
    files.extend(path for path in source.rglob("*.parquet") if path.name.startswith("test-") and "SWE-bench" in str(path))
    if not files:
        raise FileNotFoundError(f"No GAIA metadata or SWE-bench Parquet files found under {source}")
    frame = DatasetLoader(source, args.max_rows_per_file).load_files(sorted(files))
    features = _feature_frame(frame)
    records = [
        {"source_file": str(item), "text": str(text)[:2_000], "models": {}}
        for item, text in zip(frame["_source_file"], features["text"])
    ]
    model_reports: list[dict[str, object]] = []

    expected_artifacts = {
        "intent_classifier.joblib", "agent_router.joblib", "model_router.joblib",
        "workflow_success_predictor.joblib", "approval_predictor.joblib",
        "latency_predictor.joblib", "cost_predictor.joblib", "anomaly_detector.joblib",
    }
    for path in sorted(Path(args.artifacts_dir).glob("*.joblib")):
        if path.name not in expected_artifacts:
            continue
        try:
            bundle = joblib.load(path)
            model = bundle["model"]
            model_features = features[[column for column in features if column != "text"]].to_numpy() if path.name == "anomaly_detector.joblib" else features
            prediction = _decode_prediction(bundle, model.predict(model_features))
            confidence = _confidences(model, model_features, len(frame))
            target = bundle.get("target")
            # GAIA and SWE-bench provide answers / patches, not the product's
            # routing, provider, cost, or success labels. Canonical labels are
            # inference fallbacks, so they must never be reported as ground
            # truth coverage.
            labelled = 0
            for index, value in enumerate(prediction):
                records[index]["models"][path.stem] = {"prediction": value, "confidence": confidence[index]}
            model_reports.append({"model": path.name, "loaded": True, "target": target, "labelled_rows": labelled})
        except Exception as exc:
            model_reports.append({"model": path.name, "loaded": False, "error": str(exc)})

    predictions_path = output / "predictions.jsonl"
    with predictions_path.open("w", encoding="utf-8") as handle:
        for record in records:
            handle.write(json.dumps(record, ensure_ascii=False) + "\n")
    report = {
        "dataset_dir": str(source),
        "rows": len(frame),
        "source_files": int(frame["_source_file"].nunique()),
        "predictions": str(predictions_path),
        "models": model_reports,
        "note": "This evaluates routing-model coverage. GAIA and SWE-bench answer/pass-rate scoring requires running the Hive agent with each benchmark's task harness.",
    }
    write_json(output / "holdout_report.json", report)
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
