/* Exact small-model mechanics. No DOM, random state, network, or animation dependency. */
export const LEVEL_COUNT=8;
export const SCHMIDT=[[.8,.15,.05],[.5,.3,.15,.05],[.7,.2,.1]];
export const PAIRS=['A1','B1','C1','A2','B2','C2'];
export function initialState(id){
 const data=[{spins:[1,1,1]}, {sites:[{id:0,spin:1},{id:1,spin:-1},{id:2,spin:1},{id:3,spin:-1}],hole:false}, {bonds:[1,1,.2,.2,1,.2,.2]}, {kept:SCHMIDT.map(a=>a.map(()=>false)),module:0}, {order:[...PAIRS]}, {edges:[-1,-1,1,1],stage:0,fluxUsed:false,armed:false}, {u:0}, {rings:[false,false,false],sample:5}][id];
 if(!data)throw new RangeError('Unknown level'); return {id,data,steps:0,feedback:''};
}
export function reduce(state,action){
 if(!validateState(state))throw new TypeError('Invalid game state');
 const s=structuredClone(state),d=s.data;let accepted=true;s.feedback='';
 const reject=msg=>{accepted=false;s.feedback=msg;};
 switch(s.id){
 case 0:if(action.type==='spin'&&integer(action.index,0,2))d.spins[action.index]*=-1;else reject('请选择一个自旋。');break;
 case 1:if(action.type==='hole'){if(d.hole)reject('空穴已注入；沿链移动空位。');else if(d.sites[3]?.id!==3)reject('第4格已没有可移除的占据。');else {d.sites[3]=null;d.hole=true;}}
 else if(action.type==='hop'&&integer(action.from,0,3)&&integer(action.to,0,3)){
  const e=d.sites[action.from],target=d.sites[action.to];
  if(!e)reject('这里是空位。请选择一个占据，再点相邻格。');
  else if(Math.abs(action.from-action.to)!==1)reject('只允许最近邻跃迁，不能跨格。');
  else if(target)reject(target.spin===e.spin?'Pauli 阻挡：相同自旋不能占据同一轨道。':'能量阻挡：异自旋可同格，但双占据代价 U=8 超出预算0。');
  else {d.sites[action.to]=e;d.sites[action.from]=null;}
 }else reject('请选择最近邻跃迁。');break;
 case 2:if(action.type==='bond'&&integer(action.index,0,6))d.bonds[action.index]=d.bonds[action.index]===1?.2:1;else reject('请选择链上的一根键。');break;
 case 3:if(action.type==='module'&&integer(action.index,0,2)){d.module=action.index;accepted=false;}
 else if(action.type==='keep'&&integer(action.module,0,2)&&integer(action.index,0,SCHMIDT[action.module].length-1))d.kept[action.module][action.index]=!d.kept[action.module][action.index];else reject('请选择一项Schmidt权重。');break;
 case 4:if(action.type==='swap'&&integer(action.from,0,5)&&integer(action.to,0,5)){[d.order[action.from],d.order[action.to]]=[d.order[action.to],d.order[action.from]];if(action.from===action.to)accepted=false;}else reject('请选择两个站点交换表示位置。');break;
 case 5:if(action.type==='vertex'&&integer(action.index,0,3)){d.edges[action.index]*=-1;d.edges[(action.index+3)%4]*=-1;}
 else if(action.type==='flux'&&integer(action.index,0,3)){if(d.stage!==1||d.fluxUsed)reject('π通量工具仅在第二轮可用一次。');else {d.edges[action.index]*=-1;d.fluxUsed=true;d.armed=false;}}
 else if(action.type==='advance'&&d.stage===0&&d.edges.every(x=>x===1)){d.stage=1;d.edges=[-1,-1,-1,1];s.feedback='第二轮：环通量 W=−1。局域换相位还能解锁吗？';}
 else reject('请选择一个顶点或可用的通量工具。');break;
 case 6:if(action.type==='u'&&integer(action.value,0,12))d.u=action.value;else reject('U必须为0至12的整数。');break;
 case 7:if(action.type==='ring'&&integer(action.index,0,2))d.rings[action.index]=!d.rings[action.index];else if(action.type==='sample'&&integer(action.value,0,7)){d.sample=action.value;accepted=false;}else reject('请选择中间轨道的检测环。');break;
 }
 if(accepted)s.steps=Math.min(1000000,s.steps+1);return s;
}
export function symmetricEigen(matrix){
 const n=matrix.length,a=matrix.map(r=>[...r]),v=Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>+(i===j)));
 for(let iteration=0;iteration<2000;iteration++){
  let p=0,q=1,max=0;for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)if(Math.abs(a[i][j])>max){max=Math.abs(a[i][j]);p=i;q=j;}
  if(max<1e-13)break;
  const angle=.5*Math.atan2(2*a[p][q],a[q][q]-a[p][p]),c=Math.cos(angle),s=Math.sin(angle),app=a[p][p],aqq=a[q][q],apq=a[p][q];
  for(let k=0;k<n;k++)if(k!==p&&k!==q){const akp=a[k][p],akq=a[k][q];a[k][p]=a[p][k]=c*akp-s*akq;a[k][q]=a[q][k]=s*akp+c*akq;}
  a[p][p]=c*c*app-2*s*c*apq+s*s*aqq;a[q][q]=s*s*app+2*s*c*apq+c*c*aqq;a[p][q]=a[q][p]=0;
  for(let k=0;k<n;k++){const vkp=v[k][p],vkq=v[k][q];v[k][p]=c*vkp-s*vkq;v[k][q]=s*vkp+c*vkq;}
 }
 return Array.from({length:n},(_,i)=>({energy:a[i][i],vector:v.map(row=>row[i])})).sort((a,b)=>a.energy-b.energy);
}
export function sshSpectrum(bonds){const a=Array.from({length:8},()=>Array(8).fill(0));bonds.forEach((b,i)=>a[i][i+1]=a[i+1][i]=b);return symmetricEigen(a);}
export function evaluate(s){
 const d=s.data;
 switch(s.id){
 case 0:{const contributions=[3*d.spins[0]*d.spins[1],2*d.spins[1]*d.spins[2],d.spins[2]*d.spins[0]],energy=contributions.reduce((a,b)=>a+b,0);return {won:energy===-4,energy,contributions,satisfied:contributions.filter(x=>x<0).length};}
 case 1:{const marker=d.sites.findIndex(x=>x?.id===0);return {won:d.hole&&marker===1,marker,holes:d.sites.filter(x=>x===null).length,doublons:0,energy:0};}
 case 2:{const spectrum=sshSpectrum(d.bonds),nearest=[...spectrum].sort((a,b)=>Math.abs(a.energy)-Math.abs(b.energy)).slice(0,2),energy=Math.max(...nearest.map(x=>Math.abs(x.energy))),edge=Math.min(...nearest.map(x=>x.vector[0]**2+x.vector[7]**2)),strong=d.bonds.filter(x=>x===1).length,alternating=d.bonds.every((x,i)=>!i||x!==d.bonds[i-1]);return {won:strong===3&&alternating&&energy<.01&&edge>.9,spectrum,nearest,energy,edge,strong,alternating};}
 case 3:{const fidelities=d.kept.map((row,m)=>row.reduce((sum,v,i)=>sum+(v?SCHMIDT[m][i]:0),0)),slots=d.kept.flat().filter(Boolean).length;return {won:slots<=7&&fidelities.every(x=>x>=.9-1e-12),fidelities,slots,totalFidelity:fidelities.reduce((a,b)=>a*b,1)};}
 case 4:{const crossings=Array.from({length:5},(_,i)=>['A','B','C'].filter(pair=>d.order.slice(0,i+1).filter(x=>x[0]===pair).length===1).length),chi=crossings.map(x=>2**x),maxChi=Math.max(...chi);return {won:maxChi<=2,crossings,chi,maxChi};}
 case 5:{const w=d.edges.reduce((a,b)=>a*b,1),positive=d.edges.filter(x=>x===1).length;return {won:d.stage===1&&d.fluxUsed&&positive===4,roundWon:positive===4,w,positive};}
 case 6:{const root=Math.sqrt(d.u*d.u+16),exchange=(root-d.u)/2,doublon=.5*(1-d.u/root);return {won:exchange>=.6-1e-12&&doublon<=.1+1e-12,exchange,doublon,approx:d.u?4/d.u:null};}
 case 7:{const cases=Array.from({length:8},(_,bits)=>{const n=[bits&1,(bits>>1)&1,(bits>>2)&1],expected=(-1)**n.reduce((a,b)=>a+b,0),actual=(-1)**n.reduce((a,b,i)=>a+(d.rings[i]?b:0),0);return {n,expected,actual,pass:expected===actual};}),passed=cases.filter(x=>x.pass).length;return {won:passed===8,cases,passed};}
 }
}
const integer=(v,a,b)=>Number.isInteger(v)&&v>=a&&v<=b;
const exactArray=(v,n,p)=>Array.isArray(v)&&v.length===n&&v.every(p);
export function validateState(s){
 if(!s||!integer(s.id,0,7)||!integer(s.steps,0,1000000)||typeof s.feedback!=='string'||s.feedback.length>500||!s.data||typeof s.data!=='object')return false;
 const d=s.data;
 switch(s.id){
 case 0:return exactArray(d.spins,3,v=>v===1||v===-1);
 case 1:{if(typeof d.hole!=='boolean'||!exactArray(d.sites,4,e=>e===null||(e&&integer(e.id,0,3)&&e.spin===(e.id%2===0?1:-1))))return false;const ids=d.sites.filter(Boolean).map(e=>e.id);return new Set(ids).size===ids.length&&ids.every((id,i)=>id===i)&&ids.length===(d.hole?3:4)&&[0,1,2].every(x=>ids.includes(x))&&(d.hole?!ids.includes(3):ids.includes(3));}
 case 2:return exactArray(d.bonds,7,v=>v===1||v===.2);
 case 3:return integer(d.module,0,2)&&exactArray(d.kept,3,(row)=>Array.isArray(row))&&d.kept.every((row,i)=>exactArray(row,SCHMIDT[i].length,v=>typeof v==='boolean'));
 case 4:return exactArray(d.order,6,v=>PAIRS.includes(v))&&new Set(d.order).size===6;
 case 5:return exactArray(d.edges,4,v=>v===1||v===-1)&&integer(d.stage,0,1)&&typeof d.fluxUsed==='boolean'&&typeof d.armed==='boolean'&&!(d.stage===0&&d.fluxUsed)&&d.edges.reduce((a,b)=>a*b,1)===(d.stage===0?1:(d.fluxUsed?1:-1));
 case 6:return integer(d.u,0,12);
 case 7:return exactArray(d.rings,3,v=>typeof v==='boolean')&&integer(d.sample,0,7);
 }
}
export function initialSave(){return {version:1,current:0,completed:[],states:Array.from({length:8},(_,id)=>initialState(id)),hints:Array(8).fill(0),started:false};}
export function validateSave(v){
 if(!v||v.version!==1||!integer(v.current,0,7)||typeof v.started!=='boolean'||!exactArray(v.states,8,validateState)||!v.states.every((s,i)=>s.id===i)||!exactArray(v.hints,8,x=>integer(x,0,3))||!Array.isArray(v.completed)||v.completed.some(x=>!integer(x,0,7))||new Set(v.completed).size!==v.completed.length)return false;
 // Completion history survives free experimentation; it need not match the current apparatus.
 return v.completed.every((x,i)=>x===i)&&v.current<=Math.min(v.completed.length,7);
}
export function parseSave(text){if(typeof text!=='string'||text.length>100000)throw new Error('存档格式或大小不正确。');let value;try{value=JSON.parse(text);}catch{throw new Error('这不是有效的JSON存档。');}if(!validateSave(value))throw new Error('存档不兼容或内容损坏，原进度未改动。');return value;}
