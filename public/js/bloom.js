// Pós-processamento (FASE 4/5/6) — composer por cena, SEM tocar no game.js.
// RenderPass → SSAO (half-res, depth-only) → [vmPass] → UnrealBloomPass → CompositePass
// (AgX calibrado + vinheta + piso de ambiente) → AA/Sharpen/Grain.
//
// PORQUÊ das mudanças da R7 (crítica de gráficos, nota 3.2):
//  (1) Não existia NENHUMA fonte de oclusão ambiental no projeto — props liam como
//      "adesivo colado no chão". Entra SSAO escrito à mão (o vendor é r160, N8AO exige
//      r161+ e o npm está bloqueado), reconstruindo posição de view a partir do
//      depthTexture do render target do composer + inverse projection.
//  (2) A imagem estava ~1.5 stop subexposta e crushada: uLook.power 1.25 é uma gama
//      aplicada DEPOIS da normalização log2 do AgX — ela puxa todo o meio-tom pra baixo.
//      Agora power 1.0, exposure por mapa e um piso de ambiente suave (o "clamp do
//      indirect lighting cache" da Riot) que impede sombra virar #000 sem informação.
//  (3) renderer.toneMapping é alavanca MORTA com composer (three só aplica tonemap quando
//      o alvo é null) — main.js agora deixa NoToneMapping explícito quando o composite
//      está ativo, pra não haver dúvida de tonemap duplo.
//  (4) Sem MSAA no composer (target HDR) a imagem serrilhava: FXAA barato + sharpen leve
//      pós-tonemap no último passe (grain migrou pra lá, senão o sharpen amplifica ruído).
//  (5) Foco dinâmico do shadow map do sol em volta do jogador: 12.8 cm/texel → ~2.2 cm/texel.
import * as THREE from 'three';
import { EffectComposer } from '../vendor/addons/postprocessing/EffectComposer.js';
import { RenderPass } from '../vendor/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../vendor/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from '../vendor/addons/postprocessing/ShaderPass.js';
import { OutputPass } from '../vendor/addons/postprocessing/OutputPass.js';
import { Pass, FullScreenQuad } from '../vendor/addons/postprocessing/Pass.js';

const QP = () => new URLSearchParams(location.search);

/* ================================================================
   LOOK POR MAPA — exposição e piso de ambiente
   Os 4 mapas dividiam a MESMA exposição, e eles não têm nada a ver um com o outro
   (Brasília meio-dia vs. Ferro Velho fim de tarde). Medição do crítico: awp_map com
   L* médio 8.5 e 22.7 % dos pixels abaixo de L* 3 — o mapa mais escuro leva a maior
   exposição. `floor` é um piso ADITIVO SUAVE em luz linear (bounce/GI que o jogo não
   simula): em hdr=0 vale `floor`, e some sozinho conforme hdr cresce — não achata highlight.
   Override pra tuning do lead: ?exp=1.7&floor=0.014
   ================================================================ */
// RECALIBRAÇÃO R8 — a R7 calibrou olhando o frame MAIS ESCURO de cada mapa e inverteu a
// ordem de exposição entre eles: o awp_map tinha um frame de spawn bugado (L* 8,4) que não
// era exposição, era bug — e a média real do mapa era 25,9. Resultado medido nos 32 frames
// da r1: awp_map 50,3 (estourado) e o Piscinão — praia, céu aberto, meio-dia — virou o mais
// ESCURO dos quatro com 40,5. Além disso o piso 0.016/0.013 matou o preto: 0,00 % do frame
// abaixo de L* 3 em TODOS os mapas (o alvo era < 1 %, não zero) e p1 subindo pra 13-20.
//
// Agora a calibração é NUMÉRICA e pela MÉDIA dos 8 frames de cada mapa: `tools/eval/tone_calib.py`
// inverte este mesmo composite em cima dos PNGs de /root/shots/r1 (matriz, AgX e piso todos
// invertidos analiticamente — o round-trip bate a média medida com erro < 0,1 L*), recupera o
// HDR linear da cena e resolve exposição + piso pra bater dois alvos ao mesmo tempo:
//   exposição -> L* médio alvo do mapa   |   piso -> ~1 % dos pixels abaixo de L* 3.
// Previsão (média dos 8 frames): pool_day 48,1 > havan 46,0 > awp_map 44,1 > ferrovelho 42,0,
// com p1 ≈ 3 e blk 0,86-1,03 % em todos. `expAces` é só o fallback de ?lowtone=0.
//
// AJUSTE R9 — SÓ DOIS MAPAS SE MEXEM. Medição dos 8 frames de cada mapa em /root/shots/r2
// (frame inteiro, sem máscara): pool_day 45,20 e ferrovelho 39,86 estão no alvo ou na borda
// e ficam INTOCADOS. Os outros dois saíram do lugar:
//   • awp_map  L* médio 36,36 (alvo 42-48) — a laje de asfalto de awp-169-a mede L* 15,0
//     com mínimo 0,8: voltou a ser buraco preto. Exposição 1,63 -> 2,40.
//   • fy_havan 2,295 % do frame em L* < 3 (limite 1,0 %) — o asfalto do estacionamento
//     estava ESMAGADO, não escuro. Aqui o remédio é o PISO, não a exposição: com
//     floor·exposure ≈ 0,0090 o pixel mais escuro possível cai em L* ≈ 4,2 (acima do 3)
//     em vez de 3,04, que era exatamente em cima da linha. Exposição 1,24 -> 1,50.
// Ambos resolvidos por `tools/eval/tone_r3.py`, que inverte ESTE composite em cima dos PNGs
// da r2 (round-trip bate a média medida com erro < 0,02 L* e o %blk com erro < 0,02 pp).
// Previsão: awp_map 36,4 -> 42,3 com blk 0,00 % e p1 5,0;  havan 40,4 -> 43,6 com blk
// 2,26 % -> 0,00 % e p1 2,6 -> 4,0.
const LOOKS = {
  awp_map:       { exposure: 2.40, floor: 0.0042, expAces: 2.61 },   // Brasília, meio-dia seco
  fy_pool_day:   { exposure: 1.92, floor: 0.0039, expAces: 1.91 },   // Piscinão: TEM que ser o mais claro
  fy_havan:      { exposure: 1.50, floor: 0.0060, expAces: 1.59 },
  fy_ferrovelho: { exposure: 1.66, floor: 0.0041, expAces: 1.76 },
  fy_quebrada:   { exposure: 1.58, floor: 0.0046, expAces: 1.68 },   // Rio, rua do baile ao entardecer
  fy_escadao:    { exposure: 1.52, floor: 0.0048, expAces: 1.62 },   // Rio, escadaria em golden hour
  fy_campomorro: { exposure: 1.60, floor: 0.0048, expAces: 1.70 },   // várzea aberta, terra quente
  fy_lajes:      { exposure: 1.55, floor: 0.0047, expAces: 1.65 },   // lajes claras, sombras de beco
  fy_corrego:    { exposure: 1.42, floor: 0.0054, expAces: 1.52 },   // SP cinzenta, água e zinco escuros
  fy_mansao:     { exposure: 1.36, floor: 0.0043, expAces: 1.46 },   // Joá dourado, mármore e oceano
};
// id desconhecido cai no awp_map em maps.js (DEFAULT_MAP) — o look padrão tem que ser o
// MESMO, senão o mapa que roda e a curva que é aplicada divergem.
const DEFAULT_LOOK = { exposure: 2.40, floor: 0.0042, expAces: 2.61 };
// saturação do AgX (uLook.z). A R7 baixou 1.05→1.02 E empurrou a exposição pro ombro do AgX,
// que dessatura por construção — somados, derrubaram a saturação HSV medida em 30-64 %
// (ferro velho 0,54→0,27). Com a exposição de volta ao lugar, 1.12 devolve 21-42 % disso.
const LOOK_SAT = 1.12;

function currentMapId() {
  try {
    return QP().get('map') || (JSON.parse(localStorage.getItem('awpbr_settings') || '{}').map) || null;
  } catch (e) { return null; }   // localStorage bloqueado — cai no default
}
function currentQuality() {
  try {
    return QP().get('q') || (JSON.parse(localStorage.getItem('awpbr_settings') || '{}').quality) || 'med';
  } catch (e) { return 'med'; }
}

function currentLook() {
  const id = currentMapId();
  const base = LOOKS[id] || DEFAULT_LOOK;
  const q = QP();
  const exp = parseFloat(q.get('exp'));
  const flo = parseFloat(q.get('floor'));
  const sat = parseFloat(q.get('sat'));
  return {
    exposure: isFinite(exp) ? exp : base.exposure,
    floor: isFinite(flo) ? flo : base.floor,
    sat: isFinite(sat) ? sat : LOOK_SAT,
    expAces: isFinite(exp) ? exp : base.expAces,
  };
}

