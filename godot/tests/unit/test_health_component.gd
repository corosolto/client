extends GutTest

const HEALTH_PATH := "res://src/combat/health_component.gd"


func test_damage_depletes_health_once_and_preserves_headshot_context() -> void:
	assert_true(ResourceLoader.exists(HEALTH_PATH), "HealthComponent must exist")
	if not ResourceLoader.exists(HEALTH_PATH):
		return

	var health: Node = (load(HEALTH_PATH) as GDScript).new()
	add_child_autofree(health)
	watch_signals(health)

	assert_false(health.take_damage(34, null, false))
	assert_eq(health.current_health, 66)
	assert_true(health.take_damage(400, null, true))
	assert_eq(health.current_health, 0)
	assert_false(health.take_damage(400, null, false), "Dead actors cannot die twice")
	assert_signal_emit_count(health, "damaged", 2)
	assert_signal_emitted_with_parameters(health, "died", [null, true])


func test_reset_restores_maximum_health() -> void:
	var health: Node = (load(HEALTH_PATH) as GDScript).new()
	add_child_autofree(health)
	health.take_damage(100, null, false)
	health.reset()
	assert_eq(health.current_health, 100)
	assert_true(health.is_alive())
