# Grafana Cloud monitoring

This folder provides the collector needed to keep PrismSpace metrics after the
developer laptop is offline. The FastAPI services expose Prometheus metrics at
`/metrics`; Grafana Alloy scrapes them and forwards the samples to Grafana Cloud.

## Secure the API metrics endpoint

Set this environment variable on every hosted PrismSpace API:

```env
METRICS_TOKEN=use-a-long-random-secret
```

The endpoint accepts `Authorization: Bearer <token>`, which Alloy sends using
the platform-specific token variables. Do not make `/metrics` public without a
token.

## Grafana Cloud credentials

Create a Grafana Cloud stack and a metrics-writing token. Copy the hosted
Prometheus remote-write URL and stack user ID into `monitoring/.env` based on
`.env.example`. Keep that file out of git.

## Run the collector locally

The repository root `.env.local` contains the shared template. Edit it with
real values, then run:

```powershell
docker compose --env-file .env.local -f monitoring\docker-compose.yml up -d --build
```

`monitoring/.env.example` is also available when you want a collector-only
environment file instead.

This is useful for testing, but it stops collecting when the laptop is off.

## Deploy the collector remotely

Deploy `monitoring/Dockerfile` as a small always-on service on Render or
Railway, and add the variables from `monitoring/.env.example` to that service.
The collector needs outbound HTTPS access to Grafana Cloud and inbound access
to each `/metrics` endpoint. The hosted API services can be on Render or
Railway independently.

### Render and Railway API targets

Set the corresponding `*_METRICS_HOST` to the public hostname plus `:443` and
the token to the API's `METRICS_TOKEN`. The API must serve `/metrics` over HTTPS.

### Cloudflare Quick Tunnel

Run the local model API and tunnel it:

```powershell
cloudflared tunnel --url http://localhost:8000
```

Set `CLOUDFLARE_METRICS_HOST` to the generated `trycloudflare.com` hostname
plus `:443`. Quick Tunnel URLs are temporary and change after restart, so this
target is for short-lived testing rather than production monitoring.

## Useful Grafana queries

```promql
sum by (platform) (rate(prismspace_model_requests_total[5m]))
```

```promql
histogram_quantile(0.95, sum by (le, platform) (rate(prismspace_model_request_duration_seconds_bucket[5m])))
```

```promql
sum by (operation, status) (rate(prismspace_model_requests_total[5m]))
```
