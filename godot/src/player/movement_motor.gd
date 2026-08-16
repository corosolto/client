class_name MovementMotor
extends RefCounted

var _config: Resource


func _init(config: Resource) -> void:
	_config = config


func horizontal_velocity(
	current_velocity: Vector3,
	input_axis: Vector2,
	yaw: float,
	grounded: bool,
	sprinting: bool,
	scoped: bool,
	crouch_fraction: float,
	delta: float
) -> Vector3:
	var velocity := Vector3(current_velocity.x, 0.0, current_velocity.z)
	var normalized_input := input_axis.limit_length(1.0)
	if not normalized_input.is_zero_approx():
		var sine := sin(yaw)
		var cosine := cos(yaw)
		var direction := Vector3(
			normalized_input.x * cosine - normalized_input.y * sine,
			0.0,
			normalized_input.x * sine + normalized_input.y * cosine
		)
		var acceleration: float = _config.ground_acceleration if grounded else _config.air_acceleration
		velocity += direction * acceleration * delta
	elif grounded:
		velocity *= maxf(0.0, 1.0 - _config.ground_friction * delta)

	var maximum_speed: float = _config.speed_for(sprinting, scoped, crouch_fraction)
	if velocity.length() > maximum_speed:
		velocity = velocity.normalized() * maximum_speed
	velocity.y = current_velocity.y
	return velocity


func vertical_velocity(current: float, grounded: bool, jumping: bool, delta: float) -> float:
	var result: float = _config.jump_velocity if grounded and jumping else current
	return result - _config.gravity * delta


func next_crouch_fraction(current: float, wants_crouch: bool, grounded: bool, delta: float) -> float:
	var direction := 1.0 if wants_crouch and grounded else -1.0
	return clampf(current + direction * _config.crouch_transition_rate * delta, 0.0, 1.0)
