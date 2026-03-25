from fastapi import APIRouter

router = APIRouter()


@router.get("")
async def get_graph():
    # TODO: fetch nodes (insights) + edges (connections) from Supabase
    return {"nodes": [], "edges": []}
