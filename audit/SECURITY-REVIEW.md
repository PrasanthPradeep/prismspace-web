# PrismSpace security review

Review date: 2026-10-03

Scope: Next.js application routes, Python backend/model services, scraper, CI, containers, dependency metadata, and repository secret hygiene.

The repository-local security-review skill is explicitly read-only. These are implementation-ready remediation plans; application and infrastructure source files were not changed during this review.

## Findings

| # | Finding | Category | Impact | Effort | Risk | Confidence | Evidence |
|---|---|---|---|---|---|---|---|
| 1 | Hardcoded NVIDIA provider credential in backend fallback | Secrets | Anyone with repository/history access can use the credential; removal alone does not revoke it | S | Critical | High | `backend/hive_api.py:782` |
| 2 | Privileged backend API has no authentication or object ownership checks | Identity/access | A reachable deployment exposes agent control, logs, filesystem/tool operations, MCP token management, and Gmail actions to unauthenticated callers | M | Critical | High | `backend/hive_api.py:2199-2556`; `backend/hive_api.py:79-85` |
| 3 | Scraper SSRF controls are incomplete | Network/SSRF | Public `/api/scrape-docs` can make server-side requests to unblocked private/link-local destinations through alternate address forms or redirects | M | High | High | `app/api/scrape-docs/route.ts:15-50`; `lib/scrape-docs.ts:41-57,366-375,417-445` |
| 4 | BYOK verification endpoint is unauthenticated and sends one provider key in a URL query | Secrets/abuse | Public callers can burn provider verification quota; query-string logging can retain Google keys | S | High | High | `app/api/byok/verify/route.ts:15-227`, especially `:160-162` |
| 5 | Dependency audit is non-blocking while installed dependencies contain critical/high advisories | Supply chain | Vulnerable packages can ship because the CI job reports findings but does not gate merges | M | High | High | `.github/workflows/ci.yml:62-78`; `package-lock.json`; `npm audit --audit-level=high` |
| 6 | CI third-party actions are tag-pinned rather than immutable commit-pinned | Supply chain | A changed upstream tag can alter the build or deploy workflow | S | Medium | High | `.github/workflows/ci.yml:21-117` |

Scanner note: `gitleaks`, `trivy`, and `pip-audit` were not installed in the review environment. `npm audit --audit-level=high` ran successfully and reported 23 vulnerabilities (3 moderate, 19 high, 1 critical). No secret values are reproduced here.

