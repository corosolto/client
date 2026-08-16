class_name PlayerController
extends CharacterBody3D

signal input_capture_changed(captured: bool)
signal health_changed(current: int)
signal weapon_state_changed(weapon_name: String, ammo: int, reserve: int)
signal shot_fired(result: Dictionary)
signal scope_changed(active: bool)
signal died(source: Node, headshot: bool)
signal respawned

const MovementConfigScript := preload("res://src/player/movement_config.gd")
const MovementMotorScript := preload("res://src/player/movement_motor.gd")

@export var movement_config: Resource = MovementConfigScript.new()
@export var accepts_input: bool = true
@export var actor_id: StringName = &"esquerdomacho"
@export var display_name: String = "Jogador"
@export var team: StringName = &"P"

@onready var camera_pivot: Node3D = $CameraPivot
@onready var camera: Camera3D = $CameraPivot/Camera3D
@onready var collision_shape: CollisionShape3D = $CollisionShape3D
@onready var health: HealthComponent = $Health
@onready var weapon_inventory: WeaponInventory = $CameraPivot/Camera3D/Inventory

var crouch_fraction: float = 0.0
var scoped: bool = false
var input_session_active: bool = false
var respawn_delay: float = 2.5
var respawn_remaining: float = 0.0
var alive: bool = true
var input_overlay_active: bool = false
var kills: int = 0
var deaths: int = 0
var spawn_position: Vector3
var _pitch: float = 0.0
var _motor: RefCounted

var weapon: Node3D:
	get:
		return weapon_inventory.active_weapon


func _ready() -> void:
	_motor = MovementMotorScript.new(movement_config)
	# The scene resource is shared; each actor must own its mutable crouch shape.
	collision_shape.shape = collision_shape.shape.duplicate()
	camera.fov = movement_config.base_fov
	spawn_position = global_position
	health.damaged.connect(_on_health_damaged)
	health.died.connect(_on_health_died)
	weapon_inventory.ammo_changed.connect(_on_ammo_changed)
	weapon_inventory.weapon_changed.connect(_on_weapon_changed)


func _input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
		var already_active := input_session_active
		capture_pointer()
		if already_active:
			_fire_weapon()
	elif event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_RIGHT and event.pressed:
		set_scoped(not scoped)
	elif event is InputEventKey and event.keycode == KEY_ESCAPE and event.pressed:
		release_pointer()
	elif event is InputEventKey and input_overlay_active and event.pressed and event.keycode in [KEY_R, KEY_1, KEY_2, KEY_3]:
		return
	elif event is InputEventKey and event.keycode == KEY_R and event.pressed:
		weapon_inventory.reload()
	elif event is InputEventKey and event.keycode == KEY_1 and event.pressed:
		switch_weapon(&"awp")
	elif event is InputEventKey and event.keycode == KEY_2 and event.pressed:
		switch_weapon(&"pistol")
	elif event is InputEventKey and event.keycode == KEY_3 and event.pressed:
		switch_weapon(&"knife")
	elif event is InputEventMouseMotion and _is_pointer_captured() and accepts_input:
		rotate_view(event.relative)


func _notification(what: int) -> void:
	if what == NOTIFICATION_APPLICATION_FOCUS_OUT:
		release_pointer()


func _physics_process(delta: float) -> void:
	if not health.is_alive():
		respawn_remaining = maxf(0.0, respawn_remaining - delta)
		if respawn_remaining <= 0.0:
			respawn()
		return
	if not accepts_input or (OS.has_feature("web") and not input_session_active):
		velocity.x = 0.0
		velocity.z = 0.0
		return

	var axis := Input.get_vector("move_left", "move_right", "move_forward", "move_back")
	var grounded := is_on_floor()
	var wants_crouch := Input.is_action_pressed("crouch")
	crouch_fraction = _motor.next_crouch_fraction(crouch_fraction, wants_crouch, grounded, delta)
	var sprinting := Input.is_action_pressed("sprint") and crouch_fraction < 0.3
	velocity = _motor.horizontal_velocity(
		velocity, axis, rotation.y, grounded, sprinting, scoped, crouch_fraction, delta
	)
	velocity.y = _motor.vertical_velocity(
		velocity.y, grounded, Input.is_action_just_pressed("jump"), delta
	)
	var horizontal_velocity := Vector3(velocity.x, 0.0, velocity.z)
	_prepare_step_up(horizontal_velocity * delta, grounded)
	move_and_slide()
	_update_body_and_camera(sprinting, axis.length() > 0.0, delta)


