#!/usr/bin/env python3
# Simulador OFFLINE do personagem: prev? o antes/depois SEM abrir browser.
#
# COMO ISSO E POSSIVEL: na r1 o material do GLB do Meshy tinha emissiveFactor [1,1,1] +
# emissiveTexture = baseColor E metalness 1.0 (glTF default) — ou seja, o personagem era
# literalmente o ALBEDO cru na tela, sem difusa. Entao invertendo o composite (AgX + piso
# + vinheta, tools/eval/tone_calib.py) em cima dos pixels de personagem da r1 recupera-se
# o ALBEDO LINEAR real de cada texel. Com o albedo em maos da pra reaplicar:
#   - a matematica da R2 (piso ADITIVO no outgoingLight)  -> tem que bater o medido
#   - a matematica da R3 (piso MULTIPLICATIVO na irradiancia) -> a previsao
# e passar tudo pelo composite da rodada correspondente.
import sys
import numpy as np
sys.path.insert(0, '/root/csb/tools/eval')
import tone_calib as T
import char_probe as P
from scipy import ndimage

LUMW = T.LUMW

# composite: r1 = o que gerou /root/shots/r1 ; r2 = LOOKS atuais do bloom.js
R1 = {'ferro_velho': dict(exposure=1.55, floor=0.012, sat=1.02),
      'piscina_treta':   dict(exposure=1.10, floor=0.013, sat=1.02)}
R2 = {'ferro_velho': dict(exposure=1.66, floor=0.0041, sat=1.12),
      'piscina_treta':   dict(exposure=1.92, floor=0.0039, sat=1.12)}


def unvignette_at(x, y, w, h):
    u = (x + 0.5) / w - 0.5
    v = (y + 0.5) / h - 0.5
    cos4 = (1.0 / (1.0 + (u * u + v * v) * 2.4)) ** 2
    return 1.0 + T.VIGN * (cos4 - 1.0)


def to_hdr(srgb, xs, ys, w, h, p):
    lin = T.srgb_to_lin(srgb)
    hdr = T.agx_inv(lin, 1.0, 1.0, p['sat'])
    hdr = hdr / unvignette_at(xs, ys, w, h)[:, None]
    hdr = hdr / p['exposure']
    return T.unfloor(hdr, p['floor'])


def to_srgb(hdr, xs, ys, w, h, p):
    x = hdr + p['floor'] ** 2 / (hdr + p['floor'])
    x = x * (p['exposure'] * unvignette_at(xs, ys, w, h))[:, None]
    # agx() devolve LINEAR de display; os PNGs (e P.lab) sao sRGB — sem este encode
    # o round-trip erra ~30 pontos de L*.
    return T.lin_to_srgb(T.agx(x, 1.0, 1.0, p['sat']))


def lab_of(srgb):
    L, A, B = P.lab(srgb.reshape(-1, 1, 3))
    return L.ravel(), A.ravel(), B.ravel()


def stats(srgb, tag):
    L, A, B = lab_of(srgb)
    C = np.hypot(A, B)
    print(f'  {tag:44s} C*={C.mean():5.1f} (p90 {np.percentile(C,90):5.1f})  '
          f'L* p5/p50/p95={np.percentile(L,5):5.1f}/{np.percentile(L,50):5.1f}/{np.percentile(L,95):5.1f}  '
          f'sd={L.std():5.2f}')
    return C.mean(), L.mean()


PI = np.pi


def shade_r2(alb, amb, sun, ndl, dist, floor=0.13):
    """Matematica da R2: PBR + piso ADITIVO no outgoingLight com tinta hue-normalizada."""
    out = alb * (amb + sun * ndl)[:, None] / PI
    lum = (out * LUMW).sum(-1)
    t = np.clip((dist - 10) / 35, 0, 1); t = t * t * (3 - 2 * t)
    flr = floor * (1.0 + 0.6 * t)
    mx = np.maximum(alb.max(-1, keepdims=True), 1e-3)
    tint = 0.4 + 0.6 * (alb / mx)
    return out + tint * np.maximum(0.0, flr - lum)[:, None]


