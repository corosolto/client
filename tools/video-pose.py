#!/usr/bin/env python3
"""Extrai pose 3D de um vídeo e escreve as DIREÇÕES DE OSSO quadro a quadro.

Por que direções e não ângulos: a direção de um osso (ombro->cotovelo) não depende do
tamanho do corpo de quem dançou nem do personagem que vai receber. É a mesma ideia do
overlay de emote (docs/EMOTES-BR.md) e é o que deixa uma captura servir os 63 bonecos.

Saída (JSON): { fps, quadros, ossos: [nome...], direcoes: [ [ [x,y,z] por osso ] ... ] }
Eixos do corpo: X = direita do dançarino, Y = cima, Z = frente. Sem translação de raiz.

Uso: python3.10 tools/video-pose.py entrada.mp4 saida.json [--modelo=caminho.task]
Requer: mediapipe>=1 + opencv. O modelo .task vem de
https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task
"""
import json
import math
import os
import sys

import cv2
import mediapipe as mp
from mediapipe.tasks import python as mptasks
from mediapipe.tasks.python import vision

# índices do PoseLandmarker (33 pontos, mesma ordem do BlazePose)
P = {
    'ombroE': 11, 'ombroD': 12, 'cotoveloE': 13, 'cotoveloD': 14,
    'pulsoE': 15, 'pulsoD': 16, 'quadrilE': 23, 'quadrilD': 24,
    'joelhoE': 25, 'joelhoD': 26, 'tornozeloE': 27, 'tornozeloD': 28,
    'orelhaE': 7, 'orelhaD': 8,
}
OSSOS = {
    'RightArm': ('ombroD', 'cotoveloD'), 'RightForeArm': ('cotoveloD', 'pulsoD'),
    'LeftArm': ('ombroE', 'cotoveloE'), 'LeftForeArm': ('cotoveloE', 'pulsoE'),
    'RightUpLeg': ('quadrilD', 'joelhoD'), 'RightLeg': ('joelhoD', 'tornozeloD'),
    'LeftUpLeg': ('quadrilE', 'joelhoE'), 'LeftLeg': ('joelhoE', 'tornozeloE'),
}
MEDIOS = ['Spine01', 'Head']
MODELO_PADRAO = '/tmp/mp-modelos/pose_landmarker_full.task'


def normaliza(v):
    n = math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2)
    return [v[0] / n, v[1] / n, v[2] / n] if n > 1e-6 else [0.0, -1.0, 0.0]


def meio(a, b):
    return [(a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2]


def direcao(a, b):
    """MediaPipe: X direita, Y PRA BAIXO, Z pra trás. Nosso corpo: Y cima, Z frente."""
    ax, ay, az = (a.x, a.y, a.z) if hasattr(a, 'x') else a
    bx, by, bz = (b.x, b.y, b.z) if hasattr(b, 'x') else b
    return normaliza([bx - ax, -(by - ay), -(bz - az)])


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        return 1
    entrada, saida = sys.argv[1], sys.argv[2]
    modelo = MODELO_PADRAO
    for arg in sys.argv[3:]:
        if arg.startswith('--modelo='):
            modelo = arg.split('=')[1]
    if not os.path.exists(modelo):
        print(f'modelo não encontrado: {modelo} (veja o cabeçalho do arquivo)')
        return 1

    cap = cv2.VideoCapture(entrada)
    if not cap.isOpened():
        print(f'não abriu o vídeo: {entrada}')
        return 1
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0

    opcoes = vision.PoseLandmarkerOptions(
        base_options=mptasks.BaseOptions(model_asset_path=modelo),
        running_mode=vision.RunningMode.VIDEO,
        num_poses=1, min_pose_detection_confidence=0.5, min_tracking_confidence=0.5)

    nomes = list(OSSOS.keys()) + MEDIOS
    direcoes, perdidos, i = [], 0, 0
    with vision.PoseLandmarker.create_from_options(opcoes) as detector:
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            imagem = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
            res = detector.detect_for_video(imagem, int(i * 1000 / fps))
            i += 1
            if not res.pose_world_landmarks:
                perdidos += 1
                direcoes.append(None)
                continue
            lm = res.pose_world_landmarks[0]
            quadro = [direcao(lm[P[a]], lm[P[b]]) for a, b in OSSOS.values()]
            quadril = meio(lm[P['quadrilE']], lm[P['quadrilD']])
            ombro = meio(lm[P['ombroE']], lm[P['ombroD']])
            orelha = meio(lm[P['orelhaE']], lm[P['orelhaD']])
            quadro.append(direcao(quadril, ombro))
            quadro.append(direcao(ombro, orelha))
            direcoes.append(quadro)

    cap.release()

    # quadro sem pose herda o anterior: buraco no meio da dança viraria solavanco
    ultimo = None
    for k, d in enumerate(direcoes):
        if d is None:
            direcoes[k] = ultimo
        else:
            ultimo = d
    direcoes = [d for d in direcoes if d is not None]

    json.dump({'fps': fps, 'quadros': len(direcoes), 'perdidos': perdidos,
               'ossos': nomes, 'direcoes': direcoes}, open(saida, 'w'))
    print(f'{len(direcoes)} quadros a {fps:.0f} fps · {perdidos} sem pose -> {saida}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
