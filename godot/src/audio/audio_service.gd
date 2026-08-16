class_name AudioService
extends Node

signal event_played(event_name: StringName, source: StringName, path: String)

const MANIFEST_PATH := "res://data/audio_manifest.json"
const GENERAL_EVENTS := [&"doublekill", &"triplekill", &"multikill", &"megakill", &"killingspree", &"godlike", &"headshot"]

var volume: float = 0.7
var manifest: Dictionary = {}
var event_history: Array[Dictionary] = []
var sample_available: Callable = func(_path: String) -> bool: return true
var _last_voice_msec: int = -1_000_000
var _random := RandomNumberGenerator.new()


func _ready() -> void:
	_random.seed = 2026
	load_manifest()
	if OS.has_feature("web"):
		_install_web_bridge()


func load_manifest(path: String = MANIFEST_PATH) -> bool:
	if not FileAccess.file_exists(path):
		manifest = {}
		return false
	var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(path))
	if not parsed is Dictionary:
		manifest = {}
		return false
	set_manifest(parsed)
	return true


func set_manifest(value: Dictionary) -> void:
	manifest = value.duplicate(true)


func set_volume(value: float) -> void:
	volume = clampf(value, 0.0, 1.0)


func unlock() -> void:
	if OS.has_feature("web"):
		JavaScriptBridge.eval("window.__csAudioUnlock && window.__csAudioUnlock();")


func play_event(event_name: StringName) -> Dictionary:
	var path := _sample_for_event(event_name)
	return _play(event_name, path, false)


func play_round(team: StringName) -> Dictionary:
	return _play(&"round", _pick_nested(&"round", team), false)


func play_voice(team: StringName, now_msec: int = -1, min_gap_seconds: float = 3.5) -> bool:
	var current := Time.get_ticks_msec() if now_msec < 0 else now_msec
	if current - _last_voice_msec < roundi(min_gap_seconds * 1000.0):
		return false
	var path := _pick_nested(&"voice", team)
	_play(&"voice", path, false)
	_last_voice_msec = current
	return true


func play_radio(team: StringName, now_msec: int = -1) -> bool:
	var current := Time.get_ticks_msec() if now_msec < 0 else now_msec
	_play(&"radio", _pick_nested(&"voice", team), true)
	_last_voice_msec = current
	return true


func latest_event() -> Dictionary:
	return event_history[-1] if not event_history.is_empty() else {}


func _sample_for_event(event_name: StringName) -> String:
	if event_name in GENERAL_EVENTS:
		return _pick_nested(&"general", event_name)
	return _pick_nested(&"cs", event_name)


func _pick_nested(group: StringName, key: StringName) -> String:
	var section: Variant = manifest.get(String(group), manifest.get(group, {}))
	if not section is Dictionary:
		return ""
	var entries: Variant = section.get(String(key), section.get(key, []))
	if not entries is Array or entries.is_empty():
		return ""
	return String(entries[_random.randi_range(0, entries.size() - 1)])


func _play(event_name: StringName, path: String, radio: bool) -> Dictionary:
	var source: StringName = &"muted"
	if volume > 0.0:
		source = &"sample" if not path.is_empty() and sample_available.call(path) else &"fallback"
	var result := {"event": event_name, "source": source, "path": path}
	event_history.append(result)
	if event_history.size() > 32:
		event_history.pop_front()
	event_played.emit(event_name, source, path)
	if OS.has_feature("web"):
		JavaScriptBridge.eval(
			"window.__csPlayAudio && window.__csPlayAudio(%s,%f,%s,%s);" % [
				JSON.stringify(path), volume, JSON.stringify(String(event_name)), "true" if radio else "false"
			]
		)
	return result


func _install_web_bridge() -> void:
	JavaScriptBridge.eval(
		"""
(() => {
  window.__csbrasilAudioEvents = window.__csbrasilAudioEvents || [];
  const Ctx = window.AudioContext || window.webkitAudioContext;
  let ctx = null, radio = null;
  const unlock = () => {
    try { ctx = ctx || new Ctx(); if (ctx.state === 'suspended') ctx.resume(); } catch (_) {}
  };
  const tone = (kind, volume) => {
    unlock(); if (!ctx || volume <= 0) return;
    const osc = ctx.createOscillator(), gain = ctx.createGain(), now = ctx.currentTime;
    const map = {awp:90,pistol:180,knife:700,knifehit:330,scope:880,reload:240,headshot:1200,round:520,roundstart:440,matchwin:1040,voice:260,radio:300,hurt:140,death:80,respawn:660,doublekill:780,triplekill:920,multikill:1040,megakill:1180};
    osc.type = (kind === 'awp' || kind === 'death') ? 'sawtooth' : 'square';
    osc.frequency.setValueAtTime(map[kind] || 500, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, (map[kind] || 500) * .65), now + .14);
    gain.gain.setValueAtTime(Math.max(.0001, volume * .16), now);
    gain.gain.exponentialRampToValueAtTime(.0001, now + .16);
    osc.connect(gain); gain.connect(ctx.destination); osc.start(now); osc.stop(now + .18);
  };
  window.__csAudioUnlock = unlock;
  window.__csPlayAudio = (path, volume, kind, isRadio) => {
    if (volume <= 0) { window.__csbrasilAudioEvents.push({kind, source:'muted'}); return; }
    let settled = false;
    const fallback = () => { if (settled) return; settled = true; tone(kind, volume); window.__csbrasilAudioEvents.push({kind, source:'fallback'}); };
    if (!path) { fallback(); return; }
    try {
      if (isRadio && radio) { radio.pause(); radio = null; }
      const audio = new Audio(encodeURI(path)); audio.volume = Math.min(1, volume);
      audio.onplaying = () => { if (!settled) { settled = true; window.__csbrasilAudioEvents.push({kind, source:'sample', path}); } };
      audio.onerror = fallback;
      if (isRadio) radio = audio;
      audio.play().catch(fallback);
    } catch (_) { fallback(); }
  };
})();
"""
	)
