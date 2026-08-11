import json, matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, Polygon, Circle

HX, HZ = 38, 58
SF, SB, SW = -6, -42, 28
MZ = dict(x0=-14, x1=14, z0=SB+0.6, z1=SB+11, h=3.4)
ESC = dict(larg=2.60, piso=0.29, esp=0.17, n=20)
RAMP = dict(x0=8.2, x1=8.2+ESC['larg'], z0=MZ['z1'], z1=MZ['z1']+ESC['n']*ESC['piso'])
DEP_Z = MZ['z0'] + 4.8
BG, PANEL = '#0b0d10', '#101317'

fig = plt.figure(figsize=(15.5, 11), dpi=110, facecolor=BG)
axA = fig.add_axes([0.055, 0.06, 0.44, 0.84])
axB = fig.add_axes([0.545, 0.06, 0.43, 0.84])

def base(ax):
    ax.set_facecolor(PANEL)
    ax.add_patch(Rectangle((-HX, SF), 2*HX, HZ-SF, fc='#1b2026', ec='none'))
    ax.add_patch(Rectangle((-SW, SB), 2*SW, SF-SB, fc='#161b21', ec='#3a4450', lw=1.6))
    ax.set_aspect('equal'); ax.invert_yaxis()
    ax.tick_params(colors='#4a545e', labelsize=8)
    for sp in ax.spines.values(): sp.set_color('#2a323a')

# ---------------- PAINEL A: mapa inteiro ----------------
base(axA)
axA.text(0, SF+3.2, 'ESTACIONAMENTO', color='#6d7a88', ha='center', fontsize=9, weight='bold')
axA.text(0, -14, 'LOJA (térreo)', color='#6d7a88', ha='center', fontsize=9, weight='bold')
axA.add_patch(Rectangle((MZ['x0'], MZ['z0']), MZ['x1']-MZ['x0'], MZ['z1']-MZ['z0'], fc='#243447', ec='#4d7ea8', lw=2))
axA.add_patch(Rectangle((MZ['x0'], MZ['z0']), MZ['x1']-MZ['x0'], DEP_Z-MZ['z0'], fc='#2c4a3a', ec='#5ea87e', lw=1.2, hatch='//'))
axA.add_patch(Rectangle((RAMP['x0'], RAMP['z0']), ESC['larg'], RAMP['z1']-RAMP['z0'], fc='#7c6a2c', ec='#ffd764', lw=1.2))
# estátua + pedestal
axA.add_patch(Rectangle((-3.5, 16.5), 7, 7, fc='#4a4030', ec='#b9a86a', lw=1.4))
axA.add_patch(Circle((0, 20), 1.5, fc='#b9a86a', ec='none'))
axA.annotate('ESTÁTUA: pedestal agora COLIDE\n(48 pontos andáveis tinham o corpo\ndentro dele — 0 agora)',
             xy=(3.5, 20), xytext=(14, 8), color='#d8c78a', fontsize=8,
             arrowprops=dict(arrowstyle='->', color='#8a7f52'))
# spawns
for x in (0, -5, 5, -8): axA.plot(x, MZ['z0']+2.4, 'o', ms=8, color='#41d67f', mec=BG, zorder=6)
for x in (-10, -5, 0, 5): axA.plot(x, -31, 'x', ms=9, mew=2.4, color='#e2584d', zorder=6)
for x in (-8, -3, 3, 8): axA.plot(x, HZ-3, 'o', ms=7, color='#5aa9e6', mec=BG, zorder=6)
axA.annotate('spawn B ANTIGO (térreo, z=-31)\nexposição 1,5% · visto de 36,9 m',
             xy=(5, -31), xytext=(-34, -22), color='#e2584d', fontsize=8,
             arrowprops=dict(arrowstyle='->', color='#8a3f38'))
axA.annotate('spawn B NOVO (mezanino, +3,40 m)\nexposição 0,0% · 0 m',
             xy=(-8, MZ['z0']+2.4), xytext=(-36, -47), color='#41d67f', fontsize=8,
             arrowprops=dict(arrowstyle='->', color='#2b8a53'))
