export const API_BASE = "http://localhost:8000";

export interface ReasonCode {
  code: string;
  description: string;
  contribution: number;
}

export interface RiskScoreResponse {
  tx_id: string;
  risk_score: number;
  decision: "APPROVE" | "STEP-UP" | "BLOCK";
  reason_codes: ReasonCode[];
  model_versions: Record<string, string>;
  latency_ms: number;
  policy_version: string;
  correlation_id: string;
  ensemble_scores?: {
    ml: number;
    anomaly: number;
    graph: number;
    rules: number;
  };
  weights_used?: Record<string, number>;
  stage_latencies?: Record<string, number>;
  is_degraded?: boolean;
  disagreement_index?: number;
  customer_explanation?: string;
  expected_exposure_inr?: number;
  loss_matrix?: {
    cost_approve?: number;
    cost_step_up?: number;
    cost_block?: number;
    min_expected_loss?: number;
  };
  model_security_status?: string;
  confidence_score?: number;
  counterfactuals?: any;
  sequence_fingerprint?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  details: string;
}

export interface BenchmarkResult {
  evaluated_at: string;
  sample_count: number;
  confusion_matrix: {
    true_positives: number;
    false_positives: number;
    true_negatives: number;
    false_negatives: number;
  };
  metrics: {
    precision: number;
    recall: number;
    f1_score: number;
    accuracy: number;
    roc_auc: number;
  };
  active_thresholds: {
    approve: number;
    step_up: number;
  };
}

export interface MetricsSnapshot {
  requests_per_second: number;
  total_requests: number;
  avg_latency_ms: number;
  p50_latency_ms: number;
  p95_latency_ms: number;
  p99_latency_ms: number;
  decisions: Record<string, number>;
  approve_rate: number;
  step_up_rate: number;
  block_rate: number;
  errors: number;
}

export type Scenario =
  | "normal_user"
  | "credential_stuffing"
  | "card_testing"
  | "account_takeover"
  | "multi_account_fraud"
  | "fraud_ring"
  | "velocity_attack"
  | "impossible_travel"
  | "card_testing_ladder";

export interface CheckoutPayload {
  user_id: string;
  merchant_id: string;
  amount: number;
  device_fingerprint: string;
  ip_hash: string;
  payment_method?: string;
}

export interface GraphNode {
  id: string;
  label: string;
  type: "user" | "device" | "ip" | "transaction" | "unknown";
  degree: number;
  score?: number;
  decision?: string;
  amount?: number;
}

export interface GraphLink {
  source: string;
  target: string;
  relationship: string;
}

export interface FraudRing {
  ring_id: string;
  user_count: number;
  device_count: number;
  ip_count: number;
  transaction_count: number;
  avg_risk_score: number;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  members: {
    users: string[];
    devices: string[];
    ips: string[];
  };
}

export interface GraphDataResponse {
  nodes: GraphNode[];
  links: GraphLink[];
  stats: {
    total_nodes: number;
    total_edges: number;
    fraud_rings: number;
  };
  fraud_rings?: FraudRing[];
}

export interface InvestigationDossier {
  summary: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  confidence: number;
  evidence_count: number;
  evidence_items: string[];
  recommended_actions: string[];
  agent_version: string;
}

export interface CaseItem {
  case_id: string;
  tx_id: string;
  status: "open" | "investigating" | "resolved";
  analyst_label: string | null;
  evidence_refs: string[];
  investigation_report: InvestigationDossier | null;
  amount?: number;
  user_id?: string;
  device_id?: string;
  created_at?: string;
}

export interface PolicyConfig {
  version: string;
  approve_threshold: number;
  step_up_threshold: number;
  blacklisted_users_count: number;
  blacklisted_devices_count: number;
  blacklisted_ips_count: number;
  auto_step_up_new_device: boolean;
  kill_switch_active?: boolean;
  audit_log?: AuditLogEntry[];
}

export interface DriftStatus {
  is_drifted: boolean;
  psi_score: number;
  status: "DRIFT_DETECTED" | "NOMINAL_STABLE";
  last_retrained_at: string;
  last_drift_detected_at: string | null;
  drift_type: string | null;
}

export interface ChaosStatus {
  graph_offline: boolean;
  ml_offline: boolean;
  simulated_latency_ms: number;
  is_active: boolean;
}

