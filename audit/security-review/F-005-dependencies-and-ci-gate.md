# F-005: Remediate dependency advisories and make CI enforcement real

Risk: High. `npm audit --audit-level=high` reported 23 vulnerabilities, including a critical Next.js advisory. `.github/workflows/ci.yml:62-78` marks the dependency-audit job `continue-on-error: true`, so findings do not block delivery.

## Remediation

1. Upgrade Next.js and related React/build packages to a supported compatible release, following the repository’s required `node_modules/next/dist/docs/` guidance and testing breaking changes.
2. Resolve direct and transitive high/critical advisories in the lockfile; avoid `npm audit fix --force` without reviewing breaking changes.
3. Run the Python dependency audit after installing `pip-audit`, and update backend/model requirements to fixed versions.
4. Remove `continue-on-error` once the baseline is cleared, or use a versioned, documented temporary allowlist with expiry and owner.
5. Add an SBOM/dependency review artifact and fail CI on new critical/high findings.

## Validation

- `npm audit --audit-level=high` and `pip-audit` pass with the approved baseline.
- Frontend lint, typecheck, build, Python tests, and container scans pass.
- Lockfile changes are reviewed and reproducible with clean installs.

## Rollback

Revert the lockfile/package updates as one reviewed commit while keeping the audit job visible; do not re-enable silent failure for newly introduced findings.

