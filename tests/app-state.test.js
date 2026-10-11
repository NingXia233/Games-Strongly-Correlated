// Minimal DOM adapter executes app state/event code. Visual interaction is verified separately.
import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs';
import * as models from '../dist/game-models.js';import {LEVELS} from '../dist/content.js';
function boot(){
 const elements=new Map(),storage=new Map();const ctx=new Proxy({},{get:()=>()=>{}});
 function el(id){if(!elements.has(id))elements.set(id,{id,style:{},dataset:{},classList:{add(){},remove(){}},innerHTML:'',textContent:'',value:'',open:false,addEventListener(){},setAttribute(){},focus(){},scrollIntoView(){},getContext(){return ctx;},querySelector(){return el(id+'-child');},showModal(){this.open=true;},close(){this.open=false;}});return elements.get(id);}
 const ringButtons=Array.from({length:3},(_,i)=>{const b=el('ring-'+i);b.dataset.ring=String(i);return b;});
 const sandbox={...models,LEVELS,console,structuredClone,Blob,URL,Number,Math,setTimeout(){return 1;},clearTimeout(){},confirm(){return true;},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},document:{getElementById:el,querySelectorAll:selector=>selector==='[data-ring]'?ringButtons:[],querySelector:s=>s.startsWith('[data-')?null:el(s),createElement:()=>({click(){}})},window:{matchMedia:()=>({matches:true}),addEventListener(){}},innerWidth:1280,innerHeight:720,devicePixelRatio:1};
 const source=fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');vm.createContext(sandbox);vm.runInContext(source+'\n;globalThis.testApp={getSave:()=>save,act,chooseRoom};',sandbox);return {el,storage,ringButtons,...sandbox.testApp};
}
const solve=[a=>a({type:'spin',index:1}),a=>{a({type:'hole'});for(const [from,to] of [[2,3],[1,2],[0,1]])a({type:'hop',from,to});},a=>{a({type:'bond',index:0});a({type:'bond',index:3});a({type:'bond',index:4});a({type:'bond',index:5});},a=>{for(const [module,count] of [[0,2],[1,3],[2,2]])for(let index=0;index<count;index++)a({type:'keep',module,index});},a=>{a({type:'swap',from:1,to:3});a({type:'swap',from:2,to:3});a({type:'swap',from:3,to:4});},a=>{a({type:'vertex',index:1});a({type:'advance'});a({type:'flux',index:0});a({type:'vertex',index:2});},a=>a({type:'u',value:6}),a=>{for(let index=0;index<3;index++)a({type:'ring',index});}];
test('app completion gate, sequential unlock, reset and undo preserve consistent save',()=>{
 const app=boot();app.chooseRoom(7);assert.equal(app.getSave().current,0);app.el('check').onclick();assert.equal(app.getSave().completed.length,0);
 for(let id=0;id<8;id++){app.chooseRoom(id);assert.equal(app.getSave().current,id);solve[id](app.act);assert.ok(models.evaluate(app.getSave().states[id]).won,`room ${id}`);app.el('check').onclick();assert.equal(app.getSave().completed.length,id+1);assert.ok(models.validateSave(app.getSave()));app.el('check').onclick();assert.equal(app.getSave().completed.length,id+1);app.el('reset-room').onclick();assert.ok(!models.evaluate(app.getSave().states[id]).won);assert.ok(models.validateSave(app.getSave()));app.el('undo').onclick();assert.ok(models.evaluate(app.getSave().states[id]).won);}
 app.el('restart').onclick();assert.equal(app.getSave().current,0);assert.equal(app.getSave().completed.length,0);assert.ok(models.validateSave(app.getSave()));
});
test('app invalid import is transactional; valid import replaces data and clears undo; export round-trip',async()=>{
 const app=boot();solve[0](app.act);app.el('check').onclick();const before=JSON.stringify(app.getSave());const handler=app.el('import').onchange;
 for(const text of ['{','null',JSON.stringify({...models.initialSave(),current:7})]){await handler({target:{files:[{size:text.length,text:async()=>text}],value:'file'}});assert.equal(JSON.stringify(app.getSave()),before);}
 const incoming=models.initialSave();incoming.started=true;incoming.completed=[0,1];incoming.current=2;const text=JSON.stringify(incoming);await handler({target:{files:[{size:text.length,text:async()=>text}],value:'file'}});assert.equal(JSON.stringify(app.getSave()),text);app.el('undo').onclick();assert.equal(JSON.stringify(app.getSave()),text);assert.deepEqual(models.parseSave(app.storage.get('correlated-escape-v1')),incoming);
});

test('room 8 rendered ring controls bind real click handlers and complete the parity puzzle',async()=>{
 const app=boot(),incoming=models.initialSave();incoming.started=true;incoming.completed=[0,1,2,3,4,5,6];incoming.current=7;
 const text=JSON.stringify(incoming);await app.el('import').onchange({target:{files:[{size:text.length,text:async()=>text}],value:'file'}});
 assert.equal(models.evaluate(app.getSave().states[7]).passed,4);
 for(let i=0;i<3;i++){assert.equal(typeof app.ringButtons[i].onclick,'function',`ring ${i} needs a click handler`);app.ringButtons[i].onclick();assert.equal(app.getSave().states[7].data.rings[i],true);}
 assert.equal(models.evaluate(app.getSave().states[7]).passed,8);app.el('check').onclick();assert.equal(app.getSave().completed.length,8);assert.ok(models.validateSave(app.getSave()));
 app.ringButtons[1].onclick();assert.equal(models.evaluate(app.getSave().states[7]).passed,4);assert.equal(app.getSave().completed.length,8);
});
