class_name ProceduralArena
extends Node3D

const MATERIAL_CACHE_SCRIPT := preload("res://src/procedural/procedural_material_cache.gd")

@export var seed: int = 2026
@export var arena_size: Vector2 = Vector2(54.0, 94.0)

@onready var geometry: Node3D = $Geometry
@onready var decor: Node3D = $Decor
@onready var skyline: Node3D = $Skyline

var procedural_signature: String = ""
var _materials: ProceduralMaterialCache = MATERIAL_CACHE_SCRIPT.new()
var _box_meshes: Dictionary = {}
var _signature_parts: Array[String] = []
var _blockers: Array[Dictionary] = []


func _ready() -> void:
	_build_ground_and_bounds()
	_build_spawn_platforms()
	_build_central_cover()
	_build_crates_and_cover()
	_build_landmarks()
	_build_street_props()
	_build_skyline()
	procedural_signature = "%d:%d:%d" % [seed, _signature_parts.size(), "|".join(_signature_parts).hash()]


func material_count() -> int:
	return _materials.material_count()


func ground_height_at(x: float, z: float) -> float:
	var absolute_z := absf(z)
	if absolute_z >= 38.0 and x >= -15.0 and x <= 15.0:
		return 1.4
	if absolute_z > 30.0 and absolute_z < 38.0 and (
		(x >= 8.0 and x <= 14.0) or (x <= -8.0 and x >= -14.0)
	):
		return 1.4 * (absolute_z - 30.0) / 8.0
	return 0.0


func create_waypoint_graph() -> WaypointGraph:
	var graph := WaypointGraph.new()
	var step := 4.4
	var z := -42.0
	while z <= 42.01:
		var x := -22.0
		while x <= 22.01:
			if not _blocked(x, z, 0.5):
				graph.add_point(Vector3(x, ground_height_at(x, z), z))
			x += step
		z += step
	for first in graph.points.size():
		for second in range(first + 1, graph.points.size()):
			var delta := graph.points[first] - graph.points[second]
			if Vector2(delta.x, delta.z).length_squared() > step * step * 2.2:
				continue
			if _segment_clear(graph.points[first], graph.points[second]):
				graph.connect_points(first, second)
	return graph


func _build_ground_and_bounds() -> void:
	_box("Floor", Vector3(180.0, 0.2, 190.0), Vector3(0.0, -0.1, 0.0), &"ground", "59634f")
	_decor_box(decor, "AsphaltLane", Vector3(14.0, 0.04, 92.0), Vector3(0.0, 0.02, 0.0), &"asphalt", "34383d")
	_cylinder(decor, "CentralPlaza", 13.0, 0.08, Vector3(0.0, 0.04, 0.0), &"concrete", "9a938a", false)
	_box("NorthWall", Vector3(54.0, 4.5, 1.0), Vector3(0.0, 2.25, -46.5), &"graffiti", "806f68")
	_box("SouthWall", Vector3(54.0, 4.5, 1.0), Vector3(0.0, 2.25, 46.5), &"graffiti", "806f68")
	_box("WestWall", Vector3(1.0, 4.5, 94.0), Vector3(-26.5, 2.25, 0.0), &"graffiti", "756b72")
	_box("EastWall", Vector3(1.0, 4.5, 94.0), Vector3(26.5, 2.25, 0.0), &"graffiti", "756b72")


func _build_spawn_platforms() -> void:
	for side in [-1, 1]:
		var suffix := "P" if side < 0 else "B"
		_box("Platform%s" % suffix, Vector3(30.0, 1.4, 8.0), Vector3(0.0, 0.7, 42.0 * side), &"concrete_dark", "66635f")
		for x in [-11.0, 11.0]:
			var ramp := _box(
				"Ramp%s%s" % [suffix, "L" if x < 0.0 else "R"],
				Vector3(6.0, 0.25, 8.6),
				Vector3(x, 0.72, 34.0 * side),
				&"concrete_dark",
				"66635f"
			)
			ramp.rotation.x = -side * atan2(1.4, 8.0)
		for x in [-12.0, -4.0, 4.0, 12.0]:
			_decor_box(
				decor,
				"Railing%s_%d" % [suffix, int(x)],
				Vector3(5.5, 0.08, 0.08),
				Vector3(x, 2.25, 38.1 * side),
				&"metal",
				"73787d"
			)


