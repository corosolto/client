#!/usr/bin/env python3
# ============================================================================
# mat_shade.py — RENDERIZADOR ANALÍTICO DE MATERIAL (sem GPU, sem browser).
# ----------------------------------------------------------------------------
# POR QUE EXISTE
# O dono relatou: "a mesma arma tem metal escuro e madeira certa NO CHÃO e fica
# branca/cromada NA MÃO". O bloco de comentário do `fixVmMaterials` (game.js)
# já tinha o diagnóstico ARITMÉTICO certo — `metalness = min(metalness, 0.55)`
# MULTIPLICA o fator glTF, não limita — mas parou ali com uma frase honesta:
#   "trocar 0,55 por 1,0 SEM RENDERIZAR troca arma branca por arma PRETA,
#    e este container não tem GPU/browser para o A/B".
# Este arquivo é a saída desse impasse. Não dá pra rasterizar aqui, mas o valor
# do pixel de um MeshStandardMaterial é uma FUNÇÃO FECHADA de (albedo, metal,
# rough, normal, luzes, env, tonemap) — e essas seis coisas estão todas em
# arquivos desta árvore. Então em vez de renderizar, AVALIA-SE a função.
#
# PROCEDÊNCIA DE CADA ENTRADA (nada aqui é chute; siga o padrão do ref-measure.py)
#   albedo/metal/rough : DOS 26 GLB. O chunk JSON dá metallicFactor/roughnessFactor
#                        (ausentes = 1,0 pela spec glTF §material) e o chunk BIN dá
#                        as imagens ORM (G=rough, B=metal) e baseColor, decodificadas
#                        texel a texel com PIL. Não é "a AK é metálica": é o histograma
#                        do mapa metallicRoughness que a Mint entregou.
#   luzes              : MEDIDAS EM RUNTIME pelo mat-check.mjs (harness.mjs sobe o Game
#                        real e varre scene/vmScene). Chegam aqui pelo mat_scenes.json.
#   env (IBL)          : a MESMA fórmula do `_buildEnv` (game.js) reimplementada aqui,
#                        alimentada pela direção/cor/intensidade do sol de cada mapa.
#   BRDF               : o do three r160 (WebGLPrograms/BSDF): Lambert + GGX com a
#                        aproximação analítica de EnvironmentBRDF (Karis//Lazarov) e
#                        multiscattering, que é literalmente o que o shader do jogo roda.
#   tonemap            : o AgX de `bloom.js` (CUSTOM_AGX_SRC), com exposição/piso/sat
#                        por mapa da tabela LOOKS. É a curva que o jogador vê no
#                        caminho padrão (composer ligado em quality med/high).
#
# O QUE ELE RESPONDE (é só isso, e é o suficiente pra decidir)
#   1. a MESMA arma, com o MESMO material, sai com que luminância na mão e no chão?
#      (a queixa do dono é exatamente essa diferença)
#   2. tirando o clamp multiplicativo, alguma arma vai pro PRETO? -> %texel com L* < 12
#   3. e alguma continua estourando pro BRANCO? -> %texel com L* > 92
#
# LIMITES DECLARADOS (leia antes de citar o número)
#   - não há oclusão, sombra, normal map nem parallax: é sombreamento de superfície
#     com uma distribuição de normais, não uma foto. Serve pra COMPARAR dois caminhos
#     do mesmo modelo (que é a pergunta) e pra achar preto/branco absoluto.
#   - as normais são uma amostragem de Fibonacci no hemisfério visível, pesada por N·V
#     (área projetada). Uma arma real tem mais superfície plana que uma esfera, então o
#     número absoluto tem viés; a RAZÃO mão/chão não tem (mesmas normais nos dois lados).
#   - a névoa não entra: a arma na mão está a 0,3 m e o drop que interessa está perto.
#
# Uso:  python3 tools/eval/mat_shade.py            (lê mat_scenes.json, escreve mat_shade.json)
# ============================================================================
import json, os, sys, math, io
# CI de fork PR sem numpy: exit 0 sem reescrever mat_shade.json -> mat-check.mjs lê
# o baseline committed e a invariante segue (mesmo princípio do guard do char-floor).
try:
    import numpy as np
