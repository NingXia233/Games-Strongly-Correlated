import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/toric-model.js';
import * as A from '../dist/toric-ai.js';
const e=(orientation,x,y,layer='Z')=>({orientation,x,y,layer});
function attack(chain,budget=1){let s=M.createGame({probeBudget:budget});for(const x of chain)s=M.placeError(s,x);return M.finishPlacement(s);}
function correct(s,chain){for(const x of chain)s=M.toggleCorrection(s,x);return M.resolve(s);}
const hard=[e('h',0,0),e('v',0,0),e('h',1,0)];
test('toric: immutable edits, GF2 cancellation and undo',()=>{
 const s=M.createGame(),t=M.placeError(s,e('h',0,0));assert.equal(s.error.Z.length,0);assert.equal(t.error.Z.length,1);
 assert.deepEqual(M.undo(t),s);assert.deepEqual(M.placeError(t,e('h',0,0)).error.Z,[]);
 const play=attack([e('h',0,0)]),draft=M.toggleCorrection(play,e('v',1,1));assert.deepEqual(M.undo(draft),play);
});
test('toric: budget X/Z ≤4, total≤6, Y costs2 and atomic rejection',()=>{
 let s=M.createGame();for(let x=0;x<3;x++)s=M.placeError(s,e('h',x,0,'Y'));assert.equal(M.publicView(s,'attacker').cost.total,6);
 assert.throws(()=>M.placeError(s,e('v',0,1,'Y')),/budget/);assert.equal(s.error.X.length,3);
 s=M.createGame();for(let x=0;x<4;x++)s=M.placeError(s,e('h',x,0));assert.throws(()=>M.placeError(s,e('v',0,0)),/budget/);
});
test('toric: rejects empty and contractible zero-syndrome attacks',()=>{
 assert.throws(()=>M.finishPlacement(M.createGame()),/nonzero/);
 let s=M.createGame();for(const x of [e('h',0,0),e('v',1,0),e('h',0,1),e('v',0,0)])s=M.placeError(s,x);assert.throws(()=>M.finishPlacement(s),/nonzero/);
});
test('toric: edge validation and phases',()=>{
 for(const edge of [e('h',-1,0),e('h',5,0),e('v',1.5,0),e('q',0,0),'h:0:5',null])assert.throws(()=>M.placeError(M.createGame(),edge));
 assert.throws(()=>M.createGame({probeBudget:3}));assert.throws(()=>M.createGame({size:4}));
 assert.throws(()=>M.probe(M.createGame(),e('h',0,0)));assert.throws(()=>M.resolve(M.createGame()));
 const s=attack(hard);assert.throws(()=>M.placeError(s,e('h',0,0)));const r=M.resolve(s);assert.throws(()=>M.resolve(r));assert.throws(()=>M.toggleCorrection(r,e('h',0,0)));
});
test('toric: probes show original Pauli, cannot refund knowledge or duplicate charge',()=>{
 let s=attack([e('h',0,0,'Y')],2);s=M.toggleCorrection(s,e('h',0,0,'Y'));s=M.probe(s,e('h',0,0));
 assert.equal(s.probes[0].result,'Y');assert.equal(M.publicView(s).probesRemaining,1);assert.throws(()=>M.probe(s,e('h',0,0)),/already/);assert.throws(()=>M.undo(s));
 s=M.probe(s,e('v',2,2));assert.equal(s.probes[1].result,'I');assert.throws(()=>M.probe(s,e('h',1,1)),/remaining/);
});
test('toric: public view strips hidden error/cost/history and clones data',()=>{
 const s=attack(hard),v=M.publicView(s);for(const key of ['error','events','cost','seed'])assert.ok(!(key in v));
 v.correction.X.push(e('v',3,2,'X'));assert.deepEqual(s.correction.X,[]);
 assert.equal(M.publicView(M.createGame()).initialSyndrome.e.length,0);
 assert.ok(M.publicView(M.resolve(s)).error);
});
test('toric: live syndrome fuses, initial syndrome stays fixed; e/m never fuse',()=>{
 let s=attack([e('h',0,0)]);const before=M.publicView(s).initialSyndrome;s=M.toggleCorrection(s,e('h',0,0));assert.deepEqual(M.publicView(s).syndrome,{e:[],m:[]});assert.deepEqual(M.publicView(s).initialSyndrome,before);
 s=attack([e('h',0,0,'Y')]);s=M.toggleCorrection(s,e('h',0,0,'Z'));assert.equal(M.publicView(s).syndrome.e.length,0);assert.equal(M.publicView(s).syndrome.m.length,2);
});
test('toric: unresolved endpoints are not labeled homology; long complement causes logical',()=>{
 const s=attack([e('h',0,0)]);const open=M.resolve(s);assert.equal(open.result.reason,'syndrome');assert.equal(open.result.winding,null);
 const r=correct(s,[1,2,3,4].map(x=>e('h',x,0)));assert.equal(r.result.reason,'logical');assert.deepEqual(r.result.winding,[1,0,0,0]);
});
test('toric: identical corrections and contractible residual succeed',()=>{
 let s=attack([e('h',0,0)]);assert.equal(correct(s,[e('h',0,0)]).result.winner,'defender');
 assert.equal(correct(s,[e('v',0,0),e('h',0,1),e('v',1,0)]).result.winner,'defender');
});
test('toric: secret saves replay all validated events and reject corruption',()=>{
 let s=attack(hard,2);s=M.probe(s,e('h',0,0));s=M.toggleCorrection(s,e('h',0,0));s=M.resolve(s);assert.deepEqual(M.replay(M.serialize(s)),s);
 for(const save of ['bad',{version:2,events:[]},{version:1,events:[{type:'teleport'}]},{version:1,events:[{type:'probe',edge:'h:0:0'}]}])assert.throws(()=>M.replay(save));
});
test('toric AI: exact single-layer hard family has seven candidates and two classes',()=>{
 const candidates=A.layerCandidates([{x:2,y:0},{x:0,y:1}],'Z');assert.equal(candidates.length,7);const counts={};for(const c of candidates)counts[c.signature]=(counts[c.signature]||0)+1;assert.deepEqual(Object.values(counts).sort(),[3,4]);
});
test('toric AI: rejects raw state and is invariant across hidden chains with identical public evidence',()=>{
 const a=attack(hard),b=attack([e('v',0,0),e('h',2,0),e('h',3,0),e('h',4,0)]);assert.deepEqual(M.publicView(a),M.publicView(b));assert.throws(()=>A.defenderPlan(a));
 assert.deepEqual(A.defenderPlan(M.publicView(a),{seed:77,difficulty:'expert'}),A.defenderPlan(M.publicView(b),{seed:77,difficulty:'expert'}));
});
test('toric AI: all difficulty seeds reproducible, attacks legal and teaching decodes',()=>{
 for(const difficulty of ['easy','standard','expert'])for(let seed=0;seed<40;seed++){
  const a=A.createAttack({seed,difficulty});assert.deepEqual(a,A.createAttack({seed,difficulty}));const s=attack([...a.error.X,...a.error.Z]);
  if(difficulty==='expert'){assert.ok(a.error.X.length&&a.error.Z.length);assert.equal(A.analyzePublic(M.publicView(s)).candidateCount,10);}
  if(difficulty==='easy'){const p=A.defenderPlan(M.publicView(s),{seed,difficulty:'easy'});assert.equal(correct(s,[...p.correction.X,...p.correction.Z]).result.winner,'defender');}
 }
});
test('toric AI: expert one-probe hard-family empirical policy lower bound is close to 3/4',()=>{
 const p=A.defenderPlan(M.publicView(attack(hard)),{seed:1,difficulty:'expert'});assert.equal(p.candidateCount,7);assert.ok(p.estimatedWorstCase>=.70&&p.estimatedWorstCase<=.751);
});
test('toric AI: double-layer hard syndrome has 10 feasible pairs; two-probe policy stays imperfect',()=>{
 // The physical dual chain v(1,1),v(2,1) joins m(0,1),m(2,1).
 const s=attack([...hard,e('v',1,1,'X'),e('v',2,1,'X')],2);assert.equal(A.analyzePublic(M.publicView(s)).candidateCount,10);
 const p=A.defenderPlan(M.publicView(s),{seed:99,difficulty:'expert'});assert.ok(p.estimatedWorstCase>.77&&p.estimatedWorstCase<.84);
});
test('toric AI: decision trees use only legal probes and always clear syndrome',()=>{
 for(const difficulty of ['standard','expert'])for(let seed=0;seed<16;seed++){
  const a=A.createAttack({seed,difficulty});let s=attack([...a.error.X,...a.error.Z],seed%3),p=A.defenderPlan(M.publicView(s),{seed,difficulty});
  while(p.probe){s=M.probe(s,p.probe);p=p.branches[s.probes.at(-1).result];assert.ok(p);}
  const r=correct(s,[...p.correction.X,...p.correction.Z]);assert.notEqual(r.result.reason,'syndrome');
 }
});
