/* ============================================================================
   props-acervo-check.mjs — TODO PROP DA FRENTE v2.1 TEM FONTE + SHA. (plans/13, frente E)
   ----------------------------------------------------------------------------
   O DEFEITO QUE ELA FECHA

   O acervo de `public/models/props/` tem 98 GLBs legados sem registro nenhum —
   chegaram antes da régua existir. O `eval:asset-integrity` confere SHA↔arquivo
   de quem ESTÁ no `mint-assets.json`, mas nada obriga um prop novo a ENTRAR no
   registro e a ganhar linha no `FONTE.md`: baixar o GLB do Mint e dropar na pasta
   passa verde em tudo. É o "documentação errada é o defeito mais caro" do AGENTS.md
   aplicado a asset: sem FONTE+SHA, o próximo agente não sabe de onde veio, qual a
   licença, nem se o arquivo foi refeito depois do registro.

   ── COMO ELA MEDE ──────────────────────────────────────────────────────────
   Escopo por marcador, não por pasta: entradas do `mint-assets.json` com
   `source.frente === 'v21-e-models'`. O legado sem registro fica fora (regularizar
   98 GLBs é outra frente); o que a frente E entrega entra com o marcador e cai
   nas três cláusulas:
     PAC1 · files[0] é .glb, artifactType model/gltf-binary, e o arquivo existe;
     PAC2 · processing.finalSha256 presente (a conferência SHA↔bytes é do
            eval:asset-integrity — não duplicar régua);
     PAC3 · o basename do GLB aparece em public/models/props/FONTE.md.

   A frente `javaporcos-realista` (props de Sketchfab/Poly Haven, 30/10/2026) entra
   nas mesmas três e em mais duas, porque não vem do Mint:
     PAC4 · source.license e source.url presentes (CC-BY exige crédito ao autor);
     PAC5 · o GLB abre no gltf-transform e cabe no teto da classe
            (TETO em tools/javaporcos-realista-assets.mjs).

   ── AS MUTAÇÕES QUE PROVAM ─────────────────────────────────────────────────
     --mutante=sem-fonte ....... esconde um basename do FONTE em memória → vermelho
     --mutante=sem-sha ......... remove um finalSha256 em memória → vermelho
     --mutante=arquivo-sumido .. aponta um files[0] para caminho inexistente → vermelho
     --mutante=id-quebrado ..... troca o GLB do 1º prop javaporcos por um id inexistente → vermelho
     --mutante=sem-licenca ..... apaga a licença do 1º prop javaporcos → vermelho
     --mutante=acima-do-teto ... divide o teto da classe do 1º prop javaporcos por 100 → vermelho
   ============================================================================ */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { basename } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { TETO } from '../javaporcos-realista-assets.mjs';

const FONTE = 'public/models/props/FONTE.md';
const MUTANTES = new Set(['sem-fonte', 'sem-sha', 'arquivo-sumido', 'id-quebrado', 'sem-licenca', 'acima-do-teto', 'nc-publicado']);
const FRENTES = new Set(['v21-e-models', 'javaporcos-realista', 'javaporcos-mint-packs']);
const JP = 'javaporcos-realista';
const mutante = process.argv.find((arg) => arg.startsWith('--mutante='))?.slice(10);
if (mutante && !MUTANTES.has(mutante)) {
  console.error(`mutante desconhecido: ${mutante}`);
  process.exit(2);
}

const registry = JSON.parse(readFileSync('mint-assets.json', 'utf8'));
const entradas = Object.entries(registry.assets || {})
  .filter(([, asset]) => FRENTES.has(asset.source?.frente));
const primeiroJp = entradas.findIndex(([, asset]) => asset.source?.frente === JP);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

const fonte = existsSync(FONTE) ? readFileSync(FONTE, 'utf8') : '';
const erros = [];
for (const id of ['saveiro_robust', 'byd_dolphin']) {
  if (existsSync(`public/models/props/${id}.glb`) || mutante === 'nc-publicado') {
    erros.push(`${id}: PAC6 — asset NC sem autorização não pode estar em public/`);
  }
}

