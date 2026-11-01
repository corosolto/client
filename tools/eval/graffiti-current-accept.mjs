// Avaliador puro do contrato ATUAL de grafite para o adaptador CI: o ego (graffiti-current-browser-check.mjs) é intocável, então a tabela de mutantes e o MUTADOR são EXTRAÍDOS do fonte dele — paridade provada no --prova, declarada em docs/visual-consistency/GRAFITE-CI-ATUAL.md.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { predicadoVerde } from './graffiti-current-browser-check.mjs';

export { predicadoVerde };

const EGO_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), 'graffiti-current-browser-check.mjs');

// Duplicação declarada da verdeSem do ego (main não exporta): o --prova compara as
// duas função a função sobre bateria exaustiva de resumos.
export function verdeSem(r, excecao) {
  const cls = ['duplicates', 'outside', 'unsupported', 'unknown', 'divergent'];
  return cls.every(c => c === excecao ? r[c] > 0 : r[c] === 0) && !(r.overlayPieces === 0 && r.arteEsperada);
}

// Mutantes de zona (Ferro casa B / Piscina branco): efeito acoplado pelo produto,
// outside===1 E unsupported===1 com as demais zero.
export const MUTANTES_ZONA = ['ferro-fora-b', 'piscina-azul'];

export function carregarDoEgo(fonte = readFileSync(EGO_PATH, 'utf8')) {
  const arr = (nome) => {
    const i = fonte.indexOf('const ' + nome + ' = [');
    if (i < 0) throw Error(nome + ' ausente no fonte do ego');
    return vm.runInNewContext(fonte.slice(i + ('const ' + nome + ' = ').length, fonte.indexOf('];', i) + 1));
  };
  const MAPAS = arr('MAPAS'), MANUAIS = arr('MANUAIS');
  const mi = fonte.indexOf('const MUTANTES = {');
  const mj = fonte.indexOf('\n};', mi);
  if (mi < 0 || mj < 0) throw Error('tabela MUTANTES ausente no fonte do ego');
  const MUTANTES = vm.runInNewContext('(' + fonte.slice(mi + 'const MUTANTES = '.length, mj + 2) + ')', { MAPAS, MANUAIS });
  const di = fonte.indexOf('const MUTADOR = `');
  const dj = fonte.indexOf('`;', di);
  if (di < 0 || dj < 0) throw Error('MUTADOR ausente no fonte do ego');
  const mutador = fonte.slice(di + 'const MUTADOR = `'.length, dj);
  const vs = fonte.match(/function verdeSem\(r, excecao\) \{[\s\S]*?\n\}/);
  if (!vs) throw Error('verdeSem ausente no fonte do ego');
  return { MAPAS, MANUAIS, MUTANTES, mutador, verdeSemEgo: vm.runInNewContext('(' + vs[0] + ')') };
}

// Mesma escada de aceite do main do ego: nominal verde antes; mutante exige a
// cláusula-alvo e as demais zeradas; zona exige o par causal exato; controle segue verde.
export function avaliar(r, MUTANTES) {
  const sem = (excecao) => verdeSem(r, excecao);
  if (!r.nominalVerde) return { verde: false, motivo: 'nominal fora do contrato' };
  if (!r.mutante) return { verde: predicadoVerde(r), motivo: 'resumo final fora do contrato (nominal)' };
  const esperado = MUTANTES[r.mutante].clausula;
  const bateu = MUTANTES_ZONA.includes(r.mutante)
    ? r.outside === 1 && r.unsupported === 1 && r.duplicates === 0 && r.unknown === 0 && r.divergent === 0 && r.overlayPieces > 0
    : !esperado ? sem(null)
    : esperado === 'duplicates' ? (r.duplicates > 0 && sem('duplicates'))
    : esperado === 'outside' ? (r.outside > 0 && sem('outside'))
    : esperado === 'unsupported' ? (r.unsupported > 0 && sem('unsupported'))
    : r.mutante === 'wireframe' ? Object.keys(r.unknownMotivos).length === 2
      && r.unknownMotivos.wireframe > 0 && r.unknownMotivos['nao-medido'] === r.unknownMotivos.wireframe
      && r.unknown === 2 * r.unknownMotivos.wireframe && sem('unknown')
    : r.unknown > 0 && Object.keys(r.unknownMotivos).length === 1
      && r.unknownMotivos[esperado.slice('unknown:'.length)] === r.unknown && sem('unknown');
  return { verde: !!bateu, motivo: r.id + '(' + r.mutante + ')' };
}