/* ================================================================
   PERSPECTIVA AÉREA — FogExp2 radial + cor de névoa dependente da direção do olhar
   ================================================================
   O DEFEITO (medido nas três rodadas): a razão de contraste local LONGE/PERTO era 1,13-2,42
   nos quatro mapas — o FUNDO do frame com MAIS microcontraste que o primeiro plano, que é o
   inverso exato do que a atmosfera faz. Somado a isso, em awp-169-a havia uma BORDA DURA de
   terreno distante (o plano de chão de 420 × 460 m acaba a ~220 m e a névoa linear só tinha
   apagado 43 % dele naquele ponto: uma parede de neblina com aresta).
   Três correções, todas aqui pra valerem nos quatro mapas de uma vez:

   (1) `THREE.Fog` linear -> `THREE.FogExp2`. A névoa linear é ZERO até `near` e depois sobe
       em rampa: ou ela vela a lane de tiro, ou não chega a apagar o fim do mapa. A
       exponencial ao quadrado é ~0 nos primeiros 30 m (f < 4 %) e satura sozinha depois de
       200-300 m — que é exatamente o perfil da atmosfera real e o que mata a borda dura.

   (2) DISTÂNCIA RADIAL em vez de profundidade planar. O three usa `-mvPosition.z`, então
       um pixel no canto do frame (que está mais LONGE que o do centro, para o mesmo z de
       view) recebia MENOS névoa — é a "parede de névoa" curva que aparece quando se gira a
       câmera. Aqui vFogPosV carrega a posição de view inteira e a distância é `length()`.

   (3) COR DA NÉVOA POR DIREÇÃO DO OLHAR. Espalhamento de Mie é fortemente para a frente:
       olhando NA direção do sol a névoa é clara e quente (o "glow" de contraluz); olhando
       de costas ela é escura e azul. Uma cor fixa é o que fazia o horizonte do Ferro Velho
       (fog 0xd9b98c, bege) brigar com o céu azul medido logo acima da silhueta (0xa5c5e5) —
       e é a briga que desenha a aresta. As duas pontas são DERIVADAS de `fog.color` em luz
       linear (não são duas cores soltas que alguém tem que manter em sincronia).

   As cores-base de cada mapa NÃO foram escolhidas no olho: `tools/eval/r3_fog.py` recorta,
   nos 8 frames de cada mapa, as 14 linhas de céu imediatamente acima da silhueta, inverte
   este composite inteiro (AgX + piso + vinheta + exposição) e devolve a radiância linear
   medida. Onde o terreno encontra o céu, névoa e céu passam a ter o MESMO valor.

   Kill-switches: `?fog2=0` (volta ao fog linear de antes, por mapa) · `?nofog=1` (sem
   névoa nenhuma, já existia) · `?fogd=0.008` (densidade manual, p/ A/B do capturador).
   Degradação: em quality 'low' a componente direcional é desligada (uFogSun.w = 0), o que
   remove ~12 ALU/fragmento e faz o shader cair no `fogColor` puro — a névoa continua lá.
*/
const AERIAL = {
  //                 densidade   cor-base medida do céu    direção do sol (posição da
  //                             logo acima da silhueta     DirectionalLight do mapa)
  awp_map:       { d: 0.0066, color: 0x7d9cbb, sun: [90, 62, -40], dir: 0.90 },
  fy_pool_day:   { d: 0.0078, color: 0x93b9df, sun: [14, 76, -9],  dir: 0.85 },
  fy_havan:      { d: 0.0088, color: 0xa3c4e5, sun: [18, 55, 20],  dir: 0.80 },
  fy_ferrovelho: { d: 0.0112, color: 0xa5c5e5, sun: [-46, 20, 32], dir: 1.00 },
  fy_quebrada:   { d: 0.0084, color: 0xb58f78, sun: [38, 30, -22], dir: 0.82 },
  fy_escadao:    { d: 0.0080, color: 0xb9977f, sun: [25, 40, 20], dir: 0.86 },
  fy_campomorro: { d: 0.0082, color: 0xb48b70, sun: [28, 38, 18], dir: 0.84 },
  fy_lajes:      { d: 0.0085, color: 0xb18f79, sun: [25, 45, 15], dir: 0.84 },
  fy_corrego:    { d: 0.0102, color: 0x9d7768, sun: [20, 35, 15], dir: 0.72 },
  fy_mansao:     { d: 0.0068, color: 0xc4a77e, sun: [30, 32, 24], dir: 0.94 },
};
const AERIAL_DEFAULT = AERIAL.awp_map;

// Uniform COMPARTILHADO por todos os materiais. Float32Array de propósito: `cloneUniforms`
// do three clona Color/Vector/Matrix mas passa TypedArray por REFERÊNCIA — então um único
// array aqui chega em cada material sem varredura nem sincronia por frame. xyz = direção
// do sol em MUNDO, w = força do termo direcional (0 desliga o bloco inteiro no shader).
const _fogSun = new Float32Array([0, 1, 0, 0]);

// mesma matemática do FogExp2 do three, só que sobre a distância RADIAL (ver (2) acima)
const FOG_VERT_PARS = '#ifdef USE_FOG\n\tvarying vec3 vFogPosV;\n#endif';
const FOG_VERT = '#ifdef USE_FOG\n\tvFogPosV = mvPosition.xyz;\n#endif';
const FOG_FRAG_PARS = `#ifdef USE_FOG
	uniform vec3 fogColor;
	uniform vec4 uFogSun;
	varying vec3 vFogPosV;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`;
const FOG_FRAG = `#ifdef USE_FOG
	float owfD = length( vFogPosV );
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * owfD * owfD );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, owfD );
	#endif
	vec3 owfC = fogColor;
	// uFogSun.w == 0 => material sem o uniform (ShaderMaterial de terceiro), quality 'low'
	// ou ?fog2=0. Nesse caso o bloco inteiro some e sobra o fog de cor fixa: fail-safe.
	if ( uFogSun.w > 0.001 ) {
		vec3 owfS = normalize( ( viewMatrix * vec4( uFogSun.xyz, 0.0 ) ).xyz );
		float owfA = smoothstep( -0.35, 0.90, dot( normalize( vFogPosV ), owfS ) );
		// contraluz: mais claro e mais quente (Mie para a frente); de costas: mais escuro e azul
		vec3 owfHot = min( fogColor * vec3( 2.30, 1.35, 0.72 ) + vec3( 0.045, 0.022, 0.006 ), vec3( 2.0 ) );
		vec3 owfCold = fogColor * vec3( 0.80, 0.92, 1.12 );
		owfC = mix( fogColor, mix( owfCold, owfHot, owfA ), uFogSun.w );
	}
	gl_FragColor.rgb = mix( gl_FragColor.rgb, owfC, fogFactor );
#endif`;

let _fogPatched = null;
function patchFogChunks() {
  if (_fogPatched !== null) return _fogPatched;
  _fogPatched = false;
  try {
    if (QP().get('fog2') === '0') return false;
    const SC = THREE.ShaderChunk;
    // só troca se o vendor for MESMO o r160 esperado — se o chunk mudar de forma, não mexe
    if (!SC || typeof SC.fog_fragment !== 'string' || SC.fog_fragment.indexOf('vFogDepth') < 0) return false;
    SC.fog_pars_vertex = FOG_VERT_PARS;
    SC.fog_vertex = FOG_VERT;
    SC.fog_pars_fragment = FOG_FRAG_PARS;
    SC.fog_fragment = FOG_FRAG;
    // o uniform precisa existir no objeto de uniforms de CADA shader que usa névoa. O
    // ShaderLib já foi montado no import do three, então não basta mexer no UniformsLib.
    const u = { value: _fogSun };
    if (THREE.UniformsLib && THREE.UniformsLib.fog) THREE.UniformsLib.fog.uFogSun = u;
    for (const k in THREE.ShaderLib) {
      const uni = THREE.ShaderLib[k] && THREE.ShaderLib[k].uniforms;
      if (uni && uni.fogColor) uni.uFogSun = u;
    }
    _fogPatched = true;
  } catch (e) { _fogPatched = false; }
  return _fogPatched;
}
// roda no import do bloom.js — ANTES de qualquer material compilar (main.js importa este
// módulo no topo). Assim não existe programa em cache com o chunk antigo.
patchFogChunks();

