// js/audio.js
// あとで音楽を増やす場合: assets/music に mp3/ogg を置いて、tracks に追加するだけ。
window.AudioManager = (() => {
  const tracks = {
    title: null, // 例: 'assets/music/title.mp3'
    stage1: null,
    stage2: null,
    stage3: null,
    stage4: null,
    stage5: null,
    clear: null
  };
  const sfx = {
    shot: null, // 例: 'assets/sfx/shot.wav'
    hit: null,
    damage: null
  };
  let bgm = null;
  let enabled = true;

  function playMusic(name) {
    if (!enabled) return;
    const src = tracks[name];
    if (!src) return; // 音源未設定でもゲームは動く
    if (bgm) { bgm.pause(); bgm = null; }
    bgm = new Audio(src);
    bgm.loop = true;
    bgm.volume = 0.55;
    bgm.play().catch(() => {});
  }

  function playSfx(name) {
    if (!enabled) return;
    const src = sfx[name];
    if (!src) return;
    const a = new Audio(src);
    a.volume = 0.75;
    a.play().catch(() => {});
  }

  function toggle() {
    enabled = !enabled;
    if (!enabled && bgm) bgm.pause();
    if (enabled && bgm) bgm.play().catch(() => {});
    return enabled;
  }

  return { tracks, sfx, playMusic, playSfx, toggle, get enabled(){return enabled;} };
})();
