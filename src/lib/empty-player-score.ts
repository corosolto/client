// Um perfil nasce antes da primeira partida. player_points só tem linha depois
// que há estatísticas; o perfil público e a badge ainda precisam existir.
export function emptyPlayerScore(player: {
  id: string;
  nick: string;
  social_link?: string | null;
  socials?: unknown;
  avatar_url?: string | null;
}) {
  return {
    id: player.id,
    nick: player.nick,
    social_link: player.social_link ?? null,
    socials: player.socials ?? [],
    avatar_url: player.avatar_url ?? null,
    points: 0,
    kills: 0,
    deaths: 0,
    headshots: 0,
    matches: 0,
    wins: 0,
    rounds: 0,
    matches_p: 0,
    matches_b: 0,
    best_streak: 0,
    play_seconds: 0,
    last_character: null,
    updated_at: null,
  };
}
