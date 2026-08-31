"""build_retarget_vm.py — TRILHA C: movimento CS 1.6 nos BRAÇOS DO PACK.

Por que existe (decisão do dono, 31/08): os braços do molde GoldSrc têm 596
triângulos — um cone marrom sem dedos. Os do pack pago têm 24.360 (Cloth 5.180 +
Glove 17.280 + Hand 1.900) com cinco dedos articulados. Nenhuma calibração de
escala conserta 596 triângulos; e o tint por personagem que o jogo já manda
(pele/manga/luva do `pal`) não tem onde aparecer num cone.

O que este builder faz: pega o runtime goldsrc da arma — que JÁ está certo no
que importa (câmera, arma Mint no lugar, pente que sai de verdade, as 6
sequências do QC) — e troca SÓ os braços pelos do pack, retargetando as ações
do rig CS 1.6 para o esqueleto UE do pack.

Por que trocar só os braços: a arma e o pente penduram nos ossos do
`viewmodel_rig`, e essa mecânica é a parte cara que finalmente funciona. Ela
fica intacta: o rig CS 1.6 continua no GLB dirigindo arma e pente (sem malha
nenhuma), e o RIG_FP_ARMS entra ao lado tocando o MESMO movimento.

O mapeamento de ossos é DERIVADO, não tabelado: a palma é o osso que tem cinco
cadeias filhas de três ossos (é assim nos dois rigs), o antebraço é o pai dela,
e os cinco dedos casam por geometria no referencial da palma (Procrustes 5×5 por
força bruta, 120 permutações). Rig CS 1.6 tem nomes genéricos (Bone26, Bone31…);
tabelar isso por arma seria 20 tabelas para manter.

Uso: blender -b --python build_retarget_vm.py -- --arma=ak \
        --goldsrc=<dir goldsrc-vm> --bracos=<glb doador> --saida=<dir>
"""
import argparse
import itertools
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector

BRACOS_MESHES = ("GEO_FP_SK_Cloth_01", "GEO_FP_SK_Glove_01", "GEO_FP_SK_Hand")
RIG_BRACOS = "RIG_FP_ARMS"
RIG_CS = "viewmodel_rig"
DEDOS_UE = ("thumb", "index", "middle", "ring", "pinky")
TESTADO = False  # autoteste da derivação de dedos roda uma vez por build


def parse_args() -> argparse.Namespace:
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument("--arma", required=True)
    p.add_argument("--goldsrc", required=True, type=Path)
    p.add_argument("--bracos", required=True, type=Path)
    p.add_argument("--saida", required=True, type=Path)
    p.add_argument("--diagnostico", action="store_true")
    return p.parse_args(argv)


def limpa_cena():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def importa(caminho: Path):
    antes = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(caminho))
    return [o for o in bpy.data.objects if o not in antes]


def arm_por_nome(prefixo):
    for o in bpy.data.objects:
        if o.type == "ARMATURE" and o.name.split(".")[0] == prefixo:
            return o
    return None


# --------------------------------------------------------------------------
# mapeamento estrutural
# --------------------------------------------------------------------------
def cadeia_de_tres(osso):
    """comprimento da cadeia linear a partir de `osso` (filho único por nível)"""
    n = 1
    atual = osso
    while len(atual.children) == 1:
        atual = atual.children[0]
        n += 1
    return n


def acha_palmas(arm):
    """palma = osso com >=4 filhos que abrem cadeias de >=2 ossos (dedos)."""
    palmas = []
    for b in arm.data.bones:
        cadeias = [c for c in b.children if cadeia_de_tres(c) >= 2]
        if len(cadeias) >= 4:
            palmas.append((b, cadeias))
    return palmas


