"""Acabamento v5 da Claquete Verde — mesma superfície/rig nativos da v4, só máscara
de materiais e prop de ombro corrigidos. Nenhuma chamada de API.

Defeitos da v4 que este script corrige (revisão adversarial, pontos 1 e 2):

1. MÁSCARA ESPACIAL DE MATERIAIS (v4 ~linha 63): a regra `z>1.43 & |x|<0.25`
   pintava de pele o trapézio e a gola inteira (157 tris na zona da gola, 21 nos
   topos dos ombros — medido no GLB v4), e a regra de braço `|x|>0.47 &
   0.70<z<1.23` pegava metade da mão esquerda e quase nada da direita (323 tris
   de pele × 40 — assimétrico). Cabelo/rosto era um corte de plano por centro de
   polígono, áspero. A v5:
     - cabeça/pele só em z>1.44, |x|<0.16 (medido no mesh cru: pescoço tem
       |x|≲0.10, orelhas ±0.12, trapézio chega a 0.25 — fica de fora, vira suit);
     - mãos: |x|>0.52 & 1.10<z<1.40 — as duas mãos inteiras, simétricas
       (medido: mãos ocupam |x| 0.52–0.60, z 1.16–1.34);
     - cabelo: linha inclinada (1.615 na testa → 1.545 na nuca, mesma faixa dos
       planos da v4) com voto por MAIORIA DE VÉRTICES, não centro de polígono.
2. PROP: a faixa v4 flutuava 2 cm à frente da face (stripe z_glb -0.014 × face
   -0.035) e sumia de lado/atrás; a dobradiça ficava ENTERRADA dentro da ombreira
   (hinge z_glb -0.09..-0.03 dentro do volume do pad -0.10..-0.04 — invisível).
   A v5 faz a faixa UMA banda contínua que cruza a face frontal na diagonal
   (mesmo ângulo de 24,6° da v4) e envolve as 4 faces (segmentos laterais
   horizontais + diagonal atrás), e tira a dobradiça de dentro: barril escuro ao
   longo do topo da face frontal, como a dobradiça real de uma claquete.

Modos: clean | v4-pad (prop da v4 — mutante da régua de identidade) |
gola-salmao (máscara da v4 — mutante da régua de acabamento) |
low-contrast | dorsal-slab | toy-joints (mutantes clássicos do contrato estático)
"""
import json
import math
import pathlib
import sys

import bpy


args = sys.argv[sys.argv.index("--") + 1:]
raw = pathlib.Path(args[0]).resolve()
out = pathlib.Path(args[1]).resolve()
receipt = pathlib.Path(args[2]).resolve()
mode = args[3]
MODES = {"clean", "v4-pad", "gola-salmao", "low-contrast", "dorsal-slab", "toy-joints"}
if mode not in MODES:
    raise SystemExit("invalid mode: " + mode)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(raw), import_shading="NORMALS")
armature = next(o for o in bpy.context.scene.objects if o.type == "ARMATURE")
body = max((o for o in bpy.context.scene.objects if o.type == "MESH"), key=lambda o: len(o.data.vertices))
body.name = "ClaqueteVerdeNativeSurface"
assert armature.data.bones.get("LeftShoulder"), "native Meshy rig missing LeftShoulder"
assert len(body.vertex_groups) >= 20, "native skin weights missing"
native_counts = {"vertices": len(body.data.vertices), "polygons": len(body.data.polygons)}

colors = {
    "suit": (0.010, 0.046, 0.018, 1),
    "armor": (0.020, 0.115, 0.038, 1),
    "armor_edge": (0.045, 0.180, 0.058, 1),
    "skin": (0.31, 0.105, 0.038, 1),
    "hair": (0.020, 0.007, 0.003, 1),
    "black": (0.004, 0.007, 0.006, 1),
    "clapper": (0.020, 0.155, 0.045, 1),
    "stripe": (0.96, 0.96, 0.82, 1),
    "hinge": (0.035, 0.043, 0.038, 1),
    "toy": (0.08, 0.30, 0.10, 1),
}
if mode == "low-contrast":
    colors["stripe"] = (0.030, 0.175, 0.052, 1)

