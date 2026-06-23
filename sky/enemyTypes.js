/* =========================================================
 enemyTypes.js
 敵の性能定義と、ステージ上の配置データから敵オブジェクトを作るための補助関数。

 目的:
 - stage1.js〜stage7.js は敵の「配置」だけを持つ
 - 敵のHP/攻撃/速度/サイズ/色などはこのファイルで一元管理する
 - game.js は createEnemyFromPlacement() で配置 + 性能を合成する
========================================================= */

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
    touchDamage: 2,
    flying: true
  }
};

function createEnemyFromPlacement(placement) {
  let id;
  let x;
  let y;
  let options = {};

  // 形式1: { id: "slime", x: 100, y: 200, options: { hp: 20 } }
  if (!Array.isArray(placement)) {
    id = placement.id;
    x = placement.x;
    y = placement.y;
    options = placement.options || {};
  }

  // 形式2: ["slime", 100, 200, { hp: 20 }]
  if (Array.isArray(placement)) {
    id = placement[0];
    x = placement[1];
    y = placement[2];
    options = placement[3] || {};
  }

  const base = EnemyTypes[id] || EnemyTypes.slime;

  return {
    id,
    x,
    y,

    // EnemyTypes 側の標準性能
    ...base,

    // ステージ配置側の個別上書き
    ...options,

    // ランタイム用状態
    hp: options.hp ?? base.hp,
    maxHp: options.maxHp ?? base.maxHp ?? base.hp,
    atk: options.atk ?? base.atk ?? base.touchDamage ?? 1,
    vx: 0,
    vy: 0,
    t: 0,
    hitT: 0,
    dead: false
  };
}