// Protocolo estrito do veredito (P2-1/R4 do ego), agora função pura: retorna a lista
// de violações de infra — lista vazia é evidência válida.
export function validarResumo(r, { pedidos, mutante }) {
  const e = [];
  const infra = (m) => e.push(m);
  if (!r || typeof r !== 'object' || Array.isArray(r)) { infra('item de mapa não é objeto'); return e; }
  if (!pedidos.includes(r.id)) infra(`mapa inesperado na resposta: ${r.id}`);
  if (r.mutante !== mutante) infra(`mutante ecoado (${r.mutante}) difere do pedido (${mutante}) em ${r.id}`);
  if (r.actualMap !== r.id) infra(`actualMap (${r.actualMap}) difere do id pedido (${r.id})`);
  if (typeof r.nominalVerde !== 'boolean') infra(`nominalVerde ausente/não-boolean em ${r.id}`);
  if (typeof r.arteEsperada !== 'boolean') infra(`arteEsperada ausente/não-boolean em ${r.id}`);
  if (r.invalidado !== undefined && typeof r.invalidado !== 'boolean') infra(`invalidado não-boolean em ${r.id}`);
  if (!Array.isArray(r.erros) || r.erros.some((x) => typeof x !== 'string')) infra(`erros ausente/não-array-de-strings em ${r.id}`);
  const inteiroNaoNeg = (v) => Number.isInteger(v) && v >= 0;
  for (const c of ['overlayPieces', 'duplicates', 'outside', 'unsupported', 'unknown', 'divergent'])
    if (!inteiroNaoNeg(r[c])) infra(`campo ${c} ausente/não inteiro >=0 em ${r.id}`);
  if (!Array.isArray(r.unknownAmostra) || r.unknownAmostra.some((x) => typeof x !== 'string')) infra(`unknownAmostra ausente/não-array-de-strings em ${r.id}`);
  const motivosOk = (o, n, rotulo) => !o || typeof o !== 'object' || Array.isArray(o)
    || Object.entries(o).some(([k, v]) => !k || !Number.isInteger(v) || v <= 0)
    || Object.values(o).reduce((a, b) => a + b, 0) !== n ? rotulo : null;
  if (motivosOk(r.unknownMotivos, r.unknown, `unknownMotivos incoerente em ${r.id}`)) infra(motivosOk(r.unknownMotivos, r.unknown, `unknownMotivos incoerente em ${r.id}`));
  if (!r.nominal || typeof r.nominal !== 'object') infra(`resumo nominal ausente em ${r.id}`);
  else {
    for (const c of ['duplicates', 'outside', 'unsupported', 'unknown', 'divergent', 'overlayPieces'])
      if (!inteiroNaoNeg(r.nominal[c])) infra(`nominal.${c} ausente/não inteiro >=0 em ${r.id}`);
    if (typeof r.nominal.arteEsperada !== 'boolean') infra(`nominal.arteEsperada ausente/não-boolean em ${r.id}`);
    if (motivosOk(r.nominal.unknownMotivos, r.nominal.unknown, `unknownMotivos incoerente em ${r.id}:nominal`)) infra(motivosOk(r.nominal.unknownMotivos, r.nominal.unknown, `unknownMotivos incoerente em ${r.id}:nominal`));
    if (predicadoVerde(r.nominal) !== r.nominalVerde) infra(`nominalVerde (${r.nominalVerde}) contradiz os contadores nominais em ${r.id}`);
  }
  return e;
}

