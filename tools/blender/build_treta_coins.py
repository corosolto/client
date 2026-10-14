import argparse
import hashlib
import json
import math
import struct
import sys
from pathlib import Path

import bpy
import bmesh
from mathutils import Vector
from mathutils.bvhtree import BVHTree

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--output', required=True)
parser.add_argument('--only')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
root, output = Path(args.root), Path(args.output)
output.mkdir(parents=True, exist_ok=True)
coins = [(1, 'saci'), (5, 'curupira'), (10, 'caipora'), (50, 'lobisomem'),
         (100, 'gotinha'), (200, 'canarinho'), (1000, 'zumbi')]

def material(name, color, metallic=1, roughness=.28):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    shader = m.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Metallic'].default_value = metallic
    shader.inputs['Roughness'].default_value = roughness
    return m


def finish(obj, name, mat, parent):
    obj.name = name
    obj.data.materials.clear()
    obj.data.materials.append(mat)
    obj.parent = parent
    if obj.type == 'MESH':
        for face in obj.data.polygons:
            face.use_smooth = True
    return obj


def text(label, pos, size, mat, parent, backside=False):
    curve = bpy.data.curves.new('Inscription', 'FONT')
    curve.body, curve.align_x, curve.align_y = label, 'CENTER', 'CENTER'
    curve.size, curve.extrude, curve.bevel_depth = size, .012, .0015
    obj = bpy.data.objects.new('Letter_' + label, curve)
    bpy.context.collection.objects.link(obj)
    obj.location = pos
    obj.rotation_euler = (math.pi / 2, 0, math.pi if backside else 0)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target='MESH')
    obj.select_set(False)
    finish(obj, 'Legend_' + label, mat, parent)


def import_portrait(character, mat, dark, parent):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(root / f'public/models/characters/{character}.glb'))
    imported = set(bpy.data.objects) - before
    rig = next(o for o in imported if o.type == 'ARMATURE')
    rig.animation_data_clear()
    head = rig.matrix_world @ rig.pose.bones['Head'].matrix.translation
    meshes = [o for o in imported if o.type == 'MESH' and not o.hide_render
              and any(m.type == 'ARMATURE' for m in o.modifiers)]
    baked = []
    for obj in meshes:
        head_group = obj.vertex_groups['Head'].index
        minimum_head_weight = .4
        head_vertices = {v.index for v in obj.data.vertices
                         if any(g.group == head_group and g.weight > minimum_head_weight for g in v.groups)}
        evaluated = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
        obj.data = bpy.data.meshes.new_from_object(evaluated, depsgraph=bpy.context.evaluated_depsgraph_get())
        obj.modifiers.clear()
        matrix = obj.matrix_world.copy()
        obj.parent = None
        for vertex in obj.data.vertices:
            vertex.co = matrix @ vertex.co
        obj.matrix_world.identity()
        bm = bmesh.new()
        bm.from_mesh(obj.data)
        bm.verts.ensure_lookup_table()
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.index not in head_vertices], context='VERTS')
        bmesh.ops.bisect_plane(bm, geom=list(bm.verts) + list(bm.edges) + list(bm.faces),
                              plane_co=(0, 0, head.z - .035), plane_no=(0, 0, 1),
                              clear_inner=True, clear_outer=False, dist=.00001)
        loose = [v for v in bm.verts if not v.link_faces]
        bmesh.ops.delete(bm, geom=loose, context='VERTS')
        bm.to_mesh(obj.data)
        bm.free()
        if obj.data.polygons:
            baked.append(obj)
    points = [v.co for o in baked for v in o.data.vertices]
    lo, hi = [Vector([f(p[i] for p in points) for i in range(3)]) for f in (min, max)]
    center = (lo + hi) / 2
    factor = min(1.40 / (hi.z - lo.z), 1.48 / (hi.x - lo.x))
    depth = max(hi.y - lo.y, .001)
    for obj in baked:
        for vertex in obj.data.vertices:
            p = vertex.co.copy()
            vertex.co = ((p.x - center.x) * factor,
                         -.245 + (p.y - lo.y) / depth * .155,
                         (p.z - center.z) * factor)
        if character == 'caipora':
            # Preserve jaw/hair; neck-only region from the 512px poster x211–295/y385–409.
            bm = bmesh.new()
            bm.from_mesh(obj.data)
            neck = [v for v in bm.verts if -.27 < v.co.x < .23 and v.co.z < -.605]
            bmesh.ops.delete(bm, geom=neck, context='VERTS')
            bm.to_mesh(obj.data)
            bm.free()
        finish(obj, 'GEO-Portrait_' + character, mat, parent)
    if character == 'caipora':
        # Reference mask: references/treta-coins/caipora.webp, eye band x95–147/y52–77.
        outline = [(-.26, .02), (-.13, .06), (-.036, .034), (0, .002),
                   (.036, .034), (.13, .06), (.26, .02), (.256, -.092),
                   (.122, -.128), (.064, -.084), (0, -.106), (-.064, -.084),
                   (-.122, -.128), (-.256, -.092)]
        surfaces = [BVHTree.FromPolygons([v.co for v in o.data.vertices],
                                        [p.vertices[:] for p in o.data.polygons]) for o in baked]
        def inside(x, z):
            parity = False
            for i, (ax, az) in enumerate(outline):
                bx, bz = outline[(i + 1) % len(outline)]
                if (az > z) != (bz > z) and x < (bx - ax) * (z - az) / (bz - az) + ax:
                    parity = not parity
            eyes = any(((x - ex) / .060) ** 2 + ((z + .043) / .025) ** 2 < 1 for ex in (-.145, .145))
            return parity and not eyes
        vertices, indices, faces = [], {}, []
        for ix in range(57):
            for iz in range(23):
                x, z = -.28 + ix * .01, -.15 + iz * .01
                if not inside(x, z):
                    continue
                hits = [tree.ray_cast(Vector((x, -1, z)), Vector((0, 1, 0)))[0] for tree in surfaces]
                hits = [hit for hit in hits if hit is not None]
                if hits:
                    hit = min(hits, key=lambda point: point.y)
                    indices[ix, iz] = len(vertices)
                    vertices.append((x, hit.y - .004, z))
        for ix in range(56):
            for iz in range(22):
                corners = [(ix, iz), (ix + 1, iz), (ix + 1, iz + 1), (ix, iz + 1)]
                if all(corner in indices for corner in corners):
                    faces.append([indices[corner] for corner in corners])
        mesh = bpy.data.meshes.new('CaiporaMaskRelief')
        mesh.from_pydata(vertices, [], faces)
        obj = bpy.data.objects.new('GEO-CaiporaEyeMask', mesh)
        bpy.context.collection.objects.link(obj)
        finish(obj, obj.name, dark, parent)
    for obj in imported:
        if obj not in baked and obj.name in bpy.data.objects:
            bpy.data.objects.remove(obj, do_unlink=True)
    print('PORTRAIT_BOUNDS', character, list(lo), list(hi), factor)


