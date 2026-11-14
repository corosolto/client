#!/usr/bin/env node
/* Prova pós-deploy do Worker (cf-staging-deploy.yml e cf-prod-deploy.yml). A paridade de headers
   (cf-paridade-check) não enxerga conteúdo: o staging passou dias "sem divergência" servindo o
   pacote de áudio público no lugar do privado e sem nenhum dos 63 viewmodels. Aqui cada deploy
   cobra, contra o host publicado:
     D1  `/` responde 200 e grava o commit do build (window.__CS_BUILD.sha = --sha)
     D2  /audio/manifest.json publicado é byte a byte o do dist/client deste build
     D3  todo viewmodel do manifesto versionado responde 200 com o tamanho e o ETag (sha256) dele

   Uso: node tools/cf/verifica-deploy.mjs --base=https://csb-staging.<sub>.workers.dev --sha=<40 hex>
        [--dist=dist/client] [--sem-viewmodel]  (--sem-viewmodel: Worker sem binding PRIVADO) */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const arg = (nome) => process.argv.find((a) => a.startsWith(`--${nome}=`))?.slice(nome.length + 3);
const BASE = (arg('base') || '').replace(/\/+$/, '');
const SHA = arg('sha') || '';
const DIST = arg('dist') || 'dist/client';
const SEM_VM = process.argv.includes('--sem-viewmodel');
if (!/^https:\/\//.test(BASE) || !/^[a-f0-9]{40}$/.test(SHA)) {
  console.error('uso: --base=https://<host> --sha=<commit de 40 hex>');
  process.exit(2);
}

const falhas = [];
const check = (ok, id, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${id} ${msg}`); if (!ok) falhas.push(id); };
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const pega = async (url, init = {}) => {
  for (let tentativa = 1; ; tentativa += 1) {
    try {
      return await fetch(url, { ...init, redirect: 'manual', signal: AbortSignal.timeout(30000) });
    } catch (erro) {
      if (tentativa >= 3) throw erro;
      await new Promise((r) => setTimeout(r, tentativa * 2000));
    }
  }
};

const home = await pega(`${BASE}/`);
const html = await home.text();
const gravado = /GIT_SHA = "([a-f0-9]*)"/.exec(html)?.[1] ?? '(ausente)';
check(home.status === 200 && gravado === SHA, 'D1', `/ ${home.status}, build ${gravado} (esperado ${SHA})`);

const local = readFileSync(path.join(DIST, 'audio/manifest.json'));
const remoto = await pega(`${BASE}/audio/manifest.json`);
const corpo = Buffer.from(await remoto.arrayBuffer());
check(remoto.status === 200 && sha256(corpo) === sha256(local), 'D2',
  `/audio/manifest.json ${remoto.status}, ${sha256(corpo).slice(0, 12)} publicado vs ${sha256(local).slice(0, 12)} do build`);

if (SEM_VM) {
  console.log('SKIP D3 --sem-viewmodel');
} else {
  const { files } = JSON.parse(readFileSync('tools/viewmodels/vm-assets.manifest.json', 'utf8'));
  const ruins = [];
  const fila = [...files];
  await Promise.all(Array.from({ length: 8 }, async () => {
    for (let f = fila.shift(); f; f = fila.shift()) {
      const url = `${BASE}/private-assets/viewmodels/${f.path}?v=${f.sha256.slice(0, 10)}`;
      const r = await pega(url, { method: 'HEAD' });
      // A borda comprime texto (recoil.json): o ETag vira fraco e o content-length some. Nesse
      // caso o corpo é baixado e o sha256 do conteúdo decide.
      const etag = (r.headers.get('etag') || '').replace(/^W\//, '');
      let tam = Number(r.headers.get('content-length'));
      let shaOk = etag === `"${f.sha256}"`;
      if (r.status === 200 && shaOk && tam !== f.bytes) {
        const corpo = Buffer.from(await (await pega(url)).arrayBuffer());
        tam = corpo.length;
        shaOk = sha256(corpo) === f.sha256;
      }
      if (r.status !== 200 || tam !== f.bytes || !shaOk)
        ruins.push(`${f.path} (${r.status}, ${tam} B, etag ${r.headers.get('etag')})`);
    }
  }));
  check(!ruins.length, 'D3', ruins.length
    ? `${ruins.length}/${files.length} viewmodels fora do contrato: ${ruins.slice(0, 4).join('; ')}`
    : `${files.length}/${files.length} viewmodels servidos do R2 com tamanho e sha256 do manifesto`);
}

if (falhas.length) {
  console.error(`verifica-deploy: ${falhas.length} falha(s) em ${BASE}: ${falhas.join(', ')}`);
  process.exit(1);
}
console.log(`verifica-deploy: ${BASE} conforme`);
