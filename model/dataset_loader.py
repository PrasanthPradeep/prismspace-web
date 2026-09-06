from __future__ import annotations

import json
from pathlib import Path
from typing import Any
import xml.etree.ElementTree as ET

import pandas as pd

from .utils import get_logger, jsonable
from .label_taxonomy import normalize_agent_label, normalize_intent_label, normalize_provider_label

LOG = get_logger(__name__)
SUPPORTED = {
    ".bed", ".bib", ".bst", ".cff", ".csv", ".fa", ".fai", ".gtf", ".html",
    ".json", ".jsonl", ".kreport", ".md", ".parquet", ".sizes", ".sty", ".tex",
    ".tsv", ".txt", ".vcf", ".xml", ".xsd", ".yaml", ".yml", ".gz",
}
IGNORED = {
    "", ".gif", ".gitattributes", ".gitignore", ".jpg", ".mplstyle", ".png",
    ".py", ".sh", ".toml",
}
TABULAR_TEXT = {".bed", ".gtf", ".kreport", ".sizes", ".tsv", ".vcf"}
LINE_TEXT = {".bib", ".bst", ".cff", ".fa", ".fai", ".html", ".md", ".sty", ".tex", ".txt", ".yaml", ".yml"}
DOCUMENT_EXTENSIONS = LINE_TEXT | {".xml", ".xsd"}
MAX_STRUCTURED_COLUMNS = 200
MAX_TEXT_CHARS = 20_000


