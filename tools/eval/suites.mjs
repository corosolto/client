/* Fonte única dos portões agregados pelo runner.
 *
 * fast e deploy ficam deliberadamente independentes: há passos comuns, mas suas
 * posições e os passos vizinhos são diferentes. Fatorar a interseção mudaria a
 * sequência (ou criaria uma segunda fonte para restaurá-la). As duas listas
 * abaixo preservam, token a token e na mesma ordem, os antigos comandos do
 * package.json. As suites temáticas são visões somente para seleção local. */

const lista = (texto) => Object.freeze(texto.trim().split(/\s+/));
const unicos = (...listas) => Object.freeze([...new Set(listas.flat())]);

const FAST = lista(`
syntax eval:portalembed eval:vm-presence eval:tpjumpownership eval:tplocalshot eval:tpbackpedal eval:tphandownership eval:characterkit eval:meshoptvm eval:perfilmobile eval:qamobile eval:toquecontroles eval:tpanim3p eval:emotes eval:emotepartida eval:postura eval:mapasobdemanda eval:glbpeso eval:assetrev eval:roundmunicao eval:cameraoclusao eval:pistolacadencia eval:fragrestock eval:formatomelhorde eval:penetration-geometry eval:bot-shot-direction eval:shared-shot eval:bot-pellets eval:duel-metrics eval:bot-crouch-geometry eval:weapon-profiles eval:weapon-matrix eval:recoil-contract eval:firing-cadence eval:ballistics-falloff eval:ranking-home-status eval:ranking-presentation eval:modgraph eval:convidaamigos eval:placaramigo eval:analytics eval:online eval:release eval:error-console eval:edgecache eval:webgl eval:webglguard eval:maprotate eval:mapasparados eval:shaderlog eval:shaderbudget eval:prune eval:vminspect eval:asset-pago-resil eval:faccao eval:mapid eval:mapjson eval:mapcontrato eval:piscina-trim eval:piscina-graffiti-batch eval:ferro-graffiti-quality eval:passosim eval:perfcampo eval:dificuldade eval:qualmapas eval:pickuparma eval:scrollarma eval:parquewheel eval:campo-contract eval:campomorro-molde eval:parquevida eval:parquecanopy eval:penitenciariavida eval:penitenciariafacade eval:penitenciariapickup eval:redesign eval:ui-v3 eval:resultado-arte eval:matchoptions eval:awpscope eval:tracer3p eval:charvoice eval:screenquery eval:lajes-cache docs:check arch:check audio:check eval:grafite-atual:prova eval:grafite-editorial eval:versaoorigem eval:autoReload eval:smoke eval:vm-teto eval:vm-placar eval:audioalcance eval:audioespacial eval:audioenvelope eval:audioproc eval:audiocapacidade eval:audiofablocal eval:audioeventos eval:audioannouncer eval:audiovoicemix eval:audioprivate eval:audioruntimeassets eval:menumusicreview audio:inventario:autoteste audio:shortlist:autoteste feet:check eval:vmlabhud eval:ctfhud eval:pause eval:ctfround eval:ctfwin eval:switchteam eval:mp-rotulo-lado eval:mp-cor-lado eval:pool-lado eval:troca-personagem eval:launchwatchdog eval:launchrace eval:spawn eval:regen eval:pegada eval:dmgdir eval:ctflabels anims:check anims:merge:check walls:check media:check menuwalls:check travessao:check eval:medianet eval:posters eval:grafitelayout eval:grafite-support eval:grafite-area-audit eval:upa-mint eval:grafite-art-inventory eval:grafite-mural-alpha eval:decal-ink eval:map-texture-upgrade eval:texture-quality-sampler eval:map-sampler eval:map-surface-upgrade eval:external-surface-binding eval:map-local-floor-finish eval:map-local-fabrication eval:map-surface-allocation eval:green-cover-pattern eval:prop-graffiti-wall eval:corrego-graffiti-mount eval:upa-structure eval:upa-return eval:shot-occlusion eval:shot-map-contract eval:shot-brasilia-quality eval:shot-visible-surface eval:shot-quality-inventory eval:simclock eval:backendhints eval:geoproxy changelog:check eval:velhooeste eval:penitenciaria eval:mutcega eval:autofix eval:deploygate eval:portaointeiro eval:mutantes-anunciados eval:wfsecret eval:wflocal eval:wftimeout eval:comentario eval:fixture eval:preload eval:docsautoria eval:netcode eval:hurtfx eval:sonda eval:noescolha eval:maqfraca eval:qualadapt eval:netcodecbin eval:movimento eval:botsim-golden eval:replaycam eval:abateshud eval:botfaca eval:escadao-home eval:escadao-spawn-egress eval:escadao-conflict-home eval:escadao-casa-central eval:escadao-casas-conflito eval:escadao-mirante-abrigo eval:escadao-structure eval:escadao-descent eval:escadao-details eval:corrego-contract eval:corrego-water eval:corrego-superficie eval:skylife ops:test eval:privacy ops:selftest eval:lajes-layout eval:lajes-rooftop eval:lajes-visual eval:lajes-ruas eval:lajes-identidade eval:lajes-roof-overlap eval:lajes-nav eval:lajes-ctf-surface eval:lajes-authored eval:lajes-spatial eval:lajes-gap eval:lajes-circuito eval:lajes-antitrap eval:lajes-vertical eval:lajes-bots eval:lajes-ambiencia eval:lajes-santos eval:lajes-game eval:mappreview eval:lajes-airspace eval:lajes-soundscape eval:lajes-spawn-space eval:sertao eval:sertao-spatial eval:sertao-interiors eval:sertao-wagon eval:sertao-fauna eval:sertao-occlusion eval:calango-quadruped eval:sertao-horizon eval:sertao-distant-birds eval:sertao-integration eval:sertao-livestock eval:sertao-sky-lifecycle eval:amazonia eval:chao eval:ombro eval:miticos-lobisomem eval:mansao eval:dautelemetria eval:mpRoomOptions eval:fxFlash eval:campinho-integration eval:parque eval:audiofurollback eval:atacadao eval:killstreak eval:mp-paridade eval:obras eval:vm-launch eval:chat eval:ui-chat eval:pos-cena eval:capturecodex eval:legal eval:brasao-versao eval:tprajada eval:mprecuo eval:check-sem-escrita eval:modoarmamp eval:trocaarmamp eval:pos-alvo eval:ibl-vm eval:botsentidos eval:ociosoteto eval:wfconcurrency eval:mapa-sp-pos-mp eval:personagem-escolhido eval:gauntlet-rodizio eval:telemetria-coorte eval:clans-sessao eval:mp-proximo eval:hub-identity eval:community-inbox eval:login-prompt eval:roster-skins eval:nick eval:nick32-cards eval:portaogatilho eval:mergequeue eval:wfcheckout eval:rotas eval:compartilhar eval:contagens-pr eval:economia eval:economia-jogo eval:headshot-hitbox eval:boca-cano eval:pichacao-parede eval:armadura eval:character-normal-quality eval:grafite-curation eval:map-material-finish eval:ferro-balcao eval:match-pickups eval:net-flash-disable eval:transport-stream eval:normal-only-fit-equivalence eval:tp-world-contract eval:skin-profile-flow eval:tp-identity eval:tp-cosmetic-source eval:tp-drip-source eval:tp-glove-origin eval:death-camera-consistency eval:visual-map-contracts eval:authored-locomotion eval:posto-board-support eval:flashbang mut:flashbang eval:movimento-fluidez eval:ads1p-public eval:preview-grip-phase eval:knife-skin-markings eval:campo-uv eval:sondafilho eval:shot-final-pose eval:operacao-flavio eval:operacao-reset eval:operacao-duration eval:operacao-clock eval:operacao-boarding eval:objective-codec-contract eval:mode-announcements eval:operacao-npc eval:javaporcos-client-room eval:grafite eval:grafite:ar eval:audiomarcas eval:arena-mode eval:bootmutantverdict eval:wfpurge eval:retratohero eval:xpixel eval:lixo
`);

