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
   Escopo por marcador, não por pasta: entradas do `mint-assets.json` cuja
   `source.frente` está em FRENTES (v21-e-models, atacadao-secoes). O legado fica fora (regularizar
   98 GLBs é outra frente); o que a frente E entrega entra com o marcador e cai
   nas três cláusulas:
     PAC1 · files[0] é .glb, artifactType model/gltf-binary, e o arquivo existe;
     PAC2 · processing.finalSha256 presente (a conferência SHA↔bytes é do
            eval:asset-integrity — não duplicar régua);
     PAC3 · o basename do GLB aparece em public/models/props/FONTE.md.

   ── AS MUTAÇÕES QUE PROVAM ─────────────────────────────────────────────────
     --mutante=sem-fonte ....... esconde um basename do FONTE em memória → vermelho
     --mutante=sem-sha ......... remove um finalSha256 em memória → vermelho
     --mutante=arquivo-sumido .. aponta um files[0] para caminho inexistente → vermelho
   ============================================================================ */
import { existsSync, readFileSync } from 'node:fs';
import { basename } from 'node:path';

const FONTE = 'public/models/props/FONTE.md';
const MUTANTES = new Set(['sem-fonte', 'sem-sha', 'arquivo-sumido']);
const mutante = process.argv.find((arg) => arg.startsWith('--mutante='))?.slice(10);
if (mutante && !MUTANTES.has(mutante)) {
  console.error(`mutante desconhecido: ${mutante}`);
  process.exit(2);
}

const registry = JSON.parse(readFileSync('mint-assets.json', 'utf8'));
/* Escopo por marcador. Começou só com a frente E da v2.1; a frente das seções do
   atacadão entrou com provedor DIFERENTE (Replicate, não Mint) e tem exatamente a
   mesma necessidade de FONTE+SHA, então ganha marcador próprio dentro do mesmo
   escopo em vez de mentir a frente para caber na régua. */
const FRENTES = new Set(['v21-e-models', 'atacadao-secoes']);
const entradas = Object.entries(registry.assets || {})
  .filter(([, asset]) => FRENTES.has(asset.source?.frente));

const fonte = existsSync(FONTE) ? readFileSync(FONTE, 'utf8') : '';
const erros = [];

if (!entradas.length) {
  if (mutante) {
    console.error('MUTANTE NÃO APLICOU: nenhum prop v2.1 registrado ainda.');
    process.exit(2);
  }
  console.log('PROPS-ACERVO ✓ 0 props v2.1 registrados (pré-lote) — mutantes provam a mordida');
  process.exit(0);
}
if (!fonte) erros.push(`${FONTE} não existe e há ${entradas.length} prop(s) v2.1 registrado(s)`);

for (const [index, [id, asset]] of entradas.entries()) {
  const alvo = mutante && index === 0;
  const file = alvo && mutante === 'arquivo-sumido' ? 'public/models/props/NAO_EXISTE.glb' : asset.files?.[0];
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
}

if (erros.length) {
  erros.forEach((erro) => console.error(`✗ ${erro}`));
  process.exit(1);
}
console.log(`PROPS-ACERVO ✓ ${entradas.length} props v2.1 com GLB no disco, finalSha256 e linha no FONTE.md`);
