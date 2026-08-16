extends GutTest

const EXPORT_PRESETS_PATH := "res://export_presets.cfg"


func test_web_export_is_release_ready_and_single_threaded() -> void:
	assert_true(FileAccess.file_exists(EXPORT_PRESETS_PATH), "Web export preset must exist")
	if not FileAccess.file_exists(EXPORT_PRESETS_PATH):
		return

	var presets := ConfigFile.new()
	assert_eq(presets.load(EXPORT_PRESETS_PATH), OK)
	assert_eq(presets.get_value("preset.0", "name"), "Web")
	assert_eq(presets.get_value("preset.0", "platform"), "Web")
	assert_true(presets.get_value("preset.0", "runnable"))
	assert_eq(presets.get_value("preset.0", "export_path"), "../build/web/index.html")
	var excluded_resources: String = presets.get_value("preset.0", "exclude_filter")
	assert_true(excluded_resources.contains("addons/gut/*"))
	assert_true(excluded_resources.contains("tests/*"))
	assert_false(presets.get_value("preset.0.options", "variant/thread_support"))
	assert_false(presets.get_value("preset.0.options", "variant/extensions_support"))
	assert_false(
		presets.get_value(
			"preset.0.options",
			"progressive_web_app/ensure_cross_origin_isolation_headers"
		)
	)
