extends Node

const MATCH_SCENE := preload("res://src/match/movement_match.tscn")
const RADIO_SCRIPT := preload("res://src/audio/radio_controller.gd")
const BASE_MOUSE_SENSITIVITY := 0.002

@onready var world_host: Node3D = $WorldHost
@onready var ui: GameUI = $GuiHost/CurrentScreen
@onready var hud: Control = $GuiHost/HUD
@onready var health_label: Label = $GuiHost/HUD/Health
@onready var ammo_label: Label = $GuiHost/HUD/Ammo
@onready var respawn_label: Label = $GuiHost/HUD/Respawn
@onready var round_timer_label: Label = $GuiHost/HUD/RoundTimer
@onready var team_score_label: Label = $GuiHost/HUD/TeamScore
@onready var killfeed_label: Label = $GuiHost/HUD/Killfeed
@onready var scoreboard: ColorRect = $GuiHost/HUD/Scoreboard
@onready var scoreboard_rows: Label = $GuiHost/HUD/Scoreboard/Rows
@onready var scope_overlay: ColorRect = $GuiHost/HUD/ScopeOverlay
@onready var crosshair: Label = $GuiHost/Crosshair
@onready var radar: RadarControl = $GuiHost/HUD/Radar
@onready var damage_vignette: ColorRect = $GuiHost/HUD/DamageVignette
@onready var hitmarker: Label = $GuiHost/HUD/Hitmarker
@onready var round_banner: Label = $GuiHost/HUD/RoundBanner
@onready var multikill_label: Label = $GuiHost/HUD/Multikill
@onready var death_overlay: Label = $GuiHost/HUD/DeathOverlay
@onready var radio_menu: Label = $GuiHost/HUD/RadioMenu
@onready var radio_log: Label = $GuiHost/HUD/RadioLog
@onready var audio: Node = $AudioService

var player: PlayerController
var match_controller: CombatMatch
var analytics_history: Array[Dictionary] = []
var _web_state_elapsed: float = 0.0
var _radar_elapsed: float = 0.0
var _hitmarker_remaining: float = 0.0
var _damage_remaining: float = 0.0
var _banner_remaining: float = 0.0
var _multikill_remaining: float = 0.0
var _multikill_count: int = 0
var _last_health: int = 100
var _radio: RefCounted = RADIO_SCRIPT.new()
var _last_radio_message: String = ""
var _radio_log_remaining: float = 0.0


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	$GuiHost/BootPanel.visible = false
	_bind_match($WorldHost/Match/MatchController)
	ui.start_requested.connect(_start_game)
	ui.resume_requested.connect(_resume_game)
	ui.quit_requested.connect(_return_to_menu)
	ui.rematch_requested.connect(_rematch)
	ui.settings_saved.connect(_apply_settings)
	audio.set_volume(ui.settings.volume)
	hud.visible = false
	crosshair.visible = false
	if OS.has_feature("web"):
		JavaScriptBridge.eval("window.__csbrasilGodotReady = true; window.__csbrasilPlayerState = {};")
		var auto_selection: Variant = JavaScriptBridge.eval(
			"(new URLSearchParams(location.search)).get('auto') || ''"
		)
		if auto_selection is String and not auto_selection.is_empty():
			var selection: PackedStringArray = String(auto_selection).split(",")
			var team: StringName = StringName(selection[0]) if selection.size() > 0 else &"P"
			var character: StringName = StringName(selection[1]) if selection.size() > 1 else &"esquerdomacho"
			_start_game(team, character, ui.settings.nickname)


