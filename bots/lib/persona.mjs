/* persona.mjs — a voz dos bots da casa, implementada UMA vez.
   ─────────────────────────────────────────────────────────────────────────────
   Cada bot tem persona.json no seu diretório (personagem do jogo, avatar, tom,
   bordões). Este módulo carrega e devolve as três peças que todo comentário,
   issue e PR usam: cabecalho() (avatar + nome + papel), instrucaoDeTom() (o
   bloco que vai no prompt do LLM) e assinatura() (fechamento com bordão).

   REGRA DURA (PERSONAS.md): persona é tempero, não prato. Evidência,
   arquivo:linha e veredito permanecem técnicos, claros e verificáveis; a voz
   entra na abertura, no fechamento e nos bordões. Review incompreensível por
   causa de lore é bug. */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const CAMPOS = ['personagem', 'nome', 'papel', 'avatar_url', 'tom', 'bordoes', 'emoji'];

export function carregarPersona(dirBot) {
  const p = JSON.parse(readFileSync(join(dirBot, 'persona.json'), 'utf8'));
  const faltam = CAMPOS.filter((c) => p[c] === undefined);
  if (faltam.length) throw new Error(`persona.json sem os campos: ${faltam.join(', ')}`);
  if (!Array.isArray(p.bordoes) || !p.bordoes.length) throw new Error('persona.json: bordoes[] vazio');
  return p;
}

/* Avatar + identidade, o cartão de visita que abre toda mensagem. GitHub
 * renderiza <img> com width/height de raw.githubusercontent (camo) — é o
 * padrão dos bots oficiais de deploy. */
export function cabecalho(p) {
  return [
    `<img src="${p.avatar_url}" width="48" height="48" alt="${p.nome}">`,
    '',
    `**${p.nome}** · *${p.papel}* · ${p.emoji}`,
  ].join('\n');
}

/* Bloco injetado no prompt do LLM. Não é opcional: sem isto cada modelo
 * reinventa a voz e o bot vira outro a cada rodada. */
export function instrucaoDeTom(p) {
  const bordoes = p.bordoes.map((b) => `- ${b}`).join('\n');
  return `PERSONA (tempero, não prato): você fala como ${p.nome}, ${p.papel} — ${p.tom}.
A voz entra na abertura e no fechamento, com NO MÁXIMO um destes bordões no texto todo:
${bordoes}
O resto é técnico e inequívoco: evidência com arquivo:linha, veredito claro, sem lore
no lugar da análise. Texto incompreensível por causa de persona é bug.`;
}

/* Fechamento: bordão rotativo + trilha do personagem. */
export function assinatura(p, { seed = Math.random() } = {}) {
  const bordao = p.bordoes[Math.floor(seed * p.bordoes.length) % p.bordoes.length];
  return `— *${bordao}* ${p.emoji}`;
}

/* Corpo completo já montado: cabeçalho + miolo + assinatura. O miolo vem
 * formatado do bot (helpers de formatacao.mjs). */
export function mensagem(p, miolo, { bordaoSeed } = {}) {
  return `${cabecalho(p)}\n\n${miolo.trim()}\n\n---\n${assinatura(p, { seed: bordaoSeed })}`;
}