def ordena_dedos(raizes):
    """Descobre QUAL cadeia é qual dedo pela anatomia, não pela ordem do arquivo.

    O Procrustes 5×5 da primeira versão dava custo 11,5 na mão direita e trocava
    mindinho com indicador: o referencial da palma tem sinal ambíguo e o rig do
    CS 1.6 é ESPELHADO, então o eixo lateral apontava para o lado errado.

    A anatomia não é ambígua: o POLEGAR é o único fora do plano dos outros
    quatro, e os outros quatro ficam em fila — o vizinho do polegar é o
    indicador, o distante é o mindinho. Devolve [polegar, indicador, médio,
    anelar, mindinho]. Autoteste: no rig UE, onde os nomes são conhecidos, esta
    derivação tem que reproduzir os nomes.
    """
    pts = [r.head_local.copy() for r in raizes]
    # polegar = ponto mais fora do plano ajustado pelos outros quatro
    def fora_do_plano(i):
        outros = [p for k, p in enumerate(pts) if k != i]
        c = sum(outros, Vector()) / len(outros)
        n = Vector()
        for a, b in itertools.combinations(outros, 2):
            n += (a - c).cross(b - c)
        if n.length < 1e-12:
            return 0.0
        n.normalize()
        esp = sum(abs((p - c).dot(n)) for p in outros) / len(outros)
        return abs((pts[i] - c).dot(n)) - esp
    polegar = max(range(len(pts)), key=fora_do_plano)
    resto = [i for i in range(len(pts)) if i != polegar]
    # os quatro em fila: projeta no eixo principal deles
    c = sum((pts[i] for i in resto), Vector()) / len(resto)
    eixo = Vector()
    for a, b in itertools.combinations(resto, 2):
        d = pts[a] - pts[b]
        if d.length > eixo.length:
            eixo = d
    if eixo.length < 1e-12:
        eixo = Vector((1, 0, 0))
    eixo.normalize()
    resto.sort(key=lambda i: (pts[i] - c).dot(eixo))
    # direção ancorada no polegar: o mais perto dele é o indicador
    if (pts[resto[-1]] - pts[polegar]).length < (pts[resto[0]] - pts[polegar]).length:
        resto.reverse()
    return [raizes[polegar]] + [raizes[i] for i in resto]


def confere_derivacao_ue(palma, raizes):
    """autoteste: no rig UE os nomes dizem a verdade — a derivação tem que bater."""
    ordem = ordena_dedos(raizes)
    lidos = [r.name.split("_")[0] for r in ordem]
    ok = lidos == list(DEDOS_UE)
    print("CORO_RT_AUTOTESTE=" + json.dumps({"palma": palma.name, "derivado": lidos, "ok": ok}))
    return ok


def cadeia_linear(osso, limite=3):
    out = [osso]
    atual = osso
    while len(atual.children) >= 1 and len(out) < limite:
        atual = atual.children[0]
        out.append(atual)
    return out


def monta_mapa(arm_cs, arm_ue, trocar_lados=False):
    """devolve [(nome_cs, nome_ue), ...] — braços, palmas e dedos."""
    palmas_cs = acha_palmas(arm_cs)
    palmas_ue = acha_palmas(arm_ue)
    if len(palmas_cs) != 2 or len(palmas_ue) < 2:
        raise SystemExit(f"palmas: cs={len(palmas_cs)} ue={len(palmas_ue)} — esperado 2")
    # lado: a palma mais à esquerda no eixo X do próprio rig é a "L"
    palmas_ue = [p for p in palmas_ue if p[0].name.endswith(("_l", "_r"))]
    lado_ue = {p[0].name[-1]: p for p in palmas_ue}
    # CS: o rig do viewmodel é canhoto cru; usa X do rest para decidir o par
    palmas_cs.sort(key=lambda p: p[0].head_local.x)
    par = []
    ue_ord = [lado_ue["l"], lado_ue["r"]]
    ue_ord.sort(key=lambda p: p[0].head_local.x)
    if trocar_lados:
        ue_ord.reverse()
    mapa = []
    for (pcs, dcs), (pue, due) in zip(palmas_cs, ue_ord):
        mapa.append((pcs.name, pue.name))                       # palma
        if pcs.parent and pue.parent:
            mapa.append((pcs.parent.name, pue.parent.name))     # antebraço
            if pcs.parent.parent and pue.parent.parent:
                mapa.append((pcs.parent.parent.name, pue.parent.parent.name))
        if not TESTADO and not confere_derivacao_ue(pue, due):
            raise SystemExit(f"derivação de dedos falhou no rig UE ({pue.name}) — não dá para confiar nela no rig CS")
        for raiz_cs, raiz_ue in zip(ordena_dedos(dcs), ordena_dedos(due)):
            for bc, bu in zip(cadeia_linear(raiz_cs), cadeia_linear(raiz_ue)):
                mapa.append((bc.name, bu.name))
        par.append(pue.name)
    print("CORO_RT_DEDOS=" + json.dumps({"maos": par}))
    return mapa


