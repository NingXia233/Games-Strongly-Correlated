// Controller/DOM-serialization privacy tests; does not replace browser visual QA.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import * as model from '../dist/toric-model.js';
import * as ai from '../dist/toric-ai.js';
function boot(){
 const elements=new Map(),timers=[];
 const el=id=>{if(!elements.has(id)){const handlers={};elements.set(id,{id,style:{},dataset:{},classList:{toggle(){},add(){},remove(){}},innerHTML:'',textContent:'',value:'standard',hidden:false,disabled:false,parentElement:{hidden:false},addEventListener(k,fn){handlers[k]=fn;},trigger(k){handlers[k]?.();},querySelectorAll(){return [];},querySelector(){return null;},focus(){},showModal(){this.open=true;},close(){this.open=false;},setAttribute(){}});}return elements.get(id);};
 const sandbox={...model,...ai,console,Math,Number,Set,Map,Promise,setTimeout(fn){timers.push(fn);},confirm:()=>true,document:{getElementById:el,querySelectorAll:()=>[]}};
 const source=fs.readFileSync(new URL('../dist/toric-ui.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');vm.createContext(sandbox);vm.runInContext(source+'\nglobalThis.review={fresh,clickEdge,render,game:()=>game,setTool:t=>{tool=t;},curtain:()=>curtain,history:()=>history};',sandbox);return {...sandbox.review,el,timers};
}
test('review UI: hotseat commit replaces secret SVG/ARIA and budget DOM before handoff opens',()=>{
 const app=boot();app.fresh('local');app.clickEdge('h:1:1');
 assert.match(app.el('game-board').innerHTML,/已选 Z/);assert.match(app.el('resources').innerHTML,/秘密错误用量/);
 app.el('main-action').onclick();assert.equal(app.curtain(),true);assert.equal(app.game().phase,'play');
 assert.doesNotMatch(app.el('game-board').innerHTML,/已选 [XZ]|active-[xz]/);assert.doesNotMatch(app.el('resources').innerHTML,/秘密错误用量|每种最多/);assert.equal(app.history().length,0);assert.equal(app.el('main-action').disabled,true);
 app.el('take-seat').trigger('click');assert.equal(app.curtain(),false);assert.doesNotMatch(app.el('game-board').innerHTML,/已选 [XZ]|active-[xz]/);
});
test('review UI: ordinary incomplete recovery cannot be committed and removing all endpoints does not promise success',()=>{
 const app=boot();app.fresh('local');app.clickEdge('h:1:1');app.el('main-action').onclick();app.el('take-seat').trigger('click');
 assert.equal(app.el('main-action').disabled,true);app.clickEdge('h:1:1');assert.equal(app.el('main-action').disabled,false);assert.match(app.el('main-action').textContent,/揭晓/);assert.doesNotMatch(app.el('main-action').textContent,/成功|胜利/);
});
test('review UI: probe history survives subsequent correction undo without refund or reverting information',()=>{
 const app=boot();app.fresh('local');app.clickEdge('h:1:1');app.el('main-action').onclick();app.el('take-seat').trigger('click');app.setTool('probe');app.clickEdge('h:1:1');assert.equal(app.game().probes.length,1);app.setTool('Z');app.clickEdge('h:1:1');app.el('undo').onclick();assert.equal(app.game().probes.length,1);assert.equal(app.game().correction.Z.length,0);assert.equal(model.publicView(app.game()).probesRemaining,0);
});

test('review UI: switching tables cancels a pending AI turn rather than mutating the new game',async()=>{
 const app=boot();app.fresh('attacker');app.clickEdge('h:1:1');app.el('main-action').onclick();assert.equal(app.timers.length,1);app.fresh('defender');const before=JSON.stringify(app.game());app.timers.shift()();await Promise.resolve();await Promise.resolve();assert.equal(JSON.stringify(app.game()),before);assert.equal(app.game().phase,'play');
});
