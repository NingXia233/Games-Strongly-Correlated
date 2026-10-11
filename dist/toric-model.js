/** Toric duel, rules v1. Local hotseat is a privacy curtain, NOT a security boundary.
 * Qubits: h(x,y), v(x,y). Z chains use primal vertices (e); X chains use dual
 * plaquettes (m). Everything is GF(2). No hidden state is put in publicView.
 */
export const VERSION = 1;
export const SIZE = 5;
const clone = x => JSON.parse(JSON.stringify(x));
const fail = message => { throw new Error(message); };
const mod = (x,n) => (x+n)%n;
export function edgeId(edge,n=SIZE) {
  if(typeof edge === 'string') {
    const m=/^([hv]):([0-9]+):([0-9]+)$/.exec(edge);
    if(!m) fail('Invalid edge');
    edge={orientation:m[1],x:Number(m[2]),y:Number(m[3])};
  }
  if(!edge || !['h','v'].includes(edge.orientation) || !Number.isInteger(edge.x) || !Number.isInteger(edge.y) || edge.x<0 || edge.y<0 || edge.x>=n || edge.y>=n) fail('Invalid edge');
  return `${edge.orientation}:${edge.x}:${edge.y}`;
}
export function edgeObject(edge,layer,n=SIZE) {
  const [orientation,x,y]=edgeId(edge,n).split(':');
  return {orientation,x:+x,y:+y,...(layer?{layer}:{})};
}
export function edges(n=SIZE) {
  const list=[]; for(const orientation of ['h','v']) for(let y=0;y<n;y++) for(let x=0;x<n;x++) list.push({orientation,x,y}); return list;
}
export function endpoints(edge,layer,n=SIZE) {
  const {orientation:o,x,y}=edgeObject(edge,undefined,n);
  if(layer==='Z') return [{x,y},o==='h'?{x:mod(x+1,n),y}:{x,y:mod(y+1,n)}];
  if(layer==='X') return [{x,y},o==='h'?{x,y:mod(y-1,n)}:{x:mod(x-1,n),y}];
  fail('Layer must be X or Z');
}
export function syndrome(chain,layer,n=SIZE) {
  const bits=new Set(); for(const e of chain) for(const p of endpoints(e,layer,n)) { const i=p.y*n+p.x; bits.has(i)?bits.delete(i):bits.add(i); }
  return [...bits].sort((a,b)=>a-b).map(i=>({x:i%n,y:Math.floor(i/n)}));
}
export function seamBits(chain,layer,n=SIZE) {
  let a=0,b=0; for(const e of chain) { const {orientation:o,x,y}=edgeObject(e,undefined,n);
    if(layer==='Z') { if(o==='h'&&x===n-1)a^=1; if(o==='v'&&y===n-1)b^=1; }
    else if(layer==='X') { if(o==='v'&&x===0)a^=1; if(o==='h'&&y===0)b^=1; }
    else fail('Layer must be X or Z');
  } return [a,b];
}
const bothSyndromes = error => ({e:syndrome(error.Z,'Z'),m:syndrome(error.X,'X')});
const xor = (a,b) => {const s=new Set(a); for(const e of b)s.has(e)?s.delete(e):s.add(e); return [...s].sort();};
const asObjects = chains => ({X:chains.X.map(e=>edgeObject(e,'X')),Z:chains.Z.map(e=>edgeObject(e,'Z'))});
function checkState(s) { if(!s || s.version!==VERSION || !['placement','play','resolved'].includes(s.phase) || s.size!==SIZE) fail('Invalid game state'); }
function requirePhase(s,p) {checkState(s);if(s.phase!==p)fail(`Action requires ${p} phase`);}
function withEvent(s,event) {const t=clone(s); t.events.push(event); return t;}
function layerArg(edge,layer) {layer=layer || edge?.layer; if(!['X','Z','Y'].includes(layer))fail('Layer must be X, Z or Y');return layer;}
export function createGame(config={}) {
  if(config.size!==undefined&&config.size!==SIZE || config.n!==undefined&&config.n!==SIZE)fail('Rules v1 require size 5');
  const probeBudget=config.probeBudget??1;
  if(!Number.isInteger(probeBudget)||probeBudget<0||probeBudget>2)fail('Probe budget must be 0, 1 or 2');
  return {version:VERSION,size:SIZE,phase:'placement',config:{probeBudget,maxLayer:4,maxTotal:6},error:{X:[],Z:[]},correction:{X:[],Z:[]},probes:[],events:[]};
}
export function placeError(s,edge,layer) {
  requirePhase(s,'placement'); const id=edgeId(edge), l=layerArg(edge,layer),t=withEvent(s,{type:'placeError',edge:id,layer:l});
  for(const k of l==='Y'?['X','Z']:[l])t.error[k]=xor(t.error[k],[id]);
  if(t.error.X.length>4||t.error.Z.length>4||t.error.X.length+t.error.Z.length>6)fail('Attack budget exceeded: each layer ≤4, total ≤6');
  return t;
}
export function finishPlacement(s) {
  requirePhase(s,'placement'); const sy=bothSyndromes(s.error);
  if(!sy.e.length&&!sy.m.length)fail('Attack must have a nonzero syndrome');
  const t=withEvent(s,{type:'finishPlacement'});t.phase='play';return t;
}
export function probe(s,edge) {
  requirePhase(s,'play');const id=edgeId(edge);
  if(s.probes.some(p=>p.edge===id))fail('This edge was already probed');
  if(s.probes.length>=s.config.probeBudget)fail('No probes remaining');
  const t=withEvent(s,{type:'probe',edge:id});
  const x=s.error.X.includes(id),z=s.error.Z.includes(id);
  t.probes.push({edge:id,result:x?(z?'Y':'X'):(z?'Z':'I')});return t;
}
/** Scouting and correction deliberately interleave. This is a UI transition only. */
export function finishScouting(s) {requirePhase(s,'play');return clone(s);}
export function toggleCorrection(s,edge,layer) {
  requirePhase(s,'play'); const id=edgeId(edge),l=layerArg(edge,layer),t=withEvent(s,{type:'toggleCorrection',edge:id,layer:l});
  for(const k of l==='Y'?['X','Z']:[l])t.correction[k]=xor(t.correction[k],[id]);return t;
}
/** Undo only the most recent draft edit. Information gained from a probe cannot be undone. */
export function undo(s) {
  checkState(s);const last=s.events.at(-1);
  if(!last || !['placeError','toggleCorrection'].includes(last.type) || s.phase==='resolved')fail('Only the latest draft edit can be undone');
  return replay({version:VERSION,config:s.config,events:s.events.slice(0,-1)});
}
export function resolve(s) {
  requirePhase(s,'play');const t=withEvent(s,{type:'resolve'}),residual={X:xor(s.error.X,s.correction.X),Z:xor(s.error.Z,s.correction.Z)},sy=bothSyndromes(residual);
  const closed=!sy.e.length&&!sy.m.length;
  // Open strings have no homology class: never present seam parity as logical failure.
  const winding=closed?[...seamBits(residual.Z,'Z'),...seamBits(residual.X,'X')]:null;
  const logical=closed&&winding.some(Boolean);
  t.phase='resolved';t.result={winner:closed&&!logical?'defender':'attacker',reason:!closed?'syndrome':logical?'logical':'corrected',winding,residual:asObjects(residual),syndrome:sy};return t;
}
export function publicView(s,role='defender') {
  checkState(s);if(!['defender','attacker','spectator'].includes(role))fail('Unknown role');
  const reveal=s.phase==='resolved'||role==='attacker'&&s.phase==='placement';
  return {version:VERSION,size:SIZE,phase:s.phase,config:clone(s.config),correction:asObjects(s.correction),initialSyndrome:s.phase==='placement'&&!reveal?{e:[],m:[]}:bothSyndromes(s.error),syndrome:s.phase==='placement'&&!reveal?{e:[],m:[]}:bothSyndromes({X:xor(s.error.X,s.correction.X),Z:xor(s.error.Z,s.correction.Z)}),probes:s.probes.map(p=>({edge:edgeObject(p.edge),result:p.result})),probesRemaining:s.config.probeBudget-s.probes.length,...(reveal?{error:asObjects(s.error),cost:{X:s.error.X.length,Z:s.error.Z.length,total:s.error.X.length+s.error.Z.length}}:{}),...(s.result?{result:clone(s.result)}:{})};
}
/** Secret save: keep in the local controller, never pass to a defender or fair AI. */
export function serialize(s) {checkState(s);return JSON.stringify({version:VERSION,config:s.config,events:s.events});}
export function replay(save) {
  if(typeof save==='string'){try{save=JSON.parse(save);}catch{fail('Invalid save JSON');}}
  if(!save||save.version!==VERSION||!Array.isArray(save.events)||save.events.length>10000)fail('Unsupported or invalid save');
  let s=createGame(save.config);for(const e of save.events){
    if(!e||typeof e!=='object')fail('Invalid event');
    if(e.type==='placeError')s=placeError(s,e.edge,e.layer);
    else if(e.type==='finishPlacement')s=finishPlacement(s);
    else if(e.type==='probe')s=probe(s,e.edge);
    else if(e.type==='toggleCorrection')s=toggleCorrection(s,e.edge,e.layer);
    else if(e.type==='resolve')s=resolve(s);else fail('Unknown save event');
  }return s;
}