# --------------------------------------------------------------------------
# alinhamento global (Umeyama com escala)
# --------------------------------------------------------------------------
def umeyama(origem, destino, reflexao=False, escala_fixa=None):
    """Similaridade (escala+rotação+translação) que leva `origem` em `destino`.

    A primeira versão trazia um SVD 3×3 escrito à mão (Jacobi em HᵀH) e o
    alinhamento saía errado: a mão retargetada caía a 2,89 comprimentos de arma
    da mão do molde, com erro CONSTANTE no tempo — assinatura de alinhamento, não
    de movimento. O Blender embarca numpy; não há motivo para SVD caseiro.
    """
    import numpy as np
    A = np.array([[p.x, p.y, p.z] for p in origem], dtype=float)
    B = np.array([[p.x, p.y, p.z] for p in destino], dtype=float)
    ca, cb = A.mean(0), B.mean(0)
    Ac, Bc = A - ca, B - cb
    H = Ac.T @ Bc / len(A)
    U, S, Vt = np.linalg.svd(H)
    # O molde CS 1.6 é CANHOTO (o runtime desfaz com mount.scale.x = -1): sem
    # deixar a reflexão entrar, nenhuma similaridade alinha os dois rigs e o
    # resíduo ficava em 94% do comprimento de referência (31/08).
    d = -1.0 if reflexao else float(np.sign(np.linalg.det(Vt.T @ U.T)))
    D = np.diag([1.0, 1.0, d])
    R = Vt.T @ D @ U.T
    if escala_fixa is not None:
        escala = float(escala_fixa)
    else:
        var = (Ac ** 2).sum() / len(A)
        escala = float((S * np.array([1.0, 1.0, d])).sum() / var) if var > 1e-12 else 1.0
    t = cb - escala * (R @ ca)
    M = Matrix.Identity(4)
    for i in range(3):
        for j in range(3):
            M[i][j] = float(R[i][j] * escala)
        M[i][3] = float(t[i])
    return M


def pontos_da_mao(arm, mapa, palma_ue, mundo, lado_cs=None):
    """Quatro pontos que definem a mão: origem da palma e as pontas de três
    eixos anatômicos (médio, indicador→mindinho, normal). Alinhar POR ISSO é o
    que faz "a mão do pack fica como a mão do molde" — o ajuste por nuvem de
    ossos só sabia distância e escolhia hipóteses com a mão fechada no ar."""
    def nome(ue):
        if lado_cs is None:
            return ue
        return next((c for c, u in mapa if u == ue), None)
    suf = palma_ue[-2:]
    alvos = [palma_ue, f"middle_03{suf}", f"index_01{suf}", f"pinky_01{suf}"]
    nomes = [nome(a) for a in alvos]
    if any(n is None for n in nomes):
        return None
    try:
        o, medio, ind, minimo = [mundo(arm, n).to_translation() for n in nomes]
    except KeyError:
        return None
    e1 = (medio - o)
    L = e1.length or 1.0
    e1 = e1.normalized()
    e2 = (ind - minimo)
    e2 = (e2 - e1 * e2.dot(e1))
    if e2.length < 1e-9:
        return None
    e2 = e2.normalized()
    e3 = e1.cross(e2)
    return [o, o + e1 * L, o + e2 * L, o + e3 * L]


def escala_da_mao(arm_cs, arm_ue, mapa, mundo):
    """razão de tamanho de mão (palma → ponta do dedo médio) entre os rigs."""
    razoes = []
    for palma_ue in ("hand_l", "hand_r"):
        par = next((c for c, u in mapa if u == palma_ue), None)
        ponta_ue = next((u for _, u in mapa if u == f"middle_03{palma_ue[-2:]}"), None)
        ponta_cs = next((c for c, u in mapa if u == ponta_ue), None)
        if not (par and ponta_cs):
            continue
        d_cs = (mundo(arm_cs, par).to_translation() - mundo(arm_cs, ponta_cs).to_translation()).length
        d_ue = (mundo(arm_ue, palma_ue).to_translation() - mundo(arm_ue, ponta_ue).to_translation()).length
        if d_ue > 1e-9:
            razoes.append(d_cs / d_ue)
    return sum(razoes) / len(razoes) if razoes else None


def ik_dois_ossos(S, T, l1, l2, polo):
    """Cotovelo de um braço que sai de S e chega em T, com o cotovelo puxado
    para o lado de `polo`. Existe porque arrastar o OMBRO para o osso-raiz do
    rig CS 1.6 (que num v_model fica colado na câmera) esticava o braço da
    câmera até a mão: a manga saía como um tubo do tamanho da arma (QA 31/08).
    O ombro do pack fica onde o pack autorou; só o cotovelo é resolvido."""
    d = (T - S)
    dist = max(1e-6, min(d.length, (l1 + l2) * 0.999))
    dirn = d.normalized()
    # projeção do cotovelo no eixo ombro→mão (lei dos cossenos)
    a = (l1 * l1 - l2 * l2 + dist * dist) / (2 * dist)
    h2 = max(0.0, l1 * l1 - a * a)
    h = h2 ** 0.5
    lado = polo - (S + dirn * (polo - S).dot(dirn))
    if lado.length < 1e-9:
        lado = dirn.orthogonal()
    return S + dirn * a + lado.normalized() * h


