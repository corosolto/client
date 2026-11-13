import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {dedup,prune,textureCompress,getBounds} from '@gltf-transform/functions';
import sharp from 'sharp';
import {copyFileSync,mkdirSync,readFileSync,writeFileSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
export const PACKS={
 cidade:{id:'th753rbz1fjyvfcsypbdcfcntn8h8wr4',chat:'ph71s3avnfz5xtf76nm4vg7dnn8h91hc'},
 vegetacao:{id:'th7a6e6j8ex8gx7jc3btycpjdn8h8xj5',chat:'ph78p4ab22f3c9cmqk4qy5hx9d8h9391'},
};
export const ITENS=[
 ['cidade','fachada','Fachada de comércio do interior','estrutura',1,4],
 ['cidade','fundo-casa','Fundo de casa do beco','estrutura',1,4],
 ['cidade','cacamba','Caçamba de entulho','estrutura',2,3.5],
 ['cidade','poste-trafo','Poste de concreto com transformador','estrutura',1,8],
 ['cidade','padrao-luz','Padrão de entrada de luz','pequeno',1,1],
 ['cidade','lixeira-tombada','Lixeira tombada','pequeno',0,1.3],
 ['cidade','pilha-sacos','Pilha de sacos de lixo','pequeno',2,1.5],
 ['cidade','banca-feira','Banca de feira','estrutura',1,2.4],
 ['cidade','uno-batido','Uno batido abandonado','carro',2,3.65],
 ['cidade','varal','Varal com roupas','estrutura',0,4],
 ['cidade','mesa-bar','Mesa e cadeiras de bar','pequeno',1,1],
 ['cidade','orelhao','Orelhão','pequeno',1,2.2],
 ['vegetacao','mangueira','Mangueira','vegetacao',1,7],
 ['vegetacao','ipe-amarelo','Ipê-amarelo','vegetacao',1,8],
 ['vegetacao','arvore-mata','Árvore da mata atlântica','vegetacao',1,10],
 ['vegetacao','embauba','Embaúba','vegetacao',1,8],
 ['vegetacao','bananeira','Bananeira','vegetacao',1,5],
 ['vegetacao','jucara','Palmeira juçara','vegetacao',1,9],
 ['vegetacao','capim','Touceira de capim braquiária','vegetacao',1,1.2],
 ['vegetacao','cupinzeiro','Cupinzeiro de pasto','pequeno',1,1.6],
 ['vegetacao','mourao','Mourão com arame farpado','estrutura',1,1.3],
 ['vegetacao','moita','Moita de samambaia e helicônia','vegetacao',1,1.5],
];
if(process.argv[1]?.endsWith('javaporcos-mint-packs.mjs')){
 const io=new NodeIO().registerExtensions(ALL_EXTENSIONS),registry=JSON.parse(readFileSync('mint-assets.json')),rows=[];
 const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
 mkdirSync('references/glb/javaporcos-mint-packs',{recursive:true});
 for(const[pack,name,title,classe,axis,size]of ITENS){
  const source=`references/glb/javaporcos-mint-packs/${name}.glb`,runtime=`public/models/props/javaporcos_mint_${name.replaceAll('-','_')}.glb`;
  copyFileSync(`artifacts/javaporcos-feedback-20261030/mint-${pack}/${name}-raw.glb`,source);
  const doc=await io.read(source),scene=doc.getRoot().listScenes()[0],b=getBounds(scene),scale=size/(b.max[axis]-b.min[axis]);
  const pivot=doc.createNode('pivo-no-chao').setScale([scale,scale,scale]).setTranslation([-(b.min[0]+b.max[0])*scale/2,-b.min[1]*scale,-(b.min[2]+b.max[2])*scale/2]);
  for(const node of scene.listChildren()){scene.removeChild(node);pivot.addChild(node);}scene.addChild(pivot);
  await doc.transform(dedup(),textureCompress({encoder:sharp,targetFormat:'webp',resize:[512,512],quality:90}),prune());
  await io.write(runtime,doc);const finalBounds=getBounds(scene),dims=finalBounds.max.map((v,i)=>+(v-finalBounds.min[i]).toFixed(3));
  const tris=doc.getRoot().listMeshes().flatMap(m=>m.listPrimitives()).reduce((n,p)=>n+p.getIndices().getCount()/3,0);
  registry.assets[`jp-mint-${name}`]={artifactType:'model/gltf-binary',files:[runtime],source:{kind:'mint-asset-pack',assetPackId:PACKS[pack].id,chatUrl:`https://mint.gg/chat/${PACKS[pack].chat}`,displayName:title,frente:'javaporcos-mint-packs',classe,notes:'Item baixado pelo seletor do pack. Catálogo; ainda não inserido no mapa.'},processing:{tools:['tools/javaporcos-mint-packs.mjs'],source,sourceSha256:hash(source),finalSha256:hash(runtime),tris,dimensions:dims,bytes:statSync(runtime).size}};
  rows.push(`| \`${runtime.split('/').at(-1)}\` | ${title} | ${pack} | ${tris} | ${Math.round(statSync(runtime).size/1024)} | ${dims.join(' × ')} |`);console.log({name,tris,dimensions:dims,bytes:statSync(runtime).size});
 }
 writeFileSync('mint-assets.json',JSON.stringify(registry,null,2)+'\n');
 const p='public/models/props/FONTE.md',start='<!-- javaporcos-mint-packs:start -->',end='<!-- javaporcos-mint-packs:end -->',old=readFileSync(p,'utf8');
 const section=`${start}\n\n### Pacotes Mint cidade e vegetação — 30/10/2026\n\nModelos próprios do projeto CORO SOLTO — Javaporcos. Cidade: [pack](https://mint.gg/assets?asset=${PACKS.cidade.id}), [solicitação](https://mint.gg/chat/${PACKS.cidade.chat}). Vegetação: [pack](https://mint.gg/assets?asset=${PACKS.vegetacao.id}), [solicitação](https://mint.gg/chat/${PACKS.vegetacao.chat}).\n\nOriginais ignorados em references/glb/javaporcos-mint-packs; hashes e processamento em mint-assets.json. Receita tools/javaporcos-mint-packs.mjs: escala uniforme declarada, pivô no chão, geometria original e WebP512/quality90. Sem quantização, sem conversão paga. Modelos catalogados; ainda não colocados no mapa, que mantém sua geometria física validada. Escalas são calibração local para futura integração, não medidas de objetos reais.\n\n| Arquivo | Item | Pack | Tris | KiB | Dimensão local (m) |\n|---|---|---|---|---|---|\n${rows.join('\n')}\n\n${end}`;
 const a=old.indexOf(start),z=old.indexOf(end);if((a<0)!==(z<0))throw Error('marcadores FONTE incompletos');writeFileSync(p,a<0?old+'\n'+section+'\n':old.slice(0,a)+section+old.slice(z+end.length));
}
