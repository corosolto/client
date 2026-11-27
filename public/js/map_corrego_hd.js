// Kit visual HD do Córrego, atrás de ?hd=1 (demo de gráficos, desligado por padrão). O mapa não nomeia materiais: cada
// regra casa por `arquivo da textura|cor` (REGRAS; a textura chega assíncrona, então o casamento repete até 20 s).
// Tudo volta em desliga(). Kill-switches: ?hdmadeira=0 ?hdchao=0 ?hdmato=0 ?hdreboco=0 ?hdcanal=0 ?hdbloco=0 ?hdjanela=0 ?hdeletro=0
// ?hdespuma=0 (espuma marrom da água) ?hdluz=0 ?hdtravessia=0 (tabuleiro de concreto + mureta de bloco no vão + grade de ferro chato
// na rampa: volta a madeira) ?hdcen=0 (ou ?hdcen=postes,fachadas = só estes); por item em
// opts.cenografia.{postes,fachadas,palafitas,lajes,telhados,canal,margem,varais,roupas,sacos,toldos,comercio,guias,skyline,portoes,becos,guarda}
// (margem=0 também deixa os tufos de capim onde estavam; postes=0 deixa os gatos autorais baixos sobre a travessia; sacos=0 deixa
// os sacos autorais redondos; guarda = tubos da rampa da travessia, só com hdtravessia). Poça/mancha úmida do chão agora é
// padrão: opts.poca === false ou ?hdpoca=0 desliga. ?hdcalcada=0: calçada/sarjeta pela lista fixa de |x| em vez do campo de
// distância às fachadas (DataTexture 384 × 640 lida dos colisores das casas; a única textura criada pelo kit além dos atlas).
// r26 (barracos e caminhos "de obra"): ?hdr26=0 / opts.r26 === false volta ao visual anterior inteiro; por frente (opts.<nome> === false):
// ?hdtijolo=0 bloco cerâmico 29 × 19 + capa de argamassa da mureta   ?hdrua3=0 rua em 3 faixas (trilha, margem, cimentado) + vala, remendos, poças, tampa
// ?hdobra=0 pilares de fôrma de tábua, escada da travessia (piso × espelho por paralaxe), sofito, mureta rebocada, guarda de uma cor, vigas e adutora
// ?hdtelha=0 fibrocimento/zinco em chapas, borda fina sobre terça, caibros, mãos-francesas, lastro; cumeeiras soltas escondidas
// ?hdtapume=0 colcha de painéis (tábua em pé, madeirite, zinco) no barraco e no tapume da palafita   ?hdestaca=0 estacas, barrotes e viga de borda das palafitas.
// Chaves r26: `pbr_bricks051_color|ffffff` → tijoloR26; `tex_madeira|ffffff|guarda` → guardaR26; `asphalt_br|ffffff` → chaoR26;
// `tex_madeira|7a5a3a` → pilarR26; `concrete_br|9d968a` + forma (pilar das casas; os 12 postes de POSTES_R26 ficam como eram);
// `tex_madeira|9a8f7e` + escada; `concrete_br|8f8b80` + vala; `tex_zinco|ffffff` → chapaR26; `tex_madeira|b08a6a` → tapumeR26;
// `tex_madeira|ffffff` + colcha (faces verticais acima de 2 m). Cumeeira = instância de 0,34 × 0,12 m da placa de referência 3,4 × 0,1 × 5,6.
import * as THREE from 'three';
import { pbrTex, materiaisDe, projetaMundo, RUIDO_GLSL, GRAO_GLSL } from './map_sertao_hd.js';
import { atlasJanelas, atlasPortas } from './hd_detalhes_lajes.js';
import { cenografiaCorrego, SACOS_AUTORAIS, folgaPass } from './hd_cenografia_corrego.js';

// Só CC0 já no repositório: hd_lajes (concreto de piso 1,9 m, concreto de fôrma 1,8 m, reboco 1,7 m, chapa ondulada)
// e pbr_bricks051 (tijolo sob o reboco / grão do bloco). `*_cor_rug` leva a rugosidade no alfa. Nenhuma textura nova;
// os atlas de janela e porta são canvas de hd_detalhes_lajes.js (1024², gerados na hora e dispostos em desliga()).
const tex = (nome, srgb = true) => pbrTex(`hd_lajes/${nome}`, srgb);
const LUMA = 'vec3(0.3, 0.59, 0.11)';

