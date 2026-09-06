"""Shape the private M4 arm meshes without changing shared identity or camera."""
import json
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree


def refine(rig, objects, output):
    def bone(name):
        return rig.matrix_world @ rig.pose.bones[name].head
    def percentile(values, fraction):
        values = sorted(values)
        return values[min(len(values)-1, int((len(values)-1)*fraction))] if values else None
    skin = next(o for o in objects if o.name == 'GEO_FP_SK_Hand')
    # The donor's separate wrist skin protrudes through both the sleeve and glove
    # after posing. Fit that under-layer around its weighted skeletal axes.
    skin_groups = {g.index:g.name for g in skin.vertex_groups}
    skin_delta = []
    for vertex in skin.data.vertices:
        p = skin.matrix_world @ vertex.co
        center, total = Vector(), 0.
        for group in vertex.groups:
            b = rig.pose.bones.get(skin_groups[group.group])
            if b is None or group.weight<=0:
                continue
            start, end = rig.matrix_world @ b.head, rig.matrix_world @ b.tail
            segment = end-start
            if segment.length_squared<=1e-10:
                continue
            closest = start+segment*max(0.,min(1.,(p-start).dot(segment)/segment.length_squared))
            center += closest*group.weight
            total += group.weight
        if total:
            delta = (center/total-p)*.45
            vertex.co = skin.matrix_world.inverted() @ (p+delta)
            skin_delta.append(delta.length)
    skin.data.update()
    skin_tree = BVHTree.FromPolygons([skin.matrix_world @ v.co for v in skin.data.vertices],
                                   [tuple(p.vertices) for p in skin.data.polygons])
    gun = bpy.data.objects['MINT_WEAPON_M4']
    gun_tree = BVHTree.FromPolygons([gun.matrix_world @ v.co for v in gun.data.vertices],
                                  [tuple(p.vertices) for p in gun.data.polygons])
    report = {'scope':'M4 private geometry and cuff UVs; shared atlases and bone lengths unchanged',
              'wrist_skin_fit':{'vertices':len(skin_delta),'max_displacement':max(skin_delta)}, 'sides':{}}
    for side in ['l','r']:
        elbow, wrist = bone('lowerarm_'+side), bone('hand_'+side)
        axis = (wrist-elbow).normalized()
        length = (wrist-elbow).length
        ends = {'cloth':[], 'glove':[]}
        for obj in objects:
            role = 'cloth' if 'Cloth' in obj.name else 'glove' if 'Glove' in obj.name else None
            if not role:
                continue
            groups = {g.index:g.name for g in obj.vertex_groups}
            for vertex in obj.data.vertices:
                if sum(g.weight for g in vertex.groups if groups[g.group].endswith('_'+side))<.75:
                    continue
                p = obj.matrix_world @ vertex.co
                along = (p-elbow).dot(axis)
                if .4<along/length<1.2 and (p-elbow-along*axis).length<.08:
                    ends[role].append(along)
        cloth_end, glove_start = max(ends['cloth']), min(ends['glove'])
        cuff_extension = max(0.,glove_start-cloth_end+.006)
        palm = (wrist + bone('middle_01_'+side))*.5
        forward = (bone('middle_01_'+side)-wrist).normalized()
        across = (bone('index_01_'+side)-bone('pinky_01_'+side)).normalized()
        dorsal = across.cross(forward).normalized()
        camera_side = Vector((.12,-.02,1.766))-palm
        if dorsal.dot(camera_side)<0:
            dorsal.negate()
        samples_before, samples_after = [], []
        uv_faces = {'cloth':0, 'glove':0}
        moved = {'cloth':0, 'glove':0}
        max_delta = {'cloth':0., 'glove':0.}
        for obj in objects:
            groups = {g.index:g.name for g in obj.vertex_groups}
            inverse = obj.matrix_world.inverted()
            is_cloth = 'Cloth' in obj.name
            is_glove = 'Glove' in obj.name
            if not (is_cloth or is_glove):
                continue
            for vertex in obj.data.vertices:
                weights = {groups[g.group]:g.weight for g in vertex.groups}
                if sum(v for k,v in weights.items() if k.endswith('_'+side))<.75:
                    continue
                p = obj.matrix_world @ vertex.co
                original = p.copy()
                along = (p-elbow).dot(axis)
                t = along/length
                radial = p-(elbow+along*axis)
                radius = radial.length
                if is_cloth and -.15<t<1.10 and radius>1e-8:
                    if .1<t<.95:
                        samples_before.append(radius)
                    blend = min(1., max(0.,(t+.15)/.25))
                    fit = 1.-blend*(.22+.10*max(0,min(1,t)))
                    hit = skin_tree.ray_cast(elbow+along*axis, radial.normalized(), radius+.02)
                    fitted_radius = max(radius*fit, hit[3]+.003 if hit[0] is not None else 0)
                    fitted_radius = min(radius, fitted_radius)
                    p -= radial*(1-fitted_radius/radius)
                    # Carry the existing cuff towards the glove; no new glove design.
                    cuff = max(0.,min(1.,(along-(cloth_end-.045))/.045))
                    p += axis*(cuff_extension*cuff*cuff)
                    if .1<t<.95:
                        samples_after.append(fitted_radius)
                if is_glove:
                    palm_weight = weights.get('hand_'+side,0.)
                    depth = (p-palm).dot(dorsal)
                    contact = gun_tree.find_nearest(p)
                    if depth>.009 and palm_weight>.25 and contact[3]>.004:
                        p -= dorsal*((depth-.009)*.58*palm_weight)
                    # Vary finger thickness around the authored phalanges, keeping
                    # vertices close to the weapon surface fixed in this idle pose.
                    fingers = [(k,w) for k,w in weights.items()
                               if k.endswith('_'+side) and k.split('_')[0] in
                               ['index','middle','ring','pinky','thumb']]
                    if fingers and contact[3]>.004:
                        name, weight = max(fingers, key=lambda item:item[1])
                        b = rig.pose.bones[name]
                        start, end = rig.matrix_world @ b.head, rig.matrix_world @ b.tail
                        segment = end-start
                        if segment.length_squared>1e-10:
                            closest = start+segment*max(0.,min(1.,(p-start).dot(segment)/segment.length_squared))
                            amount = {'index':.13,'middle':.10,'ring':.18,'pinky':.24,'thumb':.08}[name.split('_')[0]]
                            p -= (p-closest)*amount*weight
                delta = (p-original).length
                role = 'cloth' if is_cloth else 'glove'
                if delta>1e-8:
                    moved[role]+=1
                    max_delta[role]=max(max_delta[role],delta)
                    vertex.co = inverse @ p
            obj.data.update()
            # The donor cuff crosses coloured islands in the pistol atlas. Map
            # entire cuff faces into the matching cloth/glove region; mapping
            # only some corners would interpolate across unrelated atlas islands.
            layer = obj.data.uv_layers.active
            role = 'cloth' if is_cloth else 'glove'
            for face in obj.data.polygons:
                points = [obj.matrix_world @ obj.data.vertices[i].co for i in face.vertices]
                weights = [sum(g.weight for g in obj.data.vertices[i].groups
                           if groups[g.group].endswith('_'+side)) for i in face.vertices]
                ts = [(p-elbow).dot(axis)/length for p in points]
                cuff_face = min(weights)>.75 and (max(ts)>.70 if is_cloth else min(ts)<1.12)
                if not cuff_face:
                    continue
                uv_faces[role]+=1
                for loop in face.loop_indices:
                    u,v = layer.data[loop].uv
                    # Central E atlas: blank sleeve and back-of-glove rectangles.
                    layer.data[loop].uv = (.10+.35*u,.10+.35*v) if is_cloth else (.62+.08*u,.61+.15*v)
        report['sides'][side] = {'forearm_length':length, 'moved_vertices':moved,'maximum_displacement':max_delta,
            'cuff_extension':cuff_extension, 'original_cuff_gap_along_arm':glove_start-cloth_end,
            'remapped_cuff_faces':uv_faces,
            'sleeve_radius_before':{'p50':percentile(samples_before,.5),'p95':percentile(samples_before,.95)},
            'sleeve_radius_after':{'p50':percentile(samples_after,.5),'p95':percentile(samples_after,.95)}}
    (output/'hands-shape.json').write_text(json.dumps(report,indent=2)+'\n')
    return report
