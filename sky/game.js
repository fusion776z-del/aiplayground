const G = {
  stageIndex: 0,
  enemies: [],
  map: null,
  player: {
    x: 180,
    y: 1000,
    w: 24,
    h: 32,
    dir: "down",
    trueGold: false, // 覚醒フラグ
    attackT: 0
  },
  bullets: []
};

// =========================
// Enemy生成
// =========================
function mkE(e){

  let enemy;

  if (typeof createEnemyFromPlacement === "function") {
    enemy = createEnemyFromPlacement(e);
  } else {
    enemy = { ...e, hp: 3 };
  }

  enemy.vx = 0;
  enemy.vy = 0;
  enemy.hitT = 0;

  return enemy;
}

// =========================
// ステージ読み込み
// =========================
function loadStage(stage){
  G.map = stage;

  // ✅ 完全安全
  G.enemies = (stage.enemies || []).map(mkE);
}

// =========================
// 波動砲
// =========================
function shootWave(){

  const p = G.player;
  const speed = 6;

  let vx = 0;
  let vy = 0;

  if (p.dir === "up") vy = -speed;
  if (p.dir === "down") vy = speed;
  if (p.dir === "left") vx = -speed;
  if (p.dir === "right") vx = speed;

  G.bullets.push({
    x: p.x + p.w/2,
    y: p.y + p.h/2,
    vx,
    vy,
    life: 60,
    size: 6
  });
}

// =========================
// 攻撃処理
// =========================
function attack(){

  const p = G.player;

  p.attackT = 20;

  // ✅ 覚醒してたら波動砲
  if (p.trueGold){
    shootWave();
  }
}

// =========================
// 更新
// =========================
function update(){

  const p = G.player;

  // 攻撃タイマー
  if (p.attackT > 0) p.attackT--;

  // 弾更新
  for (const b of G.bullets){
    b.x += b.vx;
    b.y += b.vy;
    b.life--;
  }

  // 弾削除
  G.bullets = G.bullets.filter(b => b.life > 0);

  // 敵との当たり判定
  for (const b of G.bullets){
    for (const e of G.enemies){

      if (e.hp <= 0) continue;

      if (hit(b, e)){
        e.hp -= 2;
        b.life = 0;
      }
    }
  }
}

// =========================
// 当たり判定
// =========================
function hit(a, b){
  return (
    a.x < b.x + b.w &&
    a.x + a.size > b.x &&
    a.y < b.y + b.h &&
    a.y + a.size > b.y
  );
}

// =========================
// 描画
// =========================
function draw(ctx){

  // 弾
  for (const b of G.bullets){
    ctx.fillStyle = "#00ffff";
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
    ctx.fill();
  }

  // 敵
  for (const e of G.enemies){
    ctx.fillStyle = e.color || "#f00";
    ctx.fillRect(e.x, e.y, e.w, e.h);
  }

  // プレイヤー
  const p = G.player;
  ctx.fillStyle = "#fff";
  ctx.fillRect(p.x, p.y, p.w, p.h);
}

// =========================
// 入力（テスト用）
// =========================
document.addEventListener("keydown", e => {
  if (e.key === "z"){
    attack();
  }

  if (e.key === "c"){
    // 覚醒トグル
    G.player.trueGold = !G.player.trueGold;
    console.log("覚醒:", G.player.trueGold);
  }
});

// =========================
// ループ
// =========================
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

function loop(){

  ctx.clearRect(0,0,canvas.width,canvas.height);

  update();
  draw(ctx);

  requestAnimationFrame(loop);
}

// =========================
// 起動
// =========================
loadStage(Stage1);
loop();
