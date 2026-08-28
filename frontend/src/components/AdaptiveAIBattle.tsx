import { useState, useEffect } from "react";
import { api } from "../lib/api";

export default function AdaptiveAIBattle() {
  const [currentRound, setCurrentRound] = useState(1);
  const [battleData, setBattleData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchRound = async (r: number) => {
    setLoading(true);
    try {
      const data = await api.getAdversarialRound(r);
      setBattleData(data);
      setCurrentRound(r);
    } catch (e) {
      console.error("Failed to run battle round", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRound(1);
  }, []);

  const nextRound = () => {
    const next = currentRound < 5 ? currentRound + 1 : 1;
    fetchRound(next);
  };

  return (
    <div className="panel ai-battle-panel">
      <div className="panel-header">
        <div className="flex-between">
          <div>
            <span className="eyebrow">AUTONOMOUS ADVERSARIAL AI ARENA</span>
            <h3>AI vs AI Evolutionary Attack & Defense Game</h3>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={nextRound}
            disabled={loading}
          >
            {loading ? "Evolving Attack..." : "⚡ Execute Next Evolutionary Attack"}
          </button>
        </div>
      </div>

      <p className="battle-desc">
        Demonstrating self-evolving cybersecurity: An autonomous Attacker AI mutates its fraud vectors across 5 generations while Razorpay Shield AI continuously counters each exploit in real time.
      </p>

      {/* 5-Generation Evolutionary Stepper */}
      <div className="battle-stepper">
        {[1, 2, 3, 4, 5].map((r) => (
          <button
            key={r}
            type="button"
            className={`stepper-btn ${r === currentRound ? "stepper-btn--active" : r < currentRound ? "stepper-btn--passed" : ""}`}
            onClick={() => fetchRound(r)}
          >
            <span className="step-num">GEN-{r}</span>
            <span className="step-label">
              {r === 1 ? "Rate Blast" : r === 2 ? "Low & Slow" : r === 3 ? "Syndicate" : r === 4 ? "Micro-Proxy" : "Geo-Travel"}
            </span>
          </button>
        ))}
      </div>

      {/* Split Duel Arena */}
      {battleData && (
        <div className="duel-arena-grid">
          {/* Attacker AI Box */}
          <div className="duel-box duel-box--attacker">
            <div className="duel-box-header">
              <div className="duel-agent-title">
                <span className="agent-badge agent-badge--red">🤖 ADVERSARIAL ATTACKER AI</span>
                <span className="agent-gen">{battleData.attacker_generation}</span>
              </div>
              <span className="badge badge-block">ATTACK VECTOR</span>
            </div>

            <p className="duel-narrative">{battleData.attacker_strategy}</p>

            <div className="duel-specs">
              <div className="spec-item">
                <span className="spec-label">Target Amount:</span>
                <span className="spec-val mono">₹{battleData.payload_mutations.amount.toLocaleString()}</span>
              </div>
              <div className="spec-item">
                <span className="spec-label">Velocity (TPS):</span>
                <span className="spec-val mono">{battleData.payload_mutations.velocity_tps}</span>
              </div>
              <div className="spec-item">
                <span className="spec-label">IP Rotation Pool:</span>
                <span className="spec-val mono">{battleData.payload_mutations.ip_rotation} Nodes</span>
              </div>
            </div>

            <div className="duel-learning-callout duel-learning-callout--attacker">
              <span className="learning-icon">💡</span>
              <div>
                <strong>Attacker AI Adaptation:</strong> {battleData.attacker_learning}
              </div>
            </div>
          </div>

          {/* VS Divider */}
          <div className="duel-vs-badge">
            <span>VS</span>
          </div>

          {/* Shield AI Defender Box */}
          <div className="duel-box duel-box--defender">
            <div className="duel-box-header">
              <div className="duel-agent-title">
                <span className="agent-badge agent-badge--blue">🛡️ RAZORPAY SHIELD AI</span>
                <span className="agent-gen">{battleData.defense_layer_triggered}</span>
              </div>
              <span className={`badge ${battleData.decision === "BLOCK" ? "badge-block" : "badge-pass"}`}>
                {battleData.decision === "BLOCK" ? "🚫 AUTONOMOUS BLOCK" : "🛡️ 2FA STEP-UP"}
              </span>
            </div>

            <p className="duel-narrative">{battleData.shield_action}</p>

            <div className="duel-specs">
              <div className="spec-item">
                <span className="spec-label">Risk Evaluated:</span>
                <span className="spec-val mono font-bold text-red">{battleData.risk_score} / 100</span>
              </div>
              <div className="spec-item">
                <span className="spec-label">Decision SLA:</span>
                <span className="spec-val mono text-green">&lt; 14.2ms</span>
              </div>
              <div className="spec-item">
                <span className="spec-label">Evasion Neutralized:</span>
                <span className="spec-val mono font-bold text-green">✓ 100% BLOCKED</span>
              </div>
            </div>

            <div className="duel-learning-callout duel-learning-callout--defender">
              <span className="learning-icon">✨</span>
              <div>
                <strong>Shield AI Guarantee:</strong> Fraud evolves. Shield AI evolves faster. Threat hashes federated across all ecosystem merchants in &lt;5ms.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
