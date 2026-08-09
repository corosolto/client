// 8 fictional satirical archetypes — procedural low-poly meshes.
import * as THREE from 'three';

/* ═══════════════════════════════════════════════════════════════════════════
   CLAREZA COMPETITIVA DO PERSONAGEM  (critério C1 do BAR + A2 p/ personagens)

   PORQUÊ ISTO EXISTE: o baseline mediu ΔL* silhueta-vs-fundo = 10,8 em
   fy_havan-169-b (alvo ≥ 20) e os bots não tinham NENHUMA sombra de contato —
   liam como adesivo colado no chão. A régua não aceita "o mapa está bem
   iluminado" como resposta: ela exige um mecanismo ATIVO no personagem.

   Três mecanismos, compartilhados pelos personagens GLB (glbchars.js) e pelos
   procedurais de fallback (buildCharacter, mais abaixo):
     1. sombra de contato (plano + alpha radial)                  -> A2
     2. rim/fresnel por time modulado pela DISTÂNCIA              -> C1
     3. clamp de ambiente NA IRRADIÂNCIA (receita VALORANT)       -> C1 no pior canto

   ── CORREÇÃO DA R3 (regressão "personagem fantasma" da R2) ─────────────────
   A R2 aplicou o piso de luminância SOMANDO no `outgoingLight` (a cor já
   iluminada). Isso é matematicamente um "levantar o preto" chapado: como o piso
   é ABSOLUTO, todo texel cujo albedo era escuro chegava EXATAMENTE ao mesmo
   valor do texel claro. Medido nos PNGs (tools/eval/char_probe.py):

     r1 bot camisa roxa   C* 18,5 (p90 36,0)   L* p5/p50/p95 = 16,4 / 58,5 / 70,8
     r2 fantasma ferro    C*  6,8 (p90 10,4)   L* p5/p50/p95 = 54,7 / 57,5 / 74,1
     r2 fantasma piscinão C*  2,9 (p90  6,0)   L* p5/p50/p95 = 54,8 / 57,2 / 62,1

   Repare no p5: na R2 NADA no corpo fica abaixo de L* ~55. Cabelo preto, bota
   preta e jaleco branco viram o mesmo cinza — daí o "vulto branco-rosado"
   (o rosado é o rim do time P somado por cima do cinza). O topo (p95 ~74)
   continuava certo: a luz FUNCIONAVA, o piso é que esmagava os 2/3 de baixo
   da escala de valores.

   Agora o piso vive em `irradiance`, ANTES do BRDF_Lambert — ou seja, ele é
   MULTIPLICADO pelo albedo. Cabelo preto continua preto, jaleco continua
   branco, a razão entre eles (= croma e contraste interno) é preservada por
   construção, e o personagem ainda ganha um mínimo garantido de luz na sombra.
   ═══════════════════════════════════════════════════════════════════════════ */
const _cqp = new URLSearchParams(location.search);
const _cnum = (k, d) => { const v = parseFloat(_cqp.get(k)); return isNaN(v) ? d : v; };
// Qualidade lida do MESMO localStorage do menu (main.js:17-18). Lida UMA vez, na
// construção do material: trocar a qualidade no meio da partida não recompila shader,
// e recompilar 8 personagens em SwiftShader travaria o frame.
let _lowQ = false;
try { _lowQ = JSON.parse(localStorage.getItem('awpbr_settings') || '{}').quality === 'low'; } catch { /* padrão: médio */ }

export const CHAR_FX = {
  on:      _cqp.get('charfx') !== '0',                 // kill-switch geral da injeção de shader
  rim:     _cqp.get('rim') !== '0',                    // kill-switch do rim (pedido explícito da tarefa)
  clamp:   _cqp.get('charclamp') !== '0',              // kill-switch do clamp de ambiente + piso de albedo
  shadow:  _cqp.get('cshadow') !== '0',                // kill-switch da sombra de contato
  recv:    _cqp.get('charrecv') !== '0' && !_lowQ,     // personagem RECEBE a sombra do sol (off em low)
  mats:    _cqp.get('charmat') !== '0',                // kill-switch da correção do material do GLB
  low:     _lowQ,
  // ── clamp de ambiente: unidades de IRRADIÂNCIA do three (useLegacyLights=false),
  // não de cor final. O ambiente difuso real medido nos mapas (hemi 0.52 no piscinão a
  // 1.0 no ferro velho, mais o IBL do PMREM) dá ~1,0. 1.85 é portanto uma decisão de
  // JOGABILIDADE declarada: o personagem é iluminado ~1,8× mais que o mundo à volta.
  // É a mesma escolha da Riot ("clamp do Indirect Lighting Cache") e da Valve ("Boost
  // Player Contrast") — e o BAR §2 diz que clareza tem precedência sobre estética.
  // Calibrado em tools/eval/char_sim.py: com 1.85 o ΔL* previsto contra o anel fica
  // 31/32/20 nos três bots medidos; com 1.25 (o valor "físico") cairia pra 27/28/16.
  // FLOOR BAIXADO (dono, ago/01: "players/bots esbranquiçados, quero a cor original dos moldes").
  // 1.85/3.00 iluminava o personagem 1.8-3× mais que o mundo (boost de clareza Valorant) e
  // lavava a cor — os bots distantes viravam fantasmas brancos. Baixei perto do "físico" (1.25)
  // e cortei muito o de longe; +saturação pra cor original aparecer. Tunável: ?charfloor/…far/…sat.
  floorIrr: _cnum('charfloor', 1.15),                  // piso de irradiância indireta (perto)
  floorFar: _cnum('charfloorfar', 1.55),               // piso a 45 m+ (era 3.0 = fantasma branco distante)
  ceilIrr:  _cnum('charceil', 4.5),                    // teto: céu HDR não pode estourar o personagem
  albMin:   _cnum('charalbmin', 0.09),                 // valor mínimo do albedo, por ESCALA (matiz/S intactos)
  /* PISO DE ALBEDO NA BANDA BAIXA, não no texel (C10 / char-floor.mjs).
     `albMin` é 0,09 LINEAR — que é sRGB 0,332 = byte 85 = L* 36, um CINZA MÉDIO, não
     um "preto levantado". Aplicado por texel (`max(V, albMin)`) ele é um DEGRAU: todo
     texel abaixo do ponto sai com o MESMO valor. Medido nas texturas reais dos 45 GLB:
     94,1 % do albedo do trapfunk está abaixo do piso, 90,4 % do palhaço mal, 86,6 % do
     oakley, 79,2 % do emo e do punk, 74,7 % do coach, 67,3 % do black metal — contra
     8,4 % do padata e 8,8 % do canarinho. Resultado: o personagem escuro inteiro colapsa
     num único valor e perde 61 % (trapfunk) / 46 % (oakley, emo) / 45 % (blackmetal) do
     seu contraste interno, enquanto o claro não perde nada. É esse o "liso, cor chapada,
     parece manequim" — e é a causa do spread que o C9 mediu sem explicar.
     A CORREÇÃO: o piso passa a olhar o nível REGIONAL do albedo (mip alto, `albLod`) e
     multiplica o texel por esse ganho. Como o ganho é o MESMO para toda a região, TODA
     razão entre texels sobrevive por construção — o piso levanta o NÍVEL sem tocar no
     contraste. Acima do piso o ganho é 1,0 exato: personagem claro/saturado não muda um
     pixel. Kill-switch `?charalbreg=0` volta ao degrau (o A/B é bloco × bloco). */
  albReg:   _cqp.get('charalbreg') !== '0',            // piso do albedo regional (0 = degrau por texel)
  ambChroma: _cqp.get('charambchroma') !== '0',        // fill do piso herda a crominância do ambiente (0 = branco)
  albLod:   _cnum('charalblod', 6),                    // mip do nível regional (6 = bloco de 64 texels)
  sat:      _cnum('charsat', 1.32),                    // ganho de croma do albedo (+cor original dos moldes)
  rimNear: _cnum('rimnear', 0.18),                     // rim a queima-roupa: discreto, não vira fantasma
  rimFar:  _cnum('rimfar', 0.70),                      // rim a 34 m+: é longe que o inimigo some no fundo
  rimPow:  _cnum('rimpow', 1.7),                       // expoente da banda LARGA (dá área pro ΔL* médio subir)
  rimEdge: _cnum('rimedge', 1.35),                     // peso da banda FINA (contorno explícito, C1)
  sss:     _lowQ ? 0 : _cnum('charsss', 0.30),         // subsurface falso na pele (0 em low)
  csOp:    _cnum('csop', 0.45),                        // opacidade da sombra de contato
};

// Paleta de rim = a MESMA que o jogo já usa no radar/killfeed (`_teamColor`,
// game.js:2602-2607): P vermelho, B verde, U azul. Puxada pro branco de propósito —
// o C1 mede LUMINÂNCIA (ΔL*), então o contorno precisa ser CLARO antes de ser
// colorido; um rim verde-escuro num fundo escuro não separa nada.
// 0.35 (era 0.45 na R2): com o piso agora multiplicativo o rim voltou a ser o único
// termo aditivo do personagem, e cada ponto que ele anda na direção do branco é croma
// que ele TIRA do boneco. Medido no char_sim: 0.45 custava ~1,5 de C* sem ganhar ΔL*.
// `E` (não `P`) e `C` (07/08): o rename Time E deixou esta tabela para trás e os palhaços
// nunca entraram nela. `TEAM_RIM[team] || 0xffffff` não dá erro — dá contorno BRANCO, que
// parece decisão de arte. Régua: `tools/eval/faccao-paleta-check.mjs`.
const TEAM_RIM = { E: 0xff5555, B: 0x55dd66, U: 0x4aa3ff, C: 0xff6ec7, F: 0xffc233, M: 0x9d4edd };
export function charRimColor(def) {
  const c = new THREE.Color(TEAM_RIM[(def && def.team) || 'E'] || 0xffffff);
  return c.lerp(new THREE.Color(0xffffff), 0.35);
}

// ── shader: declarações. Os dois trechos injetados vivem no MESMO main(), mas
// separados por vários #include; por isso csMaxC/csSkinM são globais do shader.
const CS_PARS = `
uniform vec3 csRimColor;
uniform float csRimNear;
uniform float csRimFar;
uniform float csRimPow;
uniform float csRimEdge;
uniform float csFloorIrr;
uniform float csFloorFar;
uniform float csCeilIrr;
uniform float csAlbMin;
uniform float csAlbLod;
uniform float csSat;
uniform float csSss;
float csMaxC;
float csSkinM;
const vec3 CS_LUMA = vec3(0.2126, 0.7152, 0.0722);
`;

