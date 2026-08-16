class_name GameSettings
extends RefCounted

const DEFAULT_PATH := "user://csbrasil_settings.cfg"
const WEB_STORAGE_KEY := "csbrasil_godot_settings"

var nickname: String = ""
var mouse_sensitivity: float = 1.0
var volume: float = 0.7
var quality: StringName = &"med"
var _storage_path: String


func _init(storage_path: String = DEFAULT_PATH) -> void:
	_storage_path = storage_path


func load() -> void:
	if OS.has_feature("web"):
		var stored: Variant = JavaScriptBridge.eval(
			"localStorage.getItem('%s') || ''" % WEB_STORAGE_KEY
		)
		if stored is String and not stored.is_empty():
			var parsed: Variant = JSON.parse_string(stored)
			if parsed is Dictionary:
				_apply_dictionary(parsed)
				return
	var config := ConfigFile.new()
	if config.load(_storage_path) != OK:
		return
	_apply_dictionary({
		"nickname": config.get_value("player", "nickname", ""),
		"mouse_sensitivity": config.get_value("settings", "mouse_sensitivity", 1.0),
		"volume": config.get_value("settings", "volume", 0.7),
		"quality": config.get_value("settings", "quality", "med"),
	})


func save() -> Error:
	_normalize()
	if OS.has_feature("web"):
		var encoded := JSON.stringify(to_dictionary())
		JavaScriptBridge.eval(
			"localStorage.setItem('%s', %s)" % [WEB_STORAGE_KEY, JSON.stringify(encoded)]
		)
		return OK
	var config := ConfigFile.new()
	config.set_value("player", "nickname", nickname)
	config.set_value("settings", "mouse_sensitivity", mouse_sensitivity)
	config.set_value("settings", "volume", volume)
	config.set_value("settings", "quality", quality)
	return config.save(_storage_path)


func to_dictionary() -> Dictionary:
	_normalize()
	return {
		"nickname": nickname,
		"mouse_sensitivity": mouse_sensitivity,
		"volume": volume,
		"quality": String(quality),
	}


func _apply_dictionary(data: Dictionary) -> void:
	nickname = String(data.get("nickname", ""))
	mouse_sensitivity = float(data.get("mouse_sensitivity", 1.0))
	volume = float(data.get("volume", 0.7))
	quality = StringName(data.get("quality", "med"))
	_normalize()


func _normalize() -> void:
	nickname = nickname.substr(0, 14)
	mouse_sensitivity = clampf(mouse_sensitivity, 0.2, 3.0)
	volume = clampf(volume, 0.0, 1.0)
	if quality not in [&"low", &"med", &"high"]:
		quality = &"med"