except ImportError:
    print("mat_shade: numpy indisponível — usando mat_shade.json committed (CHR11/TEX no baseline).")
    sys.exit(0)

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
GLBDIR = os.path.join(ROOT, 'public', 'models', 'weapons')

try:
    from PIL import Image
except Exception as e:                                     # pragma: no cover
    print('__ERRO__ PIL ausente: ' + str(e)); sys.exit(2)


# ---------------------------------------------------------------- cor / sRGB
def srgb_to_linear(c):
    c = np.asarray(c, dtype=np.float64)
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def hex_to_linear(h):
    h = h.lstrip('#')
    v = np.array([int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)], dtype=np.float64) / 255.0
    return srgb_to_linear(v)


def linear_to_lstar(y):
    """L* do CIE a partir da luminância relativa (0..1). É a escala em que o
    repositório já mede claro/escuro (ver tone_r3.py / r2_audit.py)."""
    y = np.clip(y, 0.0, 1.0)
    return np.where(y > 0.008856, 116.0 * np.cbrt(y) - 16.0, 903.3 * y)


def srgb_to_lab(rgb):
    """sRGB (0..1, JÁ tonemapeado — é a cor que sai no monitor) -> CIELAB D65.

    POR QUE ISTO FOI PARAR AQUI, DUAS RODADAS DEPOIS DO RESTO
    A rodada passada tirou o clamp multiplicativo de metalness e casou o orçamento de luz,
    e declarou vitória com o ΔL* 1ªpessoa−chão caindo de 15,5 pra 5,3. O dono jogou e
    disse que a arma na mão está DOURADA/BRONZE enquanto a mesma arma no chão sai cinza
    escura. Os dois podem estar certos ao mesmo tempo: L* é só a claridade. Duas cores com
    o MESMO L* e a* b* diferentes são "igualmente claras" e visivelmente cores diferentes —
    e "dourado" é exatamente um desvio em a*/b*, não em L*. Medir só ΔL* foi o erro de
    instrumento da rodada passada; a* e b* fecham o buraco."""
    lin = srgb_to_linear(np.clip(np.asarray(rgb, dtype=np.float64), 0.0, 1.0))
    M = np.array([[0.4124564, 0.3575761, 0.1804375],
                  [0.2126729, 0.7151522, 0.0721750],
                  [0.0193339, 0.1191920, 0.9503041]])
    xyz = lin @ M.T
    wp = np.array([0.95047, 1.0, 1.08883])
    t = xyz / wp
    f = np.where(t > 0.008856, np.cbrt(t), 7.787 * t + 16.0 / 116.0)
    return np.stack([116.0 * f[..., 1] - 16.0,
                     500.0 * (f[..., 0] - f[..., 1]),
                     200.0 * (f[..., 1] - f[..., 2])], -1)


# ------------------------------------------------------------------ GLB
def glb_json(path):
    with open(path, 'rb') as f:
        buf = f.read()
    assert int.from_bytes(buf[0:4], 'little') == 0x46546C67, 'não é GLB: ' + path
    off, js, bin_ = 12, None, None
    while off < len(buf):
        ln = int.from_bytes(buf[off:off + 4], 'little')
        ty = int.from_bytes(buf[off + 4:off + 8], 'little')
        data = buf[off + 8:off + 8 + ln]
        if ty == 0x4E4F534A:
            js = json.loads(data.decode('utf8'))
        elif ty == 0x004E4942:
            bin_ = data
        off += 8 + ln
    return js, bin_


def glb_image(js, bin_, tex_index):
    """Bytes da imagem de uma textura, honrando EXT_texture_webp (a Mint exporta
    metade dos 26 em webp e metade em jpeg)."""
    t = js['textures'][tex_index]
    src = t.get('source')
    if src is None:
        src = t['extensions']['EXT_texture_webp']['source']
    img = js['images'][src]
    bv = js['bufferViews'][img['bufferView']]
    o = bv.get('byteOffset', 0)
    return bin_[o:o + bv['byteLength']]


