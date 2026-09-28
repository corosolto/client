/* Teste offline do cenografo: cobertura, seleção por piso, orçamento de tinta,
   registro no bloco or-* e PR com antes/depois. */
import { parseCobertura, selecionaMapas, orcamento, entradaDecal, registraNoTextures, dimsPng, corpoPR } from '../pichacao.mjs';
import { carregarPersona } from '../../lib/persona.mjs';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/* import.meta.dir é API do Bun; o runner geral (bots/testar.mjs) roda node. */
function dir0() { return join(dirname(fileURLToPath(import.meta.url)), '..'); }
const CFG = JSON.parse(readFileSync(join(dir0(), 'config.json'), 'utf8'));

export async function testar(t, { dir }) {
  const persona = carregarPersona(dir);
  const cfg = JSON.parse(readFileSync(join(dir, 'config.json'), 'utf8'));

  const cob = parseCobertura({
    quebrada: { placas: 1000, pintadas: 600 },
    piscina_treta: { placas: 500, pintadas: 400 },
    ferro_velho: { placas: 200, pintadas: 92 },
  });
  t.igual(cob.quebrada.cobertura, 60, 'cobertura = pintadas/placas arredondada');
  t.igual(cob.piscina_treta.cobertura, 80, 'piscina 80%');
  t.igual(cob.ferro_velho.cobertura, 46, 'ferro velho 46%');

  const alvo = selecionaMapas(cob, cfg.pisos);
  t.ok(alvo.length === 1 && alvo[0].mapa === 'quebrada', 'só a quebrada (60 < piso 67) está abaixo');
  t.igual(alvo[0].piso, cfg.pisos.quebrada, 'piso do config vem junto pro relatório');
  const todosNoPiso = selecionaMapas({ quebrada: { cobertura: 90 }, piscina_treta: { cobertura: 90 } }, cfg.pisos);
  t.igual(todosNoPiso.length, 0, 'mapa no piso não é selecionado');

  const cabe = orcamento({ jaNaSemana: 0, jaNaRodada: 0, pedidas: cfg.max_por_rodada });
  t.ok(cabe.cabe, 'orçamento cheio cabe a rodada inteira');
  const estourou = orcamento({ jaNaSemana: cfg.max_por_semana - 1, jaNaRodada: 0, pedidas: 3 });
  t.ok(!estourou.cabe && estourou.vagas === 1, 'semana quase cheia deixa só o que resta de tinta');
  const rodadaCheia = orcamento({ jaNaSemana: 0, jaNaRodada: cfg.max_por_rodada, pedidas: 1 });
  t.igual(rodadaCheia.vagas, 0, 'teto por rodada é duro');

  const entrada = entradaDecal('or-graf-nova.png', { w: 512, h: 256 });
  t.contem(entrada, "['or-graf-nova.png', 2.000, 'peca', 0]", 'entrada no formato do bloco or-* (aspecto, tipo, flag)');
  const tex = readFileSync(join(dir, '..', '..', 'public', 'js', 'textures.js'), 'utf8');
  const tex2 = registraNoTextures(tex, [entrada]);
  t.ok(tex2.includes('DECAL_FILES.push(\n' + entrada), 'entrada entra grudada no bloco or-* real do textures.js');
  t.ok(tex2.split('DECAL_FILES.push').length === tex.split('DECAL_FILES.push').length, 'nenhum bloco novo criado');

  const png = Buffer.alloc(32);
  png.writeUInt32BE(0x89504e47, 0); png.writeUInt32BE(13, 4); png.write('IHDR', 8, 'ascii');
  png.writeUInt32BE(512, 16); png.writeUInt32BE(256, 20);
  const dims = dimsPng(png);
  t.ok(dims && dims.w === 512 && dims.h === 256, 'dimsPng lê o IHDR sem dependência');

  const corpo = corpoPR({
    geradas: [{ nome: 'or-graf-s33-01', w: 512, h: 512, prompt: 'pixação abstrata de letras bolha, tinta spray' }],
    antes: { quebrada: 60, ferro_velho: 46 },
    depois: { quebrada: 68, ferro_velho: 46 },
  });
  t.contem(corpo, `**${persona.nome}**`, 'PR abre com cartão da persona');
  t.ok(/^\| quebrada\s*\| 60%\s*\| 68%\s*\|$/m.test(corpo), 'tabela antes/depois no corpo');
  t.ok(/^\| ferro_velho\s*\| 46%\s*\| 46%\s*\|$/m.test(corpo), 'mapa estável também aparece');
  t.contem(corpo, 'or-graf-s33-01', 'peça gerada listada');
  t.ok(persona.bordoes.some((b) => corpo.includes(`— *${b}`)), 'PR fecha com bordão');
  t.contem(corpo, 'régua é quem decidiu', 'PR declara que a régua decidiu');
  void CFG;
}
