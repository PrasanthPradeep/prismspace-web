# PrismSpace ML model layer

This package trains routing and planning models from every supported record file below `datasets/` (or a directory passed with `--dataset-dir`). It supports CSV, JSON, JSONL, Parquet, and text files, recursively. The loader normalizes nested JSON fields and infers target fields by semantic names rather than requiring a fixed schema.

## Windows / PowerShell quick start

Run each command from the project root. The virtual environment keeps PrismSpace's ML dependencies separate from the frontend and backend dependencies.

```powershell
cd C:\Users\nobin\OneDrive\Documents\Projects\prismspace-web
python -m venv .venv
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
```

Install a CUDA-enabled PyTorch build. This command is for NVIDIA CUDA 12.6; select the matching command from the [PyTorch installer](https://pytorch.org/get-started/locally/) if your driver requires another CUDA version.

```powershell
python -m pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu126
python -m pip install -r model\requirements.txt
```

Confirm that the virtual environment can access the GPU:

```powershell
python -c "import torch; print('PyTorch:', torch.__version__); print('CUDA enabled:', torch.cuda.is_available()); print('GPU:', torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'CPU fallback')"
```

Start with a small training run. It scans all supported datasets while limiting each source to 1,000 records:

```powershell
python -m model.train --dataset-dir model\datasets --output-dir model\artifacts_test --max-rows-per-file 1000
python -m model.evaluate --output-dir model\artifacts_test
```

After that run succeeds, start full training:

```powershell
python -m model.train --dataset-dir model\datasets --output-dir model\artifacts --max-rows-per-file 50000
python -m model.evaluate --output-dir model\artifacts
```

Test an exported model (provided the training report marks it as trained):

```powershell
python -m model.predict model\artifacts\intent_classifier.joblib "Find why the deployment failed and create a GitHub issue"
```

Transformer/ORPO components are deliberately optional: classic routing models remain CPU-safe, while PyTorch, Transformers and Accelerate use CUDA whenever a compatible transformer fine-tune is enabled.

Artifacts and structured reports are written to `model/artifacts/`. To use a custom export:

```powershell
python -m model.train --dataset-dir datasets --output-dir artifacts
python -m model.predict artifacts/intent_classifier.joblib "Investigate a failing deployment"
python -m model.evaluate --output-dir artifacts
```

Training samples up to 50,000 rows from each source by default, which prevents a single large conversation corpus from dominating training or exhausting memory. Raise `--max-rows-per-file` deliberately for a full-corpus run.

## Dataset coverage

The expanded local corpus is now handled as follows: EnvFactory supplies tool-agent labels; AgentInstruct and APIBench add instruction/API intent labels; BFCL adds function-call examples; OpenAssistant and HH-RLHF add conversational and preference records; Open-M3 adds MCP workflow templates. JSON Lines disguised with a `.json` extension, compressed JSONL, and Parquet exports are all detected. The loader removes irrelevant wide benchmark metadata before combining sources, then creates canonical `_text`, `_intent_label`, `_agent_label`, `_approval_label`, `_chosen`, and `_rejected` fields.

Provider-selection, runtime latency, cost, and execution success still require PrismSpace run telemetry. Those models correctly emit a skipped status until production run logs add matching columns.

For full supervised coverage, collect PrismSpace run events with `objective`, `selected_agents`, `provider`, `model`, `success`, `approval_required`, `latency_ms`, `token_cost`, `retries`, `tool_failures`, `workflow_dag`, and accepted/rejected output pairs. Suitable additions are EnvFactory-SFT-FILTERED (tool use), LiveMCPBench (MCP navigation), ScaleAI/lhaw (long-horizon workflows), Bordair multimodal (prompt-injection safeguards), and EnvFactory-RL (reward learning), subject to each dataset's licence.

## Outputs

`intent_classifier.joblib`, `agent_router.joblib`, `model_router.joblib`, `workflow_success_predictor.joblib`, `approval_predictor.joblib`, `latency_predictor.joblib`, `cost_predictor.joblib`, `anomaly_detector.joblib`, `workflow_templates.pkl`, and a FAISS index when FAISS is installed. `training_report.json` records exactly which outputs trained and why any were skipped.

ORPO needs paired `chosen` and `rejected` samples plus a separately selected, licensed language-model checkpoint. The package detects such data and explicitly reports readiness rather than fabricating a reward checkpoint.
