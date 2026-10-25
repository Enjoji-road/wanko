(() => {
  'use strict';
  const C = window.WankoConfig, M = window.WankoModel, questions = window.WankoQuestions;
  const $ = id => document.getElementById(id);
  const seconds = Number.isSafeInteger(C.durationSeconds) && C.durationSeconds > 0 ? C.durationSeconds : 90;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let session = null, ticker = null, lidTimer = null, lidArmed = false, composing = false, composedAt = -Infinity, best = 0, cheerIndex = -1, finishPending = false;
  const clock = () => Math.max(performance.timeOrigin + performance.now(), Date.now());
  function storage() { try { return localStorage; } catch { return null; } }
  const store = storage();
  try { best = M.readRecords(store, C.storageKey).bests[seconds] || 0; } catch { /* play remains available */ }
  document.querySelectorAll('[data-duration]').forEach(el => { el.textContent = seconds; });
  $('introBest').textContent = best; $('playBest').textContent = best;
  if (!store) $('storageNotice').hidden = false;

  function updateViewport() {
    const height = window.visualViewport?.height || innerHeight;
    document.documentElement.style.setProperty('--app-height', `${Math.round(height)}px`);
    document.body.classList.toggle('keyboard-open', innerHeight - height > 120);
  }
  window.visualViewport?.addEventListener('resize', updateViewport);
  window.addEventListener('resize', updateViewport); updateViewport();

  function screen(name) {
    ['intro','play','result'].forEach(id => { $(id + 'Screen').hidden = id !== name; });
    document.body.classList.toggle('is-playing', name === 'play');
    document.body.classList.toggle('is-result', name === 'result');
  }
  function focusAnswer() { if (session?.phase === 'playing' && !$('helpDialog').open) $('answerInput').focus({preventScroll:true}); }
  function feedback(message, kind = '') { $('answerFeedback').textContent = message; $('answerFeedback').dataset.kind = kind; }
  function disarmLid() { clearTimeout(lidTimer); lidArmed = false; $('lidButton').classList.remove('armed'); $('lidText').textContent = '蓋をして終わる'; }
  function animateServing() {
    if (motion.matches || !C.serveAnimationMs) return;
    $('questionBowl').animate([{transform:'translateX(7px)',opacity:0.76},{transform:'translateX(0)',opacity:1}],{duration:C.serveAnimationMs,easing:'ease-out'});
    document.querySelector('.play-server').animate([{transform:'rotate(-3deg)'},{transform:'rotate(1deg)'},{transform:'rotate(0)'}],{duration:230});
  }
  function showQuestion(animate = false) {
    const q = session.current;
    $('questionCount').textContent = `${session.serial}杯目`;
    $('questionTitle').textContent = q.title;
    $('questionInstruction').textContent = q.instruction;
    $('answerLength').textContent = `ひらがな ${q.answerLength}文字${q.type === 'kanji' || q.type === 'stroke' ? ' ／ 漢字もOK' : ''}`;
    $('puzzleContent').innerHTML = window.WankoPuzzleView.render(q);
    $('answerInput').value = ''; $('answerInput').removeAttribute('aria-invalid');
    if (animate) animateServing();
    focusAnswer();
  }
  function stacks() {
    $('score').textContent = session.score;
    const host = $('bowlStacks'); host.replaceChildren();
    for (let n = 0; n < session.score; n += 10) {
      const column = document.createElement('div'); column.className = 'stack-column';
      for (let i = 0; i < Math.min(10,session.score-n); i++) { const bowl = document.createElement('i'); bowl.style.setProperty('--i',i); column.append(bowl); }
      host.append(column);
    }
    $('stackCaption').textContent = session.score ? `${session.score}杯、ぺろり！` : 'お椀は、ここへ。';
  }
  function cheer() {
    const choices = C.cheers?.length ? C.cheers : ['はい、じゃんじゃん！'];
    let next = Math.floor(Math.random() * choices.length);
    if (choices.length > 1 && next === cheerIndex) next = (next + 1) % choices.length;
    cheerIndex = next; $('cheer').textContent = choices[next];
  }
  function tick() {
    if (!session || session.phase !== 'playing') return;
    if (session.expire()) { finishView(); return; }
    const remaining = session.remaining();
    $('timer').textContent = Math.ceil(remaining / 1000);
    $('timerFill').style.transform = `scaleX(${remaining / session.durationMs})`;
    document.querySelector('.timer-stat').classList.toggle('urgent', remaining <= 10000);
  }
  function start() {
    if (session?.phase === 'playing') return;
    clearInterval(ticker); disarmLid();
    window.WankoExtraBowl.hide($('extraBowl'));
    $('questionBowl').classList.remove('lid-closed');
    $('review').open = false; $('reviewList').replaceChildren();
    session = new M.Session(questions,{durationMs:seconds*1000,mode:C.shuffleMode,now:clock});
    session.start(); screen('play');
    $('answerInput').disabled = false; $('answerButton').disabled = false; $('passButton').disabled = false; $('lidButton').disabled = false;
    composing = false; composedAt = -Infinity;
    $('cheer').textContent = 'さあ、一杯目どうぞ！';
    $('playBest').textContent = best; feedback('ひらめきを、どうぞ！');
    stacks(); showQuestion(); tick(); ticker = setInterval(tick,80);
    window.scrollTo({top:0,behavior:'instant'});
  }
  function submit(event) {
    event.preventDefault();
    if (composing || performance.now() - composedAt < 80 || session?.phase !== 'playing') return;
    const result = session.submit($('answerInput').value,session.serial);
    if (session.phase === 'finished') { finishView(); return; }
    if (result === 'correct') { disarmLid(); stacks(); cheer(); showQuestion(true); feedback('一杯完食！ 次もどうぞ。','correct'); }
    else if (result === 'wrong') { $('answerInput').setAttribute('aria-invalid','true'); feedback('ちがうみたい。もうひと口！','wrong'); focusAnswer(); $('answerInput').select(); }
    else if (result === 'empty') { feedback('こたえを入れてから、どうぞ！'); focusAnswer(); }
    tick();
  }
  $('answerForm').addEventListener('submit',submit);
  $('answerInput').addEventListener('compositionstart',()=>{composing=true;});
  $('answerInput').addEventListener('compositionend',()=>{composing=false;composedAt=performance.now();});
  $('answerInput').addEventListener('keydown',event=>{if(event.key==='Enter' && (event.isComposing || composing || event.keyCode===229 || event.repeat || performance.now()-composedAt<80)) event.preventDefault();});
  $('answerInput').addEventListener('input',()=>{$('answerInput').removeAttribute('aria-invalid');});
  $('passButton').addEventListener('click',()=>{
    if (session?.pass()) { disarmLid(); composing=false; showQuestion(true); feedback('パスして、次の一杯へ！'); $('cheer').textContent='そういう日もあります！ 次どうぞ。'; }
    else if (session?.phase === 'finished') finishView();
    tick();
  });
  $('lidButton').addEventListener('click',()=>{
    if (session?.phase !== 'playing') return;
    if (session.expire()) { finishView(); return; }
    if (lidArmed) { session.finish('lid'); $('questionBowl').classList.add('lid-closed'); finishView(); }
    else { lidArmed=true; $('lidButton').classList.add('armed'); $('lidText').textContent='もう一度で、ごちそうさま'; lidTimer=setTimeout(disarmLid,C.lidConfirmMs||2800); }
  });
  function share(score) {
    const template=C.shareText||'謎解きわんこそば、{seconds}秒で{score}杯完食！';
    const url=M.shareUrl(C.publicUrl,template,seconds,score);
    const link = $('shareButton');
    if (!url) { link.removeAttribute('href'); link.setAttribute('aria-disabled','true'); link.tabIndex=-1; $('shareNotice').hidden=false; return; }
    link.href=url;
    link.removeAttribute('aria-disabled'); link.removeAttribute('tabindex'); $('shareNotice').hidden=true;
  }
  function finishView(skipLid = false) {
    if ($('resultScreen').hidden === false) return;
    if (finishPending && !skipLid) return;
    clearInterval(ticker); disarmLid();
    $('answerInput').blur();
    ['answerInput','answerButton','passButton','lidButton'].forEach(id=>{$(id).disabled=true;});
    if ($('helpDialog').open) $('helpDialog').close();
    if (session.reason === 'lid' && !motion.matches && !skipLid) {
      finishPending = true;
      setTimeout(()=>finishView(true),220);
      return;
    }
    finishPending = false;
    const record=M.saveBest(store,C.storageKey,seconds,session.score);
    const previous=best; best=Math.max(best,record.best);
    $('newBest').hidden=!(session.score>previous);
    $('resultStorageNotice').hidden=record.saved;
    $('finishReason').textContent=session.reason==='time'?'お時間です！':'ぱたん。お椀に蓋。';
    $('resultScore').textContent=session.score; $('resultBest').textContent=best;
    $('introBest').textContent=best; $('resultSpeech').textContent=session.score?'いい食べっぷりでした！':'またのお越しを、お待ちしてます！';
    for (const item of session.history) {
      const q=questions.find(q=>q.id===item.id), li=document.createElement('li');
      const badge=document.createElement('span'); badge.className='review-badge';badge.textContent=item.outcome==='solved'?'完食':'パス';
      const title=document.createElement('strong');title.textContent=q.title+' → '+q.answer;
      const detail=document.createElement('p');detail.textContent=q.explanation;
      li.append(badge,title,detail);$('reviewList').append(li);
    }
    if (!session.history.length) $('reviewList').innerHTML='<li>まだ一杯目でした。またお待ちしています！</li>';
    share(session.score); screen('result'); window.scrollTo({top:0,behavior:'instant'});
    $('resultTitle').focus({preventScroll:true});
    if (!motion.matches) $('resultScore').animate([{transform:'scale(.8)',opacity:.2},{transform:'scale(1.06)',opacity:1},{transform:'scale(1)'}],{duration:350});
    window.WankoExtraBowl.show($('extraBowl'),C.extraBowlDelayMs);
  }
  $('startButton').addEventListener('click',start); $('retryButton').addEventListener('click',start);
  document.addEventListener('visibilitychange',()=>{if(session?.phase==='playing')tick();});
  window.addEventListener('pageshow',()=>{if(session?.phase==='playing')tick();});
  const help=$('helpDialog');let helpFocus;
  $('helpButton').addEventListener('click',()=>{helpFocus=document.activeElement;help.showModal();});
  ['closeHelp','helpOkay'].forEach(id=>$(id).addEventListener('click',()=>help.close()));
  help.addEventListener('close',()=>{if(session?.phase==='playing')focusAnswer();else helpFocus?.focus({preventScroll:true});});
})();
