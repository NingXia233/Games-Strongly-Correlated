import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,reduce,evaluate,validateState,initialSave,validateSave,parseSave,sshSpectrum} from '../dist/game-models.js';
const near=(a,b,tol=1e-10)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
const variants=(n)=>Array.from({length:2**n},(_,mask)=>Array.from({length:n},(_,i)=>!!(mask&(1<<i))));
const state=(id,data)=>({...initialState(id),data:{...initialState(id).data,...data}});
function* perms(xs){if(!xs.length){yield [];return;}for(let i=0;i<xs.length;i++)for(const p of perms(xs.filter((_,j)=>j!==i)))yield [xs[i],...p];}
test('all initial rooms are valid unsolved; reducer is pure and illegal actions do not spend a step',()=>{
 for(let id=0;id<8;id++){const s=initialState(id),before=JSON.stringify(s);assert.equal(validateState(s),true);assert.equal(evaluate(s).won,false);const next=reduce(s,{type:'invalid',index:-1});assert.equal(next.steps,0);assert.deepEqual(next.data,s.data);assert.ok(next.feedback);assert.equal(JSON.stringify(s),before);assert.deepEqual(initialState(id),s);}
});
test('all eight Ising states have correct energies, two ground states, and involutive flips',()=>{
 const hist=new Map();for(const bits of variants(3)){const spins=bits.map(x=>x?1:-1),s=state(0,{spins}),e=3*spins[0]*spins[1]+2*spins[1]*spins[2]+spins[2]*spins[0];assert.equal(evaluate(s).energy,e);assert.equal(evaluate(s).won,e===-4);hist.set(e,(hist.get(e)||0)+1);for(let i=0;i<3;i++)assert.deepEqual(reduce(reduce(s,{type:'spin',index:i}),{type:'spin',index:i}).data,s.data);}
 assert.deepEqual([...hist].sort((a,b)=>a[0]-b[0]),[[-4,2],[-2,2],[0,2],[6,2]]);
});
test('hole transport rejects occupied/nonlocal/empty hops, preserves order, and shortest solution has 3 hops',()=>{
 let s=initialState(1);let n=reduce(s,{type:'hop',from:0,to:1});assert.match(n.feedback,/U=8/);assert.deepEqual(n.data,s.data);assert.equal(n.steps,0);
 n=reduce(s,{type:'hop',from:0,to:2});assert.match(n.feedback,/最近邻/);
 s=reduce(s,{type:'hole'});assert.equal(s.steps,1);assert.equal(reduce(s,{type:'hole'}).steps,1);assert.equal(reduce(s,{type:'hop',from:3,to:2}).steps,1);
 const q=[[s,0]],seen=new Set([JSON.stringify(s.data)]);let min=Infinity;
 while(q.length){const [cur,h]=q.shift();if(evaluate(cur).won)min=Math.min(min,h);for(let from=0;from<4;from++)for(let to=0;to<4;to++){const next=reduce(cur,{type:'hop',from,to});assert.ok(validateState(next));assert.deepEqual(next.data.sites.filter(Boolean).map(x=>x.id),[0,1,2]);assert.equal(evaluate(next).doublons,0);const key=JSON.stringify(next.data);if(!seen.has(key)){seen.add(key);q.push([next,h+1]);}}}
 assert.equal(seen.size,4);assert.equal(min,3);
 for(const [from,to] of [[2,3],[1,2],[0,1]])s=reduce(s,{type:'hop',from,to});assert.equal(evaluate(s).won,true);
});
test('all 128 SSH bond configurations have normalized orthogonal true eigenvectors, residuals, chiral spectra; sole winning pattern is correct',()=>{
 const wins=[];for(const bits of variants(7)){const bonds=bits.map(x=>x?1:.2),s=state(2,{bonds}),m=evaluate(s),spec=m.spectrum;
 for(let i=0;i<8;i++){const {energy:e,vector:v}=spec[i];near(v.reduce((a,x)=>a+x*x,0),1);near(spec[i].energy,-spec[7-i].energy);for(let row=0;row<8;row++)near((row?bonds[row-1]*v[row-1]:0)+(row<7?bonds[row]*v[row+1]:0),e*v[row]);for(let j=0;j<i;j++)near(v.reduce((sum,x,k)=>sum+x*spec[j].vector[k],0),0);}
 near(spec.reduce((sum,x)=>sum+x.energy*x.energy,0),2*bonds.reduce((sum,x)=>sum+x*x,0));if(m.won)wins.push(bonds);
 }assert.deepEqual(wins,[[.2,1,.2,1,.2,1,.2]]);
 const m=evaluate(state(2,{bonds:wins[0]}));near(m.energy,.001536014942591121);near(m.edge,.960016122532086);
 const trivial=evaluate(state(2,{bonds:[1,.2,1,.2,1,.2,1]}));near(trivial.energy,.842720731407713);near(trivial.edge,.174171514915307);
});
test('all 1024 Schmidt allocations have exactly one winning 7-slot configuration',()=>{
 let wins=0;for(const bits of variants(10)){const kept=[bits.slice(0,3),bits.slice(3,7),bits.slice(7)],m=evaluate(state(3,{kept}));assert.equal(m.slots,bits.filter(Boolean).length);if(m.won){wins++;assert.deepEqual(kept,[[true,true,false],[true,true,true,false],[true,true,false]]);near(m.totalFidelity,.81225);}}
 assert.equal(wins,1);
});
test('all 720 representation orders yield correct independent cut ranks, with 48 winning orders',()=>{
 let wins=0,count=0;for(const order of perms(['A1','A2','B1','B2','C1','C2'])){const m=evaluate(state(4,{order}));const chi=Array.from({length:5},(_,i)=>2**['A','B','C'].filter(p=>(order.indexOf(p+'1')<=i)!==(order.indexOf(p+'2')<=i)).length);assert.deepEqual(m.chi,chi);wins+=+m.won;count++;}
 assert.equal(count,720);assert.equal(wins,48);assert.deepEqual(evaluate(initialState(4)).chi,[2,4,8,4,2]);
});
test('Z2 local transforms preserve W, both rounds solvable, flux is single-use and not a gauge move',()=>{
 for(const bits of variants(4)){const edges=bits.map(x=>x?1:-1),w=edges.reduce((a,b)=>a*b,1);const s=state(5,{edges,stage:w===1?0:1});for(let i=0;i<4;i++){const n=reduce(s,{type:'vertex',index:i});assert.equal(evaluate(n).w,w);assert.deepEqual(reduce(n,{type:'vertex',index:i}).data,s.data);}}
 let s=initialState(5);assert.equal(reduce(s,{type:'flux',index:0}).steps,0);assert.equal(reduce(s,{type:'advance'}).steps,0);s=reduce(s,{type:'vertex',index:1});assert.equal(evaluate(s).roundWon,true);assert.equal(evaluate(s).won,false);s=reduce(s,{type:'advance'});assert.equal(evaluate(s).w,-1);s=reduce(s,{type:'flux',index:0});assert.equal(evaluate(s).w,1);assert.equal(reduce(s,{type:'flux',index:1}).steps,s.steps);s=reduce(s,{type:'vertex',index:2});assert.equal(evaluate(s).won,true);
});
test('Hubbard dimer exact 2x2 ground state derivative and unique safe powerful integer',()=>{
 const wins=[];for(let u=0;u<=12;u++){const m=evaluate(state(6,{u}));near(m.exchange*m.exchange+u*m.exchange,4);near(m.doublon,m.exchange*m.exchange/(4+m.exchange*m.exchange));if(m.won)wins.push(u);assert.ok(Number.isFinite(m.exchange));}
 assert.deepEqual(wins,[6]);near(evaluate(state(6,{u:6})).exchange,.6055512754639891);for(const value of [-1,13,1.5,NaN,Infinity,'6'])assert.equal(reduce(initialState(6),{type:'u',value}).steps,0);
});
test('JW all 8 detection masks against all 8 occupations, unique full-string solution',()=>{
 let wins=0;for(const rings of variants(3)){const m=evaluate(state(7,{rings}));for(const c of m.cases){let sign=1;for(const n of c.n)if(n)sign=-sign;assert.equal(c.expected,sign);}if(m.won){wins++;assert.deepEqual(rings,[true,true,true]);}else assert.equal(m.passed,4);}assert.equal(wins,1);
});
test('save format strictness, round-trip, sequential unlock, and input size/error bounds',()=>{
 const s=initialSave();assert.equal(validateSave(s),true);assert.deepEqual(parseSave(JSON.stringify(s)),s);for(const mutate of [x=>x.version=2,x=>x.current=1,x=>x.states.pop(),x=>x.states[0].id=2,x=>x.states[4].data.order.fill('A1'),x=>x.states[6].data.u=NaN,x=>x.completed=[1],x=>x.completed=[0,0],x=>x.hints[0]=4,x=>x.states[1].data.sites[1].id=0]){const bad=structuredClone(s);mutate(bad);assert.equal(validateSave(bad),false);assert.throws(()=>parseSave(JSON.stringify(bad)));}
 for(const text of ['',null,'null','{',' '.repeat(100001)])assert.throws(()=>parseSave(text));
 s.completed=[0,1];s.current=2;assert.equal(validateSave(s),true);
});
test('import rejects unreachable hole order and inconsistent Z2 sectors',()=>{
 const h=initialState(1);[h.data.sites[0],h.data.sites[1]]=[h.data.sites[1],h.data.sites[0]];assert.equal(validateState(h),false);
 assert.equal(validateState(state(5,{edges:[-1,1,1,1],stage:0})),false);
 assert.equal(validateState(state(5,{edges:[1,1,1,1],stage:1,fluxUsed:false})),false);
 assert.equal(validateState(state(5,{edges:[-1,1,1,1],stage:1,fluxUsed:true})),false);
});
test('maximum imported step count stays valid after accepted action',()=>{
 for(let id=0;id<8;id++){const s=initialState(id);s.steps=1000000;const actions=[{type:'spin',index:0},{type:'hole'},{type:'bond',index:0},{type:'keep',module:0,index:0},{type:'swap',from:0,to:1},{type:'vertex',index:0},{type:'u',value:6},{type:'ring',index:0}];assert.ok(validateState(reduce(s,actions[id])));}
});
