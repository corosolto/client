extends GutTest

const BASELINE_PATH := "res://contracts/legacy_baseline.json"


func test_project_uses_approved_engine_and_web_renderer() -> void:
	var version := Engine.get_version_info()
	assert_eq(version.major, 4)
	assert_eq(version.minor, 7)
	assert_eq(version.patch, 1)
	assert_eq(
		ProjectSettings.get_setting("rendering/renderer/rendering_method"),
		"gl_compatibility"
	)


func test_legacy_baseline_captures_first_port_contracts() -> void:
	assert_true(FileAccess.file_exists(BASELINE_PATH), "Legacy baseline must exist")
	if not FileAccess.file_exists(BASELINE_PATH):
		return

	var baseline_file := FileAccess.open(BASELINE_PATH, FileAccess.READ)
	var baseline: Variant = JSON.parse_string(baseline_file.get_as_text())
	assert_typeof(baseline, TYPE_DICTIONARY)
	assert_eq(baseline.engine.version, "4.7.1")
	assert_eq(baseline.engine.renderer, "gl_compatibility")
	assert_eq(baseline.match.team_size, 4.0)
	assert_eq(baseline.match.round_seconds, 99.0)
	assert_eq(baseline.match.rounds_to_win, 3.0)
	assert_almost_eq(baseline.match.respawn_seconds, 2.5, 0.001)
	assert_almost_eq(baseline.movement.walk_speed, 4.7, 0.001)
	assert_almost_eq(baseline.movement.sprint_speed, 6.6, 0.001)
	assert_almost_eq(baseline.movement.jump_velocity, 5.4, 0.001)
	assert_almost_eq(baseline.movement.gravity, 14.5, 0.001)
	assert_eq(baseline.weapons.awp.damage, 400.0)
	assert_eq(baseline.weapons.pistol.damage, 34.0)
	assert_eq(baseline.weapons.knife.damage, 55.0)
	assert_eq(baseline.bots.shot_damage_to_player, 42.0)
	assert_almost_eq(baseline.bots.shot_interval_minimum, 2.1, 0.001)
	assert_almost_eq(baseline.bots.shot_interval_maximum, 3.5, 0.001)
