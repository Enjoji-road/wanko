'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const root=path.join(__dirname,'..'),M=require('../dist/extra-bowl-model.js');let checks=0;
const check=(v,label)=>{assert.ok(v,label);checks++;};
const manifest=require('./last-bowl-protected.json');
for(const [name,hash]of Object.entries(manifest.sha256)) check(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,name))).digest('hex')===hash,'45-question base unchanged: '+name);
check(require('../dist/questions.js').length===45,'Exactly 45 regular questions, extra excluded');
check(M.storageKey==='wanko-extra-bowl-v1','Separate reserved extra record key');
const html=fs.readFileSync(path.join(root,'dist/index.html'),'utf8');
const block=html.match(/<div class="hero-stack"[\s\S]*?<\/div>/)[0];
const bottom=[...block.matchAll(/<span>(.*?)<\/span>/g)].map(m=>m[1]);
check(bottom.join('')==='ふたをとれ','HTML marks read from physical bottom yield request');
check(bottom.slice().reverse().join('')===M.marksTopToBottom.join(''),'HTML and model marks agree');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);check(new Set(ids).size===ids.length,'No duplicate HTML IDs');
check((html.match(/data-empty-bowl=/g)||[]).length===4,'Four inspectable empty bowls');
const capped=fs.readFileSync(path.join(root,'dist/assets/okyuuji.svg'),'utf8'),open=fs.readFileSync(path.join(root,'dist/assets/okyuuji-open.svg'),'utf8');
check(capped.replace(/    <g id="serving-lid"[\s\S]*?    <\/g>\n/,'')===open,'Same server and bowl: only lid is removed');
check(capped.includes('id="serving-lid"'),'Lid exists in the asset used from the start');
check(open.includes('M297 214C304 204'),'Noodles already present beneath the lid');
for(const file of ['extra-bowl-model.js','extra-bowl.js']) new vm.Script(fs.readFileSync(path.join(root,'dist',file),'utf8'),{filename:file});
for(const file of ['tests/last-bowl-fixture.html']) for(const m of fs.readFileSync(path.join(root,file),'utf8').matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) new vm.Script(m[1],{filename:file});
const initial=M.initial();check(initial.phase==='question','New record starts with question');
for(const event of [{type:'EMPTY',index:1},{type:'EMPTY',index:2},{type:'EMPTY',index:3},{type:'EMPTY',index:4},{type:'TAKE_LID'},{type:'LOOK'},{type:'HINT'}])check(M.transition(initial,event)===initial,'Inspection, hints and premature lifting never clear');
// The four empty transitions are identity, so any finite sequence is identity.
// This bounded enumeration confirms the reducer, not human resistance to guessing.
for(let n=0;n<4096;n++){
 let s=initial,k=n;
 for(let i=0;i<6;i++){s=M.transition(s,{type:'EMPTY',index:k%4+1});k=Math.floor(k/4);}
 check(M.transition(s,{type:'TAKE_LID'})===initial,'Six empty choices followed by lid cannot clear');
}
function permute(xs){if(!xs.length)return [''];return xs.flatMap((c,i)=>permute(xs.filter((_,j)=>j!==i)).map(s=>c+s));}
const permutations=permute(M.marksTopToBottom);const accepted=permutations.filter(value=>M.transition(initial,{type:'REQUEST',value}).phase==='ready');
check(permutations.length===120&&accepted.length===1&&accepted[0]==='ふたをとれ','Only one permutation of the five marks is the instruction');
for(const value of ['ふたをとれ','フタヲトレ','蓋を取れ','「ふた を とれ！」','ふたをとる','ふたをとって','蓋を取ってください','ふたをとりたい','ふたをとってほしい','蓋を取って下さい','ふたを取ってくれますか','ふたを取ってもらえますか']){
 const ready=M.transition(initial,{type:'REQUEST',value});check(ready.phase==='ready','Accepted equivalent request: '+value);
 const done=M.transition(ready,{type:'TAKE_LID'});check(done.phase==='revealed','Intentional lid removal reveals the original bowl');
 check(M.transition(done,{type:'TAKE_LID'})===done,'Repeated lifting is idempotent');
 check(M.transition(done,{type:'REQUEST',value:'wrong'})===done,'Later incorrect request does not undo clear');
 check(M.transition(done,{type:'REPLAY'}).phase==='question','Independent replay available');
}
for(const value of ['','れとをたふ','そばをください','ふたをしろ','いただきます','1','2','3','4','とれ','ふた'])check(M.transition(initial,{type:'REQUEST',value})===initial,'No partial-answer or empty-choice shortcut: '+value);
const memory=new Map([['wanko-choice-suddendeath-records-v1','{"version":1,"bests":{"60":7,"90":12}}']]),writes=[];
const store={getItem:k=>memory.get(k)||null,setItem:(k,v)=>{writes.push(k);memory.set(k,v);}};
const normalBefore=store.getItem('wanko-choice-suddendeath-records-v1');
check(!M.readRecord(store).cleared,'Missing extra save is unsolved');
for(const raw of ['{broken','null','[]','{"version":1,"cleared":"true"}','{"version":2,"cleared":true}']){memory.set(M.storageKey,raw);check(!M.readRecord(store).cleared,'Invalid or incompatible extra saves do not unlock');}
check(M.saveClear(store)&&M.saveClear(store),'Clear save may repeat safely');
check(M.readRecord(store).cleared&&M.initial(M.readRecord(store)).phase==='revealed','Reload recalls past extra clear');
check(writes.every(k=>k===M.storageKey)&&store.getItem('wanko-choice-suddendeath-records-v1')===normalBefore,'Never writes the regular record');
check(!M.saveClear(null),'Unavailable save is nonfatal');
check(!M.saveClear({setItem(){throw Error('blocked');}}),'Quota or storage denial is nonfatal');
check(!M.readRecord({getItem(){throw Error('blocked');}}).cleared,'Blocked read is nonfatal');
const controller=fs.readFileSync(path.join(root,'dist/extra-bowl.js'),'utf8');
check(!/wanko-choice-suddendeath-records-v1|setInterval|new M\.Session/.test(controller),'Extra controller owns neither regular record nor countdown');
check(controller.includes("state.phase!=='question'")&&controller.includes('event.isComposing || composing'),'Request submission guards IME composition');
const report={result:'passed',checks,regularQuestions:45,emptySequences:4096,markPermutations:120,acceptedMarkPermutations:accepted.length,protectedFiles:Object.keys(manifest.sha256),scope:'Deterministic extra-only transitions, physical stack order, existing lid and bowl asset, independent save, preserved regular source. Exhaustion of four empty options cannot clear. Guessed correct requests and developer-tools bypass remain possible; human surprise and solve time require first-play tests.'};
fs.writeFileSync(path.join(__dirname,'last-bowl-model-verification.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
