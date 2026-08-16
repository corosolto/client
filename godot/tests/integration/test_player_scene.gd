extends GutTest

const PLAYER_SCENE_PATH := "res://src/player/player.tscn"


func test_player_scene_composes_body_camera_and_collision() -> void:
	assert_true(ResourceLoader.exists(PLAYER_SCENE_PATH), "Player scene must exist")
	if not ResourceLoader.exists(PLAYER_SCENE_PATH):
		return

	var player := (load(PLAYER_SCENE_PATH) as PackedScene).instantiate()
	add_child_autofree(player)
	assert_true(player is CharacterBody3D)
	assert_true(player.get_node("CollisionShape3D") is CollisionShape3D)
	assert_true(player.get_node("CameraPivot/Camera3D") is Camera3D)
	assert_almost_eq(player.get_node("CameraPivot").position.y, 1.62, 0.001)
	assert_almost_eq(player.floor_max_angle, deg_to_rad(46.0), 0.001)
	assert_almost_eq(player.floor_snap_length, 0.55, 0.001)


func test_view_rotation_is_clamped_and_pointer_can_be_released_safely() -> void:
	var player := (load(PLAYER_SCENE_PATH) as PackedScene).instantiate()
	add_child_autofree(player)
	player.rotate_view(Vector2(100.0, 10000.0))
	assert_almost_eq(player.rotation.y, -0.2, 0.001)
	assert_almost_eq(player.get_node("CameraPivot").rotation.x, -1.45, 0.001)

	watch_signals(player)
	player.capture_pointer()
	assert_signal_emitted_with_parameters(player, "input_capture_changed", [true])
	player.release_pointer()
	assert_eq(Input.mouse_mode, Input.MOUSE_MODE_VISIBLE)
	assert_signal_emitted_with_parameters(player, "input_capture_changed", [false])
