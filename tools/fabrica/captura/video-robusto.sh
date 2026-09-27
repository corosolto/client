#!/bin/bash
# Vídeo arma a arma (uma sessão por arma, até 3 tentativas) em artifacts/review-integrado/video/<arma>/, depois junta o video.json.
BASE=artifacts/review-integrado/video
for w in ${1//,/ }; do for t in 1 2 3; do
  rm -rf "$BASE/$w"; mkdir -p "$BASE/$w"
  node tools/viewmodels/prep/arsenal-video-capture.mjs --porta=4661 --armas=$w --out=$BASE/$w > "$BASE/$w.log" 2>&1
  if [ -f "$BASE/$w/video.json" ] && ls "$BASE/$w"/$w-*.webm >/dev/null 2>&1; then echo "OK $w ($t)"; break; fi
  echo "FALHA $w ($t)"; done; done
python3 - <<'PY'
import json,glob,os,shutil
B='artifacts/review-integrado/video'; recs=[]
for j in sorted(glob.glob(f'{B}/*/video.json')):
    d=json.load(open(j)); w=os.path.basename(os.path.dirname(j))
    for r in d.get('records',[]):
        if r.get('weapon')==w and os.path.exists(os.path.join(os.path.dirname(j),r['file'])):
            shutil.copy(os.path.join(os.path.dirname(j),r['file']),os.path.join(B,r['file'])); recs.append(r)
json.dump({'records':recs},open(f'{B}/video.json','w'),indent=1)
print('videos',len(recs))
PY
