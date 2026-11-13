// Terceiros de anúncio não são código do jogo: o orçamento de boot mede o HTML
// público, mas o pixel do Twitter atualmente entrega um snippet defeituoso que
// chama insertBefore com uma função. O proxy remove somente esse snippet e
// registra a contagem; pageerror de qualquer script do jogo continua INFRA.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripThirdPartyBootNoise } from './boot-network-origin.mjs';

const twitter = `<script>(function(){const X_PIXEL_ID="rh4bd";!function(e,t,n,s,u,a){e.twq||(s=e.twq=function(){},u=t.createElement(n),u.src="https://static.ads-twitter.com/uwt.js",a=t.getElementsByTagName(n)[0],a.parentNode.insertBefore(s,a))}(window,document,'script');})();</script>`;
const game = '<script>window.__gameBoot="ok";</script>';
const result = stripThirdPartyBootNoise(`<!doctype html><html><head>${twitter}${game}</head><body></body></html>`);
assert.equal(result.stripped, 1, 'remove exatamente o snippet de anúncio');
assert(!result.body.includes('static.ads-twitter.com'), 'snippet do Twitter removido');
assert(!result.body.includes('X_PIXEL_ID'), 'identificador do Twitter removido');
assert(result.body.includes(game), 'script do jogo preservado');
assert.equal(stripThirdPartyBootNoise(game).stripped, 0, 'HTML sem anúncio permanece intacto');

const source = readFileSync(new URL('./boot-network-origin.mjs', import.meta.url), 'utf8');
const anchor = 'return Object.freeze({body:output,stripped});';
assert.equal(source.split(anchor).length, 2, 'âncora única de remoção');
const mutant = process.argv.includes('--mutante=sem-remocao');
if (mutant) {
  const broken = source.replace(anchor, 'return Object.freeze({body:String(body),stripped:0});');
  const url = new URL('./boot-network-origin.mjs', import.meta.url);
  const rewritten = broken.replace(/from\s+(['"])([^'"]+)\1/g, (_, quote, spec) =>
    `from ${JSON.stringify(spec.startsWith('.') ? new URL(spec, url).href : import.meta.resolve(spec))}`);
  const { stripThirdPartyBootNoise: strippedMutant } = await import(`data:text/javascript;base64,${Buffer.from(rewritten).toString('base64')}`);
  const mutated = strippedMutant(twitter);
  assert.equal(mutated.stripped, 0, 'mutante não remove o snippet');
  assert(mutated.body.includes('static.ads-twitter.com'), 'mutante preserva o snippet defeituoso');
  console.log('✓ mutante sem-remocao detectado');
} else {
  console.log('✓ boot noise: só o pixel de anúncio é removido; script do jogo preservado');
}
