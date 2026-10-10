# Train the ORPO Reward Model on Windows 11 (RTX 4060 8 GB)

Two-stage recipe: **SFT first** (teach tool-call form on EnvFactory-RL),
**ORPO second** (teach human preference on ultrafeedback + oasst1).
Base model throughout: `Qwen2.5-1.5B-Instruct` with LoRA adapters.

Expected totals: Stage 1 ≈ 20 min · Stage 2 ≈ 3–5 hrs.

---

## 0. Prerequisites (one time)

1. **NVIDIA driver** — update to a recent Game Ready / Studio driver
   (CUDA 12.6+ capable; check with `nvidia-smi`).
2. **Python 3.12** from python.org (tick *Add python.exe to PATH*).
3. **Git for Windows**.
4. **Disk** — ~25 GB free (checkpoints + datasets + cache).
5. **Hugging Face account** — `Qwen2.5-1.5B-Instruct` is gated: open its
   model page, accept the license, and create a read token at
   *Settings → Access Tokens*.

## 1. Get the code and data

```powershell
git clone <your-prismspace-web-url>; cd prismspace-web
# Fast downloads (run once):
$env:HF_HUB_ENABLE_HF_TRANSFER = "1"
pip install hf_transfer huggingface_hub
hf auth login   # paste your HF read token
hf download Qwen/Qwen2.5-1.5B-Instruct --local-dir model/datasets/Qwen2.5-1.5B
hf download HuggingFaceH4/ultrafeedback_binarized --repo-type dataset --local-dir model/datasets/HuggingFaceH4--ultrafeedback_binarized
hf download OpenAssistant/oasst1 --repo-type dataset --local-dir model/datasets/oasst1
hf download LARK-Lab/EnvFactory-RL --repo-type dataset --local-dir model/datasets/EnvFactory-RL
```

> Shortcut: if you prepared data in the Linux VM, copy its whole
> `model/datasets/` folder over instead — layout is identical.

## 2. Environment

```powershell
python -m venv .venv; .\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu126
python -m pip install -r model\requirements.txt
python -c "import torch; print(torch.cuda.is_available(), torch.cuda.get_device_name(0))"
# expect: True  NVIDIA GeForce RTX 4060
```

## 3. Curate the training files (skip if copied from the VM)

```powershell
.\.venv\Scripts\Activate.ps1
python -m model.prepare_supervised_datasets --dataset-dir model\datasets --output-dir model\datasets\curated
```

Expect a report ending roughly like:

| set | train | test | source |
| --- | --- | --- | --- |
| `reward` | 76,101 | 5,908 | Ultrafeedback + OASST1 preference pairs |
| `sft_envfactory` | 2,503 | 589 | EnvFactory tool trajectories |

`reward/train.jsonl` + `test.jsonl` hold `{prompt, chosen, rejected}` from
both Ultrafeedback and OASST1; `sft_envfactory/*.jsonl` holds
`{messages: [user, assistant tool-calls]}` from EnvFactory-RL.

## 4. Validate without training (CPU-safe, 1 min)

```powershell
python model\train_sft_envfactory.py --model-path model\datasets\Qwen2.5-1.5B --train-file model\datasets\curated\sft_envfactory\train.jsonl --eval-file model\datasets\curated\sft_envfactory\test.jsonl --dry-run
python model\train_reward_orpo.py --model-path model\datasets\Qwen2.5-1.5B --train-file model\datasets\curated\reward\train.jsonl --eval-file model\datasets\curated\reward\test.jsonl --dry-run
```

The SFT manifest should report 2,503 train rows and 589 eval rows. The ORPO
manifest should report 76,101 train pairs and 500 eval pairs by default
(the script caps evaluation during training unless `--max-eval-samples` is
changed). If a manifest errors, stop — the data paths are wrong.

## 5. Stage 1 — SFT on EnvFactory-RL (~20 min)

Teaches the ReAct `{"tool", "arguments"}` dialect. One epoch only —
2.5k rows memorize fast.

