// enemyTypes.js

const EnemyTypes = {
  slime: {
    type: "slime",
    w: 24,
    h: 22,
    hp: 3,
    maxHp: 3,
    atk: 2,
    speed: 0.9,
    color: "#78df72",
    coin: 5,
    touchDamage: 2
  },

  fast: {
    type: "fast",
    w: 24,
    h: 22,
    hp: 2,
    maxHp: 2,
    atk: 2,
    speed: 1.55,
    color: "#ffcc66",
    coin: 5,
    touchDamage: 2
  },

  wind_bat: {
    type: "bat",
    w: 24,
    h: 20,
    hp: 2,
    maxHp: 2,
    atk: 2,
    speed: 1.25,
    color: "#8de7ff",
    coin: 5,
    touchDamage: 2
  },

  // 👇ここから追加するだけで新敵になる
  blue_slime: {
    type: "slime",
    w: 24,
    h: 22,
    hp: 5,
    maxHp: 5,
    atk: 2,
    speed: 0.7,
    color: "#4aa3ff",
    coin: 8,
    touchDamage: 2
  },

  red_fast: {
    type: "fast",
    w: 24,
    h: 22,
    hp: 3,
    maxHp: 3,
    atk: 3,
    speed: 1.8,
    color: "#ff4444",
    coin: 12,
    touchDamage: 3
  },

  dark_bat: {
    type: "bat",
    w: 25,
    h: 20,
    hp: 4,
    maxHp: 4,
    atk: 2,
    speed: 1.4,
    color: "#6633cc",
    coin: 10,
    touchDamage: 2
  }
};

function createEnemyFromPlacement(e) {
  const base = EnemyTypes[e.id] || EnemyTypes.slime;

  return {
    id: e.id,
    x: e.x,
    y: e.y,

    ...base,

    hp: base.hp,
    maxHp: base.maxHp,

    vx: 0,
    vy: 0,
    t: 0,
    hitT: 0
  };
}
