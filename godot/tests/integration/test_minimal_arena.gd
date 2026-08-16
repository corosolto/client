extends GutTest

const ARENA_SCENE_PATH := "res://src/arena/minimal_arena.tscn"


func test_arena_generates_complete_legacy_landmarks_at_runtime() -> void:
	assert_true(ResourceLoader.exists(ARENA_SCENE_PATH), "Procedural arena scene must exist")
	if not ResourceLoader.exists(ARENA_SCENE_PATH):
		return

	var arena := (load(ARENA_SCENE_PATH) as PackedScene).instantiate()
	add_child_autofree(arena)
	assert_true(arena.get_node("Geometry/Floor") is StaticBody3D)
	assert_true(arena.get_node("Geometry/NorthWall") is StaticBody3D)
	assert_true(arena.get_node("Geometry/CenterObstacle") is StaticBody3D)
	assert_true(arena.get_node("Geometry/WalkableStep") is StaticBody3D)
	assert_true(arena.get_node("Geometry/TruckTrailer") is StaticBody3D)
	assert_true(arena.get_node("Geometry/Sindicato") is StaticBody3D)
	assert_true(arena.get_node("Geometry/Boteco") is StaticBody3D)
	assert_true(arena.get_node("Geometry/PastelStand") is StaticBody3D)
	assert_not_null(arena.get_node_or_null("Decor/MSTCamp"))
	assert_not_null(arena.get_node_or_null("Skyline/CongressTowerLeft"))
	assert_gte(arena.get_node("Geometry").get_child_count(), 45)
	assert_eq(arena.arena_size, Vector2(54.0, 94.0))

	var step_shape := arena.get_node("Geometry/WalkableStep/CollisionShape3D").shape as BoxShape3D
	assert_almost_eq(step_shape.size.y, 0.5, 0.001)
	assert_lt(arena.material_count(), arena.get_node("Geometry").get_child_count())
	var graph: WaypointGraph = arena.create_waypoint_graph()
	assert_gt(graph.points.size(), 100)
	var south := graph.nearest_point(Vector3(-9.0, 1.4, -42.0))
	var north := graph.nearest_point(Vector3(-9.0, 1.4, 42.0))
	assert_gt(graph.find_path(south, north).size(), 2)


func test_same_seed_generates_same_arena_signature() -> void:
	var first := (load(ARENA_SCENE_PATH) as PackedScene).instantiate()
	var second := (load(ARENA_SCENE_PATH) as PackedScene).instantiate()
	add_child_autofree(first)
	add_child_autofree(second)
	assert_eq(first.procedural_signature, second.procedural_signature)
	assert_string_contains(first.procedural_signature, "2026")
