/* ============================================================================
   mapjson-boot-check.mjs — A PROVA IN-ENGINE do formato "mapa como dado".
   ----------------------------------------------------------------------------
   O mapjson-check mede o PLANO (puro, sem jogo). Esta régua fecha o laço: injeta a
   arena JSON num `Game` DE VERDADE (o mesmo do browser, subido pelo harness), roda a
   partida e confere o que só aparece dentro do motor:

     B1 o Game CONSTRÓI a arena JSON sem lançar e com o contrato de world completo;
     B2 groundHeightAt do mundo real devolve o RELEVO declarado (piso 0, rampa, topo
        de plataforma) — a física anda sobre a mesma superfície que a régua validou;
     B3 os bots NAVEGAM (deslocam-se) em 20 s de simulação, sem travar na origem;
     B4 ctfPoints e spawns do spec chegam ao jogo (alvo da rodada = nº de bandeiras).

   Sem browser, sem rede: é o bootGame do harness, o mesmo instrumento do botsim.
   Mutante: `--mutante=relevo` zera a funcao groundHeightAt do mundo real; o oraculo fica intacto.
   ============================================================================ */
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const args=process.argv.slice(2),driver=args.length===1&&args[0]==='--mutantes';
const MUT=args.length===1&&args[0]==='--mutante=relevo'?'relevo':'';
if(args.length>1||args.length===1&&!driver&&!MUT){console.error('uso: mapjson-boot-check [--mutantes|--mutante=relevo]');process.exit(2);}
const hash=b=>createHash('sha256').update(b).digest('hex');
const sourceFiles=['./mapjson-boot-check.mjs','../../public/js/map_json.js','../../public/js/game.js'];
const sourcePins=()=>Object.fromEntries(sourceFiles.map(p=>[p,hash(readFileSync(new URL(p,import.meta.url)))]));
const sources=sourcePins();
const ids=[...['groundHeightAt','slowAt','colliders','occluders','spawns','pickups','ctfPoints','waypoints'].map(k=>'B1-'+k),'B1-nav',...Array.from({length:4},(_,i)=>'B2-'+i),'B4-ctf','B4-spawns','B3-update','B3-nav'];
if(driver){
 for(const mutant of ['', 'relevo']){
  const r=spawnSync(process.execPath,[fileURLToPath(import.meta.url),...(mutant?['--mutante='+mutant]:[])],{encoding:'utf8',timeout:45000,maxBuffer:1024*1024});
  if(r.error||r.signal||r.status!==(mutant?1:0)||r.stderr||/TypeError|SyntaxError|ReferenceError|Multiple instances/.test(r.stdout||''))throw Error('infra/exit do filho '+(mutant||'nominal')+': '+r.status+' '+String(r.stderr||'').slice(-500));
  const lines=r.stdout.split('\n').filter(l=>l.startsWith('MAPJSON_BOOT_RESULT:'));
  if(lines.length!==1)throw Error('veredito ausente/duplicado');const d=JSON.parse(lines[0].slice(20));
  if(d.schema!=='mapjson-boot/1'||d.mutant!==mutant||JSON.stringify(d.sources)!==JSON.stringify(sources)||!d.sourceUnchanged||JSON.stringify(d.rows.map(r=>r.id))!==JSON.stringify(ids)||d.rows.some(r=>typeof r.pass!=='boolean'))throw Error('veredito nao vinculado/denominador');
  const failed=d.rows.filter(r=>!r.pass).map(r=>r.id),wanted=mutant?['B2-1','B2-2','B2-3']:[];
  if(JSON.stringify(failed)!==JSON.stringify(wanted))throw Error('failset nao causal: '+JSON.stringify(failed));
  if(mutant?!(d.mutation?.target==='world.groundHeightAt'&&d.mutation.before!==d.mutation.after&&d.mutation.sampleBefore===1.2&&d.mutation.sampleAfter===0):d.mutation!==null)throw Error('mutacao real ausente/indevida');
  console.log('mapjson boot '+(mutant||'nominal')+': veredito real confirmado');
 }
 const bad=spawnSync(process.execPath,[fileURLToPath(import.meta.url),'--mutante=desconhecido'],{encoding:'utf8',timeout:5000,maxBuffer:1024*1024});
 if(bad.error||bad.signal||bad.status!==2||bad.stdout.includes('MAPJSON_BOOT_RESULT:'))throw Error('CLI desconhecida nao recusada');
 process.exit(0);
}
const { THREE, MAPS, initTextures, bootGame } = await import('./harness.mjs');
const { buildMapFromJSON, propIdsFromSpec } = await import('../../public/js/map_json.js');
let mutation=null;
const SPEC = JSON.parse(readFileSync(new URL('./mapjson_fixture.json', import.meta.url), 'utf8'));

