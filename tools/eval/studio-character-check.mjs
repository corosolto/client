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
     R8c pin sem minRuntime → studio_pin_invalid antes de qualquer fetch (o piso obrigatório é o do pin,
         que o release autentica junto do manifestSha256; o minRuntime do manifesto é piso extra
         opcional: o manifesto base da R1 não o declara, como os packs reais do Studio)
     R9  esqueleto ≠ meshy-28 → studio_skeleton_mismatch
     R10 sem crypto.subtle → studio_webcrypto_unavailable, sem nenhum fetch
     R11 falha parcial não vaza: toda Blob URL criada na tentativa é revogada, inclusive a que chega DEPOIS da falha
     R12 cache por URL+SHA: mesma promessa no sucesso; falha sai do cache e a nova tentativa busca de novo
     R13 identidade divergente → studio_identity_mismatch;  R14 orçamento → studio_budget_exceeded antes de baixar
     R15 validador do esqueleto do adaptador rejeita juntas ausentes, extras e multiplicidade errada
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
const SKELETON = 'public/js/studio-skeleton.js';
const mutante = process.argv.find((a) => a.startsWith('--mutante='))?.split('=')[1];
const RES = 'public/js/studio-character.js';
const SRV = 'scripts/studio-pack-serving.mjs';

/* [arquivo, trecho original, trecho mutado, prefixos de cláusula que têm de morder] */
const mutacoes = {
  'sha-manifesto-ignorado': [RES, 'if (manifestSha256 !== pin.manifestSha256) fail(', 'if (false) fail(', ['R2:']],
  'sha-arquivo-ignorado': [RES, 'if (sha256 !== entry.sha256) fail(', 'if (false) fail(', ['R3:']],
  'estado-opcional': [RES, "if (!Object.hasOwn(manifest.animations, state)) fail('studio_state_missing', state);", '', ['R5:']],
  'estado-desconhecido': [RES, "if (!STUDIO_CHARACTER_STATES.includes(state)) fail('studio_state_unknown', state);", '', ['R6:']],
  'dono-duplicado': [RES, 'if (owners.has(path)) fail(', 'if (false) fail(', ['R6b:']],
  'arquivo-sem-dono': [RES, "for (const path of files.keys()) if (!owners.has(path)) fail('studio_file_unowned', path);", '', ['R6c:']],
  'caminho-inseguro': [RES, "path.split('/').every((segment) => SEGMENT.test(segment))", 'true', ['R7:', 'S4:']],
  'runtime-ignorado': [RES, 'if (compareRuntimeVersions(minimo, VERSION) > 0) fail(', 'if (false) fail(', ['R8:']],
  'runtime-pin-opcional': [RES, ' && parseVersion(pin.minRuntime)', '', ['R8c:']],
  'esqueleto-ignorado': [RES, 'if (manifest.skeleton !== pin.skeleton) fail(', 'if (false) fail(', ['R9:']],
  'sem-webcrypto': [RES, "if (!subtle || typeof subtle.digest !== 'function') fail('studio_webcrypto_unavailable', 'crypto.subtle ausente: sem verificação não há carga');", "if (false) fail('studio_webcrypto_unavailable', 'crypto.subtle ausente: sem verificação não há carga');", ['R10:']],
  'vaza-parcial': [RES, 'for (const url of created) URL.revokeObjectURL(url);', '', ['R11:']],
  'servidor-segue-symlink': [SRV, 'if (!contained(rootReal, real)) return deny(404);', '', ['S5:']],
  'servidor-serve-codigo': [SRV, "  '.webp': 'image/webp',\n", "  '.webp': 'image/webp',\n  '.js': 'text/javascript',\n", ['S6:']],
  'servidor-sem-raiz': [SRV, 'if (!root) return deny(404);', "if (!root) root = '.';", ['S7:']],
  'esqueleto-validacao-ignorada': [SKELETON, 'return invalid ? detail : null;', 'return null;', ['R15:']],
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
  for (const rel of [RES, SRV, SKELETON, 'public/js/version.js', 'public/js/data/content-releases.js']) {
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
const K = await importa(SKELETON);
const { CHARACTER_RELEASES, STUDIO_CHARACTER_STATES, STUDIO_SKELETON_JOINTS } = await importa('public/js/data/content-releases.js');
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
    ['previews/retrato.jpg', bytesDe('retrato', 321)],
    ['evidence/proveniencia.json', new TextEncoder().encode('{"sintetico":true}')],
  ]);
  const manifest = {
    schemaVersion: 1, kind: 'character', id: 'sintetico', version: '1.2.3',
    source: { revision: '0'.repeat(40), provenance: ['fixture sintética da régua'] },
    files: [...servidos].map(([path, b]) => ({ path, sha256: sha(b), bytes: b.byteLength })),
    model: 'model/sintetico.glb', skeleton: 'meshy-28',
    animations: Object.fromEntries(STUDIO_CHARACTER_STATES.map((s) => [s, `animations/${s}.glb`])),
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

  // ── R15: adaptador GLB ───────────────────────────────────────────────────────
  {
    const bones = STUDIO_SKELETON_JOINTS.flatMap((name) =>
      Array.from({ length: name.startsWith('Curl_') ? 2 : 1 }, () => ({ name })));
    if (K.studioSkeletonMismatch(bones)) falha('R15: esqueleto sintético válido rejeitado');
    if (!K.studioSkeletonMismatch([...bones, bones[0]])?.includes('total 29')) falha('R15: bone repetido por identidade não alterou a contagem');
    const semHead = bones.filter((bone) => bone.name !== 'Head');
    if (!K.studioSkeletonMismatch(semHead)?.includes('sem Head')) falha('R15: junta ausente aceita');
    const comExtra = [...bones, { name: 'UnexpectedBone' }];
    if (!K.studioSkeletonMismatch(comExtra)?.includes('inesperadas UnexpectedBone')) falha('R15: junta extra aceita');
    const curl = bones.findIndex((bone) => bone.name === 'Curl_L');
    if (!K.studioSkeletonMismatch(bones.slice(0, curl).concat(bones.slice(curl + 1)))?.includes('Curl_L=1')) falha('R15: multiplicidade Curl aceita');
  }

  // ── R1 ──────────────────────────────────────────────────────────────────────
  {
    const ctx = pacote('r1');
    const r = await resolve(ctx).catch((e) => { falha(`R1: pacote íntegro rejeitado: ${e?.code} ${e?.message}`); return null; });
    if (r) {
      const estados = Object.keys(r.animationUrls);
      if (estados.join() !== STUDIO_CHARACTER_STATES.join()) falha(`R1: estados ${estados.join()}`);
      const confere = async (url, rel, mime) => {
        const blob = url?.startsWith('blob:') ? resolveObjectURL(url) : null;
        if (!blob) return falha(`R1: ${rel} sem Blob URL viva (${url})`);
        if (blob.type !== mime) falha(`R1: ${rel} com MIME ${blob.type}`);
        if (sha(new Uint8Array(await blob.arrayBuffer())) !== sha(ctx.servidos.get(rel))) falha(`R1: ${rel} com bytes diferentes dos verificados`);
      };
      await confere(r.modelUrl, 'model/sintetico.glb', 'model/gltf-binary');
      for (const s of STUDIO_CHARACTER_STATES) await confere(r.animationUrls[s], `animations/${s}.glb`, 'model/gltf-binary');
      await confere(r.previewUrls[0], 'previews/retrato.jpg', 'image/jpeg');
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
    c.manifest.animations.walk1h = 'animations/walk.glb';
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
  {
    const ctx = pacote('r8c', (c, fase) => { if (fase === 'antes') delete c.pin.minRuntime; });
    await exigeFalha('R8c:', ctx, 'studio_pin_invalid');
    if (ctx.pedidos.length) falha(`R8c: ${ctx.pedidos.length} pedido(s) com pin sem minRuntime; o pin é recusado antes da rede`);
  }
  await exigeFalha('R9:', pacote('r9', (c, fase) => { if (fase === 'antes') c.manifest.skeleton = 'mixamo-65'; }), 'studio_skeleton_mismatch');
  {
    const ctx = pacote('r10');
    const e = await exigeFalha('R10:', ctx, 'studio_webcrypto_unavailable', { subtle: null });
    if (!e || e.code !== 'studio_webcrypto_unavailable') falha(`R10: rejeição sem WebCrypto não foi exata (${e?.code || e?.name || 'sem erro'})`);
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
    if (e && nestaTentativa.length < 12) falha(`R11: só ${nestaTentativa.length} Blob URL(s) criadas; a fixture devia criar 12 antes de revogar`);
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
  console.log(`personagem do Studio confere: ${Object.keys(CHARACTER_RELEASES).length} release(s) fixada(s), resolvedor fecha em ${Object.keys(mutacoes).length} mutações de pacote sintético, /packs/ canônico, contido e no-store.`);
}
process.exit(process.exitCode || 0);
