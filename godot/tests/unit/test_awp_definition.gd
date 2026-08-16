extends GutTest

const AWP_PATH := "res://src/weapons/definitions/awp.tres"


func test_awp_resource_matches_legacy_contract() -> void:
	assert_true(ResourceLoader.exists(AWP_PATH), "AWP definition must exist")
	if not ResourceLoader.exists(AWP_PATH):
		return

	var awp: Resource = load(AWP_PATH)
	assert_eq(awp.weapon_id, &"awp")
	assert_eq(awp.damage, 400)
	assert_eq(awp.magazine_capacity, 5)
	assert_eq(awp.reserve_capacity, 25)
	assert_almost_eq(awp.fire_interval, 1.7, 0.001)
	assert_almost_eq(awp.reload_seconds, 3.1, 0.001)
	assert_almost_eq(awp.hip_spread, 0.075, 0.001)
	assert_almost_eq(awp.scope_spread, 0.0008, 0.00001)
	assert_almost_eq(awp.recoil, 0.055, 0.001)
	assert_true(awp.supports_scope)