// ── shader: ALBEDO. Injetado logo após <map_fragment> (o atlas já foi amostrado).
// REGRA DESTE BLOCO: só operações que preservam matiz e saturação relativa. Nada
// aqui pode "levantar o preto" — foi esse o erro da R2.
const CS_ALBEDO = `
	{
		// (a) ganho de croma. O BAR §2.2/C2 pede cenário dessaturado (S 0,10-0,30) e diz
		// explicitamente que o PERSONAGEM deve furar essa faixa: "é exatamente daí que
		// vem a separação". Operador de saturação em torno da luminância — não desloca
		// o valor médio, só afasta os canais dele.
		float csY = dot(diffuseColor.rgb, CS_LUMA);
		diffuseColor.rgb = max(vec3(0.0), mix(vec3(csY), diffuseColor.rgb, csSat));
		// (b) piso de VALOR do albedo por ESCALA, nunca por soma. Multiplicar os três
		// canais pelo mesmo fator mantém o matiz E a saturação HSV idênticos: o preto do
		// Black Metal deixa de ser um buraco sem virar cinza lavado. (Somar aqui é o que
		// transformava cabelo preto em branco-rosado na R2.)
		// O NÍVEL que decide o ganho é REGIONAL (mip alto), não o texel: escalar cada texel
		// pelo seu próprio máximo é um DEGRAU e achata tudo que está abaixo do piso num
		// valor só. Com o nível regional o ganho é constante dentro da região, então toda
		// razão entre texels — o contraste interno — passa intacta. Ver C10.
		float csMx = max(diffuseColor.r, max(diffuseColor.g, diffuseColor.b));
		CS_ALB_LEVEL
		diffuseColor.rgb *= max(1.0, csAlbMin / max(csMx, 1e-4));
	}
`;
// O nível regional só existe onde há atlas de cor E textureLod (WebGL2). Sem os dois, o
// bloco cai no degrau antigo — degradação segura, não falha de compilação.
const CS_ALB_REGIONAL = `
		#ifdef USE_MAP
			vec3 csLo = textureLod(map, vMapUv, csAlbLod).rgb;
			csMx = max(csLo.r, max(csLo.g, csLo.b));
		#endif`;

// ── shader: CLAMP DE AMBIENTE. Injetado ANTES de <lights_fragment_end>, que é o
// único ponto onde `irradiance`/`iblIrradiance` ainda existem e ainda NÃO foram
// multiplicadas pelo albedo (isso acontece dentro de RE_IndirectDiffuse, via
// BRDF_Lambert, e dentro de RE_IndirectSpecular via cosineWeightedIrradiance).
// PORQUÊ AQUI: piso na irradiância é MULTIPLICATIVO no albedo -> clareia sem
// achatar croma. Piso na cor final é ADITIVO -> lava tudo pro mesmo cinza.
const CS_AMB = `
	#if defined( RE_IndirectDiffuse )
	{
		float csD = length(vViewPosition);
		// Os DOIS termos indiretos entram no difuso como (X / PI) * albedo, então o piso
		// tem que olhar a SOMA — senão o env map (PMREM do céu) fica fora da conta e o
		// piso dispara à toa a céu aberto.
		vec3  csAmb = irradiance + iblIrradiance;
		float csAL  = dot(csAmb, CS_LUMA);
		// O piso sobe com a distância porque é longe que o fog/haze come a silhueta
		// (Riot: o agente distante é clareado E ganha mais fresnel).
		float csFl  = mix(csFloorIrr, csFloorFar, smoothstep(10.0, 45.0, csD));
		float csAdd = max(0.0, csFl - csAL);
		/* O FILL HERDA A CROMINÂNCIA DO AMBIENTE, com a MESMA luminância de antes.
		   Somar vec3(csAdd) era somar BRANCO: no limite (personagem na sombra, onde
		   o piso responde por quase toda a luz) o iluminante virava neutro e a cor do céu
		   sumia do personagem — desbotar o iluminante desbota o pixel exatamente como
		   desbotar o albedo. Aqui o fill é a crominância normalizada da própria irradiância
		   (luminância 1 por construção), então dot(fill*csAdd, CS_LUMA) == csAdd: a
		   energia é IDÊNTICA à do fill branco, ponto a ponto, e nada pode estourar por
		   causa desta linha. csW desliga a herança quando a fonte é escura demais para
		   ter crominância confiável (aí voltar ao branco é o certo, não o contrário). */
		CS_AMB_FILL
		irradiance += csFill * csAdd;
		// Teto: um céu HDR muito claro não pode estourar o personagem (a outra metade do
		// clamp da Riot — "nem escuro demais, nem claro demais em nenhum canto do mapa").
		float csTot = csAL + csAdd;
		if (csTot > csCeilIrr) {
			float csS = csCeilIrr / max(csTot, 1e-4);
			irradiance *= csS;
			iblIrradiance *= csS;
		}
	}
	#endif
`;
const CS_FILL_CROMA = `
		float csIrrL  = dot(irradiance, CS_LUMA);
		float csW     = smoothstep(0.02, 0.20, csIrrL);
		vec3  csFill  = mix(vec3(1.0), irradiance / max(csIrrL, 1e-4), csW);`;
const CS_FILL_BRANCO = `
		vec3  csFill  = vec3(1.0);   // ?charambchroma=0 — o fill branco de antes, para o A/B`;

// ── shader: rugosidade POR REGIÃO, injetada logo após <roughnessmap_fragment>
// (aí diffuseColor já foi amostrado do atlas e roughnessFactor já existe).
const CS_REGION = `
	// Os GLB do Meshy trazem UM material por personagem (um atlas só) — não existe
	// slot separado de pele/tecido/metal. Classificamos pelo MATIZ do texel:
	// pele = R>G>B com saturação média; texel escuro = tecido, mais fosco.
	{
		float mxc = max(diffuseColor.r, max(diffuseColor.g, diffuseColor.b));
		float mnc = min(diffuseColor.r, min(diffuseColor.g, diffuseColor.b));
		float sat = mxc > 1e-4 ? (mxc - mnc) / mxc : 0.0;
		csMaxC = mxc;
		csSkinM = step(diffuseColor.g, diffuseColor.r) * step(diffuseColor.b, diffuseColor.g)
			* smoothstep(0.09, 0.20, sat) * (1.0 - smoothstep(0.42, 0.60, sat))
			* smoothstep(0.10, 0.20, mxc);
		roughnessFactor = mix(roughnessFactor, 0.52, csSkinM * 0.85);
		roughnessFactor = mix(roughnessFactor, 0.96, (1.0 - smoothstep(0.04, 0.26, mxc)) * 0.6);
		roughnessFactor = clamp(roughnessFactor, 0.08, 1.0);
	}
`;

// ── shader: clareza, injetada ANTES de <opaque_fragment> — ou seja, ainda em
// linear e ANTES do ACES: o rim é comprimido pelo ombro filmico em vez de clipar
// (critérios A3/A5), e o fog continua sendo aplicado por igual em cima.
// Aqui SÓ ficam termos que são luz ADICIONADA de verdade (rim e subsurface). O
// piso de ambiente saiu daqui na R3 — soma de luminância em cima da cor final é
// o que lavava o croma.
const CS_CLARITY = `
	{
		float csDist = length(vViewPosition);      // metros até a câmera
		vec3  csV    = normalize(vViewPosition);   // fragmento -> câmera
		// RIM/FRESNEL por time: o mecanismo ATIVO de separação exigido pelo C1
		// ("se o personagem só lê porque o mapa está bem iluminado, não lê").
		// DUAS bandas de propósito:
		//   - larga  (csRimPow ~1.7): cobre ~1/3 da silhueta, então move a MÉDIA de L*
		//     do recorte, que é o que o critério mede contra o anel de 20 px;
		//   - fina   (expoente 6): contorno explícito no rasante extremo — a alternativa
		//     que a própria régua aceita ("ΔL* ≥ 20 OU rim/contorno explícito").
		float csNV  = clamp(dot(normal, csV), 0.0, 1.0);
		float csF   = pow(1.0 - csNV, csRimPow) + pow(1.0 - csNV, 6.0) * csRimEdge;
		// csUpW prioriza os rasantes VOLTADOS PRA CIMA (ombro/cabeça/braço), onde
		// está a informação de combate — regra literal da Riot.
		vec3  csUp  = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
		float csUpW = mix(0.45, 1.55, clamp(dot(normal, csUp) * 0.5 + 0.5, 0.0, 1.0));
		// Cresce com a distância (Riot: agente longe é clareado e ganha mais fresnel).
		float csK   = mix(csRimNear, csRimFar, smoothstep(4.0, 34.0, csDist));
		outgoingLight += csRimColor * (csF * csUpW * csK);
`;
// Variante de quality low: uma banda só (corta um pow por fragmento). O contorno
// fica mais mole, mas o mecanismo continua existindo.
const CS_CLARITY_LOW = `
	{
		float csDist = length(vViewPosition);
		vec3  csV    = normalize(vViewPosition);
		float csNV  = clamp(dot(normal, csV), 0.0, 1.0);
		float csF   = pow(1.0 - csNV, csRimPow);
		vec3  csUp  = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
		float csUpW = mix(0.45, 1.55, clamp(dot(normal, csUp) * 0.5 + 0.5, 0.0, 1.0));
		float csK   = mix(csRimNear, csRimFar, smoothstep(4.0, 34.0, csDist));
		outgoingLight += csRimColor * (csF * csUpW * csK);
`;
// Fechamento + subsurface falso. Separado porque em quality low o SSS é CORTADO do
// shader (não só zerado): instrução que não existe é instrução que não custa.
const CS_SSS = `
		// 3) SUBSURFACE FALSO na pele: luz vazando na borda, quente e DESSATURADA de
		//    propósito — pele rosa-chiclete é o erro clássico do SSS falso.
		outgoingLight += vec3(0.40, 0.17, 0.12) * (csSkinM * csSss * csF);
`;
const CS_END = `	}
`;

/* Sonda de WebGL2, uma vez por carga. Um canvas 1×1 descartado é mais barato que um
   shader que não compila: em WebGL1 `textureLod` não existe no GLSL ES 1.0 e o
   personagem inteiro sumiria (material com erro de compilação não desenha). */
const _hasTextureLod = (() => {
  try {
    const c = document.createElement('canvas'); c.width = c.height = 1;
    const gl = c.getContext('webgl2');
    if (gl) { const e = gl.getExtension('WEBGL_lose_context'); if (e) e.loseContext(); }
    return !!gl;
  } catch { return false; }
})();

