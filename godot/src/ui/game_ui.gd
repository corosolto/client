class_name GameUI
extends Control

signal start_requested(team: StringName, character_id: StringName, nickname: String)
signal resume_requested
signal quit_requested
signal rematch_requested
signal settings_saved

const FLOW_SCRIPT := preload("res://src/ui/menu_flow.gd")
const SETTINGS_SCRIPT := preload("res://src/ui/game_settings.gd")
const CHARACTER_FACTORY_SCRIPT := preload("res://src/procedural/character_visual_factory.gd")

@onready var backdrop: ColorRect = $Backdrop
@onready var main_menu: Control = $MainMenu
@onready var team_select: Control = $TeamSelect
@onready var character_select: Control = $CharacterSelect
@onready var settings_panel: Control = $Settings
@onready var how_to: Control = $HowTo
@onready var pause_menu: Control = $Pause
@onready var match_end: Control = $MatchEnd
@onready var nickname_edit: LineEdit = $MainMenu/Panel/Content/Nickname
@onready var character_options: OptionButton = $CharacterSelect/Panel/Content/CharacterOptions
@onready var character_name: Label = $CharacterSelect/Panel/Content/CharacterName
@onready var preview_world: Node3D = $CharacterSelect/Panel/Content/Preview/SubViewport/PreviewWorld
@onready var preview_camera: Camera3D = $CharacterSelect/Panel/Content/Preview/SubViewport/Camera3D
@onready var sensitivity: HSlider = $Settings/Panel/Content/Sensitivity
@onready var sensitivity_value: Label = $Settings/Panel/Content/SensitivityValue
@onready var volume: HSlider = $Settings/Panel/Content/Volume
@onready var volume_value: Label = $Settings/Panel/Content/VolumeValue
@onready var quality: OptionButton = $Settings/Panel/Content/Quality
@onready var match_title: Label = $MatchEnd/Panel/Content/Title

var flow: MenuFlow = FLOW_SCRIPT.new()
var settings: GameSettings = SETTINGS_SCRIPT.new()
var _character_factory: CharacterVisualFactory = CHARACTER_FACTORY_SCRIPT.new()
var _preview_model: Node3D

var state: StringName:
	get:
		return flow.state


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	settings.load()
	flow.state_changed.connect(_render_state)
	_connect_controls()
	_initialize_settings_controls()
	nickname_edit.text = settings.nickname
	preview_camera.look_at_from_position(Vector3(0.0, 1.25, 3.4), Vector3(0.0, 0.95, 0.0))
	_render_state(flow.state)


func _process(delta: float) -> void:
	if _preview_model != null and character_select.visible:
		_preview_model.rotation.y += delta * 0.8


func begin_team_selection() -> void:
	flow.begin_team_selection()


func choose_team(team: StringName) -> void:
	flow.select_team(team)
	_populate_characters(team)


func select_character_by_id(character_id: StringName) -> void:
	for index in character_options.item_count:
		if StringName(character_options.get_item_metadata(index)) == character_id:
			character_options.select(index)
			_on_character_selected(index)
			return


func confirm_selection() -> void:
	flow.start_match()
	settings.nickname = nickname_edit.text
	settings.save()
	start_requested.emit(flow.selected_team, flow.selected_character, settings.nickname)


func show_pause() -> void:
	flow.pause()


func show_match_end(winner: StringName) -> void:
	match_title.text = "%s VENCERAM!" % ("PETISTAS" if winner == &"P" else "BOLSONARISTAS")
	flow.end_match(winner)


func show_main_menu() -> void:
	flow.return_to_menu()


func mark_playing() -> void:
	flow.start_match()


func persisted_state() -> Dictionary:
	return settings.to_dictionary()