// Chave = nome do arquivo do mapa de cor (ou `canvasN`) + cor do material. Origem de cada cor: map_corrego.js.
//   asphalt_br|ffffff  rua (TEX.asphalt; todo o chão de rua é este — dirt_field não chega a material nenhum)
//   tex_madeira|ffffff tábua da ponte, tapume da palafita, guarda da travessia   tex_madeira|9a8f7e tablado da travessia/pranchas
//   tex_madeira|b08a6a barraco de passagem   tex_madeira|8a6a4e matMadeiraBruta (vigas da travessia, tapume largo do puxadinho,
//   paus de tampo, pilares da prancha)   tex_madeira|7a5a3a pilares da travessia (pilarHD, cor pura)   tex_zinco|ffffff telhados e barracos
//   concrete_br|8f8b80 parede e rampa do canal   concrete_br|6f6f61 fundo do canal   concrete_br|b4ada0/8d8579 embasamento,
//   lajes (o topo é o piso da laje do sobrado), platibanda   concrete_br|9d968a pilar das casas/palafita e poste de distribuição
//   concrete_br|9a8f7e entulho  concrete_br|8a867c manilha  concrete_br|ffffff pilar da cobertura  concrete_br|3f7f9c caixa d'água cúbica
//   concrete_br|2b2a27 matVao (porta 1,0 × 2,1 e janela 1,0 × 1,0 das casas)   pbr_bricks051_color|ffffff tijolo cru (último
//   pavimento, faixas do sobrado, pilha de tijolo)   canvas128|7a5a3c tambor (linhaDaguaHD, cor pura)   canvas128|d6d3cb geladeira
//   do canal (1,5 × 1,8) e caixa de energia do poste (geladeiraHD, cor pura)   canvas512|6b6350 assoreamento das pontas do canal
//   |8a6a4e matRipa (mão-francesa da palafita, mureta da prancha, guarda do sobrado, cavalete)  |7c6a52 matVerga (ferro de espera)
//   |9d968a matConcretoFino (cruzeta, verga, escada)  |252925 |3d4435 |24211f sacos de lixo
//   tex_agua_poluida|42543b alagado das pontas; |8fc4b4 |73927a |c2e0d5 lâminas de reflexo/poça/brilho do canal
//   Nota: a área do inventário de materiais é a caixa envolvente do lote mesclado (1 malha): tambor e matVao somam
//   milhares de m² sem ser chão nem muro. forma_color tem média sRGB 106 (linear 0,14) e o lote multiplica AO por vértice:
//   concreto de fôrma leva cor quase branca e AO atenuado no shader, senão pilar/faixa em sombra vira marrom-preto.
const REGRAS = {
  'asphalt_br|ffffff': { chao: true, frente: 'chao' },
  'pbr_paintedplaster017_color|*': { reboco: true, frente: 'reboco' },
  'pbr_bricks051_color|ffffff': { bloco: true, frente: 'bloco' },
  'concrete_br|8f8b80': { concreto: 'canal', cor: 0x9a978e, frente: 'canal' },
  'concrete_br|6f6f61': { concreto: 'piso', cor: 0x6c6c64, frente: 'canal' },
  'concrete_br|b4ada0': { concreto: 'parede', cor: 0xe6e3dc, rodape: true },
  'concrete_br|8d8579': { concreto: 'parede', cor: 0xcdc8be, rodape: true },
  'concrete_br|9d968a': { concreto: 'parede', cor: 0xe2e0dc, ao: 0.30, ganho: 2.3, rodape: true, juntas: true },
  'concrete_br|9a8f7e': { concreto: 'entulho', cor: 0xa39f96 },
  'concrete_br|8a867c': { concreto: 'entulho', cor: 0x9e9a92 },
  'concrete_br|ffffff': { concreto: 'parede', cor: 0xe0ded8 },
  'concrete_br|3f7f9c': { cor: 0x2c6a8c, rugosidade: .58 },
  'concrete_br|2b2a27': { janela: true, frente: 'janela' },
  'tex_madeira|ffffff': { madeira: 'tabua', cor: 0xffffff, frente: 'madeira' },
  // Guarda-corpo da travessia alta (matGuarda: sampler clonado com repeat 1×1; o tapume/ponte usa TEX.wall com repeat 2×2).
  'tex_madeira|ffffff|guarda': { semMapa: true, cor: 0xffffff, rugosidade: .5, metal: .2, guarda: true, frente: 'travessia' },
  // Tabuleiro da travessia alta e pranchas laje→travessia: em córrego canalizado de SP a travessia é laje de concreto, não tábua.
  'tex_madeira|9a8f7e': { concreto: 'tabuleiro', cor: 0xd6d4ce, ao: 0.4, frente: 'travessia' },
  'tex_madeira|b08a6a': { madeira: 'compensado', cor: 0xffffff, frente: 'madeira' },
  'tex_madeira|8a6a4e': { madeira: 'compensado', cor: 0xffffff, frente: 'madeira' },
  'tex_madeira|7a5a3a': { semMapa: true, cor: 0xa6a49e, rugosidade: .9, metal: 0, pilar: true, frente: 'madeira' },
  'tex_zinco|ffffff': { chapa: true, cor: 0xa09e99, ferrugem: .25 },
  '|8a6a4e': { cor: 0x5e5751, rugosidade: .85, metal: 0, frente: 'madeira' },
  '|7c6a52': { cor: 0x9a9ea2, rugosidade: .55, metal: .3, frente: 'madeira' },
  '|9d968a': { concreto: 'parede', cor: 0xdcdad5 },
  'canvas128|7a5a3c': { cor: 0x3e464c, rugosidade: .62, metal: 0, linhaDagua: true },
  'canvas128|d6d3cb': { semMapa: true, cor: 0x8a8d90, rugosidade: .5, metal: 0, geladeira: true },
  'canvas512|6b6350': { cor: 0x5e584a, rugosidade: .85, frente: 'canal' },
  // Alagado das pontas e poças: rugosidade alta (0,32 dava uma elipse branca de sol na ponta do canal, poses `ponte`/`alto`).
  'tex_agua_poluida|42543b': { cor: 0x2b3528, rugosidade: .74, metal: 0, frente: 'canal' },
  'tex_agua_poluida|8fc4b4': { cor: 0x5a7465, opacidade: .16, frente: 'canal' },
  'tex_agua_poluida|73927a': { cor: 0x435846, rugosidade: .55, metal: 0, frente: 'canal' },
  'tex_agua_poluida|c2e0d5': { cor: 0x6f8274, opacidade: .10, rugosidade: .5, frente: 'canal' },
  // Placas de espuma autorais (7 caixas + 4 bolhas, cor pura 0xf0ecd3 emissiva): nata oliva, 60 % afundada (afundaEspuma), molhado escuro.
  '|f0ecd3': { cor: 0x6b6752, opacidade: .85, rugosidade: .95, metal: 0, semEmissivo: true, espuma: true, frente: 'canal' },
  // Faixa de limo autoral (T.dirt = canvas512, 0x3e5c40): linha d'água de verdade; a tira do topo do muro é escondida (lip de 4 cm ao sol = linha branca).
  'canvas512|3e5c40': { cor: 0xffffff, rugosidade: .6, metal: 0, limo: true, frente: 'canal' },
  '|252925': { cor: 0x2c3238, rugosidade: .7, saco: true },
  '|3d4435': { cor: 0x363d40, rugosidade: .7, saco: true },
  '|24211f': { cor: 0x282c31, rugosidade: .7, saco: true },
};
// Roupas do varal autoral (matRoupa, cor pura, instanciadas): vão a escala zero e a cenografia pendura pano com caimento.
const ROUPAS = new Set([0xd8d2c4, 0x8fa9c8, 0xc06a6a, 0xd8c46a, 0x7f9e78, 0xc9a2c2]);
function nomeDe(t) {
  if (!t) return '';
  const img = t.source?.data || t.image;
  if (typeof HTMLCanvasElement !== 'undefined' && img instanceof HTMLCanvasElement) return `canvas${img.width}`;
  const src = img?.currentSrc || img?.src || t.name || '';
  const m = /([^/?#]+?)(?:\.(?:webp|png|jpe?g))?(?:[?#].*)?$/.exec(src);
  return m ? m[1] : '';
}
const chaveDe = (m) => { const n = nomeDe(m.map); return n.startsWith('pbr_paintedplaster017') ? 'pbr_paintedplaster017_color|*' : `${n}|${m.color.getHexString()}`; };

// r26, GLSL comum. hdBlocoR26 = regra única do bloco cerâmico: ladrilho hd_corrego/bloco de 0,60 × 1,26 m (face 29 × 19), deslocado por
// fiada (textureGrad: a derivada tem de ser a contínua) e com tom ao longo dela; na faixa do corpo o tom de cada bloco vai à média.
const R26_GLSL = `
  float hdCorpoP(float y){ float m = mod(max(y, 0.0), 2.8); return smoothstep(0.42, 0.58, m) * (1.0 - smoothstep(1.92, 2.12, m)); }
  vec3 hdBlocoR26(sampler2D tx, vec2 q, float corpo, out vec2 uv, out vec4 gr){
    vec2 c = vec2(q.x / 0.60, q.y / 1.26); gr = vec4(dFdx(c), dFdy(c)); float fi = floor(q.y / 0.21 + 0.04);
    uv = vec2(c.x + hdH(vec2(fi, 9.0)), c.y);
    // meio (junta do ladrilho < 2 px): a textura borra e só dá a mancha; junta, tom por bloco e croma passam a ser desenhados.
    // longe (bloco < ~8 px no pior eixo): pegada isotrópica e tom de bloco igualado — sem isso a mureta rasante lia ranhura e xadrez.
    float fwx = fwidth(q.x), fwy = fwidth(q.y), fwq = max(fwx, fwy), meio = smoothstep(0.006, 0.013, fwq), longe = smoothstep(0.012, 0.035, fwq);
    gr *= 1.0 + 2.0 * meio; float ro = max(length(gr.xy), length(gr.zw)); gr = vec4(mix(gr.xy, vec2(ro, 0.0), longe), mix(gr.zw, vec2(0.0, ro), longe));
    // lm = luma na escala do bloco (mip 7: 8 × 8 texels por ladrilho); a junta mantém o contraste, só o tom de cada bloco é igualado.
    vec3 t = textureGrad(tx, uv, gr.xy, gr.zw).rgb; float l = dot(t, ${LUMA}), lm = max(dot(textureLod(tx, uv, 7.0).rgb, ${LUMA}), 0.05);
    float u2 = uv.x * 2.0; vec2 id = vec2(floor(u2), fi);
    float tomB = mix(0.88, 1.12, hdH(id)) * (1.0 - 0.26 * step(0.93, hdH(id + 3.1)));
    float tom = mix(mix(0.84, 1.16, hdN(vec2(q.x * 1.3 + fi * 7.3, fi * 3.1))) * mix(1.0, tomB, meio * (1.0 - longe)), 1.0, 0.8 * corpo);
    // O ladrilho só tem 2 blocos por fiada: sem igualar o tom de bloco (60 % perto, tudo do meio em diante) a fiada lê xadrez ABAB.
    vec3 cor = (vec3(l) + (t - vec3(l)) * mix(1.25, 0.92, meio)) * 0.62 * tom * mix(1.0, clamp(0.364 / lm, 0.8, 1.25), max(mix(0.6, 1.0, smoothstep(0.004, 0.009, fwq)), 0.85 * corpo));
    // Junta desenhada no lugar da do ladrilho (assentamento em 0,21k − 0,008) com piso de 1,3 px; some quando a fiada cai abaixo de ~3 px.
    float db = abs(fract(q.y / 0.21 + 0.54) - 0.5) * 0.21, dh = abs(fract(u2 + 0.5) - 0.5) * 0.30;
    float jb = (1.0 - smoothstep(0.0, fwy, db - max(0.009, 0.65 * fwy))) * smoothstep(0.005, 0.011, fwy) * (1.0 - smoothstep(0.045, 0.075, fwy));
    float jh = (1.0 - smoothstep(0.0, fwx, dh - max(0.008, 0.65 * fwx))) * smoothstep(0.008, 0.014, fwx) * (1.0 - smoothstep(0.05, 0.08, fwx)) * 0.7;
    vec3 massa = vec3(0.262, 0.250, 0.224);
    cor = mix(mix(cor, massa, 0.8 * max(jb, jh)), massa, 0.12 * smoothstep(0.045, 0.075, fwy));
    return max(vec3(0.0), cor); }
  float hdRespR26(vec2 q, float hm){
    return smoothstep(0.70, 0.76, hdN(q * vec2(23.0, 31.0)) * 0.55 + hdN(q * 67.0) * 0.25 + 0.34 * (1.0 - hm / 0.4)) * step(hm, 0.42) * smoothstep(0.03, 0.01, fwidth(q.y)); }
  float hdFormaR26(float u, float y, float w, out float relx){
    float c = floor(u / w), f = fract(u / w), pu = fwidth(u), vis = smoothstep(0.03, 0.008, pu), d = min(f, 1.0 - f) * w;
    float em = (1.0 - smoothstep(0.002, 0.004 + pu, d)) * vis;
    relx = (step(0.5, f) * 2.0 - 1.0) * em;
    float veio = (hdN(vec2(u * 90.0, y * 1.6 + c * 7.0)) - 0.5) * 0.10 * smoothstep(0.012, 0.004, pu);
    return mix(1.0, mix(0.94, 1.05, hdH(vec2(c, 5.0))), vis) * (1.0 + veio) * (1.0 - 0.22 * em); }
  vec3 hdTapumeR26(sampler2D tx, vec2 q, float corpo, out float relx, out float metal, out float tab){
    float pu = fwidth(q.x), vis = smoothstep(0.03, 0.008, pu), fino = smoothstep(0.012, 0.004, pu), fora = 1.0 - corpo;
    float c = floor(q.x / 1.10), uf = q.x - c * 1.10, tp = hdH(vec2(c, 71.0)), esp = step(0.5, hdH(vec2(c, 73.0)));
    vec3 tb = texture2D(tx, q / vec2(1.10, 2.20)).rgb;
    uf = mix(uf, 1.10 - uf, esp); relx = 0.0; metal = 0.0; tab = 0.0; vec3 cor = vec3(0.17); float lb = 0.17;
    if (tp < 0.55) {
      // Tábua do conjunto (média linear 0,376): na faixa do corpo o contraste entre tábuas cai à metade.
      float l = max(dot(tb, ${LUMA}), 0.03), k = mix(0.42, 0.62, hdH(vec2(c, 5.0)));
      cor = tb * k * mix(1.0, mix(0.376, l, 0.5) / l, corpo); lb = 0.376 * k; tab = 1.0;
    } else if (tp < 0.85) {
      float ph = hdH(vec2(c, 21.0)), ev = min(uf, 1.10 - uf);
      vec3 pb = vec3(0.150, 0.140, 0.125) * mix(0.88, 1.08, ph);
      float em = max(1.0 - smoothstep(0.003, 0.005 + pu, ev), 1.0 - smoothstep(0.003, 0.005 + fwidth(q.y), abs(q.y - 2.20))) * vis;
      float prego = (1.0 - smoothstep(0.004, 0.007 + pu, length(vec2(ev - 0.02, mod(q.y, 0.25) - 0.125)))) * fino;
      float veio = (hdN(vec2(q.x * 40.0 + c * 5.0, q.y * 3.0)) - 0.5) * 0.12 * fino + (hdN(q * vec2(2.0, 9.0) + c) - 0.5) * 0.10;
      cor = pb * (1.0 + veio) * (1.0 - 0.6 * em) * (1.0 - 0.5 * prego); lb = dot(pb, ${LUMA});
    } else {
      float ov = smoothstep(0.45, 0.15, pu * 13.16);
      vec3 zb = vec3(0.225, 0.242, 0.250) * mix(0.9, 1.05, hdH(vec2(c, 31.0)));
      float fer = (1.0 - smoothstep(0.15, 0.50, q.y + (hdN(vec2(q.x * 7.0, 3.0)) - 0.5) * 0.3)) * (0.5 + 0.5 * hdN(q * 13.0)) * fora;
      cor = mix(zb * (1.0 + 0.08 * cos(uf * 82.67) * ov), vec3(0.20, 0.085, 0.04), 0.8 * fer); lb = dot(zb, ${LUMA});
      relx = 0.5 * sin(uf * 82.67) * ov * (1.0 - 2.0 * esp); metal = 0.4 * (1.0 - fer);
    }
    // Faixa do corpo: mesma luma em todo pano (±3 %) e croma à metade — madeirite clareado não pode ler bege-pele.
    cor = mix(cor, cor * (0.17 / max(lb, 0.02)) * (0.97 + 0.06 * hdH(vec2(c, 41.0))), corpo); cor = mix(cor, vec3(dot(cor, ${LUMA})), 0.5 * corpo);
    float h0 = 0.24 + 0.10 * hdH(vec2(c * 3.0 + floor(uf / 0.15), 43.0)) + (hdN(vec2(q.x * 21.0, 1.0)) - 0.5) * 0.06;
    float podre = (1.0 - smoothstep(h0 - 0.05, h0 + 0.02, q.y)) * step(-0.05, q.y) * fora;
    cor = mix(cor, vec3(0.048, 0.040, 0.032) * (0.8 + 0.4 * hdN(q * vec2(40.0, 6.0))), 0.85 * podre);
    // Remendo quente (OSB ou lona azul) só entre 2,25 e 2,79 m, em 3 panos de cada 10.
    float rh = hdH(vec2(c, 51.0)), rm = step(rh, 0.3) * (1.0 - smoothstep(0.0, 0.01 + pu, max(abs(uf - 0.55) - 0.38, abs(q.y - 2.52) - 0.27)));
    vec3 rc = rh < 0.17 ? vec3(0.27, 0.175, 0.08) * (0.7 + 0.6 * hdN(q * vec2(60.0, 25.0))) : vec3(0.05, 0.114, 0.254) * (0.85 + 0.25 * hdN(q * vec2(4.0, 17.0)));
    metal *= 1.0 - rm; relx *= 1.0 - rm;
    return mix(cor, rc, rm); }`;

// Posição de mundo no fragmento e, com `metros`, UV projetado no mundo (parede: horizontal x altura; piso: xz, ou zx
// quando a onda tem de descer o telhado; 'caimento': u atravessa o declive e v desce por ele, lido da normal da face).
// `extra` = GLSL a mais depois do comum (R26_GLSL só nos materiais da r26: com ?hdr26=0 o shader é o da rodada anterior, byte a byte).
const PARS = `varying vec3 vHdPos;
  ${RUIDO_GLSL}
  ${GRAO_GLSL}
  vec3 hdUmido(vec3 c, float k){ return mix(c, dot(c, ${LUMA}) * vec3(0.54, 0.57, 0.47), k); }
  float hdCorpoF(float y){ return smoothstep(0.42, 0.58, y) * (1.0 - smoothstep(1.92, 2.12, y)); }`;
function mundo(shader, metros = 0, modo = false, extra = '') {
  shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vHdPos;')
    .replace('#include <uv_vertex>', `#include <uv_vertex>
      { vec4 hdW = vec4(position, 1.0); vec3 hdNm = normal;
        #ifdef USE_INSTANCING
          hdW = instanceMatrix * hdW; hdNm = mat3(instanceMatrix) * hdNm;
        #endif
        hdW = modelMatrix * hdW; vec3 hdNs = normalize(mat3(modelMatrix) * hdNm); hdNm = abs(hdNs); vHdPos = hdW.xyz;
        ${metros ? `${modo === 'caimento' ? 'vec2 hdSl = length(hdNs.xz) > 0.03 ? normalize(hdNs.xz) : vec2(0.0, 1.0);' : ''}
        vec2 hdUv = (hdNm.y > max(hdNm.x, hdNm.z) ? ${modo === 'caimento' ? 'vec2(dot(hdW.xz, vec2(-hdSl.y, hdSl.x)), dot(hdW.xz, hdSl))' : `hdW.${modo ? 'zx' : 'xz'}`} : (hdNm.x > hdNm.z ? hdW.zy : hdW.xy)) / ${metros.toFixed(3)};
        #ifdef USE_MAP
          vMapUv = hdUv;
        #endif
        #ifdef USE_NORMALMAP
          vNormalMapUv = hdUv;
        #endif` : ''}
      }`);
  shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>\n${PARS}${extra}`);
}
const NORMAL_REL = THREE.ShaderChunk.normal_fragment_maps.replace('mapN.xy *= normalScale;', 'mapN.xy *= normalScale * hdRel;');

// Rua: cimentado em placas de 2,5 × 3,0 m (junta de 1,5 cm, tom por placa), grão fino, remendo de asfalto escuro e frio com
// borda nítida e cordão de piche (≈ 20 % da área, mais denso a < 3 m das fachadas), brita miúda mais escura, canaleta no eixo
// do passeio da beira e do beco A–B (|x| 6,55 / 13,3), calçada de concreto claro de 1,2 m no pé de CADA fachada (hdDs = campo
// de distância aos colisores das casas, campoFachadas; a guia geométrica de hd_cenografia_corrego.js fecha em 1,26 m) com junta a
// cada 1,2 m ao longo da fachada e sarjeta úmida logo fora da guia; só a viela A–B (|x| 12,2–15,1) é beco sem calçada, mais
// escuro e com AO no pé das paredes. Sem campo (sem colisores) volta a lista fixa de |x| (7,45 / 12,2 / 15,1 / 18,85 / 22,45),
// que nunca dava calçada à face −z do bar nem às faces do largo do spawn. Poça rasa (rugosidade 0,15, sem cubo) + mancha úmida.
// Albedo: piso_cor_rug tem média linear 0,12; com cor 0x96 o cimento ficava em 0,04 (mais ESCURO que o asfalto de 0,185, que
// era o que lia como "rua clara"). Agora cimento ≈ 0,19 em luminância pura com tinta fria (0,955/1/1,06: o sol 0xffc888 levava o
// neutro a R−B 19 e a sombra sob a rampa lia como terra) e asfalto 0,135. Grão: cada frequência (3 cm e 1,1 cm) some pelo seu
// próprio fwidth e a metade da amplitude — abaixo de 4 px por ciclo o ruído de 1 cm virava "sal" no laplaciano.
function chaoHD(m, poca, campo) {
  m.map = tex('piso_cor_rug'); m.normalMap = tex('piso_normal', false); m.roughnessMap = null; m.roughness = 1; m.normalScale.set(1.1, 1.1); m.color.setHex(0xffffff);
  m.onBeforeCompile = (s) => { mundo(s, 1.2);
    if (campo) { s.uniforms.hdFachadas = { value: campo }; s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D hdFachadas;'); }
    s.fragmentShader = s.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
      float hdRug = sampledDiffuseColor.a, hdRel = 1.0; diffuseColor.a = 1.0;
      { vec2 hdP = vHdPos.xz; float hdFw = fwidth(hdP.x), hdAx = abs(vHdPos.x);
        float hdA = hdN(hdP * 0.071), hdB = hdN(hdP * 0.23 + 3.1), hdM = hdN(hdP * 0.9 + 7.0), hdF = hdN(hdP * 3.7);
        float hdFino = smoothstep(0.6, 0.15, hdFw * 9.0) * ((hdN(hdP * 6.5 + 1.0) - 0.5) * 0.22 + smoothstep(0.5, 0.12, hdFw * 17.0) * (hdN(hdP * 17.0 + 2.0) - 0.5) * 0.10);
        // hdDs = distância à fachada mais perto; hdAo corre ao longo dela (juntas da calçada), hdPerp afasta-se dela.
        ${campo ? `vec4 hdFd = texture2D(hdFachadas, (hdP + vec2(24.0, 40.0)) / vec2(48.0, 80.0)); float hdDs = hdFd.r * 4.0;
        vec2 hdFn = hdFd.gb * 2.0 - 1.0; hdFn = length(hdFn) > 0.2 ? normalize(hdFn) : vec2(1.0, 0.0);
        float hdAo = dot(hdP, vec2(-hdFn.y, hdFn.x)), hdPerp = dot(hdP, hdFn);`
        : `float hdDs = min(min(abs(hdAx - 7.45), abs(hdAx - 12.2)), min(min(abs(hdAx - 15.1), abs(hdAx - 18.85)), abs(hdAx - 22.45))), hdAo = vHdPos.z, hdPerp = hdAx;`}
        float hdBeco = smoothstep(12.0, 12.5, hdAx) * (1.0 - smoothstep(14.8, 15.3, hdAx));
        float hdCalc = (1.0 - smoothstep(1.18, 1.22 + hdFw * 1.5, hdDs)) * (1.0 - hdBeco);
        // Hierarquia: calçada (≤ 1,22 m) | guia clara de 15 cm | sarjeta úmida escura (1,37–1,85) | faixa de asfalto no meio da rua
        // (≥ 1,9 m de toda fachada, só entre as fileiras: |x| > 7, nunca na beira do canal). Rua estreita (beco) fica em cimento.
        // Emenda cimento/asfalto em |x| ≈ 7 ondulada (ruído de ±0,5 m ao longo de z): a reta lia como costura de textura (pose rua).
        float hdOnd = (hdN(vec2(hdP.y * 0.9, 3.0)) - 0.5) * 1.0 + (hdN(vec2(hdP.y * 4.0, 8.0)) - 0.5) * 0.2;
        float hdCentro = smoothstep(1.85, 2.3, hdDs) * smoothstep(6.6, 7.4, hdAx + hdOnd) * (1.0 - hdBeco);
        float hdAr = hdA * 0.8 + hdB * 0.2, hdRem = smoothstep(0.60, 0.64, hdAr) * hdCentro, hdCord = (1.0 - smoothstep(0.008, 0.02 + hdFw * 1.5, abs(hdAr - 0.625))) * hdCentro, hdAsf = hdCentro;
        vec3 hdC = vec3(dot(diffuseColor.rgb, ${LUMA})) * vec3(0.955, 1.0, 1.06) * 1.6 * (1.0 + hdFino);
        vec2 hdPl = vec2(hdP.x / 2.5, hdP.y / 3.0), hdFr = fract(hdPl), hdDl = min(hdFr, 1.0 - hdFr) * vec2(2.5, 3.0);
        float hdJunta = (1.0 - smoothstep(0.006, 0.014 + hdFw * 1.5, min(hdDl.x, hdDl.y))) * smoothstep(0.08, 0.02, hdFw);
        hdC *= mix(0.94, 1.05, hdH(floor(hdPl))) * (1.0 - 0.3 * hdJunta * (1.0 - hdCalc));
        // Calçada: placas de 1,2 m ao longo da fachada, +14 % mais clara e fria, junta própria; trinca e remendo ficam fora dela.
        { float hdCj = fract(hdAo / 1.2), hdCd = min(hdCj, 1.0 - hdCj) * 1.2, hdJc = (1.0 - smoothstep(0.006, 0.014 + hdFw * 1.5, hdCd)) * smoothstep(0.08, 0.02, hdFw);
          vec3 hdCalC = hdC * vec3(1.14, 1.15, 1.16) * mix(0.95, 1.05, hdH(vec2(floor(hdAo / 1.2), floor(hdPerp)))) * (1.0 - 0.3 * hdJc);
          hdC = mix(hdC, hdCalC, hdCalc); }
        float hdGuia = step(1.22, hdDs) * (1.0 - smoothstep(1.37, 1.37 + hdFw * 1.5, hdDs)) * (1.0 - hdBeco);
        hdC = mix(hdC, hdC * vec3(1.34, 1.36, 1.39), hdGuia);
        // Asfalto: luma ≈ 0,07 (≤ 45 % do cimento 0,19), remendo de asfalto velho mais claro e cinza, cordão de piche na borda.
        vec3 hdAsfC = vec3(0.068, 0.071, 0.078) * (0.85 + 0.3 * hdM) * (1.0 + hdFino * 0.5);
        hdAsfC = mix(hdAsfC, vec3(0.112, 0.112, 0.116) * (0.9 + 0.2 * hdF), hdRem);
        hdC = mix(hdC, hdAsfC, hdCentro) * (1.0 - 0.35 * hdCord);
        // Brita/entulho mais denso na borda da emenda (60 cm) e no resto só em manchas.
        float hdBorda = (1.0 - smoothstep(0.0, 0.6, abs(hdAx + hdOnd - 7.0))) * (1.0 - hdBeco);
        float hdBrita = smoothstep(0.68, 0.76, hdN(hdP * 1.3 + 11.0)) * (1.0 - hdAsf) * (1.0 - hdGuia);
        hdBrita = max(hdBrita, smoothstep(0.45, 0.65, hdN(hdP * 4.0 + 17.0)) * hdBorda);
        hdC = mix(hdC, hdC * 0.85 * (0.9 + 0.2 * hdF), hdBrita * 0.6);
        // Remendo retangular de borda nítida no asfalto (|x| 18,5–20,5, |z| 4,4–6,0: pé da pose rua) e tampa de bueiro Ø 60 cm
        // em (±15,6; ±4,6) com anel e frisos concêntricos (some por fwidth); ambos espelhados nos quatro quadrantes.
        { float hdRx = abs(abs(hdP.x) - 19.5) - 1.0 - (hdN(hdP * 2.0) - 0.5) * 0.25, hdRz = abs(abs(hdP.y) - 5.2) - 0.8 - (hdN(hdP * 2.0 + 5.0) - 0.5) * 0.25;
          float hdRemR = (1.0 - smoothstep(0.0, 0.015 + hdFw * 1.5, max(hdRx, hdRz))) * hdCentro, hdRemB = (1.0 - smoothstep(0.0, 0.05 + hdFw * 1.5, abs(max(hdRx, hdRz)))) * hdCentro;
          hdC = mix(hdC, vec3(0.108, 0.108, 0.112) * (0.9 + 0.2 * hdF) * (1.0 + hdFino * 0.5), hdRemR) * (1.0 - 0.35 * hdRemB);
          vec2 hdBp = vec2(abs(hdP.x) - 15.6, abs(hdP.y) - 4.6); float hdBr = length(hdBp);
          float hdBu = 1.0 - smoothstep(0.30, 0.30 + hdFw * 1.5, hdBr), hdBanel = smoothstep(0.245, 0.25 + hdFw, hdBr) * hdBu;
          float hdBfr = (0.5 + 0.5 * cos(hdBr * 125.0)) * smoothstep(0.06, 0.02, hdFw) * (1.0 - hdBanel) * step(0.06, hdBr);
          hdC = mix(hdC, vec3(0.042, 0.042, 0.045) * (0.85 + 0.3 * hdM) * (1.0 - 0.3 * hdBfr) * (1.0 + 0.35 * hdBanel), hdBu);
          hdC *= 1.0 - 0.3 * (1.0 - smoothstep(0.30, 0.36, hdBr)) * (1.0 - hdBu); }
        float hdCan = 1.0 - smoothstep(0.10, 0.14 + hdFw, min(abs(hdAx - 6.55), abs(hdAx - 13.3)));
        hdC = hdUmido(hdC, 0.5 * hdCan) * (1.0 - 0.28 * hdCan * (0.7 + 0.3 * hdM));
        float hdSar = smoothstep(1.37, 1.41 + hdFw * 1.5, hdDs) * (1.0 - smoothstep(1.70, 1.95, hdDs)) * (1.0 - hdBeco) * (0.7 + 0.3 * hdN(vec2(hdAo * 0.7, hdPerp)));
        hdC = hdUmido(hdC, 0.6 * hdSar) * (1.0 - (0.40 + 0.14 * hdM) * hdSar);
        float hdSarj = (1.0 - smoothstep(0.01, 0.03 + hdFw * 1.5, abs(hdDs - 1.385))) * (1.0 - hdBeco);
        hdC *= 1.0 - 0.3 * hdSarj;
        // Beco: 10 % mais escuro no eixo e até 28 % no pé das paredes (AO local); a névoa autoral não muda.
        hdC *= 1.0 - hdBeco * (0.10 + 0.18 * (1.0 - smoothstep(0.0, 1.3, hdDs)));
        ${poca ? `float hdW = hdN(hdP * 0.45 + 5.0), hdUm = smoothstep(0.52, 0.72, hdW * 0.6 + hdM * 0.4) * (1.0 - hdCalc), hdPoca = smoothstep(0.70, 0.76, hdW * 0.75 + hdB * 0.25) * (1.0 - hdCalc);
        // Duas poças fixas de borda irregular na rua da pose rua (espelhadas): elipses em (±18,2; ±6,4) 0,8 × 0,5 e (±12,9; ±4,1) 0,6 × 0,4.
        { vec2 hdP1 = vec2(abs(hdP.x) - 18.2, abs(hdP.y) - 6.4) / vec2(0.8, 0.5), hdP2 = vec2(abs(hdP.x) - 12.9, abs(hdP.y) - 4.1) / vec2(0.6, 0.4);
          float hdPr = min(length(hdP1), length(hdP2)) + (hdN(hdP * 3.0 + 2.0) - 0.5) * 0.5;
          hdPoca = max(hdPoca, (1.0 - smoothstep(0.85, 1.0, hdPr)) * (1.0 - hdCalc)); hdUm = max(hdUm, (1.0 - smoothstep(1.0, 1.5, hdPr)) * (1.0 - hdCalc)); }
        hdC = hdUmido(hdC, 0.35 * hdUm) * (1.0 - 0.18 * hdUm);
        hdC = mix(hdC, vec3(0.040, 0.048, 0.044), hdPoca * 0.9);` : 'float hdUm = 0.0, hdPoca = 0.0;'}
        float hdGr = 1.0 + smoothstep(0.5, 0.12, hdFw * 34.0) * (hdN(hdP * 34.0) - 0.5) * 0.11 + smoothstep(0.5, 0.12, hdFw * 87.0) * (hdN(hdP * 87.0) - 0.5) * 0.065;
        diffuseColor.rgb = hdC * hdGr * mix(0.92, 1.08, hdB);
        hdRug = max(mix(mix(hdRug, max(hdRug, 0.72), hdAsf), 0.45, max(hdUm * 0.3, max(hdCan * 0.4, hdSarj * 0.35))), 0.45); hdRug = mix(hdRug, 0.15, hdPoca); hdRel = 1.0 - 0.4 * hdAsf - 0.8 * hdPoca - 0.5 * hdJunta - 0.3 * hdCalc; }`)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = roughness * hdRug;')
      .replace('#include <normal_fragment_maps>', NORMAL_REL); };
  m.customProgramCacheKey = () => `corrego-hd-chao14-${poca ? 1 : 0}-${campo ? 1 : 0}`;
}
// Campo de distância às fachadas que o chão lê (hdFachadas): colisores de casa (base ≤ 1,1 m, topo ≥ 2,2 m, lado ≥ 1,2 m, entre
// o passeio da beira e o muro externo — o corpo de cada casa, sobrado e barraco de passagem; não os pilares, postes, muro e
// entulho), 8 px/m sobre 48 × 80 m: R = distância (0–4 m, 1,6 cm por passo), GB = normal da fachada mais perta (as juntas da
// calçada correm ao longo dela). Mesma rotação de colRot/mundoDe (a = cos, b = sin). ~1 MB, sem disco, disposto em desliga().
function campoFachadas(cols) {
  const PX = 8, W = 48 * PX, H = 80 * PX, d = new Uint8Array(W * H * 4);
  for (let i = 0; i < W * H; i++) { d[i * 4] = 255; d[i * 4 + 1] = 128; d[i * 4 + 2] = 128; d[i * 4 + 3] = 255; }
  let n = 0;
  for (const c of cols || []) {
    if (!(c.minY <= 1.1 && c.maxY >= 2.2)) continue;
    const cx = c.cx ?? (c.minX + c.maxX) / 2, cz = c.cz ?? (c.minZ + c.maxZ) / 2, hx = c.hx ?? (c.maxX - c.minX) / 2, hz = c.hz ?? (c.maxZ - c.minZ) / 2, cs = c.cos ?? 1, sn = c.sin ?? 0;
    if (Math.max(hx, hz) < .6 || Math.min(hx, hz) < .07 || Math.abs(cx) < 6 || Math.abs(cx) > 23.5 || Math.abs(cz) > 39.5) continue;
    n++;
    const i0 = Math.max(0, Math.floor((c.minX + 20) * PX)), i1 = Math.min(W - 1, Math.ceil((c.maxX + 28) * PX));
    const j0 = Math.max(0, Math.floor((c.minZ + 36) * PX)), j1 = Math.min(H - 1, Math.ceil((c.maxZ + 44) * PX));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const wx = (i + .5) / PX - 24 - cx, wz = (j + .5) / PX - 40 - cz, lx = wx * cs - wz * sn, lz = wx * sn + wz * cs;
      const qx = Math.max(Math.abs(lx) - hx, 0), qz = Math.max(Math.abs(lz) - hz, 0), dist = Math.hypot(qx, qz);
      const b = Math.min(255, Math.round(dist * 63.75)), k = (j * W + i) * 4;
      if (b >= d[k]) continue;
      let nx = qx * Math.sign(lx), nz = qz * Math.sign(lz);
      if (dist < 1e-6) { if (hx - Math.abs(lx) < hz - Math.abs(lz)) { nx = Math.sign(lx) || 1; nz = 0; } else { nx = 0; nz = Math.sign(lz) || 1; } }
      const L = Math.hypot(nx, nz); nx /= L; nz /= L;
      d[k] = b; d[k + 1] = Math.round(128 + 127 * (nx * cs + nz * sn)); d[k + 2] = Math.round(128 + 127 * (nz * cs - nx * sn));
    }
  }
  if (!n) return null;
  const t = new THREE.DataTexture(d, W, H, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.minFilter = t.magFilter = THREE.LinearFilter; t.generateMipmaps = false; t.name = 'hd-fachadas'; t.needsUpdate = true;
  return t;
}

// Concreto: fôrma (paredes, pilares das casas, postes, geladeira do canal) ou piso (canal). Mancha macro/média, grão,
// escorrido e pé sujo; o canal ganha linha d'água (limo até 45 cm acima da lâmina de −1,61 m, crosta clara, submerso escuro)
// e beiço sujo na aresta da margem; 'entulho' (manilha, caco, saco) ganha só a linha d'água e o pé sujo, esteja onde estiver.
const CANAL = `float hdYa = hdY + 1.61;
  float hdLimo = (1.0 - smoothstep(0.22, 0.38, hdYa)) * smoothstep(-0.4, -0.1, hdYa) * (0.75 + 0.25 * hdN(vec2(hdQ.x * 2.1, hdYa * 4.0))) * (1.0 - hdPiso);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.11, 0.13, 0.07) * (0.7 + 0.6 * hdMedio), hdLimo * 0.88);
  float hdCrosta = smoothstep(0.42, 0.5, hdYa) * (1.0 - smoothstep(0.55, 0.72, hdYa)) * smoothstep(0.35, 0.6, hdN(vec2(hdQ.x * 0.9, 2.0))) * (1.0 - hdPiso);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.62, 0.60, 0.52), hdCrosta * 0.5);
  float hdNivel = smoothstep(0.15, 0.19, hdYa) * (1.0 - smoothstep(0.25, 0.31, hdYa)) * (1.0 - hdPiso) * (0.8 + 0.2 * hdN(vec2(hdQ.x * 1.4, 3.0)));
  diffuseColor.rgb = hdUmido(diffuseColor.rgb, 0.7 * hdNivel) * (1.0 - 0.55 * hdNivel);
  float hdSub = 1.0 - smoothstep(-0.15, 0.0, hdYa); diffuseColor.rgb *= 1.0 - 0.45 * hdSub; hdRug = mix(hdRug, 0.5, hdSub);
  float hdBeico = max(smoothstep(-0.35, -0.02, hdY) * (1.0 - hdPiso), hdPiso * step(-0.05, hdY) * (1.0 - smoothstep(3.1, 3.9, abs(vHdPos.x))) * (0.6 + 0.4 * hdN(vHdPos.xz * 0.8)));
  diffuseColor.rgb = hdUmido(diffuseColor.rgb, 0.45 * hdBeico) * (1.0 - 0.26 * hdBeico);
  float hdMancha = hdPiso * smoothstep(0.55, 0.75, hdN(vHdPos.xz * 0.35 + 9.0)); diffuseColor.rgb = hdUmido(diffuseColor.rgb, 0.4 * hdMancha) * (1.0 - 0.2 * hdMancha); hdRug = mix(hdRug, 0.35, hdMancha * 0.5);
  // Topo do muro do canal: fosco (o alfa do piso_cor_rug dava brilho ao sol = linha branca de 1 px a 20 m) e AO de 8 cm na aresta.
  float hdTopo = hdPiso * step(-0.05, hdY); hdRug = mix(hdRug, max(hdRug, 0.88), hdTopo);
  diffuseColor.rgb *= 1.0 - 0.3 * hdTopo * (1.0 - smoothstep(3.0, 3.1, abs(vHdPos.x)));`;
const FUNDO = `float hdSub = 1.0 - smoothstep(-1.66, -1.55, hdY); diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.55, 0.52, 0.40), hdSub) * (1.0 - 0.25 * hdSub); hdRug = mix(hdRug, 0.45, hdSub);
  float hdLodo = smoothstep(0.5, 0.7, hdN(vHdPos.xz * 0.4 + 2.0)); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.10, 0.11, 0.07), hdLodo * 0.6 * hdSub);`;
const PE = `float hdSuj = smoothstep(0.55, 0.04, hdY) * (1.0 - hdCorpoF(hdY)) * (0.5 + 0.5 * hdN(hdQ * 1.3)) * (1.0 - hdPiso);
  diffuseColor.rgb = hdUmido(diffuseColor.rgb, 0.7 * hdSuj) * (1.0 - 0.35 * hdSuj);`;
// Rodapé pintado de 40 cm, borda dura, cinza-escuro frio (embasamento e pilares das casas; só acima do nível da rua: a mureta da
// rampa do canal fica em y < 0 e não entra). Faz a base da parede ler como acabamento, não como mancha de borda macia.
const RODAPE = `float hdRodP = step(-0.02, hdY) * (1.0 - smoothstep(0.40, 0.41 + fwidth(hdY) * 1.5, hdY)) * (1.0 - hdPiso);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.075, 0.078, 0.080) * (0.85 + 0.3 * hdN(hdQ * 6.0)) * hdGrao(hdQ), 0.85 * hdRodP); hdRug = mix(hdRug, 0.8, hdRodP);`;
// Linha d'água de peça solta no leito (lâmina em −1,61 m): submerso escuro, limo até 40 cm acima, pé sujo quando está na rua.
const LINHA = `float hdYa = hdY + 1.61, hdSub = 1.0 - smoothstep(-0.12, 0.02, hdYa);
  float hdLimo = (1.0 - smoothstep(0.02, 0.4, hdYa)) * smoothstep(-0.25, -0.05, hdYa) * (0.6 + 0.4 * hdN(hdQ * 3.0));
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.12, 0.14, 0.08) * (0.7 + 0.6 * hdMedio), hdLimo * 0.75);
  diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.5, 0.5, 0.42), hdSub); hdRug = mix(hdRug, 0.45, hdSub);
  float hdSuj = smoothstep(0.55, 0.04, hdY) * step(-0.3, hdY) * (0.5 + 0.5 * hdN(hdQ * 1.3)) * (1.0 - hdPiso);
  diffuseColor.rgb = hdUmido(diffuseColor.rgb, 0.6 * hdSuj) * (1.0 - 0.3 * hdSuj);`;
// Topo/fundo horizontal do concreto de fôrma (piso da laje do sobrado, faixas): a fôrma tem veio de tábua e lia como deck.
// Vira cimento queimado cinza-frio (0,218/0,240/0,260: o sol 0xffc888 aquece o neutro em +30 de R−B) com junta de desempenadeira
// a 1,2 m, ~1 placa em 14 remendada e mancha de umidade (`umi` = fator GLSL: o tabuleiro só a aceita no plano horizontal —
// na rampa os borrões de 2–3 m liam como pelagem); o relevo da fôrma cai a 30 % no plano (as veias liam como tábua).
const laje = (umi = '1.0', cru = false) => `{ vec2 hdG = vHdPos.xz / 1.2, hdFr = fract(hdG), hdPx = fwidth(hdG), hdDj = min(hdFr, 1.0 - hdFr) * 1.2; float hdPxM = max(hdPx.x, hdPx.y);
  float hdJunta = (1.0 - smoothstep(0.004, 0.010 + hdPxM * 1.8, min(hdDj.x, hdDj.y))) * smoothstep(0.25, 0.08, hdPxM);
  float hdRem = step(0.93, hdH(floor(hdG)));
  vec3 hdQue = vec3(0.218, 0.240, 0.260) * mix(0.92, 1.06, hdH(floor(hdG) + 5.0)) * (0.90 + 0.2 * hdN(vHdPos.xz * 0.7 + 3.0)) * (0.95 + 0.1 * hdMedio) * hdGrao(vHdPos.xz);
  hdQue = mix(hdQue, vec3(0.25, 0.27, 0.29) * (0.9 + 0.2 * hdN(vHdPos.xz * 2.7)), hdRem) * (1.0 - 0.35 * hdJunta);
  ${cru ? `// Tabuleiro: concreto cru (40 % da fôrma projetada, relevo a 55 %), não cimento queimado liso — lia como cartão bege chapado.
  hdQue = mix(hdQue, diffuseColor.rgb * 2.4 * vec3(0.96, 1.0, 1.04), 0.4);` : ''}
  float hdUmi = smoothstep(0.6, 0.85, hdN(vHdPos.xz * 0.55 + 11.0)) * (0.6 + 0.4 * hdN(vHdPos.xz * 3.1)) * ${umi};
  hdQue = hdUmido(hdQue, 0.5 * hdUmi) * (1.0 - 0.22 * hdUmi);
  diffuseColor.rgb = mix(diffuseColor.rgb, hdQue, hdPiso); hdRug = mix(hdRug, mix(0.72, 0.5, hdUmi), hdPiso); hdRel = mix(hdRel, ${cru ? '0.55' : '0.3'}, hdPiso); }`;
// Tabuleiro da travessia (x −5…5, z −11 ± 1,25): 2 juntas de dilatação em x = ±1,7, ferrugem escorrendo da base de cada montante
// (x = 1,4k − 0,7 nas duas bordas) para o meio, e poça seca (anel escuro, miolo claro). Só no plano horizontal de cima.
// Rampas da travessia (plano inclinado, 0,7 < n.y < 0,95, z −11 ± 1,3): ranhuras antiderrapantes transversais de 2–3 cm a cada
// 30 cm ao longo de |x| (decal escuro, some por fwidth). A rampa lisa a 30° lia como escorregador (`rua`); os degraus do pé são da cenografia.
const RANHURA = `{ float hdRp = step(0.7, hdGn.y) * (1.0 - step(0.95, hdGn.y)) * step(abs(vHdPos.z + 11.0), 1.3), hdAxr = abs(vHdPos.x), hdFwr = fwidth(hdAxr);
  float hdRan = (1.0 - smoothstep(0.010, 0.016 + hdFwr * 1.5, abs(fract(hdAxr / 0.30) - 0.5) * 0.30)) * hdRp * smoothstep(0.08, 0.03, hdFwr);
  diffuseColor.rgb *= 1.0 - 0.4 * hdRan; hdRug = mix(hdRug, 0.95, hdRan); }`;
const TABULEIRO = `{ float hdPl = step(0.95, hdGn.y) * step(abs(vHdPos.z + 11.0), 1.3) * step(abs(vHdPos.x), 5.1);
  float hdDil = (1.0 - smoothstep(0.012, 0.02 + fwidth(vHdPos.x) * 1.5, abs(abs(vHdPos.x) - 1.7))) * hdPl;
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.05, 0.05, 0.05), 0.85 * hdDil); hdRug = mix(hdRug, 0.95, hdDil);
  float hdPu = fract((vHdPos.x + 0.7) / 1.4) * 1.4, hdDx = min(abs(hdPu - 0.03), 1.4 - abs(hdPu - 0.03)), hdDz = 1.25 - abs(vHdPos.z + 11.0);
  float hdFerT = (smoothstep(0.24, 0.05, length(vec2(hdDx, max(hdDz, 0.0)))) * 0.7 + smoothstep(0.10, 0.02, hdDx + (hdN(vec2(vHdPos.x * 9.0, vHdPos.z * 3.0)) - 0.5) * 0.08) * (1.0 - smoothstep(0.1, 0.8, hdDz)) * 0.55) * hdPl;
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.30, 0.13, 0.05) * (0.8 + 0.4 * hdN(vHdPos.xz * 15.0)), min(1.0, hdFerT) * 0.8);
  float hdPn = hdN(vHdPos.xz * 0.5 + 21.0), hdAnel = smoothstep(0.50, 0.55, hdPn) * (1.0 - smoothstep(0.58, 0.63, hdPn)) * hdPl, hdMiolo = smoothstep(0.58, 0.66, hdPn) * hdPl;
  diffuseColor.rgb *= (1.0 - 0.32 * hdAnel) * (1.0 + 0.06 * hdMiolo); hdRug = mix(hdRug, 0.6, hdMiolo * 0.5); }`;
// AO por vértice do lote (vao.js) entra atenuado (k = peso do AO, número ou expressão GLSL): pilar e faixa de laje em sombra
// viravam marrom-preto com o AO cheio.
const aoMeio = (k) => `#if defined( USE_COLOR_ALPHA ) || defined( USE_COLOR )
  diffuseColor.rgb *= mix(vec3(1.0), vColor.rgb, ${typeof k === 'number' ? k.toFixed(2) : k});