def weapon_material(glb_path, max_texels=2500):
    """Material efetivo declarado pelo GLB, do jeito que o GLTFLoader do three o
    monta: metalness = metallicFactor (default 1) e metalnessMap = canal B do ORM;
    roughness = roughnessFactor (default 1) e roughnessMap = canal G. O three
    MULTIPLICA fator × texel (three/src/renderers/shaders: metalnessFactor *
    texelMetalness.b), que é a mesma regra da spec glTF."""
    js, bin_ = glb_json(glb_path)
    m = js['materials'][0]
    p = m.get('pbrMetallicRoughness', {})
    mf = p.get('metallicFactor', 1.0)
    rf = p.get('roughnessFactor', 1.0)
    bcf = np.array(p.get('baseColorFactor', [1, 1, 1, 1])[:3], dtype=np.float64)

    orm = np.asarray(Image.open(io.BytesIO(glb_image(js, bin_, p['metallicRoughnessTexture']['index']))).convert('RGB'), dtype=np.float64) / 255.0
    bc = np.asarray(Image.open(io.BytesIO(glb_image(js, bin_, p['baseColorTexture']['index']))).convert('RGB'), dtype=np.float64) / 255.0
    if bc.shape[:2] != orm.shape[:2]:
        bc = np.asarray(Image.fromarray((bc * 255).astype(np.uint8)).resize((orm.shape[1], orm.shape[0])), dtype=np.float64) / 255.0

    rough_t = orm[..., 1].reshape(-1)
    metal_t = orm[..., 2].reshape(-1)
    ao_t = orm[..., 0].reshape(-1)
    alb_t = srgb_to_linear(bc.reshape(-1, 3)) * bcf     # baseColor é sRGB; o resto é linear

    n = rough_t.size
    if n > max_texels:                                   # amostragem regular e determinística
        idx = np.linspace(0, n - 1, max_texels).astype(np.int64)
        rough_t, metal_t, ao_t, alb_t = rough_t[idx], metal_t[idx], ao_t[idx], alb_t[idx]
    return dict(metallicFactor=mf, roughnessFactor=rf, rough_t=rough_t, metal_t=metal_t,
                ao_t=ao_t, alb_t=alb_t, size=list(orm.shape[:2]))


# ------------------------------------------------------------------ env (IBL)
def build_env(sun_dir, sun_col, sun_int, mult=1.0, W=128, H=64):
    """PORT LINHA A LINHA do `_buildEnv` (public/js/game.js). Mesmo gradiente
    zênite→horizonte, mesmo glow de Mie, mesmo disco solar (~55 em linear) e
    mesmo chão com bounce. Se aquele bloco mudar, este tem que mudar junto —
    é a mesma dívida de sincronia que o AUD1 vigia no viewmodel."""
    sd = np.asarray(sun_dir, dtype=np.float64)
    sd = sd / (np.linalg.norm(sd) or 1.0)
    sc = np.asarray(sun_col, dtype=np.float64)
    sunI = min(3.2, max(0.6, sun_int))
    skyE = mult * (0.62 + 0.14 * sunI)
    zen = np.array([0.075, 0.16, 0.36]); hor = np.array([0.55, 0.62, 0.72])
    gnd = np.array([0.085, 0.078, 0.066])

    j = (np.arange(H) + 0.5) / H
    phi = (j - 0.5) * math.pi
    sy = np.sin(phi)[:, None]; cy = np.cos(phi)[:, None]
    i = (np.arange(W) + 0.5) / W
    th = (i - 0.5) * 2 * math.pi
    dx = cy * np.cos(th)[None, :]; dz = cy * np.sin(th)[None, :]
    dirs = np.stack([np.broadcast_to(dx, (H, W)), np.broadcast_to(sy, (H, W)), np.broadcast_to(dz, (H, W))], axis=-1)
    cosS = dirs[..., 0] * sd[0] + dirs[..., 1] * sd[1] + dirs[..., 2] * sd[2]

    up = np.broadcast_to(sy, (H, W))
    t_up = np.power(np.clip(1 - up, 0, None), 5)[..., None]
    sky = zen + (hor - zen) * t_up
    mie = (np.power(np.clip(cosS, 0, None), 6) * 0.45 + np.power(np.clip(cosS, 0, None), 48) * 1.1)[..., None]
    sky = sky + mie * (sc * np.array([1.0, 0.92, 0.72]))
    disc = (cosS > 0.99965)[..., None]
    sky = sky + disc * 55.0 * sc
    t_dn = np.power(np.clip(1 + up, 0, None), 8)[..., None]
    ground = gnd * (1 + np.array([3.2, 3.0, 2.6]) * t_dn)
    L = np.where(up[..., None] >= 0, sky, ground) * skyE

    # ângulo sólido de cada texel do equirretangular
    dw = (2 * math.pi / W) * (math.pi / H) * cy
    dw = np.broadcast_to(dw, (H, W))
    return dirs.reshape(-1, 3), L.reshape(-1, 3), dw.reshape(-1)


