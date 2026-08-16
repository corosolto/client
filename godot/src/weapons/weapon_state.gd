class_name WeaponState
extends RefCounted

var definition: Resource
var ammo: int
var reserve: int
var cooldown_remaining: float = 0.0
var reload_remaining: float = 0.0
var reloading: bool = false


func _init(weapon_definition: Resource) -> void:
	definition = weapon_definition
	ammo = definition.magazine_capacity
	reserve = definition.reserve_capacity


func try_fire() -> bool:
	if reloading or cooldown_remaining > 0.0 or ammo <= 0:
		return false
	ammo -= 1
	cooldown_remaining = definition.fire_interval
	return true


func start_reload() -> bool:
	if reloading or ammo >= definition.magazine_capacity or reserve <= 0:
		return false
	reloading = true
	reload_remaining = definition.reload_seconds
	return true


func cancel_reload() -> void:
	reloading = false
	reload_remaining = 0.0


func advance(delta: float) -> void:
	cooldown_remaining = maxf(0.0, cooldown_remaining - delta)
	if not reloading:
		return
	reload_remaining = maxf(0.0, reload_remaining - delta)
	if reload_remaining > 0.00001:
		return
	var requested: int = definition.magazine_capacity - ammo
	var transferred := mini(requested, reserve)
	ammo += transferred
	reserve -= transferred
	reloading = false
