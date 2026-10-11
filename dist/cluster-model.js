// Classical projected t–Jz configuration model, Jz=1. No wavefunction simulation.
// The infinite initial configuration is the fixed reference; only finite differences exist.
export const DIRS = Object.freeze({up:[0,-1],right:[1,0],down:[0,1],left:[-1,0]});
export const RULES = Object.freeze({energyCap:12,batteryInitial:100,batteryMax:160,collectionCharge:35,scorePerHole:100,version:1});
export const PUZZLES = [
 {id:'p1',name:'01 · 换端聚团',map:'neel',cap:0,holes:[{x:0,y:0},{x:1,y:0},{x:-1,y:0}],solution:['right','reverse','left'],description:'零交换能预算：试试从另一端接入空穴。'},
 {id:'p2',name:'02 · 一步搬运',map:'neel',cap:1,holes:[{x:0,y:0},{x:2,y:0}],solution:['right','right'],description:'用一次真实交换搭桥，再接入目标空穴。'},
 {id:'p3',name:'03 · 中间能垒',map:'neel',cap:1,holes:[{x:0,y:0},{x:1,y:0},{x:2,y:1}],solution:['right','right','down'],description:'最终能量下降，途中仍要跨过 1 J 峰值。'},
 {id:'p4',name:'04 · 三洞接力',map:'neel',cap:1,holes:[{x:0,y:0},{x:1,y:0},{x:2,y:1},{x:3,y:2}],solution:['right','right','down','right','down'],description:'长链宏步含多个近邻交换；每个中间态都受约束。'},
 {id:'p5',name:'05 · 反相墙旁',map:'wall',cap:0,holes:[{x:0,y:0},{x:0,y:2},{x:1,y:3}],solution:['down','down','right','down'],description:'在 x=1 反相墙旁，以零相对交换能上限完成聚团。'},
 {id:'p6',name:'06 · 折返拾群',map:'neel',cap:1.5,holes:[{x:0,y:0},{x:1,y:0},{x:3,y:2},{x:-1,y:2}],solution:['right','down','down','right','right','reverse','left','left'],description:'三处分散空穴，预算 1.5 J；换端后沿已有路径折返。'},
 {id:'p7',name:'07 · 双端绕行',map:'neel',cap:2,holes:[{x:0,y:0},{x:2,y:0},{x:2,y:3},{x:-1,y:3}],solution:['right','right','reverse','down','left','down','down','right','right','reverse','left'],description:'先架桥，再从另一端绕行；两次换端可连接远处分支。'},
 {id:'p8',name:'08 · 墙边绕弯',map:'wall',cap:1,holes:[{x:0,y:0},{x:0,y:2},{x:2,y:3},{x:-2,y:3}],solution:['down','down','right','down','down','reverse','right','reverse','left','up','left','left'],description:'围绕反相墙规划弯曲链；相同终点也可能有不同的途中峰值。'}
];
export function autoInterval(s) { return Math.max(180,420-12*Math.min(s.collected,20)); }
const MAX = Number.MAX_SAFE_INTEGER-64;
export const key = (x,y) => `${x},${y}`;
const validCoord = p => p && Number.isSafeInteger(p.x) && Number.isSafeInteger(p.y) && Math.abs(p.x)<=MAX && Math.abs(p.y)<=MAX;
const same = (a,b) => a.x===b.x && a.y===b.y;
const adjacent = (a,b) => Math.abs(a.x-b.x)+Math.abs(a.y-b.y)===1;
const copyPoint = p => ({x:p.x,y:p.y});
function hash(text) { let h=2166136261; for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);} h^=h>>>16;return h>>>0; }
function phase(world,x,y) {
 if(world.map==='wall')return x>=1?-1:1;
 if(world.map==='bend')return x>=2+(y>=2?2:0)?-1:1;
 if(world.map==='domains')return (Math.floor(x/18)+Math.floor(y/23))%2===0?1:-1;
 return 1;
}
export function referenceSpin(world,x,y) { return ((x%2+y%2)%2===0?1:-1)*phase(world,x,y); }
export function baseAt(world,x,y) {
 if(world.initialHoles.some(p=>p.x===x&&p.y===y))return 0;
 if(!world.finiteHoles){
  const cx=Math.floor(x/7),cy=Math.floor(y/7),h=hash(`${world.seed}:${cx}:${cy}`);
  if(x===cx*7+1+h%5 && y===cy*7+1+Math.floor(h/5)%5)return 0;
 }
 return referenceSpin(world,x,y);
}
export function valueAt(s,x,y) {const w=s.world||s;const k=key(x,y);return Object.hasOwn(w.overrides,k)?w.overrides[k]:baseAt(w,x,y);}
export function bondEnergy(a,b) {return a&&b?(a*b-1)/4:0;}
function put(w,p,v){const k=key(p.x,p.y);if(baseAt(w,p.x,p.y)===v)delete w.overrides[k];else w.overrides[k]=v;}
function bondsAround(points){const result=new Map();for(const p of points)for(const [dx,dy] of Object.values(DIRS)){const q={x:p.x+dx,y:p.y+dy};const a=key(p.x,p.y),b=key(q.x,q.y);result.set(a<b?`${a}|${b}`:`${b}|${a}`,[p,q]);}return [...result.values()];}
function swapHop(w,a,b){const bonds=bondsAround([a,b]);const sum=()=>bonds.reduce((e,[p,q])=>e+bondEnergy(valueAt(w,p.x,p.y),valueAt(w,q.x,q.y)),0);const before=sum(),va=valueAt(w,a.x,a.y),vb=valueAt(w,b.x,b.y);if(!adjacent(a,b)||!va||vb!==0)throw new Error('A physical hop must exchange a spin and a nearest-neighbor hole');put(w,a,vb);put(w,b,va);return sum()-before;}
export function finiteEnergyDifference(s){const w=s.world||s;const points=Object.keys(w.overrides).map(k=>{const [x,y]=k.split(',').map(Number);return{x,y};});return bondsAround(points).reduce((e,[a,b])=>e+bondEnergy(valueAt(w,a.x,a.y),valueAt(w,b.x,b.y))-bondEnergy(baseAt(w,a.x,a.y),baseAt(w,b.x,b.y)),0);}
export function invariants(s){const w=s.world||s;let holesDelta=0,upDelta=0,downDelta=0;for(const [k,v] of Object.entries(w.overrides)){const [x,y]=k.split(',').map(Number),b=baseAt(w,x,y);holesDelta+=(v===0)-(b===0);upDelta+=(v===1)-(b===1);downDelta+=(v===-1)-(b===-1);}return{holesDelta,upDelta,downDelta,szDelta:(upDelta-downDelta)/2};}
export function createGame({mode='endless',seed=17,puzzleId='p1',map='domains'}={}){
 if(!['endless','puzzle'].includes(mode))throw new Error('Unknown mode');
 if(!Number.isSafeInteger(seed)||seed<0||seed>4294967295)throw new Error('Seed must be an unsigned 32-bit integer');
 const puzzle=mode==='puzzle'?PUZZLES.find(p=>p.id===puzzleId):null;if(mode==='puzzle'&&!puzzle)throw new Error('Unknown puzzle');
 if(!['domains','neel','wall','bend'].includes(map))throw new Error('Unknown map');
 const holes=(puzzle?.holes||[{x:0,y:0}]).map(copyPoint),chain=[copyPoint(holes[0])];
 return{version:RULES.version,mode,puzzleId:mode==='puzzle'?puzzleId:null,world:{seed,map:puzzle?.map||map,finiteHoles:mode==='puzzle',initialHoles:holes,overrides:{}},chain,head:copyPoint(chain[0]),energy:0,limit:puzzle?.cap??RULES.energyCap,battery:mode==='puzzle'?null:RULES.batteryInitial,batteryMax:RULES.batteryMax,score:0,steps:0,hops:0,collected:0,status:'running',peak:0,lastDelta:0,totalCost:0,lastMove:null,event:'控制整条空穴链；每个自旋交换都检查真实交换能。'};
}
export function evaluateMove(s,dir){
 const fail=reason=>({ok:false,reason,cost:0,delta:0,peak:s.energy,subhops:[],next:null});
 if(typeof dir!=='string'||!Object.hasOwn(DIRS,dir))return fail('direction');
 if(s.status!=='running')return fail('inactive');
 const [dx,dy]=DIRS[dir],target={x:s.chain[0].x+dx,y:s.chain[0].y+dy};if(!validCoord(target))return fail('coordinate');
 const idx=s.chain.findIndex(p=>same(p,target));
 if(idx>=0){if(idx!==s.chain.length-1||s.chain.length<2)return fail('self');const chain=[copyPoint(target),...s.chain.slice(0,-1).map(copyPoint)];return{ok:true,kind:'rotate',cost:0,delta:0,peak:s.energy,subhops:[],collected:false,next:{...s,chain,head:chain[0],lastDelta:0,lastMove:{kind:'rotate',subhops:[],delta:0,cost:0,peak:s.energy},event:'尾端邻接：只旋转控制顺序，没有电子移动。'}};}
 if(valueAt(s,target.x,target.y)===0){const chain=[target,...s.chain.map(copyPoint)],collected=s.collected+1,won=s.mode==='puzzle'&&chain.length===s.world.initialHoles.length;return{ok:true,kind:'collect',cost:0,delta:0,peak:s.energy,subhops:[],collected:true,next:{...s,chain,head:target,collected,score:collected*RULES.scorePerHole,battery:s.mode==='endless'?Math.min(s.batteryMax,s.battery+RULES.collectionCharge):null,status:won?'won':'running',lastDelta:0,lastMove:{kind:'collect',subhops:[],delta:0,cost:0,peak:s.energy},event:won?'所有空穴已聚团！':'纳入一个已有空穴，链长 +1；粒子数不变。'}};}
 const world={...s.world,overrides:{...s.world.overrides}},subhops=[];let from=target,energy=s.energy,peak=energy,cost=0;
 for(const hole of s.chain){const delta=swapHop(world,from,hole);energy+=delta;peak=Math.max(peak,energy);cost+=1+Math.max(0,delta);subhops.push({from:copyPoint(from),to:copyPoint(hole),delta,energy});from=hole;}
 // Battery is a separate normalized game resource, never a physical energy.
 cost/=s.chain.length;
 const info={cost,delta:energy-s.energy,peak,subhops,collected:false};
 if(peak>s.limit)return{ok:false,reason:'energy',...info,next:null};
 if(s.mode==='endless'&&cost>s.battery)return{ok:false,reason:'battery',...info,next:null};
 const chain=[target,...s.chain.slice(0,-1).map(copyPoint)];
 return{ok:true,kind:'hop',...info,next:{...s,world,chain,head:target,energy,battery:s.mode==='endless'?s.battery-cost:null,steps:s.steps+1,hops:s.hops+subhops.length,totalCost:s.totalCost+cost,peak:Math.max(s.peak,peak),lastDelta:energy-s.energy,lastMove:{kind:'hop',...info},event:`${subhops.length} 次近邻交换；ΔE = ${energy-s.energy} J。`}};
}
export function hasPhysicalAction(s){
 const active={...s,status:'running'},rotations=adjacent(s.chain[0],s.chain.at(-1))&&s.chain.length>2?s.chain.length:1;
 for(let i=0;i<rotations;i++){const rotated=[...s.chain.slice(i),...s.chain.slice(0,i)];for(const chain of [rotated,[...rotated].reverse()])for(const dir of Object.keys(DIRS)){const p=evaluateMove({...active,chain,head:chain[0]},dir);if(p.ok&&p.kind!=='rotate')return true;}}
 return false;
}
export function reducer(s,action){
 if(!action||typeof action.type!=='string')return s;
 if(action.type==='pause')return s.status==='running'?{...s,status:'paused'}:s;
 if(action.type==='resume')return s.status==='paused'?{...s,status:'running'}:s;
 if(action.type==='reverse'&&s.status==='running'){const chain=[...s.chain].reverse().map(copyPoint);return{...s,chain,head:chain[0],lastDelta:0,lastMove:{kind:'reverse',cost:0,delta:0,peak:s.energy,subhops:[]},event:'控制端反转；自旋与空穴位置没有改变。'};}
 if(action.type!=='move')return s;
 const move=evaluateMove(s,action.dir);if(!move.ok)return{...s,event:({energy:'中间交换超出能量上限：整步撤销。',battery:'电池不足：试试另一端或低耗方向。',self:'链内部不可穿越；可反转控制端。',inactive:'当前未运行。',coordinate:'坐标超出可精确表示范围。'})[move.reason]||'无效方向。',lastBlocked:move.reason};
 let next={...move.next,lastBlocked:null};if(next.mode==='endless'&&next.status==='running'&&!hasPhysicalAction(next))next={...next,status:'lost',event:'两端都没有可负担的前进或收集动作，本局结束。'};return next;
}
export function visibleViewport(s,{x=s.head.x-8,y=s.head.y-6,width=17,height=13}={}){
 if(!validCoord({x,y})||!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>101||height>101||!validCoord({x:x+width,y:y+height}))throw new Error('Invalid viewport');
 const chainLookup=new Map(s.chain.map((p,i)=>[key(p.x,p.y),i])),cells=[],bonds=[];
 for(let yy=y;yy<y+height;yy++)for(let xx=x;xx<x+width;xx++){const value=valueAt(s,xx,yy);cells.push({x:xx,y:yy,value,reference:referenceSpin(s.world,xx,yy),initial:baseAt(s.world,xx,yy),chainIndex:chainLookup.get(key(xx,yy))??-1});for(const [dx,dy] of [[1,0],[0,1]]){if(xx+dx>=x+width||yy+dy>=y+height)continue;const v=valueAt(s,xx+dx,yy+dy);bonds.push({a:{x:xx,y:yy},b:{x:xx+dx,y:yy+dy},energy:bondEnergy(value,v),frustrated:!!value&&value===v});}}
 return{x,y,width,height,cells,bonds};
}
export function serialize(s){return JSON.stringify(s);}
export function deserialize(text){
 try{if(typeof text!=='string'||text.length>4000000)return null;const s=JSON.parse(text);if(!s||s.version!==1||!['endless','puzzle'].includes(s.mode)||!['running','paused','won','lost'].includes(s.status))return null;const w=s.world;if(!w||!Number.isSafeInteger(w.seed)||w.seed<0||w.seed>4294967295||!['domains','neel','wall','bend'].includes(w.map)||typeof w.finiteHoles!=='boolean'||!Array.isArray(w.initialHoles)||w.initialHoles.length<1||w.initialHoles.length>100||!w.initialHoles.every(validCoord)||!w.overrides||Array.isArray(w.overrides)||Object.keys(w.overrides).length>50000)return null;
 if(!Array.isArray(s.chain)||s.chain.length<1||s.chain.length>10000||!s.chain.every(validCoord)||new Set(s.chain.map(p=>key(p.x,p.y))).size!==s.chain.length||s.chain.some((p,i)=>i&&!adjacent(p,s.chain[i-1]))||!validCoord(s.head)||!same(s.head,s.chain[0]))return null;
 for(const [k,v] of Object.entries(w.overrides)){const pair=k.split(',');const p={x:Number(pair[0]),y:Number(pair[1])};if(pair.length!==2||!validCoord(p)||key(p.x,p.y)!==k||![-1,0,1].includes(v))return null;}
 if(s.chain.some(p=>valueAt(s,p.x,p.y)!==0)||Object.values(invariants(s)).some(v=>v!==0)||!Number.isFinite(s.energy)||finiteEnergyDifference(s)!==s.energy)return null;
 if(s.collected!==s.chain.length-1||s.score!==s.collected*RULES.scorePerHole||s.batteryMax!==RULES.batteryMax||!Number.isFinite(s.limit)||!Number.isFinite(s.peak)||s.peak<s.energy||s.peak>s.limit)return null;
 for(const k of ['steps','hops'])if(!Number.isSafeInteger(s[k])||s[k]<0)return null;if(!Number.isFinite(s.totalCost)||s.totalCost<0)return null;
 if(s.mode==='endless'){if(w.finiteHoles||w.initialHoles.length!==1||!same(w.initialHoles[0],{x:0,y:0})||s.limit!==RULES.energyCap||!Number.isFinite(s.battery)||s.battery<0||s.battery>s.batteryMax||s.status==='won')return null;}
 else{const p=PUZZLES.find(p=>p.id===s.puzzleId);if(!p||!w.finiteHoles||w.map!==p.map||s.limit!==p.cap||JSON.stringify(w.initialHoles)!==JSON.stringify(p.holes)||s.battery!==null||s.chain.length>p.holes.length||(s.status==='won')!==(s.chain.length===p.holes.length))return null;}
 // Rebuild known fields only. UI should always use textContent for all labels.
 return{version:1,mode:s.mode,puzzleId:s.mode==='puzzle'?s.puzzleId:null,world:{seed:w.seed,map:w.map,finiteHoles:w.finiteHoles,initialHoles:w.initialHoles.map(copyPoint),overrides:{...w.overrides}},chain:s.chain.map(copyPoint),head:copyPoint(s.head),energy:s.energy,limit:s.limit,battery:s.battery,batteryMax:s.batteryMax,score:s.score,steps:s.steps,hops:s.hops,collected:s.collected,status:s.status,peak:s.peak,lastDelta:0,totalCost:s.totalCost,lastMove:null,event:'已恢复经过守恒与能量校验的存档。',lastBlocked:null};
 }catch{return null;}
}