/* RADIÂNCIA DO CÉU DE CADA MAPA, em espaço LINEAR de trabalho.
   É a MESMA cor-base da névoa da tabela AERIAL acima — e ela não foi escolhida no olho: o
   `tools/eval/r3_fog.py` recorta, nos 8 frames de cada mapa, as 14 linhas de céu logo acima
   da silhueta, inverte o composite (AgX + piso + vinheta + exposição) e devolve a radiância
   linear MEDIDA. Fica exportada porque mais de um efeito precisa saber "qual é o brilho do
   céu deste mapa" e não só a névoa: hoje a fumaça de granada (game.js `_corDaFumaca`), que
   estava com radiância 0,64 contra 0,32 do céu do awp_map — 2× mais clara que a luz que a
   ilumina, que é o "a tela lava pra branco" do dono. Uma fonte só, medida, para os dois.
   `new THREE.Color(hex)` converte sRGB -> linear de trabalho, então o retorno já é radiância. */
export function skyRadiance(mapId) {
  return new THREE.Color((AERIAL[mapId] || AERIAL_DEFAULT).color);
}

/* Névoa de um mapa. Os map_*.js chamam isto no lugar de `new THREE.Fog(...)`. */
export function makeAerialFog(mapId) {
  const q = QP();
  const A = AERIAL[mapId] || AERIAL_DEFAULT;
  const dOv = parseFloat(q.get('fogd'));
  const d = isFinite(dOv) ? dOv : A.d;
  // sem o patch (vendor diferente / ?fog2=0) a exponencial mudaria o look sem a cor
  // direcional que a compensa — nesse caso volta pro linear equivalente (f=0.5 na mesma
  // distância da exponencial, e f≈0,95 no fim do alcance).
  if (!_fogPatched) {
    const half = Math.sqrt(Math.LN2) / d;
    return new THREE.Fog(A.color, half * 0.35, half * 2.1);
  }
  const s = A.sun, L = Math.hypot(s[0], s[1], s[2]) || 1;
  _fogSun[0] = s[0] / L; _fogSun[1] = s[1] / L; _fogSun[2] = s[2] / L;
  // 'low': só a cor fixa (o branch dinâmico é uniforme, então some do custo de verdade)
  _fogSun[3] = currentQuality() === 'low' ? 0 : (q.get('fog2') === '0' ? 0 : A.dir);
  return new THREE.FogExp2(A.color, d);
}

/* ================================================================
   SSAO — half-res, reconstrução por inverse projection
   R8: nº de amostras agora depende da qualidade (10 em 'high', 6 em 'med'). O passe custava
   15 taps de textura por pixel de meia-res e o tempo até jogar subiu 35 % na r1; 6 amostras
   com o mesmo blur bilateral mantêm o gradiente de contato e cortam ~40 % do custo do passe.
   ================================================================ */
const SSAO_SAMPLES_HIGH = 10;
const SSAO_SAMPLES_MED = 6;

// kernel hemisférico determinístico (LCG com seed fixa: mesmo AO todo boot, sem surpresa)
function makeKernel(n) {
  const out = []; let seed = 20260731 >>> 0;
  const rnd = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < n; i++) {
    const v = new THREE.Vector3(rnd() * 2 - 1, rnd() * 2 - 1, 0.18 + rnd() * 0.82).normalize();
    // amostras concentradas perto do centro do hemisfério = contato mais nítido no encosto
    let s = (i + 1) / n; s = 0.22 + 0.78 * s * s;
    out.push(v.multiplyScalar(s));
  }
  return out;
}

const SSAO_COMMON = /* glsl */`
  uniform vec2 uNearFar;
  uniform mat4 uProj;
  uniform mat4 uInvProj;
  float owViewZ( float d ) {
    // depth não-linear -> viewZ (negativo, à frente da câmera)
    return ( uNearFar.x * uNearFar.y ) / ( ( uNearFar.y - uNearFar.x ) * d - uNearFar.y );
  }
  vec3 owViewPos( vec2 uv, float d ) {
    float vz = owViewZ( d );
    float clipW = uProj[2][3] * vz + uProj[3][3];
    vec4 clip = vec4( ( vec3( uv, d ) - 0.5 ) * 2.0, 1.0 ) * clipW;
    return ( uInvProj * clip ).xyz;
  }
`;

// fábrica: o nº de amostras é constante de compilação no GLSL ES 1.00 (loop bem-comportado
// e tamanho do array de uniform), então o shader é gerado por qualidade.
const ssaoFrag = (N) => /* glsl */`
  uniform sampler2D tDepth;
  uniform vec2 uTexel;      // 1/resolução do buffer de AO (meia res)
  uniform vec4 uAo;         // x raio(m), y falloff(m), z power, w bias(m)
  uniform vec3 uKernel[ ${N} ];
  varying vec2 vUv;
  ${SSAO_COMMON}
  float owHash12( vec2 p ) {
    vec3 p3 = fract( vec3( p.xyx ) * 0.1031 );
    p3 += dot( p3, p3.yzx + 33.33 );
    return fract( ( p3.x + p3.y ) * p3.z );
  }
  void main() {
    float d = texture2D( tDepth, vUv ).x;
    // céu (depth 1) não ocluí nada e não deve ser escurecido
    if ( d >= 0.9999 ) { gl_FragColor = vec4( 1.0, 1.0, 0.0, 1.0 ); return; }
    vec3 p = owViewPos( vUv, d );

    // Normal reconstruída por 4 taps com escolha da menor derivada (evita "aba" nas
    // silhuetas, que é onde a derivada simples inventa geometria e vaza AO no céu).
    vec2 e = uTexel;
    vec3 pL = owViewPos( vUv - vec2( e.x, 0.0 ), texture2D( tDepth, vUv - vec2( e.x, 0.0 ) ).x );
    vec3 pR = owViewPos( vUv + vec2( e.x, 0.0 ), texture2D( tDepth, vUv + vec2( e.x, 0.0 ) ).x );
    vec3 pD = owViewPos( vUv - vec2( 0.0, e.y ), texture2D( tDepth, vUv - vec2( 0.0, e.y ) ).x );
    vec3 pU = owViewPos( vUv + vec2( 0.0, e.y ), texture2D( tDepth, vUv + vec2( 0.0, e.y ) ).x );
    vec3 dx = ( abs( pR.z - p.z ) < abs( p.z - pL.z ) ) ? ( pR - p ) : ( p - pL );
    vec3 dy = ( abs( pU.z - p.z ) < abs( p.z - pD.z ) ) ? ( pU - p ) : ( p - pD );
    vec3 n = normalize( cross( dx, dy ) );
    if ( dot( n, -p ) < 0.0 ) n = -n;

    float ang = owHash12( gl_FragCoord.xy ) * 6.2831853;
    vec3 rv = vec3( cos( ang ), sin( ang ), 0.0 );
    vec3 t = normalize( rv - n * dot( rv, n ) );
    vec3 b = cross( n, t );
    mat3 tbn = mat3( t, b, n );

    float radius = uAo.x;
    // bias cresce com a distância: o depth de 24 bits perde resolução longe e um bias fixo
    // vira acne/banda no chão em ângulo rasante
    float bias = uAo.w * ( 1.0 + 0.04 * ( -p.z ) );
    float occ = 0.0;
    for ( int i = 0; i < ${N}; i++ ) {
      vec3 sp = p + ( tbn * uKernel[ i ] ) * radius;
      vec4 off = uProj * vec4( sp, 1.0 );
      // sem continue: GLSL ES 1.00 exige loop bem-comportado pra indexar uniform array
      vec2 suv = ( off.xy / max( off.w, 1e-4 ) ) * 0.5 + 0.5;
      float sd = texture2D( tDepth, clamp( suv, vec2( 0.0 ), vec2( 1.0 ) ) ).x;
      float sz = owViewZ( sd );
      // sz > sp.z => a superfície amostrada está MAIS PERTO da câmera => ocluí
      float diff = sz - sp.z;
      float range = smoothstep( 0.0, 1.0, uAo.y / max( 1e-4, abs( p.z - sz ) ) );
      occ += step( bias, diff ) * range;
    }
    float ao = 1.0 - occ / float( ${N} );
    ao = pow( clamp( ao, 0.0, 1.0 ), uAo.z );
    // g = depth linear normalizado em 20 m — chave do blur bilateral (8 bits ≈ 8 cm)
    gl_FragColor = vec4( ao, clamp( -p.z / 20.0, 0.0, 1.0 ), 0.0, 1.0 );
  }
`;

// blur bilateral 4x4 (16 taps) na meia-res, com edge-stop pelo depth do canal g:
// AO ruidoso sem blur lê como "sujeira animada" — pior que não ter AO.
const SSAO_BLUR_FRAG = /* glsl */`
  uniform sampler2D tAO;
  uniform vec2 uTexel;
  varying vec2 vUv;
  void main() {
    vec4 c = texture2D( tAO, vUv );
    float sum = 0.0, wsum = 0.0;
    for ( int y = -2; y <= 1; y++ ) {
      for ( int x = -2; x <= 1; x++ ) {
        vec2 uv = vUv + vec2( float( x ) + 0.5, float( y ) + 0.5 ) * uTexel;
        vec4 s = texture2D( tAO, uv );
        // peso cai forte com diferença de profundidade (0.02 ≈ 40 cm no range de 20 m)
        float w = exp( -abs( s.g - c.g ) / 0.02 );
        sum += s.r * w; wsum += w;
      }
    }
    gl_FragColor = vec4( wsum > 0.0 ? sum / wsum : c.r, c.g, 0.0, 1.0 );
  }
`;

