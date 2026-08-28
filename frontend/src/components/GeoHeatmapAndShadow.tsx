import { useState, useEffect } from "react";
import { api } from "../lib/api";

export default function GeoHeatmapAndShadow() {
  const [heatmap, setHeatmap] = useState<any>(null);
  const [shadow, setShadow] = useState<any>(null);
  const [activeSubTab, setActiveSubTab] = useState<"geo" | "shadow">("geo");

  useEffect(() => {
    api.getCityFraudHeatmap().then(setHeatmap).catch(() => {});
    api.getShadowModelComparison().then(setShadow).catch(() => {});
  }, []);

  return (
    <div className="panel geo-shadow-panel">
      <div className="panel-header">
        <div className="flex-between">
          <div>
            <span className="eyebrow">GEOSPATIAL INTELLIGENCE & MLOPS EVALUATION</span>
            <h3>Geospatial Threat Map & Champion/Challenger Models</h3>
          </div>
          <div className="filter-pill-group">
            <button
              type="button"
              className={`filter-pill ${activeSubTab === "geo" ? "filter-pill--active" : ""}`}
              onClick={() => setActiveSubTab("geo")}
            >
              🌍 City Fraud Heatmap & Impossible Travel
            </button>
            <button
              type="button"
              className={`filter-pill ${activeSubTab === "shadow" ? "filter-pill--active" : ""}`}
              onClick={() => setActiveSubTab("shadow")}
            >
              🔄 Champion vs Challenger (Shadow Evaluation)
            </button>
          </div>
        </div>
      </div>

      {activeSubTab === "geo" && (
        <div className="geo-heatmap-body">
          <p className="matrix-desc">
            Real-time geospatial intelligence cross-referencing IP reputation, impossible travel velocities, and metro fraud hotspots.
          </p>

          {/* Impossible Travel Callout */}
          <div className="impossible-travel-card">
            <div className="it-header">
              <span className="badge badge-block font-bold">🚨 IMPOSSIBLE TRAVEL DETECTOR</span>
              <span className="mono text-xs">Haversine Velocity: <strong>8,240 km/h</strong></span>
            </div>
            <div className="it-body">
              <div className="it-step">
                <span className="it-city">📍 Chennai, IN</span>
                <span className="it-time mono">10:02 AM IST</span>
              </div>
              <span className="it-arrow">&rarr; 6 mins &rarr;</span>
              <div className="it-step">
                <span className="it-city">📍 London, UK</span>
                <span className="it-time mono">10:08 AM IST</span>
              </div>
            </div>
            <div className="it-footer">
              <span>Commercial Airline Ceiling: &lt;900 km/h. Autonomous <strong>IMPOSSIBLE_TRAVEL</strong> rule enforcement: +50 risk points.</span>
            </div>
          </div>

          {/* City Risk Grid */}
          <div className="city-heat-grid">
            {heatmap?.cities?.map((c: any) => (
              <div key={c.city} className="city-card">
                <div className="city-card-header">
                  <span className="city-name font-bold">{c.city}</span>
                  <span
                    className="badge"
                    style={{
                      background: `${c.color}15`,
                      color: c.color,
                      border: `1px solid ${c.color}44`,
                    }}
                  >
                    {c.risk_level}
                  </span>
                </div>
                <div className="city-card-body">
                  <div className="city-score-row">
                    <span className="mono font-bold" style={{ color: c.color, fontSize: "20px" }}>
                      {c.score}
                    </span>
                    <span className="text-xs text-dim">/ 100 Risk</span>
                  </div>
                  <span className="text-xs text-dim">Protected Vol: <strong>{c.volume}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSubTab === "shadow" && shadow && (
        <div className="shadow-model-body">
          <p className="matrix-desc">
            Production Champion model executing active gateway decisions in tandem with a Shadow Challenger evaluating live dark traffic for safe canary deployment.
          </p>

          <div className="shadow-table-wrapper">
            <table className="shadow-table">
              <thead>
                <tr>
                  <th>Model Candidate</th>
                  <th>Status</th>
                  <th>ROC-AUC</th>
                  <th>Precision</th>
                  <th>Recall</th>
                  <th>False Positive</th>
                  <th>P95 Latency</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>{shadow.champion.name}</strong></td>
                  <td><span className="badge badge-pass">ACTIVE PROD</span></td>
                  <td className="mono font-bold">{shadow.champion.roc_auc}</td>
                  <td className="mono">{shadow.champion.precision}</td>
                  <td className="mono">{shadow.champion.recall}</td>
                  <td className="mono text-dim">{shadow.champion.false_positive_rate}</td>
                  <td className="mono">{shadow.champion.p95_latency_ms}ms</td>
                </tr>
                <tr>
                  <td><strong>{shadow.challenger.name}</strong></td>
                  <td><span className="badge badge-stepup">SHADOW CANARY</span></td>
                  <td className="mono font-bold text-green">{shadow.challenger.roc_auc}</td>
                  <td className="mono text-green">{shadow.challenger.precision}</td>
                  <td className="mono text-green">{shadow.challenger.recall}</td>
                  <td className="mono text-green">{shadow.challenger.false_positive_rate}</td>
                  <td className="mono text-green font-bold">{shadow.challenger.p95_latency_ms}ms</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="shadow-recommendation-box">
            <span className="rec-icon">🚀</span>
            <div>
              <strong>MLOps Canary Promotion Signal:</strong> {shadow.delta.recommendation}
              <p className="text-xs text-dim">
                AUC Gain: {shadow.delta.auc_gain} • False Positive Reduction: {shadow.delta.false_positive_reduction} • Latency Speedup: {shadow.delta.latency_improvement_ms}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
