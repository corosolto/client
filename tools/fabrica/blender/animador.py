"""Fábrica — MODO ANIMADOR (plano B): clipes re-autorados por bpy sobre a base da fábrica.

Uso (build.mjs chama quando a ficha tem `animador`):
  Blender -b <trabalho>/<id>/base.blend --python tools/fabrica/blender/animador.py -- \
     --poses=<ficha-animador.json> --saida=<trabalho>/<id> [--render] [--tempos=0,0.25,0.5,0.75,1]

Referenciais: `armaCm` é a RAIZ do FBX da arma (cm, o do chassi: frente −Y, cima +Z, direita −X);
`camCm` é a câmera de autoria (cm, x direita, y cima, −z frente). Rotações em graus, Euler XYZ,
nesses mesmos eixos. Formato da ficha e o porquê de cada estado: docs/reports/VM-FABRICA.md §7.
"""
import argparse
import json
import math
import sys
from pathlib import Path

import bmesh
import bpy
from mathutils import Euler, Matrix, Quaternion, Vector

LADOS = {"l": "l", "r": "r"}
DEDOS = [f"{d}_{k}" for d in ("index", "middle", "ring", "pinky", "thumb") for k in ("01", "02", "03")]
GRAVIDADE = Vector((0.0, 0.0, -980.0))  # cm/s², armadura Z para cima


def args_():
    argv = sys.argv[sys.argv.index("--") + 1:]
    p = argparse.ArgumentParser()
    p.add_argument("--poses", required=True)
    p.add_argument("--saida", required=True)
    p.add_argument("--render", action="store_true")
    p.add_argument("--tempos", default="0,0.25,0.5,0.75,1")
    p.add_argument("--frame", default="")
    return p.parse_args(argv)


def suave(u):
    u = min(1.0, max(0.0, u))
    return u * u * (3.0 - 2.0 * u)


def por_chaves(chaves, u, misturar):
    if u <= chaves[0]["u"]:
        return misturar(chaves[0], chaves[0], 0.0)
    for a, b in zip(chaves, chaves[1:]):
        if u <= b["u"]:
            return misturar(a, b, suave((u - a["u"]) / max(1e-6, b["u"] - a["u"])))
    return misturar(chaves[-1], chaves[-1], 0.0)


def rot_graus(g):
    return Euler([math.radians(v) for v in (g or (0, 0, 0))], "XYZ").to_matrix().to_4x4()


def compor(pos, R3):
    m = R3.to_4x4()
    m.translation = pos
    return m


def so_rot(m):
    return m.to_quaternion().to_matrix()


class Pose:
    """FK próprio sobre o repouso do rig (cm, espaço da armadura): determinístico e sem depsgraph."""

    def __init__(self, rig):
        self.pai = {b.name: (b.parent.name if b.parent else None) for b in rig.data.bones}
        self.rest = {b.name: b.matrix_local.copy() for b in rig.data.bones}
        self.rel = {n: (self.rest[p].inverted() @ self.rest[n] if p else self.rest[n]) for n, p in self.pai.items()}
        self.base = {n: Matrix.Identity(4) for n in self.pai}
        self._cache = {}

    def carregar(self, bases):
        self.base = {n: m.copy() for n, m in bases.items()}
        self._cache = {}

    def mat(self, n):
        if n not in self._cache:
            p = self.pai[n]
            self._cache[n] = (self.mat(p) if p else Matrix.Identity(4)) @ self.rel[n] @ self.base[n]
        return self._cache[n]

    def pos(self, n):
        return self.mat(n).translation.copy()

    def por(self, n, m):
        p = self.pai[n]
        self.base[n] = self.rel[n].inverted() @ (self.mat(p).inverted() if p else Matrix.Identity(4)) @ m
        self._cache = {}


def girar_em_torno(M, pivo, R3):
    return Matrix.Translation(pivo) @ R3.to_4x4() @ Matrix.Translation(-pivo) @ M


