extends GutTest

const PISTOL_PATH := "res://src/weapons/definitions/pistol.tres"
const KNIFE_PATH := "res://src/weapons/definitions/knife.tres"


func test_pistol_resource_matches_legacy_contract() -> void:
	assert_true(ResourceLoader.exists(PISTOL_PATH), "Pistol definition must exist")
	if not ResourceLoader.exists(PISTOL_PATH):
		return
	var pistol: Resource = load(PISTOL_PATH)
	assert_eq(pistol.weapon_id, &"pistol")
	assert_eq(pistol.damage, 34)
	assert_eq(pistol.magazine_capacity, 12)
	assert_eq(pistol.reserve_capacity, 48)
	assert_almost_eq(pistol.fire_interval, 0.24, 0.001)
	assert_almost_eq(pistol.reload_seconds, 1.6, 0.001)
	assert_almost_eq(pistol.hip_spread, 0.02, 0.001)
	assert_almost_eq(pistol.recoil, 0.014, 0.001)
	assert_false(pistol.supports_scope)


func test_knife_resource_matches_legacy_contract() -> void:
	assert_true(ResourceLoader.exists(KNIFE_PATH), "Knife definition must exist")
	if not ResourceLoader.exists(KNIFE_PATH):
		return
	var knife: Resource = load(KNIFE_PATH)
	assert_eq(knife.weapon_id, &"knife")
	assert_eq(knife.damage, 55)
	assert_almost_eq(knife.fire_interval, 0.55, 0.001)
	assert_almost_eq(knife.range, 2.4, 0.001)
	assert_almost_eq(knife.recoil, 0.02, 0.001)
	assert_false(knife.supports_scope)
	assert_almost_eq(knife.draw_delay, 0.35, 0.001)
