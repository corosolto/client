// Curadoria por lugar: docs/visual-consistency/GRAFITE-CURADORIA-GLOBAL.md.
import { identidadeArteGrafite } from './graffiti_art_id.js';

export const ARTE_POR_MAPA = Object.freeze({
  "campomorro": Object.freeze([
    "/img/textures/campomorro_streetart_baile.webp",
    "/img/decals/or-mitico-mural.png",
    "/img/decals/personagem-muro.png",
  ]),
  "corrego": Object.freeze([
    "/img/textures/corrego_streetart_pixo.webp",
    "/img/decals/folha-pixaca-02.png",
    "/posters/dafac3c979a935aea80adb8b90f6ef1b.jpg",
    "/posters/eabfe479653f0e9c94a618858e8667bc.jpg",
    "/img/decals/folha-throwu-02.png",
    "/img/decals/folha-person-03.png",
  ]),
  "lajes": Object.freeze([
    "/img/decals/pixo-lajes-01.png",
    "/img/decals/tag-fina.png",
  ]),
  "praca_poderes": Object.freeze([
    "/posters/25c9112229edfcfbb1eae4137ecc151a.jpg",
    "/img/decals/tags-treino-02.png",
  ]),
  "mansao": Object.freeze([
    "/img/decals/folha-pixaca-03.png",
    "/img/decals/folha-pixaca-04.png",
    "/img/decals/folha-pixaca-05.png",
  ]),
  "ferro_velho": Object.freeze([
    "/img/decals/or-stencil-capivara.png",
    "/img/decals/personagens-graffiti-04.png",
    "/img/decals/tag-selvagem.png",
    "/posters/New Project (1).png",
    "/img/decals/personagens-graffiti-03.png",
  ]),
  "piscina_treta": Object.freeze([
    "/posters/8445c0ca193d22b4d6a9af66409b0dda.jpg",
    "/posters/82f8dcbb0547719bfc4dbb27aed9f583.jpg",
    "/img/decals/dont-overthink.png",
    "/img/decals/gratidao-sol.png",
    "/img/decals/tag-pingo.png",
    "/img/decals/or-stencil-pomba.png",
  ]),
  "escadao": Object.freeze([
    "/img/decals/folha-person-02.png",
    "/img/decals/folha-throwu-03.png",
    "/img/decals/folha-throwu-04.png",
    "/img/decals/personagens-graffiti-02.png",
    "/img/decals/personagens-graffiti-01.png",
    "/posters/574381edb80801aaff5e9a1cdd88bc4b.jpg",
    "/posters/or-compro-ouro.jpg",
  ]),
  "loja_h": Object.freeze([
    "/img/decals/tag-money.png",
    "/img/decals/or-graf-coro.png",
    "/img/decals/personagens-graffiti-07.png",
    "/posters/78c38b895431ac393f96036507060be1.jpg",
    "/posters/images.png",
  ]),
  "atacadao_treta": Object.freeze([
    "/img/decals/or-graf-treta.png",
    "/posters/dc58fe69ac56037026f1bf6181b7f71c.jpg",
    "/posters/51edbafcf2eebbb2dc157f66bb1a2d66.jpg",
    "/posters/6f2bbbe03a6c5a16af15fe12ebea0d6c.jpg",
  ]),
  "obras_prefeitura": Object.freeze([
    "/img/decals/tag-flop.png",
    "/posters/New Project (2).png",
    "/posters/f0deec032dd1777bc681179fb74a29b0.jpg",
    "/posters/or-quebrada-vive.jpg",
  ]),
  "posto_treta": Object.freeze([
    "/img/decals/pra-gringo.png",
    "/img/decals/cartaz-america-latina.png",
    "/img/decals/cartaz-medo.png",
    "/img/decals/cartaz-neutro.png",
    "/img/decals/meio-ano.png",
    "/img/decals/peca-bolha.png",
    "/posters/or-show-funk.jpg",
  ]),
  "upa_24h": Object.freeze([
    "/posters/3300c39038dd97ad6a20342038c008b0.jpg",
    "/posters/26268061ca13b4dc4a871c1163cbeb6d.jpg",
    "/posters/New Project (3).png",
  ]),
  "quebrada": Object.freeze([
    "/img/decals/bandeira-vira-lata.png",
    "/img/decals/folha-person-01.png",
    "/img/decals/folha-person-04.png",
    "/img/decals/folha-person-05.png",
    "/img/decals/folha-person-06.png",
    "/img/decals/folha-pixaca-06.png",
    "/img/decals/folha-pixaca-08.png",
    "/img/decals/folha-throwu-01.png",
    "/img/decals/folha-throwu-05.png",
    "/img/decals/folha-throwu-06.png",
    "/img/decals/personagens-graffiti-05.png",
    "/img/decals/personagens-graffiti-06.png",
    "/posters/mural-eternamente.jpg",
    "/posters/mural-leste-vive.jpg",
  ]),
});

const donos = new Map(Object.entries(ARTE_POR_MAPA).flatMap(([mapa, arquivos]) => arquivos.map(arquivo => [arquivo, mapa])));

// APIs geométricas sem id continuam disponíveis para cenas e provas locais.
// Nos 14 mapas publicados, só entra arte escolhida para aquele lugar.
export function artePermitidaNoMapa(mapa, arquivo) {
  if (!Object.prototype.hasOwnProperty.call(ARTE_POR_MAPA, mapa)) return true;
  return donos.get(identidadeArteGrafite(arquivo)) === mapa;
}