function randId(prefix: string, n = 6) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let s = "";
  for (let i = 0; i < n; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `${prefix}-${s}`;
}

export function buildDemoCheckout(overrides: Partial<CheckoutPayload> = {}): CheckoutPayload {
  return {
    user_id: randId("USR"),
    merchant_id: "merchant-demo",
    amount: Math.round(Math.random() * 2500 + 200),
    device_fingerprint: randId("DEV"),
    ip_hash: randId("IP"),
    payment_method: "card",
    ...overrides,
  };
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  return res.json();
}

export const api = {
  scoreTransaction: (payload: CheckoutPayload) =>
    request<RiskScoreResponse>("/risk/score", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  simulateAttack: (scenario: Scenario, count: number) =>
    request<{ scenario: string; count: number; results: RiskScoreResponse[] }>(
      "/simulate/attack",
      {
        method: "POST",
        body: JSON.stringify({ scenario, count }),
      }
    ),

  resetSimulation: () => request<{ status: string }>("/simulate/reset", { method: "POST" }),

  getMetrics: () => request<MetricsSnapshot>("/metrics"),

  // Graph
  getGraphData: (limit = 80) => request<GraphDataResponse>(`/graph/data?limit=${limit}`),
  resetGraph: () => request<{ status: string }>("/graph/reset", { method: "POST" }),

  // Cases & Investigation Agent
  listCases: (status = "all") => request<{ cases: CaseItem[] }>(`/cases?status=${status}`),
  getCase: (caseId: string) => request<CaseItem & { transaction: any }>(`/cases/${caseId}`),
  updateCase: (caseId: string, status: string, analyst_label?: string) =>
    request<{ case_id: string; status: string; analyst_label?: string }>(`/cases/${caseId}`, {
      method: "PATCH",
      body: JSON.stringify({ status, analyst_label }),
    }),
  queryCaseCopilot: (caseId: string, query: string) =>
    request<{ reply: string; suggested_action?: string }>(`/cases/${caseId}/copilot`, {
      method: "POST",
      body: JSON.stringify({ query }),
    }),

  // Policy & Responsible AI Ops
  getPolicyConfig: () => request<PolicyConfig>("/policy/config"),
  updatePolicyConfig: (payload: Partial<PolicyConfig>) =>
    request<PolicyConfig>("/policy/config", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  toggleKillSwitch: (active: boolean, actor = "SecOps Lead", reason = "False-Positive Incident Mitigation") =>
    request<PolicyConfig>("/policy/kill-switch", {
      method: "POST",
      body: JSON.stringify({ active, actor, reason }),
    }),
  addBlacklist: (entity_type: string, entity_value: string) =>
    request<{ status: string }>("/policy/blacklist", {
      method: "POST",
      body: JSON.stringify({ entity_type, entity_value }),
    }),
  getBenchmark: (samples = 200) => request<BenchmarkResult>(`/policy/benchmark?samples=${samples}`),

  // Chaos & Resilience
  getChaosStatus: () => request<ChaosStatus>("/chaos/status"),
  setChaosState: (payload: Partial<ChaosStatus>) =>
    request<ChaosStatus>("/chaos/toggle", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  resetChaos: () => request<ChaosStatus>("/chaos/reset", { method: "POST" }),

  // Model Drift & Continuous Retraining
  getDriftStatus: () => request<DriftStatus>("/drift/status"),
  injectDrift: (drift_type = "adversarial_shift") =>
    request<DriftStatus>("/drift/inject", {
      method: "POST",
      body: JSON.stringify({ drift_type }),
    }),
  retrainModel: () => request<DriftStatus>("/drift/retrain", { method: "POST" }),

  // Innovation & Tier S/A Capabilities
  getAdversarialRound: (roundNum = 1) =>
    request<any>(`/innovation/adversarial/round/${roundNum}`),
  getCityFraudHeatmap: () => request<any>("/innovation/geo/heatmap"),
  getShadowModelComparison: () => request<any>("/innovation/models/shadow"),
  getExecutiveSummary: () => request<any>("/executive/summary"),
  getDecisionLedger: (limit = 50) =>
    request<{ ledger: any[] }>(`/risk/ledger?limit=${limit}`),
  verifyDecisionLedger: () =>
    request<{ status: string; is_valid: boolean; total_blocks: number; latest_hash?: string; compliance_standard?: string }>("/risk/ledger/verify"),
};

