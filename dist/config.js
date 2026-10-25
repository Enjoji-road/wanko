/* 調整はここから。時間を変えると自己ベストも時間別に保存されます。 */
window.WankoConfig = Object.freeze({
  durationSeconds: 60,
  shuffleMode: 'balanced', // balanced: 3問ごとに難度を混ぜる / random: 全体を均等シャッフル
  serveAnimationMs: 180,  // 見た目だけ。次の解答は待たずに入力できます。
  lidConfirmMs: 2800, // 蓋ボタンをこの時間内にもう一度押すと終了
  extraBowlDelayMs: 1700,
  publicUrl: '', // 実在する公開URLを確認してから設定。空欄でもゲームは遊べます。
  shareText: '謎解きわんこそば【４択・ドボン式】\n{seconds}秒チャレンジで{score}杯完食！🥢\n小謎のおかわり、いかがですか？',
  cheers: ['はい、じゃんじゃん！', 'はい、どんどん！', 'お見事！ もう一杯！', 'いい食べっぷり！', 'まだまだいけますよ〜！', 'つるっと、大正解！'],
  storageKey: 'wanko-choice-suddendeath-records-v1' // 入力式の旧記録は削除せず、そのまま残す
});
