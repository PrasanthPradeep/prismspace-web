# Copyright 2026 Nobin Sijo (NobinSijo7T).
# SPDX-License-Identifier: Apache-2.0
"""Standalone HTTP API for the trained PrismSpace model artifacts."""

from __future__ import annotations

import os
from typing import Annotated

from fastapi import Depends, FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from backend.model_inference import analyze_request, get_status
from backend.observability import install_metrics, model_request_metrics


class PredictionRequest(BaseModel):
    text: str = Field(min_length=1, max_length=100_000)


def _allowed_origins() -> list[str]:
    raw = os.getenv("ALLOWED_ORIGINS", "*")
    return [origin.strip() for origin in raw.split(",") if origin.strip()] or ["*"]


async def require_api_key(
    api_key: Annotated[str | None, Header(alias="X-Model-API-Key")] = None,
) -> None:
    expected = os.getenv("MODEL_API_KEY")
    if expected and api_key != expected:
        raise HTTPException(status_code=401, detail="Invalid model API key")


app = FastAPI(
    title="PrismSpace Model API",
    version="1.0.0",
    description="Inference endpoint for the trained PrismSpace routing models.",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins(),
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "X-Model-API-Key"],
)
install_metrics(app)


@app.get("/health")
def health() -> dict[str, object]:
    status = get_status()
    return {"status": "ok", "models_loaded": status["models_count"]}


@app.get("/models", dependencies=[Depends(require_api_key)])
def models() -> dict[str, object]:
    return get_status()


@app.post("/predict", dependencies=[Depends(require_api_key)])
def predict(payload: PredictionRequest) -> dict[str, object]:
    with model_request_metrics("predict"):
        return analyze_request(payload.text).to_dict()


@app.get("/api/intelligence", dependencies=[Depends(require_api_key)])
def intelligence(
    text: Annotated[str, Query(min_length=1, max_length=100_000)],
) -> dict[str, object]:
    with model_request_metrics("intelligence"):
        return analyze_request(text).to_dict()
