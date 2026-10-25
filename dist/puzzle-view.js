(() => {
  'use strict';
  const escape = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const text = s => `<span>${escape(s)}</span>`;
  function examples(q) {
    return q.examples ? `<div class="puzzle-examples" aria-label="読み方の例">${q.examples.map(([a,b])=>`<div>${text(a)}<b aria-label="は">→</b>${text(b)}</div>`).join('')}</div>` : '';
  }
  function grid(q, extra = '') {
    return `<div class="letter-grid ${extra}" style="--cols:${q.rows[0].length}">${q.rows.flatMap((row,r)=>row.map((s,c)=>`<span class="letter-cell ${q.start?.[0]===r&&q.start?.[1]===c?'route-start':''}">${escape(s)}</span>`)).join('')}</div>`;
  }
  function clock(q) {
    const coords = q.letters.map((_,i)=>{const a=(i*60-90)*Math.PI/180; return [110+Math.cos(a)*85,105+Math.sin(a)*85];});
    return `<svg class="hands-puzzle" viewBox="0 0 220 215" role="img" aria-label="六角形に並ぶ文字は上から時計回りに、は・み・し・ね・ら・こ。中央から長さの異なる３本の針が出ています。"><circle cx="110" cy="105" r="67" fill="none" stroke="#d8c8a8" stroke-dasharray="2 5"/>${q.letters.map((s,i)=>`<text x="${coords[i][0]}" y="${coords[i][1]}" text-anchor="middle" dominant-baseline="central">${escape(s)}</text>`).join('')}${q.hands.map(h=>{const a=(h.index*60-90)*Math.PI/180;const x=110+Math.cos(a)*h.length,y=105+Math.sin(a)*h.length;return `<path d="M110 105 L${x} ${y}" stroke="#423129" stroke-width="4" stroke-linecap="round"/><circle cx="${x}" cy="${y}" r="3.5" fill="#bd3d30"/>`;}).join('')}<circle cx="110" cy="105" r="5" fill="#bd3d30"/></svg>`;
  }
  function render(q) {
    let visual = '';
    if (['middle','overlap'].includes(q.type)) visual = `<div class="word-list ${q.type}">${q.words.map((s,i)=>`${i&&q.type==='overlap'?'<b class="plus">＋</b>':''}<span>${escape(s)}</span>`).join('')}</div>`;
    else if (['remove','reverse','unvoice','everyother','stepback'].includes(q.type)) visual = `<div class="source-word">${[...q.source].map(text).join('')}<b class="answer-arrow">→ ?</b></div>${q.type==='stepback'?grid(q,'kana-grid'):''}`;
    else if (['small','route','vertical','single'].includes(q.type)) visual = `${q.moves?`<div class="route-moves">● ${q.moves.join(' ')}</div>`:''}${grid(q, q.type==='vertical'?'menu-grid':'')}`;
    else if (q.type === 'common') visual = `<div class="common-pairs">${q.pairs.map(([a,b])=>`<div>${text(a)}<b>と</b>${text(b)}</div>`).join('')}</div>`;
    else if (q.type === 'table') visual = `<table class="symbol-table"><thead><tr><td></td>${q.headers.map(v=>`<th scope="col">${escape(v)}</th>`).join('')}</tr></thead><tbody>${q.rows.map((row,i)=>`<tr><th scope="row">${escape(q.marks[i])}</th>${row.map(v=>`<td>${escape(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    else if (q.type === 'kanji') visual = `<div class="kanji-pieces" aria-label="日が上、生が下">${q.pieces.map(text).join('<b>＋</b>')}</div>`;
    else if (q.type === 'stroke') visual = '<svg class="stroke-puzzle" viewBox="0 0 200 170" role="img" aria-label="漢字の日。中央の横線だけが赤い点線です。"><path d="M57 22H143V148H57Z" fill="none" stroke="#423129" stroke-width="9" stroke-linejoin="round"/><path d="M61 85H139" fill="none" stroke="#bd3d30" stroke-width="9" stroke-dasharray="11 4"/><path d="m154 85 28 0m-8-7 8 7-8 7" fill="none" stroke="#bd3d30" stroke-width="3"/></svg>';
    else if (q.type === 'chain') visual = `<div class="chain-cards">${q.cards.map(card=>`<span>${[...card.word].map((s,i)=>i===card.marked?`<mark>${escape(s)}</mark>`:escape(s)).join('')}</span>`).join('')}</div>`;
    else if (q.type === 'hands') visual = clock(q);
    else if (q.type === 'outside') visual = `<div class="outside-bowls">${q.outside.map((s,i)=>`<div><span class="outside-letter">${escape(s)}</span><span class="tiny-bowl"><i>${escape(q.inside[i])}</i></span></div>`).join('')}</div>`;
    return `<div class="example-area">${examples(q)}</div><div class="puzzle-visual type-${q.type}">${visual}</div>`;
  }
  window.WankoPuzzleView = Object.freeze({render});
})();
