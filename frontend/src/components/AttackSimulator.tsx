import { useState } from "react";
import type { Scenario } from "../lib/api";

interface ScenarioDef {
  id: Scenario;
  label: string;
  hint: string;
  threat: "NORMAL" | "HIGH" | "CRITICAL";
  icon: string;
}

const SCENARIOS: ScenarioDef[] = [
  { id: "normal_user", label: "Normal User Traffic", hint: "Baseline organic transactions", threat: "NORMAL", icon: "👤" },
  { id: "impossible_travel", label: "Impossible Travel Jump", hint: "Geo velocity >900 km/h airline speed", threat: "CRITICAL", icon: "✈️" },
  { id: "card_testing_ladder", label: "Card-Testing Ladder", hint: "Micro-probing sequence to ₹45k jump", threat: "CRITICAL", icon: "🪜" },
  { id: "credential_stuffing", label: "Credential Stuffing", hint: "1 device cycling multiple accounts", threat: "CRITICAL", icon: "🔑" },
  { id: "card_testing", label: "Card Testing Probes", hint: "Rapid tiny ₹1–₹20 authorizations", threat: "HIGH", icon: "💳" },
  { id: "account_takeover", label: "Account Takeover (ATO)", hint: "Unfamiliar device + 10x amount spike", threat: "CRITICAL", icon: "🚨" },
  { id: "multi_account_fraud", label: "Multi-Account Syndicate", hint: "Shared device & IP cluster", threat: "HIGH", icon: "👥" },
  { id: "fraud_ring", label: "Fraud Ring Graph Wave", hint: "Coordinated bipartite collusion", threat: "CRITICAL", icon: "🕸️" },
  { id: "velocity_attack", label: "Burst Velocity Flood", hint: "Hard safety threshold breach", threat: "CRITICAL", icon: "⚡" },
];

interface Props {
  onRun: (scenario: Scenario, count: number) => void;
  onReset: () => void;
  runningScenario: Scenario | null;
}

export default function AttackSimulator({ onRun, onReset, runningScenario }: Props) {
  const [batchCount, setBatchCount] = useState<number>(6);

  return (
    <div className="panel panel-attack">
      <div className="panel-header">
        <div className="flex-between">
          <div>
            <span className="eyebrow">03 — ADVERSARIAL STRESS SUITE</span>
            <h3>Attack Simulator</h3>
          </div>
          {/* Batch Selector */}
          <div className="batch-chips">
            <span className="batch-label">Burst:</span>
            {[3, 6, 12].map((cnt) => (
              <button
                key={cnt}
                type="button"
                className={`batch-chip ${batchCount === cnt ? "batch-chip--active" : ""}`}
                onClick={() => setBatchCount(cnt)}
              >
                {cnt}x
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="scenario-grid">
        {SCENARIOS.map((s) => {
          const isRunning = runningScenario === s.id;
          return (
            <button
              key={s.id}
              className={`scenario-btn ${isRunning ? "scenario-btn--running" : ""}`}
              onClick={() => onRun(s.id, batchCount)}
              disabled={runningScenario !== null}
            >
              <div className="scenario-btn-top">
                <span className="scenario-title">
                  <span className="scenario-icon">{s.icon}</span> {s.label}
                </span>
                <span className={`threat-tag threat-tag--${s.threat.toLowerCase()}`}>
                  {s.threat}
                </span>
              </div>
              <div className="scenario-btn-bottom">
                <span className="scenario-hint">{s.hint}</span>
                {isRunning && <span className="running-indicator">Firing {batchCount}x wave...</span>}
              </div>
            </button>
          );
        })}
      </div>

      <button
        className="btn btn-secondary reset-btn"
        onClick={onReset}
        disabled={runningScenario !== null}
      >
        🔄 Reset HotStore & Graph Memory
      </button>
    </div>
  );
}