const DEPLOY = lista(`
syntax eval:vm-presence eval:bootorcamento eval:tpjumpownership eval:tplocalshot eval:tpbackpedal eval:tphandownership eval:characterkit eval:penetration-geometry eval:bot-shot-direction eval:shared-shot eval:bot-pellets eval:duel-metrics eval:bot-crouch-geometry eval:weapon-profiles eval:weapon-matrix eval:recoil-contract eval:firing-cadence eval:ballistics-falloff eval:ranking-home-status eval:mp-tracer-origin eval:bot-combat-loop eval:modgraph eval:error-console eval:edgecache eval:webgl eval:webglguard eval:shaderlog eval:shaderbudget eval:prune eval:vmlabhud eval:vminspect eval:redesign eval:charvoice eval:audiofurollback eval:screenquery arch:check docs:check media:check eval:assetfetch eval:vercelbuild menuwalls:check anims:check anims:merge:check travessao:check eval:medianet eval:posters eval:mutcega eval:autofix eval:deploygate eval:portaointeiro eval:mutantes-anunciados eval:wfsecret eval:wflocal eval:wftimeout eval:comentario eval:fixture eval:preload eval:apis eval:social-boot-guest eval:geoproxy eval:nosgemeos eval:sonda eval:docsautoria eval:contagens-pr eval:replaycam eval:miticos-lobisomem eval:chao eval:killstreak eval:vm-serving-config eval:mapasparados eval:piscina-trim eval:pos-cena eval:brasao-versao eval:check-sem-escrita eval:pos-alvo eval:ibl-vm eval:wfconcurrency eval:wfcheckout eval:clans-sessao eval:treta-eyewear eval:treta-equip-route eval:portaogatilho eval:headshot-hitbox eval:character-normal-quality eval:grafite-curation eval:map-material-finish eval:ferro-balcao eval:match-pickups eval:net-flash-disable eval:transport-stream eval:normal-only-fit-equivalence eval:tp-world-contract eval:skin-profile-flow eval:tp-identity eval:tp-cosmetic-source eval:tp-drip-source eval:tp-glove-origin eval:death-camera-consistency eval:visual-map-contracts eval:authored-locomotion eval:posto-board-support eval:flashbang mut:flashbang eval:movimento-fluidez eval:ads1p-public eval:preview-grip-phase eval:knife-skin-markings eval:campo-uv eval:grafite-atual:prova eval:sondafilho eval:shot-final-pose eval:javaporcos-client-room eval:operacao-flavio:browser-gate eval:vm-troca-sem-legado eval:ui-v3:lobby-flavio:gate
`);

