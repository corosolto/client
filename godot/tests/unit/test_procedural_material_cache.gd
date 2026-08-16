extends GutTest

const CACHE_SCRIPT := preload("res://src/procedural/procedural_material_cache.gd")


func test_equivalent_materials_and_textures_are_reused() -> void:
	var cache: ProceduralMaterialCache = CACHE_SCRIPT.new()
	var first := cache.material(&"concrete", Color("8f8a82"), 2026)
	var second := cache.material(&"concrete", Color("8f8a82"), 2026)
	assert_same(first, second)
	assert_same(first.albedo_texture, second.albedo_texture)
	assert_eq(cache.material_count(), 1)


func test_seed_produces_a_stable_but_distinct_texture_signature() -> void:
	var cache: ProceduralMaterialCache = CACHE_SCRIPT.new()
	var first := cache.texture_signature(&"ground", Color("59634f"), 2026)
	var repeated := cache.texture_signature(&"ground", Color("59634f"), 2026)
	var other_seed := cache.texture_signature(&"ground", Color("59634f"), 2027)
	assert_eq(first, repeated)
	assert_ne(first, other_seed)
