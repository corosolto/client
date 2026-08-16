class_name WeaponInventory
extends Node3D

signal weapon_changed(weapon_id: StringName, display_name: String, ammo: int, reserve: int)
signal ammo_changed(ammo: int, reserve: int)
signal scope_changed(active: bool)
signal fired(result: Dictionary)
signal reload_started(weapon_id: StringName)

@export var initial_weapon: StringName = &"awp"

var active_weapon: Node3D
var draw_remaining: float = 0.0
var scoped: bool = false
var _weapons: Dictionary = {}


func _ready() -> void:
	for child in get_children():
		if child is not Node3D or child.get("definition") == null:
			continue
		var weapon_id: StringName = child.definition.weapon_id
		_weapons[weapon_id] = child
		if child.has_signal("ammo_changed"):
			child.ammo_changed.connect(_on_child_ammo_changed.bind(child))
	active_weapon = _weapons.get(initial_weapon)
	assert(active_weapon != null, "Initial weapon must exist in inventory")
	_update_visibility()


func _process(delta: float) -> void:
	advance(delta)


func advance(delta: float) -> void:
	draw_remaining = maxf(0.0, draw_remaining - delta)


func switch_to(weapon_id: StringName) -> bool:
	var next_weapon := _weapons.get(weapon_id) as Node3D
	if next_weapon == null or next_weapon == active_weapon:
		return false
	if active_weapon is HitscanWeapon:
		active_weapon.state.cancel_reload()
	set_scoped(false)
	active_weapon = next_weapon
	draw_remaining = float(active_weapon.definition.draw_delay)
	_update_visibility()
	_publish_weapon()
	return true


func can_attack() -> bool:
	return active_weapon != null and draw_remaining <= 0.0


func attack(origin: Vector3, direction: Vector3, source: Node = null) -> Dictionary:
	if not can_attack():
		return {"fired": false, "hit": false, "headshot": false, "killed": false}
	var result: Dictionary = active_weapon.fire(origin, direction, source)
	fired.emit(result)
	return result


func reload() -> bool:
	if active_weapon == null or active_weapon.definition.melee:
		return false
	var started: bool = active_weapon.reload()
	if started:
		reload_started.emit(active_weapon.definition.weapon_id)
	return started


func set_scoped(active: bool) -> bool:
	if active and (active_weapon == null or not active_weapon.definition.supports_scope):
		return false
	scoped = active
	if active_weapon is HitscanWeapon:
		active_weapon.scoped = active
	scope_changed.emit(scoped)
	return true


func current_ammo() -> Vector2i:
	if active_weapon == null or active_weapon.definition.melee:
		return Vector2i(-1, -1)
	return Vector2i(active_weapon.state.ammo, active_weapon.state.reserve)


func _update_visibility() -> void:
	for weapon_variant in _weapons.values():
		var weapon: Node3D = weapon_variant
		weapon.visible = weapon == active_weapon


func _publish_weapon() -> void:
	var ammo := current_ammo()
	weapon_changed.emit(
		active_weapon.definition.weapon_id,
		active_weapon.definition.display_name,
		ammo.x,
		ammo.y
	)


func _on_child_ammo_changed(ammo: int, reserve: int, weapon: Node3D) -> void:
	if weapon == active_weapon:
		ammo_changed.emit(ammo, reserve)
