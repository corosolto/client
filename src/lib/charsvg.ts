// Mini-portraits SVG dos 8 personagens (compartilhado: badge, ranking, perfil).
export const CHARS: Record<string, { name: string; skin: string; shirt: string; hair: string; feat: string }> = {
  esquerdomacho: { name: 'Esquerdomacho', skin: '#e8b98a', shirt: '#b03a2e', hair: '#4a3428', feat: 'beard-glasses' },
  sindicato: { name: 'Líder do Sindicato', skin: '#c98d5e', shirt: '#777777', hair: '#3a3a3a', feat: 'cap-vest' },
  mst: { name: 'Líder do MST', skin: '#8d5a3b', shirt: '#7a6a45', hair: '#2a1e14', feat: 'cap' },
  doutora: { name: 'Doutora do SUS', skin: '#d9a580', shirt: '#f0f0f0', hair: '#3a2a1e', feat: 'ponytail-coat' },
  caminhoneiro: { name: 'Caminhoneiro', skin: '#d9a066', shirt: '#ffd23f', hair: '#3a2a1e', feat: 'capblue-shades' },
  influencer: { name: 'Influencer de Dubai', skin: '#f2c9a4', shirt: '#f0f0f0', hair: '#f5d76e', feat: 'blonde-shades' },
  sertanejo: { name: 'Cantor Sertanejo', skin: '#c98d5e', shirt: '#8a2f2f', hair: '#2a1e14', feat: 'cowboy-stache' },
  senhora: { name: 'Tia Zilá', skin: '#eec39a', shirt: '#1faa4d', hair: '#d8d8d8', feat: 'bun-shades' },
  mistico: { name: 'Jovem Místico', skin: '#e8b98a', shirt: '#9b59b6', hair: '#4a3428', feat: 'headband-beard' },
  coach: { name: 'Coach Quântico', skin: '#f2c9a4', shirt: '#1a2a4a', hair: '#2a2a2a', feat: 'blazer-headset' },
};
export const charName = (id?: string | null) => (id && CHARS[id] ? CHARS[id].name : null);

function charInner(id: string, sideColor: string, clipId: string): string {
  const c = CHARS[id];
  if (!c) return '';
  const eyes = `<rect x="734" y="60" width="8" height="8" fill="#1a1a1a"/><rect x="754" y="60" width="8" height="8" fill="#1a1a1a"/>`;
  let feat = eyes;
  switch (c.feat) {
    case 'beard-glasses':
      feat = `<rect x="728" y="76" width="40" height="14" fill="#3a2a1e"/><rect x="730" y="58" width="14" height="8" fill="#222"/><rect x="752" y="58" width="14" height="8" fill="#222"/><rect x="744" y="60" width="8" height="3" fill="#222"/>`; break;
    case 'cap-vest':
      feat = `<rect x="724" y="40" width="48" height="14" fill="#c0392b"/><rect x="720" y="52" width="56" height="6" fill="#c0392b"/>` + eyes +
        `<rect x="716" y="96" width="64" height="40" fill="#8e2f24"/>`; break;
    case 'cap':
      feat = `<rect x="724" y="40" width="48" height="14" fill="#c0392b"/><rect x="720" y="52" width="56" height="6" fill="#c0392b"/>` + eyes; break;
    case 'ponytail-coat':
      feat = `<rect x="724" y="36" width="48" height="12" fill="${c.hair}"/><rect x="772" y="44" width="9" height="30" fill="${c.hair}"/>` + eyes; break;
    case 'capblue-shades':
      feat = `<rect x="724" y="40" width="48" height="14" fill="#2456a6"/><rect x="720" y="52" width="56" height="6" fill="#2456a6"/><rect x="726" y="60" width="44" height="10" fill="#111"/>`; break;
    case 'blonde-shades':
      feat = `<rect x="720" y="34" width="56" height="16" fill="${c.hair}"/><rect x="716" y="42" width="9" height="42" fill="${c.hair}"/><rect x="771" y="42" width="9" height="42" fill="${c.hair}"/><rect x="726" y="60" width="44" height="10" fill="#c9a227"/>`; break;
    case 'cowboy-stache':
      feat = `<rect x="712" y="52" width="72" height="8" fill="#7a5230"/><rect x="728" y="30" width="40" height="24" fill="#7a5230"/><rect x="734" y="78" width="28" height="6" fill="#3a2a1e"/>` + eyes; break;
    case 'bun-shades':
      feat = `<circle cx="748" cy="34" r="9" fill="${c.hair}"/><rect x="724" y="40" width="48" height="10" fill="${c.hair}"/><rect x="724" y="58" width="48" height="12" fill="#1a1a1a"/>`; break;
    case 'headband-beard':
      feat = `<rect x="724" y="46" width="48" height="6" fill="#e8bd25"/><rect x="728" y="72" width="40" height="20" fill="#3a2a1e"/>` + eyes; break;
    case 'blazer-headset':
      feat = eyes + `<path d="M 724 52 a 24 24 0 0 1 48 0" stroke="#1a1a1a" stroke-width="4" fill="none"/><rect x="770" y="62" width="4" height="14" fill="#1a1a1a"/>`; break;
  }
  return `<defs><clipPath id="${clipId}"><circle cx="748" cy="96" r="56"/></clipPath></defs>
  <g clip-path="url(#${clipId})">
    <rect x="680" y="28" width="136" height="136" fill="${sideColor}" opacity="0.22"/>
    <rect x="716" y="96" width="64" height="68" fill="${c.shirt}"/>
    <rect x="724" y="44" width="48" height="52" rx="8" fill="${c.skin}"/>
    ${feat}
  </g>`;
}

// retrato completo no círculo padrão (748,96,r56) com anel
export function charSvg(id: string, sideColor: string, clipId = 'cav'): string {
  return charInner(id, sideColor, clipId) +
    `<circle cx="748" cy="96" r="56" fill="none" stroke="${sideColor}" stroke-width="4"/>`;
}

// versão escalada pra qualquer posição/tamanho de círculo
export function charSvgScaled(id: string, sideColor: string, cx: number, cy: number, r: number, clipId: string): string {
  return `<g transform="translate(${cx - 748},${cy - 96}) scale(${r / 56})">${charSvg(id, sideColor, clipId)}</g>`;
}
