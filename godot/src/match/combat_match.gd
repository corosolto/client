class_name CombatMatch
extends Node

signal hud_updated(health: int, weapon_name: String, ammo: int, reserve: int, scoped: bool)
signal bot_state_changed(alive: bool, respawn_remaining: float)
signal killfeed_event(killer_name: String, victim_name: String, headshot: bool)
signal match_state_changed(state: Dictionary)

const BOT_SCENE := preload("res://src/actors/combat_bot.tscn")
const TARGET_SELECTOR := preload("res://src/ai/bot_target_selector.gd")
const CHARACTER_FACTORY := preload("res://src/procedural/character_visual_factory.gd")
const ACTOR_DEFINITIONS := [
	{"id": &"esquerdomacho", "name": "Esquerdomacho", "team": &"P", "spawn": Vector3(-9.0, 1.4, -42.0)},
	{"id": &"sindicato", "name": "Líder do Sindicato", "team": &"P", "spawn": Vector3(-3.0, 1.4, -42.0)},
	{ "id": &"mst", "name": "Líder do MST", "team": &"P", "spawn": Vector3(3.0, 1.4, -42.0) },
	{ "id": &"doutora", "name": "Doutora do SUS", "team": &"P", "spawn": Vector3(9.0, 1.4, -42.0) },
	{ "id": &"caminhoneiro", "name": "Caminhoneiro", "team": &"B", "spawn": Vector3(-9.0, 1.4, 42.0) },
	{ "id": &"influencer", "name": "Influencer de Dubai", "team": &"B", "spawn": Vector3(-3.0, 1.4, 42.0) },
	{ "id": &"sertanejo", "name": "Cantor Sertanejo", "team": &"B", "spawn": Vector3(3.0, 1.4, 42.0) },
	{ "id": &"senhora", "name": "Tia Zilá", "team": &"B", "spawn": Vector3(9.0, 1.4, 42.0) },
]

@onready var arena: ProceduralArena = $"../Arena"
@onready var player: PlayerController = $"../Actors/Player"
@onready var bots_host: Node3D = $"../Actors/Bots"
@onready var rounds: RoundController = $"../RoundController"

@export var opening_engagement_grace_seconds: float = 3.0

var bot: CombatBot
var _bots: Array[CombatBot] = []
var _selector: BotTargetSelector = TARGET_SELECTOR.new()
var _graph: WaypointGraph
var _character_factory: CharacterVisualFactory = CHARACTER_FACTORY.new()
var _think_remaining: float = 0.0
var _next_round_remaining: float = -1.0
var _combat_session_active: bool = false
var _engagement_grace_remaining: float = 0.0
var _selected_team: StringName = &"P"
var _selected_character: StringName = &"esquerdomacho"
var _selected_nickname: String = "Jogador"


func _ready() -> void:
	_graph = arena.create_waypoint_graph()
	_apply_player_selection()
	_build_rosters()
	_connect_actor(player)
	player.health_changed.connect(_on_player_health_changed)
	player.weapon_state_changed.connect(_on_weapon_state_changed)
	player.scope_changed.connect(_on_scope_changed)
	player.shot_fired.connect(_on_player_shot_fired)
	rounds.timer_changed.connect(_on_round_state_changed)
	rounds.score_changed.connect(_on_round_score_changed)
	rounds.round_ended.connect(_on_round_ended)
	rounds.match_ended.connect(_on_match_ended)
	rounds.start_match()
	_publish_hud()
	_publish_match_state()


func configure_player_selection(
	team: StringName, character_id: StringName, nickname: String
) -> void:
	_selected_team = team if team in [&"P", &"B"] else &"P"
	_selected_character = character_id
	_selected_nickname = nickname if not nickname.strip_edges().is_empty() else "Jogador"
	if is_node_ready():
		_apply_player_selection()


func _process(delta: float) -> void:
	var round_input_active := player.input_session_active and rounds.round_active
	if round_input_active and not _combat_session_active:
		_engagement_grace_remaining = opening_engagement_grace_seconds
	_combat_session_active = round_input_active
	if round_input_active:
		_engagement_grace_remaining = maxf(0.0, _engagement_grace_remaining - delta)
	else:
		_engagement_grace_remaining = 0.0
	var combat_active := round_input_active and _engagement_grace_remaining <= 0.0
	for actor_bot in _bots:
		actor_bot.combat_enabled = combat_active
	if round_input_active:
		rounds.advance(delta)
		_think_remaining -= delta
		if _think_remaining <= 0.0:
			_assign_targets()
			_think_remaining = 0.16
	if bot != null and not bot.alive:
		bot_state_changed.emit(false, bot.respawn_remaining)
	if _next_round_remaining >= 0.0 and not rounds.match_finished:
		_next_round_remaining -= delta
		if _next_round_remaining <= 0.0:
			start_next_round_now()


func actors() -> Array[Node3D]:
	var result: Array[Node3D] = [player]
	for actor_bot in _bots:
		result.append(actor_bot)
	return result


func team_members(team: StringName) -> Array[Node3D]:
	var result: Array[Node3D] = []
	for actor in actors():
		if StringName(actor.get("team")) == team:
			result.append(actor)
	return result


func start_next_round_now() -> void:
	_next_round_remaining = -1.0
	_reset_actors()
	rounds.start_next_round()
	_assign_targets()
	_publish_match_state()


