import {patchWaterRuntime} from './amazonia-water-runtime.mjs';
import {execFileSync} from 'node:child_process';
import {patchMapPreviewMenu} from './amazonia-preview-menu.mjs';
// Atualiza somente o overlay do snapshot local previamente preparado; nunca a main.
import {readFileSync,writeFileSync,copyFileSync,mkdirSync,realpathSync} from 'node:fs';
import {createHash} from 'node:crypto';
const dest='artifacts/amazonia-visual/main-preview';
if(!realpathSync(dest).startsWith(realpathSync('.')+'/artifacts/')) throw Error('preview fora dos artefatos');
const manifestPath='artifacts/amazonia-visual/main-preview-manifest.json';
const manifest=JSON.parse(readFileSync(manifestPath));
const extra=['public/js/amazonia_foliage_clearance.js','public/js/amazonia_cabins.js','public/js/amazonia_fauna_motion.js','public/models/props/palafita_aberta_amazonia.glb','public/models/props/galinha_mint_amazonia.glb','public/models/props/pintinho_mint_amazonia.glb','public/js/map_preview.js','public/js/map_preview_media.js','public/map-preview.css','public/img/map-previews/amazonia.mp4','public/js/skylife.js','public/models/ambient/arara_voo.glb',
 ...['arvore_mata_amazonia','palmeira_babacu_amazonia','palafita_pro_amazonia','samambaia','heliconia','canoa_rabeta_amazonia'].map(n=>`public/models/props/${n}.glb`),
 ...['tex_selva','tex_madeira_serragem','tex_palha'].map(n=>`public/img/textures/${n}.webp`)];
const menuPatches={};
if(!manifest.mainMenuUnchanged['public/js/game.js']) manifest.mainMenuUnchanged['public/js/game.js']=createHash('sha256').update(execFileSync('git',['show',`${manifest.main}:public/js/game.js`],{maxBuffer:4*1024*1024})).digest('hex');
for(const file of Object.keys(manifest.mainMenuUnchanged)) {
 const bytes=readFileSync(`${dest}/${file}`), actual=createHash('sha256').update(bytes).digest('hex');
 const base=execFileSync('git',['show',`${manifest.main}:${file}`],{maxBuffer:4*1024*1024});
 if(createHash('sha256').update(base).digest('hex')!==manifest.mainMenuUnchanged[file]) throw Error(`base main divergente: ${file}`);
 const patched=file==='public/js/game.js'?patchWaterRuntime(base.toString()):patchMapPreviewMenu(file,base.toString()), patchedHash=createHash('sha256').update(patched).digest('hex');
 if(actual!==manifest.mainMenuUnchanged[file] && actual!==patchedHash && actual!==manifest.mainMenuHoverOverlay?.[file]) throw Error(`menu main modificado fora do overlay: ${file}`);
 if(patchedHash!==manifest.mainMenuUnchanged[file]) menuPatches[file]={patched,sha256:patchedHash};
}
for(const [file,value] of Object.entries(menuPatches)) writeFileSync(`${dest}/${file}`,value.patched);
manifest.mainMenuHoverOverlay=Object.fromEntries(Object.entries(menuPatches).map(([file,value])=>[file,value.sha256]));
manifest.overlay=[...new Set([...manifest.overlay,...extra])];
for(const file of manifest.overlay){mkdirSync(`${dest}/${file.substring(0,file.lastIndexOf('/'))}`,{recursive:true});copyFileSync(file,`${dest}/${file}`);}
manifest.builderSHA256=createHash('sha256').update(readFileSync('public/js/map_amazonia.js')).digest('hex');
manifest.syncedAt=new Date().toISOString();
writeFileSync(manifestPath,JSON.stringify(manifest,null,2));
console.log(`Overlay: ${manifest.overlay.length} arquivos; menu main + delta de hover verificado; ${manifest.builderSHA256}`);
