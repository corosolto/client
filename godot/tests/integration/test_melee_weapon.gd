extends GutTest

const MELEE_PATH := "res://src/weapons/melee_weapon.gd"
const KNIFE_PATH := "res://src/weapons/definitions/knife.tres"
const BOT_SCENE_PATH := "res://src/actors/combat_bot.tscn"


func test_knife_applies_damage_inside_legacy_range() -> void:
	var knife: Node3D = (load(MELEE_PATH) as GDScript).new()
	knife.definition = load(KNIFE_PATH)
	add_child_autofree(knife)
	var bot := (load(BOT_SCENE_PATH) as PackedScene).instantiate()
	bot.position = Vector3(0.0, 0.0, -2.0)
	add_child_autofree(bot)
	await wait_physics_frames(2)

	var result: Dictionary = knife.fire(Vector3(0.0, 0.8, 0.0), Vector3.FORWARD)
	assert_true(result.fired)
	assert_true(result.hit)
	assert_false(result.killed)
	assert_eq(bot.health.current_health, 45)
	assert_false(knife.fire(Vector3(0.0, 0.8, 0.0), Vector3.FORWARD).fired)


func test_knife_does_not_damage_beyond_legacy_range() -> void:
	var knife: Node3D = (load(MELEE_PATH) as GDScript).new()
	knife.definition = load(KNIFE_PATH)
	add_child_autofree(knife)
	var bot := (load(BOT_SCENE_PATH) as PackedScene).instantiate()
	bot.position = Vector3(0.0, 0.0, -3.0)
	add_child_autofree(bot)
	await wait_physics_frames(2)

	var result: Dictionary = knife.fire(Vector3(0.0, 0.8, 0.0), Vector3.FORWARD)
	assert_true(result.fired)
	assert_false(result.hit)
	assert_eq(bot.health.current_health, 100)
