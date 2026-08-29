import { useCallback, useEffect, useRef, useState } from "react";
import {
  api,
  buildDemoCheckout,
  type CheckoutPayload,
  type MetricsSnapshot,
  type RiskScoreResponse,
  type Scenario,
} from "./lib/api";
import { soundFx } from "./lib/soundFx";
import RazorpayHeroFlow from "./components/RazorpayHeroFlow";
import RiskGauge from "./components/RiskGauge";
import CheckoutForm from "./components/CheckoutForm";
import ReasonCodeList from "./components/ReasonCodeList";
import AttackSimulator from "./components/AttackSimulator";
import MetricsBar from "./components/MetricsBar";
import EventTicker from "./components/EventTicker";
import StepUpModal from "./components/StepUpModal";
import FraudRingGraph from "./components/FraudRingGraph";
import CaseManagement from "./components/CaseManagement";
import PolicyStudio from "./components/PolicyStudio";
import AnalyticsDashboard from "./components/AnalyticsDashboard";
import EnsembleBreakdown from "./components/EnsembleBreakdown";
import LatencyWaterfall from "./components/LatencyWaterfall";
import ChaosControl from "./components/ChaosControl";
import CostFrictionDial from "./components/CostFrictionDial";
import AttackerDefenderSplit from "./components/AttackerDefenderSplit";
import PitchImpactCard from "./components/PitchImpactCard";
import DayInTheLifeReplay from "./components/DayInTheLifeReplay";
import PiiInspectorModal from "./components/PiiInspectorModal";
import ModelDriftBanner from "./components/ModelDriftBanner";
import FederatedDefenseMatrix from "./components/FederatedDefenseMatrix";
import ThemeToggle from "./components/ThemeToggle";
import PresenterHotkeys from "./components/PresenterHotkeys";
import AdaptiveAIBattle from "./components/AdaptiveAIBattle";
import GeoHeatmapAndShadow from "./components/GeoHeatmapAndShadow";
import ExecutiveDashboard from "./components/ExecutiveDashboard";
import RiskDecisionLedger from "./components/RiskDecisionLedger";
import AutoPilotTour from "./components/AutoPilotTour";
import { IconZap, IconGraph, IconShield, IconSliders, IconBarChart, IconLock } from "./components/Icons";
import "./App.css";


type TabView = "console" | "graph" | "cases" | "policy" | "analytics";