function resumoValido(MAPAS) {
  return { id: MAPAS[0], mutante: '', actualMap: MAPAS[0], overlayPieces: 4, unclassifiedOccurrences: 0,
    unique: 4, duplicates: 0, outside: 0, unsupported: 0, unknown: 0, divergent: 0,
    unknownAmostra: [], unknownMotivos: {}, arteEsperada: true, silencioOk: true,
    erros: [], invalidado: false, nominalVerde: true,
    nominal: { duplicates: 0, outside: 0, unsupported: 0, unknown: 0, unknownMotivos: {}, divergent: 0, overlayPieces: 4, arteEsperada: true } };
}

/* `node tools/eval/graffiti-current-accept.mjs --prova` — fronteira sem browser, sem
   BASE, sem Chromium: paridade com o ego e contraprovas válidas + incoerentes. */
export function prova() {
  const { MAPAS, MUTANTES, verdeSemEgo } = carregarDoEgo();
  let falhas = 0;
  const check = (nome, cond) => { if (!cond) { falhas++; console.error('FALHOU: ' + nome); } };
  check('14 mapas do ego carregados', MAPAS.length === 14);

  // Paridade verdeSem: bateria exaustiva de contadores × exceções.
  let combos = 0;
  for (const dup of [0, 1]) for (const fora of [0, 1]) for (const sup of [0, 1])
    for (const unk of [0, 1]) for (const div of [0, 1]) for (const zero of [false, true])
      for (const esp of [false, true]) for (const exc of [null, 'duplicates', 'outside', 'unsupported', 'unknown', 'divergent']) {
        const r = { duplicates: dup, outside: fora, unsupported: sup, unknown: unk, divergent: div,
          overlayPieces: zero ? 0 : 3, arteEsperada: esp };
        if (verdeSem(r, exc) !== verdeSemEgo(r, exc)) { falhas++; console.error(`FALHOU: paridade verdeSem ${JSON.stringify(r)} exc=${exc}`); }
        combos++;
      }
  check('paridade verdeSem sobre ' + combos + ' combinações', true);

  // Escada de aceite: payload válido por mutante passa; corrupções exatas reprovam.
  const valido = (over) => ({ ...resumoValido(MAPAS), mutante: '', ...over, nominal: resumoValido(MAPAS).nominal });
  const casos = [
    ['nominal verde', avaliar(valido({ mutante: '' }), MUTANTES).verde],
    ['nominal vermelho é semântico', !avaliar(valido({ mutante: '', duplicates: 1 }), MUTANTES).verde],
    ['nominalVerde falso bloqueia mutante', !avaliar(valido({ mutante: 'duplicada', duplicates: 1, nominalVerde: false }), MUTANTES).verde],
    ['duplicada bate', avaliar(valido({ mutante: 'duplicada', duplicates: 2 }), MUTANTES).verde],
    ['duplicada sem a cláusula reprova', !avaliar(valido({ mutante: 'duplicada' }), MUTANTES).verde],
    ['duplicada com cláusula extra reprova', !avaliar(valido({ mutante: 'duplicada', duplicates: 1, outside: 1 }), MUTANTES).verde],
    ['peca-no-ar bate', avaliar(valido({ mutante: 'peca-no-ar', unsupported: 1 }), MUTANTES).verde],
    ['peca-no-ar com outside extra reprova', !avaliar(valido({ mutante: 'peca-no-ar', unsupported: 1, outside: 1 }), MUTANTES).verde],
    ['ferro-fora-b exige par 1/1', avaliar(valido({ mutante: 'ferro-fora-b', outside: 1, unsupported: 1 }), MUTANTES).verde],
    ['ferro-fora-b só outside reprova', !avaliar(valido({ mutante: 'ferro-fora-b', outside: 1 }), MUTANTES).verde],
    ['ferro-fora-b com 2 outside reprova', !avaliar(valido({ mutante: 'ferro-fora-b', outside: 2, unsupported: 1 }), MUTANTES).verde],
    ['piscina-azul exige par 1/1', avaliar(valido({ mutante: 'piscina-azul', outside: 1, unsupported: 1 }), MUTANTES).verde],
    ['piscina-azul com unknown extra reprova', !avaliar(valido({ mutante: 'piscina-azul', outside: 1, unsupported: 1, unknown: 1, unknownMotivos: { 'uv-canal': 1 }, unknownAmostra: ['uv-canal:x'] }), MUTANTES).verde],
    ['wireframe bate com motivos duplos iguais', avaliar(valido({ mutante: 'wireframe', unknown: 4, unknownMotivos: { wireframe: 2, 'nao-medido': 2 }, unknownAmostra: ['wireframe:a', 'nao-medido:a'] }), MUTANTES).verde],
    ['wireframe com contagens desiguais reprova', !avaliar(valido({ mutante: 'wireframe', unknown: 3, unknownMotivos: { wireframe: 2, 'nao-medido': 1 }, unknownAmostra: ['wireframe:a'] }), MUTANTES).verde],
    ['wireframe com motivo misto reprova', !avaliar(valido({ mutante: 'wireframe', unknown: 4, unknownMotivos: { wireframe: 2, 'uv-canal': 2 }, unknownAmostra: ['x'] }), MUTANTES).verde],
    ['canal-uv bate com motivo único', avaliar(valido({ mutante: 'canal-uv', unknown: 2, unknownMotivos: { 'uv-canal': 2 }, unknownAmostra: ['uv-canal:a'] }), MUTANTES).verde],
    ['canal-uv com motivo extra reprova', !avaliar(valido({ mutante: 'canal-uv', unknown: 3, unknownMotivos: { 'uv-canal': 2, wireframe: 1 }, unknownAmostra: ['x'] }), MUTANTES).verde],
    ['draw-groups com cláusula suja reprova', !avaliar(valido({ mutante: 'draw-groups', duplicates: 1 }), MUTANTES).verde],
  ];
  for (const [nome, ok] of casos) check(nome, ok);

  // Protocolo: payload válido passa; cada incoerência vira infra.
  const base = resumoValido(MAPAS);
  check('resumo válido sem violações', validarResumo(base, { pedidos: MAPAS, mutante: '' }).length === 0);
  const incoerentes = [
    ['mapa fora do pedido', { id: 'amazonia', actualMap: 'amazonia' }],
    ['actualMap divergente', { actualMap: 'outro' }],
    ['mutante ecoado divergente', { mutante: 'duplicada' }],
    ['nominalVerde não-boolean', { nominalVerde: 1 }],
    ['contador negativo', { duplicates: -1 }],
    ['contador não inteiro', { outside: 1.5 }],
    ['unknownMotivos soma divergente', { unknown: 1, unknownMotivos: { wireframe: 2 } }],
    ['nominal ausente', { nominal: undefined }],
    ['nominalVerde contradiz contadores nominais', { nominal: { ...base.nominal, duplicates: 1 } }],
    ['erros não-array', { erros: 'x' }],
  ];
  for (const [nome, over] of incoerentes)
    check('infra: ' + nome, validarResumo({ ...base, ...over }, { pedidos: MAPAS, mutante: '' }).length > 0);

  // Zona: a lista de mutantes acoplados bate com as cláusulas 'outside' do ego.
  for (const z of MUTANTES_ZONA) check(`zona ${z} existe na tabela do ego`, MUTANTES[z].clausula === 'outside');

  console.log(falhas ? `PROVA VERMELHA — ${falhas} verificação(ões)` : `PROVA VERDE — paridade ego/CI + ${casos.length} cláusulas + ${incoerentes.length} contraprovas`);
  return falhas === 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) && process.argv.includes('--prova')) {
  process.exit(prova() ? 0 : 1);
}
