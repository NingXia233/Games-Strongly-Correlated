(function(){
  'use strict';
  const Q=window.TJZQuantum,$=id=>document.getElementById(id);
  const model=new Q.Experiment();
  let time=0,playing=false,lastFrame=0,graphBounds={low:-6,high:1};
  const presets={spread:{holes:[2,5],t:1,Jz:2},pair:{holes:[3,4],t:1,Jz:2},edge:{holes:[0,1],t:1,Jz:2},freeze:{holes:[2,5],t:0,Jz:2}};
  const signed=x=>(Math.abs(x)<.00005?0:x).toFixed(4);
  const percent=x=>(100*x).toFixed(1)+'%';
  for(const id of ['hole-a','hole-b']) for(let i=0;i<Q.L;i++){
    const option=document.createElement('option');option.value=i;option.textContent='格 '+(i+1);$(id).append(option);
  }
  const sites=Array.from({length:Q.L},(_,i)=>{
    const cell=document.createElement('div');cell.className='site';
    cell.innerHTML='<div class="well"><div class="fill"></div><span class="percent"></span></div><span class="site-number">'+(i+1)+'</span>';
    $('lattice').append(cell);return cell;
  });
  const rows=Array.from({length:4},()=>{
    const row=document.createElement('div');row.className='configuration';
    row.innerHTML='<span class="config-spins"></span><output></output><div class="probability-track"><span></span></div>';
    $('configurations').append(row);return row;
  });
  function syncPlaying(){ $('play').textContent=playing?'Ⅱ 暂停':'▶ 播放';$('play').setAttribute('aria-pressed',String(playing)); }
  function pause(){playing=false;lastFrame=0;syncPlaying();}
  function drawGraph(){
    const samples=[];
    for(let i=0;i<=100;i++)samples.push(model.at(16*i/100));
    const all=samples.flatMap(s=>[s.energy,s.exchange,s.kinetic,0]);
    let low=Math.min(...all),high=Math.max(...all),pad=Math.max(.35,(high-low)*.13);low-=pad;high+=pad;graphBounds={low,high};
    const x=t=>43+582*t/16,y=e=>151-132*(e-low)/(high-low);
    let svg='';
    for(let i=0;i<=3;i++){
      const e=low+(high-low)*i/3,py=y(e);
      svg+='<line x1="43" x2="625" y1="'+py+'" y2="'+py+'" stroke="#2c3b30" stroke-width="1"/>';
      svg+='<text x="35" y="'+(py+4)+'" fill="#9cab99" text-anchor="end" font-size="10" font-family="monospace">'+e.toFixed(1)+'</text>';
    }
    for(const [field,color] of [['exchange','#74cdda'],['kinetic','#e4bd6d'],['energy','#edf1d8']]){
      const d=samples.map((s,i)=>(i?'L':'M')+x(s.time).toFixed(2)+','+y(s[field]).toFixed(2)).join(' ');
      svg+='<path d="'+d+'" fill="none" stroke="'+color+'" stroke-width="'+(field==='energy'?1.5:2.3)+'"'+(field==='energy'?' stroke-dasharray="5 5"':'')+'/>';
    }
    svg+='<line id="graph-cursor" x1="43" x2="43" y1="15" y2="154" stroke="#9eebba" stroke-width="1" opacity=".8"/>';
    svg+='<text x="43" y="174" fill="#9cab99" font-size="10" font-family="monospace">0</text><text x="625" y="174" text-anchor="end" fill="#9cab99" font-size="10" font-family="monospace">τ = 16</text>';
    $('energy-plot').innerHTML=svg;
  }
  function render(){
    const s=model.at(time);
    $('time').value=time;$('time-value').value=time.toFixed(2);
    sites.forEach((cell,i)=>{cell.querySelector('.fill').style.height=(100*Math.min(1,s.density[i]))+'%';cell.querySelector('.percent').textContent=percent(s.density[i]);});
    $('lattice').setAttribute('aria-label','空穴密度：'+s.density.map((p,i)=>'格'+(i+1)+' '+percent(p)).join('，'));
    $('energy-total').textContent=signed(s.energy);$('energy-j').textContent=signed(s.exchange);$('energy-t').textContent=signed(s.kinetic);
    $('norm').textContent=s.norm.toFixed(6);$('holes').textContent=s.holeNumber.toFixed(6);$('drift').textContent=Math.abs(s.energyError).toExponential(1);
    const cursor=$('graph-cursor');if(cursor){const x=43+582*time/16;cursor.setAttribute('x1',x);cursor.setAttribute('x2',x);}
    const top=s.probabilities.map((p,i)=>({p,i})).sort((a,b)=>b.p-a.p||a.i-b.i).slice(0,4);
    top.forEach(({p,i},rank)=>{
      const row=rows[rank],b=Q.basis[i];row.querySelector('.config-spins').textContent=b.spins.map(x=>x===0?'○':x>0?'↑':'↓').join('');
      row.querySelector('output').textContent=percent(p);row.querySelector('.probability-track span').style.width=(100*p)+'%';
      row.setAttribute('aria-label','空穴在格'+b.holes.map(i=>i+1).join('和')+'，概率'+percent(p));
    });
    $('adjacent').textContent=percent(s.adjacent);
  }
  function resetToControls(message){
    pause();
    try{
      const holes=[Number($('hole-a').value),Number($('hole-b').value)];
      model.reset({holes,t:Number($('hop').value),Jz:Number($('exchange').value)});
      time=0;$('hop-value').value=model.t.toFixed(2);$('exchange-value').value=model.Jz.toFixed(2);
      for(const id of ['hole-a','hole-b']) for(const option of $(id).options) option.disabled=Number(option.value)===Number($(id==='hole-a'?'hole-b':'hole-a').value);
      $('initial-spins').innerHTML=Q.basis[model.start].spins.map(s=>'<b class="'+(s===0?'hole':s<0?'down':'up')+'">'+(s===0?'○':s>0?'↑':'↓')+'</b>').join('');
      drawGraph();render();$('notice').textContent=message||'初态已重新制备，τ = 0。';
    }catch(error){$('notice').textContent='请选择两个不同的空穴位置。';}
  }
  function applyPreset(name){
    const p=presets[name];if(!p)return;
    $('hole-a').value=p.holes[0];$('hole-b').value=p.holes[1];$('hop').value=p.t;$('exchange').value=p.Jz;
    resetToControls(name==='freeze'?'t = 0：预测哪些量会保持不动？':'初态已准备。先预测空穴会向哪里展开。');
  }
  $('preset').addEventListener('change',()=>applyPreset($('preset').value));
  for(const id of ['hole-a','hole-b'])$(id).addEventListener('change',()=>{$('preset').value='custom';resetToControls();});
  for(const id of ['hop','exchange'])$(id).addEventListener('input',()=>{$('preset').value='custom';resetToControls('参数改变：已暂停，并在新 H 下从 τ = 0 重新开始。');});
  $('play').addEventListener('click',()=>{if(playing){pause();return;}if(time>=16){time=0;render();}playing=true;lastFrame=0;syncPlaying();});
  $('step').addEventListener('click',()=>{pause();time=Math.min(16,Math.round((time+.1)*100)/100);render();if(time===16)$('notice').textContent='已到展示区间末端。滑动时间轴回看，或归零。';});
  $('restart').addEventListener('click',()=>{pause();time=0;render();$('notice').textContent='已回到同一个初态，参数保持不变。';});
  $('time').addEventListener('input',()=>{pause();time=Number($('time').value);render();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
  function frame(now){
    if(playing){if(lastFrame){time=Math.min(16,time+Math.min((now-lastFrame)/1000,.1)*Number($('speed').value));render();if(time>=16){pause();$('notice').textContent='已到 τ = 16。这只是展示窗口，演化并未物理停止。';}}lastFrame=now;}
    requestAnimationFrame(frame);
  }
  applyPreset('spread');syncPlaying();requestAnimationFrame(frame);
  // Small read-only QA interface. State is copied, no hidden controls.
  window.quantumLab=Object.freeze({snapshot:()=>({time,playing,t:model.t,Jz:model.Jz,initialHoles:[...model.holes],state:model.at(time)})});
})();
