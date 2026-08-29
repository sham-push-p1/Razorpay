import type { RiskScoreResponse } from "../lib/api";
import { IconCpu, IconSearch, IconGraph, IconShield, IconBarChart, IconLock } from "./Icons";


interface Props {
  latest: RiskScoreResponse | null;
}

export default function EnsembleBreakdown({ latest }: Props) {
  const scores = latest?.ensemble_scores ?? {
    ml: 0,
    anomaly: 0,
    graph: 0,
    rules: 0,
  };

  const weights = latest?.weights_used ?? {
    ml: 0.50,
    anomaly: 0.25,
    graph: 0.20,
    rules: 0.05,
  };

  const disagreement = latest?.disagreement_index ?? 0;
  const isDegraded = latest?.is_degraded ?? false;
  const lossMatrix = latest?.loss_matrix;
  const modelSec = latest?.model_security_status ?? "SECURE";

  const getDisagreementLabel = (stdDev: number) => {
    if (stdDev < 10) return { label: "High Consensus (Confident Auto-Decision)", color: "#10b981", badge: "HIGH CONSENSUS" };
    if (stdDev < 25) return { label: "Moderate Divergence", color: "#f59e0b", badge: "MODERATE DIVERGENCE" };
    return { label: "High Disagreement (Uncertainty Step-Up Escalation)", color: "#8b5cf6", badge: "UNCERTAINTY STEP-UP" };
  };

  const status = getDisagreementLabel(disagreement);

  return (
    <div className="panel ensemble-panel">
      <div className="panel-header">
        <div className="flex-between">
          <div>
            <span className="eyebrow">HYBRID RISK INTELLIGENCE & ECONOMIC OPTIMIZATION</span>
            <h3>Ensemble Disagreement Matrix & Economic Loss Engine</h3>
          </div>
          <div className="flex gap-2">
            <span
              className="badge"
              style={{
                background: `${status.color}18`,
                color: status.color,
                border: `1px solid ${status.color}44`,
              }}
            >
              {status.badge} (σ={disagreement})
            </span>
            <span className={`badge ${modelSec === "SECURE" ? "badge-pass" : "badge-block"}`}>
              <IconLock size={12} />
              <span>{modelSec}</span>
            </span>
          </div>
        </div>
      </div>

      <p className="ensemble-desc">
        Independent layer evaluations fused through uncertainty-aware arbitration (σ). High disagreement prevents risky false-positive hard blocks by escalating to 2FA step-up.
      </p>

      <div className="ensemble-grid">
        {/* Layer 1: ML Model */}
        <div className="ensemble-card">
          <div className="ensemble-card-header">
            <div className="flex items-center gap-2">
              <IconCpu size={14} className="text-blue" />
              <span className="layer-title">XGBoost Tabular ML</span>
            </div>
            <span className="layer-weight">Weight: {(weights.ml * 100).toFixed(1)}%</span>
          </div>
          <div className="ensemble-score-row">
            <span className="mono layer-score">{scores.ml.toFixed(1)}</span>
            <span className="score-max">/ 100</span>
          </div>
          <div className="ensemble-bar-track">
            <div
              className="ensemble-bar-fill"
              style={{
                width: `${scores.ml}%`,
                background: scores.ml > 70 ? "#ef4444" : scores.ml > 30 ? "#f59e0b" : "#3375f6",
              }}
            />
          </div>
          <span className="layer-sub">Supervised tabular fraud probability</span>
        </div>

        {/* Layer 2: Behavioral Anomaly */}
        <div className="ensemble-card">
          <div className="ensemble-card-header">
            <div className="flex items-center gap-2">
              <IconSearch size={14} className="text-emerald" />
              <span className="layer-title">Behavioral Anomaly</span>
            </div>
            <span className="layer-weight">Weight: {(weights.anomaly * 100).toFixed(1)}%</span>
          </div>
          <div className="ensemble-score-row">
            <span className="mono layer-score">{scores.anomaly.toFixed(1)}</span>
            <span className="score-max">/ 100</span>
          </div>
          <div className="ensemble-bar-track">
            <div
              className="ensemble-bar-fill"
              style={{
                width: `${scores.anomaly}%`,
                background: scores.anomaly > 70 ? "#ef4444" : scores.anomaly > 30 ? "#f59e0b" : "#3375f6",
              }}
            />
          </div>
          <span className="layer-sub">Reconstruction loss deviation</span>
        </div>

        {/* Layer 3: NetworkX Graph */}
        <div className="ensemble-card">
          <div className="ensemble-card-header">
            <div className="flex items-center gap-2">
              <IconGraph size={14} className="text-amber" />
              <span className="layer-title">Graph Traversal</span>
            </div>
            <span className="layer-weight">Weight: {(weights.graph * 100).toFixed(1)}%</span>
          </div>
          <div className="ensemble-score-row">
            <span className="mono layer-score">{scores.graph.toFixed(1)}</span>
            <span className="score-max">/ 100</span>
          </div>
          <div className="ensemble-bar-track">
            <div
              className="ensemble-bar-fill"
              style={{
                width: `${scores.graph}%`,
                background: scores.graph > 70 ? "#ef4444" : scores.graph > 30 ? "#f59e0b" : "#3375f6",
              }}
            />
          </div>
          <span className="layer-sub">Syndicate & multi-account cluster density</span>
        </div>

        {/* Layer 4: Hard Safety Rules */}
        <div className="ensemble-card">
          <div className="ensemble-card-header">
            <div className="flex items-center gap-2">
              <IconShield size={14} className="text-slate" />
              <span className="layer-title">Deterministic Rules</span>
            </div>
            <span className="layer-weight">Weight: {(weights.rules * 100).toFixed(1)}%</span>
          </div>
          <div className="ensemble-score-row">
            <span className="mono layer-score">{scores.rules.toFixed(1)}</span>
            <span className="score-max">/ 100</span>
          </div>
          <div className="ensemble-bar-track">
            <div
              className="ensemble-bar-fill"
              style={{
                width: `${scores.rules}%`,
                background: scores.rules >= 100 ? "#ef4444" : "#64748b",
              }}
            />
          </div>
          <span className="layer-sub">Instant cutoffs & velocity circuit breakers</span>
        </div>
      </div>

      {/* Economic Expected Loss Optimization Vector */}
      {lossMatrix && (
        <div className="economic-loss-bar">
          <div className="economic-loss-header flex-between">
            <div className="flex items-center gap-2">
              <IconBarChart size={14} className="text-blue" />
              <span className="loss-title font-bold text-xs">Economic Expected Loss Matrix</span>
            </div>
            <span className="loss-formula mono text-xs text-dim">Minimizing: E[Cost] = Loss(Fraud) + Cost(Friction)</span>
          </div>
          <div className="loss-actions-row">
            <div className={`loss-chip ${latest?.decision === "APPROVE" ? "loss-chip--optimal" : ""}`}>
              <div className="loss-chip-header">
                <span className="loss-act">APPROVE</span>
                {latest?.decision === "APPROVE" && <span className="optimal-pill">OPTIMAL</span>}
              </div>
              <div className="loss-val-box">
                <span className="loss-currency">₹</span>
                <span className="loss-val mono">{lossMatrix.cost_approve?.toFixed(2)}</span>
              </div>
              <span className="loss-sub">P(Fraud) × Amount</span>
            </div>

            <div className={`loss-chip ${latest?.decision === "STEP-UP" ? "loss-chip--optimal" : ""}`}>
              <div className="loss-chip-header">
                <span className="loss-act">STEP-UP (2FA)</span>
                {latest?.decision === "STEP-UP" && <span className="optimal-pill">OPTIMAL</span>}
              </div>
              <div className="loss-val-box">
                <span className="loss-currency">₹</span>
                <span className="loss-val mono">{lossMatrix.cost_step_up?.toFixed(2)}</span>
              </div>
              <span className="loss-sub">Auth + 12% Drop-off</span>
            </div>

            <div className={`loss-chip ${latest?.decision === "BLOCK" ? "loss-chip--optimal" : ""}`}>
              <div className="loss-chip-header">
                <span className="loss-act">BLOCK</span>
                {latest?.decision === "BLOCK" && <span className="optimal-pill">OPTIMAL</span>}
              </div>
              <div className="loss-val-box">
                <span className="loss-currency">₹</span>
                <span className="loss-val mono">{lossMatrix.cost_block?.toFixed(2)}</span>
              </div>
              <span className="loss-sub">15% True-Reject Cost</span>
            </div>
          </div>
        </div>
      )}

      {isDegraded && (
        <div className="degraded-callout">
          <span className="callout-icon">⚠️</span>
          <div>
            <strong>Graceful Fallback Mode Active</strong>
            <p>One or more subsystems are offline. Weights have dynamically rebalanced to ensure zero checkout interruption.</p>
          </div>
        </div>
      )}
    </div>
  );
}
