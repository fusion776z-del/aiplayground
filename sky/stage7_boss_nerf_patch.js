"use strict";

/*
=========================================================
stage7_boss_nerf_patch.js

目的:
- ステージ7のボスだけ少し弱くする
- 既存の game.js / balance_patch.js / dash_attack_patch.js を壊さない
- ステージ1〜6には影響させない

調整内容:
- ステージ7ボスの最大HPを少し下げる
- 攻撃力を少し下げる
- 弾・攻撃間隔がある場合は少し遅くする
- 移動の揺れ幅を少し小さくする
- ダッシュ斬りや通常攻撃の価値は残す

想定:
- G.stageIndex === 6 がステージ7
=========================================================
*/

(function(){
  if(window.__stage7BossNerfPatchApplied) return;
  window.__stage7BossNerfPatchApplied = true;

  /*
  ---------------------------------------------------------
  調整値
  ---------------------------------------------------------
  */

  const STAGE7_INDEX = 6;

  /*
  0.85 = HPを15%減らす。
  強すぎる場合は 0.78 くらいまで下げてOK。
  */
  const STAGE7_BOSS_HP_RATE = 0.85;

  /*
  0.82 = 攻撃力を18%減らす。
  被ダメが重すぎる場合は 0.75 くらいまで下げてOK。
  */
  const STAGE7_BOSS_ATK_RATE = 0.82;

  /*
  shot が小さいほど攻撃頻度が高い実装に備えて、
  数字を大きくして少し間隔を伸ばす。
  */
  const STAGE7_BOSS_SHOT_RATE = 1.22;

  /*
  ボス移動の揺れ幅を少し抑える。
  0.88 = 12%減。
  */
  const STAGE7_BOSS_MOVE_RATE = 0.88;

  /*
  最低保証。
  弱くしすぎてボス感が消えないようにする。
  */
  const MIN_BOSS_HP = 40;
  const MIN_BOSS_ATK = 2;
  const MIN_BOSS_SHOT = 36;

  function isStage7(){
    return (
      typeof G !== "undefined" &&
      typeof G.stageIndex === "number" &&
      G.stageIndex === STAGE7_INDEX
    );
  }

  function safeRound(v){
    return Math.max(1, Math.round(Number(v) || 1));
  }

  /*
  ---------------------------------------------------------
  ステージ7ボス補正
  ---------------------------------------------------------
  */

  function applyStage7BossNerf(){
    if(!isStage7()) return;
    if(typeof G === "undefined" || !G.boss) return;

    const b = G.boss;

    /*
    同じボスに何度も倍率をかけない。
    */
    if(b.__stage7BossNerfed) return;
    b.__stage7BossNerfed = true;

    /*
    元値を保存。
    デバッグや後続調整で確認しやすいようにする。
    */
    b.__stage7OriginalMaxHp = b.maxHp || b.hp || 1;
    b.__stage7OriginalHp = b.hp || b.maxHp || 1;
    b.__stage7OriginalAtk = b.atk || 2;
    b.__stage7OriginalShot = typeof b.shot === "number" ? b.shot : null;

    /*
    HP調整。
    現在HPと最大HPの両方を下げる。
    */
    const originalMaxHp = b.maxHp || b.hp || 1;
    const originalHp = b.hp || originalMaxHp;

    b.maxHp = Math.max(
      MIN_BOSS_HP,
      safeRound(originalMaxHp * STAGE7_BOSS_HP_RATE)
    );

    b.hp = Math.max(
      1,
      safeRound(originalHp * STAGE7_BOSS_HP_RATE)
    );

    if(b.hp > b.maxHp){
      b.hp = b.maxHp;
    }

    /*
    攻撃力調整。
    boss.atk がある場合だけ反映。
    */
    if(typeof b.atk === "number"){
      b.atk = Math.max(
        MIN_BOSS_ATK,
        safeRound(b.atk * STAGE7_BOSS_ATK_RATE)
      );
    }

    /*
    弾・攻撃間隔調整。
    shot がある場合、少し遅くする。
    */
    if(typeof b.shot === "number"){
      b.shot = Math.max(
        MIN_BOSS_SHOT,
        safeRound(b.shot * STAGE7_BOSS_SHOT_RATE)
      );
    }

    /*
    移動補正用。
    updBoss の差し替え側で使う。
    */
    b.__stage7BossMoveRate = STAGE7_BOSS_MOVE_RATE;

    if(typeof msg === "function"){
      msg("ステージ7ボスを少し調整しました", 90);
    }

    console.log("[Stage7 Boss Nerf]", {
      maxHp:b.__stage7OriginalMaxHp + " -> " + b.maxHp,
      hp:b.__stage7OriginalHp + " -> " + b.hp,
      atk:b.__stage7OriginalAtk + " -> " + b.atk,
      shot:b.__stage7OriginalShot + " -> " + b.shot
    });
  }

  /*
  ---------------------------------------------------------
  spawnBoss 後に補正
  ---------------------------------------------------------
  */

  const originalSpawnBoss = window.spawnBoss;

  window.spawnBoss = function patchedSpawnBossStage7Nerf(){
    if(typeof originalSpawnBoss === "function"){
      originalSpawnBoss();
    }

    applyStage7BossNerf();
  };

  /*
  ---------------------------------------------------------
  load 後にも保険で補正
  ---------------------------------------------------------
  */

  const originalLoad = window.load;

  window.load = function patchedLoadStage7Nerf(s, keep){
    if(typeof originalLoad === "function"){
      originalLoad(s, keep);
    }

    applyStage7BossNerf();
  };

  /*
  ---------------------------------------------------------
  ボス移動を少しだけマイルドにする

  元の game.js では updBoss() 内で、
  ボス位置が cos / sin で揺れる処理になっている。
  ここではステージ7だけ揺れ幅を少し小さくする。
  ---------------------------------------------------------
  */

  const originalUpdBoss = window.updBoss;

  window.updBoss = function patchedUpdBossStage7Nerf(){
    /*
    ステージ7以外は元処理。
    */
    if(!isStage7()){
      if(typeof originalUpdBoss === "function"){
        originalUpdBoss();
      }
      return;
    }

    if(typeof G === "undefined" || !G.boss){
      return;
    }

    const b = G.boss;
    const r = G.map && G.map.bossRoom;

    /*
    bossRoom が取れない場合は元処理に任せる。
    */
    if(!r){
      if(typeof originalUpdBoss === "function"){
        originalUpdBoss();
      }
      return;
    }

    b.t = (b.t || 0) + 1;

    /*
    移動幅をステージ7だけ少し抑える。
    */
    const moveRate = b.__stage7BossMoveRate || STAGE7_BOSS_MOVE_RATE;

    const ampX = Math.min(170, r.w * 0.24) * moveRate;
    const ampY = Math.min(62, r.h * 0.25) * moveRate;

    b.x = r.x + r.w / 2 - b.w / 2 + Math.cos(b.t * 0.022) * ampX;
    b.y = r.y + r.h / 2 - b.h / 2 + Math.sin(b.t * 0.030) * ampY;

    /*
    念のため、まだ補正されていなければここで補正。
    */
    applyStage7BossNerf();
  };

  /*
  ---------------------------------------------------------
  update 後にも保険で補正
  ---------------------------------------------------------
  */

  const originalUpdate = window.update;

  window.update = function patchedUpdateStage7Nerf(){
    if(typeof originalUpdate === "function"){
      originalUpdate();
    }

    try{
      applyStage7BossNerf();
    }catch(err){
      console.warn("[stage7_boss_nerf_patch update]", err);
    }
  };

  console.log("[Sky Island] stage7_boss_nerf_patch.js applied");
})();