def ik_braco(pose, lado, alvo, polo):
    """IK analítico de dois ossos (ombro→cotovelo→punho) + giro do antebraço dividido ao meio."""
    u, lo, h = f"upperarm_{lado}", f"lowerarm_{lado}", f"hand_{lado}"
    S, E, H = pose.pos(u), pose.pos(lo), pose.pos(h)
    a, b = (E - S).length, (H - E).length
    T = alvo.translation.copy()
    d = min(max((T - S).length, abs(a - b) + 1e-3), a + b - 1e-3)
    eixo = (T - S).normalized()
    v = (polo - S) - eixo * (polo - S).dot(eixo)
    v = v.normalized() if v.length > 1e-6 else (E - S - eixo * (E - S).dot(eixo)).normalized()
    cosA = (a * a + d * d - b * b) / (2 * a * d)
    E2 = S + eixo * (a * cosA) + v * (a * math.sqrt(max(0.0, 1 - cosA * cosA)))
    n0 = (E - S).cross(H - E)
    n1 = (E2 - S).cross(T - E2)

    def quadro(x, n):
        x = x.normalized()
        z = (n - x * n.dot(x)).normalized()
        return Matrix((x, z.cross(x), z)).transposed()

    R1 = quadro(E2 - S, n1) @ quadro(E - S, n0).transposed()
    pose.por(u, girar_em_torno(pose.mat(u), S, R1))
    E1, H1 = pose.pos(lo), pose.pos(h)
    R2 = (H1 - E1).rotation_difference(T - E1).to_matrix()
    pose.por(lo, girar_em_torno(pose.mat(lo), E1, R2))
    # giro: metade do twist punho→antebraço vai para o antebraço
    frente = (T - E1).normalized()
    Dq = (so_rot(alvo) @ so_rot(pose.mat(h)).transposed()).to_quaternion()
    vet = Vector((Dq.x, Dq.y, Dq.z))
    proj = frente * vet.dot(frente)
    tw = Quaternion((Dq.w, proj.x, proj.y, proj.z))
    if tw.magnitude > 1e-9:
        tw.normalize()
        ang = 2 * math.atan2(Vector((tw.x, tw.y, tw.z)).dot(frente), tw.w)
        ang = math.atan2(math.sin(ang), math.cos(ang))
        pose.por(lo, girar_em_torno(pose.mat(lo), E1, Quaternion(frente, ang * 0.5).to_matrix()))
    pose.por(h, compor(pose.pos(h), so_rot(alvo)))
    return (pose.pos(h) - T).length


