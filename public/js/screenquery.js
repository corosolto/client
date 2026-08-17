const SCREEN_ALIASES = Object.freeze({
  '00': 'splash',
  '00b': 'loading',
  '01': 'menu',
  '02': 'faction',
  '03': 'character',
  '04': 'maps',
  '05': 'hud',
  '06': 'pause',
  '07': 'settings',
  '08': 'scoreboard',
  '09': 'defeat',
  splash: 'splash',
  loading: 'loading',
  menu: 'menu',
  faccao: 'faction',
  faction: 'faction',
  personagem: 'character',
  character: 'character',
  mapa: 'maps',
  mapas: 'maps',
  maps: 'maps',
  hud: 'hud',
  pausa: 'pause',
  pause: 'pause',
  config: 'settings',
  settings: 'settings',
  placar: 'scoreboard',
  scoreboard: 'scoreboard',
  vitoria: 'victory',
  victory: 'victory',
  derrota: 'defeat',
  defeat: 'defeat',
});

const FACTIONS = new Set(['E', 'B', 'U', 'C', 'F']);

export function resolveInspectionScreen(params) {
  const requested = (params.get('tela') || '').trim().toLowerCase();
  const screen = SCREEN_ALIASES[requested];
  if (!screen) return null;
  const requestedFaction = (params.get('time') || 'E').trim().toUpperCase();
  const hpRaw = params.get('vida') ?? params.get('hp');
  const hpParsed = hpRaw == null ? null : Number(hpRaw);
  return {
    screen,
    faction: FACTIONS.has(requestedFaction) ? requestedFaction : 'E',
    character: (params.get('char') || '').trim() || null,
    map: (params.get('map') || '').trim() || null,
    hp: Number.isFinite(hpParsed) ? Math.max(0, Math.min(100, hpParsed)) : (params.get('vidabaixa') === '1' ? 23 : null),
  };
}
