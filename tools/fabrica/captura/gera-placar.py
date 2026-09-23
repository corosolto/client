import json,re,sys
D='artifacts/placar-integrado'
P3=json.load(open('tools/eval/vm-reguas-placar.json'));P6=json.load(open('tools/eval/vm-reguas-placar-16x9.json'))
fr={r['weapon']:r for r in json.load(open(f'{D}/vm-frame.json'))['armas']}
def logmap(f,rx): return {m.group(2):m.group(1) for m in re.finditer(rx,open(f'{D}/{f}').read(),re.M)}
ori={m.group(1):m.group(2) for m in re.finditer(r'^(\w+)\s+([\d.]+)\s',open(f'{D}/vm-orientacao.log').read(),re.M)}
peg=logmap('vm-pegada-k.log',r'^(ok|FALHA)\s+(\w+)'); manga=logmap('vm-manga-oca.log',r'^(OK|FALHA)\s+(\w+)')
pente={}
for m in re.finditer(r'^(PASSA|FALHA) (\w+) ',open(f'{D}/vm-pente-na-mao.log').read(),re.M): pente[m.group(2)]=pente.get(m.group(2),True) and m.group(1)=='PASSA'
R=['mira','cobertura','pistola-ref','maos','carregador']; S={'VERDE':'✓','VERMELHO':'✗','N/A':'·','NAO_MEDE':'?'}
rows=[];verdes=[];vermPor={}
for a in P3['resultados']:
  cells=[];red=[]
  for r in R:
    x3=P3['resultados'][a].get(r,{}); x6=P6['resultados'][a].get(r,{})
    v=x3.get('valor',''); cells.append(f"{S.get(x3.get('estado'),'')}{S.get(x6.get('estado'),'')} {'' if v=='—' else v}".strip())
    if 'VERMELHO' in (x3.get('estado'),x6.get('estado')) or 'NAO_MEDE' in (x3.get('estado'),x6.get('estado')): red.append(r)
  f=fr.get(a)
  if f:
    b=f['ratioBand'];a3=f['aspectos']['3x2']['razao'];a6=f['aspectos']['16x9']['razao'];ok=b['min']<=a3<=b['max'] and b['min']<=a6<=b['max']
    fc=f"{'✓' if ok else ('ⓘ' if f.get('informativo') else '✗')} {a3}/{a6}{' PT-38' if f.get('referencia')=='pistol-aprovada' else ''}"
    if not ok and not f.get('informativo'): red.append('vm-frame')
  else: fc='·'
  k=a=='knife'
  rows.append(f"| {a} | "+" | ".join(cells)+f" | {fc} | {'✓ '+ori[a] if a in ori else '·'} | {('✓' if pente[a] else '✗') if a in pente else '·'} | {('✓' if peg[a]=='ok' else '✗') if a in peg else '·'} | {('✓' if manga[a]=='OK' else '✗') if a in manga else '·'} | {'n/a (melee: eval:melee-vm)' if k else ('**VERDE**' if not red else ', '.join(red))} |")
  if not red and not k: verdes.append(a)
  for r in red: vermPor.setdefault(r,[]).append(a)
hdr="| arma | mira | cobertura | pistola-ref | mãos | carregador | vm-frame 3:2/16:9 | orientação | pente-na-mão | pegada-k | manga-oca | vermelho em |\n|---|---|---|---|---|---|---|---|---|---|---|---|"
nverm=len(P3['resultados'])-1-len(verdes)
txt=hdr+"\n"+"\n".join(rows)+f"\n\n**Verdes em todas as réguas: {len(verdes)}/25 armas de fogo** — {', '.join(verdes)} (faca: n/a nas réguas de imagem).\n**Vermelhas: {nverm}/25.** Por régua: "+"; ".join(f"{r} {len(v)} ({', '.join(v)})" for r,v in vermPor.items())+".\n"
open(f'{D}/PLACAR-TABELA.md','w').write(txt)
json.dump({'verdes':verdes,'vermPor':vermPor,'entradas':P3['entradas']},open(f'{D}/resumo.json','w'),ensure_ascii=False,indent=1)
print(txt[-700:])
