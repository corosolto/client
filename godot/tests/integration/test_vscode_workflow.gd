extends GutTest


func test_vscode_exposes_required_godot_tasks() -> void:
	var tasks: Variant = _read_repo_json(".vscode/tasks.json")
	assert_typeof(tasks, TYPE_DICTIONARY)
	if typeof(tasks) != TYPE_DICTIONARY:
		return

	var labels: Array = tasks.tasks.map(func(task: Dictionary) -> Variant: return task.label)
	assert_has(labels, "Godot: Editor")
	assert_has(labels, "Godot: Run")
	assert_has(labels, "Godot: Test")
	assert_has(labels, "Godot: Export Web")
	assert_has(labels, "Godot: Serve Web")
	assert_has(labels, "Godot: Test Web")
	assert_has(labels, "Godot: Test Web Performance")


func test_vscode_declares_godot_debugger_and_extension() -> void:
	var launch: Variant = _read_repo_json(".vscode/launch.json")
	var extensions: Variant = _read_repo_json(".vscode/extensions.json")
	assert_typeof(launch, TYPE_DICTIONARY)
	assert_typeof(extensions, TYPE_DICTIONARY)
	if typeof(launch) != TYPE_DICTIONARY or typeof(extensions) != TYPE_DICTIONARY:
		return

	assert_eq(launch.configurations[0].type, "godot")
	assert_eq(launch.configurations[0].debugServer, 6006.0)
	assert_has(extensions.recommendations, "geequlim.godot-tools")


func test_repository_has_portable_godot_launcher() -> void:
	var launcher_path := _repo_file_path("scripts/godot.sh")
	assert_true(FileAccess.file_exists(launcher_path))
	if not FileAccess.file_exists(launcher_path):
		return

	var launcher := FileAccess.get_file_as_string(launcher_path)
	assert_string_contains(launcher, "GODOT_BIN")
	assert_string_contains(launcher, "/Applications/Godot.app/Contents/MacOS/Godot")


func _read_repo_json(relative_path: String) -> Variant:
	var path := _repo_file_path(relative_path)
	assert_true(FileAccess.file_exists(path), "%s must exist" % relative_path)
	if not FileAccess.file_exists(path):
		return null
	return JSON.parse_string(FileAccess.get_file_as_string(path))


func _repo_file_path(relative_path: String) -> String:
	return ProjectSettings.globalize_path("res://../%s" % relative_path)
