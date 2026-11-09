/* studio-character-check.mjs — RÉGUA NODE DO PERSONAGEM DE RELEASE DO STUDIO.
   ----------------------------------------------------------------------------
   Cobra o resolvedor do navegador (public/js/studio-character.js), o registro de
   pins (public/js/data/content-releases.js) e o servidor local de /packs/
   (scripts/studio-pack-serving.mjs) contra um PACOTE SINTÉTICO gerado aqui mesmo
   (bytes inventados; nenhum asset real é versionado nem lido).

   Cláusulas:
     R0  pins do registro bem formados (URL /packs/character/<id>/<versão>/, minRuntime ≤ VERSION, meshy-28)
     R1  pacote íntegro resolve: 11 estados + modelo + prévias em Blob URL com os bytes e o MIME certos
     R2  manifesto adulterado (SHA do pin não bate) → studio_manifest_sha_mismatch, nenhum binário pedido
     R3  arquivo adulterado → studio_file_sha_mismatch
     R4  tamanho declarado errado → studio_file_length_mismatch
     R5  estado obrigatório ausente → studio_state_missing
     R6  estado desconhecido → studio_state_unknown
     R6b dois papéis no mesmo arquivo → studio_role_duplicate
     R6c arquivo sem papel → studio_file_unowned;  R6d papel fora de files → studio_role_unknown_file
     R7  caminho inseguro (.., absoluto, \, %2e, //, ./) → studio_unsafe_path
     R8  minRuntime acima da VERSION (pin ou manifesto) → studio_runtime_too_old
     R9  esqueleto ≠ meshy-28 → studio_skeleton_mismatch
     R10 sem crypto.subtle → studio_webcrypto_unavailable, sem nenhum fetch
     R11 falha parcial não vaza: toda Blob URL criada na tentativa é revogada, inclusive a que chega DEPOIS da falha
     R12 cache por URL+SHA: mesma promessa no sucesso; falha sai do cache e a nova tentativa busca de novo
     R13 identidade divergente → studio_identity_mismatch;  R14 orçamento → studio_budget_exceeded antes de baixar
     R15 clipes extras opcionais (animations.extra): conhecidos → baixados, verificadas hash/MIME/bytes e expostos
        num Map nome→{url, sha256, duration, loop, rootMotion}; sem extra → Map vazio, sem erro
     R15b chave fora do vocabulário é ignorada: não baixa, não expõe e não derruba o pacote
     R15c extra conhecido fora de files → studio_role_unknown_file;  R15d extra duplicando arquivo de estado → studio_role_duplicate
     R15e extras contam no orçamento → studio_budget_exceeded antes de baixar;  R15f extra não-objeto/entrada sem file → studio_manifest_invalid
     S1  /packs/ serve com MIME certo e Cache-Control: no-store (pelo plugin Vite real)
     S4  travessia/forma não canônica → 404;  S5 symlink para fora da raiz → 404
     S6  diretório e extensão de código → 404;  S7 sem STUDIO_PACK_ROOT → 404;  S8 método ≠ GET/HEAD → 405

   Mutantes (cópia mutada num diretório temporário; o arquivo do repo não é tocado):
     node tools/eval/studio-character-check.mjs --mutante=<nome>   (um)
     node tools/eval/studio-character-check.mjs --mutantes         (todos; falha se algum sobreviver)
   cada mutante passa (exit 0) só se a régua o reprovar na cláusula esperada.
   Com STUDIO_PACK_ROOT, também resolve o piloto real do disco (evidência, não exigido). */
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import http from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { resolveObjectURL } from 'node:buffer';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const ROOT = join(import.meta.dirname, '../..');
// Raiz real (piloto) capturada antes das cláusulas S, que mexem na variável.
const RAIZ_REAL = process.env.STUDIO_PACK_ROOT;
const mutante = process.argv.find((a) => a.startsWith('--mutante='))?.split('=')[1];
const RES = 'public/js/studio-character.js';
const SRV = 'scripts/studio-pack-serving.mjs';

