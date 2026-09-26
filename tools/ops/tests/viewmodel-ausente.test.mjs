/* VIEWMODEL PAGO AUSENTE DO DEPLOY NÃO É CRASH DE CÓDIGO (BUG-181, #656 #657 #658).
   ═══════════════════════════════════════════════════════════════════════════════════
   O catálogo privado do viewmodel ainda não foi publicado no Blob (`blobBase: null` em
   `tools/viewmodels/vm-assets.manifest.json`), então todo `/private-assets/viewmodels/*`
   responde 404 em produção. O `authoredvm.js` pega a falha, loga `[paid-viewmodel] <chave>`
   com o `HttpError` do three e o jogo segue no viewmodel legado. É a degradação desenhada
   no #655, mas a pilha same-origin do three fazia o console.error virar `codigo`, e cada
   bump de versão do GLB nascia com uma fingerprint nova e abria mais uma issue.

   A régua usa os payloads reais das três issues. As cláusulas de antivacuidade garantem
   que o corte não cobre asset público faltando, outro status HTTP, falha de parse ou
   404 que não passou pelo catch do viewmodel.

   uso: npm run ops:test
   ═══════════════════════════════════════════════════════════════════════════════════ */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyCrash } from '../../../src/lib/error-provenance.mjs';

const ORIGEM = 'https://www.csbrasil.online';
const PILHA = (url) => `Error: fetch for "${url}" responded with 404: \n    at ${ORIGEM}/vendor/three.module.js?v=2.0.0-alpha.298:43588:12`;
/* O hook de console.error (src/pages/index.astro) junta os argumentos com espaço: o prefixo
   do catch, depois o `message` do HttpError. Em HTTP/2 o statusText vem vazio. */
const payload = (chave, url, status = '404: ') => ({
  message: `[paid-viewmodel] ${chave} fetch for "${url}" responded with ${status}`,
  source: '',
  stack: PILHA(url),
});
const PRIV = `${ORIGEM}/private-assets/viewmodels`;

test('#658: GLB da pistola ausente do deploy é recuperável', () => {
  assert.equal(classifyCrash(payload('pistol#pistol', `${PRIV}/pistol/pistol-runtime.glb?v=edb77908ea`), ORIGEM), 'recuperavel');
});

test('#656: GLB da granada ausente do deploy é recuperável', () => {
  assert.equal(classifyCrash(payload('grenade', `${PRIV}/grenade/grenade-runtime.glb?v=5b785ea19a`), ORIGEM), 'recuperavel');
});

test('#657: clipes gerais ausentes do deploy são recuperáveis', () => {
  assert.equal(classifyCrash(payload('general-runtime', `${PRIV}/shared/general-runtime.glb?v=paid-aaa-3`), ORIGEM), 'recuperavel');
});

test('HTTP/1.1 traz o statusText "Not Found" e é a mesma falha', () => {
  assert.equal(classifyCrash(payload('pistol#pistol', `${PRIV}/pistol/pistol-runtime.glb?v=edb77908ea`, '404: Not Found'), ORIGEM), 'recuperavel');
});

/* ── O QUE O CORTE NÃO PODE ENGOLIR ─────────────────────────────────────────────── */

test('asset PÚBLICO faltando segue codigo: o AK golden mora no git, não no Blob', () => {
  assert.equal(classifyCrash(payload('gold#ak', `${ORIGEM}/models/viewmodels/coro/ak-hires.glb?v=aae400d6e9`), ORIGEM), 'codigo');
});

test('outro status no catálogo privado segue codigo: 403 é token, 500 é servidor', () => {
  for (const status of ['403: Forbidden', '500: ', '410: Gone']) {
    assert.equal(classifyCrash(payload('pistol#pistol', `${PRIV}/pistol/pistol-runtime.glb?v=edb77908ea`, status), ORIGEM), 'codigo', status);
  }
});

test('GLB que chegou mas não parseia segue codigo', () => {
  assert.equal(classifyCrash({
    message: '[paid-viewmodel] pistol#pistol Unexpected token \'<\', "<!DOCTYPE "... is not valid JSON',
    source: '',
    stack: `SyntaxError: Unexpected token '<'\n    at ${ORIGEM}/vendor/three.module.js?v=2.0.0-alpha.298:44001:20`,
  }, ORIGEM), 'codigo');
});

test('404 privado SEM o prefixo do catch segue codigo: nada prova que houve fallback', () => {
  const url = `${PRIV}/pistol/pistol-runtime.glb?v=edb77908ea`;
  assert.equal(classifyCrash({
    message: `fetch for "${url}" responded with 404: `,
    source: 'promise',
    stack: PILHA(url),
  }, ORIGEM), 'codigo');
});

test('a âncora é a mensagem INTEIRA: texto depois do status não corta', () => {
  const p = payload('pistol#pistol', `${PRIV}/pistol/pistol-runtime.glb?v=edb77908ea`);
  assert.equal(classifyCrash({ ...p, message: `${p.message}e depois o rig quebrou` }, ORIGEM), 'codigo');
});

test('a âncora é a mensagem INTEIRA: texto antes do prefixo também não corta', () => {
  const p = payload('pistol#pistol', `${PRIV}/pistol/pistol-runtime.glb?v=edb77908ea`);
  assert.equal(classifyCrash({ ...p, message: `rig quebrou ao trocar de arma: ${p.message}` }, ORIGEM), 'codigo');
});

test('a chave é um token só: frase entre o prefixo e o fetch não corta', () => {
  const url = `${PRIV}/pistol/pistol-runtime.glb?v=edb77908ea`;
  assert.equal(classifyCrash({
    ...payload('pistol#pistol', url),
    message: `[paid-viewmodel] pistol#pistol sem socket de cano, e o fetch for "${url}" responded with 404: `,
  }, ORIGEM), 'codigo');
});

test('outro catálogo privado segue codigo: só o viewmodel tem fallback para o legado', () => {
  assert.equal(classifyCrash(payload('pistol#pistol', `${ORIGEM}/private-assets/audio/pack.zip`), ORIGEM), 'codigo');
});
