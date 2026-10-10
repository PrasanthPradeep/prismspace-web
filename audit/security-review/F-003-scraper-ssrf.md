# F-003: Harden scraper SSRF protection

Risk: High. `/api/scrape-docs` is a public POST surface. `isBlockedHostname` only checks a subset of textual hostname patterns, while `fetch` follows redirects by default. The destination can therefore resolve or redirect to addresses that must not be reachable from the server.

## Remediation

1. Resolve the hostname before every request and reject loopback, private, link-local, multicast, unspecified, reserved, and cloud-metadata address ranges for both IPv4 and IPv6.
2. Apply the check to every crawl-discovered URL and every redirect target; preferably disable automatic redirects and validate each `Location` manually.
3. Use a bounded HTTP client with response-size limits, strict content-type handling, maximum pages, concurrency limits, and per-request/global deadlines.
4. Consider an egress proxy or isolated worker with no access to internal networks as defense in depth.
5. Add tests for IPv6 loopback/link-local, decimal/hex/encoded address forms, DNS rebinding, redirects to private addresses, and non-HTTP schemes.

## Validation

- All private/link-local/metadata targets and redirects are rejected before connection.
- Public documentation pages still scrape in single and crawl modes.
- SSRF regression tests pass and response memory/time limits are enforced.

## Rollback

Restore only the prior allowlist behavior behind a feature flag while keeping the scraper worker network-isolated; do not remove the egress boundary.