// Aplicação: multiplica o buffer inteiro (não há MRT pra separar direto/indireto), mas
// com rolloff no highlight — assim o AO não come o especular do sol nem o céu.
const SSAO_APPLY_FRAG = /* glsl */`
  uniform sampler2D tDiffuse;
  uniform sampler2D tAO;
  uniform vec2 uApply;   // x força, y rolloff no highlight
  varying vec2 vUv;
  void main() {
    // ALFA PASSA DIRETO (era 1.0 fixo). Desde o BUG-09 o canal alfa deste buffer não é
    // "opacidade" — é a MÁSCARA de quem pode gerar bloom (ver CharNoBloomPass). Este passe
    // roda ENTRE a máscara e o bloom, então cravar 1.0 aqui apagava a máscara em silêncio
    // e o personagem voltava a brilhar em quality med/high (justo onde o AO está ligado).
    vec4 t = texture2D( tDiffuse, vUv );
    vec3 c = t.rgb;
    float ao = texture2D( tAO, vUv ).r;
    float l = dot( c, vec3( 0.2126, 0.7152, 0.0722 ) );
    float k = uApply.x * ( 1.0 - uApply.y * smoothstep( 0.20, 1.40, l ) );
    gl_FragColor = vec4( c * mix( 1.0, ao, clamp( k, 0.0, 1.0 ) ), t.a );
  }
`;

const SSAO_VERT = /* glsl */`
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }
`;

class SSAOPass extends Pass {
  constructor(camera, opts = {}) {
    super();
    this.camera = camera;
    this.needsSwap = true;
    const rtOpt = { depthBuffer: false, stencilBuffer: false, type: THREE.UnsignedByteType, format: THREE.RGBAFormat };
    this.aoRT = new THREE.WebGLRenderTarget(1, 1, rtOpt);
    this.blurRT = new THREE.WebGLRenderTarget(1, 1, rtOpt);
    const nSamples = Math.max(4, Math.round(opts.samples || SSAO_SAMPLES_MED));
    const kernel = makeKernel(nSamples);
    this.ssaoMat = new THREE.ShaderMaterial({
      name: 'ssao', vertexShader: SSAO_VERT, fragmentShader: ssaoFrag(nSamples), depthTest: false, depthWrite: false,
      uniforms: {
        tDepth: { value: null },
        uTexel: { value: new THREE.Vector2(1, 1) },
        uNearFar: { value: new THREE.Vector2(0.1, 400) },
        uProj: { value: new THREE.Matrix4() },
        uInvProj: { value: new THREE.Matrix4() },
        // raio 0.6 m / falloff 1.2 m / power 1.35 / bias 2 cm (mata self-occlusion do depth 24 bits)
        uAo: { value: new THREE.Vector4(opts.radius ?? 0.6, 1.2, opts.power ?? 1.35, 0.02) },
        uKernel: { value: kernel },
      },
    });
    this.blurMat = new THREE.ShaderMaterial({
      name: 'ssao-blur', vertexShader: SSAO_VERT, fragmentShader: SSAO_BLUR_FRAG, depthTest: false, depthWrite: false,
      uniforms: { tAO: { value: null }, uTexel: { value: new THREE.Vector2(1, 1) } },
    });
    this.applyMat = new THREE.ShaderMaterial({
      name: 'ssao-apply', vertexShader: SSAO_VERT, fragmentShader: SSAO_APPLY_FRAG, depthTest: false, depthWrite: false,
      uniforms: { tDiffuse: { value: null }, tAO: { value: null }, uApply: { value: new THREE.Vector2(opts.strength ?? 0.95, 0.55) } },
    });
    this.strength = opts.strength ?? 0.95;
    this.applyMat.uniforms.tAO.value = this.blurRT.texture;   // sempre um sampler válido
    this.fq = new FullScreenQuad(this.ssaoMat);
  }
  setSize(w, h) {
    const hw = Math.max(2, Math.floor(w / 2)), hh = Math.max(2, Math.floor(h / 2));
    this.aoRT.setSize(hw, hh); this.blurRT.setSize(hw, hh);
    this.ssaoMat.uniforms.uTexel.value.set(1 / hw, 1 / hh);
    this.blurMat.uniforms.uTexel.value.set(1 / hw, 1 / hh);
  }
  render(renderer, writeBuffer, readBuffer) {
    const dt = readBuffer.depthTexture;
    const cam = this.camera;
    // Fail-safe: sem depth texture (ou câmera não-perspectiva) o passe vira um blit puro —
    // nunca tela preta, só sem AO.
    this.applyMat.uniforms.uApply.value.x = (dt && cam && cam.isPerspectiveCamera) ? this.strength : 0.0;
    if (dt && cam && cam.isPerspectiveCamera) {
      const u = this.ssaoMat.uniforms;
      u.tDepth.value = dt;
      u.uNearFar.value.set(cam.near, cam.far);
      u.uProj.value.copy(cam.projectionMatrix);
      u.uInvProj.value.copy(cam.projectionMatrixInverse);
      renderer.setRenderTarget(this.aoRT); this.fq.material = this.ssaoMat; this.fq.render(renderer);
      this.blurMat.uniforms.tAO.value = this.aoRT.texture;
      renderer.setRenderTarget(this.blurRT); this.fq.material = this.blurMat; this.fq.render(renderer);
    }
    this.applyMat.uniforms.tDiffuse.value = readBuffer.texture;
    this.applyMat.uniforms.tAO.value = this.blurRT.texture;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.fq.material = this.applyMat; this.fq.render(renderer);
  }
  dispose() {
    this.aoRT.dispose(); this.blurRT.dispose();
    this.ssaoMat.dispose(); this.blurMat.dispose(); this.applyMat.dispose(); this.fq.dispose();
  }
}

/* ================================================================
   COMPOSITE — CA radial + piso de ambiente + vinheta + AgX
   ================================================================ */
