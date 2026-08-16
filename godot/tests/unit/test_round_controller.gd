extends GutTest

const CONTROLLER_PATH := "res://src/match/round_controller.gd"


func test_round_ends_after_99_seconds_and_scores_higher_kill_count() -> void:
	assert_true(ResourceLoader.exists(CONTROLLER_PATH), "RoundController must exist")
	if not ResourceLoader.exists(CONTROLLER_PATH):
		return
	var rounds: Node = (load(CONTROLLER_PATH) as GDScript).new()
	add_child_autofree(rounds)
	watch_signals(rounds)
	rounds.start_match()
	rounds.register_kill(&"P")
	rounds.register_kill(&"P")
	rounds.register_kill(&"B")
	rounds.advance(99.0)
	assert_eq(rounds.round_wins[&"P"], 1)
	assert_eq(rounds.round_wins[&"B"], 0)
	assert_signal_emitted_with_parameters(rounds, "round_ended", [&"P", 2, 1])


func test_equal_kills_end_round_as_draw_without_awarding_win() -> void:
	var rounds: Node = (load(CONTROLLER_PATH) as GDScript).new()
	add_child_autofree(rounds)
	watch_signals(rounds)
	rounds.start_match()
	rounds.register_kill(&"P")
	rounds.register_kill(&"B")
	rounds.advance(99.0)
	assert_eq(rounds.round_wins[&"P"], 0)
	assert_eq(rounds.round_wins[&"B"], 0)
	assert_signal_emitted_with_parameters(rounds, "round_ended", [&"", 1, 1])


func test_match_ends_when_team_wins_three_rounds() -> void:
	var rounds: Node = (load(CONTROLLER_PATH) as GDScript).new()
	add_child_autofree(rounds)
	watch_signals(rounds)
	rounds.start_match()
	for index in 3:
		rounds.register_kill(&"B")
		rounds.advance(99.0)
		if index < 2:
			rounds.start_next_round()
	assert_true(rounds.match_finished)
	assert_signal_emitted_with_parameters(rounds, "match_ended", [&"B"])
