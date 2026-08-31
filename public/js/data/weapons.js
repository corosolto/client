// Tabela pura de configuração de gameplay (sem lógica ou dependência do DOM/Three).
export const WEAPONS = {
  awp:    { name: 'AWP "DELIBERADOR"', short: 'AWP', dmg: 400, mag: 5, reserve: 25, rate: 1.7, reload: 3.1, spreadHip: 0.075, spreadScope: 0.0008, recoil: 0.055, scope: true },
  // dmg 33→36 (crítico de gunfeel): 33×3=99 deixava a arma-tema 1 HP de matar em 3 tiros —
  // era a 12ª em TTK. Com 36 mata em 3 (TTK 0.200) e volta a ser a régua do arsenal.
  ak:     { name: 'AK-47 "BATE-ESTACA"', short: 'AK', dmg: 36, mag: 30, reserve: 90, rate: 0.1, reload: 2.5, spreadHip: 0.024, recoil: 0.008, auto: true },
  m4:     { name: 'M4A1 "REQUINTE"', short: 'M4', dmg: 31, mag: 30, reserve: 90, rate: 0.09, reload: 2.4, spreadHip: 0.02, recoil: 0.007, auto: true },
  mp5:    { name: 'MP5 "VASSOURA"', short: 'MP5', dmg: 26, mag: 30, reserve: 120, rate: 0.075, reload: 2.2, spreadHip: 0.03, recoil: 0.005, auto: true },
  // 8×12=96 não matava nem com o cartucho inteiro no peito (TTK 0.9s, pior arma do jogo).
  // 9×14=126 = mata no contato, que é o contrato de uma pump.
  shotgun:{ name: 'M3 "CONVERSA FIADA"', short: 'M3', dmg: 14, pellets: 9, mag: 7, reserve: 32, rate: 0.9, reload: 3.0, spreadHip: 0.06, recoil: 0.045 },
  deagle: { name: 'DEAGLE "MARTELO"', short: 'DE', dmg: 53, mag: 7, reserve: 35, rate: 0.28, reload: 2.0, spreadHip: 0.012, recoil: 0.03 },
  pistol: { name: 'PT-38 "APITO"', short: 'PT-38', dmg: 34, mag: 12, reserve: 48, rate: 0.24, reload: 1.6, spreadHip: 0.02, recoil: 0.014, scope: false },
  knife:  { name: 'FACA "CONVERSA FIADA"', short: 'FACA', dmg: 55, rate: 0.55, range: 2.4, reload: 0, recoil: 0.02, scope: false },
  // arsenal 2 (BR)
  m92:       { name: 'ZASTAVA M92 "IOGUSLAVO"', short: 'M92', dmg: 32, mag: 30, reserve: 90, rate: 0.1, reload: 2.5, spreadHip: 0.026, recoil: 0.009, auto: true },
  revolver38:{ name: 'REVÓLVER .38 "TROVÃO"', short: '.38', dmg: 46, mag: 6, reserve: 24, rate: 0.36, reload: 2.4, spreadHip: 0.016, recoil: 0.03 },
  md97:      { name: 'MD97 "FUZIL DA PÁTRIA"', short: 'MD97', dmg: 38, mag: 20, reserve: 80, rate: 0.12, reload: 2.6, spreadHip: 0.022, recoil: 0.012, auto: true },
  carbine:   { name: 'CARABINA "PAPO DE PEÃO"', short: 'CARB', dmg: 42, mag: 10, reserve: 40, rate: 0.5, reload: 2.8, spreadHip: 0.02, recoil: 0.02 },
  // G3-R1: scope VOLTA a true. O bug nunca foi "ter luneta" e sim a máscara entrar em 1 frame
  // ainda no FOV 70 (tela quase toda preta = a "faixa preta" que o dono viu) somada a esconder
  // arma E crosshair antes de ela existir. Agora a luneta é um overlay circular com fade curto
  // amarrado ao progresso do zoom, e nem a arma nem a mira somem antes de a luneta estar opaca
  // (ver _scope/_updatePlayer). Sniper sem zoom não parece jogo.
  mosin:     { name: 'MOSIN "VOVÓ RUSSA"', short: 'MOSIN', dmg: 120, mag: 5, reserve: 25, rate: 1.5, reload: 3.4, spreadHip: 0.08, spreadScope: 0.001, recoil: 0.05, scope: true },
  // snipers SEMI-AUTO (estilo M400: luneta + tiro rápido) — dano/cadência entre a M400 e os ferrolhos.
  // G3-R1: as 3 voltam a ter LUNETA (eram scope:false desde a G2-R6A). Ver o comentário da
  // M400 acima: a luneta certa resolve a "faixa preta" — tirar o zoom da sniper não.
  svd:       { name: 'SVD "VODKA"', short: 'SVD', dmg: 62, mag: 10, reserve: 40, rate: 0.28, reload: 3.0, spreadHip: 0.05, spreadScope: 0.0015, recoil: 0.03, auto: true, scope: true },
  sks:       { name: 'SKS "MILÍCIA"', short: 'SKS', dmg: 48, mag: 10, reserve: 50, rate: 0.18, reload: 2.6, spreadHip: 0.04, spreadScope: 0.002, recoil: 0.02, auto: true, scope: true },
  // arsenal 3 (militar)
  lmg:       { name: 'METRALHA "TRETA PESADA"', short: 'LMG', dmg: 31, mag: 100, reserve: 200, rate: 0.085, reload: 5.0, spreadHip: 0.04, recoil: 0.011, auto: true },
  scar:      { name: 'SCAR "PAGA-PAU"', short: 'SCAR', dmg: 37, mag: 20, reserve: 80, rate: 0.11, reload: 2.5, spreadHip: 0.02, recoil: 0.01, auto: true },
  // rate 0.06→0.075: a 1000 RPM full-auto ela era a MELHOR arma do jogo (TTK 0.180) com o
  // 2º menor recuo. 800 RPM mantém o caráter "rajada rápida" sem apagar os rifles 7.62.
  famas:     { name: 'FAMAS "BAGUETE"', short: 'FAMAS', dmg: 29, mag: 25, reserve: 90, rate: 0.075, reload: 2.4, spreadHip: 0.028, recoil: 0.006, auto: true },
  uzi:       { name: 'UZI "RÁ-TÁ-TÁ"', short: 'UZI', dmg: 25, mag: 25, reserve: 100, rate: 0.07, reload: 2.1, spreadHip: 0.032, recoil: 0.006, auto: true },
  p90:       { name: 'P90 "CHINELÃO"', short: 'P90', dmg: 23, mag: 50, reserve: 100, rate: 0.065, reload: 2.3, spreadHip: 0.03, recoil: 0.005, auto: true },
};
