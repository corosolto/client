extends GutTest

const FLOW_SCRIPT := preload("res://src/ui/menu_flow.gd")


func test_flow_covers_menu_team_character_play_pause_and_return() -> void:
	var flow: MenuFlow = FLOW_SCRIPT.new()
	assert_eq(flow.state, &"main_menu")
	flow.begin_team_selection()
	assert_eq(flow.state, &"team_select")
	flow.select_team(&"B")
	assert_eq(flow.state, &"character_select")
	assert_eq(flow.selected_team, &"B")
	flow.select_character(&"sertanejo")
	flow.start_match()
	assert_eq(flow.state, &"playing")
	assert_eq(flow.selected_character, &"sertanejo")
	flow.pause()
	assert_eq(flow.state, &"paused")
	flow.resume()
	assert_eq(flow.state, &"playing")
	flow.end_match(&"B")
	assert_eq(flow.state, &"match_end")
	assert_eq(flow.winner, &"B")
	flow.return_to_menu()
	assert_eq(flow.state, &"main_menu")


func test_settings_returns_to_the_screen_that_opened_it() -> void:
	var flow: MenuFlow = FLOW_SCRIPT.new()
	flow.open_settings()
	assert_eq(flow.state, &"settings")
	flow.close_settings()
	assert_eq(flow.state, &"main_menu")
	flow.begin_team_selection()
	flow.select_team(&"P")
	flow.select_character(&"mst")
	flow.start_match()
	flow.pause()
	flow.open_settings()
	flow.close_settings()
	assert_eq(flow.state, &"paused")
