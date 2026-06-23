/* =========================================================
 enemyTypes.js
 敵の性能定義と、ステージ上の配置データから敵オブジェクトを作るための補助関数。
========================================================= */

const EnemyTypes = {
  slime: {
    type: "slime", w: 24, h: 22, hp: 3, maxHp: 3,
    atk: 2, speed: 0.9, color: "#78df72", coin: 5, touchDamage: 2
  },

  fast: {
    type: "fast", w: 24, h: 22, hp: 2, maxHp: 2,
    atk: 2, speed: 1.55, color: "#ffcc66", coin: 5, touchDamage: 2
  },

  wind_bat: {
    type: "bat", w: 24, h: 20, hp: 2, maxHp: 2,
    atk: 2, speed: 1.25, color: "#8de7ff", coin: 5, touchDamage: 2,
    flying: true
  },

  blue_slime: {
    type: "slime", w: 24, h: 22, hp: 5, maxHp: 5,
    atk: 2, speed: 0.75, color: "#4aa3ff", coin: 8, touchDamage: 2
  },

  red_fast: {
    type: "fast", w: 24, h: 22, hp: 3, maxHp: 3,
    atk: 3, speed: 1.85, color: "#ff4444", coin: 12, touchDamage: 3
  },

  dark_bat: {
    type: "bat", w: 25, h: 20, hp: 4, maxHp: 4,
    atk: 3, speed: 1.35, color: "#6633cc", coin: 12, touchDamage: 3,
    flying: true
  },

  armored_slime: {
    type: "slime", w: 28, h: 24, hp: 9, maxHp: 9,
    atk: 3, speed: 0.55, color: "#8fa3ad", coin: 15, touchDamage: 3
  },

  fire_bat: {
    type: "bat", w: 26, h: 20, hp: 5, maxHp: 5,
    atk: 4, speed: 1.25, color: "#ff7048", coin: 16, touchDamage: 4,
    flying: true
  },

  crystal_slime: {
    type: "slime", w: 26, h: 23, hp: 7, maxHp: 7,
    atk: 3, speed: 0.8, color: "#72f7ff", coin: 14, touchDamage: 3
  },

  void_fast: {
    type: "fast", w: 25, h: 22, hp: 5, maxHp: 5,
    atk: 4, speed: 2.0, color: "#8b5cff", coin: 18, touchDamage: 4
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
    id,
    x,
    y,
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
