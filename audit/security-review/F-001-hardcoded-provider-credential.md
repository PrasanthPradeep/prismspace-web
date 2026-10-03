# F-001: Remove and rotate hardcoded provider credential

Risk: Critical. The backend contains a provider credential fallback at `backend/hive_api.py:782`. Treat it as compromised because it is present in source and repository history.

## Remediation

1. Rotate/revoke the exposed provider credential with the provider before deploying any code change.
2. Remove the literal fallback from `backend/hive_api.py`; require an injected secret or an explicitly supplied BYOK value.
3. Replace any runtime reference with a secret-manager/environment reference and fail closed when it is absent.
4. Search current files and full Git history with Gitleaks or equivalent; purge the historical value using the repository’s approved history-rewrite process, then rotate again if history was publicly reachable.
5. Add a pre-commit/CI secret scan that fails on newly introduced credentials.

## Validation

- Secret scan returns no finding for current files and history.
- Backend starts without the secret only when the affected provider is unused; provider calls fail with a configuration error rather than using a fallback.
- A rotated test credential succeeds through the approved secret injection path.

## Rollback

Restore the previous secret reference configuration only, never the literal credential. Keep the rotated credential revoked unless incident response explicitly reauthorizes it.

