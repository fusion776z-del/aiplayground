"use strict";

/*
=========================================================
dash_attack_patch.js

目的:
- ダッシュ中に攻撃判定を追加
- ダッシュを「逃げ」だけでなく「突進攻撃」として使えるようにする
- ダッシュ連発防止のためクールタイムを1秒相当にする
- ダッシュ斬りで敵を倒したらクールタイムを半分回復
- 既存 game.js / balance_patch.js を大きく壊さず上書きする

仕様:
- ダッシュ時間: 10フレーム
- ダッシュクールタイム: 60フレーム
- ダッシュ撃破回復: 30フレーム
- ダッシュ速度: 7.6
- ダッシュ中は前方に攻撃判定
- 1回のダッシュで同じ敵には1回だけヒット
- 雑魚敵を倒したらダッシュクールタイム30短縮
- 複数体倒したら倒した数だけ短縮
- ボスにもヒットするが、ボスへの倍率は少し低め
- ボス撃破ではクールタイム回復しない
- 入力なしでダッシュした場合、向いている方向へダッシュ
=========================================================
*/

(function(){
  if(window.__dashAttackPatchApplied) return;
  window.__dashAttackPatchApplied = true;

  /*
  ---------------------------------------------------------
  基本設定
  ---------------------------------------------------------
  */

  const DASH_DURATION = 10;
  const DASH_COOLDOWN = 60;
  const DASH_KILL_RECOVER = Math.floor(DASH_COOLDOWN / 2);

  const DASH_SPEED = 7.6;
  const DASH_INVINCIBLE = 18;

  const DASH_DAMAGE_RATE = 0.95;
  const DASH_BOSS_DAMAGE_RATE = 0.55;

  const DASH_PUSH_ENEMY = 18;
  const DASH_PUSH_BOSS = 8;

  /*
  true にすると、1回のダッシュ中に何体倒しても回復は1回だけ。
  false なら、倒した数だけ半分回復。
  今回は「倒したら回復」の気持ちよさ優先で false。
  */
  const RECOVER_ONLY_ONCE_PER_DASH = false;

  let dashSerial = 0;

  function clamp(v,a,b){
    return Math.max(a, Math.min(b, v));
  }

  function norm(x,y){
    const l = Math.hypot(x,y) || 1;
    return {
      x:x / l,
      y:y / l,
      l
    };
  }

  function rectHit(a,b){
    return a && b &&
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y;
  }

  function getDirVector(dir){
    if(dir === "up"){
      return {x:0,y:-1};
    }

    if(dir === "down"){
      return {x:0,y:1};
    }

    if(dir === "left"){
      return {x:-1,y:0};
    }

    return {x:1,y:0};
  }

  function getDashDirNameFromVector(x,y,currentDir){
    if(Math.abs(x) > Math.abs(y)){
      return x >= 0 ? "right" : "left";
    }

    if(Math.abs(y) > 0){
      return y >= 0 ? "down" : "up";
    }

    return currentDir || "down";
  }

  /*
  ---------------------------------------------------------
  ダッシュ攻撃判定

  通常攻撃より少し長め。
  ダッシュ方向へ伸びる。
  ---------------------------------------------------------
  */

  function dashAttackBox(){
    const p = G.player;
    if(!p) return null;

    const dir = p.__dashDir || p.dir || "down";

    if(dir === "up"){
      return {
        x:p.x - 8,
        y:p.y - 42,
        w:p.w + 16,
        h:54
      };
    }

    if(dir === "down"){
      return {
        x:p.x - 8,
        y:p.y + p.h - 10,
        w:p.w + 16,
        h:54
      };
    }

    if(dir === "left"){
      return {
        x:p.x - 42,
        y:p.y - 8,
        w:54,
        h:p.h + 16
      };
    }

    return {
      x:p.x + p.w - 10,
      y:p.y - 8,
      w:54,
      h:p.h + 16
    };
  }

  /*
  ---------------------------------------------------------
  ダッシュ撃破回復

  ダッシュ斬りで敵を倒したら、
  残りクールタイムを30フレーム短縮する。

  dashCd はダッシュ開始時に60になる。
  斬って倒せば 30 減る。
  さらに倒せばさらに減る。
  0未満にはならない。
  ---------------------------------------------------------
  */

  function recoverDashCooldownByKill(){
    if(typeof G === "undefined" || !G.player) return;

    const p = G.player;

    if(RECOVER_ONLY_ONCE_PER_DASH){
      if(p.__dashKillRecoveredSerial === p.__dashSerial){
        return;
      }

      p.__dashKillRecoveredSerial = p.__dashSerial;
    }

    p.dashCd = Math.max(0, (p.dashCd || 0) - DASH_KILL_RECOVER);

    /*
    ダッシュ中に倒した瞬間、次のダッシュ準備が早まったことを見せる。
    */
    if(typeof msg === "function"){
      if(p.dashCd <= 0){
        msg("撃破！ DASH即回復！", 34);
      }else{
        msg("撃破！ DASH半回復！", 34);
      }
    }

    if(typeof ring === "function"){
      ring(
        p.x + p.w / 2,
        p.y + p.h / 2,
        28,
        p.trueGold ? "#ffd84d" : "#9ef7ff"
      );
    }
  }

  /*
  ---------------------------------------------------------
  雑魚敵が倒れたか判定

  dmgE() は敵HPを減らし、
  HPが0以下になると G.enemies から削除する。
  そのため、
  - 配列から消えた
  - hp が 0 以下
  のどちらかで撃破扱いにする。
  ---------------------------------------------------------
  */

  function isEnemyKilledAfterDamage(enemy){
    if(!enemy) return false;

    if(enemy.hp <= 0){
      return true;
    }

    if(Array.isArray(G.enemies) && G.enemies.indexOf(enemy) < 0){
      return true;
    }

    return false;
  }

  /*
  ---------------------------------------------------------
  ダッシュ攻撃本体

  1回のダッシュで同じ敵には1回だけヒット。
  多段ヒットで強すぎるのを防ぐ。
  ---------------------------------------------------------
  */

  function dashStrike(){
    if(typeof G === "undefined" || !G.player) return;

    const p = G.player;

    if(!p.__dashActive) return;
    if(!p.__dashSerial) return;

    const box = dashAttackBox();
    if(!box) return;

    const dx = p.__dashVX || 0;
    const dy = p.__dashVY || 0;

    /*
    -----------------------------------------------------
    雑魚へのヒット
    -----------------------------------------------------
    */
    if(Array.isArray(G.enemies)){
      for(let i = G.enemies.length - 1; i >= 0; i--){
        const e = G.enemies[i];

        if(!e) continue;

        /*
        同じダッシュで同じ敵に2回当たらないようにする。
        */
        if(e.__dashHitSerial === p.__dashSerial) continue;

        if(rectHit(box, e)){
          e.__dashHitSerial = p.__dashSerial;

          const damage = Math.max(
            1,
            Math.round((p.atk || 1) * DASH_DAMAGE_RATE)
          );

          /*
          ダメージ前の状態を記録。
          */
          const beforeEnemyCount = Array.isArray(G.enemies) ? G.enemies.length : 0;

          if(typeof dmgE === "function"){
            dmgE(e, damage);
          }else{
            e.hp = (e.hp || 1) - damage;

            if(e.hp <= 0 && Array.isArray(G.enemies)){
              const idx = G.enemies.indexOf(e);
              if(idx >= 0){
                G.enemies.splice(idx, 1);
              }
            }
          }

          /*
          撃破判定。
          dmgE() によって敵が削除されたか、
          hp が 0 以下になっていたら撃破。
          */
          const killed =
            isEnemyKilledAfterDamage(e) ||
            (
              Array.isArray(G.enemies) &&
              G.enemies.length < beforeEnemyCount &&
              G.enemies.indexOf(e) < 0
            );

          if(killed){
            recoverDashCooldownByKill();
          }else{
            /*
            倒していない敵だけ押し出す。
            倒した敵は消えている可能性があるため触らない。
            */
            e.x += dx * DASH_PUSH_ENEMY;
            e.y += dy * DASH_PUSH_ENEMY;
          }

          if(typeof fx === "function"){
            const fxX = e.x != null && e.w != null
              ? e.x + e.w / 2
              : p.x + p.w / 2 + dx * 18;

            const fxY = e.y != null && e.h != null
              ? e.y + e.h / 2
              : p.y + p.h / 2 + dy * 18;

            fx(fxX, fxY, killed ? "#fff7a8" : "#d9fbff", killed ? 16 : 12, killed ? 3.0 : 2.4);
          }
        }
      }
    }

    /*
    -----------------------------------------------------
    ボスへのヒット

    ボスにも当たるが、クールタイム回復はしない。
    雑魚を倒してテンポを作る設計。
    -----------------------------------------------------
    */
    if(
      G.boss &&
      G.boss.__dashHitSerial !== p.__dashSerial &&
      rectHit(box, G.boss)
    ){
      G.boss.__dashHitSerial = p.__dashSerial;

      const damage = Math.max(
        1,
        Math.round((p.atk || 1) * DASH_BOSS_DAMAGE_RATE)
      );

      if(typeof dmgB === "function"){
        dmgB(damage);
      }else{
        G.boss.hp = (G.boss.hp || 1) - damage;
      }

      if(G.boss){
        G.boss.x += dx * DASH_PUSH_BOSS;
        G.boss.y += dy * DASH_PUSH_BOSS;

        if(typeof fx === "function"){
          fx(
            G.boss.x + G.boss.w / 2,
            G.boss.y + G.boss.h / 2,
            "#fff7a8",
            14,
            2.8
          );
        }
      }
    }

    /*
    -----------------------------------------------------
    軌跡エフェクト
    -----------------------------------------------------
    */
    if(typeof G.time === "number" && G.time % 3 === 0){
      if(typeof fx === "function"){
        fx(
          p.x + p.w / 2 - dx * 10,
          p.y + p.h / 2 - dy * 10,
          p.trueGold ? "#ffd84d" : "#9ef7ff",
          9,
          1.4
        );
      }
    }
  }

  /*
  ---------------------------------------------------------
  ダッシュ開始
  ---------------------------------------------------------
  */

  function startDash(mx,my){
    const p = G.player;
    if(!p) return;

    let vx = mx;
    let vy = my;

    /*
    入力なしなら向いている方向へダッシュ。
    */
    if(Math.abs(vx) + Math.abs(vy) <= 0){
      const d = getDirVector(p.dir || "down");
      vx = d.x;
      vy = d.y;
    }

    const n = norm(vx, vy);

    p.__dashVX = n.x;
    p.__dashVY = n.y;
    p.__dashDir = getDashDirNameFromVector(n.x, n.y, p.dir);
    p.dir = p.__dashDir;

    p.dashT = DASH_DURATION;
    p.dashCd = DASH_COOLDOWN;
    p.inv = Math.max(p.inv || 0, DASH_INVINCIBLE);

    dashSerial++;

    p.__dashSerial = dashSerial;
    p.__dashActive = true;
    p.__dashKillRecoveredSerial = 0;

    if(typeof msg === "function"){
      msg("ダッシュ斬り！", 24);
    }

    if(typeof ring === "function"){
      ring(
        p.x + p.w / 2,
        p.y + p.h / 2,
        22,
        p.trueGold ? "#ffd84d" : "#9ef7ff"
      );
    }
  }

  /*
  ---------------------------------------------------------
  プレイヤー更新差し替え

  元 game.js の updP 相当を置き換え。
  変更点:
  - dashCd を 60 に変更
  - ダッシュ中は方向固定
  - ダッシュ中 dashStrike() を実行
  - ダッシュ撃破時に cooldown 半分回復
  - 入力なしでも向き方向へダッシュ
  ---------------------------------------------------------
  */

  window.updP = function patchedUpdP(){
    if(typeof G === "undefined" || !G.player) return;

    const p = G.player;

    ["inv","dashCd","attackCd","attackT","comboT"].forEach(k => {
      if(p[k] > 0){
        p[k]--;
      }
    });

    if(p.comboT <= 0){
      p.combo = 0;
    }

    const mx = (input.right || 0) - (input.left || 0);
    const my = (input.down || 0) - (input.up || 0);
    const moveNorm = norm(mx, my);

    /*
    通常移動中だけ向きを更新。
    ダッシュ中は開始時の方向で固定。
    */
    if((Math.abs(mx) + Math.abs(my) > 0) && !(p.dashT > 0)){
      p.dir = Math.abs(mx) > Math.abs(my)
        ? (mx > 0 ? "right" : "left")
        : (my > 0 ? "down" : "up");
    }

    /*
    ダッシュ開始。
    クールタイムは60フレーム。
    */
    if(typeof C === "function"){
      if(C("dash") && p.dashCd <= 0){
        startDash(mx, my);
      }
    }else{
      if(input.dash && p.dashCd <= 0){
        input.dash = 0;
        startDash(mx, my);
      }
    }

    let sp = p.speed || 3.35;
    let vx = moveNorm.l > 0.001 ? moveNorm.x : 0;
    let vy = moveNorm.l > 0.001 ? moveNorm.y : 0;

    /*
    ダッシュ中は開始方向へ固定移動。
    */
    if(p.dashT > 0){
      p.dashT--;

      sp = DASH_SPEED;
      vx = p.__dashVX || 0;
      vy = p.__dashVY || 0;

      if(typeof move === "function"){
        move(p, vx * sp, vy * sp);
      }else{
        p.x += vx * sp;
        p.y += vy * sp;
      }

      dashStrike();

      /*
      ダッシュ終了。
      */
      if(p.dashT <= 0){
        p.__dashActive = false;
        p.__dashVX = 0;
        p.__dashVY = 0;
      }
    }else{
      p.__dashActive = false;

      if(moveNorm.l > 0.001){
        if(typeof move === "function"){
          move(p, vx * sp, vy * sp);
        }else{
          p.x += vx * sp;
          p.y += vy * sp;
        }
      }
    }

    /*
    通常攻撃・魔法・アクションは元の挙動を維持。
    */
    if(typeof C === "function"){
      if(C("attack") && p.attackCd <= 0 && typeof attack === "function"){
        attack();
      }

      if(C("magic") && typeof magic === "function"){
        magic();
      }

      if(C("action") && typeof action === "function"){
        action();
      }
    }
  };

  /*
  ---------------------------------------------------------
  UI補助

  ダッシュクールタイムゲージを表示。
  撃破で半分回復するとゲージが一気に進む。
  ---------------------------------------------------------
  */

  const originalUi = window.ui;

  window.ui = function patchedUi(){
    if(typeof originalUi === "function"){
      originalUi();
    }

    try{
      if(typeof G === "undefined" || !G.player) return;
      if(typeof ctx === "undefined") return;

      const p = G.player;

      if(p.dashCd > 0){
        const ratio = clamp(1 - p.dashCd / DASH_COOLDOWN, 0, 1);

        ctx.save();

        ctx.fillStyle = "rgba(8,25,45,.58)";

        if(typeof RR === "function"){
          RR(22, 84, 124, 8, 999);
          ctx.fill();
        }else{
          ctx.fillRect(22, 84, 124, 8);
        }

        ctx.fillStyle = p.trueGold ? "#ffd84d" : "#9ef7ff";

        if(typeof RR === "function"){
          RR(22, 84, Math.max(1, 124 * ratio), 8, 999);
          ctx.fill();
        }else{
          ctx.fillRect(22, 84, Math.max(1, 124 * ratio), 8);
        }

        ctx.fillStyle = "#fff";
        ctx.font = "800 10px system-ui";
        ctx.fillText("DASH", 150, 92);

        ctx.restore();
      }else{
        /*
        使用可能時の小さい READY 表示。
        うるさければこの else ブロックごと消してOK。
        */
        ctx.save();
        ctx.fillStyle = "rgba(8,25,45,.42)";

        if(typeof RR === "function"){
          RR(22, 84, 70, 8, 999);
          ctx.fill();
        }else{
          ctx.fillRect(22, 84, 70, 8);
        }

        ctx.fillStyle = G.player.trueGold ? "#ffd84d" : "#9ef7ff";

        if(typeof RR === "function"){
          RR(22, 84, 70, 8, 999);
          ctx.fill();
        }else{
          ctx.fillRect(22, 84, 70, 8);
        }

        ctx.fillStyle = "#fff";
        ctx.font = "800 10px system-ui";
        ctx.fillText("DASH OK", 98, 92);
        ctx.restore();
      }
    }catch(err){
      console.warn("[dash_attack_patch ui]", err);
    }
  };

  console.log("[Sky Island] dash_attack_patch.js applied / kill recover enabled");
})();