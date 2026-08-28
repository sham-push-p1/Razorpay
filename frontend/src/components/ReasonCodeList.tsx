import type { ReasonCode } from "../lib/api";

function colorFor(code: string) {
  if (code.startsWith("RULE_") || code.includes("HARD_STOP") || code.includes("SEQUENCE")) return "var(--risk-block)";
  if (code.includes("FANOUT") || code.includes("GRAPH")) return "var(--accent-purple)";
  if (code.includes("VELOCITY") || code.includes("AMOUNT") || code.includes("ANOMALY") || code.includes("IMPOSSIBLE"))
    return "var(--risk-stepup)";
  return "var(--accent)";
}

interface Props {
  reasons: ReasonCode[];
  counterfactuals?: any;
  confidence?: number;
}

export default function ReasonCodeList({ reasons, counterfactuals, confidence = 94.0 }: Props) {
  if (reasons.length === 0) {
    return (
      <div className="empty-reason-box">
        <span className="clean-icon">🛡️</span>
        <p className="empty-note">Clean transaction signal — no anomaly or velocity rules triggered.</p>
        <div className="confidence-pill-row">
          <span className="badge badge-pass font-bold">Platt Calibrated Confidence: {confidence}%</span>
        </div>
      </div>
    );
  }

  return (
    <div className="reason-code-wrapper">
      <div className="flex-between" style={{ marginBottom: "10px" }}>
        <span className="text-xs text-dim">SHAP Attribution Factors:</span>
        <span className="badge badge-pass font-bold">Confidence: {confidence}%</span>
      </div>

      <ul className="reason-list">
        {reasons.map((r, i) => {
          const color = colorFor(r.code);
          const contribPct = Math.min(Math.max(r.contribution, 5), 100);

          return (
            <li key={`${r.code}-${i}`} className="reason-item">
              <div className="reason-top-row">
                <div className="reason-title-group">
                  <span className="reason-dot" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
                  <span className="reason-code">{r.code}</span>
                </div>
                <div className="reason-contribution mono" style={{ color }}>
                  +{r.contribution.toFixed(1)} pts
                </div>
              </div>

              <div className="reason-desc">{r.description}</div>

              {/* SHAP Contribution Bar */}
              <div className="shap-bar-track">
                <div
                  className="shap-bar-fill"
                  style={{
                    width: `${contribPct}%`,
                    background: color,
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>

      {/* Counterfactual Actionable Interventions Box */}
      {counterfactuals?.simulations?.length > 0 && (
        <div className="counterfactual-box">
          <div className="counterfactual-header">
            <span className="font-bold text-xs">🔍 Counterfactual Explainability ("What Would Change Decision?"):</span>
            <span className="badge badge-stepup text-xs font-bold">{counterfactuals.recommended_resolution}</span>
          </div>

          <div className="counterfactual-list">
            {counterfactuals.simulations.map((sim: any, idx: number) => (
              <div key={idx} className="cf-item">
                <div className="cf-title-row">
                  <span className="cf-factor">{sim.factor}</span>
                  <span className="mono cf-score text-green font-bold">
                    &rarr; {sim.simulated_score} ({sim.simulated_decision})
                  </span>
                </div>
                <span className="cf-hypo text-xs text-dim">{sim.hypothesis}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
