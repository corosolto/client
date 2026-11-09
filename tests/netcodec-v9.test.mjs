// Rede 3P: contrato público por entidade, separado do reboque privado do dono.
import test from 'node:test';
import assert from 'node:assert/strict';
const codec = await import(process.env.CODEC_UNDER_TEST || '../public/js/netcodec.js');
const ids = ['passinho','samba','ginga','frevo','forro','quadradinho','sarrada','salve'];
const entity = (id, extra = {}) => ({id,name:`P${id}`,team:'E',bot:id % 2,alive:true,
  x:1,y:0,z:2,yaw:0,pitch:0,hp:100,weapon:'ak',k:0,d:0,respawnIn:0,...extra});
const snapshot = ents => ({type:'snapshot',room:'rede3p',tick:90,t:1.5,state:'live',owner:null,
  players:1,spectators:1,livre:{E:1,B:1},timeLeft:60,roundNum:1,scoreE:0,scoreB:0,
  roundKillsE:0,roundKillsB:0,ents});
const roundtrip = ents => codec.decodeSnapshot(codec.encodeSnapshot(snapshot(ents),9));

test('R1 crouch preserves team, bot and alive flags independently', () => {
  const ents = [entity(1,{crouch:true}),entity(2,{crouch:false,team:'B'}),entity(3,{crouch:true,team:'J',alive:false})];
  assert.deepEqual(roundtrip(ents).ents.map(e=>[e.crouch,e.team,e.bot,e.alive]),
    [[true,'E',1,true],[false,'B',0,true],[true,'J',1,false]]);
});
test('R2 public reload reaches humans and bots in tenths', () => {
  const ents = [entity(1,{reloadIn:1.24}),entity(2,{reloadIn:2.36}),entity(3,{reloadIn:100}),entity(4,{reloadIn:-1})];
  assert.deepEqual(roundtrip(ents).ents.map(e=>e.reloadIn),[1.2,2.4,25.5,0]);
});
test('R3 every catalog emote and elapsed phase reaches late joiners', () => {
  const ents = ids.map((emote,i)=>entity(i+1,{emote,emoteElapsed:.26+i/10}));
  const out = roundtrip(ents).ents;
  assert.deepEqual(out.map(e=>e.emote),ids);
  assert.deepEqual(out.map(e=>e.emoteElapsed),ids.map((_,i)=>(3+i)/10));
  // IDs persistem entre releases: round-trip simétrico sozinho não detecta catálogo reordenado.
  for (const [i, emote] of ids.entries()) {
    const wire = codec.encodeSnapshot(snapshot([entity(1, { emote })]), 9);
    assert.equal(wire.at(-2), i + 1, emote);
  }
});
test('R4 absent dance has zero phase and invalid ids are rejected', () => {
  const out = roundtrip([entity(1,{emoteElapsed:5})]).ents[0];
  assert.equal(out.emote,null); assert.equal(out.emoteElapsed,0);
  for(const emote of ['unknown',0,{},'__proto__']) assert.throws(()=>roundtrip([entity(1,{emote})]),/emote/);
  const bytes = codec.encodeSnapshot(snapshot([entity(1)]),9);
  bytes[bytes.length-2]=255;
  assert.throws(()=>codec.decodeSnapshot(bytes),/emote/);
});
test('R5 v8 omits v9 state without changing legacy layout', () => {
  const plain = snapshot([entity(1),entity(2)]);
  const extended = snapshot([entity(1,{crouch:true,reloadIn:2,emote:'salve',emoteElapsed:.6}),entity(2,{crouch:true,reloadIn:1})]);
  assert.deepEqual(codec.encodeSnapshot(plain,8),codec.encodeSnapshot(extended,8));
  const old = codec.decodeSnapshot(codec.encodeSnapshot(extended,8));
  for(const e of old.ents)for(const field of ['crouch','reloadIn','emote','emoteElapsed'])assert.equal(Object.hasOwn(e,field),false);
  assert.equal(codec.encodeSnapshot(extended,9).length-codec.encodeSnapshot(extended,8).length,6);
});
test('R6 v9 keeps exact private reload and economy without overwriting neighbors', () => {
  const common=codec.encodeSnapshot(snapshot([entity(1,{reloadIn:1.26}),entity(2,{reloadIn:2.26})]),9);
  const priv={id:1,ackSeq:17,x:1,y:0,z:2,mag:12,res:30,reloadIn:1.267,primary:'ak',secondary:'pistol',saldo:1000,colete:50};
  const out=codec.decodeSnapshot(codec.juntarV5(common,codec.encodeTrailerV8(priv)));
  assert.ok(Math.abs(out.ents[0].reloadIn-1.267)<1e-6);assert.equal(out.ents[1].reloadIn,2.3);
  assert.equal(out.meu.saldo,1000);assert.equal(out.meu.colete,50);assert.equal(out.meu.ackSeq,17);
});
test('R7 truncated v9 state cannot become a partial snapshot', () => {
  const wire=codec.encodeSnapshot(snapshot([entity(1,{emote:'passinho'})]),9);
  for(const cut of [1,2,3])assert.throws(()=>codec.decodeSnapshot(wire.slice(0,-cut)),/snapshot_truncated/);
});
