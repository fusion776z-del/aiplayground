/*
=========================================================
heroMotionPatch.js

読み込み順:
characterRenderer.js
enemyTypes.js
game.js
heroMotionPatch.js  ← 必ず game.js の後

目的:
既存の drawHeroAdventurer3D を壊さずに、
主人公の動きだけを後から強化するパッチ。
=========================================================
*/

(function(){
  "use strict";

  function installHeroMotionPatch(){
    const baseDrawHero = window.drawHeroAdventurer3D;

    if(typeof baseDrawHero !== "function"){
      console.warn("heroMotionPatch: drawHeroAdventurer3D がまだ見つかりません。少し後でもう一度試します。");

      setTimeout(installHeroMotionPatch, 100);
      return;
    }

    if(window.__heroMotionPatchInstalled){
      console.log("heroMotionPatch: すでに適用済みです。");
      return;
    }

    window.__heroMotionPatchInstalled = true;
    window.__heroMotionPatchVersion = "hero-motion-strong-v2";

    function clamp(v, min, max){
      return Math.max(min, Math.min(max, v));
    }

    function getSpeed(p){
      return Math.hypot(p.vx || 0, p.vy || 0);
    }

    function getAttackPower(p){
      if(!p || !(p.attackT > 0)){
        return 0;
      }

      const spin = p.combo === 3;
      const total = spin ? 18 : 12;
      const raw = 1 - (p.attackT / total);

      return Math.sin(clamp(raw, 0, 1) * Math.PI);
    }

    function getDirectionPush(p, power){
      const push = power * 11;

      if(p.dir === "left"){
        return { x: -push, y: 0 };
      }

      if(p.dir === "right"){
        return { x: push, y: 0 };
      }

      if(p.dir === "up"){
        return { x: 0, y: -push };
      }

      return { x: 0, y: push };
    }

    function drawHeroWithMotion(ctx, p, wx, wy, time, atkBox, options){
      options = options || {};

      if(!p){
        return;
      }

      const x = wx(p.x);
      const y = wy(p.y);

      const cx = x + p.w / 2;
      const cy = y + p.h / 2;

      const vx = p.vx || 0;
      const vy = p.vy || 0;
      const speed = getSpeed(p);

      const t = time || 0;
      const moving = speed > 0.05;
      const attacking = p.attackT > 0;
      const spin = attacking && p.combo === 3;
      const attackPower = getAttackPower(p);

      /*
      --------------------------------------------
      かなり分かりやすい動き設定
      --------------------------------------------
      */

      // 歩行時の大きめ上下バウンド
      const walkWave = Math.sin(t * 0.24);
      const walkAbs = Math.abs(walkWave);

      // 停止中の呼吸
      const idleBreath = Math.sin(t * 0.055);

      // 歩きと停止で上下量を変える
      const bob = moving
        ? walkAbs * 6.0
        : idleBreath * 1.4;

      // 横移動時の傾き
      let lean = clamp(vx * 0.08, -0.32, 0.32);

      // 攻撃時の追加傾き
      if(attacking){
        if(p.dir === "left"){
          lean -= attackPower * 0.22;
        }else if(p.dir === "right"){
          lean += attackPower * 0.22;
        }
      }

      // 攻撃の踏み込み
      const push = getDirectionPush(p, attackPower);

      // 攻撃後の少し跳ねる感じ
      const attackHop = attacking
        ? -Math.sin(attackPower * Math.PI) * 3
        : 0;

      // ダメージ・無敵時の揺れ
      const hurtShake = p.inv > 0
        ? Math.sin(t * 0.95) * 2.5
        : 0;

      // 歩行時の squash/stretch
      const squashX = moving ? 1 + walkAbs * 0.075 : 1 + idleBreath * 0.025;
      const squashY = moving ? 1 - walkAbs * 0.055 : 1 - idleBreath * 0.018;

      // 3段目攻撃の迫力
      const spinScale = spin
        ? 1 + attackPower * 0.22
        : 1;

      // 残像用の後ろずらし
      const trailBack = options.trailBack || 0;
      const alpha = options.alpha == null ? 1 : options.alpha;

      ctx.save();

      ctx.globalAlpha = alpha;

      if(trailBack){
        ctx.translate(-vx * trailBack, -vy * trailBack);
      }

      /*
      --------------------------------------------
      既存描画全体を変形する
      --------------------------------------------
      */
      ctx.translate(
        cx + push.x + hurtShake,
        cy + bob + push.y + attackHop
      );

      ctx.rotate(lean);

      ctx.scale(
        squashX * spinScale,
        squashY * spinScale
      );

      ctx.translate(-cx, -cy);

      try{
        baseDrawHero(ctx, p, wx, wy, time, atkBox);
      }catch(err){
        console.error("heroMotionPatch: baseDrawHero 実行中にエラー", err);

        // 万一パッチ側で失敗しても、通常描画だけは試す
        try{
          ctx.restore();
          baseDrawHero(ctx, p, wx, wy, time, atkBox);
          return;
        }catch(e){}
      }

      ctx.restore();
    }

    window.drawHeroAdventurer3D = function(ctx, p, wx, wy, time, atkBox){
      if(!p){
        return;
      }

      const speed = getSpeed(p);
      const attacking = p.attackT > 0;
      const spin = attacking && p.combo === 3;

      /*
      --------------------------------------------
      ダッシュ・高速移動時の残像
      --------------------------------------------
      */
      const dashing =
        speed > 1.7 ||
        p.dashT > 0 ||
        p.dashing === true ||
        p.dash === true;

      if(dashing){
        drawHeroWithMotion(ctx, p, wx, wy, time, null, {
          alpha: 0.18,
          trailBack: 4.5
        });

        drawHeroWithMotion(ctx, p, wx, wy, time, null, {
          alpha: 0.09,
          trailBack: 8.5
        });
      }

      /*
      --------------------------------------------
      3段目攻撃時はさらに薄い拡大残像
      --------------------------------------------
      */
      if(spin){
        drawHeroWithMotion(ctx, p, wx, wy, time, null, {
          alpha: 0.13,
          trailBack: 0
        });
      }

      /*
      --------------------------------------------
      本体描画
      --------------------------------------------
      */
      drawHeroWithMotion(ctx, p, wx, wy, time, atkBox, {
        alpha: 1,
        trailBack: 0
      });
    };

    console.log("heroMotionPatch loaded:", window.__heroMotionPatchVersion);
  }

  installHeroMotionPatch();
})();
