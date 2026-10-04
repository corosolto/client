/* TROCA-PERSONAGEM-CHECK — escolher personagem no meio da partida (multiplayer).
   O servidor e o cliente rodam o mesmo `Game._trocarPersonagem`, então ele precisa deixar o
   corpo coerente nos dois: `def` novo, malha nova na cena (a velha fora), cor do LADO.
     TP1  bot troca de personagem: def novo, malha nova na cena, malha velha fora
     TP2  a malha nova veste a cor do lado (braçadeira), não a da categoria
     TP3  jogador troca: playerDef/player.def/playerCharId novos e o 3ª pessoa remonta
     TP4  mesmo personagem é no-op (não remonta malha à toa)
   Mutante: `--mutante=sem-malha` não remonta a malha (TP1/TP2 ficam vermelhas). */
import { bootGame, initTextures, CHARACTERS, Game } from './harness.mjs';
import { PALETA } from '../../public/js/paleta.js';

const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
if (MUT === 'sem-malha') Game.prototype._syncRemoteWeapon = () => false;
const falhas = [];
const cobra = (cond, cod, txt, det) => { console.log(`${cod} · ${txt}\n   ${det}\n   ${cond ? 'PASSA' : 'FALHA'}`); if (!cond) falhas.push(cod); };
const tomBraco = (f) => parseInt(((f === 'F' || f === 'U') ? PALETA[f].base : PALETA[f].escura).slice(1), 16);
const cores = (mesh) => { const out = new Set(); mesh.group.traverse((o) => { if (o.material?.color) out.add(o.material.color.getHex()); }); return out; };
const naCena = (g, grupo) => { let ok = false; g.scene.traverse((o) => { if (o === grupo) ok = true; }); return ok; };

const g = bootGame('posto_treta', { textures: initTextures(), bots: 4 });
{
  const bot = g.bots.find((b) => b.team === 'B');
  const novo = CHARACTERS.find((c) => c.team === 'F' && c.id !== bot.def.id);
  const velho = bot.mesh.group;
  const trocou = g._trocarPersonagem(bot, novo);
  cobra(trocou && bot.def.id === novo.id && bot.mesh.group !== velho && naCena(g, bot.mesh.group) && !naCena(g, velho),
    'TP1', 'bot troca de personagem e de malha', `def ${bot.def.id}, malha nova ${bot.mesh.group !== velho}, velha na cena ${naCena(g, velho)}`);
  const lado = g._factionOf(bot.team);
  const c = cores(bot.mesh);
  cobra(c.has(tomBraco(lado)) && !c.has(tomBraco('F')), 'TP2', 'a malha nova veste a cor do lado',
    `lado ${lado}: braçadeira do lado ${c.has(tomBraco(lado))}, braçadeira da categoria F ${c.has(tomBraco('F'))}`);
  const antes = bot.mesh.group;
  cobra(g._trocarPersonagem(bot, novo) === false && bot.mesh.group === antes, 'TP4', 'mesmo personagem é no-op', 'sem remontar');
}
{
  const novo = CHARACTERS.find((c) => c.team === 'M' && c.id !== g.playerDef.id);
  g._trocarPersonagem(g.player, novo);
  g._ensurePlayerTP();
  cobra(g.playerDef.id === novo.id && g.player.def === g.playerDef && g.playerCharId === novo.id && g._tpDefId === novo.id,
    'TP3', 'jogador troca de personagem e o 3ª pessoa remonta', `playerDef ${g.playerDef.id}, 3ª pessoa ${g._tpDefId}`);
}
console.log(falhas.length ? `\nVERMELHO — ${falhas.join(', ')}` : '\nVERDE');
process.exit(falhas.length ? 1 : 0);
