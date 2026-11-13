import { readFileSync } from 'node:fs';

export const IDADE_MAXIMA_MANIFESTO_MS = 48 * 60 * 60 * 1000;
const TOLERANCIA_FUTURO_MS = 5 * 60 * 1000;

function dataIso(valor) {
  const data = valor instanceof Date ? valor : new Date(valor);
  if (!Number.isFinite(data.getTime())) throw new Error(`data inválida: ${valor}`);
  return data.toISOString();
}

function mediana(valores) {
  const ordenados = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(ordenados.length / 2);
  return ordenados.length % 2 ? ordenados[meio] : (ordenados[meio - 1] + ordenados[meio]) / 2;
}

export function criarManifestoDuracoes(entradas, { geradoEm = new Date() } = {}) {
  if (!Array.isArray(entradas) || !entradas.length) throw new Error('nenhum relatório de tempos encontrado');
  const amostras = new Map();
  const fontes = [];
  for (const { fonte, relatorio } of entradas) {
    if (!fonte || !relatorio || !Array.isArray(relatorio.resultados)) {
      throw new Error(`relatório de tempos inválido: ${fonte || '(sem fonte)'}`);
    }
    fontes.push(fonte);
    for (const resultado of relatorio.resultados) {
      if (resultado.status !== 'ok') continue;
      if (typeof resultado.passo !== 'string' || !resultado.passo
        || !Number.isFinite(resultado.duracao) || resultado.duracao < 0) {
        throw new Error(`resultado ok inválido em ${fonte}`);
      }
      if (!amostras.has(resultado.passo)) amostras.set(resultado.passo, []);
      amostras.get(resultado.passo).push(resultado.duracao);
    }
  }
  if (!amostras.size) throw new Error('nenhum passo ok nos relatórios de tempos');
  const duracoes = {};
  for (const passo of [...amostras.keys()].sort()) {
    const valores = amostras.get(passo);
    duracoes[passo] = {
      segundos: Math.max(0.001, Number(mediana(valores).toFixed(3))),
      amostras: valores.length,
    };
  }
  return { versao: 1, geradoEm: dataIso(geradoEm), fontes: fontes.sort(), duracoes };
}

export function planejarShards(passos, duracoes, total) {
  if (!Number.isSafeInteger(total) || total < 1) throw new Error('total de shards deve ser inteiro positivo');
  if (!Array.isArray(passos) || !passos.length) throw new Error('sharding exige ao menos um passo');
  if (new Set(passos).size !== passos.length) throw new Error('sharding exige passos sem duplicatas');
  if (total > passos.length) throw new Error(`shards (${total}) excedem os passos disponíveis (${passos.length})`);
  const ausentes = passos.filter((passo) => !Number.isFinite(duracoes[passo]) || duracoes[passo] <= 0);
  if (ausentes.length) throw new Error(`manifesto sem duração válida para: ${[...new Set(ausentes)].join(', ')}`);

  const cargas = Array.from({ length: total }, () => 0);
  const atribuicoes = new Array(passos.length);
  const ordem = passos.map((passo, indice) => ({ passo, indice }))
    .sort((a, b) => duracoes[b.passo] - duracoes[a.passo] || a.indice - b.indice);
  for (const { passo, indice } of ordem) {
    let destino = 0;
    for (let i = 1; i < total; i++) if (cargas[i] < cargas[destino]) destino = i;
    atribuicoes[indice] = destino;
    cargas[destino] += duracoes[passo];
  }
  return Array.from({ length: total }, (_, shard) => passos.filter((_, indice) => atribuicoes[indice] === shard));
}

export function selecionarShard(passos, duracoes, indice, total) {
  if (!Number.isSafeInteger(indice) || indice < 1 || indice > total) {
    throw new Error(`índice de shard deve estar entre 1 e ${total}`);
  }
  return planejarShards(passos, duracoes, total)[indice - 1];
}

export function carregarDuracoes(caminho, { agora = Date.now(), idadeMaximaMs = IDADE_MAXIMA_MANIFESTO_MS } = {}) {
  let manifesto;
  try {
    manifesto = JSON.parse(readFileSync(caminho, 'utf8'));
  } catch (erro) {
    throw new Error(`não foi possível ler manifesto de durações ${caminho}: ${erro.message}`);
  }
  if (!manifesto || manifesto.versao !== 1 || typeof manifesto.geradoEm !== 'string'
    || !manifesto.duracoes || typeof manifesto.duracoes !== 'object' || Array.isArray(manifesto.duracoes)) {
    throw new Error(`manifesto de durações inválido: ${caminho}`);
  }
  const geradoEm = Date.parse(manifesto.geradoEm);
  if (!Number.isFinite(geradoEm)) throw new Error(`manifesto sem geradoEm válido: ${caminho}`);
  const idade = agora - geradoEm;
  if (idade > idadeMaximaMs || idade < -TOLERANCIA_FUTURO_MS) {
    throw new Error(`manifesto de durações velho ou futuro (${manifesto.geradoEm}); rode eval-duration-calibration.yml`);
  }
  const duracoes = {};
  for (const [passo, entrada] of Object.entries(manifesto.duracoes)) {
    if (!entrada || !Number.isFinite(entrada.segundos) || entrada.segundos <= 0
      || !Number.isSafeInteger(entrada.amostras) || entrada.amostras < 1) {
      throw new Error(`duração inválida para ${passo} em ${caminho}`);
    }
    duracoes[passo] = entrada.segundos;
  }
  if (!Object.keys(duracoes).length) throw new Error(`manifesto de durações vazio: ${caminho}`);
  return duracoes;
}
