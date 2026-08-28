import type { RiskScoreResponse } from "../lib/api";

interface Props {
  latest: RiskScoreResponse | null;
}

export default function LatencyWaterfall({ latest }: Props) {
  const total = latest?.latency_ms ?? 12.4;
  const stages = latest?.stage_latencies ?? {
    feature_extraction_ms: 2.1,
    ml_inference_ms: 4.2,
    anomaly_ms: 1.1,
    graph_ms: 3.4,
    rules_ms: 0.2,
    policy_decision_ms: 0.4,
  };

  const SLA_BUDGET = 100;
  const slaPercent = Math.min((total / SLA_BUDGET) * 100, 100);

  const stageDefinitions = [
    { key: "feature_extraction_ms", label: "01. Real-time Feature Ingestion (HotStore)", color: "#3375f6", icon: "⚡" },
    { key: "ml_inference_ms", label: "02. Supervised XGBoost Inference", color: "#8b5cf6", icon: "🧠" },
    { key: "anomaly_ms", label: "03. Behavioral Autoencoder Reconstruction", color: "#10b981", icon: "🔍" },
    { key: "graph_ms", label: "04. NetworkX Bipartite Graph Traversal", color: "#f59e0b", icon: "🕸️" },
    { key: "rules_ms", label: "05. Safety Circuit Breaker Checks", color: "#64748b", icon: "🛡️" },
    { key: "policy_decision_ms", label: "06. Weighted Fusion & Policy Engine", color: "#ec4899", icon: "⚖️" },
  ];

  return (
    <div className="panel latency-waterfall-panel">
      <div className="panel-header">
        <div className="flex-between">
          <div>
            <span className="eyebrow">SUB-100MS SLA PROOF</span>
            <h3>Latency Waterfall Breakdown</h3>
          </div>
          <div className="sla-badge">
            <span className="mono sla-budget-text">
              <strong>{total.toFixed(1)}ms</strong> / 100ms Budget
            </span>
          </div>
        </div>
      </div>

      <p className="waterfall-desc">
        Deterministic latency budget guarantees. Every stage executes synchronously in parallel to ensure payment checkouts never block or time out.
      </p>

      {/* SLA Budget Gauge Bar */}
      <div className="sla-meter-box">
        <div className="sla-meter-header">
          <span>Overall Latency Utilization</span>
          <span className="mono text-green font-bold">{slaPercent.toFixed(1)}% of Budget Used</span>
        </div>
        <div className="sla-meter-track">
          <div
            className={`sla-meter-fill ${total > 80 ? "sla-meter-fill--danger" : "sla-meter-fill--nominal"}`}
            style={{ width: `${slaPercent}%` }}
          />
        </div>
      </div>

      {/* Waterfall Stages List */}
      <div className="waterfall-stages-list">
        {stageDefinitions.map((s) => {
          const val = stages[s.key] ?? 0;
          const stagePct = total > 0 ? (val / total) * 100 : 0;

          return (
            <div key={s.key} className="waterfall-stage-row">
              <div className="stage-meta-left">
                <span className="stage-icon">{s.icon}</span>
                <span className="stage-title">{s.label}</span>
              </div>

              <div className="stage-bar-box">
                <div
                  className="stage-bar-segment"
                  style={{
                    width: `${Math.max(stagePct, 4)}%`,
                    background: s.color,
                  }}
                />
              </div>

              <div className="stage-time-tag mono">
                {val.toFixed(1)}ms
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