const COMPOSITE = {
  uniforms: {
    tDiffuse: { value: null },
    // x CA, y vinheta (0.28 → 0.14: a 0.28 os cantos perdiam ~1 stop em luz LINEAR), z grain, w time
    uLens: { value: new THREE.Vector4(0.0016, 0.14, 0.0, 0) },
    // x agx slope, y power (1.25 → 1.00: era gama pós-log2, crushava o meio-tom), z sat, w exposure
    // z 1.02 → 1.12 (LOOK_SAT): ver comentário da tabela LOOKS — a r1 dessaturou 30-64 %.
    uLook: { value: new THREE.Vector4(1.0, 1.0, LOOK_SAT, DEFAULT_LOOK.exposure) },
    uFloor: { value: DEFAULT_LOOK.floor },   // piso de ambiente aditivo suave (linear) — sobrescrito por mapa
  },
  vertexShader: SSAO_VERT,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform vec4 uLens;
    uniform vec4 uLook;
    uniform float uFloor;
    varying vec2 vUv;

    float owLum( vec3 c ) { return dot( c, vec3( 0.2126, 0.7152, 0.0722 ) ); }
    vec3 owLinearToSrgb( vec3 c ) {
      c = max( c, vec3( 0.0 ) );
      return mix( c * 12.92, 1.055 * pow( c, vec3( 0.41666667 ) ) - 0.055, step( 0.0031308, c ) );
    }
    float owHash12( vec2 p ) {
      vec3 p3 = fract( vec3( p.xyx ) * 0.1031 );
      p3 += dot( p3, p3.yzx + 33.33 );
      return fract( ( p3.x + p3.y ) * p3.z );
    }
    const mat3 OW_REC2020_FROM_SRGB = mat3(
      vec3( 0.6274, 0.0691, 0.0164 ),
      vec3( 0.3293, 0.9195, 0.0880 ),
      vec3( 0.0433, 0.0113, 0.8956 ) );
    const mat3 OW_SRGB_FROM_REC2020 = mat3(
      vec3(  1.6605, -0.1246, -0.0182 ),
      vec3( -0.5876,  1.1329, -0.1006 ),
      vec3( -0.0728, -0.0083,  1.1187 ) );
    vec3 owAgxContrast( vec3 x ) {
      vec3 x2 = x * x;
      vec3 x4 = x2 * x2;
      return 15.5 * x4 * x2 - 40.14 * x4 * x + 31.96 * x4 - 6.868 * x2 * x
           + 0.4298 * x2 + 0.1191 * x - 0.00232;
    }
    vec3 owAgX( vec3 color, float slope, float power, float sat ) {
      const mat3 inset = mat3(
        vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
        vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
        vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 ) );
      const mat3 outset = mat3(
        vec3(  1.1271005818144368, -0.1413297634984383, -0.14132976349843826 ),
        vec3( -0.11060664309660323, 1.157823702216272, -0.11060664309660294 ),
        vec3( -0.016493938717834573, -0.016493938717834257, 1.2519364065950405 ) );
      const float minEv = -12.47393;
      const float maxEv = 4.026069;
      color = OW_REC2020_FROM_SRGB * color;
      color = inset * color;
      color = max( color, 1e-10 );
      color = ( log2( color ) - minEv ) / ( maxEv - minEv );
      color = clamp( color, 0.0, 1.0 );
      color = pow( max( color * slope, 0.0 ), vec3( power ) );
      float l = owLum( color );
      color = l + sat * ( color - l );
      color = owAgxContrast( clamp( color, 0.0, 1.0 ) );
      color = outset * color;
      color = pow( max( color, vec3( 0.0 ) ), vec3( 2.2 ) );
      color = OW_SRGB_FROM_REC2020 * color;
      return clamp( color, 0.0, 1.0 );
    }

    void main() {
      vec2 d = vUv - 0.5;
      float r2 = dot( d, d );
      // chromatic aberration radial (cantos)
      vec3 hdr;
      float ca = uLens.x * r2;
      if ( ca > 0.00002 ) {
        vec2 o = d * ca;
        hdr.r = texture2D( tDiffuse, vUv + o ).r;
        hdr.g = texture2D( tDiffuse, vUv ).g;
        hdr.b = texture2D( tDiffuse, vUv - o ).b;
      } else {
        hdr = texture2D( tDiffuse, vUv ).rgb;
      }
      hdr = max( hdr, vec3( 0.0 ) );
      // PISO DE AMBIENTE (soft): vale uFloor quando hdr=0 e desaparece sozinho quando
      // hdr >> uFloor. É o bounce/GI que o jogo não simula — sem ele 22.7 % do frame
      // ficava em L* < 3 (preto sem informação). max() puro criava degrau visível.
      // O alvo é ~1 % em L*<3, NÃO zero: sem nenhuma âncora de preto a imagem fica leitosa
      // e o subteto de madeira do quiosque lia tão claro quanto o exterior (fisicamente
      // impossível). Por isso o piso caiu de 0.010-0.016 para 0.0039-0.0057.
      hdr += uFloor * uFloor / ( hdr + vec3( uFloor ) );
      hdr *= uLook.w;
      // vinheta cos⁴ em LUZ LINEAR (transmissão da lente — antes da curva de tom)
      float cos4 = pow( 1.0 / ( 1.0 + r2 * 2.4 ), 2.0 );
      hdr *= mix( 1.0, cos4, uLens.y );
      // tone map AgX
      vec3 col = owAgX( hdr, uLook.x, uLook.y, uLook.z );
      col = clamp( col, 0.0, 1.0 );
      vec3 disp = owLinearToSrgb( col );
      // grain em display space, menos nos escuros (só quando ESTE é o último passe —
      // com o passe de AA/sharpen ativo o grain migra pra lá, senão o sharpen o amplifica)
      if ( uLens.z > 0.0005 ) {
        float g = owHash12( gl_FragCoord.xy + uLens.w * 137.13 ) - 0.5;
        float g2 = owHash12( gl_FragCoord.xy * 1.7 - uLens.w * 71.3 ) - 0.5;
        float noise = ( g * 0.65 + g2 * 0.35 );
        float l = owLum( disp );
        float response = uLens.z * ( 0.35 + 0.65 * smoothstep( 0.0, 0.30, l ) );
        disp += noise * response;
      }
      // dither ordenado anti-banding
      disp += ( owHash12( gl_FragCoord.xy * 0.5 + uLens.w ) - 0.5 ) * 0.0022;
      gl_FragColor = vec4( disp, 1.0 );
    }
  `,
};

/* ================================================================
   AA + SHARPEN + GRAIN (último passe, em display space)
   O composer renderiza em RT HDR — o antialias:true do canvas NÃO vale ali, então a
   imagem serrilhava em toda aresta. FXAA console (5 taps) + unsharp reaproveitando os
   mesmos taps: custo ~0.3 ms em 1080p.
   R8: o passe agora só existe em quality 'high' (ou ?fxaa=1). Em 'med' ele custava um
   passe fullscreen inteiro E borrava TEXTO DE MUNDO — a placa "SAUNA" do Piscinão saía
   mole na r1 e nítida no baseline: FXAA não distingue aresta de serrilhado de aresta de
   letra, e o sharpen de 0.22 depois amplificava o halo em vez de devolver a definição.
   Sharpen 0.22 → 0.12 (e 0.10 quando forçado em 'med', onde não há supersampling).
   ================================================================ */
const AA_SHARPEN = {
  uniforms: {
    tDiffuse: { value: null },
    uTexel: { value: new THREE.Vector2(1 / 1280, 1 / 720) },
    uAa: { value: new THREE.Vector3(1.0, 0.12, 0.035) },   // x fxaa on/off, y sharpen, z grain
    uTime: { value: 0 },
  },
  vertexShader: SSAO_VERT,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform vec2 uTexel;
    uniform vec3 uAa;
    uniform float uTime;
    varying vec2 vUv;
    float owLum( vec3 c ) { return dot( c, vec3( 0.299, 0.587, 0.114 ) ); }
    float owHash12( vec2 p ) {
      vec3 p3 = fract( vec3( p.xyx ) * 0.1031 );
      p3 += dot( p3, p3.yzx + 33.33 );
      return fract( ( p3.x + p3.y ) * p3.z );
    }
    void main() {
      vec2 rcp = uTexel;
      vec3 rgbNW = texture2D( tDiffuse, vUv + vec2( -1.0, -1.0 ) * rcp ).rgb;
      vec3 rgbNE = texture2D( tDiffuse, vUv + vec2(  1.0, -1.0 ) * rcp ).rgb;
      vec3 rgbSW = texture2D( tDiffuse, vUv + vec2( -1.0,  1.0 ) * rcp ).rgb;
      vec3 rgbSE = texture2D( tDiffuse, vUv + vec2(  1.0,  1.0 ) * rcp ).rgb;
      vec3 rgbM  = texture2D( tDiffuse, vUv ).rgb;
      vec3 col = rgbM;
      if ( uAa.x > 0.5 ) {
        float lNW = owLum( rgbNW ), lNE = owLum( rgbNE ), lSW = owLum( rgbSW ), lSE = owLum( rgbSE ), lM = owLum( rgbM );
        float lMin = min( lM, min( min( lNW, lNE ), min( lSW, lSE ) ) );
        float lMax = max( lM, max( max( lNW, lNE ), max( lSW, lSE ) ) );
        vec2 dir = vec2( -( ( lNW + lNE ) - ( lSW + lSE ) ), ( ( lNW + lSW ) - ( lNE + lSE ) ) );
        float red = max( ( lNW + lNE + lSW + lSE ) * 0.03125, 0.0078125 );
        float rcpMin = 1.0 / ( min( abs( dir.x ), abs( dir.y ) ) + red );
        dir = clamp( dir * rcpMin, vec2( -8.0 ), vec2( 8.0 ) ) * rcp;
        vec3 rgbA = 0.5 * ( texture2D( tDiffuse, vUv + dir * ( 1.0 / 3.0 - 0.5 ) ).rgb
                          + texture2D( tDiffuse, vUv + dir * ( 2.0 / 3.0 - 0.5 ) ).rgb );
        vec3 rgbB = rgbA * 0.5 + 0.25 * ( texture2D( tDiffuse, vUv - dir * 0.5 ).rgb
                                        + texture2D( tDiffuse, vUv + dir * 0.5 ).rgb );
        float lB = owLum( rgbB );
        col = ( lB < lMin || lB > lMax ) ? rgbA : rgbB;
      }
      // unsharp leve pós-tonemap: devolve a microdefinição que FXAA e o upsample do AO comem
      if ( uAa.y > 0.001 ) {
        vec3 blur = ( rgbNW + rgbNE + rgbSW + rgbSE ) * 0.25;
        col = clamp( col + ( col - blur ) * uAa.y, 0.0, 1.0 );
      }
      if ( uAa.z > 0.0005 ) {
        float g = owHash12( gl_FragCoord.xy + uTime * 137.13 ) - 0.5;
        float g2 = owHash12( gl_FragCoord.xy * 1.7 - uTime * 71.3 ) - 0.5;
        float l = owLum( col );
        col += ( g * 0.65 + g2 * 0.35 ) * uAa.z * ( 0.35 + 0.65 * smoothstep( 0.0, 0.30, l ) );
      }
      gl_FragColor = vec4( col, 1.0 );
    }
  `,
};

