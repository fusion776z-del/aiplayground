/*
  enemyBossVisualPatch.js

  読み込み順:
    characterRenderer.js
    enemyTypes.js
    game.js
*/
"use strict";
(function(){
  if(window.__enemyBossVisualPatchApplied){
    return;
  }

  window.__enemyBossVisualPatchApplied = true;
  window.__enemyBossVisualPatchVersion = "enemy-boss-visual-v3-safe";

  var TWO_PI = Math.PI * 2;

  function rr(ctx,x,y,w,h,r){
    r = Math.min(r || 0, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function eye(ctx,x,y,color){
    ctx.fillStyle = "#07111c";
    ctx.beginPath();
    ctx.ellipse(x,y,3,3.5,0,0,TWO_PI);
    ctx.fill();

    ctx.fillStyle = color || "#ffffff";
    ctx.beginPath();
    ctx.ellipse(x + 0.8,y - 0.8,1.2,1.5,0,0,TWO_PI);
    ctx.fill();
  }

  function shadow(ctx,x,y,w,h,a){
    ctx.save();
    ctx.globalAlpha = a == null ? 0.22 : a;
    ctx.fillStyle = "rgba(0,20,35,.42)";
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h * 0.88, w * 0.62, h * 0.18, 0, 0, TWO_PI);
    ctx.fill();
    ctx.restore();
  }

  function drawEnemyAura(ctx,cx,cy,w,h,color){
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = color;
    ctx.shadowBlur = 14;
    ctx.shadowColor = color;
    ctx.beginPath();
    ctx.ellipse(cx,cy,w * 0.72,h * 0.58,0,0,TWO_PI);
    ctx.fill();
    ctx.restore();
  }

  window.drawEnemy3D = function(ctx,e,wx,wy){
    if(!e) return;

    var x = wx(e.x);
    var y = wy(e.y);
    var w = e.w || 24;
    var h = e.h || 22;
    var t = (typeof G !== "undefined" ? G.time : 0) + (e.t || 0);

    var col = e.hitT > 0 ? "#ffffff" : (e.color || "#78df72");
    var acc = e.accent || "#ffffff";
    var out = e.outline || "rgba(10,20,30,.72)";
    var aura = e.aura || col;
    var type = e.archetype || e.type || "slime";

    shadow(ctx,x,y,w,h,0.18);

    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);

    if(type === "bat" || type === "shadow_bat" || type === "fire_bat" || e.type === "bat"){
      var flap = Math.sin(t * 0.28) * 0.35;
      ctx.translate(0, Math.sin(t * 0.12) * 3);

      drawEnemyAura(ctx,0,0,w,h,aura);

      ctx.fillStyle = col;
      ctx.strokeStyle = out;
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      ctx.ellipse(-w * 0.42,0,w * 0.42,h * 0.22,-0.65 - flap,0,TWO_PI);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(w * 0.42,0,w * 0.42,h * 0.22,0.65 + flap,0,TWO_PI);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(0,1,w * 0.28,h * 0.36,0,0,TWO_PI);
      ctx.fill();
      ctx.stroke();

      eye(ctx,-5,-1,acc);
      eye(ctx,5,-1,acc);

      if(type === "fire_bat"){
        ctx.fillStyle = "rgba(255,216,77,.9)";
        ctx.beginPath();
        ctx.moveTo(0,h * 0.28);
        ctx.quadraticCurveTo(5,h * 0.52,0,h * 0.70);
        ctx.quadraticCurveTo(-5,h * 0.52,0,h * 0.28);
        ctx.fill();
      }

      ctx.restore();
      return;
    }

    if(type === "runner" || type === "void_runner" || e.type === "fast"){
      ctx.rotate(Math.sin(t * 0.18) * 0.08);
      drawEnemyAura(ctx,0,0,w,h,aura);

      var grad = ctx.createLinearGradient(-w * 0.5,-h * 0.4,w * 0.5,h * 0.45);
      grad.addColorStop(0,acc);
      grad.addColorStop(0.42,col);
      grad.addColorStop(1,out);

      ctx.fillStyle = grad;
      ctx.strokeStyle = out;
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      ctx.moveTo(-w * 0.42,h * 0.18);
      ctx.lineTo(-w * 0.18,-h * 0.38);
      ctx.lineTo(w * 0.32,-h * 0.28);
      ctx.lineTo(w * 0.48,h * 0.16);
      ctx.lineTo(w * 0.08,h * 0.42);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      eye(ctx,1,-3,acc);
      eye(ctx,8,-3,acc);

      if(type === "void_runner"){
        ctx.globalAlpha = 0.45;
        ctx.strokeStyle = "#efe7ff";
        ctx.lineWidth = 1.2;
        for(var i=0;i<3;i++){
          ctx.beginPath();
          ctx.arc(0,0,w * (0.44 + i * 0.12),t * 0.05 + i,t * 0.05 + i + Math.PI * 0.7);
          ctx.stroke();
        }
      }

      ctx.restore();
      return;
    }

    if(type === "mage" || e.type === "mage"){
      ctx.translate(0, Math.sin(t * 0.08) * 1.8);
      drawEnemyAura(ctx,0,0,w,h,aura);

      var robe = ctx.createLinearGradient(0,-h * 0.52,0,h * 0.45);
      robe.addColorStop(0,acc);
      robe.addColorStop(0.35,col);
      robe.addColorStop(1,out);

      ctx.fillStyle = robe;
      ctx.strokeStyle = out;
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      ctx.moveTo(0,-h * 0.52);
      ctx.lineTo(w * 0.40,h * 0.38);
      ctx.lineTo(-w * 0.40,h * 0.38);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      eye(ctx,-5,-5,acc);
      eye(ctx,5,-5,acc);

      ctx.strokeStyle = acc;
      ctx.lineWidth = 1.4;
      for(var m=0;m<5;m++){
        var a = t * 0.05 + m / 5 * TWO_PI;
        var px = Math.cos(a) * w * 0.48;
        var py = Math.sin(a) * h * 0.34;
        ctx.beginPath();
        ctx.moveTo(px - 3, py);
        ctx.lineTo(px + 3, py);
        ctx.moveTo(px, py - 3);
        ctx.lineTo(px, py + 3);
        ctx.stroke();
      }

      ctx.restore();
      return;
    }

    if(type === "knight" || e.type === "knight"){
      drawEnemyAura(ctx,0,0,w,h,aura);

      var armor = ctx.createLinearGradient(-w * 0.4,-h * 0.5,w * 0.4,h * 0.45);
      armor.addColorStop(0,"#ffffff");
      armor.addColorStop(0.28,col);
      armor.addColorStop(1,out);

      ctx.fillStyle = armor;
      ctx.strokeStyle = out;
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(0,-h * 0.52);
      ctx.lineTo(w * 0.34,-h * 0.16);
      ctx.lineTo(w * 0.28,h * 0.38);
      ctx.lineTo(0,h * 0.52);
      ctx.lineTo(-w * 0.28,h * 0.38);
      ctx.lineTo(-w * 0.34,-h * 0.16);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "rgba(0,0,0,.38)";
      rr(ctx,-w * 0.22,-h * 0.22,w * 0.44,h * 0.16,4);
      ctx.fill();

      ctx.strokeStyle = acc;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(w * 0.28,-h * 0.10);
      ctx.lineTo(w * 0.58,h * 0.18);
      ctx.moveTo(-w * 0.28,-h * 0.10);
      ctx.lineTo(-w * 0.58,h * 0.18);
      ctx.stroke();

      ctx.restore();
      return;
    }

    if(type === "drone" || e.type === "drone"){
      ctx.translate(0, Math.sin(t * 0.12) * 2.4);
      ctx.rotate(t * 0.025);
      drawEnemyAura(ctx,0,0,w,h,aura);

      ctx.fillStyle = col;
      ctx.strokeStyle = out;
      ctx.lineWidth = 1.6;

      ctx.beginPath();
      for(var d=0; d<8; d++){
        var r = d % 2 === 0 ? w * 0.48 : w * 0.22;
        var da = -Math.PI / 2 + d / 8 * TWO_PI;
        var dx = Math.cos(da) * r;
        var dy = Math.sin(da) * r;
        if(d === 0) ctx.moveTo(dx,dy);
        else ctx.lineTo(dx,dy);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = acc;
      ctx.beginPath();
      ctx.arc(0,0,w * 0.16,0,TWO_PI);
      ctx.fill();

      ctx.restore();
      return;
    }

    if(type === "wraith" || e.type === "wraith"){
      ctx.translate(0, Math.sin(t * 0.10) * 2.0);
      drawEnemyAura(ctx,0,0,w,h,aura);

      var wg = ctx.createRadialGradient(0,-h * 0.2,2,0,0,w * 0.58);
      wg.addColorStop(0,acc);
      wg.addColorStop(0.38,col);
      wg.addColorStop(1,"rgba(0,0,0,.92)");

      ctx.fillStyle = wg;
      ctx.strokeStyle = acc;
      ctx.lineWidth = 1.4;

      ctx.beginPath();
      ctx.moveTo(0,-h * 0.52);
      ctx.quadraticCurveTo(w * 0.42,-h * 0.20,w * 0.30,h * 0.26);
      ctx.quadraticCurveTo(w * 0.12,h * 0.48,0,h * 0.30);
      ctx.quadraticCurveTo(-w * 0.12,h * 0.48,-w * 0.30,h * 0.26);
      ctx.quadraticCurveTo(-w * 0.42,-h * 0.20,0,-h * 0.52);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      eye(ctx,-6,-h * 0.14,"#ffffff");
      eye(ctx,6,-h * 0.14,"#ffffff");

      ctx.restore();
      return;
    }

    /*
      slime / beast / armored / crystal fallback
    */
    ctx.translate(0, Math.sin(t * 0.08) * 1.2);
    drawEnemyAura(ctx,0,0,w,h,aura);

    var sg = ctx.createRadialGradient(-w * 0.18,-h * 0.25,2,0,0,w * 0.72);
    sg.addColorStop(0,"#ffffff");
    sg.addColorStop(0.30,col);
    sg.addColorStop(1,out);

    ctx.fillStyle = sg;
    ctx.strokeStyle = "rgba(255,255,255,.45)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(0,2,w * 0.50,h * 0.43,0,0,TWO_PI);
    ctx.fill();
    ctx.stroke();

    if(type === "crystal_slime"){
      ctx.fillStyle = acc;
      ctx.strokeStyle = out;
      ctx.lineWidth = 1.1;
      for(var c=0;c<3;c++){
        var px2 = -8 + c * 8;
        ctx.beginPath();
        ctx.moveTo(px2,-h * 0.55);
        ctx.lineTo(px2 + 4,-h * 0.24);
        ctx.lineTo(px2 - 4,-h * 0.24);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }

    if(type === "beast"){
      ctx.fillStyle = acc;
      for(var sp=0;sp<5;sp++){
        var sx = -w * 0.28 + sp * w * 0.14;
        ctx.beginPath();
        ctx.moveTo(sx,-h * 0.30);
        ctx.lineTo(sx + w * 0.06,-h * 0.56);
        ctx.lineTo(sx + w * 0.12,-h * 0.30);
        ctx.closePath();
        ctx.fill();
      }
    }

    eye(ctx,-5,-2,acc);
    eye(ctx,5,-2,acc);

    ctx.restore();
  };

  function bossTheme(){
    var i = typeof G !== "undefined" ? (G.stageIndex || 0) : 0;

    return [
      {name:"モスグリフォン", main:"#73df78", sub:"#b7ff9a", dark:"#1e6b45", glow:"#9effa1", shape:"griffin"},
      {name:"エルダートレント", main:"#46c66a", sub:"#b9ff9a", dark:"#1f6f3a", glow:"#a8ff86", shape:"treant"},
      {name:"クリスタル・アーク", main:"#72f7ff", sub:"#d8ffff", dark:"#237e9a", glow:"#b9fbff", shape:"crystal"},
      {name:"ラヴァワイバーン", main:"#ff7048", sub:"#ffd84d", dark:"#8b2d22", glow:"#ffb347", shape:"wyvern"},
      {name:"スカイガーディアン", main:"#ffd84d", sub:"#fff7a8", dark:"#8c6d35", glow:"#fff2a5", shape:"guardian"},
      {name:"アストラルリヴァイアサン", main:"#9b7cff", sub:"#cfd8ff", dark:"#35266f", glow:"#b8a8ff", shape:"leviathan"},
      {name:"アビス・オーバーロード", main:"#8b5cff", sub:"#efe7ff", dark:"#171026", glow:"#b56bff", shape:"void"}
    ][i] || {
      name:"BOSS",
      main:"#73df78",
      sub:"#b7ff9a",
      dark:"#1e6b45",
      glow:"#9effa1",
      shape:"griffin"
    };
  }

  function bossEye(ctx,x,y,color){
    ctx.fillStyle = "#050812";
    ctx.beginPath();
    ctx.ellipse(x,y,6,7,0,0,TWO_PI);
    ctx.fill();

    ctx.fillStyle = color || "#ffffff";
    ctx.beginPath();
    ctx.ellipse(x + 1,y - 2,2.4,3,0,0,TWO_PI);
    ctx.fill();
  }

  function bossWing(ctx,side,w,h,th,t){
    ctx.save();
    ctx.scale(side,1);

    var flap = Math.sin(t * 0.08) * 0.18;

    ctx.fillStyle = th.main;
    ctx.strokeStyle = th.sub;
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.moveTo(-w * 0.10,-h * 0.08);
    ctx.quadraticCurveTo(-w * 0.55,-h * 0.46,-w * 0.72,h * 0.02 + flap * 20);
    ctx.quadraticCurveTo(-w * 0.48,h * 0.00,-w * 0.34,h * 0.30);
    ctx.quadraticCurveTo(-w * 0.22,h * 0.04,-w * 0.10,-h * 0.08);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  window.drawBoss3D = function(ctx,b,wx,wy,t){
    if(!b) return;

    var th = bossTheme();
    var x = wx(b.x);
    var y = wy(b.y);
    var w = b.w || 120;
    var h = b.h || 100;
    var cx = x + w / 2;
    var cy = y + h / 2 + Math.sin((t || 0) * 0.05) * 3;
    var hpRate = Math.max(0,Math.min(1,(b.hp || 1) / (b.maxHp || 1)));

    ctx.save();

    ctx.globalAlpha = 0.34;
    ctx.fillStyle = "rgba(0,20,30,.48)";
    ctx.beginPath();
    ctx.ellipse(cx,y + h * 0.86,w * 0.50,h * 0.16,0,0,TWO_PI);
    ctx.fill();

    ctx.globalAlpha = hpRate < 0.35 ? 0.38 : 0.24;
    ctx.fillStyle = th.glow;
    ctx.shadowBlur = hpRate < 0.35 ? 32 : 22;
    ctx.shadowColor = th.glow;
    ctx.beginPath();
    ctx.ellipse(cx,cy,w * 0.80,h * 0.64,0,0,TWO_PI);
    ctx.fill();

    ctx.restore();

    ctx.save();
    ctx.translate(cx,cy);
    ctx.shadowBlur = hpRate < 0.35 ? 30 : 18;
    ctx.shadowColor = th.glow;

    if(th.shape === "griffin" || th.shape === "wyvern"){
      bossWing(ctx,-1,w,h,th,t || 0);
      bossWing(ctx,1,w,h,th,t || 0);
    }

    if(th.shape === "treant"){
      ctx.fillStyle = "#5b3922";
      ctx.strokeStyle = th.sub;
      ctx.lineWidth = 3;
      rr(ctx,-w * 0.18,-h * 0.22,w * 0.36,h * 0.66,18);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = th.main;
      ctx.beginPath();
      ctx.ellipse(0,-h * 0.36,w * 0.36,h * 0.25,0,0,TWO_PI);
      ctx.ellipse(-w * 0.24,-h * 0.16,w * 0.26,h * 0.20,0,0,TWO_PI);
      ctx.ellipse(w * 0.24,-h * 0.16,w * 0.26,h * 0.20,0,0,TWO_PI);
      ctx.fill();
    }else if(th.shape === "crystal"){
      var cg = ctx.createLinearGradient(0,-h * 0.55,0,h * 0.48);
      cg.addColorStop(0,"#ffffff");
      cg.addColorStop(0.35,th.main);
      cg.addColorStop(1,th.dark);

      ctx.fillStyle = cg;
      ctx.strokeStyle = th.sub;
      ctx.lineWidth = 3;

      ctx.beginPath();
      ctx.moveTo(0,-h * 0.58);
      ctx.lineTo(w * 0.36,-h * 0.06);
      ctx.lineTo(w * 0.20,h * 0.48);
      ctx.lineTo(-w * 0.20,h * 0.48);
      ctx.lineTo(-w * 0.36,-h * 0.06);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }else if(th.shape === "leviathan"){
      ctx.strokeStyle = th.sub;
      ctx.lineWidth = 13;
      ctx.lineCap = "round";
      ctx.beginPath();
      for(var j=0;j<8;j++){
        var px = -w * 0.42 + j * w * 0.12;
        var py = Math.sin((t || 0) * 0.05 + j * 0.8) * 18 + j * 4;
        if(j === 0) ctx.moveTo(px,py);
        else ctx.lineTo(px,py);
      }
      ctx.stroke();

      ctx.fillStyle = th.main;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(w * 0.24,-h * 0.18,w * 0.27,h * 0.19,0.1,0,TWO_PI);
      ctx.fill();
      ctx.stroke();
    }else if(th.shape === "guardian"){
      ctx.fillStyle = th.main;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;

      ctx.beginPath();
      ctx.moveTo(0,-h * 0.56);
      ctx.lineTo(w * 0.33,-h * 0.16);
      ctx.lineTo(w * 0.27,h * 0.38);
      ctx.lineTo(0,h * 0.54);
      ctx.lineTo(-w * 0.27,h * 0.38);
      ctx.lineTo(-w * 0.33,-h * 0.16);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = th.sub;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0,0,w * 0.52,0,TWO_PI);
      ctx.stroke();
    }else{
      var vg = ctx.createRadialGradient(0,-h * 0.12,8,0,0,w * 0.58);
      vg.addColorStop(0,th.sub);
      vg.addColorStop(0.45,th.main);
      vg.addColorStop(1,th.dark);

      ctx.fillStyle = vg;
      ctx.strokeStyle = th.sub;
      ctx.lineWidth = 3;

      ctx.beginPath();
      ctx.ellipse(0,0,w * 0.36,h * 0.42,0,0,TWO_PI);
      ctx.fill();
      ctx.stroke();

      if(th.shape === "void"){
        ctx.strokeStyle = th.glow;
        ctx.lineWidth = 3;
        for(var q=0;q<4;q++){
          var aa = (t || 0) * 0.025 + q / 4 * TWO_PI;
          ctx.beginPath();
          ctx.arc(Math.cos(aa) * w * 0.44,Math.sin(aa) * h * 0.35,13,0,TWO_PI);
          ctx.stroke();
        }
      }
    }

    bossEye(ctx,-12,-h * 0.12,"#ffffff");
    bossEye(ctx,12,-h * 0.12,"#ffffff");

    ctx.restore();

    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 12px system-ui";
    ctx.textAlign = "center";
    ctx.shadowBlur = 8;
    ctx.shadowColor = th.dark;
    ctx.fillText(b.name || th.name || "BOSS",cx,y - 10);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = "rgba(8,25,45,.62)";
    rr(ctx,cx - 52,y - 5,104,7,999);
    ctx.fill();

    ctx.fillStyle = hpRate <= 0.33 ? "#ff6262" : hpRate <= 0.66 ? "#ffd84d" : th.glow;
    rr(ctx,cx - 52,y - 5,Math.max(2,104 * hpRate),7,999);
    ctx.fill();
    ctx.restore();
  };

  console.log("enemyBossVisualPatch loaded:", window.__enemyBossVisualPatchVersion);
})();
/*
  enemyBossVisualPatch.js 追加修正版:
  Stage7ボスラッシュのボス別見た目補正

  使い方:
    既存の enemyBossVisualPatch.js の一番最後に追記するか、
    既存 enemyBossVisualPatch.js より後に読み込んでください。

  目的:
    enemyBossVisualPatch.js 内の drawBoss3D が G.stageIndex だけを見て、
    Stage7ボスラッシュ中の全ボスをアビス見た目にする問題を防ぐ。
*/
(function(){
  "use strict";

  if(typeof window !== "undefined" && window.__enemyBossRushVisualStageFixApplied){
    return;
  }

  if(typeof window !== "undefined"){
    window.__enemyBossRushVisualStageFixApplied = true;
    window.__enemyBossRushVisualStageFixVersion = "enemy-boss-rush-visual-stage-fix-v1";
  }

  function isNumber(v){
    return typeof v === "number" && isFinite(v);
  }

  function clampStageIndex(v){
    v = Math.floor(Number(v));

    if(!isFinite(v)){
      return 0;
    }

    if(typeof STAGES !== "undefined" && STAGES && STAGES.length){
      return Math.max(0, Math.min(STAGES.length - 1, v));
    }

    return Math.max(0, Math.min(6, v));
  }

  function getBossStageIndex(b){
    if(
      typeof window !== "undefined" &&
      typeof window.__getBossStageIndexForRush === "function"
    ){
      return window.__getBossStageIndexForRush(b);
    }

    if(b){
      if(isNumber(b.rushStageIndex)){
        return clampStageIndex(b.rushStageIndex);
      }

      if(isNumber(b.sourceStageIndex)){
        return clampStageIndex(b.sourceStageIndex);
      }

      if(isNumber(b.bossStageIndex)){
        return clampStageIndex(b.bossStageIndex);
      }

      if(isNumber(b.__stageIndex)){
        return clampStageIndex(b.__stageIndex);
      }

      if(isNumber(b.stageIndex) && (b.stage7RushBoss || b.rushBoss)){
        return clampStageIndex(b.stageIndex);
      }
    }

    if(typeof G !== "undefined" && G){
      return clampStageIndex(G.stageIndex || 0);
    }

    return 0;
  }

  function shouldUseRushStage(b){
    return !!(
      b &&
      (b.stage7RushBoss || b.rushBoss || b.__stage7RushBoss) &&
      (
        isNumber(b.rushStageIndex) ||
        isNumber(b.sourceStageIndex) ||
        isNumber(b.bossStageIndex) ||
        isNumber(b.__stageIndex) ||
        isNumber(b.stageIndex)
      )
    );
  }

  function withBossStageIndex(b, fn){
    if(typeof G === "undefined" || !G || !shouldUseRushStage(b)){
      return fn();
    }

    var oldIndex = G.stageIndex;
    G.stageIndex = getBossStageIndex(b);

    try{
      return fn();
    }finally{
      G.stageIndex = oldIndex;
    }
  }

  function installVisualWrapper(){
    if(typeof drawBoss3D !== "function"){
      return false;
    }

    if(drawBoss3D.__enemyBossRushVisualStageFixed){
      return true;
    }

    var oldDrawBoss3D = drawBoss3D;

    drawBoss3D = function(ctx, b, wx, wy, t){
      var self = this;

      return withBossStageIndex(b, function(){
        return oldDrawBoss3D.call(self, ctx, b, wx, wy, t);
      });
    };

    drawBoss3D.__enemyBossRushVisualStageFixed = true;
    return true;
  }

  installVisualWrapper();

  /*
    後から game.js 側や別パッチが drawBoss3D を再上書きした場合の保険。
  */
  var tries = 0;
  var timer = setInterval(function(){
    tries++;
    installVisualWrapper();

    if(tries >= 30){
      clearInterval(timer);
    }
  }, 100);

  console.log(
    "enemyBossVisualPatch rush visual stage fix loaded:",
    typeof window !== "undefined"
      ? window.__enemyBossRushVisualStageFixVersion
      : "v1"
  );
})();