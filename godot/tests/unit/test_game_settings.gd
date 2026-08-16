extends GutTest

const SETTINGS_SCRIPT := preload("res://src/ui/game_settings.gd")
const TEST_PATH := "user://csbrasil_settings_test.cfg"


func after_each() -> void:
	var absolute_path := ProjectSettings.globalize_path(TEST_PATH)
	if FileAccess.file_exists(TEST_PATH):
		DirAccess.remove_absolute(absolute_path)


func test_settings_round_trip_nick_controls_and_quality() -> void:
	var settings: GameSettings = SETTINGS_SCRIPT.new(TEST_PATH)
	settings.nickname = "Zé do AWP"
	settings.mouse_sensitivity = 1.7
	settings.volume = 0.35
	settings.quality = &"high"
	assert_eq(settings.save(), OK)

	var restored: GameSettings = SETTINGS_SCRIPT.new(TEST_PATH)
	restored.load()
	assert_eq(restored.nickname, "Zé do AWP")
	assert_almost_eq(restored.mouse_sensitivity, 1.7, 0.001)
	assert_almost_eq(restored.volume, 0.35, 0.001)
	assert_eq(restored.quality, &"high")


func test_invalid_persisted_values_fall_back_to_safe_contracts() -> void:
	var config := ConfigFile.new()
	config.set_value("player", "nickname", "12345678901234567890")
	config.set_value("settings", "mouse_sensitivity", 20.0)
	config.set_value("settings", "volume", -2.0)
	config.set_value("settings", "quality", "ultra")
	assert_eq(config.save(TEST_PATH), OK)
	var settings: GameSettings = SETTINGS_SCRIPT.new(TEST_PATH)
	settings.load()
	assert_eq(settings.nickname.length(), 14)
	assert_eq(settings.mouse_sensitivity, 3.0)
	assert_eq(settings.volume, 0.0)
	assert_eq(settings.quality, &"med")
