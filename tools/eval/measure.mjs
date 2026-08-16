// Objective character eval: renders each character multi-angle IN-ENGINE and
// measures the rubric gates (tools/eval/RUBRIC.md). Emits a per-character contact
// sheet + an aggregate report (JSON + Markdown). No subjective verdicts — numbers only.
//
// Usage: node tools/eval/measure.mjs [char1 char2 ...]   (default: all GLB chars)
import { execSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const BASE = process.env.BASE || 'http://localhost:8123';
const OUT = '/tmp/eval';
const ANGLES = ['front','q34','side','back','low'];
const ALL = ['esquerdomacho','sindicato','mst','doutora','mistico','caminhoneiro','influencer','sertanejo','senhora','coach','gotinha','farialimer','bombado','hipster','dollynho','et','ancap'];
const chars = process.argv.slice(2).length ? process.argv.slice(2) : ALL;

const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;
const hasFFmpeg = (()=>{ try{ execSync('which ffmpeg',{stdio:'ignore'}); return true;}catch{return false;} })();

rmSync(OUT,{recursive:true,force:true}); mkdirSync(OUT,{recursive:true});
const browser = await chromium.launch({ channel:'chrome', headless:true,
  args:['--use-gl=angle','--use-angle=swiftshader','--ignore-gpu-blocklist','--enable-webgl'] });

const reports = [];
for (const char of chars){
  const page = await browser.newPage({ viewport:{ width:900, height:900 }, deviceScaleFactor:1 });
  page.on('pageerror', e=>console.log(`  [${char}] pageerror`, e.message));
  const dir = `${OUT}/${char}`; mkdirSync(dir,{recursive:true});
  try {
    await page.goto(`${BASE}/eval.html?char=${char}&w=900&h=900`, { waitUntil:'networkidle' });
    await page.waitForFunction('window.EVAL && window.EVAL.ready===true', { timeout:30000 });
    const rep = await page.evaluate('window.__report');
    for (let i=0;i<ANGLES.length;i++){
      await page.evaluate(a=>window.EVAL.setAngle(a), ANGLES[i]);
      await page.screenshot({ path:`${dir}/${i}_${ANGLES[i]}.png` });
    }
    if (hasFFmpeg){
      const ins = ANGLES.map((a,i)=>`-i ${dir}/${i}_${a}.png`).join(' ');
      try { execSync(`ffmpeg -y ${ins} -filter_complex "hstack=inputs=${ANGLES.length}" -frames:v 1 ${dir}/_sheet.png`, {stdio:'ignore'}); } catch(e){ console.log('  sheet fail', e.message); }
    }
    reports.push(rep);
    const g = rep.gates; const pass = Object.values(g).filter(Boolean).length, tot=Object.keys(g).length;
    console.log(`${char.padEnd(14)} gates ${pass}/${tot}  headW=${rep.headWidthRatio}  tris=${rep.tris}  tex=${rep.maxTex}  sil(fill=${rep.silhouette.fill},asp=${rep.silhouette.aspect})  miss=[${rep.missingBones.join(',')}]`);
  } catch(e){ console.log(`${char}: ERRO ${e.message}`); reports.push({ char, error:String(e.message) }); }
  await page.close();
}
await browser.close();

// aggregate report
writeFileSync(`${OUT}/report.json`, JSON.stringify(reports,null,2));
const gk = ['silhouette','tris','texture','rig'];
let md = `# Eval report — ${chars.length} personagens\n\nContact sheets: \`${OUT}/<char>/_sheet.png\`\n\n`;
md += `| char | ${gk.join(' | ')} | headW | tris | maxTex | fill | asp | missing |\n`;
md += `|---|${gk.map(()=>'---').join('|')}|---|---|---|---|---|---|\n`;
for (const r of reports){
  if (r.error){ md += `| ${r.char} | ERRO: ${r.error} |\n`; continue; }
  const g=r.gates; const cell=k=>g[k]?'✓':'✗';
  md += `| ${r.char} | ${gk.map(cell).join(' | ')} | ${r.headWidthRatio} | ${r.tris} | ${r.maxTex} | ${r.silhouette.fill} | ${r.silhouette.aspect} | ${r.missingBones.join(' ')||'—'} |\n`;
}
writeFileSync(`${OUT}/report.md`, md);
console.log(`\nreport -> ${OUT}/report.md  (+ report.json, per-char _sheet.png)`);
