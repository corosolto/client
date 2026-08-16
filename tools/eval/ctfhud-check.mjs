/* ============================================================================
   ctfhud-check.mjs — A FAIXA DE BANDEIRAS SÓ APARECE EM CTF?
   ----------------------------------------------------------------------------
   POR QUE EXISTE (defeito relatado pelo dono, com estas palavras)
     "ainda tem bug, alguns mapas como round mostram as bandeiras no ui, mesmo sem
      ter a captura, e vice-versa"

   CAUSA RAIZ (KNOWN-BUGS.md BUG-01)
   `#ctf-hud` nasce com `hidden` no index.astro, e `_updateCtfHud()` fazia
   `classList.remove('hidden')` sem consultar o modo. Como não existia UM ÚNICO
   `add('hidden')` para esse elemento em todo o repo — nem no `dispose()`, que esconde
   outros 12 — a faixa ficava na tela para sempre depois da primeira partida de CTF.
   Jogar CTF, voltar ao menu e abrir uma partida de rounds SEM recarregar a página
   mostrava as bandeiras da partida anterior, com o HTML congelado.

   COMO ELE MEDE (e por que não é regex)
   Procurar `add('hidden')` no texto mediria a FORMA do código: bastaria alguém escrever
   o mesmo bug com outro nome pra ficar verde — e este projeto já teve um mutante que
   passava 20/22 justamente porque a régua lia a declaração e não o uso.
   Aqui o arnês EXECUTA o código de produção: recorta de game.js, por casamento de
   chaves, o texto exato de `_hideCtfHud` e `_updateCtfHud`, e roda os dois contra um
   elemento de mentira que registra classes e innerHTML, em três cenários reais.

   O `dispose()` não é executável isolado (mexe em document/window e em 12 elementos),
   então dele o arnês exige o que é verificável sem executar: que o corpo chame
   `_hideCtfHud()`. Isso é assumidamente estrutural, e está anotado como tal.

   MUTAÇÃO (regra da casa: régua que não morde não existe)
     node tools/eval/ctfhud-check.mjs --mutate
   remove a guarda de modo do código extraído e exige que o teste FIQUE VERMELHO. Se a
   mutação passar, o arnês sai 1 denunciando a si mesmo.

   Uso: node tools/eval/ctfhud-check.mjs [--mutate] [--json]
   ============================================================================ */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const SRC = readFileSync(path.join(ROOT, 'public', 'js', 'game.js'), 'utf8');
const MUTATE = process.argv.includes('--mutate');
const JSON_OUT = process.argv.includes('--json');

/** recorta `nome() { ... }` de uma classe por casamento de chaves */
function method(name) {
  const start = SRC.indexOf(`\n  ${name}() {`);
  if (start < 0) throw new Error(`método ${name}() não encontrado em game.js — o arnês falha em vez de passar`);
  let i = SRC.indexOf('{', start), depth = 0;
  for (let j = i; j < SRC.length; j++) {
    if (SRC[j] === '{') depth++;
    else if (SRC[j] === '}') { depth--; if (depth === 0) return SRC.slice(start, j + 1); }
  }
  throw new Error(`chaves desbalanceadas em ${name}()`);
}

let hideSrc = method('_hideCtfHud');
let updSrc = method('_updateCtfHud');

/* A MUTAÇÃO: apaga a guarda de modo, que é a correção inteira. Se o teste continuar
   verde depois disso, a régua está cega. */
if (MUTATE) {
  const guard = /if \(!this\.ctf \|\| !this\.ctfPts\.length\) \{ this\._hideCtfHud\(\); return; \}/;
  if (!guard.test(updSrc)) {
    console.error('✗ MUTAÇÃO IMPOSSÍVEL: a guarda de modo não está mais no formato esperado.');
    console.error('  Se você reescreveu _updateCtfHud, ajuste o regex desta mutação junto.');
    process.exit(1);
  }
  updSrc = updSrc.replace(guard, '');
}

