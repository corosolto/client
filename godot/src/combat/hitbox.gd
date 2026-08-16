class_name Hitbox
extends Area3D

@export var hit_zone: StringName = &"body"


func damage_target() -> Node:
	var candidate := get_parent()
	while candidate != null:
		if candidate.has_method("take_damage"):
			return candidate
		candidate = candidate.get_parent()
	return null
