extends GutTest

const MATCH_SCENE_PATH := "res://src/match/movement_match.tscn"
const MAIN_SCENE_PATH := "res://src/main/main.tscn"


func test_match_composes_player_awp_bot_and_combat_hud() -> void:
	var match_scene := (load(MATCH_SCENE_PATH) as PackedScene).instantiate()
	add_child_autofree(match_scene)
	assert_not_null(match_scene.get_node_or_null("Actors/Player/CameraPivot/Camera3D/Inventory/AWP"))
	assert_not_null(match_scene.get_node_or_null("Actors/Bots/caminhoneiro"))
	assert_eq(match_scene.get_node("Actors/Bots/caminhoneiro").position, Vector3(-9.0, 1.4, 42.0))

	var main := (load(MAIN_SCENE_PATH) as PackedScene).instantiate()
	add_child_autofree(main)
	assert_eq(main.get_node("GuiHost/HUD/Health").text, "VIDA 100")
	assert_eq(main.get_node("GuiHost/HUD/Ammo").text, "AWP 5 / 25")
	assert_false(main.get_node("GuiHost/HUD/Respawn").visible)
	main.player.set_scoped(true)
	assert_true(main.get_node("GuiHost/HUD/ScopeOverlay").visible)
	assert_false(main.get_node("GuiHost/Crosshair").visible)


func test_bot_respawns_after_legacy_delay() -> void:
	var bot := (load("res://src/actors/combat_bot.tscn") as PackedScene).instantiate()
	add_child_autofree(bot)
	bot.respawn_delay = 0.05
	assert_true(bot.take_damage(400, null, true))
	assert_false(bot.alive)
	await wait_seconds(0.08)
	assert_true(bot.alive)
	assert_eq(bot.health.current_health, 100)


func test_player_awp_completes_headshot_death_cycle() -> void:
	var match_scene := (load(MATCH_SCENE_PATH) as PackedScene).instantiate()
	add_child_autofree(match_scene)
	var player := match_scene.get_node("Actors/Player")
	var bot: CombatBot = match_scene.get_node("MatchController").bot
	await wait_physics_frames(3)
	player.set_scoped(true)
	var origin: Vector3 = player.camera.global_position
	var target: Vector3 = bot.global_position + Vector3(0.0, 1.55, 0.0)
	var result: Dictionary = player.weapon.fire(origin, origin.direction_to(target), player)

	assert_true(result.headshot)
	assert_true(result.killed)
	assert_false(bot.alive)
	assert_almost_eq(bot.respawn_remaining, 2.5, 0.05)


func test_spawn_crosshair_has_clear_headshot_line_to_first_opponent() -> void:
	var match_scene := (load(MATCH_SCENE_PATH) as PackedScene).instantiate()
	add_child_autofree(match_scene)
	var player := match_scene.get_node("Actors/Player")
	var bot: CombatBot = match_scene.get_node("MatchController").bot
	await wait_physics_frames(3)
	player.set_scoped(true)
	var result: Dictionary = player.weapon.fire(
		player.camera.global_position, -player.camera.global_transform.basis.z, player
	)
	assert_true(result.hit, "Crosshair must not point into an empty lane")
	assert_eq(result.collider, bot.head_hitbox, "Spawn sightline must resolve to the first opponent")
	assert_true(result.headshot)
	assert_true(result.killed)


func test_player_death_restores_health_and_movement_after_respawn() -> void:
	var match_scene := (load(MATCH_SCENE_PATH) as PackedScene).instantiate()
	add_child_autofree(match_scene)
	var player := match_scene.get_node("Actors/Player")
	player.respawn_delay = 0.05
	assert_true(player.take_damage(400, match_scene.get_node("MatchController").bot, false))
	assert_false(player.accepts_input)
	await wait_seconds(0.08)
	assert_eq(player.health.current_health, 100)
	assert_true(player.accepts_input)
	assert_eq(player.velocity, Vector3.ZERO)


func test_bot_reacts_and_applies_legacy_damage_to_exposed_player() -> void:
	var match_scene := (load(MATCH_SCENE_PATH) as PackedScene).instantiate()
	add_child_autofree(match_scene)
	var player := match_scene.get_node("Actors/Player")
	var controller: CombatMatch = match_scene.get_node("MatchController")
	controller.opening_engagement_grace_seconds = 0.1
	var exposed_bot: CombatBot = controller.bot
	exposed_bot.movement_speed = 0.0
	for actor in controller.actors():
		if actor is CombatBot:
			actor.movement_speed = 0.0
			if actor != exposed_bot:
				actor.reaction_seconds = 100.0
	player.input_session_active = true
	await wait_physics_frames(1)
	assert_eq(exposed_bot.target_actor, player)
	var sight_query := PhysicsRayQueryParameters3D.create(
		exposed_bot.target_point(), player.target_point()
	)
	sight_query.exclude = [exposed_bot.get_rid(), exposed_bot.head_hitbox.get_rid()]
	sight_query.collide_with_areas = true
	var sight: Dictionary = exposed_bot.get_world_3d().direct_space_state.intersect_ray(sight_query)
	assert_eq(sight.get("collider"), player)
	await wait_physics_frames(65)
	assert_eq(player.health.current_health, 58)
	assert_true(player.accepts_input)
