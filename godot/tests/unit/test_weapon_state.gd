extends GutTest

const STATE_PATH := "res://src/weapons/weapon_state.gd"
const AWP_PATH := "res://src/weapons/definitions/awp.tres"


func test_fire_consumes_ammo_and_respects_awp_cadence() -> void:
	assert_true(ResourceLoader.exists(STATE_PATH), "WeaponState must exist")
	if not ResourceLoader.exists(STATE_PATH):
		return

	var state: RefCounted = (load(STATE_PATH) as GDScript).new(load(AWP_PATH))
	assert_eq(state.ammo, 5)
	assert_eq(state.reserve, 25)
	assert_true(state.try_fire())
	assert_eq(state.ammo, 4)
	assert_false(state.try_fire(), "AWP must remain on cooldown")
	state.advance(1.7)
	assert_true(state.try_fire())


func test_reload_transfers_only_available_reserve_after_delay() -> void:
	var state: RefCounted = (load(STATE_PATH) as GDScript).new(load(AWP_PATH))
	state.ammo = 1
	state.reserve = 3
	assert_true(state.start_reload())
	assert_true(state.reloading)
	assert_false(state.try_fire(), "Cannot fire while reloading")
	state.advance(3.0)
	assert_eq(state.ammo, 1)
	state.advance(0.1)
	assert_eq(state.ammo, 4)
	assert_eq(state.reserve, 0)
	assert_false(state.reloading)
