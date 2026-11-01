/* 最後の一杯だけの状態。通常セッション、得点、時計を参照しない。 */
(function(root) {
  'use strict';
  const storageKey = 'wanko-extra-bowl-v1';
  const marksTopToBottom = Object.freeze(['れ','と','を','た','ふ']);
  const requests = new Set(['ふたをとれ','ふたをとる','ふたをとって','ふたをとってください','ふたをとりたい','ふたをとってほしい','ふたをとってくれ','ふたをとってくれますか','ふたをとってもらえますか']);
  function normalize(value) {
    return String(value || '').normalize('NFKC').replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-0x60))
      .replace(/蓋/g,'ふた').replace(/取/g,'と').replace(/下さい/g,'ください').replace(/[\s\u3000「」『』。、！!？?]/g,'');
  }
  function initial(record) { return Object.freeze({phase:record?.cleared === true ? 'revealed' : 'question'}); }
  function transition(state,event) {
    if (event.type === 'REPLAY') return initial();
    if (event.type === 'REQUEST' && state.phase === 'question' && requests.has(normalize(event.value))) return Object.freeze({phase:'ready'});
    if (event.type === 'TAKE_LID' && state.phase === 'ready') return Object.freeze({phase:'revealed'});
    return state;
  }
  function readRecord(store) {
    try { const r=JSON.parse(store?.getItem(storageKey) || 'null'); return {version:1,cleared:r?.version===1 && r.cleared===true}; }
    catch { return {version:1,cleared:false}; }
  }
  function saveClear(store) {
    try { if (!store) return false; store.setItem(storageKey,JSON.stringify({version:1,cleared:true})); return true; }
    catch { return false; }
  }
  const api=Object.freeze({storageKey,marksTopToBottom,normalize,initial,transition,readRecord,saveClear});
  root.WankoExtraBowlModel=api;
  if(typeof module==='object' && module.exports) module.exports=api;
})(typeof window==='object'?window:globalThis);
