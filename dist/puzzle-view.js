(() => {
  'use strict';
  const escape = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const text = s => `<span>${escape(s)}</span>`;
  function examples(q) {
    return q.examples ? `<div class="puzzle-examples" aria-label="読み方の例">${q.examples.map(([a,b])=>`<div>${text(a)}<b aria-label="は">→</b>${text(b)}</div>`).join('')}</div>` : '';
  }
  function grid(q, extra = '') {
    return `<div class="letter-grid ${extra}" style="--cols:${q.rows[0].length}">${q.rows.flatMap((row,r)=>row.map((s,c)=>`<span class="letter-cell ${q.start?.[0]===r&&q.start?.[1]===c?'route-start':''} ${q.type==='mirror'&&q.marks.some(([mr,mc])=>mr===r&&mc===c)?'circled-cell':''} ${q.type==='cube_net'&&!s?'net-empty':''}"${q.type==='cube_net'?(s?` aria-label="${r+1}行${c+1}列、${escape(s)}"`:' aria-hidden="true"'):''}>${escape(s)}</span>`)).join('')}</div>`;
  }
  function shapes(q) {
    const outlines = {
      circle:'<circle cx="50" cy="50" r="39"/>',
      square:'<rect x="12" y="15" width="76" height="69"/>',
      triangle:'<path d="M50 8 92 84H8Z"/>'
    };
    const names = {circle:'丸',square:'四角',triangle:'三角'};
    return `<div class="shape-trio">${q.shapes.map(s=>`<svg viewBox="0 0 100 100" role="img" aria-label="${names[s.shape]}の中に${escape(s.letter)}"><g fill="none" stroke="currentColor" stroke-width="3">${outlines[s.shape]}</g><text x="50" y="59" text-anchor="middle">${escape(s.letter)}</text></svg>`).join('')}</div>`;
  }
  function mask(q) {
    return `<div class="mask-panels"><div><span class="diagram-caption">文字の表</span>${grid(q)}</div><div><span class="diagram-caption">穴あきの紙</span><div class="stencil-grid" style="--cols:${q.rows[0].length}" role="img" aria-label="${q.rows.length}行${q.rows[0].length}列の紙。穴は${q.holes.map(([r,c])=>`${r+1}行${c+1}列`).join('、')}">${q.rows.flatMap((row,r)=>row.map((_,c)=>`<span class="stencil-cell ${q.holes.some(([hr,hc])=>hr===r&&hc===c)?'is-hole':''}"></span>`)).join('')}</div></div></div>`;
  }
  function clock(q) {
    const coords = q.letters.map((_,i)=>{const a=(i*60-90)*Math.PI/180; return [110+Math.cos(a)*85,105+Math.sin(a)*85];});
    const guides=q.letters.map((_,i)=>{const a=(i*60-90)*Math.PI/180;return `<line data-guide="${i}" x1="${110+Math.cos(a)*9}" y1="${105+Math.sin(a)*9}" x2="${110+Math.cos(a)*74}" y2="${105+Math.sin(a)*74}"/>`;}).join('');
    return `<svg class="hands-puzzle" viewBox="0 0 220 215" role="img" aria-label="外周の文字は上から時計回りに、${q.letters.map(escape).join('・')}。薄い点線は全６方向共通の補助線。中央から長さが異なる３本の実線の針が出ています。"><g stroke="#bba889" stroke-width="1.2" stroke-dasharray="3 3">${guides}</g>${q.letters.map((s,i)=>`<text x="${coords[i][0]}" y="${coords[i][1]}" text-anchor="middle" dominant-baseline="central">${escape(s)}</text>`).join('')}${q.hands.map(h=>{const a=(h.index*60-90)*Math.PI/180;const x=110+Math.cos(a)*h.length,y=105+Math.sin(a)*h.length;return `<path data-hand="${h.index}" data-length="${h.length}" d="M110 105 L${x} ${y}" stroke="#423129" stroke-width="4" stroke-linecap="round"/><circle cx="${x}" cy="${y}" r="3.5" fill="#bd3d30"/>`;}).join('')}<circle cx="110" cy="105" r="5" fill="#bd3d30"/></svg>`;
  }
  function sharedLines(q) {
    return `<div class="shared-line-pair">${q.diagrams.map(d=>`<svg viewBox="0 0 100 100" role="img" aria-label="${escape(d.name)}と、中心で交わる縦横の線。中心に●。"><g fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">${d.segments.map(([x1,y1,x2,y2])=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`).join('')}</g><circle cx="50" cy="50" r="3.5" fill="#bd3d30"/></svg>`).join('')}</div>`;
  }
  function ladder(q) {
    const x=i=>26+68*i;
    return `<svg class="ladder-puzzle" viewBox="0 0 256 140" role="img" aria-label="４本の縦線。●は左から${q.startColumn+1}本目。横線は上から${q.rails.map(([a,b])=>`${a+1}本目と${b+1}本目を接続`).join('、')}。下の言葉は左から${q.labels.map(escape).join('・')}。"><g fill="none" stroke="currentColor" stroke-width="2.5">${q.labels.map((_,i)=>`<line x1="${x(i)}" y1="20" x2="${x(i)}" y2="103"/>`).join('')}${q.rails.map(([a,b],i)=>`<line x1="${x(a)}" y1="${34+20*i}" x2="${x(b)}" y2="${34+20*i}"/>`).join('')}</g><circle cx="${x(q.startColumn)}" cy="10" r="5" fill="#bd3d30"/>${q.labels.map((s,i)=>`<text x="${x(i)}" y="128" text-anchor="middle">${escape(s)}</text>`).join('')}</svg>`;
  }
  function render(q) {
    let visual = '';
    if (['middle','overlap'].includes(q.type)) visual = `<div class="word-list ${q.type}">${q.words.map((s,i)=>`${i&&q.type==='overlap'?'<b class="plus">＋</b>':''}<span>${escape(s)}</span>`).join('')}</div>`;
    else if (['remove','reverse','unvoice','everyother','stepback','ends','pairs','voice'].includes(q.type)) visual = `<div class="source-word">${[...q.source].map(text).join('')}${q.type==='everyother'?'':'<b class="answer-arrow">→ ?</b>'}</div>${q.type==='stepback'?grid(q,'kana-grid'):''}`;
    else if (['small','route','vertical','single'].includes(q.type)) visual = `${q.moves?`<div class="route-moves">● ${q.moves.join(' ')}</div>`:''}${grid(q, q.type==='vertical'?'menu-grid':'')}`;
    else if (q.type === 'common') visual = `<div class="common-pairs">${q.pairs.map(([a,b])=>`<div>${text(a)}<b>と</b>${text(b)}</div>`).join('')}</div>`;
    else if (q.type === 'table') visual = `<table class="symbol-table"><thead><tr><td></td>${q.headers.map(v=>`<th scope="col">${escape(v)}</th>`).join('')}</tr></thead><tbody>${q.rows.map((row,i)=>`<tr><th scope="row">${escape(q.marks[i])}</th>${row.map(v=>`<td>${escape(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    else if (q.type === 'kanji') visual = `<div class="kanji-pieces ${q.orientation==='row'?'pieces-row':''}" aria-label="${escape(q.pieces[0])}が${q.orientation==='row'?'左':'上'}、${escape(q.pieces[1])}が${q.orientation==='row'?'右':'下'}">${q.pieces.map(text).join('<b>＋</b>')}</div>`;
    else if (q.type === 'stroke') visual = '<svg class="stroke-puzzle" viewBox="0 0 200 170" role="img" aria-label="漢字の日。中央の横線だけが赤い点線です。"><path d="M57 22H143V148H57Z" fill="none" stroke="#423129" stroke-width="9" stroke-linejoin="round"/><path d="M61 85H139" fill="none" stroke="#bd3d30" stroke-width="9" stroke-dasharray="11 4"/><path d="m154 85 28 0m-8-7 8 7-8 7" fill="none" stroke="#bd3d30" stroke-width="3"/></svg>';
    else if (q.type === 'chain') visual = `<div class="chain-cards">${q.cards.map(card=>`<span>${[...card.word].map((s,i)=>i===card.marked?`<mark>${escape(s)}</mark>`:escape(s)).join('')}</span>`).join('')}</div>`;
    else if (q.type === 'hands') visual = clock(q);
    else if (q.type === 'outside') visual = `<div class="outside-bowls">${q.outside.map((s,i)=>`<div><span class="outside-letter">${escape(s)}</span><span class="tiny-bowl"><i>${escape(q.inside[i])}</i></span></div>`).join('')}</div>`;
    else if (q.type === 'sizes') visual = `<div class="size-letters">${q.letters.map(s=>`<span style="font-size:${s.size}px" aria-label="${escape(s.text)}、文字の大きさ${s.size}">${escape(s.text)}</span>`).join('')}</div>`;
    else if (q.type === 'mirror') visual = `<div class="fold-diagram"><small class="fold-caption">折り目</small>${grid(q,'mirror-grid')}</div>`;
    else if (q.type === 'shapes') visual = shapes(q);
    else if (q.type === 'weave') visual = `<div class="weave-rows">${q.words.map((w,i)=>`<div><small>${i?'下':'上'}</small>${[...w].map(text).join('')}</div>`).join('')}</div>`;
    else if (q.type === 'shared_blank') visual = `<div class="blank-rows">${q.entries.map(e=>`<div><small>${escape(e.clue)}</small><span>${escape(e.template)}</span></div>`).join('')}</div>`;
    else if (q.type === 'corners') visual = `<div class="corner-diagram">${grid(q)}<b class="clockwise-mark" aria-label="時計回り">↻</b></div>`;
    else if (q.type === 'agree') visual = `<div class="agree-rows">${q.pairs.map(pair=>`<div>${pair.map(w=>`<span class="compare-word">${[...w].map(text).join('')}</span>`).join('<b aria-hidden="true">│</b>')}</div>`).join('')}</div>`;
    else if (q.type === 'swap') visual = `<div class="swap-diagram"><div>${[...q.source].map((s,i)=>`<span class="swap-letter ${q.marks.includes(i)?'swap-marked':''}">${escape(s)}</span>`).join('')}</div><b aria-hidden="true">↔</b></div>`;
    else if (q.type === 'missing_link') visual = `<div class="missing-chain">${text(q.before)}<b>→</b><span class="empty-word">？？？</span><b>→</b>${text(q.after)}</div>`;
    else if (q.type === 'mask') visual = mask(q);
    else if (q.type === 'shared_lines') visual = sharedLines(q);
    else if (q.type === 'ladder') visual = ladder(q);
    else if (q.type === 'cube_net') visual = grid(q,'cube-grid');
    return `<div class="example-area">${examples(q)}</div><div class="puzzle-visual type-${q.type}">${visual}</div>`;
  }
  window.WankoPuzzleView = Object.freeze({render});
})();
