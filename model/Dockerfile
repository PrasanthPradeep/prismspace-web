FROM python:3.11-slim@sha256:bab1b7ef4b450c81002278d035eff85ebe394ae94df904f7a3ba14f7e16e487b

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

WORKDIR /app

RUN groupadd --system app \
    && useradd --system --gid app --home-dir /nonexistent --shell /usr/sbin/nologin app

# Install only inference dependencies; training corpora and training toolchains
# are intentionally excluded from the runtime image.
COPY --chown=app:app model/requirements-api.txt /app/model/requirements-api.txt
RUN pip install --no-cache-dir -r /app/model/requirements-api.txt

COPY --chown=app:app model/model_server.py /app/model_server.py
COPY --chown=app:app model/__init__.py /app/model/__init__.py
COPY --chown=app:app backend/model_inference.py /app/backend/model_inference.py
COPY --chown=app:app backend/observability.py /app/backend/observability.py
RUN mkdir -p /app/model/artifacts && chown app:app /app/model/artifacts
COPY --chown=app:app model/artifacts/agent_router.joblib /app/model/artifacts/agent_router.joblib
COPY --chown=app:app model/artifacts/anomaly_detector.joblib /app/model/artifacts/anomaly_detector.joblib
COPY --chown=app:app model/artifacts/approval_predictor.joblib /app/model/artifacts/approval_predictor.joblib
COPY --chown=app:app model/artifacts/cost_predictor.joblib /app/model/artifacts/cost_predictor.joblib
COPY --chown=app:app model/artifacts/intent_classifier.joblib /app/model/artifacts/intent_classifier.joblib
COPY --chown=app:app model/artifacts/latency_predictor.joblib /app/model/artifacts/latency_predictor.joblib
COPY --chown=app:app model/artifacts/model_router.joblib /app/model/artifacts/model_router.joblib
COPY --chown=app:app model/artifacts/training_report.json /app/model/artifacts/training_report.json
COPY --chown=app:app model/artifacts/workflow_success_predictor.joblib /app/model/artifacts/workflow_success_predictor.joblib

USER app

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
    CMD ["python", "-c", "import os, urllib.request; urllib.request.urlopen(f\"http://127.0.0.1:{os.getenv('PORT', '8000')}/health\", timeout=5)"]

CMD ["python", "-c", "import os, uvicorn; uvicorn.run('model_server:app', host='0.0.0.0', port=int(os.getenv('PORT', '8000')))" ]
