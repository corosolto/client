// Ficha + chassi → plano absoluto que o Blender e o montador de clipes consomem.
import fs from 'node:fs';
import path from 'node:path';

import { EQUIP_GERAL } from './chassis-pack.mjs';
import { RAIZ_REPO, TRABALHO, lerJson, sha256 } from './comum.mjs';
import { PACK_RAIZ } from './pack.mjs';

export const CLIPES_DO_JOGO = ['idle', 'shoot', 'equip_rifle', 'reload_tactical', 'reload_empty',
  'reload_start', 'reload_loop', 'reload_end', 'pump', 'pump_empty', 'inspect', 'ads'];

export function lerChassi(nome) {
  const arquivo = path.join(RAIZ_REPO, 'tools/fabrica/chassis', `${nome}.json`);
  if (!fs.existsSync(arquivo)) throw new Error(`chassi ${nome} sem ficha: rode node tools/fabrica/chassi.mjs ${nome}`);
  return lerJson(arquivo);
}

// Valor de um clipe na ficha: "pack:<nome do pack>" | "geral:rifle_equip" | "procedural" | "ausente".
export function resolverClipes(ficha, chassi) {
  const padrao = {};
  for (const nome of Object.keys(chassi.clipes)) if (CLIPES_DO_JOGO.includes(nome)) padrao[nome] = `pack:${nome}`;
  if (!padrao.shoot) padrao.shoot = 'procedural';
  if (EQUIP_GERAL[chassi.tipo]) padrao.equip_rifle = 'geral:rifle_equip';
  const pedido = { ...padrao, ...(ficha.clipes || {}) };
  const saida = { idle: { tipo: 'pack', braco: chassi.fonte.poseFbx } };
  for (const [nome, valor] of Object.entries(pedido)) {
    if (nome === 'idle') continue;
    if (!CLIPES_DO_JOGO.includes(nome)) throw new Error(`clipe desconhecido na ficha: ${nome}`);
    const [tipo, ref] = String(valor).split(':');
    if (tipo === 'pack') {
      const fonte = chassi.clipes[ref];
      if (!fonte) throw new Error(`${chassi.nome} não tem clipe ${ref} no pack`);
      saida[nome] = { tipo, ref, braco: fonte.braco, arma: fonte.arma };
    } else if (tipo === 'geral') {
      const equip = EQUIP_GERAL[chassi.tipo];
      if (!equip) throw new Error(`${chassi.tipo} não tem saque geral no pack`);
      saida[nome] = { tipo, ref, braco: equip, arma: null, geral: true };
    } else if (tipo === 'procedural' || tipo === 'ausente') {
      saida[nome] = { tipo };
    } else throw new Error(`fonte de clipe inválida: ${valor}`);
  }
  return saida;
}

export function montarPlano(fichaArquivo) {
  const ficha = lerJson(fichaArquivo);
  const chassi = lerChassi(ficha.chassi);
  const pasta = path.join(PACK_RAIZ, 'Animations', chassi.nome);
  const skin = lerJson(path.join(RAIZ_REPO, 'tools/fabrica/skins', `braco-${ficha.skinBraco || 'coro-ak'}.json`));
  const skinArma = ficha.skinArma
    ? lerJson(path.join(RAIZ_REPO, 'tools/fabrica/skins', `arma-${ficha.skinArma}.json`)) : null;
  const dir = path.join(TRABALHO, ficha.id);
  const clipes = resolverClipes(ficha, chassi);
  const ancoraDe = (a) => {
    if (typeof a === 'object' && a.pos) return { nome: a.nome || 'livre', ...a };
    const nome = typeof a === 'string' ? a : a.nome;
    const base = chassi.ancoras[nome]?.raizCm || (nome === 'mira' ? chassi.mira.raizCm : null);
    if (!base) throw new Error(`âncora desconhecida no chassi ${chassi.nome}: ${nome}`);
    const d = a.deslocCm || [0, 0, 0];
    return { nome, pos: base.map((v, i) => v + d[i]), rotDeg: a.rotDeg || [0, 0, 0], escala: a.escala ?? 1 };
  };
  const zonaLivre = (ficha.zonaLivre || []).map((p) => ({
    ...p,
    fonte: path.resolve(RAIZ_REPO, p.fonte.replace(/^~\//, `${process.env.HOME}/`)),
    ancora: ancoraDe(p.ancora),
  }));
  const texturasPorGuid = Object.fromEntries(Object.entries(chassi.materiais.texturas)
    .map(([g, p]) => [g, path.join(PACK_RAIZ, p)]));

  const plano = {
    id: ficha.id,
    arma: ficha.arma,
    personagem: path.join(PACK_RAIZ, 'Character'),
    packAnimacoes: path.join(PACK_RAIZ, 'Animations'),
    chassi: {
      nome: chassi.nome,
      pasta,
      armaFbx: path.join(PACK_RAIZ, chassi.fonte.armaFbx),
      poseFbx: path.join(PACK_RAIZ, chassi.fonte.poseFbx),
      pastaMateriais: path.join(PACK_RAIZ, chassi.materiais.pasta),
      texturasPorGuid,
      mira: ficha.mira ? { ...chassi.mira, raizCm: ficha.mira.raizCm, origem: ficha.mira.origem } : chassi.mira,
      eixos: chassi.eixos,
      ancoras: chassi.ancoras,
    },
    camera: { ...chassi.camera, ...(ficha.cameraGlb || {}) },
    skinBraco: skin,
    skinArma,
    zonaLivre,
    removerZonaLivre: ficha.removerZonaLivre || [],
    // Zona de contato do chassi com 1 cm de folga: a remoção de zona livre nunca a toca.
    protecao: [chassi.zonaContato.maoForte.caixa, chassi.zonaContato.maoApoio.caixa,
      ...Object.values(chassi.zonaContato.ossosMoveis)].filter(Boolean)
      .map((c) => ({ min: c.min.map((v) => v - 1), max: c.max.map((v) => v + 1) })),
    clipes,
    saida: { dir },
  };
  const entradas = {
    ficha: fichaArquivo,
    chassi: path.join(RAIZ_REPO, 'tools/fabrica/chassis', `${chassi.nome}.json`),
    skinBraco: path.join(RAIZ_REPO, 'tools/fabrica/skins', `braco-${ficha.skinBraco || 'coro-ak'}.json`),
    armaFbx: plano.chassi.armaFbx,
    poseFbx: plano.chassi.poseFbx,
    personagemFbx: path.join(plano.personagem, 'SK_Arms_Mono.fbx'),
  };
  for (const [nome, c] of Object.entries(clipes)) {
    if (c.braco && nome !== 'idle') entradas[`clipe:${nome}:braco`] = path.join(c.geral ? plano.packAnimacoes : pasta, c.braco);
    if (c.arma) entradas[`clipe:${nome}:arma`] = path.join(pasta, c.arma);
  }
  for (const p of zonaLivre) entradas[`zonaLivre:${p.peca}`] = p.fonte;
  const insumos = Object.fromEntries(Object.entries(entradas).map(([k, f]) => [k, {
    arquivo: f.startsWith(RAIZ_REPO) ? path.relative(RAIZ_REPO, f) : f.replace(process.env.HOME, '~'),
    sha256: sha256(f),
  }]));
  return { ficha, chassi, plano, insumos };
}
