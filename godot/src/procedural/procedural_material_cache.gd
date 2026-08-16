class_name ProceduralMaterialCache
extends RefCounted

const TEXTURE_SIZE := 32

var _materials: Dictionary = {}
var _signatures: Dictionary = {}


func material(key: StringName, base_color: Color, seed: int) -> StandardMaterial3D:
	var cache_key := _cache_key(key, base_color, seed)
	if _materials.has(cache_key):
		return _materials[cache_key]
	var generated := _generate_texture(key, base_color, seed)
	var result := StandardMaterial3D.new()
	result.albedo_texture = generated.texture
	result.roughness = 0.86
	_materials[cache_key] = result
	_signatures[cache_key] = generated.signature
	return result


func texture_signature(key: StringName, base_color: Color, seed: int) -> String:
	var cache_key := _cache_key(key, base_color, seed)
	if not _signatures.has(cache_key):
		material(key, base_color, seed)
	return _signatures[cache_key]


func material_count() -> int:
	return _materials.size()


func clear() -> void:
	_materials.clear()
	_signatures.clear()


func _generate_texture(key: StringName, base_color: Color, seed: int) -> Dictionary:
	var image := Image.create(TEXTURE_SIZE, TEXTURE_SIZE, false, Image.FORMAT_RGBA8)
	var random := RandomNumberGenerator.new()
	random.seed = seed + String(key).hash()
	var checksum: int = 0
	for y in TEXTURE_SIZE:
		for x in TEXTURE_SIZE:
			var noise := random.randf_range(-0.09, 0.09)
			var pixel := Color(
				clampf(base_color.r + noise, 0.0, 1.0),
				clampf(base_color.g + noise, 0.0, 1.0),
				clampf(base_color.b + noise, 0.0, 1.0),
				1.0
			)
			image.set_pixel(x, y, pixel)
			checksum = (checksum * 31 + int(pixel.r8) + int(pixel.g8) * 3 + int(pixel.b8) * 7) & 0x7fffffff
	var texture := ImageTexture.create_from_image(image)
	return {
		"texture": texture,
		"signature": "%s:%s:%d:%d" % [key, base_color.to_html(false), seed, checksum],
	}


func _cache_key(key: StringName, base_color: Color, seed: int) -> String:
	return "%s|%s|%d" % [key, base_color.to_html(false), seed]