func _process(delta: float) -> void:
	_update_feedback(delta)
	if not OS.has_feature("web") or match_controller == null:
		return
	_web_state_elapsed += delta
	if _web_state_elapsed < 0.1:
		return
	_web_state_elapsed = 0.0
	var match_state := match_controller.current_match_state()
	var procedural_state := match_controller.current_procedural_state()
	var persisted := ui.persisted_state()
	JavaScriptBridge.eval(
		"window.__csbrasilPlayerState={x:%f,y:%f,z:%f,crouch:%f,captured:%s,health:%d,weaponId:'%s',ammo:%d,reserve:%d,scoped:%s,botAlive:%s,botRespawn:%f,actorCount:%d,petistasCount:%d,bolsonaristasCount:%d,round:%d,roundSeconds:%f,petistasKills:%d,bolsonaristasKills:%d,scoreboardVisible:%s,arenaSignature:'%s',arenaGeometryCount:%d,proceduralMaterialCount:%d,visualSignatureCount:%d,uiState:'%s',nickname:%s,mouseSensitivity:%f,volume:%f,quality:'%s',fps:%d,selectedTeam:'%s',selectedCharacter:'%s'};" % [
			player.position.x,
			player.position.y,
			player.position.z,
			player.crouch_fraction,
			"true" if player.input_session_active else "false",
			player.health.current_health,
			player.weapon.definition.weapon_id,
			player.weapon_inventory.current_ammo().x,
			player.weapon_inventory.current_ammo().y,
			"true" if player.scoped else "false",
			"true" if match_controller.bot.alive else "false",
			match_controller.bot.respawn_remaining,
			match_controller.actors().size(),
			match_controller.team_members(&"P").size(),
			match_controller.team_members(&"B").size(),
			int(match_state.round),
			float(match_state.seconds),
			int(match_state.petistas_kills),
			int(match_state.bolsonaristas_kills),
			"true" if scoreboard.visible else "false",
			String(procedural_state.arena_signature),
			int(procedural_state.geometry_count),
			int(procedural_state.material_count),
			int(procedural_state.visual_signature_count),
			String(ui.state),
			JSON.stringify(String(persisted.nickname)),
			float(persisted.mouse_sensitivity),
			float(persisted.volume),
			String(persisted.quality),
			Engine.get_frames_per_second(),
			String(ui.flow.selected_team),
			String(ui.flow.selected_character),
		]
	)
	var last_audio: Dictionary = audio.latest_event()
	JavaScriptBridge.eval(
		"Object.assign(window.__csbrasilPlayerState,{radioOpen:'%s',lastRadio:%s,audioEvent:'%s',audioSource:'%s',audioVolume:%f});" % [
			String(_radio.current_category), JSON.stringify(_last_radio_message),
			String(last_audio.get("event", "")), String(last_audio.get("source", "")), audio.volume
		]
	)


func _input(event: InputEvent) -> void:
	if not event is InputEventKey or not event.pressed:
		return
	if _radio.is_open():
		var number := {KEY_1: 1, KEY_2: 2, KEY_3: 3}.get(event.keycode, 0) as int
		if number > 0:
			_select_radio_message(number)
			return
		if event.keycode == KEY_ESCAPE:
			_close_radio()
			return
	if event.keycode == KEY_TAB and ui.state == &"playing":
		set_scoreboard_visible(true)
	elif event.keycode == KEY_ESCAPE:
		if ui.state == &"playing":
			pause_game()
		elif ui.state == &"paused":
			_resume_game()
	elif ui.state == &"playing" and player.alive:
		var category := {KEY_Z: &"z", KEY_X: &"x", KEY_C: &"c"}.get(event.keycode, &"") as StringName
		if not category.is_empty():
			_open_radio(category)


func _unhandled_key_input(event: InputEvent) -> void:
	if event.keycode == KEY_TAB and not event.pressed:
		set_scoreboard_visible(false)


func pause_game() -> void:
	if ui.state != &"playing":
		return
	player.release_pointer()
	_close_radio()
	ui.show_pause()
	hud.visible = false
	crosshair.visible = false
	get_tree().paused = true


func set_scoreboard_visible(active: bool) -> void:
	scoreboard.visible = active
	if active:
		_refresh_scoreboard()


func _start_game(team: StringName, character_id: StringName, nickname: String) -> void:
	get_tree().paused = false
	var previous := world_host.get_node_or_null("Match")
	if previous != null:
		world_host.remove_child(previous)
		previous.free()
	var match_root := MATCH_SCENE.instantiate() as Node3D
	match_root.name = "Match"
	var controller := match_root.get_node("MatchController") as CombatMatch
	controller.configure_player_selection(team, character_id, nickname)
	world_host.add_child(match_root)
	_bind_match(controller)
	_apply_settings()
	audio.unlock()
	ui.flow.selected_team = team
	ui.flow.selected_character = character_id
	ui.mark_playing()
	hud.visible = true
	crosshair.visible = true
	audio.play_event(&"roundstart")
	_track_analytics(&"game_start", {
		"team": String(team), "character": String(character_id), "nickname_set": not nickname.is_empty()
	})


func _bind_match(controller: CombatMatch) -> void:
	match_controller = controller
	player = controller.player
	match_controller.hud_updated.connect(_on_hud_updated)
	match_controller.bot_state_changed.connect(_on_bot_state_changed)
	match_controller.match_state_changed.connect(_on_match_state_changed)
	match_controller.killfeed_event.connect(_on_killfeed_event)
	match_controller.rounds.match_ended.connect(_on_match_ended)
	match_controller.rounds.round_started.connect(_on_round_started)
	match_controller.rounds.round_ended.connect(_on_round_ended)
	player.shot_fired.connect(_on_player_shot_fired)
	player.scope_changed.connect(_on_scope_audio)
	player.health_changed.connect(_on_player_health_changed)
	player.died.connect(_on_player_died)
	player.respawned.connect(_on_player_respawned)
	player.weapon_inventory.reload_started.connect(_on_reload_started)
	player.weapon_inventory.weapon_changed.connect(_on_weapon_audio_changed)
	_last_health = player.health.current_health
	var current_hud := match_controller.current_hud()
	_on_hud_updated(
		current_hud.health,
		current_hud.weapon_name,
		current_hud.ammo,
		current_hud.reserve,
		current_hud.scoped
	)
	_on_match_state_changed(match_controller.current_match_state())
	_refresh_scoreboard()
	_on_round_started(match_controller.rounds.round_number, match_controller.rounds.time_remaining)


