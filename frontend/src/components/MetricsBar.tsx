import type { MetricsSnapshot } from "../lib/api";

function Stat({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: string;
  accent?: string;
  icon?: string;
}) {
  return (
    <div className="stat-box">
      <div className="stat-header">
        <span className="stat-label">{label}</span>
        {icon && <span className="stat-icon">{icon}</span>}
      </div>
      <div className="stat-value mono" style={accent ? { color: accent, textShadow: `0 0 12px ${accent}44` } : undefined}>
        {value}
      </div>
    </div>
  );
}

export default function MetricsBar({ metrics }: { metrics: MetricsSnapshot | null }) {
  const m = metrics;
  return (
    <div className="metrics-bar-container">
      <Stat
        label="THROUGHPUT"
        value={m ? `${m.requests_per_second.toFixed(1)}/s` : "—"}
        icon="⚡"
      />
      <Stat
        label="AVG LATENCY"
        value={m ? `${m.avg_latency_ms}ms` : "—"}
        icon="⏱️"
      />
      <Stat
        label="P95 LATENCY"
        value={m ? `${m.p95_latency_ms}ms` : "—"}
        icon="🎯"
      />
      <Stat
        label="P99 LATENCY"
        value={m ? `${m.p99_latency_ms}ms` : "—"}
        icon="📊"
      />
      <Stat
        label="APPROVE RATE"
        value={m ? `${Math.round(m.approve_rate * 100)}%` : "—"}
        accent="var(--risk-approve)"
        icon="✓"
      />
      <Stat
        label="STEP-UP 2FA"
        value={m ? `${Math.round(m.step_up_rate * 100)}%` : "—"}
        accent="var(--risk-stepup)"
        icon="🛡️"
      />
      <Stat
        label="BLOCK RATE"
        value={m ? `${Math.round(m.block_rate * 100)}%` : "—"}
        accent="var(--risk-block)"
        icon="🚫"
      />
      <Stat
        label="TOTAL VOLUME"
        value={m ? String(m.total_requests) : "—"}
        icon="🔢"
      />
    </div>
  );
}
