from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

import numpy as np
from sklearn.preprocessing import LabelEncoder

from model.dataset_loader import DatasetLoader
from model.predict import _decode_prediction
from model.trainer import _xgb_device


class DatasetPipelineTests(unittest.TestCase):
    def test_loader_and_audit_cover_records_and_optional_documents(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "records.jsonl").write_text(
                '{"text":"deploy", "type":"text classification"}\n'
                '{"objective":"fix deploy", "selected_agents":"github", "provider":"nvidia", "success":true, "latency_ms":42}\n',
                encoding="utf-8",
            )
            (root / "guide.md").write_text("# Deployment guide\n", encoding="utf-8")

            included = DatasetLoader(root, include_documents=True)
            loaded = included.load()
            self.assertEqual(len(loaded), 3)
            self.assertIn(42.0, set(loaded["_latency_label"].replace("", float("nan")).astype(float).dropna()))
            report = included.audit()
            self.assertEqual(report["supported_files"], 2)
            self.assertEqual(report["retained_rows"], 3)

            excluded = DatasetLoader(root, include_documents=False)
            self.assertEqual(len(excluded.load()), 2)

    def test_prediction_labels_are_decoded(self) -> None:
        encoder = LabelEncoder().fit(["coding", "research"])
        decoded = _decode_prediction({"label_encoder": encoder}, np.array([1]))
        self.assertEqual(decoded, ["research"])

    def test_xgboost_device_probe_has_safe_result(self) -> None:
        self.assertIn(_xgb_device(), {"cpu", "cuda"})


if __name__ == "__main__":
    unittest.main()
