# PrismSpace ML model layer

This package trains routing and planning models from every supported record file below `datasets/` (or a directory passed with `--dataset-dir`). It supports CSV, TSV, JSON, JSONL, Parquet, XML/XSD, Markdown/text, YAML, LaTeX/BibTeX, and common scientific tabular formats such as BED, GTF, VCF, Kraken reports, genome sizes, FASTA, and FASTA indexes. The loader scans recursively, normalizes nested fields, and infers target fields by semantic names rather than requiring a fixed schema.

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
python -m model.train --dataset-dir model\datasets\training --output-dir model\artifacts_test --max-rows-per-file 1000
python -m model.evaluate --output-dir model\artifacts_test
```

Before a long run, create a detailed audit of the files and rows the trainer will retain:

```powershell
python -m model.audit_datasets --dataset-dir model\datasets\training --max-rows-per-file 50000 --output model\artifacts\dataset_audit.json
```

After that run succeeds, start full training:

```powershell
python -m model.train --dataset-dir model\datasets\training --curated-dir model\datasets\training\curated --output-dir model\artifacts --max-rows-per-file 50000
python -m model.evaluate --output-dir model\artifacts
```

## Curated approval, success, reward, and provider data

The generic corpus is useful for intent and agent routing, but it must not be used to infer safety approvals, task completion, preference rewards, or the best provider from unrelated metadata. Prepare the dedicated sources below before a full run. Training data lives under `model/datasets/training/`, held-out test data under `model/datasets/testing/`, and validation benchmarks under `model/datasets/validation/`.

```powershell
# Convert the downloaded source datasets into target-specific train/test files.
python -m model.prepare_supervised_datasets --dataset-dir model\datasets\training --output-dir model\datasets\training\curated

# Audit the general corpus (test_datasets remains excluded).
python -m model.audit_datasets --dataset-dir model\datasets\training --max-rows-per-file 50000 --output model\artifacts\dataset_audit.json

# Train general models plus the prepared approval/success targets.
python -m model.train --dataset-dir model\datasets\training --curated-dir model\datasets\training\curated --output-dir model\artifacts --max-rows-per-file 50000
python -m model.evaluate --output-dir model\artifacts

# Check benchmark routing coverage and regressions.
python -m model.evaluate_holdout --dataset-dir model\datasets\testing --artifacts-dir model\artifacts --output-dir model\artifacts\holdout_evaluation
python -m unittest model.test_pipeline
python backend\test_model_inference.py

# Comprehensive model evaluation with rich CLI output.
python -m model.evaluate_models --artifacts-dir model\artifacts --curated-dir model\datasets\testing\curated
```

## Comprehensive model evaluation

`model.evaluate_models` inspects every trained artifact — tabular classifiers, regressors, the anomaly detector, ORPO reward adapters, the FAISS retrieval index, and workflow template clusters — then reports accuracy, F1, precision, recall, ROC-AUC, ECE, Brier score, R², MAE, RMSE, confusion matrices, per-class breakdowns, calibration diagnostics, and a final colour-coded scoreboard.

Classifiers and regressors are re-evaluated against their curated held-out `test.jsonl` splits when available, so scores reflect true generalisation rather than cached training metrics.

```powershell
# Full evaluation of all artifacts with coloured CLI output.
python -m model.evaluate_models

# Evaluate only specific models (by artifact stem name).
python -m model.evaluate_models --models intent_classifier approval_predictor cost_predictor

# Export the machine-readable report to a custom path.
python -m model.evaluate_models --export model\artifacts\my_evaluation.json

# Disable colour output (useful for piping to files or CI).
python -m model.evaluate_models --no-colour

