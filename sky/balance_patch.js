"use strict";

/*
=========================================================
balance_patch.js
ステージ難易度バランス調整版

目的:
- ステージ1の敵の攻撃密度を下げる
- 序盤の追跡距離を短くして囲まれにくくする
- ステージが進むほど敵HP/速度/攻撃力/追跡距離を上げる
- 強化で後半が簡単になりすぎないように補正
- 既存の stage1.js〜stage7.js / game.js を大改造せずに適用
=========================================================
*/

(function(){
  if(window.__skyIslandBalancePatchApplied) return;
  window.__skyIslandBalancePatchApplied = true;

  /*
  ---------------------------------------------------------
  ステージ別バランス
  index 0 = ステージ1
  index 6 = ステージ7
  ---------------------------------------------------------
  */

  const BALANCE = [
    {
      name:"Stage 1",
      enemyHpMul:0.70,
      enemyAtkMul:0.55,
      enemySpeedMul:0.68,
      enemyAggro:135,
      enemyGiveUp:195,
      enemyContactInv:92,
      bossHpMul:0.78,
      bossAtkMul:0.55,
      bossShotMul:1.55,
      coinBonus:1.00
    },
    {
      name:"Stage 2",
      enemyHpMul:0.90,
      enemyAtkMul:0.75,
      enemySpeedMul:0.82,
      enemyAggro:155,
      enemyGiveUp:220,
      enemyContactInv:84,
      bossHpMul:0.95,
      bossAtkMul:0.78,
      bossShotMul:1.30,
      coinBonus:1.00
    },
    {
      name:"Stage 3",
      enemyHpMul:1.08,
      enemyAtkMul:0.95,
      enemySpeedMul:0.96,
      enemyAggro:178,
      enemyGiveUp:250,
      enemyContactInv:78,
      bossHpMul:1.12,
      bossAtkMul:1.00,
      bossShotMul:1.12,
      coinBonus:1.00
    },
    {
      name:"Stage 4",
      enemyHpMul:1.32,
      enemyAtkMul:1.15,
      enemySpeedMul:1.06,
      enemyAggro:205,
      enemyGiveUp:285,
      enemyContactInv:72,
      bossHpMul:1.35,
      bossAtkMul:1.18,
      bossShotMul:1.00,
      coinBonus:1.05
    },
    {
      name:"Stage 5",
      enemyHpMul:1.62,
      enemyAtkMul:1.35,
      enemySpeedMul:1.16,
      enemyAggro:230,
      enemyGiveUp:320,
      enemyContactInv:66,
      bossHpMul:1.60,
      bossAtkMul:1.35,
      bossShotMul:0.92,
      coinBonus:1.08
    },
    {
      name:"Stage 6",
      enemyHpMul:1.95,
      enemyAtkMul:1.55,
      enemySpeedMul:1.26,
      enemyAggro:255,
      enemyGiveUp:355,
      enemyContactInv:62,
      bossHpMul:1.90,
      bossAtkMul:1.55,
      bossShotMul:0.84,
      coinBonus:1.12
    },
    {
      name:"Stage 7",
      enemyHpMul:2.30,
      enemyAtkMul:1.80,
      enemySpeedMul:1.34,
      enemyAggro:285,
      enemyGiveUp:395,
      enemyContactInv:58,
      bossHpMul:2.25,
      bossAtkMul:1.85,
      bossShotMul:0.76,
      coinBonus:1.15
    }
  ];

  function getStageIndex(){
    if(typeof G !== "undefined" && typeof G.stageIndex === "number"){
      return Math.max(0, Math.min(BALANCE.length - 1, G.stageIndex));
    }
    return 0;
  }

  function getBalance(){
    return BALANCE[getStageIndex()] || BALANCE[0];
  }

  function clamp(v,a,b){
    return Math.max(a, Math.min(b, v));
  }

  function norm(x,y){
    const l = Math.hypot(x,y) || 1;
    return {x:x/l,y:y/l,l};
  }

  function rectHit(a,b){
    return a && b &&
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y;
  }

  function playerHitBox(){
    const p = G.player;
    return {
      x:p.x + 4,
      y:p.y + 8,
      w:p.w - 8,
      h:p.h - 10
    };
  }

  /*
  ---------------------------------------------------------
  敵生成を再調整
  ---------------------------------------------------------
  */

  const originalMkE = window.mkE;

  window.mkE = function patchedMkE(e){
    const st = getStageIndex();
    const b = getBalance();

    let enemy;

    if(typeof originalMkE === "function"){
      enemy = originalMkE(e);
    }else{
      enemy = {...e};
    }

    const id = e && e.id ? e.id : enemy.id;

    if(id === "wind_bat"){
      enemy.type = "bat";
      enemy.w = enemy.w || 24;
      enemy.h = enemy.h || 20;
      enemy.hp = enemy.hp || 2;
      enemy.atk = enemy.atk || 2;
      enemy.speed = enemy.speed || 1.25;
      enemy.color = enemy.color || "#8de7ff";
    }else if(id === "fast"){
      enemy.type = "fast";
      enemy.w = enemy.w || 24;
      enemy.h = enemy.h || 22;
      enemy.hp = enemy.hp || 2;
      enemy.atk = enemy.atk || 2;
      enemy.speed = enemy.speed || 1.55;
      enemy.color = enemy.color || "#ffcc66";
    }else{
      enemy.type = enemy.type || "slime";
      enemy.w = enemy.w || 24;
      enemy.h = enemy.h || 22;
      enemy.hp = enemy.hp || 3;
      enemy.atk = enemy.atk || 2;
      enemy.speed = enemy.speed || 0.9;
      enemy.color = enemy.color || "#78df72";
    }

    /*
    序盤はかなり控えめ。
    後半は強化込みで戦える程度に伸ばす。
    */
    enemy.baseHp = enemy.hp;
    enemy.baseAtk = enemy.atk;
    enemy.baseSpeed = enemy.speed;

    enemy.hp = Math.max(1, Math.round(enemy.baseHp * b.enemyHpMul));
    enemy.maxHp = enemy.hp;

    enemy.atk = Math.max(1, Math.round(enemy.baseAtk * b.enemyAtkMul));

    enemy.speed = Math.max(0.45, enemy.baseSpeed * b.enemySpeedMul);

    /*
    fast / bat は序盤で暴れやすいのでステージ1だけ追加抑制。
    */
    if(st === 0){
      if(enemy.type === "fast"){
        enemy.speed *= 0.82;
        enemy.hp = Math.max(1, enemy.hp - 1);
      }
      if(enemy.type === "bat"){
        enemy.speed *= 0.78;
        enemy.atk = 1;
      }
    }

    /*
    後半の雑魚は少しだけ硬くする。
    */
    if(st >= 4){
      if(enemy.type === "fast"){
        enemy.hp += 1;
      }
      if(enemy.type === "bat"){
        enemy.speed *= 1.05;
      }
    }

    enemy.t = enemy.t || 0;
    enemy.hitT = enemy.hitT || 0;
    enemy.wake = false;
    enemy.attackPause = 0;
    enemy.balanceApplied = true;

    return enemy;
  };

  /*
  ---------------------------------------------------------
  load を差し替え
  既存ステージ読み込み後に、敵とボス値を補正
  ---------------------------------------------------------
  */

  const originalLoad = window.load;

  window.load = function patchedLoad(s, keep){
    originalLoad(s, keep);

    try{
      applyBalanceToCurrentStage();

      if(typeof msg === "function"){
        const b = getBalance();
        if(getStageIndex() === 0){
          msg("バランス調整: 序盤は敵がゆるめになりました", 100);
        }else{
          msg("バランス調整: 敵が少し強くなっています", 90);
        }
      }
    }catch(err){
      console.warn("[balance_patch load]", err);
    }
  };

  function applyBalanceToCurrentStage(){
    if(typeof G === "undefined" || !G.player) return;

    /*
    プレイヤーの初期体力を少しだけ上げる。
    ステージ1の事故死対策。
    */
    if(getStageIndex() === 0 && !G.player.__balanceStartBoost){
      G.player.__balanceStartBoost = true;
      G.player.maxHp = Math.max(G.player.maxHp, 18);
      G.player.hp = Math.max(G.player.hp, G.player.maxHp);
      G.player.inv = Math.max(G.player.inv || 0, 100);
    }

    /*
    既に生成済みの敵にも補正。
    */
    if(Array.isArray(G.enemies)){
      G.enemies = G.enemies.map(e => {
        if(!e) return e;
        if(!e.balanceApplied){
          return window.mkE(e);
        }
        return e;
      });
    }

    if(G.boss){
      applyBossBalance(G.boss);
    }
  }

  /*
  ---------------------------------------------------------
  敵AIを差し替え
  ステージ1:
  - 遠くから全員が寄ってこない
  - 接触ダメージ後の無敵時間を長め
  - ヒット時に少し止まる

  後半:
  - 追跡距離増加
  - 速度増加
  ---------------------------------------------------------
  */

  window.updEnemies = function patchedUpdEnemies(){
    if(typeof G === "undefined" || !G.player) return;

    const p = G.player;
    const box = playerHitBox();
    const b = getBalance();
    const st = getStageIndex();

    for(let i = G.enemies.length - 1; i >= 0; i--){
      const e = G.enemies[i];

      if(!e){
        G.enemies.splice(i,1);
        continue;
      }

      e.t = (e.t || 0) + 1;

      if(e.hitT > 0){
        e.hitT--;
      }

      if(e.attackPause > 0){
        e.attackPause--;
      }

      const pcx = p.x + p.w / 2;
      const pcy = p.y + p.h / 2;
      const ecx = e.x + e.w / 2;
      const ecy = e.y + e.h / 2;

      const toP = norm(pcx - ecx, pcy - ecy);
      const d = toP.l;

      /*
      追跡開始距離。
      序盤は短め、後半は長め。
      */
      if(d < b.enemyAggro){
        e.wake = true;
      }

      /*
      離れたら追跡解除。
      */
      if(d > b.enemyGiveUp){
        e.wake = false;
      }

      /*
      ステージ1は敵の初動に待ち時間を入れる。
      開幕から全員集合しにくくする。
      */
      if(st === 0 && e.t < 25){
        e.wake = false;
      }

      /*
      起きていない敵はゆるく徘徊。
      */
      if(!e.wake){
        const idleSpeed = st === 0 ? 0.16 : 0.24;
        e.x += Math.sin(e.t * 0.025 + i) * idleSpeed;
        e.y += Math.cos(e.t * 0.021 + i) * idleSpeed;
        continue;
      }

      /*
      被弾直後は少し止まる。
      序盤は長め、後半は短め。
      */
      if(e.hitT > 0){
        const stopRate = st <= 1 ? 0.18 : 0.35;
        e.x += toP.x * e.speed * stopRate;
        e.y += toP.y * e.speed * stopRate;
      }else{
        let sx = toP.x * e.speed;
        let sy = toP.y * e.speed;

        if(e.type === "bat"){
          sx += Math.sin(e.t * 0.12) * (st === 0 ? 0.35 : 0.55);
          sy += Math.cos(e.t * 0.10) * (st === 0 ? 0.35 : 0.55);
        }

        if(e.type === "fast"){
          const pulse = 1 + Math.sin(e.t * 0.08) * 0.16;
          sx *= pulse;
          sy *= pulse;
        }

        e.x += sx;
        e.y += sy;
      }

      /*
      接触ダメージ。
      game.js 側の hurt はプレイヤーinvを見ているので、
      ここではステージ別に無敵時間を追加調整。
      */
      if(p.inv <= 0 && rectHit(box, e)){
        if(typeof hurt === "function"){
          hurt(e.atk || 1);
        }

        /*
        序盤は連続ヒットしにくくする。
        */
        p.inv = Math.max(p.inv || 0, b.enemyContactInv);

        /*
        接触後、敵を少し押し返して多段ヒット感を減らす。
        */
        const push = st === 0 ? 18 : 10;
        e.x -= toP.x * push;
        e.y -= toP.y * push;
      }
    }
  };

  /*
  ---------------------------------------------------------
  ボス補正
  ---------------------------------------------------------
  */

  const originalSpawnBoss = window.spawnBoss;

  window.spawnBoss = function patchedSpawnBoss(){
    if(typeof originalSpawnBoss === "function"){
      originalSpawnBoss();
    }

    if(typeof G !== "undefined" && G.boss){
      applyBossBalance(G.boss);
    }
  };

  function applyBossBalance(boss){
    if(!boss || boss.__balanceBossApplied) return;

    const st = getStageIndex();
    const b = getBalance();

    boss.__balanceBossApplied = true;

    const baseMaxHp = boss.maxHp || boss.hp || 30;
    const baseHp = boss.hp || baseMaxHp;

    boss.maxHp = Math.max(8, Math.round(baseMaxHp * b.bossHpMul));
    boss.hp = Math.max(1, Math.round(baseHp * b.bossHpMul));

    if(boss.hp > boss.maxHp){
      boss.hp = boss.maxHp;
    }

    boss.baseAtk = boss.baseAtk || boss.atk || 2;
    boss.atk = Math.max(1, Math.round(boss.baseAtk * b.bossAtkMul));

    /*
    shot が小さいほど連射が速い実装が多いので、
    ステージ1は大きめ、後半は小さめにする。
    */
    if(typeof boss.shot === "number"){
      boss.shot = Math.max(30, Math.round(boss.shot * b.bossShotMul));
    }else{
      boss.shot = st === 0 ? 120 : 90;
    }

    /*
    追加のボス弾パッチがある場合に使える値。
    */
    boss.balanceShotMul = b.bossShotMul;
    boss.balanceAtkMul = b.bossAtkMul;
  }

  /*
  ---------------------------------------------------------
  ダメージ計算補正
  後半でプレイヤー防御が高くなりすぎて1ダメ固定化しないようにする。
  ただしステージ1はかなり優しくする。
  ---------------------------------------------------------
  */

  const originalHurt = window.hurt;

  window.hurt = function patchedHurt(d){
    if(typeof G === "undefined" || !G.player) return;
    const p = G.player;

    if(p.inv > 0) return;

    const st = getStageIndex();
    const b = getBalance();

    let raw = Number(d || 1);

    /*
    ステージ倍率。
    */
    raw *= b.enemyAtkMul;

    /*
    防御の効き方を後半だけ少し弱める。
    序盤は防御がしっかり効く。
    */
    const defPower = st <= 1 ? 1.10 : st <= 3 ? 0.95 : 0.75;
    const reduced = raw - (p.def || 0) * defPower;

    let finalDamage;

    if(st === 0){
      finalDamage = Math.max(1, Math.round(reduced));
    }else if(st <= 2){
      finalDamage = Math.max(1, Math.round(reduced));
    }else if(st <= 4){
      finalDamage = Math.max(2, Math.round(reduced));
    }else{
      finalDamage = Math.max(2, Math.round(reduced));
    }

    /*
    体力満タンからの即死感を減らす安全弁。
    */
    if(st === 0){
      finalDamage = Math.min(finalDamage, 3);
    }else if(st === 1){
      finalDamage = Math.min(finalDamage, 4);
    }

    p.hp -= finalDamage;
    p.inv = getBalance().enemyContactInv;

    if(typeof msg === "function"){
      msg("HIT -" + finalDamage, 30);
    }

    if(p.hp <= 0){
      p.hp = 0;
      G.state = "gameover";
    }
  };

  /*
  ---------------------------------------------------------
  プレイヤー強化の伸びをマイルド化
  後半が簡単になりすぎる原因を抑える
  ---------------------------------------------------------
  */

  window.checkAwaken = function patchedCheckAwaken(){
    if(typeof G === "undefined" || !G.player) return;

    const p = G.player;

    /*
    呪い解除。
    元コードより上昇量を少し抑える。
    */
    if(!p.curseLifted && p.swordLv >= 3 && p.shieldLv >= 3){
      p.curseLifted = true;

      p.maxHp += 8;
      p.hp = p.maxHp;

      p.maxMp += 4;
      p.mp = p.maxMp;

      p.atk += 3;
      p.def += 2;
      p.magic += 2;
      p.speed += 0.35;

      if(typeof msg === "function"){
        msg("たぬきの呪いが解けた！", 150);
      }
    }

    /*
    金色覚醒。
    強いが、敵スケール込みで無双しすぎない量にする。
    */
    if(!p.trueGold && p.curseLifted && p.bookLv >= 3){
      p.trueGold = true;

      p.maxHp += 7;
      p.hp = p.maxHp;

      p.maxMp += 5;
      p.mp = p.maxMp;

      p.atk += 3;
      p.def += 2;
      p.magic += 4;
      p.speed += 0.22;

      if(typeof msg === "function"){
        msg("金色覚醒！", 150);
      }
    }
  };

  /*
  ---------------------------------------------------------
  ショップ価格と強化量を調整
  序盤で少し買いやすく、後半の伸びすぎを抑制
  ---------------------------------------------------------
  */

  window.shopItems = function patchedShopItems(){
    const p = G.player;

    return [
      {
        name:"剣を強化",
        cost:50 + p.swordLv * 65 + Math.max(0, p.swordLv - 2) * 35,
        desc:"攻撃力+1 / 後半も敵が強くなる",
        buy(){
          p.swordLv++;
          p.atk++;
          if(typeof checkAwaken === "function") checkAwaken();
        }
      },
      {
        name:"盾を強化",
        cost:55 + p.shieldLv * 70 + Math.max(0, p.shieldLv - 2) * 35,
        desc:"防御力+1 HP+1",
        buy(){
          p.shieldLv++;
          p.armorLv = p.shieldLv;
          p.def++;
          p.maxHp++;
          p.hp++;
          if(typeof checkAwaken === "function") checkAwaken();
        }
      },
      {
        name:"魔法を強化",
        cost:65 + p.bookLv * 85 + Math.max(0, p.bookLv - 2) * 45,
        desc:"魔法+1 MP+1 / Lv3で金色覚醒",
        buy(){
          p.bookLv++;
          p.magic++;
          p.magicLv++;
          p.magicRadius += 8;
          p.maxMp++;
          p.mp++;
          if(typeof checkAwaken === "function") checkAwaken();
        }
      }
    ];
  };

  /*
  ---------------------------------------------------------
  攻撃の調整
  範囲なぎ払いが後半で強すぎるため、
  ステージ後半ほど敵HP側で受ける前提にしつつ、
  範囲だけ少し抑える。
  ---------------------------------------------------------
  */

  const originalAttack = window.attack;

  window.attack = function patchedAttack(){
    /*
    元の攻撃処理を大きく壊さないため基本は既存処理。
    ただし攻撃前に一時的にパラメータを調整する。
    */
    if(typeof G === "undefined" || !G.player || typeof originalAttack !== "function"){
      return;
    }

    const p = G.player;
    const st = getStageIndex();

    const originalAtk = p.atk;
    const originalMagicRadius = p.magicRadius;

    /*
    後半で通常攻撃が強すぎる場合の軽い補正。
    数値は小さめ。爽快感は残す。
    */
    if(st >= 4){
      p.atk = Math.max(1, Math.round(p.atk * 0.92));
    }

    /*
    金色時の範囲が広すぎて後半雑魚が溶けすぎる対策。
    */
    if(st >= 4 && p.trueGold){
      p.magicRadius = Math.max(18, Math.round(p.magicRadius * 0.90));
    }

    originalAttack();

    p.atk = originalAtk;
    p.magicRadius = originalMagicRadius;
  };

  /*
  ---------------------------------------------------------
  魔法の調整
  序盤は使いやすく、後半は敵HPスケールでバランス。
  ---------------------------------------------------------
  */

  const originalMagic = window.magic;

  window.magic = function patchedMagic(){
    if(typeof G === "undefined" || !G.player || typeof originalMagic !== "function"){
      return;
    }

    const p = G.player;
    const st = getStageIndex();

    const oldMagic = p.magic;

    /*
    ステージ1は魔法を少し頼れるようにする。
    */
    if(st === 0){
      p.magic += 1;
    }

    /*
    後半の魔法ワンパン化を少し抑える。
    */
    if(st >= 5){
      p.magic = Math.max(1, Math.round(p.magic * 0.94));
    }

    originalMagic();

    p.magic = oldMagic;
  };

  /*
  ---------------------------------------------------------
  コイン取得補正
  序盤の強化不足を少し防ぐ。
  後半は敵が硬いぶん少しだけ増やす。
  ---------------------------------------------------------
  */

  const originalUpdDrops = window.updDrops;

  window.updDrops = function patchedUpdDrops(){
    if(typeof G === "undefined" || !G.player){
      if(typeof originalUpdDrops === "function") originalUpdDrops();
      return;
    }

    const before = G.player.coins;

    if(typeof originalUpdDrops === "function"){
      originalUpdDrops();
    }

    const after = G.player.coins;
    const gained = after - before;

    if(gained > 0){
      const bonusRate = getBalance().coinBonus;
      const bonus = Math.floor(gained * (bonusRate - 1));

      if(bonus > 0){
        G.player.coins += bonus;
      }
    }
  };

  /*
  ---------------------------------------------------------
  毎フレーム保険
  途中で生成された敵・ボスにも補正
  ---------------------------------------------------------
  */

  const originalUpdate = window.update;

  window.update = function patchedUpdate(){
    if(typeof originalUpdate === "function"){
      originalUpdate();
    }

    try{
      if(typeof G === "undefined") return;

      if(G.state === "field" || G.state === "bossDefeat" || G.state === "clear"){
        if(Array.isArray(G.enemies)){
          for(let i = 0; i < G.enemies.length; i++){
            const e = G.enemies[i];
            if(e && !e.balanceApplied){
              G.enemies[i] = window.mkE(e);
            }
          }
        }

        if(G.boss){
          applyBossBalance(G.boss);
        }
      }
    }catch(err){
      console.warn("[balance_patch update]", err);
    }
  };

  /*
  ---------------------------------------------------------
  表示用メモ
  ---------------------------------------------------------
  */

  console.log("[Sky Island] balance_patch.js applied");
})();