/*
  heroMotionPatch.js

  読み込み順:
  characterRenderer.js
  enemyTypes.js
  game.js
  heroMotionPatch.js  ← 必ず game.js の後

  目的:
  - 主人公モーションの左右揺れを弱める
  - 剣・盾・本がすべてLv5以上なら主人公の周りに電撃をまとう
  - 既存の drawHeroAdventurer3D を壊さず後付けで補正する
*/
(function(){
  "use strict";

  window.__heroMotionPatchVersion = "hero-motion-v2-less-sway-lightning";

  function isLegendGear(p){
    if(!p) return false;

    return (
      (p.swordLv || 0) >= 5 &&
      (p.shieldLv || 0) >= 5 &&
      (p.bookLv || 0) >= 5
    );
  }

  function getSpeed(p){
    if(!p) return 0;
    return Math.hypot(p.vx || 0, p.vy || 0);
  }

  /*
    左右揺れを弱めるため、描画中だけ p.anim の進みを抑える。
    characterRenderer.js 側では p.anim と walk から腕・脚の横振れが出ているので、
    ここで anim の増加量を圧縮する。
  */
  function softenHeroMotion(p, time){
    if(!p) return null;

    var backup = {
      anim: p.anim,
      vx: p.vx,
      vy: p.vy
    };

    var sp = getSpeed(p);

    /*
      元の描画側が p.anim を加算するので、
      その前に速度を少し弱く見せる。
      実際の移動速度は変えず、描画中だけ vx/vy を小さくする。
    */
    p.vx = (p.vx || 0) * 0.42;
    p.vy = (p.vy || 0) * 0.42;

    /*
      静止中の微揺れも少し落ち着かせる。
      anim が大きく暴れている場合は、ゆるく丸める。
    */
    if(sp < 0.05 && typeof p.anim === "number"){
      p.anim = p.anim * 0.96 + Math.sin((time || 0) * 0.025) * 0.04;
    }

    return backup;
  }

  function restoreHeroMotion(p, backup){
    if(!p || !backup) return;

    p.vx = backup.vx;
    p.vy = backup.vy;

    /*
      p.anim は完全に戻すと歩行アニメが止まるので戻さない。
      ただし増えすぎを抑えるため軽く減衰させる。
    */
    if(typeof p.anim === "number" && typeof backup.anim === "number"){
      p.anim = backup.anim + (p.anim - backup.anim) * 0.45;
    }
  }

  function drawLightningBolt(ctx, x1, y1, x2, y2, segments, jitter){
    var pts = [];
    pts.push({x:x1, y:y1});

    for(var i = 1; i < segments; i++){
      var t = i / segments;
      var x = x1 + (x2 - x1) * t;
      var y = y1 + (y2 - y1) * t;

      var dx = x2 - x1;
      var dy = y2 - y1;
      var len = Math.max(1, Math.hypot(dx, dy));
      var nx = -dy / len;
      var ny = dx / len;

      var off = (Math.random() * 2 - 1) * jitter;

      pts.push({
        x: x + nx * off,
        y: y + ny * off
      });
    }

    pts.push({x:x2, y:y2});

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);

    for(var j = 1; j < pts.length; j++){
      ctx.lineTo(pts[j].x, pts[j].y);
    }

    ctx.stroke();
  }

  function drawHeroLightningAura(ctx, p, wx, wy, time){
    if(!isLegendGear(p)) return;

    var x = wx(p.x);
    var y = wy(p.y);
    var w = p.w || 28;
    var h = p.h || 32;

    var cx = x + w / 2;
    var cy = y + h / 2 + 4;

    var t = time || 0;
    var pulse = 1 + Math.sin(t * 0.12) * 0.08;

    ctx.save();

    /*
      外側の電気オーラ。
    */
    ctx.globalCompositeOperation = "lighter";

    var auraGrad = ctx.createRadialGradient(
      cx,
      cy,
      8,
      cx,
      cy,
      46 * pulse
    );

    auraGrad.addColorStop(0, "rgba(255,255,255,0.18)");
    auraGrad.addColorStop(0.35, "rgba(140,235,255,0.18)");
    auraGrad.addColorStop(0.72, "rgba(80,170,255,0.10)");
    auraGrad.addColorStop(1, "rgba(80,170,255,0)");

    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 38 * pulse, 48 * pulse, 0, 0, Math.PI * 2);
    ctx.fill();

    /*
      電撃の線。
      毎フレーム完全ランダムだとチラつきすぎるので、
      time を混ぜた疑似的な配置にしている。
    */
    var count = 5;
    var baseR = 31;

    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for(var i = 0; i < count; i++){
      var a1 = t * 0.035 + i * Math.PI * 2 / count;
      var a2 = a1 + 0.55 + Math.sin(t * 0.04 + i) * 0.25;

      var r1 = baseR + Math.sin(t * 0.09 + i * 1.7) * 5;
      var r2 = baseR + 8 + Math.cos(t * 0.08 + i * 1.3) * 6;

      var x1 = cx + Math.cos(a1) * r1;
      var y1 = cy + Math.sin(a1) * r1 * 1.18;
      var x2 = cx + Math.cos(a2) * r2;
      var y2 = cy + Math.sin(a2) * r2 * 1.18;

      ctx.shadowBlur = 16;
      ctx.shadowColor = "#9ef7ff";
      ctx.strokeStyle = "rgba(120,230,255,0.72)";
      ctx.lineWidth = 2.2;
      drawLightningBolt(ctx, x1, y1, x2, y2, 4, 7);

      ctx.shadowBlur = 8;
      ctx.shadowColor = "#ffffff";
      ctx.strokeStyle = "rgba(255,255,255,0.95)";
      ctx.lineWidth = 1;
      drawLightningBolt(ctx, x1, y1, x2, y2, 4, 4);
    }

    /*
      足元に電気リング。
    */
    ctx.shadowBlur = 12;
    ctx.shadowColor = "#9ef7ff";
    ctx.strokeStyle = "rgba(130,235,255,0.55)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(
      cx,
      y + h + 8,
      27 + Math.sin(t * 0.11) * 2,
      8 + Math.cos(t * 0.1) * 1.5,
      0,
      0,
      Math.PI * 2
    );
    ctx.stroke();

    /*
      小さい火花。
    */
    for(var s = 0; s < 7; s++){
      var sa = t * 0.06 + s * 1.71;
      var sr = 22 + ((s * 11 + Math.floor(t / 5)) % 18);
      var sx = cx + Math.cos(sa) * sr;
      var sy = cy + Math.sin(sa) * sr * 1.15;

      ctx.strokeStyle = "rgba(255,255,210,0.8)";
      ctx.lineWidth = 1.2;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(sx - 3, sy);
      ctx.lineTo(sx + 3, sy);
      ctx.moveTo(sx, sy - 3);
      ctx.lineTo(sx, sy + 3);
      ctx.stroke();
    }

    ctx.restore();
  }

  function installHeroMotionPatch(){
    var baseDrawHero = window.drawHeroAdventurer3D;

    if(typeof baseDrawHero !== "function"){
      console.warn("heroMotionPatch: drawHeroAdventurer3D が見つかりません。読み込み順を確認してください。");
      return false;
    }

    if(baseDrawHero.__heroMotionPatched){
      return true;
    }

    window.drawHeroAdventurer3D = function(ctx, p, wx, wy, time, atkBox){
      if(!p){
        return baseDrawHero.apply(this, arguments);
      }

      /*
        描画前にだけ動きを弱める。
      */
      var backup = softenHeroMotion(p, time);

      /*
        元の主人公描画。
      */
      var result = baseDrawHero.call(this, ctx, p, wx, wy, time, atkBox);

      /*
        実ゲーム上の速度などを元に戻す。
      */
      restoreHeroMotion(p, backup);

      /*
        Lv5以上の剣・盾・本が揃ったら、主人公の周囲に電撃を追加。
        元のキャラの上に描くことで「まとっている」感じにする。
      */
      drawHeroLightningAura(ctx, p, wx, wy, time);

      return result;
    };

    window.drawHeroAdventurer3D.__heroMotionPatched = true;
    window.drawHeroAdventurer3D.__heroMotionOriginal = baseDrawHero;

    console.log("heroMotionPatch loaded:", window.__heroMotionPatchVersion);
    return true;
  }

  /*
    game.js の読み込みタイミング差を吸収。
  */
  if(!installHeroMotionPatch()){
    var tries = 0;
    var timer = setInterval(function(){
      tries++;

      if(installHeroMotionPatch() || tries > 60){
        clearInterval(timer);
      }
    }, 100);
  }
})();