/* ================================================================
   FOCO DINÂMICO DO SHADOW MAP DO SOL
   A shadow camera dos mapas cobre 84-120 m com 2048² = 4.1-5.9 cm/texel (e 12.8 cm no
   baseline antigo). A ortho segue o jogador, com SNAP AO TEXEL (senão a sombra "ferve"
   quando o jogador anda).
   R8 — DUAS REGRESSÕES CORRIGIDAS AQUI:
    (1) raio 26 m → 45 m. Com 26 m NADA além de 26 m projetava sombra, e a sombra aparecia
        de estalo conforme o jogador andava — em mapas com sightline de 60-80 m isso é
        visível o tempo todo. 45 m dá 2 × 45 / 2048 ≈ 4.4 cm/texel, ainda ~3× melhor que os
        12.8 cm do baseline, e cobre o corredor de disputa inteiro.
    (2) o bias de cada mapa era SOBRESCRITO por -0.00008 (tunado pros 26 m). Agora o bias
        que o mapa ajustou é PRESERVADO e só escalado pela razão entre o novo extent e o
        original (±45 vs ±42..±60 — mesma ordem de grandeza, o bias original vale). Sem
        isso o Ferro Velho (-0.0006) e a Havan (-0.0004) perdiam a calibração deles.
   Kill-switch: ?shadowfocus=0 (desliga tudo) · ?shadowr=NN (raio)
   ================================================================ */
const _sfV = {
  center: new THREE.Vector3(), fwd: new THREE.Vector3(), dir: new THREE.Vector3(),
  x: new THREE.Vector3(), y: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0),
};
let _sfEnabled = null;
let _sfR = null;
export function focusSunShadow(scene, camera, radius) {
  if (_sfEnabled === null) _sfEnabled = QP().get('shadowfocus') !== '0';
  if (!_sfEnabled || !scene || !camera || !camera.isPerspectiveCamera) return;
  let st = scene.userData.__sf;
  if (st === undefined) {
    st = null;
    scene.traverse(o => {
      if (o.isDirectionalLight && o.castShadow && o.shadow && o.shadow.camera && o.shadow.camera.isOrthographicCamera) {
        if (!st || o.intensity > st.light.intensity) st = { light: o };
      }
    });
    if (st) {
      const l = st.light;
      st.dir = new THREE.Vector3().copy(l.position).sub(l.target.position);
      st.dist = Math.max(20, st.dir.length());
      st.dir.normalize();
      if (l.shadow.mapSize.width < 2048) { l.shadow.mapSize.set(2048, 2048); l.shadow.map = null; }
      // guarda o que o MAPA tunou, pra escalar em vez de jogar fora
      st.r0 = Math.max(4, Math.abs(l.shadow.camera.right) || 60);
      st.bias0 = l.shadow.bias;
      st.nbias0 = l.shadow.normalBias;
    }
    scene.userData.__sf = st || false;
  }
  if (!st) return;
  if (_sfR === null) { const r = parseFloat(QP().get('shadowr')); _sfR = isFinite(r) ? r : 45; }
  // nunca ALARGAR além do que o mapa escolheu (o Piscinão já usa ±42): o foco existe pra
  // ganhar texel, não pra desfazer a tunagem de quem montou o mapa.
  const l = st.light, R = radius || Math.min(_sfR, st.r0);
  if (!st.tuned) {
    st.tuned = true;
    // bias escala com o extent (o erro de profundidade por texel é proporcional ao tamanho
    // do texel em metros). Clamp em 0.35 pra nunca virar acne se algum mapa vier com ortho
    // gigante; nunca aumenta o bias do mapa (min 1.0), senão vira peter-panning.
    const k = Math.min(1, Math.max(0.35, R / st.r0));
    l.shadow.bias = (st.bias0 || -0.0004) * k;
    if (!(st.nbias0 > 0)) l.shadow.normalBias = 0.03;   // 3 cm só se o mapa não tinha nenhum
  }
  const v = _sfV;
  camera.getWorldDirection(v.fwd); v.fwd.y = 0;
  if (v.fwd.lengthSq() > 1e-6) v.fwd.normalize(); else v.fwd.set(0, 0, -1);
  // centro adiantado 35 % do raio na direção da vista: sobra mais sombra à frente
  v.center.copy(camera.position).addScaledVector(v.fwd, R * 0.35); v.center.y = 0;
  // snap ao texel no plano perpendicular à luz (anti-shimmer)
  const q = (2 * R) / l.shadow.mapSize.width;
  v.x.copy(v.up).cross(st.dir);
  if (v.x.lengthSq() < 1e-6) v.x.set(1, 0, 0);
  v.x.normalize();
  v.y.copy(st.dir).cross(v.x).normalize();
  const px = v.center.dot(v.x), py = v.center.dot(v.y);
  v.center.addScaledVector(v.x, Math.round(px / q) * q - px);
  v.center.addScaledVector(v.y, Math.round(py / q) * q - py);
  l.target.position.copy(v.center); l.target.updateMatrixWorld();
  l.position.copy(v.center).addScaledVector(st.dir, st.dist);
  l.updateMatrixWorld();
  const sc = l.shadow.camera;
  if (sc.right !== R) {
    sc.left = -R; sc.right = R; sc.top = R; sc.bottom = -R;
    sc.near = Math.max(0.5, st.dist - R * 2.2); sc.far = st.dist + R * 2.2;
    sc.updateProjectionMatrix();
  }
}

/* ================================================================
   CAMINHO SEM PÓS-PROCESSAMENTO (quality 'low' ou ?bloom=0)
   PORQUÊ: com o composer pulado, 'low' ficava sem AgX, sem piso de ambiente e com ACES
   @1.25 — ou seja, OUTRO JOGO. Medido: com ACES na mesma média de L*, 1,9-5,7 % do frame
   cai abaixo de L* 3 (contra ~1 % no AgX) e o desvio-padrão sobe de 21-27 para 27-34.
   Não dá pra rodar um passe de composite em 'low', mas dá pra rodar a MESMA curva dentro
   do material: o r160 vendorizado já tem AgX no chunk de tonemapping, e o hook
   CustomToneMapping deixa injetar piso + AgX + saturação sem nenhum passe extra.
   O chunk só é compilado quando toneMapping !== NoToneMapping — com o composer ligado
   (que força NoToneMapping) este código nem entra no shader.
   Kill-switch: ?lowtone=0 → volta pro ACES do three, com a exposição equivalente medida.
   ================================================================ */
const CUSTOM_AGX_STUB = 'vec3 CustomToneMapping( vec3 color ) { return color; }';
const CUSTOM_AGX_SRC = /* glsl */`vec3 CustomToneMapping( vec3 color ) {
  const mat3 OWL_R2020 = mat3(
    vec3( 0.6274, 0.0691, 0.0164 ), vec3( 0.3293, 0.9195, 0.0880 ), vec3( 0.0433, 0.0113, 0.8956 ) );
  const mat3 OWL_SRGB = mat3(
    vec3( 1.6605, -0.1246, -0.0182 ), vec3( -0.5876, 1.1329, -0.1006 ), vec3( -0.0728, -0.0083, 1.1187 ) );
  const mat3 OWL_INSET = mat3(
    vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
    vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
    vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 ) );
  const mat3 OWL_OUTSET = mat3(
    vec3( 1.1271005818144368, -0.1413297634984383, -0.14132976349843826 ),
    vec3( -0.11060664309660323, 1.157823702216272, -0.11060664309660294 ),
    vec3( -0.016493938717834573, -0.016493938717834257, 1.2519364065950405 ) );
  color = max( color, vec3( 0.0 ) );
  color += ( OWL_FLOOR * OWL_FLOOR ) / ( color + vec3( OWL_FLOOR ) );
  color *= toneMappingExposure;
  color = OWL_INSET * ( OWL_R2020 * color );
  color = max( color, vec3( 1e-10 ) );
  color = clamp( ( log2( color ) + 12.47393 ) / 16.499999, 0.0, 1.0 );
  float owlL = dot( color, vec3( 0.2126, 0.7152, 0.0722 ) );
  color = clamp( owlL + OWL_SAT * ( color - owlL ), 0.0, 1.0 );
  vec3 owlA = color * color;
  vec3 owlB = owlA * owlA;
  color = 15.5 * owlB * owlA - 40.14 * owlB * color + 31.96 * owlB
        - 6.868 * owlA * color + 0.4298 * owlA + 0.1191 * color - 0.00232;
  color = OWL_OUTSET * color;
  color = pow( max( color, vec3( 0.0 ) ), vec3( 2.2 ) );
  return clamp( OWL_SRGB * color, 0.0, 1.0 );
}`;
let _noPostDone = false;
export function applyNoPostTone(renderer) {
  if (!renderer || _noPostDone) return;
  _noPostDone = true;
  const look = currentLook();
  const chunk = THREE.ShaderChunk && THREE.ShaderChunk.tonemapping_pars_fragment;
  // degradação segura: se o vendor mudar e o stub sumir, ou com ?lowtone=0, cai no ACES do
  // three com a exposição equivalente medida (mesma média de L*, sombra mais fechada).
  if (QP().get('lowtone') === '0' || typeof chunk !== 'string' || chunk.indexOf(CUSTOM_AGX_STUB) < 0) {
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = look.expAces;
    return;
  }
  THREE.ShaderChunk.tonemapping_pars_fragment = chunk.replace(CUSTOM_AGX_STUB,
    CUSTOM_AGX_SRC.replace(/OWL_FLOOR/g, look.floor.toFixed(5))
                  .replace(/OWL_SAT/g, look.sat.toFixed(3)));
  renderer.toneMapping = THREE.CustomToneMapping;
  renderer.toneMappingExposure = look.exposure;
}

