import fs from 'node:fs';
const astro = fs.readFileSync('src/pages/index.astro','utf8');
const i18n = fs.readFileSync('public/js/i18n.js','utf8');
// chaves do DICT (linhas 'X': 'Y')
const keys = new Set();
for (const m of i18n.matchAll(/'((?:[^'\\]|\\.)*)'\s*:/g)) keys.add(m[1].replace(/\\'/g,"'"));
// texto visível: remove frontmatter, script/style, comentários
let html = astro.replace(/^---[\s\S]*?---/,'').replace(/<script[\s\S]*?<\/script>/g,'').replace(/<style[\s\S]*?<\/style>/g,'').replace(/<!--[\s\S]*?-->/g,'');
const texts = [];
for (const m of html.matchAll(/>([^<>{}]+)</g)) { const t=m[1].trim(); if (t) texts.push(t); }
for (const m of html.matchAll(/(placeholder|title|aria-label)="([^"]+)"/g)) texts.push(m[2].trim());
const PT = /[ãõáéíóúâêôçÇÃÕÁÉÍÓÚÂÊÔ]|\b(de|da|do|que|pra|com|seu|sua|você|não|mapa|mapas|jogo|treta|voltar|escolha|nome|rede|social|foto|perfil|opcional)\b/i;
const N=(x)=>x.replace(/\s+/g,' ').trim();
const nk=new Set([...keys].map(N));
const faltando = [...new Set(texts)].filter(t => !nk.has(N(t)) && !/^[\s\d\W]*$/.test(t));
console.log(faltando.map(t=>JSON.stringify(t)).join('\n'));
console.log('\n--- total sem tradução:', faltando.length);