axA.text(0, HZ-6, 'spawn P (estacionamento)', color='#5aa9e6', ha='center', fontsize=8)
# bandeiras antigas
for (x, z) in [(0, 50), (0, 20), (0, -24)]:
    axA.plot(x, z, 'v', ms=9, color='#a04a86', mec=BG, zorder=4)
axA.plot([0, 0], [-24, 50], color='#a04a86', lw=1, ls='--')
axA.text(1.6, 44, 'bandeiras ANTIGAS: as 3 em x=0\naltura do triângulo 0,00 m\nspawn↔bandeira 5,8 / 7,0 m',
         color='#c47ab0', fontsize=8)
# bandeiras novas
NOVAS = [(-19, 41, 'P'), (9, 26, 'MID'), (-13, -21, 'B')]
for (x, z, lb) in NOVAS:
    axA.plot(x, z, 'v', ms=12, color='#f0a93b', mec=BG, zorder=7)
    axA.add_patch(Circle((x, z), 4.5, fc='none', ec='#f0a93b', lw=.9, ls='--'))
    axA.text(x, z-6.2, lb, color='#f0a93b', ha='center', fontsize=9, weight='bold')
axA.add_patch(Polygon([(a, b) for a, b, _ in NOVAS], closed=True, fc='none', ec='#f0a93b', lw=.9, alpha=.7))
axA.text(-36, 33, 'bandeiras NOVAS\naltura do triângulo 26,4 m\nspawn↔bandeira ≥ 17,8 m\nnenhuma enterrada (linha de tiro > 0)',
         color='#f0a93b', fontsize=8)
axA.set_xlim(-HX-1, HX+1); axA.set_ylim(HZ+2, SB-3)
axA.set_xlabel('x (m)', color='#6d7a88'); axA.set_ylabel('z (m)', color='#6d7a88')
axA.set_title('mapa inteiro', color='#dfe6ee', fontsize=10)

# ---------------- PAINEL B: zoom mezanino + escada ----------------
base(axB)
axB.add_patch(Rectangle((MZ['x0'], MZ['z0']), MZ['x1']-MZ['x0'], MZ['z1']-MZ['z0'], fc='#243447', ec='#4d7ea8', lw=2))
axB.add_patch(Rectangle((MZ['x0'], MZ['z0']), MZ['x1']-MZ['x0'], DEP_Z-MZ['z0'], fc='#2c4a3a', ec='#5ea87e', lw=1.4, hatch='//'))
for seg in [(-14, -12.4), (-9.6, 9.6), (12.4, 14)]:
    axB.plot(seg, [DEP_Z, DEP_Z], color='#e8e2d0', lw=5, solid_capstyle='butt')
axB.plot([-9.5, 9.5], [DEP_Z-1.8, DEP_Z-1.8], color='#c9c2ad', lw=4, solid_capstyle='butt')
for x in (-11, 11): axB.text(x, DEP_Z+1.0, 'porta', color='#e8e2d0', ha='center', fontsize=8)
axB.annotate('chicana', xy=(-4, DEP_Z-1.8), xytext=(-15.5, DEP_Z-3.4), color='#c9c2ad', fontsize=8,
             arrowprops=dict(arrowstyle='->', color='#8b8574'))
axB.text(0, MZ['z0']+0.8, 'DEPÓSITO = RESPAWN DO TIME B  (+3,40 m)', color='#8ee0ab', ha='center', fontsize=10, weight='bold')
for x in (0, -5, 5, -8): axB.plot(x, MZ['z0']+2.4, 'o', ms=12, color='#41d67f', mec=BG, zorder=6)
for seg in [(MZ['x0'], -3), (3, RAMP['x0']), (RAMP['x1'], MZ['x1'])]:
    axB.plot(seg, [MZ['z1'], MZ['z1']], color='#9aa7b4', lw=4, solid_capstyle='butt')