class Animador:
    def __init__(self, spec):
        cena = bpy.context.scene
        self.spec = spec
        self.fps = cena.render.fps
        self.rig = bpy.data.objects["RIG_FP_ARMS"]
        self.pose = Pose(self.rig)
        em = cena["fabrica_em_rig"]
        self.em_rig = Matrix([em[0:4], em[4:8], em[8:12], em[12:16]])
        cam = bpy.data.objects["VIEWMODEL_CAMERA"]
        cw = self.rig.matrix_world.inverted() @ cam.matrix_world
        self.cam = compor(cw.translation, so_rot(cam.matrix_world))  # câmera no espaço da armadura (cm)
        self.cam_obj = cam
        # Câmera do jogo = autoria ∘ inverso do mount (authoredvm.js: posição x,y,z em m, giro XYZ em graus).
        fr = spec.get("_frame") or {"x": 0, "y": 0, "z": 0, "rotDeg": [0, 0, 0], "fov": math.degrees(cam.data.angle_y)}
        # three.js Euler 'XYZ' = Rx·Ry·Rz, que no Blender é a ordem 'ZYX'
        giro = Euler([math.radians(v) for v in fr.get("rotDeg", [0, 0, 0])], "ZYX").to_matrix().to_4x4()
        mount = Matrix.Translation(Vector((fr["x"], fr["y"], fr["z"])) * 100.0) @ giro
        self.cam_jogo = self.cam @ mount.inverted()
        self.meia_h = math.atan(math.tan(math.radians(fr["fov"]) / 2) * 16 / 9)
        self.malhas = [o for o in bpy.data.objects if o.type == "MESH" and o.name.startswith("GEO_WEAPON_")]

    # --- referenciais -------------------------------------------------------------------------
    def raiz(self):
        return self.pose.mat("Arma") @ self.em_rig

    def palma(self, lado):
        return (self.pose.pos(f"hand_{lado}") + self.pose.pos(f"middle_01_{lado}")) * 0.5

    def mao_por_palma(self, R3, palma, lado):
        """Matriz do punho cuja palma (meio punho→middle_01) cai em `palma`, com giro R3."""
        return compor(palma - R3 @ self.palma_local[lado], R3)

    def cam_pt(self, v):
        return self.cam_jogo @ Vector(v)

    def cam_rot(self, g):
        return so_rot(self.cam_jogo) @ rot_graus(g).to_3x3() @ so_rot(self.cam_jogo).transposed()

    # --- pose de pack ------------------------------------------------------------------------
    def bases_do_idle(self, quadro):
        rig = self.rig
        for t in rig.animation_data.nla_tracks:
            t.mute = t.name != "idle_pack"
        rig.animation_data.action = None
        bpy.context.scene.frame_set(quadro)
        bases = {pb.name: pb.matrix_basis.copy() for pb in rig.pose.bones}
        for t in rig.animation_data.nla_tracks:
            t.mute = True
        return bases

    def preparar(self):
        rig = self.rig
        idle = rig.animation_data.nla_tracks["idle"]
        idle.name = "idle_pack"
        strip = idle.strips[0]
        self.idle_quadros = (int(strip.frame_start), int(strip.frame_end))
        self.base0 = self.bases_do_idle(self.idle_quadros[0])
        self.pose.carregar(self.base0)
        p = self.pose
        self.palma_local = {l: so_rot(p.mat(f"hand_{l}")).transposed() @ (self.palma(l) - p.pos(f"hand_{l}")) for l in "lr"}
        R0 = self.raiz()
        self.mao_r_na_arma = p.mat("ik_hand_gun").inverted() @ p.mat("hand_r")
        # Mão de apoio de repouso (plano B): a do pack, levada ao guarda-mão da arma nova.
        ap = self.spec["idle"]["maoApoio"]
        rot_raiz = so_rot(R0).transposed() @ so_rot(p.mat("hand_l"))
        self.apoio_rot_raiz = rot_graus(ap.get("rotDeg")).to_3x3() @ rot_raiz
        self.apoio_palma_raiz = Vector(ap["palmaCm"])
        self.dedos_idle = {n: self.base0[n].copy() for n in self.base0 if any(n.startswith(d) for d in DEDOS)}
        pega = self.spec.get("pegaPente")
        if pega:
            self.pega_rot_raiz = rot_graus(pega.get("rotDeg")).to_3x3() @ rot_raiz
            self.pega_palma_raiz = Vector(pega["palmaCm"])
            Hm = self.mao_em_raiz(self.pega_palma_raiz, self.pega_rot_raiz, R0)
            self.pega = Hm.inverted() @ p.mat("Mag")  # pente na mão: relação fixa (punho → pente assentado)
        Rinv = R0.inverted()
        eixos = lambda l: {"palma": list(so_rot(Rinv) @ (p.pos(f"middle_01_{l}") - p.pos(f"hand_{l}")).cross(p.pos(f"index_01_{l}") - p.pos(f"pinky_01_{l}")).normalized()),
                           "dedos": list(so_rot(Rinv) @ (p.pos(f"middle_01_{l}") - p.pos(f"hand_{l}")).normalized()),
                           "palmaCm": list(Rinv @ self.palma(l)), "ombroCm": list(Rinv @ p.pos(f"upperarm_{l}"))}
        self.diagnostico = {"maoApoioPack": eixos("l"), "maoFortePack": eixos("r"), "camCm": list(Rinv @ self.cam.translation),
                            "pente": list(Rinv @ p.pos("Mag"))}
        self.polo_l = p.pos("lowerarm_l") - (p.pos("upperarm_l") + p.pos("hand_l")) * 0.5
        self.polo_r = p.pos("lowerarm_r") - (p.pos("upperarm_r") + p.pos("hand_r")) * 0.5

    def mao_em_raiz(self, palma_raiz, rot_raiz, R):
        R3 = so_rot(R) @ rot_raiz
        return self.mao_por_palma(R3, R @ palma_raiz, "l")

    # --- alvo da mão de apoio por chave ------------------------------------------------------
    def alvo_chave(self, k, R):
        rotz = rot_graus(k.get("rotDeg")).to_3x3()
        if k.get("idle"):
            return self.mao_em_raiz(self.apoio_palma_raiz, rotz @ self.apoio_rot_raiz, R)
        if "poco" in k:
            Hs = self.mao_em_raiz(self.pega_palma_raiz, self.pega_rot_raiz, R)
            d = so_rot(R) @ Vector(k["poco"])
            return Matrix.Translation(d) @ Hs
        R3 = so_rot(R) @ rotz @ self.apoio_rot_raiz
        if "camCm" in k:
            if k.get("rotCam") is not None:
                R3 = self.cam_rot(k["rotCam"]) @ so_rot(R) @ self.apoio_rot_raiz
            return self.mao_por_palma(R3, self.cam_pt(k["camCm"]), "l")
        return self.mao_por_palma(R3, R @ Vector(k["armaCm"]), "l")

    # --- um quadro ---------------------------------------------------------------------------
    def quadro(self, clipe, u, t, estado):
        p = self.pose
        p.carregar(self.base0)
        # 1) apresentação da arma: giro em eixos de câmera em torno da palma forte + translação
        ap = por_chaves(clipe.get("arma") or [{"u": 0}], u, lambda a, b, s: (
            Vector(a.get("rotDeg", (0, 0, 0))).lerp(Vector(b.get("rotDeg", (0, 0, 0))), s),
            Vector(a.get("camCm", (0, 0, 0))).lerp(Vector(b.get("camCm", (0, 0, 0))), s)))
        pivo = self.palma("r")
        Mg = girar_em_torno(p.mat("ik_hand_gun"), pivo, self.cam_rot(ap[0]))
        Mg = Matrix.Translation(so_rot(self.cam_jogo) @ ap[1]) @ Mg
        p.por("ik_hand_gun", Mg)
        R = self.raiz()
        # 2) mão forte presa ao punho
        hr = p.mat("ik_hand_gun") @ self.mao_r_na_arma
        err_r = ik_braco(p, "r", hr, hr.translation + self.polo_r)
        # 3) mão de apoio
        chaves = clipe["mao"]

        def mistura(a, b, s):
            A, B = self.alvo_chave(a, R), self.alvo_chave(b, R)
            q = A.to_quaternion().slerp(B.to_quaternion(), s)
            fa, fb = a.get("fecho", 1.0), b.get("fecho", 1.0)
            return compor(A.translation.lerp(B.translation, s), q.to_matrix()), fa + (fb - fa) * s
        Hl, fecho = por_chaves(chaves, u, mistura)
        err_l = ik_braco(p, "l", Hl, Hl.translation + self.polo_l)
        for n, b0 in self.dedos_idle.items():
            if n.endswith("_l"):
                q = Quaternion().slerp(b0.to_quaternion(), max(0.0, min(1.0, fecho)))
                p.base[n] = q.to_matrix().to_4x4()
        p._cache = {}
        # 4) mecanismos (alavanca, retém): deslocamento em cm na raiz
        for osso, ks in (clipe.get("mecanismos") or {}).items():
            d = por_chaves(ks, u, lambda a, b, s: Vector(a["cm"]).lerp(Vector(b["cm"]), s))
            p.por(osso, Matrix.Translation(so_rot(R) @ d) @ p.mat(osso))
        # 5) pentes: estado da última chave com u <= agora
        mats = {}
        for osso, ks in (clipe.get("pentes") or {}).items():
            i = max(n for n, x in enumerate(ks) if x["u"] <= u + 1e-9)
            k = ks[i]
            est = k["estado"]
            ini = estado.setdefault(osso, {})
            if ini.get("k") is not k:
                ini.clear()
                ini.update({"k": k, "t0": t, "M0": estado.get(f"{osso}_ultimo")})
            seat = p.mat(osso)
            if est == "arma":
                d = Vector(k.get("deslocCm", (0, 0, 0)))
                prox = ks[i + 1] if i + 1 < len(ks) else None
                if prox and prox["estado"] == "arma":
                    s_ = suave((u - k["u"]) / max(1e-6, prox["u"] - k["u"]))
                    d = d.lerp(Vector(prox.get("deslocCm", (0, 0, 0))), s_)
                M = Matrix.Translation(so_rot(R) @ d) @ seat
            elif est == "mao":
                M = p.mat("hand_l") @ self.pega
            elif est == "cai":
                M0 = ini["M0"] or seat
                dt = t - ini["t0"]
                v0 = so_rot(R) @ Vector(k.get("velCm", (0, 0, 0)))
                giro = Quaternion(so_rot(R) @ Vector((1, 0, 0)), math.radians(k.get("giroGrausS", 0)) * dt).to_matrix()
                c0 = M0.translation.copy()
                M = girar_em_torno(M0, c0, giro)
                M.translation = c0 + v0 * dt + GRAVIDADE * (0.5 * dt * dt)
            elif est == "largado":  # fica onde a mão soltou (fora da tela), visível
                M = ini["M0"] or seat
            elif est == "escondido":
                M = None
            else:
                raise RuntimeError(f"estado de pente desconhecido: {est}")
            mats[osso] = M
            if M is not None:
                estado[f"{osso}_ultimo"] = M
        return mats, err_l, err_r

    def assar(self, nome, clipe):
        n = max(2, round(clipe["segundos"] * self.fps))
        estado, quadros = {}, []
        for f in range(n + 1):
            mats, el, er = self.quadro(clipe, f / n, f / self.fps, estado)
            quadros.append({"bases": {k: v.copy() for k, v in self.pose.base.items()}, "pentes": mats, "erro": (el, er)})
        # escondido (escala 0): encolhe onde estava, viaja escondido, cresce onde vai aparecer
        for osso in (clipe.get("pentes") or {}):
            seq = [q["pentes"][osso] for q in quadros]
            for i, M in enumerate(seq):
                if M is not None:
                    quadros[i]["pentes"][osso] = (M, True)
                    continue
                ant = seq[i - 1] if i and seq[i - 1] is not None else None
                prox = next((x for x in seq[i + 1:] if x is not None), None)
                quadros[i]["pentes"][osso] = ((ant if ant is not None else prox) or self.pose.rest[osso], False)
        return quadros, n

    def gravar(self, nome, quadros, n):
        rig = self.rig
        acao = bpy.data.actions.new(f"RIG_FP_ARMS_{nome}")
        rig.animation_data.action = acao
        for pb in rig.pose.bones:
            pb.rotation_mode = "QUATERNION"
        for f, q in enumerate(quadros):
            self.pose.carregar(q["bases"])
            ocultos = set()
            for osso, (M, vis) in q["pentes"].items():
                self.pose.por(osso, M)
                if not vis:
                    ocultos.add(osso)
            for pb in rig.pose.bones:
                loc, rot, sca = self.pose.base[pb.name].decompose()
                pb.location, pb.rotation_quaternion = loc, rot
                pb.scale = (0.0, 0.0, 0.0) if pb.name in ocultos else sca
                for prop in ("location", "rotation_quaternion", "scale"):
                    pb.keyframe_insert(prop, frame=f, group=pb.name)
            for o in ocultos:
                self.pose.base[o] = self.pose.base[o] @ Matrix.Diagonal((0.0, 0.0, 0.0, 1.0))
            self.pose._cache = {}
            q["basesFinais"] = {k: v.copy() for k, v in self.pose.base.items()}
        rig.animation_data.action = None
        trilha = rig.animation_data.nla_tracks.new()
        trilha.name = nome
        strip = trilha.strips.new(nome, 0, acao)
        strip.action_frame_start, strip.action_frame_end = 0, n
        trilha.mute = True
        return acao

    def repor_idle(self):
        """Idle do pack com a mão de apoio no guarda-mão da arma nova (quadro a quadro)."""
        ini, fim = self.idle_quadros
        quadros = []
        for f in range(ini, fim + 1):
            bases = self.bases_do_idle(f)
            self.pose.carregar(bases)
            R = self.raiz()
            Hl = self.mao_em_raiz(self.apoio_palma_raiz, self.apoio_rot_raiz, R)
            e = ik_braco(self.pose, "l", Hl, Hl.translation + self.polo_l)
            quadros.append({"bases": {k: v.copy() for k, v in self.pose.base.items()}, "pentes": {}, "erro": (e, 0.0)})
        self.base0_novo = quadros[0]["bases"]
        rig = self.rig
        acao = bpy.data.actions.new("RIG_FP_ARMS_idle")
        rig.animation_data.action = acao
        for pb in rig.pose.bones:
            pb.rotation_mode = "QUATERNION"
        for i, q in enumerate(quadros):
            for pb in rig.pose.bones:
                pb.matrix_basis = q["bases"][pb.name]
                for prop in ("location", "rotation_quaternion", "scale"):
                    pb.keyframe_insert(prop, frame=ini + i, group=pb.name)
        rig.animation_data.action = None
        trilha = rig.animation_data.nla_tracks.new()
        trilha.name = "idle"
        strip = trilha.strips.new("idle", ini, acao)
        strip.action_frame_start, strip.action_frame_end = ini, fim
        return max(q["erro"][0] for q in quadros)


