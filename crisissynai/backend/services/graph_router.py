import networkx as nx

# ── Hardcoded building graph for prototype ──────────────────────
BUILDING_GRAPH = {
    "nodes": [
        {"id": "room101", "floor": 1, "zone": "east"},
        {"id": "room102", "floor": 1, "zone": "east"},
        {"id": "room201", "floor": 2, "zone": "east"},
        {"id": "room202", "floor": 2, "zone": "east"},
        {"id": "kitchen", "floor": 1, "zone": "kitchen"},
        {"id": "lobby",   "floor": 1, "zone": "lobby"},
        {"id": "stair_a", "floor": 1, "zone": "stair"},
        {"id": "stair_b", "floor": 1, "zone": "stair"},
        {"id": "EXIT_NORTH", "floor": 1, "zone": "exit"},
        {"id": "EXIT_SOUTH", "floor": 1, "zone": "exit"},
    ],
    "edges": [
        {"from": "room101", "to": "lobby",      "weight": 1, "zone": "lobby"},
        {"from": "room102", "to": "lobby",      "weight": 1, "zone": "lobby"},
        {"from": "room201", "to": "stair_a",    "weight": 1, "zone": "stair"},
        {"from": "room202", "to": "stair_b",    "weight": 1, "zone": "stair"},
        {"from": "kitchen", "to": "lobby",      "weight": 1, "zone": "kitchen"},
        {"from": "lobby",   "to": "stair_a",    "weight": 1, "zone": "lobby"},
        {"from": "lobby",   "to": "stair_b",    "weight": 1, "zone": "lobby"},
        {"from": "stair_a", "to": "EXIT_NORTH", "weight": 1, "zone": "stair"},
        {"from": "stair_b", "to": "EXIT_SOUTH", "weight": 1, "zone": "stair"},
    ],
}

EXITS = ["EXIT_NORTH", "EXIT_SOUTH"]
BLOCKED_WEIGHT = 999999


def get_evac_path(start_room: str, hazard_zone: str) -> dict:
    """
    Build a graph, block edges in the hazard zone, and find the
    shortest evacuation path via Dijkstra to the nearest exit.
    """
    G = nx.DiGraph()

    # Add nodes
    for node in BUILDING_GRAPH["nodes"]:
        G.add_node(node["id"], floor=node["floor"], zone=node["zone"])

    # Add edges — block those in the hazard zone
    for edge in BUILDING_GRAPH["edges"]:
        weight = BLOCKED_WEIGHT if edge["zone"] == hazard_zone else edge["weight"]
        # Add both directions so guests can traverse either way
        G.add_edge(edge["from"], edge["to"], weight=weight)
        G.add_edge(edge["to"], edge["from"], weight=weight)

    # Try each exit and pick the shortest unblocked path
    best_path = None
    best_cost = float("inf")

    for exit_node in EXITS:
        try:
            path = nx.dijkstra_path(G, start_room, exit_node, weight="weight")
            cost = nx.dijkstra_path_length(G, start_room, exit_node, weight="weight")

            # A path through a blocked zone will have cost >= BLOCKED_WEIGHT
            if cost < best_cost:
                best_cost = cost
                best_path = path
        except nx.NetworkXNoPath:
            continue

    if best_path and best_cost < BLOCKED_WEIGHT:
        return {"path": best_path, "trapped": False}

    return {"path": [], "trapped": True}
