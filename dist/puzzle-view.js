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
  function diagram(width,height,label,body,extra='') {
    return `<svg class="serving-diagram ${extra}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escape(label)}">${body}</svg>`;
  }
  const diagramText=(x,y,s,size=22)=>`<text x="${x}" y="${y}" font-size="${size}" text-anchor="middle" dominant-baseline="central">${escape(s)}</text>`;
  function paperGrid(rows,cols,holes,x,y,unit,folded=false) {
    let out='';
    for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)out+=`<rect x="${x+c*unit}" y="${y+r*unit}" width="${unit}" height="${unit}" fill="${folded&&c<cols/2?'#eee8dc':'#e4cfad'}" stroke="${folded&&c<cols/2?'#cfc7b8':'#9f8667'}" stroke-width=".8"/>`;
    for(const[r,c]of holes)out+=`<circle cx="${x+(c+.5)*unit}" cy="${y+(r+.5)*unit}" r="${unit*.28}" fill="#fffdf7" stroke="#423129" stroke-width="1.2"/>`;
    return out;
  }
  function polyCells(cells,x,y,unit) {
    return cells.map(([c,r])=>`<rect x="${x+c*unit}" y="${y+r*unit}" width="${unit}" height="${unit}" fill="currentColor" stroke="#fffaf0" stroke-width="1.1"/>`).join('');
  }
  const moreDiagrams={
    plate_turn(q) {
      const positions=[[105,38],[152,85],[105,132],[58,85]];
      const fixed=[[105,1],[203,85],[105,169],[7,85]][q.targetIndex];
      return diagram(230,174,'円形の皿。上から時計回りに'+q.symbols.join('・')+'。皿の外の●は右側。矢印は時計回りに４分の１回転。',
        '<circle cx="105" cy="85" r="67" fill="#f5e8ce" stroke="currentColor" stroke-width="2.5"/><circle cx="105" cy="85" r="59" fill="none" stroke="#c5aa83" stroke-width="1"/>'+
        q.symbols.map((s,i)=>diagramText(...positions[i],s,29)).join('')+
        `<circle cx="${fixed[0]}" cy="${fixed[1]}" r="5" fill="#bd3d30"/><path d="M105 6 A79 79 0 0 1 184 85 M177 75 L184 85 L191 75" fill="none" stroke="#bd3d30" stroke-width="3" stroke-linecap="round"/>`);
    },
    missing_corner(q) {
      return diagram(154,126,'四角の輪郭。上辺と左辺は全部、右辺は上半分、下辺は左半分があります。',
        `<g fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="butt">${q.segments.map(([x,y,u,v])=>`<path d="M${x} ${y}L${u} ${v}"/>`).join('')}</g>`);
    },
    regions(q) {
      return diagram(270,174,'丸と四角が一部で重なっています。'+q.labels.map(v=>v.text+'は横位置'+v.x+'、縦位置'+v.y).join('。'),
        `<circle cx="${q.circle.x}" cy="${q.circle.y}" r="${q.circle.r}" fill="none" stroke="currentColor" stroke-width="2.5"/><rect x="${q.square.x}" y="${q.square.y}" width="${q.square.width}" height="${q.square.height}" fill="none" stroke="currentColor" stroke-width="2.5"/>`+
        q.labels.map(v=>diagramText(v.x,v.y,v.text,20)).join(''));
    },
    front_card(q) {
      return diagram(260,172,'四枚の札が重なっています。きの札は、つ・ほ・しの札の一部を隠しています。',
        [...q.cards].sort((a,b)=>a.z-b.z).map(c=>`<g data-card="${escape(c.label)}"><rect x="${c.x}" y="${c.y}" width="${c.width}" height="${c.height}" rx="2" fill="#f3e5ca" stroke="currentColor" stroke-width="2.5"/>${diagramText(c.textX,c.textY,c.label,27)}</g>`).join(''));
    },
    fold_holes(q) {
      let out=paperGrid(q.rows,q.columns,q.punched,8,35,20,true);
      out+='<path d="M15 23H74M67 17L74 23L67 29" fill="none" stroke="#bd3d30" stroke-width="2"/><path d="M48 32V118" stroke="#bd3d30" stroke-width="1.5" stroke-dasharray="3 3"/>';
      out+=diagramText(48,139,'折った紙',13)+diagramText(106,84,'→',24);
      q.patterns.forEach((p,i)=>{const x=128+(i%2)*80,y=12+Math.floor(i/2)*85;out+=paperGrid(q.rows,q.columns,p.holes,x,y,12.5)+diagramText(x+25,y+65,p.label,20);});
      return diagram(280,176,'４行４列の紙。左半分を右に重ね、右の１行３列と３行４列に穴。四つの候補はすべて穴４個。',out,'comparison-diagram');
    },
    negative_space(q) {
      const unit=15;
      return diagram(125,125,'黒い正方形の中に白いマスのすきまがあります。白は上の横線、右の縦線、下の横線としてつながっています。',
        `<rect x="10" y="10" width="105" height="105" fill="currentColor"/>`+
        q.rows.flatMap((row,r)=>[...row].map((c,col)=>c==='0'?`<rect x="${10+col*unit}" y="${10+r*unit}" width="${unit}" height="${unit}" fill="#fffdf7"/>`:'')).join(''),'space-diagram');
    },
    braid(q) {
      const x=i=>35+60*i;let order=q.labels.map((_,i)=>i),out='';
      for(let step=0;step<q.crossings.length;step++){
        const [a,b]=q.crossings[step],next=order.slice();[next[a],next[b]]=[next[b],next[a]];
        const y=16+step*42,end=y+42;
        const parts=order.map((id,pos)=>({id,pos,to:next.indexOf(id)}));
        out+=parts.map(v=>`<path d="M${x(v.pos)} ${y}L${x(v.to)} ${end}" stroke="currentColor" stroke-width="3" fill="none"/>`).join('');
        out+=`<path d="M${x(a)} ${y}L${x(b)} ${end}" stroke="#fffaf0" stroke-width="10" fill="none"/><path d="M${x(a)} ${y}L${x(b)} ${end}" stroke="currentColor" stroke-width="3" fill="none"/>`;
        order=next;
      }
      const bottom=16+q.crossings.length*42;
      out+=q.labels.map((s,i)=>`<path d="M${x(i)} ${bottom}V117" stroke="currentColor" stroke-width="3"/>${diagramText(x(i),137,s,21)}`).join('');
      out+=`<circle cx="${x(q.startColumn)}" cy="8" r="5" fill="#bd3d30"/>`;
      return diagram(250,157,'４本のひも。●は左端。最初に左の２本が交差し、次に中央の２本が交差します。交差は接続ではありません。下の言葉は左から'+q.labels.join('・')+'。',out);
    },
    join_marks(q) {
      const mark=p=>{const{x,y}=p;if(p.mark==='circle')return `<circle cx="${x}" cy="${y}" r="7"/>`;if(p.mark==='triangle')return `<path d="M${x} ${y-8}L${x+8} ${y+7}H${x-8}Z"/>`;return `<rect x="${x-7}" y="${y-7}" width="14" height="14"/>`;};
      return diagram(180,136,'上段は左から○・△・○、下段は左から□・△・□。上下の三つの位置はそろっています。',
        `<g fill="#fffaf0" stroke="currentColor" stroke-width="2.7">${q.points.map(mark).join('')}</g>`);
    },
    same_piece(q) {
      let out=polyCells(q.target,112,19,18)+diagramText(72,43,'見本',16)+diagramText(198,43,'↻',30);
      out+=q.pieces.map((p,i)=>polyCells(p.cells,15+65*i,96,14)+diagramText(36+65*i,156,p.label,20)).join('');
      const describe=cells=>cells.map(([c,r])=>(r+1)+'行'+(c+1)+'列').join('・');
      return diagram(280,173,'各図は５マス。見本は'+describe(q.target)+'。'+q.pieces.map(p=>p.label+'は'+describe(p.cells)).join('。'),out,'comparison-diagram');
    }
  };
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
    else if (moreDiagrams[q.type]) visual = moreDiagrams[q.type](q);
    return `<div class="example-area">${examples(q)}</div><div class="puzzle-visual type-${q.type}">${visual}</div>`;
  }
  window.WankoPuzzleView = Object.freeze({render});
})();
