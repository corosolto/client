import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url),file=new URL('public/js/profile-character-catalog.js',root);
const source=readFileSync(new URL('public/js/characters.js',root),'utf8').match(/export const CHARACTERS = ([\s\S]*?\n\]);/);
if(!source)throw Error('Catálogo de personagens indisponível');
const characters=[...source[1].matchAll(/\{\s*id:\s*'([^']+)'[\s\S]*?name:\s*'([^']+)'/g)].map(m=>({id:m[1],nome:m[2],portrait:`/img/resultado/${m[1]}-vitoria.webp`}));
if(!characters.length || new Set(characters.map(c=>c.id)).size!==characters.length)throw Error('Catálogo vazio ou duplicado');
for(const c of characters)if(!/^[a-z0-9_-]+$/.test(c.id) || !existsSync(new URL('public'+c.portrait,root)))throw Error('Retrato indisponível: '+c.id);
const output='// Gerado de characters.js por scripts/profile-character-catalog.mjs.\nexport const PROFILE_CHARACTERS=Object.freeze({\n'+characters.map(c=>`  ${JSON.stringify(c.id)}:Object.freeze(${JSON.stringify(c)}),`).join('\n')+'\n});\n';
if(process.argv.includes('--check')){if(!existsSync(file) || readFileSync(file,'utf8')!==output)throw Error('Catálogo de perfis desatualizado: rode node scripts/profile-character-catalog.mjs');}
else writeFileSync(file,output);
console.log(`Catálogo de perfis: ${characters.length} personagens · ${fileURLToPath(file)}`);
