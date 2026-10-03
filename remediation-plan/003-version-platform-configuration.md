# Version platform configuration

Finding: deployment settings are external to Git and no `render.yaml` or equivalent exists.

## Change

Commit the selected platform's service definition, health-check path, build/start commands, environment names, and non-secret defaults. Keep credentials and tokens only in the platform or protected CI secret store.

## Validation

Compare the generated provider configuration with the current production settings. Run a preview/plan and verify that the service name, region, health check, and environment separation are unchanged unless intentionally migrated.

## Rollout and rollback

Apply to staging, then production during a controlled window. Revert the configuration commit and restore the prior provider revision if the preview or health checks fail.
