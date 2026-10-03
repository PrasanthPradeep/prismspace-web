# GitOps audit

## Scope and limitations

This was a read-only repository audit. No ArgoCD, Flux, Kubernetes, Helm, or Kustomize configuration was found. No GitOps CLI or kubeconfig was available, so live controller health, sync status, and Git-versus-cluster diffs could not be verified.

## Posture

| Application | Engine | Health | Sync | Auto-sync / Prune | Drift | Verdict |
|---|---|---|---|---|---|---|
| PrismSpace web | GitHub Actions → Render webhook | Unknown | Unknown | Unknown | No live controller evidence | NOT GITOPS-MANAGED |
| Grafana Alloy collector | Docker Compose / platform deployment | Unknown | Unknown | Unknown | No declarative deployment state | OPERATIONAL GAP |

## Findings

1. No declarative GitOps application definitions or live reconciliation evidence.
2. Render deployment has no mandatory post-deploy health gate or automated rollback.
3. Platform deployment configuration is external to version control.
4. Grafana Alloy uses the mutable `latest` image tag.
5. The collector defines placeholder scrape targets and may use empty bearer tokens.

Detailed remediation plans are in [remediation-plan/README.md](../remediation-plan/README.md).
