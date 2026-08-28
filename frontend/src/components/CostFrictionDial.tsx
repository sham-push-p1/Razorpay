import { useState } from "react";

interface Props {
  monthlyGmv?: number;
}

export default function CostFrictionDial({ monthlyGmv = 50000000 }: Props) {
  const [gmv, setGmv] = useState(monthlyGmv); // Default ₹5 Cr / month
  const [riskAppetite, setRiskAppetite] = useState<"conservative" | "balanced" | "growth">("balanced");
  const [aov, setAov] = useState(2500); // Average Order Value ₹2,500
  const [dropoffRate, setDropoffRate] = useState(8); // 8% drop-off on 2FA challenge

  // Calculations based on empirical models
  const totalTxCount = Math.round(gmv / aov);
  const baselineFraudRatePct = 2.4; // 2.4% fraud attack rate
  const grossFraudVolume = Math.round(gmv * (baselineFraudRatePct / 100));

  // Policy profiles
  const profileMultipliers = {
    conservative: { captureRate: 0.985, stepUpRatePct: 4.8, falsePositivePct: 0.8 },
    balanced: { captureRate: 0.962, stepUpRatePct: 2.6, falsePositivePct: 0.3 },
    growth: { captureRate: 0.915, stepUpRatePct: 1.1, falsePositivePct: 0.1 },
  };

  const current = profileMultipliers[riskAppetite];

  // Financial outcomes
  const fraudSaved = Math.round(grossFraudVolume * current.captureRate);
  const fraudSlippage = grossFraudVolume - fraudSaved;
  const steppedUpCount = Math.round(totalTxCount * (current.stepUpRatePct / 100));
  const frictionLostTx = Math.round(steppedUpCount * (dropoffRate / 100));
  const frictionRevenueLoss = frictionLostTx * aov;
  const netEconomicBenefit = fraudSaved - frictionRevenueLoss - fraudSlippage;

  return (
    <div className="panel cost-friction-panel">
      <div className="panel-header">
        <div className="flex-between">
          <div>
            <span className="eyebrow">ECONOMIC IMPACT & ROI SIMULATOR</span>
            <h3>Cost-of-Fraud vs. Cost-of-Friction Dial</h3>
          </div>
          <div className="gmv-tag">
            <span>Simulating GMV: <strong>₹{(gmv / 10000000).toFixed(1)} Cr / mo</strong></span>
          </div>
        </div>
      </div>

      <p className="cost-desc">
        Fintech economic trade-off calculator. Adjust your merchant risk tolerance to model the exact financial balance between fraud losses prevented and customer checkout drop-off.
      </p>

      {/* Profile Selector */}
      <div className="profile-toggle-row">
        <span className="toggle-group-label">Risk Posture:</span>
        <div className="profile-btn-group">
          <button
            type="button"
            className={`profile-btn ${riskAppetite === "conservative" ? "profile-btn--active" : ""}`}
            onClick={() => setRiskAppetite("conservative")}
          >
            🛡️ Conservative (Zero Tolerance)
          </button>
          <button
            type="button"
            className={`profile-btn ${riskAppetite === "balanced" ? "profile-btn--active" : ""}`}
            onClick={() => setRiskAppetite("balanced")}
          >
            ⚖️ Balanced (Fintech Optimal)
          </button>
          <button
            type="button"
            className={`profile-btn ${riskAppetite === "growth" ? "profile-btn--active" : ""}`}
            onClick={() => setRiskAppetite("growth")}
          >
            🚀 High-Growth (Frictionless)
          </button>
        </div>
      </div>

      {/* Sliders Grid */}
      <div className="dial-sliders-grid">
        <div className="slider-box">
          <div className="slider-header">
            <label>Monthly Gross Merchandise Value (GMV):</label>
            <span className="mono font-bold text-blue">₹{(gmv / 100000).toLocaleString()} Lakhs</span>
          </div>
          <input
            type="range"
            min="5000000"
            max="200000000"
            step="5000000"
            value={gmv}
            onChange={(e) => setGmv(Number(e.target.value))}
            className="slider"
          />
        </div>

        <div className="slider-box">
          <div className="slider-header">
            <label>Average Order Value (AOV):</label>
            <span className="mono font-bold text-amber">₹{aov.toLocaleString()}</span>
          </div>
          <input
            type="range"
            min="500"
            max="15000"
            step="500"
            value={aov}
            onChange={(e) => setAov(Number(e.target.value))}
            className="slider"
          />
        </div>

        <div className="slider-box" style={{ gridColumn: "span 2" }}>
          <div className="slider-header">
            <label>Estimated 2FA Step-Up Cart Abandonment Rate:</label>
            <span className="mono font-bold text-purple">{dropoffRate}% Drop-off</span>
          </div>
          <input
            type="range"
            min="2"
            max="25"
            step="1"
            value={dropoffRate}
            onChange={(e) => setDropoffRate(Number(e.target.value))}
            className="slider"
          />
        </div>
      </div>

      {/* Results Projection Cards */}
      <div className="roi-cards-grid">
        <div className="roi-card roi-card--green">
          <span className="roi-card-label">FRAUD LOSSES SAVED</span>
          <span className="roi-card-val mono">₹{(fraudSaved / 100000).toFixed(2)}L</span>
          <span className="roi-card-sub">{(current.captureRate * 100).toFixed(1)}% of gross fraud prevented</span>
        </div>

        <div className="roi-card roi-card--amber">
          <span className="roi-card-label">FRICTION DROP-OFF LOSS</span>
          <span className="roi-card-val mono">₹{(frictionRevenueLoss / 100000).toFixed(2)}L</span>
          <span className="roi-card-sub">{frictionLostTx} abandoned checkouts ({dropoffRate}% drop-off)</span>
        </div>

        <div className="roi-card roi-card--blue">
          <span className="roi-card-label">NET PROFIT IMPACT</span>
          <span className="roi-card-val mono">₹{(netEconomicBenefit / 100000).toFixed(2)}L</span>
          <span className="roi-card-sub">Net financial gain to merchant</span>
        </div>

        <div className="roi-card roi-card--purple">
          <span className="roi-card-label">SHIELD ROI MULTIPLIER</span>
          <span className="roi-card-val mono">{((fraudSaved / Math.max(frictionRevenueLoss, 1000))).toFixed(1)}x</span>
          <span className="roi-card-sub">₹ saved per ₹1 friction cost</span>
        </div>
      </div>

      {/* Visual Balance Bar */}
      <div className="balance-bar-container">
        <div className="balance-bar-header">
          <span>Financial Breakdown: Protected vs Lost</span>
          <span className="mono text-xs">{(fraudSaved / (fraudSaved + frictionRevenueLoss + fraudSlippage) * 100).toFixed(1)}% Defense Efficiency</span>
        </div>
        <div className="balance-bar-track">
          <div
            className="balance-bar-fill balance-bar-fill--saved"
            style={{ width: `${(fraudSaved / grossFraudVolume) * 75}%` }}
            title="Fraud Saved"
          />
          <div
            className="balance-bar-fill balance-bar-fill--friction"
            style={{ width: `${Math.min((frictionRevenueLoss / grossFraudVolume) * 20, 20)}%` }}
            title="Friction Loss"
          />
          <div
            className="balance-bar-fill balance-bar-fill--slip"
            style={{ width: `${(fraudSlippage / grossFraudVolume) * 10}%` }}
            title="Slippage"
          />
        </div>
        <div className="balance-legend">
          <span className="legend-item"><span className="legend-dot legend-dot--saved" /> Protected (₹{(fraudSaved/100000).toFixed(1)}L)</span>
          <span className="legend-item"><span className="legend-dot legend-dot--friction" /> 2FA Abandonment (₹{(frictionRevenueLoss/100000).toFixed(1)}L)</span>
          <span className="legend-item"><span className="legend-dot legend-dot--slip" /> Undetected Slippage (₹{(fraudSlippage/100000).toFixed(1)}L)</span>
        </div>
      </div>
    </div>
  );
}