func _build_central_cover() -> void:
	var urn := _box("CenterObstacle", Vector3(3.2, 4.2, 2.2), Vector3(0.0, 2.1, 0.0), &"urna", "4f5963")
	urn.rotation.z = 0.06
	_decor_box(decor, "UrnaBase", Vector3(3.6, 0.5, 2.6), Vector3(0.0, 0.25, 0.0), &"concrete_dark", "66635f")
	for x in [-7.0, 7.0]:
		_box("Planter%s" % ("L" if x < 0.0 else "R"), Vector3(4.0, 0.9, 1.3), Vector3(x, 0.45, 0.0), &"concrete", "9a938a")
		_decor_box(decor, "Grass%s" % int(x), Vector3(3.6, 0.5, 0.9), Vector3(x, 1.15, 0.0), &"grass", "536b3d")
	# Kept as a named traversal contract from the first vertical slice.
	_box("WalkableStep", Vector3(3.0, 0.5, 2.0), Vector3(6.0, 0.25, 3.0), &"concrete", "b8a27a")


func _build_crates_and_cover() -> void:
	var crates := [
		[-10.0, -12.0, 0], [10.0, 12.0, 0], [-10.0, -10.2, 1],
		[4.0, -20.0, 0], [-4.0, 20.0, 0], [5.8, -20.0, 0], [-5.8, 20.0, 0],
		[16.0, -6.0, 0], [-16.0, 6.0, 0], [16.0, -7.8, 0], [-16.0, 7.8, 0],
		[12.0, 24.0, 0], [-12.0, -24.0, 0], [12.0, 25.8, 1],
	]
	for index in crates.size():
		var data: Array = crates[index]
		_box(
			"Crate%02d" % index,
			Vector3(1.6, 1.6, 1.6),
			Vector3(float(data[0]), 0.8 + int(data[2]) * 1.6, float(data[1])),
			&"crate",
			"8a633d"
		)
	var cover_positions := [[-18.0, -18.0], [18.0, 18.0], [18.0, -22.0], [-18.0, 22.0]]
	for index in cover_positions.size():
		var position_data: Array = cover_positions[index]
		_box(
			"LowCover%d" % index,
			Vector3(4.2, 1.15, 0.8),
			Vector3(float(position_data[0]), 0.575, float(position_data[1])),
			&"concrete",
			"9a938a"
		)


func _build_landmarks() -> void:
	_box("TruckTrailer", Vector3(2.6, 2.9, 9.0), Vector3(21.0, 1.9, -10.0), &"truck_green", "1faa4d")
	_box("TruckCab", Vector3(2.4, 2.2, 2.6), Vector3(21.0, 1.1, -3.6), &"truck_yellow", "ffd23f")
	for index in 3:
		_cylinder(decor, "TruckWheel%d" % index, 0.5, 0.4, Vector3(19.9, 0.5, [-13.0, -8.0, -2.8][index]), &"rubber", "1a1a1a", false, Vector3(0.0, 0.0, 90.0))
	_box("Sindicato", Vector3(7.0, 4.0, 6.0), Vector3(-20.0, 2.0, 10.0), &"concrete", "918a80")
	_decor_box(decor, "SindicatoDoor", Vector3(0.12, 2.2, 1.2), Vector3(-16.44, 1.1, 10.0), &"door", "5c1a1a")
	var camp := Node3D.new()
	camp.name = "MSTCamp"
	decor.add_child(camp)
	var tents := [[-19.0, -34.0], [-15.0, -38.0], [-21.0, -39.0]]
	for index in tents.size():
		var tent_data: Array = tents[index]
		var tent_position := Vector3(float(tent_data[0]), 1.1, float(tent_data[1]))
		_cone(camp, "TentVisual%d" % index, 1.7, 2.2, tent_position, &"tent", "8f3f32")
		_box("Tent%d" % index, Vector3(2.4, 1.9, 2.4), Vector3(tent_position.x, 0.95, tent_position.z), &"tent", "8f3f32", false)
	for index in 2:
		var flag_x: float = [-17.0, -23.0][index]
		_decor_box(camp, "FlagPole%d" % index, Vector3(0.08, 4.4, 0.08), Vector3(flag_x, 2.2, [-32.0, -36.0][index]), &"wood", "8a6b48")
		_decor_box(camp, "RedFlag%d" % index, Vector3(1.4, 0.9, 0.04), Vector3(flag_x + 0.72, 3.9, [-32.0, -36.0][index]), &"red_flag", "e03232")
	_box("Boteco", Vector3(3.2, 2.5, 2.4), Vector3(20.0, 1.25, 37.0), &"concrete_dark", "66635f")
	_decor_box(decor, "BotecoAwning", Vector3(3.6, 0.12, 1.4), Vector3(20.0, 2.5, 35.2), &"awning", "e8bd25")
	_box("PastelStand", Vector3(1.8, 2.1, 3.4), Vector3(-24.2, 1.05, 0.0), &"concrete", "9a938a")
	_decor_box(decor, "PastelCounter", Vector3(1.0, 0.9, 2.8), Vector3(-23.0, 0.45, 0.0), &"yellow", "e8bd25")


