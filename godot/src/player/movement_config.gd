class_name MovementConfig
extends Resource

@export_category("Horizontal movement")
@export var walk_speed: float = 4.7
@export var sprint_speed: float = 6.6
@export var scoped_speed_multiplier: float = 0.5
@export var crouched_speed_multiplier: float = 0.5
@export var ground_acceleration: float = 42.0
@export var air_acceleration: float = 8.0
@export var ground_friction: float = 9.0

@export_category("Vertical movement")
@export var jump_velocity: float = 5.4
@export var gravity: float = 14.5
@export var maximum_step_height: float = 0.55

@export_category("Body and camera")
@export var collision_radius: float = 0.38
@export var standing_eye_height: float = 1.62
@export var crouch_eye_drop: float = 0.52
@export var crouch_transition_rate: float = 7.0
@export var mouse_sensitivity: float = 0.002
@export var minimum_pitch: float = -1.45
@export var maximum_pitch: float = 1.45
@export var base_fov: float = 70.0
@export var sprint_fov: float = 76.0
@export var scope_fov: float = 24.0


func speed_for(sprinting: bool, scoped: bool, crouch_fraction: float) -> float:
	var speed := sprint_speed if sprinting and crouch_fraction < 0.3 else walk_speed
	if scoped:
		speed *= scoped_speed_multiplier
	return speed * lerpf(1.0, crouched_speed_multiplier, clampf(crouch_fraction, 0.0, 1.0))


func eye_height_for(crouch_fraction: float) -> float:
	return standing_eye_height - crouch_eye_drop * clampf(crouch_fraction, 0.0, 1.0)