def shade_r3(alb, amb, sun, ndl, dist, csF=None, floor_irr=1.85, floor_far=3.00,
             alb_min=0.09, sat=1.16, rim_near=0.18, rim_far=0.70,
             rim_col=np.array([1.0, 0.7175, 0.7175])):
    """Matematica da R3: ganho de croma + piso de albedo por ESCALA + piso na IRRADIANCIA
    + rim de duas bandas. rim_col = TEAM_RIM['P'] (0xff5555) lerp 0.35 pro branco."""
    y = (alb * LUMW).sum(-1, keepdims=True)
    a = np.maximum(0.0, y + sat * (alb - y))
    mx = np.maximum(a.max(-1, keepdims=True), 1e-4)
    a = a * np.maximum(1.0, alb_min / mx)
    t = np.clip((dist - 10) / 35, 0, 1); t = t * t * (3 - 2 * t)
    fl = floor_irr + (floor_far - floor_irr) * t
    out = a * (np.maximum(amb, fl) + sun * ndl)[:, None] / PI
    if csF is not None:
        tk = np.clip((dist - 4) / 30, 0, 1); tk = tk * tk * (3 - 2 * tk)
        out = out + rim_col[None, :] * (csF * (rim_near + (rim_far - rim_near) * tk))[:, None]
    return out


def fake_geometry(n, seed=7):
    """Distribuicoes plausiveis de N.V e N.L num corpo humanoide low-poly, para prever a
    MEDIA do recorte (que e o que o C1 mede). N.V: secao de cilindro visto de lado ->
    N.V = sqrt(1-x^2) com x uniforme na LARGURA PROJETADA. N.L: metade do corpo de costas
    pro sol (0) e metade com cosseno."""
    r = np.random.default_rng(seed)
    x = r.uniform(-1, 1, n)
    nv = np.sqrt(np.maximum(0.0, 1 - x * x))
    csFb = (1 - nv) ** 1.7
    csFe = (1 - nv) ** 6.0
    upw = r.uniform(0.45, 1.55, n)
    csF = (csFb + csFe * 1.35) * upw
    ndl = np.maximum(0.0, r.uniform(-1, 1, n))
    return csF, ndl


def run(mapid, frame, box, mode, dist, name, amb=1.0, sun=1.65):
    a = P.load(f'/root/shots/r1/game-{frame}.png')
    h, w = a.shape[:2]
    m = P.char_mask(a, box, mode)
    ys, xs = np.nonzero(m)
    srgb = a[m]
    p1 = R1[mapid]; p2 = R2[mapid]
    alb = to_hdr(srgb, xs, ys, w, h, p1)          # r1 = albedo cru na tela
    alb = np.clip(alb, 0.0, 1.0)
    print(f'\n### {name}  ({m.sum()} px, ~{dist:.0f} m)')
    print(f'  albedo recuperado: min/med/max canal max = '
          f'{alb.max(-1).min():.3f}/{np.median(alb.max(-1)):.3f}/{alb.max(-1).max():.3f}')
    stats(srgb, 'r1 MEDIDO (albedo cru, composite r1)')
    csF, ndl = fake_geometry(len(alb))
    A = np.full(len(alb), amb)
    o2 = shade_r2(alb, A, sun, ndl, dist)
    stats(to_srgb(o2, xs, ys, w, h, p2), 'r2 SIMULADO (piso ADITIVO 0.13 no outgoingLight)')
    print(f'      HDR Y p5/p50/p95 = ' + '/'.join(f'{np.percentile((o2*LUMW).sum(-1),q):.4f}' for q in (5, 50, 95)))
    o3 = shade_r3(alb, A, sun, ndl, dist, csF=None)
    stats(to_srgb(o3, xs, ys, w, h, p2), 'r3 SIMULADO (piso na IRRADIANCIA, SEM rim)')
    o3r = shade_r3(alb, A, sun, ndl, dist, csF=csF)
    c, l = stats(to_srgb(o3r, xs, ys, w, h, p2), 'r3 SIMULADO (piso na IRRADIANCIA + rim 2 bandas)')
    print(f'      HDR Y p5/p50/p95 = ' + '/'.join(f'{np.percentile((o3r*LUMW).sum(-1),q):.4f}' for q in (5, 50, 95)))
    return l


if __name__ == '__main__':
    # ferro velho: hemi 1.0 + IBL -> ambiente difuso medido ~1.0; sol 1.65
    run('ferro_velho', 'ferro_velho-169-b', (780, 495, 890, 740), 'auto', 20, 'doutora (jaleco + calca teal)')
    run('ferro_velho', 'ferro_velho-169-b', (690, 445, 775, 610), 'auto', 34, 'bot camisa roxa')
    # piscinao: hemi 0.52 + IBL de ceu claro -> ambiente ~1.0; sol 2.6
    run('piscina_treta', 'piscina_treta-169-d', (1180, 470, 1420, 900), 'auto', 8, 'bot piscinao (bone do r1)',
        amb=1.0, sun=2.6)
