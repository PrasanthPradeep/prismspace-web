# Make metrics targets explicit

Finding: the collector always declares Render, Railway, and Cloudflare targets, including placeholder hosts and empty-token defaults.

## Change

Enable each scrape component only when its target and token are configured, or generate the collector configuration from an environment-specific declarative deployment. Remove placeholder defaults from production configuration and fail startup when a required production target is missing.

## Validation

Run the collector with only the intended target configured. Confirm there are no DNS errors for unused platforms, `/metrics` requests receive authorization, and remote-write succeeds.

## Rollout and rollback

Deploy the revised collector to staging, verify target health and alert noise, then promote. Roll back by restoring the previous collector configuration if collection or remote-write fails.
