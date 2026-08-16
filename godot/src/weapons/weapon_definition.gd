class_name WeaponDefinition
extends Resource

@export var weapon_id: StringName
@export var display_name: String
@export var damage: int
@export var magazine_capacity: int
@export var reserve_capacity: int
@export var fire_interval: float
@export var reload_seconds: float
@export var hip_spread: float
@export var scope_spread: float
@export var recoil: float
@export var range: float = 400.0
@export var supports_scope: bool = false
@export var draw_delay: float = 0.35
@export var melee: bool = false
