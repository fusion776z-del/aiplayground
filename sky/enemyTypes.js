/* =========================================================
 enemyTypes.js
 敵の性能定義と、ステージ上の配置データから敵オブジェクトを作るための補助関数。

 使い方:
   1. index.html で game.js より前に読み込む
      <script src="enemyTypes.js"></script>
      <script src="game.js"></script>

   2. game.js のステージ読み込み時に、敵生成を以下のように変更する
      G.enemies = G.map.enemies.map(createEnemyFromPlacement);
========================================================= */

const EnemyTypes = {
  slime: {
    type: "slime",
    w: 24,
    h: 22,
    hp: 6,
    maxHp: 6,
    speed: 0.55,
    color: "#78df72",
    coin: 8,
    touchDamage: 1
  },

  fast: {
    type: "fast",
    w: 22,
    h: 22,
    hp: 4,
    maxHp: 4,
    speed: 1.1,
    color: "#ff8a62",
    coin: 10,
    touchDamage: 1
  },

  wind_bat: {
    type: "bat",
    w: 24,
    h: 18,
    hp: 5,
    maxHp: 5,
    speed: 0.9,
    color: "#80d8ff",
    coin: 12,
    touchDamage: 1,
    flying: true
  }
};

function createEnemyFromPlacement(placement) {
  let id;
  let x;
  let y;
  let options = {};

  // 形式1: { id: "slime", x: 100, y: 200 }
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
    vx: 0,
    vy: 0,
    hitT: 0,
    dead: false
  };
}
