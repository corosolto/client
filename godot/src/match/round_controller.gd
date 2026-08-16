class_name RoundController
extends Node

signal round_started(round_number: int, seconds: float)
signal timer_changed(seconds_remaining: float)
signal score_changed(team: StringName, kills: int)
signal round_ended(winner: StringName, petistas_kills: int, bolsonaristas_kills: int)
signal match_ended(winner: StringName)

@export var round_seconds: float = 99.0
@export var rounds_to_win: int = 3

var round_number: int = 0
var time_remaining: float = 99.0
var round_kills: Dictionary = {&"P": 0, &"B": 0}
var round_wins: Dictionary = {&"P": 0, &"B": 0}
var round_active: bool = false
var match_finished: bool = false


func start_match() -> void:
	round_number = 0
	round_wins = {&"P": 0, &"B": 0}
	match_finished = false
	start_next_round()


func start_next_round() -> void:
	if match_finished:
		return
	round_number += 1
	time_remaining = round_seconds
	round_kills = {&"P": 0, &"B": 0}
	round_active = true
	round_started.emit(round_number, time_remaining)
	timer_changed.emit(time_remaining)


func register_kill(team: StringName) -> void:
	if not round_active or not round_kills.has(team):
		return
	round_kills[team] = int(round_kills[team]) + 1
	score_changed.emit(team, round_kills[team])


func advance(delta: float) -> void:
	if not round_active or match_finished:
		return
	time_remaining = maxf(0.0, time_remaining - delta)
	timer_changed.emit(time_remaining)
	if time_remaining <= 0.0:
		_end_round()


func _end_round() -> void:
	round_active = false
	var petistas_kills: int = round_kills[&"P"]
	var bolsonaristas_kills: int = round_kills[&"B"]
	var winner: StringName = &""
	if petistas_kills > bolsonaristas_kills:
		winner = &"P"
	elif bolsonaristas_kills > petistas_kills:
		winner = &"B"
	if not winner.is_empty():
		round_wins[winner] = int(round_wins[winner]) + 1
	round_ended.emit(winner, petistas_kills, bolsonaristas_kills)
	if not winner.is_empty() and int(round_wins[winner]) >= rounds_to_win:
		match_finished = true
		match_ended.emit(winner)
