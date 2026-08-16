extends GutTest

const MATCH_SCENE_PATH := "res://src/match/movement_match.tscn"
const MAIN_SCENE_PATH := "res://src/main/main.tscn"


func after_each() -> void:
	for action in ["move_forward", "move_back", "move_left", "move_right", "sprint", "crouch", "jump"]:
		Input.action_release(action)


func test_movement_match_composes_arena_and_player_scenes() -> void:
	assert_true(ResourceLoader.exists(MATCH_SCENE_PATH), "Movement match scene must exist")
	if not ResourceLoader.exists(MATCH_SCENE_PATH):
		return

	var match_scene := (load(MATCH_SCENE_PATH) as PackedScene).instantiate()
	add_child_autofree(match_scene)
	assert_not_null(match_scene.get_node_or_null("Arena"))
	assert_true(match_scene.get_node("Actors/Player") is CharacterBody3D)
	assert_eq(match_scene.get_node("Actors/Player").position, Vector3(-9.0, 1.5, -42.0))


func test_main_hosts_the_playable_movement_match() -> void:
	var main := (load(MAIN_SCENE_PATH) as PackedScene).instantiate()
	add_child_autofree(main)
	assert_not_null(main.get_node_or_null("WorldHost/Match"))
	assert_not_null(main.get_node_or_null("WorldHost/Match/Actors/Player"))
	assert_eq(main.get_node("GuiHost/BootPanel/Status").text, "CLIQUE PARA CAPTURAR O MOUSE · WASD PARA MOVER")


func test_player_walks_and_center_obstacle_blocks_forward_motion() -> void:
	var match_scene := (load(MATCH_SCENE_PATH) as PackedScene).instantiate()
	add_child_autofree(match_scene)
	var player := match_scene.get_node("Actors/Player") as CharacterBody3D
	player.position = Vector3(0.0, 0.1, 8.0)
	player.rotation.y = 0.0
	await wait_physics_frames(10)

	Input.action_press("move_forward")
	await wait_physics_frames(180)
	Input.action_release("move_forward")

	assert_lt(player.position.z, 7.0, "Player must move forward")
	assert_gt(player.position.z, -0.2, "Center obstacle must block the player")
	assert_true(player.is_on_floor())


func test_player_jumps_and_crouch_lowers_the_camera() -> void:
	var match_scene := (load(MATCH_SCENE_PATH) as PackedScene).instantiate()
	add_child_autofree(match_scene)
	var player := match_scene.get_node("Actors/Player") as CharacterBody3D
	player.position = Vector3(0.0, 0.1, 8.0)
	player.rotation.y = 0.0
	await wait_physics_frames(10)

	Input.action_press("crouch")
	await wait_physics_frames(12)
	Input.action_release("crouch")
	assert_almost_eq(player.get_node("CameraPivot").position.y, 1.1, 0.02)

	await wait_physics_frames(12)
	Input.action_press("jump")
	await wait_physics_frames(1)
	Input.action_release("jump")
	await wait_physics_frames(8)
	assert_gt(player.position.y, 0.2, "Jump must lift the body from the floor")


func test_player_climbs_steps_within_legacy_height_limit() -> void:
	var match_scene := (load(MATCH_SCENE_PATH) as PackedScene).instantiate()
	add_child_autofree(match_scene)
	var player := match_scene.get_node("Actors/Player") as CharacterBody3D
	player.position = Vector3(6.0, 0.1, 6.0)
	player.rotation.y = 0.0
	await wait_physics_frames(10)

	Input.action_press("move_forward")
	await wait_physics_frames(45)
	Input.action_release("move_forward")

	assert_lt(player.position.z, 3.5, "Player must traverse the 0.5 meter step")
	assert_gt(player.position.y, 0.35, "Player must stand on the step")
