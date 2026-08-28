import time
import uuid
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.db import Base, engine
from app.routers import risk, cases, feedback, metrics, simulate, graph, policy, chaos, drift, innovation, executive
from app.services.metrics_service import metrics as metrics_collector

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI Risk Manager - Risk API",
    description="Real-Time Adaptive Fraud Defense for Digital Payments",
    version="2.0.0-full",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # demo only - lock this down for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- simple in-process rate limiter (per-IP token bucket) ---
_RATE_LIMIT_PER_MIN = 600
_buckets: dict[str, list[float]] = {}


@app.middleware("http")
async def gateway_middleware(request: Request, call_next):
    """API Gateway concerns: correlation ID + basic rate limiting."""
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()
    bucket = _buckets.setdefault(client_ip, [])
    bucket[:] = [t for t in bucket if now - t < 60]
    if len(bucket) >= _RATE_LIMIT_PER_MIN:
        metrics_collector.record_error()
        return JSONResponse(status_code=429, content={"detail": "Rate limit exceeded"})
    bucket.append(now)

    correlation_id = request.headers.get("X-Correlation-ID", str(uuid.uuid4()))
    response = await call_next(request)
    response.headers["X-Correlation-ID"] = correlation_id
    return response


app.include_router(risk.router)
app.include_router(cases.router)
app.include_router(feedback.router)
app.include_router(metrics.router)
app.include_router(simulate.router)
app.include_router(graph.router)
app.include_router(policy.router)
app.include_router(chaos.router)
app.include_router(drift.router)
app.include_router(innovation.router)
app.include_router(executive.router)


@app.get("/")
def root():
    return {
        "service": "AI Risk Manager",
        "status": "ok",
        "version": "2.0.0-full",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {"status": "healthy"}