# --- réguas do laço (contato e visibilidade dos pentes na câmera de autoria) ------------------
def vertices_por_osso(rig, malhas):
    out = {}
    for m in malhas:
        para_arm = rig.matrix_world.inverted() @ m.matrix_world
        nomes = {g.index: g.name for g in m.vertex_groups}
        for i, v in enumerate(m.data.vertices):
            g = max(v.groups, key=lambda x: x.weight, default=None)
            if g is None or (i % 6 and nomes[g.group] == "Arma"):
                continue
            out.setdefault(nomes[g.group], []).append(para_arm @ v.co)
    return out


def ndc(an, p, aspecto):
    """NDC na câmera do JOGO; a meia-abertura horizontal é fixa (regra do AuthoredViewModels.fov)."""
    v = an.cam_jogo.inverted() @ p
    if v.z >= -1e-3:
        return None
    th = math.tan(an.meia_h)
    return (v.x / (-v.z * th), v.y / (-v.z * th / aspecto))


def centro(pts):
    if not pts:
        return Vector((1e6, 1e6, 1e6))
    return Vector([(min(p[i] for p in pts) + max(p[i] for p in pts)) / 2 for i in range(3)])


def medir(an, nome, quadros, rest_por_osso, pentes):
    pose = an.pose
    linhas, falhas = [], []
    vis_ant = {}
    for f, q in enumerate(quadros):
        pose.carregar(q["basesFinais"])
        posto = {}
        for osso, pts in rest_por_osso.items():
            if osso not in pose.pai:
                continue
            M = pose.mat(osso) @ pose.rest[osso].inverted()
            posto[osso] = [M @ p for p in pts]
        palma = an.palma("l")
        corpo = posto.get("Arma", [])
        d_corpo = min((p - palma).length for p in corpo)
        palma_r = an.palma("r")
        d_forte = min((p - palma_r).length for p in corpo)
        lin = {"quadro": f, "palmaApoioArmaCm": round(d_corpo, 2), "palmaForteArmaCm": round(d_forte, 2),
               "erroIkCm": [round(e, 3) for e in q["erro"]]}
        for osso in pentes:
            esc = pose.mat(osso).to_scale()
            visivel = min(esc) > 0.2
            pts = posto.get(osso, [])
            c = centro(pts)
            nd = ndc(an, c, 16 / 9)
            nd3 = ndc(an, c, 3 / 2)
            dentro = lambda n: n is not None and abs(n[0]) < 1.1 and abs(n[1]) < 1.1
            na_tela = visivel and (dentro(nd) or dentro(nd3))
            d_mao = min((p - palma).length for p in pts) if pts else 1e9
            lin[osso] = {"visivel": visivel, "naTela": na_tela, "ndc": [round(x, 2) for x in nd] if nd else None,
                         "palmaCm": round(d_mao, 1)}
            ant = vis_ant.get(osso)
            outro = [o for o in pentes if o != osso]
            coincide = lambda: any((centro(posto.get(o, [])) - c).length < 1.0
                                   and min(pose.mat(o).to_scale()) > 0.2 for o in outro)
            if ant is not None:
                if ant["naTela"] and not visivel and not ant.get("coincidia"):
                    falhas.append(f"{nome} q{f}: {osso} some NA TELA")
                if (not ant["visivel"]) and na_tela and not coincide() and d_mao > 3.0:
                    falhas.append(f"{nome} q{f}: {osso} aparece NA TELA fora da mão")
            lin[osso]["coincidia"] = coincide()
            vis_ant[osso] = lin[osso]
        linhas.append(lin)
    return linhas, falhas


