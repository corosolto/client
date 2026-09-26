#!/usr/bin/env node
/** Fábrica — estágio de QA (gauntlet por arma): réguas, capturas, pacote do crítico, regressão.
 *
 *   node tools/fabrica/qa.mjs <id|todas> [--porta=4671] [--lote=fabrica-lote2] [--sem-capturas] [--sem-regressao]
 *
 * 1. réguas do produto (tools/fabrica/reguas.mjs, com mutantes);
 * 2. manga: eval:vm-manga-oca e eval:vm-manga-tela no modo --fabrica (a extensão do vmsleeve
 *    fica desligada nos produtos da fábrica — isto prova que o braço inteiro do pack dispensa);
 * 3. réguas de imagem do #636 (mira, cobertura, pistola-ref, mãos, carregador) no jogo real,
 *    em 3:2 e 16:9, com VM_PALCO_QS=vmfabrica=<id>. DÍVIDA do vm-reguas-divida.json NÃO vale
 *    aqui: a dívida é dos produtos antigos, o da fábrica responde por si;
 * 4. capturas no jogo (idle, ADS, tiro, recarga vazia, inspeção) nas duas proporções, depois
 *    de o saque e o ADS assentarem (kcap espera o estado idle e adsAmount ≥ 0,99);
 * 5. pacote do crítico cego em artifacts/fabrica-lote1/critico/<id>/ (figuras + referências
 *    AK golden e PT-38 aprovadas; o crítico é o agente critico-visual-vm, chamado por quem roda);
 * 6. regressão do arsenal: eval:vm-cache, eval:vm-launch, eval:vm-rig, eval:vm-orientacao,
 *    eval:vm-manga-oca, eval:vm-placar (o que já existia tem de continuar como estava).
 * Saída: artifacts/fabrica-lote1/qa/<id>.json e qa/resumo.json.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { MANIFESTO, RAIZ_REPO, gravarJson, lerJson } from './lib/comum.mjs';

const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const opt = (n, d = '') => args.find((a) => a.startsWith(`--${n}=`))?.split('=').slice(1).join('=') || d;
const PORTA = opt('porta', '4671');
const manifesto = lerJson(MANIFESTO);
const pedido = args.find((a) => !a.startsWith('--')) || 'todas';
const ids = pedido === 'todas' ? Object.keys(manifesto.candidates) : pedido.split(',');
const LOTE = path.join(RAIZ_REPO, 'artifacts', opt('lote', 'fabrica-lote1'));
const QA = path.join(LOTE, 'qa');
fs.mkdirSync(QA, { recursive: true });

function rodar(nome, cmd, argv, env = {}) {
  const t = Date.now();
  const r = spawnSync(cmd, argv, { cwd: RAIZ_REPO, encoding: 'utf8', env: { ...process.env, ...env }, maxBuffer: 256 * 1024 * 1024 });
  const log = path.join(QA, 'logs', `${nome}.log`);
  fs.mkdirSync(path.dirname(log), { recursive: true });
  fs.writeFileSync(log, `${r.stdout}\n${r.stderr}`);
  console.log(`[qa] ${nome}: ${r.status === 0 ? 'ok' : `saída ${r.status}`} (${((Date.now() - t) / 1000).toFixed(0)} s)`);
  return { status: r.status, out: r.stdout, log: path.relative(RAIZ_REPO, log) };
}

function lerReguas(out) {
  const porArma = {};
  for (const l of out.split('\n')) {
    const m = /^(PASSA|FALHA|DÍVIDA|N\/A|NAO_MEDE)\s+(\w[\w-]*)\/(\w+)\s+(.*?) — (.*)$/.exec(l.trim());
    if (!m) continue;
    const [, estado, regua, arma, valor, msg] = m;
    (porArma[arma] ||= {})[regua] = {
      estado: estado === 'PASSA' ? 'VERDE' : estado === 'N/A' ? 'N/A' : 'VERMELHO',
      valor, msg: msg.replace(/\s*\[dono:.*$/, '').slice(0, 400),
    };
  }
  return porArma;
}

const resultado = Object.fromEntries(ids.map((id) => [id, { id, chassi: manifesto.candidates[id]?.chassi }]));

const reguas = rodar('reguas-produto', process.execPath, ['tools/fabrica/reguas.mjs', ...ids, '--mutantes', `--json=${path.join(QA, 'reguas-produto.json')}`]);
const rp = lerJson(path.join(QA, 'reguas-produto.json'));
for (const r of rp.base) resultado[r.id].produto = { ok: !r.falhas.length, falhas: r.falhas, medidas: r.medidas };
const mutantes = rp.mutantes;

for (const [nome, script] of [['manga-oca', 'tools/eval/vm-manga-oca-check.mjs'], ['manga-tela', 'tools/eval/vm-manga-tela-check.mjs']]) {
  const r = rodar(nome, process.execPath, [script, '--fabrica', '--tabela', `--armas=${ids.join(',')}`]);
  for (const id of ids) {
    const l = r.out.split('\n').find((x) => new RegExp(`^(OK|FALHA|DIVIDA)\\s+${id}\\b`).test(x.trim()));
    resultado[id][nome] = l ? { ok: /^OK/.test(l.trim()), linha: l.trim() } : { ok: false, linha: 'sem medida' };
  }
}

for (const aspecto of ['3x2', '16x9']) {
  const r = rodar(`reguas-imagem-${aspecto}`, process.execPath, ['tools/eval/vm-reguas-check.mjs', '--regua=todas',
    `--armas=${ids.join(',')}`, `--porta=${PORTA}`, `--aspecto=${aspecto}`, `--fotos=${path.join(LOTE, `reguas-${aspecto}`)}`],
  { VM_PALCO_QS: `vmfabrica=${ids.join(',')}` });
  const lidas = lerReguas(r.out);
  for (const id of ids) resultado[id][`imagem-${aspecto}`] = lidas[id] || { erro: 'sem medida (ver log)' };
}

{
  // #641: a amostra do carregador tem de sair igual com e sem render entre passo e medida.
  const r = rodar('carregador-repete', process.execPath, ['tools/eval/vm-carregador-repete.mjs', `--armas=${ids.join(',')}`, `--porta=${PORTA}`],
    { VM_PALCO_QS: `vmfabrica=${ids.join(',')}` });
  for (const id of ids) resultado[id]['carregador-repete'] = { ok: r.status === 0, log: r.log };
}

if (!flag('sem-capturas')) {
  for (const [aspecto, arg] of [['3x2', '32'], ['16x9', '169']]) {
    const dir = path.join(LOTE, 'capturas', aspecto);
    rodar(`capturas-${aspecto}`, process.execPath, ['tools/fabrica/captura/kcap.mjs', `--porta=${PORTA}`, `--aspecto=${arg}`,
      `--armas=${ids.join(',')}`, `--out=${dir}`, `--query=vmfabrica=${ids.join(',')}`]);
    for (const id of ids) resultado[id][`capturas-${aspecto}`] = fs.existsSync(dir)
      ? fs.readdirSync(dir).filter((f) => f.startsWith(`${id}-`) && f.endsWith('.png')).map((f) => path.relative(LOTE, path.join(dir, f))) : [];
  }
  // Vídeo 3:2 por arma (saque, idle, tiro, ADS, recarga) — a página do dono mostra o movimento.
  const vdir = path.join(LOTE, 'video');
  for (const id of ids) {
    rodar(`video-${id}`, process.execPath, ['tools/viewmodels/prep/arsenal-video-capture.mjs', `--porta=${PORTA}`,
      `--armas=${id}`, '--aspecto=3x2', `--out=${path.join(vdir, id)}`], { VM_PALCO_QS: `vmfabrica=${id}` });
    const d = path.join(vdir, id);
    resultado[id].video = fs.existsSync(d) ? fs.readdirSync(d).filter((f) => f.endsWith('.webm')).map((f) => path.relative(LOTE, path.join(d, f))) : [];
  }
  // Pacote do crítico: figuras 3:2 do produto + referências aprovadas, sem texto de intenção.
  const refDir = path.join(LOTE, 'ref');   // retratos da AK golden e da PT-38 aprovadas (fora do git)
  for (const id of ids) {
    const dir = path.join(LOTE, 'critico', id);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(path.join(dir, 'atual'), { recursive: true });
    for (const f of resultado[id]['capturas-3x2'] || []) fs.copyFileSync(path.join(LOTE, f), path.join(dir, 'atual', path.basename(f)));
    if (fs.existsSync(refDir)) fs.cpSync(refDir, path.join(dir, 'referencia'), { recursive: true });
    resultado[id].critico = { pacote: path.relative(LOTE, dir) };
  }
}

// --sem-regressao preserva a regressão da última rodada completa (ela não depende do produto).
const regressao = flag('sem-regressao') ? (fs.existsSync(path.join(QA, 'resumo.json')) ? lerJson(path.join(QA, 'resumo.json')).regressao || {} : {}) : {};
if (!flag('sem-regressao')) {
  for (const s of ['eval:vm-cache', 'eval:vm-launch', 'eval:vm-rig', 'eval:vm-orientacao', 'eval:vm-manga-oca', 'eval:vm-placar']) {
    const r = rodar(`regressao-${s.replace(/[:]/g, '_')}`, 'npm', ['run', '-s', s]);
    regressao[s] = { ok: r.status === 0, log: r.log };
  }
}

const vermelhos = (id) => {
  const r = resultado[id];
  const lista = [];
  if (!r.produto?.ok) lista.push('produto');
  for (const k of ['manga-oca', 'manga-tela']) if (!r[k]?.ok) lista.push(k);
  // Silêncio não é verde: régua de imagem sem medida (navegador que não subiu, aba que caiu)
  // entra como vermelha `sem-medida`; o mesmo para captura vazia.
  for (const a of ['3x2', '16x9']) {
    const img = r[`imagem-${a}`];
    if (!img || img.erro || !Object.keys(img).length) lista.push(`sem-medida@${a}`);
    for (const [regua, v] of Object.entries(img || {})) if (v.estado === 'VERMELHO') lista.push(`${regua}@${a}`);
  }
  if (!flag('sem-capturas') && !(r['capturas-3x2'] || []).length) lista.push('sem-captura');
  if (r['carregador-repete'] && !r['carregador-repete'].ok) lista.push('carregador-repete');
  return lista;
};
for (const id of ids) {
  resultado[id].vermelhos = vermelhos(id);
  gravarJson(path.join(QA, `${id}.json`), resultado[id]);
}
const anterior = fs.existsSync(path.join(QA, 'resumo.json')) ? lerJson(path.join(QA, 'resumo.json')) : {};
const resumo = {
  schemaVersion: 1, gerado: new Date().toISOString(), porta: PORTA, ids: [...new Set([...(anterior.ids || []), ...ids])],
  mutantesDoProduto: mutantes.map((m) => ({ mutante: m.mutante, mordeu: m.mordeu })),
  porArma: { ...(anterior.porArma || {}), ...Object.fromEntries(ids.map((id) => [id, resultado[id].vermelhos])) },
  regressao,
};
gravarJson(path.join(QA, 'resumo.json'), resumo);
console.log(JSON.stringify(resumo, null, 1));
