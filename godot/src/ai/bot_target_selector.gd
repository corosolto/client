class_name BotTargetSelector
extends RefCounted


func choose(self_actor: Node3D, candidates: Array) -> Node3D:
	var selected: Node3D
	var selected_distance := INF
	var own_team: StringName = self_actor.get("team")
	for candidate_variant in candidates:
		var candidate := candidate_variant as Node3D
		if candidate == null or candidate == self_actor:
			continue
		if not bool(candidate.get("alive")) or StringName(candidate.get("team")) == own_team:
			continue
		var distance := self_actor.global_position.distance_squared_to(candidate.global_position)
		if distance < selected_distance:
			selected = candidate
			selected_distance = distance
	return selected
