class_name HealthComponent
extends Node

signal damaged(amount: int, remaining: int, source: Node, headshot: bool)
signal died(source: Node, headshot: bool)
signal restored(current: int)

@export var maximum_health: int = 100

var current_health: int = 100


func _ready() -> void:
	current_health = maximum_health


func take_damage(amount: int, source: Node = null, headshot: bool = false) -> bool:
	if amount <= 0 or not is_alive():
		return false
	current_health = maxi(0, current_health - amount)
	damaged.emit(amount, current_health, source, headshot)
	if current_health > 0:
		return false
	died.emit(source, headshot)
	return true


func reset() -> void:
	current_health = maximum_health
	restored.emit(current_health)


func is_alive() -> bool:
	return current_health > 0