/* [arquivo, trecho original, trecho mutado, prefixos de cláusula que têm de morder] */
const mutacoes = {
  'sha-manifesto-ignorado': [RES, 'if (manifestSha256 !== pin.manifestSha256) fail(', 'if (false) fail(', ['R2:']],
  'sha-arquivo-ignorado': [RES, 'if (sha256 !== entry.sha256) fail(', 'if (false) fail(', ['R3:']],
  'tamanho-ignorado': [RES, 'if (bytes.byteLength !== entry.bytes) fail(', 'if (false) fail(', ['R4:']],
  'estado-opcional': [RES, "if (!Object.hasOwn(manifest.animations, state)) fail('studio_state_missing', state);", '', ['R5:']],
  'estado-desconhecido': [RES, "if (!STUDIO_CHARACTER_STATES.includes(state)) fail('studio_state_unknown', state);", '', ['R6:']],
  'dono-duplicado': [RES, "if (owners.has(path) && tipoDe(owners.get(path)) !== tipoDe(role)) {", 'if (false) {', ['R6b:', 'R15d:']],
  'arquivo-sem-dono': [RES, "for (const path of files.keys()) if (!owners.has(path)) fail('studio_file_unowned', path);", '', ['R6c:']],
  'caminho-inseguro': [RES, "path.split('/').every((segment) => SEGMENT.test(segment))", 'true', ['R7:', 'S4:']],
  'runtime-ignorado': [RES, 'if (compareRuntimeVersions(minimo, VERSION) > 0) fail(', 'if (false) fail(', ['R8:']],
  'esqueleto-ignorado': [RES, 'if (manifest.skeleton !== pin.skeleton) fail(', 'if (false) fail(', ['R9:']],
  'sem-webcrypto': [RES, "if (!subtle || typeof subtle.digest !== 'function') fail('studio_webcrypto_unavailable', 'crypto.subtle ausente: sem verificação não há carga');", '', ['R10:']],
  'vaza-parcial': [RES, 'for (const url of created) URL.revokeObjectURL(url);', '', ['R11:']],
  'cache-eterno': [RES, 'request.catch(() => { if (_requests.get(key) === request) _requests.delete(key); });', 'request.catch(() => {});', ['R12:']],
  'extra-tudo-baixa': [RES, 'if (!isStudioExtraClipName(name)) {', 'if (false) {', ['R15b:']],
  'extra-sem-validacao': [RES, "if (!isObject(entry) || typeof entry.file !== 'string') fail('studio_manifest_invalid', `animations.extra.${name} sem file`);", '', ['R15f:']],
  'extra-nao-baixado': [RES, '    ...plan.extraClips.map(([, entry]) => entry.file),\n', '', ['R15:', 'R11:', 'R16:']],
  'familia-ignorada': [RES, 'if (entry.family !== studioClipFamily(name)) {', 'if (false) {', ['R16d:']],
  'emote-compartilhado-aceito': [RES, "if (nomes.length > 1 && nomes.some((nome) => nome.startsWith('emote_'))) {", 'if (false) {', ['R16c:']],
  'busca-duplicada': [RES, '[...representantes.values()].map', 'wanted.map', ['R16:', 'R16b:', 'R17:']],
  'url-sem-dedupe': [RES, 'urls.get(representantes.get(plan.files.get(path).sha256))', 'urls.get(path)', ['R16:', 'R16b:']],
  'familias-sem-mapa': [RES, 'if (conteudos.length === 1) {', 'if (false) {', ['R16:', 'R16b:', 'R17:']],
  'clip-sem-nome': [RES, 'clip: name,', "clip: '',", ['R16:']],
  'servidor-com-cache': [SRV, "'cache-control': 'no-store'", "'cache-control': 'public, max-age=31536000'", ['S1:']],
  'servidor-segue-symlink': [SRV, 'if (!contained(rootReal, real)) return deny(404);', '', ['S5:']],
  'servidor-serve-codigo': [SRV, "  '.webp': 'image/webp',\n", "  '.webp': 'image/webp',\n  '.js': 'text/javascript',\n", ['S6:']],
  'servidor-sem-raiz': [SRV, 'if (!root) return deny(404);', "if (!root) root = '.';", ['S7:']],
};
if (mutante && !mutacoes[mutante]) throw new Error(`mutante desconhecido: ${mutante}`);
if (process.argv.includes('--mutantes')) {
  const vivos = [];
  for (const nome of Object.keys(mutacoes)) {
    const r = spawnSync(process.execPath, [import.meta.filename, `--mutante=${nome}`], { encoding: 'utf8' });
    const linha = `${r.stdout || ''}${r.stderr || ''}`.trim().split('\n').pop();
    console.log(`${r.status === 0 ? '  ✓' : '  ✗'} ${linha}`);
    if (r.status !== 0) vivos.push(nome);
  }
  if (vivos.length) console.error(`${vivos.length} mutante(s) sobreviveram: ${vivos.join(', ')}`);
  else console.log(`${Object.keys(mutacoes).length} mutantes reprovados na cláusula certa.`);
  process.exit(vivos.length ? 1 : 0);
}

/* Os módulos sob teste: os do repo, ou uma cópia com o mutante aplicado (mesma árvore relativa). */
const temporario = mkdtempSync(join(tmpdir(), 'studio-char-'));
let base = ROOT;
if (mutante) {
  const [alvo, de, para] = mutacoes[mutante];
  base = join(temporario, 'repo');
  for (const rel of [RES, SRV, 'public/js/version.js', 'public/js/data/content-releases.js']) {
    mkdirSync(dirname(join(base, rel)), { recursive: true });
    copyFileSync(join(ROOT, rel), join(base, rel));
  }
  const original = readFileSync(join(base, alvo), 'utf8');
  const ocorrencias = original.split(de).length - 1;
  if (ocorrencias !== 1) throw new Error(`mutante exige âncora única: ${mutante} (${ocorrencias})`);
  writeFileSync(join(base, alvo), original.replace(de, para));
}
const importa = (rel) => import(pathToFileURL(join(base, rel)).href);
const R = await importa(RES);
const S = await importa(SRV);
const { CHARACTER_RELEASES, STUDIO_CHARACTER_STATES } = await importa('public/js/data/content-releases.js');
const { VERSION } = await importa('public/js/version.js');

const falhas = [];
const falha = (msg) => falhas.push(msg);
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');

/* Blob URLs: espião em volta do URL global (o resolvedor chama URL.createObjectURL na hora). */
const criadas = new Set(), revogadas = new Set();
const criaOriginal = URL.createObjectURL, revogaOriginal = URL.revokeObjectURL;
URL.createObjectURL = (blob) => { const u = criaOriginal.call(URL, blob); criadas.add(u); return u; };
URL.revokeObjectURL = (u) => { revogadas.add(u); return revogaOriginal.call(URL, u); };

