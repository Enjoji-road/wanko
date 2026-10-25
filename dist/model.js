(function (root) {
  'use strict';
  function normalize(value) {
    return String(value ?? '').normalize('NFKC').trim().replace(/[\s\u3000]/g, '').replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60)).toLowerCase();
  }
  function accepts(question, input) {
    const answer = normalize(input);
    return answer.length > 0 && [question.answer, ...(question.aliases || [])].some(v => normalize(v) === answer);
  }
  function random() {
    if (root.crypto?.getRandomValues) return root.crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
    return Math.random();
  }
  function shuffle(items, rng = random) {
    const out = items.slice();
    for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
    return out;
  }
  class Deck {
    constructor(questions, mode = 'balanced', rng = random) {
      if (!questions.length) throw new Error('問題を１問以上用意してください。');
      this.questions = questions; this.mode = mode; this.rng = rng; this.queue = []; this.lastId = null; this.round = 0;
    }
    refill() {
      let next;
      if (this.mode === 'balanced') {
        const groups = [...new Set(this.questions.map(q => q.level))].map(level => shuffle(this.questions.filter(q => q.level === level), this.rng));
        next = [];
        while (groups.some(g => g.length)) next.push(...shuffle(groups.filter(g => g.length).map(g => g.shift()), this.rng));
      } else next = shuffle(this.questions, this.rng);
      if (next.length > 1 && next[0].id === this.lastId) [next[0], next[1]] = [next[1], next[0]];
      this.queue = next; this.round++;
    }
    draw() { if (!this.queue.length) this.refill(); const item = this.queue.shift(); this.lastId = item.id; return item; }
  }
  class Session {
    constructor(questions, options = {}) {
      this.now = options.now || (() => performance.now()); this.durationMs = options.durationMs || 90000;
      this.deck = new Deck(questions, options.mode, options.rng); this.phase = 'idle'; this.score = 0; this.passed = 0; this.history = []; this.serial = 0;
    }
    start() { if (this.phase !== 'idle') return false; this.phase = 'playing'; this.deadline = this.now() + this.durationMs; this.next(); return true; }
    next() { this.current = this.deck.draw(); this.serial++; }
    remaining() { return this.phase === 'playing' ? Math.max(0, this.deadline - this.now()) : 0; }
    expire() { if (this.phase === 'playing' && this.remaining() <= 0) { this.finish('time'); return true; } return false; }
    submit(input, serial = this.serial) {
      if (this.expire() || this.phase !== 'playing' || serial !== this.serial) return 'inactive';
      if (!normalize(input)) return 'empty';
      if (!accepts(this.current, input)) return 'wrong';
      this.history.push({ id:this.current.id, outcome:'solved' }); this.score++; this.next(); return 'correct';
    }
    pass() {
      if (this.expire() || this.phase !== 'playing') return false;
      this.history.push({ id:this.current.id, outcome:'passed' }); this.passed++; this.next(); return true;
    }
    finish(reason = 'lid') {
      if (this.phase !== 'playing') return false;
      if (this.remaining() <= 0) reason = 'time';
      this.phase = 'finished'; this.reason = reason; return true;
    }
  }
  function readRecords(storage, key) {
    try {
      const saved = JSON.parse(storage.getItem(key));
      if (!saved || saved.version !== 1 || typeof saved.bests !== 'object' || !saved.bests) return {version:1,bests:{}};
      const bests = {};
      for (const [duration, value] of Object.entries(saved.bests)) if (/^\d+$/.test(duration) && Number.isSafeInteger(value) && value >= 0) bests[duration] = value;
      return {version:1,bests};
    } catch { return {version:1,bests:{}}; }
  }
  function saveBest(storage, key, seconds, score) {
    try {
      const records = readRecords(storage,key), previous = records.bests[seconds] || 0;
      records.bests[seconds] = Math.max(previous,score);
      storage.setItem(key, JSON.stringify(records));
      return {best:records.bests[seconds], isNew:score > previous, saved:true};
    } catch { return {best:score,isNew:false,saved:false}; }
  }
  function shareUrl(publicUrl, template, seconds, score) {
    let url;
    try { url=new URL(publicUrl); if(!['https:','http:'].includes(url.protocol)) return null; } catch { return null; }
    const text=template.replaceAll('{seconds}',String(seconds)).replaceAll('{score}',String(score));
    return 'https://twitter.com/intent/tweet?'+new URLSearchParams({text,url:url.href});
  }
  const api = {normalize, accepts, shuffle, Deck, Session, readRecords, saveBest, shareUrl};
  root.WankoModel = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window === 'object' ? window : globalThis);