def fibonacci_normals(n):
    k = np.arange(n) + 0.5
    phi = np.arccos(1 - 2 * k / n)
    ga = math.pi * (1 + 5 ** 0.5)
    th = ga * k
    return np.stack([np.cos(th) * np.sin(phi), np.sin(th) * np.sin(phi), np.cos(phi)], axis=-1)


def env_diffuse_irradiance(N, edir, eL, edw):
    """E(n) = ∫ L(ω) max(n·ω,0) dω — exatamente o que o mip roughness=1 do PMREM
    do three devolve multiplicado por PI (getIBLIrradiance)."""
    c = np.clip(N @ edir.T, 0, None)                      # (n, texels)
    return (c * edw[None, :]) @ eL


def env_prefiltered(R, rough, edir, eL, edw):
    """Radiância pré-filtrada por rugosidade. Aproximação de cone: peso ∝
    max(R·ω,0)^p com p = 2/α² − 2 (lóbulo de Phong equivalente ao GGX, Karis 2013).
    É a mesma família de aproximação que o PMREM do three usa nos mips."""
    a = np.clip(rough, 0.04, 1.0) ** 2
    p = np.clip(2.0 / (a * a) - 2.0, 1.0, 4096.0)
    c = np.clip(R @ edir.T, 1e-6, None)
    w = np.exp(p[:, None] * np.log(c)) * edw[None, :]
    s = w.sum(axis=1, keepdims=True)
    return (w @ eL) / np.maximum(s, 1e-12)


def env_brdf_approx(F0, rough, NoV):
    """DFG analítico de Lazarov (o mesmo `DFGApprox` do three r160,
    src/renderers/shaders/ShaderChunk/bsdfs.glsl.js)."""
    c0 = np.array([-1.0, -0.0275, -0.572, 0.022])
    c1 = np.array([1.0, 0.0425, 1.04, -0.04])
    r = np.stack([rough * c0[0] + c1[0], rough * c0[1] + c1[1],
                  rough * c0[2] + c1[2], rough * c0[3] + c1[3]], axis=-1)
    a004 = np.minimum(r[..., 0] * r[..., 0], np.exp2(-9.28 * NoV)) * r[..., 0] + r[..., 1]
    fab_x = a004 * -1.04 + r[..., 2]
    fab_y = a004 * 1.04 + r[..., 3]
    return F0 * fab_x[..., None] + fab_y[..., None]       # F90 = 1


def ggx_direct(N, V, Lv, rough, F0):
    """BRDF_GGX do three: D_GGX × V_SmithGGXCorrelated × F_Schlick."""
    H = Lv + V
    H = H / np.maximum(np.linalg.norm(H, axis=-1, keepdims=True), 1e-9)
    NoL = np.clip((N * Lv).sum(-1), 0, 1)
    NoV = np.clip((N * V).sum(-1), 1e-4, 1)
    NoH = np.clip((N * H).sum(-1), 0, 1)
    VoH = np.clip((V * H).sum(-1), 0, 1)
    a = np.clip(rough, 0.0525, 1.0) ** 2
    a2 = a * a
    d = (NoH * NoH) * (a2 - 1.0) + 1.0
    D = a2 / (math.pi * d * d)
    gv = NoL * np.sqrt(NoV * NoV * (1 - a2) + a2)
    gl = NoV * np.sqrt(NoL * NoL * (1 - a2) + a2)
    Vis = 0.5 / np.maximum(gv + gl, 1e-9)
    F = F0 + (1.0 - F0) * np.power(1.0 - VoH, 5)[..., None]
    return F * (D * Vis)[..., None]


