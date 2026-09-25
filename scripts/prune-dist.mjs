/* ============================================================================
   prune-dist.mjs — TIRA DO PUBLICADO O QUE SÓ CARREGA ATRÁS DE FLAG. (T2)
   ----------------------------------------------------------------------------
   `dist/client` são 625 MB, e 159 deles são `models/fpvm` — maior que props (107 MB)
   e que characters (23 MB) juntos com anims. Nenhum jogador baixa isso: os dois
   únicos consumidores estão atrás de flag de depuração na querystring.

     · `public/js/fparms.js:107` — `if (!TRIPO_VM) return` ANTES do download.
       TRIPO_VM é `?tripovm=1`.
     · `public/js/game.js:1902` — `this._tvm = qp.get('tvm') === '1'` e o
       `GLTFLoader().load('models/fpvm/…')` só roda dentro do `if`.

   Ou seja: 159 MB que só existem para duas provas manuais do dono, servidos e
   pagos em toda build de produção.

   ── POR QUE PODAR NO FIM, E NÃO MOVER O `public/` ───────────────────────────
   A alternativa era tirar a pasta de `public/` e guardá-la fora. Ela quebra as
   duas flags NA MÁQUINA DE QUEM DESENVOLVE, que é justamente onde elas servem
   pra alguma coisa, e quebra `tools/optimize-fpvm.mjs`, `tools/g2-gunspace.mjs`,
   `tools/m4-twotone.mjs` e `tools/g2r14c-compress.mjs`, que leem de
   `public/models/fpvm`. Podar o BUILD deixa tudo isso de pé e só não publica.

   ── O QUE ISSO CUSTA, DITO EM VOZ ALTA ──────────────────────────────────────
   `?tripovm=1` e `?tvm=1` param de funcionar EM PRODUÇÃO (404 no GLB; os dois
   caminhos já tratam falha — `fparms` com `.catch` e aviso, o `tvm` é opcional por
   construção). Continuam funcionando em `npm run dev`. Se um dia alguém precisar
   deles no ar: `KEEP_FPVM=1 npm run build`.

   ── ONDE RODA ───────────────────────────────────────────────────────────────
   No fim do `npm run build`, DEPOIS do `astro build` — o adaptador da Vercel
   espelha `dist/client` em `.vercel/output/static`, então os dois lugares são
   podados, senão o deploy sobe pelo espelho e a poda não teria servido pra nada.
   ============================================================================ */
import { existsSync, readFileSync, rmSync, statSync, readdirSync } from 'node:fs';
import path from 'node:path';

/* Lista fechada e literal. Poda dirigida por padrão (glob, regex) num script que
   roda `rmSync(recursive)` é como se apaga a pasta errada — o alvo tem que ser
   legível numa olhada. */
const KEEP_FPVM = process.env.KEEP_FPVM === '1';
const ALVOS = [
  ...(KEEP_FPVM ? [] : [
    'dist/client/models/fpvm',
    '.vercel/output/static/models/fpvm',
  ]),
  // Bancadas locais não fazem parte do site publicado.
  'dist/client/dev.html',
  '.vercel/output/static/dev.html',
  'dist/client/editor',
  '.vercel/output/static/editor',
  'dist/client/js/editor',
  '.vercel/output/static/js/editor',
  'dist/client/img/reticle-pu.png',
  '.vercel/output/static/img/reticle-pu.png',
];

function tamanho(dir) {
  let n = 0;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    n += e.isDirectory() ? tamanho(p) : statSync(p).size;
  }
  return n;
}
const mb = (b) => (b / 1024 / 1024).toFixed(1) + ' MB';

if (KEEP_FPVM) {
  console.log('  poda: KEEP_FPVM=1 — models/fpvm mantido no publicado.');
}

let total = 0, podados = 0;
for (const alvo of ALVOS) {
  if (!existsSync(alvo)) continue;
  const st = statSync(alvo);
  const b = st.isDirectory() ? tamanho(alvo) : st.size;   // ALVOS tem pasta (fpvm) E arquivo (bancadas)
  rmSync(alvo, { recursive: true, force: true });
  total += b; podados++;
  console.log(`  poda: ${alvo} (${mb(b)})`);
}
if (!podados) {
  console.log('  poda: nada a podar.');
} else {
  console.log(`  poda: ${mb(total)} fora do publicado.`);
}

/* Viewmodel privado: só sai publicado o que está no manifesto (tools/viewmodels/
   vm-assets.manifest.json). Build local pelo symlink copiaria também clipes crus e
   relatórios do assado. Manifesto ilegível reprova: publicar às cegas não é opção. */
const VM_DIRS = ['dist/client/private-assets/viewmodels', '.vercel/output/static/private-assets/viewmodels'];
if (VM_DIRS.some((d) => existsSync(d))) {
  const lista = new Set(JSON.parse(readFileSync('tools/viewmodels/vm-assets.manifest.json', 'utf8')).files.map((f) => f.path));
  if (!lista.size) throw new Error('prune-dist: manifesto do viewmodel vazio');
  for (const raiz of VM_DIRS.filter((d) => existsSync(d))) {
    let fora = 0, bytes = 0;
    const varre = (dir, rel) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name), r = rel ? `${rel}/${e.name}` : e.name;
        if (e.isDirectory()) { varre(p, r); if (!readdirSync(p).length) rmSync(p, { recursive: true }); }
        else if (!lista.has(r)) { bytes += statSync(p).size; rmSync(p, { force: true }); fora++; }
      }
    };
    varre(raiz, '');
    console.log(`  poda: ${raiz} — ${fora} arquivo(s) fora do manifesto (${mb(bytes)})`);
  }
}