materials = {}
for name, color in colors.items():
    material = bpy.data.materials.new("CV3_" + name.upper())
    material.diffuse_color = color
    material.use_nodes = True
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Roughness"].default_value = 0.61
    bsdf.inputs["Metallic"].default_value = 0.06 if name in {"armor", "armor_edge", "hinge"} else 0.0
    materials[name] = material

body.data.materials.clear()
for name in ("suit", "armor", "armor_edge", "skin", "hair", "black"):
    body.data.materials.append(materials[name])
slots = {m.name: i for i, m in enumerate(body.data.materials)}

MW = body.matrix_world


def hairline_z(y):
    # testa (y=-0.10) em 1.615 → nuca (y=+0.25) em 1.545; mesma faixa dos planos v4
    return 1.615 - 0.20 * (y + 0.10)


# voto por vértice só para cabelo: a fronteira segue os vértices, não o centro da face
vert_world = [MW @ v.co for v in body.data.vertices]
vert_hair = [(w.z > hairline_z(w.y)) for w in vert_world]

for poly in body.data.polygons:
    x, y, z = MW @ poly.center
    if mode == "gola-salmao":
        # máscara exata da v4 (mutante causal da régua de acabamento)
        if z > 1.43 and abs(x) < 0.25:
            region = "hair" if z > 1.61 or (z > 1.54 and y > 0.045) else "skin"
        elif abs(x) > 0.47 and 0.70 < z < 1.23:
            region = "skin"
        elif z < 0.22:
            region = "black"
        elif 0.69 < z < 0.81:
            region = "black"
        elif 0.84 < z < 1.39 and abs(x) < 0.31:
            region = "armor"
        elif 0.22 < z < 0.68 and abs(x) < 0.28 and y < 0.02:
            region = "armor_edge"
        else:
            region = "suit"
    else:
        if z > 1.44 and abs(x) < 0.16 and -0.17 < y < 0.28:
            votes = sum(vert_hair[vi] for vi in poly.vertices)
            region = "hair" if votes * 2 > len(poly.vertices) else "skin"
        elif abs(x) > 0.52 and 1.10 < z < 1.40:
            region = "skin"
        elif z < 0.22:
            region = "black"
        elif 0.69 < z < 0.81:
            region = "black"
        elif 0.84 < z < 1.39 and abs(x) < 0.31:
            region = "armor"
        elif 0.22 < z < 0.68 and abs(x) < 0.28 and y < 0.02:
            region = "armor_edge"
        else:
            region = "suit"
    poly.material_index = slots[materials[region].name]

props = []


def weighted(obj, name, material_name):
    obj.name = name
    obj.data.materials.append(materials[material_name])
    group = obj.vertex_groups.new(name="LeftShoulder")
    group.add(list(range(len(obj.data.vertices))), 1.0, "REPLACE")
    modifier = obj.modifiers.new("NativeArmature", "ARMATURE")
    modifier.object = armature
    props.append(obj)
    return obj


def sphere(name, location, scale, material_name, segments=20, rings=12):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=location)
    obj = weighted(bpy.context.object, name, material_name)
    obj.scale = scale
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return obj


def box(name, location, dimensions, material_name, bevel=0.0, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = weighted(bpy.context.object, name, material_name)
    obj.dimensions = dimensions
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        modifier = obj.modifiers.new("RoundedEdge", "BEVEL")
        modifier.width = bevel
        modifier.segments = 2
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    return obj


def cylinder(name, location, radius, depth, material_name, rotation=(0, 0, 0), vertices=20):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth,
                                        location=location, rotation=rotation)
    return weighted(bpy.context.object, name, material_name)


# Anatomical left is +X in the native rest pose. Mesmo centro/dimensões da v4:
# SEM aumentar altura, SEM placa dorsal.
pad_x, pad_y, pad_z = 0.350, 0.070, 1.315
box("NativeClapperShoulderPad", (pad_x, pad_y, pad_z), (0.188, 0.070, 0.112), "clapper", 0.026)

if mode == "v4-pad":
    # prop exato da v4: faixa curta flutuando à frente da face + dobradiça enterrada
    cylinder("NativeShortClapperHinge", (0.283, 0.061, 1.286), 0.024, 0.064, "hinge",
             rotation=(math.pi / 2, 0, 0))
    box("NativeReadableSurfaceStripe", (pad_x, 0.014, pad_z), (0.112, 0.0045, 0.032),
        "stripe", 0.0015, rotation=(0, -0.43, 0))