func _apply_settings() -> void:
	audio.set_volume(ui.settings.volume)
	if player == null or match_controller == null:
		return
	player.movement_config.mouse_sensitivity = (
		BASE_MOUSE_SENSITIVITY * ui.settings.mouse_sensitivity
	)
	var sun := match_controller.arena.get_node("Sun") as DirectionalLight3D
	sun.shadow_enabled = ui.settings.quality != &"low"


func _resume_game() -> void:
	get_tree().paused = false
	if ui.state == &"paused":
		ui.flow.resume()
	hud.visible = true
	crosshair.visible = not player.scoped
	player.capture_pointer()


func _return_to_menu() -> void:
	get_tree().paused = false
	player.release_pointer()
	_close_radio()
	ui.show_main_menu()
	hud.visible = false
	crosshair.visible = false
	set_scoreboard_visible(false)


func _rematch() -> void:
	_start_game(
		ui.flow.selected_team,
		ui.flow.selected_character,
		ui.settings.nickname
	)


func _on_match_ended(winner: StringName) -> void:
	audio.play_event(&"matchwin")
	_track_analytics(&"match_end", {
		"winner": String(winner),
		"rounds_p": int(match_controller.rounds.round_wins[&"P"]),
		"rounds_b": int(match_controller.rounds.round_wins[&"B"]),
	})
	player.release_pointer()
	hud.visible = false
	crosshair.visible = false
	ui.show_match_end(winner)
	get_tree().paused = true


func _on_hud_updated(
	health: int, weapon_name: String, ammo: int, reserve: int, scoped: bool
) -> void:
	health_label.text = "VIDA %d" % health
	ammo_label.text = weapon_name if ammo < 0 else "%s %d / %d" % [weapon_name, ammo, reserve]
	scope_overlay.visible = scoped
	if ui != null and ui.state == &"playing":
		crosshair.visible = not scoped


func _on_bot_state_changed(alive: bool, remaining: float) -> void:
	respawn_label.visible = not alive
	if not alive:
		respawn_label.text = "INIMIGO REAPARECE EM %.1f" % remaining


func _on_match_state_changed(state: Dictionary) -> void:
	var total_seconds := ceili(float(state.seconds))
	round_timer_label.text = "%d:%02d" % [total_seconds / 60, total_seconds % 60]
	team_score_label.text = "P %d (%d)  ×  (%d) %d B" % [
		int(state.petistas_kills),
		int(state.petistas_wins),
		int(state.bolsonaristas_wins),
		int(state.bolsonaristas_kills),
	]
	if scoreboard.visible:
		_refresh_scoreboard()


func _on_killfeed_event(killer_name: String, victim_name: String, headshot: bool) -> void:
	killfeed_label.text = "%s  %s  %s" % [killer_name, "🎯" if headshot else "✦", victim_name]
	if killer_name == player.display_name:
		if headshot:
			audio.play_event(&"headshot")
		audio.play_voice(player.team)
		_multikill_count = _multikill_count + 1 if _multikill_remaining > 0.0 else 1
		_multikill_remaining = 4.0
		if _multikill_count >= 2:
			var tiers := [&"", &"", &"doublekill", &"triplekill", &"multikill"]
			audio.play_event(tiers[mini(_multikill_count, 4)])
			multikill_label.text = ["", "", "DUPLO!", "TRIPLO!", "QUADRA!"][mini(_multikill_count, 4)]
			multikill_label.visible = true
	_refresh_scoreboard()


func _on_player_shot_fired(result: Dictionary) -> void:
	if bool(result.get("fired", false)):
		var weapon_id: StringName = player.weapon.definition.weapon_id
		audio.play_event(&"knifehit" if weapon_id == &"knife" and bool(result.get("hit", false)) else weapon_id)
	if not bool(result.get("hit", false)):
		return
	hitmarker.visible = true
	hitmarker.modulate = Color("ff4b4b") if bool(result.get("killed", false)) else Color.WHITE
	_hitmarker_remaining = 0.18


func _on_player_health_changed(current: int) -> void:
	if current < _last_health:
		audio.play_event(&"hurt")
		damage_vignette.visible = true
		_damage_remaining = 0.3
	_last_health = current


