/* Teste offline do cronista: agrupamento por área/Agent, CHANGELOG seco,
   digests com persona — com git log sintético (trailers variados, sem trailer). */
import { parseCommits, comTrailers, agrupar, secaoChangelog, corpoPR, digestDiscord, digestTelegram } from '../cronica.mjs';
import { carregarPersona } from '../../lib/persona.mjs';

export async function testar(t, { dir }) {
  const persona = carregarPersona(dir);

  const H = (c) => c.repeat(40);
  const logFormato = [
    `${H('a')}\tfeat(mapas): quebrada ganha viaduto`,
    `${H('b')}\tfix(armas): coice do AK dentro do teto`,
    `${H('c')}\tfeat(personagens): skin nova do proerd`,
    `${H('d')}\tchore(ci): workflow consolida`,
    `${H('e')}\tdocs: README atualiza badge`,
  ].join('\n');
  const logArquivos = [
    H('a'), 'public/js/map_quebrada.js', '',
    H('b'), 'public/js/weapons.js', '',
    H('c'), 'public/models/characters/proerd.glb', '',
    H('d'), '.github/workflows/ci.yml', '',
    H('e'), 'README.md', '',
  ].join('\n');
  const corpos = {
    [H('a')]: 'corpo longo\nAgent: GLM Code',
    [H('b')]: 'Agent: humano',
    [H('c')]: 'sem trailer nenhum',
    [H('d')]: 'Agent: Kimi Code',
    [H('e')]: 'Agent: GLM Code',
  };
  const commits = comTrailers(parseCommits(logFormato, logArquivos), corpos);
  t.igual(commits.length, 5, 'cinco commits parseados');
  t.igual(commits[0].arquivos.length, 1, 'arquivo do commit mapeado');

  const grupos = agrupar(commits);
  t.igual(grupos.porArea.get('mapas')?.length, 1, 'commit de mapa na área mapas');
  t.igual(grupos.porArea.get('armas e viewmodel')?.length, 1, 'commit de arma na área armas');
  t.igual(grupos.porArea.get('personagens')?.length, 1, 'commit de personagem na área personagens');
  t.igual(grupos.porArea.get('infra, site e docs')?.length, 2, 'ci + docs na área infra');
  t.igual(grupos.porAgent.get('GLM Code'), 2, 'contagem por Agent');
  t.igual(grupos.porAgent.get('(sem Agent:)'), 1, 'commit sem trailer contabilizado como tal');
  t.igual(grupos.porAgent.get('humano'), 1, 'commit humano contabilizado');

  const sec = secaoChangelog(grupos, { versao: '2.0.0-alpha.133', data: '2026-08-16' });
  t.contem(sec, '## [2.0.0-alpha.133] — 2026-08-16', 'seção com versão e data no formato do arquivo');
  t.contem(sec, '- feat(mapas): quebrada ganha viaduto', 'subject cru preservado');
  t.contem(sec, '### Mapas', 'área como subtítulo');
  t.ok(!sec.includes(persona.nome) && !sec.includes('🎸'), 'CHANGELOG SECO — persona não vaza pro registro');
  t.contem(sec, 'Notas completas do release', 'link de notas no padrão do arquivo');

  const pr = corpoPR(grupos, { desde: 'eee', ate: 'aaa', nCommits: 5 });
  t.contem(pr, `**${persona.nome}**`, 'corpo do PR abre com a persona');
  t.ok(/^\| área\s+/m.test(pr), 'corpo do PR traz tabela de áreas');
  t.ok(persona.bordoes.some((b) => pr.includes(`— *${b}`)), 'corpo do PR fecha com bordão');
  t.contem(pr, '`GLM Code`: 2', 'contagem por agente no corpo');

  const dis = digestDiscord(grupos, { semana: '2026-08-16', personasAtuantes: ['Palhaço Mal revisou 3 PR(s)', 'Esbirro de plantão na produção'] });
  t.contem(dis, '**Quem escreveu**', 'digest cita quem escreveu pelo trailer');
  t.contem(dis, '`(sem Agent:)` ×1', 'digest é honesto sobre commit sem trailer');
  t.contem(dis, 'Palhaço Mal revisou 3 PR(s)', 'lore das personas derivada do estado');
  t.ok(persona.bordoes.some((b) => dis.includes(`— *${b}`)), 'digest Discord com assinatura de persona');

  const tel = digestTelegram(grupos, { semana: '2026-08-16' });
  t.ok(tel.length <= 400, `digest Telegram curto (${tel.length} chars)`);
  t.ok(!/^[#*|]/m.test(tel), 'digest Telegram é plain text');
  t.contem(tel, 'CORO SOLTO — crônica de 2026-08-16', 'digest Telegram identifica o jogo e a semana');
}
