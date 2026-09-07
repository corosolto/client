"""Shared helpers for the M4 action candidate: rig maths, mesh selection, timing.

Everything here works in WORLD space and converts to Blender pose space only when
writing bone bases. Bone hierarchy maths are re-derived from rest matrices; the
first posed frame asserts them against Blender's own evaluation.
"""
import math
import bpy
import bmesh
from mathutils import Matrix, Quaternion, Vector

FPS = 30
GAME_RELOAD_SECONDS = 2.4      # data/weapons.js m4.reload; not altered here
GAME_FIRE_INTERVAL = 0.09      # data/weapons.js m4.rate
GAME_RELOAD_EVENTS = {'mag_out': .18, 'mag_in': .62, 'bolt': .86}   # game.js _reloadLayers
CS16_DRAW_SECONDS = 1.0        # vmconfig.js VM_FAMILY.ar.cs16.draw


def smooth(s):
    s = min(1., max(0., s))
    return s * s * (3 - 2 * s)


def ease_out(s):
    s = min(1., max(0., s))
    return 1 - (1 - s) ** 3


def ease_in(s):
    s = min(1., max(0., s))
    return s ** 3


def segment(t, t0, t1, curve=smooth):
    """Normalised, eased progress of t inside [t0, t1]."""
    if t1 <= t0:
        return 1. if t >= t1 else 0.
    return curve((t - t0) / (t1 - t0))


def lerp_matrix(a, b, s):
    q = a.to_quaternion().slerp(b.to_quaternion(), s)
    p = a.translation.lerp(b.translation, s)
    return Matrix.Translation(p) @ q.to_matrix().to_4x4()


def basis(forward, up):
    """Right-handed orthonormal 3x3 from a forward and an approximate up vector."""
    f = forward.normalized()
    r = f.cross(up).normalized()
    u = r.cross(f).normalized()
    m = Matrix.Identity(3)
    m.col[0], m.col[1], m.col[2] = f, u, r
    return m


def swing_twist_angle(delta, axis):
    """Signed rotation of quaternion `delta` about unit `axis` (swing-twist split)."""
    v = Vector((delta.x, delta.y, delta.z))
    proj = v.dot(axis)
    twist = Quaternion((delta.w, *(axis * proj)))
    twist.normalize()
    angle = 2 * math.atan2(proj, delta.w)
    # Quaternion q and -q describe the same physical pose.  Keep the shortest
    # representation so a 5-degree wrist adjustment cannot become a 355-degree
    # deformation of the sleeve/skin layer.
    return (angle + math.pi) % (2 * math.pi) - math.pi