// Instala a injeção num MeshStandardMaterial de personagem. Idempotente.
export function applyCharFX(mat, rimColor) {
  if (!CHAR_FX.on || !mat || !mat.isMeshStandardMaterial || mat.userData.csFx) return mat;
  mat.userData.csFx = true;
  const rimOn = CHAR_FX.rim, clampOn = CHAR_FX.clamp;
  const u = {
    csRimColor: { value: new THREE.Color(rimColor || 0xffffff) },
    csRimNear:  { value: rimOn ? CHAR_FX.rimNear : 0 },
    csRimFar:   { value: rimOn ? CHAR_FX.rimFar : 0 },
    csRimPow:   { value: CHAR_FX.rimPow },
    csRimEdge:  { value: rimOn ? CHAR_FX.rimEdge : 0 },
    csFloorIrr: { value: CHAR_FX.floorIrr },
    csFloorFar: { value: CHAR_FX.floorFar },
    csCeilIrr:  { value: CHAR_FX.ceilIrr },
    csAlbMin:   { value: CHAR_FX.albMin },
    csAlbLod:   { value: CHAR_FX.albLod },
    csSat:      { value: CHAR_FX.sat },
    csSss:      { value: CHAR_FX.sss },
  };
  // `textureLod` só existe no GLSL ES 3.0 que o three emite em contexto WebGL2. Em
  // WebGL1 o bloco regional NÃO PODE nem ser injetado (é erro de compilação, não perda
  // de qualidade), então o piso volta a ser o degrau por texel. A decisão tem que ser a
  // MESMA aqui e no customProgramCacheKey abaixo — se divergir, o three serve um programa
  // compilado com o outro fonte. Por isso a sonda é module-level e não vem do renderer,
  // que só chega em onBeforeCompile, depois da chave já ter sido calculada.
  const regOn = clampOn && CHAR_FX.albReg && _hasTextureLod;
  mat.userData.csUniforms = u;   // tuning ao vivo sem recompilar
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    // ?charclamp=0 não zera uniform: REMOVE os dois blocos do fonte. Instrução que
    // não existe é instrução que não custa — e o kill-switch fica sendo prova de que
    // o clamp é a causa, não um palpite (o A/B vira "com bloco" x "sem bloco").
    let f = CS_PARS + shader.fragmentShader
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n' + CS_REGION)
      .replace('#include <opaque_fragment>',
        (CHAR_FX.low ? CS_CLARITY_LOW : CS_CLARITY) + (CHAR_FX.low ? '' : CS_SSS) + CS_END + '\n#include <opaque_fragment>');
    if (clampOn) {
      f = f
        .replace('#include <map_fragment>',
          '#include <map_fragment>\n' + CS_ALBEDO.replace('CS_ALB_LEVEL', regOn ? CS_ALB_REGIONAL : ''))
        .replace('#include <lights_fragment_end>',
          CS_AMB.replace('CS_AMB_FILL', CHAR_FX.ambChroma ? CS_FILL_CROMA : CS_FILL_BRANCO) + '\n#include <lights_fragment_end>');
    }
    shader.fragmentShader = f;
  };
  // Sem chave própria o three pode reaproveitar o programa de um material SEM a
  // injeção (a chave de cache padrão não enxerga onBeforeCompile). Constante de
  // propósito: todos os personagens compartilham UM programa, só os uniforms mudam.
  // O sufixo muda com a variante do FONTE (low corta SSS+banda fina; charclamp=0
  // corta albedo+ambiente) — se não mudasse, o three serviria o programa errado.
  mat.customProgramCacheKey = () => 'csCharFx4' + (CHAR_FX.low ? 'L' : 'H') + (clampOn ? 'C' : 'c') + (regOn ? 'R' : 'r') + (CHAR_FX.ambChroma ? 'K' : 'k');
  mat.needsUpdate = true;
  return mat;
}

// Corrige o material que o Meshy/Mint exporta nos GLB. PORQUÊ: os arquivos vêm com
// `pbrMetallicRoughness` SEM metallicFactor/roughnessFactor (o glTF manda assumir
// 1.0/1.0 = metal cru e fosco, que não tem difusa nenhuma) E com emissiveFactor
// [1,1,1] + emissiveTexture apontando pro próprio baseColor. Resultado: o personagem
// é praticamente UNLIT — luz nenhuma o toca, sombra nenhuma o escurece. É a causa
// direta do "chapado" (braço de pele rosa lisa do emo, ET verde uniforme). Aqui:
// metal 0, roughness real, emissivo zerado — o mínimo garantido de luz passa a vir
// do clamp na IRRADIÂNCIA (CS_AMB), que é multiplicativo e não achata o volume.
// (Na R1 esse emissivo é que segurava o croma alto: o personagem era literalmente
// o albedo cru na tela. Bonito de cor, zero volume — e a régua cobrou volume.)
export function upgradeCharMaterial(src, rimColor) {
  const m = new THREE.MeshStandardMaterial({
    map: src.map || null,
    color: src.color ? src.color.clone() : new THREE.Color(0xffffff),
    metalness: 0.0,
    roughness: 0.86,
    side: src.side,
    transparent: !!src.transparent,
    alphaTest: src.alphaTest || 0,
    alphaMap: src.alphaMap || null,
    normalMap: src.normalMap || null,
    /* ASPEREZA DO GLB — antes esta linha não existia e o mapa era peso morto.
       `grep roughnessMap public/js/characters.js public/js/glbchars.js` não dava uma
       linha: 17 personagens carregavam metallicRoughnessTexture do Mint no download e
       a tela desenhava `roughness: 0.86` fixo. O CHR5B contava ARQUIVO; o pixel vinha
       da constante. Agora o mapa entra como MULTIPLICADOR do 0,86 (é assim que o
       three.js usa roughnessMap: roughness × textura.g), que é o que mantém a média
       do elenco onde ela está e só quebra o especular chapado.
       `metalness` continua 0,0 fixo de propósito — o canal B destes mapas tem lixo
       (medido: metal médio 0,08 no oakley) e personagem metálico não é a direção de
       arte. Os mapas derivados por tools/char-surface-maps.mjs vêm centrados em ~0,93
       exatamente para caber neste multiplicador. */
    roughnessMap: src.roughnessMap || null,
    vertexColors: !!src.vertexColors,
  });
  if (src.normalScale && m.normalScale) m.normalScale.copy(src.normalScale);
  // 1.0 (era 0.85 na R2): sem o piso aditivo, o IBL do mapa voltou a ser a principal
  // fonte de fill do personagem — cortá-lo em 15% agora só escureceria a sombra.
  m.envMapIntensity = 1.0;
  m.name = src.name || 'char';
  m.userData.csSrcEmissive = true;
  // Se a injeção estiver desligada (?charfx=0) o clamp não existe: devolve um resto
  // de emissivo pro personagem não afundar em preto na sombra. Degradação segura.
  if (!CHAR_FX.on) { m.emissive = new THREE.Color(0xffffff); m.emissiveMap = m.map; m.emissiveIntensity = 0.10; }
  return applyCharFX(m, rimColor);
}

/* ── SOMBRA DE CONTATO ──────────────────────────────────────────────────────
   Um plano com alpha radial sob os pés. PORQUÊ e não o shadow map: a câmera de
   sombra do sol cobre 160 m em 2048² (~12,8 cm/texel, ARCH/BAR §3.5) — nessa
   resolução NÃO existe sombra de contato, e é exatamente por isso que os bots
   aparecem "colados" na areia do Piscinão e no barro do Ferro Velho. Isto custa
   2 triângulos por personagem e resolve o A2 independentemente do shadow map. */
let _csTex = null, _csGeo = null;
function contactShadowTexture() {
  if (_csTex) return _csTex;
  const S = 96;
  const c = document.createElement('canvas'); c.width = c.height = S;
  const x = c.getContext('2d');
  // Núcleo quase opaco + cauda longa: sombra de contato real tem miolo escuro sob o
  // pé e abre rápido. Um gradiente linear puro lê como borrão de Photoshop.
  const g = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0.00, 'rgba(0,0,0,1)');
  g.addColorStop(0.30, 'rgba(0,0,0,0.86)');
  g.addColorStop(0.60, 'rgba(0,0,0,0.34)');
  g.addColorStop(1.00, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, S, S);
  _csTex = new THREE.CanvasTexture(c);
  _csTex.colorSpace = THREE.SRGBColorSpace;
  return _csTex;
}
export function makeContactShadow(size = 0.9, opacity = CHAR_FX.csOp) {
  if (!_csGeo) _csGeo = new THREE.PlaneGeometry(1, 1);
  const m = new THREE.Mesh(_csGeo, new THREE.MeshBasicMaterial({
    map: contactShadowTexture(), color: 0x000000,
    transparent: true, opacity, depthWrite: false,
    side: THREE.DoubleSide, toneMapped: false,
  }));
  m.rotation.x = -Math.PI / 2;
  m.scale.set(size, size, 1);
  m.position.y = 0.02;                 // 2 cm: some acima do z-fight sem descolar do piso
  m.renderOrder = -1;                  // antes dos outros transparentes (fumaça, tracer)
  m.castShadow = false; m.receiveShadow = false;
  m.frustumCulled = false;
  m.userData.noHit = true;
  m.raycast = () => {};                // NUNCA absorve tiro: game.js raycasta o grupo inteiro
  m.userData.csBase = size;
  return m;
}

