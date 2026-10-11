import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/toric-model.js';
const h=(x,y)=>`h:${(x+5)%5}:${(y+5)%5}`, v=(x,y)=>`v:${(x+5)%5}:${(y+5)%5}`;
const xor=(a,b)=>{const s=new Set(a);for(const e of b)s.has(e)?s.delete(e):s.add(e);return [...s];};
const prepare=(X=[],Z=[],probes=2)=>{let s=M.createGame({probeBudget:probes});for(const e of X)s=M.placeError(s,e,'X');for(const e of Z)s=M.placeError(s,e,'Z');return M.finishPlacement(s);};
const correct=(s,X=[],Z=[])=>{for(const e of X)s=M.toggleCorrection(s,e,'X');for(const e of Z)s=M.toggleCorrection(s,e,'Z');return M.resolve(s);};
const plaquette=(x,y)=>[h(x,y),v(x+1,y),h(x,y+1),v(x,y)];
const star=(x,y)=>[h(x,y),h(x-1,y),v(x,y),v(x,y-1)];

test('review: all physical edges have distinct correct primal and dual endpoints including wraps',()=>{
 for(const edge of M.edges()) {
  const {orientation:o,x,y}=edge;
  assert.deepEqual(M.endpoints(edge,'Z'),[{x,y},o==='h'?{x:(x+1)%5,y}:{x,y:(y+1)%5}]);
  assert.deepEqual(M.endpoints(edge,'X'),[{x,y},o==='h'?{x,y:(y+4)%5}:{x:(x+4)%5,y}]);
  for(const l of ['X','Z'])assert.equal(M.syndrome([edge],l).length,2);
 }
});
test('review: 25 face Z stabilizers and 25 vertex X stabilizers are closed and homologically trivial',()=>{
 for(let y=0;y<5;y++)for(let x=0;x<5;x++)for(const [l,c] of [['Z',plaquette(x,y)],['X',star(x,y)]]) {
  assert.deepEqual(M.syndrome(c,l),[]);assert.deepEqual(M.seamBits(c,l),[0,0]);
 }
});
test('review: all four logical bases and parallel-pair cancellation',()=>{
 for(let offset=0;offset<5;offset++)for(const [l,c1,c2,expected] of [
  ['Z',Array.from({length:5},(_,i)=>h(i,offset)),Array.from({length:5},(_,i)=>h(i,(offset+1)%5)),[1,0]],
  ['Z',Array.from({length:5},(_,i)=>v(offset,i)),Array.from({length:5},(_,i)=>v((offset+1)%5,i)),[0,1]],
  ['X',Array.from({length:5},(_,i)=>v(i,offset)),Array.from({length:5},(_,i)=>v(i,(offset+1)%5)),[1,0]],
  ['X',Array.from({length:5},(_,i)=>h(offset,i)),Array.from({length:5},(_,i)=>h((offset+1)%5,i)),[0,1]],
 ]) {assert.deepEqual(M.syndrome(c1,l),[]);assert.deepEqual(M.seamBits(c1,l),expected);assert.deepEqual(M.seamBits(xor(c1,c2),l),[0,0]);}
});
test('review: GF2 Y action costs two and never fuses e with m',()=>{
 let s=M.placeError(M.createGame(),h(1,1),'Y');const p=M.publicView(s,'attacker');
 assert.deepEqual(p.cost,{X:1,Z:1,total:2});assert.equal(p.syndrome.e.length,2);assert.equal(p.syndrome.m.length,2);
 s=M.finishPlacement(s);s=M.toggleCorrection(s,h(1,1),'X');const r=M.resolve(s);assert.equal(r.result.syndrome.e.length,2);assert.equal(r.result.syndrome.m.length,0);assert.equal(r.result.winding,null);
 let a=M.placeError(M.placeError(M.createGame(),h(1,1),'Z'),h(1,1),'Z');assert.deepEqual(a.error,{X:[],Z:[]});
});
test('review: hidden trivial or logical no-syndrome attacks cannot be submitted',()=>{
 assert.throws(()=>M.finishPlacement(M.createGame()));
 for(const [l,c] of [['Z',plaquette(4,4)],['X',star(0,0)]]) {let s=M.createGame();for(const e of c)s=M.placeError(s,e,l);assert.throws(()=>M.finishPlacement(s));}
 for(const l of ['X','Z']) {let s=M.createGame();for(let i=0;i<4;i++)s=M.placeError(s,h(i,0),l);assert.throws(()=>M.placeError(s,h(4,0),l));}
 let s=M.createGame();for(let i=0;i<3;i++)s=M.placeError(s,h(i,0),'Y');assert.throws(()=>M.placeError(s,v(2,2),'X'));
});
test('review: recovery accepts arbitrary length and class rather than geometry determines success',()=>{
 const e=[h(0,0),h(1,0),h(2,0)];const s=prepare([],e);
 assert.equal(correct(s,[],e).result.winner,'defender');
 assert.equal(correct(s,[],[h(3,0),h(4,0)]).result.reason,'logical');
 for(let y=0;y<5;y++)for(let x=0;x<5;x++)assert.equal(correct(s,[],xor(e,plaquette(x,y))).result.winner,'defender');
 const r=M.resolve(s);assert.equal(r.result.winner,'attacker');assert.equal(r.result.winding,null);assert.ok(r.result.syndrome.e.length);
});
test('review: public views are independent of syndrome-compatible secret weights and probe logs are immutable',()=>{
 const a=prepare([],[h(0,0),h(1,0)]),b=prepare([],[h(2,0),h(3,0),h(4,0)]);
 assert.deepEqual(M.publicView(a),M.publicView(b));
 for(const role of ['attacker','defender','spectator']){
  const p=M.publicView(a,role);for(const key of ['error','cost','events','attackSeed','secret','actualCost'])assert.equal(key in p,false);
 }
 let p=M.probe(a,h(0,0));p=M.toggleCorrection(p,h(0,0),'Z');assert.equal(p.probes[0].result,'Z');assert.throws(()=>M.probe(p,h(0,0)));assert.equal(p.probes.length,1);
 const q=M.probe(M.probe(a,h(0,0)),v(3,3)),r=M.probe(M.probe(a,v(3,3)),h(0,0));
 assert.deepEqual([...q.probes].sort((a,b)=>a.edge.localeCompare(b.edge)),[...r.probes].sort((a,b)=>a.edge.localeCompare(b.edge)));
 const exposed=M.publicView(a);exposed.config.maxLayer=100;exposed.correction.Z.push({orientation:'h',x:0,y:0});assert.equal(a.config.maxLayer,4);assert.equal(a.correction.Z.length,0);
});
test('review: changing cut preserves homology for seeded random stabilizer products plus logical bases',()=>{
 let seed=781;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
 for(const l of ['X','Z'])for(let n=0;n<60;n++) {
  let c=[];for(let j=0;j<20;j++){const x=rand()%5,y=rand()%5;c=xor(c,l==='Z'?plaquette(x,y):star(x,y));}
  if(rand()%2)c=xor(c,Array.from({length:5},(_,i)=>l==='Z'?h(i,0):v(i,0)));
  if(rand()%2)c=xor(c,Array.from({length:5},(_,i)=>l==='Z'?v(0,i):h(0,i)));
  const base=M.seamBits(c,l);assert.deepEqual(M.syndrome(c,l),[]);
  for(let cut=0;cut<5;cut++) {
   let a=0,b=0;for(const e of c){const {orientation:o,x,y}=M.edgeObject(e);if(l==='Z'){if(o==='h'&&x===cut)a^=1;if(o==='v'&&y===cut)b^=1;}else{if(o==='v'&&x===cut)a^=1;if(o==='h'&&y===cut)b^=1;}}
   assert.deepEqual([a,b],base);
  }
 }
});

