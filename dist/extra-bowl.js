/* 次段階の隠し謎用の独立モジュール。通常得点・自己ベストへ一切干渉しない。 */
(() => {
  'use strict';
  let timer;
  window.WankoExtraBowl = Object.freeze({
    storageKey: 'wanko-extra-bowl-v1', // 将来の裏クリア用。今回の版では読み書きしない。
    show(host, delay) {
      clearTimeout(timer); host.hidden = true;
      timer = setTimeout(() => { host.hidden = false; }, delay);
    },
    hide(host) { clearTimeout(timer); host.hidden = true; }
  });
})();
