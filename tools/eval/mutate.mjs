#!/usr/bin/env node
/* Executa o catálogo descrito em docs/issues/26-mutation-testing-automatizado.md. */
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const CAT = JSON.parse(readFileSync(join(ROOT, 'tools/eval/mutantes.json'), 'utf8'));
const SO = process.argv.find((a) => a.startsWith('--so='))?.slice(5);
const DEMO_INTERROMPE = process.argv.includes('--demo-interrompe');

let childAtivo = null;
let aplicado = null;
let preparacao = [];

function restauraMutante() {
  if (aplicado) {
    writeFileSync(aplicado.caminho, aplicado.original);
    aplicado = null;
  }
}
function restauraTudo() {
  restauraMutante();
  for (const artefato of preparacao) {
    if (artefato.existia) writeFileSync(artefato.caminho, artefato.original);
    else rmSync(artefato.caminho, { force: true });
  }
  preparacao = [];
}
for (const sinal of ['SIGINT', 'SIGTERM']) {
  process.on(sinal, () => {
    const sair = () => { restauraTudo(); process.exit(sinal === 'SIGINT' ? 130 : 143); };
    if (childAtivo) {
      childAtivo.once('close', sair);
      childAtivo.kill('SIGTERM');
    } else sair();
  });
}

function rodarRegua(comando, alvo) {
  return new Promise((resolve, reject) => {
    const [cmd, ...args] = comando.split(/\s+/).filter(Boolean);
    const child = spawn(cmd, args, { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    childAtivo = child;
    let out = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', () => {});
    child.on('close', (code) => {
      childAtivo = null;
      if (code !== 0 && !out.trim()) {
        reject(new Error(`${comando} saiu com código ${code} sem stdout — régua quebrada?`));
        return;
      }
      try {
        const ini = out.indexOf('{');
        const res = JSON.parse(out.slice(ini));
        resolve({ alvoR: res.results.find((r) => r.id === alvo), res });
      } catch (e) {
        reject(new Error(`não consegui ler ${alvo} do JSON da régua: ${e.message}`));
      }
    });
  });
}

function preparar(comando) {
  return new Promise((resolve, reject) => {
    const [cmd, ...args] = comando.split(/\s+/).filter(Boolean);
    const child = spawn(cmd, args, { cwd: ROOT, stdio: 'inherit' });
    childAtivo = child;
    child.on('close', (code) => {
      childAtivo = null;
      if (code === 0) resolve();
      else reject(new Error(`${comando} saiu com código ${code} durante a preparação`));
    });
  });
}

async function main() {
  const mutantes = SO ? CAT.mutantes.filter((m) => m.id === SO) : CAT.mutantes;
  if (!mutantes.length) throw new Error(`nenhum mutante (--so=${SO}) no catálogo`);
  if (CAT.prepara) {
    const etapa = typeof CAT.prepara === 'string' ? { comando: CAT.prepara } : CAT.prepara;
    preparacao = (etapa.artefatos || []).map((arquivo) => {
      const caminho = join(ROOT, arquivo);
      const existia = existsSync(caminho);
      return { caminho, existia, original: existia ? readFileSync(caminho) : null };
    });
    await preparar(etapa.comando);
  }
  let sobrev = 0, pulados = 0, falhas = 0;

  for (const m of mutantes) {
    const caminho = join(ROOT, m.arquivo);
    const original = readFileSync(caminho, 'utf8');
    const ocorrencias = original.split(m.de).length - 1;
    if (ocorrencias !== 1) {
      console.log(`ERRO  ${m.id}: '${m.de.slice(0, 40)}…' apareceu ${ocorrencias}× no ${
        m.arquivo} (catálogo desatualizado?)`);
      falhas++;
      continue;
    }
    aplicado = { caminho, original };
    writeFileSync(caminho, original.replace(m.de, m.para), 'utf8');
    try {
      if (DEMO_INTERROMPE) {
        process.stdout.write(`[${m.id}] patch aplicado — aguardando SIGINT (kill -INT ${process.pid})…`);
        await new Promise((r) => setTimeout(r, 30000));
        console.log('\nDEMO  nada deveria chegar aqui (SIGINT não foi entregue?)');
      } else {
        const regua = m.regua || CAT.regua;
        const { alvoR } = await rodarRegua(regua.comando, regua.alvo);
        if (!alvoR) throw new Error(`a régua não emitiu ${regua.alvo}`);
        const v = alvoR.ok === false ? 'MATOU'
          : alvoR.ok === true ? 'SOBREVIVEU'
          : `PULADO (${alvoR.evid || 'sem evidência'})`;
        console.log(`[${m.id}] ${v} ${regua.alvo}`);
        if (alvoR.ok === true) sobrev++;
        else if (alvoR.ok == null) pulados++;
      }
    } catch (e) {
      console.log(`ERRO  ${m.id}: ${e.message}`);
      falhas++;
    } finally {
      restauraMutante();
    }
  }

  restauraTudo();
  if (sobrev || pulados || falhas) {
    const motivos = (sobrev ? `${sobrev} sobreviveram (invariante cega — achado)` : '') +
      (sobrev && (pulados || falhas) ? ' + ' : '') +
      (pulados ? `${pulados} pulados (avaliação inconclusiva)` : '') +
      (pulados && falhas ? ' + ' : '') + (falhas ? `${falhas} erros` : '');
    console.error(`\nFALHOU: ${mutantes.length} mutantes → ${motivos}`);
    process.exit(1);
  }
  console.log(`\nOK: ${mutantes.length} mutantes MATARAM a régua — catálogo morde em todos os buracos documentados`);
}

main().catch((e) => { restauraTudo(); console.error(`\nFALHOU: ${e.message}`); process.exit(1); });
