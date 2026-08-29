"""
Real-time Graph Intelligence Engine using NetworkX.

Builds and maintains a multi-relational entity graph (Users, Devices, IPs, Transactions)
to detect fraud syndicates, device spoofing, and multi-account velocity rings.
"""
from collections import deque
from typing import Dict, List, Any, Set, Tuple
import networkx as nx
from datetime import datetime

HUB_THRESHOLD = 15


def identify_hub_nodes(graph: Dict[str, Set[str]], threshold: int = HUB_THRESHOLD) -> Set[str]:
    """Returns the set of nodes whose degree exceeds threshold (shared infrastructure)."""
    return {node for node, neighbors in graph.items() if len(neighbors) > threshold}


def find_related_accounts_capped(
    start_node: str,
    graph: Dict[str, Set[str]],
    threshold: int = HUB_THRESHOLD,
    max_component_size: int = 500,
) -> Tuple[Set[str], List[str]]:
    """BFS connected-component traversal that does NOT walk through hub nodes."""
    hub_nodes = identify_hub_nodes(graph, threshold)

    if start_node not in graph:
        return set(), []

    visited: Set[str] = {start_node}
    hubs_touched: List[str] = []
    queue = deque([start_node])

    while queue and len(visited) < max_component_size:
        current = queue.popleft()

        if current in hub_nodes and current != start_node:
            continue

        for neighbor in graph.get(current, set()):
            if neighbor in hub_nodes:
                if neighbor not in hubs_touched:
                    hubs_touched.append(neighbor)
                continue
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(neighbor)

    visited.discard(start_node)
    return visited, hubs_touched


def ring_risk_score(related_accounts: Set[str], hub_nodes_encountered: List[str]) -> Dict[str, Any]:
    """Adjusts fraud-ring risk score based on whether component touched shared infrastructure hubs."""
    ring_size = len(related_accounts)
    hub_contamination = len(hub_nodes_encountered) > 0

    if hub_contamination:
        confidence_multiplier = 0.4
        note = (
            f"Component touches {len(hub_nodes_encountered)} shared-infrastructure "
            f"node(s); ring size {ring_size} may be inflated by legitimate shared "
            f"device/network usage. Treat as lower-confidence graph signal."
        )
    else:
        confidence_multiplier = 1.0
        note = f"Clean component of {ring_size} related account(s), no hub contamination."

    return {
        "ring_size": ring_size,
        "hub_contamination": hub_contamination,
        "hub_nodes": hub_nodes_encountered,
        "confidence_multiplier": confidence_multiplier,
        "note": note,
    }


def build_hub_capped_subgraph_networkx(nx_graph: nx.Graph, threshold: int = HUB_THRESHOLD) -> Tuple[nx.Graph, List[str]]:
    """Returns a copy of nx.Graph with hub nodes removed, safe for connected_components()."""
    hub_nodes = [n for n, d in nx_graph.degree() if d > threshold]
    clean = nx_graph.copy()
    clean.remove_nodes_from(hub_nodes)
    return clean, hub_nodes


