#!/usr/bin/env python3
"""
Protótipo de LAYOUT do mapa FAVELA — grafo antes da geometria.

POR QUE ESTE ARQUIVO EXISTE
O CHANGELOG do repo tem a mesma classe de bug se repetindo: "bandeiras CTF re-espaçadas
(inalcançáveis)", "snipers do mezanino -> chão (não dava pra subir pra pegar)", "bots não
exploram o mapa todo". São todos problemas de GRAFO descobertos DEPOIS de a geometria existir,
quando consertar é caro. Este script inverte a ordem: desenha o grafo primeiro, mede, e só
depois vale a pena modelar.

O QUE ELE MEDE
  1. conectividade  — o mapa é uma peça só? tem ilha?
  2. simetria       — os dois spawns têm o mesmo custo até cada bandeira? (CTF justo)
  3. chokepoints    — betweenness: por onde todo mundo passa (= onde a briga acontece)
  4. pontos de corte— articulação: um nó que, removido, parte o mapa em dois (= rota única)
  5. verticalidade  — DUAS superfícies andáveis no mesmo (x,z)? o grafo do jogo é 2D e não
                      sabe distinguir. Sobreposição aqui = bug garantido lá.

USO
  python3 tools/mapdesign/favela.py            imprime o relatório
  python3 tools/mapdesign/favela.py --svg out.svg   desenha a planta vista de cima
"""
import sys, math, json
from collections import defaultdict
import networkx as nx

STEP = 3.4          # mesmo passo de grade dos mapas existentes (map_ferrovelho.js:1647)
BOT_R = 1.24        # despenetração de bot (game.js: BOT_BODY_R) — largura mínima útil
MAX_STEP_UP = 0.55  # degrau que o _collide do jogador/bot vence sem pular

# ---------------------------------------------------------------- LAYOUT
# Cada região é um retângulo andável com uma ALTURA. y é o piso.
# Convenção do repo: +z = sul (spawn P costuma ficar no +z), -z = norte.
# A favela SOBE de sul (asfalto, y=0) para norte (campinho, y=14).
# passo = espaçamento dos waypoints DAQUELA região. Rampa forte exige passo menor, senão o
# degrau entre nós vizinhos passa de MAX_STEP_UP e a aresta nem é criada (mapa parte).
# Regra: passo <= MAX_STEP_UP / rampa.  Com passo 3.4 m a rampa máxima é 16,2%.
REGIOES = [
    # nome                x0    x1    z0    z1    y0     y1   passo
    ("ASFALTO",         -46,   46,   36,   46,   0.0,  0.0,  3.4),  # rua principal (respawn P)
    ("PONTO_ONIBUS",    -32,  -20,   30,   36,   0.0,  0.0,  3.4),
    ("BAR",             -10,    4,   30,   36,   0.0,  0.0,  3.4),
    ("COMERCIOS",        16,   34,   30,   36,   0.0,  0.0,  3.4),
    ("INTERSECCAO",      -9,    9,   22,   37,   0.0,  1.6,  3.4),  # barricadas + carro do BOPE
    ("RUA_QUE_SOBE",     -6,    6,  -14,   22,   1.0,  6.4,  3.4),  # 15% — dentro do limite
    ("BECO_OESTE",      -26,   -6,    7,   12,   2.6,  4.4,  1.0),  # estreito e íngreme
    ("BECO_LESTE",        7,   24,   -2,    3,   5.0,  6.2,  1.0),
    ("PRACA",           -28,   -8,  -14,    6,   4.2,  6.2,  3.4),  # praça com fonte
    ("ESCADA_PRACA",    -15,   -9,  -24,  -14,   6.4, 11.0,  1.1),  # 46% — passo denso
    ("ESCADA_RUA",        0,    6,  -26,  -14,   6.4, 11.0,  1.1),  # 38% — passo denso
    ("PATAMAR",         -20,   16,  -34,  -26,  11.0, 11.4,  3.4),
    ("CAMPINHO",        -26,   22,  -62,  -34,  11.6, 12.0,  3.4),  # respawn B
]

# LIGAÇÕES EXPLÍCITAS ("off-mesh links"): costuram regiões que a grade não consegue inferir
# porque a fronteira entre elas tem degrau ou vão. É assim que engine de verdade resolve
# escada e pulo — não dá para deduzir da grade.
LIGACOES = [
    ("INTERSECCAO",   "RUA_QUE_SOBE"),
    ("RUA_QUE_SOBE",  "BECO_OESTE"),
    ("RUA_QUE_SOBE",  "BECO_LESTE"),
    ("BECO_OESTE",    "PRACA"),
    ("PRACA",         "ESCADA_PRACA"),
    ("RUA_QUE_SOBE",  "ESCADA_RUA"),
    ("BECO_LESTE",    "ESCADA_RUA"),
    ("ESCADA_PRACA",  "PATAMAR"),
    ("ESCADA_RUA",    "PATAMAR"),
    ("PATAMAR",       "CAMPINHO"),
    ("ASFALTO",       "PONTO_ONIBUS"), ("ASFALTO", "BAR"), ("ASFALTO", "COMERCIOS"),
    ("ASFALTO",       "INTERSECCAO"),
]
LIG_MAX = 8.0   # só costura pares de nós a até 6 m um do outro (evita teleporte)