def segundo_pente(rig, malhas):
    """Mag2: cópia do pente num osso irmão, COINCIDENTE com o pente no repouso (invisível)."""
    bpy.context.view_layer.objects.active = rig
    rig.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    eb = rig.data.edit_bones
    novo = eb.new("Mag2")
    base = eb["Mag"]
    novo.head, novo.tail, novo.roll = base.head.copy(), base.tail.copy(), base.roll
    novo.parent = eb["Arma"]
    bpy.ops.object.mode_set(mode="OBJECT")
    copiados = 0
    for m in malhas:
        g_mag = m.vertex_groups.get("Mag")
        if g_mag is None:
            continue
        g2 = m.vertex_groups.get("Mag2") or m.vertex_groups.new(name="Mag2")
        bm = bmesh.new()
        bm.from_mesh(m.data)
        deform = bm.verts.layers.deform.verify()
        sel = [v for v in bm.verts if v[deform].get(g_mag.index, 0.0) >= 0.5]
        faces = [f for f in bm.faces if all(v in sel for v in f.verts)]
        dup = bmesh.ops.duplicate(bm, geom=faces)
        novos = [e for e in dup["geom"] if isinstance(e, bmesh.types.BMVert)]
        for v in novos:
            v[deform].clear()
            v[deform][g2.index] = 1.0
        copiados += len(novos)
        bm.to_mesh(m.data)
        bm.free()
    return copiados