/* ================================================================
   BLOOM SELETIVO — o mundo brilha, o PERSONAGEM não  (BUG-09)
   ================================================================
   O DEFEITO (relatado pelo dono, 04/08): "os personagens no jogo estão com bloom, na tela
   de seleção também; o oakley que é preto em umas partes está cinza". Ele está certo, e a
   causa não é o brilho — é o PRETO.

   O UnrealBloomPass não é um efeito de objeto, é um efeito de QUADRO: ele extrai tudo
   acima do threshold (0.85), borra em 5 mips e SOMA de volta por cima da imagem inteira.
   Soma é aditiva, então o pixel que mais denuncia o efeito é o mais escuro: pele/jaleco/
   dente/olho especular de um personagem ficam a poucos pixels da lente preta do óculos, e
   o borrão do mip 4-5 tem raio de dezenas de pixels — a lente recebe a energia dos vizinhos
   claros do MESMO personagem e sai de preto para cinza. Num rosto (contraste alto em área
   pequena) isso acontece o tempo todo; numa parede de mapa, quase nunca. Por isso o defeito
   parece "personagem lavado" e não "cena lavada": é a mesma matemática em conteúdo diferente.

   COMO SE CORRIGE, E POR QUE NÃO É O CAMINHO DO EXEMPLO OFICIAL
   O `webgl_postprocessing_unreal_bloom_selective` do three resolve isso renderizando a cena
   DUAS VEZES (uma com os objetos não-bloom pintados de preto, pro bloom; outra normal, pra
   imagem). Segunda passada de geometria inteira é justamente o que não cabe: máquina fraca
   é requisito do dono, e o mapa tem ordem de milhares de draws contra ~9 personagens.

   Aqui o mundo é renderizado UMA vez só. O que separa personagem de mundo é uma MÁSCARA no
   canal alfa do próprio buffer do composer:
     1. um quad fullscreen escreve alfa = 1 no quadro inteiro (RGB intacto: blendSrc ZERO /
        blendDst ONE — a imagem não muda um bit, só o alfa);
     2. os personagens são redesenhados escrevendo alfa = 0, com TESTE DE PROFUNDIDADE
        contra o depth que o RenderPass acabou de deixar no mesmo alvo — então personagem
        atrás de parede não fura o bloom da parede (era o efeito colateral que uma máscara
        em render target separado, sem depth, teria trazido: fantasma humano na parede);
     3. o high-pass do bloom multiplica por esse alfa. Zero amostra de textura a mais: o
        `texel` já era lido, só o `.a` que era ignorado.
   Custo: 1 quad fullscreen sem leitura de textura + a geometria SÓ dos personagens com
   fragment trivial. Nada de render target novo, nada de segunda passada do mapa.

   "Por layer" é como os personagens são selecionados: canal NO_BLOOM_LAYER, ligado por
   varredura periódica em quem é `isSkinnedMesh`. Skinned == personagem neste jogo (o mundo
   é geometria procedural e prop estático), e o discriminador é exato sem depender de nome,
   userData ou de arquivo que outro agente esteja editando. Fica de FORA de propósito a arma
   na mão do bot e o clarão do disparo (filhos do osso, não skinned): eles são fonte de luz
   real e o dono pediu personagem sem bloom, não jogo sem bloom.

   O QUE ESTE CAMINHO **NÃO** TOCA (as três restrições que reprovariam o conserto):
   • vmPass — o RenderPass do viewmodel roda DEPOIS desta máscara e desenha opaco, ou seja,
     reescreve alfa = 1 em cima de si mesmo. A arma em primeira pessoa continua recebendo
     bloom/AgX exatamente como antes, e isso é consequência da ordem, não de um remendo.
   • quality 'low' / ?bloom=0 — não passam por aqui: main.js nem chama enableLightBloom.
   • ?charbloom=1 — mata o passe E o patch do shader, devolvendo o comportamento de hoje
     byte a byte, pra comparação lado a lado.
   Degradação segura: se o vendor mudar e o high-pass não bater com a string esperada, o
   patch não acontece, o passe não é instalado e o bloom volta a ser global — o jogo nunca
   perde o efeito por causa desta correção.
   ================================================================ */
const NO_BLOOM_LAYER = 11;   // canal livre: `grep -rn "layers\." public/js` não devolvia nenhum uso

// Material que escreve SÓ no canal alfa. O truque é o blend separado: RGB entra com fator
// ZERO e o destino com fator UM (a imagem não muda), enquanto o alfa recebe o fator do
// fragmento (1) ou ZERO (0). Sem mexer no colorMask do GL e sem tocar no depth.
const _alphaWriteMat = (one, depthTest) => new THREE.MeshBasicMaterial({
  color: 0x000000, fog: false, toneMapped: false,
  depthTest, depthWrite: false,
  blending: THREE.CustomBlending,
  blendEquation: THREE.AddEquation, blendSrc: THREE.ZeroFactor, blendDst: THREE.OneFactor,
  blendEquationAlpha: THREE.AddEquation,
  blendSrcAlpha: one ? THREE.OneFactor : THREE.ZeroFactor, blendDstAlpha: THREE.ZeroFactor,
});

const HP_OUT = 'gl_FragColor = mix( outputColor, texel, alpha );';
// Liga o high-pass do UnrealBloomPass na máscara. Devolve o uniforme de chave (0 = bloom
// global, como sempre foi) ou null se o shader do vendor não for o esperado.
function patchHighPassForCharMask(bloom) {
  const m = bloom && bloom.materialHighPassFilter;
  if (!m || typeof m.fragmentShader !== 'string' || m.fragmentShader.indexOf(HP_OUT) < 0) return null;
  const u = { value: 0 };
  bloom.highPassUniforms.uCharMask = u;
  m.uniforms = bloom.highPassUniforms;
  m.fragmentShader = m.fragmentShader
    .replace('uniform float smoothWidth;', 'uniform float smoothWidth;\n\t\tuniform float uCharMask;')
    // clamp porque o alvo é HalfFloat e blend aditivo de partícula pode empurrar alfa > 1
    .replace(HP_OUT, 'gl_FragColor = mix( outputColor, texel, alpha * mix( 1.0, clamp( texel.a, 0.0, 1.0 ), uCharMask ) );');
  m.needsUpdate = true;
  return u;
}

class CharNoBloomPass extends Pass {
  constructor(scene, camera, rawRender, uCharMask) {
    super();
    this.needsSwap = false;          // escreve no próprio readBuffer; não consome o par de RTs
    this.scene = scene; this.camera = camera;
    this._raw = rawRender;           // render CRU: chamar renderer.render aqui recursaria no composer
    this.u = uCharMask;
    this.prime = _alphaWriteMat(true, false);
    this.mask = _alphaWriteMat(false, true);
    this.fq = new FullScreenQuad(this.prime);
    this._f = 0; this._n = 0;
  }
  // Varredura a cada 30 quadros (~0,5 s), não todo quadro: `traverse` de mapa inteiro é
  // custo de CPU proporcional ao mapa, e personagem que acabou de nascer esperar meio
  // segundo pela máscara é invisível. Reentrar no layer é idempotente.
  _scan() {
    let n = 0;
    this.scene.traverse((o) => { if (o.isSkinnedMesh) { o.layers.enable(NO_BLOOM_LAYER); n++; } });
    this._n = n;
  }
  render(renderer, writeBuffer, readBuffer) {
    if ((this._f++ % 30) === 0) this._scan();
    this.u.value = 0;
    // Cena sem personagem (backdrop do menu, mapa vazio): não escreve máscara nenhuma e
    // deixa o bloom global — custo zero e à prova de falha (alfa nunca lido sem ser escrito).
    if (!this._n) return;
    const sc = this.scene, cam = this.camera, sm = renderer.shadowMap;
    const oAuto = renderer.autoClear, oBg = sc.background, oOv = sc.overrideMaterial;
    const oSmAuto = sm.autoUpdate, oSmNeeds = sm.needsUpdate, oLayers = cam.layers.mask;
    renderer.setRenderTarget(readBuffer);
    renderer.autoClear = false;      // o RenderPass já desenhou aqui: limpar seria apagar o quadro
    this.fq.material = this.prime; this.fq.render(renderer);
    // 2ª passada só dos personagens. shadowMap desligado à mão: `renderer.render` reentra no
    // shadow map toda vez, e re-renderizar o mapa de sombra do sol dobraria o custo do quadro
    // pra desenhar uma máscara que não usa sombra nenhuma.
    sm.autoUpdate = false; sm.needsUpdate = false;
    sc.background = null;            // senão o background pinta a máscara / força clear
    sc.overrideMaterial = this.mask;
    cam.layers.set(NO_BLOOM_LAYER);
    this._raw(sc, cam);
    cam.layers.mask = oLayers;
    sc.overrideMaterial = oOv; sc.background = oBg;
    sm.autoUpdate = oSmAuto; sm.needsUpdate = oSmNeeds;
    renderer.autoClear = oAuto;
    renderer.setRenderTarget(readBuffer);
    this.u.value = 1;
  }
  dispose() { this.prime.dispose(); this.mask.dispose(); this.fq.dispose(); }
}