export const CHARACTERS = [
  { id: 'esquerdomacho', team: 'E', name: 'Esquerdomacho',
    blurb: 'Barba, tote bag e 47 bottons. Mira acadêmica: analisa a treta antes de atirar.',
    pal: { skin: 0xe8b98a, shirt: 0xb03a2e, pants: 0x3a4a5a, hair: 0x4a3428, boots: 0x2a2a2a } },
  { id: 'sindicato', team: 'E', name: 'Líder do Sindicato',
    blurb: 'Boné vermelho, colete de assembleia e megafone. Convoca greve de fogo a cada round.',
    pal: { skin: 0xc98d5e, shirt: 0x777777, pants: 0x2e3d55, hair: 0x3a3a3a, boots: 0x4a3428 } },
  { id: 'mst', team: 'E', name: 'Líder do MST',
    blurb: 'Do campo pra arena. Bandeira na mochila, bota no barro e tiro certeiro de enxada.',
    pal: { skin: 0x8d5a3b, shirt: 0x7a6a45, pants: 0x4a4030, hair: 0x2a1e14, boots: 0x5a3d1e } },
  { id: 'doutora', team: 'E', name: 'Doutora do SUS',
    blurb: 'Jaleco, estetoscópio e plantão de 24h. Receita tiro certeiro, na veia.',
    pal: { skin: 0xd9a580, shirt: 0xf0f0f0, pants: 0x3a4a5a, hair: 0x3a2a1e, boots: 0x6b6b6b } },
  { id: 'mistico', team: 'E', name: 'Jovem Místico',
    blurb: 'Faixa na testa, cristal no peito e aura calibrada. Só atira quando Mercúrio permite.',
    pal: { skin: 0xe8b98a, shirt: 0x9b59b6, pants: 0x3a4a5a, hair: 0x4a3428, boots: 0x5a3d1e } },
  { id: 'caminhoneiro', team: 'B', name: 'Caminhoneiro',
    blurb: 'Camisa do Brasil, luva de estrada e 40h de BR na semana. Freia pra ninguém.',
    pal: { skin: 0xd9a066, shirt: 0xffd23f, pants: 0x2e3d55, hair: 0x3a2a1e, boots: 0x3a3a3a } },
  { id: 'sertanejo', team: 'B', name: 'Cantor Sertanejo',
    blurb: 'Chapéu de cowboy, fivela de ouro e violão nas costas. Moda de viola em dose dupla.',
    pal: { skin: 0xc98d5e, shirt: 0x8a2f2f, pants: 0x2e3d55, hair: 0x2a1e14, boots: 0x5a3d1e } },
  { id: 'coach', team: 'B', name: 'Coach Quântico',
    blurb: 'Blazer, headset e 47 técnicas de manifestação. Já venceu antes de começar — no quântico.',
    pal: { skin: 0xf2c9a4, shirt: 0xf0f0f0, pants: 0x2a2a2a, hair: 0x2a2a2a, boots: 0x1a1a1a } },
  { id: 'gotinha', team: 'E', name: 'Zé da Gotinha',
    blurb: 'Mascote da saúde. Imuniza a treta com dose de reforço — e ainda pega o SUS de graça.',
    pal: { skin: 0xf4f4f4, shirt: 0xf4f4f4, pants: 0xf4f4f4, hair: 0x2fae5a, boots: 0xe03232 } },
  { id: 'farialimer', team: 'B', name: 'Faria Limer',
    blurb: 'Colete, sapatênis e planilha de day trade. Compra na baixa, atira na alta.',
    pal: { skin: 0xf2c9a4, shirt: 0x8fb8e0, pants: 0xcdbb98, hair: 0x2a2018, boots: 0xf0f0f0 } },
  { id: 'bombado', team: 'B', name: 'Bombado da Academia',
    blurb: 'Peitoral gigante, perna de palito. Pulou o leg day pra treinar o gatilho.',
    pal: { skin: 0x8d5a3b, shirt: 0xffd23f, pants: 0x2e3d55, hair: 0x2a2a2a, boots: 0xf0f0f0 } },
  { id: 'hipster', team: 'E', name: 'Hipster Alternativo',
    blurb: 'Moicano colorido e camiseta de banda que você não conhece. Já jogava isso antes de ser mainstream.',
    pal: { skin: 0xe8b98a, shirt: 0x1a1a1a, pants: 0x3a4a5a, hair: 0x2fd3c0, boots: 0xf0f0f0 } },
  { id: 'dollynho', team: 'B', name: 'Dollynho',
    blurb: 'Mascote do guaraná polêmico. Efervescente, gelado e sempre do contra.',
    pal: { skin: 0x2fae4a, shirt: 0x2fae4a, pants: 0x1f8a38, hair: 0xf0f0f0, boots: 0xf0f0f0 } },
  { id: 'et', team: 'E', name: 'ET de Varginha',
    blurb: 'Veio de longe pra treta. Abduz a direita e some no mato de Minas.',
    pal: { skin: 0x8a9a7a, shirt: 0x8a9a7a, pants: 0x6a7a5a, hair: 0x8a9a7a, boots: 0x5a6a4a } },
  { id: 'ancap', team: 'B', name: 'Ancap Medieval',
    blurb: 'Cota de malha, cruz templária e capa verde-amarela. Privatiza a treta e xinga o Banco Central.',
    pal: { skin: 0xe8b98a, shirt: 0xf0f0f0, pants: 0x3a3a30, hair: 0x8a8a8a, boots: 0x9a9a8a } },
  { id: 'canarinho', team: 'B', name: 'Canarinho Pistola',
    blurb: 'Pistola desde 2016. Bico torto, peito estufado e camisa 24: ele NÃO amarela.',
    pal: { skin: 0xf2c531, shirt: 0xffd23f, pants: 0x2e56c4, hair: 0xf2c531, boots: 0x3a6fd8 } },
  { id: 'proerd', team: 'B', name: 'Leão do Proerd',
    blurb: 'Camisa preta colada, rugido de mascote de formatura e garra afiada na defesa da treta.',
    pal: { skin: 0xd9a25f, shirt: 0x1a1a1a, pants: 0x2e3d55, hair: 0x8a3a26, boots: 0xf0f0f0 } },
  // ── PALHAÇOS (4ª facção, models GLB do Mint). team:'C' + tribe:'palhacos'.
  // bonzo (ex-bozo) já tem GLB; os 8 abaixo entram no GLB_CHARS quando os rigs saírem
  // (hoje: fallback procedural via pal). Voz/round/captura própria (manifest chave 'C').
  { id: 'bonzo', team: 'C', tribe: 'palhacos', name: 'Bonzo',
    blurb: 'Do picadeiro pra praça. Nariz vermelho, sapatão marrom e risada de quem arma o circo.',
    pal: { skin: 0xf5f0e6, shirt: 0x3b6fd4, pants: 0x2f56a8, hair: 0xd43a2e, boots: 0x6b4a2f } },
  { id: 'palhacomal', team: 'C', tribe: 'palhacos', name: 'Palhaço do Mal',
    blurb: 'Riso que gela a espinha. Sai do picadeiro direto pro pesadelo — e ainda cobra ingresso.',
    pal: { skin: 0xf0ece4, shirt: 0x5a1420, pants: 0x3a1018, hair: 0x161616, boots: 0x2a1a14 } },
  { id: 'jozo', team: 'C', tribe: 'palhacos', name: 'Jozo',
    blurb: 'Mascote de lanche pirata. Fritou o juízo no óleo e agora só serve treta com batata.',
    pal: { skin: 0xf4f0ea, shirt: 0xd83030, pants: 0x1a1a1a, hair: 0xd43a2e, boots: 0xd83030 } },
  { id: 'adjim', team: 'C', tribe: 'palhacos', name: 'Adjim',
    blurb: 'Espirra, ri e atira. Metade da dupla que faz a criançada chorar de rir (e de medo).',
    pal: { skin: 0xf0d8c8, shirt: 0x2fae4a, pants: 0xffd23f, hair: 0x2fae4a, boots: 0xffd23f } },
  { id: 'esbirro', team: 'C', tribe: 'palhacos', name: 'Esbirro',
    blurb: 'A outra metade da dupla. Buzina no gatilho e resenha no recuo.',
    pal: { skin: 0xf0d8c8, shirt: 0xd83030, pants: 0x2e56c4, hair: 0xe8792a, boots: 0x2e56c4 } },
  { id: 'titica', team: 'C', tribe: 'palhacos', name: 'Titica',
    blurb: 'Do circo pro Congresso e do Congresso pra arena, sempre no bom humor e no gatilho leve.',
    pal: { skin: 0xd9a066, shirt: 0xe8792a, pants: 0xd83030, hair: 0xf0f0f0, boots: 0x2fae4a } },
  { id: 'padati', team: 'C', tribe: 'palhacos', name: 'Padati',
    blurb: 'Um da dupla mais colorida do picadeiro. Cambalhota, buzina e mira infantil.',
    pal: { skin: 0xf4f0ea, shirt: 0x2e56c4, pants: 0xffd23f, hair: 0x2e6ad8, boots: 0x2e56c4 } },
  { id: 'padata', team: 'C', tribe: 'palhacos', name: 'Padata',
    blurb: 'O outro da dupla. Se um erra, o outro acerta — geralmente na risada.',
    pal: { skin: 0xf4f0ea, shirt: 0xd83030, pants: 0xffd23f, hair: 0xd43a2e, boots: 0xd83030 } },
  { id: 'cadequinha', team: 'C', tribe: 'palhacos', name: 'Cadequinha',
    blurb: 'Clássico dos clássicos. Cartola, xadrez e uma gargalhada que atravessa gerações.',
    pal: { skin: 0xf0dcc8, shirt: 0xd83030, pants: 0xf0ece4, hair: 0xc88030, boots: 0xd83030 } },

  // ── TRIBOS URBANAS (3º grupo, models GLB do Mint). team:'U' = invisível aos filtros P/B
  // (bots e seleção política não os pegam); selecionáveis via tribe:'urbanas' em qualquer lado.
  // Modo de FACÇÃO dedicada (spawns/placar próprios) fica como follow-up. pal é fallback (usam GLB).
  { id: 'emo', team: 'U', tribe: 'urbanas', name: 'Emo',
    blurb: 'Franja na cara e playlist de sofrência. Mira embaçada por um olho só.',
    pal: { skin: 0xe6d3d0, shirt: 0x1a1a1a, pants: 0x1a1a1a, hair: 0x111111, boots: 0x1a1a1a } },
  { id: 'blackmetal', team: 'U', tribe: 'urbanas', name: 'Black Metal',
    blurb: 'Corpse paint, cabelão e blast beat. Congela a treta num inverno norueguês.',
    pal: { skin: 0xf0f0f0, shirt: 0x0a0a0a, pants: 0x0a0a0a, hair: 0x0a0a0a, boots: 0x0a0a0a } },
  { id: 'metaleiro', team: 'U', tribe: 'urbanas', name: 'Metaleiro',
    blurb: 'Jaqueta jeans coberta de bottons e cabelo até a cintura. Headbang no recuo.',
    pal: { skin: 0xd9a580, shirt: 0x1a2740, pants: 0x24324f, hair: 0x2a1e14, boots: 0x1a1a1a } },
  { id: 'punk', team: 'U', tribe: 'urbanas', name: 'Punk',
    blurb: 'Moicano colorido e jaqueta de spikes. Anarquia, três acordes e um tiro só.',
    pal: { skin: 0xe8b98a, shirt: 0x111111, pants: 0x3a2a2a, hair: 0xe23bcf, boots: 0x1a1a1a } },
  { id: 'skatista', team: 'U', tribe: 'urbanas', name: 'Skatista',
    blurb: 'Gorro, camiseta larga e joelho ralado. Dropa a treta de flip.',
    pal: { skin: 0xd9a066, shirt: 0x3a6ea5, pants: 0x2a2a2a, hair: 0x2a1e14, boots: 0xf0f0f0 } },
  { id: 'clubber', team: 'U', tribe: 'urbanas', name: 'Clubber',
    blurb: 'Regata neon e glowstick. Só atira no drop da batida.',
    pal: { skin: 0xf0c9a4, shirt: 0x1affd2, pants: 0x141414, hair: 0x101010, boots: 0xf0f0f0 } },
  { id: 'rapper', team: 'U', tribe: 'urbanas', name: 'Rapper',
    blurb: 'Camisão gigante, correntes de ouro e calça saggy. Rima e recarrega no flow.',
    pal: { skin: 0x8d5a3b, shirt: 0xf0f0f0, pants: 0x2a3550, hair: 0x1a1a1a, boots: 0xf0f0f0 } },
  { id: 'reggae', team: 'U', tribe: 'urbanas', name: 'Rasta',
    blurb: 'Dreads, gorro rastafári e paz interior. Só que armado. Jah guia a mira.',
    pal: { skin: 0x5a3a22, shirt: 0xd9a441, pants: 0x3a5a3a, hair: 0x1a1a1a, boots: 0x6b4a2f } },
  { id: 'pagodeiro', team: 'U', tribe: 'urbanas', name: 'Pagodeiro',
    blurb: 'Platinado, roupa toda branca e corrente de ouro. Canta o hit e acerta o tiro no refrão.',
    pal: { skin: 0xc98d5e, shirt: 0xf0f0f0, pants: 0xf0f0f0, hair: 0xe8e0c0, boots: 0xf0f0f0 } },

  // ── FUNKEIROS (5ª facção, models GLB do Mint). team:'F' + tribe:'funkeiros'.
  // O mandrake é o antigo "funkeiro" dos tribos — o visual sempre foi de mandrake, só
  // estava na facção errada (movido; pagodeiro cobre o slot dele nos tribos).
  // raul/oakley/criarj/chave regerados com referência; o resto veio do pack original.
  // pal é fallback (todos usam GLB). Selecionável em qualquer lado (joga no lado P).
  { id: 'mandrake', team: 'F', tribe: 'funkeiros', name: 'Mandrake',
    blurb: 'Boné, Juliet vermelho e corrente de ouro. Ostenta e domina na quebrada.',
    pal: { skin: 0xd9a066, shirt: 0xf0f0f0, pants: 0xd03030, hair: 0xe8e0c0, boots: 0x2e56c4 } },
  { id: 'raul', team: 'F', tribe: 'funkeiros', name: 'Raul da Franja',
    blurb: 'Franja açucarada, camisa de grife e cordão de ouro falso. Desfila antes de atirar.',
    pal: { skin: 0xd9a580, shirt: 0x1a2740, pants: 0x1a2740, hair: 0x1a1a1a, boots: 0xcdbb98 } },
  { id: 'oakley', team: 'F', tribe: 'funkeiros', name: 'Oakley',
    blurb: 'Chapéu Medusa, colete tático e tattoo no braço. O corre só passa por ele.',
    pal: { skin: 0xc98d5e, shirt: 0x1a1a1a, pants: 0x2a2a2a, hair: 0x1a1a1a, boots: 0x1a1a1a } },
  { id: 'criarj', team: 'F', tribe: 'funkeiros', name: 'Cria RJ',
    blurb: 'Cabelo zebrado platinado e camisa de time. Cria do morro, mira de craque.',
    pal: { skin: 0x8d5a3b, shirt: 0xd03030, pants: 0x1a1a1a, hair: 0xe8e0c0, boots: 0xf0f0f0 } },
  { id: 'chave', team: 'F', tribe: 'funkeiros', name: 'Chave SP',
    blurb: 'Polo, boné e óculos escuros. Só entra na treta se for chave.',
    pal: { skin: 0xd9a066, shirt: 0x2fae4a, pants: 0x2a3550, hair: 0x1a1a1a, boots: 0xf0f0f0 } },
  { id: 'funkraiz', team: 'F', tribe: 'funkeiros', name: 'Funk Raiz',
    blurb: 'Tamborzão na cabeça e passinho no recuo. O funk mais velho da arena.',
    pal: { skin: 0x5a3a22, shirt: 0xf0f0f0, pants: 0x2a2a2a, hair: 0x1a1a1a, boots: 0x6b4a2f } },
  { id: 'trapfunk', team: 'F', tribe: 'funkeiros', name: 'Trap Funk',
    blurb: 'Autotune no grito de guerra e 808 no peito. Trap em dose dupla.',
    pal: { skin: 0x8d5a3b, shirt: 0x1a1a1a, pants: 0x2e3d55, hair: 0x1a1a1a, boots: 0xf0f0f0 } },
  { id: 'fluxo', team: 'F', tribe: 'funkeiros', name: 'Fluxo',
    blurb: 'Óculos espelhado e corte na régua. No fluxo, quem corre é a bala.',
    pal: { skin: 0xc98d5e, shirt: 0x2a2a2a, pants: 0x2a2a2a, hair: 0x1a1a1a, boots: 0xf0f0f0 } },
  { id: 'ostentacao', team: 'F', tribe: 'funkeiros', name: 'Ostentação',
    blurb: 'Corrente, anel e relógio brilhando. Se é pra atirar, que seja com estilo.',
    pal: { skin: 0xd9a066, shirt: 0xf0f0f0, pants: 0x1a1a1a, hair: 0x1a1a1a, boots: 0xffd23f } },

  // ═══════════════════════════════════════════════════════════════════════════
  //  TIME MÍTICO (M) — heróis históricos, folclore e literatura brasileira.
  //  Nenhum personagem da atualidade, nenhum copyright. Spec: plans/09-TIME-MITICO.md
  // ═══════════════════════════════════════════════════════════════════════════
  { id: 'mariabonita', team: 'M', tribe: 'mitico', name: 'Maria Bonita',
    blurb: 'Cangaceira de precisão. Parou, mirou, acertou — a rainha do primeiro tiro.',
    pal: { skin: 0xc49070, shirt: 0xb04020, pants: 0x6a3020, hair: 0x1a0a00, boots: 0x4a2a1a } },
  { id: 'saci', team: 'M', tribe: 'mitico', name: 'Saci-Pererê',
    blurb: 'Moleque de uma perna só. Redemoinho de fumaça e some — o gorro vermelho é hitbox.',
    pal: { skin: 0x8d6a4f, shirt: 0xc01010, pants: 0xc01010, hair: 0xc01010, boots: 0x1a1a1a } },
  { id: 'lampiao', team: 'M', tribe: 'mitico', name: 'Lampião',
    blurb: 'Cangaço no gatilho. Quanto mais segura o tiro, mais dano faz — Virgem Maria!',
    pal: { skin: 0xb0805a, shirt: 0x8a4a2a, pants: 0x5a3a1a, hair: 0x1a0a00, boots: 0x3a2a1a } },
  { id: 'lobisomem', team: 'M', tribe: 'mitico', name: 'Lobisomem',
    blurb: 'Sétimo filho, maldição da encruzilhada. O lobo-guará acorda na sexta-feira à meia-noite.',
    pal: { skin: 0x9a8a7a, shirt: 0x1a1a2a, pants: 0x1a1a1a, hair: 0x1a1a1a, boots: 0x2a2a2a } },
  { id: 'bandeirante', team: 'M', tribe: 'mitico', name: 'Bandeirante',
    blurb: 'Caçador de pegadas. Vê onde o inimigo pisou — o vilão que o time tolera.',
    pal: { skin: 0xc09070, shirt: 0x4a3a2a, pants: 0x3a2a1a, hair: 0x4a3a2a, boots: 0x2a1a0a } },
  { id: 'boto', team: 'M', tribe: 'mitico', name: 'Boto Cor de Rosa',
    blurb: 'O sedutor do Amazonas. De dia é golfinho rosa, de noite é homem de terno branco e chapéu.',
    pal: { skin: 0xffaaaa, shirt: 0xffffff, pants: 0xffffff, hair: 0x6a4a3a, boots: 0xffffff } },
  { id: 'zumbi', team: 'M', tribe: 'mitico', name: 'Zumbi dos Palmares',
    blurb: 'Capitão quilombola. O grito de Palmares ecoa e acelera a recarga dos aliados.',
    pal: { skin: 0x4a3020, shirt: 0x8b0000, pants: 0x3a2a1a, hair: 0x1a0a00, boots: 0x2a1a0a } },
  { id: 'cuca', team: 'M', tribe: 'mitico', name: 'Cuca',
    blurb: 'A bruxa de Lobato. Lança poção de lentidão e visão embaralhada — "dorme com o medo".',
    pal: { skin: 0x4a6a4a, shirt: 0x2a3a2a, pants: 0x3a2a3a, hair: 0x2a2a1a, boots: 0x1a2a1a } },
  { id: 'curupira', team: 'M', tribe: 'mitico', name: 'Curupira',
    blurb: 'Menino de cabelo de fogo, pés virados. As pegadas apontam pro lado errado.',
    pal: { skin: 0xb88a5a, shirt: 0x4a6a3a, pants: 0x3a4a2a, hair: 0xff4400, boots: 0x3a2a1a } },
];
export const byId = id => CHARACTERS.find(c => c.id === id);

