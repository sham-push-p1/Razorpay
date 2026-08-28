import { useEffect, useState } from "react";
import { api, type ChaosStatus } from "../lib/api";

export default function ChaosControl() {
  const [status, setStatus] = useState<ChaosStatus>({
    graph_offline: false,
    ml_offline: false,
    simulated_latency_ms: 0,
    is_active: false,
  });
  const [loading, setLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const s = await api.getChaosStatus();
      setStatus(s);
    } catch (e) {
      console.error("Failed to load chaos status", e);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleToggle = async (key: keyof ChaosStatus, val: any) => {
    setLoading(true);
    try {
      const updated = await api.setChaosState({ [key]: val });
      setStatus(updated);
      setToastMsg(`Chaos state updated: ${String(key)} = ${String(val)}`);
      setTimeout(() => setToastMsg(null), 3000);
    } catch (e: any) {
      alert(`Chaos update failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setLoading(true);
    try {
      const s = await api.resetChaos();
      setStatus(s);
      setToastMsg("✓ All subsystems restored to 100% Nominal Health!");
      setTimeout(() => setToastMsg(null), 3000);
    } catch (e: any) {
      alert(`Reset failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel chaos-control-panel">
      {toastMsg && <div className="floating-toast">{toastMsg}</div>}

      <div className="panel-header">
        <div className="flex-between">
          <div>
            <span className="eyebrow">CHAOS ENGINEERING & RESILIENCE</span>
            <h3>Graceful Degradation Sandbox</h3>
          </div>
          <span className={`status-badge-pill ${status.is_active ? "status-badge-pill--chaos" : "status-badge-pill--nominal"}`}>
            {status.is_active ? "⚠️ DEGRADED FALLBACK ACTIVE" : "🟢 PRODUCTION NOMINAL"}
          </span>
        </div>
      </div>

      <p className="chaos-desc">
        Test high-availability resilience. Kill subsystems mid-demo to prove the engine automatically rebalances scoring weights and keeps payment checkouts flowing with zero downtime.
      </p>

      <div className="chaos-toggles-grid">
        {/* Toggle 1: Graph Outage */}
        <div className={`chaos-card ${status.graph_offline ? "chaos-card--active" : ""}`}>
          <div className="chaos-card-top">
            <span className="chaos-card-title">🕸️ Kill Graph Service</span>
            <input
              type="checkbox"
              checked={status.graph_offline}
              onChange={(e) => handleToggle("graph_offline", e.target.checked)}
              disabled={loading}
              className="chaos-toggle-switch"
            />
          </div>
          <p className="chaos-card-text">
            Simulates graph cluster failure. System falls back to ML (65%) + Anomaly (30%) + Rules (5%).
          </p>
        </div>

        {/* Toggle 2: ML Cluster Outage */}
        <div className={`chaos-card ${status.ml_offline ? "chaos-card--active" : ""}`}>
          <div className="chaos-card-top">
            <span className="chaos-card-title">🧠 Kill ML Inference Cluster</span>
            <input
              type="checkbox"
              checked={status.ml_offline}
              onChange={(e) => handleToggle("ml_offline", e.target.checked)}
              disabled={loading}
              className="chaos-toggle-switch"
            />
          </div>
          <p className="chaos-card-text">
            Simulates XGBoost server timeout. System falls back to Anomaly (50%) + Graph (40%) + Rules (10%).
          </p>
        </div>

        {/* Toggle 3: Simulated Latency Jitter */}
        <div className={`chaos-card ${status.simulated_latency_ms > 0 ? "chaos-card--active" : ""}`}>
          <div className="chaos-card-top">
            <span className="chaos-card-title">⚡ Network Jitter (+45ms)</span>
            <input
              type="checkbox"
              checked={status.simulated_latency_ms > 0}
              onChange={(e) => handleToggle("simulated_latency_ms", e.target.checked ? 45 : 0)}
              disabled={loading}
              className="chaos-toggle-switch"
            />
          </div>
          <p className="chaos-card-text">
            Simulates cross-region network lag to verify latency budget alerting under stress.
          </p>
        </div>
      </div>

      <div className="chaos-actions-row">
        <button
          className="btn btn-secondary btn-sm"
          onClick={handleReset}
          disabled={!status.is_active || loading}
        >
          🔄 Restore All Subsystems to 100% Health
        </button>
      </div>
    </div>
  );
}
