extends GutTest

const MAIN_SCENE_PATH := "res://src/main/main.tscn"


func test_main_scene_exposes_parallel_boot_hosts() -> void:
	assert_true(ResourceLoader.exists(MAIN_SCENE_PATH), "Main scene must exist")
	if not ResourceLoader.exists(MAIN_SCENE_PATH):
		return

	var packed_scene := load(MAIN_SCENE_PATH) as PackedScene
	var main := packed_scene.instantiate()
	add_child_autofree(main)

	assert_not_null(main.get_node_or_null("WorldHost"))
	assert_true(main.get_node("WorldHost") is Node3D)
	assert_not_null(main.get_node_or_null("GuiHost"))
	assert_true(main.get_node("GuiHost") is CanvasLayer)
	assert_eq(main.get_node("GuiHost/BootPanel/Title").text, "CS BRASIL")
	assert_eq(main.get_node("GuiHost/BootPanel/Status").text, "CLIQUE PARA CAPTURAR O MOUSE · WASD PARA MOVER")


func test_project_declares_main_scene() -> void:
	assert_eq(
		ProjectSettings.get_setting("application/run/main_scene"),
		MAIN_SCENE_PATH
	)
