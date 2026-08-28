import { useState } from "react";
import { api, type RiskScoreResponse } from "../lib/api";

export default function AttackerDefenderSplit() {
  const [runningAttack, setRunningAttack] = useState<string | null>(null);
  const [attackerLogs, setAttackerLogs] = useState<string[]>([
    "[READY] Attacker bot framework initialized.",
    "[IDLE] Select an attack scenario below to launch an exploit attempt.",
  ]);
  const [defenderResult, setDefenderResult] = useState<RiskScoreResponse | null>(null);

  const addAttackerLog = (msg: string) => {
    const timestamp = new Date().toISOString().substring(11, 19);
    setAttackerLogs((prev) => [`[${timestamp}] ${msg}`, ...prev].slice(0, 12));
  };

  const launchAttack = async (type: "card_test" | "syndicate" | "stuffing") => {
    setRunningAttack(type);
    setDefenderResult(null);

    if (type === "card_test") {
      addAttackerLog("⚡ [INIT] Launching 'Low-and-Slow' Card Testing attack...");
      addAttackerLog("Rotating proxy: 194.26.29.112 (SOCKS5 Residential)");
      addAttackerLog("Spoofing device fingerprint: CanvasID_98a721");
      addAttackerLog("Injecting micro-charge payload: ₹125.00 via Stolen Visa •••• 4242");

      try {
        const res = await api.scoreTransaction({
          user_id: "USR-BOT-CARDTESTER",
          merchant_id: "merchant-demo",
          amount: 125,
          device_fingerprint: "DEV-BOT-SPOOFED-01",
          ip_hash: "IP-PROXY-RESIDENTIAL-01",
          payment_method: "card",
        });
        setDefenderResult(res);
        addAttackerLog(`[RESPONSE] Status: 403 Forbidden | Gateway Decision: ${res.decision}`);
      } catch (e: any) {
        addAttackerLog(`[ERROR] Request failed: ${e.message}`);
      }
    } else if (type === "syndicate") {
      addAttackerLog("🕸️ [INIT] Launching 'Syndicate Collusion Ring' attack...");
      addAttackerLog("Simulating Multi-Account fan-out from single hardware unit");
      addAttackerLog("Accounts: USR-SYND-A, USR-SYND-B, USR-SYND-C on Device DEV-SHARED-99");
      addAttackerLog("Injecting High-Value Checkout: ₹28,500.00");

      try {
        const res = await api.scoreTransaction({
          user_id: "USR-SYND-04",
          merchant_id: "merchant-demo",
          amount: 28500,
          device_fingerprint: "DEV-FRAUD-RING-NODE",
          ip_hash: "IP-SHARED-COLLUSION",
          payment_method: "upi",
        });
        setDefenderResult(res);
        addAttackerLog(`[INTERCEPTED] Gateway Decision: ${res.decision} (Risk Score: ${res.risk_score})`);
      } catch (e: any) {
        addAttackerLog(`[ERROR] Request failed: ${e.message}`);
      }
    } else if (type === "stuffing") {
      addAttackerLog("💥 [INIT] Launching 'Credential Stuffing Surge' attack...");
      addAttackerLog("Velocity burst: 8 automated rapid-fire checkout attempts in 2.1s");
      addAttackerLog("Target user: USR-VICTIM-ACCOUNT");

      try {
        const res = await api.scoreTransaction({
          user_id: "USR-VICTIM-STUFFED",
          merchant_id: "merchant-demo",
          amount: 4500,
          device_fingerprint: "DEV-UNKNOWN-BOTNET",
          ip_hash: "IP-BOTNET-CLUSTER",
          payment_method: "card",
        });
        setDefenderResult(res);
        addAttackerLog(`[CIRCUIT BREAKER TRIGGERED] Gateway Decision: ${res.decision}`);
      } catch (e: any) {
        addAttackerLog(`[ERROR] Request failed: ${e.message}`);
      }
    }

    setRunningAttack(null);
  };

  return (
    <div className="panel attacker-defender-panel">
      <div className="panel-header">
        <div className="flex-between">
          <div>
            <span className="eyebrow">LIVE ADVERSARIAL SANDBOX</span>
            <h3>Attacker vs. Defender Split-Screen</h3>
          </div>
          <span className="badge badge-type">Real-Time Side-by-Side Interception</span>
        </div>
      </div>

      <p className="split-desc">
        Watch live attack payloads meet autonomous AI defenses. Trigger adversary scripts on the left and inspect real-time graph traversal, SHAP explainability, and policy interception on the right.
      </p>

      {/* Attack Scenario Control Buttons */}
      <div className="attack-launch-bar">
        <span className="launch-label">Launch Adversary Vector:</span>
        <div className="launch-btn-group">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => launchAttack("card_test")}
            disabled={runningAttack !== null}
          >
            ⚡ 01. Low-and-Slow Card Test (₹125)
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => launchAttack("syndicate")}
            disabled={runningAttack !== null}
          >
            🕸️ 02. Syndicate Collusion Ring (₹28.5k)
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => launchAttack("stuffing")}
            disabled={runningAttack !== null}
          >
            💥 03. Credential Stuffing Surge
          </button>
        </div>
      </div>

      {/* Split Screen Dual View */}
      <div className="split-screen-grid">
        {/* Left Side: Attacker Terminal */}
        <div className="split-col split-col--attacker">
          <div className="split-col-header">
            <div className="attacker-terminal-title">
              <span className="terminal-dot terminal-dot--red" />
              <span className="terminal-dot terminal-dot--amber" />
              <span className="terminal-dot terminal-dot--green" />
              <span className="terminal-name mono">adversary_bot_runner.py</span>
            </div>
            <span className="badge badge-block">ATTACKER VIEW</span>
          </div>

          <div className="terminal-window mono">
            {attackerLogs.map((line, idx) => (
              <div key={idx} className="terminal-line">
                <span className="terminal-prompt">&gt;</span> {line}
              </div>
            ))}
          </div>

          <div className="attacker-status-bar">
            <span className="text-dim text-xs">Simulated Proxy Network: TOR / SOCKS5 Array</span>
            <span className="mono text-xs text-red font-bold">
              {runningAttack ? "STATUS: ATTACK IN FLIGHT..." : "STATUS: STANDBY"}
            </span>
          </div>
        </div>

        {/* Right Side: Razorpay Shield AI Defender */}
        <div className="split-col split-col--defender">
          <div className="split-col-header">
            <div className="defender-title-group">
              <span className="defender-shield-icon">🛡️</span>
              <span className="defender-name font-bold">Razorpay Shield AI Telemetry</span>
            </div>
            <span className="badge badge-pass">DEFENDER VIEW</span>
          </div>

          <div className="defender-body">
            {defenderResult ? (
              <div className="defender-telemetry-content">
                {/* Top Decision Pill */}
                <div className="defender-decision-banner">
                  <div className="decision-score-group">
                    <span className="telemetry-label">GATEWAY DECISION</span>
                    <span
                      className={`telemetry-decision-badge ${
                        defenderResult.decision === "BLOCK"
                          ? "decision-chip--block"
                          : defenderResult.decision === "STEP-UP"
                          ? "decision-chip--stepup"
                          : "decision-chip--approve"
                      }`}
                    >
                      {defenderResult.decision}
                    </span>
                  </div>

                  <div className="decision-meta-group">
                    <span className="telemetry-label">CONFIDENCE SCORE</span>
                    <span className="mono font-bold text-lg">{defenderResult.risk_score} / 100</span>
                  </div>

                  <div className="decision-meta-group">
                    <span className="telemetry-label">DECISION SLA</span>
                    <span className="mono font-bold text-green">{defenderResult.latency_ms}ms</span>
                  </div>
                </div>

                {/* Detected Threat Signatures */}
                <div className="telemetry-section">
                  <span className="telemetry-section-title">Forensic Risk Signatures Detected (SHAP):</span>
                  <div className="telemetry-reasons-list">
                    {defenderResult.reason_codes.slice(0, 3).map((r, i) => (
                      <div key={i} className="telemetry-reason-pill">
                        <span className="mono font-bold text-highlight-dark">{r.code}</span>
                        <span className="text-secondary text-xs">{r.description}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Auto-Investigation Agent Dossier Summary */}
                <div className="telemetry-agent-box">
                  <span className="agent-box-title">🤖 AI Case Agent Action:</span>
                  <p className="agent-box-text">
                    Case auto-filed to Queue for tx <code>{defenderResult.tx_id}</code>. Evidence correlated across IP and Hardware hashes.
                  </p>
                </div>
              </div>
            ) : (
              <div className="defender-empty-state">
                <span className="empty-radar-icon">📡</span>
                <p>Autonomous defense sensors active. Awaiting incoming transaction stream...</p>
              </div>
            )}
          </div>

          <div className="defender-status-bar">
            <span className="text-dim text-xs">Autonomous Decisioning: Sub-100ms SLA</span>
            <span className="mono text-xs text-green font-bold">SHIELD AI: ACTIVE</span>
          </div>
        </div>
      </div>
    </div>
  );
}
