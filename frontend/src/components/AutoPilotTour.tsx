import { useEffect, useState } from "react";
import { soundFx } from "../lib/soundFx";
import { IconZap, IconCheckCircle } from "./Icons";

interface Props {
  active: boolean;
  onClose: () => void;
  onStepAction: (stepIndex: number) => void;
}

interface TourStep {
  title: string;
  tab: string;
  badge: string;
  summary: string;
  highlight: string;
  durationSec: number;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: "1. Sub-15ms Real-Time Ingestion",
    tab: "console",
    badge: "DETERMINISTIC SLA",
    summary: "Simulating high-throughput organic checkout streams. Razorpay Shield evaluates transactions in under 15ms without customer friction.",
    highlight: "Hard P95 SLA < 100ms benchmarked against massive peak traffic.",
    durationSec: 10,
  },
  {
    title: "2. Real-Time Interception & Tree-SHAP",
    tab: "console",
    badge: "INSTANT ATTRIBUTION",
    summary: "Injecting impossible-travel velocities and card-testing ladders. Shield instantly flags anomalies and surfaces exact feature attribution.",
    highlight: "XGBoost Tree-SHAP explains model decisions with full mathematical transparency.",
    durationSec: 12,
  },
  {
    title: "3. Graph Intelligence & Ring Isolation",
    tab: "graph",
    badge: "NETWORKX & LOUVAIN",
    summary: "Switching to Fraud Rings & Graph. Shield traverses shared device IDs, proxy IPs, and cards to quarantine entire collusion syndicates.",
    highlight: "PageRank and Community Detection uncover hidden fraudsters across multiple merchant accounts.",
    durationSec: 12,
  },
  {
    title: "4. Autonomous AI Case Triage",
    tab: "cases",
    badge: "ZERO MANUAL BACKLOG",
    summary: "Switching to AI Cases & Copilot. Flagged incidents are autonomously drafted with forensic evidence summaries and recommended analyst actions.",
    highlight: "Risk Copilot answers natural-language merchant and forensic questions in real-time.",
    durationSec: 12,
  },
  {
    title: "5. CRO ROI Multiplier & Audit Ledger",
    tab: "analytics",
    badge: "14.8X ROI MULTIPLIER",
    summary: "Switching to Defense & ROI Analytics. Measuring saved chargebacks, minimal friction drop-off, and immutable SHA-256 decision ledger.",
    highlight: "₹18.4 Cr GMV Protected with provable compliance and zero tamper risk.",
    durationSec: 12,
  },
];

export default function AutoPilotTour({ active, onClose, onStepAction }: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TOUR_STEPS[0].durationSec);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!active) {
      setCurrentStep(0);
      setTimeLeft(TOUR_STEPS[0].durationSec);
      return;
    }

    soundFx.playTourStep();
    onStepAction(0);
  }, [active, onStepAction]);

  useEffect(() => {
    if (!active || isPaused) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Transition to next step
          setCurrentStep((curr) => {
            const next = curr + 1;
            if (next < TOUR_STEPS.length) {
              soundFx.playTourStep();
              onStepAction(next);
              return next;
            } else {
              // Tour finished
              soundFx.playApprove();
              onClose();
              return 0;
            }
          });
          const nextIndex = (currentStep + 1) % TOUR_STEPS.length;
          return TOUR_STEPS[nextIndex].durationSec;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [active, isPaused, currentStep, onStepAction, onClose]);

  if (!active) return null;

  const step = TOUR_STEPS[currentStep];
  const progressPct = ((step.durationSec - timeLeft) / step.durationSec) * 100;

  const jumpToStep = (index: number) => {
    setCurrentStep(index);
    setTimeLeft(TOUR_STEPS[index].durationSec);
    soundFx.playTourStep();
    onStepAction(index);
  };

  return (
    <div className="autopilot-overlay">
      <div className="autopilot-card">
        <div className="autopilot-top">
          <div className="autopilot-title-group">
            <span className="autopilot-badge">
              <IconZap size={12} /> 60-SEC AUTO-PILOT PITCH TOUR
            </span>
            <h4 className="autopilot-step-title">{step.title}</h4>
          </div>
          <div className="autopilot-controls">
            <button
              className="btn btn-xs btn-secondary"
              onClick={() => setIsPaused(!isPaused)}
              title={isPaused ? "Resume Tour" : "Pause Tour"}
            >
              {isPaused ? "▶ Resume" : "⏸ Pause"}
            </button>
            <button className="btn btn-xs btn-ghost" onClick={onClose} title="Exit Tour">
              ✕ Exit Tour
            </button>
          </div>
        </div>

        <div className="autopilot-progress-track">
          <div className="autopilot-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>

        <div className="autopilot-body">
          <p className="autopilot-summary">{step.summary}</p>
          <div className="autopilot-highlight-box">
            <IconCheckCircle size={14} className="text-green" />
            <span>{step.highlight}</span>
          </div>
        </div>

        <div className="autopilot-footer">
          <div className="autopilot-stepper-dots">
            {TOUR_STEPS.map((s, idx) => (
              <button
                key={s.title}
                className={`tour-dot ${idx === currentStep ? "tour-dot--active" : idx < currentStep ? "tour-dot--done" : ""}`}
                onClick={() => jumpToStep(idx)}
                title={`Jump to: ${s.title}`}
              >
                {idx + 1}
              </button>
            ))}
          </div>
          <span className="autopilot-timer-tag">
            {timeLeft}s remaining
          </span>
        </div>
      </div>
    </div>
  );
}