func current_hud() -> Dictionary:
	return {
		"health": player.health.current_health,
		"weapon_name": player.weapon.definition.display_name,
		"ammo": player.weapon_inventory.current_ammo().x,
		"reserve": player.weapon_inventory.current_ammo().y,
		"scoped": player.scoped,
	}


func current_match_state() -> Dictionary:
	return {
		"round": rounds.round_number,
		"seconds": rounds.time_remaining,
		"petistas_kills": rounds.round_kills[&"P"],
		"bolsonaristas_kills": rounds.round_kills[&"B"],
		"petistas_wins": rounds.round_wins[&"P"],
		"bolsonaristas_wins": rounds.round_wins[&"B"],
		"finished": rounds.match_finished,
	}


func scoreboard_rows() -> Array[Dictionary]:
	var rows: Array[Dictionary] = []
	for actor in actors():
		rows.append({
			"name": actor.get("display_name"),
			"team": actor.get("team"),
			"kills": actor.get("kills"),
			"deaths": actor.get("deaths"),
		})
	return rows


func current_procedural_state() -> Dictionary:
	var signatures: Dictionary = {}
	for actor_bot in _bots:
		if actor_bot.visuals.get_child_count() > 0:
			var generated := actor_bot.visuals.get_child(0)
			signatures[generated.get_meta("procedural_signature")] = true
	return {
		"arena_signature": arena.procedural_signature,
		"geometry_count": arena.geometry.get_child_count(),
		"material_count": arena.material_count(),
		"visual_signature_count": signatures.size(),
	}


func current_radar_state() -> Array[Dictionary]:
	var result: Array[Dictionary] = []
	for actor in actors():
		result.append({
			"position": actor.global_position,
			"team": actor.get("team"),
			"alive": actor.get("alive"),
			"player": actor == player,
		})
	return result


func _build_rosters() -> void:
	for definition in ACTOR_DEFINITIONS:
		if StringName(definition.id) == _selected_character:
			continue
		var actor_bot := BOT_SCENE.instantiate() as CombatBot
		actor_bot.name = String(definition.id)
		actor_bot.actor_id = definition.id
		actor_bot.display_name = definition.name
		actor_bot.team = definition.team
		actor_bot.position = definition.spawn
		actor_bot.rotation.y = PI if actor_bot.team == &"P" else 0.0
		bots_host.add_child(actor_bot)
		_character_factory.build_into(actor_bot.visuals, actor_bot.actor_id)
		actor_bot.set_navigation_graph(_graph)
		_connect_actor(actor_bot)
		_bots.append(actor_bot)
		if bot == null and actor_bot.team == &"B":
			bot = actor_bot
	_assign_targets()


func _apply_player_selection() -> void:
	var selected := ACTOR_DEFINITIONS[0]
	for definition in ACTOR_DEFINITIONS:
		if StringName(definition.id) == _selected_character and StringName(definition.team) == _selected_team:
			selected = definition
			break
	_selected_character = selected.id
	_selected_team = selected.team
	player.actor_id = selected.id
	player.team = selected.team
	player.display_name = _selected_nickname
	player.global_position = selected.spawn + Vector3(0.0, 0.1, 0.0)
	player.rotation.y = PI if player.team == &"P" else 0.0
	player.spawn_position = player.global_position


func _connect_actor(actor: Node3D) -> void:
	actor.died.connect(_on_actor_died.bind(actor))
	if actor is CombatBot:
		actor.respawned.connect(_on_bot_respawned.bind(actor))


func _assign_targets() -> void:
	var candidates: Array = actors()
	for actor_bot in _bots:
		actor_bot.target_actor = _selector.choose(actor_bot, candidates)


func _reset_actors() -> void:
	for actor in actors():
		actor.reset_for_round()


func _publish_hud() -> void:
	var hud := current_hud()
	hud_updated.emit(hud.health, hud.weapon_name, hud.ammo, hud.reserve, hud.scoped)


func _publish_match_state() -> void:
	match_state_changed.emit(current_match_state())


func _on_player_health_changed(_current: int) -> void:
	_publish_hud()


func _on_weapon_state_changed(_weapon_name: String, _ammo: int, _reserve: int) -> void:
	_publish_hud()


func _on_scope_changed(_active: bool) -> void:
	_publish_hud()


func _on_player_shot_fired(_result: Dictionary) -> void:
	_engagement_grace_remaining = 0.0


func _on_actor_died(source: Node, headshot: bool, victim: Node3D) -> void:
	if source != null and source != victim and source.get("team") != null:
		var source_team := StringName(source.get("team"))
		if source_team != StringName(victim.get("team")):
			source.set("kills", int(source.get("kills")) + 1)
			rounds.register_kill(source_team)
			killfeed_event.emit(
				String(source.get("display_name")), String(victim.get("display_name")), headshot
			)
	if victim == bot:
		bot_state_changed.emit(false, bot.respawn_remaining)
	_publish_match_state()


func _on_bot_respawned(actor_bot: CombatBot) -> void:
	if actor_bot == bot:
		bot_state_changed.emit(true, 0.0)


func _on_round_state_changed(_seconds: float) -> void:
	_publish_match_state()


func _on_round_score_changed(_team: StringName, _kills: int) -> void:
	_publish_match_state()


func _on_round_ended(
	_winner: StringName, _petistas_kills: int, _bolsonaristas_kills: int
) -> void:
	for actor_bot in _bots:
		actor_bot.combat_enabled = false
	_next_round_remaining = 2.0
	_publish_match_state()


func _on_match_ended(_winner: StringName) -> void:
	_next_round_remaining = -1.0
	_publish_match_state()