// Which weapon each character is shown holding (character-select) AND spawns with.
// Shared by main.js (select screen) and game.js (initial loadout) so they never disagree.
export const CHAR_WEAPON = {
  esquerdomacho: 'pistol', sindicato: 'shotgun', mst: 'ak', doutora: 'm4', mistico: 'mp5',
  caminhoneiro: 'md97', sertanejo: 'revolver38',
  coach: 'scar', gotinha: 'mp5', farialimer: 'm4', bombado: 'lmg', hipster: 'uzi',
  dollynho: 'p90', et: 'awp', ancap: 'mosin',
  bonzo: 'revolver38', canarinho: 'deagle', proerd: 'md97',
  palhacomal: 'g3sg1', jozo: 'shotgun', adjim: 'uzi', esbirro: 'mp5', titica: 'ak', padati: 'pistol', padata: 'p90', cadequinha: 'revolver38',
  mandrake: 'ak', raul: 'deagle', oakley: 'md97', criarj: 'uzi', chave: 'mp5',
  funkraiz: 'shotgun', trapfunk: 'scar', fluxo: 'p90', ostentacao: 'deagle', pagodeiro: 'pistol',
  // Time Mítico
  mariabonita: 'awp', saci: 'mp5', lampiao: 'm4', lobisomem: 'pistol',
  bandeirante: 'mosin', boto: 'deagle', zumbi: 'ak', cuca: 'shotgun', curupira: 'mp5',
};
export const charWeapon = (id) => CHAR_WEAPON[id] || 'ak';

const matCache = new Map();
// Era MeshLambertMaterial em TUDO: sem especular, sem env map, sem rugosidade — o
// personagem procedural não tinha como reagir à nova exposição do mapa. Agora é
// Standard com rugosidade POR REGIÃO (pele lisa x tecido fosco x couro), e recebe a
// mesma injeção de clareza dos GLB. O rim aqui é NEUTRO quente porque o cache é
// global (compartilhado entre times e com as miniaturas do menu); a cor por time só
// existe nos GLB, onde cada bot tem material próprio.
function M(color, rough = 0.86) {
  const k = `${color}|${rough}`;
  if (!matCache.has(k)) {
    matCache.set(k, applyCharFX(new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.0 }), 0xffe8d8));
  }
  return matCache.get(k);
}
function box(w, h, d, color, x = 0, y = 0, z = 0, rough = 0.86) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(color, rough));
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = CHAR_FX.recv; return m;
}

// AWP-style rifle, pointing +Z. ~0.9m long.
export function buildRifle(color = 0x2e4a2e) {
  const g = new THREE.Group();
  g.add(box(0.06, 0.10, 0.42, color, 0, 0, 0.05));                    // receiver/body
  g.add(box(0.05, 0.07, 0.22, 0x2a2a2a, 0, -0.045, -0.20));           // stock
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.5, 6), M(0x222222));
  barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.012, 0.48); barrel.castShadow = true; g.add(barrel);
  const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.16, 8), M(0x1a1a1a));
  scope.rotation.x = Math.PI / 2; scope.position.set(0, 0.09, 0.06); g.add(scope);
  g.add(box(0.02, 0.05, 0.03, 0x222222, 0, 0.045, 0.0));              // scope mount
  g.add(box(0.04, 0.12, 0.06, 0x3a2a1e, 0, -0.10, 0.02));             // grip
  return g;
}

