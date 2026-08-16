extends GutTest

const SELECTOR_PATH := "res://src/ai/bot_target_selector.gd"

class FakeActor:
	extends Node3D
	var team: StringName
	var alive: bool = true

	func _init(actor_team: StringName, actor_position: Vector3) -> void:
		team = actor_team
		position = actor_position


func test_selector_chooses_nearest_living_enemy() -> void:
	assert_true(ResourceLoader.exists(SELECTOR_PATH), "BotTargetSelector must exist")
	if not ResourceLoader.exists(SELECTOR_PATH):
		return
	var selector: RefCounted = (load(SELECTOR_PATH) as GDScript).new()
	var self_actor := FakeActor.new(&"P", Vector3.ZERO)
	var ally := FakeActor.new(&"P", Vector3(1.0, 0.0, 0.0))
	var far_enemy := FakeActor.new(&"B", Vector3(8.0, 0.0, 0.0))
	var near_enemy := FakeActor.new(&"B", Vector3(3.0, 0.0, 0.0))
	add_child_autofree(self_actor)
	add_child_autofree(ally)
	add_child_autofree(far_enemy)
	add_child_autofree(near_enemy)

	assert_eq(selector.choose(self_actor, [ally, far_enemy, near_enemy]), near_enemy)
	near_enemy.alive = false
	assert_eq(selector.choose(self_actor, [ally, far_enemy, near_enemy]), far_enemy)
