import { useEffect, useState } from "react";
import { api, type CaseItem } from "../lib/api";
import AnalystCopilot from "./AnalystCopilot";

export default function CaseManagement() {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [selectedCase, setSelectedCase] = useState<CaseItem | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchCases = async () => {
    setLoading(true);
    try {
      const res = await api.listCases(filterStatus);
      setCases(res.cases || []);
      if (res.cases && res.cases.length > 0 && !selectedCase) {
        setSelectedCase(res.cases[0]);
      }
    } catch (e) {
      console.error("Failed to load cases", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [filterStatus]);

  const handleStatusChange = async (caseId: string, newStatus: string, label?: string) => {
    try {
      await api.updateCase(caseId, newStatus, label);
      setToastMessage(`Case ${caseId} updated: ${label || newStatus}`);
      setTimeout(() => setToastMessage(null), 3000);
      fetchCases();
      if (selectedCase?.case_id === caseId) {
        setSelectedCase({ ...selectedCase, status: newStatus as any, analyst_label: label || null });
      }
    } catch (e: any) {
      alert(`Update failed: ${e.message}`);
    }
  };

  const handleCopilotAction = async (action: string) => {
    if (!selectedCase) return;
    if (action === "CONFIRM_FRAUD") {
      await handleStatusChange(selectedCase.case_id, "resolved", "fraud_confirmed");
    } else if (action === "STEP_UP") {
      await handleStatusChange(selectedCase.case_id, "investigating", "step_up_requested");
    } else if (action === "ADD_BLACKLIST") {
      if (selectedCase.device_id) {
        await api.addBlacklist("device", selectedCase.device_id);
        setToastMessage(`Device ${selectedCase.device_id} blacklisted globally!`);
        setTimeout(() => setToastMessage(null), 3000);
      }
    }
  };

  return (
    <div className="case-management-container">
      {toastMessage && <div className="floating-toast">{toastMessage}</div>}

      <div className="cases-header-bar">
        <div className="header-title-group">
          <h2>🛡️ AI Case Investigation Workbench</h2>
          <p className="header-sub">
            Real-time forensic investigation queue with Autonomous Agent Dossiers & Copilot Triage
          </p>
        </div>

        <div className="cases-filter-controls">
          <div className="filter-pill-group">
            {["all", "open", "investigating", "resolved"].map((st) => (
              <button
                key={st}
                className={`filter-pill ${filterStatus === st ? "filter-pill--active" : ""}`}
                onClick={() => setFilterStatus(st)}
              >
                {st.toUpperCase()}
              </button>
            ))}
          </div>
          <button className="btn btn-secondary btn-sm" onClick={fetchCases} disabled={loading}>
            🔄 Refresh Cases
          </button>
        </div>
      </div>

      <div className="cases-main-grid">
        {/* Left Column: Case Queue */}
        <div className="cases-queue-panel">
          <div className="panel-header">
            <span className="eyebrow">QUEUED INCIDENTS</span>
            <h4>Flagged Cases ({cases.length})</h4>
          </div>

          {cases.length === 0 ? (
            <div className="empty-cases-box">
              <p>No cases found matching '{filterStatus}'.</p>
              <span className="empty-hint">High-risk transactions from attacks automatically create cases.</span>
            </div>
          ) : (
            <div className="cases-scroll-list">
              {cases.map((c) => {
                const isSelected = selectedCase?.case_id === c.case_id;
                const severity = c.investigation_report?.severity || "MEDIUM";

                return (
                  <div
                    key={c.case_id}
                    className={`case-queue-item ${isSelected ? "case-queue-item--active" : ""}`}
                    onClick={() => setSelectedCase(c)}
                  >
                    <div className="case-queue-item-top">
                      <span className="case-item-id">{c.case_id}</span>
                      <span className={`badge-severity badge-severity--${severity.toLowerCase()}`}>
                        {severity}
                      </span>
                    </div>

                    <div className="case-queue-item-meta">
                      <div><span className="sub-label">Tx:</span> <code>{c.tx_id}</code></div>
                      <div><span className="sub-label">Amount:</span> ₹{c.amount?.toLocaleString()}</div>
                      <div><span className="sub-label">Status:</span> <span className="status-highlight">{c.status.toUpperCase()}</span></div>
                    </div>

                    {c.analyst_label && (
                      <div className="case-queue-item-label">
                        Tag: <strong>{c.analyst_label}</strong>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Center Column: Detailed Dossier */}
        <div className="case-dossier-panel">
          {selectedCase ? (
            <div className="dossier-content">
              <div className="dossier-header">
                <div>
                  <span className="eyebrow">AUTONOMOUS FORENSIC DOSSIER</span>
                  <h3>Case: {selectedCase.case_id}</h3>
                </div>
                <div className="dossier-badge-row">
                  <span className={`badge-severity badge-severity--${(selectedCase.investigation_report?.severity || "medium").toLowerCase()}`}>
                    {selectedCase.investigation_report?.severity || "MEDIUM"}
                  </span>
                  <span className="badge badge-type">
                    AI Confidence: {Math.round((selectedCase.investigation_report?.confidence || 0.9) * 100)}%
                  </span>
                </div>
              </div>

              {/* Summary Narrative */}
              <div className="dossier-section dossier-summary-card">
                <div className="section-title">🤖 Autonomous Agent Summary</div>
                <p className="narrative-text">
                  {selectedCase.investigation_report?.summary || "No narrative generated."}
                </p>
              </div>

              {/* Evidence Items */}
              <div className="dossier-section">
                <div className="section-title">🔍 Forensic Evidence Points</div>
                {selectedCase.investigation_report?.evidence_items &&
                selectedCase.investigation_report.evidence_items.length > 0 ? (
                  <ul className="evidence-list">
                    {selectedCase.investigation_report.evidence_items.map((ev, i) => (
                      <li key={i} className="evidence-item">
                        <span className="evidence-bullet">⚠</span>
                        <span>{ev}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="empty-note">Standard risk score deviation signals captured.</p>
                )}
              </div>

              {/* Recommended Actions */}
              <div className="dossier-section">
                <div className="section-title">💡 Agent Recommended Actions</div>
                <div className="recommended-actions-grid">
                  {selectedCase.investigation_report?.recommended_actions?.map((rec, i) => (
                    <div key={i} className="rec-card">
                      <span className="rec-num">{i + 1}</span>
                      <span>{rec}</span>
                    </div>
                  )) || <p className="empty-note">No actions recommended.</p>}
                </div>
              </div>

              {/* Analyst Decision Control Bar */}
              <div className="dossier-action-bar">
                <div className="action-bar-label">Analyst Resolution:</div>
                <div className="action-bar-buttons">
                  <button
                    className="btn btn-danger"
                    onClick={() => handleStatusChange(selectedCase.case_id, "resolved", "fraud_confirmed")}
                  >
                    🚫 Confirm Fraud & Quarantine
                  </button>
                  <button
                    className="btn btn-warning"
                    onClick={() => handleStatusChange(selectedCase.case_id, "investigating", "step_up_enforced")}
                  >
                    🛡️ Enforce 2FA Step-Up
                  </button>
                  <button
                    className="btn btn-success"
                    onClick={() => handleStatusChange(selectedCase.case_id, "resolved", "false_positive")}
                  >
                    ✓ Mark Legitimate (Pardon)
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-dossier-view">
              <p>Select a case from the left panel to inspect the forensic dossier.</p>
            </div>
          )}
        </div>

        {/* Right Column: AI Copilot Assistant */}
        <div className="case-copilot-panel">
          <AnalystCopilot
            currentCase={selectedCase}
            onActionTriggered={handleCopilotAction}
          />
        </div>
      </div>
    </div>
  );
}
