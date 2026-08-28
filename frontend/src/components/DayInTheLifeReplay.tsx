import { useState } from "react";
import { api, type RiskScoreResponse } from "../lib/api";

interface Step {
  stepNumber: number;
  title: string;
  badge: string;
  narrative: string;
  actionLabel: string;
  scenarioPayload: {
    userId: string;
    merchantId: string;
    amount: number;
    dev: string;
    ip: string;
    paymentMethod: string;
  };
}

const DEMO_STEPS: Step[] = [
  {
    stepNumber: 1,
    title: "Step 1: Genuine Customer Checkout",
    badge: "PASS (FRICTIONLESS)",
    narrative: "Rahul purchases ₹1,200 groceries from his trusted home iPhone. System passes payment in 12ms with zero friction.",
    actionLabel: "▶️ Run Step 1: Normal Checkout",
    scenarioPayload: {
      userId: "USR-RAHUL-LEGIT",
      merchantId: "merchant-swiggy",
      amount: 1200,
      dev: "DEV-IPHONE-14-HOME",
      ip: "IP-AIRTEL-HOME",
      paymentMethod: "upi",
    },
  },
  {
    stepNumber: 2,
    title: "Step 2: Low-and-Slow Card Testing",
    badge: "STEP-UP 2FA CHALLENGE",
    narrative: "A bot attempts an automated ₹150 micro-charge using an unfamiliar proxy IP. System intercepts and issues a customer-friendly 2FA Step-Up challenge.",
    actionLabel: "▶️ Run Step 2: Test Micro-Charge",
    scenarioPayload: {
      userId: "USR-BOT-TESTER",
      merchantId: "merchant-swiggy",
      amount: 150,
      dev: "DEV-BOT-SPOOFED",
      ip: "IP-PROXY-RESIDENTIAL",
      paymentMethod: "card",
    },
  },
  {
    stepNumber: 3,
    title: "Step 3: Multi-Account Fraud Ring Interception",
    badge: "AUTONOMOUS BLOCK",
    narrative: "Attacker attempts high-value ₹45,000 checkout using a second account on the same device. NetworkX graph detects syndicate collusion ring and enforces instant BLOCK.",
    actionLabel: "▶️ Run Step 3: Syndicate Ring Attack",
    scenarioPayload: {
      userId: "USR-SYNDICATE-02",
      merchantId: "merchant-luxury",
      amount: 45000,
      dev: "DEV-FRAUD-RING-HARDWARE",
      ip: "IP-SHARED-SYNDICATE",
      paymentMethod: "card",
    },
  },
  {
    stepNumber: 4,
    title: "Step 4: AI Agent Auto-Dossier & Copilot",
    badge: "AI CASE DOSSIER",
    narrative: "Investigation Agent automatically correlates IP fan-out, SHAP attribution, and entity graph links, preparing an instant forensic report with 98% confidence.",
    actionLabel: "▶️ Run Step 4: AI Forensic Autopsy",
    scenarioPayload: {
      userId: "USR-SYNDICATE-03",
      merchantId: "merchant-luxury",
      amount: 32000,
      dev: "DEV-FRAUD-RING-HARDWARE",
      ip: "IP-SHARED-SYNDICATE",
      paymentMethod: "card",
    },
  },
];

interface Props {
  onStepExecuted: (res: RiskScoreResponse) => void;
}

export default function DayInTheLifeReplay({ onStepExecuted }: Props) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [running, setRunning] = useState(false);
  const [lastResult, setLastResult] = useState<RiskScoreResponse | null>(null);

  const step = DEMO_STEPS[currentStepIndex];

  const executeStep = async (index: number) => {
    setRunning(true);
    setCurrentStepIndex(index);
    const target = DEMO_STEPS[index];

    try {
      const res = await api.scoreTransaction({
        user_id: target.scenarioPayload.userId,
        merchant_id: target.scenarioPayload.merchantId,
        amount: target.scenarioPayload.amount,
        device_fingerprint: target.scenarioPayload.dev,
        ip_hash: target.scenarioPayload.ip,
        payment_method: target.scenarioPayload.paymentMethod,
      });

      setLastResult(res);
      onStepExecuted(res);
    } catch (e: any) {
      console.error("Step execution failed", e);
    } finally {
      setRunning(false);
    }
  };

  const handleNextStep = () => {
    const nextIdx = (currentStepIndex + 1) % DEMO_STEPS.length;
    executeStep(nextIdx);
  };

  return (
    <div className="panel day-in-life-panel">
      <div className="panel-header">
        <div className="flex-between">
          <div>
            <span className="eyebrow">GUIDED STORYTELLING MODE</span>
            <h3>"Day in the Life" Interactive Replay Scrubber</h3>
          </div>
          <div className="replay-controls">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleNextStep}
              disabled={running}
            >
              {running ? "Processing Step..." : "▶️ Play Next Lifecycle Step"}
            </button>
          </div>
        </div>
      </div>

      <p className="replay-desc">
        A scripted chronological demonstration following a merchant through legit checkout, card testing, fraud ring detection, and automated AI autopsy.
      </p>

      {/* Progress Timeline Stepper */}
      <div className="timeline-stepper">
        {DEMO_STEPS.map((s, idx) => (
          <div
            key={s.stepNumber}
            className={`stepper-item ${idx === currentStepIndex ? "stepper-item--active" : idx < currentStepIndex ? "stepper-item--completed" : ""}`}
            onClick={() => executeStep(idx)}
          >
            <div className="stepper-bubble">
              {idx < currentStepIndex ? "✓" : s.stepNumber}
            </div>
            <span className="stepper-title">{s.title.split(":")[1]}</span>
          </div>
        ))}
      </div>

      {/* Active Step Showcase Box */}
      <div className="active-step-card">
        <div className="active-step-header">
          <div className="step-badge-title">
            <span className="badge badge-type">STEP {step.stepNumber} OF 4</span>
            <span className="step-main-title">{step.title}</span>
          </div>
          <span className={`step-outcome-badge ${
            step.badge.includes("BLOCK")
              ? "decision-chip--block"
              : step.badge.includes("STEP-UP")
              ? "decision-chip--stepup"
              : "decision-chip--approve"
          }`}>
            {step.badge}
          </span>
        </div>

        <p className="active-step-narrative">{step.narrative}</p>

        <div className="active-step-action-bar">
          <div className="step-meta-chips">
            <span className="meta-chip">User: <code>{step.scenarioPayload.userId}</code></span>
            <span className="meta-chip">Amount: <strong>₹{step.scenarioPayload.amount.toLocaleString()}</strong></span>
            <span className="meta-chip">Device: <code>{step.scenarioPayload.dev}</code></span>
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => executeStep(currentStepIndex)}
            disabled={running}
          >
            {running ? "Scoring..." : step.actionLabel}
          </button>
        </div>

        {lastResult && (
          <div className="step-live-telemetry">
            <span className="telemetry-live-dot" />
            <span className="telemetry-text">
              Live Decision: <strong className="mono">{lastResult.decision}</strong> (Risk Score: <strong className="mono">{lastResult.risk_score}</strong>, Latency: <strong className="mono">{lastResult.latency_ms}ms</strong>)
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
