import { useState, useEffect } from "react";

interface Props {
  onTriggerPreset: (preset: "normal" | "ato" | "bot" | "ring") => void;
  onToggleStream: () => void;
  onToggleTheme: () => void;
}

export default function PresenterHotkeys({
  onTriggerPreset,
  onToggleStream,
  onToggleTheme,
}: Props) {
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore key events when user is typing in inputs
      if (["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.key === "1") {
        onTriggerPreset("normal");
      } else if (e.key === "2") {
        onTriggerPreset("ato");
      } else if (e.key === "3") {
        onTriggerPreset("bot");
      } else if (e.key === "4") {
        onTriggerPreset("ring");
      } else if (e.key.toLowerCase() === "s") {
        onToggleStream();
      } else if (e.key.toLowerCase() === "d") {
        onToggleTheme();
      } else if (e.key === "?") {
        setShowHelp((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onTriggerPreset, onToggleStream, onToggleTheme]);

  return (
    <>
      <div className="presenter-hotkeys-pill" onClick={() => setShowHelp(true)}>
        <span className="hotkey-icon">⌨️</span>
        <span className="hotkey-text">Pitch Speed-Keys (Press <strong>?</strong>)</span>
      </div>

      {showHelp && (
        <div className="modal-backdrop" onClick={() => setShowHelp(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-badge-row">
              <span className="badge badge-type">⚡ DEMO PRESENTER SHORTCUTS</span>
            </div>

            <h3>Presenter Quick Speed-Keys</h3>
            <p className="modal-sub">
              Trigger scenarios and toggle modes instantly during your pitch without touching the mouse:
            </p>

            <div className="hotkeys-grid">
              <div className="hotkey-row">
                <kbd className="hotkey-key">1</kbd>
                <span className="hotkey-label">Run Genuine User Checkout (Approve)</span>
              </div>
              <div className="hotkey-row">
                <kbd className="hotkey-key">2</kbd>
                <span className="hotkey-label">Trigger Account Takeover (Step-Up 2FA)</span>
              </div>
              <div className="hotkey-row">
                <kbd className="hotkey-key">3</kbd>
                <span className="hotkey-label">Trigger Card-Testing Bot Micro-Charge (Block)</span>
              </div>
              <div className="hotkey-row">
                <kbd className="hotkey-key">4</kbd>
                <span className="hotkey-label">Trigger Multi-Account Syndicate Ring Attack</span>
              </div>
              <div className="hotkey-row">
                <kbd className="hotkey-key">S</kbd>
                <span className="hotkey-label">Toggle Live Auto-Traffic Stream (On/Off)</span>
              </div>
              <div className="hotkey-row">
                <kbd className="hotkey-key">D</kbd>
                <span className="hotkey-label">Toggle Dark / Light Mode</span>
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn btn-primary" onClick={() => setShowHelp(false)}>
                ✓ Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
