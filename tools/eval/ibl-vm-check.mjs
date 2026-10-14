/* ibl-vm-check.mjs — o IBL vai só para o viewmodel?
 *
 * Decisão do dono (13/10/2026, #832): o env map (PMREM do `_buildEnv`) ilumina a arma e as
 * mãos em primeira pessoa e NÃO a cena do mapa. Até o #832 o PMREM saía preto na GPU e a
 * arte de todos os mapas foi aprovada assim; com o ambiente certo na cena inteira os pretos
 * subiam e a cor lavava (A/B no corpo do #832).
 *
 *   IV1  o env map é gerado e a vmScene usa a textura dele;
 *   IV2  a cena do mapa não tem `environment` e nenhum material dela tem `envMap`;
 *   IV3  trocar de arma (todas as do WEAPONS) mantém IV1 e IV2: arma nova na mão continua
 *        com o IBL, arma no chão e boneco em 3ª pessoa continuam sem.
 *
 * O texel não nulo do env map só existe na GPU: `tools/eval/ibl-vm-gpu.mjs` (com BASE).
 *
 * Mutações (sai 1 se a mutação PASSAR):
 *   --mutante=vaza     `_buildEnv` volta a pôr o env map em `scene.environment`
 *   --mutante=sem-vm   `_buildEnv` deixa de entregar a textura para a vmScene
 *
 *   node tools/eval/ibl-vm-check.mjs
 */
import { renderer, bootGame, initTextures, Game, THREE } from './harness.mjs';
import { WEAPONS } from '../../public/js/data/weapons.js';

const MUTANTE = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const MUTACOES = {
  vaza: [/^\s*this\.scene\.environment = null;\s*\n(\s*this\._vmEnv = this\._envRT\.texture;)/m, 'this.scene.environment = this._envRT.texture;\n$1'],
  'sem-vm': [/^\s*this\._vmEnv = this\._envRT\.texture;\s*$/m, ''],
};
if (MUTANTE && !MUTACOES[MUTANTE]) { console.error(`mutante desconhecido: ${MUTANTE}`); process.exit(1); }
if (MUTANTE) {
  const fonte = Game.prototype._buildEnv.toString();
  const mutada = fonte.replace(...MUTACOES[MUTANTE]);
  if (mutada === fonte) { console.error(`MUTANTE NAO APLICOU: ${MUTANTE}`); process.exit(1); }
  Game.prototype._buildEnv = new Function('THREE', `return ({ ${mutada} })._buildEnv;`)(THREE);
}
void renderer;

const textures = initTextures();
const comEnvMap = (scene) => {
  let n = 0;
  scene.traverse((o) => { for (const m of [].concat(o.material || [])) if (m && m.envMap) n++; });
  return n;
};
const estado = (g) => ({
  envRT: !!g._envRT,
  vm: !!g._envRT && g.vmScene.environment === g._envRT.texture,
  cenaEnv: !!g.scene.environment,
  cenaEnvMap: comEnvMap(g.scene),
});
const res = [];
for (const mapa of ['praca_poderes', 'loja_h', 'piscina_treta']) {
  const g = bootGame(mapa, { textures });
  const e = estado(g);
  res.push(['IV1', `${mapa}: env map gerado e entregue à vmScene`, e.envRT && e.vm, `envRT=${e.envRT} vmScene usa=${e.vm}`]);
  res.push(['IV2', `${mapa}: cena do mapa sem environment e sem envMap`, !e.cenaEnv && e.cenaEnvMap === 0,
    `scene.environment=${e.cenaEnv} materiais com envMap=${e.cenaEnvMap}`]);
  const ruins = [];
  for (const w of Object.keys(WEAPONS)) {
    try { g._switchWeapon(w); } catch (err) { ruins.push(`${w}: ${err.message}`); continue; }
    const t = estado(g);
    if (!t.vm || t.cenaEnv || t.cenaEnvMap) ruins.push(`${w}: vm=${t.vm} cena=${t.cenaEnv} envMap=${t.cenaEnvMap}`);
  }
  res.push(['IV3', `${mapa}: troca de arma (${Object.keys(WEAPONS).length}) mantém o IBL só na mão`, ruins.length === 0,
    ruins.length ? ruins.slice(0, 4).join(' · ') : 'todas ok']);
  g.dispose();
}
for (const [id, desc, ok, evid] of res) console.log(`${ok ? '✓' : '✗'} ${id}  ${desc} (${evid})`);
const falhou = res.some(([, , ok]) => !ok);
if (MUTANTE) {
  console.log(falhou ? `✓ mutante ${MUTANTE} ficou vermelho` : `✗ mutante ${MUTANTE} PASSOU, régua cega`);
  process.exit(falhou ? 0 : 1);
}
process.exit(falhou ? 1 : 0);
