// Leitura do pack KINEMATION extraído (privado): prefab, settings, materiais e clipes.
// O YAML do Unity é lido por regex de propósito: só precisamos de meia dúzia de campos.
import fs from 'node:fs';
import path from 'node:path';

export const PACK_RAIZ = process.env.FABRICA_PACK
  || path.join(process.env.HOME, 'csbrasil-private-assets/sources/kinemation-fpspack/tree/Assets/KINEMATION/FPSAnimationPack');
export const PACOTE = path.join(process.env.HOME, 'Downloads/fpsanimationpack_ultimate.unitypackage');

const vec = (texto) => {
  const m = /\{x: ([-\d.eE]+), y: ([-\d.eE]+), z: ([-\d.eE]+)(?:, w: ([-\d.eE]+))?\}/.exec(texto || '');
  if (!m) return null;
  return m.slice(1).filter((v) => v !== undefined).map(Number);
};

// Blocos `--- !u!<tipo> &<id>` do YAML do Unity, indexados por fileID.
export function blocosUnity(texto) {
  const blocos = new Map();
  const partes = texto.split(/^--- !u!(\d+) &(-?\d+)(?: stripped)?\s*$/m);
  for (let i = 1; i < partes.length; i += 3) blocos.set(partes[i + 1], { tipo: partes[i], corpo: partes[i + 2] });
  return blocos;
}

const campo = (corpo, nome) => new RegExp(`^\\s*${nome}: (.*)$`, 'm').exec(corpo)?.[1];

// AimPoint do prefab: posição local no espaço do weaponBone (o prefab nasce com
// identidade dentro do ik_hand_gun — FPSPlayer.cs, Instantiate(prefab, weaponBone)).
export function lerPrefab(nome) {
  const arquivo = path.join(PACK_RAIZ, 'Prefabs', `${nome}.prefab`);
  const blocos = blocosUnity(fs.readFileSync(arquivo, 'utf8').replace(/\r\n/g, '\n'));
  const nomes = new Map();
  for (const [id, b] of blocos) if (b.tipo === '1') nomes.set(id, campo(b.corpo, 'm_Name'));
  const transforms = new Map();
  for (const [id, b] of blocos) {
    if (b.tipo !== '4') continue;
    const go = /m_GameObject: \{fileID: (-?\d+)\}/.exec(b.corpo)?.[1];
    transforms.set(id, {
      nome: nomes.get(go),
      pos: vec(campo(b.corpo, 'm_LocalPosition')),
      rot: vec(campo(b.corpo, 'm_LocalRotation')),
      pai: /m_Father: \{fileID: (-?\d+)\}/.exec(b.corpo)?.[1],
    });
  }
  const mira = [...transforms.values()].find((t) => t.nome === 'AimPoint');
  if (!mira) throw new Error(`${nome}.prefab sem AimPoint`);
  const raiz = [...transforms.entries()].find(([, t]) => t.pai === '0');
  let viaFbx = null;
  if (mira.pai !== raiz?.[0]) {
    // AimPoint filho da instância do FBX: vale se a instância nasce na raiz com identidade.
    const pai = blocos.get(mira.pai);
    const inst = /m_PrefabInstance: \{fileID: (-?\d+)\}/.exec(pai?.corpo || '')?.[1];
    const corpo = blocos.get(inst)?.corpo || '';
    const paiInst = /m_TransformParent: \{fileID: (-?\d+)\}/.exec(corpo)?.[1];
    const valor = (prop) => {
      const m = new RegExp(`propertyPath: ${prop.replace('.', '\\.')}\\s*\\n\\s*value: ([-\\d.eE]+)`).exec(corpo);
      return m ? Number(m[1]) : null;
    };
    const pose = ['m_LocalPosition.x', 'm_LocalPosition.y', 'm_LocalPosition.z', 'm_LocalRotation.x',
      'm_LocalRotation.y', 'm_LocalRotation.z', 'm_LocalRotation.w'].map(valor);
    const identidade = pose.every((v, i) => v !== null && Math.abs(v - (i === 6 ? 1 : 0)) < 1e-6);
    if (paiInst !== raiz?.[0] || !identidade) {
      throw new Error(`${nome}.prefab: AimPoint fora da raiz e a instância do FBX não está em identidade (${pose})`);
    }
    viaFbx = 'AimPoint filho da raiz do FBX, instanciada na raiz do prefab com identidade';
  }
  // Materiais do renderer da arma por SLOT (o prefab sobrescreve m_Materials.Array.data[i]):
  // o nome do material no FBX (MG6, KSG_Body…) não é o do .mat (M_MGX5_Body…).
  const texto = fs.readFileSync(arquivo, 'utf8').replace(/\r\n/g, '\n');
  const porAlvo = new Map();
  for (const m of texto.matchAll(/target: \{fileID: (-?\d+), guid: [0-9a-f]+,?\s*(?:type: \d+)?\}?\s*\n\s*propertyPath: m_Materials\.Array\.data\[(\d+)\]\s*\n\s*value:\s*\n\s*objectReference: \{fileID: \d+, guid: ([0-9a-f]+)/g)) {
    const [, alvo, slot, guid] = m;
    if (!porAlvo.has(alvo)) porAlvo.set(alvo, []);
    porAlvo.get(alvo)[Number(slot)] = guid;
  }
  const materiaisPorSlot = [...porAlvo.values()].sort((a, b) => b.length - a.length)[0] || [];
  return { arquivo, aimPoint: mira.pos, aimRot: mira.rot, viaFbx, materiaisPorSlot };
}

export function lerSettings(nome) {
  const candidatos = [`${nome}_Settings.asset`, `${nome.replace(/K$/, 'k')}_Settings.asset`];
  const arquivo = candidatos.map((c) => path.join(PACK_RAIZ, 'Settings/Weapons', c)).find((c) => fs.existsSync(c));
  if (!arquivo) return null;
  const t = fs.readFileSync(arquivo, 'utf8');
  const num = (k) => Number(campo(t, k));
  return {
    arquivo,
    ikOffset: vec(campo(t, 'ikOffset')),
    aimPointOffset: vec(campo(t, 'aimPointOffset')),
    adsBlend: num('adsBlend'),
    fireRate: num('fireRate'),
    ammo: num('ammo'),
    aimFov: num('aimFov'),
    fullAuto: num('fullAuto') === 1,
    useFireClip: num('useFireClip') === 1,
  };
}

// Câmera do FPSPlayer.prefab: posição local na raiz do jogador e FOV vertical.
export function lerCameraDoPlayer() {
  const t = fs.readFileSync(path.join(PACK_RAIZ, 'Prefabs/FPSPlayer.prefab'), 'utf8');
  const blocos = blocosUnity(t);
  let camera = null;
  for (const [, b] of blocos) if (b.tipo === '20') camera = b.corpo;
  const goCam = /m_GameObject: \{fileID: (-?\d+)\}/.exec(camera)?.[1];
  const tr = [...blocos.values()].find((b) => b.tipo === '4' && b.corpo.includes(`m_GameObject: {fileID: ${goCam}}`));
  return {
    fonte: 'FPSPlayer.prefab',
    posUnity: vec(campo(tr.corpo, 'm_LocalPosition')),
    fov: Number(campo(camera, 'field of view')),
    eixoFov: Number(campo(camera, 'm_FOVAxisMode')) === 0 ? 'vertical' : 'horizontal',
  };
}

// guid → caminho, pelos .meta da árvore extraída (materiais apontam textura por guid).
let _guids = null;
export function mapaDeGuids() {
  if (_guids) return _guids;
  _guids = new Map();
  const andar = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) andar(p);
      else if (e.name.endsWith('.meta')) {
        const g = /^guid: ([0-9a-f]+)/m.exec(fs.readFileSync(p, 'utf8'))?.[1];
        if (g) _guids.set(g, p.slice(0, -5));
      }
    }
  };
  andar(PACK_RAIZ);
  return _guids;
}

