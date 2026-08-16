extends GutTest

const MAIN_SCENE := preload("res://src/main/main.tscn")


func after_each() -> void:
	get_tree().paused = false


func test_menu_selects_b_team_character_and_builds_balanced_match() -> void:
	var main := MAIN_SCENE.instantiate()
	add_child_autofree(main)
	await wait_process_frames(2)
	assert_eq(main.ui.state, &"main_menu")
	assert_false(main.hud.visible)
	main.ui.nickname_edit.text = "Teste"
	main.ui.begin_team_selection()
	assert_eq(main.ui.state, &"team_select")
	main.ui.choose_team(&"B")
	assert_eq(main.ui.state, &"character_select")
	main.ui.select_character_by_id(&"senhora")
	main.ui.confirm_selection()
	await wait_process_frames(2)

	assert_eq(main.ui.state, &"playing")
	assert_true(main.hud.visible)
	assert_eq(main.player.team, &"B")
	assert_eq(main.player.actor_id, &"senhora")
	assert_eq(main.player.display_name, "Teste")
	assert_eq(main.match_controller.team_members(&"P").size(), 4)
	assert_eq(main.match_controller.team_members(&"B").size(), 4)


func test_pause_resume_and_menu_return_control_tree_and_screens() -> void:
	var main := MAIN_SCENE.instantiate()
	add_child_autofree(main)
	await wait_process_frames(2)
	main.ui.choose_team(&"P")
	main.ui.select_character_by_id(&"mst")
	main.ui.confirm_selection()
	await wait_process_frames(2)
	main.pause_game()
	assert_true(get_tree().paused)
	assert_eq(main.ui.state, &"paused")
	assert_false(main.hud.visible)
	main._resume_game()
	assert_false(get_tree().paused)
	assert_eq(main.ui.state, &"playing")
	main._return_to_menu()
	assert_eq(main.ui.state, &"main_menu")
	assert_false(main.hud.visible)


func test_hud_presents_radar_hit_damage_death_and_round_feedback() -> void:
	var main := MAIN_SCENE.instantiate()
	add_child_autofree(main)
	await wait_process_frames(2)
	main.ui.choose_team(&"P")
	main.ui.confirm_selection()
	await wait_process_frames(2)
	main.radar.set_radar_state(main.match_controller.current_radar_state())
	assert_eq(main.radar.blips.size(), 8)
	assert_eq(main.radar.normalized_position(Vector3(-27.0, 0.0, -47.0)), Vector2.ZERO)

	var enemy: Node3D = main.match_controller.team_members(&"B")[0]
	main.player.shot_fired.emit({"hit": true, "killed": false})
	assert_true(main.hitmarker.visible)
	main.player.take_damage(10, enemy, false)
	assert_true(main.damage_vignette.visible)
	main.player.take_damage(500, enemy, true)
	assert_true(main.death_overlay.visible)
	main.match_controller.rounds.advance(99.0)
	assert_true(main.round_banner.visible)


func test_radio_menu_logs_selection_and_routes_team_voice() -> void:
	var main := MAIN_SCENE.instantiate()
	add_child_autofree(main)
	await wait_process_frames(2)
	main.ui.choose_team(&"P")
	main.ui.confirm_selection()
	await wait_process_frames(2)

	main._open_radio(&"z")
	assert_true(main.radio_menu.visible)
	assert_true(main.player.input_overlay_active)
	main._select_radio_message(1)
	assert_false(main.radio_menu.visible)
	assert_true(main.radio_log.visible)
	assert_string_contains(main.radio_log.text, "(RÁDIO): Bora, bora, bora!")
	assert_eq(main.audio.latest_event().event, &"radio")


func test_match_lifecycle_records_analytics_domain_events() -> void:
	var main := MAIN_SCENE.instantiate()
	add_child_autofree(main)
	await wait_process_frames(2)
	main.ui.choose_team(&"B")
	main.ui.select_character_by_id(&"senhora")
	main.ui.confirm_selection()
	await wait_process_frames(2)
	assert_eq(main.analytics_history[0].name, &"game_start")
	assert_eq(main.analytics_history[0].data.team, "B")

	main.match_controller.rounds.match_ended.emit(&"B")
	assert_eq(main.analytics_history[1].name, &"match_end")
	assert_eq(main.analytics_history[1].data.winner, "B")
