// Prepara referências e pedidos; geração usa tools/gen-image.mjs, nunca este script.
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';

const catalog=readFileSync('public/js/characters.js','utf8').match(/export const CHARACTERS = ([\s\S]*?\n\]);/);
if(!catalog)throw Error('Catálogo indisponível');
const roster=vm.runInNewContext(catalog[1],{}, {timeout:20000});
const output='artifacts/social/og-stylized',style='public/img/resultado/canarinho-vitoria.webp';
const model='google/gemini-3-pro-image';
const receipt=file=>({file,sha256:createHash('sha256').update(readFileSync(file)).digest('hex')});
const jobs=Array.from(roster,c=>{
 if(!/^[a-z0-9_-]+$/.test(c.id))throw Error('ID inválido');
 const reference=`public/img/resultado/${c.id}-vitoria.webp`;
 const prompt=`Use a primeira referência (Canarinho) somente como padrão de acabamento: caricatura 3D cinematográfica estilizada, materiais detalhados, luz de estúdio e silhueta nítida. Repinte o personagem da segunda referência, ${c.name}, preservando exatamente rosto caricato, identidade, proporções, tom de pele, cabelo, roupa, cores, arma e acessórios. Não transforme no pássaro nem use fotografia de pessoa real. Corpo inteiro, cabeça, mãos e pés inteiros dentro do quadro, com margem transparente mínima. Não invente membros, pessoas ou adereços. Pose natural e reconhecível. Somente este personagem, fundo transparente, sem texto, números novos, marca, moldura ou cenário.`;
 return {id:c.id,name:c.name,status:c.id==='canarinho'?'style-reference':'awaiting-generation-and-review',references:[receipt(style),receipt(reference)],model,prompt,rawOutput:`/tmp/gen-image/social-og-${c.id}-styled.png`,archiveDirectory:`${output}/candidates`,args:['tools/gen-image.mjs','--id',`social-og-${c.id}-styled`,'--ref',style,'--ref',reference,'--model',model,'--aspect','2:3','--raw-only','--prompt',prompt]};
});
mkdirSync(output,{recursive:true});
writeFileSync(`${output}/generation-plan.json`,JSON.stringify({provider:'OpenRouter',generator:'tools/gen-image.mjs',generated:false,jobs},null,2)+'\n');
console.log(`PASS ${jobs.length} personagens com ID, referências e hashes; ${jobs.length-1} candidatos preparados; nenhuma chamada de API ou publicação`);
