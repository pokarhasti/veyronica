import pytest
from unittest.mock import MagicMock
from app.graph.workflow_graph import create_replenishment_graph, get_graph_topology
from app.api.workflows import get_workflow_graph_topology


def test_langgraph_topology_structure():
    """Verify LangGraph topology includes all 4 cognitive nodes and correct engine name."""
    topo = get_graph_topology()
    assert topo["engine"] == "LangGraph"
    assert topo["version"] == "StateGraph"
    
    node_ids = [n["id"] for n in topo["nodes"]]
    assert node_ids == ["signal_node", "constraint_node", "draft_node", "routing_node"]
    
    edge_pairs = [(e["from"], e["to"]) for e in topo["edges"]]
    assert ("signal_node", "constraint_node") in edge_pairs
    assert ("constraint_node", "draft_node") in edge_pairs
    assert ("draft_node", "routing_node") in edge_pairs
    assert ("routing_node", "END") in edge_pairs


def test_create_replenishment_graph_compile():
    """Verify create_replenishment_graph instantiates and compiles with LangGraph."""
    mock_session = MagicMock()
    graph = create_replenishment_graph(mock_session)
    compiled = graph.compile()
    assert compiled is not None


@pytest.mark.asyncio
async def test_api_graph_topology_endpoint():
    """Verify GET /api/workflows/graph/topology returns correct graph schema."""
    data = await get_workflow_graph_topology()
    assert data["engine"] == "LangGraph"
    assert len(data["nodes"]) == 4
