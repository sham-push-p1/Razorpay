"""
Monitoring & MLOps (Layer 12) — Phase 1 in-memory version.

Tracks latency percentiles, decision distribution and throughput. A real
deployment would ship this to Prometheus; here it's queryable directly via
GET /metrics for the live dashboard.
"""
import threading
import time
from collections import deque
from typing import Deque, Dict


class MetricsCollector:
    def __init__(self, max_samples: int = 2000):
        self._lock = threading.Lock()
        self._latencies: Deque[float] = deque(maxlen=max_samples)
        self._decisions: Dict[str, int] = {"APPROVE": 0, "STEP-UP": 0, "BLOCK": 0}
        self._timestamps: Deque[float] = deque(maxlen=max_samples)
        self._errors = 0

    def record(self, latency_ms: float, decision: str):
        with self._lock:
            self._latencies.append(latency_ms)
            self._timestamps.append(time.time())
            self._decisions[decision] = self._decisions.get(decision, 0) + 1

    def record_error(self):
        with self._lock:
            self._errors += 1

    def snapshot(self) -> dict:
        with self._lock:
            latencies = sorted(self._latencies)
            n = len(latencies)

            def pct(p):
                if n == 0:
                    return 0.0
                idx = min(int(p * n), n - 1)
                return round(latencies[idx], 2)

            now = time.time()
            recent = [t for t in self._timestamps if now - t <= 10]
            rps = round(len(recent) / 10, 2) if recent else 0.0
            total_decisions = sum(self._decisions.values()) or 1

            return {
                "requests_per_second": rps,
                "total_requests": n,
                "avg_latency_ms": round(sum(latencies) / n, 2) if n else 0.0,
                "p50_latency_ms": pct(0.50),
                "p95_latency_ms": pct(0.95),
                "p99_latency_ms": pct(0.99),
                "decisions": self._decisions,
                "approve_rate": round(self._decisions["APPROVE"] / total_decisions, 3),
                "step_up_rate": round(self._decisions["STEP-UP"] / total_decisions, 3),
                "block_rate": round(self._decisions["BLOCK"] / total_decisions, 3),
                "errors": self._errors,
            }


metrics = MetricsCollector()
