extends GutTest

const MATCH_SCENE_PATH := "res://src/match/movement_match.tscn"
const MAIN_SCENE_PATH := "res://src/main/main.tscn"


func test_match_uses_godot_scene_composition_and_builds_complete_rosters() -> void:
	var match_scene := (load(MATCH_SCENE_PATH) as PackedScene).instantiate()
	add_child_autofree(match_scene)
	await wait_process_frames(2)

	assert_not_null(match_scene.get_node_or_null("Arena"))
	assert_not_null(match_scene.get_node_or_null("Actors/Player"))
	assert_not_null(match_scene.get_node_or_null("Actors/Bots"))
	assert_not_null(match_scene.get_node_or_null("Effects"))
	assert_not_null(match_scene.get_node_or_null("MatchController"))
	assert_true(match_scene.get_node("RoundController") is RoundController)

	var controller := match_scene.get_node("MatchController") as CombatMatch
	var actors: Array = controller.actors()
	assert_eq(actors.size(), 8)
	assert_eq(controller.team_members(&"P").size(), 4)
	assert_eq(controller.team_members(&"B").size(), 4)
	var actor_ids: Dictionary = {}
	var visual_signatures: Dictionary = {}
	for actor in actors:
		actor_ids[actor.actor_id] = true
		if actor is CombatBot:
			var generated_visual: Node3D = actor.visuals.get_child(0)
			visual_signatures[generated_visual.get_meta("procedural_signature")] = true
	assert_eq(actor_ids.size(), 8, "Every roster entry needs a stable unique id")
	assert_eq(visual_signatures.size(), 7, "Every bot must use its distinct procedural visual")


func test_death_updates_round_score_player_stats_and_killfeed() -> void:
	var match_scene := (load(MATCH_SCENE_PATH) as PackedScene).instantiate()
	add_child_autofree(match_scene)
	await wait_process_frames(2)
	var controller := match_scene.get_node("MatchController") as CombatMatch
	var player := controller.player
	var enemy: Node3D = controller.team_members(&"B")[0]
	watch_signals(controller)

	enemy.take_damage(400, player, true)

	assert_eq(controller.rounds.round_kills[&"P"], 1)
	assert_eq(player.kills, 1)
	assert_eq(enemy.deaths, 1)
	assert_signal_emitted(controller, "killfeed_event")


func test_round_reset_restores_all_actors_at_their_team_spawns() -> void:
	var match_scene := (load(MATCH_SCENE_PATH) as PackedScene).instantiate()
	add_child_autofree(match_scene)
	await wait_process_frames(2)
	var controller := match_scene.get_node("MatchController") as CombatMatch
	var enemy: Node3D = controller.team_members(&"B")[0]
	enemy.take_damage(400, controller.player, false)
	controller.rounds.advance(99.0)
	controller.start_next_round_now()

	assert_true(enemy.alive)
	assert_eq(enemy.health.current_health, 100)
	assert_eq(enemy.global_position, enemy.spawn_position)
	assert_eq(controller.rounds.round_number, 2)


func test_main_presents_round_score_killfeed_and_scoreboard() -> void:
	var main := (load(MAIN_SCENE_PATH) as PackedScene).instantiate()
	add_child_autofree(main)
	await wait_process_frames(2)
	assert_eq(main.get_node("GuiHost/HUD/RoundTimer").text, "1:39")
	assert_eq(main.get_node("GuiHost/HUD/TeamScore").text, "P 0 (0)  ×  (0) 0 B")
	assert_false(main.get_node("GuiHost/HUD/Scoreboard").visible)

	var controller: CombatMatch = main.match_controller
	var enemy: Node3D = controller.team_members(&"B")[0]
	enemy.take_damage(400, controller.player, true)
	assert_string_contains(main.get_node("GuiHost/HUD/Killfeed").text, "Jogador")
	assert_string_contains(main.get_node("GuiHost/HUD/Killfeed").text, enemy.display_name)
	main.set_scoreboard_visible(true)
	assert_true(main.get_node("GuiHost/HUD/Scoreboard").visible)
	assert_string_contains(main.get_node("GuiHost/HUD/Scoreboard/Rows").text, "K/D")


func test_accelerated_match_reaches_three_round_victory() -> void:
	var match_scene := (load(MATCH_SCENE_PATH) as PackedScene).instantiate()
	add_child_autofree(match_scene)
	await wait_process_frames(2)
	var controller := match_scene.get_node("MatchController") as CombatMatch
	for index in 3:
		controller.rounds.register_kill(&"P")
		controller.rounds.advance(99.0)
		if index < 2:
			controller.start_next_round_now()
	assert_true(controller.rounds.match_finished)
	assert_eq(controller.rounds.round_wins[&"P"], 3)
	assert_eq(controller.current_match_state().finished, true)


func test_waypoint_bot_routes_without_entering_center_obstacle() -> void:
	var match_scene := (load(MATCH_SCENE_PATH) as PackedScene).instantiate()
	add_child_autofree(match_scene)
	await wait_physics_frames(3)
	var controller := match_scene.get_node("MatchController") as CombatMatch
	var moving_bot: CombatBot = match_scene.get_node("Actors/Bots/sertanejo")
	for actor in controller.actors():
		if actor is CombatBot:
			actor.movement_speed = 0.0
			actor.reaction_seconds = 100.0
	moving_bot.movement_speed = 3.3
	controller.player.input_session_active = true
	for frame in 240:
		await wait_physics_frames(1)
		var inside_obstacle := (
			absf(moving_bot.global_position.x) < 1.85
			and absf(moving_bot.global_position.z) < 1.5
		)
		assert_false(inside_obstacle, "Bot crossed center obstacle at frame %d" % frame)
	assert_lt(moving_bot.global_position.z, 41.0, "Bot must make progress toward its target")
