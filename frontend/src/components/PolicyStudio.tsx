import { useEffect, useState } from "react";
import { api, type PolicyConfig, type AuditLogEntry } from "../lib/api";
import ConfusionMatrixBench from "./ConfusionMatrixBench";

export default function PolicyStudio() {
  const [config, setConfig] = useState<PolicyConfig>({
    version: "policy-v2.5-enterprise",
    approve_threshold: 30,
    step_up_threshold: 70,
    blacklisted_users_count: 0,
    blacklisted_devices_count: 0,
    blacklisted_ips_count: 0,
    auto_step_up_new_device: false,
    kill_switch_active: false,
    audit_log: [],
  });
  const [approveTh, setApproveTh] = useState(30);
  const [stepUpTh, setStepUpTh] = useState(70);
  const [autoStepUp, setAutoStepUp] = useState(false);
  const [blackType, setBlackType] = useState("device");
  const [blackVal, setBlackVal] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState<string | null>(null);

  // Kill Switch confirmation state
  const [showKillModal, setShowKillModal] = useState(false);
  const [killReason, setKillReason] = useState("Flash Sale False-Positive Spike Mitigation");
  const [killActor, setKillActor] = useState("SecOps Lead (Ashwin)");

  const fetchConfig = async () => {
    try {
      const c = await api.getPolicyConfig();
      setConfig(c);
      setApproveTh(c.approve_threshold);
      setStepUpTh(c.step_up_threshold);
      setAutoStepUp(c.auto_step_up_new_device);
    } catch (e) {
      console.error("Failed to load policy config", e);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const updated = await api.updatePolicyConfig({
        approve_threshold: approveTh,
        step_up_threshold: stepUpTh,
        auto_step_up_new_device: autoStepUp,
      });
      setConfig(updated);
      setSavedSuccess("Policy rules & thresholds successfully updated and logged to audit trail!");
      setTimeout(() => setSavedSuccess(null), 3500);
    } catch (e: any) {
      alert(`Failed to save policy: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleKillSwitch = async (activate: boolean) => {
    try {
      const updated = await api.toggleKillSwitch(activate, killActor, killReason);
      setConfig(updated);
      setShowKillModal(false);
      setSavedSuccess(activate ? "⚠️ Master Kill-Switch ENGAGED: Automated blocking paused." : "✓ Master Kill-Switch DISENGAGED: Automated protection resumed.");
      setTimeout(() => setSavedSuccess(null), 4000);
    } catch (e: any) {
      alert(`Kill switch toggle failed: ${e.message}`);
    }
  };

  const handleAddBlacklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blackVal.trim()) return;
    try {
      await api.addBlacklist(blackType, blackVal.trim());
      setBlackVal("");
      fetchConfig();
      setSavedSuccess(`Added ${blackType} to quarantine list.`);
      setTimeout(() => setSavedSuccess(null), 3000);
    } catch (e: any) {
      alert(`Blacklist failed: ${e.message}`);
    }
  };

  const applyPresetProfile = (preset: "balanced" | "aggressive" | "growth") => {
    if (preset === "balanced") {
      setApproveTh(30);
      setStepUpTh(70);
      setAutoStepUp(false);
    } else if (preset === "aggressive") {
      setApproveTh(20);
      setStepUpTh(55);
      setAutoStepUp(true);
    } else if (preset === "growth") {
      setApproveTh(45);
      setStepUpTh(85);
      setAutoStepUp(false);
    }
  };

  return (
    <div className="policy-studio-container">
      {savedSuccess && <div className="floating-toast">{savedSuccess}</div>}

      <div className="policy-header-bar">
        <div>
          <h2>🎛️ Policy Studio & Ops Governance</h2>
          <p className="policy-sub">
            Real-time threshold tuning, regulatory audit logs, and emergency ops kill-switch
          </p>
        </div>

        <div className="header-right-badges">
          {config.kill_switch_active && (
            <span className="kill-switch-active-pill">
              🚨 KILL-SWITCH ENGAGED (BLOCKING PAUSED)
            </span>
          )}
          <div className="policy-status-pill">
            <span className="mono">Engine: {config.version}</span>
          </div>
        </div>
      </div>

      {/* Preset Profiles Bar */}
      <div className="policy-presets-bar">
        <span className="preset-bar-title">Risk Appetite Presets:</span>
        <div className="preset-btn-group">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => applyPresetProfile("balanced")}
          >
            ⚖️ Balanced Fintech (30/70)
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => applyPresetProfile("aggressive")}
          >
            🛡️ Aggressive Defense (20/55)
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => applyPresetProfile("growth")}
          >
            🚀 High-Growth / Low Friction (45/85)
          </button>
        </div>
      </div>

      <div className="policy-grid">
        {/* Left Card: Threshold Tuner */}
        <div className="policy-card">
          <div className="panel-header">
            <span className="eyebrow">DECISION BANDS</span>
            <h3>Dynamic Score Thresholds</h3>
          </div>

          <div className="threshold-bands-visual">
            <div className="band band-approve" style={{ width: `${approveTh}%` }}>
              APPROVE (0 – {approveTh})
            </div>
            <div className="band band-stepup" style={{ width: `${Math.max(stepUpTh - approveTh, 10)}%` }}>
              STEP-UP 2FA ({approveTh + 1} – {stepUpTh})
            </div>
            <div className="band band-block" style={{ width: `${Math.max(100 - stepUpTh, 10)}%` }}>
              BLOCK ({stepUpTh + 1} – 100)
            </div>
          </div>

          <div className="slider-control-group">
            <div className="slider-header">
              <label>Approve Threshold (Max safe score):</label>
              <span className="slider-val text-green font-bold">{approveTh} pts</span>
            </div>
            <input
              type="range"
              min="10"
              max="50"
              value={approveTh}
              onChange={(e) => {
                const val = Number(e.target.value);
                setApproveTh(val);
                if (val >= stepUpTh) setStepUpTh(val + 10);
              }}
              className="slider"
            />
            <p className="slider-desc">Transactions below this score pass friction-free.</p>
          </div>

          <div className="slider-control-group">
            <div className="slider-header">
              <label>Step-Up Threshold (Max challenge score):</label>
              <span className="slider-val text-amber font-bold">{stepUpTh} pts</span>
            </div>
            <input
              type="range"
              min="40"
              max="90"
              value={stepUpTh}
              onChange={(e) => {
                const val = Number(e.target.value);
                setStepUpTh(val);
                if (val <= approveTh) setApproveTh(val - 10);
              }}
              className="slider"
            />
            <p className="slider-desc">Scores between Approve and Step-Up trigger mandatory 2FA challenges.</p>
          </div>

          <div className="toggle-control-group">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={autoStepUp}
                onChange={(e) => setAutoStepUp(e.target.checked)}
              />
              <span className="toggle-text">Mandatory 2FA Challenge on Unfamiliar Hardware</span>
            </label>
          </div>

          <button className="btn btn-primary btn-block" onClick={handleSaveConfig} disabled={saving}>
            {saving ? "Deploying Policy..." : "💾 Apply & Log to Audit Trail"}
          </button>
        </div>

        {/* Right Card: Emergency Kill-Switch & Blacklist */}
        <div className="policy-card">
          <div className="panel-header">
            <div className="flex-between">
              <div>
                <span className="eyebrow">INCIDENT MITIGATION</span>
                <h3>Emergency Ops Kill-Switch</h3>
              </div>
            </div>
          </div>

          <div className={`kill-switch-box ${config.kill_switch_active ? "kill-switch-box--active" : ""}`}>
            <div className="kill-switch-meta">
              <span className="kill-switch-title">Pause Automated Blocking</span>
              <p className="kill-switch-sub">
                Temporarily downgrades all <code>BLOCK</code> actions to <code>STEP-UP</code> 2FA during flash sales or unexpected false-positive spikes.
              </p>
            </div>
            <button
              type="button"
              className={`btn ${config.kill_switch_active ? "btn-success" : "btn-danger"}`}
              onClick={() => {
                if (config.kill_switch_active) {
                  handleToggleKillSwitch(false);
                } else {
                  setShowKillModal(true);
                }
              }}
            >
              {config.kill_switch_active ? "✓ Resume Normal Blocking" : "🛑 Engage Emergency Kill-Switch"}
            </button>
          </div>

          <div className="panel-header" style={{ marginTop: 12 }}>
            <span className="eyebrow">QUARANTINE REGISTRY</span>
            <h4>Active Blacklists</h4>
          </div>

          <div className="blacklist-stats-grid">
            <div className="bl-stat-box">
              <span className="bl-label">Quarantined Users</span>
              <span className="bl-val">{config.blacklisted_users_count}</span>
            </div>
            <div className="bl-stat-box">
              <span className="bl-label">Quarantined Devices</span>
              <span className="bl-val text-red">{config.blacklisted_devices_count}</span>
            </div>
            <div className="bl-stat-box">
              <span className="bl-label">Blocked IP Subnets</span>
              <span className="bl-val">{config.blacklisted_ips_count}</span>
            </div>
          </div>

          <form onSubmit={handleAddBlacklist} className="blacklist-form">
            <div className="input-row">
              <select
                value={blackType}
                onChange={(e) => setBlackType(e.target.value)}
                className="select-box"
              >
                <option value="device">Device ID</option>
                <option value="user">User ID</option>
                <option value="ip">IP Hash</option>
              </select>
              <input
                type="text"
                placeholder={`e.g. ${blackType === "device" ? "DEV-AB12CD" : "USR-9911"}`}
                value={blackVal}
                onChange={(e) => setBlackVal(e.target.value)}
                className="input-box"
              />
              <button type="submit" className="btn btn-secondary">
                Add
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Ground-Truth Confusion Matrix Benchmark */}
      <ConfusionMatrixBench />

      {/* Immutable Audit Log Table */}
      <div className="panel audit-log-panel">
        <div className="panel-header">
          <div className="flex-between">
            <div>
              <span className="eyebrow">REGULATORY COMPLIANCE</span>
              <h3>Immutable Governance Audit Trail</h3>
            </div>
            <span className="badge badge-type">PCI-DSS & RBI SCA Compliant</span>
          </div>
        </div>

        <div className="table-responsive">
          <table className="audit-table">
            <thead>
              <tr>
                <th>Audit ID</th>
                <th>Timestamp (UTC)</th>
                <th>Operator</th>
                <th>Action</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {config.audit_log && config.audit_log.length > 0 ? (
                config.audit_log.slice().reverse().map((entry: AuditLogEntry) => (
                  <tr key={entry.id}>
                    <td className="mono font-bold text-highlight-dark">{entry.id}</td>
                    <td className="mono text-xs">{entry.timestamp}</td>
                    <td><strong>{entry.actor}</strong></td>
                    <td>
                      <span className={`audit-action-tag ${entry.action.includes("KILL") ? "audit-action-tag--danger" : ""}`}>
                        {entry.action}
                      </span>
                    </td>
                    <td className="text-secondary">{entry.details}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="empty-note">No audit records logged yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Kill Switch Confirmation Modal */}
      {showKillModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-badge-row">
              <span className="badge badge-block">🛑 EMERGENCY OVERRIDE CONFIRMATION</span>
            </div>
            <h3>Engage Emergency Kill-Switch?</h3>
            <p className="modal-sub">
              This will immediately pause all automated <code>BLOCK</code> actions across the payment gateway. Transactions that would normally be blocked will be routed to <code>STEP-UP</code> 2FA.
            </p>

            <div className="form-grid">
              <label>
                <span>Authorizing Operator:</span>
                <input
                  type="text"
                  value={killActor}
                  onChange={(e) => setKillActor(e.target.value)}
                  className="input-box"
                />
              </label>

              <label>
                <span>Justification / Incident Ticket:</span>
                <input
                  type="text"
                  value={killReason}
                  onChange={(e) => setKillReason(e.target.value)}
                  className="input-box"
                  placeholder="e.g. INC-8921: Flash sale false-positive spike"
                />
              </label>
            </div>

            <div className="modal-actions" style={{ marginTop: 20 }}>
              <div className="action-row">
                <button className="btn btn-ghost" onClick={() => setShowKillModal(false)}>
                  Cancel
                </button>
                <button className="btn btn-danger" onClick={() => handleToggleKillSwitch(true)}>
                  Confirm & Engage Kill-Switch
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