const CORE = lista(`
syntax eval:modgraph eval:error-console arch:check docs:check media:check menuwalls:check anims:check anims:merge:check travessao:check eval:medianet eval:posters eval:mutcega eval:autofix eval:deploygate eval:portaointeiro eval:mutantes-anunciados eval:wfsecret eval:wflocal eval:wftimeout eval:comentario eval:fixture eval:sonda eval:docsautoria eval:contagens-pr eval:check-sem-escrita eval:wfconcurrency eval:wfcheckout eval:portaogatilho eval:sondafilho
`);

const BROWSER = unicos([...FAST, ...DEPLOY].filter((p) => /browser|troca-sem-legado/.test(p)
  || p === 'eval:ui-v3:lobby-flavio:gate'));
const semBrowser = (passos) => passos.filter((p) => !BROWSER.includes(p));
const tematicos = (re) => unicos(semBrowser([...FAST, ...DEPLOY].filter((p) => re.test(p))));

const MAPS = lista(`
eval:mapasobdemanda eval:maprotate eval:mapasparados eval:mapid eval:mapjson eval:mapcontrato eval:piscina-trim eval:map-local-floor-finish eval:map-local-fabrication eval:map-surface-allocation eval:mapa-sp-pos-mp
`);
const UI = tematicos(/^(?:eval:(?:ui-|resultado-arte|matchoptions|screenquery|ranking-|convidaamigos|placaramigo|hub-identity|community-inbox|login-prompt|roster-skins|nick|rotas|compartilhar|chat|legal|brasao-versao|redesign|retratohero|treta-eyewear|treta-equip-route|social-boot-guest)|changelog:check)/);
const AUDIO = tematicos(/^(?:audio:|feet:check|eval:(?:audio|charvoice|menumusicreview|lajes-ambiencia|lajes-soundscape|sertao-soundscape|soundscape|ambience|character-voice|javaporcosaudio))/);
const NETWORK = tematicos(/^eval:(?:net|online|apis|geoproxy|edgecache|nosgemeos|transport-stream|mp-|mpRoomOptions|mprecuo|mp-paridade|dautelemetria|telemetria-coorte|clans-sessao|analytics|privacy|backendhints|social-boot-guest|net-flash-disable)/);
const VM = tematicos(/^eval:(?:vm|meshoptvm|glbpeso|asset-pago-resil|characterkit|character-normal-quality|tp|authored-|normal-only-fit|skin-profile-flow|death-camera|posto-board-support|preview-grip-phase|knife-skin-markings|ads1p|awpscope|tracer3p|boca-cano|weapon-|recoil-contract|firing-cadence|ballistics-falloff)/);

export const SUITES = Object.freeze({
  fast: FAST,
  deploy: DEPLOY,
  core: CORE,
  maps: MAPS,
  ui: UI,
  audio: AUDIO,
  browser: BROWSER,
  network: NETWORK,
  vm: VM,
});

export function passosDaSuite(nome) {
  if (!Object.hasOwn(SUITES, nome)) {
    throw new Error(`suite desconhecida: ${nome || '(vazia)'}; disponíveis: ${Object.keys(SUITES).join(', ')}`);
  }
  return [...SUITES[nome]];
}

export function unirSuites(nomes) {
  return [...new Set(nomes.flatMap((nome) => passosDaSuite(nome)))];
}

export function passosEspecificosMapa(arquivo) {
  const id = arquivo.match(/public\/js\/map_([a-z0-9_]+)/)?.[1]
    || arquivo.match(/public\/maps\/([a-z0-9_]+)\.json$/)?.[1]
    || arquivo.match(/public\/js\/(lajes|sertao|amazonia|escadao|corrego|parque|penitenciaria|velho-oeste|campo|piscina|ferro|upa|skylife|mansao)[^/]*\.js$/)?.[1];
  if (!id) return [];
  const conhecidos = new Set([...SUITES.fast, ...SUITES.deploy]);
  return ['', 'contract', 'structure', 'spatial', 'authored', 'nav', 'spawn-space', 'water', 'integration']
    .map((sufixo) => `eval:${id}${sufixo ? `-${sufixo}` : ''}`)
    .filter((passo) => conhecidos.has(passo) && !BROWSER.includes(passo));
}
