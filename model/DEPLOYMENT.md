# PrismSpace Model API

This folder contains a standalone Dockerized inference API for the trained artifacts in `model/artifacts/`. The image does not include the large training datasets.

## Local Docker

Run these commands from the repository root:

```powershell
docker build -f model/Dockerfile -t prismspace-model-api .
docker run --rm -p 8000:8000 -e MODEL_API_KEY=change-me prismspace-model-api
```

Check it:

```powershell
curl http://localhost:8000/health
curl -H "X-Model-API-Key: change-me" "http://localhost:8000/api/intelligence?text=Research%20the%20latest%20routing%20models"
```

`MODEL_API_KEY` is optional. Set it for any public deployment. `ALLOWED_ORIGINS` accepts a comma-separated list and defaults to `*`.

## Render or Railway

Use a Docker service with the repository root as the build context and `model/Dockerfile` as the Dockerfile path. Set `MODEL_API_KEY` and, if needed, `ALLOWED_ORIGINS`. The service reads the platform-provided `PORT` value automatically.

## Cloudflare Quick Tunnel

Run the container locally, then expose it temporarily:

```powershell
cloudflared tunnel --url http://localhost:8000
```

The public tunnel URL forwards to the same `/health`, `/models`, `/predict`, and `/api/intelligence` routes.
