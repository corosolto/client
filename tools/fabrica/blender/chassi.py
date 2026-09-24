"""Fábrica — medição do chassi (zona de contato e âncoras da zona livre).

Uso (chamado por tools/fabrica/chassi.mjs):
  Blender -b --python tools/fabrica/blender/chassi.py -- <entrada.json> <saida.json>

Tudo é medido no espaço da RAIZ da arma (SOCKET_WEAPON_*, o nó que cavalga o
ik_hand_gun), em centímetros, na pose de idle do próprio pack. Os eixos são
conferidos, não assumidos: frente = lado da boca (longe da mão forte, pela
geometria); cima = o lado em que o AimPoint do prefab cai no alto da arma.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
import montar  # noqa: E402  (mesma importação/solda da montagem)


MOVEIS = {"mag", "bolt", "charge", "charginghandle", "pump", "slider", "cartridge", "cartridgebed",
          "trigger", "dustcover", "safety", "fireselector", "boltrelease", "magrelease", "gauge", "hammer",
          "drum", "barrel"}


def caixa(pontos):
    if not pontos:
        return None
    mn = Vector((min(p.x for p in pontos), min(p.y for p in pontos), min(p.z for p in pontos)))
    mx = Vector((max(p.x for p in pontos), max(p.y for p in pontos), max(p.z for p in pontos)))
    return {"min": [round(v, 3) for v in mn], "max": [round(v, 3) for v in mx], "n": len(pontos)}


def r3(v):
    return [round(float(c), 3) for c in v]


def main():
    argv = sys.argv[sys.argv.index("--") + 1:]
    entrada = json.loads(Path(argv[0]).read_text(encoding="utf-8"))
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bracos = montar.importar_fbx(str(Path(entrada["personagem"]) / "SK_Arms_Mono.fbx"))
    rig_b = montar.armadura(bracos)
    rig_b.name = "RIG_FP_ARMS"
    if rig_b.animation_data:
        rig_b.animation_data_clear()
    idle = montar.transferir_acao(entrada["poseFbx"], rig_b, "idle")
    bpy.context.scene.frame_set(int(idle["quadros"][0]))
    bpy.context.view_layer.update()

    arma = montar.importar_fbx(entrada["armaFbx"])
    rig_a = montar.armadura(arma)
    if rig_a.animation_data:
        rig_a.animation_data_clear()
    for pb in rig_a.pose.bones:
        pb.matrix_basis = Matrix.Identity(4)
    raiz = montar.raiz_da_arma(arma, rig_a, "CHASSI")
    montar.pendurar_no_osso(raiz, rig_b, "ik_hand_gun")
    bpy.context.view_layer.update()
    para_raiz = raiz.matrix_world.inverted()

    # Vértices da arma no espaço da raiz, com o osso dominante de cada um.
    por_osso, estaticos, todos = {}, [], []
    for o in arma:
        if o.type != "MESH":
            continue
        grupos = {g.index: g.name for g in o.vertex_groups}
        m = para_raiz @ o.matrix_world
        for v in o.data.vertices:
            p = m @ v.co
            todos.append(p)
            pesos = sorted(((g.weight, grupos.get(g.group)) for g in v.groups if g.weight > 0.01), reverse=True)
            # Todo vértice com peso num osso do pack é peça móvel/solta (pente, clipe de munição,
            # cartucho); a carcaça do pack não tem peso. MOVEIS fica como documentação.
            if pesos and pesos[0][1]:
                por_osso.setdefault(pesos[0][1], []).append(p)
            else:
                estaticos.append(p)

    def osso_raiz(nome):
        pb = rig_b.pose.bones[nome]
        return para_raiz @ (rig_b.matrix_world @ pb.head)

    def palma(lado):
        pts = [osso_raiz(f"hand_{lado}")] + [osso_raiz(f"{d}_01_{lado}") for d in ("index", "middle", "ring", "pinky")]
        return sum(pts, Vector()) / len(pts)

    mao_forte, mao_apoio = palma("r"), palma("l")
    geral = caixa(todos)

    # Eixos pela geometria: a boca é o extremo em Y mais longe da mão forte.
    y_min, y_max = geral["min"][1], geral["max"][1]
    frente = Vector((0, 1, 0)) if abs(y_max - mao_forte.y) > abs(mao_forte.y - y_min) else Vector((0, -1, 0))
    # Cima: o AimPoint do prefab fica sempre no alto da arma (linha de visada). Com
    # +Z como cima ele cai perto do topo; com -Z, perto do fundo — vale o mais perto.
    # (A heurística antiga "pente abaixo da palma" virava G3/Mk14/SVD/MPS5/M1911: o punho
    # desce mais que o pente.)
    pente = por_osso.get("Mag") or por_osso.get("mag")
    alto = 100.0 * entrada.get("aimUp", 0.0)
    est = caixa(estaticos) or geral   # carcaça: a munição solta do Kar98K flutua acima
    cima = Vector((0, 0, 1)) if abs(alto - est["max"][2]) <= abs(-alto - est["min"][2]) else Vector((0, 0, -1))

    def fatia(pontos, eixo_val, largura=1.5):
        return [p for p in pontos if abs(p.dot(frente) - eixo_val) <= largura]

    extremo = max(p.dot(frente) for p in estaticos)
    ponta = fatia(estaticos, extremo - 1.0, 1.2)
    boca = Vector((sum(p.x for p in ponta) / len(ponta), extremo * frente.y, sum(p.z for p in ponta) / len(ponta)))

    # Coronha: 12 cm atrás da mão forte, na altura média da geometria estática daquela fatia.
    y_cor = mao_forte.dot(frente) - 12.0
    sec_cor = fatia(estaticos, y_cor, 2.0)
    coronha = Vector((0.0, y_cor * frente.y, (sum(p.z for p in sec_cor) / len(sec_cor)) if sec_cor else mao_forte.z))
    traseira = min(p.dot(frente) for p in estaticos)

    # Topo: acima do poço do pente, no ponto mais alto da geometria estática.
    y_poco = (sum(p.dot(frente) for p in pente) / len(pente)) if pente else mao_forte.dot(frente) + 8.0
    sec_topo = fatia(estaticos, y_poco, 2.0)
    topo = Vector((0.0, y_poco * frente.y, max((p.dot(cima) for p in sec_topo), default=0.0) * cima.z))

    # Guarda-mão: da mão de apoio até 4 cm antes da boca, na altura do cano.
    y_apoio = mao_apoio.dot(frente)
    guarda = [p for p in estaticos if y_apoio - 6.0 <= p.dot(frente) <= extremo - 4.0]

    contato = {
        "maoForte": {"palmaCm": r3(mao_forte), "raioCm": 7.0,
                      "caixa": caixa([p for p in todos if (p - mao_forte).length <= 7.0])},
        "maoApoio": {"palmaCm": r3(mao_apoio), "raioCm": 7.0,
                      "caixa": caixa([p for p in todos if (p - mao_apoio).length <= 7.0])},
        "ossosMoveis": {nome: caixa(pts) for nome, pts in sorted(por_osso.items())},
    }
    ancoras = {
        "boca": {"raizCm": r3(boca), "origem": "extremo estático no eixo do cano"},
        "coronha": {"raizCm": r3(coronha), "origem": "12 cm atrás da palma forte, altura média da fatia",
                    "traseiraCm": round(traseira, 3)},
        "trilhoSuperior": {"raizCm": r3(topo), "origem": "ponto mais alto da fatia sobre o poço do pente"},
        "guardaMao": {"caixa": caixa(guarda), "origem": "estático entre a mão de apoio (-6 cm) e a boca (-4 cm)"},
    }
    saida = {
        "schemaVersion": 1,
        "unidade": "cm no espaço da raiz da arma (SOCKET_WEAPON_*), pose de idle do pack",
        "eixos": {"frente": r3(frente), "cima": r3(cima), "direita": r3(frente.cross(cima))},
        "geral": geral,
        "estatico": caixa(estaticos),
        "zonaContato": contato,
        "ancoras": ancoras,
        "ossosArma": [b.name for b in rig_a.data.bones],
    }
    Path(argv[1]).write_text(json.dumps(saida, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print("FABRICA_CHASSI=" + argv[1])


if __name__ == "__main__":
    main()
