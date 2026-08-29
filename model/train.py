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

def main() -> None:
    parser=argparse.ArgumentParser(); parser.add_argument("--dataset-dir",type=str,default=str(SETTINGS.dataset_dir)); parser.add_argument("--output-dir",type=str,default=str(SETTINGS.output_dir)); parser.add_argument("--max-rows-per-file",type=int,default=50_000); args=parser.parse_args()
    settings=SETTINGS; output=__import__('pathlib').Path(args.output_dir); output.mkdir(parents=True,exist_ok=True); (output/'logs').mkdir(exist_ok=True); set_seed(settings.seed)
    print("Loading datasets...", flush=True)
    frame=DatasetLoader(__import__('pathlib').Path(args.dataset_dir), args.max_rows_per_file).load(); results=[]
    for cls in [IntentClassifier,AgentRouter,ModelRouter,WorkflowSuccessPredictor,ApprovalPredictor,LatencyPredictor,CostPredictor]:
        print(f"Training {cls.__name__}...", flush=True); results.append(cls(output,settings.seed).fit(frame).__dict__)
    print("Training AnomalyDetector...", flush=True); results.append(AnomalyDetector(output,settings.seed).fit_anomaly(frame).__dict__)
    print("Building workflow clusters...", flush=True); results.append({"model_name":"workflow_cluster","trained":True,"metrics":WorkflowClusterer().fit(frame,output/'workflow_templates.pkl')})
    print("Building retrieval index...", flush=True); results.append({"model_name":"retrieval","trained":True,"metrics":RetrievalRanker().fit(frame,output/'faiss.index')})
    print("Checking reward-model preference pairs...", flush=True); results.append(RewardModel(output,settings.seed).fit_preferences(frame).__dict__)
    write_json(output/'training_report.json',{"rows":len(frame),"columns":list(frame.columns),"results":results}); print(f"Training report: {output/'training_report.json'}")
if __name__ == "__main__": main()
