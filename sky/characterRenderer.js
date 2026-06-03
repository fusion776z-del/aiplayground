/* =========================================================
   characterRenderer.js
   方向対応・ボス安定版フルコード

   game.js から呼ばれる関数:
   - drawHeroAdventurer3D(ctx,p,wx,wy,time,atkBox)
   - drawEnemy3D(ctx,e,wx,wy)
   - drawBoss3D(ctx,b,wx,wy,t)
   - drawNPC3D(ctx,n,wx,wy)
   - drawShop3D(ctx,s,wx,wy)
   - drawCoin3D(ctx,d,wx,wy)
   ========================================================= */


/* =========================================================
   共通
   ========================================================= */

function crRound(ctx,x,y,w,h,r){
  r = Math.min(r || 0, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function crShadow(ctx,x,y,w,h,a){
  ctx.save();
  ctx.globalAlpha = a == null ? 0.24 : a;
  ctx.fillStyle = "rgba(0,35,55,.36)";
  ctx.beginPath();
  ctx.ellipse(
    x + w / 2,
    y + h * 0.88,
    w * 0.62,
    h * 0.18,
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();
  ctx.restore();
}

function crEllipse(ctx,x,y,rx,ry,rot,fill,stroke,line){
  ctx.beginPath();
  ctx.ellipse(x,y,rx,ry,rot || 0,0,Math.PI * 2);

  if(fill){
    ctx.fillStyle = fill;
    ctx.fill();
  }

  if(stroke){
    ctx.strokeStyle = stroke;
    ctx.lineWidth = line || 1;
    ctx.stroke();
  }
}

function crText(ctx,text,x,y,size,color,align){
  ctx.save();
  ctx.fillStyle = color || "#fff";
  ctx.font = "900 " + (size || 12) + "px system-ui";
  ctx.textAlign = align || "left";
  ctx.fillText(String(text || ""),x,y);
  ctx.restore();
}

function crSpark(ctx,x,y,s,color){
  ctx.save();
  ctx.strokeStyle = color || "#fff";
  ctx.lineWidth = 1.5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x,y - s);
  ctx.lineTo(x,y + s);
  ctx.moveTo(x - s,y);
  ctx.lineTo(x + s,y);
  ctx.stroke();
  ctx.restore();
}

function crGearColors(p){
  p = p || {};

  const swordLv = p.swordLv || 0;
  const shieldLv = p.shieldLv || 0;
  const bookLv = p.bookLv || 0;

  return {
    sword: ["#e9fbff","#9ef7ff","#b56bff","#ffd84d"][Math.min(3,swordLv)],
    shield: ["#346bd8","#35c7ff","#8b5cff","#ffd84d"][Math.min(3,shieldLv)],
    gold: swordLv >= 3 && shieldLv >= 3 && bookLv >= 3
  };
}


/* =========================================================
   武器・盾
   ========================================================= */

function drawSwordInHand(ctx,g,angle,sw,spin){
  ctx.save();

  ctx.rotate(angle);

  const len = spin ? 44 : 34;

  ctx.strokeStyle = g.gold ? "#ffd84d" : g.sword;
  ctx.lineWidth = g.gold ? 4.5 : 3.5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0,7);
  ctx.lineTo(0,-len - sw * 8);
  ctx.stroke();

  ctx.strokeStyle = "#6b4a2a";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-8,5);
  ctx.lineTo(8,5);
  ctx.stroke();

  ctx.strokeStyle = "rgba(255,255,255,.72)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-1,0);
  ctx.lineTo(-1,-len + 6);
  ctx.stroke();

  ctx.restore();
}