func _build_street_props() -> void:
	var pole_positions := [[-23.0, -43.0], [23.0, -43.0], [-23.0, 43.0], [23.0, 43.0]]
	for index in pole_positions.size():
		var data: Array = pole_positions[index]
		_cylinder(geometry, "SpeakerPole%d" % index, 0.15, 6.0, Vector3(float(data[0]), 3.0, float(data[1])), &"metal", "73787d", true)
	var barrels := [[-14.5, -8.0, "8f4a2a"], [-13.5, -8.6, "5a6b3a"], [14.5, 8.0, "8f4a2a"], [22.0, 20.0, "4a5a6b"], [-22.0, -20.0, "5a6b3a"]]
	for index in barrels.size():
		var data: Array = barrels[index]
		_cylinder(geometry, "Barrel%d" % index, 0.36, 0.95, Vector3(float(data[0]), 0.475, float(data[1])), &"barrel", String(data[2]), true)
	for stack in [[13.5, -15.0, 3], [-13.5, 15.0, 2]]:
		var stack_data: Array = stack
		var stack_name := "Tires%s" % ("E" if float(stack_data[0]) > 0.0 else "W")
		_box(stack_name, Vector3(0.9, float(stack_data[2]) * 0.3, 0.9), Vector3(float(stack_data[0]), float(stack_data[2]) * 0.15, float(stack_data[1])), &"rubber", "1e1e1e")
	for index in 4:
		_decor_box(decor, "Billboard%d" % index, Vector3(8.8, 3.8, 0.15), Vector3([-8.0, 8.0][index % 2], 6.4, 46.3 * (-1.0 if index < 2 else 1.0)), &"billboard", "222222")


func _build_skyline() -> void:
	_decor_box(skyline, "CongressTowerLeft", Vector3(3.0, 30.0, 3.0), Vector3(-2.2, 15.0, 78.0), &"skyline", "5f7089")
	_decor_box(skyline, "CongressTowerRight", Vector3(3.0, 30.0, 3.0), Vector3(2.2, 15.0, 78.0), &"skyline", "5f7089")
	_decor_box(skyline, "CongressSlab", Vector3(16.0, 2.4, 6.0), Vector3(0.0, 8.0, 78.0), &"skyline", "5f7089")
	_cylinder(skyline, "CathedralBase", 6.0, 5.0, Vector3(-14.0, 2.5, -80.0), &"skyline", "5f7089", false)
	for index in 10:
		var angle := float(index) / 10.0 * TAU
		_cone(skyline, "CathedralSpike%d" % index, 0.9, 14.0, Vector3(-14.0 + cos(angle) * 4.4, 10.0, -80.0 + sin(angle) * 4.4), &"skyline", "5f7089")
	var blocks := [[-40.0, 70.0, 10.0, 16.0], [34.0, 74.0, 12.0, 22.0], [48.0, -70.0, 9.0, 13.0], [-44.0, -72.0, 11.0, 18.0], [20.0, -76.0, 8.0, 24.0], [-58.0, 0.0, 8.0, 12.0], [58.0, 10.0, 8.0, 15.0]]
	for index in blocks.size():
		var data: Array = blocks[index]
		_decor_box(skyline, "CityBlock%d" % index, Vector3(float(data[2]), float(data[3]), float(data[2])), Vector3(float(data[0]), float(data[3]) * 0.5, float(data[1])), &"skyline", "5f7089")


func _box(
	node_name: String,
	size: Vector3,
	center: Vector3,
	material_key: StringName,
	color_hex: String,
	visible_mesh: bool = true
) -> StaticBody3D:
	var body := StaticBody3D.new()
	body.name = node_name
	body.position = center
	geometry.add_child(body)
	var shape := BoxShape3D.new()
	shape.size = size
	var collision := CollisionShape3D.new()
	collision.name = "CollisionShape3D"
	collision.shape = shape
	body.add_child(collision)
	if visible_mesh:
		var visual := MeshInstance3D.new()
		visual.name = "MeshInstance3D"
		visual.mesh = _box_mesh(size)
		visual.material_override = _materials.material(material_key, Color(color_hex), seed)
		body.add_child(visual)
	_record(node_name, size, center, material_key)
	if not (
		node_name == "Floor"
		or node_name.begins_with("Platform")
		or node_name.begins_with("Ramp")
		or node_name == "WalkableStep"
	):
		_blockers.append({
			"min_x": center.x - size.x * 0.5,
			"max_x": center.x + size.x * 0.5,
			"min_y": center.y - size.y * 0.5,
			"max_y": center.y + size.y * 0.5,
			"min_z": center.z - size.z * 0.5,
			"max_z": center.z + size.z * 0.5,
		})
	return body