#endif`;
// Pilar de concreto (matPilar das casas/palafita, `juntas`): junta de fôrma a cada 60 cm (albedo + normal inclinada: aresta
// clara/escura ao sol), escorrido de ferrugem só acima de 2,1 m e mofo verde-escuro de 0 a 0,4 m. Antes lia chapado (`parede`).
const JUNTAS = `{ float hdJf = fract(hdY / 0.6), hdJd = min(hdJf, 1.0 - hdJf) * 0.6, hdJw = fwidth(hdY);
  float hdJl = (1.0 - smoothstep(0.006, 0.014 + hdJw * 1.5, hdJd)) * smoothstep(0.09, 0.02, hdJw) * (1.0 - hdPiso);
  hdJn = (step(hdJf, 0.5) * 2.0 - 1.0) * hdJl * 0.7; diffuseColor.rgb *= 1.0 - 0.3 * hdJl;
  float hdFerJ = smoothstep(2.1, 2.6, hdY) * smoothstep(0.55, 0.8, hdN(vec2(hdQ.x * 11.0, hdY * 0.5))) * (0.5 + 0.5 * hdN(hdQ * 4.0)) * (1.0 - hdPiso);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.24, 0.11, 0.05) * (0.7 + 0.6 * hdN(hdQ * 17.0)), 0.5 * hdFerJ);
  float hdMofoJ = (1.0 - smoothstep(0.1, 0.4, hdY + (hdN(vec2(hdQ.x * 3.0, 1.0)) - 0.5) * 0.12)) * step(-0.2, hdY) * (0.6 + 0.4 * hdN(hdQ * 6.0)) * (1.0 - hdPiso);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.07, 0.085, 0.06) * (0.7 + 0.6 * hdN(hdQ * 11.0)), 0.7 * hdMofoJ); hdRug += 0.1 * hdMofoJ + 0.15 * hdFerJ; }`;
