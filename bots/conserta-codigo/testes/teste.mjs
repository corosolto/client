/* Teste offline do conserta-codigo: elegibilidade por classe+glob, edição 1:1,
   PR com persona e origem, e as restrições duras. */
import { elegiveis, classeDe, promptDeCorrecao, aplicarEdicoes, corpoPR, origemKey } from '../chave.mjs';
import { carregarAcoes } from '../../lib/acoes.mjs';
import { carregarPersona } from '../../lib/persona.mjs';
import { join } from 'node:path';

export async function testar(t, { dir }) {
  const persona = carregarPersona(dir);
  const acoes = carregarAcoes(join(dir, 'acoes'));
  const classe = new Map(acoes.map((a) => [a.cfg.classe, a]));

  /* ── classe do achado ── */
  t.igual(classeDe({ id: 'TEX1', titulo: 'x', acao: 'mapas' }), 'TEX1', 'vermelha TEX1 do caca-bug mapeia');
  t.igual(classeDe({ titulo: 'número escrito à mão em dois lugares', acao: 'leis-da-casa' }), 'NUM', 'número duplicado pelo título');
  t.igual(classeDe({ titulo: '?v= escrito à mão no import map', acao: 'frontend-publico' }), 'CACHE', 'cache-bust pela ação do estraga');
  t.igual(classeDe({ titulo: 'erro de lógica no round', acao: 'leis-da-casa' }), null, 'defeito semântico NÃO tem classe — não é elegível');

  /* ── elegibilidade: classe + glob ── */
  const achado = { arquivo: 'public/js/map_teste.js', titulo: 'parede clara gigante sem albedo', corpo: 'Box 12m #eeeeee', acao: 'mapas', origem: 'review PR #999' };
  const el = elegiveis([achado], classe);
  t.igual(el.length, 1, 'TEX1 em map_*.js é elegível');
  t.igual(el[0]?.acao?.cfg?.classe, 'TEX1', 'ação certa acoplada ao achado');
  t.igual(elegiveis([{ ...achado, arquivo: 'src/pages/index.astro' }], classe).length, 0, 'arquivo fora do glob NÃO é elegível');
  t.igual(elegiveis([{ ...achado, arquivo: 'public/js/map_teste.js', titulo: 'gosto pessoal' }], classe).length, 0, 'achado sem classe mecânica não passa');

  /* ── edição 1:1 ── */
  const conteudo = 'const a = new THREE.MeshStandardMaterial({ color: 0xeeeeee });\nconst b = 1;\n';
  const { texto, aplicadas } = aplicarEdicoes(conteudo, [
    { antigo: 'new THREE.MeshStandardMaterial({ color: 0xeeeeee })', novo: 'new THREE.MeshStandardMaterial({ color: 0x6b6b6b })' },
    { antigo: 'const b = 1;', novo: 'const b = 2;' },
    { antigo: 'nao existe', novo: 'x' },
    { antigo: 'const b = 1;', novo: 'const b = 3;' },
  ]);
  t.igual(aplicadas.length, 2, 'duas substituições válidas aplicadas');
  t.contem(texto, '0x6b6b6b', 'cor escura aplicada');
  t.contem(texto, 'const b = 2;', 'primeira ocorrência vence');
  const amb = aplicarEdicoes('x x', [{ antigo: 'x', novo: 'y' }]);
  t.igual(amb.aplicadas.length, 0, 'casamento ambíguo (2×) é RECUSADO — 1:1 ou nada');

  /* ── prompt ── */
  const prompt = promptDeCorrecao('a.js', 'conteudo', achado);
  t.contem(prompt, 'parede clara gigante sem albedo', 'prompt carrega o achado de origem');
  t.contem(prompt, '{"substituicoes":', 'contrato JSON de substituições exatas');

  /* ── PR: persona + origem + prova ── */
  const corpo = corpoPR(
    { ...achado, acao: classe.get('TEX1'), aplicadas: [{ antigo: '0xeeeeee', novo: '0x6b6b6b' }] },
    { gate: 'node tools/eval/invariants.mjs', log: '✓ TEX1 verde' },
  );
  t.contem(corpo, `**${persona.nome}**`, 'PR abre com cartão da persona');
  t.contem(corpo, '**Origem:** review PR #999', 'PR cita o achado de origem');
  t.contem(corpo, 'node tools/eval/invariants.mjs', 'PR mostra a régua que provou');
  t.contem(corpo, '✓ TEX1 verde', 'PR mostra a prova verde');
  t.ok(persona.bordoes.some((b) => corpo.includes(`— *${b}`)), 'PR fecha com bordão');
  t.contem(corpo, 'continuam sendo o portão', 'PR declara que não é gate');

  /* ── dedupe de origem estável ── */
  t.igual(origemKey(achado), origemKey({ ...achado, corpo: 'outro corpo' }), 're-rodada não repete PR do mesmo achado');
  t.ok(origemKey({ ...achado, titulo: 'outro título' }) !== origemKey(achado), 'achado novo é chave nova');
}
