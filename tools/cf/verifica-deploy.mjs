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
import { pathToFileURL } from 'node:url';

const arg = (nome) => process.argv.find((a) => a.startsWith(`--${nome}=`))?.slice(nome.length + 3);
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

export async function verificarDeploy({
  base,
  sha,
  dist = 'dist/client',
  semViewmodel = false,
  manifestPath = 'tools/viewmodels/vm-assets.manifest.json',
  fetchImpl = fetch,
  log = console.log,
}) {
  const BASE = (base || '').replace(/\/+$/, '');
  if (!/^https:\/\//.test(BASE) || !/^[a-f0-9]{40}$/.test(sha || '')) {
    throw new Error('uso: --base=https://<host> --sha=<commit de 40 hex>');
  }

  const falhas = [];
  const check = (ok, id, msg) => { log(`${ok ? 'PASS' : 'FAIL'} ${id} ${msg}`); if (!ok) falhas.push(id); };
  const pega = async (url, init = {}) => {
    for (let tentativa = 1; ; tentativa += 1) {
      try {
        return await fetchImpl(url, { ...init, redirect: 'manual', signal: AbortSignal.timeout(30000) });
      } catch (erro) {
        if (tentativa >= 3) throw erro;
        await new Promise((resolve) => setTimeout(resolve, tentativa * 2000));
      }
    }
  };

  const home = await pega(`${BASE}/`);
  const html = await home.text();
  const gravado = /GIT_SHA = "([a-f0-9]*)"/.exec(html)?.[1] ?? '(ausente)';
  check(home.status === 200 && gravado === sha, 'D1', `/ ${home.status}, build ${gravado} (esperado ${sha})`);

  const local = readFileSync(path.join(dist, 'audio/manifest.json'));
  const remoto = await pega(`${BASE}/audio/manifest.json`);
  const corpo = Buffer.from(await remoto.arrayBuffer());
  check(remoto.status === 200 && sha256(corpo) === sha256(local), 'D2',
    `/audio/manifest.json ${remoto.status}, ${sha256(corpo).slice(0, 12)} publicado vs ${sha256(local).slice(0, 12)} do build`);

  if (semViewmodel) {
    log('SKIP D3 --sem-viewmodel');
  } else {
    const { files } = JSON.parse(readFileSync(manifestPath, 'utf8'));
    const ruins = [];
    const fila = [...files];
    await Promise.all(Array.from({ length: 8 }, async () => {
      for (let f = fila.shift(); f; f = fila.shift()) {
        const url = `${BASE}/private-assets/viewmodels/${f.path}?v=${f.sha256.slice(0, 10)}`;
        /* O corpo decide sempre. ETag e content-length podem ser forjados ou apontar para bytes
           corruptos do mesmo tamanho; HEAD sozinho não prova o artefato publicado. */
        const resposta = await pega(url);
        const body = Buffer.from(await resposta.arrayBuffer());
        const etag = (resposta.headers.get('etag') || '').replace(/^W\//, '');
        const valido = resposta.status === 200
          && body.length === f.bytes
          && etag === `"${f.sha256}"`
          && sha256(body) === f.sha256;
        if (!valido) ruins.push(`${f.path} (${resposta.status}, ${body.length} B, etag ${resposta.headers.get('etag')})`);
      }
    }));
    check(!ruins.length, 'D3', ruins.length
      ? `${ruins.length}/${files.length} viewmodels fora do contrato: ${ruins.slice(0, 4).join('; ')}`
      : `${files.length}/${files.length} viewmodels servidos do R2 com tamanho e sha256 do manifesto`);
  }

  return { falhas };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const base = arg('base') || '';
  const sha = arg('sha') || '';
  try {
    const { falhas } = await verificarDeploy({
      base,
      sha,
      dist: arg('dist') || 'dist/client',
      semViewmodel: process.argv.includes('--sem-viewmodel'),
    });
    if (falhas.length) {
      console.error(`verifica-deploy: ${falhas.length} falha(s) em ${base}: ${falhas.join(', ')}`);
      process.exitCode = 1;
    } else {
      console.log(`verifica-deploy: ${base.replace(/\/+$/, '')} conforme`);
    }
  } catch (erro) {
    console.error(erro.message);
    process.exitCode = 2;
  }
}
