class_name RadioController
extends RefCounted

const CATEGORIES := {
	&"z": {"title": "COMANDOS", "items": ["Bora, bora, bora!", "Cobre eu!", "Recua, recua!"]},
	&"x": {"title": "RESPOSTAS", "items": ["Recebido!", "Negativo!", "Bonito tiro!"]},
	&"c": {"title": "ZOAÇÃO", "items": ["Chora na live!", "É fake news!", "Vem pra treta!"]},
}

var current_category: StringName = &""


func open(category: StringName) -> bool:
	if not CATEGORIES.has(category):
		return false
	current_category = category
	return true


func close() -> void:
	current_category = &""


func is_open() -> bool:
	return not current_category.is_empty()


func title() -> String:
	return String(CATEGORIES[current_category].title) if is_open() else ""


func current_items() -> Array:
	return CATEGORIES[current_category].items if is_open() else []


func select(number: int) -> Dictionary:
	if not is_open() or number < 1 or number > current_items().size():
		return {}
	var category := current_category
	var message: String = current_items()[number - 1]
	close()
	return {"category": category, "number": number, "message": message}
