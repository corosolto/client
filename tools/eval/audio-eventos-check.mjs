#!/usr/bin/env node
/* Gate causal dos eventos tateis do jogo. Usa URLs-fantasia e substitui somente
   a saida de audio: nenhum byte dos packs privados entra neste processo. */
const arg = (nome) => (process.argv.find((a) => a.startsWith(`--${nome}=`)) || '').split('=')[1] || '';
const mutante = arg('mutante');
if (mutante && mutante !== 'colapsa-pools') {
  console.error(`mutante desconhecido: ${mutante}`);
  process.exit(2);
}

const url = (nome) => mutante === 'colapsa-pools' ? 'COLAPSADO.wav' : `${nome}.wav`;
const pack = {
  cs: {
    impactsBySurface: {
      concrete: [url('impact-concrete')], metal: [url('impact-metal')],
      wood: [url('impact-wood')], glass: [url('impact-glass')],
      dirt: [url('impact-dirt')], water: [url('impact-water')],
    },
    characterImpact: { body: [url('impact-body')], armor: [url('impact-armor')] },
    pickupByKind: { weapon: [url('pickup-weapon')], ammo: [url('pickup-ammo')] },
    weaponSwitchByClass: { pistol: [url('switch-pistol')], rifle: [url('switch-rifle')] },
    uiByAction: { click: [url('ui-click')], hover: [url('ui-hover')], back: [url('ui-back')] },
    grenadepin: [url('grenade-pin')], grenadethrow: [url('grenade-throw')],
    grenadebounce: [url('grenade-bounce')], explosion: [url('grenade-explosion')],
  },
};

globalThis.location = { search: '', href: 'http://regua/' };
globalThis.window = globalThis;
const { Sfx } = await import('../../public/js/audio.js');

const tocados = [];
const novo = () => {
  const sfx = new Sfx();
  sfx.pack = JSON.parse(JSON.stringify(pack));
  sfx._eventSample = (src, vol, pan, delay, direct) => {
    tocados.push({ src, vol, pan, delay, direct });
    return true;
  };
  sfx.ensure = () => {};
  sfx.duck = () => {};
  sfx._beep = () => tocados.push({ src: 'SYNTH-BEEP' });
  sfx._burst = () => tocados.push({ src: 'SYNTH-BURST' });
  sfx.reloadEnd = () => tocados.push({ src: 'SYNTH-RELOAD' });
  return sfx;
};
const disparar = (fn) => {
  tocados.length = 0;
  const resultado = fn(novo());
  return { resultado, tocados: tocados.map((e) => e.src), eventos: [...tocados] };
};
const erros = [];
const igual = (rotulo, atual, esperado) => {
  if (JSON.stringify(atual) !== JSON.stringify(esperado)) {
    erros.push(`${rotulo}: esperado ${JSON.stringify(esperado)}, veio ${JSON.stringify(atual)}.`);
  }
};

const materiais = Object.fromEntries(['concreto', 'metal', 'madeira', 'vidro', 'areia', 'agua']
  .map((surface) => [surface, disparar((s) => s.impact(surface, .7, -.25, .08))]));
igual('EVT1 materiais distintos', Object.values(materiais).map((r) => r.tocados[0]), [
  'impact-concrete.wav', 'impact-metal.wav', 'impact-wood.wav',
  'impact-glass.wav', 'impact-dirt.wav', 'impact-water.wav',
]);
for (const [surface, r] of Object.entries(materiais)) {
  if (r.resultado !== true || r.tocados.length !== 1) erros.push(`EVT1 ${surface} nao tocou exatamente um sample.`);
  const [evento] = r.eventos;
  if (evento?.pan !== -.25 || evento?.delay !== .08 || evento?.direct !== true) {
    erros.push(`EVT2 ${surface} perdeu pan, atraso ou barramento direto.`);
  }
}

igual('EVT3 corpo/armadura distintos', [
  disparar((s) => s.bodyImpact(false)).tocados[0],
  disparar((s) => s.bodyImpact(true)).tocados[0],
], ['impact-body.wav', 'impact-armor.wav']);
igual('EVT4 pickup arma/municao distintos', [
  disparar((s) => s.pickup('weapon')).tocados[0],
  disparar((s) => s.pickup('ammo')).tocados[0],
], ['pickup-weapon.wav', 'pickup-ammo.wav']);
igual('EVT5 troca por classe distinta', [
  disparar((s) => s.weaponSwitch('pistol', 'pistol')).tocados[0],
  disparar((s) => s.weaponSwitch('m4', 'rifle')).tocados[0],
], ['switch-pistol.wav', 'switch-rifle.wav']);
igual('EVT6 UI mover/confirmar/voltar distinta', [
  disparar((s) => s.uiClick()).tocados[0],
  disparar((s) => s.uiHover()).tocados[0],
  disparar((s) => s.uiBack()).tocados[0],
], ['ui-click.wav', 'ui-hover.wav', 'ui-back.wav']);
const granadas = [
  disparar((s) => s.grenadePin('frag')),
  disparar((s) => s.grenadeThrow('frag', 1, -.2, .06)),
  disparar((s) => s.grenadeBounce('frag', 1, -.2, .06)),
  disparar((s) => s.explosion(1, -.2, .06)),
];
igual('EVT6b ciclo da granada usa quatro samples', granadas.map((r) => r.tocados[0]), [
  'grenade-pin.wav', 'grenade-throw.wav', 'grenade-bounce.wav', 'grenade-explosion.wav',
]);
igual('EVT6c ganhos mínimos audíveis da granada', granadas.map((r) => r.eventos[0]?.vol), [.52, .58, .38, .88]);
if (granadas.some((r) => r.tocados.length !== 1 || r.resultado !== true)) {
  erros.push('EVT6d um estágio da granada sobrepõe synth ao sample ou não confirma reprodução.');
}

const semPack = new Sfx();
semPack.pack = null;
semPack.ensure = () => {};
semPack.duck = () => {};
let fallbacks = 0;
semPack._beep = () => { fallbacks++; };
semPack._burst = () => { fallbacks++; };
semPack.reloadEnd = () => { fallbacks++; };
for (const fn of [() => semPack.uiClick(), () => semPack.uiHover(), () => semPack.uiBack(), () => semPack.pickup('weapon')]) fn();
if (fallbacks !== 4) erros.push(`EVT7 fallbacks audiveis: esperado 4, veio ${fallbacks}.`);
if (semPack.impact('concreto') !== false || semPack.bodyImpact(false) !== false
  || semPack.weaponSwitch('m4', 'rifle') !== false) {
  erros.push('EVT8 metodos sem pack devem devolver false para o synth do game assumir.');
}

if (erros.length) {
  console.error(`AUDIO EVENTOS${mutante ? ` [mutante=${mutante}]` : ''}: ${erros.length} falha(s)`);
  for (const erro of erros) console.error(`  x ${erro}`);
  process.exit(1);
}
console.log('AUDIO EVENTOS: verde - feedback tátil e ciclo pin/throw/bounce/explosion usam pools e ganhos distintos.');
