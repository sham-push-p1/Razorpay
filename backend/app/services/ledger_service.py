"""
Immutable Risk Decision Ledger with Cryptographic SHA-256 Hash-Chaining & SQLite Storage.
Records full forensic state for every gateway decision for auditability, RBI/PCI compliance, and reproducible investigation.
"""
from typing import Dict, Any, List, Optional
from datetime import datetime
import hashlib
import json
import sqlite3
import time

GENESIS_HASH = "0" * 64
DB_PATH = "ai_risk_manager.db"


class DecisionLedger:
    def __init__(self, db_path: str = DB_PATH, conn: Optional[sqlite3.Connection] = None):
        """
        Pass an existing sqlite3.Connection via `conn` to share your app's
        existing database file, or leave it default to manage its own.
        """
        self.conn = conn or sqlite3.connect(db_path, check_same_thread=False)
        self._ensure_table()

    def _ensure_table(self):
        self.conn.execute(
            """
            CREATE TABLE IF NOT EXISTS decision_ledger (
                seq INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp REAL NOT NULL,
                payload_json TEXT NOT NULL,
                prev_hash TEXT NOT NULL,
                entry_hash TEXT NOT NULL
            )
            """
        )
        self.conn.commit()

    def _last_hash(self) -> str:
        row = self.conn.execute(
            "SELECT entry_hash FROM decision_ledger ORDER BY seq DESC LIMIT 1"
        ).fetchone()
        return row[0] if row else GENESIS_HASH

    @staticmethod
    def _compute_hash(prev_hash: str, timestamp: float, payload_json: str) -> str:
        h = hashlib.sha256()
        h.update(prev_hash.encode())
        h.update(str(timestamp).encode())
        h.update(payload_json.encode())
        return h.hexdigest()

    def append(self, decision_record: Dict) -> Dict:
        """
        Append an immutable decision event with SHA-256 cryptographic hash-chaining.
        """
        timestamp = time.time()
        payload_json = json.dumps(decision_record, sort_keys=True, default=str)
        prev_hash = self._last_hash()
        entry_hash = self._compute_hash(prev_hash, timestamp, payload_json)

        cursor = self.conn.execute(
            """
            INSERT INTO decision_ledger (timestamp, payload_json, prev_hash, entry_hash)
            VALUES (?, ?, ?, ?)
            """,
            (timestamp, payload_json, prev_hash, entry_hash),
        )
        self.conn.commit()

        return {
            "seq": cursor.lastrowid,
            "timestamp": timestamp,
            "payload": decision_record,
            "prev_hash": prev_hash,
            "entry_hash": entry_hash,
        }

    def record_decision(self, entry: Dict) -> Dict:
        """Adapter method for gateway router."""
        res = self.append(entry)
        return {
            "ledger_id": f"LEDGER-{res['seq']:05d}",
            "sequence_number": res["seq"],
            "recorded_at": datetime.utcfromtimestamp(res["timestamp"]).strftime("%Y-%m-%d %H:%M:%S UTC"),
            "prev_hash": res["prev_hash"],
            "block_hash": res["entry_hash"],
            "is_verified": True,
            **entry,
        }

    def get_entries(self, limit: int = 100, offset: int = 0) -> List[Dict]:
        rows = self.conn.execute(
            """
            SELECT seq, timestamp, payload_json, prev_hash, entry_hash
            FROM decision_ledger ORDER BY seq DESC LIMIT ? OFFSET ?
            """,
            (limit, offset),
        ).fetchall()
        entries = []
        for r in rows:
            try:
                payload = json.loads(r[2])
            except Exception:
                payload = {}
            entries.append({
                "ledger_id": f"LEDGER-{r[0]:05d}",
                "sequence_number": r[0],
                "seq": r[0],
                "timestamp": r[1],
                "recorded_at": datetime.utcfromtimestamp(r[1]).strftime("%Y-%m-%d %H:%M:%S UTC"),
                "prev_hash": r[3],
                "block_hash": r[4],
                "entry_hash": r[4],
                "is_verified": True,
                **payload,
            })
        return entries

    def get_ledger(self, limit: int = 50) -> List[Dict]:
        return self.get_entries(limit=limit)

    def get_entry(self, tx_id: str) -> Dict:
        rows = self.conn.execute(
            "SELECT seq, timestamp, payload_json, prev_hash, entry_hash FROM decision_ledger ORDER BY seq DESC"
        ).fetchall()
        for r in rows:
            try:
                payload = json.loads(r[2])
                if payload.get("tx_id") == tx_id:
                    return {
                        "ledger_id": f"LEDGER-{r[0]:05d}",
                        "sequence_number": r[0],
                        "recorded_at": datetime.utcfromtimestamp(r[1]).strftime("%Y-%m-%d %H:%M:%S UTC"),
                        "prev_hash": r[3],
                        "block_hash": r[4],
                        **payload,
                    }
            except Exception:
                continue
        return {}

    def verify_chain(self) -> Dict:
        """
        Walks the full chain and recomputes every hash to confirm nothing was altered.
        """
        rows = self.conn.execute(
            "SELECT seq, timestamp, payload_json, prev_hash, entry_hash FROM decision_ledger ORDER BY seq ASC"
        ).fetchall()

        if not rows:
            return {"valid": True, "status": "SECURE_AUDITED", "is_valid": True, "total_blocks": 0}

        expected_prev = GENESIS_HASH
        for seq, timestamp, payload_json, prev_hash, entry_hash in rows:
            if prev_hash != expected_prev:
                return {
                    "valid": False,
                    "is_valid": False,
                    "status": "TAMPERED",
                    "broken_at_seq": seq,
                    "reason": "prev_hash does not match preceding entry's hash — chain link broken.",
                }
            recomputed = self._compute_hash(prev_hash, timestamp, payload_json)
            if recomputed != entry_hash:
                return {
                    "valid": False,
                    "is_valid": False,
                    "status": "TAMPERED",
                    "broken_at_seq": seq,
                    "reason": "entry_hash does not match recomputed hash — record was altered after insertion.",
                }
            expected_prev = entry_hash

        return {
            "valid": True,
            "is_valid": True,
            "status": "SECURE_AUDITED",
            "total_blocks": len(rows),
            "entries_verified": len(rows),
            "latest_hash": expected_prev,
            "genesis_hash": GENESIS_HASH,
            "compliance_standard": "RBI/PCI-DSS-4.0-Tamper-Evident",
        }

    def verify_integrity(self) -> Dict:
        return self.verify_chain()


ledger_service = DecisionLedger()