/* ═══════════════════════════════════════════════════════════════════════════
   PROPORÇÃO DO CORPO PROCEDURAL — o conserto do "balão" (rodada da RÉGUA)
   ---------------------------------------------------------------------------
   O dono disse: "os funkeiros tão ainda balão". A régua (tools/eval/char-probe.mjs)
   mediu o corpo que ESTE arquivo constrói e o número deu razão a ele — e mostrou que
   o defeito não é de funkeiro nenhum, é do MOLDE, que era um só para os 44:

     razão (bind pose)          ANTES   humano   erro
     ombro/altura               0,403   0,259    +56%
     larguraTorso/altura        0,389   0,174   +124%
     cabeça/altura              0,169   0,130    +30%
     braço/altura               0,306   0,440    −30%
     perna/altura               0,470   0,530    −11%
     índice de balão (largura/altura ÷ humano)  2,24

   Ou seja: tronco com mais que o DOBRO da largura relativa de uma pessoa, cabeça 30%
   grande, braço e perna curtos. Isso é literalmente a descrição de um balão, e valia
   para o elenco inteiro — não só para os funkeiros.

   PROCEDÊNCIA DOS NÚMEROS ABAIXO, e o que ela NÃO é:
   as frações são ANTROPOMETRIA PUBLICADA — Drillis, R. & Contini, R. (1966), "Body
   Segment Parameters", NYU report 1166-03, tabela reproduzida em Winter, "Biomechanics
   and Motor Control of Human Movement", fig. 4.1. Isto é FALLBACK DECLARADO, não foto
   medida: a tarefa mandava medir `references/funkeiros/` (18 fotos) e
   `references/palhacos/` (21), e ESSAS PASTAS NÃO EXISTEM nesta árvore (git ls-files
   references devolve 3 arquivos, todos de viewmodel). Ver tools/eval/ref-body.py, que
   declara o fallback e MEDE as fotos assim que elas existirem.
   A regra da casa é "teto só com procedência"; fallback rotulado como fallback cumpre a
   regra, palpite disfarçado de medição não.
   ═══════════════════════════════════════════════════════════════════════════ */
export const CHAR_H = 1.72;                     // = TARGET_HEIGHT do glbchars.js:52
const AP = {                                    // frações de estatura (ver bloco acima)
  cabeca: 0.130,        // vértex → mento
  ombro: 0.259,         // largura biacromial (vão externo dos ombros)
  torso: 0.174,         // largura de tórax
  toraxProf: 0.115,     // profundidade de tórax
  braco: 0.440,         // acrômio → dactílio
  perna: 0.530,         // trocânter maior → chão (= altura do quadril)
  acromio: 0.818,       // altura do ombro
};
// dimensões em METROS, derivadas UMA vez (a régua lê a geometria, não estes literais)
const D = {
  quadrilY: AP.perna * CHAR_H,                                  // 0,912
  ombroY: AP.acromio * CHAR_H,                                  // 1,407
  cabecaAlt: AP.cabeca * CHAR_H,                                // 0,224
  get pescocoY() { return CHAR_H - this.cabecaAlt; },            // 1,496
  torsoW: AP.torso * CHAR_H,                                    // 0,299
  torsoD: AP.toraxProf * CHAR_H,                                // 0,198
  ombroVao: AP.ombro * CHAR_H,                                  // 0,445
  bracoLen: AP.braco * CHAR_H,                                  // 0,757
  bracoW: 0.098, bracoD: 0.115,
  pernaW: 0.135, pernaD: 0.155,
  cabecaW: 0.185, cabecaD: 0.205,
  botaAlt: 0.10,
};

// Marca um mesh como ADEREÇO (boné, cabelo, mochila, corrente...). A régua usa isto para
// medir o CORPO sem o adereço: sem a marca, um chapéu de aba entra na bbox e a "cabeça"
// medida vira cabeça+chapéu — que foi exatamente o modo de falha que o autoteste do
// ref-body.py pegou (erro de 68% no sertanejo). O adereço CONTINUA na silhueta (C6): ele
// é justamente o que faz um personagem não ser o outro.
function marcaAdereco(o) { o.traverse((c) => { c.userData.adereco = true; }); return o; }

// Humanoid de CHAR_H m, origem nos pés, olhando +Z.
export function buildCharacter(def) {
  const p = def.pal, g = new THREE.Group();
  const parts = {};
  // `bulky` era um if de um id só (caminhoneiro). Virou um FATOR por personagem, porque
  // o C6 mediu 9 silhuetas distintas para 44 personagens — 36 deles eram o MESMO boneco,
  // incluindo os 9 funkeiros, os 8 palhaços e o dollynho, todos com IoU 1,000 entre si.
  const v = varianteDoCorpo(def);

  // Sombra de contato antes de tudo: o fallback procedural sofria do mesmo A2 dos GLB.
  // Na tela de seleção ela cai sobre o disco escuro do preview (main.js:248) e ancora
  // o personagem ali também.
  if (CHAR_FX.shadow) g.add(makeContactShadow(0.86));

  const alturaQuadril = D.quadrilY * v.perna;
  const ombroY = D.ombroY * v.tronco;
  const pescocoY = D.pescocoY;

  // legs (pivot at hip)
  for (const s of [-1, 1]) {
    const geo = new THREE.BoxGeometry(D.pernaW * v.largura, alturaQuadril - D.botaAlt, D.pernaD);
    geo.translate(0, -(alturaQuadril - D.botaAlt) / 2, 0);
    const leg = new THREE.Mesh(geo, M(p.pants)); leg.castShadow = true; leg.receiveShadow = CHAR_FX.recv;
    leg.position.set(D.pernaW * 0.78 * s, alturaQuadril, 0);
    // bota assentada no chão POR CONSTRUÇÃO (topo da bota = base da perna): o C3 media
    // 0 na bind e é assim que continua.
    leg.add(box(D.pernaW * 1.06, D.botaAlt, D.pernaD * 1.5, p.boots, 0, -(alturaQuadril - D.botaAlt) - D.botaAlt / 2, 0.03, 0.62));
    // marcos que o poseCharacter precisa (ele só recebe `parts`): altura do pivô e o
    // comprimento do pivô até a SOLA — é este L que entra no L·(1−cos θ) do passo.
    leg.userData.quadrilY = alturaQuadril;
    leg.userData.compLegPivot = alturaQuadril;
    // extensão em z da SOLA (a bota é deslocada 0,03 pra frente e é 1,5× mais funda que a
    // perna): entra na conta do pé de apoio no poseCharacter.
    leg.userData.solaZ = [0.03 - D.pernaD * 1.5 / 2, 0.03 + D.pernaD * 1.5 / 2];
    g.add(leg); parts[s < 0 ? 'legL' : 'legR'] = leg;
  }
  // torso
  const torsoW = D.torsoW * v.largura;
  const torso = new THREE.Group(); torso.position.y = alturaQuadril;
  const alturaTronco = pescocoY - alturaQuadril;
  const chest = box(torsoW, alturaTronco, D.torsoD * v.profundidade, p.shirt, 0, alturaTronco / 2, 0);
  torso.add(chest);
  torso.userData.quadrilY = alturaQuadril;   // poseCharacter precisa e só recebe `parts`
  g.add(torso); parts.torso = torso; parts.chest = chest;

  // head (pivot at neck) — pele com rugosidade mais baixa que o tecido (0.55): é a
  // diferença que faz o rosto ter volume em vez de ler como papel colorido.
  const head = new THREE.Group(); head.position.y = pescocoY;
  head.add(box(D.cabecaW * v.cabeca, D.cabecaAlt * v.cabeca, D.cabecaD * v.cabeca, p.skin, 0, D.cabecaAlt * v.cabeca / 2, 0, 0.55));
  head.userData.pescocoY = pescocoY;
  g.add(head); parts.head = head;

  // arms holding rifle forward (pivot at shoulder)
  // O vão externo dos ombros é o que a régua chama de `ombroSobreAltura`: por isso o x do
  // braço sai do VÃO alvo menos meia largura de braço, e não de `torsoW/2 + 0.06` (que
  // dependia da largura do tronco e por isso escalava o erro junto com ela).
  const bracoLen = D.bracoLen * v.braco;
  for (const s of [-1, 1]) {
    const geo = new THREE.BoxGeometry(D.bracoW, bracoLen, D.bracoD); geo.translate(0, -bracoLen / 2, 0);
    const arm = new THREE.Mesh(geo, M(p.shirt));
    arm.castShadow = true; arm.receiveShadow = CHAR_FX.recv;
    arm.position.set((D.ombroVao * v.largura / 2 - D.bracoW / 2) * s, ombroY - alturaQuadril, 0);
    arm.rotation.x = -1.35;                                            // forward hold
    arm.rotation.z = -0.12 * s;
    torso.add(arm); parts[s < 0 ? 'armL' : 'armR'] = arm;
  }
  // rifle in front of chest
  const gun = buildRifle();
  gun.position.set(0.10, ombroY - alturaQuadril - 0.18, 0.30);
  torso.add(gun); parts.gun = gun;

  // team armband
  /* `E` (era `P`, rename de 06/08) e `C` explícito: sem o ramo, a facção cai no ELSE e sai
     azul de Tribos Urbanas — o time do jogador usava braçadeira azul e os palhaços também.
     O else continua sendo o U, de propósito, e é isso que a régua declara. */
  const band = def.team === 'E' ? 0xe03232 : def.team === 'B' ? 0x1faa4d : def.team === 'F' ? 0xffc233 : def.team === 'C' ? 0xc23a86 : def.team === 'M' ? 0x7b2cbf : 0x4aa3ff;
  parts.armL.add(marcaAdereco(box(D.bracoW + 0.02, 0.08, D.bracoD + 0.02, band, 0, -bracoLen * 0.24, 0)));

  addAccessories(def, parts, torsoW);
  adereçosDoBlurb(def, parts, torsoW);

  /* NORMALIZAÇÃO DE ALTURA — o procedural não tinha nenhuma, e por isso divergia do GLB.
     O glbchars.js:319-322 escala todo GLB pra TARGET_HEIGHT (1,72 m); o caminho procedural
     nascia com a altura que saísse. Medido ANTES: 1,66 a 1,80 m, dispersão de 0,14 m — e a
     hitbox de cabeça tem 0,30 m (glbchars.js:296), ou seja, quase MEIA CABEÇA de diferença
     entre dois bots. Mirar na cabeça virava sorte, dependendo de quem spawnou.
     Escala pela altura do CORPO (adereço fora): normalizar pela bbox bruta encolheria quem
     usa chapéu e o faria ler mais LARGO — que é justamente o caminho pro "balão". Este é o
     mesmo defeito que o glbchars.js ainda tem no caminho GLB (ver o relatório da rodada:
     lá não dá pra separar chapéu de cabeça sem o asset em mãos). */
  const alvo = new THREE.Box3();
  const vtmp = new THREE.Vector3();
  let minY = Infinity, maxY = -Infinity;
  g.updateMatrixWorld(true);
  g.traverse((o) => {
    if (!o.isMesh || o.userData.adereco || o.userData.csShadow || o === parts.gun) return;
    if (parts.gun && parts.gun.getObjectById(o.id)) return;
    alvo.setFromObject(o);
    if (isFinite(alvo.min.y)) { minY = Math.min(minY, alvo.min.y); maxY = Math.max(maxY, alvo.max.y); }
  });
  void vtmp;
  if (isFinite(minY) && maxY > minY) {
    const k = CHAR_H / (maxY - minY);
    // ±12%: fora disso é bug de construção, não variação — melhor deixar visível que
    // esconder atrás de uma escala silenciosa.
    if (k > 0.88 && k < 1.12) { g.scale.setScalar(k); g.position.y = -minY * k; }
  }
  return { group: g, parts, def };
}

