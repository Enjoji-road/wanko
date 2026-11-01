/* 通常プレイから独立した「最後の一杯」試作。通常の保存キーには触れない。 */
(() => {
  'use strict';
  const M=window.WankoExtraBowlModel, $=id=>document.getElementById(id);
  const scene=$('counterScene'), home=document.createComment('入口の同じお椀とお給仕さん');
  scene.before(home);
  const originalSpeech=$('counterSpeech').textContent;
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  let store=null; try {store=localStorage;} catch { /* 保存なしでも遊べる */ }
  let state=M.initial(M.readRecord(store)), active=false, hint=0, entryTimer, revealTimer, composing=false, lastFocus;
  const hints=[
    '四つの椀は、どれも底が見えています。店の中の、ほかのお椀も見てみましょう。',
    '入口にあった五段のお椀にも、一つずつ印がありました。今も同じお椀がここにあります。',
    '食べ終えたお椀は、前のお椀の上へ重ねます。最初の一杯は、一番下です。',
    '食べた順に、下から上へ。読めたお願いを、お給仕さんの手元で伝えてみましょう。'
  ];
  function restoreScene() {
    home.parentNode.insertBefore(scene,home.nextSibling);
    $('counterSpeech').textContent=originalSpeech;
    $('counterServer').src='assets/okyuuji.svg';
    $('counterServer').alt='蓋付きのお椀を手にしたお給仕さん';
    $('serverInspect').hidden=true;
    scene.classList.remove('last-bowl-found');
  }
  function close(target='result') {
    clearTimeout(revealTimer);
    if($('handDialog').open) $('handDialog').close();
    if(!active)return;
    active=false; restoreScene(); $('extraScreen').hidden=true;
    document.body.classList.remove('is-extra');
    $('resultScreen').hidden=target!=='result'; $('introScreen').hidden=target!=='intro'; $('playScreen').hidden=true;
    document.body.classList.toggle('is-result',target==='result');
    window.scrollTo({top:0,behavior:'auto'});
    (target==='intro'?$('startButton'):$('openExtraBowl')).focus({preventScroll:true});
  }
  function paint() {
    const ready=state.phase==='ready', revealed=state.phase==='revealed';
    $('requestForm').hidden=ready||revealed;
    $('takeLid').hidden=!ready;
    $('handRevealed').hidden=!revealed;
    $('liftedLid').hidden=!revealed;
    $('extraClear').hidden=!revealed;
    $('extraQuestion').hidden=revealed;
    $('extraHintArea').hidden=revealed;
    $('handImage').src=revealed?'assets/okyuuji-open.svg':'assets/okyuuji.svg';
    $('counterServer').src=revealed?'assets/okyuuji-open.svg':'assets/okyuuji.svg';
    $('counterServer').alt=revealed?'蓋が取れ、そばの入ったお椀を手にしたお給仕さん':'蓋付きのお椀を手にしたお給仕さん';
    $('handImage').alt=revealed?'同じお給仕さんの手元。蓋の下にあった、そばの入ったお椀':'同じお給仕さんが持っている、蓋付きのお椀の拡大';
    $('counterSpeech').textContent=revealed?'見つかっちゃいましたね！':'最初の一杯を、覚えていますか？';
    $('handFeedback').textContent=ready?'承りました。その蓋を、どうぞ。':revealed?'見つかっちゃいましたね！':'手には、蓋をしたお椀。';
    $('openExtraBowl').textContent=M.readRecord(store).cleared?'特別な一杯をもう一度見る':'その一杯、いただきます';
    scene.classList.toggle('last-bowl-found',revealed);
  }
  function open() {
    if(active || $('resultScreen').hidden || !$('playScreen').hidden)return;
    clearTimeout(entryTimer); active=true;
    $('resultScreen').hidden=true; $('introScreen').hidden=true;
    $('extraSceneHost').append(scene); $('extraScreen').hidden=false;
    $('serverInspect').hidden=false;
    document.body.classList.remove('is-result','is-playing'); document.body.classList.add('is-extra');
    paint(); window.scrollTo({top:0,behavior:'auto'}); $('extraTitle').focus({preventScroll:true});
  }
  $('openExtraBowl').addEventListener('click',open);
  $('extraBack').addEventListener('click',()=>close('result'));
  $('extraToStart').addEventListener('click',()=>close('intro'));
  $('extraReplay').addEventListener('click',()=>{
    clearTimeout(revealTimer); state=M.transition(state,{type:'REPLAY'}); hint=0;
    $('requestInput').value=''; $('extraHints').replaceChildren(); $('extraHint').disabled=false;
    document.querySelectorAll('[data-empty-bowl]').forEach(button=>button.classList.remove('is-inspected'));
    $('extraFeedback').textContent='どのお椀に、まだ一杯あるのでしょう。';
    $('extraStorageNotice').hidden=true; paint(); $('extraTitle').focus({preventScroll:true});
    window.scrollTo({top:0,behavior:'auto'});
  });
  document.querySelectorAll('[data-empty-bowl]').forEach(button=>button.addEventListener('click',()=>{
    if(!active || state.phase==='revealed')return;
    button.classList.add('is-inspected');
    $('extraFeedback').textContent='そちらは、もう空ですよ？ 四つとも、底まで見えています。';
  }));
  $('extraHint').addEventListener('click',()=>{
    if(hint>=hints.length)return;
    const p=document.createElement('p'); p.textContent=hints[hint++]; $('extraHints').append(p);
    $('extraHint').disabled=hint>=hints.length;
  });
  $('serverInspect').addEventListener('click',()=>{
    if(!active)return; lastFocus=document.activeElement; paint();
    $('handDialog').showModal();
    (state.phase==='ready'?$('takeLid'):state.phase==='revealed'?$('closeHand'):$('requestInput')).focus({preventScroll:true});
  });
  $('closeHand').addEventListener('click',()=>{$('handDialog').close();});
  $('handDialog').addEventListener('close',()=>{if(active)(state.phase==='revealed'?$('extraClearTitle'):lastFocus)?.focus({preventScroll:true});});
  $('requestInput').addEventListener('compositionstart',()=>{composing=true;});
  $('requestInput').addEventListener('compositionend',()=>{composing=false;});
  $('requestForm').addEventListener('keydown',event=>{
    if(event.key==='Enter' && (event.isComposing || composing || event.keyCode===229)) event.preventDefault();
  });
  $('requestForm').addEventListener('submit',event=>{
    event.preventDefault(); if(composing || !active || state.phase!=='question')return;
    const next=M.transition(state,{type:'REQUEST',value:$('requestInput').value});
    if(next===state) {$('handFeedback').textContent='そのお願いでは、お渡しできませんね。お椀の印を見直してみませんか？';return;}
    state=next; paint(); $('takeLid').focus({preventScroll:true});
  });
  $('takeLid').addEventListener('click',()=>{
    if(!active)return;
    const next=M.transition(state,{type:'TAKE_LID'}); if(next===state)return;
    state=next; const saved=M.saveClear(store); paint();
    $('extraStorageNotice').hidden=saved;
    const finish=()=>{if(!active)return;if($('handDialog').open)$('handDialog').close();$('extraClearTitle').focus({preventScroll:true});$('extraClear').scrollIntoView({block:'start',behavior:'auto'});};
    if(motion.matches) finish(); else revealTimer=setTimeout(finish,700);
  });
  document.addEventListener('keydown',event=>{
    if(!active || $('handDialog').open || $('helpDialog').open || state.phase==='revealed' || event.isComposing || event.repeat || event.ctrlKey || event.altKey || event.metaKey)return;
    if(/^[1-4]$/.test(event.key)){event.preventDefault();document.querySelector(`[data-empty-bowl="${event.key}"]`).click();}
  });
  window.WankoExtraBowl=Object.freeze({
    storageKey:M.storageKey,
    show(host,delay) {clearTimeout(entryTimer);host.hidden=true;entryTimer=setTimeout(()=>{host.hidden=false;},Math.max(0,Number(delay)||0));$('openExtraBowl').textContent=M.readRecord(store).cleared?'特別な一杯をもう一度見る':'その一杯、いただきます';},
    hide(host) {clearTimeout(entryTimer);close('result');host.hidden=true;}
  });
})();
