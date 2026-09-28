/* grafo.mjs — grafo de importação de public/js, determinístico, do disco.
   ─────────────────────────────────────────────────────────────────────────────
   Dois usos: o estraga-codigo injeta o contexto no prompt de review (impacto
   cruzado) e o podador calcula módulos inalcançáveis a partir das entradas.
   Módulo → quem o importa (arestas reversas), estático E dinâmico
   (import('./x.js')). Cache por diretório. */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = dirname(dirname(fileURLToPath(import.meta.url)));
const _cache = new Map();

export function grafoDeImports(dirJs = join(RAIZ, '..', 'public', 'js')) {
  if (_cache.has(dirJs)) return _cache.get(dirJs);
  const importadores = new Map();
  if (existsSync(dirJs)) {
    for (const p of listaJs(dirJs)) {
      const t = readFileSync(p, 'utf8');
      const deps = [...t.matchAll(/(?:from\s+|import\(\s*)['"](\.[^'"]+)['"]/g)].map((m) => m[1]);
      for (const dep of deps) {
        const alvo = rel(dirJs, resolve(dirname(p), dep));
        if (alvo === rel(dirJs, p)) continue;
        if (!importadores.has(alvo)) importadores.set(alvo, []);
        importadores.get(alvo).push(rel(dirJs, p));
      }
    }
  }
  _cache.set(dirJs, importadores);
  return importadores;
}

/* Todos os módulos .js da árvore (exclui editor/, que não é publicado). */
export function listaModulos(dirJs = join(RAIZ, '..', 'public', 'js')) {
  return existsSync(dirJs) ? listaJs(dirJs).map((p) => rel(dirJs, p)) : [];
}

function listaJs(dirJs) {
  const js = [];
  (function varre(d) {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (e.name.startsWith('.') || e.name === 'editor') continue;
      const p = join(d, e.name);
      if (e.isDirectory()) varre(p);
      else if (e.name.endsWith('.js')) js.push(p);
    }
  })(dirJs);
  return js;
}

const rel = (base, p) => relative(base, p).split(sep).join('/');

/* Dos arquivos listados (caminhos de repo), os módulos public/js importados
 * por alguém → contexto de review. */
export function importadoresDe(arquivos, grafo = grafoDeImports()) {
  const saida = [];
  for (const f of arquivos) {
    const m = f.match(/^public\/js\/(.+\.js)$/);
    if (!m) continue;
    const quem = grafo.get(m[1]);
    if (quem && quem.length) saida.push({ modulo: m[1], importadores: quem });
  }
  return saida;
}

/* Alcance a partir das entradas (BFS nas arestas diretas). Devolve o conjunto
 * de módulos alcançáveis — quem está fora é candidato a morto. */
export function alcancaveis(entradas, grafo = grafoDeImports()) {
  const vistos = new Set();
  const fila = [...entradas];
  while (fila.length) {
    const mod = fila.pop();
    if (vistos.has(mod)) continue;
    vistos.add(mod);
    for (const [alvo, importadores] of grafo) {
      if (!vistos.has(alvo) && importadores.includes(mod)) fila.push(alvo);
    }
  }
  return vistos;
}
