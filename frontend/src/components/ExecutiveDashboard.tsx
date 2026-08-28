import { useState, useEffect } from "react";
import { api } from "../lib/api";

export default function ExecutiveDashboard() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    api.getExecutiveSummary().then(setData).catch(() => {});
  }, []);

  if (!data) return null;

  return (
    <div className="panel executive-cro-panel">
      <div className="panel-header">
        <div className="flex-between">
          <div>
            <span className="eyebrow">CHIEF RISK OFFICER (CRO) SINGLE-PANE VIEW</span>
            <h3>Executive Business & Network Health Dashboard</h3>
          </div>
          <span className="badge badge-pass font-bold">● SYSTEM ALL-GREEN</span>
        </div>
      </div>

      {/* Top 6 KPI Cards Grid */}
      <div className="cro-kpi-grid">
        <div className="cro-card">
          <span className="cro-label">GMV Protected</span>
          <span className="cro-val mono text-blue font-bold">{data.gmv_protected_inr}</span>
          <span className="cro-sub">Volume evaluated YTD</span>
        </div>

        <div className="cro-card">
          <span className="cro-label">Fraud Prevented</span>
          <span className="cro-val mono text-green font-bold">{data.fraud_prevented_inr}</span>
          <span className="cro-sub">Chargebacks blocked</span>
        </div>

        <div className="cro-card">
          <span className="cro-label">Customer Friction</span>
          <span className="cro-val mono text-amber font-bold">{data.customer_friction_pct}</span>
          <span className="cro-sub">2FA Step-up rate</span>
        </div>

        <div className="cro-card">
          <span className="cro-label">Fraud Capture</span>
          <span className="cro-val mono text-green font-bold">{data.fraud_capture_rate}</span>
          <span className="cro-sub">Precision: {data.false_positive_rate} FP</span>
        </div>

        <div className="cro-card">
          <span className="cro-label">P95 Latency</span>
          <span className="cro-val mono text-green font-bold">{data.p95_latency_ms} ms</span>
          <span className="cro-sub">SLA budget: 100ms</span>
        </div>

        <div className="cro-card">
          <span className="cro-label">ROI Multiplier</span>
          <span className="cro-val mono text-purple font-bold">14.8x</span>
          <span className="cro-sub">Revenue uplift vs cost</span>
        </div>
      </div>

      {/* Lower Row: Networks & Model Health */}
      <div className="cro-lower-grid">
        {/* Fraud Networks */}
        <div className="cro-sub-box">
          <div className="cro-sub-header">
            <span className="font-bold">🕸️ Fraud Syndicate Networks</span>
            <span className="badge badge-block">Quarantined</span>
          </div>
          <div className="cro-network-stats">
            <div className="net-stat">
              <span className="stat-num mono">{data.fraud_networks.active_rings}</span>
              <span className="stat-lbl">Active Rings</span>
            </div>
            <div className="net-stat">
              <span className="stat-num mono">{data.fraud_networks.connected_accounts}</span>
              <span className="stat-lbl">Accounts Linked</span>
            </div>
            <div className="net-stat">
              <span className="stat-num mono text-red font-bold">{data.fraud_networks.quarantined_exposure_inr}</span>
              <span className="stat-lbl">Exposure Neutralized</span>
            </div>
          </div>
        </div>

        {/* Model & System Health */}
        <div className="cro-sub-box">
          <div className="cro-sub-header">
            <span className="font-bold">🔬 AI Engine & Health State</span>
            <span className="badge badge-pass">Optimal</span>
          </div>
          <div className="cro-health-items">
            <div className="health-row">
              <span>Champion / Challenger Recall:</span>
              <span className="mono font-bold text-green">{data.model_health.champion_recall} &rarr; {data.model_health.challenger_recall}</span>
            </div>
            <div className="health-row">
              <span>Population Stability Index (PSI):</span>
              <span className="mono text-green">{data.model_health.psi_drift_status}</span>
            </div>
            <div className="health-row">
              <span>Model Security & Adversarial Defense:</span>
              <span className="mono text-green font-bold">● {data.system_health.model_security}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
