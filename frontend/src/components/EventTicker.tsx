import type { RiskScoreResponse } from "../lib/api";

function decisionClass(decision: string) {
  if (decision === "APPROVE") return "ticker-pill--approve";
  if (decision === "STEP-UP") return "ticker-pill--stepup";
  return "ticker-pill--block";
}

export default function EventTicker({ events }: { events: RiskScoreResponse[] }) {
  if (events.length === 0) {
    return (
      <div className="ticker-wrapper">
        <div className="ticker-live-badge">
          <span className="live-dot" /> STREAM
        </div>
        <div className="ticker">
          <span className="ticker-empty mono">Awaiting real-time transaction ingestion stream…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="ticker-wrapper">
      <div className="ticker-live-badge">
        <span className="live-dot" /> STREAM ({events.length})
      </div>
      <div className="ticker">
        {events.slice(0, 30).map((e) => (
          <div key={e.correlation_id || e.tx_id} className={`ticker-pill ${decisionClass(e.decision)}`}>
            <span className="ticker-tx mono">{e.tx_id}</span>
            <span className="ticker-score mono">{e.risk_score.toFixed(0)}</span>
            <span className="ticker-tag">{e.decision}</span>
            <span className="ticker-latency mono">{e.latency_ms}ms</span>
          </div>
        ))}
      </div>
    </div>
  );
}
