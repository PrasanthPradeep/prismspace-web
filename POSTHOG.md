# PostHog analytics

PrismSpace uses PostHog for product analytics and Grafana Cloud for backend
latency, uptime, and model-service metrics.

## Configure

Create a PostHog project, then add these variables to `.env.local` for local
development and to the Next.js host for production:

```env
NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN=phc_your_project_token
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
POSTHOG_PROJECT_TOKEN=phc_your_project_token
POSTHOG_HOST=https://us.i.posthog.com
```

The browser token is intended to be public. Do not put any personal API key,
model-provider key, prompt, or prompt response in these variables or events.

## Events currently captured

- Automatic pageviews and page leaves
- `agent_created`: provider, model, max agents, human-in-loop setting
- `intelligence_requested`: success/error and prompt length only
- `agent_approval_decided`: approval result
- `agent_deleted`
- `agent_operation_cancelled`: cancellation result

Autocapture and session recording are disabled. This keeps the initial setup
focused on useful aggregate metrics without collecting arbitrary UI text or
prompt contents.

## Suggested PostHog insights

- Daily/weekly active users from pageviews
- Agent creation trend by provider and model
- Intelligence request success rate
- Agent approval rate
- Cancellation rate
- Funnel: pageview → agent created → completed agent

The standalone FastAPI model endpoint remains monitored through Grafana Cloud
Prometheus metrics, which is better suited to request rate, latency, errors,
and service health.
