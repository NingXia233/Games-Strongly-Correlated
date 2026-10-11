/** Fair AI: its only defensive input is a public view and public probe results.
 * Standard: uniform feasible-chain prior. Expert: approximate finite-game
 * minimax via multiplicative weights, not a claim of exact global optimality.
 */
import {SIZE,edges,edgeId,edgeObject,endpoints,seamBits} from './toric-model.js';
const E=edges(), IDS=E.map(e=>edgeId(e));
const clone=x=>JSON.parse(JSON.stringify(x));
export function createRng(seed=1) {
  let a=2166136261;for(const c of String(seed)){a^=c.charCodeAt(0);a=Math.imul(a,16777619);}
  return ()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};
}
const META=Object.fromEntries(['X','Z'].map(layer=>[layer,E.map(e=>{const p=endpoints(e,layer);const w=seamBits([e],layer);return {mask:(1<<(p[0].y*5+p[0].x))^(1<<(p[1].y*5+p[1].x)),sig:w[0]*2+w[1]};})]));
const cache=new Map();
function maskOf(points) {
  if(!Array.isArray(points))throw Error('Invalid public syndrome');let mask=0;
  for(const p of points){if(!p||!Number.isInteger(p.x)||!Number.isInteger(p.y)||p.x<0||p.x>=5||p.y<0||p.y>=5)throw Error('Invalid syndrome coordinate');const bit=1<<(p.y*5+p.x);if(mask&bit)throw Error('Duplicate syndrome coordinate');mask|=bit;}return mask;
}
/** Enumerate every chain of weight ≤4 compatible with the initial syndrome/logs. */
export function layerCandidates(points,layer,probes=[]) {
  if(!['X','Z'].includes(layer))throw Error('Invalid layer');const target=maskOf(points),fixed=new Map();
  for(const p of probes){const id=edgeId(p.edge);if(!['I','X','Z','Y'].includes(p.result))throw Error('Invalid probe result');const on=p.result===layer||p.result==='Y';if(fixed.has(id)&&fixed.get(id)!==on)throw Error('Conflicting logs');fixed.set(id,on);}
  const key=layer+':'+target+':'+JSON.stringify([...fixed].sort());if(cache.has(key))return clone(cache.get(key));
  const mandatory=[],available=[];for(let i=0;i<50;i++){if(fixed.get(IDS[i]))mandatory.push(i);else if(!fixed.has(IDS[i]))available.push(i);}
  const out=[];if(mandatory.length>4)return out;
  let base=0,sig=0;for(const i of mandatory){base^=META[layer][i].mask;sig^=META[layer][i].sig;}
  const selected=[...mandatory];
  function walk(start,left,mask,signature){
    if(mask===target)out.push({edges:selected.map(i=>IDS[i]).sort(),weight:selected.length,signature});
    if(!left)return;for(let j=start;j<available.length;j++){const i=available[j];selected.push(i);walk(j+1,left-1,mask^META[layer][i].mask,signature^META[layer][i].sig);selected.pop();}
  }
  walk(0,4-mandatory.length,base,sig);
  if(cache.size>=32)cache.delete(cache.keys().next().value);cache.set(key,clone(out));return out;
}
function inspectView(view){
  if(!view||view.phase!=='play'||view.size!==SIZE)throw Error('AI requires a size-5 public play view');
  if('error'in view||'events'in view||'cost'in view||'seed'in view)throw Error('Fair AI refuses hidden state; pass publicView(state, "defender")');
  if(!Number.isInteger(view.probesRemaining)||view.probesRemaining<0||view.probesRemaining>2)throw Error('Invalid probe budget');
  const sy=view.initialSyndrome||view.syndrome;if(!sy)throw Error('Missing syndrome');
  const x=layerCandidates(sy.m,'X',view.probes||[]),z=layerCandidates(sy.e,'Z',view.probes||[]),pairs=[];
  for(const a of x)for(const b of z)if(a.weight+b.weight<=6){
    const xs=new Set(a.edges),zs=new Set(b.edges);
    pairs.push({X:a,Z:b,category:b.signature*4+a.signature,outcomes:IDS.map(id=>(xs.has(id)?1:0)+(zs.has(id)?2:0))});
  }
  if(!pairs.length)throw Error('No legal attack matches this public evidence');return pairs;
}
const PAULI=['I','X','Z','Y'];
const correctionOf=p=>({X:p.X.edges.map(e=>edgeObject(e,'X')),Z:p.Z.edges.map(e=>edgeObject(e,'Z'))});
function partitions(indices,pairs,excluded){
  const unique=new Map();for(let edge=0;edge<50;edge++){
    if(excluded.has(IDS[edge]))continue;const groups=[[],[],[],[]];for(const i of indices)groups[pairs[i].outcomes[edge]].push(i);
    if(groups.filter(g=>g.length).length<2)continue;
    // Equivalent queries add no strategy; canonicalize to save browser work.
    const key=groups.map(g=>g.join(',')).join('|');if(!unique.has(key))unique.set(key,{edge,groups});
  }return [...unique.values()];
}
function buildStructure(indices,pairs,excluded,depth){
  const categories=new Set(indices.map(i=>pairs[i].category));
  const node={indices,queries:[]};if(depth<=0||categories.size<=1)return node;
  node.queries=partitions(indices,pairs,excluded).map(q=>({edge:q.edge,children:q.groups.map(g=>g.length?buildStructure(g,pairs,excluded,depth-1):null)}));return node;
}
function bestResponse(struct,pairs,weights,rng){
  const counts=new Map();for(const i of struct.indices){const c=pairs[i].category;counts.set(c,(counts.get(c)||0)+weights[i]);}
  let best=-1,categories=[];for(const [c,w]of counts){if(w>best+1e-12){best=w;categories=[c];}else if(Math.abs(w-best)<1e-12)categories.push(c);}
  const category=categories[Math.floor(rng()*categories.length)];
  let chosen={value:best,category,indices:struct.indices,probe:null},ties=1;
  for(const q of struct.queries){const children=q.children.map(c=>c?bestResponse(c,pairs,weights,rng):null),value=children.reduce((a,c)=>a+(c?.value||0),0);
    if(value>chosen.value+1e-12){chosen={value,probe:q.edge,children,indices:struct.indices};ties=1;}
    else if(Math.abs(value-chosen.value)<1e-12&&rng()<1/++ties)chosen={value,probe:q.edge,children,indices:struct.indices};
  }return chosen;
}
function payoff(tree,pairs,i){while(tree.probe!==null)tree=tree.children[pairs[i].outcomes[tree.probe]];return +(tree.category===pairs[i].category);}
function exportTree(tree,pairs,rng){
  if(tree.probe===null){const options=tree.indices.filter(i=>pairs[i].category===tree.category);let weight=Math.min(...options.map(i=>pairs[i].X.weight+pairs[i].Z.weight));const shortest=options.filter(i=>pairs[i].X.weight+pairs[i].Z.weight===weight);return {probe:null,correction:correctionOf(pairs[shortest[Math.floor(rng()*shortest.length)]])};}
  const branches={};tree.children.forEach((c,i)=>{if(c)branches[PAULI[i]]=exportTree(c,pairs,rng);});return {probe:edgeObject(IDS[tree.probe]),correction:null,branches};
}
export function defenderPlan(view,{seed=1,difficulty='standard',iterations=192}={}){
  if(!['easy','standard','expert'].includes(difficulty))throw Error('Unknown AI difficulty');
  const pairs=inspectView(view),rng=createRng(seed),excluded=new Set((view.probes||[]).map(p=>edgeId(p.edge)));
  const depth=difficulty==='easy'?0:view.probesRemaining;
  const struct=buildStructure(pairs.map((_,i)=>i),pairs,excluded,depth),weights=pairs.map(()=>1/pairs.length);
  let tree,guarantee=null;
  if(difficulty==='easy'){
    // A familiar minimum-weight decoder: valid syndrome matching, no scouting.
    const min=Math.min(...pairs.map(p=>p.X.weight+p.Z.weight)),choices=pairs.filter(p=>p.X.weight+p.Z.weight===min);
    return {probe:null,correction:correctionOf(choices[Math.floor(rng()*choices.length)]),candidateCount:pairs.length,difficulty,explanation:'最短链解码：匹配公开综合征，不使用探针；最短并不保证逻辑正确。'};
  }
  if(difficulty==='standard')tree=bestResponse(struct,pairs,weights,rng);
  else{
    if(!Number.isInteger(iterations)||iterations<32||iterations>512)throw Error('Iterations must be 32–512');
    const policies=[],scores=pairs.map(()=>0),eta=Math.sqrt(2*Math.log(Math.max(2,pairs.length))/iterations);
    for(let t=0;t<iterations;t++){
      const policy=bestResponse(struct,pairs,weights,rng);policies.push(policy);let total=0;
      for(let i=0;i<pairs.length;i++){const win=payoff(policy,pairs,i);scores[i]+=win;weights[i]*=Math.exp(-eta*win);total+=weights[i];}
      for(let i=0;i<weights.length;i++)weights[i]/=total;
    }
    tree=policies[Math.floor(rng()*policies.length)];guarantee=Math.min(...scores)/iterations;
  }
  return {...exportTree(tree,pairs,rng),candidateCount:pairs.length,difficulty,estimatedWorstCase:guarantee,explanation:difficulty==='expert'?'枚举公开证据允许的攻击，使用乘法权重混合探针策略；近似极小极大，不读取隐藏链。':'枚举公开证据允许的攻击，以均匀合法链先验选择探针和同调类；不是绝对最优对抗策略。'};
}
const HARD=[['h:0:0','v:0:0','h:1:0'],['v:2:0','h:0:1','h:1:1'],['v:0:0','h:2:0','h:3:0','h:4:0'],['v:2:0','h:2:1','h:3:1','h:4:1']];
function transform(chain,dx,dy,rotation,layer){
  // Rotate primal edge endpoints; then primal→dual map h→v(x+1,y), v→h(x,y+1).
  const out=[];for(const id of chain){let {orientation:o,x,y}=edgeObject(id);for(let r=0;r<rotation;r++){if(o==='h'){[x,y]=[(5-y)%5,x];o='v';}else{[x,y]=[(4-y+5)%5,x];o='h';}}
    x=(x+dx)%5;y=(y+dy)%5;if(layer==='X'){if(o==='h'){o='v';x=(x+1)%5;}else{o='h';y=(y+1)%5;}}out.push({orientation:o,x,y,layer});
  }return out;
}
export function createAttack({seed=1,difficulty='standard'}={}){
  if(!['easy','standard','expert'].includes(difficulty))throw Error('Unknown AI difficulty');
  const rng=createRng(seed),pick=n=>Math.floor(rng()*n),layer=rng()<.5?'Z':'X',dx=pick(5),dy=pick(5),rotation=pick(4);
  const error={X:[],Z:[]};
  if(difficulty==='easy')error[layer]=transform(['h:0:0','v:1:0'],dx,dy,rotation,layer);
  else if(difficulty==='standard')error[layer]=transform(HARD[pick(HARD.length)],dx,dy,rotation,layer);
  else {
    // Exact one-probe least-favourable mixture for the published 10-candidate
    // double-layer family: five attacks with probability 1/5 each.
    const k=pick(5),z=HARD[k===0||k===1?0:k-1],x=k===1?['v:0:1','v:3:1','v:4:1']:['v:1:1','v:2:1'];
    error.Z=transform(z,dx,dy,rotation,'Z');
    // These are already physical X edges: spatial rotation, NOT a second dual map.
    error.X=transform(x,dx,dy,rotation,'Z').map(e=>({...e,layer:'X'}));
  }
  return {error,seed,difficulty,label:difficulty==='easy'?'教学：可收缩短链':difficulty==='standard'?'单层歧义长短链混合':'双层协同歧义混合',description:difficulty==='expert'?'固定种子可复现；双层五种攻击均匀混合，再整体平移旋转。该族单探针条件极小极大守胜率为60%，不是全局胜率保证。':'固定种子可复现；标准攻击从四种难分路径均匀选取并平移旋转。'};
}
export function analyzePublic(view){const pairs=inspectView(view),counts={};for(const p of pairs)counts[p.category]=(counts[p.category]||0)+1;return {candidateCount:pairs.length,homologyClassCounts:counts,prior:'uniform feasible X/Z chain pairs, each weight≤4 and total≤6'};}