class GraphIntelligenceService:
    def __init__(self):
        self.G = nx.Graph()
        self.max_nodes = 200
        self.HUB_THRESHOLD = HUB_THRESHOLD

    def reset(self):
        self.G.clear()

    def record_transaction(
        self,
        user_id: str,
        device_id: str,
        ip_hash: str,
        tx_id: str,
        amount: float,
        score: float,
        decision: str,
    ) -> None:
        """Add transaction nodes and edges to the dynamic entity graph."""
        now_str = datetime.utcnow().strftime("%H:%M:%S")

        # Add or update User node
        if not self.G.has_node(user_id):
            self.G.add_node(user_id, type="user", label=user_id, tx_count=0, max_score=0.0)
        self.G.nodes[user_id]["tx_count"] = self.G.nodes[user_id].get("tx_count", 0) + 1
        self.G.nodes[user_id]["max_score"] = max(self.G.nodes[user_id].get("max_score", 0.0), score)

        # Add or update Device node
        if not self.G.has_node(device_id):
            self.G.add_node(device_id, type="device", label=device_id, account_count=0)
        
        # Add or update IP node
        if not self.G.has_node(ip_hash):
            self.G.add_node(ip_hash, type="ip", label=ip_hash, user_count=0)

        # Add Transaction node
        self.G.add_node(
            tx_id,
            type="transaction",
            label=tx_id,
            amount=amount,
            score=score,
            decision=decision,
            time=now_str,
        )

        # Add edges between entities
        self.G.add_edge(user_id, device_id, relationship="uses_device")
        self.G.add_edge(user_id, ip_hash, relationship="originates_from_ip")
        self.G.add_edge(device_id, ip_hash, relationship="co_located")
        self.G.add_edge(user_id, tx_id, relationship="authorizes")

        # Trim old nodes if graph gets excessively large
        if self.G.number_of_nodes() > self.max_nodes:
            oldest_nodes = list(self.G.nodes())[:20]
            self.G.remove_nodes_from(oldest_nodes)

    def analyze_entity_risk(self, user_id: str, device_id: str, ip_hash: str) -> Dict[str, Any]:
        """Compute structural graph properties for risk scoring, respecting hub node caps."""
        dev_users = 0
        ip_users = 0
        cluster_size = 1
        is_shared_infra = False
        hubs_touched = []

        if self.G.has_node(device_id):
            dev_users = sum(1 for neighbor in self.G.neighbors(device_id) if self.G.nodes[neighbor].get("type") == "user")
            if dev_users > self.HUB_THRESHOLD:
                is_shared_infra = True
                self.G.nodes[device_id]["is_shared_infra"] = True
                hubs_touched.append(device_id)

        if self.G.has_node(ip_hash):
            ip_users = sum(1 for neighbor in self.G.neighbors(ip_hash) if self.G.nodes[neighbor].get("type") == "user")
            if ip_users > self.HUB_THRESHOLD:
                is_shared_infra = True
                self.G.nodes[ip_hash]["is_shared_infra"] = True
                hubs_touched.append(ip_hash)

        if self.G.has_node(user_id):
            try:
                # Exclude hub nodes (shared infra) from BFS component traversal
                clean_G, detected_hubs = build_hub_capped_subgraph_networkx(self.G, self.HUB_THRESHOLD)
                if user_id in clean_G:
                    comp = nx.node_connected_component(clean_G, user_id)
                    cluster_size = len(comp)
                else:
                    cluster_size = 1
            except Exception:
                cluster_size = 1

        score_assessment = ring_risk_score({user_id}, hubs_touched)

        return {
            "device_connected_users": min(dev_users, self.HUB_THRESHOLD) if not is_shared_infra else dev_users,
            "ip_connected_users": min(ip_users, self.HUB_THRESHOLD) if not is_shared_infra else ip_users,
            "cluster_size": cluster_size,
            "is_shared_infra": is_shared_infra,
            "hub_contamination": score_assessment["hub_contamination"],
            "hub_nodes": hubs_touched,
            "confidence_multiplier": score_assessment["confidence_multiplier"],
            "graph_note": score_assessment["note"],
        }


    def detect_fraud_rings(self) -> List[Dict[str, Any]]:
        """Identify connected components with multiple accounts sharing infrastructure (excluding hub shared infra)."""
        rings = []
        try:
            # Filter out hub nodes (e.g. public wifi / corporate IPs with > HUB_THRESHOLD connections)
            non_hub_nodes = [
                n for n in self.G.nodes()
                if not (self.G.degree(n) > self.HUB_THRESHOLD and self.G.nodes[n].get("type") in ("device", "ip"))
            ]
            sub_G = self.G.subgraph(non_hub_nodes)
            components = list(nx.connected_components(sub_G))

            for i, comp in enumerate(components):
                users = [n for n in comp if sub_G.nodes[n].get("type") == "user"]
                devices = [n for n in comp if sub_G.nodes[n].get("type") == "device"]
                ips = [n for n in comp if sub_G.nodes[n].get("type") == "ip"]
                txs = [n for n in comp if sub_G.nodes[n].get("type") == "transaction"]

                if len(users) >= 2 or len(devices) >= 2 or len(txs) >= 4:
                    scores = [sub_G.nodes[t].get("score", 0.0) for t in txs]
                    avg_score = round(sum(scores) / len(scores), 1) if scores else 0.0
                    rings.append({
                        "ring_id": f"RING-{i+1:03d}",
                        "user_count": len(users),
                        "device_count": len(devices),
                        "ip_count": len(ips),
                        "transaction_count": len(txs),
                        "avg_risk_score": avg_score,
                        "severity": "CRITICAL" if avg_score > 65 or len(users) >= 4 else "HIGH",
                        "members": {
                            "users": users[:5],
                            "devices": devices[:5],
                            "ips": ips[:5],
                        }
                    })
        except Exception:
            pass

        rings.sort(key=lambda r: r["avg_risk_score"], reverse=True)
        return rings

    def get_visualization_graph(self, limit_nodes: int = 70) -> Dict[str, Any]:
        """Export nodes and links with layout metadata for frontend D3/SVG visualization."""
        if self.G.number_of_nodes() == 0:
            return {"nodes": [], "links": [], "stats": {"total_nodes": 0, "total_edges": 0, "fraud_rings": 0}}

        subgraph_nodes = list(self.G.nodes())[-limit_nodes:]
        sub_G = self.G.subgraph(subgraph_nodes)

        nodes = []
        for node_id in sub_G.nodes():
            attrs = dict(sub_G.nodes[node_id])
            nodes.append({
                "id": node_id,
                "label": str(node_id),
                "type": attrs.get("type", "unknown"),
                "degree": sub_G.degree(node_id),
                "score": attrs.get("score", attrs.get("max_score", 0.0)),
                "decision": attrs.get("decision", "NONE"),
                "amount": attrs.get("amount", None),
            })

        links = []
        for u, v in sub_G.edges():
            rel = sub_G.edges[u, v].get("relationship", "linked")
            links.append({"source": u, "target": v, "relationship": rel})

        rings = self.detect_fraud_rings()

        return {
            "nodes": nodes,
            "links": links,
            "stats": {
                "total_nodes": self.G.number_of_nodes(),
                "total_edges": self.G.number_of_edges(),
                "fraud_rings": len(rings),
            },
            "fraud_rings": rings,
        }


    def get_entity(self, entity_id: str) -> Dict[str, Any]:
        """Fetch entity details, degree, and directly connected neighbors."""
        if not self.G.has_node(entity_id):
            return {"id": entity_id, "found": False, "neighbors": [], "degree": 0}
        
        attrs = dict(self.G.nodes[entity_id])
        neighbors = []
        for n in self.G.neighbors(entity_id):
            n_attrs = dict(self.G.nodes[n])
            neighbors.append({
                "id": n,
                "type": n_attrs.get("type", "unknown"),
                "score": n_attrs.get("score", 0.0),
                "edge": self.G.edges[entity_id, n].get("relationship", "linked"),
            })

        return {
            "id": entity_id,
            "found": True,
            "type": attrs.get("type", "unknown"),
            "degree": self.G.degree(entity_id),
            "attributes": attrs,
            "neighbors": neighbors,
        }

    def get_ring_for_tx(self, tx_id: str) -> Dict[str, Any]:
        """Find the fraud ring containing a specific transaction ID."""
        rings = self.detect_fraud_rings()
        for ring in rings:
            # Check if any user in this ring is connected to this transaction
            for user in ring["members"]["users"]:
                if self.G.has_edge(user, tx_id):
                    return {"found": True, "ring": ring}
        return {"found": False, "ring": None}


# Global singleton instance
graph_service = GraphIntelligenceService()