// ── fixture sintética ─────────────────────────────────────────────────────────
const bytesDe = (rotulo, n) => {
  const b = new Uint8Array(n);
  for (let i = 0; i < n; i++) b[i] = (i * 31 + rotulo.charCodeAt(i % rotulo.length) * 7) & 255;
  return b;
};
function pacote(caso, muta = () => {}) {
  const dir = `https://pack.test/${caso}/character/sintetico/1.2.3/`;
  const servidos = new Map([
    ['model/sintetico.glb', bytesDe('modelo', 4096)],
    ...STUDIO_CHARACTER_STATES.map((s) => [`animations/${s}.glb`, bytesDe(s, 400 + s.length * 13)]),
    ['animations/extra/ceremony.glb', bytesDe('cerimonia', 900)],
    ['animations/extra/loco.glb', bytesDe('locomocao', 1200)],
    ['animations/extra/emote-danca.glb', bytesDe('emote', 384)],
    ['previews/retrato.jpg', bytesDe('retrato', 321)],
    ['evidence/proveniencia.json', new TextEncoder().encode('{"sintetico":true}')],
  ]);
  const manifest = {
    schemaVersion: 1, kind: 'character', id: 'sintetico', version: '1.2.3',
    source: { revision: '0'.repeat(40), provenance: ['fixture sintética da régua'] },
    files: [...servidos].map(([path, b]) => ({ path, sha256: sha(b), bytes: b.byteLength })),
    model: 'model/sintetico.glb', skeleton: 'meshy-28',
    animations: {
      ...Object.fromEntries(STUDIO_CHARACTER_STATES.map((s) => [s, `animations/${s}.glb`])),
      extra: {
        victory: { file: 'animations/extra/ceremony.glb', duration: 3.2, loop: false, rootMotion: true, source: 'fixture sintética', family: 'ceremony' },
        defeat: { file: 'animations/extra/ceremony.glb', duration: 2.8, loop: false, rootMotion: false, source: 'fixture sintética' },
        strafe_left: { file: 'animations/extra/loco.glb', duration: 0.9, loop: true, rootMotion: false, source: 'fixture sintética' },
        walk_back: { file: 'animations/extra/loco.glb', duration: 1.2, loop: true, rootMotion: false, source: 'fixture sintética' },
        emote_danca: { file: 'animations/extra/emote-danca.glb', duration: 1.5, loop: true, rootMotion: false, source: 'fixture sintética', family: 'emote' },
      },
    },
    previews: ['previews/retrato.jpg'], evidence: ['evidence/proveniencia.json'],
    rights: { status: 'original', basis: 'fixture sintética' }, budgets: { triangles: 12, bytes: 1 << 20 },
    campoFuturo: { inerte: true },
  };
  const ctx = { dir, servidos, manifest, extras: new Map(), atrasos: new Map(), pin: null, manifestBytes: null, manifestServido: null };
  ctx.pin = { kind: 'character', id: 'sintetico', version: '1.2.3', manifestUrl: `${dir}manifest.json`, minRuntime: '2.1.0-alpha.1', skeleton: 'meshy-28' };
  muta(ctx, 'antes');
  ctx.manifestBytes = new TextEncoder().encode(JSON.stringify(ctx.manifest, null, 2));
  ctx.pin.manifestSha256 ??= sha(ctx.manifestBytes);
  ctx.manifestServido = ctx.manifestBytes;
  muta(ctx, 'depois');
  ctx.pedidos = [];
  ctx.fetchImpl = async (url) => {
    ctx.pedidos.push(url);
    const rel = url.startsWith(ctx.dir) ? url.slice(ctx.dir.length) : null;
    const corpo = url === ctx.pin.manifestUrl ? ctx.manifestServido : ctx.extras.get(url) ?? (rel !== null ? ctx.servidos.get(rel) : undefined);
    const atraso = ctx.atrasos.get(rel);
    if (atraso) await new Promise((r) => setTimeout(r, atraso));
    return corpo ? new Response(corpo, { status: 200 }) : new Response('nada', { status: 404 });
  };
  return ctx;
}
const resolve = (ctx, extra = {}) => R.resolveStudioCharacter(ctx.pin, { fetchImpl: ctx.fetchImpl, subtle: globalThis.crypto.subtle, ...extra });
async function exigeFalha(clausula, ctx, codigo, extra) {
  try {
    await resolve(ctx, extra);
    falha(`${clausula} pacote aceito, devia falhar com ${codigo}`);
    return null;
  } catch (e) {
    if (!(e instanceof R.StudioCharacterError) || e.code !== codigo) falha(`${clausula} falhou com ${e?.code || e?.name}: ${e?.message} (queria ${codigo})`);
    return e;
  }
}

