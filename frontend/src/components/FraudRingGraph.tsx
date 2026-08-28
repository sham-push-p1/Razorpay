import { useEffect, useState, useMemo, useRef } from "react";
import { api, type GraphNode, type GraphLink, type FraudRing } from "../lib/api";

export default function FraudRingGraph() {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [links, setLinks] = useState<GraphLink[]>([]);
  const [stats, setStats] = useState<{ total_nodes: number; total_edges: number; fraud_rings: number }>({
    total_nodes: 0,
    total_edges: 0,
    fraud_rings: 0,
  });
  const [fraudRings, setFraudRings] = useState<FraudRing[]>([]);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedRing, setSelectedRing] = useState<FraudRing | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [loading, setLoading] = useState(false);

  const containerRef = useRef<SVGSVGElement | null>(null);

  const fetchGraph = async () => {
    setLoading(true);
    try {
      const data = await api.getGraphData(80);
      setNodes(data.nodes || []);
      setLinks(data.links || []);
      setStats(data.stats || { total_nodes: 0, total_edges: 0, fraud_rings: 0 });
      setFraudRings(data.fraud_rings || []);
    } catch (e) {
      console.error("Failed to load graph data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGraph();
    const interval = setInterval(fetchGraph, 5000);
    return () => clearInterval(interval);
  }, []);

  // Compute 2D node positions using deterministic circular layout grouped by type
  const layoutNodes = useMemo(() => {
    const width = 800;
    const height = 520;
    const centerX = width / 2;
    const centerY = height / 2;

    const filtered = nodes.filter((n) => {
      if (filterType === "all") return true;
      return n.type === filterType;
    });

    const total = filtered.length;
    if (total === 0) return new Map<string, { x: number; y: number; node: GraphNode }>();

    const map = new Map<string, { x: number; y: number; node: GraphNode }>();

    // Layered radial orbits
    filtered.forEach((n, idx) => {
      let radius = 180;
      if (n.type === "device") radius = 120;
      if (n.type === "ip") radius = 230;
      if (n.type === "transaction") radius = 70;

      const angle = (idx / total) * 2 * Math.PI + (n.type.charCodeAt(0) * 0.4);
      // Small jitter based on hash
      const jitter = (n.id.charCodeAt(n.id.length - 1) % 15) - 7;
      const x = centerX + (radius + jitter) * Math.cos(angle);
      const y = centerY + (radius + jitter) * Math.sin(angle);

      map.set(n.id, { x, y, node: n });
    });

    return map;
  }, [nodes, filterType]);

  const getNodeColor = (type: string, score: number = 0) => {
    if (score > 70) return "#ef4444"; // Red / Block
    if (score > 30) return "#f59e0b"; // Yellow / Step-Up
    switch (type) {
      case "user":
        return "#3b82f6";
      case "device":
        return "#ec4899";
      case "ip":
        return "#8b5cf6";
      case "transaction":
        return "#10b981";
      default:
        return "#64748b";
    }
  };

  const handleResetGraph = async () => {
    await api.resetGraph();
    fetchGraph();
  };

  return (
    <div className="graph-view-container">
      <div className="graph-header-bar">
        <div className="graph-title-group">
          <h2>🕸️ Multi-Entity Fraud Ring Explorer</h2>
          <p className="graph-sub">
            Real-time entity relationship graph mapping Users, Devices, IPs & Transactions
          </p>
        </div>

        <div className="graph-controls">
          <div className="filter-pill-group">
            {["all", "user", "device", "ip", "transaction"].map((t) => (
              <button
                key={t}
                className={`filter-pill ${filterType === t ? "filter-pill--active" : ""}`}
                onClick={() => setFilterType(t)}
              >
                {t.toUpperCase()}
              </button>
            ))}
          </div>
          <button className="btn btn-secondary btn-sm" onClick={fetchGraph} disabled={loading}>
            🔄 Refresh
          </button>
          <button className="btn btn-ghost btn-sm" onClick={handleResetGraph}>
            Clear Graph
          </button>
        </div>
      </div>

      <div className="graph-stats-row">
        <div className="stat-card">
          <span className="stat-label">TOTAL NODES</span>
          <span className="stat-val">{stats.total_nodes}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">ENTITY EDGES</span>
          <span className="stat-val">{stats.total_edges}</span>
        </div>
        <div className="stat-card stat-card--danger">
          <span className="stat-label">FRAUD RINGS DETECTED</span>
          <span className="stat-val text-red">{fraudRings.length}</span>
        </div>
      </div>

      <div className="graph-workspace">
        <div className="graph-canvas-box">
          <svg
            ref={containerRef}
            viewBox="0 0 800 520"
            className="graph-svg"
          >
            {/* Background grid */}
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* Links */}
            {links.map((link, i) => {
              const src = layoutNodes.get(link.source);
              const tgt = layoutNodes.get(link.target);
              if (!src || !tgt) return null;
              const isHighlighted =
                selectedNode && (selectedNode.id === link.source || selectedNode.id === link.target);

              return (
                <line
                  key={i}
                  x1={src.x}
                  y1={src.y}
                  x2={tgt.x}
                  y2={tgt.y}
                  stroke={isHighlighted ? "#f59e0b" : "rgba(255,255,255,0.12)"}
                  strokeWidth={isHighlighted ? 2.5 : 1}
                  strokeDasharray={link.relationship === "co_located" ? "3,3" : undefined}
                />
              );
            })}

            {/* Nodes */}
            {Array.from(layoutNodes.values()).map(({ x, y, node }) => {
              const isSelected = selectedNode?.id === node.id;
              const isRingMember = selectedRing?.members?.users?.includes(node.id) ||
                selectedRing?.members?.devices?.includes(node.id) ||
                selectedRing?.members?.ips?.includes(node.id);
              const color = getNodeColor(node.type, node.score);
              const radius = node.type === "device" ? 14 : (node.type === "user" ? 12 : 10);

              return (
                <g
                  key={node.id}
                  transform={`translate(${x},${y})`}
                  className="graph-node-group"
                  onClick={() => setSelectedNode(node)}
                  style={{ cursor: "pointer" }}
                >
                  {isRingMember && (
                    <circle r={radius + 8} fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="4,4" className="pulse-ring" />
                  )}
                  {isSelected && (
                    <circle r={radius + 6} fill="none" stroke="#38bdf8" strokeWidth="2" />
                  )}
                  <circle
                    r={radius}
                    fill={color}
                    stroke="#0f172a"
                    strokeWidth="2"
                    opacity={selectedNode && !isSelected ? 0.4 : 1}
                  />
                  <text
                    y={radius + 12}
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    {node.label.length > 9 ? node.label.slice(0, 8) + "…" : node.label}
                  </text>
                </g>
              );
            })}
          </svg>

          {nodes.length === 0 && (
            <div className="graph-empty-overlay">
              <p>No entity nodes in memory. Run attack scenarios from the Console to populate the graph.</p>
            </div>
          )}
        </div>

        {/* Sidebar info */}
        <div className="graph-sidebar">
          {selectedNode ? (
            <div className="node-detail-panel">
              <div className="panel-header">
                <span className="eyebrow">NODE DETAILS</span>
                <button className="btn-close-sm" onClick={() => setSelectedNode(null)}>✕</button>
              </div>
              <h4 className="node-id-title">{selectedNode.id}</h4>
              <div className="node-badge-row">
                <span className="badge badge-type">{selectedNode.type.toUpperCase()}</span>
                {selectedNode.score !== undefined && (
                  <span className={`badge ${selectedNode.score > 70 ? "badge-block" : "badge-pass"}`}>
                    Risk: {selectedNode.score}
                  </span>
                )}
              </div>

              <div className="node-meta-list">
                <div className="meta-item">
                  <span className="label">Graph Degree:</span>
                  <span className="val">{selectedNode.degree} connections</span>
                </div>
                {selectedNode.amount !== undefined && selectedNode.amount !== null && (
                  <div className="meta-item">
                    <span className="label">Amount:</span>
                    <span className="val">₹{selectedNode.amount.toLocaleString()}</span>
                  </div>
                )}
                {selectedNode.decision && (
                  <div className="meta-item">
                    <span className="label">Decision:</span>
                    <span className="val">{selectedNode.decision}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="node-detail-panel node-detail-panel--placeholder">
              <p>Click any node in the graph to inspect connected devices, IPs, and transaction histories.</p>
            </div>
          )}

          {/* Detected Fraud Rings */}
          <div className="fraud-rings-list-panel">
            <div className="panel-header">
              <span className="eyebrow">ACTIVE SYNDICATES</span>
              <h4>Collusion Clusters ({fraudRings.length})</h4>
            </div>

            {fraudRings.length === 0 ? (
              <p className="empty-rings-note">No fraud rings detected in current window.</p>
            ) : (
              <div className="rings-scroll-list">
                {fraudRings.map((ring) => (
                  <div
                    key={ring.ring_id}
                    className={`ring-card ${selectedRing?.ring_id === ring.ring_id ? "ring-card--active" : ""}`}
                    onClick={() => setSelectedRing(selectedRing?.ring_id === ring.ring_id ? null : ring)}
                  >
                    <div className="ring-card-header">
                      <span className="ring-id">{ring.ring_id}</span>
                      <span className="ring-severity">{ring.severity}</span>
                    </div>
                    <div className="ring-metrics-grid">
                      <div><span className="ring-sub-label">Users:</span> {ring.user_count}</div>
                      <div><span className="ring-sub-label">Devices:</span> {ring.device_count}</div>
                      <div><span className="ring-sub-label">IPs:</span> {ring.ip_count}</div>
                      <div><span className="ring-sub-label">Avg Risk:</span> {ring.avg_risk_score}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
