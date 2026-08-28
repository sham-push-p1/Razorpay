import type { MetricsSnapshot } from "../lib/api";

interface AnalyticsDashboardProps {
  metrics: MetricsSnapshot | null;
}

export default function AnalyticsDashboard({ metrics }: AnalyticsDashboardProps) {
  const scenarios = [
    {
      name: "Normal User",
      id: "normal_user",
      expectedScore: "5 – 25",
      decision: "APPROVE",
      trigger: "Normal transaction amounts within baseline",
      threatLevel: "LOW",
    },
    {
      name: "Credential Stuffing",
      id: "credential_stuffing",
      expectedScore: "75 – 95",
      decision: "BLOCK",
      trigger: "Rapid account switching from single device fingerprint",
      threatLevel: "CRITICAL",
    },
    {
      name: "Card Testing / Micro-probe",
      id: "card_testing",
      expectedScore: "65 – 85",
      decision: "BLOCK / STEP-UP",
      trigger: "High velocity of micro-amount transactions (₹1–₹20)",
      threatLevel: "HIGH",
    },
    {
      name: "Account Takeover (ATO)",
      id: "account_takeover",
      expectedScore: "80 – 98",
      decision: "BLOCK",
      trigger: "Massive spend spike (>5x baseline) on new device",
      threatLevel: "CRITICAL",
    },
    {
      name: "Multi-Account Collusion",
      id: "multi_account_fraud",
      expectedScore: "70 – 90",
      decision: "BLOCK",
      trigger: "Multiple user accounts originating from identical IP/Device hub",
      threatLevel: "HIGH",
    },
    {
      name: "Syndicate Fraud Ring",
      id: "fraud_ring",
      expectedScore: "85 – 100",
      decision: "BLOCK",
      trigger: "Graph cluster formation with shared infrastructure nodes",
      threatLevel: "CRITICAL",
    },
    {
      name: "Velocity Burst Attack",
      id: "velocity_attack",
      expectedScore: "90 – 100",
      decision: "BLOCK",
      trigger: "Hard velocity limit breach (>5 transactions in 90s)",
      threatLevel: "CRITICAL",
    },
  ];

  return (
    <div className="analytics-container">
      <div className="analytics-header">
        <div>
          <h2>📊 Fraud Defense Analytics & Attack Matrix</h2>
          <p className="analytics-sub">
            Real-time latency profiling, risk distribution mix, and attack scenario benchmark intelligence
          </p>
        </div>
      </div>

      {/* Top Metrics Cards */}
      <div className="analytics-stats-grid">
        <div className="metric-box">
          <span className="metric-label">TOTAL TRANSACTIONS</span>
          <span className="metric-value">{metrics?.total_requests ?? 0}</span>
          <span className="metric-sub">Processed through decision pipeline</span>
        </div>
        <div className="metric-box">
          <span className="metric-label">THROUGHPUT (QPS)</span>
          <span className="metric-value text-blue">{(metrics?.requests_per_second ?? 0).toFixed(1)} req/s</span>
          <span className="metric-sub">Real-time evaluation capacity</span>
        </div>
        <div className="metric-box">
          <span className="metric-label">P95 LATENCY</span>
          <span className="metric-value text-amber">{metrics?.p95_latency_ms ?? 0} ms</span>
          <span className="metric-sub">Budget: &lt;100 ms target</span>
        </div>
        <div className="metric-box">
          <span className="metric-label">BLOCK DEFENSE RATE</span>
          <span className="metric-value text-red">{((metrics?.block_rate ?? 0) * 100).toFixed(1)}%</span>
          <span className="metric-sub">High-risk transactions intercepted</span>
        </div>
      </div>

      {/* Latency Percentiles Profile */}
      <div className="analytics-section-card">
        <div className="panel-header">
          <span className="eyebrow">LATENCY PROFILE</span>
          <h3>End-to-End Decision Latency Distribution</h3>
        </div>
        <div className="latency-bars-grid">
          <div className="latency-bar-item">
            <div className="latency-bar-header">
              <span>p50 (Median)</span>
              <span className="mono">{metrics?.p50_latency_ms ?? 0}ms</span>
            </div>
            <div className="latency-bar-track">
              <div
                className="latency-bar-fill latency-bar-fill--green"
                style={{ width: `${Math.min((metrics?.p50_latency_ms ?? 0) * 2, 100)}%` }}
              />
            </div>
          </div>

          <div className="latency-bar-item">
            <div className="latency-bar-header">
              <span>p95 (95th Percentile)</span>
              <span className="mono">{metrics?.p95_latency_ms ?? 0}ms</span>
            </div>
            <div className="latency-bar-track">
              <div
                className="latency-bar-fill latency-bar-fill--amber"
                style={{ width: `${Math.min((metrics?.p95_latency_ms ?? 0) * 2, 100)}%` }}
              />
            </div>
          </div>

          <div className="latency-bar-item">
            <div className="latency-bar-header">
              <span>p99 (Tail Latency)</span>
              <span className="mono">{metrics?.p99_latency_ms ?? 0}ms</span>
            </div>
            <div className="latency-bar-track">
              <div
                className="latency-bar-fill latency-bar-fill--purple"
                style={{ width: `${Math.min((metrics?.p99_latency_ms ?? 0) * 2, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Attack Scenario Benchmark Matrix */}
      <div className="analytics-section-card">
        <div className="panel-header">
          <span className="eyebrow">BENCHMARK INTELLIGENCE</span>
          <h3>Attack Scenario Detection Matrix</h3>
        </div>
        <div className="table-responsive">
          <table className="scenario-table">
            <thead>
              <tr>
                <th>Attack Scenario</th>
                <th>Threat Level</th>
                <th>Expected Score</th>
                <th>Target Policy Action</th>
                <th>Primary Forensic Signature</th>
              </tr>
            </thead>
            <tbody>
              {scenarios.map((s) => (
                <tr key={s.id}>
                  <td>
                    <strong>{s.name}</strong>
                    <div className="table-id-tag mono">{s.id}</div>
                  </td>
                  <td>
                    <span className={`badge-severity badge-severity--${s.threatLevel.toLowerCase()}`}>
                      {s.threatLevel}
                    </span>
                  </td>
                  <td className="mono">{s.expectedScore}</td>
                  <td>
                    <span className={`badge ${s.decision.includes("BLOCK") ? "badge-block" : s.decision.includes("STEP") ? "badge-stepup" : "badge-pass"}`}>
                      {s.decision}
                    </span>
                  </td>
                  <td className="text-secondary">{s.trigger}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
