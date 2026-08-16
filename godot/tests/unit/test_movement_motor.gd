extends GutTest

const MOTOR_PATH := "res://src/player/movement_motor.gd"
const CONFIG_PATH := "res://src/player/movement_config.gd"


func test_horizontal_velocity_accelerates_caps_and_normalizes_input() -> void:
	assert_true(ResourceLoader.exists(MOTOR_PATH), "MovementMotor must exist")
	if not ResourceLoader.exists(MOTOR_PATH):
		return

	var config: Resource = (load(CONFIG_PATH) as GDScript).new()
	var motor: RefCounted = (load(MOTOR_PATH) as GDScript).new(config)
	var forward: Vector3 = motor.horizontal_velocity(
		Vector3.ZERO, Vector2(0.0, -1.0), 0.0, true, false, false, 0.0, 1.0
	)
	var diagonal: Vector3 = motor.horizontal_velocity(
		Vector3.ZERO, Vector2(1.0, -1.0), 0.0, true, false, false, 0.0, 1.0
	)

	assert_almost_eq(forward.length(), 4.7, 0.001)
	assert_almost_eq(forward.z, -4.7, 0.001)
	assert_almost_eq(diagonal.length(), 4.7, 0.001)
	assert_almost_eq(diagonal.x, -diagonal.z, 0.001)


func test_speed_modifiers_and_ground_friction_match_legacy() -> void:
	assert_true(ResourceLoader.exists(MOTOR_PATH), "MovementMotor must exist")
	if not ResourceLoader.exists(MOTOR_PATH):
		return

	var config: Resource = (load(CONFIG_PATH) as GDScript).new()
	var motor: RefCounted = (load(MOTOR_PATH) as GDScript).new(config)
	var sprint: Vector3 = motor.horizontal_velocity(
		Vector3.ZERO, Vector2(0.0, -1.0), 0.0, true, true, false, 0.0, 1.0
	)
	var scoped_crouch: Vector3 = motor.horizontal_velocity(
		Vector3.ZERO, Vector2(0.0, -1.0), 0.0, true, false, true, 1.0, 1.0
	)
	var friction: Vector3 = motor.horizontal_velocity(
		Vector3(4.7, 0.0, 0.0), Vector2.ZERO, 0.0, true, false, false, 0.0, 0.1
	)

	assert_almost_eq(sprint.length(), 6.6, 0.001)
	assert_almost_eq(scoped_crouch.length(), 1.175, 0.001)
	assert_almost_eq(friction.x, 0.47, 0.001)


func test_jump_gravity_and_crouch_transition_match_legacy() -> void:
	var config: Resource = (load(CONFIG_PATH) as GDScript).new()
	var motor: RefCounted = (load(MOTOR_PATH) as GDScript).new(config)

	assert_almost_eq(motor.vertical_velocity(0.0, true, true, 0.0), 5.4, 0.001)
	assert_almost_eq(motor.vertical_velocity(5.4, false, false, 0.1), 3.95, 0.001)
	assert_almost_eq(motor.next_crouch_fraction(0.0, true, true, 0.1), 0.7, 0.001)
	assert_almost_eq(motor.next_crouch_fraction(0.7, false, true, 0.1), 0.0, 0.001)
	assert_almost_eq(motor.next_crouch_fraction(0.0, true, false, 0.1), 0.0, 0.001)
