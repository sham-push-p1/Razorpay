import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { IconLock, IconFileText } from "./Icons";


export default function RiskDecisionLedger() {
  const [ledger, setLedger] = useState<any[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null);
  const [auditStatus, setAuditStatus] = useState<any | null>(null);
  const [verifying, setVerifying] = useState(false);

  const fetchLedger = async () => {
    try {
      const res = await api.getDecisionLedger();
      setLedger(res.ledger || []);
    } catch (e) {
      console.error("Failed to load decision ledger", e);
    }
  };

  const handleVerifyChain = async () => {
    setVerifying(true);
    try {
      const audit = await api.verifyDecisionLedger();
      setAuditStatus(audit);
    } catch (e) {
      console.error("Failed to audit ledger", e);
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    fetchLedger();
    const timer = window.setInterval(fetchLedger, 3000);
    return () => window.clearInterval(timer);
  }, []);

  const handleExportJson = (entry: any) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(entry, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `forensic_ledger_${entry.tx_id || "event"}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="panel decision-ledger-panel">
      <div className="panel-header">
        <div className="flex-between">
          <div>
            <span className="eyebrow">ENTERPRISE AUDIT & REGULATORY COMPLIANCE</span>
            <h3>Immutable Risk Decision Ledger (SHA-256 Chained)</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleVerifyChain}
              disabled={verifying}
            >
              <IconLock size={13} />
              <span>{verifying ? "Auditing..." : "Audit Cryptographic Chain"}</span>
            </button>
            <span className="badge badge-pass font-bold">
              <IconFileText size={12} />
              <span>{ledger.length} AUDITED BLOCKS</span>
            </span>
          </div>
        </div>
      </div>

      {auditStatus && (
        <div style={{ margin: "10px 0", padding: "10px 14px", borderRadius: "6px", background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
          <div className="flex-between">
            <span className="mono text-xs text-green font-bold">
              SHA-256 Chain Audited: {auditStatus.total_blocks} Blocks Validated from Genesis (Tamper-Evident Standard: {auditStatus.compliance_standard})
            </span>
            <span className="mono text-xs text-dim">Latest Hash: {auditStatus.latest_hash?.slice(0, 16)}...</span>
          </div>
        </div>
      )}

      <p className="matrix-desc">
        Forensic reconstruction ledger: Every gateway evaluation produces an immutable serialized audit block with running SHA-256 cryptographic hash-chaining, model weights, confidence intervals, and reason codes for RBI/PCI auditors.
      </p>

      <div className="ledger-table-wrapper">
        <table className="ledger-table">
          <thead>
            <tr>
              <th>Ledger ID</th>
              <th>SHA-256 Block</th>
              <th>Transaction ID</th>
              <th>Time (UTC)</th>
              <th>Score</th>
              <th>Confidence</th>
              <th>Sigma (σ)</th>
              <th>Decision</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {ledger.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: "center", padding: "20px", color: "var(--text-dim)" }}>
                  Awaiting live transaction evaluation stream...
                </td>
              </tr>
            ) : (
              ledger.map((item) => (
                <tr key={item.ledger_id}>
                  <td className="mono text-xs font-bold">{item.ledger_id}</td>
                  <td className="mono text-xs text-dim" title={`Block: ${item.block_hash}\nPrev: ${item.prev_hash}`}>
                    {item.block_hash ? item.block_hash.slice(0, 8) + "..." : "genesis"}
                  </td>
                  <td className="mono text-xs text-blue">{item.tx_id}</td>
                  <td className="mono text-xs text-dim">{item.recorded_at}</td>
                  <td className="mono font-bold">
                    <span className={item.risk_score > 70 ? "text-red" : item.risk_score > 30 ? "text-amber" : "text-green"}>
                      {item.risk_score?.toFixed(1)}
                    </span>
                  </td>
                  <td className="mono text-green font-bold">{item.confidence_score}%</td>
                  <td className="mono text-dim">σ={item.sigma}</td>
                  <td>
                    <span
                      className={`badge ${
                        item.decision === "BLOCK"
                          ? "badge-block"
                          : item.decision === "STEP-UP"
                          ? "badge-stepup"
                          : "badge-pass"
                      }`}
                    >
                      {item.decision}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="btn btn-secondary btn-xs"
                        onClick={() => setSelectedEntry(item)}
                      >
                        Inspect
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-xs"
                        onClick={() => handleExportJson(item)}
                      >
                        Export JSON
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Forensic Inspection Modal */}
      {selectedEntry && (
        <div className="modal-backdrop" onClick={() => setSelectedEntry(null)}>
          <div className="modal-card modal-card--wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-badge-row">
              <span className="badge badge-pass font-bold">IMMUTABLE AUDIT RECORD</span>
              <span className="mono text-xs text-dim">{selectedEntry.recorded_at}</span>
            </div>

            <h3>Forensic Decision Record: {selectedEntry.tx_id}</h3>
            <p className="modal-sub">
              Full cryptographic snapshot of the exact model states, feature weights, and arbitration outputs:
            </p>

            <pre className="ledger-json-pre mono">
              {JSON.stringify(selectedEntry, null, 2)}
            </pre>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleExportJson(selectedEntry)}
              >
                Download Compliance JSON
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectedEntry(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
