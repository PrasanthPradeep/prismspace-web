# Pin the Alloy image

Finding: `monitoring/Dockerfile` uses `grafana/alloy:latest`.

## Change

Replace `latest` with an approved version tag and preferably its immutable digest. Update deliberately through Dependabot or a scheduled review, then rebuild and scan the image.

## Validation

Run `docker build -f monitoring/Dockerfile monitoring`, validate the Alloy configuration, and run the Trivy scan used by CI. Confirm remote-write and scrape targets start successfully.

## Rollout and rollback

Deploy the pinned image to staging first. Roll back by restoring the previous known-good tag or digest and reverting the Git commit.
