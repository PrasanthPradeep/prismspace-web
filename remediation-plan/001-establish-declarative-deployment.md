# Establish declarative deployment ownership

Finding: no ArgoCD, Flux, Kubernetes, Helm, or Kustomize application definition is present.

## Change

Choose one deployment owner. If the target remains Render, add a versioned Render service definition and document the production environment, health check, protected promotion path, and rollback policy. If Kubernetes is the target, add the corresponding ArgoCD or Flux application plus workload manifests and destination restrictions.

## Validation

Run the platform's render/manifest validation, then perform a dry-run or preview. For ArgoCD use `argocd app diff <app>`; for Flux use `flux diff kustomization <name> --path <path>`.

## Rollout and rollback

Promote first to staging and verify `/health`, logs, and metrics. Roll back by reverting the Git commit and pausing automated reconciliation or restoring the previous Render release.
