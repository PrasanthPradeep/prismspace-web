FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

WORKDIR /app

# Install only inference dependencies; training corpora and training toolchains
# are intentionally excluded from the runtime image.
COPY model/requirements-api.txt /app/model/requirements-api.txt
RUN pip install --no-cache-dir -r /app/model/requirements-api.txt

COPY model/model_server.py /app/model_server.py
COPY model/__init__.py /app/model/__init__.py
COPY backend/model_inference.py /app/backend/model_inference.py
RUN mkdir -p /app/model/artifacts
COPY model/artifacts/agent_router.joblib /app/model/artifacts/agent_router.joblib
COPY model/artifacts/anomaly_detector.joblib /app/model/artifacts/anomaly_detector.joblib
COPY model/artifacts/approval_predictor.joblib /app/model/artifacts/approval_predictor.joblib
COPY model/artifacts/cost_predictor.joblib /app/model/artifacts/cost_predictor.joblib
COPY model/artifacts/intent_classifier.joblib /app/model/artifacts/intent_classifier.joblib
COPY model/artifacts/latency_predictor.joblib /app/model/artifacts/latency_predictor.joblib
COPY model/artifacts/model_router.joblib /app/model/artifacts/model_router.joblib
COPY model/artifacts/training_report.json /app/model/artifacts/training_report.json
COPY model/artifacts/workflow_success_predictor.joblib /app/model/artifacts/workflow_success_predictor.joblib

EXPOSE 8000

CMD ["sh", "-c", "uvicorn model_server:app --host 0.0.0.0 --port ${PORT:-8000}"]
