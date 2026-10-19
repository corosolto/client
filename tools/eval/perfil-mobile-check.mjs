#!/usr/bin/env node
/* ============================================================================
   perfil-mobile-check.mjs — O PERFIL MOBILE EXISTE, É RASTEIRO E MORDE?
   ----------------------------------------------------------------------------
   O CASO (lane glm/peso, item 4): 20% das amostras de FPS em campo abaixo de 30
   (BUG-157) e nada foi medido em aparelho real. O perfil mobile (pointer:coarse)
   entra num degrau sustentável e cobra teto de textura.

   O QUE MEDE (node puro):
   P1  o degrau inicial do perfil tem o que a lane pediu: DPR ≤0,6,
       sombra 'baixa', sem SSAO, menos folhagem (mato ≤0,5);
   P2  tetoTextura: pointer comum devolve 0 (desktop não mexe); coarse devolve
       min(1024, MAX_TEXTURE_SIZE) — aparelho de 512 fica em 512, teto da lane
       em 1024, sem limite vira 1024;
   P3  perfilInicial: software continua no fundo; coarse entra no degrau do
       perfil; desktop em 0; um degrau já medido volta na sessão seguinte;
   P4  o clampTexturasGL do GLTFLoader vendido reduz imagem acima do teto e NÃO
       toca nada sem a flag (prova funcional com document/canvas falsos);
   P5  a cadência segura 60 FPS na partida e 30 FPS no menu, inclusive quando
       o painel chama requestAnimationFrame a 90 ou 120 Hz;
   P6  o perfil automático é marcado antes de qualquer save genérico e escolhas
       manuais gravam sua própria marca, então ambos sobrevivem a um reload.

   MUTAÇÕES: `teto-frouxo`, `inicio-alto`, `memoria-morta`, `cadencia-solta` e
   `marcador-morto` provam, uma por contrato, que P1, P2, P3, P5 e P6 detectam regressão.

   Uso: node tools/eval/perfil-mobile-check.mjs [--mutante=<nome>]
   ============================================================================ */
import { existsSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '../..');
const mutante = process.argv.find((a) => a.startsWith('--mutante='))?.split('=')[1];
const mutacoes = {
  'teto-frouxo': ['qualidade', 'texturaMax: 1024', 'texturaMax: 4096', 'P2:'],
  'inicio-alto': ['qualidade', 'degrauInicial: 6', 'degrauInicial: 5', 'P1:'],
  'memoria-morta': ['qualidade', '? salvo : PERFIL_MOBILE.degrauInicial', '? PERFIL_MOBILE.degrauInicial : PERFIL_MOBILE.degrauInicial', 'P3:'],
  'cadencia-solta': ['qualidade', 'if (agoraMs + 0.5 < this.proximo) return false;', 'if (agoraMs + 0.5 < this.proximo) return true;', 'P5:'],
  'marcador-morto': ['main', "localStorage.setItem(AUTO_QUALITY_KEY, '1')", 'localStorage.removeItem(AUTO_QUALITY_KEY)', 'P6:'],
};
if (mutante && !mutacoes[mutante]) throw new Error(`mutante desconhecido: ${mutante}`);

// o mesmo shim de three do invariants.mjs: o GLTFLoader vendido importa 'three'
const shim = join(ROOT, 'node_modules/three');
if (!existsSync(join(shim, 'index.js'))) {
  mkdirSync(shim, { recursive: true });
  writeFileSync(join(shim, 'package.json'), JSON.stringify({ name: 'three', version: '0.160.0', type: 'module', main: 'index.js', exports: { '.': './index.js', './addons/*': './addons/*' } }));
  symlinkSync(join(ROOT, 'public/vendor/three.module.js'), join(shim, 'index.js'));
  try { symlinkSync(join(ROOT, 'public/vendor/addons'), join(shim, 'addons'), 'dir'); } catch { /* já existe */ }
}
const origemQualidade = join(ROOT, 'public/js/qualidade-adaptativa.js');
const origemMain = join(ROOT, 'public/js/main.js');
const origens = { qualidade: origemQualidade, main: origemMain };
const especificacao = mutante ? mutacoes[mutante] : null;
const origemMutada = especificacao ? origens[especificacao[0]] : null;
const originalMutado = origemMutada ? readFileSync(origemMutada, 'utf8') : null;
if (especificacao) {
  const src = originalMutado.replace(especificacao[1], especificacao[2]);
  if (src === originalMutado) throw new Error(`mutante não aplicou: ${mutante}`);
  writeFileSync(origemMutada, src);
}

