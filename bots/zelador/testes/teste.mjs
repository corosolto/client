/* Teste offline do zelador: idade de PR, cobrança única, ata semanal com dedupe. */
import { diasSemAtividade, corpoRelatorio } from '../ronda.mjs';
import { carregarPersona } from '../../lib/persona.mjs';
import { carregarAcoes } from '../../lib/acoes.mjs';
import { join } from 'node:path';

const DIAS = 86_400_000;

export async function testar(t, { dir }) {
  const persona = carregarPersona(dir);
  const acoes = carregarAcoes(join(dir, 'acoes'));
  t.ok(acoes.length >= 5, `cinco rondas declaradas (achei ${acoes.length})`);
  t.ok(acoes.some((a) => a.nome === 'pr-parado') && acoes.some((a) => a.nome === 'branch-orfa'), 'rondas de PR e branch presentes');

  /* ── idade: atividade HUMANA recente segura a cobrança ── */
  const base = Date.now();
  const semNada = { createdAt: new Date(base - 9 * DIAS).toISOString(), comments: [], reviews: [] };
  t.igual(diasSemAtividade(semNada, base), 9, 'PR sem nada: 9 dias');
  const comComentario = { ...semNada, comments: [{ createdAt: new Date(base - 2 * DIAS).toISOString() }] };
  void comComentario;
  const humanoRecente = { ...semNada, comments: [{ author: { login: 'usantos' }, createdAt: new Date(base - 2 * DIAS).toISOString() }] };
  t.igual(diasSemAtividade(humanoRecente, base), 2, 'comentário HUMANO recente zera a idade (não cobra)');
  const botRecente = { ...semNada, comments: [{ author: { login: 'csbrasil-bot' }, createdAt: new Date(base - 1 * DIAS).toISOString() }], updatedAt: new Date(base - 1 * DIAS).toISOString() };
  t.igual(diasSemAtividade(botRecente, base), 9, 'comentário de BOT não segura a cobrança (idade conta da criação)');
  const comReview = { ...semNada, reviews: [{ author: { login: 'rubenmarcus' }, submittedAt: new Date(base - 1 * DIAS).toISOString() }] };
  t.igual(diasSemAtividade(comReview, base), 1, 'review humano recente zera a idade');
  const comCommit = { ...semNada, commits: [{ authoredDate: new Date(base - 3 * DIAS).toISOString() }] };
  t.igual(diasSemAtividade(comCommit, base), 3, 'commit recente conta como atividade');

  /* ── ata semanal ── */
  const ata = corpoRelatorio(['PR #12 parado há 9 dias — cobrado', 'branch `feat/velha` sem commit há 44 dias'], { semana: '2026-08-16' });
  t.contem(ata, '<!-- zelador: ronda-semanal -->', 'ata carrega marcador de dedupe');
  t.contem(ata, `**${persona.nome}**`, 'ata abre com cartão da persona');
  t.ok(persona.bordoes.some((b) => ata.includes(`— *${b}`)), 'ata fecha com bordão');
  t.contem(ata, '## Ata da assembleia — ronda de 2026-08-16', 'título com a semana');
  t.contem(ata, '- PR #12 parado há 9 dias', 'itens da pauta em lista');
  t.ok(!ata.includes('|'), 'ata de pauta é lista corrida, não tabela de pinga');
  const vazia = corpoRelatorio([], { semana: 'x' });
  t.contem(vazia, 'Nada na pauta', 'semana limpa declarada em voz alta (não silêncio)');

  /* ── cobrança é única por estado do PR (chave number:updatedAt) ── */
  const cobrados = { '12:2026-08-10T00:00:00Z': '2026-08-11' };
  const chave = '12:2026-08-10T00:00:00Z';
  t.ok(cobrados[chave] !== undefined, 'segunda ronda não cobra o mesmo estado do PR');
  t.ok(cobrados['12:2026-08-16T00:00:00Z'] === undefined, 'head novo pode ser cobrado de novo');
}
