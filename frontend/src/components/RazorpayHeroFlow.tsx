import { useState, useEffect } from "react";
import type { RiskScoreResponse } from "../lib/api";

interface RazorpayHeroFlowProps {
  latest: RiskScoreResponse | null;
  onExploreConsole: () => void;
  onRunQuickDemo: () => void;
  onAutoSimulateToggle?: (active: boolean) => void;
}

export default function RazorpayHeroFlow({
  latest,
  onExploreConsole,
  onRunQuickDemo,
  onAutoSimulateToggle,
}: RazorpayHeroFlowProps) {
  const [activeHoverNode, setActiveHoverNode] = useState<string | null>(null);
  const [autoStream, setAutoStream] = useState(false);
  const [pulseKey, setPulseKey] = useState(0);

  // Dynamic values derived from latest transaction or realistic real-time state
  const score = latest?.risk_score ?? 12;
  const decision = latest?.decision ?? "APPROVE";
  const latency = latest?.latency_ms ?? 14;
  
  // Extract amount or generate context-aware amount
  const amount = latest ? (score > 70 ? 45000 : score > 30 ? 4200 : 2499) : 2499;
  const velocity = latest ? (score > 70 ? 9 : score > 30 ? 4 : 1) : 1;
  const trustScore = Math.max(1.2, 100 - score).toFixed(1);
  const otpCode = Math.floor(100000 + Math.random() * 900000);

  // Re-trigger pulse animation on new transaction
  useEffect(() => {
    if (latest) {
      setPulseKey((prev) => prev + 1);
    }
  }, [latest]);

  const handleToggleAutoStream = () => {
    const next = !autoStream;
    setAutoStream(next);
    if (onAutoSimulateToggle) {
      onAutoSimulateToggle(next);
    }
  };

  return (
    <div className="razorpay-hero">
      {/* Top Badge Pill */}
      <div className="hero-top-badge">
        <span className="live-stream-badge">
          <span className="telemetry-live-dot" /> LIVE RISK TELEMETRY ENGINE
        </span>
      </div>

      {/* Hero Headline */}
      <h1 className="hero-title">
        Supercharge <span className="text-highlight">protection</span> and{" "}
        <span className="text-highlight">conversion</span> with payments at the core
      </h1>

      <p className="hero-subtitle">
        A real-time ML & graph-powered fraud defense platform evaluating payments in under 15ms
      </p>

      {/* CTA Button Row with Live Auto-Stream Toggle */}
      <div className="hero-cta-row">
        <button className="btn-razorpay-primary" onClick={onRunQuickDemo}>
          ⚡ Run Live Fraud Stress Test
        </button>
        <button
          type="button"
          className={`btn-stream-toggle ${autoStream ? "btn-stream-toggle--active" : ""}`}
          onClick={handleToggleAutoStream}
        >
          {autoStream ? "🔴 Streaming Live Traffic (Click to Pause)" : "▶️ Start Live Auto-Traffic Stream"}
        </button>
        <button className="btn-razorpay-secondary" onClick={onExploreConsole}>
          Open Risk Console ↓
        </button>
      </div>

      {/* Interactive Flowchart Diagram Canvas */}
      <div className="flow-diagram-container">
        {/* SVG Connected Lines with Animated Traveling Pulses */}
        <svg className="flow-lines-svg" viewBox="0 0 1100 410" fill="none">
          {/* Path 1: Acquire -> Retain */}
          <path
            d="M 120 90 L 120 220 Q 120 250 150 250 L 270 250 Q 300 250 300 300 L 300 340"
            stroke={decision === "BLOCK" ? "#ef4444" : decision === "STEP-UP" ? "#f59e0b" : "#3375f6"}
            strokeWidth="2.5"
            strokeDasharray="6 6"
            className="animated-flow-line"
          />
          {/* Path 2: Velocity -> Center Scorer */}
          <path
            d="M 310 185 L 360 185 Q 390 185 390 150 L 390 120 Q 390 90 420 90 L 450 90"
            stroke="#10b981"
            strokeWidth="2.5"
            strokeDasharray="6 6"
            className="animated-flow-line-reverse"
          />
          {/* Path 3: Center Scorer -> Revive OTP */}
          <path
            d="M 680 140 L 730 140 Q 760 140 760 100 L 760 85 Q 760 65 800 65 L 850 65"
            stroke={decision === "STEP-UP" ? "#f59e0b" : "#3375f6"}
            strokeWidth="2.5"
            strokeDasharray="6 6"
            className="animated-flow-line"
          />
          {/* Path 4: Revive -> Settled Terminal */}
          <path
            d="M 960 130 L 960 220 Q 960 250 960 300 L 960 330"
            stroke={decision === "BLOCK" ? "#ef4444" : "#10b981"}
            strokeWidth="2.5"
            strokeDasharray="6 6"
            className="animated-flow-line"
          />

          {/* Dynamic glowing connection junction dots */}
          <circle cx="390" cy="185" r="5" fill="#10b981" className="pulsing-junction" />
          <circle cx="760" cy="140" r="5" fill="#3375f6" className="pulsing-junction" />
          <circle cx="960" cy="220" r="5" fill="#10b981" className="pulsing-junction" />
        </svg>

        {/* Node 1: ACQUIRE / INGEST (Dynamic Real-Time Amount) */}
        <div
          key={`acquire-${pulseKey}`}
          className={`flow-node flow-node--acquire flow-pulse-anim ${activeHoverNode === "acquire" ? "flow-node--hover" : ""}`}
          onMouseEnter={() => setActiveHoverNode("acquire")}
          onMouseLeave={() => setActiveHoverNode(null)}
        >
          <span className="flow-badge flow-badge--blue">ACQUIRE</span>
          <div className="floating-card floating-card--icon">
            <div className="card-inner-icon">💳</div>
            <div className="card-text-group">
              <span className="card-label">Checkout Stream</span>
              <span className="card-val mono font-bold">₹{amount.toLocaleString("en-IN")}.00</span>
            </div>
          </div>
        </div>

        {/* Node 2: Velocity & Feature Telemetry (Dynamic Count) */}
        <div key={`gift-${pulseKey}`} className="flow-node flow-node--gift flow-pulse-anim">
          <div className="floating-card floating-card--green-bundle">
            <span className="bundle-icon">⚡</span>
            <div className="bundle-subtext mono font-bold">
              Velocity: {velocity} req/90s
            </div>
          </div>
        </div>

        {/* Center Hero Card: Real-time Decision & Risk Engine */}
        <div key={`center-${pulseKey}`} className="flow-node flow-node--center flow-pulse-anim">
          <div className={`center-hero-card ${
            decision === "BLOCK"
              ? "center-hero-card--block"
              : decision === "STEP-UP"
              ? "center-hero-card--stepup"
              : "center-hero-card--approve"
          }`}>
            <div className="center-card-header">
              <div className="live-status-pill">
                <span className={`pulse-dot-green ${decision === "BLOCK" ? "pulse-dot-red" : decision === "STEP-UP" ? "pulse-dot-amber" : ""}`} />
                REAL-TIME SCORER
              </div>
              <span className="mono latency-tag">{latency}ms</span>
            </div>

            <div className="center-card-body">
              <div className="center-score-circle">
                <span className="center-score-number mono font-bold">{score.toFixed(0)}</span>
                <span className="center-score-label">RISK INDEX</span>
              </div>

              <div className="center-decision-badge">
                <span
                  className={`decision-chip ${
                    decision === "BLOCK"
                      ? "decision-chip--block"
                      : decision === "STEP-UP"
                      ? "decision-chip--stepup"
                      : "decision-chip--approve"
                  }`}
                >
                  {decision === "APPROVE" && "✓ "}
                  {decision === "STEP-UP" && "🛡️ "}
                  {decision === "BLOCK" && "🚫 "}
                  {decision}
                </span>
              </div>
            </div>

            <div className="center-card-footer">
              <span className="sub-model-info mono">
                {latest?.is_degraded ? "⚠️ Degraded Fallback Mode" : "XGBoost ML · NetworkX Graph"}
              </span>
            </div>
          </div>
        </div>

        {/* Node 3: RETAIN / GRAPH (Dynamic Trust Score) */}
        <div key={`retain-${pulseKey}`} className="flow-node flow-node--retain flow-pulse-anim">
          <span className="flow-badge flow-badge--blue">RETAIN</span>
          <div className="floating-card floating-card--trust">
            <span className="trust-icon">🔄</span>
            <div className="card-text-group">
              <span className="card-label">Trust Score</span>
              <span className={`card-val font-bold ${Number(trustScore) > 70 ? "text-green" : Number(trustScore) > 40 ? "text-amber" : "text-red"}`}>
                {trustScore}% Safe
              </span>
            </div>
          </div>
        </div>

        {/* Node 4: REVIVE / 2FA CHALLENGE (Dynamic Challenge State) */}
        <div key={`revive-${pulseKey}`} className="flow-node flow-node--revive flow-pulse-anim">
          <span className="flow-badge flow-badge--blue">REVIVE</span>
          <div className="floating-card floating-card--auth">
            <div className="auth-preview-header">
              <span className="auth-brand">Razorpay OTP</span>
              <span className="auth-time mono">Just now</span>
            </div>
            <div className="auth-body">
              {decision === "STEP-UP" ? (
                <>
                  <span className="mono auth-code font-bold">{otpCode}</span>
                  <span className="badge badge-stepup font-bold">🛡️ 2FA Sent</span>
                </>
              ) : decision === "BLOCK" ? (
                <>
                  <span className="mono text-red font-bold">🚫 QUARANTINED</span>
                  <span className="badge badge-block font-bold">Blocked</span>
                </>
              ) : (
                <>
                  <span className="mono auth-code">742 901</span>
                  <span className="auth-verified-badge">✓ Verified</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Node 5: Terminal Card (Dynamic Settlement Code) */}
        <div key={`terminal-${pulseKey}`} className="flow-node flow-node--terminal flow-pulse-anim">
          <div className="floating-card floating-card--pos">
            <span className="pos-icon">📱</span>
            <div className="pos-meta">
              <span className="pos-title">{decision === "BLOCK" ? "Declined" : decision === "STEP-UP" ? "Challenged" : "Settled"}</span>
              <span className={`pos-status mono font-bold ${
                decision === "BLOCK" ? "text-red" : decision === "STEP-UP" ? "text-amber" : "text-green"
              }`}>
                {decision === "BLOCK" ? "403 BLOCKED" : decision === "STEP-UP" ? "302 STEP-UP" : "200 OK"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
