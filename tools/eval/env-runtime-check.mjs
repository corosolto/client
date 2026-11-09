#!/usr/bin/env node
/* ============================================================================
   env-runtime-check.mjs — SEGREDO DE SSR É LIDO EM RUNTIME, NÃO INLINADO NO BUILD
   ----------------------------------------------------------------------------
   POR QUE EXISTE
   Achado 1 do spike da migração Cloudflare (docs/runbooks/MIGRACAO-CLOUDFLARE.md):
   o Astro INLINA `import.meta.env.<SEGREDO>` no bundle SSR no momento do build.
   Na Vercel funciona porque o build roda com as envs de produção; no Workers
   `wrangler secret put` NUNCA chega a esse código — o bundle já nasceu com o
   valor (ou com vazio) queimado dentro. A correção foi `src/lib/env-runtime.ts`
   (`process.env` por requisição; fallback de `import.meta.env` só para PUBLIC_*).
   Esta régua segura a correção no lugar:

   ER1 nenhum arquivo de `src/` (nem `middleware.js`) lê `import.meta.env.<NOME>`
   da lista de segredos/vars de runtime (API_PROXY_SECRET, SUPABASE_URL,
   SUPABASE_SERVICE_ROLE_KEY, X_PIXEL_TOKEN), e nenhum usa `import.meta.env[...]`
   dinâmico: a captura dinâmica materializa o OBJETO inteiro de env do build
   (segredos incluídos) dentro do chunk SSR.
   ER2 com `--com-build`: roda `npm run build` com SENTINELAS nas envs dos quatro
   nomes e varre `dist/server/**`, `dist/client/**`, `.vercel/output/functions/**`
   e `.vercel/output/static/**` atrás do valor literal de cada sentinela. Se o
   bundle contiver a sentinela, algo voltou a inlinar. Com `--varre`, varre o build
   que já existe: as sentinelas vêm do env (padrão `SENTINEL_*`), como no CI.

   Mutantes: `le-segredo` reintroduz um `import.meta.env.API_PROXY_SECRET` no
   corpus de ER1; `inlina-sentinela` injeta um chunk falso com a sentinela no
   corpus de ER2. Os dois têm que acender.

   Uso: node tools/eval/env-runtime-check.mjs [--com-build] [--varre] [--mutante=le-segredo|inlina-sentinela]
   ============================================================================ */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=')[1] || '';
const mutante = arg('mutante');
if (mutante && !['le-segredo', 'inlina-sentinela'].includes(mutante)) {
  throw new Error(`mutante desconhecido: ${mutante}`);
}

/* Sentinelas de BUILD: valores que só existem no ambiente do build disparado por
   esta régua. Se algum aparecer no artefato, foi inlinado — não há outro caminho. */
const SENTINELAS = {
  API_PROXY_SECRET: 'SENTINEL_api_proxy_7f3d9e41',
  SUPABASE_URL: 'SENTINEL_supabase_url_1a2b3c',
  SUPABASE_SERVICE_ROLE_KEY: 'SENTINEL_supabase_key_9z8y7x',
  X_PIXEL_TOKEN: 'SENTINEL_x_pixel_4k5j6h',
};
const NOMES = Object.keys(SENTINELAS);

/* ER1: leituras proibidas na árvore de servidor. Acesso estático por nome
   (`import.meta.env.API_PROXY_SECRET`) e dinâmico (`import.meta.env[nome]`). */
