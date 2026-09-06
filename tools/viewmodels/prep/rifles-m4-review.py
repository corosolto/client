"""Static evidence page: supplied CS 1.6 reference beside unmodified renders."""
import importlib.util
import json
import sys
from pathlib import Path
from PIL import Image

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('inventory', Path(__file__).with_name('rifles-inventory.py'))
inv = importlib.util.module_from_spec(spec)
spec.loader.exec_module(inv)
inv.guard()
out = inv.OUT / 'm4-candidate'
assert out.resolve().is_relative_to(inv.OUT)
check = json.loads((out / 'check.json').read_text())
projection = json.loads((out / 'blender-projection.json').read_text())
image = Image.open(out / 'idle-material.png').convert('RGBA')
mask = image.getchannel('A').point(lambda a:255 if a >= 128 else 0)
bbox = mask.getbbox()
assert bbox and image.size == (1024,768)
muzzle = check['candidate']['sockets']['SOCKET_MINT_MUZZLE']
record = {'instrument':'unmodified 4:3 Cycles render alpha >=128; manual sockets, no Game capture',
          'bbox_pixels':bbox, 'bbox_reference_pixels':[535,458,1024,768],
          'bbox_delta_pixels':[a-b for a,b in zip(bbox,[535,458,1024,768])],
          'muzzle_pixels':[muzzle[0]*1024,muzzle[1]*768],
          'muzzle_delta_reference_pixels':[muzzle[0]*1024-637,muzzle[1]*768-484],
          'images':{name:inv.digest(out/name) for name in ['idle-material.png','support-side.png','trigger-close.png','idle-1152x768.png','idle-1024x576.png']}}
(out / 'comparison.json').write_text(json.dumps(record,indent=2)+'\n')
page = '''<!doctype html><html lang="pt-BR"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>M4 · CS 1.6 e candidata</title>
<style>body{margin:24px auto;padding:0 20px;max-width:1500px;background:#171a1e;color:#eceff3;font:16px/1.5 system-ui}
a{color:#9bd0ff}h1{font-size:26px}p{max-width:1000px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:18px}
figure{margin:0 0 24px}img{display:block;width:100%;height:auto;background:#373e46}figcaption{padding:8px 0}
.note{padding:12px 16px;border-left:3px solid #e2b567;background:#222830} @media(max-width:760px){.pair{grid-template-columns:1fr}}</style>
<h1>M4 · comparação obrigatória com CS 1.6</h1>
<p class="note">Candidata de composição e pose. O quadro da direita é um render Blender, não uma captura do Game.
Há somente idle estático; saque, tiro, recargas, inspeção e contatos em movimento continuam pendentes.
A referência enviada tem FOV e fase de ação desconhecidos. Nenhuma imagem foi esticada ou retocada.</p>
<p><a href="/?debug=1&amp;auto=E&amp;vmweapon=m4&amp;map=brasilia&amp;armaslazy=0&amp;vmready=ar&amp;vmrifles=m4-c1">Testar a candidata M4 no servidor exclusivo 8160</a>
 · <a href="/?debug=1&amp;auto=E&amp;vmweapon=m4&amp;map=brasilia&amp;armaslazy=0&amp;vmready=ar">Comparar com a montagem anterior</a></p>
<div class="pair"><figure><img src="/rifles-cs16/cs16-rifle-game.png"><figcaption>CS 1.6 — referência do dono, 1024×768.</figcaption></figure>
<figure><img src="idle-material.png"><figcaption>Mint M4 própria + mãos centrais E — Blender, 1024×768. Grip vertical preservado.</figcaption></figure></div>
<p>A referência usa apoio no guarda-mão. A própria M4 tem grip vertical; a adaptação conserva essa peça.
O centro fica livre e a parte traseira sai do quadro. Lateral do receptor e diagonal do antebraço ainda devem ser julgadas no jogo.</p>
<div class="pair"><figure><img src="support-side.png"><figcaption>Contato lateral de apoio; não prova ausência de penetração interna.</figcaption></figure>
<figure><img src="trigger-close.png"><figcaption>Vista oposta da empunhadura e do indicador.</figcaption></figure></div>
<h2>Recortes adicionais da candidata</h2><p>Sem referência CS 1.6 correspondente nestas proporções; não são comparações equivalentes.</p>
<div class="pair"><figure><img src="idle-1152x768.png"><figcaption>3:2</figcaption></figure>
<figure><img src="idle-1024x576.png"><figcaption>16:9</figcaption></figure></div>
<p><a href="comparison.json">Marcações e hashes</a> · <a href="check.json">Verificação geométrica e HTTP — sem WebGL</a></p>
</html>'''
(out / 'review.html').write_text(page)
print(json.dumps(record,indent=2))