# ------------------------------------------------------------------ tonemap AgX
_R2020 = np.array([[0.6274, 0.3293, 0.0433], [0.0691, 0.9195, 0.0113], [0.0164, 0.0880, 0.8956]])
_SRGB = np.array([[1.6605, -0.5876, -0.0728], [-0.1246, 1.1329, -0.0083], [-0.0182, -0.1006, 1.1187]])
# ATENÇÃO À CONVENÇÃO: no GLSL `mat3(a, b, c)` recebe COLUNAS. As quatro matrizes abaixo
# já estão em ORDEM DE LINHA (linha i = i-ésima componente de cada vec3 do bloco GLSL), e a
# aplicação é sempre `v @ M.T`, que é M·v. Um `.T` a mais aqui devolvia cinza neutro como
# AZUL (sRGB 105,149,255) — o tipo de erro de instrumento que faz uma régua condenar um
# material inocente, então fica registrado: o teste de sanidade é `agx(cinza) == cinza`.
_INSET = np.array([[0.856627153315983, 0.0951212405381588, 0.0482516061458583],
                   [0.137318972929847, 0.761241990602591, 0.101439036467562],
                   [0.11189821299995, 0.0767994186031903, 0.811302368396859]])
_OUTSET = np.array([[1.1271005818144368, -0.11060664309660323, -0.016493938717834573],
                    [-0.1413297634984383, 1.157823702216272, -0.016493938717834257],
                    [-0.14132976349843826, -0.11060664309660294, 1.2519364065950405]])


def agx(color, exposure, floor, sat):
    """Port do CUSTOM_AGX_SRC (public/js/bloom.js). Mesma ordem de operações:
    piso -> exposição -> inset R2020 -> log2 -> saturação -> sigmoide -> outset."""
    c = np.clip(np.asarray(color, dtype=np.float64), 0, None)
    c = c + (floor * floor) / (c + floor)
    c = c * exposure
    c = c @ _R2020.T @ _INSET.T
    c = np.maximum(c, 1e-10)
    c = np.clip((np.log2(c) + 12.47393) / 16.499999, 0.0, 1.0)
    l = c @ np.array([0.2126, 0.7152, 0.0722])
    c = np.clip(l[..., None] + sat * (c - l[..., None]), 0.0, 1.0)
    a = c * c
    b = a * a
    c = 15.5 * b * a - 40.14 * b * c + 31.96 * b - 6.868 * a * c + 0.4298 * a + 0.1191 * c - 0.00232
    c = np.power(np.clip(c @ _OUTSET.T, 0, None), 2.2)
    return np.clip(c @ _SRGB.T, 0.0, 1.0)


