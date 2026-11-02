#!/usr/bin/env node
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';
import { classifyProfile404s, isExpectedGuestProfile404, parseGuestAuthJson, parseProfileErrorJson } from './expected-guest-profile.mjs';

const root = await mkdtemp(join(tmpdir(), 'ui-regression-selftest-'));
const base = join(root, 'base');
const head = join(root, 'head');
const out = join(root, 'out');
const element = { visible: true, rect: [10, 10, 40, 20], text: 'JOGAR' };
const scene = () => ({ viewport: [100, 100], errors: [], assets404: [], elements: { '#btn-jogar': { ...element } }, mediaReady: true, failed: null });
const manifest = (data) => ({ version: 1, scenes: { home: data } });
const png = (color) => sharp({ create: { width: 100, height: 100, channels: 3, background: color } }).png().toBuffer();
const expect = (condition, name) => { if (!condition) throw new Error(`helper: ${name} deveria ser verdadeiro`); };
const guestEntry = (overrides = {}) => ({
  sameOrigin: true, method: 'GET', pathname: '/api/social', action: 'profile', status: 404,
  errorCode: 'not_found', jsonValid: true, ownGuestId: true, explicitProfile: false, ...overrides,
});
const guestAuth = (overrides = {}) => ({
  pending: 0,
  observations: [{ status: 200, authenticated: false, profileAbsent: true, jsonValid: true }],
  ...overrides,
});
const assertHelpers = () => {
  expect(isExpectedGuestProfile404(guestEntry(), guestAuth()), 'caso positivo completo');
  expect(isExpectedGuestProfile404(guestEntry({ status: 500 }), guestAuth()) === false, 'status 500');
  expect(isExpectedGuestProfile404(guestEntry({ method: 'POST' }), guestAuth()) === false, 'método POST');
  expect(isExpectedGuestProfile404(guestEntry({ action: 'providers' }), guestAuth()) === false, 'action providers');
  expect(isExpectedGuestProfile404(guestEntry({ pathname: '/api/social/other' }), guestAuth()) === false, 'pathname desconhecido');
  expect(isExpectedGuestProfile404(guestEntry({ sameOrigin: false }), guestAuth()) === false, 'outra origem');
  expect(isExpectedGuestProfile404(guestEntry({ ownGuestId: false }), guestAuth()) === false, 'id de outro convidado');
  expect(isExpectedGuestProfile404(guestEntry({ explicitProfile: true }), guestAuth()) === false, 'perfil explícito');
  expect(isExpectedGuestProfile404(guestEntry({ jsonValid: false }), guestAuth()) === false, 'JSON inválido');
  expect(isExpectedGuestProfile404(guestEntry({ errorCode: 'unauthorized' }), guestAuth()) === false, 'erro distinto');
  const missingField = guestEntry(); delete missingField.ownGuestId;
  expect(isExpectedGuestProfile404(missingField, guestAuth()) === false, 'campo ausente');
  expect(isExpectedGuestProfile404(guestEntry(), guestAuth({ pending: 1 })) === false, 'auth pendente');
  expect(isExpectedGuestProfile404('não-objeto', guestAuth()) === false, 'entry não-objeto');
  expect(isExpectedGuestProfile404(guestEntry(), null) === false, 'authState nulo');
  expect(isExpectedGuestProfile404(guestEntry(), guestAuth({ observations: [] })) === false, 'sem observações');
  expect(isExpectedGuestProfile404(guestEntry(), guestAuth({ observations: [
    { status: 200, authenticated: false, profileAbsent: true, jsonValid: true },
    { status: 200, authenticated: true, profileAbsent: false, jsonValid: true },
  ] })) === false, 'observação autenticada misturada');
  expect(isExpectedGuestProfile404(guestEntry(), guestAuth({ observations: [
    { status: 200, authenticated: false, profileAbsent: true, jsonValid: false },
  ] })) === false, 'observação malformada');
  expect(isExpectedGuestProfile404(guestEntry({ status: '404' }), guestAuth()) === false, 'status string');
  expect(isExpectedGuestProfile404(guestEntry({ jsonValid: 'true' }), guestAuth()) === false, 'jsonValid string');
  expect(isExpectedGuestProfile404(guestEntry(), guestAuth({ observations: [[]] })) === false, 'observação array');
  expect(parseProfileErrorJson('{"error":123}').jsonValid === false, 'erro não-string');
  expect(parseGuestAuthJson('{"authenticated":"false"}').jsonValid === false, 'authenticated string');
  const derived = classifyProfile404s([{ pathname: '/api/social', entry: guestEntry() }], ['/api/social'], guestAuth());
  expect(derived.expected.length === 1 && derived.assets404.length === 0, 'classify remove exatamente a ocorrência esperada');
  const mixed = classifyProfile404s(
    [
      { pathname: '/api/social', entry: guestEntry() },
      { pathname: '/api/social', entry: guestEntry({ status: 500 }) },
    ],
    ['/api/social', '/api/social'],
    guestAuth(),
  );
  expect(mixed.expected.length === 1 && mixed.assets404.length === 1 && mixed.assets404[0] === '/api/social', '1 bom + 1 ruim no mesmo path mantém o 404');
  const noMatch = classifyProfile404s([{ pathname: '/api/social', entry: guestEntry({ errorCode: 'unauthorized' }) }], ['/api/social'], guestAuth());
  expect(noMatch.expected.length === 0 && noMatch.assets404.length === 1, 'candidato ruim não remove nada');
  expect(classifyProfile404s('não-array', ['/api/social'], guestAuth()).assets404.length === 1, 'records não-array');
  const mismatched = classifyProfile404s([{ pathname: '/img/other.png', entry: guestEntry() }], ['/img/other.png'], guestAuth());
  expect(mismatched.expected.length === 0 && mismatched.assets404.length === 1, 'record divergente não remove outro asset');
  const errorBody = parseProfileErrorJson('{"error":"server_error"}');
  const authBody = parseGuestAuthJson('{"authenticated":false,"profile":null}');
  expect(isExpectedGuestProfile404(guestEntry({ jsonValid: errorBody.jsonValid, errorCode: errorBody.errorCode }), guestAuth({ observations: [{ status: 200, ...authBody }] })) === false, 'corpo real com erro distinto');
  expect(parseProfileErrorJson('{"error":"not_found"}').errorCode === 'not_found', 'parser aceita not_found');
  expect(parseProfileErrorJson('[{"error":"not_found"}]').jsonValid === false, 'parser rejeita array');
  expect(parseProfileErrorJson('{malformado').jsonValid === false, 'parser rejeita JSON quebrado');
  expect(parseProfileErrorJson('{"error":"not_found","path":"/api/social"}').jsonValid === false
    && parseProfileErrorJson('{"error":"not_found","path":"/api/social"}').errorCode === '', 'fallback literal do Astro rejeitado (key extra path)');
  expect(parseProfileErrorJson('{"error":"not_found","path":"/api/other"}').jsonValid === false, 'path de outra rota rejeitado');
  expect(parseProfileErrorJson('{"error":"not_found","metadata":{}}').jsonValid === false, 'metadata extra rejeitado');
  expect(parseProfileErrorJson('{"__proto__":{"a":1},"error":"not_found"}').jsonValid === false, 'key extra __proto__ rejeitada');
  expect(parseProfileErrorJson('null').jsonValid === false && parseProfileErrorJson('"not_found"').jsonValid === false, 'primitivo rejeitado');
  const astroFallback = parseProfileErrorJson('{"error":"not_found","path":"/api/social"}');
  const fallbackEntry = guestEntry({ jsonValid: astroFallback.jsonValid, errorCode: astroFallback.errorCode });
  expect(isExpectedGuestProfile404(fallbackEntry, guestAuth()) === false, 'fallback Astro não é perfil esperado');
  const fallbackKept = classifyProfile404s([{ pathname: '/api/social', entry: fallbackEntry }], ['/api/social'], guestAuth());
  expect(fallbackKept.expected.length === 0 && fallbackKept.assets404.length === 1 && fallbackKept.assets404[0] === '/api/social', 'REGRESSAO: fallback derivado do helper mantém o 404');
  const exactBody = parseProfileErrorJson('{"error":"not_found"}');
  const exactDerived = classifyProfile404s(
    [{ pathname: '/api/social', entry: guestEntry({ jsonValid: exactBody.jsonValid, errorCode: exactBody.errorCode }) }],
    ['/api/social'],
    guestAuth(),
  );
  expect(exactDerived.expected.length === 1 && exactDerived.assets404.length === 0, 'REGRESSAO: schema exato derivado do helper remove o 404');
  expect(parseGuestAuthJson('{"authenticated":true,"profile":{"id":"x"}}').authenticated === true, 'parser detecta autenticado');
  expect(parseGuestAuthJson('{"profile":null}').jsonValid === false, 'parser exige authenticated booleano');
  expect(parseGuestAuthJson('{"authenticated":false}').profileAbsent === true, 'parser aceita profile ausente');
  const integrationDerived = classifyProfile404s([{ pathname: '/api/social', entry: guestEntry() }], ['/api/social'], guestAuth());
  expect(integrationDerived.expected.length === 1, 'derivação de metadados de API esperada');
};
assertHelpers();
console.log('helper expected-guest-profile: asserções puras ok');