# Custom artifact and curated directories.
python -m model.evaluate_models --artifacts-dir model\artifacts --curated-dir model\datasets\testing\curated
```

The script reports pass/warn/fail verdicts per model using the deployment gates documented below. Models that fall below the minimum threshold show a yellow WARN badge; models with load errors show a red ERROR badge. The final scoreboard summarises all results. A JSON report is always written to `evaluation_report_full.json` in the artifacts directory (or at the path given by `--export`).

| Target | Local source folder | Dataset / direct link | Conversion result |
| --- | --- | --- | --- |
| Approval | `wildguardmix` | [WildGuardMix](https://huggingface.co/datasets/allenai/wildguardmix) | Maps `prompt_harm_label` to `approval_required`. Dataset access requires acceptance of AI2's responsible-use conditions. |
| Success | `cx-cmu--agent_trajectories` | [CMU Agent Trajectories](https://huggingface.co/datasets/cx-cmu/agent_trajectories) | Maps binary task `reward` to `completed` and keeps all attempts for a task in the same train/test split. Dataset access requires approval. |
| Reward | `HuggingFaceH4--ultrafeedback_binarized` | [UltraFeedback Binarized](https://huggingface.co/datasets/HuggingFaceH4/ultrafeedback_binarized) | Exports `prompt`, `chosen`, and `rejected` preference pairs for a separate TRL ORPO fine-tune. |
| Provider | `lmsyschatbot_arena_conversations` | [LMSYS Chatbot Arena](https://huggingface.co/datasets/lmsys/lmsys-chatbot-arena-conversations) | Real-world conversation outcomes mapped by capability affinity to `openai` (code/engineering), `anthropic` (compliance/safety), and `google` (multilingual/translation). |
| Provider | `routerbench` | [RouterBench](https://huggingface.co/datasets/withmartian/routerbench) | Oracle routing selections benchmarked against cost and accuracy tradeoffs for multi-provider routing. |
| Provider | `xRouteBench` | [xRouteBench](https://huggingface.co/datasets/ulab-ai/xRouteBench) | Query candidate pool benchmarking multi-provider candidate execution. |
| Provider | Built-in seed generator | `model/generate_provider_seed.py` | Combinatorial domain seed generator for ultra-low latency (`groq` LPU) and enterprise security/on-prem (`nvidia` NIM). |

### Where to place Provider Router (ModelRouter) datasets

To train `model_router.joblib` with high accuracy and balanced classes across all 5 Hive providers (`openai`, `anthropic`, `google`, `groq`, `nvidia`), place downloaded dataset files in the following folders under `model/datasets/`:

```
prismspace-web/
└── model/
    └── datasets/
        ├── lmsyschatbot_arena_conversations/  # Place downloaded *.parquet files here
        │   └── *.parquet
        ├── routerbench/                       # Place downloaded *.pkl files here
        │   └── *.pkl
        └── xRouteBench/                       # Place downloaded candidate pool parquet files here
            └── llm_candidates/
                └── ...
```

Then run the supervised dataset preparation command:

```powershell
python -m model.prepare_supervised_datasets --dataset-dir model\datasets\training --output-dir model\datasets\training\curated
```

This ingests from LMSYS Chatbot Arena and RouterBench, generates synthetic balancing samples via `model.generate_provider_seed` for Groq and NVIDIA, and creates training data under `model/datasets/training/curated/provider/`; held-out test data belongs under `model/datasets/testing/curated/provider/`.

Then train the Provider Router model:

```powershell
python -m model.train --dataset-dir model\datasets\training --curated-dir model\datasets\training\curated --output-dir model\artifacts
```

The reward preparation step does **not** create or deploy a reward model. Run TRL ORPO separately with a licensed base model and reserve UltraFeedback's `test_prefs` split for evaluation.

Training includes every supported dataset by default, including reference documents and scientific schemas. To compare a signal-only run without Markdown, YAML, XML/XSD, LaTeX, and plain-text documents, add `--no-documents` to either training or the audit command.

The `model/datasets/testing/` folder contains benchmark test data and is excluded from training. Validation benchmarks live under `model/datasets/validation/`. After training, generate routing predictions and coverage reports for GAIA and SWE-bench with:

```powershell
python -m model.evaluate_holdout --dataset-dir model\datasets\testing --artifacts-dir model\artifacts --output-dir model\artifacts\holdout_evaluation
```

Test an exported model (provided the training report marks it as trained):

```powershell
python -m model.predict model\artifacts\intent_classifier.joblib "Find why the deployment failed and create a GitHub issue"
```

Predictions print JSON with human-readable labels and a confidence score when the exported estimator exposes probabilities. Run the focused pipeline checks with:

```powershell
python -m unittest model.test_pipeline
python backend\test_model_inference.py
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

The expanded local corpus is now handled as follows: EnvFactory supplies tool-agent labels; AgentInstruct and APIBench add instruction/API intent labels; BFCL adds function-call examples; OpenAssistant and HH-RLHF add conversational and preference records; Open-M3 adds MCP workflow templates; scientific-agent-skills adds scientific workflow documents, schemas, and fixture data. JSON Lines disguised with a `.json` extension, compressed JSONL, Parquet exports, XML schemas, Markdown references, TSV-style scientific files, and FASTA-style records are all detected. The loader removes irrelevant wide benchmark metadata before combining sources, compacts overly wide structured files into text records, then creates canonical `_text`, `_intent_label`, `_agent_label`, `_approval_label`, `_chosen`, and `_rejected` fields.

Provider-selection, runtime latency, cost, and execution success still require PrismSpace run telemetry. Those models correctly emit a skipped status until production run logs add matching columns.

For full supervised coverage, collect PrismSpace run events with `objective`, `selected_agents`, `provider`, `model`, `success`, `approval_required`, `latency_ms`, `token_cost`, `retries`, `tool_failures`, `workflow_dag`, and accepted/rejected output pairs. Suitable additions are EnvFactory-SFT-FILTERED (tool use), LiveMCPBench (MCP navigation), ScaleAI/lhaw (long-horizon workflows), Bordair multimodal (prompt-injection safeguards), and EnvFactory-RL (reward learning), subject to each dataset's licence.

The backend now writes these bounded runtime events automatically to `model/datasets/training/prismspace_runtime_events.jsonl` at the end of each run. They are picked up by the next training command, giving provider, approval, success, latency, and agent-routing models first-party PrismSpace telemetry. Do not add that file to source control if it may contain private objectives or model outputs.

