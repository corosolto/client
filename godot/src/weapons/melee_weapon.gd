class_name MeleeWeapon
extends Node3D

signal fired(result: Dictionary)

@export var definition: Resource

var cooldown_remaining: float = 0.0


func _ready() -> void:
	assert(definition != null and definition.melee, "MeleeWeapon requires a melee definition")


func _process(delta: float) -> void:
	cooldown_remaining = maxf(0.0, cooldown_remaining - delta)


func fire(origin: Vector3, direction: Vector3, source: Node = null) -> Dictionary:
	var result := {
		"fired": false,
		"hit": false,
		"headshot": false,
		"killed": false,
		"position": origin,
		"collider": null,
	}
	if cooldown_remaining > 0.0:
		return result
	cooldown_remaining = definition.fire_interval
	result.fired = true
	var query := PhysicsRayQueryParameters3D.create(
		origin, origin + direction.normalized() * float(definition.range)
	)
	query.collide_with_areas = true
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
