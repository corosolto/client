class_name WaypointGraph
extends RefCounted

var points: Array[Vector3] = []
var connections: Array[PackedInt32Array] = []


func add_point(position: Vector3) -> int:
	points.append(position)
	connections.append(PackedInt32Array())
	return points.size() - 1


func connect_points(first: int, second: int) -> void:
	if first == second or first < 0 or second < 0:
		return
	if first >= points.size() or second >= points.size():
		return
	if second not in connections[first]:
		connections[first].append(second)
	if first not in connections[second]:
		connections[second].append(first)


func nearest_point(position: Vector3) -> int:
	if points.is_empty():
		return -1
	var nearest := 0
	var nearest_distance := position.distance_squared_to(points[0])
	for index in range(1, points.size()):
		var distance := position.distance_squared_to(points[index])
		if distance < nearest_distance:
			nearest = index
			nearest_distance = distance
	return nearest


func find_path(origin: int, target: int) -> Array[int]:
	if origin < 0 or target < 0 or origin >= points.size() or target >= points.size():
		return []
	if origin == target:
		return [origin]
	var previous := PackedInt32Array()
	previous.resize(points.size())
	previous.fill(-1)
	previous[origin] = origin
	var queue: Array[int] = [origin]
	while not queue.is_empty():
		var current: int = queue.pop_front()
		for neighbor in connections[current]:
			if previous[neighbor] != -1:
				continue
			previous[neighbor] = current
			if neighbor == target:
				return _reconstruct_path(previous, origin, target)
			queue.append(neighbor)
	return [origin]


func _reconstruct_path(previous: PackedInt32Array, origin: int, target: int) -> Array[int]:
	var path: Array[int] = [target]
	var current := target
	while current != origin:
		current = previous[current]
		path.append(current)
	path.reverse()
	return path