func _on_player_died(_source: Node, _headshot: bool) -> void:
	audio.play_event(&"death")
	death_overlay.visible = true


func _on_player_respawned() -> void:
	audio.play_event(&"respawn")
	death_overlay.visible = false
	_last_health = player.health.current_health


func _on_round_started(round_number: int, _seconds: float) -> void:
	if ui.state == &"playing":
		audio.play_event(&"roundstart")
	round_banner.text = "ROUND %d" % round_number
	round_banner.visible = true
	_banner_remaining = 2.0


func _on_round_ended(winner: StringName, petistas_kills: int, bolsonaristas_kills: int) -> void:
	if not winner.is_empty():
		audio.play_round(winner)
	round_banner.text = (
		"EMPATE · %d × %d" % [petistas_kills, bolsonaristas_kills]
		if winner.is_empty()
		else "%s VENCEM O ROUND · %d × %d" % [
			"PETISTAS" if winner == &"P" else "BOLSONARISTAS",
			petistas_kills,
			bolsonaristas_kills,
		]
	)
	round_banner.visible = true
	_banner_remaining = 2.0


func _update_feedback(delta: float) -> void:
	if match_controller == null:
		return
	_radar_elapsed += delta
	if _radar_elapsed >= 0.1:
		_radar_elapsed = 0.0
		radar.set_radar_state(match_controller.current_radar_state())
	_hitmarker_remaining = maxf(0.0, _hitmarker_remaining - delta)
	if _hitmarker_remaining <= 0.0:
		hitmarker.visible = false
	_damage_remaining = maxf(0.0, _damage_remaining - delta)
	if _damage_remaining <= 0.0:
		damage_vignette.visible = false
	_banner_remaining = maxf(0.0, _banner_remaining - delta)
	if _banner_remaining <= 0.0:
		round_banner.visible = false
	_multikill_remaining = maxf(0.0, _multikill_remaining - delta)
	if _multikill_remaining <= 0.0:
		_multikill_count = 0
		multikill_label.visible = false
	_radio_log_remaining = maxf(0.0, _radio_log_remaining - delta)
	if _radio_log_remaining <= 0.0:
		radio_log.visible = false
	if not player.alive:
		death_overlay.text = "ELIMINADO · RESPAWN EM %.1f" % player.respawn_remaining


func _open_radio(category: StringName) -> void:
	if not _radio.open(category):
		return
	player.input_overlay_active = true
	var lines: Array[String] = [_radio.title()]
	var items: Array = _radio.current_items()
	for index in items.size():
		lines.append("%d. %s" % [index + 1, items[index]])
	radio_menu.text = "\n".join(lines)
	radio_menu.visible = true
	audio.play_event(&"ui")


func _select_radio_message(number: int) -> void:
	var selection: Dictionary = _radio.select(number)
	if selection.is_empty():
		return
	_last_radio_message = String(selection.message)
	radio_log.text = "%s (RÁDIO): %s" % [player.display_name, _last_radio_message]
	radio_log.visible = true
	_radio_log_remaining = 4.2
	audio.play_radio(player.team)
	_close_radio()


func _close_radio() -> void:
	_radio.close()
	radio_menu.visible = false
	if player != null:
		(func() -> void: player.input_overlay_active = false).call_deferred()


func _on_scope_audio(active: bool) -> void:
	audio.play_event(&"scope" if active else &"scopeout")


func _on_reload_started(_weapon_id: StringName) -> void:
	audio.play_event(&"reload")


func _on_weapon_audio_changed(weapon_id: StringName, _name: String, _ammo: int, _reserve: int) -> void:
	if weapon_id == &"knife":
		audio.play_event(&"knifedeploy")


func _track_analytics(event_name: StringName, data: Dictionary) -> void:
	analytics_history.append({"name": event_name, "data": data.duplicate(true)})
	if analytics_history.size() > 16:
		analytics_history.pop_front()
	if OS.has_feature("web"):
		JavaScriptBridge.eval(
			"window.csbrasilTrack && window.csbrasilTrack(%s,%s);" % [
				JSON.stringify(String(event_name)), JSON.stringify(data)
			]
		)


func _refresh_scoreboard() -> void:
	if match_controller == null:
		return
	var lines: Array[String] = ["JOGADOR                 K/D"]
	for team in [&"P", &"B"]:
		lines.append("\nPETISTAS" if team == &"P" else "\nBOLSONARISTAS")
		for row in match_controller.scoreboard_rows():
			if StringName(row.team) == team:
				lines.append("%-20s %d/%d" % [row.name, row.kills, row.deaths])
	scoreboard_rows.text = "\n".join(lines)
