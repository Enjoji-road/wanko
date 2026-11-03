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
check(bottom.join('')==='てのなかに','HTML marks read from physical bottom identify the location');
check(bottom.slice().reverse().join('')===M.marksTopToBottom.join(''),'HTML and model marks agree');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);check(new Set(ids).size===ids.length,'No duplicate HTML IDs');
check((html.match(/data-empty-bowl=/g)||[]).length===4,'Four inspectable empty bowls');
check(/id="serverBowlTarget"[\s\S]*?aria-label="お給仕さんが手に持つお椀を調べる"/.test(html),'The original scene has an accessible hand-bowl target');
check(/<button id="takeLid"[\s\S]*?aria-label="蓋付きのお椀。蓋を取る"/.test(html),'The enlarged bowl is a keyboard-operable lid control');
check(!/requestInput|requestForm|お願いを入力/.test(html),'No text-answer interface remains');
const capped=fs.readFileSync(path.join(root,'dist/assets/okyuuji.svg'),'utf8'),open=fs.readFileSync(path.join(root,'dist/assets/okyuuji-open.svg'),'utf8');
check(capped.replace(/    <g id="serving-lid"[\s\S]*?    <\/g>\n/,'')===open,'Same server and bowl: only lid is removed');
check(capped.includes('id="serving-lid"'),'Lid exists in the asset used from the start');
check(open.includes('M297 214C304 204'),'Noodles already present beneath the lid');
for(const file of ['extra-bowl-model.js','extra-bowl.js']) new vm.Script(fs.readFileSync(path.join(root,'dist',file),'utf8'),{filename:file});
for(const file of ['tests/last-bowl-fixture.html']) for(const m of fs.readFileSync(path.join(root,file),'utf8').matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) new vm.Script(m[1],{filename:file});
const initial=M.initial();check(initial.phase==='question','New record starts with question');
for(const event of [{type:'EMPTY',index:1},{type:'EMPTY',index:2},{type:'EMPTY',index:3},{type:'EMPTY',index:4},{type:'LOOK'},{type:'HINT'}])check(M.transition(initial,event)===initial,'Empty choices, inspection and hints never clear');
// The four empty transitions are identity, so any finite sequence is identity.
// This bounded enumeration confirms the reducer, not human resistance to tapping the scene.
for(let n=0;n<4096;n++){
 let s=initial,k=n;
 for(let i=0;i<6;i++){s=M.transition(s,{type:'EMPTY',index:k%4+1});k=Math.floor(k/4);}
 check(s===initial,'Six empty choices cannot clear');
}
function permute(xs){if(!xs.length)return [''];return xs.flatMap((c,i)=>permute(xs.filter((_,j)=>j!==i)).map(s=>c+s));}
const permutations=permute(M.marksTopToBottom);
check(permutations.length===120&&permutations.filter(value=>value==='てのなかに').length===1,'One physical bottom-up order gives the location phrase');
const done=M.transition(initial,{type:'TAKE_LID'});
check(done.phase==='revealed','Direct lid removal reveals the original bowl');
check(M.transition(done,{type:'TAKE_LID'})===done,'Repeated lifting is idempotent');
check(M.transition(done,{type:'REPLAY'}).phase==='question','Independent replay available');
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
check(!/requestInput|requestForm|composition(start|end)|REQUEST/.test(controller),'No text-input answer logic remains');
check(controller.includes("$('serverBowlTarget').addEventListener('click',openHand)")&&controller.includes("$('takeLid').addEventListener('click'"),'Scene target and enlarged lid are the direct controls');
const report={result:'passed',checks,regularQuestions:45,emptySequences:4096,markPermutations:120,protectedFiles:Object.keys(manifest.sha256),scope:'Deterministic extra-only transitions, physical stack order, direct scene and lid controls, existing lid and bowl asset, independent save, preserved regular source. Empty choices cannot clear; intentional direct lid operation can. Human surprise and accidental-tap likelihood require first-play tests.'};
fs.writeFileSync(path.join(__dirname,'last-bowl-model-verification.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