func rotate_view(relative_motion: Vector2) -> void:
	rotation.y -= relative_motion.x * movement_config.mouse_sensitivity
	_pitch = clampf(
		_pitch - relative_motion.y * movement_config.mouse_sensitivity,
		movement_config.minimum_pitch,
		movement_config.maximum_pitch
	)
	camera_pivot.rotation.x = _pitch


func take_damage(amount: int, source: Node = null, headshot: bool = false) -> bool:
	return health.take_damage(amount, source, headshot)


func set_scoped(active: bool) -> void:
	if not weapon_inventory.set_scoped(active):
		return
	scoped = active
	scope_changed.emit(scoped)


func switch_weapon(weapon_id: StringName) -> bool:
	var changed := weapon_inventory.switch_to(weapon_id)
	if changed:
		scoped = false
		scope_changed.emit(false)
	return changed


func respawn() -> void:
	health.reset()
	alive = true
	global_position = spawn_position
	velocity = Vector3.ZERO
	accepts_input = true
	visible = true
	collision_shape.disabled = false
	set_scoped(false)
	health_changed.emit(health.current_health)
	respawned.emit()


func reset_for_round() -> void:
	respawn_remaining = 0.0
	respawn()


func target_point() -> Vector3:
	return camera.global_position


func capture_pointer() -> void:
	if not accepts_input:
		return
	if OS.has_feature("web"):
		JavaScriptBridge.eval("document.getElementById('canvas').requestPointerLock();")
	input_session_active = true
	Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
	input_capture_changed.emit(true)


func release_pointer() -> void:
	if OS.has_feature("web"):
		JavaScriptBridge.eval("if (document.pointerLockElement) document.exitPointerLock();")
	input_session_active = false
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	input_capture_changed.emit(false)


func _is_pointer_captured() -> bool:
	return Input.mouse_mode == Input.MOUSE_MODE_CAPTURED


func _fire_weapon() -> void:
	var result := weapon_inventory.attack(
		camera.global_position, -camera.global_transform.basis.z, self
	)
	if result.fired:
		_pitch = clampf(
			_pitch - float(weapon.definition.recoil),
			movement_config.minimum_pitch,
			movement_config.maximum_pitch
		)
		camera_pivot.rotation.x = _pitch
	shot_fired.emit(result)


func _on_health_damaged(_amount: int, current: int, _source: Node, _headshot: bool) -> void:
	health_changed.emit(current)


func _on_health_died(source: Node, headshot: bool) -> void:
	alive = false
	deaths += 1
	respawn_remaining = respawn_delay
	accepts_input = false
	release_pointer()
	set_scoped(false)
	collision_shape.set_deferred("disabled", true)
	died.emit(source, headshot)


func _on_ammo_changed(ammo: int, reserve: int) -> void:
	weapon_state_changed.emit(weapon.definition.display_name, ammo, reserve)


func _on_weapon_changed(
	_weapon_id: StringName, display_name: String, ammo: int, reserve: int
) -> void:
	weapon_state_changed.emit(display_name, ammo, reserve)


func _prepare_step_up(horizontal_motion: Vector3, grounded: bool) -> void:
	if not grounded or horizontal_motion.is_zero_approx():
		return
	if not test_move(global_transform, horizontal_motion):
		return

	# CharacterBody3D does not climb box steps automatically. Probe the surface
	# ahead and lift only when it stays within the legacy 0.55 meter contract.
	var direction := horizontal_motion.normalized()
	var probe_distance: float = float(movement_config.collision_radius) + horizontal_motion.length() + 0.08
	var probe_center := global_position + direction * probe_distance
	var maximum_step: float = float(movement_config.maximum_step_height)
	var query := PhysicsRayQueryParameters3D.create(
		probe_center + Vector3.UP * (maximum_step + 0.05),
		probe_center + Vector3.DOWN * 0.1
	)
	query.exclude = [get_rid()]
	var hit: Dictionary = get_world_3d().direct_space_state.intersect_ray(query)
	if hit.is_empty():
		return
	var step_height: float = float(hit.position.y) - global_position.y
	if step_height <= 0.01 or step_height > maximum_step:
		return

	global_position.y += step_height + 0.001


func _update_body_and_camera(sprinting: bool, moving: bool, delta: float) -> void:
	camera_pivot.position.y = movement_config.eye_height_for(crouch_fraction)
	var capsule := collision_shape.shape as CapsuleShape3D
	var body_height: float = lerpf(1.8, 1.28, crouch_fraction)
	capsule.height = body_height
	collision_shape.position.y = body_height * 0.5
	var target_fov: float = movement_config.scope_fov if scoped else (
		movement_config.sprint_fov if sprinting and moving else movement_config.base_fov
	)
	camera.fov = lerpf(camera.fov, target_fov, minf(1.0, delta * 12.0))