const LE_SEGREDO = new RegExp(`import\\.meta\\.env\\.(?:${NOMES.join('|')})\\b`);
const LE_DYNAMICAMENTE = /import\.meta\.env\s*\[/;

function arquivosFonte() {
  const saida = ['middleware.js'];
  const entrar = (dir) => {
    for (const nome of readdirSync(dir, { withFileTypes: true })) {
      const caminho = join(dir, nome.name);
      if (nome.isDirectory()) entrar(caminho);
      else if (/\.(ts|mts|js|mjs|astro)$/.test(nome.name)) saida.push(caminho);
    }
  };
  entrar('src');
  return saida.filter((caminho) => existsSync(caminho)).map((caminho) => [caminho, readFileSync(caminho, 'utf8')]);
}

const falhas = [];

/* ER1 — sempre roda: é barata e é o portão do pr-fast. */
let corpus = arquivosFonte();
if (mutante === 'le-segredo') {
  corpus = [...corpus, ['src/pages/api/fake-mutante.ts', "const s = import.meta.env.API_PROXY_SECRET || '';\nexport { s };\n"]];
}
for (const [caminho, texto] of corpus) {
  if (LE_SEGREDO.test(texto)) falhas.push(`ER1 ${caminho} lê import.meta.env.<segredo> (use src/lib/env-runtime.ts)`);
  if (LE_DYNAMICAMENTE.test(texto)) falhas.push(`ER1 ${caminho} acessa import.meta.env[...] dinâmico (materializa o env do build no chunk)`);
}

/* ER2 — varre artefatos de build atrás das sentinelas. dist/server só existe no
   build Cloudflare; .vercel/output/functions, no build Vercel: exige pelo menos um. */
const ALVOS = ['dist/server', '.vercel/output/functions', 'dist/client', '.vercel/output/static'];
const SERVIDOR = ['dist/server', '.vercel/output/functions'];
function varreArtefatos(raiz, alvos) {
  let achados = 0;
  const visitar = (dir) => {
    for (const nome of readdirSync(dir, { withFileTypes: true })) {
      const caminho = join(dir, nome.name);
      if (nome.isDirectory()) visitar(caminho);
      else if (/\.(mjs|js|json|html)$/.test(nome.name)) {
        const texto = readFileSync(caminho, 'utf8');
        for (const [nomeVar, sentinela] of Object.entries(SENTINELAS)) {
          if (texto.includes(sentinela)) {
            falhas.push(`ER2 ${caminho} contém o valor de ${nomeVar} inlinado no build`);
            achados += 1;
          }
        }
      }
    }
  };
  for (const alvo of alvos) {
    const caminho = join(raiz, alvo);
    if (existsSync(caminho)) visitar(caminho);
  }
  return achados;
}

let er2Medido = false;
if (mutante === 'inlina-sentinela') {
  const dir = mkdtempSync(join(tmpdir(), 'envruntime-mutante-'));
  try {
    writeFileSync(join(dir, 'chunk-fake.mjs'), `export const segredo = "${SENTINELAS.API_PROXY_SECRET}";\n`);
    writeFileSync(join(dir, 'chunk-limpo.mjs'), 'export const segredo = process.env.API_PROXY_SECRET;\n');
    er2Medido = true;
    varreArtefatos(dir, ['.']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
} else if (process.argv.includes('--com-build')) {
  er2Medido = true;
  const comando = process.env.ENVRUNTIME_BUILD_CMD || 'npm run build';
  const build = spawnSync(comando, { shell: true, stdio: 'inherit', env: { ...process.env, ...SENTINELAS } });
  if (build.status !== 0) {
    falhas.push(`ER2 build com sentinelas falhou (status ${build.status})`);
  } else {
    varreArtefatos('.', ALVOS);
    if (!SERVIDOR.some((alvo) => existsSync(alvo)))
      falhas.push(`ER2 nenhum artefato de servidor para medir (esperado um de: ${SERVIDOR.join(', ')})`);
  }
} else if (process.argv.includes('--varre')) {
  // CI: varre o build que o job já fez. As sentinelas vêm do env do passo de build
  // (padrão SENTINEL_ como fonte única); sem sentinela no env, falha alto.
  er2Medido = true;
  const doEnv = Object.fromEntries(NOMES.map((nome) => [nome, process.env[nome] || '']));
  for (const [nomeVar, valor] of Object.entries(doEnv)) {
    if (!/^SENTINEL_[a-z0-9_]+$/.test(valor)) falhas.push(`ER2 --varre exige ${nomeVar}=SENTINEL_* no env do build (veio: ${JSON.stringify(valor)})`);
  }
  if (!falhas.length) {
    for (const [nomeVar, sentinela] of Object.entries(doEnv)) SENTINELAS[nomeVar] = sentinela;
    varreArtefatos('.', ALVOS);
    if (!SERVIDOR.some((alvo) => existsSync(alvo)))
      falhas.push(`ER2 nenhum artefato de servidor para medir (esperado um de: ${SERVIDOR.join(', ')})`);
  }
} else {
  const existentes = ALVOS.filter((alvo) => existsSync(alvo));
  console.log(`ER2 não medido: sem --com-build/--varre (build completo precisa dos packs;${existentes.length ? ' artefatos velhos ignorados' : ' sem artefatos'})`);
}

if (falhas.length) {
  falhas.forEach((falha) => console.error(`REPROVADO — ${falha}`));
  process.exit(1);
}
console.log(`APROVADO — ER1 ${corpus.length} arquivos de servidor sem import.meta.env de segredo` +
  (er2Medido ? `; ER2 artefatos de build sem sentinela inlinada (${ALVOS.join(', ')})` : ''));