def main():
    a = args_()
    spec = json.loads(Path(a.poses).read_text(encoding="utf-8"))
    if a.frame:
        spec["_frame"] = json.loads(a.frame)
    saida = Path(a.saida)
    rig = bpy.data.objects["RIG_FP_ARMS"]
    malhas = [o for o in bpy.data.objects if o.type == "MESH" and o.name.startswith("GEO_WEAPON_")]
    rel = {"clipes": {}, "falhas": []}
    rel["pente2"] = {"vertices": segundo_pente(rig, malhas)}
    an = Animador(spec)
    an.pose = Pose(rig)
    an.preparar()
    rel["idle"] = {"erroIkCm": round(an.repor_idle(), 3)}
    an.pose.carregar(an.base0)
    R = an.raiz()
    rel["sondasNdc3x2"] = {k: [round(x, 2) for x in (ndc(an, R @ Vector(v), 1.5) or (9, 9))]
                           for k, v in (spec.get("sondas") or {}).items()}
    rel["sondasCamCm"] = {k: [round(x, 1) for x in an.cam_jogo.inverted() @ (R @ Vector(v))] for k, v in (spec.get("sondas") or {}).items()}
    rel["diagnostico"] = {k: ([round(x, 2) for x in v] if isinstance(v, list) else {kk: [round(x, 2) for x in vv] for kk, vv in v.items()})
                          for k, v in an.diagnostico.items()}
    an.base0 = an.base0_novo
    rest = vertices_por_osso(rig, malhas)
    pentes = ["Mag", "Mag2"]
    for nome, clipe in spec["clipes"].items():
        quadros, n = an.assar(nome, clipe)
        an.gravar(nome, quadros, n)
        linhas, falhas = medir(an, nome, quadros, rest, pentes)
        rel["clipes"][nome] = {"quadros": n + 1, "segundos": n / an.fps, "porQuadro": linhas}
        rel["falhas"] += falhas
    for t in rig.animation_data.nla_tracks:
        t.mute = False
    rig.animation_data.action = None
    bpy.ops.wm.save_as_mainfile(filepath=str(saida / "animador.blend"))
    bpy.ops.export_scene.gltf(filepath=str(saida / "base.glb"), export_format="GLB", export_cameras=True, export_lights=False,
                              export_animations=True, export_animation_mode="NLA_TRACKS", export_merge_animation="NLA_TRACK",
                              export_skins=True, export_morph=False, export_materials="EXPORT", export_image_format="WEBP",
                              export_image_quality=85, export_optimize_animation_size=True,
                              export_optimize_animation_keep_anim_armature=True, export_yup=True)
    (saida / "animador.json").write_text(json.dumps(rel, indent=1) + "\n", encoding="utf-8")
    print("FABRICA_ANIMADOR=" + json.dumps({"clipes": list(spec["clipes"]), "falhas": rel["falhas"][:8],
                                             "idleErroIkCm": rel["idle"]["erroIkCm"]}))
    if a.render:
        import subprocess
        render = Path(__file__).resolve().parent / "render.py"
        subprocess.run([bpy.app.binary_path, "-b", "--python", str(render), "--", f"--glb={saida / 'base.glb'}",
                        f"--saida={saida / 'render'}", f"--clipes={','.join(['idle', *spec['clipes']])}", f"--tempos={a.tempos}",
                        *([f"--frame={a.frame}"] if a.frame else [])], check=True)


if __name__ == "__main__":
    main()