import {defenderPlan,createAttack,layerCandidates,analyzePublic} from '../dist/toric-ai.js';
test('review: hard-family candidate enumeration contains exactly seven geometry choices and two homology classes',()=>{
 const sy=[{x:2,y:0},{x:0,y:1}];const candidates=layerCandidates(sy,'Z');assert.equal(candidates.length,7);assert.equal(new Set(candidates.map(c=>c.signature)).size,2);
 for(const c of candidates){assert.deepEqual(M.syndrome(c.edges,'Z'),[{x:2,y:0},{x:0,y:1}]);assert.ok(c.weight<=4);}
});
test('review: defensive decisions depend only on public evidence and independent seed',()=>{
 const a=prepare([],[h(0,0),h(1,0)]),b=prepare([],[h(2,0),h(3,0),h(4,0)]);
 for(const difficulty of ['easy','standard','expert'])for(const seed of [1,17,931])assert.deepEqual(defenderPlan(M.publicView(a),{difficulty,seed}),defenderPlan(M.publicView(b),{difficulty,seed}));
 assert.throws(()=>defenderPlan(a));assert.throws(()=>defenderPlan({...M.publicView(a),error:a.error}));
});
test('review: every public decision-tree branch matches its accumulated probe evidence and clears syndrome',()=>{
 const original=prepare([],[h(0,0),v(0,0),h(1,0)]);
 for(const difficulty of ['standard','expert']){
  const tree=defenderPlan(M.publicView(original),{difficulty,seed:77});
  const walk=(node,logs=[],depth=0)=>{
   assert.ok(depth<=2);
   if(node.probe){assert.ok(!logs.some(p=>M.edgeId(p.edge)===M.edgeId(node.probe)));for(const [result,branch] of Object.entries(node.branches))walk(branch,[...logs,{edge:node.probe,result}],depth+1);}
   else {
    assert.deepEqual(M.syndrome(node.correction.Z,'Z'),M.publicView(original).syndrome.e);assert.deepEqual(M.syndrome(node.correction.X,'X'),[]);
    for(const p of logs){const id=M.edgeId(p.edge),x=node.correction.X.some(e=>M.edgeId(e)===id),z=node.correction.Z.some(e=>M.edgeId(e)===id);assert.equal(['I','X','Z','Y'][+x+2*(+z)],p.result);}
   }
  };walk(tree);
 }
});
test('review: 1000 transformed AI attacks per level are legal, fixed before defense, and have nonzero syndrome',()=>{
 for(const difficulty of ['easy','standard','expert'])for(let seed=0;seed<1000;seed++){
  const attack=createAttack({seed,difficulty});assert.deepEqual(attack,createAttack({seed,difficulty}));const {X,Z}=attack.error;assert.ok(X.length<=4&&Z.length<=4&&X.length+Z.length<=6);const state=prepare(X,Z);const pub=M.publicView(state);assert.ok(pub.syndrome.e.length+pub.syndrome.m.length>0);assert.equal('error'in pub,false);
 }
});
