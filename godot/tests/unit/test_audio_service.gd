extends GutTest

const AUDIO_SERVICE_SCRIPT := preload("res://src/audio/audio_service.gd")

const MANIFEST := {
	"voice": {"P": ["audio/p.wav"], "B": ["audio/b.wav"]},
	"round": {"P": ["audio/p-round.wav"]},
	"general": {"headshot": ["audio/headshot.wav"]},
	"cs": {"awp": ["audio/awp.wav"]},
}


func test_selects_samples_from_manifest_and_falls_back_when_missing() -> void:
	var audio := AUDIO_SERVICE_SCRIPT.new()
	add_child_autofree(audio)
	audio.set_manifest(MANIFEST)
	audio.sample_available = func(path: String) -> bool: return path != "audio/headshot.wav"

	assert_eq(audio.play_event(&"awp").source, &"sample")
	assert_eq(audio.play_event(&"headshot").source, &"fallback")
	assert_eq(audio.play_event(&"knife").source, &"fallback")


func test_empty_manifest_and_zero_volume_never_block_events() -> void:
	var audio := AUDIO_SERVICE_SCRIPT.new()
	add_child_autofree(audio)
	audio.set_manifest({})
	assert_eq(audio.play_event(&"awp").source, &"fallback")
	audio.set_volume(0.0)
	assert_eq(audio.play_event(&"awp").source, &"muted")


func test_voice_is_throttled_but_radio_is_not() -> void:
	var audio := AUDIO_SERVICE_SCRIPT.new()
	add_child_autofree(audio)
	audio.set_manifest(MANIFEST)
	audio.sample_available = func(_path: String) -> bool: return true

	assert_true(audio.play_voice(&"P", 10_000, 3.5))
	assert_false(audio.play_voice(&"P", 12_000, 3.5))
	assert_true(audio.play_voice(&"P", 13_500, 3.5))
	assert_true(audio.play_radio(&"P", 13_600))
	assert_true(audio.play_radio(&"P", 13_700))