```powershell
python model\train_sft_envfactory.py --model-path model\datasets\Qwen2.5-1.5B --train-file model\datasets\curated\sft_envfactory\train.jsonl --eval-file model\datasets\curated\sft_envfactory\test.jsonl --output-dir model\artifacts\sft_tooluse --merge-output model\datasets\Qwen2.5-1.5B-sft
```

* `--merge-output` produces a full-weight model dir — this is Stage 2's input.
* Sanity number: eval loss should fall below the starting value; final
  `evaluation_report.json` lands next to the adapter.

## 6. Stage 2 — Preference SFT on ultrafeedback + oasst1 (~3–5 hrs)

The preferred responses from both datasets are trained sequentially after
Stage 1. This is the stable consumer-GPU path; native ORPO was removed from
the recommended Windows path because its fp16/bf16 log-odds backward pass
produced NaN gradients or CUDA failures on the tested RTX 4060.

```powershell
python model\train_preference_sft.py --model-path model\datasets\Qwen2.5-1.5B-sft --train-file model\datasets\curated\reward\train.jsonl --eval-file model\datasets\curated\reward\test.jsonl --replay-file model\datasets\curated\sft_envfactory\train.jsonl --replay-eval-file model\datasets\curated\sft_envfactory\test.jsonl --replay-ratio 0.25 --output-dir model\artifacts\preference_sft_replay --merge-output model\artifacts\prismspace-qwen-sft-preference-replay --batch-size 1 --grad-accum 8 --max-length 256 --lora-rank 8 --epochs 1 --max-eval-samples 500
```

This uses all 76,101 merged preference rows by default. Use the bounded
smoke test below before starting the full run.

## 7. Stage 3 — Verify the standalone model

```powershell
Get-Content model\artifacts\preference_sft\evaluation_report.json
Get-ChildItem model\artifacts\prismspace-qwen-sft-preference
```

The standalone model contains the original Qwen weights plus EnvFactory SFT
updates plus preferred-response updates from Ultrafeedback and OASST1.

Optional smoke test first:

```powershell
python model\train_preference_sft.py --model-path model\datasets\Qwen2.5-1.5B-sft --train-file model\datasets\curated\reward\train.jsonl --eval-file model\datasets\curated\reward\test.jsonl --output-dir model\artifacts\preference_sft_smoke --merge-output model\artifacts\prismspace-qwen-sft-preference-smoke --max-train-samples 200 --epochs 1 --batch-size 1 --grad-accum 4 --max-length 256 --lora-rank 4
```

## 8. Check the results

* `model\artifacts\preference_sft\evaluation_report.json` — all metrics
  must be finite and `eval_loss` should be reported.
* Quick human check — load the adapter and ask it a tool question; expect
  a valid `{"tool", "arguments"}` call, not prose.

## 9. Bring it back to the project

Copy **only** these (small) folders to the Linux VM; everything else
(checkpoints, `.cache`) stays on Windows:

* `model\artifacts\reward_orpo\` → `model/artifacts/reward_orpo/`
* `model\artifacts\sft_tooluse\evaluation_report.json` (record only)

`evaluate_models.py` auto-discovers the ORPO adapter — no wiring needed.

## Troubleshooting

| symptom | fix |
| --- | --- |
| `torch.cuda.is_available()` → `False` | Update NVIDIA driver; reinstall torch with the cu126 index URL above |
| CUDA OOM at step 0 | `--batch-size 1 --max-length 256` (the 4 GB-safe defaults) |
| `dataloader worker` / spawn errors | Keep `--dataloader-workers 0` (already default) |
| Slow HF downloads | `pip install hf_transfer` + `$env:HF_HUB_ENABLE_HF_TRANSFER="1"` |
| `Fernet`/auth errors | Unrelated to training — that's the Gmail MCP backend config |
| NaN loss | Don't enable 4-bit quantization with ORPO (script already loads bf16) |
