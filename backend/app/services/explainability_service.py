"""
Dual-Tier Explainability & Customer-Facing Plain Language Translation Engine.

Maps technical ML & forensic codes to empathetic, user-friendly customer messages (e.g. for 2FA Step-Up)
while preserving rigorous mathematical SHAP attributions for internal fraud analysts.
"""
from typing import List, Dict, Any


CUSTOMER_FRIENDLY_MAPPINGS = {
    "ML_AMOUNT_ANOMALY": "This payment amount is higher than your usual transaction baseline.",
    "ML_VELOCITY_BURST": "Multiple checkout attempts were detected in a short time frame.",
    "ML_SUSTAINED_VELOCITY": "Unusual payment frequency detected on this account today.",
    "ML_NEW_DEVICE": "First time signing in or checking out from this hardware device.",
    "ML_DEVICE_FANOUT": "Unrecognized device signature — verifying to keep your wallet secure.",
    "ML_IP_FANOUT": "Checkout originating from a shared public network or VPN.",
    "ML_NEW_ACCOUNT": "New account verification policy applied.",
    "BEHAVIORAL_ANOMALY": "Transaction activity differs from your regular purchasing habits.",
    "DEVICE_FANOUT": "Device security check triggered for account protection.",
    "RULE_VELOCITY_HARD_STOP": "Maximum safety checkout limit reached for the current session.",
}


def generate_customer_explanation(reason_codes: List[Dict[str, Any]]) -> str:
    """Generate a friendly, empathetic message for legitimate customers receiving a Step-Up challenge."""
    if not reason_codes:
        return "Quick verification required to protect your payment."

    primary_code = reason_codes[0].get("code", "")
    friendly_msg = CUSTOMER_FRIENDLY_MAPPINGS.get(primary_code)

    if not friendly_msg:
        # Fallback to general message
        return "For your security, we noticed an unusual checkout signal. Please verify with a one-time passcode."

    return friendly_msg