SPAWNS = {"P": (0.0, 42.0), "B": (-2.0, -52.0)}
# bandeiras equilibradas: 1 perto de cada spawn + 2 no miolo disputado
BANDEIRAS = [
    ("A", "ASFALTO",   26.0,  38.0),
    ("B", "BECO",     -16.0,   9.5),
    ("P", "PRAÇA",    -19.0,  -4.0),
    ("C", "CAMPINHO",  -2.0, -40.0),
]

# ---------------------------------------------------------------- construção
def altura(nome, x, z):
    for n, x0, x1, z0, z1, y0, y1, _p in REGIOES:
        if n != nome: continue
        t = 0.0 if z1 == z0 else (z1 - z) / (z1 - z0)   # sobe indo pro norte (-z)
        return y0 + (y1 - y0) * max(0.0, min(1.0, t))
    return 0.0

def rampas():
    """rampa de cada região e se o passo escolhido dá conta."""
    out = []
    for nome, x0, x1, z0, z1, y0, y1, passo in REGIOES:
        run = abs(z1 - z0) or 1e-9
        g = abs(y1 - y0) / run
        out.append((nome, g, passo, g * passo, g * passo <= MAX_STEP_UP + 1e-6))
    return out

def construir():
    nos, meta = [], []
    for nome, x0, x1, z0, z1, y0, y1, passo in REGIOES:
        gx = x0 + passo / 2
        while gx <= x1:
            gz = z0 + passo / 2
            while gz <= z1:
                nos.append((gx, gz, altura(nome, gx, gz)))
                meta.append(nome)
                gz += passo
            gx += passo
    G = nx.Graph()
    for i, (x, z, y) in enumerate(nos):
        G.add_node(i, x=x, z=z, y=y, reg=meta[i])

    porreg = defaultdict(list)
    for i, m in enumerate(meta): porreg[m].append(i)
    passo_de = {r[0]: r[7] for r in REGIOES}

    # arestas DENTRO de cada região, com a vizinhança proporcional ao passo dela
    for reg, ids in porreg.items():
        lim = passo_de[reg] ** 2 * 2.4
        for a in range(len(ids)):
            i = ids[a]; xi, zi, yi = nos[i]
            for b in range(a + 1, len(ids)):
                j = ids[b]; xj, zj, yj = nos[j]
                d2 = (xi - xj) ** 2 + (zi - zj) ** 2
                if d2 > lim or abs(yi - yj) > MAX_STEP_UP + 1e-6: continue
                G.add_edge(i, j, w=math.sqrt(d2 + (yi - yj) ** 2), tipo='grade')

    # LIGAÇÕES explícitas entre regiões: costura o par de nós mais próximo (e os vizinhos
    # dele dentro de LIG_MAX) respeitando o mesmo teto de degrau.
    faltando = []
    for ra, rb in LIGACOES:
        melhor = None; n = 0
        for i in porreg.get(ra, []):
            xi, zi, yi = nos[i]
            for j in porreg.get(rb, []):
                xj, zj, yj = nos[j]
                d = math.dist((xi, zi), (xj, zj))
                if d > LIG_MAX or abs(yi - yj) > MAX_STEP_UP + 1e-6: continue
                G.add_edge(i, j, w=math.sqrt(d * d + (yi - yj) ** 2), tipo='ligacao'); n += 1
                if melhor is None or d < melhor: melhor = d
        if not n: faltando.append((ra, rb))
    return G, nos, meta, faltando

def no_mais_perto(G, x, z):
    return min(G.nodes, key=lambda i: (G.nodes[i]["x"] - x) ** 2 + (G.nodes[i]["z"] - z) ** 2)