else:
    # faixa v5: UMA banda contínua (mesma inclinação de 24,6° da v4, tan=0,457)
    # cruzando a face frontal de canto a canto e envolvendo as 4 faces da ombreira.
    SLOPE = 0.457
    box("StripeFrontDiagonal", (pad_x, 0.0330, pad_z), (0.207, 0.007, 0.034),
        "stripe", 0.0015, rotation=(0, -0.43, 0))
    box("StripeBackDiagonal", (pad_x, 0.1070, pad_z), (0.207, 0.007, 0.034),
        "stripe", 0.0015, rotation=(0, -0.43, 0))
    # segmentos laterais horizontais nas cotas onde a diagonal sai da face
    box("StripeSideInner", (0.2545, pad_y, pad_z - SLOPE * 0.094), (0.007, 0.072, 0.034), "stripe", 0.0015)
    box("StripeSideOuter", (0.4455, pad_y, pad_z + SLOPE * 0.094), (0.007, 0.072, 0.034), "stripe", 0.0015)
    # dobradiça v5: barril escuro ao longo do topo da face frontal (eixo X),
    # como a dobradiça real da claquete. Protrai da face frontal e das DUAS
    # faces laterais (lê de frente e de lado a 150px) SEM aumentar altura:
    # topo em 1.355+0.016 = 1.371, exatamente o topo da ombreira da v4.
    cylinder("NativeClapperHingeBarrel", (pad_x, 0.036, 1.355), 0.016, 0.200, "hinge",
             rotation=(0, math.pi / 2, 0))

if mode == "dorsal-slab":
    box("ForbiddenDorsalSlab", (0.34, 0.135, 1.36), (0.30, 0.060, 0.42), "clapper", 0.015)
if mode == "toy-joints":
    for x, z in ((-0.30, 1.30), (0.30, 1.30), (-0.45, 1.10), (0.45, 1.10), (-0.13, 0.57), (0.13, 0.57), (-0.13, 0.18), (0.13, 0.18), (-0.24, 0.78), (0.24, 0.78)):
        sphere("ToyJoint", (x, -0.015, z), (0.075, 0.070, 0.075), "toy", 12, 7)

# Join só de meshes, corpo nativo ativo: pesos originais intactos, props rígidos
# 100% em LeftShoulder (mesma técnica da v4).
bpy.ops.object.select_all(action="DESELECT")
body.select_set(True)
for prop in props:
    prop.select_set(True)
bpy.context.view_layer.objects.active = body
bpy.ops.object.join()
body = bpy.context.object
body.name = "ClaqueteVerdeV5Clean" if mode == "clean" else "ClaqueteVerdeV5Mutant"
body.data.calc_loop_triangles()

assert len(armature.data.bones) == 24
assert body.vertex_groups.get("LeftShoulder") is not None
assert len(body.data.vertices) >= native_counts["vertices"]

out.parent.mkdir(parents=True, exist_ok=True)
receipt.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action="DESELECT")
armature.select_set(True)
body.select_set(True)
bpy.context.view_layer.objects.active = armature
bpy.ops.export_scene.gltf(
    filepath=str(out),
    export_format="GLB",
    use_selection=True,
    export_yup=True,
    export_animations=False,
    export_attributes=True,
)

data = {
    "mode": mode,
    "nativeRig": str(raw),
    "nativeBody": native_counts,
    "finalBody": {
        "vertices": len(body.data.vertices),
        "triangles": len(body.data.loop_triangles),
        "vertexGroups": len(body.vertex_groups),
    },
    "armatureBones": len(armature.data.bones),
    "surfacePolicy": "exact native-rigged Meshy A body retained; only materials plus rigid LeftShoulder prop",
    "v5Changes": {
        "materialsMask": mode != "gola-salmao",
        "wraparoundStripe": mode != "v4-pad",
        "externalHingeBarrel": mode != "v4-pad",
    },
    "clapper": {
        "anatomicalSide": "left",
        "bone": "LeftShoulder",
        "belowHead": True,
        "dorsalSlab": mode == "dorsal-slab",
    },
    "newApiCredits": 0,
}
receipt.write_text(json.dumps(data, indent=2) + "\n")
print(json.dumps(data))
