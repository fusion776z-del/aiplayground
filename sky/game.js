// =========================
// グローバル状態
// =========================
const G = {
  stageIndex: 0,
  enemies: [],
  map: null
};

// =========================
// バランス（そのまま流用）
// =========================
function getBalance(){
  return {
    enemyHpMul: 1,
    enemyAtkMul: 1,
    enemySpeedMul: 1
  };
}

// =========================
// ★ここが最重要：敵生成
// =========================
function mkE(e){

  const b = getBalance();
  const st = G.stageIndex || 0;

  // ✅ EnemyTypes使用（なければフォールバック）
  let enemy;

  if (typeof createEnemyFromPlacement === "function") {
    enemy = createEnemyFromPlacement(e);
  } else {
    // fallback
    if (e.id === "wind_bat") {
      enemy = { ...e, type:"bat", w:24, h:20, hp:2, maxHp:2, atk:2, speed:1.25, color:"#8de7ff" };
    } else if (e.id === "fast") {
      enemy = { ...e, type:"fast", w:24, h:22, hp:2, maxHp:2, atk:2, speed:1.55, color:"#ffcc66" };
    } else {
      enemy = { ...e, type:"slime", w:24, h:22, hp:3, maxHp:3, atk:2, speed:0.9, color:"#78df72" };
    }
  }

  // ===== 安全補正 =====
  enemy.type = enemy.type || enemy.id || "slime";
  enemy.w = enemy.w || 24;
  enemy.h = enemy.h || 22;
  enemy.hp = enemy.hp || 1;
  enemy.maxHp = enemy.maxHp || enemy.hp;
  enemy.atk = enemy.atk || 1;
  enemy.speed = enemy.speed || 0.9;

  enemy.vx = 0;
  enemy.vy = 0;
  enemy.t = 0;
  enemy.hitT = 0;

  // ===== バランス適用 =====
  enemy.hp = Math.max(1, Math.round(enemy.hp * b.enemyHpMul));
  enemy.maxHp = enemy.hp;
  enemy.atk = Math.max(1, Math.round(enemy.atk * b.enemyAtkMul));
  enemy.speed = Math.max(0.45, enemy.speed * b.enemySpeedMul);

  // ===== ステージ補正 =====
  if (st === 0) {
    if (enemy.type === "fast") {
      enemy.speed *= 0.8;
      enemy.hp -= 1;
    }
    if (enemy.type === "bat") {
      enemy.speed *= 0.75;
      enemy.atk = 1;
    }
  }

  if (st >= 4) {
    if (enemy.type === "fast") {
      enemy.hp += 1;
      enemy.maxHp = enemy.hp;
    }
  }

  return enemy;
}

// =========================
// ステージ読み込み
// =========================
function loadStage(stage){

  G.map = stage;

  // ✅ 絶対落ちない書き方
  G.enemies = (stage.enemies || []).map(mkE);

  console.log("loaded enemies:", G.enemies);
}

// =========================
// ステージ初期化
// =========================
function start(){

  const stages = [
    Stage1,
    Stage2,
    Stage3,
    Stage4,
    Stage5,
    Stage6,
    Stage7
  ];

  loadStage(stages[G.stageIndex]);
}

// =========================
// 更新（超簡易）
// =========================
function update(){

  for (const e of G.enemies){
    e.x += 0;
  }

}

// =========================
// ループ
// =========================
function loop(){

  update();
  requestAnimationFrame(loop);
}

// =========================
// 起動
// =========================
start();
loop();
