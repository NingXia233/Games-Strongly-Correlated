/* Exact finite-sector t–Jz laboratory. No dependencies; browser and Node. */
(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TJZQuantum = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';
  const L = 8, ORDER = Object.freeze([1,-1,1,-1,1,-1]);
  const basis = [];
  for(let a=0;a<L;a++) for(let b=a+1;b<L;b++) {
    let k=0;
    const holes=[a,b];
    const spins=Array.from({length:L},(_,i)=>holes.includes(i)?0:ORDER[k++]);
    basis.push(Object.freeze({holes:Object.freeze(holes), spins:Object.freeze(spins)}));
  }
  Object.freeze(basis);
  const index=new Map(basis.map((b,i)=>[b.holes.join(','),i]));
  function initialIndex(holes) {
    if(!Array.isArray(holes)||holes.length!==2||holes.some(i=>!Number.isInteger(i)||i<0||i>=L)||holes[0]===holes[1]) throw new Error('Choose two distinct lattice sites from 0 to 7.');
    return index.get([...holes].sort((a,b)=>a-b).join(','));
  }
  function matrix(t,Jz) {
    if(!Number.isFinite(t)||!Number.isFinite(Jz)||t<0||Jz<0) throw new Error('t and Jz must be finite non-negative numbers.');
    const H=basis.map(()=>Array(basis.length).fill(0)), diagonal=[];
    basis.forEach((b,i)=>{
      let e=0;
      for(let x=0;x<L-1;x++){
        const s=b.spins[x],r=b.spins[x+1];
        e+=Jz*(s*r-Math.abs(s*r))/4;
        if((s===0)!==(r===0)) {
          const moved=b.holes.map(h=>h===x?x+1:h===x+1?x:h).sort((a,b)=>a-b);
          H[i][index.get(moved.join(','))]=-t;
        }
      }
      H[i][i]=e; diagonal.push(e);
    });
    return {H,diagonal};
  }
  // Largest-off-diagonal Jacobi rotations: eigenvectors are columns.
  function diagonalize(input, tolerance=1e-13) {
    const n=input.length,A=input.map(row=>row.slice());
    const V=Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>+(i===j)));
    let iterations=0, converged=false;
    for(;iterations<100*n*n;iterations++) {
      let largest=0,p=0,q=1;
      for(let i=0;i<n;i++) for(let j=i+1;j<n;j++) if(Math.abs(A[i][j])>largest){largest=Math.abs(A[i][j]);p=i;q=j;}
      if(largest<tolerance){converged=true;break;}
      const app=A[p][p],aqq=A[q][q],apq=A[p][q];
      const tau=(aqq-app)/(2*apq);
      const tangent=(tau>=0?1:-1)/(Math.abs(tau)+Math.sqrt(1+tau*tau));
      const c=1/Math.sqrt(1+tangent*tangent),s=tangent*c;
      for(let k=0;k<n;k++) if(k!==p&&k!==q){
        const akp=A[k][p],akq=A[k][q];
        A[k][p]=A[p][k]=c*akp-s*akq;
        A[k][q]=A[q][k]=s*akp+c*akq;
      }
      A[p][p]=app-tangent*apq; A[q][q]=aqq+tangent*apq; A[p][q]=A[q][p]=0;
      for(let k=0;k<n;k++){const vkp=V[k][p],vkq=V[k][q];V[k][p]=c*vkp-s*vkq;V[k][q]=s*vkp+c*vkq;}
    }
    if(!converged) throw new Error('Jacobi diagonalization did not converge.');
    return {values:A.map((r,i)=>r[i]),vectors:V,iterations};
  }
  function expectation(H,re,im){
    let e=0;
    for(let i=0;i<H.length;i++) for(let j=0;j<H.length;j++) e+=H[i][j]*(re[i]*re[j]+im[i]*im[j]);
    return e;
  }
  class Experiment {
    constructor(options={}){this.reset(options);}
    reset({t=1,Jz=2,holes=[2,5]}={}){
      const start=initialIndex(holes),{H,diagonal}=matrix(t,Jz),eig=diagonalize(H);
      // Commit atomically only after validation and diagonalization succeed.
      this.t=t;this.Jz=Jz;this.holes=[...holes].sort((a,b)=>a-b);this.H=H;this.diagonal=diagonal;this.eig=eig;this.start=start;this.energy0=diagonal[start];this.time=0;
      return this.at(0);
    }
    at(time){
      if(!Number.isFinite(time)) throw new Error('Time must be finite.');
      const n=basis.length,re=Array(n).fill(0),im=Array(n).fill(0),{values,vectors}=this.eig;
      for(let k=0;k<n;k++){
        const c=vectors[this.start][k],angle=values[k]*time,cr=c*Math.cos(angle),ci=-c*Math.sin(angle);
        for(let i=0;i<n;i++){re[i]+=vectors[i][k]*cr;im[i]+=vectors[i][k]*ci;}
      }
      const probabilities=re.map((r,i)=>r*r+im[i]*im[i]);
      const density=Array(L).fill(0);
      let norm=0,exchange=0,adjacent=0;
      probabilities.forEach((p,i)=>{norm+=p;exchange+=p*this.diagonal[i];basis[i].holes.forEach(h=>density[h]+=p);if(basis[i].holes[1]-basis[i].holes[0]===1)adjacent+=p;});
      const energy=expectation(this.H,re,im);
      this.time=time;
      return {time,re,im,probabilities,density,norm,exchange,kinetic:energy-exchange,energy,energyError:energy-this.energy0,holeNumber:density.reduce((a,b)=>a+b,0),Sz:0,adjacent};
    }
  }
  return {L,ORDER,basis,initialIndex,matrix,diagonalize,expectation,Experiment};
});
