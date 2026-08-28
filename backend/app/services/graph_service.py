"""
Real-time Graph Intelligence Engine using NetworkX.

Builds and maintains a multi-relational entity graph (Users, Devices, IPs, Transactions)
to detect fraud syndicates, device spoofing, and multi-account velocity rings.
"""
from typing import Dict, List, Any
import networkx as nx
from datetime import datetime


class GraphIntelligenceService:
    def __init__(self):
        self.G = nx.Graph()
        self.max_nodes = 200

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

    HUB_THRESHOLD = 20

    def analyze_entity_risk(self, user_id: str, device_id: str, ip_hash: str) -> Dict[str, Any]:
        """Compute structural graph properties for risk scoring, respecting hub node caps."""
        dev_users = 0
        ip_users = 0
        cluster_size = 1
        is_shared_infra = False

        if self.G.has_node(device_id):
            dev_users = sum(1 for neighbor in self.G.neighbors(device_id) if self.G.nodes[neighbor].get("type") == "user")
            if dev_users > self.HUB_THRESHOLD:
                is_shared_infra = True
                self.G.nodes[device_id]["is_shared_infra"] = True

        if self.G.has_node(ip_hash):
            ip_users = sum(1 for neighbor in self.G.neighbors(ip_hash) if self.G.nodes[neighbor].get("type") == "user")
            if ip_users > self.HUB_THRESHOLD:
                is_shared_infra = True
                self.G.nodes[ip_hash]["is_shared_infra"] = True

        if self.G.has_node(user_id):
            try:
                # Exclude hub nodes (shared infra) from BFS component traversal to avoid false-positive giant components
                valid_nodes = [
                    n for n in self.G.nodes()
                    if not (self.G.degree(n) > self.HUB_THRESHOLD and self.G.nodes[n].get("type") in ("device", "ip"))
                ]
                sub_G = self.G.subgraph(valid_nodes)
                if user_id in sub_G:
                    comp = nx.node_connected_component(sub_G, user_id)
                    cluster_size = len(comp)
                else:
                    cluster_size = 1
            except Exception:
                cluster_size = 1

        return {
            "device_connected_users": min(dev_users, self.HUB_THRESHOLD) if not is_shared_infra else dev_users,
            "ip_connected_users": min(ip_users, self.HUB_THRESHOLD) if not is_shared_infra else ip_users,
            "cluster_size": cluster_size,
            "is_shared_infra": is_shared_infra,
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
