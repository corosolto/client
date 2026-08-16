extends GutTest

const GRAPH_PATH := "res://src/ai/waypoint_graph.gd"


func test_graph_finds_shortest_connected_route_around_blocked_center() -> void:
	assert_true(ResourceLoader.exists(GRAPH_PATH), "WaypointGraph must exist")
	if not ResourceLoader.exists(GRAPH_PATH):
		return
	var graph: RefCounted = (load(GRAPH_PATH) as GDScript).new()
	var left_top: int = graph.add_point(Vector3(-5.0, 0.0, 5.0))
	var right_top: int = graph.add_point(Vector3(5.0, 0.0, 5.0))
	var left_bottom: int = graph.add_point(Vector3(-5.0, 0.0, -5.0))
	var right_bottom: int = graph.add_point(Vector3(5.0, 0.0, -5.0))
	graph.connect_points(left_top, right_top)
	graph.connect_points(left_top, left_bottom)
	graph.connect_points(right_top, right_bottom)
	graph.connect_points(left_bottom, right_bottom)

	assert_eq(graph.find_path(left_top, right_bottom), [left_top, right_top, right_bottom])
	assert_eq(graph.nearest_point(Vector3(-4.8, 0.0, -4.7)), left_bottom)


func test_disconnected_target_falls_back_to_origin() -> void:
	var graph: RefCounted = (load(GRAPH_PATH) as GDScript).new()
	var origin: int = graph.add_point(Vector3.ZERO)
	var isolated: int = graph.add_point(Vector3(10.0, 0.0, 0.0))
	assert_eq(graph.find_path(origin, isolated), [origin])
