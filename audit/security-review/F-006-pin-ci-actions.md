# F-006: Pin third-party CI actions immutably

Risk: Medium. Workflow actions in `.github/workflows/ci.yml:21-117` use mutable major/version tags such as `actions/checkout@v5` and `aquasecurity/trivy-action@0.28.0`.

## Remediation

1. Pin each third-party action to a full commit SHA.
2. Keep the human-readable release in a comment beside the SHA.
3. Use Dependabot or an equivalent controlled update process to propose SHA changes, with review and changelog checks.
4. Restrict workflow permissions per job; retain only the permissions needed for checkout, scans, and deploy.

## Validation

- A workflow linter confirms all external actions are SHA-pinned.
- CI completes successfully from a clean runner.
- Dependabot can identify and update pinned actions through reviewed pull requests.

## Rollback

Revert to the previous known-good SHAs, not floating tags.