export function texturasDosMateriais(pastaMateriais) {
  const guids = mapaDeGuids();
  const saida = {};
  if (!fs.existsSync(pastaMateriais)) return saida;
  for (const f of fs.readdirSync(pastaMateriais).filter((n) => n.endsWith('.mat'))) {
    const t = fs.readFileSync(path.join(pastaMateriais, f), 'utf8');
    const g = /_BaseMap:\s*\n\s*m_Texture: \{fileID: \d+, guid: ([0-9a-f]+)/.exec(t)?.[1];
    if (g && guids.has(g)) saida[g] = guids.get(g);
  }
  return saida;
}

// Nomes de clipe do jogo ← arquivos do pack (mesmos padrões do assemble_paid_family).
export const PADROES_CLIPE = [
  ['reload_tactical', [/reload[_-]?tac/i, /tac[_-]?reload/i]],
  ['reload_empty', [/reload[_-]?empty/i, /empty[_-]?reload/i]],
  ['reload_start', [/reload[_-]?start/i]],
  ['reload_loop', [/reload[_-]?loop/i]],
  ['reload_end', [/reload[_-]?end/i]],
  ['pump_empty', [/pump[_-]?empty/i]],
  ['pump', [/pump(?![_-]?empty)/i]],
  ['shoot', [/fir(?:e|ing)(?![_-]?empty)/i]],
  ['shoot_empty', [/fire[_-]?empty/i]],
  ['inspect', [/inspect/i]],
];

export function clipesDoPack(fonte) {
  const pasta = path.join(PACK_RAIZ, 'Animations', fonte);
  const lista = (sub) => {
    const dir = path.join(pasta, sub);
    return fs.existsSync(dir) ? fs.readdirSync(dir).filter((n) => /\.fbx$/i.test(n)) : [];
  };
  const personagem = lista('Character');
  const arma = lista('Weapon');
  const achar = (arquivos, testes) => arquivos.find((n) => testes.some((t) => t.test(n))) || null;
  const clipes = {};
  for (const [nome, testes] of PADROES_CLIPE) {
    const c = achar(personagem, testes);
    const w = achar(arma, testes);
    if (c || w) clipes[nome] = { braco: c ? `Character/${c}` : null, arma: w ? `Weapon/${w}` : null };
  }
  return { pasta, personagem, arma, clipes };
}
