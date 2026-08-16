class_name HitscanWeapon
extends Node3D

signal fired(result: Dictionary)
signal ammo_changed(ammo: int, reserve: int)

const WeaponStateScript := preload("res://src/weapons/weapon_state.gd")

@export var definition: Resource
@export var scoped: bool = false
@export var spread_seed: int = 1337

var state: RefCounted
var _random := RandomNumberGenerator.new()


func _ready() -> void:
	assert(definition != null, "HitscanWeapon requires a WeaponDefinition")
	state = WeaponStateScript.new(definition)
	_random.seed = spread_seed


func _process(delta: float) -> void:
	var previous_ammo: int = state.ammo
	var previous_reserve: int = state.reserve
	state.advance(delta)
	if state.ammo != previous_ammo or state.reserve != previous_reserve:
		ammo_changed.emit(state.ammo, state.reserve)


func fire(origin: Vector3, direction: Vector3, source: Node = null) -> Dictionary:
	var result := {
		"fired": false,
		"hit": false,
		"headshot": false,
		"killed": false,
		"position": origin,
		"collider": null,
	}
	if not state.try_fire():
		return result
	result.fired = true
	ammo_changed.emit(state.ammo, state.reserve)

	var shot_direction := _spread_direction(direction.normalized())
	var query := PhysicsRayQueryParameters3D.create(
		origin, origin + shot_direction * float(definition.range)
	)
	query.collide_with_areas = true
	query.collide_with_bodies = true
	query.exclude = _collision_rids(source)
	var collision: Dictionary = get_world_3d().direct_space_state.intersect_ray(query)
	if collision.is_empty():
		fired.emit(result)
		return result

	result.hit = true
	result.position = collision.position
	result.collider = collision.collider
	var collider := collision.collider as Node
	var target: Node = null
	if collider != null and collider.has_method("damage_target"):
		result.headshot = collider.hit_zone == &"head"
		target = collider.damage_target()
	elif collider != null and collider.has_method("take_damage"):
		target = collider
	if target != null:
		result.killed = target.take_damage(definition.damage, source, result.headshot)
	fired.emit(result)
	return result


func reload() -> bool:
	return state.start_reload()


func _spread_direction(direction: Vector3) -> Vector3:
	var spread: float = definition.scope_spread if scoped else definition.hip_spread
	if spread <= 0.0:
		return direction
	var right := direction.cross(Vector3.UP)
	if right.is_zero_approx():
		right = Vector3.RIGHT
	right = right.normalized()
	var up := right.cross(direction).normalized()
	return (
		direction
		+ right * _random.randf_range(-spread, spread)
		+ up * _random.randf_range(-spread, spread)
	).normalized()


func _collision_rids(source: Node) -> Array[RID]:
	var exclusions: Array[RID] = []
	if source == null:
		return exclusions
	var pending: Array[Node] = [source]
	while not pending.is_empty():
		var candidate: Node = pending.pop_back()
		if candidate is CollisionObject3D:
			exclusions.append(candidate.get_rid())
		for child in candidate.get_children():
			pending.append(child)
	return exclusions
