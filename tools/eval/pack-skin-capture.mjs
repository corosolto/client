#!/usr/bin/env node
import {execSync} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import sharp from 'sharp';
import {TRETA_PACKS} from '../../public/js/data/pack-definitions.js';

const ROOT=path.resolve(import.meta.dirname,'../..');
const BASE=process.env.BASE || 'http://127.0.0.1:9481';
await mkdir(path.join(ROOT,'public/img/packs'),{recursive:true});
for(const pack of TRETA_PACKS){
  const sources=[
    path.join(ROOT,'tools/eval/asset-evidence/items/weapon-skins',pack.weaponSkins.ak,'side-left.png'),
    path.join(ROOT,'tools/eval/asset-evidence/items/weapon-skins',pack.weaponSkins.pistol,'side-left.png'),
    path.join(ROOT,'public/img/gloves',`${pack.gloveSkin}.webp`),
    path.join(ROOT,'tools/eval/asset-evidence/items/weapon-skins',pack.knifeSkin,'three-quarter.png'),
  ];
  const cells=await Promise.all(sources.map(async(input,index)=>{const image=sharp(input);if(index!==2)image.extract({left:160,top:110,width:880,height:500});return {input:await image.resize(480,320,{fit:'cover'}).modulate({brightness:index===2?1.12:1}).webp({quality:92}).toBuffer(),left:(index%2)*480,top:Math.floor(index/2)*320};}));
  await sharp({create:{width:960,height:640,channels:3,background:pack.color}}).composite(cells).webp({quality:92}).toFile(path.join(ROOT,'public',pack.poster.replace(/^\//,'')));
}
const catalog=TRETA_PACKS.map((pack)=>({id:pack.id,name:pack.name,character_id:null,price:2000,model_path:pack.model,available:true,slot:'pack',weapon_id:null}));
const first=TRETA_PACKS.find((pack)=>pack.id==='pack-lula-13');if(!first)throw new Error('pack-lula-13 ausente do catálogo');
const state={authenticated:true,accountId:'pack-capture-fixture',wallet:{balance:10000},inventory:[{skin_id:first.id,slot:'pack',weapon_id:null,equipped:true}],ledger:[],quests:{},campaign:{},catalog};
const gRoot=execSync('npm root -g').toString().trim();
const playwright=await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);const chromium=playwright.chromium || playwright.default?.chromium;
const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--mute-audio']});
const context=await browser.newContext({viewport:{width:1440,height:960}});
await context.addInitScript(()=>localStorage.setItem('cs_lang','pt'));
await context.route('**/api/treta*',(route)=>route.fulfill({json:state}));
await context.route('**/api/social-auth*',(route)=>route.fulfill({json:route.request().url().includes('action=providers')?{providers:[],email:false}:{authenticated:false}}));
const page=await context.newPage(),errors=[];page.on('pageerror',(error)=>errors.push(error.message));
await page.goto(`${BASE}/loja/packs`,{waitUntil:'domcontentloaded',timeout:240000});
await page.addStyleTag({content:'astro-dev-toolbar,#crash-overlay,#boot-splash,#aviso-software,.tutorial-overlay{display:none!important}'});
await page.waitForFunction((count)=>document.querySelectorAll('#treta-packs-grid .treta-card').length===count,TRETA_PACKS.length,{timeout:60000});
const names=await page.locator('#treta-packs-grid .treta-card strong').allTextContents();
if(TRETA_PACKS.some((pack)=>!names.includes(pack.name)))throw new Error(`packs ausentes: ${JSON.stringify(names)}`);
const tabs=await page.locator('[data-treta-view]').allTextContents();
for(const expected of ['ARMAS','ITENS','PACKS'])if(!tabs.includes(expected))throw new Error(`aba ${expected} ausente: ${tabs.join(', ')}`);
await page.screenshot({path:'/tmp/pack-store.png'});
await page.locator('#treta-packs-grid .treta-card').filter({hasText:first.name}).evaluate((button)=>button.click());
await page.waitForFunction(()=>document.querySelector('#treta-detail')?.open && document.querySelector('#treta-detail-price')?.textContent==='T$ 2.000');
const detail=await page.locator('#treta-detail-production').textContent();if(!/AK, pistola, luvas e faca/.test(detail))throw new Error(`detalhe incompleto: ${detail}`);
await page.screenshot({path:'/tmp/pack-store-detail.png'});await page.locator('#treta-detail [data-treta-close]').click();
const query=new URLSearchParams({debug:'1',auto:'E',map:'piscina_treta',armaslazy:'0',vmauthored:'1',vmfabrica:'1',vmqa:'precision',vmready:'rifle,melee',vmweapon:'ak,knife'});
await page.goto(`${BASE}/?${query}`,{waitUntil:'domcontentloaded',timeout:240000});
await page.addStyleTag({content:'astro-dev-toolbar,#vm-precision-qa,#crash-overlay,#boot-splash,#aviso-software,.tutorial-overlay,[data-vmqa]{display:none!important}'});
await page.waitForFunction(()=>window.__game?.state==='live' && window.__game.vm?.melee?.loaded,null,{timeout:240000});
await page.waitForFunction((expected)=>{const game=window.__game;return game.playerGloveId===expected.glove && game.playerKnifeSkinId===expected.knife && game.playerWeaponSkins.ak===expected.ak && game.playerWeaponSkins.pistol===expected.pistol;},{glove:first.gloveSkin,knife:first.knifeSkin,...first.weaponSkins},{timeout:30000});
await page.evaluate(()=>window.__game._switchWeapon('knife'));await page.waitForTimeout(800);
const runtime=await page.evaluate(()=>{const materials=[];window.__game.vm.melee.scene.traverse((object)=>{if(!object.isMesh)return;for(const material of Array.isArray(object.material)?object.material:[object.material])materials.push({name:material?.name,weaponSkin:material?.userData?.weaponSkin || null,glove:material?.userData?.teamHands?.style || null});});return materials;});
if(!runtime.some((material)=>material.weaponSkin===first.knifeSkin))throw new Error(`faca do pack não aplicada: ${JSON.stringify(runtime)}`);
if(!runtime.some((material)=>material.glove===first.gloveSkin))throw new Error(`luva do pack não aplicada à faca: ${JSON.stringify(runtime)}`);
await page.screenshot({path:'/tmp/pack-runtime-knife.png'});await browser.close();
const unexpected=errors.filter((message)=>!message.includes('/.astro/eval-vite/deps/astro-'));if(unexpected.length)throw new Error(`page errors: ${unexpected.join(' | ')}`);
console.log(JSON.stringify({packs:TRETA_PACKS.length,names,tabs,detail,runtime,store:'/tmp/pack-store.png',storeDetail:'/tmp/pack-store-detail.png',knife:'/tmp/pack-runtime-knife.png'},null,2));
