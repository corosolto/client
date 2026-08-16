class_name MenuFlow
extends RefCounted

signal state_changed(state: StringName)

var state: StringName = &"main_menu"
var selected_team: StringName = &"P"
var selected_character: StringName = &"esquerdomacho"
var winner: StringName = &""
var _settings_return_state: StringName = &"main_menu"


func begin_team_selection() -> void:
	_set_state(&"team_select")


func select_team(team: StringName) -> void:
	selected_team = team if team in [&"P", &"B"] else &"P"
	selected_character = &"esquerdomacho" if selected_team == &"P" else &"caminhoneiro"
	_set_state(&"character_select")


func select_character(character_id: StringName) -> void:
	selected_character = character_id


func back_to_team_selection() -> void:
	_set_state(&"team_select")


func back_to_main() -> void:
	_set_state(&"main_menu")


func start_match() -> void:
	winner = &""
	_set_state(&"playing")


func pause() -> void:
	if state == &"playing":
		_set_state(&"paused")


func resume() -> void:
	if state == &"paused":
		_set_state(&"playing")


func open_settings() -> void:
	_settings_return_state = state
	_set_state(&"settings")


func close_settings() -> void:
	_set_state(_settings_return_state)


func show_how_to() -> void:
	_set_state(&"how_to")


func end_match(winning_team: StringName) -> void:
	winner = winning_team
	_set_state(&"match_end")


func return_to_menu() -> void:
	winner = &""
	_set_state(&"main_menu")


func _set_state(next_state: StringName) -> void:
	state = next_state
	state_changed.emit(state)