try {
  // ── R0 ──────────────────────────────────────────────────────────────────────
  for (const [id, pin] of Object.entries(CHARACTER_RELEASES)) {
    if (pin.id !== id || pin.kind !== 'character') falha(`R0: ${id} com identidade ${pin.kind}/${pin.id}`);
    if (pin.manifestUrl !== `/packs/character/${id}/${pin.version}/manifest.json`) falha(`R0: ${id} manifestUrl fora de /packs/character/<id>/<versão>/: ${pin.manifestUrl}`);
    if (!/^[a-f0-9]{64}$/.test(pin.manifestSha256)) falha(`R0: ${id} sem SHA-256 do manifesto`);
    if (pin.skeleton !== 'meshy-28') falha(`R0: ${id} com esqueleto ${pin.skeleton}`);
    if (R.compareRuntimeVersions(pin.minRuntime, VERSION) > 0) falha(`R0: ${id} exige ${pin.minRuntime} > VERSION ${VERSION}`);
  }
  if (!Object.keys(CHARACTER_RELEASES).length) falha('R0: registro de releases vazio');
  const ordem = ['2.1.0-alpha.9', '2.1.0-alpha.10', '2.1.0-alpha.138', '2.1.0-beta', '2.1.0', '2.1.1', '10.0.0'];
  for (let i = 1; i < ordem.length; i++) {
    if (R.compareRuntimeVersions(ordem[i - 1], ordem[i]) !== -1) falha(`R8: ${ordem[i - 1]} não ficou antes de ${ordem[i]}`);
  }

  // ── R1 ──────────────────────────────────────────────────────────────────────
  {
    const ctx = pacote('r1');
    const r = await resolve(ctx).catch((e) => { falha(`R1: pacote íntegro rejeitado: ${e?.code} ${e?.message}`); return null; });
    if (r) {
      const estados = Object.keys(r.animationUrls);
      if (estados.join() !== STUDIO_CHARACTER_STATES.join()) falha(`R1: estados ${estados.join()}`);
      const confere = async (url, rel, mime, clausula = 'R1:') => {
        const blob = url?.startsWith('blob:') ? resolveObjectURL(url) : null;
        if (!blob) return falha(`${clausula} ${rel} sem Blob URL viva (${url})`);
        if (blob.type !== mime) falha(`${clausula} ${rel} com MIME ${blob.type}`);
        if (sha(new Uint8Array(await blob.arrayBuffer())) !== sha(ctx.servidos.get(rel))) falha(`${clausula} ${rel} com bytes diferentes dos verificados`);
      };
      await confere(r.modelUrl, 'model/sintetico.glb', 'model/gltf-binary');
      for (const s of STUDIO_CHARACTER_STATES) await confere(r.animationUrls[s], `animations/${s}.glb`, 'model/gltf-binary');
      await confere(r.previewUrls[0], 'previews/retrato.jpg', 'image/jpeg');
      /* R15: clipes extras conhecidos viram Map com Blob URL verificada e metadados do manifesto. */
      if (!(r.extraClipUrls instanceof Map)) falha('R15: extraClipUrls não é um Map');
      else {
        const nomes = [...r.extraClipUrls.keys()].join();
        if (nomes !== 'victory,defeat,strafe_left,walk_back,emote_danca') falha(`R15: extras expostos ${nomes}`);
        for (const [nome, rel] of [['victory', 'animations/extra/ceremony.glb'], ['emote_danca', 'animations/extra/emote-danca.glb']]) {
          const info = r.extraClipUrls.get(nome);
          if (!info || !Object.isFrozen(info)) { falha(`R15: ${nome} sem entrada congelada`); continue; }
          await confere(info.url, rel, 'model/gltf-binary', 'R15:');
          if (info.sha256 !== sha(ctx.servidos.get(rel))) falha(`R15: sha256 de ${nome} não confere`);
        }
        const v = r.extraClipUrls.get('victory');
        if (v?.duration !== 3.2 || v?.loop !== false || v?.rootMotion !== true) falha('R15: metadados de victory ≠ manifesto');
      }
      if (r.modelSha256 !== sha(ctx.servidos.get('model/sintetico.glb'))) falha('R1: modelSha256 não é o SHA do modelo');
      if (r.manifestSha256 !== ctx.pin.manifestSha256) falha('R1: manifestSha256 do resultado ≠ pin');
      if (ctx.pedidos.some((u) => u.includes('evidence/'))) falha('R1: evidência baixada sem necessidade');
    }
  }

  // ── R2..R14 ─────────────────────────────────────────────────────────────────
  {
    const ctx = pacote('r2', (c, fase) => {
      // Um espaço a mais: JSON continua válido e idêntico ao parse — só o hash denuncia.
      if (fase === 'depois') c.manifestServido = new TextEncoder().encode(`${new TextDecoder().decode(c.manifestBytes)} `);
    });
    await exigeFalha('R2:', ctx, 'studio_manifest_sha_mismatch');
    if (ctx.pedidos.length !== 1) falha(`R2: ${ctx.pedidos.length} pedidos; manifesto adulterado não pode liberar binário`);
  }
  await exigeFalha('R3:', pacote('r3', (c, fase) => {
    if (fase === 'depois') { const b = new Uint8Array(c.servidos.get('animations/jump.glb')); b[7] ^= 1; c.servidos.set('animations/jump.glb', b); }
  }), 'studio_file_sha_mismatch');
  await exigeFalha('R4:', pacote('r4', (c, fase) => {
    if (fase === 'antes') c.manifest.files.find((f) => f.path === 'animations/run.glb').bytes += 1;
  }), 'studio_file_length_mismatch');
  await exigeFalha('R5:', pacote('r5', (c, fase) => {
    if (fase !== 'antes') return;
    delete c.manifest.animations.walkfire;
    c.manifest.files = c.manifest.files.filter((f) => f.path !== 'animations/walkfire.glb');
  }), 'studio_state_missing');
  await exigeFalha('R6:', pacote('r6', (c, fase) => {
    if (fase !== 'antes') return;
    const b = bytesDe('dance', 99);
    c.servidos.set('animations/dance.glb', b);
    c.manifest.animations.dance = 'animations/dance.glb';
    c.manifest.files.push({ path: 'animations/dance.glb', sha256: sha(b), bytes: b.byteLength });
  }), 'studio_state_unknown');
  await exigeFalha('R6b:', pacote('r6b', (c, fase) => {
    if (fase !== 'antes') return;
    c.manifest.animations.walk1h = 'model/sintetico.glb';
    c.manifest.files = c.manifest.files.filter((f) => f.path !== 'animations/walk1h.glb');
  }), 'studio_role_duplicate');
  await exigeFalha('R6c:', pacote('r6c', (c, fase) => {
    if (fase !== 'antes') return;
    const b = bytesDe('orfao', 64);
    c.servidos.set('extra/orfao.glb', b);
    c.manifest.files.push({ path: 'extra/orfao.glb', sha256: sha(b), bytes: b.byteLength });
  }), 'studio_file_unowned');
  await exigeFalha('R6d:', pacote('r6d', (c, fase) => {
    if (fase === 'antes') c.manifest.previews.push('previews/fantasma.png');
  }), 'studio_role_unknown_file');

  // R7: caminho inseguro no modelo (e o servidor de mentira ainda serviria o escape).
  for (const [i, ruim] of ['../fuga.glb', '/abs/fuga.glb', 'model\\fuga.glb', 'model/%2e%2e/fuga.glb', 'model//fuga.glb', 'model/./fuga.glb', '.oculto/fuga.glb'].entries()) {
    if (R.isSafePackPath(ruim)) falha(`R7: isSafePackPath aceitou ${JSON.stringify(ruim)}`);
    const ctx = pacote(`r7-${i}`, (c, fase) => {
      if (fase !== 'antes') return;
      const b = c.servidos.get('model/sintetico.glb');
      c.servidos.delete('model/sintetico.glb');
      c.manifest.files = c.manifest.files.filter((f) => f.path !== 'model/sintetico.glb');
      c.manifest.files.push({ path: ruim, sha256: sha(b), bytes: b.byteLength });
      c.manifest.model = ruim;
      c.extras.set(new URL(ruim, c.dir).href, b);
      c.servidos.set(ruim, b);
    });
    await exigeFalha('R7:', ctx, 'studio_unsafe_path');
  }
  for (const bom of ['model/capitao-caveira.glb', 'animations/idle1h.glb', 'previews/concept.jpg', 'a_b/c-d.e.glb']) {
    if (!R.isSafePackPath(bom)) falha(`R7: isSafePackPath recusou ${bom}`);
  }

  await exigeFalha('R8:', pacote('r8', (c, fase) => { if (fase === 'antes') c.pin.minRuntime = '99.0.0'; }), 'studio_runtime_too_old');
  await exigeFalha('R8:', pacote('r8b', (c, fase) => { if (fase === 'antes') c.manifest.minRuntime = '99.0.0-alpha.1'; }), 'studio_runtime_too_old');
  await exigeFalha('R9:', pacote('r9', (c, fase) => { if (fase === 'antes') c.manifest.skeleton = 'mixamo-65'; }), 'studio_skeleton_mismatch');
  {
    const ctx = pacote('r10');
    await exigeFalha('R10:', ctx, 'studio_webcrypto_unavailable', { subtle: null });
    if (ctx.pedidos.length) falha(`R10: ${ctx.pedidos.length} pedido(s) sem WebCrypto; nada pode ser buscado sem verificação`);
  }
  await exigeFalha('R13:', pacote('r13', (c, fase) => { if (fase === 'antes') c.manifest.id = 'outro'; }), 'studio_identity_mismatch');
  {
    const ctx = pacote('r14', (c, fase) => { if (fase === 'antes') c.manifest.budgets.bytes = 1000; });
    await exigeFalha('R14:', ctx, 'studio_budget_exceeded');
    if (ctx.pedidos.length !== 1) falha('R14: orçamento estourado ainda baixou binários');
  }

  // ── R11 / R12: vazamento parcial e cache ────────────────────────────────────
  {
    const ctx = pacote('r11', (c, fase) => {
      if (fase !== 'depois') return;
      c.servidos.delete('animations/walkfire.glb');          // 404 imediato
      c.atrasos.set('model/sintetico.glb', 40);              // termina DEPOIS da falha
    });
    const antes = new Set(criadas);
    const e = await exigeFalha('R11:', ctx, 'studio_fetch_failed');
    const nestaTentativa = [...criadas].filter((u) => !antes.has(u));
    if (e && nestaTentativa.length < 15) falha(`R11: só ${nestaTentativa.length} Blob URL(s) criadas; a fixture devia criar 15 antes de revogar`);
    const vivas = nestaTentativa.filter((u) => !revogadas.has(u) || resolveObjectURL(u));
    if (vivas.length) falha(`R11: ${vivas.length} Blob URL(s) de tentativa falha continuam vivas (estado parcial vazado)`);

    // R12: falha sai do cache; a nova tentativa (servidor consertado) busca de novo e resolve.
    ctx.servidos.set('animations/walkfire.glb', bytesDe('walkfire', 400 + 'walkfire'.length * 13));
    const pedidosAntes = ctx.pedidos.length;
    const r = await resolve(ctx).catch((err) => { falha(`R12: nova tentativa depois da falha continuou rejeitada (${err?.code})`); return null; });
    if (r && ctx.pedidos.length === pedidosAntes) falha('R12: nova tentativa não buscou de novo');
    const p1 = resolve(ctx), p2 = resolve(ctx);
    if (p1 !== p2) falha('R12: mesma URL+SHA não devolveu a mesma promessa');
    await p1.catch(() => {});
    const n = ctx.pedidos.length;
    await resolve(ctx).catch(() => {});
    if (ctx.pedidos.length !== n) falha('R12: sucesso em cache refez pedidos');
  }

  // ── R15: clipes extras opcionais (animations.extra) ─────────────────────────
  {
    // Sem extra: opcional é poder faltar — Map vazio, sem erro e sem pedido em extra/.
    const ctx = pacote('r15-sem', (c, fase) => {
      if (fase !== 'antes') return;
      c.manifest.files = c.manifest.files.filter((f) => !f.path.startsWith('animations/extra/'));
      delete c.manifest.animations.extra;
    });
    const r = await resolve(ctx).catch((e) => { falha(`R15: pacote sem extra rejeitado: ${e?.code}`); return null; });
    if (r && !(r.extraClipUrls instanceof Map && r.extraClipUrls.size === 0)) falha('R15: sem extra o Map devia ser vazio');
    if (ctx.pedidos.some((u) => u.includes('extra/'))) falha('R15: pacote sem extra baixou algo de extra/');
  }
  {
    // R15b: chave fora do vocabulário é ignorada — não baixa, não expõe e não derruba o pacote.
    const ctx = pacote('r15b', (c, fase) => {
      if (fase !== 'antes') return;
      const b = bytesDe('moonwalk', 432);
      c.servidos.set('animations/extra/moonwalk.glb', b);
      c.manifest.files.push({ path: 'animations/extra/moonwalk.glb', sha256: sha(b), bytes: b.byteLength });
      c.manifest.animations.extra.moonwalk = { file: 'animations/extra/moonwalk.glb', duration: 1, loop: false, rootMotion: false, source: 'fora do vocabulário' };
    });
    const r = await resolve(ctx).catch((e) => { falha(`R15b: chave desconhecida derrubou o pacote: ${e?.code}`); return null; });
    if (r && (r.extraClipUrls.has('moonwalk') || r.extraClipUrls.size !== 5)) falha(`R15b: Map com ${r.extraClipUrls.size} entradas (moonwalk presente? ${r.extraClipUrls.has('moonwalk')})`);
    if (ctx.pedidos.some((u) => u.includes('moonwalk'))) falha('R15b: chave desconhecida foi baixada');
  }
  await exigeFalha('R15c:', pacote('r15c', (c, fase) => { if (fase === 'antes') c.manifest.animations.extra.victory.file = 'animations/extra/fantasma.glb'; }), 'studio_role_unknown_file');
  await exigeFalha('R15d:', pacote('r15d', (c, fase) => { if (fase === 'antes') c.manifest.animations.extra.victory.file = c.manifest.animations.walk; }), 'studio_role_duplicate');
  {
    const ctx = pacote('r15e', (c, fase) => {
      if (fase !== 'antes') return;
      const bytesExtras = c.manifest.files.filter((f) => f.path.startsWith('animations/extra/')).reduce((s, f) => s + f.bytes, 0);
      c.manifest.budgets.bytes = c.manifest.files.reduce((s, f) => s + f.bytes, 0) - bytesExtras;
    });
    await exigeFalha('R15e:', ctx, 'studio_budget_exceeded');
    if (ctx.pedidos.length !== 1) falha('R15e: orçamento estourado pelos extras ainda baixou binários');
  }
  await exigeFalha('R15f:', pacote('r15f', (c, fase) => { if (fase === 'antes') c.manifest.animations.extra = []; }), 'studio_manifest_invalid');
  await exigeFalha('R15f:', pacote('r15f2', (c, fase) => { if (fase === 'antes') c.manifest.animations.extra.victory = 'animations/extra/victory.glb'; }), 'studio_manifest_invalid');

  // ── R16: packs de família (vários clipes por arquivo) ───────────────────────
  {
    const ctx = pacote('r16');
    const r = await resolve(ctx).catch((e) => { falha(`R16: pacote com packs de família rejeitado: ${e?.code} ${e?.message}`); return null; });
    if (!r) throw new Error('R16 falhou');
    const contagem = (suf) => ctx.pedidos.filter((u) => u.endsWith(suf)).length;
    if (contagem('animations/extra/loco.glb') !== 1) falha(`R16: loco.glb buscado ${contagem('animations/extra/loco.glb')}× (2 chaves), devia ser 1`);
    if (contagem('animations/extra/ceremony.glb') !== 1) falha(`R16: ceremony.glb buscado ${contagem('animations/extra/ceremony.glb')}×, devia ser 1`);
    const strafe = r.extraClipUrls.get('strafe_left'), costas = r.extraClipUrls.get('walk_back');
    if (!strafe || !costas || strafe.url !== costas.url || !strafe.url) falha('R16: chaves do pack loco não compartilham a mesma Blob URL');
    if (strafe.clip !== 'strafe_left' || costas.clip !== 'walk_back') falha('R16: extraClipUrls sem o nome do clipe dentro do pack');
    if (strafe.family !== 'loco' || costas.family !== 'loco') falha('R16: família computada errada no pack loco');
    if (r.extraClipUrls.get('victory').family !== 'ceremony') falha('R16: família declarada (ceremony) não apareceu');
    if (r.extraClipUrls.get('emote_danca').family !== 'emote') falha('R16: emote sem família emote');
    if (!(r.families instanceof Map)) { falha('R16: families não é Map'); throw new Error('R16 falhou'); }
    const loco = r.families.get('loco'), ceremony = r.families.get('ceremony');
    if (!loco || loco.url !== strafe.url || JSON.stringify(loco.keys) !== JSON.stringify(['strafe_left', 'walk_back'])) falha('R16: families.get("loco") sem {url, keys} do pack compartilhado');
    if (!ceremony || JSON.stringify(ceremony.keys) !== JSON.stringify(['victory', 'defeat'])) falha('R16: families.get("ceremony") sem as duas chaves do pack');
    if (r.families.has('emote')) falha('R16: emote apareceu em families (um arquivo por chave não é família carregável)');
    if (r.families.has('combat')) falha('R16: combat apareceu em families sem clipes');
    // Estados continuam um arquivo por estado: URLs distintas.
    if (r.animationUrls.idle === r.animationUrls.walk) falha('R16: estados com arquivos próprios compartilharam URL');
  }
  {
    // R16b: deduplicação por SHA — caminho distinto com bytes idênticos é buscado uma vez.
    const ctx = pacote('r16b', (c, fase) => {
      if (fase !== 'antes') return;
      const b = c.servidos.get('animations/extra/loco.glb');
      c.servidos.set('animations/extra/loco-copia.glb', b);
      c.manifest.files.push({ path: 'animations/extra/loco-copia.glb', sha256: sha(b), bytes: b.byteLength });
      c.manifest.animations.extra.run_back = { file: 'animations/extra/loco-copia.glb', duration: 1.0, loop: true, rootMotion: false, source: 'cópia byte a byte do pack loco' };
    });
    const r = await resolve(ctx).catch((e) => { falha(`R16b: cópia com mesmo SHA rejeitada: ${e?.code}`); return null; });
    const buscasCopia = ctx.pedidos.filter((u) => u.endsWith('animations/extra/loco-copia.glb')).length;
    if (r && buscasCopia !== 0) falha(`R16b: cópia com mesmo SHA foi buscada ${buscasCopia}×`);
    if (r && r.extraClipUrls.get('run_back').url !== r.extraClipUrls.get('strafe_left').url) falha('R16b: cópia não reutilizou a Blob URL do conteúdo igual');
    if (r && !r.families.get('loco')) falha('R16b: loco deixou de ser família carregável com a cópia declarada');
  }
  await exigeFalha('R16c:', pacote('r16c', (c, fase) => { if (fase === 'antes') c.manifest.animations.extra.emote_danca.file = 'animations/extra/loco.glb'; }), 'studio_manifest_invalid');
  await exigeFalha('R16c:', pacote('r16c2', (c, fase) => {
    if (fase !== 'antes') return;
    c.manifest.animations.extra.emote_salute = { ...c.manifest.animations.extra.emote_danca, file: c.manifest.animations.extra.emote_danca.file };
  }), 'studio_manifest_invalid');
  await exigeFalha('R16d:', pacote('r16d', (c, fase) => { if (fase === 'antes') c.manifest.animations.extra.strafe_left.family = 'combat'; }), 'studio_manifest_invalid');
  await exigeFalha('R16d:', pacote('r16d2', (c, fase) => { if (fase === 'antes') c.manifest.animations.extra.defeat.family = 'loco'; }), 'studio_manifest_invalid');

  // ── R17: estados num único states.glb ───────────────────────────────────────
  {
    const ctx = pacote('r17', (c, fase) => {
      if (fase !== 'antes') return;
      const b = bytesDe('states', 2600);
      c.servidos.set('animations/states.glb', b);
      c.manifest.files.push({ path: 'animations/states.glb', sha256: sha(b), bytes: b.byteLength });
      for (const s of STUDIO_CHARACTER_STATES) {
        c.manifest.files = c.manifest.files.filter((f) => f.path !== `animations/${s}.glb`);
        c.manifest.animations[s] = 'animations/states.glb';
      }
    });
    const r = await resolve(ctx).catch((e) => { falha(`R17: states.glb compartilhado rejeitado: ${e?.code} ${e?.message}`); return null; });
    if (!r) throw new Error('R17 falhou');
    const buscasStates = ctx.pedidos.filter((u) => u.endsWith('animations/states.glb')).length;
    if (buscasStates !== 1) falha(`R17: states.glb buscado ${buscasStates}× (11 estados), devia ser 1`);
    const urls = [...new Set(Object.values(r.animationUrls))];
    if (urls.length !== 1 || !urls[0]) falha(`R17: ${urls.length} URL(s) para 11 estados no mesmo arquivo`);
    if (r.families instanceof Map && r.families.size !== 2) falha('R17: families mudou com states.glb (extras seguem iguais)');
  }

  // ── S: servidor de /packs/ (plugin Vite real) ───────────────────────────────
  const raiz = join(temporario, 'studio-packs');
  const pasta = join(raiz, 'character', 'x', '1.0.0');
  mkdirSync(join(pasta, 'model'), { recursive: true });
  mkdirSync(join(pasta, 'previews'), { recursive: true });
  mkdirSync(join(temporario, 'fora'), { recursive: true });
  writeFileSync(join(pasta, 'manifest.json'), '{"ok":true}');
  writeFileSync(join(pasta, 'model', 'a.glb'), Buffer.from(bytesDe('glb', 100)));
  writeFileSync(join(pasta, 'previews', 'p.jpg'), Buffer.from(bytesDe('jpg', 50)));
  writeFileSync(join(pasta, 'codigo.js'), 'alert(1)');
  writeFileSync(join(temporario, 'fora', 'segredo.json'), '{"segredo":true}');
  symlinkSync(join(temporario, 'fora', 'segredo.json'), join(pasta, 'link.json'));

  let montado = null;
  S.studioPackVitePlugin().configureServer({ middlewares: { use(prefixo, fn) { montado = { prefixo, fn }; } } });
  if (montado?.prefixo !== '/packs') falha(`S1: plugin Vite montou em ${montado?.prefixo}, não em /packs`);
  const servidor = http.createServer((req, res) => {
    // Mesmo corte de prefixo do connect: /packs/<resto> → req.url = /<resto>.
    if (!req.url.startsWith('/packs/') && req.url !== '/packs') { res.writeHead(418); res.end(); return; }
    req.url = req.url.slice('/packs'.length) || '/';
    montado.fn(req, res);
  });
  await new Promise((r) => servidor.listen(0, '127.0.0.1', r));
  const porta = servidor.address().port;
  const pede = (caminho, method = 'GET') => new Promise((ok, erro) => {
    const req = http.request({ host: '127.0.0.1', port: porta, path: caminho, method }, (res) => {
      const partes = []; res.on('data', (d) => partes.push(d));
      res.on('end', () => ok({ status: res.statusCode, headers: res.headers, corpo: Buffer.concat(partes) }));
    });
    req.on('error', erro); req.end();
  });
  try {
    process.env.STUDIO_PACK_ROOT = raiz;
    for (const [rel, mime] of [['manifest.json', 'application/json; charset=utf-8'], ['model/a.glb', 'model/gltf-binary'], ['previews/p.jpg', 'image/jpeg']]) {
      const r = await pede(`/packs/character/x/1.0.0/${rel}`);
      if (r.status !== 200) { falha(`S1: ${rel} → ${r.status}`); continue; }
      if (r.headers['content-type'] !== mime) falha(`S1: ${rel} com content-type ${r.headers['content-type']}`);
      if (r.headers['cache-control'] !== 'no-store') falha(`S1: ${rel} com cache-control ${r.headers['cache-control']}`);
      if (!r.corpo.equals(readFileSync(join(pasta, rel)))) falha(`S1: ${rel} com corpo diferente do disco`);
    }
    const head = await pede('/packs/character/x/1.0.0/model/a.glb', 'HEAD');
    if (head.status !== 200 || head.corpo.length || head.headers['content-length'] !== '100') falha(`S1: HEAD → ${head.status} corpo ${head.corpo.length} len ${head.headers['content-length']}`);
    for (const ruim of ['/packs/../package.json', '/packs/character/x/1.0.0/../../../../fora/segredo.json', '/packs/%2e%2e/fora/segredo.json',
      '/packs/character%2fx%2f1.0.0%2fmanifest.json', '/packs/character/x/1.0.0/model%2fa.glb', '/packs/character\\x\\1.0.0\\manifest.json',
      '/packs//character/x/1.0.0/manifest.json', '/packs/character/x/1.0.0/./manifest.json', '/packs/character/x/1.0.0/manifest.json%00.glb']) {
      const r = await pede(ruim);
      if (r.status !== 404) falha(`S4: ${ruim} → ${r.status}${r.status === 200 ? ` (${r.corpo.length} bytes servidos)` : ''}`);
    }
    const link = await pede('/packs/character/x/1.0.0/link.json');
    if (link.status !== 404) falha(`S5: symlink para fora da raiz → ${link.status}${link.corpo.includes('segredo') ? ' (segredo servido)' : ''}`);
    for (const ruim of ['/packs/character/x/1.0.0/model', '/packs/character/x/1.0.0/codigo.js', '/packs/character/x/1.0.0/inexistente.glb']) {
      const r = await pede(ruim);
      if (r.status !== 404) falha(`S6: ${ruim} → ${r.status}`);
    }
    const post = await pede('/packs/character/x/1.0.0/manifest.json', 'POST');
    if (post.status !== 405) falha(`S8: POST → ${post.status}`);
    delete process.env.STUDIO_PACK_ROOT;
    // Sem raiz não há "raiz padrão": nem o diretório corrente, mesmo com o arquivo lá dentro.
    const cwd = process.cwd();
    process.chdir(raiz);
    const semRaiz = await pede('/packs/character/x/1.0.0/manifest.json').finally(() => process.chdir(cwd));
    if (semRaiz.status !== 404) falha(`S7: sem STUDIO_PACK_ROOT → ${semRaiz.status}`);
  } finally {
    servidor.close();
  }

  // ── piloto real (evidência opcional; só na corrida base) ────────────────────
  const raizReal = RAIZ_REAL;
  if (!mutante && raizReal && existsSync(raizReal)) {
    for (const pin of Object.values(CHARACTER_RELEASES)) {
      const fetchImpl = async (url) => {
        const rel = new URL(url).pathname.replace(/^\/packs\//, '');
        try { return new Response(await readFile(join(raizReal, rel))); } catch { return new Response('', { status: 404 }); }
      };
      try {
        const r = await R.resolveStudioCharacter({ ...pin, manifestUrl: `http://127.0.0.1${pin.manifestUrl}` }, { fetchImpl });
        console.log(`piloto real ${pin.id}@${pin.version}: manifesto ${r.manifestSha256.slice(0, 12)}…, modelo ${r.modelSha256.slice(0, 12)}…, ${Object.keys(r.animationUrls).length} clipes verificados`);
      } catch (e) { falha(`R1: piloto real ${pin.id} rejeitado: ${e?.code} ${e?.message}`); }
    }
  }
} finally {
  URL.createObjectURL = criaOriginal;
  URL.revokeObjectURL = revogaOriginal;
  rmSync(temporario, { recursive: true, force: true });
}

// ── veredito ──────────────────────────────────────────────────────────────────
if (mutante) {
  const prefixos = mutacoes[mutante][3];
  const morde = falhas.length > 0 && falhas.every((f) => prefixos.some((p) => f.startsWith(p)));
  if (morde) console.log(`mutante ${mutante} reprovado como devia: ${falhas[0]}`);
  else {
    console.error(`MUTAÇÃO PASSOU — ${mutante} não foi visto pela régua na cláusula ${prefixos.join('/')} (${falhas.length} falha(s): ${falhas.join(' | ') || 'nenhuma'}).`);
    process.exitCode = 1;
  }
} else if (falhas.length) {
  console.error('personagem do Studio reprovado:');
  for (const f of falhas) console.error(`  ✗ ${f}`);
  process.exitCode = 1;
} else {
  console.log(`personagem do Studio confere: ${Object.keys(CHARACTER_RELEASES).length} release(s) fixada(s), resolvedor fecha em ${Object.keys(mutacoes).length} mutantes de código, /packs/ canônico, contido e no-store.`);
}
process.exit(process.exitCode || 0);
