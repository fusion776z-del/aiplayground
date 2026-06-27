/* =========================================================/* =================================================ジェクトを作るための補助関数。
========================================================= */

const EnemyTypes = {
  slime: {
    type: "slime",
    archetype: "slime",
    name: "グリーンスライム",
    w: 24,
    h: 22,
    hp: 3,
    maxHp: 3,
    atk: 2,
    speed: 0.9,
    color: "#78df72",
    accent: "#d8ffd2",
    outline: "#1f6f3a",
    aura: "#9effa1",
    coin: 5,
    touchDamage: 2
  },

  blue_slime: {
    type: "slime",
    archetype: "crystal_slime",
    name: "アクアスライム",
    w: 25,
    h: 22,
    hp: 5,
    maxHp: 5,
    atk: 2,
    speed: 0.75,
    color: "#4aa3ff",
    accent: "#d8ffff",
    outline: "#1f4f9a",
    aura: "#72f7ff",
    coin: 8,
    touchDamage: 2
  },

  crystal_slime: {
    type: "slime",
    archetype: "crystal_slime",
    name: "クリスタルスライム",
    w: 28,
    h: 24,
    hp: 7,
    maxHp: 7,
    atk: 3,
    speed: 0.8,
    color: "#72f7ff",
    accent: "#ffffff",
    outline: "#237e9a",
    aura: "#b9fbff",
    coin: 14,
    touchDamage: 3,
    armor: 1
  },

  armored_slime: {
    type: "slime",
    archetype: "armored",
    name: "アイアンシェル",
    w: 30,
    h: 25,
    hp: 10,
    maxHp: 10,
    atk: 3,
    speed: 0.55,
    color: "#8fa3ad",
    accent: "#e8f3ff",
    outline: "#394852",
    aura: "#cfd8ff",
    coin: 18,
    touchDamage: 3,
    armor: 2
  },

  fast: {
    type: "fast",
    archetype: "runner",
    name: "スプリントファング",
    w: 25,
    h: 22,
    hp: 2,
    maxHp: 2,
    atk: 2,
    speed: 1.55,
    color: "#ffcc66",
    accent: "#fff7a8",
    outline: "#7a4a1d",
    aura: "#ffd84d",
    coin: 5,
    touchDamage: 2
  },

  red_fast: {
    type: "fast",
    archetype: "runner",
    name: "レッドファング",
    w: 26,
    h: 23,
    hp: 4,
    maxHp: 4,
    atk: 3,
    speed: 1.9,
    color: "#ff4444",
    accent: "#ffd1a1",
    outline: "#7f1f1f",
    aura: "#ff7048",
    coin: 14,
    touchDamage: 3
  },

  void_fast: {
    type: "fast",
    archetype: "void_runner",
    name: "ヴォイドランナー",
    w: 27,
    h: 23,
    hp: 6,
    maxHp: 6,
    atk: 4,
    speed: 2.05,
    color: "#8b5cff",
    accent: "#efe7ff",
    outline: "#171026",
    aura: "#b56bff",
    coin: 22,
    touchDamage: 4,
    phase: true
  },

  wind_bat: {
    type: "bat",
    archetype: "bat",
    name: "ウィンドバット",
    w: 26,
    h: 21,
    hp: 2,
    maxHp: 2,
    atk: 2,
    speed: 1.25,
    color: "#8de7ff",
    accent: "#ffffff",
    outline: "#1b607a",
    aura: "#9ef7ff",
    coin: 5,
    touchDamage: 2,
    flying: true
  },

  dark_bat: {
    type: "bat",
    archetype: "shadow_bat",
    name: "ダークバット",
    w: 27,
    h: 21,
    hp: 4,
    maxHp: 4,
    atk: 3,
    speed: 1.38,
    color: "#6633cc",
    accent: "#efe7ff",
    outline: "#171026",
    aura: "#b56bff",
    coin: 14,
    touchDamage: 3,
    flying: true
  },

  fire_bat: {
    type: "bat",
    archetype: "fire_bat",
    name: "フレイムバット",
    w: 28,
    h: 21,
    hp: 5,
    maxHp: 5,
    atk: 4,
    speed: 1.28,
    color: "#ff7048",
    accent: "#ffd84d",
    outline: "#7f3029",
    aura: "#ffb347",
    coin: 18,
    touchDamage: 4,
    flying: true,
    burn: true
  },

  spike_beast: {
    type: "beast",
    archetype: "beast",
    name: "スパイクビースト",
    w: 30,
    h: 26,
    hp: 8,
    maxHp: 8,
    atk: 4,
    speed: 1.05,
    color: "#b56bff",
    accent: "#fff7a8",
    outline: "#2a143d",
    aura: "#b56bff",
    coin: 24,
    touchDamage: 4
  },

  rune_mage: {
    type: "mage",
    archetype: "mage",
    name: "ルーンメイジ",
    w: 26,
    h: 30,
    hp: 7,
    maxHp: 7,
    atk: 4,
    speed: 0.72,
    color: "#63d8ff",
    accent: "#fff7a8",
    outline: "#123a54",
    aura: "#9ef7ff",
    coin: 26,
    touchDamage: 3,
    caster: true
  },

  shadow_knight: {
    type: "knight",
    archetype: "knight",
    name: "シャドウナイト",
    w: 30,
    h: 32,
    hp: 14,
    maxHp: 14,
    atk: 5,
    speed: 0.82,
    color: "#44445c",
    accent: "#b56bff",
    outline: "#11111c",
    aura: "#8b5cff",
    coin: 32,
    touchDamage: 5,
    armor: 3
  },

  star_drone: {
    type: "drone",
    archetype: "drone",
    name: "スタードローン",
    w: 27,
    h: 27,
    hp: 6,
    maxHp: 6,
    atk: 4,
    speed: 1.18,
    color: "#cfd8ff",
    accent: "#fff7a8",
    outline: "#35266f",
    aura: "#cfd8ff",
    coin: 28,
    touchDamage: 4,
    flying: true
  },

  abyss_wraith: {
    type: "wraith",
    archetype: "wraith",
    name: "アビスレイス",
    w: 30,
    h: 32,
    hp: 11,
    maxHp: 11,
    atk: 5,
    speed: 1.12,
    color: "#171026",
    accent: "#efe7ff",
    outline: "#05020a",
    aura: "#b56bff",
    coin: 36,
    touchDamage: 5,
    phase: true
  }
};

function createEnemyFromPlacement(placement) {
  let id;
  let x;
  let y;
  let options = {};

  if (!Array.isArray(placement)) {
    id = placement.id;
    x = placement.x;
    y = placement.y;
    options = placement.options || {};
  } else {
    id = placement[0];
    x = placement[1];
    y = placement[2];
    options = placement[3] || {};
  }

  const base = EnemyTypes[id] || EnemyTypes.slime;

  return {
    ...base,
    ...options,
    id: id,
    x: x,
    y: y,
    hp: options.hp ?? base.hp,
    maxHp: options.maxHp ?? base.maxHp ?? base.hp,
    atk: options.atk ?? base.atk ?? base.touchDamage ?? 1,
    vx: 0,
    vy: 0,
    t: 0,
    hitT: 0,
    wake: false,
    attackPause: 0,
    dead: false
  };
}