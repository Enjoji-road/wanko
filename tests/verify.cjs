'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const questions = require('../dist/questions.js');
const M = require('../dist/model.js');
const configScope={window:{}};
require('node:vm').runInNewContext(fs.readFileSync(path.join(__dirname,'../dist/config.js'),'utf8'),configScope);
const seconds=configScope.window.WankoConfig.durationSeconds, durationMs=seconds*1000;
let checks = 0;
function check(value, message) { assert.ok(value,message); checks++; }
check(seconds===60,'The actual game configuration uses 60 seconds');
check(configScope.window.WankoConfig.storageKey==='wanko-choice-suddendeath-records-v1','The existing best-record key is retained');
check(new M.Session(questions).durationMs===durationMs,'Default session agrees with the game configuration');
function overlap(a,b) {
  const [x,y,u,v]=a,dx=u-x,dy=v-y,[p,q,r,s]=b,cross=(a,b,c,d)=>a*d-b*c;
  if(cross(dx,dy,r-p,s-q)!==0||cross(dx,dy,p-x,q-y)!==0)return null;
  const length=dx*dx+dy*dy,t0=((p-x)*dx+(q-y)*dy)/length,t1=((r-x)*dx+(s-y)*dy)/length;
  const lo=Math.max(0,Math.min(t0,t1)),hi=Math.min(1,Math.max(t0,t1));
  if(hi<=lo)return null;
  return [x+lo*dx,y+lo*dy,x+hi*dx,y+hi*dy];
}
function foldedFaces(rows) {
  const cells=rows.flatMap((row,r)=>row.flatMap((mark,c)=>mark?[{mark,at:[r,c]}]:[]));
  assert.equal(cells.length,6);const neg=v=>v.map(n=>-n),key=at=>at.join(',');
  const first=cells[0],poses=new Map([[key(first.at),{n:[0,0,1],u:[0,1,0],r:[1,0,0]}]]),queue=[first];
  while(queue.length) {
    const cell=queue.shift(),p=poses.get(key(cell.at)),[r,c]=cell.at;
    const neighbors=[[[r,c+1],{n:p.r,r:neg(p.n),u:p.u}],[[r,c-1],{n:neg(p.r),r:p.n,u:p.u}],[[r-1,c],{n:p.u,r:p.r,u:neg(p.n)}],[[r+1,c],{n:neg(p.u),r:p.r,u:p.n}]];
    for(const [at,pose] of neighbors) {
      const next=cells.find(cell=>key(cell.at)===key(at));if(!next)continue;
      if(poses.has(key(at)))assert.deepEqual(poses.get(key(at)),pose);
      else{poses.set(key(at),pose);queue.push(next);}
    }
  }
  assert.equal(poses.size,6);assert.equal(new Set([...poses.values()].map(p=>p.n.join(','))).size,6);
  return cells.map(cell=>({...cell,normal:poses.get(key(cell.at)).n}));
}
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
    case 'kanji': {
      // Elementary glyph recognition is reviewed by a human, not proved by this lookup.
      const glyphs={'column:日生':'ほし','row:日月':'明'};
      const key=(q.orientation||'column')+':'+q.pieces.join('');
      assert.ok(Object.hasOwn(glyphs,key));return glyphs[key];
    }
    case 'overlap': return q.words.reduce((out,next)=>{assert.equal(out.at(-1),next[0]);return out+next.slice(1);});
    case 'everyother': return [...q.source].filter((_,i)=>i%2===0).join('');
    case 'chain': {
      const remaining=q.cards.slice();let card=remaining.find(c=>c.word===q.startWord),out='';
      while(card) {out+=card.word[card.marked];remaining.splice(remaining.indexOf(card),1);const next=remaining.filter(c=>c.word[0]===card.word.at(-1));assert.ok(next.length<=1);card=next[0];}
      assert.equal(remaining.length,0);return out;
    }
    case 'hands': {
      assert.equal(new Set(q.hands.map(h=>h.length)).size,q.hands.length);
      assert.equal(new Set(q.hands.map(h=>h.index)).size,q.hands.length);
      return q.hands.slice().sort((a,b)=>a.length-b.length).map(h=>q.letters[h.index]).join('');
    }
    case 'outside': return q.outside.join('');
    case 'vertical': return q.rows.map(r=>r[1]).join('');
    case 'single': {const chars=q.rows.flat();return chars.filter(c=>chars.filter(v=>v===c).length===1).join('');}
    case 'ends': return [...q.source][0]+[...q.source].at(-1);
    case 'pairs': {
      const chars=[...q.source];assert.equal(chars.length%2,0);
      return chars.filter((c,i)=>{if(i%2===0)assert.equal(c,chars[i+1]);return i%2===0;}).join('');
    }
    case 'sizes': {
      assert.equal(new Set(q.letters.map(s=>s.size)).size,q.letters.length);
      return [...q.letters].sort((a,b)=>b.size-a.size).map(s=>s.text).join('');
    }
    case 'voice': {
      const plain='かきくけこさしすせそたちつてとはひふへほう',voiced='がぎぐげござじずぜぞだぢづでどばびぶべぼゔ';
      return [...q.source].map(c=>plain.includes(c)?voiced[plain.indexOf(c)]:c).join('');
    }
    case 'mirror': {
      const width=q.rows[0].length;assert.equal(width%2,0);
      assert.ok(q.rows.every(row=>row.length===width));
      assert.deepEqual(q.marks.map(([r])=>r),q.rows.map((_,r)=>r));
      return q.marks.map(([r,c])=>q.rows[r][width-1-c]).join('');
    }
    case 'shapes': {
      const corners={circle:0,triangle:3,square:4};
      assert.equal(new Set(q.shapes.map(s=>corners[s.shape])).size,q.shapes.length);
      return [...q.shapes].sort((a,b)=>corners[b.shape]-corners[a.shape]).map(s=>s.letter).join('');
    }
    case 'weave': {
      const[a,b]=q.words.map(w=>[...w]);assert.equal(a.length,b.length);
      return a.map((c,i)=>c+b[i]).join('');
    }
    case 'shared_blank': {
      // The clue-to-word meanings are human-reviewed; check every choice against those words.
      const candidates=q.choices.filter(c=>q.entries.every(e=>e.template.replace('□',c)===e.word));
      assert.equal(candidates.length,1);return candidates[0];
    }
    case 'corners': {
      const lastR=q.rows.length-1,lastC=q.rows[0].length-1;
      assert.deepEqual(q.start,[0,0]);
      return [[0,0],[0,lastC],[lastR,lastC],[lastR,0]].map(([r,c])=>q.rows[r][c]).join('');
    }
    case 'agree': return q.pairs.map(([a,b])=>{
      const matching=[...a].filter((c,i)=>c===[...b][i]);assert.equal(matching.length,1);return matching[0];
    }).join('');
    case 'swap': {
      assert.equal(new Set(q.marks).size,2);const chars=[...q.source],[a,b]=q.marks;
      assert.ok(chars[a]&&chars[b]);[chars[a],chars[b]]=[chars[b],chars[a]];return chars.join('');
    }
    case 'missing_link': {
      const candidates=q.choices.filter(c=>c[0]===q.before.at(-1)&&c.at(-1)===q.after[0]);
      assert.equal(candidates.length,1);return candidates[0];
    }
    case 'mask': {
      assert.equal(new Set(q.holes.map(p=>p.join(','))).size,q.holes.length);
      assert.ok(q.holes.every(([r,c])=>q.rows[r]?.[c]));
      return [...q.holes].sort(([r,c],[s,d])=>r-s||c-d).map(([r,c])=>q.rows[r][c]).join('');
    }
    case 'shared_lines': {
      const intersections=q.diagrams[0].segments.flatMap(a=>q.diagrams[1].segments.map(b=>overlap(a,b))).filter(Boolean);
      assert.equal(intersections.length,2);
      assert.ok(intersections.some(([x,y,u,v])=>y===50&&v===50&&Math.min(x,u)<50&&Math.max(x,u)>50));
      assert.ok(intersections.some(([x,y,u,v])=>x===50&&u===50&&Math.min(y,v)<50&&Math.max(y,v)>50));
      return '＋';
    }
    case 'ladder': {
      let at=q.startColumn;
      assert.deepEqual(new Set(q.labels),new Set(q.choices));
      for(const [a,b] of q.rails){assert.equal(b-a,1);assert.ok(a>=0&&b<q.labels.length);if(at===a)at=b;else if(at===b)at=a;}
      return q.labels[at];
    }
    case 'cube_net': {
      const faces=foldedFaces(q.rows),source=faces.find(f=>f.mark===q.target);
      const opposites=faces.filter(f=>f.normal.every((n,i)=>n===-source.normal[i]));
      assert.equal(opposites.length,1);return opposites[0].mark;
    }
    case 'plate_turn': {
      assert.equal(q.symbols.length,4);assert.equal(new Set(q.symbols).size,4);
      assert.ok(Number.isInteger(q.quarterTurns)&&q.quarterTurns>0&&q.quarterTurns<4);
      return q.symbols[(q.targetIndex-q.quarterTurns+4)%4];
    }
    case 'missing_corner': {
      const {left:l,top:t,right:r,bottom:b}=q.frame;
      assert.ok(q.segments.every(([x,y,u,v])=>(x===u&&(x===l||x===r))||(y===v&&(y===t||y===b))));
      const covered=([x,y])=>q.segments.some(([a,c,d,e])=>a===d?x===a&&y>=Math.min(c,e)&&y<=Math.max(c,e):y===c&&x>=Math.min(a,d)&&x<=Math.max(a,d));
      const corners=[['┌',[l,t]],['┐',[r,t]],['└',[l,b]],['┘',[r,b]]];
      const absent=corners.filter(([,p])=>!covered(p));assert.equal(absent.length,1);return absent[0][0];
    }
    case 'regions': {
      const circle=p=>Math.hypot(p.x-q.circle.x,p.y-q.circle.y)<q.circle.r;
      const square=p=>p.x>q.square.x&&p.x<q.square.x+q.square.width&&p.y>q.square.y&&p.y<q.square.y+q.square.height;
      assert.equal(new Set(q.labels.map(p=>circle(p)+','+square(p))).size,4);
      const matching=q.labels.filter(p=>circle(p)&&!square(p));assert.equal(matching.length,1);return matching[0].text;
    }
    case 'front_card': {
      const inside=(c,x,y)=>x>c.x&&x<c.x+c.width&&y>c.y&&y<c.y+c.height;
      assert.equal(new Set(q.cards.map(c=>c.z)).size,q.cards.length);
      const visible=q.cards.filter(c=>{
        const perimeter=[];for(let k=0;k<=20;k++){const a=k/20;perimeter.push([c.x+a*c.width,c.y],[c.x+a*c.width,c.y+c.height],[c.x,c.y+a*c.height],[c.x+c.width,c.y+a*c.height]);}
        return perimeter.every(([x,y])=>!q.cards.some(other=>other.z>c.z&&inside(other,x,y)));
      });
      assert.equal(visible.length,1);
      for(const c of q.cards)assert.ok(!q.cards.some(other=>other.z>c.z&&inside(other,c.textX,c.textY)),'Every label remains visible');
      return visible[0].label;
    }
    case 'fold_holes': {
      assert.equal(q.columns%2,0);assert.equal(q.punched.length,2);
      assert.ok(q.punched.every(([r,c])=>r>=0&&r<q.rows&&c>=q.columns/2&&c<q.columns));
      const key=holes=>holes.map(p=>p.join(',')).sort().join(';');
      const unfolded=q.punched.flatMap(([r,c])=>[[r,c],[r,q.columns-1-c]]);
      for(const p of q.patterns){assert.equal(p.holes.length,4);assert.equal(new Set(p.holes.map(p=>p.join(','))).size,4);assert.equal(key(p.holes),key(p.holes.map(([r,c])=>[r,q.columns-1-c])));}
      const matching=q.patterns.filter(p=>key(p.holes)===key(unfolded));assert.equal(matching.length,1);return matching[0].label;
    }
    case 'negative_space': {
      // The Japanese names of these simple stroke shapes are human-reviewed.
      const glyphs={'コ':[[1,1,1,5],[1,5,5,5],[5,1,5,5]],'ロ':[[1,1,1,5],[1,5,5,5],[5,1,5,5],[1,1,5,1]],'エ':[[1,1,1,5],[1,3,5,3],[5,1,5,5]],'ニ':[[1,1,1,5],[5,1,5,5]]};
      const white=q.rows.flatMap((row,r)=>[...row].flatMap((c,col)=>c==='0'?[r+','+col]:[])).sort().join(';');
      const matching=q.choices.filter(ch=>{
        const pixels=new Set();for(const[r,c,s,d]of glyphs[ch])for(let y=Math.min(r,s);y<=Math.max(r,s);y++)for(let x=Math.min(c,d);x<=Math.max(c,d);x++)pixels.add(y+','+x);
        return [...pixels].sort().join(';')===white;
      });assert.equal(matching.length,1);return matching[0];
    }
    case 'braid': {
      let column=q.startColumn;
      for(const[a,b]of q.crossings){assert.equal(b-a,1);assert.ok(a>=0&&b<q.labels.length);column=column===a?b:column===b?a:column;}
      return q.labels[column];
    }
    case 'join_marks': {
      const marks=[...new Set(q.points.map(p=>p.mark))];assert.equal(marks.length,3);
      const lines=marks.map(mark=>{const pair=q.points.filter(p=>p.mark===mark);assert.equal(pair.length,2);return pair.map(p=>[p.x,p.y]);});
      const xs=q.points.map(p=>p.x),ys=q.points.map(p=>p.y),l=Math.min(...xs),r=Math.max(...xs),t=Math.min(...ys),b=Math.max(...ys),m=(l+r)/2;
      const key=segments=>segments.map(line=>line.map(p=>p.join(',')).sort().join(':')).sort().join(';');
      const glyphs={'エ':[[[l,t],[r,t]],[[m,t],[m,b]],[[l,b],[r,b]]],'コ':[[[l,t],[r,t]],[[r,t],[r,b]],[[l,b],[r,b]]],'ニ':[[[l,t],[r,t]],[[l,b],[r,b]]],'キ':[[[l,t+(b-t)/3],[r,t+(b-t)/3]],[[l,t+2*(b-t)/3],[r,t+2*(b-t)/3]],[[m-15,t],[m+15,b]]]};
      const matching=q.choices.filter(ch=>key(glyphs[ch])===key(lines));assert.equal(matching.length,1);return matching[0];
    }
    case 'same_piece': {
      const normal=cells=>{const minX=Math.min(...cells.map(p=>p[0])),minY=Math.min(...cells.map(p=>p[1]));return cells.map(([x,y])=>[x-minX,y-minY].join(',')).sort().join(';');};
      const rotations=cells=>{const poses=[];let p=cells;for(let i=0;i<4;i++){poses.push(normal(p));p=p.map(([x,y])=>[-y,x]);}return poses;};
      const target=rotations(q.target);
      for(const p of q.pieces){assert.equal(p.cells.length,5);assert.equal(new Set(p.cells.map(p=>p.join(','))).size,5);assert.equal(Math.max(...p.cells.map(p=>p[0]))-Math.min(...p.cells.map(p=>p[0])),2);assert.equal(Math.max(...p.cells.map(p=>p[1]))-Math.min(...p.cells.map(p=>p[1])),2);}
      const matching=q.pieces.filter(p=>target.includes(normal(p.cells)));assert.equal(matching.length,1);
      const mirror=normal(q.target.map(([x,y])=>[-x,y]));assert.ok(!target.includes(mirror),'A reflection is not a permitted rotation');
      assert.ok(q.pieces.some(p=>rotations(p.cells).includes(mirror)),'A reflected distractor is actually included');
      return matching[0].label;
    }
    default: throw new Error('Unverified type: '+q.type);
  }
}
check(questions.length===45,'45 authored puzzles');
for(const level of [1,2,3]) check(questions.some(q=>q.level===level),'Each estimated difficulty is represented');
check(new Set(questions.map(q=>q.id)).size===questions.length,'Unique IDs');
check(new Set(questions.map(q=>M.normalize(q.answer))).size===questions.length,'No repeated canonical answer');
for(const q of questions) {
  check(M.normalize(derive(q))===M.normalize(q.answer),q.id+': authored data derives the specified answer');
  check([...q.answer].length===q.answerLength,q.id+': canonical answer length');
  check(M.accepts(q,q.answer),q.id+': canonical accepted');
  const kata=q.answer.replace(/[ぁ-ゖ]/g,c=>String.fromCharCode(c.charCodeAt(0)+0x60));
  check(M.accepts(q,'　'+kata.split('').join(' ')+'　'),q.id+': kana and spacing variants');
  for(const alias of q.aliases||[]) check(M.accepts(q,alias),q.id+': reading alias');
  check(!M.accepts(q,'')&&!M.accepts(q,'ふせいかい'),q.id+': empty and wrong answers rejected');
  const choices=M.choicesFor(q,()=>.5);
  check(choices.length===4&&new Set(choices.map(M.normalize)).size===4,q.id+': four distinct choices');
  check(choices.filter(c=>M.accepts(q,c)).length===1,q.id+': exactly one choice matches the derived answer');
  for(const label of q.choices) {
    const run=new M.Session([q],{durationMs,now:()=>0}); run.start();
    const index=run.choices.indexOf(label),result=run.choose(index);
    if(M.accepts(q,label)) check(result==='correct'&&run.phase==='playing'&&run.score===1,q.id+': correct choice serves the next bowl');
    else {
      check(result==='wrong'&&run.phase==='finished'&&run.reason==='wrong'&&run.score===0,q.id+': wrong choice ends immediately without a point');
      check(run.choose(0)==='inactive'&&!run.pass(),q.id+': input after the wrong choice cannot revive or score');
    }
  }
}
// Exhaust the actual deck repeatedly: no within-round duplicates, and no immediate boundary repeat.
let seed=12;const rng=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
for(const mode of ['balanced','random']) {
  const signatures=new Set();
  for(let run=0;run<300;run++) {
    const d=new M.Deck(questions,mode,rng),round=questions.map(()=>d.draw());
    check(new Set(round.map(q=>q.id)).size===questions.length,mode+': every puzzle once');
    if(mode==='balanced') for(const level of [1,2,3]) {
      const weight=questions.filter(q=>q.level===level).length/questions.length;
      for(let end=1;end<=round.length;end++) check(Math.abs(round.slice(0,end).filter(q=>q.level===level).length-end*weight)<3,'Unequal difficulties remain distributed across the round');
    }
    signatures.add(round.map(q=>q.id).join(','));
    check(d.draw().id!==round.at(-1).id,'No adjacent repeat at reshuffle');
  }
  check(signatures.size>295,'Independent shuffled runs');
}
const equalGroups=[1,2,3].flatMap(level=>questions.filter(q=>q.level===level).slice(0,5));
for(let run=0;run<100;run++) {
  const d=new M.Deck(equalGroups,'balanced',rng),round=equalGroups.map(()=>d.draw());
  for(let i=0;i<round.length;i+=3)check(new Set(round.slice(i,i+3).map(q=>q.level)).size===3,'Equal group sizes retain three-question blocks');
}
// Regression: a scarce hard group must not disappear from the whole second half.
const legacyOrder=[];const groups=[1,2,3].map(level=>questions.filter(q=>q.level===level).slice());
while(groups.some(g=>g.length))legacyOrder.push(...groups.filter(g=>g.length).map(g=>g.shift()));
const halfway=Math.floor(questions.length/2);
check(!legacyOrder.slice(halfway).some(q=>q.level===3),'The old draining schedule demonstrates the uneven-count tail problem');
for(let run=0;run<100;run++) {
  const d=new M.Deck(questions,'balanced',rng),round=questions.map(()=>d.draw());
  check(round.slice(halfway).some(q=>q.level===3)&&round.slice(0,halfway).some(q=>q.level===3),'Hard puzzles are present in both halves of the round');
}
for(const id of ['sizes','corners_shapes']) {
  const q=questions.find(q=>q.id===id),letters=id==='sizes'?q.letters.map(s=>s.text):q.shapes.map(s=>s.letter);
  const bag=letters.slice().sort().join('');
  check(q.choices.every(c=>[...c].sort().join('')===bag),id+': every choice uses the same letters, so order is necessary');
}
const missing=questions.find(q=>q.id==='missing_camel');
check(missing.choices.filter(c=>c[0]===missing.before.at(-1)).length===2&&missing.choices.filter(c=>c.at(-1)===missing.after[0]).length===2,'Both ends of the missing-link clue eliminate candidates');
const alternate=questions.find(q=>q.id==='everyother');
check(alternate.choices.includes([...alternate.source].filter((_,i)=>i%2===1).join('')),'The alternate starting position yields a plausible distractor');
const viewScope={window:{}};require('node:vm').runInNewContext(fs.readFileSync(path.join(__dirname,'../dist/puzzle-view.js'),'utf8'),viewScope);
for(const q of questions)check(!viewScope.window.WankoPuzzleView.render(q).endsWith(`type-${q.type}\"></div>`),q.id+': renderer supplies an actual diagram');
const clockMarkup=viewScope.window.WankoPuzzleView.render(questions.find(q=>q.id==='hands'));
check((clockMarkup.match(/data-guide=/g)||[]).length===6&&(clockMarkup.match(/data-hand=/g)||[]).length===3,'Clock has neutral guides for all six directions and exactly three needles');
let now=0;const s=new M.Session(questions,{durationMs,now:()=>now,rng});
check(s.start()&&!s.start(),'Single start');const first=s.current.id;
check(s.choose(-1)==='invalid'&&s.choose(4)==='invalid'&&s.choose('0')==='invalid'&&s.score===0&&s.phase==='playing','Invalid indices are not user choices');
check(s.pass()&&s.passed===1&&s.score===0&&s.current.id!==first,'Pass advances without score or time penalty');
const correctIndex=run=>run.choices.findIndex(c=>M.accepts(run.current,c));
now=200;const serial=s.serial;check(s.choose(correctIndex(s))==='correct'&&s.score===1,'Correct advances and scores');
check(s.choose(correctIndex(s),serial)==='inactive'&&s.score===1&&s.phase==='playing','Stale button cannot score or cause a loss');
now=durationMs-1;check(s.remaining()===1,'Clock runs through serving');
now=durationMs;check(s.choose(correctIndex(s))==='inactive'&&s.score===1&&s.phase==='finished','Exact deadline rejects input');
check(!s.pass()&&!s.finish()&&s.score===1,'Finished state is immutable');
now=0;const lid=new M.Session(questions,{durationMs:1000,now:()=>now});lid.start();lid.finish('lid');now=500;check(lid.phase==='finished'&&lid.choose(0)==='inactive','Lid ends the run');
now=0;const loss=new M.Session(questions,{now:()=>now});loss.start();loss.choose(correctIndex(loss));
check(loss.choose(loss.choices.findIndex(c=>!M.accepts(loss.current,c)))==='wrong'&&loss.score===1&&loss.reason==='wrong','A wrong choice preserves previously completed bowls');
const positions=[0,0,0,0];for(let i=0;i<600;i++){const q=questions[i%questions.length];positions[M.choicesFor(q,rng).findIndex(c=>M.accepts(q,c))]++;}
check(positions.every(n=>n>90&&n<210),'All four answer positions are used in the seeded shuffle sample');
const memory=new Map();const store={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};
memory.set('test','{broken');check(Object.keys(M.readRecords(store,'test').bests).length===0,'Corrupt save recovers');
check(M.saveBest(store,'test',90,8).isNew,'New best saved');
check(M.saveBest(store,'test',90,3).best===8,'Lower retry keeps best');
check(M.saveBest(store,'test',60,2).best===2,'Duration-specific records');
check(M.readRecords(store,'test').bests['90']===8,'Reload preserves best');
memory.set('wanko-local-records-v1',JSON.stringify({version:1,bests:{90:23}}));
M.saveBest(store,'wanko-choice-suddendeath-records-v1',90,4);
check(M.readRecords(store,'wanko-local-records-v1').bests['90']===23&&M.readRecords(store,'wanko-choice-suddendeath-records-v1').bests['90']===4,'Input-mode records are retained, four-choice records are separate');
check(M.saveBest({getItem(){throw Error();},setItem(){throw Error();}},'test',90,4).saved===false,'Storage failure is nonfatal');
const intent=new URL(M.shareUrl('https://example.com/test/','🥢 {seconds}秒で{score}杯！\nおかわり？',seconds,12));
check(intent.origin==='https://twitter.com'&&intent.pathname==='/intent/tweet','Official X intent');
check(intent.searchParams.get('text')==='🥢 60秒で12杯！\nおかわり？','Japanese, emoji, newline and record encoded');
check(intent.searchParams.get('url')==='https://example.com/test/','Configured URL preserved');
check(M.shareUrl('','{score}',90,0)===null&&M.shareUrl('javascript:alert(1)','{score}',90,0)===null,'Unconfigured and unsafe links never shared');
const report={result:'passed',checks,puzzles:questions.length,difficulty_counts:Object.fromEntries([1,2,3].map(level=>[level,questions.filter(q=>q.level===level).length])),shuffle_runs:600,choice_states:questions.length*4,answer_positions:positions,model_deadline_ms:durationMs,scope:'Authored transformations including segment intersections, ladder connections, cube folding, plate rotation, missing corners, region membership, occlusion, unfolded holes, negative space, crossing threads, matching marks and rotated pieces; one valid choice, instant loss, balanced unequal groups, deadline and preserved records. Naturalness, solve times and human enjoyment require first-play testing.'};
fs.writeFileSync(path.join(__dirname,'model-verification.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