// r.ganho multiplica o albedo da fôrma (média linear 0,14 × cor): o pilar das casas precisa de ≈ 0,25 para não ler preto à sombra.
function concretoHD(m, r) {
  const piso = r.concreto === 'piso', canal = r.concreto === 'canal', entulho = r.concreto === 'entulho', tabuleiro = r.concreto === 'tabuleiro', parede = !piso && !canal && !entulho;
  const ao = r.ao ?? 0.55, ganho = r.ganho ?? 1;
  // Tabuleiro da travessia: topo (hdGn.y > 0,7, nunca o fundo) em cimento queimado; manta asfáltica preta só no plano horizontal
  // (> 0,95: a rampa a 0,84 fica fora) em placas de 1,2 m de borda nítida; AO de 10 cm na aresta longitudinal (z −11 ± 1,25).
  // Face inferior vista de baixo (hdGn.y < −0,5, a normal geométrica aponta para a câmera): albedo × 2, AO de vértice 0,1, sem
  // escorrido e um rebatimento falso (emissivo 10 % do albedo): só o hemisfério de chão chega lá e com ×1,6 ainda lia preta.
  const MANTA = `{ vec2 hdMc = floor(vHdPos.xz / 1.2); float hdPlano = step(0.95, hdGn.y), hdFaixa = abs(vHdPos.z + 11.0);
    float hdManta = 0.0; // manta asfáltica desligada: sob o sol quente lia como placas de terra em xadrez (r17/r18); fica só o cimento queimado com juntas.
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.070, 0.069, 0.070) * (0.85 + 0.3 * hdN(vHdPos.xz * 6.0)), hdManta); hdRug = mix(hdRug, 0.6, hdManta); hdRel = mix(hdRel, 0.2, hdManta);
    diffuseColor.rgb *= 1.0 - 0.14 * hdPlano * smoothstep(1.05, 1.22, hdFaixa) * step(hdFaixa, 1.3);
    hdBaixo = step(hdGn.y, -0.5); diffuseColor.rgb *= 1.0 + 1.0 * hdBaixo; }`;
  m.map = tex(piso || canal ? 'piso_cor_rug' : 'forma_color'); m.normalMap = tex(piso || canal ? 'piso_normal' : 'forma_normal', false); m.roughnessMap = null; m.roughness = 1; m.normalScale.set(1.3, 1.3);
  m.onBeforeCompile = (s) => { mundo(s, piso || canal ? 1.9 : 1.8, false, r.forma || r.escada ? R26_GLSL : '');
    s.fragmentShader = s.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
      float hdRug = ${piso || canal ? 'sampledDiffuseColor.a' : '0.92'}, hdRel = 1.0, hdBaixo = 0.0, hdJn = 0.0; diffuseColor.a = 1.0;${r.forma || r.escada ? '\n      vec2 hdRelB = vec2(0.0); vec3 hdTanB = vec3(1.0, 0.0, 0.0), hdNw = vec3(0.0, 1.0, 0.0); float hdNwK = 0.0;' : ''}
      { float hdY = vHdPos.y; vec3 hdGn = normalize(cross(dFdx(vHdPos), dFdy(vHdPos))); float hdPiso = step(0.7, ${tabuleiro ? 'hdGn.y' : 'abs(hdGn.y)'});
        vec2 hdQ = ${tabuleiro ? 'abs(hdGn.y) > 0.7 ? vHdPos.xz : vec2(vHdPos.x + vHdPos.z, hdY)' : 'vec2(vHdPos.x + vHdPos.z, hdY)'};
        ${parede ? `diffuseColor.rgb = mix(vec3(dot(diffuseColor.rgb, ${LUMA})), diffuseColor.rgb, 0.5) * ${ganho.toFixed(2)};` : ''}
        float hdMacro = hdN(hdQ * 0.55) * 0.6 + hdN(hdQ * 1.9) * 0.4, hdMedio = hdN(hdQ * 5.5) * 0.55 + hdN(hdQ * 13.0) * 0.45, hdCorpo = hdCorpoF(hdY);
        diffuseColor.rgb *= ${tabuleiro ? 'mix(0.92, 1.08, hdMacro)' : 'mix(mix(0.80, 1.10, hdMacro), mix(0.94, 1.04, hdMacro), hdCorpo)'} * mix(0.92, 1.06, hdMedio) * hdGrao(hdQ);
        ${parede ? laje(tabuleiro ? 'step(0.95, hdGn.y)' : '1.0', tabuleiro) : ''}${tabuleiro ? MANTA + TABULEIRO + (r.escada ? '' : RANHURA) : ''}
        float hdEsc = smoothstep(0.64, 0.84, hdN(vec2(hdQ.x * 1.1 + hdN(hdQ * 0.31) * 2.0, hdY * 0.18))) * (1.0 - hdPiso) * (1.0 - hdBaixo) * ${canal ? 'smoothstep(-1.5, -0.15, hdY)' : 'smoothstep(1.9, 3.0, hdY)'};
        diffuseColor.rgb = hdUmido(diffuseColor.rgb, 0.5 * hdEsc) * (1.0 - 0.28 * hdEsc);
        ${canal ? CANAL : piso ? FUNDO : entulho ? LINHA : PE}${r.rodape ? RODAPE : ''}${r.juntas ? (r.forma ? FORMA_R26 : JUNTAS) : ''}${r.escada ? ESCADA_R26 : ''}${r.vala ? VALA_R26 : ''} }`)
      .replace('#include <color_fragment>', parede ? aoMeio(tabuleiro ? `mix(${ao.toFixed(2)}, 0.10, hdBaixo)` : ao) : '#include <color_fragment>')
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = roughness * hdRug;')
      .replace('#include <normal_fragment_maps>', NORMAL_REL + (r.juntas ? '\nnormal = normalize(normal + vec3(0.0, hdJn, 0.0));' : '') + (r.forma ? R26_NORMAL : '')
        + (r.escada ? '\nif (hdNwK > 0.0) normal = normalize(mix(normal, mat3(viewMatrix) * hdNw, hdNwK));' : ''));
    if (tabuleiro) s.fragmentShader = s.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * 0.10 * hdBaixo;'); };
  m.customProgramCacheKey = () => `corrego-hd-concreto14-${r.concreto}-${ao}-${ganho}-${r.rodape ? 1 : 0}-${r.juntas ? 1 : 0}${r.forma ? '-f1' : ''}${r.escada ? '-e1' : ''}${r.vala ? '-v1' : ''}`;
}
// Peça sem mapa que fica no leito (tambor): ferrugem em mancha, faixa de ferrugem laranja-escura de 10 cm logo acima da lâmina
// (−1,61 m), limo verde-escuro no submerso e limo claro até 35 cm acima. Metalness vai a zero: com 0,35 o reflexo do céu lavava a faixa.
function linhaDaguaHD(m) {
  m.metalness = 0;
  m.onBeforeCompile = (s) => { mundo(s);
    s.fragmentShader = s.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      { float hdYa = vHdPos.y + 1.61, hdSub = 1.0 - smoothstep(-0.12, 0.02, hdYa), hdLimo = (1.0 - smoothstep(0.12, 0.35, hdYa)) * smoothstep(-0.2, -0.05, hdYa);
        float hdFaixa = smoothstep(-0.01, 0.01, hdYa) * (1.0 - smoothstep(0.09, 0.11, hdYa));
        vec2 hdQ = vec2(vHdPos.x + vHdPos.z, vHdPos.y); float hdFer = smoothstep(0.55, 0.8, hdN(hdQ * 4.0)) * (0.5 + 0.5 * hdN(hdQ * 13.0));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.20, 0.11, 0.06), 0.5 * hdFer) * mix(0.85, 1.1, hdN(hdQ * 1.7));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.11, 0.13, 0.08), hdLimo * 0.7);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.04, 0.07, 0.03), 0.75 * hdSub) * (1.0 - 0.35 * hdSub);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.30, 0.12, 0.05) * (0.8 + 0.4 * hdN(hdQ * 9.0)), 0.85 * hdFaixa); }`); };
  m.customProgramCacheKey = () => 'corrego-hd-linha3';
}
// Geladeira do canal (1,5 × 1,8 em x ±5,9 / z ±10) e caixa de energia do poste (matEletro, cor pura): leitura de função por face —
// FRENTE (voltada para as casas, +|x|): duas portas (freezer 1,22–1,74, porta 0,06–1,18) com borracha escura de 2,5 cm contornando
// cada uma, puxador vertical escuro de 4,5 cm em u = 0,55 e plaqueta; TRÁS (para o canal): serpentina do condensador (painel escuro
// 0,45–1,65 com tubos verticais a cada 3 cm) e nicho do compressor no pé; LADOS: friso fraco a 1,22 e amassado. Ferrugem no pé
// (0–0,3 m), nas borrachas e no condensador. Sem mapa, metalness 0 e sem AO de vértice. Antes lia como caixa metálica cinza chapada.
function geladeiraHD(m) {
  m.metalness = 0; m.vertexColors = false;
  m.onBeforeCompile = (s) => { mundo(s);
    s.fragmentShader = s.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      float hdRug = 1.0;
      { float hdY = vHdPos.y; vec2 hdQ = vec2(vHdPos.x + vHdPos.z, hdY); float hdFw = fwidth(hdY);
        vec3 hdGs = normalize(cross(dFdx(vHdPos), dFdy(vHdPos))), hdGn = abs(hdGs); float hdLado = 1.0 - step(0.7, hdGn.y);
        float hdSx = sign(vHdPos.x), hdFrente = step(0.5, hdGs.x * hdSx) * hdLado, hdTras = step(0.5, -hdGs.x * hdSx) * hdLado, hdLat = step(0.5, hdGn.z) * hdLado;
        float hdZc = vHdPos.z - 10.0 * floor(vHdPos.z / 10.0 + 0.5), hdXc = vHdPos.x - 5.9 * hdSx;
        float hdU = hdGn.x > hdGn.z ? hdZc : hdXc, hdFu = fwidth(hdU);
        float hdPainel = 1.0 + (hdN(hdQ * 0.9 + 4.0) - 0.5) * 0.14 + (hdN(hdQ * 7.0) - 0.5) * 0.06;
        float hdGel = step(abs(hdU), 0.76) * step(hdY, 1.9);
        float hdDiv = abs(hdY - 1.20), hdBorda = max(abs(hdU) - 0.70, max(hdY - 1.74, 0.06 - hdY));
        float hdBorr = hdFrente * hdGel * max(1.0 - smoothstep(0.0, 0.025 + hdFw * 1.5, abs(hdBorda)), 1.0 - smoothstep(0.012, 0.025 + hdFw * 1.5, hdDiv)) * step(hdBorda, 0.03);
        float hdPux = hdFrente * hdGel * (1.0 - smoothstep(0.02, 0.026 + hdFu * 1.5, abs(hdU - 0.55))) * (step(0.35, hdY) * step(hdY, 1.05) + step(1.30, hdY) * step(hdY, 1.66));
        float hdPlaca = hdFrente * hdGel * step(abs(hdU + 0.3), 0.09) * step(abs(hdY - 1.60), 0.02);
        float hdCond = hdTras * hdGel * step(abs(hdU), 0.58) * step(0.45, hdY) * step(hdY, 1.65);
        float hdTubo = hdCond * smoothstep(0.5, 0.15, hdFu / 0.03) * (1.0 - smoothstep(0.006, 0.010, abs(fract(hdU / 0.03) - 0.5) * 0.03));
        float hdNicho = hdTras * hdGel * step(abs(hdU), 0.55) * step(0.06, hdY) * step(hdY, 0.40);
        float hdComp = hdNicho * (1.0 - smoothstep(0.14, 0.17, length(vec2(hdU + 0.2, hdY - 0.22) * vec2(1.0, 1.4))));
        float hdFriso = hdLat * hdGel * (1.0 - smoothstep(0.010, 0.014 + hdFw * 1.5, abs(hdY - 1.22)));
        float hdFer = (1.0 - smoothstep(0.03, 0.32, hdY + (hdN(vec2(hdQ.x * 5.0, 2.0)) - 0.5) * 0.12)) * smoothstep(0.25, 0.6, hdN(hdQ * 6.0)) * hdLado;
        hdFer = max(hdFer, hdBorr * smoothstep(0.5, 0.75, hdN(vec2(hdQ.x * 9.0, 1.0))) * 0.7);
        hdFer = max(hdFer, (1.0 - smoothstep(0.0, 0.08, abs(abs(hdU) - 0.70))) * (1.0 - smoothstep(0.06, 0.5, hdY)) * smoothstep(0.4, 0.7, hdN(vec2(hdQ.x * 7.0, hdY * 3.0))) * hdFrente * hdGel);
        hdFer = max(hdFer, hdCond * smoothstep(0.55, 0.8, hdN(hdQ * 4.0)) * 0.6);
        diffuseColor.rgb *= hdPainel * (1.0 + (hdGrao(hdQ) - 1.0) * 0.5) * (1.0 - 0.6 * hdFriso) * (1.0 - 0.72 * hdBorr);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.09, 0.09, 0.095), 0.9 * hdCond); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.30, 0.30, 0.31), hdTubo);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.035, 0.035, 0.035), 0.92 * hdNicho); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.16, 0.16, 0.15), hdComp);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.06, 0.06, 0.065), 0.85 * max(hdPux, hdPlaca));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.22, 0.10, 0.05) * (0.7 + 0.6 * hdN(hdQ * 15.0)), 0.85 * hdFer);
        hdRug = 1.0 + 0.6 * hdFer + 0.3 * hdBorr + 0.4 * hdCond - 0.3 * hdPux; }`)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = min(1.0, roughness * hdRug);'); };
  m.customProgramCacheKey = () => 'corrego-hd-geladeira3';
}
// Placas de espuma autorais na lâmina (−1,61): a parte abaixo da água escurece e esverdeia (afundaEspuma desce as caixas 60 %).
function espumaHD(m) {
  m.onBeforeCompile = (s) => { mundo(s);
    s.fragmentShader = s.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      { float hdSubE = 1.0 - smoothstep(-1.614, -1.606, vHdPos.y); vec2 hdQ = vHdPos.xz;
        diffuseColor.rgb *= (0.9 + 0.2 * hdN(hdQ * 9.0)) * (1.0 + (hdGrao(hdQ) - 1.0) * 0.5);
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.45, 0.50, 0.40), hdSubE); }`); };
  m.customProgramCacheKey = () => 'corrego-hd-espuma1';
}
// Faixa de limo autoral na linha d'água (x ±2,94, y −1,96…−1,46): submerso escuro, limo verde-escuro com crosta clara no limite.
function limoHD(m) {
  m.map = null; m.metalness = 0;
  m.onBeforeCompile = (s) => { mundo(s);
    s.fragmentShader = s.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      float hdRug = 1.0;
      { float hdYa = vHdPos.y + 1.61; vec2 hdQ = vec2(vHdPos.z, vHdPos.y);
        float hdSubL = 1.0 - smoothstep(-0.05, 0.02, hdYa);
        float hdLimo = 1.0 - smoothstep(0.26, 0.48, hdYa + (hdN(vec2(hdQ.x * 1.3, 1.0)) - 0.5) * 0.16);
        vec3 hdVerde = vec3(0.06, 0.09, 0.045) * (0.6 + 0.8 * hdN(hdQ * vec2(2.0, 9.0)));
        vec3 hdCrosta = vec3(0.30, 0.29, 0.24) * (0.8 + 0.4 * hdN(hdQ * vec2(3.0, 11.0)));
        diffuseColor.rgb = mix(hdCrosta, hdVerde, hdLimo) * (1.0 - 0.5 * hdSubL) * hdGrao(hdQ);
        hdRug = mix(1.25, 0.8, hdLimo) + 0.4 * hdSubL; }`)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = min(1.0, roughness * hdRug);'); };
  m.customProgramCacheKey = () => 'corrego-hd-limo1';
}
// Saco de lixo (cor pura, dodecaedro autoral): pregas claras radiais que convergem no nó (ângulo em volta do eixo do objeto,
// torcidas por ruído, mais fortes para cima), amassado por ruído de 10–15 cm e grão fino; fosco. A posição é a do OBJETO
// (vHdLoc), não do mundo: o centro do saco é a origem da malha e a direção y é o alto. Sem mapa, sem AO de vértice.
function sacoHD(m) {
  m.metalness = 0; m.vertexColors = false;
  m.onBeforeCompile = (s) => { mundo(s);
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vHdLoc;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvHdLoc = position;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vHdLoc;')
      .replace('#include <color_fragment>', `#include <color_fragment>
      float hdRug = 1.0;
      { vec3 hdL = vHdLoc; float hdLen = max(length(hdL), 1e-3), hdNy = hdL.y / hdLen, hdA = atan(hdL.z, hdL.x), hdV = hdNy * 0.5 + 0.5;
        float hdPr = sin(hdA * 7.0 + (hdN(hdL.xy * 4.0 + 3.0) - 0.5) * 5.0 + hdL.y * 6.0);
        float hdPre = smoothstep(0.55, 0.92, hdPr) * (0.3 + 0.7 * hdV) * (1.0 - smoothstep(0.9, 0.98, hdNy));
        float hdAm = hdN(vHdPos.xz * 7.0 + vHdPos.y * 9.0);
        diffuseColor.rgb *= (0.84 + 0.32 * hdAm) * (1.0 + 0.6 * hdPre) * (1.0 + (hdGrao(vHdPos.xz * 40.0 + vHdPos.y * 20.0) - 1.0) * 0.3);
        hdRug = 1.0 - 0.2 * hdPre; }`)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = min(1.0, roughness * hdRug);'); };
  m.customProgramCacheKey = () => 'corrego-hd-saco1';
}
// Pilar da travessia (matMadeira, cor pura) lido como pilar de concreto: linha de fôrma a cada 1 m, mofo verde-escuro nos 45 cm
// de baixo (fora da faixa do corpo), escorrido de ferrugem da viga só acima de 2,1 m, tom por altura ±5 % e grão. Era tubo
// galvanizado com emenda a 1,5 m: lia como pilar liso (dpBloco 2,2).
function pilarHD(m) {
  m.onBeforeCompile = (s) => { mundo(s);
    s.fragmentShader = s.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      float hdRug = 1.0, hdJn = 0.0;
      { float hdY = vHdPos.y; vec2 hdQ = vec2(vHdPos.x + vHdPos.z, hdY); float hdFw = fwidth(hdY);
        float hdTom = 1.0 + (hdN(vec2(hdQ.x * 1.7, hdY * 1.1)) - 0.5) * 0.10 + (hdN(hdQ * 9.0 + 2.0) - 0.5) * 0.05;
        // Junta de fôrma a cada 60 cm: sulco escuro de 1,5 cm e normal inclinada (aresta clara em cima, sombra embaixo) — a linha
        // de 1 m a 35 % sumia a 3 m (pilares chapados na pose parede).
        float hdJ = fract(hdY / 0.6), hdDj = min(hdJ, 1.0 - hdJ) * 0.6;
        float hdEm = (1.0 - smoothstep(0.006, 0.014 + hdFw * 1.5, hdDj)) * smoothstep(0.09, 0.02, hdFw);
        hdJn = (step(hdJ, 0.5) * 2.0 - 1.0) * hdEm * 0.7;
        float hdMofo = (1.0 - smoothstep(0.10, 0.42, hdY + (hdN(vec2(hdQ.x * 3.0, 1.0)) - 0.5) * 0.12)) * (0.6 + 0.4 * hdN(hdQ * 6.0)) * step(-0.2, hdY);
        float hdFer = smoothstep(2.1, 2.6, hdY) * smoothstep(0.5, 0.75, hdN(vec2(hdQ.x * 11.0, hdY * 0.5))) * (0.5 + 0.5 * hdN(hdQ * 5.0));
        // Linha d'água dos pilares no leito (lâmina −1,61): submerso escuro, limo verde-escuro até 0,6 m acima com crosta clara no
        // limite, e escorrido escuro descendo da viga/laje (> 1,9 m). Antes o pilar chegava limpo à água (poses ponte e alto).
        float hdYa = hdY + 1.61, hdSubP = 1.0 - smoothstep(-0.06, 0.02, hdYa);
        float hdLimoP = (1.0 - smoothstep(0.30, 0.62, hdYa + (hdN(vec2(hdQ.x * 3.0, 5.0)) - 0.5) * 0.14)) * smoothstep(-0.35, -0.02, hdYa) * (0.7 + 0.3 * hdN(hdQ * 7.0));
        float hdCrostaP = smoothstep(0.55, 0.62, hdYa) * (1.0 - smoothstep(0.68, 0.80, hdYa)) * smoothstep(0.35, 0.6, hdN(vec2(hdQ.x * 1.2, 3.0)));
        float hdEscP = smoothstep(0.62, 0.82, hdN(vec2(hdQ.x * 9.0 + hdN(hdQ * 0.5) * 2.0, hdY * 0.25))) * smoothstep(1.9, 3.2, hdY);
        diffuseColor.rgb *= hdTom * (1.0 + (hdGrao(hdQ) - 1.0) * 0.6) * (1.0 - 0.4 * hdEm);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.07, 0.085, 0.06) * (0.7 + 0.6 * hdN(hdQ * 11.0)), 0.85 * hdMofo);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.24, 0.11, 0.05) * (0.7 + 0.6 * hdN(hdQ * 17.0)), 0.65 * hdFer);
        diffuseColor.rgb = hdUmido(diffuseColor.rgb, 0.6 * hdEscP) * (1.0 - 0.3 * hdEscP);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.07, 0.10, 0.05) * (0.7 + 0.6 * hdN(hdQ * 11.0)), 0.9 * hdLimoP);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.62, 0.60, 0.50), 0.45 * hdCrostaP);
        diffuseColor.rgb *= 1.0 - 0.5 * hdSubP;
        hdRug = 1.0 + 0.3 * hdFer + 0.1 * hdMofo + 0.2 * hdLimoP - 0.35 * hdSubP; }`)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = min(1.0, roughness * hdRug);')
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nnormal = normalize(normal + vec3(0.0, hdJn, 0.0));'); };
  m.customProgramCacheKey = () => 'corrego-hd-pilar3';
}
// Guarda-corpo da travessia alta (matGuarda: caixa de 0,9 × 0,1 m no vão e mureta de 0,55 m girada na rampa, sem sombra).
// Vão (|x| ≤ 5): a caixa inteira vira MURETA DE BLOCO cerâmico 39 × 19 com cinta de concreto de 12 cm no topo (a cenografia põe
// a pingadeira). Rampa (só com rampa = true, sem a cenografia `guarda`): GRADE DE FERRO CHATO cinza-chumbo com tinta azul
// descascada e ferrugem no pé — corrimão chato 0,80–0,85, barra inferior 0,10–0,14, barras verticais de 2,5 cm a cada 14 cm e
// montantes a cada 1,4 m (o último em |x| 13,52); nunca abaixo do piso (pisoPass de map_corrego.js). Com a cenografia ligada
// (rampa = false) a mureta da rampa é descartada e hd_cenografia_corrego.js põe a grade de verdade. Nada amarelo: o tubular amarelo
// industrial era a maior âncora de "não-favela" nas quatro poses.
function guardaHD(m, rampa) {
  m.onBeforeCompile = (s) => { mundo(s);
    s.fragmentShader = s.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
      float hdRug = 1.0, hdMetal = 0.0;
      { float hdAx = abs(vHdPos.x), hdPiso = hdAx <= 5.0 ? 5.6 : hdAx <= 13.6 ? 5.6 * (1.0 - (hdAx - 5.0) / 8.6) : 0.0, hdAlt = vHdPos.y - hdPiso;
        ${rampa ? '' : 'if (hdAx > 4.95) discard;'}
        vec2 hdQ = vec2(vHdPos.x, vHdPos.y); vec3 hdGn = abs(normalize(cross(dFdx(vHdPos), dFdy(vHdPos)))); float hdTopoF = step(0.7, hdGn.y);
        // Corte em 4,95 (não 5,05): a cunha da mureta autoral da rampa (começa em |x| 5, girada) entrava na face de tijolo e lia
        // como fiada diagonal; o pilarete de concreto da cenografia (|x| 4,93–5,13) cobre a ponta. Fiada ao longo do eixo de mundo da face.
        if (hdAx <= 4.95) {
          float hdCinta = step(0.78, hdAlt), hdBu = hdGn.x > hdGn.z ? vHdPos.z : vHdPos.x;
          vec2 hdB = vec2(hdBu / 0.40 + 0.5 * floor(hdAlt / 0.20), hdAlt / 0.20), hdBf = abs(fract(hdB) - 0.5);
          float hdJa = smoothstep(0.5, 0.15, fwidth(hdB.y));
          float hdJ = (1.0 - smoothstep(0.006, 0.012, min((0.5 - hdBf.x) * 0.40, (0.5 - hdBf.y) * 0.20))) * hdJa;
          vec3 hdBl = vec3(0.40, 0.15, 0.07) * (0.85 + 0.3 * hdH(floor(hdB))) * (0.9 + 0.2 * hdN(hdQ * 9.0));
          vec3 hdCor = mix(hdBl, vec3(0.42, 0.41, 0.38) * (0.9 + 0.2 * hdN(hdQ * 5.0)), hdJ * 0.9);
          hdCor = mix(hdCor, vec3(0.36, 0.35, 0.32) * (0.9 + 0.2 * hdN(hdQ * 4.0)), max(hdCinta, hdTopoF));
          float hdEscB = smoothstep(0.6, 0.8, hdN(vec2(hdQ.x * 5.0, hdAlt * 0.4))) * (1.0 - hdCinta);
          diffuseColor.rgb = hdCor * (1.0 - 0.25 * hdEscB) * hdGrao(hdQ); hdRug = 0.95;
        } else {
          float hdTopo = step(0.80, hdAlt) * (1.0 - step(0.86, hdAlt)), hdBase = step(0.10, hdAlt) * (1.0 - step(0.16, hdAlt));
          float hdPb = fract((vHdPos.x + 0.10) / 0.20) * 0.20, hdBarra = (1.0 - step(0.04, hdPb)) * step(0.10, hdAlt) * step(hdAlt, 0.86);
          float hdPu = fract((vHdPos.x + 0.7) / 1.4) * 1.4, hdPoste = max(1.0 - step(0.05, hdPu), step(abs(hdAx - 13.52), 0.03)) * step(0.0, hdAlt) * step(hdAx, 13.6);
          if (hdTopo + hdBase + hdBarra + hdPoste < 0.5) discard;
          float hdTinta = smoothstep(0.35, 0.5, hdN(hdQ * vec2(2.2, 4.0) + 2.0) * 0.65 + hdN(hdQ * 11.0) * 0.35);
          vec3 hdChumbo = vec3(0.075, 0.08, 0.09) * (0.85 + 0.3 * hdN(hdQ * vec2(5.0, 9.0)));
          vec3 hdAzul = vec3(0.07, 0.15, 0.26) * (0.85 + 0.3 * hdN(hdQ * 13.0));
          diffuseColor.rgb = mix(hdChumbo, hdAzul, 0.8 * hdTinta);
          float hdFerr = min(1.0, smoothstep(0.22, 0.02, hdAlt) * 0.85 + smoothstep(0.62, 0.8, hdN(hdQ * vec2(3.0, 11.0) + 5.0)) * 0.5);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.20, 0.09, 0.04), hdFerr);
          hdMetal = (1.0 - 0.8 * hdTinta) * (1.0 - 0.7 * hdFerr); hdRug = mix(0.55, 0.8, hdTinta) + 0.25 * hdFerr;
        } }`)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = min(1.0, roughness * hdRug * 2.0);')
      .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = min(1.0, metalness * 5.0 * hdMetal);'); };
  m.customProgramCacheKey = () => `corrego-hd-guarda3-${rampa ? 1 : 0}`;
}

// Chapa ondulada (worn_corrugated_iron, 13 ondas/m = 7,6 cm): a onda desce o caimento lido da normal; no telhado folhas
// de 1,0 × 2,2 m com sombra de sobreposição e tom por folha (legível de longe, onde a onda some no mip); na parede painel
// por ruído. Ferrugem só em mancha. Na parede, dentro da faixa do corpo (hdCorpoF), o mapa vai à sua média local (mip +5, grão
// ±7 %), sem ferrugem e com painel a 30 %: a mancha preta do worn_corrugated_iron tinha tamanho de torso na casinha (`alto`).
// Telhado: FIBROCIMENTO cinza-claro (luma neutra-fria × 1,45 a 85 %, metal 0, ferrugem à metade) com a onda desenhada no albedo
// (13/m, some por fwidth) — o marrom liso de longe era o mapa + metal 0,35 + 60 % de neutralização. `U.cerA/cerB` (6 caixas
// orientadas, preenchidas pela cenografia: 1 telhado em 4 + a palafita do centro da pose `alto`) viram TELHA CERÂMICA: fiada de
// 38 cm com sombra de sobreposição, onda de 20 cm, telha velha escura e musgo no caimento (grão some por fwidth, sem cintilar).
function chapaHD(m, r, U) {
  m.map = tex('chapa_color'); m.normalMap = tex('chapa_normal', false); m.roughnessMap = null; m.roughness = .66; m.metalness = .35; m.normalScale.set(.6, .6);
  m.onBeforeCompile = (s) => { mundo(s, 1.0, 'caimento');
    s.uniforms.hdCerA = U.cerA; s.uniforms.hdCerB = U.cerB;
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec4 hdCerA[6]; uniform vec4 hdCerB[6];')
      .replace('#include <map_fragment>', `#include <map_fragment>
      float hdMetal = 1.0, hdRug = 1.0, hdRel = 1.0, hdTelha = 0.0; diffuseColor.a = 1.0;
      { vec2 hdQ = vec2(vHdPos.x + vHdPos.z, vHdPos.y);
        vec3 hdGn = normalize(cross(dFdx(vHdPos), dFdy(vHdPos))); hdTelha = smoothstep(0.35, 0.6, abs(hdGn.y)); float hdCorpoC = hdCorpoF(vHdPos.y) * (1.0 - hdTelha);
        { vec3 hdMedC = diffuse * texture2D(map, vMapUv, 5.0).rgb; diffuseColor.rgb = mix(diffuseColor.rgb, hdMedC * clamp(diffuseColor.rgb / max(hdMedC, vec3(1e-4)), 0.93, 1.07), hdCorpoC); }
        float hdPainel = hdN(vHdPos.xz * 0.35 + vec2(vHdPos.y * 0.3, 0.0)), hdF2 = hdN(vec2(hdQ.x * 1.3 + 4.1, hdQ.y * 2.2));
        float hdFerr = smoothstep(0.60, 0.82, hdN(hdQ * 0.9 + 2.0) * 0.6 + hdF2 * 0.4) * (1.0 - hdCorpoC) * (1.0 - 0.5 * hdTelha);
        vec2 hdFolha = vec2(vMapUv.x, vMapUv.y / 2.2), hdFr = fract(hdFolha), hdPx = fwidth(hdFolha);
        float hdEmV = 1.0 - smoothstep(0.0, 0.02 + hdPx.y * 2.0, hdFr.y * 2.2), hdEmU = 1.0 - smoothstep(0.0, 0.012 + hdPx.x * 2.0, hdFr.x);
        float hdTom = mix(1.0 + (hdPainel - 0.5) * 0.36 * (1.0 - 0.7 * hdCorpoC), mix(0.88, 1.10, hdH(floor(hdFolha))), hdTelha);
        diffuseColor.rgb *= hdTom * (1.0 - hdTelha * (0.45 * hdEmV + 0.25 * hdEmU));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.22, 0.12, 0.07) * (0.7 + 0.6 * hdF2), ${r.ferrugem.toFixed(2)} * hdFerr);
        // Telhado: fibrocimento cinza-claro (luma × 1.7, AO de vértice a 20 %, relevo a 60 %, rebatimento falso de 12 % no
        // emissivo): as águas viradas contra o sol liam como placas pretas de longe (pose alto, lum 50).
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(dot(diffuseColor.rgb, ${LUMA})) * vec3(0.96, 1.0, 1.05) * 1.7, 0.88 * hdTelha * (1.0 - hdFerr));
        float hdOnda = cos(vMapUv.x * 81.68) * smoothstep(0.5, 0.12, hdPx.x * 13.0);
        diffuseColor.rgb *= 1.0 + 0.12 * hdOnda * hdTelha;
        hdMetal = (1.0 - 0.8 * hdFerr) * (1.0 - hdTelha); hdRug = 1.0 + 0.3 * hdFerr + 0.35 * hdTelha; hdRel = mix(1.0, 0.6, hdTelha);
        float hdCer = 0.0;
        for (int i = 0; i < 6; i++) { vec4 hA = hdCerA[i], hB = hdCerB[i]; vec2 hdDc = vHdPos.xz - hA.xy;
          vec2 hdLc = vec2(hdDc.x * hA.z - hdDc.y * hA.w, hdDc.x * hA.w + hdDc.y * hA.z);
          hdCer = max(hdCer, step(abs(hdLc.x), hB.x) * step(abs(hdLc.y), hB.y) * step(0.01, hB.x)); }
        hdCer *= hdTelha;
        if (hdCer > 0.0) {
          vec2 hdT = vec2(vMapUv.x / 0.20, vMapUv.y / 0.38); float hdTa = smoothstep(0.6, 0.15, fwidth(hdT.y));
          float hdRow = fract(hdT.y), hdCol = fract(hdT.x + 0.5 * step(0.5, fract(floor(hdT.y) * 0.5)));
          float hdOndaC = 0.5 + 0.5 * cos(hdCol * 6.2832), hdSombra = 1.0 - smoothstep(0.0, 0.18, hdRow);
          vec3 hdTer = vec3(0.34, 0.16, 0.09) * (0.8 + 0.4 * hdH(floor(hdT)));
          hdTer = mix(hdTer, vec3(0.22, 0.20, 0.16), 0.7 * step(0.86, hdH(floor(hdT) + 7.0)));
          hdTer = mix(hdTer, vec3(0.12, 0.14, 0.08), 0.5 * smoothstep(0.55, 0.75, hdN(vHdPos.xz * 1.1 + 3.0)));
          hdTer *= mix(1.0, (0.78 + 0.32 * hdOndaC) * (1.0 - 0.35 * hdSombra), hdTa);
          diffuseColor.rgb = mix(diffuseColor.rgb, hdTer, hdCer); hdMetal *= 1.0 - hdCer; hdRug = mix(hdRug, 1.3, hdCer); hdRel = mix(hdRel, 0.3, hdCer); } }`)
      .replace('#include <color_fragment>', aoMeio('mix(1.0, 0.2, hdTelha)'))
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = min(1.0, roughness * hdRug);')
      .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = metalness * hdMetal;')
      .replace('#include <normal_fragment_maps>', NORMAL_REL)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * 0.12 * hdTelha;'); };
  m.customProgramCacheKey = () => `corrego-hd-chapa8-${r.ferrugem}`;
}

// Madeira que fica madeira vira tábua cinza desbotada (ponte, guarda, tablado da travessia) ou compensado claro (albedo ≈ 0,4) em
// chapas de 1,10 × 2,20 m com emenda escura, veio fraco (variação do mapa a 55 %) e AO de vértice a 35 % (barraco, tapume do
// puxadinho, vigas): tex_madeira tem média linear 0,17 e com AO cheio o tapume à sombra ficava em p50 64, chapado.
// Compensado projetado no mundo a 1,10 m (a emenda do tile cai na emenda da chapa) com o mapa deslocado por chapa (hash da
// célula): o tile de 2 × 2 por UV repetia a mesma veia e mostrava a costura no meio do tapume (`rua` x ≈ 150). Escorrido e
// sujeira só fora da faixa do corpo; face inferior (viga sob o tabuleiro) clareia como o tabuleiro.
function madeiraHD(m, r, texR26) {
  const tabua = r.colcha ? pbrTex('hd_corrego/tabua_cor_rug', true) : null; if (tabua) texR26.push(tabua);
  const comp = r.madeira === 'compensado';
  m.roughness = .9; m.metalness = 0;
  m.onBeforeCompile = (s) => { mundo(s, comp ? 1.1 : 0, false, r.colcha ? R26_GLSL : '');
    if (tabua) { s.uniforms.hdTabua = { value: tabua }; s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D hdTabua;'); }
    s.fragmentShader = s.fragmentShader.replace('#include <map_fragment>', `${comp ? `#ifdef USE_MAP
      vec2 hdDeslM = vec2(0.0);
      { vec3 hdGd = abs(normalize(cross(dFdx(vHdPos), dFdy(vHdPos)))); vec2 hdSd = hdGd.y > 0.7 ? vHdPos.xz : (hdGd.x > hdGd.z ? vHdPos.zy : vHdPos.xy);
        vec2 hdCd = floor(hdSd / vec2(1.10, 2.20)); hdDeslM = vec2(hdH(hdCd), hdH(hdCd + 3.0)) * 0.5; }
      vec4 sampledDiffuseColor = texture2D(map, vMapUv + hdDeslM); diffuseColor *= sampledDiffuseColor;
      #endif` : '#include <map_fragment>'}
      float hdBaixoM = 0.0;
      { vec3 hdL = vec3(dot(diffuseColor.rgb, ${LUMA})); ${comp ? 'hdL = mix(vec3(0.17), hdL, 0.55);' : ''} vec2 hdQ = vec2(vHdPos.x + vHdPos.z, vHdPos.y);
        float hdW = hdN(hdQ * 0.8 + 3.0), hdForaM = 1.0 - hdCorpoF(vHdPos.y);
        diffuseColor.rgb = mix(diffuseColor.rgb, hdL * ${comp ? 'vec3(1.96, 1.86, 1.66)' : 'vec3(1.28, 1.32, 1.26)'}, ${comp ? '0.92' : '0.86'}) * mix(${comp ? '0.88, 1.08' : '0.78, 1.12'}, hdW) * hdGrao(hdQ * 0.5);
        ${comp ? `vec3 hdGs = normalize(cross(dFdx(vHdPos), dFdy(vHdPos))), hdGn = abs(hdGs); vec2 hdS = hdGn.y > 0.7 ? vHdPos.xz : (hdGn.x > hdGn.z ? vHdPos.zy : vHdPos.xy);
        vec2 hdG = hdS / vec2(1.10, 2.20), hdFr = abs(fract(hdG) - 0.5), hdPx = fwidth(hdG);
        float hdEm = max(1.0 - smoothstep(0.0, 0.012 + hdPx.x * 1.5, (0.5 - hdFr.x) * 1.10), 1.0 - smoothstep(0.0, 0.012 + hdPx.y * 1.5, (0.5 - hdFr.y) * 2.20));
        diffuseColor.rgb *= mix(0.86, 1.1, hdH(floor(hdG))) * (1.0 - 0.45 * hdEm);
        float hdEsc = smoothstep(0.6, 0.85, hdN(vec2(hdS.x * 2.3, hdS.y * 0.25) + 7.0)) * (1.0 - hdGn.y) * hdForaM;
        hdBaixoM = step(hdGs.y, -0.5); diffuseColor.rgb *= 1.0 + 0.8 * hdBaixoM;` : `float hdSuj = smoothstep(0.5, 0.8, hdN(hdQ * 1.7 + 1.0)) * hdForaM; diffuseColor.rgb *= 1.0 - 0.18 * hdSuj;
        // Tapume da palafita (faces verticais de tex_madeira|ffffff acima de 2 m): compensado claro em chapas de 1,10 × 2,20 com
        // emenda escura — a tábua cinza lia como cubo canelado/contêiner na pose alto. As réguas e cantoneiras são geometria da cenografia.
        vec3 hdGt = abs(normalize(cross(dFdx(vHdPos), dFdy(vHdPos)))); float hdTap = (1.0 - step(0.7, hdGt.y)) * step(2.0, vHdPos.y);
        ${r.colcha ? `float hdRxT, hdMtT, hdTbT; vec3 hdCompT = hdTapumeR26(hdTabua, vec2(hdGt.x > hdGt.z ? vHdPos.z : vHdPos.x, vHdPos.y - 2.6), 0.0, hdRxT, hdMtT, hdTbT) * hdGrao(hdQ) * (1.0 - 0.14 * hdSuj);`
        : `vec2 hdSt = hdGt.x > hdGt.z ? vHdPos.zy : vHdPos.xy, hdGc = hdSt / vec2(1.10, 2.20), hdFc = abs(fract(hdGc) - 0.5), hdPc = fwidth(hdGc);
        float hdEmT = max(1.0 - smoothstep(0.0, 0.012 + hdPc.x * 1.5, (0.5 - hdFc.x) * 1.10), 1.0 - smoothstep(0.0, 0.012 + hdPc.y * 1.5, (0.5 - hdFc.y) * 2.20));
        vec3 hdCompT = hdL * vec3(1.9, 1.76, 1.5) * mix(0.9, 1.08, hdH(floor(hdGc))) * (1.0 - 0.4 * hdEmT) * (1.0 - 0.14 * hdSuj);`}
        diffuseColor.rgb = mix(diffuseColor.rgb, hdCompT, hdTap);`} }`)
      .replace('#include <color_fragment>', comp ? aoMeio('mix(0.35, 0.15, hdBaixoM)') : '#include <color_fragment>');
    if (comp) s.fragmentShader = s.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * 0.08 * hdBaixoM;'); };
  m.customProgramCacheKey = () => `corrego-hd-madeira10-${r.madeira}${r.colcha ? '-c1' : ''}`;
}

// Reboco pintado: textura de reboco real projetada no mundo (1,7 m), relevo por normal, e a idade do Sertão (mancha,
// escorrido acima de 1,9 m, trinca, descascado mostrando tijolo com junta, pé sujo). As oito tintas autorais (map_corrego.js
// CORES_ALVENARIA) ficam na v0; v1/v2 trocam a tinta pela sua luma (lição do Lajes: tinta sobre reboco quente + sol quente + AgX
// neutraliza o matiz; m.color = luma × tom é o `diffuse` que entra no mapa E no corpoLiso, logo é o único lugar onde a tinta fica
// uniforme na faixa do corpo) e o tom pastel entra com croma ×1,8 (S ≈ 0,17 ao sol / 0,25 à sombra na tela), luma mantida.
// Tijolo menos saturado e quase só no pé: um buraco de 10 px no alto da empena lia como mancha magenta.
// corpoLiso 1: a mancha da própria reboco_cor_rug (cabeça, rgb≈69/50/32 a 4 m) entrava a 100 % na faixa do corpo; com 0,85 ainda
// sobrava 15 %. Fora da faixa a mancha do mapa entra à metade (`antes`: mip +5 a 50 %) e o macro a 60 %: as manchas de torso
// na palafita (y 2,2–4,9, `alto`) e na parede verde (`parede`) eram o mapa + macro inteiros. Sub-tijolo terroso (não salmão).
// Três acabamentos por tinta (variante = soma dos bytes da cor autoral mod 3, estável por material; pelo hash só e6d4b4 — muro
// externo, uma palafita, barracos da fileira C — caía em v1, invisível nas poses, e TINTA_FIXA sobrepõe: d9c78e, a casa A do bar
// (−9,75; 2,6) e a A leste (−1,1), vira v1 verde-água; c9a883, a B oeste (1,9) à direita/fundo da pose `rua`, fica v2 pelo hash):
// 0 chapisco cinza (grão fino de alta frequência, tinta a 55 %, +4 % de luz), 1 tinta pastel (verde-água/amarelo/azul: tom
// da tabela ou bits 8+16 da cor) descascada só acima de 2,1 m, 2 cinza-massa (luma, S ≈ 0,05: 90 % para a luma e 0,97/0,98/1,0
// contra o sol) com remendos de massa acima de 2,1 m — relativos à parede (luma × 1,06, dessaturados): placas de cor fixa liam
// como planos claros flutuando. Nada entra na faixa do corpo (0,45–2,1 m) além de tinta uniforme e grão; rodapé escuro de 0,45 m.
const SUB_TIJOLO = { tex: null, metros: 1.0, cor: [.9, .66, .5], tijolo: true, pe: .58, alto: .66, y0: 0, foraDoCorpo: true, sat: .65, forca: 1, beico: .55 };
const TINTA_PASTEL = [[0.738, 1.128, 1.026], [1.10, 1.02, 0.62], [0.824, 0.978, 1.596]];   // verde-água, amarelo, azul (luma 1)
const TINTA_FIXA = { 0xd9c78e: [1, 0], 0xe6d4b4: [1, 0] };   // [variante, tom] — e6d4b4 divide a parede do bar com d9c78e: mesmo verde-água (azul fazia costura lilás)
const varianteReboco = (v) => [
  `float hdChp = smoothstep(0.5, 0.1, fwidth(hdQb.x) * 40.0) * (hdN(hdQb * 40.0) - 0.5) * 0.5 + smoothstep(0.5, 0.1, fwidth(hdQb.x) * 90.0) * (hdN(hdQb * 90.0) - 0.5) * 0.25;
   diffuseColor.rgb = mix(diffuseColor.rgb, vec3(dot(diffuseColor.rgb, ${LUMA})) * vec3(0.98, 0.98, 0.95), 0.45) * 1.04 * (1.0 + hdChp);`,
  `// Descascado de borda DURA (largura = fwidth do ruído) acima de 2,1 m: massa cinza por baixo, lábio escuro da tinta na borda.
   float hdDn = hdN(hdQb * 0.9 + 5.0) * 0.7 + hdN(hdQb * 3.1) * 0.3, hdDw = max(0.004, fwidth(hdDn) * 0.8), hdDalto = hdAltoB;
   float hdDesc = smoothstep(0.52, 0.52 + hdDw, hdDn) * hdDalto, hdLabio = smoothstep(0.49, 0.52, hdDn) * (1.0 - hdDesc) * hdDalto;
   diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.30, 0.30, 0.28) * (0.85 + 0.3 * hdN(hdQb * 7.0)), hdDesc) * (1.0 - 0.3 * hdLabio);`,
  `diffuseColor.rgb = mix(diffuseColor.rgb, vec3(dot(diffuseColor.rgb, ${LUMA})), 0.9) * vec3(0.97, 0.98, 1.0);
   vec2 hdCel = floor(hdQb / vec2(1.3, 1.1)), hdCf = abs(fract(hdQb / vec2(1.3, 1.1)) - 0.5);
   float hdRem = step(0.78, hdH(hdCel + 3.0)) * step(max(hdCf.x, hdCf.y), 0.42) * hdAltoB;
   diffuseColor.rgb = mix(diffuseColor.rgb, vec3(dot(diffuseColor.rgb, ${LUMA})) * vec3(1.06, 1.06, 1.03) * (0.92 + 0.16 * hdN(hdQb * 5.0)), 0.8 * hdRem);`,
][v];
function rebocoHD(m) {
  SUB_TIJOLO.tex ||= pbrTex('/pbr_bricks051_color', true);
  const hex = m.color.getHex(), [v, t] = TINTA_FIXA[hex] || [((hex & 255) + ((hex >> 8) & 255) + (hex >> 16)) % 3, ((hex >> 8) & 1) + ((hex >> 16) & 1)];
  // v1/v2: a cor autoral vira a sua luma (linear) × tom (pastel já com croma ×1,8: 1 + 1,8·(tom − 1), luma 1), reescalada para
  // manter a luma de tela sob o reboco_cor_rug (quente, direção 69/50/32): tinta quente × textura quente somava +8–10 % que
  // a neutra perde — sem isto o p50 da cinza-massa caía de 56 para ≈ 52.
  if (v) {
    const c = m.color, d = [c.r, c.g, c.b], T = [0.0595, 0.0319, 0.0144], W = [0.3, 0.59, 0.11], lu = (a, b) => a.reduce((s, k, i) => s + W[i] * k * (b ? b[i] : 1), 0);
    const p = v === 1 ? TINTA_PASTEL[t].map((k) => 1 + 1.8 * (k - 1)) : [1, 1, 1], l = lu(d, T) / lu(p, T);
    c.setRGB(l * p[0], l * p[1], l * p[2]);
  }
  m.map = tex('reboco_cor_rug'); m.normalMap = tex('reboco_normal', false); m.roughnessMap = null; m.roughness = 1; m.normalScale.set(1.3, 1.3);
  // v1 (tinta pastel): a faixa 0–0,45 m é rodapé de tinta mais escura/saturada com ilhas de tijolo aparente (bloco 22 × 6,5 cm, junta
  // cinza) e borda descascada fina; o cinza-escuro uniforme lia como sombra pintada. v0/v2 mantêm o rodapé cinza-escuro.
  const depois = v === 1 ? `{ float hdRod = (1.0 - smoothstep(0.42, 0.46, hdYb)) * (1.0 - hdPisoB);
      vec3 hdBase = diffuseColor.rgb * vec3(0.58, 0.66, 0.62) * (0.9 + 0.2 * hdN(hdQb * 5.0));
      float hdIlha = hdN(hdQb * 2.3 + 9.0) * 0.7 + hdN(hdQb * 7.0 + 2.0) * 0.3, hdTj = smoothstep(0.56, 0.56 + max(0.01, fwidth(hdIlha) * 1.5), hdIlha), hdLab = smoothstep(0.52, 0.56, hdIlha) * (1.0 - hdTj);
      vec2 hdTb = vec2((hdQb.x + 0.11 * mod(floor(hdYb / 0.065), 2.0)) / 0.22, hdYb / 0.065), hdTf = fract(hdTb);
      float hdTjunta = 1.0 - smoothstep(0.0, 0.1, min(min(hdTf.x, 1.0 - hdTf.x) * 3.4, min(hdTf.y, 1.0 - hdTf.y)));
      vec3 hdTij = mix(vec3(0.26, 0.12, 0.07) * (0.8 + 0.4 * hdH(floor(hdTb))), vec3(0.27, 0.26, 0.24), hdTjunta);
      diffuseColor.rgb = mix(diffuseColor.rgb, mix(hdBase, hdTij, hdTj) * (1.0 - 0.35 * hdLab), 0.92 * hdRod); hdRugA = mix(hdRugA, 0.85, hdRod); }`
    : `{ float hdRod = (1.0 - smoothstep(0.42, 0.46, hdYb)) * (1.0 - hdPisoB);
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.085, 0.085, 0.082) * (0.85 + 0.3 * hdN(hdQb * 6.0)), 0.8 * hdRod); hdRugA = mix(hdRugA, 0.75, hdRod); }`;
  // A variante roda ANTES de idadeDaParede: o buraco de tijolo (sub) pinta por cima do descascado/remendo, que antes o cobria.
  const antes = `float hdRugA = texture2D(map, vMapUv).a; diffuseColor.a = 1.0;
    float hdYb = vHdPos.y; vec2 hdQb = vec2(vHdPos.x + vHdPos.z, hdYb); vec3 hdGb = abs(normalize(cross(dFdx(vHdPos), dFdy(vHdPos)))); float hdPisoB = step(0.7, hdGb.y);
    // Faixa do corpo relativa a CADA piso andável (lajes a 2,8k, travessia 5,6, palafita 2,2): descascado/remendo/tijolo só na
    // faixa 2,1–2,6 m acima do piso (sob a laje). Em y de mundo, a palafita (corpo a 2,2) e a parede alta da pose alto descascavam na altura do torso.
    float hdYf = mod(hdYb, 2.8), hdAltoB = smoothstep(2.05, 2.15, hdYf) * (1.0 - smoothstep(2.55, 2.65, hdYf));
    { vec3 hdMedA = diffuse * texture2D(map, vMapUv, 5.0).rgb; diffuseColor.rgb = mix(diffuseColor.rgb, hdMedA, 0.5); }
    { ${varianteReboco(v)} }`;
  projetaMundo(m, 1.7, { rodape: .5, sub: SUB_TIJOLO, pe: { altura: .5, cor: [.40, .38, .34], escuro: .3 }, corpoLiso: 1, macro: .6, extra: { chave: `corrego-reb11-v${v}`, antes, depois } });
  const obc = m.onBeforeCompile, chave = m.customProgramCacheKey;
  // O gate do tijolo (sub.foraDoCorpo, map_sertao_hd.js) é em y de mundo (> 2,1 ou < 0,45): troca pela faixa por piso (hdAltoB).
  m.onBeforeCompile = (s) => { obc(s); s.fragmentShader = s.fragmentShader.replace('#include <roughnessmap_fragment>', 'float roughnessFactor = roughness * hdRugA;')
    .replace('float hdFora = smoothstep(2.1, 2.25, hdY) + 1.0 - smoothstep(0.38, 0.5, hdY);', 'float hdFora = hdAltoB;'); };
  m.customProgramCacheKey = () => `${chave()}-rug2`;
}

// Tijolo cru (pbr_bricks051, cuja UV repetia o tile a cada ~180 px): bloco cerâmico de 6 furos 39 × 19 cm assentado com
// junta cinza de 1,5 cm, projetado em metros; tom por bloco e por fiada (quase plano na faixa do corpo), argamassa escorrida/
// respingada sobre o bloco, cinta de concreto de 15 cm no topo de cada pavimento (y = k·2,8) e verga corrida de 12 cm no nível
// dos vãos (2,15 m do piso, o topo da janela autoral) com sombra de 3 cm abaixo, e topo horizontal (piso da laje) em concreto.
// O mapa fica só como grão. Bloco laranja desbotado 0,42/0,14/0,06 (≈ 172/105/68 sRGB; sol + AgX lavam o matiz, croma alta
// de propósito) com junta cinza-clara 1,8 cm: o 0,40/0,215/0,135 lia como tijolinho escuro uniforme (sat 0,25) a 1500 px.
function blocoHD(m) {
  m.normalMap = tex('reboco_normal', false); m.roughnessMap = null; m.roughness = 1; m.normalScale.set(.7, .7);
  m.onBeforeCompile = (s) => { mundo(s, 1.0);
    s.fragmentShader = s.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
      float hdRug = 0.95; diffuseColor.a = 1.0;
      { vec3 hdGn = abs(normalize(cross(dFdx(vHdPos), dFdy(vHdPos)))); float hdPiso = step(0.7, hdGn.y), hdY = vHdPos.y;
        float hdU = hdGn.x > hdGn.z ? vHdPos.z : vHdPos.x; vec2 hdQ = vec2(hdU, hdY);
        float hdGr = 0.72 + 0.56 * dot(diffuseColor.rgb, ${LUMA});
        float hdFi = floor(hdY / 0.2), hdDesl = 0.2 * mod(hdFi, 2.0);
        vec2 hdB = vec2((hdU + hdDesl) / 0.4, hdY / 0.2), hdFr = fract(hdB), hdPx = fwidth(hdB), hdDj = min(hdFr, 1.0 - hdFr) * vec2(0.4, 0.2);
        float hdLonge = smoothstep(0.14, 0.04, hdPx.y * 0.2);
        // Junta cinza-médio de 2,6 cm (menos clara), tom ±12 % por bloco e 1 em 10 escurecido com canto quebrado (nicho escuro).
        float hdJunta = (1.0 - smoothstep(0.0, 0.026 + max(hdPx.x * 0.4, hdPx.y * 0.2) * 1.5, min(hdDj.x, hdDj.y))) * hdLonge;
        float hdVar = mix(1.0, 0.45, hdCorpoF(hdY)), hdTom = mix(1.0, mix(0.88, 1.12, hdH(floor(hdB))), hdVar) * mix(0.95, 1.05, hdH(vec2(hdFi, 7.0)));
        float hdQueb = step(0.9, hdH(floor(hdB) + 11.0)) * hdLonge, hdChip = hdQueb * step(0.72, hdFr.x) * step(0.55, hdFr.y) * (1.0 - 0.6 * hdCorpoF(hdY));
        vec3 hdBloco = vec3(0.42, 0.14, 0.06) * hdTom * hdGr * (0.9 + 0.2 * hdN(hdQ * 9.0)) * (1.0 - 0.4 * hdQueb);
        vec3 hdArg = vec3(0.27, 0.265, 0.25) * (0.8 + 0.4 * hdN(hdQ * 23.0));
        float hdResp = smoothstep(0.66, 0.74, hdN(hdQ * 6.0 + 1.0) * 0.55 + hdN(vec2(hdU * 2.0, hdY * 0.5) + 4.0) * 0.45) * hdLonge * (1.0 - 0.7 * hdCorpoF(hdY));
        vec3 hdC = mix(mix(hdBloco, hdArg, 0.18 * (1.0 - hdLonge)), hdArg * 1.05, max(hdJunta, 0.85 * hdResp));
        hdC = mix(hdC, vec3(0.06, 0.045, 0.035), hdChip);
        float hdMod = fract(hdY / 2.8) * 2.8, hdCinta = max(max(smoothstep(2.63, 2.66, hdMod), hdPiso), smoothstep(2.13, 2.16, hdMod) * (1.0 - smoothstep(2.29, 2.32, hdMod)));
        float hdSombraV = smoothstep(2.09, 2.11, hdMod) * (1.0 - smoothstep(2.12, 2.14, hdMod)) * (1.0 - hdPiso);
        vec3 hdConc = vec3(0.40, 0.39, 0.36) * (0.85 + 0.3 * hdN(hdQ * 2.1)) * hdGrao(hdQ);
        hdC = mix(hdC, hdConc, hdCinta) * (1.0 - 0.4 * hdSombraV);
        float hdEsc = smoothstep(0.66, 0.86, hdN(vec2(hdU * 1.1, hdY * 0.18))) * (1.0 - hdPiso) * smoothstep(1.9, 3.0, hdY);
        hdC = hdUmido(hdC, 0.45 * hdEsc) * (1.0 - 0.25 * hdEsc);
        float hdSuj = smoothstep(0.55, 0.04, hdY) * (1.0 - hdPiso); hdC = hdUmido(hdC, 0.5 * hdSuj) * (1.0 - 0.3 * hdSuj);
        diffuseColor.rgb = hdC; hdRug = mix(0.95, 0.8, hdCinta); }`)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = roughness * hdRug;'); };
  m.customProgramCacheKey = () => 'corrego-hd-bloco4';
}

