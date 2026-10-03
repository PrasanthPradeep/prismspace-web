# Copyright 2026 Nobin Sijo (NobinSijo7T).
# SPDX-License-Identifier: Apache-2.0
"""Prometheus metrics shared by the PrismSpace FastAPI services."""

from __future__ import annotations

import os
import secrets
import time
from contextlib import contextmanager
from typing import Iterator

from fastapi import FastAPI, Header, HTTPException
from fastapi.responses import Response
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest
from prometheus_fastapi_instrumentator import Instrumentator


MODEL_REQUESTS = Counter(
    "prismspace_model_requests_total",
    "Model inference requests by operation and outcome.",
    ("operation", "status"),
)
MODEL_LATENCY = Histogram(
    "prismspace_model_request_duration_seconds",
    "Model inference request duration in seconds.",
    ("operation",),
)


def install_metrics(app: FastAPI) -> None:
    """Install HTTP metrics and a token-protected Prometheus endpoint."""

    Instrumentator().instrument(app)

    @app.get("/metrics", include_in_schema=False)
    def metrics(
        authorization: str | None = Header(default=None),
        x_metrics_token: str | None = Header(default=None),
    ) -> Response:
        expected = os.getenv("METRICS_TOKEN")
        # A missing token must never silently turn a production metrics
        # endpoint into a public data export. Configure the token explicitly
        # on every hosted API before enabling scraping.
        if not expected:
            raise HTTPException(status_code=503, detail="Metrics endpoint is not configured")

        supplied = x_metrics_token
        if supplied is None and authorization and authorization.lower().startswith("bearer "):
            supplied = authorization[7:].strip()

        if expected and (not supplied or not secrets.compare_digest(supplied, expected)):
            raise HTTPException(status_code=401, detail="Invalid metrics token")

        return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


@contextmanager
def model_request_metrics(operation: str) -> Iterator[None]:
    """Record one model operation without adding high-cardinality labels."""

    started = time.perf_counter()
    status = "success"
    try:
        yield
    except Exception:
        status = "error"
        raise
    finally:
        MODEL_REQUESTS.labels(operation=operation, status=status).inc()
        MODEL_LATENCY.labels(operation=operation).observe(time.perf_counter() - started)
