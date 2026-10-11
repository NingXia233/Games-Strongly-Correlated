// Classical, projected t–Jz configuration game. Spins are 2Sz ∈ {-1,+1}; 0 is a hole.
export const DIRS = { up:[0,-1], right:[1,0], down:[0,1], left:[-1,0] };
export const MAPS = {
  neel:{ name:'01 · 单域 Néel', subtitle:'回头不是犯规，是修复', goal:5, limit:13 },
  wall:{ name:'02 · 直线反相墙', subtitle:'沿墙走，观察每一条键', goal:6, limit:13 },
  bend:{ name:'03 · 折弯反相墙', subtitle:'墙的拐角不会免费放行', goal:7, limit:14 }
};
export function random(seed) { let s=seed>>>0; return () => ((s=(Math.imul(1664525,s)+1013904223)>>>0)/4294967296); }
export function referenceSpins(n,map='neel') {
 return Array.from({length:n*n},(_,i)=> {const x=i%n,y=Math.floor(i/n);const boundary=map==='bend'?Math.floor(n/2)+(y>=Math.floor(n/2)?2:0):Math.floor(n/2);const phase=map!=='neel'&&x>=boundary?-1:1; return ((x+y)%2?-1:1)*phase;});
}
export function bondEnergy(a,b) { return a&&b ? (a*b-1)/4 : 0; }
export function energy(spins,n) { let e=0;for(let i=0;i<spins.length;i++){ if(i%n<n-1)e+=bondEnergy(spins[i],spins[i+1]);if(i<n*(n-1))e+=bondEnergy(spins[i],spins[i+n]); }return e; }
export function neighbors(i,n) { return Object.entries(DIRS).map(([dir,[dx,dy]])=>({dir,x:i%n+dx,y:Math.floor(i/n)+dy})).filter(p=>p.x>=0&&p.x<n&&p.y>=0&&p.y<n).map(p=>({...p,index:p.y*n+p.x})); }
export function defectEnergy(s) { const ref=s.reference.map((v,i)=>s.spins[i]===0?0:v);return energy(s.spins,s.n)-energy(ref,s.n); }
export function mismatch(s) {return s.spins.flatMap((v,i)=>v!==0&&v!==s.reference[i]?[i]:[]);}
export function frustratedBonds(s) {const result=[];for(let i=0;i<s.spins.length;i++){for(const j of [i%s.n<s.n-1?i+1:-1,i<s.n*(s.n-1)?i+s.n:-1]){if(j>=0&&s.spins[i]&&s.spins[j]&&s.spins[i]===s.spins[j])result.push([i,j]);}}return result;}
export function invariants(s) {return {holes:s.spins.filter(x=>x===0).length,up:s.spins.filter(x=>x===1).length,down:s.spins.filter(x=>x===-1).length,sz:s.spins.reduce((a,b)=>a+b,0)/2};}
export function createGame({n=12,map='neel',seed=17,lesson='relay',limit=12,holeCount}={}) {
 if(!MAPS[map])throw new Error('Unknown map');if(n<6||n%2)throw new Error('Use an even grid of at least 6');
 const reference=referenceSpins(n,map), head=Math.floor(n/2)*n+(lesson==='wall'?Math.floor(n/2)-1:Math.floor(n/2)-2);
 const s={n,map,seed,lesson,reference,spins:[...reference],head,trail:[head],steps:0,collected:0,score:0,healed:0,loops:0,tension:0,relativeEnergy:0,lastDelta:0,status:'ready',limit,history:[],event:'每一步交换空穴与邻格自旋。回头和穿越旧尾迹都合法。',holes:[head],claimed:[0],maxSteps:240,exit:head,peak:0,maxDistance:0,loopAwarded:false};
 s.spins[head]=0;const count=holeCount??(lesson==='relay'?5:1), rng=random(seed);
 const candidates=s.spins.flatMap((v,i)=>v!==0&&i%n>0&&i%n<n-1&&Math.floor(i/n)>0&&Math.floor(i/n)<n-1&&Math.abs(i%n-head%n)+Math.abs(Math.floor(i/n)-Math.floor(head/n))>=2?[i]:[]);
 for(let k=1;k<count&&candidates.length;k++){const ix=Math.floor(rng()*candidates.length),pos=candidates.splice(ix,1)[0];s.holes.push(pos);s.spins[pos]=0;}
 s.goal=s.holes.length-1;s.initialEnergy=energy(s.spins,n);s.initialSpins=[...s.spins];s.initialInvariants=invariants(s);return s;
}
export function predict(s,dir) {const next=neighbors(s.head,s.n).find(p=>p.dir===dir);if(!next)return null;if(!s.spins[next.index])return 0;const a=[...s.spins];[a[s.head],a[next.index]]=[a[next.index],a[s.head]];return energy(a,s.n)-energy(s.spins,s.n);}
export function move(s,dir) {
 if(['won','lost','paused'].includes(s.status))return {ok:false,reason:'inactive'};
 const next=neighbors(s.head,s.n).find(p=>p.dir===dir);
 if(!next){s.event='边界之外没有格点。换个方向，边界不会杀死你。';return {ok:false,reason:'boundary'};}
 const prev=s.head, before=energy(s.spins,s.n), oldMismatch=mismatch(s).length;
 const transfer=s.spins[next.index]===0;
 if(transfer){
  const id=s.holes.indexOf(next.index);s.head=next.index;s.lastDelta=0;s.history=[];
  if(!s.claimed.includes(id)){s.claimed.push(id);s.collected++;s.score+=100;s.event='接力成功 +100！只交接控制权，洞与自旋都未改变。';}
  else s.event='控制权交接。没有电子移动，ΔE_J = 0。';
 }else{
  const delta=predict(s,dir);
  if(s.relativeEnergy+delta>s.limit){s.event='交换能预算拦住了这一步。试试回头修复，或低能方向。';return {ok:false,reason:'budget'};}
  [s.spins[prev],s.spins[next.index]]=[s.spins[next.index],s.spins[prev]];s.holes[s.holes.indexOf(prev)]=next.index;s.head=next.index;
  s.lastDelta=energy(s.spins,s.n)-before;
  s.history.push({from:prev,to:s.head,dir});s.history=s.history.slice(-6);
  s.healed+=Math.max(0,oldMismatch-mismatch(s).length);
  s.event=s.lastDelta<0?'磁键释放能量。原路回溯能逐格修复背景。':s.lastDelta===0?'这一步 ΔE_J = 0。看看空穴旁边哪些键发生了变化。':'电子搬到了空穴原位，没有翻转自旋。';
  if(isTrugman(s)&&!s.loopAwarded){s.loops++;s.score+=60;s.loopAwarded=true;s.event='TRUGMAN +60 · 六步绕圈，斜向迁移并恢复 Néel 背景！';}
 }
 s.maxDistance=Math.max(s.maxDistance,Math.abs(s.head%s.n-s.exit%s.n)+Math.abs(Math.floor(s.head/s.n)-Math.floor(s.exit/s.n)));s.steps++;s.trail.push(s.head);s.trail=s.trail.slice(-28);
 s.relativeEnergy=energy(s.spins,s.n)-s.initialEnergy;s.tension=Math.max(0,s.relativeEnergy);s.peak=Math.max(s.peak,s.tension);s.status='playing';
 const retraced=s.lesson==='retrace'&&s.steps>=6&&s.maxDistance>=3&&s.spins.every((v,i)=>v===s.initialSpins[i]);
 const looped=s.lesson==='loop'&&s.loopAwarded;
 const wallDone=s.lesson==='wall'&&Math.abs(Math.floor(s.head/s.n)-Math.floor(s.exit/s.n))>=4;
 const relayDone=s.lesson==='relay'&&s.collected===s.goal&&s.head===s.exit;
 if(retraced||looped||wallDone||relayDone){s.status='won';s.score+=Math.max(0,200-Math.round(s.peak*10));s.event=s.lesson==='relay'?'全部空穴接力完成，并返回出口。守恒量始终没变！':'实验完成。检查终态能量与守恒量，再进入下一关。';}
 else if(s.steps>=s.maxSteps){s.status='lost';s.event='步数预算用尽。重新布置路线，优先回溯与低能墙边。';}
 return {ok:true,transfer,delta:s.lastDelta,tension:s.tension,status:s.status};
}
function isTrugman(s) {if(s.history.length!==6||s.holes.length!==1||s.map!=='neel')return false;const h=s.history,p=[h[0].from,...h.map(q=>q.to)],a=p[0],z=p[6];return new Set(p).size===4&&p[0]===p[4]&&p[1]===p[5]&&p[2]===p[6]&&Math.abs(a%s.n-z%s.n)===1&&Math.abs(Math.floor(a/s.n)-Math.floor(z/s.n))===1&&mismatch(s).length===0;}
export function setPause(s,paused) {if(s.status==='won'||s.status==='lost')return;s.status=paused?'paused':'playing';}
