// Mesmo delta de hover sobre a branch e o snapshot da main, sem trocar seu menu.
export function patchMapPreviewMenu(file, source) {
  if (file.endsWith('main.js')) {
    if (source.includes("from './amazonia_map_preview.js'")) return source;
    const replace = (from, to) => {
      if (!source.includes(from)) throw Error(`anchor de preview ausente: ${from}`);
      source = source.replace(from, to);
    };
    replace("import { VERSION } from './version.js';", "import { VERSION } from './version.js';\nimport { bindMapPreview, stopMapPreviews, previewRevision } from './amazonia_map_preview.js';");
    replace('function show(id) {', 'function show(id) {\n  stopMapPreviews();');
    replace('function renderMapScreen() {', 'function renderMapScreen() {\n  stopMapPreviews();');
    replace('  mapThumb.src = `/img/map-previews/${currentMap}.jpg?v=${VERSION}`;', '  mapThumb.src = `/img/map-previews/${currentMap}.jpg?v=${VERSION}${previewRevision(currentMap)}`;\n  bindMapPreview(mapThumb.parentElement, currentMap);');
    replace('  img.src = `/img/map-previews/${currentMap}.jpg?v=${VERSION}`;', '  img.src = `/img/map-previews/${currentMap}.jpg?v=${VERSION}${previewRevision(currentMap)}`;');
    replace('/${id}.jpg?v=${VERSION}"', '/${id}.jpg?v=${VERSION}${previewRevision(id)}"');
    replace("  $('ms-strip').querySelectorAll('.ms-thumb').forEach(b => {", "  $('ms-strip').querySelectorAll('.ms-thumb').forEach(b => {\n    bindMapPreview(b, b.dataset.id);");
    return source;
  }
  if (file.endsWith('index.astro')) {
    if (source.includes('href={`/map-preview.css?')) return source;
    const anchor='<link rel="stylesheet" href={`/style.css?v=${V}`}>', link='<link rel="stylesheet" href={`/map-preview.css?v=${V}-${JS_REV}`}>\n';
    if(!source.includes(anchor)) throw Error('anchor CSS ausente');
    return source.replace(anchor,link+anchor);
  }
  return source;
}
