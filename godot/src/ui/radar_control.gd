class_name RadarControl
extends Control

var blips: Array[Dictionary] = []
var arena_size: Vector2 = Vector2(54.0, 94.0)


func set_radar_state(next_blips: Array[Dictionary]) -> void:
	blips = next_blips
	queue_redraw()


func normalized_position(world_position: Vector3) -> Vector2:
	return Vector2(
		clampf(world_position.x / arena_size.x + 0.5, 0.0, 1.0),
		clampf(world_position.z / arena_size.y + 0.5, 0.0, 1.0)
	)


func _draw() -> void:
	draw_rect(Rect2(Vector2.ZERO, size), Color(0.02, 0.04, 0.025, 0.82), true)
	draw_rect(Rect2(Vector2.ZERO, size), Color(0.42, 0.52, 0.25, 0.9), false, 2.0)
	draw_line(Vector2(size.x * 0.5, 0.0), Vector2(size.x * 0.5, size.y), Color(0.3, 0.4, 0.25, 0.4))
	draw_line(Vector2(0.0, size.y * 0.5), Vector2(size.x, size.y * 0.5), Color(0.3, 0.4, 0.25, 0.4))
	for blip in blips:
		if not bool(blip.alive):
			continue
		var normalized := normalized_position(blip.position)
		var point := Vector2(normalized.x * size.x, normalized.y * size.y)
		var color := Color("ff4b4b") if StringName(blip.team) == &"P" else Color("42d66b")
		var radius := 5.0 if bool(blip.player) else 3.5
		draw_circle(point, radius, color)
