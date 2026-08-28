from fastapi import APIRouter
from app.services.graph_service import graph_service

router = APIRouter(prefix="/graph", tags=["graph"])


@router.get("/data")
def get_graph_data(limit: int = 80):
    """Fetch nodes, links, and detected fraud rings for real-time visualization."""
    return graph_service.get_visualization_graph(limit_nodes=limit)


@router.get("/fraud-rings")
def get_fraud_rings():
    """List all detected multi-account fraud rings."""
    return {"rings": graph_service.detect_fraud_rings()}


@router.get("/entity/{entity_id}")
def get_entity_details(entity_id: str):
    """Get connected entity neighborhood and degree."""
    return graph_service.get_entity(entity_id)


@router.get("/ring/{tx_id}")
def get_ring_for_transaction(tx_id: str):
    """Get the fraud ring containing this transaction."""
    return graph_service.get_ring_for_tx(tx_id)


@router.post("/reset")
def reset_graph():
    """Reset graph state."""
    graph_service.reset()
    return {"status": "graph_cleared"}
