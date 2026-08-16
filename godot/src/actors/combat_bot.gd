class_name CombatBot
extends CharacterBody3D

signal died(source: Node, headshot: bool)
signal respawned

@export var respawn_delay: float = 2.5
@export var actor_id: StringName = &"bot"
@export var display_name: String = "Bot"
@export var team: StringName = &"B"
@export var movement_speed: float = 3.3

@onready var health: HealthComponent = $Health
@onready var body_collision: CollisionShape3D = $BodyCollision
@onready var head_hitbox: Area3D = $HeadHitbox
@onready var visuals: Node3D = $Visuals
@onready var weapon: HitscanWeapon = $AWP

var alive: bool = true
var kills: int = 0
var deaths: int = 0
var respawn_remaining: float = 0.0
var spawn_position: Vector3
var target_actor: Node3D
var reaction_seconds: float = 0.8
var combat_enabled: bool = false
var navigation_graph: WaypointGraph
var _navigation_path: Array[int] = []
var _path_cursor: int = 0
var _path_refresh_remaining: float = 0.0
var _target_visible_for: float = 0.0
var _visual_phase: float = 0.0


func _ready() -> void:
	spawn_position = global_position
	health.died.connect(_on_health_died)
	weapon.scoped = true


func _physics_process(delta: float) -> void:
	_animate_visual(delta)
	if not alive:
		respawn_remaining = maxf(0.0, respawn_remaining - delta)
		if respawn_remaining <= 0.0:
			respawn()
		return
	if not combat_enabled or not _target_is_alive():
		velocity = Vector3.ZERO
		_target_visible_for = 0.0
		return
	_update_movement(delta)
	_update_attack(delta)


func take_damage(amount: int, source: Node = null, headshot: bool = false) -> bool:
	return health.take_damage(amount, source, headshot)


func respawn() -> void:
	health.reset()
	alive = true
	global_position = spawn_position
	velocity = Vector3.ZERO
	body_collision.set_deferred("disabled", false)
	head_hitbox.set_deferred("monitorable", true)
	visuals.visible = true
	_target_visible_for = 0.0
	_navigation_path.clear()
	respawned.emit()


func reset_for_round() -> void:
	respawn_remaining = 0.0
	respawn()


func target_point() -> Vector3:
	return global_position + Vector3(0.0, 1.55, 0.0)


func set_navigation_graph(graph: WaypointGraph) -> void:
	navigation_graph = graph
	_navigation_path.clear()


func _on_health_died(source: Node, headshot: bool) -> void:
	alive = false
	deaths += 1
	respawn_remaining = respawn_delay
	velocity = Vector3.ZERO
	body_collision.set_deferred("disabled", true)
	head_hitbox.set_deferred("monitorable", false)
	visuals.visible = false
	died.emit(source, headshot)


func _update_movement(delta: float) -> void:
	_path_refresh_remaining -= delta
	if _path_refresh_remaining <= 0.0:
		_rebuild_path()
		_path_refresh_remaining = 0.4
	var destination := _movement_destination()
	var offset := destination - global_position
	offset.y = 0.0
	if offset.length() < 0.35:
		_path_cursor += 1
		destination = _movement_destination()
		offset = destination - global_position
		offset.y = 0.0
	if offset.is_zero_approx():
		velocity.x = 0.0
		velocity.z = 0.0
		return
	var direction := offset.normalized()
	velocity.x = direction.x * movement_speed
	velocity.z = direction.z * movement_speed
	if not is_on_floor():
		velocity.y -= 18.0 * delta
	else:
		velocity.y = 0.0
	look_at(global_position + Vector3(direction.x, 0.0, direction.z), Vector3.UP)
	move_and_slide()


func _rebuild_path() -> void:
	if navigation_graph == null or target_actor == null:
		_navigation_path.clear()
		return
	var origin := navigation_graph.nearest_point(global_position)
	var target := navigation_graph.nearest_point(target_actor.global_position)
	_navigation_path = navigation_graph.find_path(origin, target)
	_path_cursor = 1 if _navigation_path.size() > 1 else 0


func _movement_destination() -> Vector3:
	if (
		navigation_graph != null
		and _path_cursor >= 0
		and _path_cursor < _navigation_path.size()
	):
		return navigation_graph.points[_navigation_path[_path_cursor]]
	return target_actor.global_position if target_actor != null else global_position


func _update_attack(delta: float) -> void:
	var origin := target_point()
	var target := _actor_target_point(target_actor)
	var query := PhysicsRayQueryParameters3D.create(origin, target)
	query.exclude = [get_rid(), head_hitbox.get_rid()]
	query.collide_with_areas = true
	var sight: Dictionary = get_world_3d().direct_space_state.intersect_ray(query)
	if sight.is_empty() or not _collider_belongs_to_target(sight.collider):
		_target_visible_for = 0.0
		return
	_target_visible_for += delta
	if _target_visible_for >= reaction_seconds:
		weapon.fire(origin, origin.direction_to(target), self)


func _target_is_alive() -> bool:
	return target_actor != null and bool(target_actor.get("alive"))


func _actor_target_point(actor: Node3D) -> Vector3:
	if actor != null and actor.has_method("target_point"):
		return actor.target_point()
	return actor.global_position if actor != null else global_position


func _collider_belongs_to_target(collider: Object) -> bool:
	if collider == target_actor:
		return true
	return collider is Node and target_actor != null and target_actor.is_ancestor_of(collider)


func _animate_visual(delta: float) -> void:
	if visuals.get_child_count() == 0:
		return
	var generated := visuals.get_child(0) as Node3D
	var left_leg := generated.get_node_or_null("Body/LegLeft") as MeshInstance3D
	var right_leg := generated.get_node_or_null("Body/LegRight") as MeshInstance3D
	var torso := generated.get_node_or_null("Body/Torso") as MeshInstance3D
	if left_leg == null or right_leg == null or torso == null:
		return
	var moving := clampf(
		Vector2(velocity.x, velocity.z).length() / maxf(movement_speed, 0.001), 0.0, 1.0
	)
	_visual_phase += delta * (8.0 if moving > 0.05 else 2.0)
	left_leg.rotation.x = sin(_visual_phase) * 0.45 * moving
	right_leg.rotation.x = -left_leg.rotation.x
	torso.position.y = 1.08 + sin(_visual_phase * 0.5) * 0.015