async function check(name, changed, expected, expectedExit) {
  await writeFile(join(head, 'manifest.json'), JSON.stringify(manifest(changed)));
  const env = { ...process.env };
  delete env.GITHUB_STEP_SUMMARY;
  const result = spawnSync(process.execPath, ['tools/ui-regression/classify.mjs', '--base', base, '--head', head, '--out', out], { cwd: new URL('../..', import.meta.url), env, encoding: 'utf8' });
  const report = JSON.parse(await readFile(join(out, 'report.json'), 'utf8'));
  if (report.status !== expected || result.status !== expectedExit) {
    throw new Error(`${name}: esperado ${expected}/${expectedExit}, recebido ${report.status}/${result.status}\n${result.stderr}`);
  }
  console.log(`${name}: ${report.status}`);
}

try {
  await Promise.all([mkdir(base), mkdir(head)]);
  await writeFile(join(base, 'manifest.json'), JSON.stringify(manifest(scene())));
  const black = await png('#000000');
  await Promise.all([writeFile(join(base, 'home.stable.png'), black), writeFile(join(head, 'home.stable.png'), black)]);
  await check('sem mutação', scene(), 'SEM_REGRESSAO', 0);
  const missingButton = scene();
  missingButton.elements['#btn-jogar'].visible = false;
  await check('CTA desapareceu', missingButton, 'REGRESSAO', 1);
  const missingAsset = scene();
  missingAsset.assets404.push('/img/novo-asset.png');
  await check('novo 404', missingAsset, 'REGRESSAO', 1);
  const ignoredAsset = scene();
  ignoredAsset.assets404.push('/audio/menu-music/m17.mp3');
  await check('asset privado ausente', ignoredAsset, 'SEM_REGRESSAO', 0);
  await writeFile(join(head, 'home.stable.png'), await png('#ffffff'));
  await check('mudança visual', scene(), 'REVISAR', 0);
  const unavailable = scene();
  unavailable.failed = 'baseline indisponível';
  await writeFile(join(base, 'manifest.json'), JSON.stringify(manifest(unavailable)));
  await check('baseline indisponível', scene(), 'INCONCLUSIVO', 1);
  await writeFile(join(base, 'manifest.json'), JSON.stringify(manifest(scene())));
  await writeFile(join(head, 'home.stable.png'), black);
  const expectedApi = scene();
  const single = classifyProfile404s([{ pathname: '/api/social', entry: guestEntry() }], ['/api/social'], guestAuth());
  expectedApi.expectedApiResponses = single.expected;
  await check('404 de perfil próprio esperado', expectedApi, 'SEM_REGRESSAO', 0);
  const unexpectedApi = scene();
  unexpectedApi.assets404.push('/api/social');
  await check('404 de API sem exceção', unexpectedApi, 'REGRESSAO', 1);
  const otherApi = scene();
  otherApi.assets404.push('/api/outra');
  await check('outro 404 de API', otherApi, 'REGRESSAO', 1);
  const otherAsset = scene();
  otherAsset.assets404.push('/img/outro-asset.png');
  const residual = scene();
  residual.assets404.push('/api/social', '/api/social', '/api/social');
  const twoGoodOneBad = classifyProfile404s(
    [{ pathname: '/api/social', entry: guestEntry() }, { pathname: '/api/social', entry: guestEntry() }, { pathname: '/api/social', entry: guestEntry({ jsonValid: false }) }],
    residual.assets404,
    guestAuth(),
  );
  expect(twoGoodOneBad.expected.length === 2 && twoGoodOneBad.assets404.length === 1, '2 bons + 1 ruim deixa exatamente 1');
  residual.assets404 = twoGoodOneBad.assets404;
  residual.expectedApiResponses = twoGoodOneBad.expected;
  await check('404 de API residual de candidato ruim', residual, 'REGRESSAO', 1);
  const fallback = parseProfileErrorJson('{"error":"not_found","path":"/api/social"}');
  const fallbackResult = classifyProfile404s(
    [{ pathname: '/api/social', entry: guestEntry({ jsonValid: fallback.jsonValid, errorCode: fallback.errorCode }) }],
    ['/api/social'],
    guestAuth(),
  );
  const missingRoute = scene();
  missingRoute.assets404 = fallbackResult.assets404;
  missingRoute.expectedApiResponses = fallbackResult.expected;
  await check('fallback Astro de rota ausente', missingRoute, 'REGRESSAO', 1);
  await check('outro asset 404', otherAsset, 'REGRESSAO', 1);
} finally {
  await rm(root, { recursive: true, force: true });
}
