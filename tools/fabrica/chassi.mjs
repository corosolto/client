#!/usr/bin/env node
// Extrai a ficha de um chassi do pack: zona de contato, âncoras da zona livre,
// linha de visada (AimPoint do prefab), settings e clipes → tools/fabrica/chassis/<nome>.json.
// Uso: node tools/fabrica/chassi.mjs AK [MX16A4 …] | --todos
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { CHASSIS_PACK } from './lib/chassis-pack.mjs';
import { RAIZ_REPO, gravarJson, lerJson, rodarBlender, sha256 } from './lib/comum.mjs';
import { PACK_RAIZ, clipesDoPack, lerCameraDoPlayer, lerPrefab, lerSettings, texturasDosMateriais } from './lib/pack.mjs';

const nomes = process.argv.includes('--todos') ? Object.keys(CHASSIS_PACK) : process.argv.slice(2);
if (!nomes.length) throw new Error('uso: node tools/fabrica/chassi.mjs <CHASSI…> | --todos');

const r3 = (v) => v.map((x) => Math.round(x * 1000) / 1000);

for (const nome of nomes) {
  const def = CHASSIS_PACK[nome];
  if (!def) throw new Error(`chassi desconhecido: ${nome}`);
  const pasta = path.join(PACK_RAIZ, 'Animations', nome);
  const armaFbx = path.join(pasta, def.armaFbx);
  const poseFbx = path.join(pasta, def.poseFbx);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `fabrica-chassi-${nome}-`));
  const entrada = path.join(tmp, 'entrada.json');
  const medida = path.join(tmp, 'medida.json');
  gravarJson(entrada, { personagem: path.join(PACK_RAIZ, 'Character'), armaFbx, poseFbx });
  rodarBlender(path.join(RAIZ_REPO, 'tools/fabrica/blender/chassi.py'), [entrada, medida], { marcador: 'FABRICA_CHASSI=' });
  const geo = lerJson(medida);

  const prefab = lerPrefab(def.prefab);
  const [ux, uy, uz] = prefab.aimPoint;
  // Unity (x direita, y cima, z frente) → raiz da arma no Blender, em cm, pelos eixos MEDIDOS.
  const f = geo.eixos.frente, c = geo.eixos.cima, d = geo.eixos.direita;
  const miraCm = [0, 1, 2].map((i) => 100 * (ux * d[i] + uy * c[i] + uz * f[i]));
  const topoNaMira = geo.estatico.max[2];
  const clipes = clipesDoPack(nome);
  const settings = lerSettings(def.settings);
  const pastaMateriais = path.join(pasta, 'Weapon/Materials_URP');

  const saida = {
    schemaVersion: 1,
    nome,
    tipo: def.tipo,
    nota: def.nota || null,
    fonte: {
      pacote: 'fpsanimationpack_ultimate.unitypackage (KINEMATION FPS Animation Pack, licença paga, distribuição web autorizada pelo dono)',
      armaFbx: path.relative(PACK_RAIZ, armaFbx),
      poseFbx: path.relative(PACK_RAIZ, poseFbx),
      armaSha256: sha256(armaFbx),
      poseSha256: sha256(poseFbx),
      prefab: path.relative(PACK_RAIZ, prefab.arquivo),
    },
    unidade: geo.unidade,
    eixos: geo.eixos,
    mira: {
      aimPointUnity: prefab.aimPoint,
      raizCm: r3(miraCm),
      conferencia: `altura da mira ${r3([miraCm[2]])[0]} cm × topo estático ${topoNaMira} cm`,
    },
    settings,
    camera: lerCameraDoPlayer(),
    geral: geo.geral,
    zonaContato: geo.zonaContato,
    ancoras: geo.ancoras,
    ossosArma: geo.ossosArma,
    clipes: clipes.clipes,
    arquivosPersonagem: clipes.personagem,
    arquivosArma: clipes.arma,
    materiais: {
      pasta: path.relative(PACK_RAIZ, pastaMateriais),
      texturas: Object.fromEntries(Object.entries(texturasDosMateriais(pastaMateriais))
        .map(([g, p]) => [g, path.relative(PACK_RAIZ, p)])),
    },
  };
  const destino = path.join(RAIZ_REPO, 'tools/fabrica/chassis', `${nome}.json`);
  gravarJson(destino, saida);
  console.log(`chassi ${nome}: ${path.relative(RAIZ_REPO, destino)} · ossos ${geo.ossosArma.join(',')} · mira ${saida.mira.conferencia}`);
  fs.rmSync(tmp, { recursive: true, force: true });
}
