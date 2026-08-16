extends GutTest

const CONFIG_PATH := "res://src/player/movement_config.gd"


func test_default_config_matches_legacy_movement_contract() -> void:
	assert_true(ResourceLoader.exists(CONFIG_PATH), "MovementConfig must exist")
	if not ResourceLoader.exists(CONFIG_PATH):
		return

	var config_script := load(CONFIG_PATH) as GDScript
	var config: Resource = config_script.new()
	assert_almost_eq(config.walk_speed, 4.7, 0.001)
	assert_almost_eq(config.sprint_speed, 6.6, 0.001)
	assert_almost_eq(config.scoped_speed_multiplier, 0.5, 0.001)
	assert_almost_eq(config.crouched_speed_multiplier, 0.5, 0.001)
	assert_almost_eq(config.ground_acceleration, 42.0, 0.001)
	assert_almost_eq(config.air_acceleration, 8.0, 0.001)
	assert_almost_eq(config.ground_friction, 9.0, 0.001)
	assert_almost_eq(config.jump_velocity, 5.4, 0.001)
	assert_almost_eq(config.gravity, 14.5, 0.001)
	assert_almost_eq(config.standing_eye_height, 1.62, 0.001)
	assert_almost_eq(config.crouch_eye_drop, 0.52, 0.001)
	assert_almost_eq(config.crouch_transition_rate, 7.0, 0.001)
	assert_almost_eq(config.maximum_step_height, 0.55, 0.001)
	assert_almost_eq(config.collision_radius, 0.38, 0.001)
