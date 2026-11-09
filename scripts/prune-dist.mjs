/* ============================================================================
   prune-dist.mjs: TIRA DO PUBLICADO O QUE É BANCADA LOCAL. (T2)
   ----------------------------------------------------------------------------
   Nasceu para podar `models/fpvm` (159 MB atrás de `?tripovm=1`/`?tvm=1`) do
   `dist/client`. A pasta saiu do repo em 07/08/2026 (`git log -- public/models/fpvm`),
   e as entradas `editor/` e `js/editor` apontavam para pastas que também não existem
   mais; as três saíram da lista em 11/2026. O que sobra: bancadas locais que o site
   publicado não serve, e o viewmodel privado fora do manifesto (abaixo).

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
const ALVOS = [
  // Bancadas locais não fazem parte do site publicado.
  'dist/client/dev.html',
  '.vercel/output/static/dev.html',
  'dist/client/ui-v3-kit.html',
  '.vercel/output/static/ui-v3-kit.html',
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

let total = 0, podados = 0;
for (const alvo of ALVOS) {
  if (!existsSync(alvo)) continue;
  const st = statSync(alvo);
  const b = st.isDirectory() ? tamanho(alvo) : st.size;
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