axB.plot([MZ['x0'], MZ['x0']], [MZ['z0'], MZ['z1']], color='#9aa7b4', lw=3)
axB.plot([MZ['x1'], MZ['x1']], [MZ['z0'], MZ['z1']], color='#9aa7b4', lw=3)
axB.text(0, MZ['z1']+1.1, 'guarda-corpo (colide) — vão de carga no meio, vão da escada à direita',
         color='#9aa7b4', ha='center', fontsize=8)
axB.text(-13.2, MZ['z1']-1.1, 'SACADA (perch de sniper)', color='#8fc0e0', fontsize=9, weight='bold')
axB.add_patch(Rectangle((8, -35), 6, 10, fc='none', ec='#b04a4a', lw=1.5, ls=':'))
axB.text(14.6, -34.4, 'pegada da\nescada ANTIGA', color='#c96a6a', fontsize=8, va='top')
for k in range(1, ESC['n']+1):
    z0 = RAMP['z1'] - k*ESC['piso']
    t = 0.32 + 0.6*k/ESC['n']
    axB.add_patch(Rectangle((RAMP['x0'], z0), ESC['larg'], ESC['piso'], fc=(t*0.62, t*0.55, t*0.22), ec='#20242a', lw=.4))
for sx in (RAMP['x0']-0.05, RAMP['x1']+0.05):
    axB.plot([sx, sx], [RAMP['z0'], RAMP['z1']], color='#ffd764', lw=2.4)
axB.annotate('', xy=(9.5, RAMP['z0']+0.3), xytext=(9.5, RAMP['z1']-0.3),
             arrowprops=dict(arrowstyle='-|>', color='#fff0b0', lw=2.2))
axB.text(11.6, -27.5, 'ESCADA NOVA', color='#ffd764', fontsize=9, weight='bold')
axB.set_xlim(-16.5, 22); axB.set_ylim(-23.5, -43)
axB.set_xlabel('x (m)', color='#6d7a88'); axB.set_ylabel('z (m)', color='#6d7a88')
axB.set_title('zoom: mezanino, depósito (respawn) e a escada', color='#dfe6ee', fontsize=10)

fig.text(0.548, 0.275,
         'ESCADA — antes  →  depois   (medido por raycast na geometria construída)\n'
         '  corrida × largura   10,00 × 6,00 m      →   5,80 × 2,60 m (2,35 m livres entre corrimãos)\n'
         '  espelho             20,3 cm             →   17,0 cm        [norma 16-19]\n'
         '  piso                57,8 cm             →   29,1 cm        [norma 25-32]\n'
         '  2·espelho + piso    98,3 cm             →   63,1 cm        [Blondel 62-66]\n'
         '  inclinação          19,3° (é rampa)     →   31,6°          [25-40]\n'
         '  desvio pé↔degrau    11,1 cm             →   1,5 cm         [≤ 10]\n'
         '  mezanino alcançado a pé  0 células      →   3438 células · A* sobe · 82 waypoints',
         color='#c9d3de', fontsize=9.2, family='monospace', va='top')
fig.text(0.548, 0.105,
         'RESPAWN DA LOJA — antes  →  depois\n'
         '  chão do spawn B     0,00 m (térreo)     →   3,40 m (mezanino)\n'
         '  visto de ≥ 25 m     1,5% dos pontos     →   0,0%\n'
         '  maior visada        36,9 m              →   0 m',
         color='#8ee0ab', fontsize=9.2, family='monospace', va='top')

fig.suptitle('loja_h — o respawn da loja subiu pro ANDAR DE CIMA, a escada virou escada, as bandeiras se espalharam\n'
             'todos os números medidos em tools/eval/map-check.mjs (invariantes MAP1/MAP2/MAP3/CTF1)',
             color='#dfe6ee', fontsize=12.5, y=0.975)
plt.savefig('/tmp/w3/tools/eval/havan-planta.png', facecolor=BG)
print('ok')
