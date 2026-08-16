extends GutTest

const PLAYER_SCENE_PATH := "res://src/player/player.tscn"


func test_inventory_switches_three_independent_weapon_scenes() -> void:
	var player := (load(PLAYER_SCENE_PATH) as PackedScene).instantiate()
	add_child_autofree(player)
	var inventory := player.get_node_or_null("CameraPivot/Camera3D/Inventory")
	assert_not_null(inventory)
	if inventory == null:
		return

	assert_not_null(inventory.get_node_or_null("AWP"))
	assert_not_null(inventory.get_node_or_null("Pistol"))
	assert_not_null(inventory.get_node_or_null("Knife"))
	assert_eq(inventory.active_weapon.definition.weapon_id, &"awp")

	inventory.attack(Vector3.ZERO, Vector3.FORWARD, player)
	assert_eq(inventory.active_weapon.state.ammo, 4)
	assert_true(inventory.switch_to(&"pistol"))
	assert_false(inventory.can_attack(), "Draw delay must block immediate fire")
	inventory.advance(0.35)
	assert_true(inventory.can_attack())
	assert_eq(inventory.active_weapon.state.ammo, 12)
	inventory.attack(Vector3.ZERO, Vector3.FORWARD, player)
	assert_eq(inventory.active_weapon.state.ammo, 11)
	assert_true(inventory.switch_to(&"awp"))
	assert_eq(inventory.active_weapon.state.ammo, 4)


func test_knife_disables_scope_and_has_no_ammo_state() -> void:
	var player := (load(PLAYER_SCENE_PATH) as PackedScene).instantiate()
	add_child_autofree(player)
	var inventory := player.get_node("CameraPivot/Camera3D/Inventory")
	assert_true(inventory.switch_to(&"knife"))
	assert_false(inventory.set_scoped(true))
	assert_true(inventory.active_weapon.definition.melee)
	assert_eq(inventory.active_weapon.definition.range, 2.4)
