extends GutTest

const BOT_SCENE_PATH := "res://src/actors/combat_bot.tscn"


func test_bot_scene_composes_health_body_and_head_hitboxes() -> void:
	assert_true(ResourceLoader.exists(BOT_SCENE_PATH), "Combat bot scene must exist")
	if not ResourceLoader.exists(BOT_SCENE_PATH):
		return

	var bot := (load(BOT_SCENE_PATH) as PackedScene).instantiate()
	add_child_autofree(bot)
	assert_true(bot is CharacterBody3D)
	assert_not_null(bot.get_node_or_null("Health"))
	assert_true(bot.get_node("BodyCollision") is CollisionShape3D)
	assert_true(bot.get_node("HeadHitbox") is Area3D)
	assert_eq(bot.get_node("HeadHitbox").hit_zone, &"head")
	assert_almost_eq(bot.respawn_delay, 2.5, 0.001)
	assert_eq(bot.get_node("Health").current_health, 100)