// Vãos (matVao: porta 1,0 × 2,1 e janela 1,0 × 1,0 em placa de 10 cm, 2 cm à frente da parede). O lote estático funde todos
// num mesh só, então cada caixa é recuperada no CPU por corrida contígua de vértices (extensão ≤ 1,1 m na horizontal e ≤ 2,2 m
// na vertical: vãos vizinhos distam mais) e vira atributo: centro, tangente da fachada (eixo principal em xz), meia-largura e tipo
// (janela 0–8 do atlas de janelas, porta 10–14 do atlas de portas; +0,5 = espelhada). Sem isto cada vão era um preto chapado.
function marcaVaos(mesh) {
  const g = mesh.geometry, p = g?.attributes?.position; if (!p || g.attributes.hdJc) return null;
  const n = p.count, jc = new Float32Array(n * 3), js = new Float32Array(n * 4), caixas = [];
  let ini = 0, x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
  for (let i = 0; i < n; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const nx0 = Math.min(x0, x), ny0 = Math.min(y0, y), nz0 = Math.min(z0, z), nx1 = Math.max(x1, x), ny1 = Math.max(y1, y), nz1 = Math.max(z1, z);
    if (i > ini && (Math.max(nx1 - nx0, nz1 - nz0) > 1.1 || ny1 - ny0 > 2.2)) { caixas.push([ini, i, x0, y0, z0, x1, y1, z1]); ini = i; x0 = x1 = x; y0 = y1 = y; z0 = z1 = z; continue; }
    x0 = nx0; y0 = ny0; z0 = nz0; x1 = nx1; y1 = ny1; z1 = nz1;
  }
  if (n > ini) caixas.push([ini, n, x0, y0, z0, x1, y1, z1]);
  const h3 = (a, b, c) => { const s = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453; return s - Math.floor(s); };
  for (const [a, b, bx0, by0, bz0, bx1, by1, bz1] of caixas) {
    const cx = (bx0 + bx1) / 2, cy = (by0 + by1) / 2, cz = (bz0 + bz1) / 2;
    let sxx = 0, sxz = 0, szz = 0;
    for (let i = a; i < b; i++) { const dx = p.getX(i) - cx, dz = p.getZ(i) - cz; sxx += dx * dx; sxz += dx * dz; szz += dz * dz; }
    const ang = .5 * Math.atan2(2 * sxz, sxx - szz), tx = Math.cos(ang), tz = Math.sin(ang);
    let hw = 0; for (let i = a; i < b; i++) hw = Math.max(hw, Math.abs((p.getX(i) - cx) * tx + (p.getZ(i) - cz) * tz));
    // Porta fica na faixa do corpo: sem a célula 2 (madeira velha, bege quente) e com tinta fria. Janela sem a célula 4
    // (vitrô: caixilho 0x4f5a5c sob vidro 128–142, lavado na névoa a 20 m; a irmã cobogó ao lado ficava nítida).
    const porta = by1 - by0 > 1.6, h = h3(cx, cy, cz), tipo = (porta ? 10 + [0, 1, 3, 4][Math.floor(h * 4)] : [0, 1, 2, 3, 5, 6, 7, 8][Math.floor(h * 8)]) + (h3(cz, cx, 3) < .5 ? .5 : 0);
    for (let i = a; i < b; i++) { jc[i * 3] = cx; jc[i * 3 + 1] = cy; jc[i * 3 + 2] = cz; js[i * 4] = tx; js[i * 4 + 1] = tz; js[i * 4 + 2] = hw; js[i * 4 + 3] = tipo; }
  }
  g.setAttribute('hdJc', new THREE.BufferAttribute(jc, 3)); g.setAttribute('hdJs', new THREE.BufferAttribute(js, 4));
  return () => { g.deleteAttribute('hdJc'); g.deleteAttribute('hdJs'); };
}
// Janela de alumínio/basculante/veneziana com vidro (reflexo de céu por fresnel, sem cubo) ou porta de chapa/enrolar/madeira
// nas faces largas; faces finas e topo em concreto (ombreira/peitoril). A oclusão por vértice do mapa é preservada.
function janelaHD(m, U) {
  m.map = null; m.normalMap = null; m.roughnessMap = null; m.roughness = 1; m.metalness = 0; m.color.setHex(0xffffff);
  m.onBeforeCompile = (s) => { mundo(s); s.uniforms.hdJanelas = U.janelas; s.uniforms.hdPortas = U.portas;
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 hdJc; attribute vec4 hdJs; varying vec3 vHdJc; varying vec4 vHdJs;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvHdJc = hdJc; vHdJs = hdJs;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D hdJanelas; uniform sampler2D hdPortas; varying vec3 vHdJc; varying vec4 vHdJs;')
      .replace('#include <color_fragment>', `#include <color_fragment>
      float hdVid = 0.0, hdFres = 0.0, hdRug = 0.75;
      { float hdAo = diffuseColor.r; vec3 hdGn = normalize(cross(dFdx(vHdPos), dFdy(vHdPos))); vec2 hdT = vHdJs.xy;
        float hdHw = max(vHdJs.z, 0.05), hdPorta = step(9.5, vHdJs.w), hdCod = vHdJs.w - 10.0 * hdPorta, hdCel = floor(hdCod + 0.01), hdEsp = step(0.25, fract(hdCod));
        float hdHh = mix(0.5, 1.05, hdPorta);
        float hdU = dot(vHdPos.xz - vHdJc.xz, hdT) / (2.0 * hdHw) + 0.5, hdV = (vHdPos.y - vHdJc.y) / (2.0 * hdHh) + 0.5;
        hdU = mix(hdU, 1.0 - hdU, hdEsp);
        float hdFrente = step(abs(dot(hdGn.xz, hdT)), 0.5) * step(abs(hdGn.y), 0.5);
        float hdId = hdH(floor(vHdJc.xz * 2.0) + floor(vHdJc.y));
        vec2 hdUv = clamp(vec2(hdU, 1.0 - hdV), 0.006, 0.994);
        vec4 hdTj = texture2D(hdJanelas, (vec2(mod(hdCel, 3.0), floor(hdCel / 3.0)) + hdUv) / 3.0);
        vec4 hdTp = texture2D(hdPortas, vec2((min(hdCel, 4.0) + hdUv.x) / 5.0, hdUv.y));
        vec4 hdTx = mix(hdTj, hdTp, hdPorta); float hdSol = step(0.5, hdTx.a);
        vec3 hdTinta = hdId < 0.25 ? vec3(0.78, 0.86, 0.92) : hdId < 0.5 ? vec3(0.80, 0.88, 0.78) : hdId < 0.75 ? vec3(0.84, 0.88, 0.90) : vec3(0.96);
        vec3 hdCor = hdTx.rgb * mix(vec3(1.0), hdTinta, hdPorta) * (0.84 + 0.3 * hdId);
        // Porta: nervura vertical a cada 25 cm (aresta clara + sombra), ferrugem irregular nos 20 cm do pé (hdV < 0,095) e
        // fechadura escura em u 0,85 / v 0,45. A chapa bege lia como placa lisa (pose rua, dp 2).
        { float hdRf = fract(hdU * 4.0), hdRib = (smoothstep(0.0, 0.05, hdRf) - smoothstep(0.05, 0.10, hdRf)) - (smoothstep(0.10, 0.15, hdRf) - smoothstep(0.15, 0.20, hdRf));
          float hdFerP = (1.0 - smoothstep(0.03, 0.11, hdV + (hdN(vec2(hdU * 9.0, 2.0)) - 0.5) * 0.06)) * (0.6 + 0.4 * hdN(vec2(hdU, hdV) * 30.0));
          float hdFech = step(abs(hdU - 0.85), 0.035) * step(abs(hdV - 0.45), 0.045);
          hdCor *= 1.0 + 0.2 * hdRib * hdPorta * hdFrente;
          hdCor = mix(hdCor, vec3(0.22, 0.10, 0.05) * (0.7 + 0.6 * hdN(vec2(hdU, hdV) * 40.0)), 0.75 * hdFerP * hdPorta * hdFrente);
          hdCor = mix(hdCor, vec3(0.07, 0.07, 0.075), hdFech * hdPorta * hdFrente); }
        vec3 hdMold = vec3(0.36, 0.35, 0.32) * (0.8 + 0.4 * hdN(vHdPos.xz * 7.0 + vHdPos.y));
        diffuseColor.rgb = mix(hdMold, hdCor, hdFrente) * hdAo;
        hdVid = (1.0 - hdSol) * hdFrente * (1.0 - hdPorta);
        vec3 hdOlho = normalize(vHdPos - cameraPosition); float hdVn = max(abs(dot(hdOlho, hdGn)), 0.15);
        hdFres = (0.10 + 0.9 * pow(1.0 - hdVn, 4.0)) * hdVid;
        hdRug = mix(0.75, 0.12, hdVid); }`)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = roughness * hdRug;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += hdFres * vec3(0.26, 0.30, 0.34);'); };
  m.customProgramCacheKey = () => 'corrego-hd-janela3';
}

// Lâmina do córrego (water.js): cor e espuma por uniforme; o update fica intacto. A faixa de espuma branca na emenda
// água/margem vira filete cinza-oliva estreito (uEspumaFaixa 0,14, manchas quebradas pela textura B); o MIOLO (linha contínua
// de coluna < 5 cm na linha d'água) vai a zero: no assoreamento das pontas (z ≈ ∓32) ele era a linha branca pontilhada de 1 px
// da pose `alto` (some com uEspumaMiolo = 0; o pixel cai de 164 para 94 = vizinhos). Água marrom-oliva (0x4a4830 rasa / 0x201f14
// funda: verde-cinza lia como piscina), nata bege-oliva. Com `espuma`, o fragmento ganha nata marrom
// nos cantos (|x| > 2,2 m, junto aos muros) lida da textura B que já está no shader; a string original volta em desliga().
const ESPUMA_ANCORA = 'cor = mix(cor, uCeuCor, fres * 0.22);';
function aguaHD(scene, espuma) {
  let malha = null; scene.traverse((o) => { if (o.userData?.aguaViva && o.material?.uniforms) malha = o; });
  if (!malha) return () => {};
  const mat = malha.material, u = mat.uniforms, cores = {}, nums = {}, frag = mat.fragmentShader;
  for (const [k, v] of [['uCorRasa', 0x4a4830], ['uCorFunda', 0x201f14], ['uCorEspuma', 0x9c9a86]]) if (u[k]?.value?.isColor) { cores[k] = u[k].value.getHex(); u[k].value.setHex(v); }
  for (const [k, v] of [['uEspumaFaixa', .14], ['uEspumaMiolo', 0]]) if (typeof u[k]?.value === 'number') { nums[k] = u[k].value; u[k].value = Math.min(u[k].value, v); }
  const patch = espuma && typeof frag === 'string' && frag.includes(ESPUMA_ANCORA) && u.tNormalB && u.uTime;
  if (patch) {
    mat.fragmentShader = frag.replace(ESPUMA_ANCORA, `{ float hdB = smoothstep(2.2, 2.95, abs(vWorld.x)); float hdP = texture2D(tNormalB, vWorld.xz / 2.6 + uTime * vec2(0.012, 0.03)).g;
    float hdE = hdB * smoothstep(0.50, 0.78, hdP + 0.22 * hdB); cor = mix(cor, vec3(0.34, 0.29, 0.19), hdE * 0.75); alfa = max(alfa, hdE * 0.85); }
  ${ESPUMA_ANCORA}`); mat.needsUpdate = true;
  }
  return () => { for (const k in cores) u[k].value.setHex(cores[k]); for (const k in nums) u[k].value = nums[k]; if (patch) { mat.fragmentShader = frag; mat.needsUpdate = true; } };
}
// Placas de espuma autorais (map_corrego.js: 7 caixas de 1,8 cm em CANAL_AGUA + 0,02 e 4 bolhas em + 0,06, material cor pura
// 0xf0ecd3 transparente): quads flutuando 2 cm ACIMA da lâmina liam como placas claras soltas (`ponte`). Descem até ficar 60 %
// submersas (caixa: fundo em −1,621; bolha: 3 mm acima da lâmina). Posição restaurada em desliga().
function afundaEspuma(scene) {
  const movidos = [];
  scene.traverse((o) => { if (!o.isMesh) return; const m = o.material; if (!m || Array.isArray(m) || !m.transparent || (m.userData.hdChave !== '|f0ecd3' && m.color?.getHex() !== 0xf0ecd3)) return;
    const circ = o.geometry?.type === 'CircleGeometry', y0 = o.position.y;
    o.position.y = circ ? -1.61 + 0.003 : -1.621 + 0.009; movidos.push([o, y0]); });
  return () => { for (const [o, y] of movidos) o.position.y = y; };
}
// GLBs sem chave útil: a "poça azul" fora do canal é a caixa d'água caída na rua (azul saturado → polietileno encardido);
// o botijão (botijao_gas.glb, material defaultMat_1001 branco sem mapa) vira P13 cinza-aço encardido.
function propsGLB(scene) {
  const feitos = [], vistos = new Set();
  scene.traverse((o) => { if (!o.isMesh) return; let id = null; for (let p = o; p && !id; p = p.parent) id = p.userData?.mapPropId;
    if (id !== 'caixa_dagua' && id !== 'botijao_gas') return;
    for (const m of materiaisDe(o)) { if (vistos.has(m) || !m.color) continue;
      if (id === 'caixa_dagua') { if (m.color.b < m.color.r * 1.2) continue; vistos.add(m); feitos.push([m, m.color.getHex(), m.roughness, m.metalness]); m.color.multiplyScalar(.5); if (typeof m.roughness === 'number') m.roughness = Math.max(m.roughness, .55); }
      else { if (m.map) continue; vistos.add(m); feitos.push([m, m.color.getHex(), m.roughness, m.metalness]); m.color.setHex(0x737a7f); m.roughness = .5; m.metalness = .35; } } });
  return () => { for (const [m, cor, rug, met] of feitos) { m.color.setHex(cor); if (typeof rug === 'number') m.roughness = rug; if (typeof met === 'number') m.metalness = met; } };
}
// Tufos de capim do chão (grama_corrego_01/02: grade instanciada por PropBatch mais as 26 peças plantadas): fica só o que está
// a ≤ 3,5 m da água (|x| ≤ 6,5; a fileira autoral da margem está em 5,5–6,2 m), o resto vai a escala zero por instância —
// menos 14 deles que, com `margem`, mudam só de posição para a beira do canal (|x| 3,4–4,5, fora de ponte, rampa e geladeira).
// Rua de favela de planície em SP é cimentado e asfalto remendado, não terreno baldio com tufo seco.
const RAMPAS_Z = [[-1, -33, -27], [1, -13, -7], [-1, 9, 15], [1, 26, 32]];
function matoHD(scene, limite = 6.5, margem = false) {
  const feitos = []; let s = 4421, movidos = 0; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const vago = (lado, z) => ![-22, 0, 22].some((b) => Math.abs(z - b) < 2.6) && !RAMPAS_Z.some(([l, a, b]) => l === lado && z > a - 1.2 && z < b + 1.2) && Math.abs(Math.abs(z) - 10) > 1.6;
  scene.traverse((o) => {
    if (o.isInstancedMesh && /Grass Tuft|Creekside Weeds/.test(o.material?.name || '')) {
      const a = o.instanceMatrix.array, copia = a.slice(); let mudou = false;
      for (let i = 0; i < o.count; i++) { const k = i * 16; if (Math.abs(a[k + 12]) <= limite) continue; mudou = true;
        let posto = false;
        for (let t = 0; margem && movidos < 14 && t < 8 && !posto; t++) { const lado = movidos % 2 ? 1 : -1, z = -31 + rnd() * 62; if (!vago(lado, z)) continue;
          a[k + 12] = lado * (3.4 + rnd() * 1.1); a[k + 13] = 0; a[k + 14] = z; movidos++; posto = true; }
        if (!posto) for (let j = 0; j < 12; j++) a[k + j] = 0; }
      if (mudou) { o.instanceMatrix.needsUpdate = true; feitos.push(() => { a.set(copia); o.instanceMatrix.needsUpdate = true; }); }
    } else if (!o.isMesh && /^grama_corrego/.test(o.userData?.mapPropId || '') && o.visible && Math.abs(o.position.x) > limite) { o.visible = false; feitos.push(() => { o.visible = true; }); }
  });
  return () => { for (const f of feitos) f(); };
}
// Retângulos de roupa do varal autoral (6 cores, InstBatch): escala zero; os panos novos estão em hd_cenografia_corrego.js.
function roupasHD(scene) {
  const feitos = [];
  scene.traverse((o) => {
    if (!o.isInstancedMesh) return; const m = o.material; if (!m?.isMeshStandardMaterial || m.map || !ROUPAS.has(m.color.getHex())) return;
    const a = o.instanceMatrix.array, copia = a.slice();
    for (let i = 0; i < o.count; i++) for (let j = 0; j < 12; j++) a[i * 16 + j] = 0;
    o.instanceMatrix.needsUpdate = true; feitos.push(() => { a.set(copia); o.instanceMatrix.needsUpdate = true; });
  });
  return () => { for (const f of feitos) f(); };
}
// Sacos de lixo autorais (3 dodecaedros de cor pura; tabela em hd_cenografia_corrego.js): esfera lisa lia como pneu. Achata
// (y × 0,8), varia o tamanho por saco e gira; o nó do topo é da cenografia e as pregas do sacoHD. Chave por cor original.
function sacosHD(scene) {
  const feitos = [];
  scene.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.geometry?.type !== 'DodecahedronGeometry') return;
    const m = o.material; if (!m?.isMeshStandardMaterial || m.map) return;
    const e = SACOS_AUTORAIS.find((s) => s[4] === (m.userData.hdChave || chaveDe(m))); if (!e) return;
    const esc = o.scale.clone(), ry = o.rotation.y, sz = e[3];
    // e[6] = some: o trio preto idêntico lia como bombas; ficam 1 saco preto + sacolas claras/papelão/tijolo da cenografia.
    if (e[6]) o.scale.set(0, 0, 0); else o.scale.set(esc.x * sz, esc.y * .8 * sz, esc.z * sz); o.rotation.y = ry + sz * 2.1; o.updateMatrixWorld(true);
    feitos.push(() => { o.scale.copy(esc); o.rotation.y = ry; o.updateMatrixWorld(true); });
  });
  return () => { for (const f of feitos) f(); };
}
// Gatos autorais (map_corrego.js: caixas de 3 cm a 6,4–7,7 m entre POSTES, cor pura 0x1d1b19) que cruzam a travessia alta
// (5,6 m) com menos de 2,6 m de folga somem: eram o cabo a 1,2 m do piso que a pose `alto` mostrava. Os cabos da cenografia
// (isolador a isolador, folga garantida) ficam no lugar deles. Os demais gatos autorais continuam.
function gatosHD(scene) {
  const feitos = [], c = new THREE.Vector3();
  scene.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || !o.visible) return;
    const m = o.material; if (!m?.isMeshStandardMaterial || m.map || m.color.getHex() !== 0x1d1b19) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); const bb = o.geometry.boundingBox; if (!bb) return;
    const L = bb.max.z - bb.min.z; if (bb.max.x - bb.min.x > .06 || bb.max.y - bb.min.y > .06 || L < 2) return;
    o.getWorldPosition(c); const dx = Math.sin(o.rotation.y), dz = Math.cos(o.rotation.y), pts = [];
    for (let i = 0; i <= 24; i++) { const t = (i / 24 - .5) * L; pts.push({ x: c.x + dx * t, y: c.y, z: c.z + dz * t }); }
    if (folgaPass(pts)) return;
    o.visible = false; feitos.push(() => { o.visible = true; });
  });
  return () => { for (const f of feitos) f(); };
}
// ───────────── r26: barracos e caminhos "de obra" (cada função só entra com a sua frente ligada; ver cabeçalho) ─────────────
// Relevo procedural em espaço de mundo: hdTanB = tangente horizontal da face, hdRelB = inclinação (ao longo da face, para cima).
const R26_NORMAL = '\nnormal = normalize(normal + mat3(viewMatrix) * (hdTanB * hdRelB.x + vec3(0.0, hdRelB.y, 0.0)) * 0.6);';
// Normal dos conjuntos hd_corrego lido com uv e derivadas próprios (hdUvB, hdGrB). O Mint entrega o normal com viés (média ≠ 0,5): (bx, by) o tira.
const normalR26 = (bx, by, extra = '') => NORMAL_REL.replace('vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;',
  `vec3 mapN = textureGrad( normalMap, hdUvB, hdGrB.xy, hdGrB.zw ).xyz * 2.0 - 1.0; mapN.xy += vec2(${bx}, ${by});`).replace('normal = normalize( tbn * mapN );', `${extra}normal = normalize( tbn * mapN );`);
