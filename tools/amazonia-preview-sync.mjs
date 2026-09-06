// Atualiza somente o overlay do snapshot local previamente preparado; nunca a main.
import {readFileSync,writeFileSync,copyFileSync,mkdirSync,realpathSync} from 'node:fs';
import {createHash} from 'node:crypto';
const dest='artifacts/amazonia-visual/main-preview';
if(!realpathSync(dest).startsWith(realpathSync('.')+'/artifacts/')) throw Error('preview fora dos artefatos');
const manifestPath='artifacts/amazonia-visual/main-preview-manifest.json';
const manifest=JSON.parse(readFileSync(manifestPath));
const extra=['public/js/skylife.js','public/models/ambient/arara_voo.glb',
 ...['arvore_mata_amazonia','palmeira_babacu_amazonia','palafita_pro_amazonia','samambaia','heliconia','canoa_rabeta_amazonia'].map(n=>`public/models/props/${n}.glb`),
 ...['tex_selva','tex_madeira_serragem','tex_palha'].map(n=>`public/img/textures/${n}.webp`)];
for(const file of Object.keys(manifest.mainMenuUnchanged)) {
 if(createHash('sha256').update(readFileSync(`${dest}/${file}`)).digest('hex')!==manifest.mainMenuUnchanged[file]) throw Error(`menu main modificado: ${file}`);
}
manifest.overlay=[...new Set([...manifest.overlay,...extra])];
for(const file of manifest.overlay){mkdirSync(`${dest}/${file.substring(0,file.lastIndexOf('/'))}`,{recursive:true});copyFileSync(file,`${dest}/${file}`);}
manifest.builderSHA256=createHash('sha256').update(readFileSync('public/js/map_amazonia.js')).digest('hex');
manifest.syncedAt=new Date().toISOString();
writeFileSync(manifestPath,JSON.stringify(manifest,null,2));
console.log(`Overlay: ${manifest.overlay.length} arquivos; menu main preservado; ${manifest.builderSHA256}`);
