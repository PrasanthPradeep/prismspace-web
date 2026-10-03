# Add post-deploy verification and rollback

Finding: the Render webhook reports trigger success, while production smoke tests are optional.

## Change

Make deployment verification mandatory for production. Poll the provider deployment status, then run the smoke test against the deployed revision. Keep smoke-test secrets in an environment-scoped secret store. Configure automatic rollback or an explicit pause when verification fails.

## Validation

Run the workflow on staging first. Confirm that a healthy deployment passes and an intentionally failed health check blocks promotion.

## Rollout and rollback

Use a protected production environment with required reviewers. On failure, stop promotion, restore the last known-good provider release, and revert the triggering Git commit if necessary.