class Rig:
    """FK rig driver with its own hierarchy maths; no constraints or drivers exist."""

    def __init__(self, rig):
        self.rig = rig
        self.world = rig.matrix_world.copy()
        self.world_inv = self.world.inverted()
        self.rest = {b.name: b.matrix_local.copy() for b in rig.data.bones}
        self.parent = {b.name: b.parent.name if b.parent else None for b in rig.data.bones}
        self.idle = {name: self.rigid_world(rest) for name, rest in self.rest.items()}
        for pb in rig.pose.bones:
            assert pb.matrix_basis == Matrix.Identity(4), f'{pb.name} basis is not identity in the approved bind'
            pb.rotation_mode = 'QUATERNION'
        self.order = []
        seen = set()

        def visit(name):
            if name in seen:
                return
            if self.parent[name]:
                visit(self.parent[name])
            seen.add(name)
            self.order.append(name)
        for b in rig.data.bones:
            visit(b.name)
        self._verified = False

    def rigid_world(self, armature_matrix):
        """World matrix of an armature-space matrix with the rig's uniform scale removed."""
        m = self.world @ armature_matrix
        return Matrix.Translation(m.translation) @ m.to_3x3().normalized().to_4x4()

    def to_armature(self, world_rigid):
        m = self.world_inv @ world_rigid
        return Matrix.Translation(m.translation) @ m.to_3x3().normalized().to_4x4()

    def head(self, name):
        return self.idle[name].translation.copy()

    def tail(self, name):
        return self.world @ self.rig.data.bones[name].tail_local

    def apply(self, desired_world=None, local_rotation=None, frame=None, verify=False):
        """Set bone bases so bones in `desired_world` reach those world matrices and
        bones in `local_rotation` rotate about their own rest frame. Everything else
        follows its parent rigidly. Returns pose (armature space) matrices."""
        desired_world = desired_world or {}
        local_rotation = local_rotation or {}
        pose = {}
        for name in self.order:
            parent = self.parent[name]
            parent_pose = pose[parent] if parent else Matrix.Identity(4)
            rel = (self.rest[parent].inverted() @ self.rest[name]) if parent else self.rest[name]
            base = parent_pose @ rel
            if name in desired_world:
                b = base.inverted() @ self.to_armature(desired_world[name])
            elif name in local_rotation:
                b = local_rotation[name].to_4x4()
            else:
                b = Matrix.Identity(4)
            scale = b.to_scale()
            assert all(abs(v - 1) < 1e-4 for v in scale), f'{name}: scaled basis {tuple(scale)}; targets must be unscaled'
            pose[name] = base @ b
            pb = self.rig.pose.bones[name]
            pb.matrix_basis = b
            if frame is not None:
                pb.keyframe_insert('location', frame=frame, group=name)
                pb.keyframe_insert('rotation_quaternion', frame=frame, group=name)
        if verify or not self._verified:
            bpy.context.view_layer.update()
            worst = 0.
            for name, target in desired_world.items():
                got = self.rigid_world(self.rig.pose.bones[name].matrix)
                worst = max(worst, max(abs(a - b) for ra, rb in zip(got, target) for a, b in zip(ra, rb)))
            assert worst < 1e-5, f'hierarchy maths disagree with Blender: {worst}'
            self._verified = True
        return pose

    def two_bone(self, side, hand_world, elbow_hint=None):
        """Solve upperarm/lowerarm so the hand head reaches `hand_world` translation.
        Bone heads are the joints (the donor skeleton's tails are not children's heads)."""
        up, low, hand = f'upperarm_{side}', f'lowerarm_{side}', f'hand_{side}'
        a, b, c = self.head(up), self.head(low), self.head(hand)
        l1, l2 = (b - a).length, (c - b).length
        target = hand_world.translation
        d_vec = target - a
        reach = l1 + l2
        d = min(d_vec.length, reach * .995)
        stretch = d_vec.length / reach
        u = d_vec.normalized()
        hint = (elbow_hint if elbow_hint is not None else b) - a
        pole = hint - u * hint.dot(u)
        if pole.length < 1e-6:
            pole = Vector((0, 0, -1)) - u * Vector((0, 0, -1)).dot(u)
        pole.normalize()
        along = (l1 ** 2 - l2 ** 2 + d ** 2) / (2 * d)
        height = math.sqrt(max(0., l1 ** 2 - along ** 2))
        elbow = a + u * along + pole * height
        out = {}
        for name, origin, old, new in [(up, a, b - a, elbow - a), (low, b, c - b, target - elbow)]:
            rot = old.rotation_difference(new).to_matrix().to_4x4()
            idle = self.idle[name]
            out[name] = Matrix.Translation(origin if name == up else elbow) @ rot @ Matrix.Translation(-idle.translation) @ idle
        out[hand] = hand_world.copy()
        # Forearm twist bone carries half of the wrist's roll about the forearm axis.
        axis = (target - elbow).normalized()
        rel_idle = self.idle[hand].to_quaternion() @ self.idle[low].to_quaternion().inverted()
        rel_now = hand_world.to_quaternion() @ out[low].to_quaternion().inverted()
        delta = rel_now @ rel_idle.inverted()
        twist = swing_twist_angle(delta, axis)
        return out, {'stretch': stretch, 'twist': twist, 'elbow': elbow}

    def twist_rotation(self, side, twist, low_world):
        name = f'lowerarm_twist_01_{side}'
        axis_world = (low_world.to_3x3() @ Vector((0, 1, 0))).normalized()
        local_axis = self.idle[name].to_3x3().inverted() @ axis_world
        return Matrix.Rotation(twist * .5, 3, local_axis.normalized())

    def finger_axes(self, side):
        """Per-joint flexion axis (bone local) and idle bend angle, from the idle chain."""
        result = {}
        hand_head = self.head(f'hand_{side}')
        for finger in ['index', 'middle', 'ring', 'pinky', 'thumb']:
            names = [f'{finger}_0{k}_{side}' for k in (1, 2, 3)]
            heads = [self.head(n) for n in names] + [self.tail(names[2])]
            prev = heads[0] - hand_head
            for k, name in enumerate(names):
                seg = heads[k + 1] - heads[k]
                axis_world = prev.cross(seg)
                bend = prev.angle(seg) if axis_world.length > 1e-9 else 0.
                if axis_world.length < 1e-9:
                    axis_world = Vector((1, 0, 0))
                local = self.idle[name].to_3x3().inverted() @ axis_world.normalized()
                result[name] = (local.normalized(), bend)
                prev = seg
        return result

    @staticmethod
    def open_fingers(axes, fraction, only=None, extra=None):
        """Rotate each joint towards straight by `fraction` of its idle bend."""
        rot = {}
        for name, (axis, bend) in axes.items():
            if only and name.split('_')[0] not in only:
                continue
            angle = -fraction * bend + (extra or {}).get(name, 0.)
            if abs(angle) > 1e-9:
                rot[name] = Matrix.Rotation(angle, 3, axis)
        return rot


def components(mesh):
    """Connected shells of a mesh as vertex index sets, via bmesh."""
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bm.verts.ensure_lookup_table()
    label = [-1] * len(bm.verts)
    groups = []
    for v in bm.verts:
        if label[v.index] >= 0:
            continue
        stack, members = [v], []
        label[v.index] = len(groups)
        while stack:
            cur = stack.pop()
            members.append(cur.index)
            for e in cur.link_edges:
                o = e.other_vert(cur)
                if label[o.index] < 0:
                    label[o.index] = len(groups)
                    stack.append(o)
        groups.append(members)
    bm.free()
    return groups, label


def bounds(points):
    return [Vector(min(p[i] for p in points) for i in range(3)), Vector(max(p[i] for p in points) for i in range(3))]