export default function App() {
  const [activeTab, setActiveTab] = useState<TabView>("console");
  const [latest, setLatest] = useState<RiskScoreResponse | null>(null);
  const [events, setEvents] = useState<RiskScoreResponse[]>([]);
  const [metrics, setMetrics] = useState<MetricsSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [runningScenario, setRunningScenario] = useState<Scenario | null>(null);
  const [connError, setConnError] = useState<string | null>(null);

  const [stepUpTx, setStepUpTx] = useState<{ txId: string; amount: number } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showPiiModal, setShowPiiModal] = useState(false);
  const [autoSimActive, setAutoSimActive] = useState(false);
  const [tourActive, setTourActive] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(soundFx.enabled);

  const pollRef = useRef<number | null>(null);
  const autoSimRef = useRef<number | null>(null);
  const consoleRef = useRef<HTMLDivElement | null>(null);

  const triggerSound = (decision: string) => {
    if (decision === "BLOCK") soundFx.playBlock();
    else if (decision === "STEP-UP") soundFx.playStepUp();
    else soundFx.playApprove();
  };

  const refreshMetrics = useCallback(async () => {
    try {
      const m = await api.getMetrics();
      setMetrics(m);
      setConnError(null);
    } catch {
      setConnError(
        "Can't reach the Risk API at localhost:8000 — ensure backend is running with `uvicorn app.main:app --reload`."
      );
    }
  }, []);

  useEffect(() => {
    refreshMetrics();
    pollRef.current = window.setInterval(refreshMetrics, 3000);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [refreshMetrics]);

  // Live Auto-Stream continuous traffic loop
  useEffect(() => {
    if (autoSimActive) {
      autoSimRef.current = window.setInterval(async () => {
        try {
          const sample = {
            ...buildDemoCheckout(),
            amount: Math.random() > 0.6 ? Math.floor(15000 + Math.random() * 35000) : Math.floor(500 + Math.random() * 3000),
          };
          const res = await api.scoreTransaction(sample);
          setLatest(res);
          setEvents((prev) => [res, ...prev].slice(0, 50));
          triggerSound(res.decision);
          refreshMetrics();
        } catch (e) {
          console.error("Auto sim error", e);
        }
      }, 2200);
    } else {
      if (autoSimRef.current) {
        window.clearInterval(autoSimRef.current);
        autoSimRef.current = null;
      }
    }
    return () => {
      if (autoSimRef.current) window.clearInterval(autoSimRef.current);
    };
  }, [autoSimActive, refreshMetrics]);

  async function handleSubmit(payload: CheckoutPayload) {
    setLoading(true);
    try {
      const result = await api.scoreTransaction(payload);
      setLatest(result);
      setEvents((prev) => [result, ...prev].slice(0, 50));
      triggerSound(result.decision);
      refreshMetrics();

      if (result.decision === "STEP-UP") {
        setStepUpTx({ txId: result.tx_id, amount: payload.amount });
      }
    } catch (err) {
      setConnError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRunScenario(scenario: Scenario, count: number = 6) {
    setRunningScenario(scenario);
    try {
      const res = await api.simulateAttack(scenario, count);
      const results = res.results;
      const finalResult = results[results.length - 1] ?? null;
      setLatest(finalResult);
      if (finalResult) triggerSound(finalResult.decision);
      setEvents((prev) => [...results].reverse().concat(prev).slice(0, 50));
      refreshMetrics();
    } catch (err) {
      setConnError((err as Error).message);
    } finally {
      setRunningScenario(null);
    }
  }

  async function handleReset() {
    await api.resetSimulation().catch(() => {});
    setEvents([]);
    setLatest(null);
    refreshMetrics();
  }

  const handleStepUpSuccess = () => {
    setStepUpTx(null);
    soundFx.playApprove();
    setToastMessage(`✓ 2FA Challenge Passed! Transaction ${latest?.tx_id} successfully authorized.`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleDayStepExecuted = (res: RiskScoreResponse) => {
    setLatest(res);
    setEvents((prev) => [res, ...prev].slice(0, 50));
    triggerSound(res.decision);
    refreshMetrics();
  };

  const handleTourStepAction = useCallback((stepIndex: number) => {
    if (stepIndex === 0) {
      setActiveTab("console");
      handleSubmit(buildDemoCheckout());
    } else if (stepIndex === 1) {
      setActiveTab("console");
      handleRunScenario("card_testing", 4);
    } else if (stepIndex === 2) {
      setActiveTab("graph");
    } else if (stepIndex === 3) {
      setActiveTab("cases");
    } else if (stepIndex === 4) {
      setActiveTab("analytics");
    }
  }, []);

  const scrollToConsole = () => {
    setActiveTab("console");
    setTimeout(() => {
      consoleRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  return (
    <div className="app-shell">
      {/* Floating Global Toast */}
      {toastMessage && <div className="floating-toast">{toastMessage}</div>}

      {/* Auto-Pilot Pitch Tour Overlay */}
      <AutoPilotTour
        active={tourActive}
        onClose={() => setTourActive(false)}
        onStepAction={handleTourStepAction}
      />

      {/* Top Navbar */}
      <header className="topbar">
        <div className="brand">
          <div className="razorpay-logo-mark">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M5 4L13 4L8 20L3 20L5 4Z" fill="#3375F6" />
              <path d="M12 4L19 4L17 9L11 9L12 4Z" fill="#0C2340" />
            </svg>
          </div>
          <div>
            <div className="brand-title">Razorpay <span className="brand-badge-pill">SHIELD AI</span></div>
            <div className="brand-sub">Real-Time Autonomous Risk & Fraud Engine</div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="tab-nav">
          <button
            className={`tab-btn ${activeTab === "console" ? "tab-btn--active" : ""}`}
            onClick={() => setActiveTab("console")}
          >
            <IconZap size={14} />
            <span>Live Console</span>
          </button>
          <button
            className={`tab-btn ${activeTab === "graph" ? "tab-btn--active" : ""}`}
            onClick={() => setActiveTab("graph")}
          >
            <IconGraph size={14} />
            <span>Fraud Rings & Graph</span>
          </button>
          <button
            className={`tab-btn ${activeTab === "cases" ? "tab-btn--active" : ""}`}
            onClick={() => setActiveTab("cases")}
          >
            <IconShield size={14} />
            <span>AI Cases & Copilot</span>
          </button>
          <button
            className={`tab-btn ${activeTab === "policy" ? "tab-btn--active" : ""}`}
            onClick={() => setActiveTab("policy")}
          >
            <IconSliders size={14} />
            <span>Policy Studio</span>
          </button>
          <button
            className={`tab-btn ${activeTab === "analytics" ? "tab-btn--active" : ""}`}
            onClick={() => setActiveTab("analytics")}
          >
            <IconBarChart size={14} />
            <span>Defense & ROI Analytics</span>
          </button>
        </nav>

        <div className="topbar-status">
          <button
            type="button"
            className="autopilot-launch-btn"
            onClick={() => setTourActive(true)}
            title="Launch automated 60-second judge pitch demo"
          >
            <IconZap size={13} />
            <span>60s Pitch Tour</span>
          </button>

          <button
            type="button"
            className="sound-toggle-btn"
            onClick={() => setSoundEnabled(soundFx.toggle())}
            title={soundEnabled ? "Mute audio sound FX" : "Unmute audio sound FX"}
          >
            {soundEnabled ? "🔊" : "🔇"}
          </button>

          <ThemeToggle />

          <button
            type="button"
            className="btn btn-ghost btn-sm pii-btn"
            onClick={() => setShowPiiModal(true)}
          >
            <IconLock size={13} />
            <span>PII Privacy</span>
          </button>

          <span className={`status-dot ${connError ? "status-dot--down" : "status-dot--up"}`} />
          <span className="status-text mono">{connError ? "Offline" : "Shield Online"}</span>
        </div>
      </header>

      {connError && <div className="conn-banner">{connError}</div>}

      {/* Signature Razorpay Engage Hero Flow Section */}
      <RazorpayHeroFlow
        latest={latest}
        onExploreConsole={scrollToConsole}
        onRunQuickDemo={() => handleRunScenario("fraud_ring", 6)}
        onAutoSimulateToggle={(active) => setAutoSimActive(active)}
      />

      {/* Global Real-time Ticker and Metrics Bar */}
      <div ref={consoleRef} className="console-anchor-target">
        <EventTicker events={events} />
      </div>
      <MetricsBar metrics={metrics} />

      {/* MLOps Continuous Model Drift Telemetry & Active Retrain Banner */}
      <ModelDriftBanner />

      {/* Main Tab Views */}
      <main className="tab-viewport">
        {activeTab === "console" && (
          <div className="console-tab-content">
            {/* Guided Storytelling "Day in the Life" Replay Scrubber */}
            <DayInTheLifeReplay onStepExecuted={handleDayStepExecuted} />

            {/* Top Row: Form, Decision Gauge, Attack Sim */}
            <div className="grid">
              <section className="col">
                <CheckoutForm onSubmit={handleSubmit} loading={loading} />
              </section>

              <section className="col col-center">
                <div className="panel panel-decision">
                  <div className="panel-header">
                    <span className="eyebrow">02 — RISK FUSION</span>
                    <h3>Real-time evaluation</h3>
                  </div>
                  <div className="decision-body">
                    <RiskGauge score={latest?.risk_score ?? null} decision={latest?.decision ?? null} />
                    <div className="decision-meta">
                      {latest ? (
                        <>
                          <div className="meta-row">
                            <span className="meta-label">Transaction</span>
                            <span className="mono">{latest.tx_id}</span>
                          </div>
                          <div className="meta-row">
                            <span className="meta-label">Latency</span>
                            <span className="mono text-highlight-dark">{latest.latency_ms}ms</span>
                          </div>
                          <div className="meta-row">
                            <span className="meta-label">Policy</span>
                            <span className="mono">{latest.policy_version}</span>
                          </div>
                          <div className="meta-row">
                            <span className="meta-label">ML Model</span>
                            <span className="mono text-xs">{latest.model_versions?.ml_model ?? "xgboost-v1"}</span>
                          </div>
                        </>
                      ) : (
                        <p className="empty-note">Submit a payment or trigger a scenario to inspect decisions.</p>
                      )}
                    </div>
                  </div>
                  <div className="reason-section">
                    <div className="reason-section-title">Top ML & Graph Risk Factors (SHAP)</div>
                    <ReasonCodeList
                      reasons={latest?.reason_codes ?? []}
                      counterfactuals={latest?.counterfactuals}
                      confidence={latest?.confidence_score}
                    />
                  </div>
                </div>
              </section>

              <section className="col">
                <AttackSimulator onRun={handleRunScenario} onReset={handleReset} runningScenario={runningScenario} />
              </section>
            </div>

            {/* Split-Screen Attacker vs Defender Sandbox */}
            <AttackerDefenderSplit />

            {/* AI vs AI Adaptive Evolutionary Battle Arena */}
            <AdaptiveAIBattle />

            {/* Technical Depth Power Row: Ensemble Disagreement & Latency Waterfall */}
            <div className="tech-depth-grid">
              <EnsembleBreakdown latest={latest} />
              <LatencyWaterfall latest={latest} />
            </div>

            {/* Chaos Resilience Control Panel */}
            <ChaosControl />
          </div>
        )}

        {activeTab === "graph" && <FraudRingGraph />}

        {activeTab === "cases" && <CaseManagement />}

        {activeTab === "policy" && (
          <div className="policy-tab-wrapper">
            <PolicyStudio />
            <RiskDecisionLedger />
            <FederatedDefenseMatrix />
            <ChaosControl />
          </div>
        )}

        {activeTab === "analytics" && (
          <div className="analytics-tab-wrapper">
            <ExecutiveDashboard />
            <PitchImpactCard metrics={metrics} />
            <GeoHeatmapAndShadow />
            <CostFrictionDial />
            <AnalyticsDashboard metrics={metrics} />
          </div>
        )}
      </main>

      {/* Interactive Step-Up Challenge Modal */}
      {stepUpTx && (
        <StepUpModal
          txId={stepUpTx.txId}
          amount={stepUpTx.amount}
          customerExplanation={latest?.customer_explanation}
          onSuccess={handleStepUpSuccess}
          onCancel={() => setStepUpTx(null)}
        />
      )}

      {/* PII Minimization Modal */}
      {showPiiModal && <PiiInspectorModal onClose={() => setShowPiiModal(false)} />}

      {/* Floating Pitch Speed-Keys (Presenter Toolbar) */}
      <PresenterHotkeys
        onTriggerPreset={(preset) => {
          if (preset === "normal") {
            handleSubmit({
              user_id: "USR-ALICE-99",
              merchant_id: "merchant-swiggy",
              amount: 850,
              device_fingerprint: "DEV-MACBOOK-01",
              ip_hash: "IP-BANGALORE-01",
              payment_method: "upi",
            });
          } else if (preset === "ato") {
            handleSubmit({
              user_id: "USR-ALICE-99",
              merchant_id: "merchant-tanishq",
              amount: 84500,
              device_fingerprint: "DEV-UNKNOWN-9X",
              ip_hash: "IP-VPN-MOSCOW-88",
              payment_method: "card",
            });
          } else if (preset === "bot") {
            handleSubmit({
              user_id: "USR-BOT-7721",
              merchant_id: "merchant-bookmyshow",
              amount: 140,
              device_fingerprint: "DEV-SHARED-RIG-01",
              ip_hash: "IP-DATACENTER-55",
              payment_method: "card",
            });
          } else if (preset === "ring") {
            handleRunScenario("fraud_ring", 4);
          }
        }}
        onToggleStream={() => setAutoSimActive((prev) => !prev)}
        onToggleTheme={() => {
          const current = document.documentElement.getAttribute("data-theme") || "light";
          const next = current === "light" ? "dark" : "light";
          document.documentElement.setAttribute("data-theme", next);
          localStorage.setItem("shield_theme", next);
        }}
      />

      <footer className="footer">
        <div className="footer-content">
          <span className="mono font-bold">Razorpay Shield AI</span>
          <span className="footer-sep">·</span>
          <span>Hybrid Ensemble Intelligence (XGBoost + Anomaly + Graph)</span>
          <span className="footer-sep">·</span>
          <span>&lt;15ms Latency Budget Guaranteed</span>
        </div>
      </footer>
    </div>
  );
}