/* ================================================================ */
export function enableLightBloom(renderer, opts = {}) {
  const composers = new Map();
  const rawRender = renderer.render.bind(renderer);
  renderer.__postPatched = true;   // game.js: sem essa flag ele desenha a vmScene manualmente
  const qp = QP();
  const quality = opts.quality || 'med';
  // SSAO: só em med/high (gate de custo) e desligável por ?ao=0. ?ao=1 força mesmo em low.
  const aoOn = qp.get('ao') === '1' || (qp.get('ao') !== '0' && (quality === 'med' || quality === 'high'));
  // AA/sharpen: passe fullscreen inteiro só pra isso. Em 'med' ele borrava texto de mundo
  // (a placa "SAUNA") e pesava no tempo até jogar — agora é exclusivo de 'high'. ?fxaa=1 força.
  const aaOn = qp.get('fxaa') === '1' || (qp.get('fxaa') !== '0' && quality === 'high');
  const useComposite = qp.get('post') !== 'output';
  // BUG-09: bloom seletivo ligado por padrão. ?charbloom=1 volta o bloom global de antes
  // (nem passe, nem patch de shader) — é o A/B lado a lado.
  const charMaskOn = qp.get('charbloom') !== '1';

  const patched = (scene, camera) => {
    const cp = forScene(scene, camera);
    // EffectComposer.render() chama renderer.render internamente (quads dos passes):
    // restaura o raw durante o composer p/ não recursar infinito, reinstala depois.
    renderer.render = rawRender;
    cp._time = (cp._time || 0) + 1 / 60;
    if (cp._composite) cp._composite.uniforms.uLens.value.w = cp._time;
    if (cp._aa) cp._aa.uniforms.uTime.value = cp._time;
    if (cp._ssao) cp._ssao.camera = camera;   // a cena pode trocar de câmera (menu/preview)
    if (scene.userData.vmPass) focusSunShadow(scene, camera);   // só na cena de jogo
    cp.render();
    renderer.render = patched;
  };

  const attachDepth = (cp) => {
    // depthTexture próprio em CADA render target: o RenderPass do mundo escreve no
    // readBuffer, que alterna entre rt1/rt2 conforme os swaps — o SSAOPass sempre lê o
    // depth do buffer que acabou de receber a cena. (clone() já duplicaria, mas Texture
    // .copy() compartilha o Source; instâncias novas evitam qualquer aliasing de GL.)
    for (const rt of [cp.renderTarget1, cp.renderTarget2]) {
      if (rt.depthTexture) rt.depthTexture.dispose();
      const dtex = new THREE.DepthTexture(rt.width, rt.height);
      dtex.type = THREE.UnsignedIntType; dtex.format = THREE.DepthFormat;
      dtex.minFilter = THREE.NearestFilter; dtex.magFilter = THREE.NearestFilter;
      rt.depthTexture = dtex;
    }
  };

  const forScene = (scene, camera) => {
    let cp = composers.get(scene);
    if (!cp) {
      cp = new EffectComposer(renderer);
      cp.setPixelRatio(renderer.getPixelRatio());
      cp.setSize(innerWidth, innerHeight);
      cp._w = innerWidth; cp._h = innerHeight;
      cp.addPass(new RenderPass(scene, camera));
      // threshold alto (0.85): só picos de brilho (sol, flash de tiro, speculars) — "bloom leve"
      const bloomPass = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.25, 0.45, 0.85);
      // A máscara de personagem tem que vir AQUI, colada no RenderPass: é o único ponto da
      // corrente onde o readBuffer ainda tem o DEPTH do mundo (o SSAO troca de buffer e o
      // vmPass limpa a profundidade). Sem esse depth a máscara não sabe quem está atrás de
      // parede. O bloom em si só entra lá embaixo — ele é o consumidor, não o produtor.
      const uCharMask = charMaskOn ? patchHighPassForCharMask(bloomPass) : null;
      if (uCharMask) cp.addPass(new CharNoBloomPass(scene, camera, rawRender, uCharMask));
      // SSAO só na cena de JOGO (a que tem vmPass). O backdrop do menu é um mapa orbitando
      // ao longe — ninguém lê contato de prop ali, e o passe custava mais um programa +
      // 2 render targets compilados ANTES de a partida começar (o harness estourou 300 s
      // na Havan). ?ao=1 força em todas as cenas.
      if (aoOn && (scene.userData.vmPass || qp.get('ao') === '1')) {
        attachDepth(cp);
        // SSAO ANTES do vmPass: o RenderPass do viewmodel faz clearDepth e apagaria o
        // depth do mundo. Antes do bloom também, pra o AO não virar fonte de brilho.
        const ss = new SSAOPass(camera, {
          radius: parseFloat(qp.get('aoradius')) || 0.6,
          strength: parseFloat(qp.get('aostr')) || (quality === 'high' ? 1.0 : 0.85),
          power: 1.35,
          samples: parseInt(qp.get('aosamples'), 10) || (quality === 'high' ? SSAO_SAMPLES_HIGH : SSAO_SAMPLES_MED),
        });
        ss.setSize(innerWidth * renderer.getPixelRatio(), innerHeight * renderer.getPixelRatio());
        cp.addPass(ss); cp._ssao = ss;
      }
      // Viewmodel em cena própria (rig de luz dedicado, port CoD): desenha POR CIMA do
      // mundo, limpando só a profundidade — arma nunca clipa na geometria do mapa e
      // recebe bloom/AgX junto (mesmo look). game.js seta scene.userData.vmPass.
      if (scene.userData.vmPass) {
        const vmp = new RenderPass(scene.userData.vmPass.scene, scene.userData.vmPass.camera);
        vmp.clear = false; vmp.clearDepth = true;
        cp.addPass(vmp);
      }
      cp.addPass(bloomPass);
      // A/B: ?post=output usa o OutputPass clássico (ACES), default = composite AgX
      if (!useComposite) cp.addPass(new OutputPass());
      else {
        const comp = new ShaderPass(COMPOSITE);
        const look = currentLook();
        comp.uniforms.uLook.value.w = look.exposure;
        comp.uniforms.uLook.value.z = look.sat;
        comp.uniforms.uFloor.value = look.floor;
        comp.uniforms.uLens.value.z = aaOn ? 0.0 : 0.035;   // grain vai pro passe de AA quando houver
        cp.addPass(comp); cp._composite = comp;
        if (aaOn) {
          const aa = new ShaderPass(AA_SHARPEN);
          aa.uniforms.uAa.value.set(1.0, quality === 'high' ? 0.12 : 0.10, 0.035);
          aa.uniforms.uTexel.value.set(1 / (innerWidth * renderer.getPixelRatio()), 1 / (innerHeight * renderer.getPixelRatio()));
          cp.addPass(aa); cp._aa = aa;
        }
      }
      composers.set(scene, cp);
    } else if (cp._w !== innerWidth || cp._h !== innerHeight) {
      cp.setSize(innerWidth, innerHeight);   // acompanha resize da janela
      cp._w = innerWidth; cp._h = innerHeight;
      if (cp._ssao) attachDepth(cp);         // setSize dispõe os RTs: recria o depth
      if (cp._aa) cp._aa.uniforms.uTexel.value.set(1 / (innerWidth * renderer.getPixelRatio()), 1 / (innerHeight * renderer.getPixelRatio()));
    }
    return cp;
  };
  renderer.render = patched;
  return () => { renderer.render = rawRender; renderer.__postPatched = false; composers.clear(); };   // off switch (debug)
}