let qualidade, clampTexturasGL;
try {
  // import com cache-bust: mutante escreveu no disco, o ESM cacheia por URL
  qualidade = await import(`file://${origemQualidade}?m=${mutante ? 'mut' : 'base'}`);
  ({ clampTexturasGL } = await import(`file://${join(ROOT, 'public/vendor/addons/loaders/GLTFLoader.js')}?m=${mutante ? 'mut' : 'base'}`));

  let falhas = [];
  const { PERFIL_MOBILE, DEGRAUS, tetoTextura, perfilInicial, LimitadorCadencia } = qualidade;

  const d = DEGRAUS[PERFIL_MOBILE.degrauInicial];
  if (!(d.dpr <= 0.6)) falhas.push(`P1: dpr do degrau inicial é ${d.dpr}, queria ≤0,6`);
  if (d.sombra !== 'baixa') falhas.push(`P1: sombra do degrau inicial é ${d.sombra}, queria 'baixa'`);
  if (d.ssao !== false) falhas.push('P1: degrau inicial do mobile com SSAO ligado');
  if (!(d.mato <= 0.5)) falhas.push(`P1: mato do degrau inicial é ${d.mato}, queria ≤0,5`);

  const casos = [
    [{ pointerCoarse: false }, 0, 'desktop'],
    [{ pointerCoarse: true, maxTextureSize: 4096 }, 1024, 'coarse sem limite menor'],
    [{ pointerCoarse: true, maxTextureSize: 512 }, 512, 'coarse em aparelho de 512'],
    [{ pointerCoarse: true, maxTextureSize: Infinity }, 1024, 'coastre sem limite'],
  ];
  for (const [args, esperado, nome] of casos) {
    const t = tetoTextura(args);
    if (t !== esperado) falhas.push(`P2: tetoTextura(${nome}) devolveu ${t}, queria ${esperado}`);
  }
  if (tetoTextura({ pointerCoarse: true, maxTextureSize: 1024 }) !== 1024) falhas.push('P2: teto 1024 não atravessa');
  if (tetoTextura({ pointerCoarse: true, maxTextureSize: 4096 }) > 1024) falhas.push('P2: teto da lane (1024) virou opinião: aparelho grande liberou mais');

  if (perfilInicial({ software: true }) !== DEGRAUS.length - 1) falhas.push('P3: software deixou de nascer no fundo');
  if (perfilInicial({ pointerCoarse: true }) !== PERFIL_MOBILE.degrauInicial) falhas.push('P3: coarse não entra no degrau do perfil');
  if (perfilInicial({}) !== 0) falhas.push('P3: desktop não entra no degrau 0');
  if (perfilInicial({ pointerCoarse: true, degrauSalvo: DEGRAUS.length - 1 }) !== DEGRAUS.length - 1) falhas.push('P3: coarse esqueceu o degrau sustentável da sessão anterior');
  if (perfilInicial({ pointerCoarse: true, degrauSalvo: 'quebrado' }) !== PERFIL_MOBILE.degrauInicial) falhas.push('P3: save inválido não voltou ao perfil seguro');

  // P4: clamp funcional com canvas falso
  const desenhos = [];
  globalThis.document = {
    createElement: () => {
      const c = { width: 0, height: 0 };
      c.getContext = () => ({ drawImage: (img, x, y, w, h) => { c.width = w; c.height = h; desenhos.push([img.width, img.height, w, h]); } });
      return c;
    },
  };
  globalThis.__CS_TEXTURA_MAX__ = 1024;
  const texGrande = { isTexture: true, image: { width: 2048, height: 1024 } };
  const texOk = { isTexture: true, image: { width: 512, height: 512 } };
  const material = { map: texGrande, normalMap: texOk };
  const gltf = { scene: { traverse: (fn) => fn({ material }) } };
  clampTexturasGL(gltf);
  if (texGrande.image.width !== 1024 || texGrande.image.height !== 512) falhas.push(`P4: 2048x1024 virou ${texGrande.image.width}x${texGrande.image.height}, queria 1024x512`);
  if (texOk.image.width !== 512) falhas.push('P4: mexeu em textura dentro do teto');
  delete globalThis.__CS_TEXTURA_MAX__;
  const imagemAposFlagOff = texGrande.image;
  clampTexturasGL(gltf);
  if (texGrande.image !== imagemAposFlagOff) falhas.push('P4: clamp rodou sem a flag');
  delete globalThis.document;
  if (typeof LimitadorCadencia !== 'function') {
    falhas.push('P5: limitador de cadência mobile ausente');
  } else {
    const conta = (hzTela, fpsAlvo, duracaoMs = 1000) => {
      const l = new LimitadorCadencia();
      let quadros = 0;
      for (let t = 0; t < duracaoMs; t += 1000 / hzTela) if (l.aceita(t, fpsAlvo)) quadros++;
      return quadros;
    };
    for (const hz of [60, 90, 120]) {
      const n = conta(hz, PERFIL_MOBILE.fpsJogo);
      if (n < 59 || n > 61) falhas.push(`P5: tela ${hz} Hz entregou ${n} quadros de jogo, queria 59–61`);
    }
    const menu = conta(120, PERFIL_MOBILE.fpsMenu);
    if (menu < 29 || menu > 31) falhas.push(`P5: menu em tela 120 Hz entregou ${menu} quadros, queria 29–31`);
  }

  const fonteMain = readFileSync(origemMain, 'utf8');
  const escolhasManuais = fonteMain.match(/marcarQualidadeManual\(\)/g)?.length || 0;
  if (!fonteMain.includes("localStorage.setItem(AUTO_QUALITY_KEY, '1')")
    || !fonteMain.includes("localStorage.setItem(AUTO_QUALITY_KEY, 'manual')")
    || !fonteMain.includes('!QUALITY_WAS_MANUAL') || escolhasManuais < 2) {
    falhas.push('P6: perfil automático não sobrevive ao save ou escolha manual não grava sua marca');
  }

  if (mutante) {
    const prefixo = mutacoes[mutante][3];
    const morde = falhas.length > 0 && falhas.every((f) => f.startsWith(prefixo));
    if (morde) {
      console.log(`mutante ${mutante} reprovado como devia: ${falhas[0]}`);
      falhas = [];
    } else {
      console.error(`MUTAÇÃO PASSOU — ${mutante} não foi visto pela régua.`);
      process.exitCode = 1;
    }
  } else if (falhas.length) {
    console.error('perfil mobile reprovado:');
    for (const f of falhas) console.error(`  ✗ ${f}`);
    process.exitCode = 1;
  } else {
    console.log(`perfil mobile confere: degrau ${PERFIL_MOBILE.degrauInicial} (${d.nome}), teto de textura ${PERFIL_MOBILE.texturaMax} respeitando MAX_TEXTURE_SIZE, clamp do loader funcional.`);
  }
} finally {
  if (origemMutada) writeFileSync(origemMutada, originalMutado);
}
process.exit(process.exitCode || 0);
