# F-002: Authenticate and authorize backend operations

Risk: Critical. The FastAPI routes at `backend/hive_api.py:2199-2556` have no shared authentication dependency. The API accepts caller-controlled `user_id` values and exposes agent control, logs, tool-backed filesystem operations, MCP token writes/removals, and Gmail status/disconnect operations.

## Remediation

1. Put the backend behind an authenticated identity boundary (OIDC/session validation or a narrowly scoped service credential for server-to-server calls).
2. Add a required dependency to every non-health route; keep `/health` unauthenticated only if deployment health checks require it.
3. Derive the user identity from the verified session/token, never from a request body or query parameter.
4. Enforce ownership checks for every agent, log stream, Gmail record, and MCP token. Return a generic not-found response for objects outside the caller’s tenant.
5. Restrict tool capabilities by policy and tenant; keep destructive filesystem, transfer, terminal, SQL, and external-service actions behind explicit authorization and approval.
6. Configure production CORS to exact trusted origins, disable credentialed cross-origin access unless required, and reject wildcard methods/headers.
7. Add rate limits and audit logs for token mutation, agent creation, approval, deletion, and OAuth endpoints.

## Validation

- Anonymous requests to every protected route return 401/403.
- A user cannot read, mutate, approve, cancel, or delete another user’s agent or credentials.
- Legitimate frontend flows pass with the verified identity; CORS integration tests accept only configured origins.
- Add route-matrix tests covering all `@app` endpoints.

## Rollback

Revert the auth middleware/configuration while keeping the service network-private and access restricted at the gateway; do not restore unauthenticated public exposure.