// Copiado de map_corrego.js (POSTES): o poste de distribuição divide o material com os pilares e fica como estava (NÃO TOCAR).
const POSTES_R26 = [[-6.6, -31], [7.1, -12], [-7.2, 6], [6.8, 29], [-13.3, -24], [13.3, -3], [-13.3, 16], [13.3, 30], [-20.6, -34], [20.6, -18], [-20.6, 12], [20.6, 22]];
// Pilar das casas/palafitas/pórticos (matPilar): fôrma de tábua em pé e junta de concretagem a ≈ 1,3 m + 1,4k no lugar dos anéis de 60 cm.
// Risco: nata e bicheira só fora da faixa do corpo de cada pavimento; os 12 postes de POSTES_R26 ficam com o desenho antigo.
const FORMA_R26 = `{ vec2 hdPp = vHdPos.xz; float hdPd = 9.0;
  ${POSTES_R26.map(([x, z]) => `hdPd = min(hdPd, distance(hdPp, vec2(${x.toFixed(1)}, ${z.toFixed(1)})));`).join(' ')}
  if (hdPd < 0.32) ${JUNTAS} else {
    vec3 hdGa = abs(hdGn); float hdUf = hdGa.x > hdGa.z ? vHdPos.z : vHdPos.x, hdLat = 1.0 - hdPiso, hdFwF = fwidth(hdY), hdForaF = 1.0 - hdCorpoP(hdY);
    hdTanB = hdGa.x > hdGa.z ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
    float hdRxF; float hdTabF = hdFormaR26(hdUf, hdY, 0.125, hdRxF); diffuseColor.rgb *= mix(1.0, hdTabF, hdLat); hdRelB.x = 0.8 * hdRxF * hdLat;
    float hdJyF = hdY - 1.3 - 0.3 * (hdN(hdPp * 0.37) - 0.5) + 0.025 * (hdN(vec2(hdUf * 9.0, 3.0)) - 0.5) + 0.012 * (hdN(vec2(hdUf * 37.0, 5.0)) - 0.5);
    float hdJkF = floor(hdJyF / 1.4 + 0.5), hdJdF = hdJyF - hdJkF * 1.4, hdTemF = step(-0.5, hdJkF) * hdLat;
    float hdJlF = (1.0 - smoothstep(0.004, 0.009 + hdFwF * 1.5, abs(hdJdF))) * smoothstep(0.06, 0.015, hdFwF) * hdTemF;
    hdRelB.y = sign(hdJdF) * hdJlF * 0.7; diffuseColor.rgb *= 1.0 - 0.35 * hdJlF;
    float hdNataF = smoothstep(0.5, 0.75, hdN(vec2(hdUf * 23.0, hdJkF * 5.0))) * smoothstep(-0.30 * (0.3 + 0.7 * hdN(vec2(hdUf * 11.0, hdJkF + 3.0))), -0.01, hdJdF) * step(hdJdF, 0.0) * hdTemF * hdForaF;
    diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 1.3 + vec3(0.03, 0.028, 0.024), 0.6 * hdNataF);
    float hdBichF = smoothstep(0.62, 0.72, hdN(hdQ * vec2(7.0, 9.0) + 5.0)) * (1.0 - smoothstep(0.0, 0.14, abs(hdJdF + 0.06))) * hdTemF * hdForaF;
    diffuseColor.rgb *= 1.0 - 0.45 * hdBichF * (0.6 + 0.4 * hdN(hdQ * 60.0));
    float hdLamaF = (1.0 - smoothstep(0.12, 0.40, hdY + (hdN(vec2(hdUf * 13.0, 2.0)) - 0.5) * 0.16)) * step(-0.2, hdY) * (0.55 + 0.45 * hdN(hdQ * 21.0)) * hdLat;
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.115, 0.102, 0.084), 0.8 * hdLamaF); hdRug += 0.1 * hdLamaF; } }`;
// Rampa da travessia (31 degraus de 27,7 × 18,1 cm): degrau PINTADO por paralaxe sob o plano; na lateral o dente é descartado.
// Invariante: colisão, sombra e profundidade continuam as da rampa lisa (o pé fica até 18 cm acima do piso pintado).
const ESCADA_R26 = `{ float hdAxr = abs(vHdPos.x), hdS = 13.6 - hdAxr, hdPlR = 0.65116 * hdS;
  float hdNaR = step(5.0, hdAxr) * step(hdAxr, 13.62) * step(abs(vHdPos.z + 11.0), 1.3) * step(hdPlR - 0.26, hdY) * step(hdY, hdPlR + 0.04);
  float hdDa = 0.27742, hdDb = 0.18065, hdKk = floor(hdS / hdDa), hdSig = hdS - hdKk * hdDa, hdLonge = smoothstep(0.07, 0.18, fwidth(hdS));
  if (hdNaR > 0.5 && hdGn.y > 0.7 && hdGn.y < 0.95) {
    vec3 hdVv = normalize(vHdPos - cameraPosition); float hdDsv = -sign(vHdPos.x) * hdVv.x, hdDyv = hdVv.y, hdEta = 0.65116 * hdSig;
    float hdT1 = hdDyv < -0.0001 ? -hdEta / hdDyv : 1000.0, hdT2 = hdDsv > 0.0001 ? (hdDa - hdSig) / hdDsv : 1000.0;
    float hdEsp = step(hdT2, hdT1), hdTt = min(min(hdT1, hdT2), 1.0);
    float hdSh = clamp(hdSig + hdTt * hdDsv, 0.0, hdDa), hdYh = clamp(hdEta + hdTt * hdDyv, 0.0, hdDb), hdZh = vHdPos.z + hdTt * hdVv.z, hdZc = abs(hdZh + 11.0), hdDg = hdKk + hdEsp;
    vec2 hdQs = vec2(hdZh, mix(hdSh, hdYh, hdEsp) + hdDg * 0.37);
    float hdTri = 1.0 - smoothstep(0.34, 0.50, hdZc + (hdN(vec2(hdS * 1.3, 2.0)) - 0.5) * 0.14);
    float hdCanto = smoothstep(0.80, 1.15, hdZc + (hdN(vec2(hdS * 5.0, hdZh * 3.0)) - 0.5) * 0.3) * (1.0 - hdEsp);
    float hdFundoD = (1.0 - hdEsp) * smoothstep(hdDa - 0.07, hdDa - 0.01, hdSh + (hdN(vec2(hdZh * 9.0, hdKk)) - 0.5) * 0.04);
    vec3 hdDeg = mix(vec3(0.262, 0.247, 0.218) * (1.0 + 0.10 * hdTri), vec3(0.135, 0.125, 0.108), hdEsp) * (0.9 + 0.2 * hdN(hdQs * 9.0)) * hdGrao(hdQs);
    hdDeg *= mix(1.0 - 0.28 * smoothstep(hdDa - 0.11, hdDa, hdSh), 1.0 - 0.22 * (1.0 - smoothstep(0.0, 0.07, hdYh)), hdEsp);
    hdDeg = mix(hdDeg, vec3(0.102, 0.082, 0.065) * (0.8 + 0.4 * hdN(hdQs * 23.0)), max(0.75 * hdCanto, 0.8 * hdFundoD));
    float hdAm = (1.0 - hdEsp) * (1.0 - smoothstep(0.075, 0.085, hdSh)) * (step(0.5, hdKk) * step(hdKk, 1.5) + step(29.5, hdKk)) * smoothstep(0.3, 0.6, hdN(hdQs * vec2(5.0, 31.0)));
    hdDeg = mix(hdDeg, vec3(0.40, 0.28, 0.04), 0.8 * hdAm);
    float hdQuina = mix(1.0 - smoothstep(0.024, 0.034, hdSh), smoothstep(hdDb - 0.034, hdDb - 0.024, hdYh), hdEsp);
    float hdLq = step(0.8, hdH(vec2(hdDg, 5.0))) * smoothstep(0.5, 0.7, hdN(vec2(hdZh * 4.0, hdDg)));
    hdDeg = mix(hdDeg, mix(vec3(0.36, 0.343, 0.305), vec3(0.10, 0.095, 0.085), hdLq), 0.8 * hdQuina * (1.0 - 0.8 * hdAm));
    diffuseColor.rgb = mix(hdDeg, vec3(0.205, 0.193, 0.170), hdLonge); hdRug = mix(0.85, 0.7, hdTri * (1.0 - hdEsp)); hdRel = 0.4;
    hdNw = mix(vec3(0.0, 1.0, 0.0), vec3(sign(vHdPos.x), 0.0, 0.0), hdEsp); hdNwK = 0.8 * (1.0 - hdLonge);
  } else if (hdNaR > 0.5 && abs(hdGn.z) > 0.97) {
    if (hdY > hdDb * hdKk + 0.004) discard;
    float hdRxL; float hdTabL = hdFormaR26((hdPlR - hdY) * 0.838, hdS, 0.09, hdRxL);
    float hdEscD = (1.0 - smoothstep(0.0, 0.05, hdSig)) * 0.7 + smoothstep(0.6, 0.8, hdN(vec2(hdS * 7.0, 3.0))) * 0.4;
    diffuseColor.rgb = vec3(0.254, 0.246, 0.223) * hdTabL * (0.9 + 0.2 * hdMacro) * hdGrao(hdQ) * (1.0 - 0.3 * min(1.0, hdEscD));
  } else if (hdGn.y < -0.5 && hdAxr < 13.7 && abs(vHdPos.z + 11.0) < 1.3 && hdY > 0.2) {
    float hdSl2 = hdAxr <= 5.0 ? vHdPos.x : sign(vHdPos.x) * (5.0 + (hdAxr - 5.0) * 1.1934);
    float hdRxB; float hdTabB = hdFormaR26(hdSl2, vHdPos.z, 0.15, hdRxB), hdInf = smoothstep(0.62, 0.8, hdN(vec2(hdSl2 * 1.7, vHdPos.z * 0.6) + 5.0));
    diffuseColor.rgb = hdUmido(vec3(0.19, 0.185, 0.17) * hdTabB * (0.9 + 0.2 * hdMacro) * hdGrao(vHdPos.xz), 0.5 * hdInf) * (1.0 - 0.25 * hdInf); hdRel = 0.2;
  } }`;
// Vala de água servida do chão r26 chegando ao canal: canaleta escura no topo do muro (|x| 3–5) e escorrido na face, nos mesmos z do chaoR26.
const VALA_R26 = `{ float hdZsV = vHdPos.z - (vHdPos.x < 0.0 ? 3.7 : 0.0) - 0.75 + 0.3 * sin(vHdPos.x * 0.7);
  float hdVzC = min(min(abs(hdZsV + 21.0), abs(hdZsV + 8.7)), min(abs(hdZsV - 11.1), abs(hdZsV - 24.3)));
  float hdValaC = (1.0 - smoothstep(0.11, 0.14 + fwidth(vHdPos.z) * 1.5, hdVzC)) * hdPiso * step(-0.05, hdY);
  float hdEscV = (1.0 - smoothstep(0.10, 0.30, hdVzC + (hdN(vec2(vHdPos.z * 9.0, hdY * 2.0)) - 0.5) * 0.12)) * (1.0 - hdPiso) * smoothstep(-1.7, -0.2, hdY);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.040, 0.048, 0.043), 0.9 * hdValaC); diffuseColor.rgb = hdUmido(diffuseColor.rgb, 0.7 * hdEscV) * (1.0 - 0.45 * hdEscV);
  hdRug = mix(hdRug, 0.3, max(hdValaC, 0.6 * hdEscV)); }`;
