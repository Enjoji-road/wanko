/* 最後の一杯だけの状態。通常セッション、得点、時計を参照しない。 */
(function(root) {
  'use strict';
  const storageKey = 'wanko-extra-bowl-v1';
  const marksTopToBottom = Object.freeze(['に','か','な','の','て']);
  function initial(record) { return Object.freeze({phase:record?.cleared === true ? 'revealed' : 'question'}); }
  function transition(state,event) {
    if (event.type === 'REPLAY') return initial();
    if (event.type === 'TAKE_LID' && state.phase === 'question') return Object.freeze({phase:'revealed'});
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
  const api=Object.freeze({storageKey,marksTopToBottom,initial,transition,readRecord,saveClear});
  root.WankoExtraBowlModel=api;
  if(typeof module==='object' && module.exports) module.exports=api;
})(typeof window==='object'?window:globalThis);
