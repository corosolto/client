class_name CharacterVisualFactory
extends RefCounted

const MATERIAL_CACHE_SCRIPT := preload("res://src/procedural/procedural_material_cache.gd")
const DEFINITIONS := [
	{ "id": &"esquerdomacho", "team": &"P", "name": "Esquerdomacho", "skin": "e8b98a", "shirt": "b03a2e", "pants": "3a4a5a", "hair": "4a3428", "boots": "2a2a2a", "accessory": &"tote_bag" },
	{ "id": &"sindicato", "team": &"P", "name": "Líder do Sindicato", "skin": "c98d5e", "shirt": "777777", "pants": "2e3d55", "hair": "3a3a3a", "boots": "4a3428", "accessory": &"megaphone" },
	{ "id": &"mst", "team": &"P", "name": "Líder do MST", "skin": "8d5a3b", "shirt": "7a6a45", "pants": "4a4030", "hair": "2a1e14", "boots": "5a3d1e", "accessory": &"red_flag" },
	{ "id": &"doutora", "team": &"P", "name": "Doutora do SUS", "skin": "d9a580", "shirt": "f0f0f0", "pants": "3a4a5a", "hair": "3a2a1e", "boots": "6b6b6b", "accessory": &"stethoscope" },
	{ "id": &"caminhoneiro", "team": &"B", "name": "Caminhoneiro", "skin": "d9a066", "shirt": "ffd23f", "pants": "2e3d55", "hair": "3a2a1e", "boots": "3a3a3a", "accessory": &"trucker_cap" },
	{ "id": &"influencer", "team": &"B", "name": "Influencer de Dubai", "skin": "f2c9a4", "shirt": "f0f0f0", "pants": "e8c25a", "hair": "f5d76e", "boots": "ffffff", "accessory": &"phone" },
	{ "id": &"sertanejo", "team": &"B", "name": "Cantor Sertanejo", "skin": "c98d5e", "shirt": "8a2f2f", "pants": "2e3d55", "hair": "2a1e14", "boots": "5a3d1e", "accessory": &"cowboy_hat" },
	{ "id": &"senhora", "team": &"B", "name": "Tia Zilá", "skin": "eec39a", "shirt": "1faa4d", "pants": "ffd23f", "hair": "d8d8d8", "boots": "f0f0f0", "accessory": &"clue_board" },
]

var _materials: ProceduralMaterialCache
var _box_meshes: Dictionary = {}


func _init(material_cache: ProceduralMaterialCache = null) -> void:
	_materials = material_cache if material_cache != null else MATERIAL_CACHE_SCRIPT.new()


func definitions() -> Array[Dictionary]:
	var result: Array[Dictionary] = []
	for definition in DEFINITIONS:
		result.append(definition)
	return result


func definition(character_id: StringName) -> Dictionary:
	for candidate in DEFINITIONS:
		if candidate.id == character_id:
			return candidate
	return DEFINITIONS[0]


func signature_for(character_id: StringName) -> String:
	var item := definition(character_id)
	return "%s|%s|%s|%s|%s|%s|%s|%s" % [
		item.id, item.team, item.skin, item.shirt, item.pants, item.hair, item.boots, item.accessory
	]


func build(character_id: StringName, seed: int = 2026) -> Node3D:
	var item := definition(character_id)
	var visual := Node3D.new()
	visual.name = String(item.id)
	visual.set_meta("procedural_signature", signature_for(character_id))
	var body := Node3D.new()
	body.name = "Body"
	visual.add_child(body)
	_box(body, "LegLeft", Vector3(0.15, 0.78, 0.17), item.pants, Vector3(-0.11, 0.39, 0.0), seed)
	_box(body, "LegRight", Vector3(0.15, 0.78, 0.17), item.pants, Vector3(0.11, 0.39, 0.0), seed)
	_box(body, "BootLeft", Vector3(0.16, 0.1, 0.26), item.boots, Vector3(-0.11, 0.05, 0.04), seed)
	_box(body, "BootRight", Vector3(0.16, 0.1, 0.26), item.boots, Vector3(0.11, 0.05, 0.04), seed)
	var torso_width := 0.52 if character_id == &"caminhoneiro" else 0.44
	_box(body, "Torso", Vector3(torso_width, 0.6, 0.26), item.shirt, Vector3(0.0, 1.08, 0.0), seed)
	_box(body, "Head", Vector3(0.26, 0.28, 0.26), item.skin, Vector3(0.0, 1.52, 0.0), seed)
	_box(body, "ArmLeft", Vector3(0.11, 0.5, 0.13), item.shirt, Vector3(-0.3, 1.05, 0.12), seed)
	_box(body, "ArmRight", Vector3(0.11, 0.5, 0.13), item.shirt, Vector3(0.3, 1.05, 0.12), seed)
	_build_rifle(body, seed)
	_box(
		body,
		"TeamBand",
		Vector3(0.13, 0.08, 0.15),
		"e03232" if item.team == &"P" else "1faa4d",
		Vector3(-0.3, 1.18, 0.12),
		seed
	)
	_build_accessory(visual, item, seed)
	return visual


func build_into(host: Node3D, character_id: StringName, seed: int = 2026) -> Node3D:
	for child in host.get_children():
		host.remove_child(child)
		child.free()
	var visual := build(character_id, seed)
	host.add_child(visual)
	return visual


