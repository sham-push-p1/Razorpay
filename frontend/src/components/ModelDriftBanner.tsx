import { useEffect, useState } from "react";
import { api, type DriftStatus } from "../lib/api";
import { IconActivity, IconZap, IconAlertTriangle, IconCheckCircle } from "./Icons";

export default function ModelDriftBanner() {
  const [drift, setDrift] = useState<DriftStatus>({
    is_drifted: false,
    psi_score: 0.042,
    status: "NOMINAL_STABLE",
    last_retrained_at: "Just now",
    last_drift_detected_at: null,
    drift_type: null,
  });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const fetchDrift = async () => {
    try {
      const d = await api.getDriftStatus();
      setDrift(d);
    } catch (e) {
      console.error("Failed to load drift status", e);
    }
  };

  useEffect(() => {
    fetchDrift();
  }, []);

  const handleInjectDrift = async () => {
    setLoading(true);
    try {
      const d = await api.injectDrift("adversarial_velocity_shift");
      setDrift(d);
      setToast("Synthetic Adversary Drift Injected! PSI threshold breached.");
      setTimeout(() => setToast(null), 3500);
    } catch (e: any) {
      alert(`Drift injection failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRetrain = async () => {
    setLoading(true);
    try {
      const d = await api.retrainModel();
      setDrift(d);
      setToast("Active Learning Retrain Complete! Gradient Boosting trees recalibrated.");
      setTimeout(() => setToast(null), 3500);
    } catch (e: any) {
      alert(`Retrain failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const isWarning = drift.is_drifted || drift.psi_score > 0.20;

  return (
    <div className={`panel drift-monitor-panel ${isWarning ? "drift-monitor-panel--warning" : ""}`}>
      {toast && <div className="floating-toast">{toast}</div>}

      <div className="drift-monitor-header">
        <div className="drift-left-group">
          <span className={`drift-pulse-dot ${isWarning ? "drift-pulse-dot--warning" : "drift-pulse-dot--nominal"}`} />
          <div>
            <div className="drift-title-row">
              <span className="drift-title">MLOps Continuous Model Drift Telemetry</span>
              <span className={`badge ${isWarning ? "badge-block" : "badge-pass"}`}>
                {isWarning ? (
                  <>
                    <IconAlertTriangle size={12} />
                    <span>DATA DRIFT DETECTED</span>
                  </>
                ) : (
                  <>
                    <IconCheckCircle size={12} />
                    <span>POPULATION STABILITY: NOMINAL</span>
                  </>
                )}
              </span>
            </div>
            <p className="drift-sub">
              Population Stability Index (PSI): <strong className="mono">{drift.psi_score}</strong> (Baseline: &lt;0.10) • Last retrained: <strong className="mono">{drift.last_retrained_at}</strong>
            </p>
          </div>
        </div>

        <div className="drift-actions-group">
          {!isWarning ? (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleInjectDrift}
              disabled={loading}
            >
              <IconActivity size={13} />
              <span>Inject Synthetic Adversarial Drift</span>
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-success btn-sm"
              onClick={handleRetrain}
              disabled={loading}
            >
              <IconZap size={13} />
              <span>Run Online Active Retrain Pipeline</span>
            </button>
          )}
        </div>
      </div>

      {isWarning && (
        <div className="drift-alert-body">
          <strong>Adversary Pattern Shift Detected:</strong> Fraudsters are restructuring transaction velocities just below traditional static thresholds. The Gradient Boosting classifier confidence has degraded by 12.4%.
        </div>
      )}
    </div>
  );
}