// Tijolo cru (pbr_bricks051), r26: regra única do bloco + respingo no pé e eflorescência sob a cinta (y = k·2,8 − 0,17).
// Faixa do corpo por pavimento (mod 2,8): só tom igualado, junta e relevo; cinta, verga e topo de concreto como na blocoHD.
function tijoloR26(m, texR26) {
  const cor = pbrTex('hd_corrego/bloco_cor_rug', true), nor = pbrTex('hd_corrego/bloco_normal', false); texR26.push(cor, nor);
  m.map = cor; m.normalMap = nor; m.roughnessMap = null; m.roughness = 1; m.normalScale.set(1, 1); m.color.setHex(0xffffff);
  m.onBeforeCompile = (s) => { mundo(s, 1.0, false, R26_GLSL);
    s.fragmentShader = s.fragmentShader.replace('#include <map_fragment>', `
      float hdRug = 0.95, hdRel = 1.0; vec2 hdUvB = vec2(0.0); vec4 hdGrB = vec4(0.0); diffuseColor.a = 1.0;
      { vec3 hdGn = abs(normalize(cross(dFdx(vHdPos), dFdy(vHdPos)))); float hdPiso = step(0.7, hdGn.y), hdY = vHdPos.y;
        float hdU = hdGn.x > hdGn.z ? vHdPos.z : vHdPos.x; vec2 hdQ = vec2(hdU, hdY);
        float hdMod = mod(max(hdY, 0.0), 2.8), hdCorpo = hdCorpoP(hdY);
        vec3 hdC = hdBlocoR26(map, hdQ, hdCorpo, hdUvB, hdGrB);
        float hdMas = smoothstep(0.60, 0.82, hdN(vec2(hdU * 0.5 + 17.0, hdY * 0.8)) * 0.7 + hdN(hdQ * 2.9 + 5.0) * 0.3) * (1.0 - hdCorpo);
        hdC = mix(hdC, vec3(0.25, 0.24, 0.215) * (0.9 + 0.2 * hdN(hdQ * 7.0)), 0.4 * hdMas);
        hdC *= mix(mix(0.86, 1.10, hdN(vec2(hdU * 0.23, floor(hdY / 2.8) * 3.1 + 0.5))), 1.0, 0.7 * hdCorpo);
        hdC = mix(hdC, vec3(0.30, 0.28, 0.24) * (0.85 + 0.3 * hdN(hdQ * 19.0)), 0.85 * hdRespR26(hdQ, hdMod));
        float hdEfL = 0.2 + 0.3 * hdN(vec2(hdU * 1.3, 4.0)), hdEf = smoothstep(2.63 - hdEfL, 2.63, hdMod) * step(2.30, hdMod) * smoothstep(0.35, 0.75, hdN(vec2(hdU * 7.0, hdY * 0.7)) * 0.7 + hdN(hdQ * 23.0) * 0.3);
        hdC = mix(hdC, vec3(0.60, 0.57, 0.51), 0.45 * hdEf);
        float hdCinta = max(max(smoothstep(2.63, 2.66, hdMod), hdPiso), smoothstep(2.13, 2.16, hdMod) * (1.0 - smoothstep(2.29, 2.32, hdMod)));
        float hdSombraV = smoothstep(2.09, 2.11, hdMod) * (1.0 - smoothstep(2.12, 2.14, hdMod)) * (1.0 - hdPiso);
        vec3 hdConc = vec3(0.40, 0.39, 0.36) * (0.85 + 0.3 * hdN(hdQ * 2.1)) * hdGrao(hdQ);
        hdC = mix(hdC, hdConc, hdCinta) * (1.0 - 0.4 * hdSombraV);
        float hdEsc = smoothstep(0.66, 0.86, hdN(vec2(hdU * 1.1, hdY * 0.18))) * (1.0 - hdPiso) * smoothstep(1.9, 3.0, hdY) * (1.0 - hdCorpo);
        hdC = hdUmido(hdC, 0.45 * hdEsc) * (1.0 - 0.25 * hdEsc);
        float hdSuj = smoothstep(0.55, 0.04, hdY) * (1.0 - hdPiso); hdC = hdUmido(hdC, 0.5 * hdSuj) * (1.0 - 0.3 * hdSuj);
        diffuseColor.rgb = hdC; hdRug = mix(0.95, 0.8, hdCinta); hdRel = 1.0 - 0.75 * hdCinta; }`)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = roughness * hdRug;')
      .replace('#include <normal_fragment_maps>', normalR26(0.153, 0.145)); };
  m.customProgramCacheKey = () => 'corrego-r26-tijolo3';
}
// Mureta do vão da travessia, r26: por dentro o bloco da regra única (tom uniforme acima de 0,6 m do tabuleiro); por fora, com
// `obra`, bloco de concreto rebocado em panos de ≈ 3 m com 1 pano de tijolo por lado. A grade da rampa é a mesma da guardaHD.
function guardaR26(m, rampa, obra, texR26) {
  const cor = pbrTex('hd_corrego/bloco_cor_rug', true), nor = pbrTex('hd_corrego/bloco_normal', false); texR26.push(cor, nor);
  m.map = cor; m.normalMap = nor; m.normalScale.set(1, 1);
  m.onBeforeCompile = (s) => { mundo(s, 1.0, false, R26_GLSL);
    s.fragmentShader = s.fragmentShader.replace('#include <map_fragment>', `
      float hdRug = 1.0, hdMetal = 0.0, hdRel = 0.0; vec2 hdUvB = vec2(0.0); vec4 hdGrB = vec4(0.0);
      { float hdAx = abs(vHdPos.x), hdPiso = hdAx <= 5.0 ? 5.6 : hdAx <= 13.6 ? 5.6 * (1.0 - (hdAx - 5.0) / 8.6) : 0.0, hdAlt = vHdPos.y - hdPiso;
        ${rampa ? '' : 'if (hdAx > 4.95) discard;'}
        vec2 hdQ = vec2(vHdPos.x, vHdPos.y); vec3 hdGs = normalize(cross(dFdx(vHdPos), dFdy(vHdPos))), hdGn = abs(hdGs); float hdTopoF = step(0.7, hdGn.y);
        float hdBu = hdGn.x > hdGn.z ? vHdPos.z : vHdPos.x, hdLz = sign(vHdPos.z + 11.0), hdFora = step(0.5, hdGs.z * hdLz); vec2 hdQb = vec2(hdBu, hdAlt + 0.02);
        vec3 hdCor = hdBlocoR26(map, hdQb, smoothstep(0.42, 0.58, hdAlt) * (1.0 - hdFora), hdUvB, hdGrB); float hdResp = hdRespR26(hdQb, hdAlt);
        if (hdAx <= 4.95) {
          hdRel = 1.0;
          hdCor = mix(hdCor, vec3(0.30, 0.28, 0.24) * (0.85 + 0.3 * hdN(hdQb * 19.0)), 0.85 * hdResp);
          float hdEfL = 0.2 + 0.3 * hdN(vec2(hdBu * 1.3, 4.0)), hdEf = smoothstep(0.9 - hdEfL, 0.9, hdAlt) * smoothstep(0.35, 0.75, hdN(vec2(hdBu * 7.0, hdAlt * 0.7)) * 0.7 + hdN(hdQb * 23.0) * 0.3) * hdFora;
          hdCor = mix(hdCor, vec3(0.60, 0.57, 0.51), 0.45 * hdEf);
          ${obra ? `{ float hdX = vHdPos.x, hdSuja = step(0.0, hdLz), hdJ1 = mix(-1.6, -2.1, hdSuja), hdJ2 = mix(1.1, 0.9, hdSuja), hdJ3 = 3.6, hdFwX = fwidth(hdX);
            float hdPano = step(hdJ1, hdX) + step(hdJ2, hdX) + step(hdJ3, hdX);
            float hdTijP = mix(step(1.5, hdPano) * step(hdPano, 2.5), step(0.5, hdPano) * step(hdPano, 1.5), hdSuja);
            float hdChap = mix(step(hdPano, 0.5), step(1.5, hdPano) * step(hdPano, 2.5), hdSuja), hdReb = hdFora * (1.0 - hdTijP);
            vec2 hdBq = vec2(hdX / 0.40 + 0.5 * floor(hdAlt / 0.20), hdAlt / 0.20), hdBf = abs(fract(hdBq) - 0.5);
            float hdTele = (1.0 - smoothstep(0.004, 0.014, min((0.5 - hdBf.x) * 0.40, (0.5 - hdBf.y) * 0.20))) * smoothstep(0.03, 0.01, hdFwX);
            vec3 hdBase = mix(vec3(0.30, 0.29, 0.26), vec3(0.205, 0.195, 0.168), hdSuja) * mix(0.94, 1.06, hdH(vec2(hdPano, hdSuja + 3.0)));
            float hdChG = (hdN(hdQ * 55.0) - 0.5) * 0.5 * smoothstep(0.02, 0.006, hdFwX) + (hdN(hdQ * 23.0) - 0.5) * 0.3;
            vec3 hdRc = mix(hdBase * (0.92 + 0.16 * hdN(hdQ * vec2(3.0, 7.0))) * (1.0 - 0.10 * hdTele), hdBase * 0.74 * (1.0 + hdChG), hdChap);
            float hdJv = 1.0 - smoothstep(0.005, 0.012 + hdFwX * 1.5, min(min(abs(hdX - hdJ1), abs(hdX - hdJ2)), abs(hdX - hdJ3)));
            float hdEsL = 0.2 + 0.4 * hdN(vec2(hdX * 1.7, 9.0)), hdEs = smoothstep(0.60, 0.78, hdN(vec2(hdX * 3.1, 7.0)) * 0.7 + hdN(vec2(hdX * 17.0, 2.0)) * 0.3) * smoothstep(0.9 - hdEsL, 0.9, hdAlt);
            hdRc = mix(hdRc * (1.0 - 0.45 * hdJv), vec3(0.045, 0.050, 0.040), 0.7 * hdEs) * (1.0 - 0.25 * hdSuja * (1.0 - smoothstep(0.0, 0.25, hdAlt)));
            hdCor = mix(hdCor, hdRc * hdGrao(hdQ), hdReb); hdRel *= 1.0 - hdReb; }` : ''}
          hdCor = mix(hdCor, vec3(0.262, 0.250, 0.227) * (0.85 + 0.3 * hdN(vHdPos.xz * 9.0)), hdTopoF); hdRel *= 1.0 - hdTopoF;
          diffuseColor.rgb = hdCor * (1.0 - 0.3 * smoothstep(0.86, 0.895, hdAlt) * (1.0 - hdTopoF)); hdRug = 0.95;
        } else {
          float hdTopo = step(0.80, hdAlt) * (1.0 - step(0.86, hdAlt)), hdBase = step(0.10, hdAlt) * (1.0 - step(0.16, hdAlt));
          float hdPb = fract((vHdPos.x + 0.10) / 0.20) * 0.20, hdBarra = (1.0 - step(0.04, hdPb)) * step(0.10, hdAlt) * step(hdAlt, 0.86);
          float hdPu = fract((vHdPos.x + 0.7) / 1.4) * 1.4, hdPoste = max(1.0 - step(0.05, hdPu), step(abs(hdAx - 13.52), 0.03)) * step(0.0, hdAlt) * step(hdAx, 13.6);
          if (hdTopo + hdBase + hdBarra + hdPoste < 0.5) discard;
          float hdTinta = smoothstep(0.35, 0.5, hdN(hdQ * vec2(2.2, 4.0) + 2.0) * 0.65 + hdN(hdQ * 11.0) * 0.35);
          vec3 hdChumbo = vec3(0.075, 0.08, 0.09) * (0.85 + 0.3 * hdN(hdQ * vec2(5.0, 9.0)));
          vec3 hdAzul = vec3(0.07, 0.15, 0.26) * (0.85 + 0.3 * hdN(hdQ * 13.0));
          diffuseColor.rgb = mix(hdChumbo, hdAzul, 0.8 * hdTinta);
          float hdFerr = min(1.0, smoothstep(0.22, 0.02, hdAlt) * 0.85 + smoothstep(0.62, 0.8, hdN(hdQ * vec2(3.0, 11.0) + 5.0)) * 0.5);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.20, 0.09, 0.04), hdFerr);
          hdMetal = (1.0 - 0.8 * hdTinta) * (1.0 - 0.7 * hdFerr); hdRug = mix(0.55, 0.8, hdTinta) + 0.25 * hdFerr;
        } }`)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = min(1.0, roughness * hdRug * 2.0);')
      .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = min(1.0, metalness * 5.0 * hdMetal);')
      .replace('#include <normal_fragment_maps>', normalR26(0.153, 0.145)); };
  m.customProgramCacheKey = () => `corrego-r26-guarda3-${rampa ? 1 : 0}-${obra ? 1 : 0}`;
}
// Pilar da travessia, r26: fôrma de 2 tábuas por face, junta de concretagem, quina lascada, lama no pé, escorrido do topo, limo no leito.
// Risco: centro e meia-largura saem da planta (x ±1,5 | ±7,15 | ±9,73 | ±12,31; z −11 ± 1,05); se a planta mudar, isto muda junto.
function pilarR26(m) {
  m.onBeforeCompile = (s) => { mundo(s, 0, false, R26_GLSL);
    s.fragmentShader = s.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      float hdRug = 1.0; vec2 hdRelB = vec2(0.0); vec3 hdTanB = vec3(1.0, 0.0, 0.0);
      { float hdY = vHdPos.y, hdAx = abs(vHdPos.x), hdFw = fwidth(hdY); vec3 hdGn = abs(normalize(cross(dFdx(vHdPos), dFdy(vHdPos))));
        float hdLeito = step(hdAx, 4.0), hdCx = hdAx < 4.0 ? 1.5 : hdAx < 8.44 ? 7.15 : hdAx < 11.02 ? 9.73 : 12.31, hdCz = vHdPos.z < -11.0 ? -12.05 : -9.95, hdMeia = mix(0.11, 0.14, hdLeito);
        float hdDu = hdGn.x > hdGn.z ? vHdPos.z - hdCz : hdAx - hdCx, hdU = hdDu + hdMeia, hdBorda = hdMeia - abs(hdDu), hdIdP = hdCx * 3.0 + hdCz * 7.0 + sign(vHdPos.x);
        hdTanB = hdGn.x > hdGn.z ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0); vec2 hdQ = vec2(hdU + hdIdP + step(hdGn.z, hdGn.x) * 0.5, hdY);
        float hdH0 = hdY + 1.75 * hdLeito, hdTopoP = (hdAx <= 5.0 ? 5.6 : 5.6 * (1.0 - (hdAx - 5.0) / 8.6)) - 0.3, hdLat = 1.0 - step(0.7, hdGn.y), hdForaP = 1.0 - hdCorpoF(hdH0);
        float hdRx; float hdTab = hdFormaR26(hdU, hdY, hdMeia, hdRx); hdRelB.x = 0.8 * hdRx * hdLat;
        float hdTom = 1.0 + (hdN(vec2(hdQ.x * 1.7, hdY * 1.1)) - 0.5) * 0.10 + (hdN(hdQ * 9.0 + 2.0) - 0.5) * 0.05;
        float hdJy = hdH0 - 1.3 - 0.3 * (hdH(vec2(hdIdP, 3.0)) - 0.5) + 0.03 * (hdN(vec2(hdQ.x * 9.0, 3.0)) - 0.5) + 0.012 * (hdN(vec2(hdQ.x * 37.0, 5.0)) - 0.5);
        float hdJk = floor(hdJy / 1.4 + 0.5), hdJd = hdJy - hdJk * 1.4, hdTem = step(-0.5, hdJk) * step(hdY, hdTopoP - 0.25) * hdLat;
        float hdJl = (1.0 - smoothstep(0.004, 0.009 + hdFw * 1.5, abs(hdJd))) * smoothstep(0.06, 0.015, hdFw) * hdTem;
        hdRelB.y = sign(hdJd) * hdJl * 0.7;
        float hdNata = smoothstep(0.5, 0.75, hdN(vec2(hdQ.x * 23.0, hdJk * 5.0))) * smoothstep(-0.30 * (0.3 + 0.7 * hdN(vec2(hdQ.x * 11.0, hdJk + 3.0))), -0.01, hdJd) * step(hdJd, 0.0) * hdTem * hdForaP;
        float hdBich = smoothstep(0.60, 0.70, hdN(hdQ * vec2(7.0, 9.0) + 5.0)) * (1.0 - smoothstep(0.0, 0.14, abs(hdJd + 0.06))) * hdTem * hdForaP;
        float hdLasca = (1.0 - smoothstep(0.006, 0.032, hdBorda + 0.03 * (hdN(vec2(hdY * 9.0, hdIdP)) - 0.5))) * smoothstep(0.45, 0.6, hdN(vec2(hdY * 5.0, hdIdP + sign(hdDu) * 3.0)))
          * (1.0 - smoothstep(0.6, 0.85, hdH0)) * hdLat * smoothstep(0.03, 0.01, fwidth(hdU));
        float hdLama = (1.0 - smoothstep(0.12, 0.40, hdH0 + (hdN(vec2(hdQ.x * 13.0, 2.0)) - 0.5) * 0.16)) * (0.55 + 0.45 * hdN(hdQ * 21.0)) * (1.0 - hdLeito) * hdLat;
        float hdEl = 0.5 + hdN(vec2(hdQ.x * 9.0, 1.0)), hdEscT = smoothstep(0.55, 0.78, hdN(vec2(hdQ.x * 31.0, hdY * 0.3))) * (1.0 - smoothstep(0.0, hdEl, hdTopoP - hdY)) * step(1.95, hdH0) * hdLat;
        float hdYa = hdY + 1.61, hdSubP = 1.0 - smoothstep(-0.06, 0.02, hdYa);
        float hdLimoP = (1.0 - smoothstep(0.30, 0.62, hdYa + (hdN(vec2(hdQ.x * 3.0, 5.0)) - 0.5) * 0.14)) * smoothstep(-0.35, -0.02, hdYa) * (0.7 + 0.3 * hdN(hdQ * 7.0));
        float hdCrostaP = smoothstep(0.55, 0.62, hdYa) * (1.0 - smoothstep(0.68, 0.80, hdYa)) * smoothstep(0.35, 0.6, hdN(vec2(hdQ.x * 1.2, 3.0)));
        diffuseColor.rgb *= hdTom * hdTab * (1.0 + (hdGrao(hdQ) - 1.0) * 0.6) * (1.0 - 0.38 * hdJl) * (1.0 - 0.45 * hdBich * (0.6 + 0.4 * hdN(hdQ * 60.0)));
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 1.3 + vec3(0.03, 0.028, 0.024), 0.6 * hdNata);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.115, 0.108, 0.095) * (0.7 + 0.6 * hdN(hdQ * 70.0)), 0.9 * hdLasca);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.115, 0.102, 0.084), 0.8 * hdLama);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.045, 0.050, 0.040), 0.7 * hdEscT);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.07, 0.10, 0.05) * (0.7 + 0.6 * hdN(hdQ * 11.0)), 0.9 * hdLimoP);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.62, 0.60, 0.50), 0.45 * hdCrostaP);
        diffuseColor.rgb *= 1.0 - 0.5 * hdSubP;
        hdRug = 1.0 + 0.1 * hdLama + 0.2 * hdLimoP - 0.35 * hdSubP; }`)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = min(1.0, roughness * hdRug);')
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>' + R26_NORMAL); };
  m.customProgramCacheKey = () => 'corrego-r26-pilar1';
}
// Rua em três faixas (trilha batida nos eixos da planta, margem solta com brita e cacos, cimentado junto às paredes) + vala, remendos,
// poça na guia e tampa de ferro. Invariante: precisa do campo de distância às fachadas; sem ele quem entra é a chaoHD.
function chaoR26(m, poca, campo, texR26) {
  const pedra = pbrTex('hd_sertao/dry_ground_rocks_cor', true); texR26.push(pedra);
  m.map = tex('piso_cor_rug'); m.normalMap = tex('piso_normal', false); m.roughnessMap = null; m.roughness = 1; m.normalScale.set(1.1, 1.1); m.color.setHex(0xffffff);
  m.onBeforeCompile = (s) => { mundo(s, 1.9);
    s.uniforms.hdFachadas = { value: campo }; s.uniforms.hdPedra = { value: pedra };
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D hdFachadas; uniform sampler2D hdPedra;')
      .replace('#include <map_fragment>', `#include <map_fragment>
      float hdRug = 1.0, hdRel = 1.0; diffuseColor.a = 1.0;
      { vec2 hdP = vHdPos.xz; float hdFw = max(fwidth(hdP.x), fwidth(hdP.y)), hdAx = abs(vHdPos.x);
        float hdB = hdN(hdP * 0.23 + 3.1), hdM = hdN(hdP * 0.9 + 7.0), hdF = hdN(hdP * 3.7);
        vec4 hdFd = texture2D(hdFachadas, (hdP + vec2(24.0, 40.0)) / vec2(48.0, 80.0)); float hdDs = hdFd.r * 4.0;
        vec2 hdFn = hdFd.gb * 2.0 - 1.0; hdFn = length(hdFn) > 0.2 ? normalize(hdFn) : vec2(1.0, 0.0);
        float hdAo = dot(hdP, vec2(-hdFn.y, hdFn.x)), hdPerp = dot(hdP, hdFn);
        // Terra batida sem trinca: do dry_ground_rocks só entram a mancha (mip +4) e o pedrisco borrado (mip +2); a trinca fina dele some.
        float hdTerra = clamp(dot(texture2D(hdPedra, vec2(hdP.x * 0.83 + hdP.y * 0.56, hdP.y * 0.83 - hdP.x * 0.56) / 3.1, 4.0).rgb, ${LUMA}) / 0.070, 0.6, 1.5);
        vec4 hdCt = sampledDiffuseColor; float hdCl = dot(hdCt.rgb, ${LUMA}) / 0.118;
        float hdPl = dot(texture2D(hdPedra, hdP / 1.4 + 0.37, 2.0).rgb, ${LUMA}) / 0.08;
        float hdRua = smoothstep(15.2, 15.5, hdAx), hdZs = hdP.y - (hdP.x < 0.0 ? 3.7 : 0.0);
        float hdTz = min(min(abs(hdZs + 21.0), abs(hdZs + 8.7)), min(abs(hdZs - 11.1), abs(hdZs - 24.3)));
        float hdZw = hdZs + 0.3 * sin(hdP.x * 0.41 + 1.0), hdTzw = min(min(abs(hdZw + 21.0), abs(hdZw + 8.7)), min(abs(hdZw - 11.1), abs(hdZw - 24.3)));
        // Cimentado: hdDs = distância à fachada; borda por ruído em duas escalas, sem aresta reta (quase reta só na rua do spawn, sob a guia).
        float hdQl = (hdN(hdP * 0.62 + 2.0) - 0.5) * 0.9 * (1.0 - hdRua), hdAxV = hdAx + (hdN(hdP * 1.1 + 5.0) - 0.5) * 1.0;
        float hdQb = ((hdN(hdP * 2.6 + 4.0) - 0.5) * 0.34 + (hdN(hdP * 9.0) - 0.5) * 0.12) * mix(1.0, 0.25, hdRua);
        float hdWc = mix(0.74 + 0.16 * hdN(vec2(hdAo * 0.35, 2.0)), 1.22, hdRua), hdDsQ = hdDs + hdQb + hdQl * 0.45;
        float hdViela = (1.0 - smoothstep(1.30, 1.40 + hdFw * 1.5, hdTz + hdQb + hdQl * 0.6)) * smoothstep(7.2, 7.5, hdAxV) * (1.0 - smoothstep(15.3, 15.6, hdAxV));
        float hdCim = max(1.0 - smoothstep(hdWc - 0.01, hdWc + 0.012 + hdFw * 1.5, hdDsQ), hdViela);
        float hdDegC = (1.0 - hdCim) * (1.0 - smoothstep(0.0, 0.07, hdDsQ - hdWc)) * (1.0 - hdViela);
        // Trilha: distância ao eixo mais próximo (os três longitudinais e, entre a beira e a rua do spawn, os becos transversais).
        float hdW1 = sin(hdP.y * 0.21) * 0.35 + sin(hdP.y * 0.53 + 1.0) * 0.2;
        float hdDt = min(min(abs(hdAx - 20.6 - hdW1), abs(hdAx - 6.3 - hdW1 * 0.4)), abs(hdAx - 13.65 - hdW1 * 0.5));
        hdDt = min(hdDt, hdTzw + 9.0 * (1.0 - step(6.0, hdAx) * step(hdAx, 20.8)));
        float hdTri = (1.0 - smoothstep(0.55, 0.95, hdDt + (hdB - 0.5) * 0.5 + (hdF - 0.5) * 0.15)) * (1.0 - hdCim);
        float hdEnt = smoothstep(0.50, 0.70, hdN(hdP * 1.1 + 11.0) * 0.6 + hdF * 0.4) * (1.0 - hdTri);
        vec3 hdBrita = vec3(0.135, 0.122, 0.105) * hdPl;
        vec3 hdSolta = mix(vec3(0.152, 0.130, 0.104) * mix(0.86, 1.12, hdB) * mix(1.0, hdTerra, 0.7), hdBrita, 0.25 + 0.55 * hdEnt);
        float hdRoda = (1.0 - smoothstep(0.07, 0.17, abs(abs(hdAx - 20.6 - hdW1) - 0.62))) * hdRua * (0.5 + 0.5 * hdN(vec2(hdP.y * 0.7, 3.0)));
        float hdPe = smoothstep(0.62, 0.72, hdN(hdP * vec2(3.1, 5.3) + 9.0)), hdMoto = (1.0 - smoothstep(0.025, 0.07, hdDt)) * smoothstep(0.35, 0.6, hdN(hdP * 0.21 + 5.0));
        vec3 hdBatida = mix(vec3(0.142, 0.122, 0.098) * (0.93 + 0.14 * hdM) * mix(1.0, hdTerra, 0.5) * (1.0 - 0.13 * hdRoda - 0.08 * hdPe - 0.10 * hdMoto), hdBrita, 0.12);
        vec3 hdC = mix(hdSolta, hdBatida, hdTri) * (1.0 - 0.3 * hdDegC);
        // Pedrisco: seixo anguloso de 0,5–1,8 cm em 3 de cada 10 células de 7 cm (menos na trilha batida), com meia-luz; some abaixo de ~1 px.
        { vec2 hdSg = hdP / 0.07, hdSi = floor(hdSg), hdSf = fract(hdSg) - 0.5 - (vec2(hdH(hdSi + 21.0), hdH(hdSi + 29.0)) - 0.5) * 0.5;
          float hdSa = hdH(hdSi + 2.5) * 6.283, hdSk = hdH(hdSi + 5.5), hdSr = 0.07 + 0.19 * hdSk * hdSk;
          vec2 hdSq = vec2(hdSf.x * cos(hdSa) - hdSf.y * sin(hdSa), (hdSf.x * sin(hdSa) + hdSf.y * cos(hdSa)) * (1.2 + 0.7 * hdH(hdSi + 9.5)));
          float hdSd = mix(length(hdSq), max(abs(hdSq.x), abs(hdSq.y)) * 1.15, 0.6);
          float hdSeixo = step(0.70 + 0.2 * hdTri, hdH(hdSi + 13.5)) * (1.0 - smoothstep(hdSr - 0.04, hdSr + hdFw * 14.3, hdSd)) * smoothstep(0.02, 0.006, hdFw) * (1.0 - hdCim);
          hdC = mix(hdC, mix(vec3(0.19, 0.18, 0.16), vec3(0.090, 0.084, 0.075), hdH(hdSi + 7.5)) * (1.0 + 1.2 * (hdSf.x - hdSf.y)), 0.7 * hdSeixo); }
        { vec2 hdCg = hdP / 0.33, hdCi = floor(hdCg), hdCf = fract(hdCg) - 0.5 - (vec2(hdH(hdCi), hdH(hdCi + 7.0)) - 0.5) * 0.5;
          float hdCa = hdH(hdCi + 3.0) * 6.283, hdCs = 0.07 + 0.09 * hdH(hdCi + 5.0);
          vec2 hdCr = vec2(hdCf.x * cos(hdCa) - hdCf.y * sin(hdCa), hdCf.x * sin(hdCa) + hdCf.y * cos(hdCa));
          float hdCaco = step(0.80, hdH(hdCi + 13.0)) * (1.0 - smoothstep(0.0, 0.02 + hdFw * 4.5, max(abs(hdCr.x) - hdCs, abs(hdCr.y) - hdCs * 0.6))) * smoothstep(0.10, 0.03, hdFw) * (0.25 + 0.75 * hdEnt) * (1.0 - hdTri) * (1.0 - hdCim);
          hdC = mix(hdC, (hdH(hdCi + 17.0) < 0.55 ? vec3(0.30, 0.125, 0.065) : vec3(0.24, 0.235, 0.215)) * (0.8 + 0.4 * hdF), hdCaco); }
        { float hdCj = fract(hdAo / 1.8), hdCd = min(hdCj, 1.0 - hdCj) * 1.8, hdVisJ = smoothstep(0.08, 0.02, hdFw);
          float hdJc = (1.0 - smoothstep(0.005, 0.012 + hdFw * 1.5, hdCd)) * hdVisJ;
          float hdTc = floor(hdAo / 3.6), hdTx = hdAo - (hdTc + 0.5 + (hdH(vec2(hdTc, 3.0)) - 0.5) * 0.6) * 3.6;
          float hdTw = (hdN(vec2(hdTc * 7.31, hdPerp * 2.3)) - 0.5) * 0.5 + (hdN(vec2(hdTc * 3.7 + 9.0, hdPerp * 9.0)) - 0.5) * 0.08;
          float hdTrc = (1.0 - smoothstep(0.003, 0.006 + hdFw * 1.2, abs(hdTx - hdTw))) * hdVisJ;
          vec3 hdCimC = vec3(0.200, 0.190, 0.170) * hdCl * mix(0.93, 1.06, hdH(vec2(floor(hdAo / 1.8), floor(hdPerp * 0.5)))) * (0.94 + 0.12 * hdB);
          hdCimC *= (1.0 - 0.35 * hdJc) * (1.0 - 0.5 * hdTrc) * (1.0 - 0.22 * (1.0 - smoothstep(0.0, 0.25, hdDs)) * (0.6 + 0.4 * hdM));
          hdC = mix(hdC, hdCimC, hdCim); hdRug = mix(1.0, clamp(hdCt.a * 1.5, 0.55, 1.0), hdCim); hdRel = mix(1.0, 0.3, hdCim); }
        { vec2 hdRq = abs(hdP);
          float hdR1 = max(abs(hdRq.x - 20.3) - 0.60, abs(hdRq.y - 6.8) - 0.45), hdR2 = max(abs(hdRq.x - 13.6) - 0.45, abs(hdRq.y - 16.3) - 0.70);
          float hdR3 = max(abs(hdRq.x - 6.4) - 0.50, abs(hdRq.y - 2.6) - 0.65), hdR4 = max(abs(hdRq.x - 17.2) - 0.70, abs(hdRq.y - 7.2) - 0.50);
          float hdRd = min(min(hdR1, hdR2), min(hdR3, hdR4)) + (hdN(hdP * 1.7 + 3.0) - 0.5) * 0.50 + (hdN(hdP * 6.1) - 0.5) * 0.16;
          float hdRem = (1.0 - smoothstep(0.0, 0.015 + hdFw * 1.5, hdRd)) * (1.0 - hdCim), hdRemB = (1.0 - smoothstep(0.0, 0.05 + hdFw, abs(hdRd))) * (1.0 - hdCim);
          hdC = mix(hdC, vec3(0.215, 0.207, 0.188) * hdCl * (0.92 + 0.16 * hdM), hdRem) * (1.0 - 0.3 * hdRemB); hdRug = mix(hdRug, 0.8, hdRem); hdRel = mix(hdRel, 0.3, hdRem); }
        { float hdVx = abs(hdAx - 13.25 - 0.35 * sin(hdP.y * 0.45) - 0.12 * sin(hdP.y * 1.3 + 2.0));
          float hdZv = hdZs - 0.75 + 0.3 * sin(hdP.x * 0.7), hdVz = min(min(abs(hdZv + 21.0), abs(hdZv + 8.7)), min(abs(hdZv - 11.1), abs(hdZv - 24.3)));
          float hdVd = min(hdVx, hdVz + 9.0 * (1.0 - step(5.0, hdAx) * step(hdAx, 13.4))) + (hdN(hdP * 7.0) - 0.5) * 0.05;
          float hdVala = 1.0 - smoothstep(0.11, 0.135 + hdFw * 1.5, hdVd), hdLimoV = (1.0 - smoothstep(0.13, 0.26, hdVd)) * (1.0 - hdVala) * (0.5 + 0.5 * hdN(hdP * 5.0 + 3.0));
          hdC = mix(hdC, vec3(0.072, 0.098, 0.040) * (0.7 + 0.6 * hdF), 0.7 * hdLimoV);
          hdC = mix(hdC, vec3(0.040, 0.048, 0.043) * (0.8 + 0.4 * hdM), 0.92 * hdVala); hdRug = mix(hdRug, 0.28, hdVala); hdRel *= 1.0 - 0.8 * hdVala; }
        ${poca ? `{ float hdSarj = step(1.36, hdDs) * hdRua * (1.0 - hdCim);
          float hdPoG = smoothstep(0.72, 0.78, hdN(vec2(hdAo * 0.31, floor(hdPerp * 0.25) + 5.0)) + (hdN(hdP * 3.0 + 2.0) - 0.5) * 0.10) * (1.0 - smoothstep(1.75, 1.95, hdDs + (hdN(hdP * 2.1) - 0.5) * 0.3)) * hdSarj;
          float hdUmS = max(hdPoG, (1.0 - smoothstep(1.5, 1.8, hdDs)) * hdSarj * (0.5 + 0.5 * hdN(vec2(hdAo * 0.7, 1.0))));
          hdC = hdUmido(hdC, 0.4 * hdUmS) * (1.0 - 0.2 * hdUmS);
          hdC = mix(hdC, vec3(0.040, 0.048, 0.044), 0.9 * hdPoG); hdRug = mix(hdRug, 0.15, hdPoG); hdRel *= 1.0 - 0.9 * hdPoG; }` : ''}
        { vec2 hdBp = vec2(abs(hdP.x) - 15.6, abs(hdP.y) - 4.6), hdBc = vec2(hdBp.x * 0.985 - hdBp.y * 0.174, hdBp.x * 0.174 + hdBp.y * 0.985); float hdBr = length(hdBp);
          float hdCol = mix(max(abs(hdBc.x), abs(hdBc.y)), length(hdBc) * 0.82, 0.45) - 0.50 + (hdN(hdP * 4.3 + 6.0) - 0.5) * 0.22 + (hdN(hdP * 13.0) - 0.5) * 0.06 + smoothstep(0.55, 0.8, hdN(hdP * 2.9 + 1.0)) * 0.22 * step(0.0, hdBc.x + hdBc.y);
          float hdColar = (1.0 - smoothstep(0.0, 0.012 + hdFw * 1.5, hdCol)) * step(0.30, hdBr), hdTampa = 1.0 - smoothstep(0.295, 0.30 + hdFw * 1.5, hdBr), hdAnel = smoothstep(0.255, 0.26 + hdFw, hdBr) * hdTampa;
          vec2 hdXa = fract(hdBp / 0.055) - 0.5; float hdXad = (1.0 - smoothstep(0.25, 0.32, max(abs(hdXa.x), abs(hdXa.y)))) * smoothstep(0.03, 0.01, hdFw) * (1.0 - hdAnel);
          float hdTrC = (1.0 - smoothstep(0.004, 0.008 + hdFw * 1.2, abs(hdBc.x - 0.12 - (hdN(vec2(hdBc.y * 4.0, 7.0)) - 0.5) * 0.2))) * hdColar;
          hdC *= 1.0 - 0.3 * (1.0 - smoothstep(0.0, 0.06, hdCol)) * step(0.0, hdCol);
          hdC = mix(hdC, vec3(0.225, 0.215, 0.195) * hdCl * (1.0 - 0.5 * hdTrC), hdColar);
          hdC = mix(hdC, vec3(0.050, 0.046, 0.042) * (0.85 + 0.3 * hdM) * (1.0 + 0.5 * hdXad) * (1.0 + 0.4 * hdAnel), hdTampa);
          hdC = mix(hdC, vec3(0.105, 0.060, 0.035), 0.35 * hdTampa * smoothstep(0.5, 0.75, hdN(hdP * 11.0)));
          hdRug = mix(mix(hdRug, 0.75, hdColar), 0.6, hdTampa); hdRel = mix(hdRel, 0.25, max(hdColar, hdTampa)); }
        float hdGr = 1.0 + smoothstep(0.5, 0.12, hdFw * 34.0) * (hdN(hdP * 34.0) - 0.5) * 0.10 + smoothstep(0.5, 0.12, hdFw * 87.0) * (hdN(hdP * 87.0) - 0.5) * 0.06;
        diffuseColor.rgb = hdC * hdGr; }`)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = roughness * hdRug;')
      .replace('#include <normal_fragment_maps>', NORMAL_REL); };
  m.customProgramCacheKey = () => `corrego-r26-chao2-${poca ? 1 : 0}`;
}
// Telhado, r26: chapas de 1,06 × 2,24 m — 4 em 5 de fibrocimento (hd_corrego/fibro, 12 ondas × 1 recobrimento = 2,124 × 2,24 m), 1 em 5 de
// zinco. Na placa instanciada (USE_INSTANCING = addPlacaSB) a lateral é pintada como borda de chapa sobre terça; parede de chapa não muda.
function chapaR26(m, r, U, texR26) {
  const fibro = pbrTex('hd_corrego/fibro_cor_rug', true), fibroN = pbrTex('hd_corrego/fibro_normal', false); texR26.push(fibro, fibroN);
  m.map = tex('chapa_color'); m.normalMap = tex('chapa_normal', false); m.roughnessMap = null; m.roughness = .66; m.metalness = .35; m.normalScale.set(.6, .6);
  m.onBeforeCompile = (s) => { mundo(s, 1.0, 'caimento');
    s.uniforms.hdCerA = U.cerA; s.uniforms.hdCerB = U.cerB; s.uniforms.hdFibro = { value: fibro }; s.uniforms.hdFibroN = { value: fibroN };
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vHdLoc; varying vec3 vHdLn;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
      vHdLoc = position; vHdLn = normal;
      #ifdef USE_INSTANCING
        vHdLoc *= vec3(length(instanceMatrix[0].xyz), 1.0, length(instanceMatrix[2].xyz));
      #endif`);
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec4 hdCerA[6]; uniform vec4 hdCerB[6]; uniform sampler2D hdFibro; uniform sampler2D hdFibroN; varying vec3 vHdLoc; varying vec3 vHdLn;')
      .replace('#include <map_fragment>', `#include <map_fragment>
      float hdMetal = 1.0, hdRug = 1.0, hdRel = 1.0, hdTelha = 0.0, hdFibK = 0.0; vec3 hdNF = vec3(0.0, 0.0, 1.0); diffuseColor.a = 1.0;
      { vec2 hdQ = vec2(vHdPos.x + vHdPos.z, vHdPos.y);
        vec3 hdGn = normalize(cross(dFdx(vHdPos), dFdy(vHdPos))); hdTelha = smoothstep(0.35, 0.6, abs(hdGn.y)); float hdCorpoC = hdCorpoF(vHdPos.y) * (1.0 - hdTelha);
        { vec3 hdMedC = diffuse * texture2D(map, vMapUv, 5.0).rgb; diffuseColor.rgb = mix(diffuseColor.rgb, hdMedC * clamp(diffuseColor.rgb / max(hdMedC, vec3(1e-4)), 0.93, 1.07), hdCorpoC); }
        float hdPainel = hdN(vHdPos.xz * 0.35 + vec2(vHdPos.y * 0.3, 0.0)), hdF2 = hdN(vec2(hdQ.x * 1.3 + 4.1, hdQ.y * 2.2));
        float hdFerr = smoothstep(0.60, 0.82, hdN(hdQ * 0.9 + 2.0) * 0.6 + hdF2 * 0.4) * (1.0 - hdCorpoC) * (1.0 - 0.5 * hdTelha);
        vec2 hdFolha = vec2(vMapUv.x, vMapUv.y / 2.2), hdFr = fract(hdFolha), hdPx = fwidth(hdFolha);
        float hdEmV = 1.0 - smoothstep(0.0, 0.02 + hdPx.y * 2.0, hdFr.y * 2.2), hdEmU = 1.0 - smoothstep(0.0, 0.012 + hdPx.x * 2.0, hdFr.x);
        float hdTom = mix(1.0 + (hdPainel - 0.5) * 0.36 * (1.0 - 0.7 * hdCorpoC), mix(0.88, 1.10, hdH(floor(hdFolha))), hdTelha);
        diffuseColor.rgb *= hdTom * (1.0 - hdTelha * (0.45 * hdEmV + 0.25 * hdEmU));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.22, 0.12, 0.07) * (0.7 + 0.6 * hdF2), ${r.ferrugem.toFixed(2)} * hdFerr);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(dot(diffuseColor.rgb, ${LUMA})) * vec3(0.96, 1.0, 1.05) * 1.7, 0.88 * hdTelha * (1.0 - hdFerr));
        float hdOnda = cos(vMapUv.x * 81.68) * smoothstep(0.5, 0.12, hdPx.x * 13.0);
        diffuseColor.rgb *= 1.0 + 0.12 * hdOnda * hdTelha;
        hdMetal = (1.0 - 0.8 * hdFerr) * (1.0 - hdTelha); hdRug = 1.0 + 0.3 * hdFerr + 0.35 * hdTelha; hdRel = mix(1.0, 0.6, hdTelha);
        float hdCer = 0.0;
        for (int i = 0; i < 6; i++) { vec4 hA = hdCerA[i], hB = hdCerB[i]; vec2 hdDc = vHdPos.xz - hA.xy;
          vec2 hdLc = vec2(hdDc.x * hA.z - hdDc.y * hA.w, hdDc.x * hA.w + hdDc.y * hA.z);
          hdCer = max(hdCer, step(abs(hdLc.x), hB.x) * step(abs(hdLc.y), hB.y) * step(0.01, hB.x)); }
        hdCer *= hdTelha;
        if (hdCer > 0.0) {
          vec2 hdT = vec2(vMapUv.x / 0.20, vMapUv.y / 0.38); float hdTa = smoothstep(0.6, 0.15, fwidth(hdT.y));
          float hdRow = fract(hdT.y), hdCol = fract(hdT.x + 0.5 * step(0.5, fract(floor(hdT.y) * 0.5)));
          float hdOndaC = 0.5 + 0.5 * cos(hdCol * 6.2832), hdSombra = 1.0 - smoothstep(0.0, 0.18, hdRow);
          vec3 hdTer = vec3(0.34, 0.16, 0.09) * (0.8 + 0.4 * hdH(floor(hdT)));
          hdTer = mix(hdTer, vec3(0.22, 0.20, 0.16), 0.7 * step(0.86, hdH(floor(hdT) + 7.0)));
          hdTer = mix(hdTer, vec3(0.12, 0.14, 0.08), 0.5 * smoothstep(0.55, 0.75, hdN(vHdPos.xz * 1.1 + 3.0)));
          hdTer *= mix(1.0, (0.78 + 0.32 * hdOndaC) * (1.0 - 0.35 * hdSombra), hdTa);
          diffuseColor.rgb = mix(diffuseColor.rgb, hdTer, hdCer); hdMetal *= 1.0 - hdCer; hdRug = mix(hdRug, 1.3, hdCer); hdRel = mix(hdRel, 0.3, hdCer); }
        // v do mapa desce o caimento: o ladrilho entra com v invertido (alto da imagem = alto da água) e o recobrimento cai na divisa das chapas.
        vec2 hdUvF = vec2(vMapUv.x / 2.124, 0.5 - vMapUv.y / 2.24); vec3 hdFt = texture2D(hdFibro, hdUvF).rgb, hdFn2 = texture2D(hdFibroN, hdUvF).xyz * 2.0 - 1.0;
        if (hdTelha > 0.5 && hdCer < 0.5) {
          float hdUu = vMapUv.x, hdVv = vMapUv.y, hdCima = step(0.0, hdGn.y); vec2 hdCh = vec2(floor(hdUu / 1.062), floor(hdVv / 2.24)), hdPxS = vec2(fwidth(hdUu), fwidth(hdVv));
          float hdFu = fract(hdUu / 1.062) * 1.062, hdFv = fract(hdVv / 2.24) * 2.24, hdZn = step(0.8, hdH(hdCh + 31.0)), hdVelha = step(0.45, hdH(hdCh + 37.0));
          vec3 hdFib = hdFt * (mix(0.24, 0.16, hdVelha) / 0.507) * mix(0.92, 1.08, hdH(hdCh + 3.0));
          float hdLimoT = smoothstep(0.45, 0.8, hdN(vHdPos.xz * 0.9 + 3.0) * 0.6 + hdN(vHdPos.xz * 4.3) * 0.4) * hdVelha * hdCima;
          hdFib = mix(hdFib, vec3(0.085, 0.084, 0.068), 0.6 * hdLimoT);
          float hdBd = min(min(hdFu, 1.062 - hdFu), min(hdFv, 2.24 - hdFv));
          float hdFerZ = (1.0 - smoothstep(0.02, 0.16, hdBd + (hdN(vec2(hdUu, hdVv) * 9.0) - 0.5) * 0.12)) * (0.5 + 0.5 * hdN(vec2(hdUu, hdVv) * 23.0));
          vec2 hdPr = (vec2(fract(hdUu / 0.228), fract(hdVv / 1.12)) - 0.5) * vec2(0.228, 1.12);
          float hdPrego = (1.0 - smoothstep(0.008, 0.014 + hdPxS.y, length(hdPr))) * smoothstep(0.03, 0.01, hdPxS.y), hdPregoF = (1.0 - smoothstep(0.01, 0.07, length(hdPr * vec2(1.0, 0.35)))) * step(0.0, hdPr.y);
          float hdWz = cos(hdUu * 82.67) * smoothstep(0.45, 0.15, hdPxS.x * 13.16);
          vec3 hdZin = mix(vec3(0.30, 0.315, 0.325) * mix(0.9, 1.1, hdH(hdCh + 5.0)) * (1.0 + 0.10 * hdWz), vec3(0.22, 0.085, 0.035), min(1.0, 0.8 * hdFerZ + 0.6 * hdPregoF));
          hdZin = mix(hdZin, vec3(0.05), 0.8 * hdPrego) * (1.0 - 0.5 * (1.0 - smoothstep(0.0, 0.03 + hdPxS.y * 1.5, hdFv))) * (1.0 - 0.3 * (1.0 - smoothstep(0.0, 0.012 + hdPxS.x * 1.5, hdFu)));
          diffuseColor.rgb = mix(hdFib, hdZin, hdZn) * mix(0.8, 1.0, hdCima) * hdGrao(vHdPos.xz);
          float hdLisa = hdZn * (1.0 - hdFerZ);
          hdMetal = 0.5 * hdLisa; hdRug = mix(1.35, 0.85, hdLisa); hdRel = hdZn; hdFibK = 1.0 - hdZn;
          hdNF = normalize(vec3((hdFn2.x + 0.051) * 1.3, -(hdFn2.y + 0.145) * 1.3, hdFn2.z)); }
        #ifdef USE_INSTANCING
        if (abs(vHdLn.y) < 0.5) {
          float hdProf = 0.05 - vHdLoc.y, hdBeiral = step(0.5, abs(vHdLn.x)), hdEspC = 0.012 + hdBeiral * 0.012 * (0.5 + 0.5 * cos(vHdLoc.z * 35.5));
          float hdFolhaB = 1.0 - smoothstep(hdEspC, hdEspC + fwidth(hdProf) * 1.5 + 0.001, hdProf);
          vec3 hdMad = vec3(0.085, 0.070, 0.055) * (0.8 + 0.4 * hdN(vec2(mix(vHdLoc.x, vHdLoc.z, hdBeiral) * 3.0, hdProf * 90.0))) * (0.5 + 0.5 * smoothstep(hdEspC, hdEspC + 0.02, hdProf));
          diffuseColor.rgb = mix(hdMad, vec3(0.24, 0.235, 0.215), hdFolhaB); hdMetal = 0.0; hdRug = 1.3; hdRel = 0.0; hdFibK = 0.0; }
        #endif
      }`)
      .replace('#include <color_fragment>', aoMeio('mix(1.0, 0.2, hdTelha)'))
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = min(1.0, roughness * hdRug);')
      .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = metalness * hdMetal;')
      .replace('#include <normal_fragment_maps>', NORMAL_REL.replace('normal = normalize( tbn * mapN );', 'mapN = mix(mapN, hdNF, hdFibK);\n\tnormal = normalize( tbn * mapN );'))
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * 0.12 * hdTelha;'); };
  m.customProgramCacheKey = () => `corrego-r26-chapa2-${r.ferrugem}`;
}
// Barraco de passagem (matBar), r26: colcha de panos de 1,10 m (tábua hd_corrego/tabua, madeirite, zinco) no lugar do compensado claro.
// Faixa do corpo: mesma luma em todo pano, croma à metade; rodapé podre e remendo quente (OSB, lona) ficam fora dela.
function tapumeR26(m, texR26) {
  const cor = pbrTex('hd_corrego/tabua_cor_rug', true), nor = pbrTex('hd_corrego/tabua_normal', false); texR26.push(cor, nor);
  m.map = cor; m.normalMap = nor; m.roughnessMap = null; m.roughness = .9; m.metalness = .5; m.normalScale.set(1, 1); m.color.setHex(0xffffff);
  m.onBeforeCompile = (s) => { mundo(s, 1.0, false, R26_GLSL);
    s.fragmentShader = s.fragmentShader.replace('#include <map_fragment>', `
      float hdRug = 1.0, hdMetal = 0.0, hdRel = 0.0; vec2 hdRelB = vec2(0.0), hdUvB = vec2(0.0); vec3 hdTanB = vec3(1.0, 0.0, 0.0); vec4 hdGrB = vec4(0.0);
      { vec3 hdGn = abs(normalize(cross(dFdx(vHdPos), dFdy(vHdPos)))); float hdU = hdGn.x > hdGn.z ? vHdPos.z : vHdPos.x, hdY = vHdPos.y, hdTopoF = step(0.7, hdGn.y);
        hdTanB = hdGn.x > hdGn.z ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0); hdUvB = vec2(hdU, hdY) / vec2(1.10, 2.20); hdGrB = vec4(dFdx(hdUvB), dFdy(hdUvB));
        float hdRx, hdMt, hdTb; vec3 hdC = hdTapumeR26(map, vec2(hdU, hdY), hdCorpoF(hdY), hdRx, hdMt, hdTb) * hdGrao(vec2(hdU, hdY));
        diffuseColor.rgb = mix(hdC, vec3(0.10, 0.085, 0.07), hdTopoF); diffuseColor.a = 1.0;
        hdRelB.x = hdRx * (1.0 - hdTopoF); hdMetal = hdMt * (1.0 - hdTopoF); hdRug = 1.0 - 0.35 * hdMetal; hdRel = hdTb * (1.0 - hdTopoF); }`)
      .replace('#include <color_fragment>', aoMeio(0.35))
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = roughness * hdRug;')
      .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = metalness * hdMetal;')
      .replace('#include <normal_fragment_maps>', normalR26(0.027, 0.122) + R26_NORMAL); };
  m.customProgramCacheKey = () => 'corrego-r26-tapume2';
}
// Cumeeira autoral (instância de 0,34 × 0,12 m da placa de referência 3,4 × 0,1 × 5,6): as águas sobem para fora e ela flutua sobre o
// vale como tábua em lança. Vai a escala zero por instância; a matriz volta em desliga().
function cumeeirasR26(scene) {
  const feitos = [];
  scene.traverse((o) => {
    if (!o.isInstancedMesh || !o.geometry?.attributes?.position) return;
    const g = o.geometry; if (!g.boundingBox) g.computeBoundingBox(); const b = g.boundingBox; if (!b) return;
    if (Math.abs(b.max.x - b.min.x - 3.4) > .05 || Math.abs(b.max.y - b.min.y - .1) > .02 || Math.abs(b.max.z - b.min.z - 5.6) > .05) return;
    const a = o.instanceMatrix.array, copia = a.slice(); let mudou = false;
    for (let i = 0; i < o.count; i++) { const k = i * 16, w = Math.hypot(a[k], a[k + 1], a[k + 2]) * 3.4, h = Math.hypot(a[k + 4], a[k + 5], a[k + 6]) * .1;
      if (w < .01 || w > .5 || h > .14) continue; for (let j = 0; j < 12; j++) a[k + j] = 0; mudou = true; }
    if (mudou) { o.instanceMatrix.needsUpdate = true; feitos.push(() => { a.set(copia); o.instanceMatrix.needsUpdate = true; }); }
  });
  return () => { for (const f of feitos) f(); };
}

