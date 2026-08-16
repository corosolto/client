extends GutTest

const RADIO_SCRIPT := preload("res://src/audio/radio_controller.gd")


func test_opens_each_legacy_category_and_selects_numbered_message() -> void:
	var radio := RADIO_SCRIPT.new()
	for category in [&"z", &"x", &"c"]:
		assert_true(radio.open(category))
		assert_eq(radio.current_items().size(), 3)
		var selection := radio.select(2)
		assert_eq(selection.category, category)
		assert_eq(selection.number, 2)
		assert_false(String(selection.message).is_empty())
		assert_false(radio.is_open())


func test_rejects_unknown_category_and_out_of_range_selection() -> void:
	var radio := RADIO_SCRIPT.new()
	assert_false(radio.open(&"q"))
	assert_true(radio.select(1).is_empty())
	assert_true(radio.open(&"z"))
	assert_true(radio.select(4).is_empty())
