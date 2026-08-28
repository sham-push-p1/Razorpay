import { useState } from "react";

interface StepUpModalProps {
  txId: string;
  amount: number;
  customerExplanation?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function StepUpModal({
  txId,
  amount,
  customerExplanation,
  onSuccess,
  onCancel,
}: StepUpModalProps) {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOtpChange = (index: number, val: string) => {
    if (val.length > 1) val = val.slice(-1);
    const next = [...otp];
    next[index] = val;
    setOtp(next);
    setError(null);

    // Auto-focus next input
    if (val && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleVerify = () => {
    const code = otp.join("");
    if (code.length < 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      onSuccess();
    }, 1200);
  };

  const handleQuickFill = () => {
    setOtp(["7", "4", "2", "9", "0", "1"]);
    setError(null);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-badge-row">
          <span className="badge badge-stepup">🛡️ RAZORPAY SECURE STEP-UP</span>
        </div>
        <h3>Verify Your Transaction</h3>
        <p className="modal-sub">
          Authorizing payment <code>{txId}</code> for <strong>₹{amount.toLocaleString()}</strong>.
        </p>

        {/* Dual-Tier Empathy Callout */}
        <div className="customer-explanation-box">
          <span className="info-icon">ℹ</span>
          <div>
            <strong>Why am I seeing this?</strong>
            <p>{customerExplanation || "For your security, we noticed an unfamiliar checkout signal. A quick verification will confirm your purchase."}</p>
          </div>
        </div>

        <div className="otp-container">
          <label className="otp-label">Enter 6-Digit SMS / Authenticator Code</label>
          <div className="otp-inputs">
            {otp.map((digit, idx) => (
              <input
                key={idx}
                id={`otp-${idx}`}
                type="text"
                maxLength={1}
                value={digit}
                className="otp-box"
                onChange={(e) => handleOtpChange(idx, e.target.value)}
              />
            ))}
          </div>
          {error && <p className="otp-error">{error}</p>}
        </div>

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={handleQuickFill}>
            ⚡ Demo Auto-Fill (742901)
          </button>
          <div className="action-row">
            <button className="btn btn-ghost" onClick={onCancel}>
              Cancel Payment
            </button>
            <button className="btn btn-primary" onClick={handleVerify} disabled={isVerifying}>
              {isVerifying ? "Verifying Token..." : "Authorize Payment"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