// injeta a arena JSON no registro em runtime — prova o caminho de `maps.js` sem subir um
// mapa de menu permanente (SEO/docs/jogo.ts ficam intocados; é uma régua, não conteúdo).
MAPS.arena_json = {
  name: 'Arena JSON (boot)', ctfMode: true,
  build: (scene, T) => {
    const world=buildMapFromJSON(scene,T,SPEC);
    if(MUT){
      const before=world.groundHeightAt,sampleBefore=before(-10,7,1e3);
      world.groundHeightAt=()=>0;
      mutation={target:'world.groundHeightAt',before:hash(String(before)),after:hash(String(world.groundHeightAt)),sampleBefore,sampleAfter:world.groundHeightAt(-10,7,1e3)};
    }
    return world;
  },
  props: propIdsFromSpec(SPEC),
};

const falhas = [], rows=[];
const check=(id,pass,reason)=>{rows.push({id,pass:!!pass});if(!pass)falhas.push(reason);};
const textures = initTextures();
let g;
try {
  g = bootGame('arena_json', { textures, ctf: true, bots: 4, seed: 12345 });
} catch (e) {
  console.log(`BOOT VERMELHA · B1 bootGame lançou: ${e.message}`);
  process.exit(3);
}

// B1 contrato de world
const W = g.world;
for (const k of ['groundHeightAt', 'slowAt', 'colliders', 'occluders', 'spawns', 'pickups', 'ctfPoints', 'waypoints'])
  check("B1-"+k,W[k]!==undefined,`B1 world sem ${k}`);
check('B1-nav',!!W.waypoints?.nodes?.length,'B1 grafo de waypoints vazio no jogo');

// B2 relevo — groundHeightAt nos pontos declarados (rampa +z em (-10,2), plataforma em (-10,7))
const gh = (x, z) => W.groundHeightAt(x, z, 1e3);
const aprox = (a, b, tol = 0.08) => Math.abs(a - b) <= tol;
const casos = [
  { x: 0, z: 14, y: 0, nome: 'piso' },
  { x: -10, z: 2, y: 0.6, nome: 'meio da rampa' },
  { x: -10, z: 4.4, y: 1.188, nome: 'topo da rampa' },
  { x: -10, z: 7, y: 1.2, nome: 'topo da plataforma' },
];
for (const [i,c] of casos.entries()) {
  const value=gh(c.x,c.z);
  check('B2-'+i,aprox(value,c.y),`B2 ${c.nome}: groundHeightAt ${value} != ${c.y}`);
}

// B4 ctf e spawns
check('B4-ctf',(W.ctfPoints?.length||0)===(SPEC.ctf?.length||0),'B4 ctfPoints diferentes do spec');
check('B4-spawns',!!W.spawns?.E?.length&&!!W.spawns?.B?.length,'B4 spawns E/B ausentes');

// B3 navegação — tira o jogador e roda 20 s; soma o caminho dos bots
g.player.pos.set(0, -400, 0); g.player.hp = 1e9; g.player.alive = true;
const DT = 1 / 60, STEPS = Math.round(20 / DT);
const last = new Map(g.bots.map((b) => [b, { x: b.pos.x, z: b.pos.z }]));
let caminho = 0, updateError=null;
try {
  for (let i = 0; i < STEPS; i++) {
    g.update(DT);
    if (i % 9) continue;
    for (const b of g.bots) {
      if (!b.alive) { const p = last.get(b); p.x = b.pos.x; p.z = b.pos.z; continue; }
      const p = last.get(b);
      caminho += Math.hypot(b.pos.x - p.x, b.pos.z - p.z);
      p.x = b.pos.x; p.z = b.pos.z;
    }
  }
} catch (e) {
  updateError=e;
}
check('B3-update',!updateError,'B3 update lancou: '+updateError?.message);
check('B3-nav',caminho>=20,`B3 bots quase parados: ${caminho.toFixed(1)} m em 20 s (<20 m)`);

console.log(`BOOT nós ${W.waypoints?.nodes?.length} · caminho ${caminho.toFixed(1)} m · ctf ${W.ctfPoints?.length} · relevo topo ${gh(-10, 7).toFixed(2)} m`);
for (const f of falhas) console.log(`  BOOT VERMELHA · ${f}`);

const sourceUnchanged=JSON.stringify(sourcePins())===JSON.stringify(sources);
console.log('MAPJSON_BOOT_RESULT:'+JSON.stringify({schema:'mapjson-boot/1',mutant:MUT,sources,sourceUnchanged,mutation,rows}));
if(!sourceUnchanged||updateError){console.error('infra: fonte alterada ou update interrompido');process.exit(3);}
process.exitCode=falhas.length?1:0;
