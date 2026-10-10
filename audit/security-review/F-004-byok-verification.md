# F-004: Protect BYOK verification and prevent key leakage

Risk: High. `app/api/byok/verify/route.ts:15-227` accepts unauthenticated requests and forwards supplied credentials to provider APIs. Google Gemini is called with the credential in a URL query at `:160-162`, which can enter proxy/server/provider logs.

## Remediation

1. Add authentication or an abuse-resistant anonymous design: strict per-IP/user rate limits, request body and key-length limits, and quotas with alerting.
2. Send every provider credential only in the provider-prescribed header/body; never place a secret in a URL query string.
3. Disable request/response logging of credential-bearing headers and redact provider error bodies and exception messages.
4. Return stable generic verification errors without echoing upstream details.
5. Prefer client-side verification where safe, or use a short-lived server-side verification worker that never persists the key.

## Validation

- Logs, traces, metrics, and error responses contain no key material.
- Google verification requests contain no query credential.
- Rate-limit and abuse tests return 429 at configured thresholds while normal verification remains functional.

## Rollback

Disable the verification route or require an authenticated feature flag; never roll back to query-string credential transport.