func _build_rifle(body: Node3D, seed: int) -> void:
	var rifle := Node3D.new()
	rifle.name = "Rifle"
	rifle.position = Vector3(0.1, 1.1, 0.35)
	body.add_child(rifle)
	_box(rifle, "Receiver", Vector3(0.08, 0.12, 0.48), "2e4a2e", Vector3.ZERO, seed)
	_box(rifle, "Barrel", Vector3(0.04, 0.04, 0.55), "222222", Vector3(0.0, 0.02, 0.48), seed)
	_box(rifle, "Scope", Vector3(0.07, 0.07, 0.18), "1a1a1a", Vector3(0.0, 0.1, 0.03), seed)


func _build_accessory(visual: Node3D, item: Dictionary, seed: int) -> void:
	var accessory := Node3D.new()
	accessory.name = "Accessory"
	visual.add_child(accessory)
	match StringName(item.accessory):
		&"tote_bag":
			_box(accessory, "ToteBag", Vector3(0.2, 0.3, 0.08), "e8dcc0", Vector3(0.35, 0.9, 0.0), seed)
			_box(accessory, "Beard", Vector3(0.24, 0.12, 0.06), "3a2a1e", Vector3(0.0, 1.42, 0.15), seed)
		&"megaphone":
			_cylinder(accessory, "Megaphone", 0.1, 0.24, "f0f0f0", Vector3(-0.36, 0.82, 0.0), seed)
			_box(accessory, "RedCap", Vector3(0.29, 0.09, 0.29), "c0392b", Vector3(0.0, 1.7, 0.0), seed)
		&"red_flag":
			_box(accessory, "Backpack", Vector3(0.34, 0.42, 0.16), "3f5a34", Vector3(0.0, 1.05, -0.2), seed)
			_box(accessory, "Flag", Vector3(0.02, 0.28, 0.34), "e03232", Vector3(0.16, 1.72, -0.28), seed)
		&"stethoscope":
			_torus(accessory, "Stethoscope", 0.1, 0.015, "2a2a2a", Vector3(0.0, 1.25, 0.14), seed)
			_box(accessory, "LabCoat", Vector3(0.48, 0.18, 0.28), "f0f0f0", Vector3(0.0, 0.76, 0.0), seed)
		&"trucker_cap":
			_box(accessory, "Cap", Vector3(0.3, 0.1, 0.3), "2456a6", Vector3(0.0, 1.7, 0.0), seed)
			_box(accessory, "Sunglasses", Vector3(0.29, 0.07, 0.04), "111111", Vector3(0.0, 1.55, 0.15), seed)
		&"phone":
			_box(accessory, "Phone", Vector3(0.09, 0.16, 0.03), "ffffff", Vector3(-0.36, 1.32, 0.14), seed)
			_box(accessory, "GoldGlasses", Vector3(0.3, 0.07, 0.04), "c9a227", Vector3(0.0, 1.55, 0.15), seed)
		&"cowboy_hat":
			_cylinder(accessory, "HatBrim", 0.27, 0.04, "7a5230", Vector3(0.0, 1.69, 0.0), seed)
			_box(accessory, "GuitarCase", Vector3(0.22, 0.72, 0.1), "2a2a2a", Vector3(0.12, 1.02, -0.2), seed)
		&"clue_board":
			_box(accessory, "ClueBoard", Vector3(0.38, 0.42, 0.06), "a97f4e", Vector3(-0.04, 1.1, -0.18), seed)
			_box(accessory, "OversizedGlasses", Vector3(0.32, 0.07, 0.04), "1a1a1a", Vector3(0.0, 1.55, 0.15), seed)


func _box(
	parent: Node3D, node_name: String, size: Vector3, color_hex: String, position: Vector3, seed: int
) -> MeshInstance3D:
	var mesh_key := "%0.3f:%0.3f:%0.3f" % [size.x, size.y, size.z]
	if not _box_meshes.has(mesh_key):
		var box_mesh := BoxMesh.new()
		box_mesh.size = size
		_box_meshes[mesh_key] = box_mesh
	var instance := MeshInstance3D.new()
	instance.name = node_name
	instance.mesh = _box_meshes[mesh_key]
	instance.material_override = _materials.material(StringName(color_hex), Color(color_hex), seed)
	instance.position = position
	instance.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	parent.add_child(instance)
	return instance


func _cylinder(
	parent: Node3D, node_name: String, radius: float, height: float, color_hex: String, position: Vector3, seed: int
) -> MeshInstance3D:
	var mesh := CylinderMesh.new()
	mesh.top_radius = radius
	mesh.bottom_radius = radius
	mesh.height = height
	mesh.radial_segments = 8
	var instance := MeshInstance3D.new()
	instance.name = node_name
	instance.mesh = mesh
	instance.material_override = _materials.material(StringName(color_hex), Color(color_hex), seed)
	instance.position = position
	parent.add_child(instance)
	return instance


func _torus(
	parent: Node3D, node_name: String, radius: float, ring_radius: float, color_hex: String, position: Vector3, seed: int
) -> MeshInstance3D:
	var mesh := TorusMesh.new()
	mesh.inner_radius = radius - ring_radius
	mesh.outer_radius = radius + ring_radius
	mesh.rings = 12
	mesh.ring_segments = 6
	var instance := MeshInstance3D.new()
	instance.name = node_name
	instance.mesh = mesh
	instance.material_override = _materials.material(StringName(color_hex), Color(color_hex), seed)
	instance.position = position
	parent.add_child(instance)
	return instance
