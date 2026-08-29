from __future__ import annotations
from collections import defaultdict
from typing import Any

def graph_features(workflow: dict[str, Any]) -> dict[str, float]:
    """Extract stable, model-ready DAG complexity features from node/edge JSON."""
    nodes = workflow.get("nodes", workflow.get("steps", [])); edges = workflow.get("edges", [])
    names = [str(n.get("id", n.get("name", i))) if isinstance(n,dict) else str(i) for i,n in enumerate(nodes)]
    children: dict[str,list[str]] = defaultdict(list)
    for edge in edges:
        if isinstance(edge,dict): children[str(edge.get("source"))].append(str(edge.get("target")))
    def depth(node: str, visited: set[str]) -> int:
        if node in visited: return 0
        return 1 + max((depth(child,visited|{node}) for child in children[node]), default=0)
    return {"node_count": float(len(nodes)), "edge_count": float(len(edges)), "max_depth": float(max((depth(n,set()) for n in names),default=0)), "branching_factor": float(len(edges)/max(len(nodes),1))}