# ---------------------------------------------------------------- relatório
def main():
    G, nos, meta, faltando = construir()
    print(f"NÓS {G.number_of_nodes()}  ARESTAS {G.number_of_edges()}\n")
    print("=" * 62)
    print(f"0. RAMPA — a grade suporta no máximo {MAX_STEP_UP/STEP:.1%} com passo {STEP} m")
    print(f"   {'região':<16}{'rampa':>8}{'passo':>8}{'degrau':>9}")
    for nome, g, passo, degrau, ok in rampas():
        print(f"   {nome:<16}{g:7.1%}{passo:7.1f}m{degrau:8.2f}m  {'OK' if ok else 'QUEBRA'}")
    if faltando:
        print("   ✗ ligações declaradas que NÃO costuraram (regiões longe ou degrau alto):")
        for a, b in faltando: print(f"     {a} <-> {b}")

    # 1. conectividade
    comps = sorted(nx.connected_components(G), key=len, reverse=True)
    print("=" * 62)
    print(f"1. CONECTIVIDADE — {len(comps)} componente(s)")
    if len(comps) > 1:
        print("   ✗ MAPA PARTIDO. Regiões por componente:")
        for k, c in enumerate(comps):
            regs = sorted({meta[i] for i in c})
            print(f"     comp {k} ({len(c):3} nós): {', '.join(regs)}")
        print("   → bot no componente errado nunca alcança a bandeira do outro.")
    else:
        print("   ✓ peça única — todo ponto alcança todo ponto")
    Gp = G.subgraph(comps[0]).copy()

    # 2. simetria de CTF
    print("\n" + "=" * 62)
    print("2. SIMETRIA DE CTF — custo de cada spawn até cada bandeira")
    sp = {k: no_mais_perto(Gp, *v) for k, v in SPAWNS.items()}
    dP = nx.single_source_dijkstra_path_length(Gp, sp["P"], weight="w")
    dB = nx.single_source_dijkstra_path_length(Gp, sp["B"], weight="w")
    print(f"   {'bandeira':<12} {'de P':>8} {'de B':>8} {'viés':>9}")
    pior = 0
    for bid, nome, x, z in BANDEIRAS:
        n = no_mais_perto(Gp, x, z)
        a, b = dP.get(n), dB.get(n)
        if a is None or b is None:
            print(f"   {nome:<12} {'INALCANÇÁVEL':>18}  ✗"); pior = 999; continue
        vies = (a - b) / max(a, b)
        pior = max(pior, abs(vies))
        flag = "✓" if abs(vies) < 0.20 else ("~" if abs(vies) < 0.35 else "✗ DESEQUILIBRADA")
        print(f"   {nome:<12} {a:7.1f}m {b:7.1f}m {vies:+8.0%}  {flag}")
    print(f"   pior viés: {pior:.0%}   (alvo < 20%)")

    # 3. chokepoints
    print("\n" + "=" * 62)
    print("3. CHOKEPOINTS — betweenness (por onde todo mundo passa)")
    bt = nx.betweenness_centrality(Gp, weight="w", k=min(240, Gp.number_of_nodes()), seed=7)
    porreg = defaultdict(float)
    for i, v in bt.items(): porreg[Gp.nodes[i]["reg"]] += v
    for r, v in sorted(porreg.items(), key=lambda kv: -kv[1])[:6]:
        print(f"   {r:<16} {v:6.2f}  {'█' * int(v * 40)}")
    print("   → as 2 primeiras são onde a briga vai acontecer. Projete cover e rota alternativa AÍ.")

    # 4. pontos de corte
    print("\n" + "=" * 62)
    print("4. PONTOS DE CORTE — nó que, removido, PARTE o mapa")
    arts = list(nx.articulation_points(Gp))
    if not arts:
        print("   ✓ nenhum — toda região tem pelo menos 2 rotas")
    else:
        pr = defaultdict(int)
        for i in arts: pr[Gp.nodes[i]["reg"]] += 1
        print(f"   ✗ {len(arts)} nó(s) de articulação:")
        for r, c in sorted(pr.items(), key=lambda kv: -kv[1]):
            print(f"     {r:<16} {c:3} nós  → rota ÚNICA; se travar ali, o mapa quebra em dois")

    # 5. verticalidade — o problema que o grafo 2D do jogo NÃO vê
    print("\n" + "=" * 62)
    print("5. VERTICALIDADE — superfícies empilhadas no mesmo (x,z)")
    print("   O grafo do jogo é 2D (map_*.js: nodes = {x,z}, sem y). Duas superfícies")
    print("   andáveis no mesmo XZ colapsam no MESMO nó — o bot atravessa o chão.")
    cel = defaultdict(list)
    for i in Gp.nodes:
        cel[(round(Gp.nodes[i]["x"] / STEP), round(Gp.nodes[i]["z"] / STEP))].append(i)
    sobrepostas = {k: v for k, v in cel.items() if len({round(Gp.nodes[i]["y"], 1) for i in v}) > 1}
    if not sobrepostas:
        print("   ✓ layout MONOTÔNICO — nenhum XZ tem dois pisos. O grafo 2D atual serve,")
        print("     desde que os nós amostrem groundHeightAt(x,z) para a altura.")
    else:
        print(f"   ✗ {len(sobrepostas)} célula(s) XZ com mais de um piso:")
        for k, v in list(sobrepostas.items())[:8]:
            regs = sorted({Gp.nodes[i]['reg'] for i in v})
            ys = sorted({round(Gp.nodes[i]['y'], 1) for i in v})
            print(f"     ({k[0]*STEP:6.1f},{k[1]*STEP:6.1f})  y={ys}  {regs}")
        print("   → OU o grafo do jogo vira 3D, OU o layout perde a sobreposição.")

    # 6. largura dos becos
    print("\n" + "=" * 62)
    print(f"6. LARGURA — beco mais estreito que {BOT_R*2:.1f} m entala bot (BOT_BODY_R)")
    for nome, x0, x1, z0, z1, y0, y1, _p in REGIOES:
        larg = min(x1 - x0, z1 - z0)
        if larg < BOT_R * 2 + 1.0:
            print(f"   ✗ {nome:<16} {larg:5.1f} m  → alarga para >= {BOT_R*2+1.0:.1f} m")
    print("   (o resto passa)")

    if "--svg" in sys.argv:
        caminho = sys.argv[sys.argv.index("--svg") + 1]
        svg(Gp, bt, arts, caminho)
        print(f"\nplanta salva em {caminho}")

