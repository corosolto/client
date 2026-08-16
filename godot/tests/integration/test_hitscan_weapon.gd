extends GutTest

const WEAPON_PATH := "res://src/weapons/hitscan_weapon.gd"
const AWP_PATH := "res://src/weapons/definitions/awp.tres"
const BOT_SCENE_PATH := "res://src/actors/combat_bot.tscn"


func test_scoped_awp_hits_head_and_kills_target() -> void:
	assert_true(ResourceLoader.exists(WEAPON_PATH), "HitscanWeapon must exist")
	if not ResourceLoader.exists(WEAPON_PATH):
		return

	var weapon: Node3D = (load(WEAPON_PATH) as GDScript).new()
	weapon.definition = load(AWP_PATH)
	weapon.scoped = true
	add_child_autofree(weapon)
	var bot := (load(BOT_SCENE_PATH) as PackedScene).instantiate()
	bot.position = Vector3(0.0, 0.0, -5.0)
	add_child_autofree(bot)
	await wait_physics_frames(2)

	var result: Dictionary = weapon.fire(Vector3(0.0, 1.55, 0.0), Vector3.FORWARD)
	assert_true(result.fired)
	assert_true(result.hit)
	assert_true(result.headshot)
	assert_true(result.killed)
	assert_eq(bot.health.current_health, 0)
	assert_eq(weapon.state.ammo, 4)


func test_world_geometry_occludes_target() -> void:
	var weapon: Node3D = (load(WEAPON_PATH) as GDScript).new()
	weapon.definition = load(AWP_PATH)
	weapon.scoped = true
	add_child_autofree(weapon)
	var bot := (load(BOT_SCENE_PATH) as PackedScene).instantiate()
	bot.position = Vector3(0.0, 0.0, -5.0)
	add_child_autofree(bot)
	var obstacle := StaticBody3D.new()
	var shape := CollisionShape3D.new()
	var box := BoxShape3D.new()
	box.size = Vector3(2.0, 2.0, 0.5)
	shape.shape = box
	obstacle.add_child(shape)
	obstacle.position = Vector3(0.0, 1.0, -2.0)
	add_child_autofree(obstacle)
	await wait_physics_frames(2)

	var result: Dictionary = weapon.fire(Vector3(0.0, 1.55, 0.0), Vector3.FORWARD)
	assert_true(result.fired)
	assert_true(result.hit)
	assert_false(result.killed)
	assert_eq(bot.health.current_health, 100)


func test_reload_completion_publishes_ammo_for_hud() -> void:
	var weapon: Node3D = (load(WEAPON_PATH) as GDScript).new()
	weapon.definition = load(AWP_PATH)
	add_child_autofree(weapon)
	weapon.state.ammo = 1
	weapon.state.reserve = 3
	watch_signals(weapon)
	assert_true(weapon.reload())
	weapon._process(3.1)
	assert_signal_emitted_with_parameters(weapon, "ammo_changed", [4, 0])