/* VARIAÇÃO DE CORPO POR PERSONAGEM — o conserto do C6.
   MEDIDO ANTES: 9 silhuetas distintas para 44 personagens; um único grupo de 36 clones
   com IoU 1,000 entre si (todos os funkeiros, todos os palhaços, todos os tribos e o
   dollynho). "Aliado × inimigo distinguíveis" estava, literalmente, em 1,000.
   PROCEDÊNCIA: os fatores saem do que o PRÓPRIO REPO já autorou sobre cada personagem —
   a facção (`team`/`tribe`) e o `blurb`, que descreve o corpo em português ("peitoral
   gigante, perna de palito", "mascote", "camisão gigante"). Não é número inventado: é a
   intenção de design que já estava escrita, virando geometria. Os fatores ficam dentro de
   ±25% justamente para NÃO reintroduzir o balão que a régua acabou de derrubar — quem
   garante isso é a invariante C1. */
function varianteDoCorpo(def) {
  const b = (def.blurb || '').toLowerCase();
  const v = { largura: 1, profundidade: 1, cabeca: 1, braco: 1, perna: 1, tronco: 1 };
  const tem = (...ks) => ks.some((k) => b.includes(k));
  if (tem('peitoral gigante')) { v.largura = 1.22; v.profundidade = 1.20; v.braco = 1.06; v.perna = 0.96; }
  if (tem('mascote', 'gotinha')) { v.cabeca = 1.24; v.largura = 1.14; v.profundidade = 1.16; v.braco = 0.84; v.perna = 0.88; }
  if (tem('camisão gigante', 'camisao gigante', 'saggy')) { v.largura = 1.16; v.profundidade = 1.10; v.perna = 0.94; }
  if (tem('veio de longe', 'abduz')) { v.cabeca = 1.20; v.largura = 0.86; v.braco = 1.14; v.perna = 1.06; }   // ET
  if (tem('cota de malha', 'colete de assembleia', 'colete tático', 'colete tatico')) { v.largura = 1.12; v.profundidade = 1.14; }
  if (tem('do campo', 'estrada')) { v.largura = 1.08; v.profundidade = 1.06; }
  if (def.tribe === 'palhacos') { v.largura *= 1.10; v.perna *= 0.95; v.cabeca *= 1.08; }   // picadeiro: corpo curto e largo
  if (def.tribe === 'funkeiros') { v.largura *= 0.94; v.perna *= 1.04; v.braco *= 1.02; }   // magro e comprido
  if (def.tribe === 'urbanas') { v.largura *= 0.97; }

  /* BACKSTOP DETERMINÍSTICO POR ID — o que fecha o C6 nos casos que o texto não separa.
     Depois das regras acima o C6 caiu de 9 para 32 silhuetas distintas em 44, mas sobraram
     grupos idênticos onde os blurbs não descrevem corpo: os 8 palhaços (mesma facção, mesma
     descrição de picadeiro), gotinha/dollynho/proerd (todos "mascote"), e mais 3 pares.
     Silhueta repetida é defeito de JOGABILIDADE, não de estilo — em 1 frame o jogador tem
     que decidir se atira, e o C6 mede exatamente isso.
     Isto é variação PROCEDURAL, e está dito com todas as letras: não é design autorado nem
     medida de referência. É um hash estável do id (mesmo id -> mesmo corpo, sempre) com
     amplitude de ±6% em largura/profundidade e ±3% em perna/cabeça. A amplitude é pequena
     de propósito e o C1 é quem garante que ela não reabre o "balão": qualquer aumento aqui
     que empurre uma razão para fora da faixa antropométrica reprova na invariante C1. */
  let h = 2166136261;
  for (let i = 0; i < def.id.length; i++) { h ^= def.id.charCodeAt(i); h = Math.imul(h, 16777619); }
  const u = (bits) => (((h >>> bits) & 1023) / 1023) * 2 - 1;     // -1..1, estável por id
  // amplitudes calibradas CONTRA A RÉGUA, não escolhidas no olho: com ±6% sobravam 5 pares
  // acima de IoU 0,98 (gotinha/dollynho/proerd e 2 pares de palhaço). Subi até o C6 zerar,
  // conferindo a cada passo que o C1 continua dentro da faixa antropométrica — que é o
  // ponto: a variação existe pra separar silhueta, não pra reabrir o balão.
  v.largura *= 1 + u(0) * 0.11;
  v.profundidade *= 1 + u(10) * 0.11;
  v.perna *= 1 + u(20) * 0.05;
  v.cabeca *= 1 + u(5) * 0.05;
  return v;
}

/* ADEREÇOS DERIVADOS DO BLURB — o resto do conserto do C6.
   Cada personagem já tinha o visual DESCRITO por escrito no próprio CHARACTERS
   ("Boné, Juliet vermelho e corrente de ouro" = mandrake; "Chapéu Medusa, colete tático"
   = oakley; "Dreads, gorro rastafári" = reggae). O `addAccessories` só atendia 10 ids —
   e dois deles (`influencer`, `senhora`) nem existem mais no elenco, ou seja, era código
   morto. Aqui a descrição vira silhueta por PALAVRA-CHAVE, então nenhum personagem fica
   sem nada e ninguém precisou inventar visual novo: a fonte é o texto que já estava aqui.
   Tudo entra marcado como adereço (ver marcaAdereco) — conta na silhueta, não na
   proporção do corpo. */
function adereçosDoBlurb(def, parts, torsoW) {
  const p = def.pal, head = parts.head, torso = parts.torso;
  const b = ((def.blurb || '') + ' ' + (def.name || '')).toLowerCase();
  const tem = (...ks) => ks.some((k) => b.includes(k));
  const jaTem = head.children.length > 1;      // o switch antigo já vestiu este id
  const A = (o) => marcaAdereco(o);
  const topo = D.cabecaAlt;
  if (tem('boné', 'bone ', 'gorro') && !jaTem) {
    head.add(A(box(D.cabecaW + 0.02, 0.07, D.cabecaD + 0.02, p.hair, 0, topo + 0.03, 0)));
    head.add(A(box(D.cabecaW, 0.025, 0.15, p.hair, 0, topo, 0.16)));                  // aba
  } else if (tem('chapéu', 'chapeu') && !jaTem) {
    head.add(A(box(0.34, 0.02, 0.34, p.hair, 0, topo + 0.01, 0)));                    // aba larga
    head.add(A(box(D.cabecaW, 0.11, D.cabecaD, p.hair, 0, topo + 0.07, 0)));
  } else if (tem('dread', 'cabelão', 'cabelao', 'cabelo até a cintura', 'cabelo ate a cintura', 'moicano')) {
    if (tem('moicano')) head.add(A(box(0.05, 0.13, D.cabecaD, p.hair, 0, topo + 0.06, 0)));
    else { head.add(A(box(D.cabecaW + 0.03, 0.06, D.cabecaD + 0.03, p.hair, 0, topo, 0)));
      head.add(A(box(D.cabecaW + 0.03, 0.34, 0.07, p.hair, 0, topo - 0.20, -D.cabecaD / 2 - 0.02))); }
  } else if (tem('franja', 'platinado', 'zebrado', 'corte na régua', 'corte na regua')) {
    head.add(A(box(D.cabecaW + 0.02, 0.05, D.cabecaD + 0.02, p.hair, 0, topo - 0.01, 0)));
    head.add(A(box(D.cabecaW + 0.02, 0.07, 0.04, p.hair, 0, topo - 0.05, D.cabecaD / 2)));   // franja na testa
  } else if (!jaTem) {
    head.add(A(box(D.cabecaW + 0.01, 0.045, D.cabecaD + 0.01, p.hair, 0, topo - 0.01, 0)));  // cabelo padrão
  }
  if (tem('óculos', 'oculos', 'juliet', 'espelhado')) head.add(A(box(D.cabecaW + 0.02, 0.05, 0.03, 0x111111, 0, topo - 0.10, D.cabecaD / 2)));
  if (tem('nariz vermelho') || def.tribe === 'palhacos') {
    head.add(A(box(0.06, 0.06, 0.06, 0xd83030, 0, topo - 0.11, D.cabecaD / 2 + 0.01)));       // nariz de palhaço
    head.add(A(box(D.cabecaW + 0.10, 0.09, 0.09, p.hair, 0, topo - 0.06, -0.02)));            // cabelo lateral
  }
  if (tem('corrente', 'cordão', 'cordao')) torso.add(A(box(0.16, 0.03, 0.03, 0xffd23f, 0, (D.pescocoY - D.quadrilY) - 0.10, torsoW / 2 * 0.9)));
  if (tem('colete', 'jaqueta', 'blazer', 'camisa de grife', 'polo')) torso.add(A(box(torsoW + 0.05, (D.pescocoY - D.quadrilY) * 0.72, D.torsoD + 0.05, p.pants, 0, (D.pescocoY - D.quadrilY) * 0.52, 0)));
  if (tem('mochila', 'tamborzão', 'tamborzao', 'violão', 'violao')) torso.add(A(box(0.26, 0.30, 0.13, p.boots, 0, (D.pescocoY - D.quadrilY) * 0.55, -D.torsoD / 2 - 0.08)));
  if (tem('relógio', 'relogio', 'anel', 'ostenta')) parts.armR.add(A(box(D.bracoW + 0.02, 0.05, D.bracoD + 0.02, 0xffd23f, 0, -D.bracoLen * 0.72, 0)));
}