function drawShieldInHand(ctx,g,angle,scale){
  ctx.save();

  ctx.rotate(angle || 0);
  ctx.scale(scale || 1, scale || 1);

  ctx.fillStyle = g.gold ? "#ffd84d" : g.shield;
  ctx.strokeStyle = g.gold ? "#fff7b0" : "#d9ecff";
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(-10,-14);
  ctx.lineTo(8,-17);
  ctx.lineTo(14,-1);
  ctx.lineTo(3,18);
  ctx.lineTo(-13,7);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,.22)";
  ctx.beginPath();
  ctx.moveTo(-5,-10);
  ctx.lineTo(5,-12);
  ctx.lineTo(8,-1);
  ctx.lineTo(1,11);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawAttackArc(ctx,g,sw,spin){
  if(sw <= 0) return;

  ctx.save();

  if(spin){
    ctx.globalAlpha = 0.42;
    ctx.strokeStyle = g.gold ? "#ffd84d" : "#ffe17a";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(0,0,43,-Math.PI * 0.9 + sw * 5,Math.PI * 0.8 + sw * 5);
    ctx.stroke();
  }else{
    ctx.globalAlpha = 0.34;
    ctx.strokeStyle = g.gold ? "#ffd84d" : "#ffe17a";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(8,-5,38,-1.45,0.35 + sw);
    ctx.stroke();
  }

  ctx.restore();
}


/* =========================================================
   主人公: 共通パーツ
   ========================================================= */

function heroPalette(p){
  const lifted = !!p.curseLifted;
  const gold = !!p.trueGold;

  return {
    lifted,
    gold,
    body: lifted ? (gold ? "#46c86a" : "#2f8cff") : "#8b5a32",
    bodyDark: lifted ? "#174a9a" : "#6b4328",
    bodyBack: lifted ? "#174a9a" : "#5b3a24",
    face: lifted ? "#ffe4bd" : "#9b6b3f",
    hair: "#f4c35a",
    belly: "#e7c28a",
    foot: "#263149",
    tanukiDark: "#4a2c1c"
  };
}

function heroLegsFront(ctx,pal,walk){
  const a = walk * 0.22;

  ctx.save();
  ctx.strokeStyle = pal.bodyDark;
  ctx.lineWidth = 5;
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.moveTo(-6,10);
  ctx.lineTo(-10 - a * 8,29);
  ctx.moveTo(6,10);
  ctx.lineTo(10 + a * 8,29);
  ctx.stroke();

  ctx.fillStyle = pal.foot;
  crRound(ctx,-16 - a * 8,28,14,5,3);
  ctx.fill();
  crRound(ctx,2 + a * 8,28,14,5,3);
  ctx.fill();

  ctx.restore();
}

function heroLegsBack(ctx,pal,walk){
  const a = walk * 0.22;

  ctx.save();
  ctx.strokeStyle = pal.bodyBack;
  ctx.lineWidth = 5;
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.moveTo(-6,10);
  ctx.lineTo(-10 + a * 8,29);
  ctx.moveTo(6,10);
  ctx.lineTo(10 - a * 8,29);
  ctx.stroke();

  ctx.fillStyle = pal.foot;
  crRound(ctx,-16 + a * 8,28,14,5,3);
  ctx.fill();
  crRound(ctx,2 - a * 8,28,14,5,3);
  ctx.fill();

  ctx.restore();
}

function heroLegsSide(ctx,pal,walk){
  const a = walk * 0.24;

  ctx.save();
  ctx.strokeStyle = pal.bodyDark;
  ctx.lineWidth = 5;
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.moveTo(-4,10);
  ctx.lineTo(-8 - a * 10,29);
  ctx.moveTo(5,10);
  ctx.lineTo(10 + a * 10,29);
  ctx.stroke();

  ctx.fillStyle = pal.foot;
  crRound(ctx,-15 - a * 10,28,14,5,3);
  ctx.fill();
  crRound(ctx,2 + a * 10,28,14,5,3);
  ctx.fill();

  ctx.restore();
}

function heroCapeFront(ctx,pal){
  if(!pal.lifted) return;

  ctx.save();
  ctx.fillStyle = pal.gold ? "rgba(217,169,61,.6)" : "rgba(31,95,191,.58)";

  ctx.beginPath();
  ctx.moveTo(-13,-12);
  ctx.lineTo(-19,8);
  ctx.lineTo(-10,14);
  ctx.lineTo(-8,-4);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(13,-12);
  ctx.lineTo(19,8);
  ctx.lineTo(10,14);
  ctx.lineTo(8,-4);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function heroCapeBack(ctx,pal){
  if(!pal.lifted) return;

  ctx.save();

  ctx.fillStyle = pal.gold ? "#d9a93d" : "#1f5fbf";

  ctx.beginPath();
  ctx.moveTo(-17,-12);
  ctx.lineTo(17,-12);
  ctx.quadraticCurveTo(20,8,16,30);
  ctx.lineTo(4,24);
  ctx.lineTo(0,31);
  ctx.lineTo(-4,24);
  ctx.lineTo(-16,30);
  ctx.quadraticCurveTo(-20,8,-17,-12);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(0,0,0,.14)";
  ctx.beginPath();
  ctx.moveTo(-2,-8);
  ctx.lineTo(0,30);
  ctx.lineTo(-8,25);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(2,-8);
  ctx.lineTo(0,30);
  ctx.lineTo(8,25);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,.18)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0,-9);
  ctx.lineTo(0,30);
  ctx.stroke();

  ctx.restore();
}

