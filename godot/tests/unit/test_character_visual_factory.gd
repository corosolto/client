extends GutTest

const FACTORY_SCRIPT := preload("res://src/procedural/character_visual_factory.gd")


func test_factory_defines_eight_distinct_legacy_characters() -> void:
	var factory: CharacterVisualFactory = FACTORY_SCRIPT.new()
	var definitions := factory.definitions()
	assert_eq(definitions.size(), 8)
	var ids: Dictionary = {}
	var signatures: Dictionary = {}
	for definition in definitions:
		ids[definition.id] = true
		signatures[factory.signature_for(definition.id)] = true
	assert_eq(ids.size(), 8)
	assert_eq(signatures.size(), 8, "Palettes and accessories must distinguish every character")


func test_factory_builds_humanoid_weapon_and_named_accessory_without_assets() -> void:
	var factory: CharacterVisualFactory = FACTORY_SCRIPT.new()
	for definition in factory.definitions():
		var visual := factory.build(definition.id, 2026)
		add_child_autofree(visual)
		assert_not_null(visual.get_node_or_null("Body/Torso"), definition.id)
		assert_not_null(visual.get_node_or_null("Body/Head"), definition.id)
		assert_not_null(visual.get_node_or_null("Body/Rifle"), definition.id)
		assert_not_null(visual.get_node_or_null("Accessory"), definition.id)
		assert_eq(visual.get_meta("procedural_signature"), factory.signature_for(definition.id))