function addAccessories(def, parts, torsoW) {
  const p = def.pal;
  /* PONTE DE ESPAÇO (rodada da RÉGUA): as ~120 coordenadas literais deste switch foram
     autoradas contra o corpo ANTIGO — cabeça de 0,26x0,28x0,26 e tronco de 0,44x0,60x0,26.
     A régua mostrou que aquele corpo era balão (tronco com 2,24x a largura relativa de uma
     pessoa) e ele foi refeito pela antropometria publicada. Reescrever literal por literal
     seria 120 chances de errar em silêncio; em vez disso os adereços antigos entram num
     GRUPO com escala NÃO UNIFORME que leva o espaço velho exatamente no novo. Assim o
     desenho de cada personagem é preservado como foi autorado, e nada aqui precisa saber
     das novas dimensões. Sem esta ponte, o boné do sindicato flutuaria 6 cm acima da
     cabeça e o jaleco da doutora ficaria 47% mais largo que o tronco dela. */
  const head = new THREE.Group();
  head.scale.set(D.cabecaW / 0.26, D.cabecaAlt / 0.28, D.cabecaD / 0.26);
  parts.head.add(head);
  const torso = new THREE.Group();
  const alturaTronco = D.pescocoY - D.quadrilY;
  torso.scale.set(torsoW / 0.44, alturaTronco / 0.60, D.torsoD / 0.26);
  parts.torso.add(torso);
  // adereço herdado continua sendo adereço: sai da conta de proporção, fica na silhueta
  const marcaDepois = [head, torso];
  const p_ = p;   // (mantém o nome curto usado abaixo)
  void p_;
  const cap = (color) => {
    head.add(box(0.28, 0.09, 0.28, color, 0, 0.30, 0));
    head.add(box(0.26, 0.03, 0.16, color, 0, 0.27, 0.20));            // brim
  };
  const sunglasses = (w = 0.28, color = 0x111111) => {
    head.add(box(w, 0.07, 0.04, color, 0, 0.17, 0.14));
  };
  switch (def.id) {
    case 'esquerdomacho':
      head.add(box(0.24, 0.12, 0.06, 0x3a2a1e, 0, 0.02, 0.13));       // beard
      head.add(box(0.26, 0.10, 0.12, p.hair, 0, 0.30, -0.02));        // hair
      sunglasses(0.26, 0x222222);                                      // glasses
      torso.add(box(0.34, 0.08, 0.30, 0xd32f2f, 0, 0.56, 0));         // red scarf
      torso.add(box(0.20, 0.30, 0.06, 0xe8dcc0, torsoW / 2 + 0.1, -0.05, 0.05)); // tote bag
      torso.add(box(0.04, 0.04, 0.02, 0xffd23f, -0.12, 0.42, 0.14));  // button 1
      torso.add(box(0.04, 0.04, 0.02, 0xe03232, -0.05, 0.38, 0.14));  // button 2
      break;
    case 'sindicato':
      cap(0xc0392b);
      torso.add(box(torsoW + 0.04, 0.5, 0.30, 0x8e2f24, 0, 0.28, 0)); // vest
      torso.add(box(0.07, 0.05, 0.02, 0xffd23f, -0.13, 0.4, 0.16));   // patch
      torso.add(box(0.07, 0.05, 0.02, 0xffd23f, 0.13, 0.32, 0.16));   // patch
      { const mega = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.22, 8), M(0xf0f0f0));
        mega.rotation.x = 2.4; mega.position.set(-torsoW / 2 - 0.1, 0.02, 0.08);
        mega.castShadow = true; torso.add(mega); }                     // megaphone at hip
      break;
    case 'mst':
      cap(0xc0392b);
      torso.add(box(0.32, 0.07, 0.28, 0xd32f2f, 0, 0.55, 0));         // scarf
      torso.add(box(0.34, 0.42, 0.16, 0x3f5a34, 0, 0.28, -0.22));     // backpack
      { const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.5, 5), M(0x8a6b48));
        pole.position.set(0.14, 0.75, -0.24); torso.add(pole);
        torso.add(box(0.02, 0.16, 0.24, 0xe03232, 0.14, 0.9, -0.36)); } // little red flag
      break;
    case 'doutora':
      head.add(box(0.28, 0.08, 0.28, p.hair, 0, 0.29, 0));              // hair top
      head.add(box(0.08, 0.22, 0.08, p.hair, 0, 0.14, -0.18));          // ponytail
      torso.add(box(torsoW + 0.04, 0.56, 0.30, 0xf0f0f0, 0, 0.28, 0));  // lab coat
      torso.add(box(torsoW + 0.02, 0.16, 0.28, 0xf0f0f0, 0, -0.04, 0)); // coat skirt
      { const stet = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.014, 6, 14), M(0x2a2a2a));
        stet.position.set(0, 0.55, 0.05); stet.rotation.x = 1.25; torso.add(stet);   // stethoscope
        const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.02, 8), M(0x888888));
        chest.rotation.x = Math.PI / 2; chest.position.set(0.07, 0.38, 0.16); torso.add(chest); }
      torso.add(box(0.06, 0.06, 0.02, 0x2b4d8f, -0.13, 0.44, 0.16));    // ID badge
      torso.add(box(0.16, 0.22, 0.02, 0xd8cfc0, -torsoW / 2 - 0.1, 0.12, 0.08)); // clipboard
      break;
    case 'caminhoneiro':
      cap(0x2456a6);
      sunglasses();
      torso.add(box(0.46, 0.08, 0.28, 0x1faa4d, 0, 0.56, 0));         // green collar stripe
      parts.armR.add(box(0.13, 0.1, 0.15, 0x8a6b48, 0, -0.44, 0));    // trucker glove
      break;
    case 'influencer':
      head.add(box(0.29, 0.12, 0.29, p.hair, 0, 0.31, -0.02));        // blonde
      head.add(box(0.29, 0.26, 0.08, p.hair, 0, 0.16, -0.15));        // long back hair
      sunglasses(0.30, 0xc9a227);                                      // gold shades
      parts.armL.rotation.x = -2.4;                                    // phone up pose
      parts.armL.add(box(0.09, 0.02, 0.14, 0xffffff, 0, -0.5, 0.04)); // phone
      torso.add(box(0.4, 0.06, 0.28, 0xc9a227, 0, 0.06, 0));          // gold belt
      break;
    case 'sertanejo':
      { const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.03, 10), M(0x7a5230));
        brim.position.y = 0.27; brim.castShadow = true; head.add(brim);
        head.add(box(0.24, 0.14, 0.24, 0x7a5230, 0, 0.35, 0)); }      // cowboy hat
      torso.add(box(0.14, 0.1, 0.03, 0xffd23f, 0, 0.02, 0.14));       // big buckle
      { const gc = box(0.22, 0.72, 0.1, 0x2a2a2a, 0.05, 0.3, -0.24);  // guitar case
        gc.rotation.z = 0.18; torso.add(gc); }
      break;
    case 'senhora':
      { const bun = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), M(0xd8d8d8));
        bun.position.set(0, 0.34, -0.1); head.add(bun); }
      head.add(box(0.28, 0.06, 0.26, 0xd8d8d8, 0, 0.28, 0.02));       // gray hair
      sunglasses(0.32, 0x1a1a1a);                                      // oversized shades
      torso.add(box(0.36, 0.4, 0.05, 0xa97f4e, -0.04, 0.32, -0.19));  // corkboard on back
      torso.add(box(0.08, 0.06, 0.02, 0xf2ecd8, -0.12, 0.4, -0.215)); // note
      torso.add(box(0.08, 0.06, 0.02, 0xf2ecd8, 0.04, 0.26, -0.215)); // note
      torso.add(box(0.02, 0.2, 0.02, 0xd33, -0.04, 0.33, -0.215));    // red string
      parts.armR.add(box(0.1, 0.02, 0.15, 0x2b4d8f, 0, -0.44, 0.02)); // stickered phone
      break;
    case 'mistico':
      head.add(box(0.29, 0.05, 0.29, 0xe8bd25, 0, 0.22, 0));          // headband
      head.add(box(0.24, 0.22, 0.06, p.hair, 0, -0.02, 0.13));        // barba comprida
      { const cry = new THREE.Mesh(new THREE.OctahedronGeometry(0.045), M(0x2fd3c0));
        cry.position.set(0, 0.42, 0.15); torso.add(cry); }            // cristal
      break;
    case 'coach':
      torso.add(box(torsoW + 0.05, 0.5, 0.30, 0x1a2a4a, 0, 0.28, 0)); // blazer navy
      { const band = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.015, 6, 12, Math.PI), M(0x1a1a1a));
        band.rotation.z = Math.PI; band.position.set(0, 0.24, 0); head.add(band); } // headset arco
      head.add(box(0.015, 0.015, 0.14, 0x1a1a1a, 0.14, 0.08, 0.1));   // mic
      torso.add(box(0.16, 0.22, 0.03, 0xf0f0f0, -torsoW / 2 - 0.1, 0.12, 0.08)); // livro
      torso.add(box(0.12, 0.03, 0.035, 0xe03232, -torsoW / 2 - 0.1, 0.14, 0.09)); // título do livro
      break;
  }
  marcaDepois.forEach(marcaAdereco);
}

// Procedural walk/idle. `phase` advances with movement, `moving` 0..1.
export function poseCharacter(parts, phase, moving, t) {
  const s = Math.sin(phase), c = Math.cos(phase);
  const ang = s * 0.6 * moving;
  parts.legL.rotation.x = ang;
  parts.legR.rotation.x = -ang;
  const breathe = Math.sin(t * 2.2) * 0.012;

  /* PÉ NO CHÃO NO CICLO DE PASSO (defeito achado pela régua, invariante C3/CHR3)
     As duas pernas giram em torno do MESMO pivô fixo no quadril, em sentidos opostos. Girar
     uma perna de comprimento L por um ângulo θ levanta o pé em L·(1−cos θ) — e como |θ| é
     igual nas duas, AS DUAS SOBEM JUNTAS. Ninguém compensava, então no meio de cada passo o
     personagem inteiro descolava do chão. Medido pelo char-probe ANTES do conserto: base da
     bbox = +0,020 m em walk-0,25 e walk-0,75, nos 44 personagens (a sombra de contato, que
     é ancorada no grupo, continuava colada no chão — daí o boneco ler como adesivo flutuando
     sobre a própria sombra).
     Conserto: baixar quadril, tronco e cabeça exatamente por esse L·(1−cos θ). O pé de apoio
     volta pra y=0 por construção, e o agachamento natural do passo aparece de graça — é o
     mesmo que um humano faz, que é abaixar o quadril quando abre as pernas.
     `quadrilY` e `pescocoY` são gravados em userData na construção porque poseCharacter só
     recebe `parts` (game.js:5339) e não pode assumir literal nenhum: foi um literal 0,78
     cravado aqui que já tinha ficado defasado da geometria. */
  /* A queda do quadril é a subida REAL da sola, não L·(1−cos θ).
     Primeira tentativa (e está aqui porque o erro é instrutivo): usei L·(1−cos θ), que é o
     quanto sobe um ponto do EIXO da perna. Mas a sola não está no eixo — a bota é uma caixa
     deslocada para a FRENTE (z = +0,03, profundidade 1,5× a da perna), e ao girar a perna
     essa profundidade empurra parte da sola para BAIXO. Medido depois de compensar com
     L·(1−cos θ): −0,082 m, ou seja, o personagem passou a AFUNDAR 8 cm — troquei flutuar por
     enterrar. Aqui a conta é a mínima altura da sola de verdade:
        y(z, θ) = L·(1 − cos θ) − z·sin θ,  z varrendo a profundidade da bota,
     avaliada nas DUAS pernas (elas giram em sentidos opostos, e quem manda é a mais baixa —
     que é a definição de "pé de apoio"). */
  const ud = parts.legL.userData;
  const L = ud.compLegPivot || 0;
  const [z0, z1] = ud.solaZ || [0, 0];
  const subida = (th) => L * (1 - Math.cos(th)) - Math.max(z0 * Math.sin(th), z1 * Math.sin(th));
  const quedaQuadril = Math.min(subida(ang), subida(-ang));
  parts.legL.position.y = parts.legL.userData.quadrilY - quedaQuadril;
  parts.legR.position.y = parts.legR.userData.quadrilY - quedaQuadril;
  parts.torso.position.y = parts.torso.userData.quadrilY - quedaQuadril + breathe;
  parts.head.position.y = parts.head.userData.pescocoY - quedaQuadril + breathe;
  parts.torso.rotation.y = s * 0.05 * moving;
  parts.head.rotation.z = Math.sin(t * 1.7) * 0.02;
  parts.head.rotation.x = Math.sin(t * 1.3) * 0.02;
}