def build(value, character):
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for action in list(bpy.data.actions):
        bpy.data.actions.remove(action)
    gold = material('Treta_Gold', (.83, .48, .085), 1, .26)
    bright = material('Treta_MintedRelief', (.98, .72, .25), .92, .33)
    dark = material('Treta_InnerGold', (.34, .16, .025), .92, .35)
    parent = bpy.data.objects.new('TRETA_Coin_' + str(value), None)
    bpy.context.collection.objects.link(parent)
    bpy.ops.mesh.primitive_cylinder_add(vertices=96, radius=1, depth=.18, rotation=(math.pi / 2, 0, 0))
    disk = finish(bpy.context.object, 'GoldenBlank', gold, parent)
    bevel = disk.modifiers.new('MintedBevel', 'BEVEL')
    bevel.width, bevel.segments = .024, 3
    bpy.context.view_layer.objects.active = disk
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    for y in (-.098, .098):
        bpy.ops.mesh.primitive_torus_add(major_segments=96, minor_segments=8, major_radius=.926, minor_radius=.028,
                                       location=(0, y, 0), rotation=(math.pi / 2, 0, 0))
        finish(bpy.context.object, 'RaisedRim', bright, parent)
    for i in range(64):
        theta = i * math.tau / 64
        bpy.ops.mesh.primitive_cube_add(size=1, location=(.994 * math.cos(theta), 0, .994 * math.sin(theta)))
        obj = bpy.context.object
        obj.scale, obj.rotation_euler = (.015, .13, .019), (0, -theta, 0)
        finish(obj, 'ReededEdge_' + str(i), dark, parent)
    import_portrait(character, bright, dark, parent)
    text(str(value), (0, .13, .16), .53 if value == 1000 else .72, bright, parent, True)
    text('T$', (0, .13, -.40), .32, bright, parent, True)
    # One static mesh per material keeps a coin from costing ~70 draw calls.
    for mat in (gold, bright, dark):
        meshes = [o for o in parent.children_recursive if o.type == 'MESH' and o.data.materials[0] == mat]
        bpy.ops.object.select_all(action='DESELECT')
        for obj in meshes:
            obj.select_set(True)
        if meshes:
            bpy.context.view_layer.objects.active = meshes[0]
            bpy.ops.object.join()
    parent.rotation_euler = (0, 0, 0)
    for frame, angle in [(1, 0), (121, math.tau)]:
        parent.rotation_euler.z = angle
        parent.keyframe_insert('rotation_euler', frame=frame)
    spin = parent.animation_data.action
    spin.name = 'CoinSpin'
    for slot in spin.slots:
        for layer in spin.layers:
            for strip in layer.strips:
                bag = strip.channelbag(slot)
                if bag:
                    for curve in bag.fcurves:
                        for point in curve.keyframe_points:
                            point.interpolation = 'LINEAR'
    parent.animation_data.action = None
    for frame, scale, angle in [(1, .05, -math.pi), (20, 1.12, -.3), (32, 1, 0), (60, 1, 0)]:
        parent.scale = (scale,) * 3
        parent.rotation_euler.z = angle
        parent.keyframe_insert('scale', frame=frame)
        parent.keyframe_insert('rotation_euler', frame=frame)
    reveal = parent.animation_data.action
    reveal.name = 'PurchaseReveal'
    parent.animation_data.action = None
    for action in (spin, reveal):
        track = parent.animation_data.nla_tracks.new()
        track.name = action.name
        track.strips.new(action.name, int(action.frame_range[0]), action)
        track.mute = False
    scene = bpy.context.scene
    scene.render.fps, scene.frame_start, scene.frame_end = 30, 1, 121
    for track in parent.animation_data.nla_tracks:
        track.mute = True
    parent.rotation_euler, parent.scale = (0, 0, 0), (1, 1, 1)
    scene.frame_set(1)
    asset_objects = [parent] + list(parent.children_recursive)
    bpy.ops.object.select_all(action='DESELECT')
    for obj in asset_objects:
        obj.select_set(True)
    for track in parent.animation_data.nla_tracks:
        track.mute = False
    glb = root / f'public/models/treta/coin-{value}.glb'
    glb.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=str(glb), export_format='GLB', use_selection=True, export_animations=True,
                              export_animation_mode='NLA_TRACKS', export_apply=False, export_lights=False, export_cameras=False)
    raw = glb.read_bytes(); length = struct.unpack_from('<I', raw, 12)[0]
    doc = json.loads(raw[20:20+length])
    node = next(n for n in doc['nodes'] if n.get('name') == parent.name)
    node['scale'], node['rotation'] = [1,1,1], [0,0,0,1]
    chunk = json.dumps(doc,separators=(',',':')).encode();chunk += b' '*(-len(chunk)%4)
    tail = raw[20+length:]
    glb.write_bytes(struct.pack('<4sII',b'glTF',2,20+len(chunk)+len(tail))+struct.pack('<I4s',len(chunk),b'JSON')+chunk+tail)
    for track in parent.animation_data.nla_tracks:
        track.mute = True
    parent.rotation_euler, parent.scale = (0, 0, 0), (1, 1, 1)
    bpy.ops.object.camera_add(location=(0, -4.8, 0))
    camera = bpy.context.object
    camera.rotation_euler = (Vector((0, 0, 0)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
    camera.data.type, camera.data.ortho_scale = 'ORTHO', 2.35
    scene.camera = camera
    scene.world.color = (.2, .2, .2)
    for pos, power, size in [((-3, -3, 4), 650, 3), ((3, -2, 1), 500, 2), ((0, 2, 3), 750, 2), ((-3, 3, 4), 650, 3), ((3, 2, 1), 500, 2)]:
        bpy.ops.object.light_add(type='AREA', location=pos)
        light = bpy.context.object
        light.data.energy, light.data.shape, light.data.size = power, 'DISK', size
        light.rotation_euler = (-light.location).to_track_quat('-Z', 'Y').to_euler()
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 16
    scene.render.resolution_x = scene.render.resolution_y = 512
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.view_settings.view_transform = 'AgX'
    poster = root / f'public/img/treta/coin-{value}.png'
    poster.parent.mkdir(parents=True, exist_ok=True)
    scene.render.filepath = str(poster)
    bpy.ops.render.render(write_still=True)
    camera.location = (0, 4.8, 0)
    camera.rotation_euler = (-camera.location).to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = str(output / f'coin-{value}-back.png')
    bpy.ops.render.render(write_still=True)
    camera.location = (0, -4.8, 0)
    camera.rotation_euler = (-camera.location).to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = str(poster)
    bpy.ops.wm.save_as_mainfile(filepath=str(output / f'coin-{value}.blend'))
    metadata = {'value': value, 'character': character, 'design': 'portrait-front-value-back-v2', 'weapon': None, 'blender': bpy.app.version_string,
                'glbBytes': glb.stat().st_size, 'glbSha256': hashlib.sha256(glb.read_bytes()).hexdigest(),
                'animations': ['CoinSpin', 'PurchaseReveal'], 'poster': str(poster),
                'backPoster': str(output / f'coin-{value}-back.png'),
                'source': f'public/models/characters/{character}.glb', 'triangles': sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in asset_objects if o.type == 'MESH')}
    (output / f'coin-{value}.json').write_text(json.dumps(metadata, indent=2))
    print('TRETA_COIN_DONE', json.dumps(metadata))


for denomination, char in coins:
    if not args.only or str(denomination) == args.only:
        build(denomination, char)
