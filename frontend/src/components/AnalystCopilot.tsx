import { useState } from "react";
import { api, type CaseItem } from "../lib/api";

interface AnalystCopilotProps {
  currentCase: CaseItem | null;
  onActionTriggered?: (action: string) => void;
}

interface Message {
  sender: "user" | "agent";
  text: string;
  action?: string;
}

export default function AnalystCopilot({ currentCase, onActionTriggered }: AnalystCopilotProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "agent",
      text: currentCase
        ? `Hello Analyst! I am your AI Investigation Copilot. I have analyzed Case **${currentCase.case_id}** (Transaction: \`${currentCase.tx_id}\`). Ask me about contributing risk factors, connected device clusters, or recommended actions.`
        : "Hello Analyst! Select a case from the queue to start an interactive investigation.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async (customQuery?: string) => {
    const q = customQuery || input;
    if (!q.trim() || !currentCase) return;

    setMessages((prev) => [...prev, { sender: "user", text: q }]);
    if (!customQuery) setInput("");
    setLoading(true);

    try {
      const res = await api.queryCaseCopilot(currentCase.case_id, q);
      setMessages((prev) => [
        ...prev,
        {
          sender: "agent",
          text: res.reply,
          action: res.suggested_action,
        },
      ]);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        { sender: "agent", text: `Error consulting investigation agent: ${e.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    "Why was this transaction blocked?",
    "Show device & IP cluster history",
    "What action should I take?",
  ];

  return (
    <div className="copilot-drawer">
      <div className="copilot-header">
        <div className="copilot-title">
          <span className="copilot-badge">AI COPILOT</span>
          <h4>Forensic Agent Assistant</h4>
        </div>
        <span className="mono copilot-model-tag">Gemini-Analyst-v1</span>
      </div>

      <div className="copilot-chat-feed">
        {messages.map((m, idx) => (
          <div key={idx} className={`copilot-bubble copilot-bubble--${m.sender}`}>
            <div className="bubble-sender">{m.sender === "agent" ? "🤖 AI Investigator" : "👤 Analyst"}</div>
            <div className="bubble-body">{m.text}</div>
            {m.action && onActionTriggered && (
              <div className="bubble-action-box">
                <span className="action-tag">Suggested Tool Call:</span>
                <button
                  className="btn btn-action-pill"
                  onClick={() => onActionTriggered(m.action!)}
                >
                  ⚡ Execute: {m.action.replace("_", " ")}
                </button>
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="copilot-bubble copilot-bubble--agent">
            <div className="bubble-body typing-indicator">Thinking & analyzing graph topology...</div>
          </div>
        )}
      </div>

      <div className="copilot-quick-prompts">
        {quickPrompts.map((p, i) => (
          <button
            key={i}
            className="quick-prompt-btn"
            onClick={() => handleSend(p)}
            disabled={!currentCase || loading}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="copilot-input-bar">
        <input
          type="text"
          placeholder={currentCase ? "Ask investigator about this case..." : "Select a case first..."}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          disabled={!currentCase || loading}
        />
        <button
          className="btn btn-primary"
          onClick={() => handleSend()}
          disabled={!currentCase || !input.trim() || loading}
        >
          Send
        </button>
      </div>
    </div>
  );
}
