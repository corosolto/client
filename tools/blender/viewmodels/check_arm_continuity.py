"""Check anatomical joint continuity in posed AK-donor rigs, including half frames."""
import argparse
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--arquivo', type=Path, required=True)
    parser.add_argument('--saida', type=Path, required=True)
    parser.add_argument('--mutante', choices=['pulso-afastado'])
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    if args.arquivo.suffix == '.blend':
        bpy.ops.wm.open_mainfile(filepath=str(args.arquivo.resolve()))
    else:
        raise ValueError('Use o .blend autoral: glTF nao armazena extremidades de ossos')
    rig = next(obj for obj in bpy.data.objects if obj.type == 'ARMATURE')
    rows = []
    for action in bpy.data.actions:
        rig.animation_data.action = action
        for side in ('L', 'R'):
            bones = [rig.pose.bones[f'{name}.{side}_metarig']
                     for name in ('upper_arm', 'forearm', 'hand')]
            maximum = {'gap': 0.0, 'frame': 0.0, 'joint': ''}
            start, end = action.frame_range
            for half in range(math.floor(start * 2), math.ceil(end * 2) + 1):
                frame = half / 2
                bpy.context.scene.frame_set(int(frame), subframe=frame % 1)
                bpy.context.view_layer.update()
                if args.mutante and side == 'R':
                    shifted = bones[-1].matrix.copy()
                    shifted.translation += Vector((bones[-1].length, 0, 0))
                    bones[-1].matrix = shifted
                    bpy.context.view_layer.update()
                magnitude = max(1.0, *(abs(x) for bone in bones for x in bone.head))
                # Equality of adjacent joints, allowing accumulated float32 transform error.
                tolerance = magnitude * 64 * 2 ** -23
                for parent, child in zip(bones, bones[1:]):
                    gap = (parent.tail - child.head).length
                    if gap > maximum['gap']:
                        maximum = {'gap': gap, 'frame': frame, 'joint': child.name,
                                   'tolerance': tolerance}
            rows.append({'action': action.name, 'side': side, **maximum,
                         'ok': maximum['gap'] <= maximum.get('tolerance', 0)})
    report = {'source': str(args.arquivo), 'mutant': args.mutante, 'rows': rows,
              'ok': bool(rows) and all(row['ok'] for row in rows)}
    args.saida.parent.mkdir(parents=True, exist_ok=True)
    args.saida.write_text(json.dumps(report, indent=2) + '\n')
    print('ARM_CONTINUITY', 'PASS' if report['ok'] else 'FAIL', str(args.saida))
    if not report['ok']:
        raise RuntimeError('Anatomical joint separation; see report')


if __name__ == '__main__':
    main()
