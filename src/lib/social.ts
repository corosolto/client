// Links e avatares sociais.

// normaliza URLs sociais de qualquer formato: handle cru, @handle, url parcial
// ("x.com/foo"), url completa, e o bug do prefixo duplicado
// ("linkedin.com/in/https://www.linkedin.com/in/foo") - pega sempre a última ocorrência.
export function normalizeSocialUrl(s?: string | null): string | null {
  if (!s) return null;
  const v = s.trim();
  if (!v) return null;
  const m = v.match(/(x\.com|twitter\.com|github\.com|instagram\.com|tiktok\.com\/@|youtube\.com\/@|linkedin\.com\/in)\/@?([A-Za-z0-9._-]+)\/?$/i);
  if (m) return buildSocialUrl(socialNet(v), m[2]);
  return /^https?:\/\//i.test(v) ? v : 'https://' + v.replace(/^@/, '');
}

// normaliza o link social pra URL clicável ("x.com/foo" → "https://x.com/foo")
export function socialHref(s?: string | null): string | null {
  return normalizeSocialUrl(s);
}

// identifica a rede pela URL
export function socialNet(s?: string | null): string {
  if (!s) return 'site';
  const v = s.toLowerCase();
  if (v.includes('github.com')) return 'github';
  if (v.includes('instagram.com')) return 'instagram';
  if (v.includes('linkedin.com')) return 'linkedin';
  if (v.includes('tiktok.com')) return 'tiktok';
  if (v.includes('youtube.com') || v.includes('youtu.be')) return 'youtube';
  if (v.includes('x.com') || v.includes('twitter.com')) return 'x';
  return 'site';
}

// handle final da URL ("https://x.com/foo/" → "foo")
export function socialHandle(s?: string | null): string {
  if (!s) return '';
  const m = s.match(/\/@?([A-Za-z0-9._-]+)\/?$/) || s.match(/^@?([A-Za-z0-9._-]+)$/);
  return m ? m[1] : s;
}

import { NET_SVG } from './net-svg';

// chip de ícone SVG da rede (pra usar inline nas páginas)
export function netIcon(net: string, size = 14): string {
  const d = NET_SVG[net] || NET_SVG.site;
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:-2px"><path d="${d}"/></svg>`;
}

// info visual por rede (chip de ícone)
export const NET_INFO: Record<string, { label: string; short: string; color: string }> = {
  x: { label: 'X / Twitter', short: '𝕏', color: '#e8e8e8' },
  github: { label: 'GitHub', short: 'GH', color: '#c9d1d9' },
  instagram: { label: 'Instagram', short: 'IG', color: '#e1306c' },
  linkedin: { label: 'LinkedIn', short: 'in', color: '#3b82c4' },
  tiktok: { label: 'TikTok', short: 'TT', color: '#69c9d0' },
  youtube: { label: 'YouTube', short: 'YT', color: '#ff5252' },
  site: { label: 'Site', short: '⌂', color: '#b8d94a' },
};

// monta URL a partir de rede + handle cru
const NET_PREFIX: Record<string, string> = {
  x: 'https://x.com/', github: 'https://github.com/', instagram: 'https://instagram.com/',
  linkedin: 'https://linkedin.com/in/', tiktok: 'https://tiktok.com/@', youtube: 'https://youtube.com/@',
};
export function buildSocialUrl(net: string, handle: string): string {
  const h = (handle || '').trim().replace(/^@/, '');
  if (!net || !h) return '';
  if (net === 'site') return /^https?:\/\//i.test(h) ? h : 'https://' + h;
  return (NET_PREFIX[net] || '') + h;
}

// extrai handle de twitter/x.com/rubenmarcus_dev, twitter.com/@foo ou @foo
export function twitterHandle(s?: string | null): string | null {
  if (!s) return null;
  const m = s.match(/(?:x\.com|twitter\.com)\/@?([A-Za-z0-9_]{1,15})/) || s.match(/^@([A-Za-z0-9_]{1,15})$/);
  return m ? m[1] : null;
}

// avatar por rede social - X via unavatar.io, GitHub direto (oficial).
// Instagram/LinkedIn/TikTok não têm fetch público: aí o usuário faz upload.
export function socialAvatar(s?: string | null): string | null {
  if (!s) return null;
  const gh = s.match(/github\.com\/@?([A-Za-z0-9-]{1,39})/);
  if (gh) return `https://github.com/${gh[1]}.png?size=128`;
  const h = twitterHandle(s);
  return h ? `https://unavatar.io/twitter/${h}` : null;
}