// Luz: o hemisfério do look (céu 0xd8b89a / chão 0x4a3830) esmagava a sombra em preto quente. Sobe e esfria o
// hemisfério; o sol (e scene.userData.__sf.dir) não muda.
function luzHD(scene, { hemi = 1.45, ceu = 0xc3ccd6, chao = 0x6b625a, sol = 1 } = {}) {
  let s = null, h = null; scene.traverse((o) => { if (o.isDirectionalLight && o.castShadow) s = o; if (o.isHemisphereLight) h = o; });
  if (!h) return () => {};
  const antes = { hemi: h.intensity, ceu: h.color.getHex(), chao: h.groundColor.getHex(), sol: s?.intensity };
  h.intensity = antes.hemi * hemi; h.color.setHex(ceu); h.groundColor.setHex(chao); if (s) s.intensity = antes.sol * sol;
  return () => { h.intensity = antes.hemi; h.color.setHex(antes.ceu); h.groundColor.setHex(antes.chao); if (s) s.intensity = antes.sol; };
}

export function aplicaCorregoHD(scene, renderer, opts = {}) {
  const q = new URLSearchParams(typeof location === 'undefined' ? '' : location.search);
  const liga = (k, flag) => opts[k] !== false && q.get(flag) !== '0';
  const o = { texturas: opts.texturas !== false,
    madeira: liga('madeira', 'hdmadeira'), chao: liga('chao', 'hdchao'), mato: liga('mato', 'hdmato'),
    reboco: liga('reboco', 'hdreboco'), canal: liga('canal', 'hdcanal'), bloco: liga('bloco', 'hdbloco'), janela: liga('janela', 'hdjanela'),
    eletro: liga('eletro', 'hdeletro'), espuma: liga('espuma', 'hdespuma'), travessia: liga('travessia', 'hdtravessia'), poca: opts.poca !== false && q.get('hdpoca') !== '0' };
  // r26: uma chave geral e uma por frente; com a geral desligada nenhuma função r26 roda e o kit é o da rodada anterior.
  o.r26 = liga('r26', 'hdr26');
  for (const k of ['tijolo', 'rua3', 'obra', 'telha', 'tapume', 'estaca']) o[k] = o.r26 && liga(k, `hd${k}`);
  // Cenografia sem colisão (hd_cenografia_corrego.js). Desliga tudo: opts.cenografia === false ou ?hdcen=0;
  // por item: opts.cenografia.{postes,...} === false ou ?hdcen=postes,fios (só os listados). `guarda` (tubos da rampa da
  // travessia) só existe com a travessia de concreto: o shader da guarda descarta a mureta da rampa quando ela entra.
  const ITENS = ['postes', 'fachadas', 'palafitas', 'lajes', 'telhados', 'canal', 'margem', 'varais', 'roupas', 'sacos', 'toldos', 'comercio', 'guias', 'skyline', 'portoes', 'becos', 'guarda'];
  const qCen = q.get('hdcen'), soEstes = qCen && qCen !== '0' && qCen !== '1' ? qCen.split(',') : null;
  const oCen = opts.cenografia === false || qCen === '0' ? null : { ...(opts.cenografia || {}) };
  if (oCen && soEstes) for (const k of ITENS) if (!soEstes.includes(k)) oCen[k] = false;
  if (oCen && !o.canal) { oCen.canal = false; oCen.margem = false; }
  const guardaCen = !!oCen && oCen.guarda !== false && o.travessia; if (oCen) oCen.guarda = guardaCen;
  const antes = [], aniso = [], feitos = new WeakSet(), marcados = new Set(), casados = new Set(), desfazVaos = [], criadas = [], texR26 = [];
  const U = { janelas: { value: null }, portas: { value: null }, cerA: { value: Array.from({ length: 6 }, () => new THREE.Vector4()) }, cerB: { value: Array.from({ length: 6 }, () => new THREE.Vector4()) } };
  const mundoJogo = opts.mundo || (typeof window !== 'undefined' ? window.__game?.world : null);
  // ?hdcalcada=0: chão com a lista fixa de |x| (sem campo de fachadas); sem colisores o campo também não existe.
  const campo = o.chao && o.texturas && q.get('hdcalcada') !== '0' ? campoFachadas(mundoJogo?.colliders) : null;
  // Tira autoral de limo no TOPO do muro do canal (matLimo, 0,36 × 0,08 m em y −0,04…0,04): o lip de 4 cm fora da guia, virado
  // ao sol, era a linha branca pontilhada de 1 px na aresta do canal (`ponte`, `alto`). Some; a faixa da linha d'água (0,5 m) fica.
  const escondidos = [], limoTopo = (obj) => { if (obj.userData.hdLimoVisto) return; obj.userData.hdLimoVisto = true;
    const g = obj.geometry; if (!g.boundingBox) g.computeBoundingBox(); const b = g.boundingBox;
    if (b.max.y - b.min.y < 0.12 && obj.visible) { obj.visible = false; escondidos.push(obj); } };
  let vivo = true, tempo = 0;
  const aplica = (m, r, obj) => {
    antes.push({ m, map: m.map, normalMap: m.normalMap, roughnessMap: m.roughnessMap, cor: m.color.getHex(), emissive: m.emissive.getHex(), roughness: m.roughness, metalness: m.metalness, opacity: m.opacity, ns: m.normalScale.x, vc: m.vertexColors, obc: m.onBeforeCompile, key: m.customProgramCacheKey });
    if (r.cor !== undefined) m.color.setHex(r.cor);
    if (r.rugosidade !== undefined) m.roughness = r.rugosidade;
    if (r.metal !== undefined) m.metalness = r.metal;
    if (r.opacidade !== undefined) m.opacity = r.opacidade;
    if (r.semMapa) { m.map = null; m.normalMap = null; m.roughnessMap = null; }
    if (r.janela) { if (!U.janelas.value) criadas.push(U.janelas.value = atlasJanelas(), U.portas.value = atlasPortas()); const d = marcaVaos(obj); if (d) desfazVaos.push(d); }
    if (r.concreto || r.semEmissivo) m.emissive.setHex(0x000000);
    if (r.chao) { if (o.rua3 && campo) chaoR26(m, o.poca, campo, texR26); else chaoHD(m, o.poca, campo); } else if (r.reboco) rebocoHD(m);
    else if (r.bloco) { if (o.tijolo) tijoloR26(m, texR26); else blocoHD(m); } else if (r.janela) janelaHD(m, U); else if (r.concreto) concretoHD(m, r);
    else if (r.chapa) { if (o.telha) chapaR26(m, r, U, texR26); else chapaHD(m, r, U); } else if (r.tapume) tapumeR26(m, texR26); else if (r.madeira) madeiraHD(m, r, texR26); else if (r.linhaDagua) linhaDaguaHD(m);
    // Cor pura com shader próprio: ?hdeletro=0 deixa só a cor/rugosidade da regra (fallback chapado, nunca o material original).
    else if (r.geladeira) { if (o.eletro) geladeiraHD(m); } else if (r.pilar) { if (o.eletro) { if (o.obra) pilarR26(m); else pilarHD(m); } } else if (r.saco) sacoHD(m);
    else if (r.guarda) { if (o.tijolo) guardaR26(m, !guardaCen, o.obra, texR26); else guardaHD(m, !guardaCen); } else if (r.espuma) espumaHD(m); else if (r.limo) { limoHD(m); limoTopo(obj); }
    for (const t of [m.map, m.normalMap]) if (t && t.anisotropy < 8) { aniso.push([t, t.anisotropy]); t.anisotropy = 8; t.needsUpdate = true; }
    // dispose() solta os programas antigos do material (o three guarda todas as variantes até lá).
    m.dispose(); m.needsUpdate = true;
  };
  // Regra efetiva: a r26 acrescenta marcas à regra da rodada anterior (ou troca a do barraco), só com a frente ligada.
  const regraDe = (chave) => { const r = REGRAS[chave]; if (!r) return r;
    if (o.obra && chave === 'concrete_br|9d968a') return { ...r, forma: true };
    if (o.obra && chave === 'tex_madeira|9a8f7e') return { ...r, escada: true };
    if (o.rua3 && campo && chave === 'concrete_br|8f8b80') return { ...r, vala: true };
    if (o.tapume && chave === 'tex_madeira|b08a6a') return { tapume: true, cor: 0xffffff, frente: 'madeira' };
    if (o.tapume && chave === 'tex_madeira|ffffff') return { ...r, colcha: true };
    return r; };
  // Casamento por chave; material cujo mapa ainda não chegou fica pendente e volta na próxima passada. O vão é o único
  // que precisa do mesh (atributos): se o mesmo material aparecer noutro mesh, este também ganha os atributos.
  const casa = () => { let pendentes = 0;
    scene.traverse((obj) => { if (!obj.isMesh || obj.isSkinnedMesh) return; for (const m of materiaisDe(obj)) { if (!m.isMeshStandardMaterial) continue;
      if (feitos.has(m)) { if (m.userData.hdChave === 'concrete_br|2b2a27' && o.janela) { const d = marcaVaos(obj); if (d) desfazVaos.push(d); } if (m.userData.hdChave === 'canvas512|3e5c40' && o.canal) limoTopo(obj); continue; }
      if (m.map && !nomeDe(m.map)) { pendentes++; continue; }
      const chave0 = chaveDe(m), chave = chave0 === 'tex_madeira|ffffff' && m.map.repeat.x === 1 && m.map.repeat.y === 1 ? `${chave0}|guarda` : chave0, r = regraDe(chave); feitos.add(m); m.userData.hdChave = chave; marcados.add(m);
      if (!r || (r.frente && !o[r.frente])) continue;
      casados.add(chave); aplica(m, r, obj); } });
    return pendentes; };
  if (o.texturas) { const t0 = performance.now(); const passo = () => { if (!vivo) return; if (casa() && performance.now() - t0 < 20000) tempo = setTimeout(passo, 300); }; passo(); }
  const r26 = { tijolo: o.tijolo, rua3: o.rua3 && !!campo, obra: o.obra, telha: o.telha, tapume: o.tapume, estaca: o.estaca };
  const ceramicos = [], cen = oCen ? cenografiaCorrego(scene, { ...oCen, mundo: mundoJogo, ceramicos, r26 }) : null;
  const desfazCume = o.telha ? cumeeirasR26(scene) : () => {};
  // Telhados cerâmicos escolhidos pela cenografia (1 em 4 + palafita da pose `alto`): caixa orientada (x, z, cos, sin) e meios-lados.
  ceramicos.slice(0, 6).forEach((c, i) => { U.cerA.value[i].set(c.x, c.z, c.cs, c.sn); U.cerB.value[i].set(c.ha, c.hb, 0, 0); });
  const desfazEspuma = o.canal ? afundaEspuma(scene) : () => {};
  const desfazAgua = o.canal ? aguaHD(scene, o.espuma) : () => {}, desfazProps = o.texturas ? propsGLB(scene) : () => {};
  const desfazMato = o.mato && o.chao ? matoHD(scene, 6.5, !!cen && oCen.margem !== false) : () => {}, desfazRoupas = cen && oCen.roupas !== false ? roupasHD(scene) : () => {};
  const desfazSacos = cen && oCen.sacos !== false ? sacosHD(scene) : () => {}, desfazGatos = cen && oCen.postes !== false ? gatosHD(scene) : () => {};
  const desfazLuz = opts.luz === false || q.get('hdluz') === '0' ? () => {} : luzHD(scene, opts.luz || {});
  return { alvos: casados, cenografia: cen, r26, desliga() {
    vivo = false; clearTimeout(tempo);
    for (const s of antes) { Object.assign(s.m, { map: s.map, normalMap: s.normalMap, roughnessMap: s.roughnessMap, roughness: s.roughness, metalness: s.metalness, opacity: s.opacity, vertexColors: s.vc, onBeforeCompile: s.obc, customProgramCacheKey: s.key });
      s.m.color.setHex(s.cor); s.m.emissive.setHex(s.emissive); s.m.normalScale.set(s.ns, s.ns); s.m.dispose(); s.m.needsUpdate = true; }
    for (const [t, an] of aniso) { t.anisotropy = an; t.needsUpdate = true; }
    for (const m of marcados) delete m.userData.hdChave;
    for (const obj of escondidos) { obj.visible = true; delete obj.userData.hdLimoVisto; }
    for (const d of desfazVaos) d();
    campo?.dispose();
    for (const t of criadas) t.dispose();
    for (const t of new Set(texR26)) t.dispose();
    cen?.desliga(); desfazAgua(); desfazProps(); desfazMato(); desfazRoupas(); desfazSacos(); desfazGatos(); desfazLuz(); desfazEspuma(); desfazCume();
  } };
}
