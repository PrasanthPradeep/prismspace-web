"""Dataset readiness audit for reproducible PrismSpace model training."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from .dataset_loader import DatasetLoader


def main() -> None:
    parser = argparse.ArgumentParser(description="Report files and rows the model trainer can use.")
    parser.add_argument("--dataset-dir", default="model/datasets")
    parser.add_argument("--max-rows-per-file", type=int, default=50_000)
    parser.add_argument("--no-documents", action="store_true")
    parser.add_argument("--include-test-datasets", action="store_true", help="Audit test_datasets as trainable inputs (normally excluded).")
    parser.add_argument("--output", help="Optional JSON report path.")
    args = parser.parse_args()

    report = DatasetLoader(
        Path(args.dataset_dir), args.max_rows_per_file, include_documents=not args.no_documents,
        exclude_test_datasets=not args.include_test_datasets,
    ).audit()
    summary = {key: report[key] for key in (
        "dataset_dir", "max_rows_per_file", "include_documents", "exclude_test_datasets", "supported_files",
        "retained_rows", "unreadable_files", "skipped_files",
    )}
    print(json.dumps(summary, indent=2))
    if args.output:
        target = Path(args.output)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(json.dumps(report, indent=2), encoding="utf-8")
        print(f"Detailed audit: {target}")


if __name__ == "__main__":
    main()
