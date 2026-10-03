# PrismSpace DevOps

## GitHub Actions

The CI workflow runs on pull requests and pushes to `main`:

- Next.js lint, TypeScript checks, and production build
- Python compilation and unit tests
- Gitleaks secret scanning
- npm and pip dependency audits
- Alloy container build and Trivy scan
- Model container build and scan when model artifacts are present
- Optional post-deploy runtime smoke tests
- Optional Render deployment after all required checks pass

The dependency audit is currently report-only because the repository has an
existing vulnerability baseline. Make it required after the findings are
reviewed and resolved.

## GitHub repository settings

Protect `main` and require these checks before merging:

- `Frontend lint, types, and build`
- `Python checks and unit tests`
- `Secret scan`
- `Build and scan container images`

Enable Dependabot updates using `.github/dependabot.yml`. Keep force pushes
disabled and require pull-request reviews.

## Deployment secrets

Only configure the secrets for platforms you use:

```text
RENDER_DEPLOY_HOOK_URL
RENDER_DEPLOY_ENABLED (repository variable, true/false)
SMOKE_TESTS_ENABLED (repository variable, true/false)
SMOKE_FRONTEND_URL
SMOKE_BACKEND_URL
SMOKE_MODEL_API_URL
SMOKE_MODEL_API_KEY
SMOKE_BACKEND_METRICS_TOKEN
SMOKE_MODEL_METRICS_TOKEN
```

Set the repository variable `SMOKE_TESTS_ENABLED=true` only after the production
URLs are available. PostHog and Grafana credentials belong in the deployment
platform environment, not in GitHub Actions.

## Production protection checklist

- Set `ALLOWED_ORIGINS` to the production frontend origin(s).
- Set `MODEL_API_KEY` on public model services.
- Set `METRICS_TOKEN` on every public API and collector target.
- Keep `/metrics` protected and never send prompts or API keys to analytics.
- Configure `/health` as the platform health-check path.
- Configure Grafana alerts for error rate, p95 latency, and missing metrics.
- Use separate development, staging, and production credentials.