## Dataset layout and sources

Place trainable sources directly below `model/datasets/training/<dataset-name>/`. Put held-out benchmark test data under `model/datasets/testing/` and validation data under `model/datasets/validation/`. The trainer defaults to `model/datasets/training`, so benchmark data cannot leak into production training by path accident.

| Local folder | Purpose | Official source |
| --- | --- | --- |
| `agent-llm-traces` | Execution traces, timing, provider, and tool-use telemetry | [Exgentic agent-llm-traces](https://huggingface.co/datasets/Exgentic/agent-llm-traces) |
| `AgentInstruct` | Agent instruction tuning | [THUDM AgentTuning](https://github.com/THUDM/AgentTuning) |
| `APIBench` | API/tool selection | [Gorilla APIBench](https://github.com/ShishirPatil/gorilla/tree/main/data/apibench) |
| `awesome-harness-engineering` | Agent-harness reference material | [awesome-harness-engineering](https://github.com/ai-boost/awesome-harness-engineering) |
| `beir` | Retrieval and ranking corpora | [BEIR](https://github.com/beir-cellar/beir) |
| `Berkeley-Function-Calling-Leaderboard` | Function-call routing | [BFCL](https://github.com/EnlightenedAI/BFCL) |
| `code_generation_lite` | Code-generation tasks | [LiveCodeBench](https://github.com/LiveCodeBench/LiveCodeBench) |
| `EnvFactory-RL` | Agent RL trajectories | [EnvFactory](https://github.com/LARK-AI-Lab/EnvFactory) |
| `EnvFactory-SFT-FILTERED` | Filtered agent SFT trajectories | [EnvFactory](https://github.com/LARK-AI-Lab/EnvFactory) |
| `oasst1` | Conversations and preference pairs | [OpenAssistant OASST1](https://huggingface.co/datasets/OpenAssistant/oasst1) |
| `Open-M3-Bench` | Multimodal MCP workflows | [Open-M3-Bench](https://huggingface.co/datasets/EtaYang10th/Open-M3-Bench) |
| `scientific-agent-skills-main` | Scientific workflow and tool documentation | [Scientific Agent Skills](https://github.com/K-Dense-AI/scientific-agent-skills) |
| `tau-bench-synthetic` | Synthetic tool-agent trajectories | [tau-bench-synthetic](https://huggingface.co/datasets/fuvty/tau-bench-synthetic) |
| `xlam-function-calling-60k` | Function-calling examples | [Salesforce xLAM](https://huggingface.co/datasets/Salesforce/xlam-function-calling-60k) |
| `test_datasets/GAIA` | Held-out multi-step agent benchmark | [GAIA](https://huggingface.co/datasets/gaia-benchmark/GAIA) |
| `test_datasets/SWE-bench_Verified` | Held-out software-engineering benchmark | [SWE-bench Verified](https://huggingface.co/datasets/SWE-bench/SWE-bench_Verified) |

`test_datasets/GAIA` should contain its metadata Parquet files and attachments in the original GAIA layout. `test_datasets/SWE-bench_Verified` should contain its test Parquet export. The hold-out command reads only GAIA's canonical `metadata.parquet` files and SWE-bench's `test-*.parquet`, avoiding duplicate per-level metadata and attachment files.

The backend deploys only models that pass minimum validation gates. Intent and agent routing remain enabled; provider/success classifiers require weighted F1 >= 0.50, while latency/cost regression require R² >= 0.05. Until PrismSpace runtime events supply representative labels, provider defaults to NVIDIA and latency/cost remain conservative heuristics.

## Outputs

`intent_classifier.joblib`, `agent_router.joblib`, `model_router.joblib`, `workflow_success_predictor.joblib`, `approval_predictor.joblib`, `latency_predictor.joblib`, `cost_predictor.joblib`, `anomaly_detector.joblib`, `workflow_templates.pkl`, and a FAISS index when FAISS is installed. `training_report.json` records exactly which outputs trained and why any were skipped.

ORPO needs paired `chosen` and `rejected` samples plus a separately selected, licensed language-model checkpoint. The package detects such data and explicitly reports readiness rather than fabricating a reward checkpoint.

## License and contribution boundary

PrismSpace-authored model source code is copyright © 2026 Nobin Sijo
([NobinSijo7T](https://github.com/NobinSijo7T)) and is licensed under
[Apache-2.0](../LICENSE). This license applies only to PrismSpace-authored
code and does not relicense third-party datasets, model weights, checkpoints,
artifacts, or provider services.

Collaborators may contribute to Dev Space tools as described in
[CONTRIBUTING.md](../CONTRIBUTING.md). Core AI/model architecture, training,
weights, artifacts, datasets, routing, governance, and safety behavior are
maintainer-controlled and require prior written authorization from Nobin Sijo.
Authorized model contributions must include provenance, version, license,
evaluation impact, and redistribution terms. Do not commit gated datasets,
private telemetry, API keys, or uncleared model artifacts.
