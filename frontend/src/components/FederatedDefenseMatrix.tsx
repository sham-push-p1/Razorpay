import { useState } from "react";

interface MerchantNode {
  id: string;
  name: string;
  category: string;
  status: "PROTECTED" | "ATTACKED" | "IMMUNIZED";
  savedAmount: number;
}

export default function FederatedDefenseMatrix() {
  const [activeTab, setActiveTab] = useState<"network" | "fedavg" | "compliance">("network");
  const [syndicateCaught, setSyndicateCaught] = useState(false);

  const [merchants, setMerchants] = useState<MerchantNode[]>([
    { id: "M1", name: "Swiggy Instamart", category: "Quick Commerce", status: "PROTECTED", savedAmount: 18500 },
    { id: "M2", name: "Tanishq Jewellery", category: "Luxury Retail", status: "PROTECTED", savedAmount: 85000 },
    { id: "M3", name: "BookMyShow", category: "Entertainment", status: "PROTECTED", savedAmount: 14200 },
    { id: "M4", name: "Zomato Dining", category: "Food & Beverage", status: "PROTECTED", savedAmount: 6400 },
  ]);

  const triggerNetworkAttack = () => {
    setSyndicateCaught(true);
    setMerchants([
      { id: "M1", name: "Swiggy Instamart", category: "Quick Commerce", status: "ATTACKED", savedAmount: 18500 },
      { id: "M2", name: "Tanishq Jewellery", category: "Luxury Retail", status: "IMMUNIZED", savedAmount: 85000 },
      { id: "M3", name: "BookMyShow", category: "Entertainment", status: "IMMUNIZED", savedAmount: 14200 },
      { id: "M4", name: "Zomato Dining", category: "Food & Beverage", status: "IMMUNIZED", savedAmount: 6400 },
    ]);
  };

  const resetNetwork = () => {
    setSyndicateCaught(false);
    setMerchants([
      { id: "M1", name: "Swiggy Instamart", category: "Quick Commerce", status: "PROTECTED", savedAmount: 18500 },
      { id: "M2", name: "Tanishq Jewellery", category: "Luxury Retail", status: "PROTECTED", savedAmount: 85000 },
      { id: "M3", name: "BookMyShow", category: "Entertainment", status: "PROTECTED", savedAmount: 14200 },
      { id: "M4", name: "Zomato Dining", category: "Food & Beverage", status: "PROTECTED", savedAmount: 6400 },
    ]);
  };

  return (
    <div className="panel federated-matrix-panel">
      <div className="panel-header">
        <div className="flex-between">
          <div>
            <span className="eyebrow">ENTERPRISE FEDERATED INTELLIGENCE & GOVERNANCE</span>
            <h3>Federated Learning, Threat Intel & Compliance Matrix</h3>
          </div>
          <div className="filter-pill-group">
            <button
              type="button"
              className={`filter-pill ${activeTab === "network" ? "filter-pill--active" : ""}`}
              onClick={() => setActiveTab("network")}
            >
              🌐 Threat Intel Broadcast
            </button>
            <button
              type="button"
              className={`filter-pill ${activeTab === "fedavg" ? "filter-pill--active" : ""}`}
              onClick={() => setActiveTab("fedavg")}
            >
              🧬 Federated Learning (FedAvg)
            </button>
            <button
              type="button"
              className={`filter-pill ${activeTab === "compliance" ? "filter-pill--active" : ""}`}
              onClick={() => setActiveTab("compliance")}
            >
              📜 Regulatory Matrix (RBI/PCI/GDPR)
            </button>
          </div>
        </div>
      </div>

      {activeTab === "network" && (
        <div className="federated-network-body">
          <p className="matrix-desc">
            <strong>Cross-Merchant Threat Intelligence:</strong> When a compromised device hash or card tester is intercepted at one merchant, cryptographic IoCs instantly broadcast across the network to immunize all other merchants in &lt;5ms.
          </p>

          <div className="network-action-bar">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={triggerNetworkAttack}
              disabled={syndicateCaught}
            >
              ⚡ Simulate Cross-Merchant Attack (Swiggy &rarr; Tanishq)
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={resetNetwork}
              disabled={!syndicateCaught}
            >
              🔄 Reset Threat State
            </button>
          </div>

          <div className="merchants-grid">
            {merchants.map((m) => (
              <div
                key={m.id}
                className={`merchant-card ${
                  m.status === "ATTACKED"
                    ? "merchant-card--attacked"
                    : m.status === "IMMUNIZED"
                    ? "merchant-card--immunized"
                    : ""
                }`}
              >
                <div className="merchant-header">
                  <span className="merchant-name">{m.name}</span>
                  <span
                    className={`badge ${
                      m.status === "ATTACKED"
                        ? "badge-block"
                        : m.status === "IMMUNIZED"
                        ? "badge-pass"
                        : "badge-stepup"
                    }`}
                  >
                    {m.status}
                  </span>
                </div>
                <span className="merchant-cat mono text-xs">{m.category}</span>

                <div className="merchant-status-box">
                  {m.status === "ATTACKED" && (
                    <span className="text-red text-xs font-bold">
                      🚨 Hardware Fingerprint #DEV-99 Caught
                    </span>
                  )}
                  {m.status === "IMMUNIZED" && (
                    <span className="text-green text-xs font-bold">
                      🛡️ Immunized via Hash Federation (&lt;5ms)
                    </span>
                  )}
                  {m.status === "PROTECTED" && (
                    <span className="text-dim text-xs">
                      ● Active Network Shield
                    </span>
                  )}
                </div>

                <div className="merchant-saved">
                  <span className="text-xs text-dim">Protected GMV:</span>
                  <span className="mono font-bold">₹{m.savedAmount.toLocaleString("en-IN")}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "fedavg" && (
        <div className="fedavg-body">
          <p className="matrix-desc">
            <strong>Federated Learning (FedAvg):</strong> Local models train independently on merchant transaction streams without raw PII leaving customer perimeter. Only encrypted parameter gradient updates (&Delta;W) are aggregated into the global risk model.
          </p>

          <div className="fedavg-diagram-grid">
            <div className="fedavg-node">
              <span className="fedavg-title">🏢 Merchant Node A</span>
              <span className="mono text-xs">Local Loss: <strong>0.042</strong></span>
              <span className="text-xs text-green">&Delta;W_A encrypted</span>
            </div>
            <div className="fedavg-node">
              <span className="fedavg-title">🏪 Merchant Node B</span>
              <span className="mono text-xs">Local Loss: <strong>0.038</strong></span>
              <span className="text-xs text-green">&Delta;W_B encrypted</span>
            </div>
            <div className="fedavg-node">
              <span className="fedavg-title">🛍️ Merchant Node C</span>
              <span className="mono text-xs">Local Loss: <strong>0.041</strong></span>
              <span className="text-xs text-green">&Delta;W_C encrypted</span>
            </div>
          </div>

          <div className="fedavg-aggregation-box">
            <span className="font-bold">⚡ Central FedAvg Aggregator:</span>
            <code className="mono text-xs text-blue">W_(t+1) = &sum; (n_k / n) * W_k(t)</code>
            <p className="text-xs text-dim" style={{ margin: "6px 0 0" }}>
              Global Convergence: <strong>Round #42</strong> • Privacy Guarantee: <strong>(&epsilon;=0.5, &delta;=10^-5) Differential Privacy</strong>
            </p>
          </div>
        </div>
      )}

      {activeTab === "compliance" && (
        <div className="compliance-matrix-body">
          <p className="matrix-desc">
            Full alignment with global payments risk governance, data privacy acts, and security standards:
          </p>
          <div className="compliance-grid">
            <div className="comp-card">
              <div className="comp-header">
                <span className="comp-badge">RBI / PSD2 SCA</span>
                <span className="badge badge-pass">COMPLIANT</span>
              </div>
              <p className="comp-text">
                Dynamic risk-based authentication (TRA) exempts low-risk transactions while stepping up 2FA challenges on borderline scores.
              </p>
            </div>

            <div className="comp-card">
              <div className="comp-header">
                <span className="comp-badge">PCI-DSS 4.0</span>
                <span className="badge badge-pass">COMPLIANT</span>
              </div>
              <p className="comp-text">
                Zero plaintext PAN storage. SHA-256 salted hashes and tokenized card references (Requirement 3.4 & 4.2).
              </p>
            </div>

            <div className="comp-card">
              <div className="comp-header">
                <span className="comp-badge">GDPR Art. 22 & DPDP</span>
                <span className="badge badge-pass">COMPLIANT</span>
              </div>
              <p className="comp-text">
                Right to explanation for automated algorithmic decisions fulfilled via dual-tier customer-facing and SHAP audit explanations.
              </p>
            </div>

            <div className="comp-card">
              <div className="comp-header">
                <span className="comp-badge">ISO/IEC 27001</span>
                <span className="badge badge-pass">COMPLIANT</span>
              </div>
              <p className="comp-text">
                Append-only immutable governance audit trail recording all policy updates and emergency kill-switch interventions.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
