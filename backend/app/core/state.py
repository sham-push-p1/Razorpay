"""
Lightweight in-process store standing in for Redis in this sandbox.

Provides just what the Real-Time Feature Service needs: fast counters with a
sliding time window (velocity features) and simple key/value state (device &
IP reputation caches). Swappable for real Redis later — same interface
shape (incr_with_window, get, set) so the feature service doesn't need to
change when you point it at a real Redis client.
"""
import time
import threading
from collections import defaultdict, deque
from typing import Deque, Dict, Tuple


class HotStore:
    def __init__(self):
        self._lock = threading.Lock()
        # key -> deque of timestamps, for velocity counting
        self._events: Dict[str, Deque[float]] = defaultdict(deque)
        # simple kv store for cached reputation / graph signals
        self._kv: Dict[str, Tuple[float, dict]] = {}

    def record_event(self, key: str, window_seconds: int = 300) -> int:
        """Record an event (e.g. a transaction attempt) under key and return
        the count of events within the trailing window_seconds."""
        now = time.time()
        with self._lock:
            dq = self._events[key]
            dq.append(now)
            cutoff = now - window_seconds
            while dq and dq[0] < cutoff:
                dq.popleft()
            return len(dq)

    def count(self, key: str, window_seconds: int = 300) -> int:
        now = time.time()
        with self._lock:
            dq = self._events.get(key, deque())
            cutoff = now - window_seconds
            return sum(1 for t in dq if t >= cutoff)

    def set_kv(self, key: str, value: dict, ttl_seconds: int = 3600):
        with self._lock:
            self._kv[key] = (time.time() + ttl_seconds, value)

    def get_kv(self, key: str) -> dict | None:
        with self._lock:
            item = self._kv.get(key)
            if not item:
                return None
            expires_at, value = item
            if expires_at < time.time():
                del self._kv[key]
                return None
            return value

    def add_to_set(self, key: str, member: str, ttl_seconds: int = 86400) -> int:
        """Add member to a named set (e.g. accounts seen on a device) and
        return the set's current size. Used for fan-out detection."""
        now = time.time()
        with self._lock:
            item = self._kv.get(key)
            if item is None or item[0] < now:
                members: set = set()
            else:
                members = item[1].get("members", set())
            members.add(member)
            self._kv[key] = (now + ttl_seconds, {"members": members})
            return len(members)

    def reset(self):
        with self._lock:
            self._events.clear()
            self._kv.clear()


hot_store = HotStore()