def svg(G, bt, arts, caminho):
    xs = [G.nodes[i]["x"] for i in G.nodes]; zs = [G.nodes[i]["z"] for i in G.nodes]
    ys = [G.nodes[i]["y"] for i in G.nodes]
    x0, x1, z0, z1 = min(xs) - 6, max(xs) + 6, min(zs) - 6, max(zs) + 6
    S = 7.0
    W, H = (x1 - x0) * S, (z1 - z0) * S
    px = lambda x: (x - x0) * S
    pz = lambda z: (z - z0) * S
    ymin, ymax = min(ys), max(ys)
    def cor(y):
        t = (y - ymin) / max(0.001, ymax - ymin)
        return f"rgb({int(40+150*t)},{int(70+90*(1-t))},{int(120-60*t)})"
    o = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W:.0f}" height="{H:.0f}" viewBox="0 0 {W:.0f} {H:.0f}">',
         f'<rect width="100%" height="100%" fill="#0d1117"/>']
    for a, b in G.edges:
        o.append(f'<line x1="{px(G.nodes[a]["x"]):.1f}" y1="{pz(G.nodes[a]["z"]):.1f}" '
                 f'x2="{px(G.nodes[b]["x"]):.1f}" y2="{pz(G.nodes[b]["z"]):.1f}" stroke="#2a3441" stroke-width="1"/>')
    bmax = max(bt.values()) or 1
    arts_s = set(arts)
    for i in G.nodes:
        n = G.nodes[i]
        r = 2.2 + 7.0 * (bt.get(i, 0) / bmax)
        borda = ' stroke="#ff4d4d" stroke-width="2"' if i in arts_s else ''
        o.append(f'<circle cx="{px(n["x"]):.1f}" cy="{pz(n["z"]):.1f}" r="{r:.1f}" fill="{cor(n["y"])}"{borda}/>')
    for k, (x, z) in SPAWNS.items():
        o.append(f'<circle cx="{px(x):.1f}" cy="{pz(z):.1f}" r="13" fill="none" stroke="#ffd400" stroke-width="3"/>'
                 f'<text x="{px(x):.1f}" y="{pz(z)+5:.1f}" fill="#ffd400" font-size="15" font-family="monospace" text-anchor="middle">{k}</text>')
    for bid, nome, x, z in BANDEIRAS:
        o.append(f'<rect x="{px(x)-7:.1f}" y="{pz(z)-7:.1f}" width="14" height="14" fill="none" stroke="#f0f6fc" stroke-width="2"/>'
                 f'<text x="{px(x):.1f}" y="{pz(z)-12:.1f}" fill="#f0f6fc" font-size="12" font-family="monospace" text-anchor="middle">{nome}</text>')
    for nome, ax0, ax1, az0, az1, ay0, ay1, _p in REGIOES:
        o.append(f'<text x="{px((ax0+ax1)/2):.1f}" y="{pz((az0+az1)/2):.1f}" fill="#8b98a5" font-size="11" '
                 f'font-family="monospace" text-anchor="middle" opacity="0.85">{nome}</text>')
    o.append(f'<text x="14" y="24" fill="#8b98a5" font-size="13" font-family="monospace">'
             f'FAVELA — planta do grafo · cor = altura ({ymin:.0f}-{ymax:.0f} m) · tamanho = betweenness · vermelho = ponto de corte</text>')
    o.append('</svg>')
    open(caminho, "w").write("\n".join(o))

if __name__ == "__main__":
    main()