func _decor_box(
	parent: Node3D, node_name: String, size: Vector3, center: Vector3, material_key: StringName, color_hex: String
) -> MeshInstance3D:
	var visual := MeshInstance3D.new()
	visual.name = node_name
	visual.mesh = _box_mesh(size)
	visual.material_override = _materials.material(material_key, Color(color_hex), seed)
	visual.position = center
	parent.add_child(visual)
	_record(node_name, size, center, material_key)
	return visual


func _cylinder(
	parent: Node3D,
	node_name: String,
	radius: float,
	height: float,
	center: Vector3,
	material_key: StringName,
	color_hex: String,
	collidable: bool,
	rotation_degrees_value: Vector3 = Vector3.ZERO
) -> Node3D:
	var host: Node3D
	if collidable:
		var body := StaticBody3D.new()
		var shape := CylinderShape3D.new()
		shape.radius = radius
		shape.height = height
		var collision := CollisionShape3D.new()
		collision.name = "CollisionShape3D"
		collision.shape = shape
		body.add_child(collision)
		host = body
		parent.add_child(body)
	else:
		host = Node3D.new()
		parent.add_child(host)
	host.name = node_name
	host.position = center
	host.rotation_degrees = rotation_degrees_value
	var mesh := CylinderMesh.new()
	mesh.top_radius = radius
	mesh.bottom_radius = radius
	mesh.height = height
	mesh.radial_segments = 10
	var visual := MeshInstance3D.new()
	visual.name = "MeshInstance3D"
	visual.mesh = mesh
	visual.material_override = _materials.material(material_key, Color(color_hex), seed)
	host.add_child(visual)
	_record(node_name, Vector3(radius * 2.0, height, radius * 2.0), center, material_key)
	if collidable:
		_blockers.append({
			"min_x": center.x - radius,
			"max_x": center.x + radius,
			"min_y": center.y - height * 0.5,
			"max_y": center.y + height * 0.5,
			"min_z": center.z - radius,
			"max_z": center.z + radius,
		})
	return host


func _cone(
	parent: Node3D, node_name: String, radius: float, height: float, center: Vector3, material_key: StringName, color_hex: String
) -> MeshInstance3D:
	var mesh := CylinderMesh.new()
	mesh.top_radius = 0.0
	mesh.bottom_radius = radius
	mesh.height = height
	mesh.radial_segments = 8
	var visual := MeshInstance3D.new()
	visual.name = node_name
	visual.mesh = mesh
	visual.material_override = _materials.material(material_key, Color(color_hex), seed)
	visual.position = center
	parent.add_child(visual)
	_record(node_name, Vector3(radius * 2.0, height, radius * 2.0), center, material_key)
	return visual


func _box_mesh(size: Vector3) -> BoxMesh:
	var key := "%0.3f:%0.3f:%0.3f" % [size.x, size.y, size.z]
	if not _box_meshes.has(key):
		var mesh := BoxMesh.new()
		mesh.size = size
		_box_meshes[key] = mesh
	return _box_meshes[key]


func _record(node_name: String, size: Vector3, center: Vector3, material_key: StringName) -> void:
	_signature_parts.append("%s:%s:%s:%s" % [node_name, size, center, material_key])


func _blocked(x: float, z: float, inflate: float) -> bool:
	var ground := ground_height_at(x, z)
	for blocker in _blockers:
		if (
			x > float(blocker.min_x) - inflate
			and x < float(blocker.max_x) + inflate
			and z > float(blocker.min_z) - inflate
			and z < float(blocker.max_z) + inflate
			and float(blocker.min_y) < ground + 1.6
			and float(blocker.max_y) > ground + 0.15
		):
			return true
	return false


func _segment_clear(first: Vector3, second: Vector3) -> bool:
	for sample in range(1, 6):
		var weight := float(sample) / 6.0
		var position := first.lerp(second, weight)
		if _blocked(position.x, position.z, 0.25):
			return false
		if absf(ground_height_at(position.x, position.z) - first.y) > 0.65:
			return false
	return true
