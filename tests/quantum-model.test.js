import test from 'node:test';
import assert from 'node:assert/strict';
import '../dist/quantum-model.js';
const Q=globalThis.TJZQuantum;
const close=(a,b,tol=2e-10)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
test('28 correctly squeezed-Neel states, no double occupancy and exact Sz=0',()=>{
 assert.equal(Q.basis.length,28);
 for(const b of Q.basis){assert.equal(b.spins.filter(s=>s===0).length,2);assert.deepEqual(Array.from(b.spins.filter(Boolean)),Array.from(Q.ORDER));assert.equal(b.spins.reduce((a,b)=>a+b,0),0);}
 assert.deepEqual(Array.from(Q.basis[Q.initialIndex([1,4])].spins),[1,0,-1,1,0,-1,1,-1]);
});
test('Hermiticity and legal open-chain hopping only',()=>{
 const {H}=Q.matrix(1.3,2.7);
 for(let i=0;i<28;i++)for(let j=0;j<28;j++){
 close(H[i][j],H[j][i]);
 if(i!==j&&H[i][j]){
  close(H[i][j],-1.3);
  const a=Q.basis[i].spins,b=Q.basis[j].spins,d=a.map((s,k)=>s!==b[k]?k:-1).filter(k=>k>=0);
  assert.equal(d.length,2);assert.equal(d[1]-d[0],1);assert.equal(a[d[0]],b[d[1]]);assert.equal(a[d[1]],b[d[0]]);
 }
 }
});
test('Known exchange energies use the density subtraction',()=>{
 const {diagonal}=Q.matrix(1,2);
 close(diagonal[Q.initialIndex([0,1])],-5);
 close(diagonal[Q.initialIndex([2,5])],-3);
});
test('Jacobi eigen residual and orthonormal eigenvectors',()=>{
 for(const [t,j] of [[1,2],[0,2],[1,0],[2,8]]){
 const {H}=Q.matrix(t,j),{values,vectors:V}=Q.diagonalize(H);
 for(let k=0;k<28;k++)for(let i=0;i<28;i++)close(H[i].reduce((sum,h,l)=>sum+h*V[l][k],0),values[k]*V[i][k]);
 for(let k=0;k<28;k++)for(let l=0;l<28;l++)close(V.reduce((sum,r)=>sum+r[k]*r[l],0),+(k===l));
 }
});
test('All initial states: norm, energy, hole density, Sz and time reversal',()=>{
 for(const b of Q.basis){
 const e=new Q.Experiment({t:1,Jz:2,holes:b.holes});
 for(const time of [0,.1,.7,3.2,16,100]){
 const s=e.at(time),r=e.at(-time);close(s.norm,1);close(s.energy,e.energy0);close(s.holeNumber,2);close(s.Sz,0);
 s.density.forEach(p=>assert.ok(p>=-1e-12&&p<=1+1e-12));
 s.re.forEach((v,i)=>{close(v,r.re[i]);close(s.im[i],-r.im[i]);});
 }
 }
});
test('t=0 freezes probabilities; exchange and kinetic can vary at t>0',()=>{
 const frozen=new Q.Experiment({t:0,Jz:2,holes:[2,5]});
 for(const time of [0,1,3,20])close(frozen.at(time).probabilities[frozen.start],1);
 const e=new Q.Experiment();assert.ok(Math.abs(e.at(1).exchange-e.energy0)>.01);close(e.at(1).exchange+e.at(1).kinetic,e.energy0);
});
test('reset changes Hamiltonian and reference state at tau=0; invalid inputs atomic',()=>{
 const e=new Q.Experiment();e.at(5);const state=e.reset({t:.5,Jz:4,holes:[0,7]});
 close(e.time,0);close(state.probabilities[e.start],1);close(state.energy,e.energy0);assert.equal(e.t,.5);assert.deepEqual(Array.from(e.holes),[0,7]);
 for(const holes of [[1,1],[-1,2],[1,8],[1.5,2],[],null])assert.throws(()=>e.reset({holes}));
 for(const t of [NaN,Infinity,-1])assert.throws(()=>e.reset({t}));
 assert.equal(e.t,.5);assert.throws(()=>e.at(NaN));
});
