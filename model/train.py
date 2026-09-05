from __future__ import annotations
import argparse
from .config import SETTINGS
from .dataset_loader import DatasetLoader
from .intent_classifier import IntentClassifier
from .agent_router import AgentRouter
from .model_router import ModelRouter
from .workflow_success_predictor import WorkflowSuccessPredictor
from .approval_predictor import ApprovalPredictor
from .cost_latency_predictor import LatencyPredictor, CostPredictor
from .anomaly_detector import AnomalyDetector
from .workflow_cluster import WorkflowClusterer
from .retrieval_ranker import RetrievalRanker
from .reward_model import RewardModel
from .utils import set_seed, write_json

CURATED_TARGETS = {
    "provider": (ModelRouter, "providerlabel"),
    "success": (WorkflowSuccessPredictor, "completed"),
    "approval": (ApprovalPredictor, "approval_required"),
}

def _load_curated(path):
    """Load only the prepared training split, never its held-out test split."""
    train_file = path / "train.jsonl"
    if not train_file.exists():
        return None
    loader = DatasetLoader(train_file.parent, 1_000_000, include_documents=False, exclude_test_datasets=True)
    return loader.load_files([train_file])

def main() -> None:
    parser=argparse.ArgumentParser(); parser.add_argument("--dataset-dir",type=str,default=str(SETTINGS.dataset_dir)); parser.add_argument("--output-dir",type=str,default=str(SETTINGS.output_dir)); parser.add_argument("--curated-dir",type=str,default="model/datasets/curated"); parser.add_argument("--max-rows-per-file",type=int,default=50_000); parser.add_argument("--no-documents", action="store_true", help="Exclude document-like sources (Markdown, YAML, XML, LaTeX and text)."); parser.add_argument("--include-test-datasets", action="store_true", help="Allow test_datasets in training. This risks benchmark leakage."); args=parser.parse_args()
    settings=SETTINGS; output=__import__('pathlib').Path(args.output_dir); output.mkdir(parents=True,exist_ok=True); (output/'logs').mkdir(exist_ok=True); set_seed(settings.seed)
    print("Loading datasets...", flush=True)
    dataset_root = __import__('pathlib').Path(args.dataset_dir)
    loader = DatasetLoader(dataset_root, args.max_rows_per_file, include_documents=not args.no_documents, exclude_test_datasets=not args.include_test_datasets)
    # Curated target-specific datasets must never leak into the general corpus.
    frame=loader.load_files([path for path in loader.scan() if "curated" not in path.relative_to(dataset_root).parts]); results=[]
    for cls in [IntentClassifier,AgentRouter,LatencyPredictor,CostPredictor]:
        print(f"Training {cls.__name__}...", flush=True); results.append(cls(output,settings.seed).fit(frame).__dict__)
    curated_root = __import__('pathlib').Path(args.curated_dir)
    for name, (cls, target) in CURATED_TARGETS.items():
        curated = _load_curated(curated_root / name)
        if curated is None:
            results.append({"model_name": name, "trained": False, "reason": f"Prepared curated dataset missing: {curated_root / name / 'train.jsonl'}", "metrics": None})
            continue
        print(f"Training {cls.__name__} from curated {name} data...", flush=True)
        results.append(cls(output,settings.seed).fit(curated, target=target).__dict__)
    print("Training AnomalyDetector...", flush=True); results.append(AnomalyDetector(output,settings.seed).fit_anomaly(frame).__dict__)
    print("Building workflow clusters...", flush=True); results.append({"model_name":"workflow_cluster","trained":True,"metrics":WorkflowClusterer().fit(frame,output/'workflow_templates.pkl')})
    print("Building retrieval index...", flush=True); results.append({"model_name":"retrieval","trained":True,"metrics":RetrievalRanker().fit(frame,output/'faiss.index')})
    print("Checking curated reward-model preference pairs...", flush=True)
    reward_frame = _load_curated(curated_root / "reward")
    if reward_frame is None:
        results.append({"model_name": "reward", "trained": False, "reason": f"Prepared curated dataset missing: {curated_root / 'reward' / 'train.jsonl'}", "metrics": None})
    else:
        results.append(RewardModel(output,settings.seed).fit_preferences(reward_frame).__dict__)
    write_json(output/'training_report.json',{"rows":len(frame),"columns":list(frame.columns),"results":results}); print(f"Training report: {output/'training_report.json'}")
if __name__ == "__main__": main()
