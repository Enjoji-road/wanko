'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const questions = require('../dist/questions.js');
const M = require('../dist/model.js');
let checks = 0;
function check(value, message) { assert.ok(value,message); checks++; }
function derive(q) {
  switch(q.type) {
    case 'middle': return q.words.map(w=>[...w][Math.floor([...w].length/2)]).join('');
    case 'remove': return q.source.split(q.remove).join('');
    case 'reverse': return [...q.source].reverse().join('');
    case 'unvoice': return q.source.normalize('NFD').replace(/\u3099/g,'').normalize('NFC');
    case 'small': return q.rows.flat().filter(c=>'ぁぃぅぇぉゃゅょっゎ'.includes(c)).map(c=>'あいうえおやゆよつわ'['ぁぃぅぇぉゃゅょっゎ'.indexOf(c)]).join('');
    case 'stroke': return 'くち'; // SVGの上下左右の４辺を描画側で確認。一般的な漢字の同定は数理証明ではない。
    case 'route': {
      let [r,c]=q.start; let out=q.rows[r][c];
      for(const move of q.moves) {r+=({'↓':1,'↑':-1}[move]||0);c+=({'→':1,'←':-1}[move]||0);out+=q.rows[r][c];} return out;
    }
    case 'table': return q.rows.map((row,i)=>row[q.headers.indexOf(q.marks[i])]).join('');
    case 'common': return q.pairs.map(([a,b])=>{const chars=[...new Set([...a].filter(c=>b.includes(c)))];assert.equal(chars.length,1);return chars[0];}).join('');
    case 'stepback': return [...q.source].map(c=>{const row=q.rows.find(r=>r.includes(c));assert.ok(row.indexOf(c)>0);return row[row.indexOf(c)-1];}).join('');
    case 'kanji': assert.deepEqual(q.pieces,['日','生']);return 'ほし';
    case 'overlap': return q.words.reduce((out,next)=>{assert.equal(out.at(-1),next[0]);return out+next.slice(1);});
    case 'everyother': return [...q.source].filter((_,i)=>i%2===0).join('');
    case 'chain': {
      const remaining=q.cards.slice();let card=remaining.find(c=>c.word===q.startWord),out='';
      while(card) {out+=card.word[card.marked];remaining.splice(remaining.indexOf(card),1);const next=remaining.filter(c=>c.word[0]===card.word.at(-1));assert.ok(next.length<=1);card=next[0];}
      assert.equal(remaining.length,0);return out;
    }
    case 'hands': return q.hands.slice().sort((a,b)=>a.length-b.length).map(h=>q.letters[h.index]).join('');
    case 'outside': return q.outside.join('');
    case 'vertical': return q.rows.map(r=>r[1]).join('');
    case 'single': {const chars=q.rows.flat();return chars.filter(c=>chars.filter(v=>v===c).length===1).join('');}
    default: throw new Error('Unverified type: '+q.type);
  }
}
check(questions.length===18,'18 authored puzzles');
check(new Set(questions.map(q=>q.id)).size===questions.length,'Unique IDs');
check(new Set(questions.map(q=>M.normalize(q.answer))).size===questions.length,'No repeated canonical answer');
for(const q of questions) {
  check(M.normalize(derive(q))===M.normalize(q.answer),q.id+': authored data derives the specified answer');
  check([...q.answer].length===q.answerLength,q.id+': answer length label');
  check(M.accepts(q,q.answer),q.id+': canonical accepted');
  const kata=q.answer.replace(/[ぁ-ゖ]/g,c=>String.fromCharCode(c.charCodeAt(0)+0x60));
  check(M.accepts(q,'　'+kata.split('').join(' ')+'　'),q.id+': kana and spacing variants');
  for(const alias of q.aliases||[]) check(M.accepts(q,alias),q.id+': reading alias');
  check(!M.accepts(q,'')&&!M.accepts(q,'ふせいかい'),q.id+': empty and wrong answers rejected');
}
// Exhaust the actual deck repeatedly: no within-round duplicates, and no immediate boundary repeat.
let seed=12;const rng=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
for(const mode of ['balanced','random']) {
  const signatures=new Set();
  for(let run=0;run<300;run++) {
    const d=new M.Deck(questions,mode,rng),round=questions.map(()=>d.draw());
    check(new Set(round.map(q=>q.id)).size===questions.length,mode+': every puzzle once');
    if(mode==='balanced') for(let i=0;i<round.length;i+=3) check(new Set(round.slice(i,i+3).map(q=>q.level)).size===3,'Balanced three-question blocks');
    signatures.add(round.map(q=>q.id).join(','));
    check(d.draw().id!==round.at(-1).id,'No adjacent repeat at reshuffle');
  }
  check(signatures.size>295,'Independent shuffled runs');
}
let now=0;const s=new M.Session(questions,{durationMs:90000,now:()=>now,rng});
check(s.start()&&!s.start(),'Single start');const first=s.current.id;
check(s.submit('no')==='wrong'&&s.current.id===first&&s.score===0,'Wrong answer changes neither puzzle nor score');
check(s.pass()&&s.passed===1&&s.score===0&&s.current.id!==first,'Pass advances without score or time penalty');
now=200;const serial=s.serial;check(s.submit(s.current.answer)==='correct'&&s.score===1,'Correct advances and scores');
check(s.submit(s.current.answer,serial)==='inactive'&&s.score===1,'Stale submission cannot score');
now=89999;check(s.remaining()===1,'Clock runs through serving');
now=90000;check(s.submit(s.current.answer)==='inactive'&&s.score===1&&s.phase==='finished','Exact deadline rejects input');
check(!s.pass()&&!s.finish()&&s.score===1,'Finished state is immutable');
now=0;const lid=new M.Session(questions,{durationMs:1000,now:()=>now});lid.start();lid.finish('lid');now=500;check(lid.phase==='finished'&&lid.submit(lid.current.answer)==='inactive','Lid ends the run');
const memory=new Map();const store={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};
memory.set('test','{broken');check(Object.keys(M.readRecords(store,'test').bests).length===0,'Corrupt save recovers');
check(M.saveBest(store,'test',90,8).isNew,'New best saved');
check(M.saveBest(store,'test',90,3).best===8,'Lower retry keeps best');
check(M.saveBest(store,'test',60,2).best===2,'Duration-specific records');
check(M.readRecords(store,'test').bests['90']===8,'Reload preserves best');
check(M.saveBest({getItem(){throw Error();},setItem(){throw Error();}},'test',90,4).saved===false,'Storage failure is nonfatal');
const intent=new URL(M.shareUrl('https://example.com/test/','🥢 {seconds}秒で{score}杯！\nおかわり？',90,12));
check(intent.origin==='https://twitter.com'&&intent.pathname==='/intent/tweet','Official X intent');
check(intent.searchParams.get('text')==='🥢 90秒で12杯！\nおかわり？','Japanese, emoji, newline and record encoded');
check(intent.searchParams.get('url')==='https://example.com/test/','Configured URL preserved');
check(M.shareUrl('','{score}',90,0)===null&&M.shareUrl('javascript:alert(1)','{score}',90,0)===null,'Unconfigured and unsafe links never shared');
const report={result:'passed',checks,puzzles:questions.length,shuffle_runs:600,model_deadline_ms:90000,scope:'Deterministic authored transformations, queue invariants, deadline, stale input, record recovery. Visual kanji recognition, alternative unrestricted language rules, and human enjoyment require human testing.'};
fs.writeFileSync(path.join(__dirname,'model-verification.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
