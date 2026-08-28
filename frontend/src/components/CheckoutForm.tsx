import { useState } from "react";
import { buildDemoCheckout, type CheckoutPayload } from "../lib/api";

interface Props {
  onSubmit: (payload: CheckoutPayload) => void;
  loading: boolean;
}

export default function CheckoutForm({ onSubmit, loading }: Props) {
  const [payload, setPayload] = useState<CheckoutPayload>(buildDemoCheckout());
  const [method, setMethod] = useState<string>("card");

  function update<K extends keyof CheckoutPayload>(key: K, value: CheckoutPayload[K]) {
    setPayload((p) => ({ ...p, [key]: value }));
  }

  const applyMerchantProfile = (mId: string, defaultAmt: number) => {
    setPayload((p) => ({
      ...p,
      merchant_id: mId,
      amount: defaultAmt,
    }));
  };

  const applyPreset = (preset: "normal" | "ato" | "bot") => {
    if (preset === "normal") {
      setPayload({
        user_id: "USR-ALICE-99",
        merchant_id: "merchant-swiggy",
        amount: 850,
        device_fingerprint: "DEV-MACBOOK-01",
        ip_hash: "IP-BANGALORE-01",
        payment_method: "upi",
      });
      setMethod("upi");
    } else if (preset === "ato") {
      setPayload({
        user_id: "USR-ALICE-99",
        merchant_id: "merchant-tanishq",
        amount: 84500,
        device_fingerprint: "DEV-UNKNOWN-9X",
        ip_hash: "IP-VPN-MOSCOW-88",
        payment_method: "card",
      });
      setMethod("card");
    } else if (preset === "bot") {
      setPayload({
        user_id: "USR-BOT-7721",
        merchant_id: "merchant-bookmyshow",
        amount: 140,
        device_fingerprint: "DEV-SHARED-RIG-01",
        ip_hash: "IP-DATACENTER-55",
        payment_method: "card",
      });
      setMethod("card");
    }
  };

  return (
    <div className="panel panel-checkout">
      <div className="panel-header">
        <span className="eyebrow">01 — TRANSACTION INGESTION</span>
        <h3>Simulate Checkout</h3>
      </div>

      {/* Merchant Vertical Profile Switcher */}
      <div className="merchant-selector-box">
        <label className="merchant-label">Merchant Vertical & Risk Scope:</label>
        <div className="merchant-chips">
          <button
            type="button"
            className={`merchant-chip ${payload.merchant_id === "merchant-tanishq" ? "merchant-chip--active" : ""}`}
            onClick={() => applyMerchantProfile("merchant-tanishq", 85000)}
          >
            💎 Tanishq (Luxury Jewellery)
          </button>
          <button
            type="button"
            className={`merchant-chip ${payload.merchant_id === "merchant-swiggy" ? "merchant-chip--active" : ""}`}
            onClick={() => applyMerchantProfile("merchant-swiggy", 650)}
          >
            🛒 Swiggy (Instant Grocery)
          </button>
          <button
            type="button"
            className={`merchant-chip ${payload.merchant_id === "merchant-bookmyshow" ? "merchant-chip--active" : ""}`}
            onClick={() => applyMerchantProfile("merchant-bookmyshow", 1800)}
          >
            🎟️ BookMyShow (Flash Tickets)
          </button>
        </div>
      </div>

      {/* Persona Quick-Presets */}
      <div className="preset-row">
        <span className="preset-label">Test Persona:</span>
        <div className="preset-chips">
          <button
            type="button"
            className="preset-chip preset-chip--normal"
            onClick={() => applyPreset("normal")}
          >
            🟢 Alice (Legit)
          </button>
          <button
            type="button"
            className="preset-chip preset-chip--ato"
            onClick={() => applyPreset("ato")}
          >
            🔴 Alice (Stolen Account Takeover)
          </button>
          <button
            type="button"
            className="preset-chip preset-chip--bot"
            onClick={() => applyPreset("bot")}
          >
            🤖 Card-Testing Bot
          </button>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({ ...payload, payment_method: method });
        }}
        className="form-grid"
      >
        <label>
          <span>Amount (INR):</span>
          <div className="input-currency-wrapper">
            <span className="currency-symbol">₹</span>
            <input
              type="number"
              step="1"
              min="1"
              value={payload.amount}
              onChange={(e) => update("amount", Number(e.target.value))}
              required
              className="input-with-symbol mono"
            />
          </div>
        </label>

        <label>
          <span>Payment Instrument:</span>
          <div className="method-pill-group">
            <button
              type="button"
              className={`method-pill ${method === "card" ? "method-pill--active" : ""}`}
              onClick={() => {
                setMethod("card");
                update("payment_method", "card");
              }}
            >
              💳 Card
            </button>
            <button
              type="button"
              className={`method-pill ${method === "upi" ? "method-pill--active" : ""}`}
              onClick={() => {
                setMethod("upi");
                update("payment_method", "upi");
              }}
            >
              ⚡ UPI / QR
            </button>
            <button
              type="button"
              className={`method-pill ${method === "netbanking" ? "method-pill--active" : ""}`}
              onClick={() => {
                setMethod("netbanking");
                update("payment_method", "netbanking");
              }}
            >
              🏦 NetBanking
            </button>
          </div>
        </label>

        <label>
          <span>User ID:</span>
          <input
            type="text"
            className="mono"
            value={payload.user_id}
            onChange={(e) => update("user_id", e.target.value)}
            required
          />
        </label>

        <label>
          <span>Device Fingerprint Hash:</span>
          <input
            type="text"
            className="mono"
            value={payload.device_fingerprint}
            onChange={(e) => update("device_fingerprint", e.target.value)}
            required
          />
        </label>

        <label>
          <span>IP Hash:</span>
          <input
            type="text"
            className="mono"
            value={payload.ip_hash}
            onChange={(e) => update("ip_hash", e.target.value)}
            required
          />
        </label>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Scoring in <15ms..." : "⚡ Screen Transaction"}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setPayload(buildDemoCheckout())}
          >
            🎲 Randomize
          </button>
        </div>
      </form>
    </div>
  );
}
