import { useEffect, useState } from "react";

interface RiskGaugeProps {
  score: number | null;
  decision: "APPROVE" | "STEP-UP" | "BLOCK" | null;
}

const SIZE = 240;
const STROKE = 14;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const SWEEP_DEG = 270;

function colorFor(decision: string | null, score: number | null) {
  if (decision === "APPROVE" || (score !== null && score <= 30)) return "var(--risk-approve)";
  if (decision === "STEP-UP" || (score !== null && score <= 70)) return "var(--risk-stepup)";
  if (decision === "BLOCK" || (score !== null && score > 70)) return "var(--risk-block)";
  return "var(--accent)";
}

export default function RiskGauge({ score, decision }: RiskGaugeProps) {
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    const target = score ?? 0;
    let raf: number;
    const start = displayScore;
    const startTime = performance.now();
    const duration = 650;

    function tick(now: number) {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayScore(start + (target - start) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  const sweepFraction = (SWEEP_DEG / 360) * (displayScore / 100);
  const dashOffset = CIRCUMFERENCE * (1 - sweepFraction / (SWEEP_DEG / 360));
  const arcLength = CIRCUMFERENCE * (SWEEP_DEG / 360);
  const color = colorFor(decision, score);

  return (
    <div className="gauge-container" style={{ position: "relative", width: SIZE, height: SIZE }}>
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        style={{ transform: "rotate(135deg)" }}
      >
        <defs>
          <filter id="gauge-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Ambient Track */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="rgba(255, 255, 255, 0.07)"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={`${arcLength} ${CIRCUMFERENCE}`}
        />

        {/* Dynamic Value Arc */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={color}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={`${arcLength} ${CIRCUMFERENCE}`}
          strokeDashoffset={dashOffset}
          filter="url(#gauge-glow)"
          style={{
            transition: "stroke 350ms ease",
          }}
        />
      </svg>

      {/* Center Display */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          userSelect: "none",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 50,
            fontWeight: 800,
            color: "var(--text-primary)",
            lineHeight: 1,
            textShadow: `0 0 20px ${color}55`,
          }}
        >
          {score === null ? "—" : Math.round(displayScore)}
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10.5,
            letterSpacing: "0.14em",
            color: "var(--text-dim)",
            marginTop: 6,
            fontWeight: 600,
          }}
        >
          RISK INDEX / 100
        </div>
        {decision && (
          <div
            style={{
              marginTop: 10,
              padding: "4px 12px",
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.08em",
              fontFamily: "var(--font-mono)",
              color,
              background: `${color}1a`,
              border: `1px solid ${color}55`,
              boxShadow: `0 0 12px ${color}33`,
            }}
          >
            {decision}
          </div>
        )}
      </div>
    </div>
  );
}