class DatasetLoader:
    """Recursively loads tabular and record-oriented datasets without schema assumptions."""
    def __init__(self, root: Path, max_rows_per_file: int = 50_000, include_documents: bool = True, exclude_test_datasets: bool = False) -> None:
        self.root, self.max_rows_per_file = root, max_rows_per_file
        self.include_documents = include_documents
        self.exclude_test_datasets = exclude_test_datasets
        self.read_errors: dict[str, str] = {}

    def scan(self) -> list[Path]:
        return [
            p for p in self.root.rglob("*")
            if p.is_file() and p.suffix.lower() in SUPPORTED and self._supported(p)
            and (self.include_documents or p.suffix.lower() not in DOCUMENT_EXTENSIONS)
            and (not self.exclude_test_datasets or "test_datasets" not in p.relative_to(self.root).parts)
        ]

    def skipped(self) -> list[Path]:
        return [p for p in self.root.rglob("*") if p.is_file() and p.suffix.lower() in IGNORED]

    def load(self) -> pd.DataFrame:
        return self.load_files(self.scan())

    def load_files(self, paths: list[Path]) -> pd.DataFrame:
        """Load an explicit file list, used by benchmark evaluators with manifests."""
        self.read_errors = {}
        LOG.info("Discovered %d supported dataset files (limit: %d rows per file).", len(paths), self.max_rows_per_file)
        frames: list[pd.DataFrame] = []
        for index, path in enumerate(paths, start=1):
            LOG.info("[%d/%d] Loading %s", index, len(paths), path.relative_to(self.root))
            frame = self._read(path)
            if not frame.empty:
                LOG.info("[%d/%d] Retained %d rows", index, len(paths), len(frame))
                frames.append(frame)
        if not frames: raise FileNotFoundError(f"No supported records found under {self.root}")
        LOG.info("Combining %d loaded datasets.", len(frames))
        data = pd.concat(frames, ignore_index=True, sort=False).replace({None: ""}).fillna("")
        result = self._canonicalize(data)
        LOG.info("Prepared %d records with %d source columns.", len(result), len(result.columns))
        return result

    def audit(self) -> dict[str, Any]:
        """Inspect supported sources and report exactly what training can retain."""
        self.read_errors = {}
        files: list[dict[str, Any]] = []
        retained_rows = 0
        for path in self.scan():
            frame = self._read(path)
            rows = len(frame)
            retained_rows += rows
            files.append({
                "path": str(path.relative_to(self.root)),
                "extension": path.suffix.lower(),
                "rows": rows,
                "columns": list(frame.columns),
                "error": self.read_errors.get(str(path.relative_to(self.root))),
            })
        skipped = self.skipped()
        return {
            "dataset_dir": str(self.root),
            "max_rows_per_file": self.max_rows_per_file,
            "include_documents": self.include_documents,
            "exclude_test_datasets": self.exclude_test_datasets,
            "supported_files": len(files),
            "retained_rows": retained_rows,
            "unreadable_files": sum(1 for item in files if item["error"]),
            "skipped_files": len(skipped),
            "files": files,
            "skipped": [str(path.relative_to(self.root)) for path in skipped],
        }

    @staticmethod
    def _supported(path: Path) -> bool:
        suffixes = "".join(path.suffixes[-2:]).lower()
        return path.suffix.lower() != ".gz" or suffixes in {".json.gz", ".jsonl.gz"}

    def _read(self, path: Path) -> pd.DataFrame:
        try:
            suffixes = "".join(path.suffixes[-2:]).lower()
            suffix = path.suffix.lower()
            if suffix == ".csv":
                frame = pd.read_csv(path).head(self.max_rows_per_file)
            elif suffix in TABULAR_TEXT:
                frame = self._read_delimited_text(path)
            elif suffix == ".parquet":
                frame = self._read_parquet_limited(path)
            elif suffix in LINE_TEXT:
                frame = self._read_lines(path)
            elif suffix in {".xml", ".xsd"}:
                frame = self._read_xml(path)
            else:
                import gzip
                opener = gzip.open if suffixes in {".json.gz", ".jsonl.gz"} else open
                with opener(path, "rt", encoding="utf-8") as handle:
                    # RLHF/OASST exports can be very large. Stream JSONL sources and
                    # cap each source deterministically so training remains bounded.
                    if suffix == ".gz" or suffix == ".jsonl":
                        loaded = self._read_json_lines(handle)
                    else:
                        loaded = self._read_json_limited(handle)
                if isinstance(loaded, list) and len(loaded) > self.max_rows_per_file:
                    loaded = loaded[:self.max_rows_per_file]
                records = loaded if isinstance(loaded, list) else [loaded]
                frame = pd.json_normalize(records)
                if len(frame.columns) > MAX_STRUCTURED_COLUMNS:
                    frame = pd.DataFrame({
                        "text": [jsonable(record)[:MAX_TEXT_CHARS] for record in records],
                        "type": suffix.lstrip("."),
                    })
            keep_terms = ("prompt", "question", "instruction", "text", "transcript", "description", "conversation", "message", "chosen", "rejected", "accepted", "preferred", "agent", "tool", "api_name", "framework", "functionality", "domain", "ability", "intent", "type", "category", "provider", "model", "success", "outcome", "status", "approval", "ambiguity", "latency", "duration", "cost", "price", "score", "match", "token", "span", "benchmark", "harness", "completed")
            keep = [column for column in frame.columns if any(term in column.lower() for term in keep_terms)]
            # Wide benchmark metadata is not a training feature and can make mixed-source
            # concatenation needlessly expensive. Preserve only semantic candidate fields.
            frame = frame.loc[:, keep] if keep else frame
            frame["_source_file"] = str(path.relative_to(self.root))
            return frame
        except Exception as exc:
            LOG.warning("Skipping unreadable dataset %s: %s", path, exc)
            self.read_errors[str(path.relative_to(self.root))] = str(exc)
            return pd.DataFrame()

    def _read_delimited_text(self, path: Path) -> pd.DataFrame:
        suffix = path.suffix.lower()
        if suffix == ".vcf":
            frame = pd.read_csv(path, sep="\t", comment="#", header=None, nrows=self.max_rows_per_file)
        else:
            frame = pd.read_csv(path, sep="\t", comment="#", header=None, nrows=self.max_rows_per_file)
        frame.columns = [f"field_{index}" for index in range(len(frame.columns))]
        frame["text"] = frame.astype("string").fillna("").agg(" ".join, axis=1)
        return frame

    def _read_lines(self, path: Path) -> pd.DataFrame:
        lines = []
        for line in path.read_text(encoding="utf-8", errors="ignore").splitlines():
            text = line.strip()
            if text:
                lines.append({"text": text[:MAX_TEXT_CHARS], "type": path.suffix.lower().lstrip(".") or "text"})
            if len(lines) >= self.max_rows_per_file:
                break
        return pd.DataFrame(lines)

    def _read_xml(self, path: Path) -> pd.DataFrame:
        root = ET.parse(path).getroot()
        records = []
        for element in root.iter():
            text = " ".join(part.strip() for part in element.itertext() if part and part.strip())
            attrs = " ".join(f"{key}={value}" for key, value in element.attrib.items())
            combined = " ".join(part for part in [element.tag, attrs, text] if part)
            if combined.strip():
                records.append({"text": combined[:MAX_TEXT_CHARS], "type": path.suffix.lower().lstrip(".")})
            if len(records) >= self.max_rows_per_file:
                break
        return pd.DataFrame(records)

    def _read_parquet_limited(self, path: Path) -> pd.DataFrame:
        """Read only the requested sample from Parquet rather than materializing it."""
        try:
            import pyarrow.parquet as pq
            parquet = pq.ParquetFile(path)
            batches = []
            remaining = self.max_rows_per_file
            for batch in parquet.iter_batches(batch_size=min(remaining, 10_000)):
                batches.append(batch.to_pandas())
                remaining -= batch.num_rows
                if remaining <= 0:
                    break
            return pd.concat(batches, ignore_index=True) if batches else pd.DataFrame()
        except ImportError:
            LOG.warning("pyarrow is unavailable; reading complete Parquet file %s.", path)
            return pd.read_parquet(path).head(self.max_rows_per_file)

    @staticmethod
    def infer_column(columns: list[str], candidates: list[str]) -> str | None:
        normalized = {c.lower().replace("_", "").replace(".", ""): c for c in columns}
        for candidate in candidates:
            if candidate in normalized: return normalized[candidate]
        return next((c for c in columns if any(x in c.lower() for x in candidates)), None)

    @staticmethod
    def flatten_value(value: Any) -> str: return jsonable(value)

    def _read_json_lines(self, handle: Any) -> list[dict[str, Any]]:
        """Read conventional JSONL and the HH red-team export's bracketed records."""
        records: list[dict[str, Any]] = []
        for line in handle:
            if not line.strip() or len(records) >= self.max_rows_per_file:
                continue
            # The red-team export has an opening bracket on the first record but
            # no JSONL commas. Strip only those outer wrappers.
            candidate = line.strip().lstrip("[,").rstrip("],")
            if not candidate:
                continue
            try:
                record = json.loads(candidate)
                if isinstance(record, dict):
                    records.append(record)
                elif isinstance(record, list):
                    records.extend(record[:self.max_rows_per_file - len(records)])
            except json.JSONDecodeError as exc:
                raise ValueError(f"Invalid JSON record near source line {len(records) + 1}: {exc}") from exc
        return records

    def _read_json_limited(self, handle: Any) -> list[Any]:
        """Read a single JSON document or the first records from a top-level JSON array."""
        decoder = json.JSONDecoder()
        records: list[Any] = []
        buffer = ""
        in_array = False
        eof = False

        def fill() -> None:
            nonlocal buffer, eof
            chunk = handle.read(65536)
            if chunk:
                buffer += chunk
            else:
                eof = True

        while len(records) < self.max_rows_per_file:
            while not eof and not buffer.strip():
                fill()
            buffer = buffer.lstrip()
            if not buffer:
                break
            if not in_array:
                if buffer.startswith("["):
                    in_array = True
                    buffer = buffer[1:]
                    continue
                while True:
                    try:
                        value, end = decoder.raw_decode(buffer)
                        return value[: self.max_rows_per_file] if isinstance(value, list) else [value]
                    except json.JSONDecodeError:
                        if eof:
                            raise
                        fill()
            buffer = buffer.lstrip()
            if buffer.startswith("]"):
                break
            if buffer.startswith(","):
                buffer = buffer[1:]
                continue
            while True:
                try:
                    value, end = decoder.raw_decode(buffer)
                    records.append(value)
                    buffer = buffer[end:]
                    break
                except json.JSONDecodeError:
                    if eof:
                        raise
                    fill()
        return records

    def _canonicalize(self, frame: pd.DataFrame) -> pd.DataFrame:
        """Create stable task fields from heterogeneous benchmark conventions."""
        normalized = {str(column).lower(): column for column in frame.columns}

        def first_value(names: list[str]) -> pd.Series:
            """Vectorized first-nonempty lookup across exact and nested fields."""
            candidates: list[str] = []
            for name in names:
                exact = normalized.get(name)
                if exact is not None:
                    candidates.append(exact)
                candidates.extend(
                    column for lowered, column in normalized.items()
                    if lowered.endswith(f".{name}") and column not in candidates
                )
            result = pd.Series("", index=frame.index, dtype="string")
            for column in candidates:
                values = frame[column].astype("string").fillna("").str.strip()
                usable = ~values.isin(["", "nan", "None", "<NA>"])
                result = result.mask(result.eq("") & usable, values)
            return result

        def trace_latency() -> pd.Series:
            """Derive end-to-end seconds from OpenTelemetry-style trace spans."""
            column = normalized.get("spans")
            result = pd.Series("", index=frame.index, dtype="string")
            if column is None:
                return result
            for index, spans in frame[column].items():
                # PyArrow yields nested Parquet lists as NumPy arrays; JSONL
                # sources yield normal Python lists.
                if hasattr(spans, "tolist"):
                    spans = spans.tolist()
                if not isinstance(spans, (list, tuple)):
                    continue
                starts, ends = [], []
                for span in spans:
                    if not isinstance(span, dict):
                        continue
                    start, end = span.get("start_time"), span.get("end_time")
                    if start and end:
                        starts.append(start)
                        ends.append(end)
                if starts:
                    start_time = pd.to_datetime(starts, errors="coerce", utc=True).min()
                    end_time = pd.to_datetime(ends, errors="coerce", utc=True).max()
                    if pd.notna(start_time) and pd.notna(end_time):
                        seconds = (end_time - start_time).total_seconds()
                        if seconds >= 0:
                            result.at[index] = str(seconds)
            return result

        derived = pd.DataFrame({
            "_text": first_value(["question", "prompt", "original_prompt", "instruction", "task_description", "problem_statement", "text", "transcript", "description", "messages", "api_call"]),
            "_intent_label": first_value(["type", "functionality", "domain", "ability", "category", "intent"]),
            "_agent_raw": first_value(["selected_agents", "agent_name", "framework", "tools", "tool", "api_name"]),
            "_provider_raw": first_value(["provider", "model_provider", "llm_provider", "model_path", "model", "models"]),
            "_approval_label": first_value(["ambiguity_class", "approval_required", "approval", "approved"]),
            "_chosen": first_value(["chosen", "accepted", "preferred"]),
            "_rejected": first_value(["rejected", "dispreferred"]),
            "_success_raw": first_value(["success", "outcome", "completed", "status", "db_match", "score"]),
            "_latency_label": first_value(["latency", "latency_ms", "duration_seconds", "duration", "execution_time"]),
            "_cost_label": first_value(["agent_cost", "cost", "token_cost", "price"]),
        }, index=frame.index)
        derived["_latency_label"] = derived["_latency_label"].mask(
            derived["_latency_label"].astype("string").str.strip().isin(["", "nan", "None", "<NA>"]),
            trace_latency(),
        )
        derived["_agent_label"] = [
            normalize_agent_label(f"{raw} {text} {source}")
            for raw, text, source in zip(derived["_agent_raw"], derived["_text"], frame["_source_file"])
        ]
        derived["_provider_label"] = derived["_provider_raw"].map(normalize_provider_label)
        derived["_intent_label"] = derived["_intent_label"].map(normalize_intent_label)
        # Benchmarks commonly encode the result as a Boolean database match or a
        # numeric score.  Convert both conventions to an explicit binary target.
        success = derived["_success_raw"].astype("string").str.strip().str.lower()
        derived["_success_label"] = success.map({
            "true": "success", "1": "success", "1.0": "success", "yes": "success", "passed": "success", "pass": "success", "completed": "success", "complete": "success", "done": "success",
            "false": "failure", "0": "failure", "0.0": "failure", "no": "failure", "failed": "failure", "fail": "failure",
        }).fillna(derived["_success_raw"])
        return pd.concat([frame.copy(), derived], axis=1)