/* elemento de mentira: registra o que o código de produção faz com ele */
const fakeEl = () => {
  const cls = new Set(['hidden']);
  return {
    innerHTML: '',
    classList: { add: (c) => cls.add(c), remove: (c) => cls.delete(c), contains: (c) => cls.has(c) },
    get hidden() { return cls.has('hidden'); },
  };
};

/* `this` mínimo: só o que os dois métodos tocam. Qualquer coisa a mais que eles passem a
   usar quebra aqui com ReferenceError — de propósito: é o aviso de que a régua envelheceu. */
function run({ ctf, pts }) {
  const el = fakeEl();
  const ctfPts = Array.from({ length: pts }, (_, i) => ({
    id: 'p' + i, label: 'BANDEIRA ' + i, owner: null, prog: 0, capTeam: null,
  }));
  const ctx = {
    ctf, ctfPts,
    el: { ctfHud: el },
    ctfCaps: { P: 0, B: 0 },   // o placar de capturas que a faixa imprime no fim da linha
    _teamColor: () => '#fff',
    _hideCtfHud: null, _updateCtfHud: null,
  };
  // eslint-disable-next-line no-new-func
  const build = new Function('ctx', `
    const o = {
      ${hideSrc.trim().replace(/^_hideCtfHud\(\)/, '_hideCtfHud()')},
      ${updSrc.trim().replace(/^_updateCtfHud\(\)/, '_updateCtfHud()')}
    };
    Object.assign(ctx, { _hideCtfHud: o._hideCtfHud, _updateCtfHud: o._updateCtfHud });
    ctx._updateCtfHud();
    return ctx.el.ctfHud;
  `);
  return build(ctx);
}

const casos = [
  { nome: 'rounds (sem bandeiras)  -> faixa ESCONDIDA', arg: { ctf: false, pts: 0 }, espera: true },
  { nome: 'rounds em mapa de CTF   -> faixa ESCONDIDA', arg: { ctf: false, pts: 4 }, espera: true },
  { nome: 'CTF com 4 bandeiras     -> faixa VISÍVEL',   arg: { ctf: true, pts: 4 }, espera: false },
  { nome: 'CTF sem bandeira no mapa-> faixa ESCONDIDA', arg: { ctf: true, pts: 0 }, espera: true },
];

const res = [];
for (const c of casos) {
  let el, erro = null;
  try { el = run(c.arg); } catch (e) { erro = e.message; }
  const ok = !erro && el.hidden === c.espera && (!el.hidden || el.innerHTML === '');
  res.push({ nome: c.nome, ok, erro, escondida: el?.hidden, html: el?.innerHTML?.length ?? 0 });
}

// dispose(): estrutural e assumido como tal — ver cabeçalho
const disposeSrc = (() => {
  const i = SRC.indexOf('\n  dispose() {');
  return i < 0 ? '' : SRC.slice(i, i + 2500);
})();
const disposeOk = /_hideCtfHud\(\)/.test(disposeSrc);
res.push({ nome: 'dispose() esconde a faixa ao sair da partida (estrutural)', ok: disposeOk });

const falhas = res.filter(r => !r.ok);

if (JSON_OUT) { console.log(JSON.stringify({ mutate: MUTATE, res }, null, 1)); }
else {
  console.log(MUTATE ? 'CTFHUD (MUTANTE — o esperado é FALHAR)\n' : 'CTFHUD\n');
  for (const r of res) console.log(` ${r.ok ? '✓' : '✗'} ${r.nome}${r.erro ? '  ERRO: ' + r.erro : ''}`);
}

if (MUTATE) {
  if (falhas.length) {
    console.log(`\n✓ a régua MORDE: a mutação derrubou ${falhas.length} caso(s).`);
    process.exit(0);
  }
  console.error('\n✗ RÉGUA CEGA: apagar a guarda de modo não derrubou nenhum caso.');
  process.exit(1);
}

console.log(`\n${falhas.length ? '✗' : '✓'} CTFHUD ${res.length - falhas.length}/${res.length} casos`);
process.exit(falhas.length ? 1 : 0);