function heroCapeSide(ctx,pal){
  if(!pal.lifted) return;

  ctx.save();

  ctx.fillStyle = pal.gold ? "#d9a93d" : "#1f5fbf";
  ctx.beginPath();
  ctx.moveTo(-12,-11);
  ctx.lineTo(5,-9);
  ctx.lineTo(14,26);
  ctx.lineTo(-14,23);
  ctx.lineTo(-19,4);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(0,0,0,.12)";
  ctx.beginPath();
  ctx.moveTo(-8,-9);
  ctx.lineTo(0,23);
  ctx.lineTo(-15,26);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function heroTorsoFront(ctx,pal){
  ctx.save();

  ctx.fillStyle = pal.body;
  ctx.strokeStyle = pal.lifted
    ? (pal.gold ? "#fff7b0" : "rgba(255,255,255,.55)")
    : "#6b3e24";
  ctx.lineWidth = 1.4;

  ctx.beginPath();
  ctx.moveTo(0,-18);
  ctx.lineTo(12,-5);
  ctx.lineTo(8,13);
  ctx.lineTo(-8,13);
  ctx.lineTo(-12,-5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  if(!pal.lifted){
    crEllipse(ctx,0,-1,5,10,0,pal.belly);
  }

  ctx.fillStyle = "#6b4a2a";
  ctx.fillRect(-10,7,20,4);

  ctx.restore();
}

function heroTorsoBack(ctx,pal){
  ctx.save();

  ctx.fillStyle = pal.lifted ? pal.body : "#7c4b2c";
  ctx.strokeStyle = pal.lifted
    ? (pal.gold ? "#fff7b0" : "rgba(255,255,255,.38)")
    : "#5b3a24";
  ctx.lineWidth = 1.4;

  ctx.beginPath();
  ctx.moveTo(0,-18);
  ctx.lineTo(12,-5);
  ctx.lineTo(8,13);
  ctx.lineTo(-8,13);
  ctx.lineTo(-12,-5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  if(!pal.lifted){
    crEllipse(ctx,0,-5,5,10,0,"#5f361f");
  }

  ctx.fillStyle = "#6b4a2a";
  ctx.fillRect(-10,7,20,4);

  ctx.restore();
}

function heroTorsoSide(ctx,pal){
  ctx.save();

  ctx.fillStyle = pal.body;
  ctx.strokeStyle = pal.lifted
    ? (pal.gold ? "#fff7b0" : "rgba(255,255,255,.55)")
    : "#6b3e24";
  ctx.lineWidth = 1.4;

  crEllipse(ctx,0,-2,8,16,0,pal.body,pal.lifted ? "rgba(255,255,255,.45)" : "#6b3e24",1.4);

  if(!pal.lifted){
    crEllipse(ctx,4,0,3,9,-0.1,"#d6ae78");
  }

  ctx.fillStyle = "#6b4a2a";
  ctx.fillRect(-8,7,16,4);

  ctx.restore();
}

function heroHeadFront(ctx,pal){
  ctx.save();

  crEllipse(ctx,0,-30,9,10,0,pal.face);

  if(pal.lifted){
    crEllipse(ctx,0,-36,10.5,5,0,pal.hair);
  }else{
    crEllipse(ctx,-8,-37,5,7,-0.8,"#6b3e24");
    crEllipse(ctx,8,-37,5,7,0.8,"#6b3e24");
    crEllipse(ctx,-8,-36,2.3,3.5,-0.8,"#8b5a32");
    crEllipse(ctx,8,-36,2.3,3.5,0.8,"#8b5a32");

    crEllipse(ctx,-3.5,-30,3.2,2.7,0,pal.tanukiDark);
    crEllipse(ctx,3.5,-30,3.2,2.7,0,pal.tanukiDark);
  }

  ctx.fillStyle = "#172334";
  ctx.fillRect(-4,-31,2,2);
  ctx.fillRect(3,-31,2,2);

  ctx.fillStyle = "#fff";
  ctx.fillRect(-3.7,-31,1,1);
  ctx.fillRect(3.3,-31,1,1);

  if(!pal.lifted){
    crEllipse(ctx,0,-26.5,2.2,1.4,0,"#2a1a12");
  }

  ctx.restore();
}

function heroHeadBack(ctx,pal){
  ctx.save();

  if(pal.lifted){
    crEllipse(ctx,0,-30,9.5,11,0,pal.hair);
  }else{
    crEllipse(ctx,0,-30,9,10,0,pal.face);

    crEllipse(ctx,-8,-36,5,7,-0.75,"#6b3e24");
    crEllipse(ctx,8,-36,5,7,0.75,"#6b3e24");

    crEllipse(ctx,0,-30,6.8,8,0,"#5b3a24");
  }

  ctx.restore();
}

function heroHeadSide(ctx,pal){
  ctx.save();

  if(pal.lifted){
    crEllipse(ctx,2,-30,8,9.5,0,pal.face);

    ctx.fillStyle = pal.hair;
    ctx.beginPath();
    ctx.ellipse(1,-35,9,4.8,-0.2,0,Math.PI * 2);
    ctx.ellipse(7,-32,4,6,-0.35,0,Math.PI * 2);
    ctx.fill();
  }else{
    crEllipse(ctx,2,-30,8,9.5,0,pal.face);

    crEllipse(ctx,-4,-36,4.4,6.5,-0.75,"#6b3e24");
    crEllipse(ctx,7,-36,4,6,0.72,"#6b3e24");
    crEllipse(ctx,-4,-35,2,3.7,-0.75,"#8b5a32");
    crEllipse(ctx,7,-35,1.8,3.3,0.72,"#8b5a32");
  }

  ctx.fillStyle = "#172334";
  ctx.fillRect(4,-31,2,2);

  ctx.fillStyle = "#fff";
  ctx.fillRect(4.4,-31,1,1);

  if(!pal.lifted){
    crEllipse(ctx,8,-27,2,1.4,0,"#2a1a12");
  }

  ctx.restore();
}

function heroArmsFront(ctx,pal,g,walk,sw,spin){
  const a = walk * 0.24;

  ctx.save();

  ctx.strokeStyle = pal.bodyDark;
  ctx.lineWidth = 5;
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.moveTo(-10,-7);
  ctx.lineTo(-19 - a * 6,-1 + a * 4);
  ctx.stroke();

  ctx.save();
  ctx.translate(-22 - a * 6,0 + a * 4);
  drawSwordInHand(ctx,g,-0.75 - sw * 0.75,sw,spin);
  ctx.restore();

  ctx.beginPath();
  ctx.moveTo(10,-7);
  ctx.lineTo(19 + a * 6,2 - a * 4);
  ctx.stroke();

  ctx.save();
  ctx.translate(23 + a * 6,2 - a * 4);
  drawShieldInHand(ctx,g,0.2,1);
  ctx.restore();

  ctx.restore();
}

function heroArmsBack(ctx,pal,g,walk,sw,spin){
  const a = walk * 0.24;

  ctx.save();

  ctx.strokeStyle = pal.lifted ? "#174a9a" : "#5b3a24";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.moveTo(10,-7);
  ctx.lineTo(19 + a * 6,-1 + a * 4);
  ctx.save();  ctx.stroke();
  ctx.translate(22 + a * 6,0 + a * 4);
  drawSwordInHand(ctx,g,0.62 + sw * 0.45,sw,spin);
  ctx.restore();

  ctx.beginPath();
  ctx.moveTo(-10,-7);
  ctx.lineTo(-19 - a * 6,2 - a * 4);
  ctx.stroke();

  ctx.save();
  ctx.translate(-23 - a * 6,2 - a * 4);
  drawShieldInHand(ctx,g,-0.2,0.92);
  ctx.restore();

  ctx.restore();
}

function heroArmsSide(ctx,pal,g,walk,sw,spin){
  const a = walk * 0.16;

  ctx.save();

  ctx.strokeStyle = pal.bodyDark;
  ctx.lineWidth = 5;
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.moveTo(8,-7);
  ctx.lineTo(18 + a * 6,2 + a * 4);
  ctx.stroke();

  ctx.save();
  ctx.translate(21 + a * 6,3 + a * 4);
  drawSwordInHand(ctx,g,-0.35 - sw * 0.85,sw,spin);
  ctx.restore();

  ctx.beginPath();
  ctx.moveTo(-8,-7);
  ctx.lineTo(-17 - a * 5,3 - a * 3);
  ctx.stroke();

  ctx.save();
  ctx.translate(-20 - a * 5,4 - a * 3);
  drawShieldInHand(ctx,g,-0.18,0.85);
  ctx.restore();

  ctx.restore();
}


/* =========================================================
   主人公: 方向別描画
   ========================================================= */

function drawHeroFront(ctx,p,walk,sw,spin){
  const pal = heroPalette(p);
  const g = crGearColors(p);

  heroCapeFront(ctx,pal);
  heroLegsFront(ctx,pal,walk);
  heroTorsoFront(ctx,pal);
  heroArmsFront(ctx,pal,g,walk,sw,spin);
  heroHeadFront(ctx,pal);
}

function drawHeroBack(ctx,p,walk,sw,spin){
  const pal = heroPalette(p);
  const g = crGearColors(p);

  heroLegsBack(ctx,pal,walk);
  heroTorsoBack(ctx,pal);
  heroArmsBack(ctx,pal,g,walk,sw,spin);
  heroHeadBack(ctx,pal);

  /*
    上向き時はマントを最後に描く。
    以前の「背中のマントが前面に見える」動きを再現。
  */
  heroCapeBack(ctx,pal);
}

function drawHeroSide(ctx,p,walk,sw,spin){
  const pal = heroPalette(p);
  const g = crGearColors(p);

  heroLegsSide(ctx,pal,walk);
  heroCapeSide(ctx,pal);
  heroTorsoSide(ctx,pal);
  heroArmsSide(ctx,pal,g,walk,sw,spin);
  heroHeadSide(ctx,pal);
}

function drawHeroAdventurer3D(ctx,p,wx,wy,time,atkBox){
  if(!p) return;

  if(p.inv > 0 && p.inv % 8 < 4){
    return;
  }

  const x = wx(p.x);
  const y = wy(p.y);
  const cx = x + p.w / 2;
  const cy = y + p.h / 2;

  const sp = Math.hypot(p.vx || 0,p.vy || 0);
  p.anim = (p.anim || 0) + sp * 0.18 + 0.04;

  const walk = Math.sin(p.anim);
  const bob = sp > 0.05
    ? Math.abs(walk) * 2
    : Math.sin(time * 0.05) * 0.5;

  const attacking = p.attackT > 0;
  const spin = attacking && p.combo === 3;
  const attackTotal = spin ? 18 : 12;
  const raw = attacking ? 1 - (p.attackT / attackTotal) : 0;
  const swing = attacking ? Math.sin(raw * Math.PI) : 0;
  const g = crGearColors(p);

  crShadow(ctx,x - 12,y + 4,p.w + 24,p.h + 18,0.34);

  ctx.save();
  ctx.translate(cx,cy + bob);

  if(p.trueGold){
    ctx.shadowBlur = 24;
    ctx.shadowColor = "#ffd84d";
  }else if(p.curseLifted){
    ctx.shadowBlur = 12;
    ctx.shadowColor = "#9ef7ff";
  }

  if(attacking){
    drawAttackArc(ctx,g,swing,spin);
  }

  const dir = p.dir || "down";

  /*
    方向分岐:
    down  -> 前向き
    up    -> 後ろ向き
    left  -> 左向き。右向き絵を反転
    right -> 右向き
  */
  if(dir === "up"){
    drawHeroBack(ctx,p,walk,swing,spin);
  }else if(dir === "left"){
    ctx.scale(-1,1);
    drawHeroSide(ctx,p,walk,swing,spin);
  }else if(dir === "right"){
    drawHeroSide(ctx,p,walk,swing,spin);
  }else{
    drawHeroFront(ctx,p,walk,swing,spin);
  }

  ctx.restore();

  if(p.attackT > 0 && typeof atkBox === "function"){
    try{
      const a = atkBox();

      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = p.trueGold ? "#ffd84d" : "#ffe17a";
      crRound(ctx,wx(a.x),wy(a.y),a.w,a.h,12);
      ctx.fill();
      ctx.restore();
    }catch(e){}
  }
}


/* =========================================================
   敵描画
   ========================================================= */

function drawEnemy3D(ctx,e,wx,wy){
  if(!e) return;

  const x = wx(e.x);
  const y = wy(e.y);
  const w = e.w || 24;
  const h = e.h || 22;
  const col = e.hitT > 0 ? "#fff" : (e.color || "#78df72");

  crShadow(ctx,x,y,w,h,0.16);

  ctx.save();

  if(e.type === "bat"){
    ctx.fillStyle = "rgba(80,180,230,.75)";
    ctx.beginPath();
    ctx.ellipse(x + 4,y + 10,13,5,-0.4,0,Math.PI * 2);
    ctx.ellipse(x + w - 4,y + 10,13,5,0.4,0,Math.PI * 2);
    ctx.fill();

    crEllipse(ctx,x + w / 2,y + h / 2,9,7,0,col);

    ctx.fillStyle = "#10202a";
    ctx.fillRect(x + w / 2 - 4,y + h / 2 - 2,2,2);
    ctx.fillRect(x + w / 2 + 3,y + h / 2 - 2,2,2);
  }else{
    crEllipse(ctx,x + w / 2,y + h / 2,w / 2,h / 2,0,col);

    ctx.fillStyle = "rgba(255,255,255,.25)";
    crEllipse(ctx,x + w * 0.38,y + h * 0.35,w * 0.16,h * 0.12,0,"rgba(255,255,255,.25)");
  }

  ctx.restore();
}


/* =========================================================
   ボス描画 安全版
   ========================================================= */

function drawBossEyeSafe(ctx,x,y,color){
  ctx.fillStyle = "#10202a";
  ctx.beginPath();
  ctx.ellipse(x,y,5,6,0,0,Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = color || "#b7ff9a";
  ctx.beginPath();
  ctx.ellipse(x + 1.4,y - 1.4,2,2.6,0,0,Math.PI * 2);
  ctx.fill();
}

function drawBossGlowSafe(ctx,cx,cy,w,h,color,a){
  ctx.save();
  ctx.globalAlpha = a == null ? 0.2 : a;
  ctx.fillStyle = color || "#9effa1";
  ctx.beginPath();
  ctx.ellipse(cx,cy,w * 0.68,h * 0.52,0,0,Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBossMossGriffonSafe(ctx,b,wx,wy,t){
  const x = wx(b.x);
  const y = wy(b.y);
  const w = b.w || 113;
  const h = b.h || 99;
  const cx = x + w / 2;
  const cy = y + h / 2 + Math.sin((t || 0) * 0.05) * 3;
  const flap = Math.sin((t || 0) * 0.16) * 0.2;

  crShadow(ctx,x,y,w,h,0.36);
  drawBossGlowSafe(ctx,cx,cy,w,h,"#9effa1",0.22);

  ctx.save();
  ctx.translate(cx,cy + 4);

  ctx.fillStyle = "rgba(90,220,118,.82)";
  ctx.beginPath();
  ctx.ellipse(-w * 0.36,0,w * 0.36,h * 0.26,-0.45 - flap,0,Math.PI * 2);
  ctx.ellipse(w * 0.36,0,w * 0.36,h * 0.26,0.45 + flap,0,Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(220,255,185,.42)";
  ctx.beginPath();
  ctx.ellipse(-w * 0.43,-h * 0.04,w * 0.16,h * 0.07,-0.5 - flap,0,Math.PI * 2);
  ctx.ellipse(w * 0.43,-h * 0.04,w * 0.16,h * 0.07,0.5 + flap,0,Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,.5)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-w * 0.12,-h * 0.04);
  ctx.lineTo(-w * 0.58,-h * 0.20);
  ctx.moveTo(-w * 0.10,h * 0.03);
  ctx.lineTo(-w * 0.55,h * 0.13);
  ctx.moveTo(w * 0.12,-h * 0.04);
  ctx.lineTo(w * 0.58,-h * 0.20);
  ctx.moveTo(w * 0.10,h * 0.03);
  ctx.lineTo(w * 0.55,h * 0.13);
  ctx.stroke();

  ctx.restore();

  crEllipse(ctx,cx,cy,w * 0.27,h * 0.31,0,b.color || "#73df78","#e8ffe8",2);
  crEllipse(ctx,cx,cy + h * 0.06,w * 0.13,h * 0.18,0,"#d6ffd2");
  crEllipse(ctx,cx,cy - h * 0.25,w * 0.19,h * 0.16,0,"#77d56f","#e8ffe8",2);

  ctx.fillStyle = "#f0d46c";
  ctx.beginPath();
  ctx.moveTo(cx,cy - h * 0.23);
  ctx.lineTo(cx + 15,cy - h * 0.18);
  ctx.lineTo(cx,cy - h * 0.13);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#d8ffd0";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx - 7,cy - h * 0.37);
  ctx.quadraticCurveTo(cx - 22,cy - h * 0.55,cx - 34,cy - h * 0.46);
  ctx.moveTo(cx + 7,cy - h * 0.37);
  ctx.quadraticCurveTo(cx + 22,cy - h * 0.55,cx + 34,cy - h * 0.46);
  ctx.stroke();

  drawBossEyeSafe(ctx,cx - 8,cy - h * 0.27,"#b7ff9a");
  drawBossEyeSafe(ctx,cx + 8,cy - h * 0.27,"#b7ff9a");

  ctx.strokeStyle = "#fff7c0";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.10,cy + h * 0.27);
  ctx.lineTo(cx - w * 0.16,cy + h * 0.40);
  ctx.moveTo(cx + w * 0.10,cy + h * 0.27);
  ctx.lineTo(cx + w * 0.16,cy + h * 0.40);
  ctx.stroke();

  crText(ctx,b.name || "モスグリフォン",cx,y - 8,12,"#fff","center");
}

function drawBossGenericSafe(ctx,b,wx,wy,t){
  const x = wx(b.x);
  const y = wy(b.y);
  const w = b.w || 100;
  const h = b.h || 90;
  const cx = x + w / 2;
  const cy = y + h / 2 + Math.sin((t || 0) * 0.05) * 2;

  crShadow(ctx,x,y,w,h,0.34);
  drawBossGlowSafe(ctx,cx,cy,w,h,b.color || "#88ddff",0.2);

  crEllipse(ctx,cx,cy,w * 0.48,h * 0.42,0,b.color || "#88ddff","#fff",3);

  ctx.fillStyle = "rgba(255,255,255,.35)";
  crEllipse(ctx,cx - w * 0.24,cy - h * 0.08,w * 0.13,h * 0.07,-0.3,"rgba(255,255,255,.35)");

  drawBossEyeSafe(ctx,cx - 14,cy - 6,"#fff");
  drawBossEyeSafe(ctx,cx + 14,cy - 6,"#fff");

  crText(ctx,b.name || "BOSS",cx,y - 8,12,"#fff","center");
}

function drawBoss3D(ctx,b,wx,wy,t){
  if(!b) return;

  try{
    const name = b.name || "";
    const stage = typeof G !== "undefined" ? G.stageIndex : -1;

    if(name === "モスグリフォン" || stage === 0){
      drawBossMossGriffonSafe(ctx,b,wx,wy,t);
      return;
    }

    drawBossGenericSafe(ctx,b,wx,wy,t);
  }catch(err){
    if(typeof console !== "undefined"){
      console.error("[drawBoss3D safe fallback]",err);
    }

    try{
      drawBossGenericSafe(ctx,b,wx,wy,t);
    }catch(e){}
  }
}


/* =========================================================
   NPC描画
   ========================================================= */

function drawNPC3D(ctx,n,wx,wy){
  if(!n) return;

  const x = wx(n.x);
  const y = wy(n.y);
  const w = n.w || 24;
  const h = n.h || 32;

  const skin = n.skin || "#f1c79b";
  const hair = n.hair || "#2d1b12";
  const outfit = n.outfit || n.color || "#3f6fb5";
  const accent = n.accent || "#e8edf5";

  crShadow(ctx,x - 4,y + 5,w + 8,h + 10,0.24);

  ctx.save();
  ctx.translate(x + w / 2,y + h / 2);

  ctx.fillStyle = "#2b3445";
  crRound(ctx,-8,7,6,14,3);
  ctx.fill();
  crRound(ctx,2,7,6,14,3);
  ctx.fill();

  ctx.fillStyle = "#1d2230";
  crRound(ctx,-10,19,9,4,2);
  ctx.fill();
  crRound(ctx,1,19,9,4,2);
  ctx.fill();

  ctx.fillStyle = outfit;
  ctx.strokeStyle = "rgba(255,255,255,.45)";
  ctx.lineWidth = 1;
  crRound(ctx,-11,-3,22,19,5);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.moveTo(-5,-3);
  ctx.lineTo(0,5);
  ctx.lineTo(5,-3);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = outfit;
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-11,1);
  ctx.lineTo(-15,12);
  ctx.moveTo(11,1);
  ctx.lineTo(15,12);
  ctx.stroke();

  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(-15,13,3,0,Math.PI * 2);
  ctx.arc(15,13,3,0,Math.PI * 2);
  ctx.fill();

  crRound(ctx,-4,-9,8,7,3);
  ctx.fill();

  crEllipse(ctx,0,-17,9,10,0,skin);
  crEllipse(ctx,-9,-17,2.3,3.2,0,skin);
  crEllipse(ctx,9,-17,2.3,3.2,0,skin);

  crEllipse(ctx,0,-23,9.5,5.5,0,hair);

  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.ellipse(-4,-21,4,4,-0.4,0,Math.PI * 2);
  ctx.ellipse(2,-22,5,4,0.25,0,Math.PI * 2);
  ctx.ellipse(6,-20,3,4,0.45,0,Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#172334";
  ctx.fillRect(-4,-18,2,2);
  ctx.fillRect(3,-18,2,2);

  ctx.strokeStyle = "rgba(80,35,30,.55)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-3,-10);
  ctx.quadraticCurveTo(0,-9,3,-10);
  ctx.stroke();

  ctx.restore();
}


/* =========================================================
   ショップ描画
   ========================================================= */

function drawShop3D(ctx,s,wx,wy){
  if(!s) return;

  const x = wx(s.x);
  const y = wy(s.y);
  const w = s.w || 34;
  const h = s.h || 34;

  crShadow(ctx,x - 4,y + 2,w + 8,h + 8,0.25);

  ctx.save();

  ctx.globalAlpha = 0.25;
  ctx.fillStyle = "#fff7a8";
  ctx.beginPath();
  ctx.ellipse(x + w / 2,y + h / 2,w * 0.95,h * 0.85,0,0,Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 1;

  const grad = ctx.createLinearGradient(x,y,x,y + h);
  grad.addColorStop(0,"#ffcc66");
  grad.addColorStop(1,s.color || "#ff8f3d");

  ctx.fillStyle = grad;
  crRound(ctx,x,y,w,h,9);
  ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,.55)";
  ctx.lineWidth = 2;
  crRound(ctx,x + 2,y + 2,w - 4,h - 4,7);
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,.24)";
  crRound(ctx,x + 5,y + 4,w - 10,h * 0.24,6);
  ctx.fill();

  ctx.fillStyle = "#fff";
  ctx.font = "900 12px system-ui";
  ctx.textAlign = "center";
  ctx.fillText("強",x + w / 2,y + h * 0.68);
  ctx.textAlign = "left";

  ctx.restore();
}


/* =========================================================
   コイン描画
   ========================================================= */

function drawCoin3D(ctx,d,wx,wy){
  if(!d) return;

  const x = wx(d.x);
  const y = wy(d.y);
  const pulse = 1 + Math.sin((typeof G !== "undefined" ? G.time : 0) * 0.18) * 0.08;

  ctx.save();

  ctx.globalAlpha = 0.35;
  ctx.fillStyle = "#fff7a8";
  ctx.beginPath();
  ctx.ellipse(x,y + 1,9 * pulse,5 * pulse,0,0,Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 1;

  const grad = ctx.createRadialGradient(x - 2,y - 2,1,x,y,7 * pulse);
  grad.addColorStop(0,"#fff7b0");
  grad.addColorStop(0.45,"#ffd84d");
  grad.addColorStop(1,"#c99022");

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x,y,5.5 * pulse,0,Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,.55)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x,y,5.5 * pulse,0,Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}
``