# ------------------------------------------------------------------ shading
def shade(mat, scene, env, n_normals=24, metal_factor=1.0, rough_factor=1.0, env_int=1.0, light_mul=1.0):
    """Luminância de saída (pós-AgX) por texel × normal, do jeito que o
    WebGLRenderer do three compõe: direct (lambert+GGX) + indirect diffuse
    (hemi + IBL) + indirect specular (IBL × DFG) + multiscattering."""
    edir, eL, edw = env
    V = np.array([0.0, 0.0, 1.0])
    N = fibonacci_normals(n_normals * 2)
    N = N[N[:, 2] > 0.05]                                  # só o que a câmera vê
    NoV = np.clip(N @ V, 1e-4, 1.0)
    wN = NoV / NoV.sum()                                   # peso por área projetada

    # three: metalnessFactor * texelMetalness.b / roughnessFactor * texelRoughness.g.
    # metal_factor/rough_factor NÃO são invenção desta régua: são o valor com que o
    # material CHEGA no shader depois do caminho do jogo (extraído do game.js pelo
    # mat-check.mjs e passado aqui), então "VM" e "chão" só diferem no que o código difere.
    metal = np.clip(mat['metal_t'] * metal_factor, 0, 1)
    rough = np.clip(mat['rough_t'] * rough_factor, 0.0, 1.0)
    alb = mat['alb_t']
    diffuse = alb * (1.0 - metal)[:, None]
    F0 = 0.04 * (1.0 - metal)[:, None] + alb * metal[:, None]

    # ---- indireto do env: só depende da normal, então é pré-computado por normal
    Eirr = env_diffuse_irradiance(N, edir, eL, edw)         # (nN, 3)
    R = 2 * NoV[:, None] * N - V                            # reflete V na normal
    R = R / np.maximum(np.linalg.norm(R, axis=-1, keepdims=True), 1e-9)

    # 6 níveis de rugosidade e interpolação — o PMREM do three também é discreto em mips
    levels = np.array([0.05, 0.2, 0.4, 0.6, 0.8, 1.0])
    pre = np.stack([env_prefiltered(R, np.full(R.shape[0], lv), edir, eL, edw) for lv in levels])  # (L,nN,3)

    # ---- luzes diretas + hemisférica (MEDIDAS no jogo, vêm do mat_scenes.json)
    L_dir, L_hemi = [], []
    for lt in scene['lights']:
        if lt['type'] == 'DirectionalLight':
            d = np.asarray(lt['pos'], dtype=np.float64)
            nrm = np.linalg.norm(d)
            if nrm < 1e-6:
                continue
            L_dir.append((d / nrm, hex_to_linear(lt['color']) * lt['intensity'] * light_mul))
        elif lt['type'] == 'HemisphereLight':
            L_hemi.append((hex_to_linear(lt['color']), hex_to_linear(lt.get('ground', '#000000')), lt['intensity'] * light_mul))
        # PointLight com intensidade 0 (pool de muzzle flash) não entra; os pontos
        # acesos do loja_h são locais e não iluminam a arma na mão -> fora da conta.

    out_lum = np.zeros((rough.size,), dtype=np.float64)
    out_rgb = np.zeros((rough.size, 3), dtype=np.float64)
    # AMOSTRAS (texel × normal), não só a média por texel: um brilho especular vive
    # numa FAIXA de normais, e tirar a média sobre as normais antes de contar
    # "% branco" apaga exatamente o pixel estourado que o dono fotografou.
    amostras, pesos = [], []
    lev_idx = np.clip(np.searchsorted(levels, rough) - 1, 0, len(levels) - 2)
    lev_f = (rough - levels[lev_idx]) / (levels[lev_idx + 1] - levels[lev_idx])

    for k in range(N.shape[0]):
        nk = N[k]
        radiance = np.zeros((rough.size, 3))
        # --- direto
        for (ld, lc) in L_dir:
            nol = max(float(nk @ ld), 0.0)
            if nol <= 0:
                continue
            irr = lc * nol
            radiance += irr * diffuse / math.pi
            spec = ggx_direct(nk[None, :], V[None, :], ld[None, :], rough, F0)
            radiance += irr * spec
        # --- indireto difuso: hemisférica + IBL
        ind = np.zeros(3)
        for (sky, gnd, inten) in L_hemi:
            w = 0.5 * float(nk[1]) + 0.5                    # three: dotNL com (0,1,0)
            ind = ind + (gnd + (sky - gnd) * w) * inten
        ind = ind + Eirr[k] * env_int                       # getIBLIrradiance já devolve ∫L·cos dω
        radiance += ind * diffuse / math.pi                 # RE_IndirectDiffuse = irradiance * BRDF_Lambert
        # --- indireto especular: radiância pré-filtrada × DFG
        pr = pre[lev_idx, k] * (1 - lev_f)[:, None] + pre[lev_idx + 1, k] * lev_f[:, None]
        dfg = env_brdf_approx(F0, rough, np.full(rough.size, float(nk @ V)))
        radiance += pr * env_int * dfg
        rgb = agx(radiance, scene['exposure'], scene['floor'], scene['sat'])
        lum = rgb @ np.array([0.2126, 0.7152, 0.0722])
        out_rgb += rgb * wN[k]
        out_lum += lum * wN[k]
        amostras.append(linear_to_lstar(lum))
        pesos.append(np.full(lum.size, wN[k]))

    ls_med = linear_to_lstar(out_lum)                       # média por texel (a "cor da arma")
    A = np.concatenate(amostras); P = np.concatenate(pesos)
    order = np.argsort(A); A, P = A[order], P[order]
    cw = np.cumsum(P) / P.sum()
    q = lambda f: float(A[int(np.searchsorted(cw, f))])      # percentil PONDERADO por área projetada
    rgb_med = out_rgb.mean(axis=0)
    # CROMATICIDADE — a metade da queixa que a rodada passada não mediu. `lab` é a cor
    # média da arma DEPOIS do tonemap (o que o monitor mostra); `croma` e `matiz` são a
    # mesma coisa em coordenada polar, que é como se lê "dourado" (matiz ~70-95°, croma alto)
    # contra "cinza de aço" (croma perto de 0). O MAT1 compara mão × chão nestes números.
    lab = srgb_to_lab(rgb_med)
    return dict(
        Lmean=float((A * P).sum() / P.sum()), Lmedia_por_texel=float(ls_med.mean()),
        Lp05=q(0.05), Lp50=q(0.50), Lp95=q(0.95), Lp99=q(0.99),
        pct_preto=float(P[A < 12].sum() / P.sum() * 100),
        pct_branco=float(P[A > 92].sum() / P.sum() * 100),
        rgb=[float(x) for x in rgb_med],
        Lab=[float(x) for x in lab],
        aStar=float(lab[1]), bStar=float(lab[2]),
        croma=float(math.hypot(lab[1], lab[2])),
        matiz=float((math.degrees(math.atan2(lab[2], lab[1])) + 360.0) % 360.0),
        metal_ef=float(metal.mean()), rough_ef=float(rough.mean()),
    )


