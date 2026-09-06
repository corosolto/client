"""Mede anotações da referência do dono; não certifica um candidato do Game."""
import hashlib
import json
import subprocess
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / 'artifacts/viewmodels/prep/rifles/cs16-reference'
SOURCES = {
    'detail': ('cs16-rifle-detail.png', 'ca47b55bce2cdef721ac97867a9f6bd9bf20d0d4c4af2b777717f324388c8c4a'),
    'game': ('cs16-rifle-game.png', 'deadbccca62e18bb41a1379a5deeb704116b684ceac64c7eafcd3762a8ee7bb9'),
}


def write(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def main():
    assert ROOT.name == 'vm-prep-rifles'
    assert subprocess.check_output(['git', 'branch', '--show-current'], cwd=ROOT, text=True).strip() == 'codex/vm-prep-rifles'
    assert OUT.resolve().is_relative_to(ROOT)
    analysis = OUT / 'source_analysis'
    validation = OUT / 'validation'
    for path in [analysis, validation]:
        assert path.resolve().is_relative_to(ROOT)
        path.mkdir(parents=True, exist_ok=True)
    sources = {}
    for role, (name, expected) in SOURCES.items():
        path = OUT / name
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        assert digest == expected, f'fonte alterada: {name}'
        with Image.open(path) as image:
            width, height = image.size
            sources[role] = {'file': name, 'sha256': digest, 'width': width, 'height': height,
                             'mode': image.mode, 'aspect': width / height,
                             'source': 'imagem fornecida por Ruben como referência CS 1.6'}
    width, height = sources['game']['width'], sources['game']['height']
    assert (width, height) == (1024, 768)
    # Marcas manuais no original; incerteza de leitura, não tolerância de aprovação.
    landmarks = {'muzzle': [637, 484, 6], 'front_sight_top': [684, 459, 5],
                 'support_contact_visible': [691, 548, 12]}
    marks = {name: {'pixel': [x, y], 'normalized': [x / width, y / height],
                    'reading_uncertainty_px': uncertainty}
             for name, (x, y, uncertainty) in landmarks.items()}
    left, top, right, bottom = 535, 458, 1024, 768
    game = {**sources['game'], 'method': 'anotação manual da imagem completa; não segmentação',
            'bbox_weapon_and_arms_px': [left, top, right, bottom],
            'bbox_convention': 'bordas externas; direita/baixo exclusivas',
            'bbox_left_top_reading_uncertainty_px': 6,
            'bbox_normalized': [left / width, top / height, right / width, bottom / height],
            'bbox_size_fraction': [(right - left) / width, (bottom - top) / height],
            'bbox_area_fraction_not_silhouette': (right - left) * (bottom - top) / (width * height),
            'touches_right_and_bottom': True, 'screen_center_px': [512, 384],
            'screen_center_visually_clear': True, 'landmarks': marks,
            'occluded': ['contato completo da mão forte', 'superfícies internas dos dedos'],
            'unsupported': ['FOV original', 'fase exata da animação', 'contato 3D', 'área segmentada']}
    write(analysis / 'game.json', game)
    write(analysis / 'detail.json', {**sources['detail'], 'role': 'recorte de detalhe/pose',
          'use_for_screen_occupancy': False, 'animation_phase': 'não confirmada',
          'observations': ['dedos envolvendo apoio', 'arma em diagonal', 'material escuro com detalhes legíveis']})
    write(OUT / 'reference_manifest.json', {
        'authority': 'pedido de Ruben: comparação sempre contra CS 1.6 por categoria',
        'sources': sources, 'candidate_status': 'estado servido reprovado pelo dono',
        'reference_by_weapon': {'m4': 'M4', 'md97': 'M4: rifle com carregador frontal',
                                'scar': 'M4: rifle com carregador frontal', 'm92': 'AK: rifle com pente curvo',
                                'famas': 'FAMAS: rifle bullpup',
                                'carbine': 'rifle CS 1.6 para composição; sem equivalente mecânico confirmado'},
        'missing_sources': ['AK comparável', 'FAMAS comparável', 'sequências de ações CS 1.6'],
        'expected_parts': 'geometria própria de cada arma; não impor contagem da arma de referência',
        'thresholds': {'numeric_acceptance': None, 'reason': 'um frame 4:3 não define tolerância universal',
                       'required': ['referência CS 1.6 da categoria', 'mesmo aspecto e ação comparável',
                                    'contato sem flutuação/interpenetração', 'centro legível',
                                    'revisão visual independente e aprovação do dono']},
        'rejected_shortcuts': ['comparar só contra versão anterior', 'usar recorte como viewport',
                              'esticar 4:3 para widescreen', 'certificar aparência por HTTP ou ready',
                              'IoU pixel a pixel entre armas diferentes como portão único']})
    write(validation / 'front_mask_validation.json', {
        'status': 'pendente', 'reason': 'sem frame comparável do Game e sem máscaras revisadas',
        'iou': None, 'ssim': None, 'overlay': None,
        'overlay_reason': 'front_overlay_reference.png só será produzido com candidato comparável'})
    print(json.dumps({'bbox_size_fraction': game['bbox_size_fraction'], 'landmarks': marks}, ensure_ascii=False))


if __name__ == '__main__':
    main()
