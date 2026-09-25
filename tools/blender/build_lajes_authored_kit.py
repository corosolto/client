import math
import os
import sys

import bpy


ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
TEX = os.path.join(ROOT, 'public', 'img', 'textures')
OUT = os.path.join(ROOT, 'public', 'models', 'props')


def reset():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for blocks in (bpy.data.meshes, bpy.data.materials, bpy.data.images):
        for block in list(blocks):
            if block.users == 0:
                blocks.remove(block)


def material(name, color, normal=None, rough=None, roughness=0.9, metalness=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    mat.use_backface_culling = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metalness
    color_node = mat.node_tree.nodes.new('ShaderNodeTexImage')
    color_node.image = bpy.data.images.load(os.path.join(TEX, color), check_existing=True)
    mat.node_tree.links.new(color_node.outputs['Color'], bsdf.inputs['Base Color'])
    if normal:
        normal_node = mat.node_tree.nodes.new('ShaderNodeTexImage')
        normal_node.image = bpy.data.images.load(os.path.join(TEX, normal), check_existing=True)
        normal_node.image.colorspace_settings.name = 'Non-Color'
        normal_map = mat.node_tree.nodes.new('ShaderNodeNormalMap')
        normal_map.inputs['Strength'].default_value = 0.72
        mat.node_tree.links.new(normal_node.outputs['Color'], normal_map.inputs['Color'])
        mat.node_tree.links.new(normal_map.outputs['Normal'], bsdf.inputs['Normal'])
    if rough:
        rough_node = mat.node_tree.nodes.new('ShaderNodeTexImage')
        rough_node.image = bpy.data.images.load(os.path.join(TEX, rough), check_existing=True)
        rough_node.image.colorspace_settings.name = 'Non-Color'
        mat.node_tree.links.new(rough_node.outputs['Color'], bsdf.inputs['Roughness'])
    return mat


def flat_material(name, color, roughness=0.85, metalness=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    mat.use_backface_culling = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metalness
    return mat


def box(name, loc, size, mat, bevel=0.025, rotation=(0, 0, 0), uv_size=1.2):
    bpy.ops.mesh.primitive_cube_add(location=loc, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        mod = obj.modifiers.new('edge_softness', 'BEVEL')
        mod.width = bevel
        mod.segments = 2
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=mod.name)
    if mat:
        obj.data.materials.append(mat)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.cube_project(cube_size=uv_size)
    bpy.ops.object.mode_set(mode='OBJECT')
    return obj


def cylinder(name, loc, radius, depth, mat, rotation=(0, 0, 0), vertices=12):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth,
                                       location=loc, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    return obj


def facade_unit(prefix, cx, front, width, body_depth, brick, concrete, steel, zinc,
                door_x, window_x, paint=None, seed=0, height=5.0):
    wall = paint or brick
    back = front + body_depth
    box(f'{prefix}_body', (cx, front + body_depth / 2, height / 2),
        (width, body_depth, height), wall, uv_size=1.05)
    for x in (cx - width / 2 + 0.1, cx + width / 2 - 0.1):
        box(f'{prefix}_column_{x:.1f}', (x, front - 0.06, height / 2),
            (0.2, 0.22, height), concrete, bevel=0.015, uv_size=0.8)
    for z in (2.38, height - 0.18):
        box(f'{prefix}_beam_{z:.1f}', (cx, front - 0.07, z),
            (width, 0.2, 0.18), concrete, bevel=0.012, uv_size=0.8)
    dx = cx + door_x
    box(f'{prefix}_door_recess', (dx, front - 0.112, 1.05), (0.98, 0.08, 2.1),
        flat_material(f'{prefix}_door_dark', (0.055, 0.06, 0.055), 0.72, 0.25), bevel=0.01)
    box(f'{prefix}_door', (dx, front - 0.165, 1.02), (0.82, 0.055, 1.94), steel, bevel=0.02, uv_size=0.7)
    wx = cx + window_x
    glass = flat_material(f'{prefix}_glass', (0.035, 0.065, 0.075), 0.25, 0.08)
    box(f'{prefix}_window_recess', (wx, front - 0.115, 1.38), (1.08, 0.07, 1.12), glass, bevel=0.01)
    frame = flat_material(f'{prefix}_frame', (0.075, 0.07, 0.06), 0.65, 0.4)
    for ox in (-0.46, 0, 0.46):
        box(f'{prefix}_bar_v_{ox}', (wx + ox, front - 0.175, 1.38), (0.035, 0.04, 1.08), frame, bevel=0.006)
    for oz in (-0.48, 0, 0.48):
        box(f'{prefix}_bar_h_{oz}', (wx, front - 0.176, 1.38 + oz), (0.96, 0.04, 0.035), frame, bevel=0.006)
    if height >= 4.4:
        upper_x = cx - window_x * 0.62
        box(f'{prefix}_window_upper', (upper_x, front - 0.12, 3.62), (1.12, 0.07, 1.05), glass, bevel=0.01)
        for ox in (-0.46, 0, 0.46):
            box(f'{prefix}_upper_bar_{ox}', (upper_x + ox, front - 0.177, 3.62),
                (0.035, 0.04, 1.0), frame, bevel=0.006)
        if seed % 2:
            box(f'{prefix}_balcony', (upper_x, front - 0.52, 2.83),
                (1.75, 0.92, 0.16), concrete, bevel=0.025, uv_size=0.7)
            for ox in (-0.78, -0.26, 0.26, 0.78):
                box(f'{prefix}_baluster_{ox}', (upper_x + ox, front - 0.93, 3.28),
                    (0.045, 0.045, 0.82), frame, bevel=0.006)
            box(f'{prefix}_balcony_rail', (upper_x, front - 0.93, 3.7),
                (1.68, 0.055, 0.055), frame, bevel=0.008)
    awning_z = 2.18 + (seed % 2) * 0.08
    box(f'{prefix}_awning', (dx, front - 0.62, awning_z), (1.55, 1.15, 0.08), zinc,
        bevel=0.018, rotation=(math.radians(-9), 0, 0), uv_size=0.55)
    box(f'{prefix}_threshold', (dx, front - 0.34, 0.08), (1.18, 0.62, 0.16), concrete,
        bevel=0.025, uv_size=0.7)
    meter_x = cx + (-width * 0.35 if seed % 2 else width * 0.35)
    box(f'{prefix}_meter', (meter_x, front - 0.18, 2.92), (0.28, 0.12, 0.38), steel, bevel=0.025)
    cylinder(f'{prefix}_conduit', (meter_x, front - 0.19, 3.8), 0.025, 1.55, frame,
             rotation=(0, 0, 0), vertices=8)
    return back


def roof_details(prefix, x0, x1, y0, y1, brick, concrete, steel, broken=False):
    z = 5.0
    box(f'{prefix}_roof', ((x0 + x1) / 2, (y0 + y1) / 2, z + 0.05),
        (x1 - x0, y1 - y0, 0.1), concrete, bevel=0.015, uv_size=1.3)
    segments = [
        ((x0 + x1) / 2, y0, x1 - x0, 0.18),
        (x0, (y0 + y1) / 2, 0.18, y1 - y0),
        (x1, (y0 + y1) / 2, 0.18, y1 - y0),
        ((x0 + x1) / 2, y1, x1 - x0, 0.18),
    ]
    for i, (x, y, w, d) in enumerate(segments):
        if broken and i == 0:
            box(f'{prefix}_parapet_{i}a', (x0 + (x1 - x0) * 0.22, y, 5.48),
                ((x1 - x0) * 0.34, d, 0.86), brick, bevel=0.02, uv_size=0.7)
            box(f'{prefix}_parapet_{i}b', (x0 + (x1 - x0) * 0.78, y, 5.48),
                ((x1 - x0) * 0.34, d, 0.86), brick, bevel=0.02, uv_size=0.7)
        else:
            box(f'{prefix}_parapet_{i}', (x, y, 5.48), (w, d, 0.86),
                brick if i % 2 == 0 else concrete, bevel=0.02, uv_size=0.7)
    for x in (x0 + 0.35, x1 - 0.35):
        cylinder(f'{prefix}_rebar_{x:.1f}', (x, y1 - 0.2, 6.02), 0.018, 1.2, steel,
                 vertices=8)


def common_materials():
    brick = material('brick_baiano', 'lajes_tijolo_baiano_color.webp',
                     'lajes_tijolo_baiano_normal.webp', roughness=0.96)
    concrete = material('concrete', 'pbr_concrete046_color.webp',
                        'pbr_concrete046_normal.webp', 'pbr_concrete046_rough.webp')
    plaster = material('plaster', 'pbr_paintedplaster017_color.webp',
                       'pbr_paintedplaster017_normal.webp', 'pbr_paintedplaster017_rough.webp')
    zinc = material('zinc', 'tex_zinco.webp', roughness=0.82, metalness=0.16)
    steel = flat_material('painted_steel', (0.14, 0.16, 0.15), 0.7, 0.38)
    blue = flat_material('faded_blue_plaster', (0.25, 0.38, 0.42), 0.93)
    ochre = flat_material('faded_ochre_plaster', (0.52, 0.39, 0.24), 0.94)
    return brick, concrete, plaster, zinc, steel, blue, ochre


def module_a():
    brick, concrete, plaster, zinc, steel, blue, _ = common_materials()
    units = [(-2.55, -3.5, 2.5, 6.7, -0.55, 0.45, None),
             (0.0, -3.05, 2.6, 6.25, -0.45, 0.5, None),
             (2.55, -3.3, 2.5, 6.5, 0.52, -0.42, blue)]
    for i, args in enumerate(units):
        facade_unit(f'a{i}', *args[:4], brick, concrete, steel, zinc,
                    args[4], args[5], paint=args[6], seed=i)
    roof_details('a', -3.8, 3.8, -3.5, 3.2, brick, concrete, steel, broken=True)


def module_b():
    brick, concrete, plaster, zinc, steel, _, ochre = common_materials()
    facade_unit('b0', -1.9, -3.25, 3.6, 6.45, brick, concrete, steel, zinc,
                -0.72, 0.65, paint=None, seed=3)
    facade_unit('b1', 1.75, -2.65, 3.7, 3.0, brick, concrete, steel, zinc,
                0.72, -0.68, paint=ochre, seed=4, height=2.75)
    box('b_rear_upper', (1.75, 1.72, 2.5), (3.7, 2.9, 5.0), brick, uv_size=1.0)
    box('b_low_roof', (1.75, -1.12, 2.8), (3.7, 3.1, 0.1), concrete, bevel=0.015, uv_size=1.0)
    box('b_low_parapet', (1.75, -2.62, 3.23), (3.7, 0.18, 0.85), ochre, bevel=0.02)
    box('b_corner_brick', (3.35, 1.2, 3.35), (0.55, 3.9, 3.1), brick, uv_size=0.9)
    box('b_zinc_side', (3.57, 0.35, 3.0), (0.08, 2.7, 1.6), zinc, bevel=0.015,
        rotation=(0, math.radians(3), 0), uv_size=0.6)
    roof_details('b', -3.7, 3.6, 0.2, 3.2, brick, concrete, steel, broken=True)


def module_c():
    brick, concrete, plaster, zinc, steel, blue, _ = common_materials()
    facade_unit('c0', -2.2, -3.0, 3.2, 6.2, brick, concrete, steel, zinc,
                -0.55, 0.55, paint=blue, seed=5, height=2.8)
    facade_unit('c1', 1.6, -3.55, 4.4, 6.75, brick, concrete, steel, zinc,
                0.85, -0.75, paint=None, seed=6, height=2.8)
    box('c_terrace', (0, -0.1, 2.85), (7.6, 6.7, 0.12), concrete, bevel=0.018, uv_size=1.2)
    box('c_upper_setback', (1.15, 0.82, 4.02), (4.8, 4.2, 2.35), brick, uv_size=1.0)
    box('c_upper_beam', (1.15, -1.31, 4.1), (4.8, 0.2, 0.2), concrete, bevel=0.012)
    glass = flat_material('c_upper_glass', (0.03, 0.065, 0.075), 0.24, 0.08)
    box('c_upper_window', (0.3, -1.43, 4.0), (1.4, 0.08, 1.05), glass, bevel=0.015)
    box('c_upper_door', (2.15, -1.43, 3.8), (0.9, 0.08, 1.75), steel, bevel=0.015)
    for x in (-3.7, -1.3):
        box(f'c_terrace_parapet_{x}', (x, -2.9, 3.3), (2.35, 0.18, 0.82),
            brick, bevel=0.02, uv_size=0.7)
    for x in (-3.72, 3.7):
        box(f'c_exposed_column_{x}', (x, 2.85, 3.1), (0.24, 0.24, 6.2), concrete,
            bevel=0.012, uv_size=0.65)
        for ox in (-0.055, 0.055):
            cylinder(f'c_rebar_{x}_{ox}', (x + ox, 2.85, 6.5), 0.014, 1.2, steel,
                     vertices=8)
    roof_details('c', -1.25, 3.55, -1.3, 2.92, brick, concrete, steel, broken=True)


def module_d():
    brick, concrete, plaster, zinc, steel, blue, ochre = common_materials()
    facade_unit('d_left', -1.7, -3.25, 4.0, 6.45, brick, concrete, steel, zinc,
                -0.7, 0.65, paint=blue, seed=7)
    box('d_shop_back', (2.15, 0.55, 2.5), (3.4, 5.3, 5.0), ochre, uv_size=1.0)
    for x in (0.55, 2.1, 3.65):
        box(f'd_pilotis_{x}', (x, -2.65, 1.35), (0.22, 0.22, 2.7), concrete,
            bevel=0.015, uv_size=0.7)
    box('d_shop_shutter', (2.1, -2.82, 1.28), (2.75, 0.08, 2.35), steel,
        bevel=0.012, uv_size=0.7)
    box('d_upper_overhang', (2.05, -1.45, 3.7), (3.65, 2.65, 2.6), brick,
        uv_size=0.95)
    box('d_upper_window', (2.05, -2.8, 3.8), (1.65, 0.08, 1.05),
        flat_material('d_glass', (0.03, 0.06, 0.07), 0.25, 0.08), bevel=0.012)
    box('d_marquise', (2.05, -3.28, 2.62), (3.7, 0.95, 0.09), zinc,
        bevel=0.015, rotation=(math.radians(-7), 0, 0), uv_size=0.55)
    roof_details('d', -3.7, 3.75, -0.2, 3.2, brick, concrete, steel, broken=True)


def module_e():
    brick, concrete, plaster, zinc, steel, blue, ochre = common_materials()
    box('e_rear_wall', (0, 1.65, 2.5), (7.2, 3.1, 5.0), brick, uv_size=1.0)
    rear_glass = flat_material('e_rear_glass', (0.03, 0.06, 0.07), 0.24, 0.08)
    for x in (-1.9, 1.9):
        box(f'e_rear_window_{x}', (x, 3.215, 3.35), (1.35, 0.07, 1.05),
            rear_glass, bevel=0.012)
    box('e_rear_door', (0, 3.215, 1.25), (0.95, 0.07, 2.35), steel, bevel=0.012)
    box('e_rear_awning', (0, 3.55, 2.55), (2.1, 0.75, 0.08), zinc,
        bevel=0.015, rotation=(math.radians(7), 0, 0), uv_size=0.55)
    for x in (-3.45, -1.15, 1.15, 3.45):
        box(f'e_column_{x}', (x, -1.2, 2.5), (0.24, 5.7, 5.0), concrete,
            bevel=0.012, uv_size=0.7)
        for ox in (-0.055, 0.055):
            cylinder(f'e_rebar_{x}_{ox}', (x + ox, -3.8, 5.75), 0.014, 1.5, steel,
                     vertices=8)
    box('e_left_infill', (-2.3, -1.65, 1.35), (2.05, 3.8, 2.7), blue, uv_size=0.9)
    box('e_right_infill', (2.3, -0.7, 2.05), (2.05, 3.5, 4.1), brick, uv_size=0.9)
    box('e_opening', (0, -3.18, 1.5), (1.7, 0.08, 2.7),
        flat_material('e_void', (0.025, 0.028, 0.026), 0.95), bevel=0.005)
    box('e_zinc_patch', (-2.3, -3.25, 2.35), (2.1, 0.08, 1.2), zinc,
        bevel=0.012, rotation=(0, math.radians(4), 0), uv_size=0.5)
    box('e_full_slab', (0, -0.3, 5.02), (7.35, 6.9, 0.16), concrete,
        bevel=0.018, uv_size=1.2)
    for i, (x, y, w, d) in enumerate((
            (-2.4, -3.72, 2.2, 0.18), (2.45, -3.72, 2.1, 0.18),
            (-3.62, -0.25, 0.18, 6.7), (3.62, 0.6, 0.18, 4.9))):
        box(f'e_parapet_{i}', (x, y, 5.48), (w, d, 0.86),
            brick if i < 2 else concrete, bevel=0.02, uv_size=0.7)


def export(name, builder):
    reset()
    builder()
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
    bpy.ops.object.select_all(action='DESELECT')
    for obj in meshes:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.join()
    meshes[0].name = name
    scene = bpy.context.scene
    scene['creator'] = 'CS BRASIL project'
    scene['source'] = 'tools/blender/build_lajes_authored_kit.py'
    scene['license'] = 'AGPL-3.0-only'
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, f'{name}.glb')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_yup=True,
                              export_apply=True, export_extras=True,
                              export_materials='EXPORT', export_image_format='AUTO')
    print('EXPORTED', path)


for asset_name, asset_builder in (
    ('lajes_modulo_a', module_a),
    ('lajes_modulo_b', module_b),
    ('lajes_modulo_c', module_c),
    ('lajes_modulo_d', module_d),
    ('lajes_modulo_e', module_e),
):
    export(asset_name, asset_builder)
