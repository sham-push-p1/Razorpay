"""
Chaos Engineering Service for simulating subsystem failures and testing graceful degradation.
"""
from typing import Dict, Any


class ChaosService:
    def __init__(self):
        self.graph_offline: bool = False
        self.ml_offline: bool = False
        self.anomaly_offline: bool = False
        self.rules_offline: bool = False
        self.simulated_latency_ms: float = 0.0

    def get_status(self) -> Dict[str, Any]:
        return {
            "graph_offline": self.graph_offline,
            "ml_offline": self.ml_offline,
            "anomaly_offline": self.anomaly_offline,
            "rules_offline": self.rules_offline,
            "simulated_latency_ms": self.simulated_latency_ms,
            "is_active": (
                self.graph_offline
                or self.ml_offline
                or self.anomaly_offline
                or self.rules_offline
                or self.simulated_latency_ms > 0
            ),
        }

    def disable_service(self, service: str) -> Dict[str, Any]:
        s = service.lower()
        if "graph" in s:
            self.graph_offline = True
        elif "ml" in s:
            self.ml_offline = True
        elif "anomaly" in s:
            self.anomaly_offline = True
        elif "rule" in s:
            self.rules_offline = True
        elif "network" in s or "jitter" in s:
            self.simulated_latency_ms = 45.0
        return self.get_status()

    def enable_service(self, service: str) -> Dict[str, Any]:
        s = service.lower()
        if "graph" in s:
            self.graph_offline = False
        elif "ml" in s:
            self.ml_offline = False
        elif "anomaly" in s:
            self.anomaly_offline = False
        elif "rule" in s:
            self.rules_offline = False
        elif "network" in s or "jitter" in s:
            self.simulated_latency_ms = 0.0
        return self.get_status()

    def set_chaos(
        self,
        graph_offline: bool = None,
        ml_offline: bool = None,
        anomaly_offline: bool = None,
        rules_offline: bool = None,
        simulated_latency_ms: float = None,
    ) -> Dict[str, Any]:
        if graph_offline is not None:
            self.graph_offline = bool(graph_offline)
        if ml_offline is not None:
            self.ml_offline = bool(ml_offline)
        if anomaly_offline is not None:
            self.anomaly_offline = bool(anomaly_offline)
        if rules_offline is not None:
            self.rules_offline = bool(rules_offline)
        if simulated_latency_ms is not None:
            self.simulated_latency_ms = float(simulated_latency_ms)
        return self.get_status()

    def reset(self):
        self.graph_offline = False
        self.ml_offline = False
        self.anomaly_offline = False
        self.rules_offline = False
        self.simulated_latency_ms = 0.0
        return self.get_status()


chaos_service = ChaosService()