def curvas_da_acao(acao):
    """Blender 5.2: ação slotted não tem .fcurves — vem por layers/strips."""
    if getattr(acao, "fcurves", None):
        return list(acao.fcurves)
    out = []
    for slot in getattr(acao, "slots", []):
        bag = acao.layers[0].strips[0].channelbag(slot)
        if bag:
            out.extend(bag.fcurves)
    return out


def ordenar_por_profundidade(arm, mapa):
    """pai antes de filho: cravar a matriz do filho antes do pai daria pose
    errada (o filho seria recalculado quando o pai mudasse)."""
    def prof(nome):
        n, b = 0, arm.data.bones[nome]
        while b.parent:
            b = b.parent
            n += 1
        return n
    return sorted(mapa, key=lambda par: prof(par[1]))


def main():
    args = parse_args()
    limpa_cena()
    scene = bpy.context.scene

    importa(args.goldsrc / f"{args.arma}-runtime.glb")
    arm_cs = arm_por_nome(RIG_CS)
    if not arm_cs:
        raise SystemExit("runtime goldsrc sem viewmodel_rig")
    maos_cs = [o for o in bpy.data.objects if o.type == "MESH" and o.name.split(".")[0] in ("lhand", "rhand")]

    antes_acoes = set(bpy.data.actions)
    novos = importa(args.bracos)
    arm_ue = None
    for o in novos:
        if o.type == "ARMATURE" and o.name.split(".")[0] == RIG_BRACOS:
            arm_ue = o
    if not arm_ue:
        raise SystemExit("doador de braços sem RIG_FP_ARMS")
    # Do doador só interessam o rig e as três malhas de braço — mas a ARMA do
    # doador fica viva até o alinhamento: é ela a âncora (o mesmo objeto Mint
    # existe dos dois lados). Apagá-la antes deixava o alinhamento sem referência
    # e o script morria em "StructRNA has been removed".
    alvo_mint = f"MINT_WEAPON_{args.arma.upper()}"
    descartar = []
    mint_ue = None
    for o in list(novos):
        if o is arm_ue:
            continue
        if o.type == "MESH" and o.name.split(".")[0] in BRACOS_MESHES:
            continue
        if o.name.split(".")[0] == alvo_mint:
            mint_ue = o
            continue
        if o.type == "ARMATURE":
            descartar.append(o)     # RIG_WEAPON: segura a arma do doador
            continue
        bpy.data.objects.remove(o, do_unlink=True)
    # A ação `idle` do doador é a POSE DE REFERÊNCIA: é ela que diz como o rig
    # do pack segura uma arma. Sem ela o retarget só teria o repouso (A-pose de
    # corpo inteiro) para se guiar, e não existe similaridade que leve um A-pose
    # na pose de empunhadura — foi assim que o braço saiu a 2,9 comprimentos de
    # arma da mão (31/08).
    ref_ue = None
    for a in list(bpy.data.actions):
        if a in antes_acoes:
            continue
        if a.name.split("|")[-1].lower().startswith("idle") and ref_ue is None:
            ref_ue = a
            a.name = "REF_idle_bracos"
            a.use_fake_user = True
        else:
            bpy.data.actions.remove(a)
    if ref_ue is None:
        raise SystemExit("doador de braços sem clipe idle — sem pose de referência")
    # A ação do doador anima TAMBÉM o objeto armadura (location/scale do nó
    # glTF). Cada `frame_set` reescrevia o `matrix_world` e desfazia o
    # alinhamento em silêncio: os comprimentos de braço saíam em unidades do
    # doador (0,3) contra alvos em unidades do molde (15) e a IK não alcançava
    # nada (31/08). O movimento do braço mora nos OSSOS; canal de objeto é lixo.
    for fc in list(curvas_da_acao(ref_ue)):
        if not fc.data_path.startswith("pose.bones"):
            for slot in getattr(ref_ue, "slots", []):
                bag = ref_ue.layers[0].strips[0].channelbag(slot)
                if bag and fc in list(bag.fcurves):
                    bag.fcurves.remove(fc)
                    break
            else:
                if getattr(ref_ue, "fcurves", None):
                    ref_ue.fcurves.remove(fc)
    if not arm_ue.animation_data:
        arm_ue.animation_data_create()

    # O importador glTF traz também as TRILHAS NLA do doador: a recarga
    # KINEMATION (reload_empty, 3,13s) vazou para o GLB do retarget na primeira
    # tentativa e o runtime teria dois "reload" concorrendo.
    for arm in (arm_cs, arm_ue):
        if arm.animation_data:
            for t in list(arm.animation_data.nla_tracks):
                arm.animation_data.nla_tracks.remove(t)

    mapa = monta_mapa(arm_cs, arm_ue)
    print("CORO_RT_MAPA=" + json.dumps({"pares": len(mapa), "amostra": mapa[:8]}))
    globals()["TESTADO"] = True
    if args.diagnostico:
        print("CORO_RT_MAPA_COMPLETO=" + json.dumps(mapa))
        return

    # --- alinhamento: as duas POSES DE EMPUNHADURA, não os dois repousos -----
    arm_ue.animation_data.action = ref_ue
    arm_cs.animation_data.action = bpy.data.actions["idle"]
    scene.frame_set(int(round(bpy.data.actions["idle"].frame_range[0])))
    bpy.context.view_layer.update()

    def mundo(arm, nome):
        return arm.matrix_world @ arm.pose.bones[nome].matrix

    # ÂNCORA: a ARMA, que existe dos dois lados. O ajuste por mínimos quadrados
    # sobre 36 ossos inflava a escala (a mão do pack é maior que a do molde) e
    # os braços saíam grandes demais para a arma. O nó `MINT_WEAPON_<ARMA>` é o
    # MESMO objeto nos dois arquivos: a similaridade que leva um no outro é
    # exata, sem ajuste — e ainda entrega o espelho de graça.
    mint_cs = next((o for o in bpy.data.objects
                    if o.name.split(".")[0] == alvo_mint and o is not mint_ue), None)
    # NÃO SERVE como âncora: o rig da arma do doador ficou sem ação (só o `idle`
    # dos braços sobrevive), então a arma dele está em REPOUSO enquanto os braços
    # estão na pose de empunhadura. Alinhar por ela misturava duas poses e jogava
    # os braços para fora do quadro (escala 0,33). Fica registrado para ninguém
    # tentar de novo sem antes preservar a ação da arma do doador.
    A_arma = None
    print("CORO_RT_ANCORA=" + json.dumps({"por": "ossos-do-braco"}))

    # Sem âncora de arma: cai no ajuste por ossos. Quatro hipóteses (lado × reflexão)
    # A armadura e as MALHAS de braço andam juntas. Mover só a armadura fazia o
    # deform aplicar a escala do alinhamento por cima da malha parada: os braços
    # saíam como tubos gigantes no canto do quadro (QA 31/08).
    objs_ue = [arm_ue] + [o for o in bpy.data.objects
                          if o.type == "MESH" and o.find_armature() is arm_ue]
    base_objs = {o: o.matrix_world.copy() for o in objs_ue}

    def poe(M):
        for o in objs_ue:
            o.matrix_world = M @ base_objs[o]
        bpy.context.view_layer.update()

    # nuvem de pontos da ARMA posada: alvo do "encostar"
    corpo = next((o for o in bpy.data.objects if o.type == "MESH"
                  and o.name.split(".")[0].startswith(f"MINT_WEAPON_{args.arma.upper()}")
                  and "MAG" not in o.name.upper()), None)
    if corpo is None:
        corpo = next(o for o in bpy.data.objects
                     if o.type == "MESH" and o.find_armature() is None and "MAG" not in o.name.upper())
    dg = bpy.context.evaluated_depsgraph_get()
    aval = corpo.evaluated_get(dg)
    verts = aval.data.vertices
    passo = max(1, len(verts) // 400)
    nuvem_arma = [corpo.matrix_world @ verts[i].co for i in range(0, len(verts), passo)]
    ref_arma = max((nuvem_arma[0] - v).length for v in nuvem_arma) or 1.0

    base_ue = arm_ue.matrix_world.copy()
    melhor = None
    tabela = []
    ESPELHO = Matrix.Diagonal((-1.0, 1.0, 1.0, 1.0))
    for espelhar in (False, True):
        poe(ESPELHO if espelhar else Matrix.Identity(4))
        for trocar in (False, True):
            cand = monta_mapa(arm_cs, arm_ue, trocar_lados=trocar)
            # Só ombro/antebraço/palma entram no ajuste. Com os 30 ossos de dedo
            # dentro, a mão do pack (maior que a do molde) inflava a escala e os
            # braços saíam grandes demais para a arma (QA 31/08).
            # o ajuste roda sobre os PONTOS ANATÔMICOS das duas mãos
            pts_ue, pts_cs = [], []
            for palma in ("hand_l", "hand_r"):
                a = pontos_da_mao(arm_ue, cand, palma, mundo)
                b = pontos_da_mao(arm_cs, cand, palma, mundo, lado_cs=True)
                if a and b:
                    pts_ue += a
                    pts_cs += b
            if not pts_ue:
                continue
            origem, destino = pts_ue, pts_cs
            # ESCALA FIXA pelo tamanho da MÃO. Deixar o ajuste escolher a escala
            # é o que inflava o braço: com 36 pontos ele minimiza distância, e a
            # mão do pack é maior que a do molde, então ele aumenta tudo. A mão
            # do molde foi autorada PARA ESTA ARMA — é a medida certa.
            s_fixa = escala_da_mao(arm_cs, arm_ue, cand, mundo)
            ref_local = max((destino[0] - d).length for d in destino) or 1.0
            for refl in (False, True):
                Acand = umeyama(origem, destino, reflexao=refl, escala_fixa=s_fixa)
                # CRITÉRIO: as duas mãos têm que ENCOSTAR na arma. O resíduo do
                # ajuste de ossos não sabe disso — ele escolhia hipóteses em que
                # uma das mãos ficava fechada no ar, ao lado da arma (QA 31/08).
                custo = 0.0
                for pu, pc in zip(pts_ue, pts_cs):
                    custo += ((Acand @ pu) - pc).length_squared
                custo = (custo / max(1, len(pts_ue))) ** 0.5 / ref_arma
                tabela.append({"espelho": espelhar, "troca": trocar, "reflexao": refl,
                               "erro_mao": round(custo, 4)})
                if melhor is None or custo < melhor[0]:
                    melhor = (custo, Acand, cand, espelhar, trocar, refl)
    print("CORO_RT_HIPOTESES=" + json.dumps(tabela))
    _, A, mapa, espelhar, trocar, refl = melhor
    E = ESPELHO if espelhar else Matrix.Identity(4)
    if A_arma is not None:
        # a âncora da arma manda; o pareamento de lados continua vindo do ajuste
        A, E = A_arma, Matrix.Identity(4)
    # arma e rig do doador cumpriram o papel de âncora — saem antes do export
    if mint_ue is not None:
        bpy.data.objects.remove(mint_ue, do_unlink=True)
    for o in descartar:
        bpy.data.objects.remove(o, do_unlink=True)
    print("CORO_RT_HIPOTESE=" + json.dumps(
        {"espelho": espelhar, "trocar_lados": trocar, "reflexao": refl, "resid": round(melhor[0], 4)}))
    # QUEM SE MOVE É O PACOTE GOLDSRC, não os braços.
    #
    # Com a escala do alinhamento (22×) no transform de OBJETO da armadura de
    # braços, o Blender renderizava as duas mãos na arma e o three.js subia o
    # braço esquerdo: malha skinada compõe bindMatrix com a matriz do objeto, e
    # as duas engines não fazem isso igual. Congelar nos dados (transform_apply)
    # conserta a engine mas destrói a pose de referência — as translações em
    # espaço de osso não sobrevivem ao bake de escala (erro de mão 0,09 → 1,21).
    #
    # A saída é escalar o outro lado: a armadura do molde CS não tem MAIS malha
    # skinada nenhuma (as mãos de 596 tris saem), só arma e pente pendurados em
    # ossos. Mover esse pacote não tem bind para divergir. Os braços ficam em
    # identidade, que é o único estado em que Blender e three.js concordam.
    inv = (A @ E).inverted()
    for o in list(bpy.data.objects):
        if o in objs_ue or o.parent is not None:
            continue
        o.matrix_world = inv @ o.matrix_world
    bpy.context.view_layer.update()
    escala = 1.0 / max(1e-9, (A.to_scale().x + A.to_scale().y + A.to_scale().z) / 3)
    # erro do ALINHAMENTO em repouso: se isto não for pequeno, nada depois presta
    ref = max((mundo(arm_cs, c).to_translation() - mundo(arm_cs, mapa[0][0]).to_translation()).length
              for c, _ in mapa) or 1.0
    resto = 0.0
    for nome_cs, nome_ue in mapa:
        resto = max(resto, (mundo(arm_cs, nome_cs).to_translation()
                            - mundo(arm_ue, nome_ue).to_translation()).length / ref)
    print("CORO_RT_ALINHA=" + json.dumps({"escala": round(escala, 4), "erro_referencia": round(resto, 4)}))

    # --- correção por osso: leva os eixos do osso CS nos eixos do osso UE ----
    # NA POSE DE REFERÊNCIA. É isto que faz "CS no idle" virar "pack no idle"
    # em vez de "pack no A-pose": a transferência é ABSOLUTA, não delta.
    corr = {}
    for nome_cs, nome_ue in mapa:
        corr[nome_ue] = mundo(arm_cs, nome_cs).inverted() @ mundo(arm_ue, nome_ue)

    # --- retarget das 6 ações ------------------------------------------------
    # Transfere ROTAÇÃO, não posição: as proporções do braço do pack não são as
    # do molde CS 1.6, e cravar a matriz de mundo osso a osso ESTICA o braço
    # (o filho tem offset próprio). A raiz da cadeia leva também a translação,
    # para o conjunto ir parar onde o molde manda.
    ordem = ordenar_por_profundidade(arm_ue, mapa)
    # Braço (ombro, antebraço, palma) leva POSIÇÃO além de rotação; dedos levam só
    # rotação. Só-rotação em tudo mantinha o comprimento do braço do pack e a mão
    # parava a ~1 comprimento de arma do cabo (erro constante no tempo, 31/08).
    # O antebraço "estica" para alcançar — some sob a manga e é o preço padrão de
    # retarget de viewmodel; os dedos, que a câmera vê de perto, ficam intactos.
    raizes_cadeia = {ue for _, ue in mapa
                     if ue.startswith(("upperarm", "lowerarm", "hand"))}
    inv_ue = arm_ue.matrix_world.inverted()
    # ombro FIXO na pose de referência do pack e comprimentos de braço do pack:
    # é o que mantém a proporção do braço AAA em vez de esticá-lo até a mão.
    ombro_fixo, comprimentos, proximal_cs = {}, {}, {}
    arm_ue.animation_data.action = ref_ue
    arm_cs.animation_data.action = bpy.data.actions["idle"]
    scene.frame_set(int(round(bpy.data.actions["idle"].frame_range[0])))
    bpy.context.view_layer.update()
    for lado in ("l", "r"):
        S = mundo(arm_ue, f"upperarm_{lado}").to_translation()
        E = mundo(arm_ue, f"lowerarm_{lado}").to_translation()
        W = mundo(arm_ue, f"hand_{lado}").to_translation()
        ombro_fixo[lado] = S
        comprimentos[lado] = ((E - S).length, (W - E).length)
        proximal_cs[lado] = next(c for c, u in mapa if u == f"lowerarm_{lado}")
    print("CORO_RT_BRACO=" + json.dumps({
        "comprimentos": {lado: [round(a, 3), round(b, 3)] for lado, (a, b) in comprimentos.items()},
        "ombro": {lado: [round(v, 2) for v in ombro_fixo[lado]] for lado in ombro_fixo},
        "mao_cs": {lado: [round(v, 2) for v in mundo(arm_cs, next(c for c, u in mapa if u == f"hand_{lado}")).to_translation()]
                   for lado in ("l", "r")},
        "escala_alinha": round(escala, 3),
        "mw_ue": [round(v, 3) for v in arm_ue.matrix_world.to_scale()],
        "mw_ue_t": [round(v, 2) for v in arm_ue.matrix_world.to_translation()]}))
    feitas = []
    for acao in [a for a in bpy.data.actions if not a.name.startswith(("RT_", "REF_"))]:
        curvas = curvas_da_acao(acao)
        xs = [k.co.x for fc in curvas for k in fc.keyframe_points]
        if not xs:
            continue
        f0, f1 = int(round(min(xs))), int(round(max(xs)))
        arm_cs.animation_data.action = acao
        alvo = bpy.data.actions.new(f"RT_{acao.name}")
        arm_ue.animation_data.action = alvo
        for f in range(f0, f1 + 1):
            scene.frame_set(f)
            bpy.context.view_layer.update()
            pose_cs = {cs: arm_cs.matrix_world @ arm_cs.pose.bones[cs].matrix for cs, _ in mapa}
            for nome_cs, nome_ue in ordem:
                pb = arm_ue.pose.bones[nome_ue]
                M = pose_cs[nome_cs] @ corr[nome_ue]
                atual = arm_ue.matrix_world @ pb.matrix
                loc = M.to_translation() if nome_ue in raizes_cadeia else atual.to_translation()
                # M JÁ é a matriz de mundo certa: `corr` foi medido depois do
                # alinhamento, então carrega escala (24×) e ESPELHO (o molde CS
                # é canhoto). Normalizar M, como a primeira versão fazia, jogava
                # os dois fora — cada osso saía com determinante invertido e a
                # malha do braço virava um tubo gigante (QA 31/08). Só a
                # translação é substituída, e só nos dedos.
                novo = Matrix.Translation(loc) @ M.to_3x3().to_4x4()
                pb.matrix = inv_ue @ novo
                bpy.context.view_layer.update()
            for nome_ue in {u for _, u in mapa}:
                pb = arm_ue.pose.bones[nome_ue]
                pb.keyframe_insert("location", frame=f)
                pb.keyframe_insert("rotation_quaternion", frame=f)
        # SEM fake user a ação fica órfã (o rig só segura a ÚLTIMA) e o
        # exportador descarta: o primeiro build saiu com 1 clipe de braço de 6.
        alvo.use_fake_user = True
        feitas.append((acao.name, alvo.name, f1 - f0 + 1))
    print("CORO_RT_ACOES=" + json.dumps({"clipes": feitas}))

    # --- prova do retarget: a mão do pack tem que cair EM CIMA da mão do molde.
    # Sem esta medida o build sai "ok" com o braço a meio comprimento de arma de
    # distância — foi o que aconteceu na primeira tentativa (31/08).
    erros = {}
    palmas = [(cs, ue) for cs, ue in mapa if ue in ("hand_l", "hand_r")]
    arm_cs.animation_data.action = bpy.data.actions["idle"]
    arm_ue.animation_data.action = bpy.data.actions["RT_idle"]
    escala_arma = max((arm_cs.matrix_world @ b.head_local
                       - arm_cs.matrix_world @ arm_cs.data.bones[palmas[0][0]].head_local).length
                      for b in arm_cs.data.bones) or 1.0
    for f in (0, 10, 20):
        scene.frame_set(f)
        bpy.context.view_layer.update()
        for nome_cs, nome_ue in palmas:
            pc = (arm_cs.matrix_world @ arm_cs.pose.bones[nome_cs].matrix).to_translation()
            pu = (arm_ue.matrix_world @ arm_ue.pose.bones[nome_ue].matrix).to_translation()
            erros[f"{nome_ue}@{f}"] = round((pc - pu).length / escala_arma, 4)
    print("CORO_RT_ERRO_MAO=" + json.dumps(erros))

    # QA: renderiza pela PRÓPRIA câmera do viewmodel. Sem isto o único jeito de
    # ver o resultado era subir o runtime e adivinhar se o defeito era do build
    # ou da composição — dois lugares para procurar um erro só.
    cam = bpy.data.objects.get("VIEWMODEL_CAMERA")
    if cam:
        # o GLB não traz luz nem mundo: o primeiro QA saiu 100% preto
        mundo_qa = bpy.data.worlds.new("QA")
        mundo_qa.use_nodes = True
        mundo_qa.node_tree.nodes["Background"].inputs[0].default_value = (0.05, 0.07, 0.10, 1)
        mundo_qa.node_tree.nodes["Background"].inputs[1].default_value = 1.0
        scene.world = mundo_qa
        sol = bpy.data.objects.new("QA_SOL", bpy.data.lights.new("QA_SOL", type="SUN"))
        sol.data.energy = 4.0
        sol.rotation_euler = (math.radians(55), 0, math.radians(35))
        scene.collection.objects.link(sol)
        scene.camera = cam
        scene.render.resolution_x, scene.render.resolution_y = 960, 540
        scene.render.image_settings.file_format = "PNG"
        scene.render.filepath = str(args.saida / f"qa-{args.arma}-idle.png")
        # o render sai NO MESMO ponto da medição: com as trilhas NLA montadas
        # o rig caía em outro estado e a folha de QA mostrava outra coisa.
        bpy.ops.render.render(write_still=True)
        print("CORO_RT_QA=" + json.dumps({"png": scene.render.filepath}))


    # --- fora as mãos de 596 tris; o rig CS fica (dirige arma e pente) -------
    for o in maos_cs:
        bpy.data.objects.remove(o, do_unlink=True)

    # --- um clipe, dois rigs: trilhas NLA de MESMO NOME ---------------------
    # Em ACTIONS o exportador emite uma animação por ação, e o clipe do braço
    # saía separado do clipe da arma — o runtime teria que tocar aos pares e
    # sincronizar na unha. Com trilhas NLA homônimas o glTF sai com UMA animação
    # por clipe, com os canais dos DOIS esqueletos dentro.
    for arm in (arm_cs, arm_ue):
        if arm.animation_data:
            arm.animation_data.action = None
    for nome_cs, nome_rt, _ in feitas:
        for arm, nome in ((arm_cs, nome_cs), (arm_ue, nome_rt)):
            trilha = arm.animation_data.nla_tracks.new()
            trilha.name = nome_cs
            trilha.strips.new(nome_cs, 0, bpy.data.actions[nome])

    args.saida.mkdir(parents=True, exist_ok=True)
    alvo = args.saida / f"{args.arma}-runtime.glb"
    bpy.ops.export_scene.gltf(
        filepath=str(alvo), export_format="GLB", export_yup=True,
        export_animations=True, export_animation_mode="NLA_TRACKS",
        export_cameras=True, export_apply=False,
    )
    print("CORO_RT_BUILD=" + json.dumps({"arma": args.arma, "glb": str(alvo)}))


if __name__ == "__main__":
    main()