func _connect_controls() -> void:
	$MainMenu/Panel/Content/Play.pressed.connect(begin_team_selection)
	$MainMenu/Panel/Content/HowTo.pressed.connect(flow.show_how_to)
	$MainMenu/Panel/Content/Settings.pressed.connect(flow.open_settings)
	$TeamSelect/Panel/Content/Petistas.pressed.connect(choose_team.bind(&"P"))
	$TeamSelect/Panel/Content/Bolsonaristas.pressed.connect(choose_team.bind(&"B"))
	$TeamSelect/Panel/Content/Back.pressed.connect(flow.back_to_main)
	$CharacterSelect/Panel/Content/Confirm.pressed.connect(confirm_selection)
	$CharacterSelect/Panel/Content/Back.pressed.connect(flow.back_to_team_selection)
	character_options.item_selected.connect(_on_character_selected)
	$Settings/Panel/Content/Save.pressed.connect(_save_settings_and_close)
	$HowTo/Panel/Content/Back.pressed.connect(flow.back_to_main)
	$Pause/Panel/Content/Resume.pressed.connect(_resume)
	$Pause/Panel/Content/Settings.pressed.connect(flow.open_settings)
	$Pause/Panel/Content/Quit.pressed.connect(func() -> void: quit_requested.emit())
	$MatchEnd/Panel/Content/Rematch.pressed.connect(func() -> void: rematch_requested.emit())
	$MatchEnd/Panel/Content/Menu.pressed.connect(func() -> void: quit_requested.emit())
	nickname_edit.text_changed.connect(_on_nickname_changed)
	sensitivity.value_changed.connect(_on_sensitivity_changed)
	volume.value_changed.connect(_on_volume_changed)


func _initialize_settings_controls() -> void:
	quality.clear()
	for label in ["Batata", "Média", "Padrão ouro"]:
		quality.add_item(label)
	quality.set_item_metadata(0, &"low")
	quality.set_item_metadata(1, &"med")
	quality.set_item_metadata(2, &"high")
	sensitivity.value = settings.mouse_sensitivity
	volume.value = settings.volume
	for index in quality.item_count:
		if StringName(quality.get_item_metadata(index)) == settings.quality:
			quality.select(index)
	_update_settings_labels()


func _populate_characters(team: StringName) -> void:
	character_options.clear()
	for definition in _character_factory.definitions():
		if StringName(definition.team) != team:
			continue
		character_options.add_item(String(definition.name))
		character_options.set_item_metadata(character_options.item_count - 1, definition.id)
	_on_character_selected(0)


func _on_character_selected(index: int) -> void:
	if index < 0 or index >= character_options.item_count:
		return
	var character_id := StringName(character_options.get_item_metadata(index))
	flow.select_character(character_id)
	var definition := _character_factory.definition(character_id)
	character_name.text = "%s · %s" % [definition.name, "PETISTAS" if definition.team == &"P" else "BOLSONARISTAS"]
	_preview_model = _character_factory.build_into(preview_world, character_id)


func _on_nickname_changed(value: String) -> void:
	settings.nickname = value
	settings.save()


func _on_sensitivity_changed(value: float) -> void:
	settings.mouse_sensitivity = value
	_update_settings_labels()


func _on_volume_changed(value: float) -> void:
	settings.volume = value
	_update_settings_labels()


func _save_settings_and_close() -> void:
	settings.quality = StringName(quality.get_item_metadata(quality.selected))
	settings.save()
	settings_saved.emit()
	flow.close_settings()


func _resume() -> void:
	flow.resume()
	resume_requested.emit()


func _update_settings_labels() -> void:
	sensitivity_value.text = "%.1f" % settings.mouse_sensitivity
	volume_value.text = "%d%%" % roundi(settings.volume * 100.0)


func _render_state(next_state: StringName) -> void:
	var screens: Array[Control] = [
		main_menu, team_select, character_select, settings_panel, how_to, pause_menu, match_end
	]
	for screen in screens:
		screen.visible = false
	var selected_screen: Control
	match next_state:
		&"main_menu": selected_screen = main_menu
		&"team_select": selected_screen = team_select
		&"character_select": selected_screen = character_select
		&"settings": selected_screen = settings_panel
		&"how_to": selected_screen = how_to
		&"paused": selected_screen = pause_menu
		&"match_end": selected_screen = match_end
	visible = next_state != &"playing"
	backdrop.visible = visible
	if selected_screen != null:
		selected_screen.visible = true
	match next_state:
		&"main_menu": $MainMenu/Panel/Content/Play.grab_focus.call_deferred()
		&"team_select": $TeamSelect/Panel/Content/Petistas.grab_focus.call_deferred()
		&"character_select": character_options.grab_focus.call_deferred()
		&"settings": sensitivity.grab_focus.call_deferred()
		&"how_to": $HowTo/Panel/Content/Back.grab_focus.call_deferred()
		&"paused": $Pause/Panel/Content/Resume.grab_focus.call_deferred()
		&"match_end": $MatchEnd/Panel/Content/Rematch.grab_focus.call_deferred()