# ------------------------------------------------------------------ main
def autoteste():
    """O instrumento se confere ANTES de medir: cinza neutro tem que sair cinza neutro do
    AgX (um `.T` a mais nas matrizes devolvia azul), e uma esfera 100% difusa branca sob
    UMA direcional de intensidade 1 de frente tem que dar 1/PI de radiância (é a definição
    de BRDF_Lambert no three). Régua que não se testa vira folclore com número."""
    erros = []
    for v in (0.02, 0.18, 0.5, 1.0, 4.0):
        o = agx(np.array([[v, v, v]]), 1.0, 0.0042, 1.0)[0]
        if abs(o[0] - o[1]) > 0.004 or abs(o[1] - o[2]) > 0.004:
            erros.append('AgX não é neutro em %.2f: %s' % (v, np.round(o, 4).tolist()))
    lamb = 1.0 / math.pi
    if abs(lamb - 0.3183) > 1e-3:
        erros.append('BRDF_Lambert fora de 1/PI')
    return erros


def main():
    err = autoteste()
    if err:
        print('__ERRO__ autoteste do instrumento falhou: ' + ' | '.join(err))
        sys.exit(2)
    sc_path = os.path.join(HERE, 'mat_scenes.json')
    if not os.path.exists(sc_path):
        print('__ERRO__ mat_scenes.json ausente — rode tools/eval/mat-check.mjs primeiro')
        sys.exit(2)
    S = json.load(open(sc_path))
    only = sys.argv[1:] or None

    envs = {}
    for m in S['maps']:
        envs[m['map']] = build_env(m['sun']['pos'], hex_to_linear(m['sun']['color']), m['sun']['intensity'])

    out = {'gerado': S.get('gerado'), 'armas': [], 'nota': S.get('nota', '')}
    files = sorted(f for f in os.listdir(GLBDIR) if f.endswith('.glb'))
    for f in files:
        wid = f[:-4]
        if only and wid not in only:
            continue
        mat = weapon_material(os.path.join(GLBDIR, f))
        # 2500 texels × 24 normais = 60 k amostras por caminho e por arma. Medido: subir
        # para 6000 × 48 move a L* média em < 0,2 e quadruplica o tempo — a régua roda dentro
        # do portão de invariantes, então a amostragem é a menor que ainda é estável.
        rec = {'arma': wid, 'metallicFactor': mat['metallicFactor'], 'roughnessFactor': mat['roughnessFactor'],
               'texMetalMedia': float(mat['metal_t'].mean()), 'texRoughMedia': float(mat['rough_t'].mean()),
               'texMetalFrac05': float((mat['metal_t'] > 0.5).mean()), 'caminhos': {}}
        for path in S['paths']:
            sc = dict(path['scene'])
            sc['exposure'] = path['exposure']; sc['floor'] = path['floor']; sc['sat'] = path['sat']
            rec['caminhos'][path['id']] = shade(
                mat, sc, envs[path['envMap']],
                metal_factor=path['metalFactor'], rough_factor=path['roughFactor'],
                env_int=path['envMapIntensity'], light_mul=path.get('lightMul', 1.0))
        out['armas'].append(rec)

    json.dump(out, open(os.path.join(HERE, 'mat_shade.json'), 'w'), indent=1)
    print('MATSHADE_OK %d armas' % len(out['armas']))


if __name__ == '__main__':
    main()