if (!entradas.length) {
  if (mutante) {
    console.error('MUTANTE NÃO APLICOU: nenhum prop v2.1 registrado ainda.');
    process.exit(2);
  }
  console.log('PROPS-ACERVO ✓ 0 props v2.1 registrados (pré-lote) — mutantes provam a mordida');
  process.exit(0);
}
if (!fonte) erros.push(`${FONTE} não existe e há ${entradas.length} prop(s) v2.1 registrado(s)`);

if (['id-quebrado', 'sem-licenca', 'acima-do-teto'].includes(mutante) && primeiroJp < 0) {
  console.error(`MUTANTE NÃO APLICOU: nenhum prop ${JP} registrado ainda.`);
  process.exit(2);
}

for (const [index, [id, asset]] of entradas.entries()) {
  const alvo = mutante && index === 0;
  const alvoJp = mutante && index === primeiroJp;
  let file = alvo && mutante === 'arquivo-sumido' ? 'public/models/props/NAO_EXISTE.glb' : asset.files?.[0];
  if (alvoJp && mutante === 'id-quebrado') file = file.replace(/\.glb$/, '_quebrado.glb');
  const sha = alvo && mutante === 'sem-sha' ? undefined : asset.processing?.finalSha256;
  const textoFonte = alvo && mutante === 'sem-fonte' ? fonte.replace(basename(file || ''), '') : fonte;

  if (!file || !file.endsWith('.glb') || asset.artifactType !== 'model/gltf-binary') {
    erros.push(`${id}: PAC1 — files[0] precisa ser o GLB final com artifactType model/gltf-binary (recebeu ${file || 'ausente'})`);
  } else if (!existsSync(file)) {
    erros.push(`${id}: PAC1 — GLB registrado não existe no disco (${file})`);
  }
  if (!sha) erros.push(`${id}: PAC2 — processing.finalSha256 ausente; registre o SHA do arquivo final`);
  if (file && !textoFonte.includes(basename(file))) {
    erros.push(`${id}: PAC3 — ${basename(file)} sem linha no ${FONTE} (procedência, licença, pipeline)`);
  }

  if (![JP,'javaporcos-mint-packs'].includes(asset.source?.frente)) continue;
  if (asset.source.frente === JP) {
    const licenca = alvoJp && mutante === 'sem-licenca' ? undefined : asset.source.license;
    if (!licenca || !asset.source.url) erros.push(`${id}: PAC4 — source.license e source.url obrigatórios (procedência de terceiro)`);
  }
  const teto = TETO[asset.source.classe];
  if (!teto) { erros.push(`${id}: PAC5 — classe "${asset.source.classe}" sem teto`); continue; }
  if (!file || !existsSync(file)) continue;
  const div = alvoJp && mutante === 'acima-do-teto' ? 100 : 1;
  const doc = await io.read(file);
  const tris = doc.getRoot().listMeshes().reduce((n, m) => n + m.listPrimitives()
    .reduce((a, p) => a + (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3, 0), 0);
  const bytes = statSync(file).size;
  if (!tris) erros.push(`${id}: PAC5 — GLB sem triângulo (${file})`);
  if (tris > teto.tris / div || bytes > teto.bytes / div) {
    erros.push(`${id}: PAC5 — ${tris} tris / ${bytes} B acima do teto ${asset.source.classe} (${teto.tris / div} tris / ${teto.bytes / div} B)`);
  }
}

if (erros.length) {
  erros.forEach((erro) => console.error(`✗ ${erro}`));
  process.exit(1);
}
console.log(`PROPS-ACERVO ✓ ${entradas.length} props (v2.1 + ${JP} + javaporcos-mint-packs) com GLB no disco, finalSha256 e FONTE.md; Javaporcos no teto, terceiros com licença`);
