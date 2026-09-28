/* formatacao.mjs — helpers de markdown para comentário/issue/PR de bot.
   ─────────────────────────────────────────────────────────────────────────────
   Todo texto que um bot desta casa posta no GitHub passa por aqui. A regra é
   do dono: comentário de bot em markdown tem que ter FORMATAÇÃO BOA — tabela
   alinhada, código com linguagem, citação de evidência, sem fence quebrado.
   Nenhum bot monta markdown na mão com template string solta: aqui é o único
   lugar que sabe como o GitHub renderiza. */

const escCelula = (v) => String(v ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');

/* Tabela com colunas PADeadas à largura máxima: em texto puro ela fica
 * alinhada como tabela de verdade (o render do GitHub é o mesmo, mas o
 * comentário também é lido cru em e-mail e diff). */
export function tabela({ colunas, linhas, alinhamentos = [] }) {
  const cel = (v, w, alinha) => {
    const s = escCelula(v);
    const pad = Math.max(0, w - s.length);
    if (alinha === '>') return ' '.repeat(pad) + s;
    if (alinha === '^') return ' '.repeat(Math.floor(pad / 2)) + s + ' '.repeat(Math.ceil(pad / 2));
    return s + ' '.repeat(pad);
  };
  const larguras = colunas.map((c, i) =>
    Math.max(escCelula(c).length, ...linhas.map((l) => escCelula(l[i] ?? '').length)));
  const mark = (i) => {
    const a = alinhamentos[i];
    const w = Math.max(3, larguras[i]);
    if (a === '>') return ' '.repeat(0) + '-'.repeat(w - 1) + ':';
    if (a === '^') return ':' + '-'.repeat(w - 2) + ':';
    return ':' + '-'.repeat(w - 1);
  };
  const cab = `| ${colunas.map((c, i) => cel(c, larguras[i])).join(' | ')} |`;
  const sep = `| ${colunas.map((_, i) => mark(i)).join(' | ')} |`;
  const corpo = linhas.map((l) => `| ${l.map((v, i) => cel(v, larguras[i], alinhamentos[i])).join(' | ')} |`).join('\n');
  return [cab, sep, corpo].join('\n');
}

export function codigo(conteudo, lang = '') {
  const fence = '```' + lang;
  const c = String(conteudo ?? '');
  const clos = c.includes('```') ? '````' : '```';
  return `${fence}\n${c}\n${clos === '````' ? '````' : '```'}`;
}

export const citacao = (texto) =>
  String(texto ?? '').split('\n').map((l) => `> ${l}`.trimEnd()).join('\n');

export const detalhes = (sumario, corpo) =>
  `<details>\n<summary>${sumario}</summary>\n\n${corpo}\n\n</details>`;

export const secao = (titulo, nivel = 2) => `${'#'.repeat(Math.min(nivel, 6))} ${titulo}`;

export const lista = (itens) => itens.map((i) => `- ${i}`).join('\n');

export const mono = (t) => `\`${String(t ?? '')}\``;

/* Caixa de alerta do GitHub (render colorido nativo em PR/issue): nota=dentro
 * de linha, dica=verde, atencao=amarelo, perigo=vermelho, importante=roxo. */
const TIPOS_ALERTA = { nota: '[!NOTE]', dica: '[!TIP]', atencao: '[!WARNING]', perigo: '[!CAUTION]', importante: '[!IMPORTANT]' };
export function alerta(tipo, texto) {
  const tag = TIPOS_ALERTA[tipo] || TIPOS_ALERTA.nota;
  return [`> ${tag}`, ...String(texto ?? '').split('\n').map((l) => `> ${l}`.trimEnd())].join('\n');
}

/* Grafo mermaid: o GitHub renderiza em comentário de PR/issue. Arestas
 * de→para ("main.js importa game.js" vira main.js --> game.js). Id sem ponto. */
export function grafoMermaid(arestas, { direcao = 'RL' } = {}) {
  const id = (s) => String(s).replace(/[^a-zA-Z0-9_]/g, '_');
  const linhas = arestas.slice(0, 10).map((a) => `  ${id(a.de)}["${a.de}"] --> ${id(a.para)}["${a.para}"]`);
  return ['```mermaid', `graph ${direcao}`, ...linhas, '```'].join('\n');
}

/* Barra de nota em 10 casas — legível em texto puro E renderizado. */
export function barra(nota, total = 10) {
  const n = Math.max(0, Math.min(total, Math.round(Number(nota) || 0)));
  return '▓'.repeat(n) + '░'.repeat(total - n);
}

/* Lista de tarefas (- [ ] / - [x]) pra checklists de review. */
export const checklist = (itens) =>
  itens.map((i) => `- [${i.feito ? 'x' : ' '}] ${i.texto}`).join('\n');

export function chaveValor(pares) {
  return lista(pares.map(([k, v]) => `**${k}:** ${v}`));
}

/* Duração humana pro rodapé de relatório: "há 3 dias", "há 2 h". */
export function haQuanto(iso, agora = Date.now()) {
  const ms = agora - new Date(iso).getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  return `há ${d} dia${d > 1 ? 's' : ''}`;
}
