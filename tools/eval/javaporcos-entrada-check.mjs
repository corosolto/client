import assert from 'node:assert/strict';
import fs from 'node:fs';
let main = fs.readFileSync('public/js/main.js','utf8');
let intro = fs.readFileSync('public/js/javaporcos_intro.js','utf8');
let loading = fs.readFileSync('public/js/tp/carregamento.js','utf8');
const mutant=process.argv.includes('--mutante');
if(mutant) main=main.replace('await apresentarJavaporcos(introAbort.signal)', 'Promise.resolve()');
let failures=0;
for(const [label,fn] of [
 ['apresentação após preload e antes do nascimento',()=>{const i=main.indexOf('await apresentarJavaporcos(introAbort.signal)');assert.ok(i>main.indexOf('await Promise.all([',main.indexOf('async function _startGame')));assert.ok(i<main.indexOf('game = new Game({',i));}],
 ['leitura suspende watchdog',()=>assert.match(main,/ready\('partida'\);\s*hideLoading\(\);\s*await apresentarJavaporcos/)],
 ['texto rolante acessível',()=>{assert.match(intro,/@keyframes ji-rolar/);assert.match(intro,/prefers-reduced-motion/);assert.match(intro,/animation-play-state:paused/);}],
 ['ameaça tem retrato próprio',()=>{assert.match(loading,/p\.javaporco/);assert.match(loading,/id: 'javaporco'/);assert.match(loading,/DEFESA COOPERATIVA/);}]
]){try{fn();console.log('✓ ENTRADA '+label);}catch(e){failures++;console.log('✗ ENTRADA '+label+': '+e.message.slice(0,150));}}
process.exitCode=mutant?(failures?0:1):(failures?1:0);
