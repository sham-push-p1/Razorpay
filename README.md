# AI Risk Manager — Phase 1 (Foundation)

Real-time adaptive fraud defense for digital payments, built against the
hackathon architecture doc. This is **Phase 1** of the 9-phase roadmap:
a working end-to-end payment path with a live console, ahead of the real
ML/graph/agent/federated-learning layers landing in later phases.

## What's actually working right now

- **`POST /risk/score`** — the full synchronous payment decision path:
  checkout → feature service (velocity, device/IP fan-out) → parallel risk
  intelligence (ML / anomaly / graph / rules) → risk fusion → policy engine
  (APPROVE / STEP-UP / BLOCK). Verified at **~15ms**, well under the 100ms
  latency budget.
- **`POST /simulate/attack`** — all 7 demo scenarios from the architecture
  doc (normal_user, credential_stuffing, card_testing, account_takeover,
  multi_account_fraud, fraud_ring, velocity_attack).
- **`GET /metrics`** — p50/p95/p99 latency, throughput, decision mix.
- **`POST /cases`, `PATCH /cases/{id}`, `POST /feedback`** — case and
  feedback plumbing, ready for the Phase 6 investigation agent to plug into.
- **React console** — checkout form, animated risk gauge, reason-code
  breakdown, attack simulator, live metrics bar, event ticker.

## What's intentionally stubbed for Phase 1

The architecture doc calls for XGBoost, an autoencoder, a graph/GNN engine,
Postgres, Redis, and Kafka. None of those are wired up yet — this phase
proves the *pipeline shape* end-to-end first, per the roadmap's own
"must ship the working core first" principle:

| Doc component | Phase 1 stand-in | Real thing lands in |
|---|---|---|
| XGBoost/LightGBM | Deterministic rule-based scorer with the same output shape | Phase 2 |
| Autoencoder | Reconstruction-error proxy (amount deviation + device novelty) | Phase 5 |
| Neo4j/GNN | In-memory fan-out counters (device/IP shared-account detection) | Phase 4 |
| PostgreSQL | SQLite via SQLAlchemy (same ORM models, one-line DSN swap) | anytime |
| Redis | In-process `HotStore` with the same get/set/counter shape | Phase 7 |
| Kafka/Redis Streams | Direct synchronous calls | Phase 7 |
| LLM Investigation Agent + MCP | `POST /cases` stores evidence refs and a placeholder report | Phase 6 |
| Federated Learning | Not started | Phase 8 |

Every stand-in matches the real component's function signature and output
shape (score 0–100 + reason codes), so swapping in the real model/service
later is a drop-in replacement, not a rewrite.

## Run it

### Backend

```bash
cd backend
pip install fastapi "uvicorn[standard]" sqlalchemy pydantic
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Console: http://localhost:5173 (dev) — the frontend expects the API at
`http://localhost:8000` (see `frontend/src/lib/api.ts`).

## Project layout

```
backend/
  app/
    main.py                 # FastAPI app, CORS, gateway middleware
    core/db.py               # SQLite session (Postgres stand-in)
    core/state.py             # In-process HotStore (Redis stand-in)
    models/models.py          # SQLAlchemy models (Transaction, Case, ...)
    models/schemas.py         # Pydantic request/response schemas
    services/feature_service.py   # Layer 3: real-time feature vector
    services/risk_models.py       # Layers 4-6: ML/anomaly/graph/rules
    services/risk_fusion.py       # Layer 7: weighted fusion
    services/policy_engine.py     # Layer 8: APPROVE/STEP-UP/BLOCK
    services/metrics_service.py   # Layer 12: latency percentiles, throughput
    routers/risk.py            # POST /risk/score, GET /risk/{tx_id}
    routers/cases.py           # Case management
    routers/feedback.py        # Analyst feedback loop
    routers/simulate.py        # Attack simulator scenarios
    routers/metrics.py         # GET /metrics

frontend/
  src/
    App.tsx                  # Live Risk Console layout
    components/               # RiskGauge, CheckoutForm, AttackSimulator, ...
    lib/api.ts                 # Typed API client
```

## Next steps (per the roadmap)

1. **Phase 2 — ML**: swap `ml_score()` in `risk_models.py` for a real trained
   XGBoost model with SHAP-based reason codes.
2. **Phase 4 — Graph**: replace the fan-out counters with a real Neo4j/NetworkX
   relationship graph and a fraud-ring visualization in the console.
3. **Phase 5 — DL**: swap `anomaly_score()` for a real autoencoder.
4. **Phase 6 — Agent + MCP**: build the investigation agent and expose the
   MCP tools listed in the doc (`get_transaction`, `find_related_accounts`,
   etc.) against the existing `/cases` endpoints.
5. **Phase 7 — Scale**: move from direct calls to Kafka/Redis Streams, add
   load testing, and point `core/db.py` at real Postgres and `core/state.py`
   at real Redis.
6. **Phase 8 — Federated**: simulate 3 merchant nodes with local training
   and FedAvg aggregation.
