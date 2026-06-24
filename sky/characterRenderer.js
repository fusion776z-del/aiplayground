/* =========================================================
characterRenderer.js
ブラッシュアップ版

game.js から呼ばれる関数:
- drawHeroAdventurer3D(ctx,p,wx,wy,time,atkBox)
- drawEnemy3D(ctx,e,wx,wy)
- drawBoss3D(ctx,b,wx,wy,t)
- drawNPC3D(ctx,n,wx,wy)
- drawShop3D(ctx,s,wx,wy)
- drawCoin3D(ctx,d,wx,wy)

方針:
- 今の路線は維持: かわいい2.5D/疑似3D/小さめキャラ
- 主人公を少し見やすく: 輪郭、影、顔、装備、覚醒オーラを強化
- 敵とNPCも少し立体感を追加
- 既存 game.js との互換を優先
========================================================= */

/* =========================================================
共通
========================================================= */
function crRound(ctx,x,y,w,h,r){
  r=Math.min(r||0,w/2,h/2);
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);
  ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath();
}

function crEllipse(ctx,x,y,rx,ry,rot,fill,stroke,line){
  ctx.beginPath();
  ctx.ellipse(x,y,rx,ry,rot||0,0,Math.PI*2);
  if(fill){ctx.fillStyle=fill;ctx.fill();}
  if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=line||1;ctx.stroke();}
}

function crShadow(ctx,x,y,w,h,a){
  ctx.save();
  ctx.globalAlpha=a==null?0.24:a;
  ctx.fillStyle="rgba(0,30,45,.36)";
  ctx.beginPath();
  ctx.ellipse(x+w/2,y+h*0.90,w*0.60,h*0.17,0,0,Math.PI*2);
  ctx.fill();
  ctx.restore();
}

function crText(ctx,text,x,y,size,color,align){
  ctx.save();
  ctx.fillStyle=color||"#fff";
  ctx.font="900 "+(size||12)+"px system-ui";
  ctx.textAlign=align||"left";
  ctx.fillText(String(text||""),x,y);
  ctx.restore();
}

function crSpark(ctx,x,y,s,color){
  ctx.save();
  ctx.strokeStyle=color||"#fff";
  ctx.lineWidth=1.5;
  ctx.lineCap="round";
  ctx.beginPath();
  ctx.moveTo(x,y-s);ctx.lineTo(x,y+s);
  ctx.moveTo(x-s,y);ctx.lineTo(x+s,y);
  ctx.stroke();
  ctx.restore();
}

function crGearColors(p){
  p=p||{};
  const swordLv=p.swordLv||0;
  const shieldLv=p.shieldLv||0;
  const bookLv=p.bookLv||0;
  const swordColors=["#e9fbff","#9ef7ff","#b56bff","#ffd84d","#fff7a8","#ffffff"];
  const shieldColors=["#346bd8","#35c7ff","#8b5cff","#ffd84d","#fff7a8","#ffffff"];
  return {
    sword:swordColors[Math.min(swordColors.length-1,swordLv)],
    shield:shieldColors[Math.min(shieldColors.length-1,shieldLv)],
    magic:bookLv>=5?"#fff7a8":bookLv>=3?"#b56bff":"#63d8ff",
    gold:swordLv>=3&&shieldLv>=3&&bookLv>=3,
    legend:swordLv>=5&&shieldLv>=5&&bookLv>=5
  };
}

function crPalette(p){
  const lifted=!!p.curseLifted;
  const gold=!!p.trueGold;
  const g=crGearColors(p);
  return {
    lifted,
    gold,
    legend:g.legend,
    body: lifted ? (gold ? "#48c96a" : "#2f8cff") : "#8b5a32",
    body2: lifted ? (gold ? "#2fae55" : "#1f62d0") : "#6b4328",
    outline: lifted ? (gold ? "#7b5b16" : "#143f8f") : "#4a2c1c",
    face: lifted ? "#ffe4bd" : "#a8784a",
    cheek: lifted ? "#ffb6a0" : "#d39a72",
    hair: gold ? "#ffd84d" : lifted ? "#f4c35a" : "#5b3520",
    belly: "#e7c28a",
    foot: "#263149",
    cape: gold ? "#d9a93d" : "#1f5fbf",
    aura: g.legend ? "#fff7a8" : gold ? "#ffd84d" : lifted ? "#9ef7ff" : ""
  };
}

/* =========================================================
武器・盾
========================================================= */
function drawSwordInHand(ctx,g,angle,sw,spin){
  ctx.save();
  ctx.rotate(angle||0);
  const len=spin?46:36;
  ctx.shadowBlur=g.legend?14:g.gold?9:0;
  ctx.shadowColor=g.legend?"#fff7a8":"#ffd84d";

  // blade outline
  ctx.strokeStyle="rgba(30,35,45,.65)";
  ctx.lineWidth=g.gold?6:5;
  ctx.lineCap="round";
  ctx.beginPath();
  ctx.moveTo(0,8);
  ctx.lineTo(0,-len-sw*8);
  ctx.stroke();

  // blade
  const grad=ctx.createLinearGradient(-3,-len,3,8);
  grad.addColorStop(0,"#ffffff");
  grad.addColorStop(0.45,g.legend?"#fff7a8":g.sword);
  grad.addColorStop(1,g.gold?"#d99a22":"#8fdcff");
  ctx.strokeStyle=grad;
  ctx.lineWidth=g.gold?4.2:3.4;
  ctx.beginPath();
  ctx.moveTo(0,7);
  ctx.lineTo(0,-len-sw*8);
  ctx.stroke();

  // guard and handle
  ctx.strokeStyle="#6b4a2a";
  ctx.lineWidth=4;
  ctx.beginPath();
  ctx.moveTo(-9,5);ctx.lineTo(9,5);
  ctx.stroke();
  ctx.strokeStyle="#3b2b20";
  ctx.lineWidth=3;
  ctx.beginPath();
  ctx.moveTo(0,7);ctx.lineTo(0,16);
  ctx.stroke();

  ctx.strokeStyle="rgba(255,255,255,.78)";
  ctx.lineWidth=1;
  ctx.beginPath();
  ctx.moveTo(-1,0);ctx.lineTo(-1,-len+7);
  ctx.stroke();

  if(g.legend){
    crSpark(ctx,0,-len-4,5,"#fff7a8");
  }
  ctx.restore();
}

function drawShieldInHand(ctx,g,angle,scale){
  ctx.save();
  ctx.rotate(angle||0);
  ctx.scale(scale||1,scale||1);
  ctx.shadowBlur=g.legend?14:g.gold?8:0;
  ctx.shadowColor=g.legend?"#fff7a8":"#ffd84d";

  const grad=ctx.createLinearGradient(-12,-16,14,18);
  grad.addColorStop(0,"#ffffff");
  grad.addColorStop(0.35,g.shield);
  grad.addColorStop(1,g.gold?"#b87920":"#1a418e");

  ctx.fillStyle=grad;
  ctx.strokeStyle=g.gold?"#fff7b0":"#d9ecff";
  ctx.lineWidth=2;
  ctx.beginPath();
  ctx.moveTo(-11,-15);
  ctx.lineTo(8,-17);
  ctx.lineTo(15,-1);
  ctx.lineTo(4,18);
  ctx.lineTo(-14,7);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle="rgba(255,255,255,.24)";
  ctx.beginPath();
  ctx.moveTo(-5,-10);
  ctx.lineTo(5,-12);
  ctx.lineTo(8,-1);
  ctx.lineTo(1,11);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle="rgba(8,25,45,.34)";
  ctx.lineWidth=1;
  ctx.beginPath();
  ctx.moveTo(0,-12);ctx.lineTo(0,14);
  ctx.stroke();

  ctx.restore();
}

function drawAttackArc(ctx,g,sw,spin){
  if(sw<=0)return;
  ctx.save();
  ctx.globalAlpha=spin?0.48:0.38;
  ctx.strokeStyle=g.legend?"#fff7a8":g.gold?"#ffd84d":"#ffe17a";
  ctx.lineWidth=spin?6:4.5;
  ctx.lineCap="round";
  ctx.shadowBlur=18;
  ctx.shadowColor=ctx.strokeStyle;
  ctx.beginPath();
  if(spin){
    ctx.arc(0,0,43,-Math.PI*0.95+sw*5,Math.PI*0.85+sw*5);
    ctx.stroke();
    ctx.globalAlpha*=0.5;
    ctx.beginPath();
    ctx.arc(0,0,32,Math.PI*0.3+sw*5,Math.PI*1.55+sw*5);
    ctx.stroke();
  }else{
    ctx.arc(8,-5,38,-1.45,0.35+sw);
    ctx.stroke();
  }
  ctx.restore();
}

/* =========================================================
主人公パーツ
========================================================= */
function heroLegsFront(ctx,pal,walk){
  const a=walk*0.22;
  ctx.save();
  ctx.strokeStyle=pal.outline;
  ctx.lineWidth=7;
  ctx.lineCap="round";
  ctx.beginPath();
  ctx.moveTo(-6,9);ctx.lineTo(-10-a*8,29);
  ctx.moveTo(6,9);ctx.lineTo(10+a*8,29);
  ctx.stroke();
  ctx.strokeStyle=pal.body2;
  ctx.lineWidth=5;
  ctx.beginPath();
  ctx.moveTo(-6,10);ctx.lineTo(-10-a*8,29);
  ctx.moveTo(6,10);ctx.lineTo(10+a*8,29);
  ctx.stroke();
  ctx.fillStyle=pal.foot;
  crRound(ctx,-16-a*8,28,14,5,3);ctx.fill();
  crRound(ctx,2+a*8,28,14,5,3);ctx.fill();
  ctx.restore();
}

function heroLegsBack(ctx,pal,walk){
  const a=walk*0.22;
  ctx.save();
  ctx.strokeStyle=pal.outline;
  ctx.lineWidth=7;
  ctx.lineCap="round";
  ctx.beginPath();
  ctx.moveTo(-6,9);ctx.lineTo(-10+a*8,29);
  ctx.moveTo(6,9);ctx.lineTo(10-a*8,29);
  ctx.stroke();
  ctx.strokeStyle=pal.body2;
  ctx.lineWidth=5;
  ctx.beginPath();
  ctx.moveTo(-6,10);ctx.lineTo(-10+a*8,29);
  ctx.moveTo(6,10);ctx.lineTo(10-a*8,29);
  ctx.stroke();
  ctx.fillStyle=pal.foot;
  crRound(ctx,-16+a*8,28,14,5,3);ctx.fill();
  crRound(ctx,2-a*8,28,14,5,3);ctx.fill();
  ctx.restore();
}

function heroLegsSide(ctx,pal,walk){
  const a=walk*0.24;
  ctx.save();
  ctx.strokeStyle=pal.outline;
  ctx.lineWidth=7;
  ctx.lineCap="round";
  ctx.beginPath();
  ctx.moveTo(-4,9);ctx.lineTo(-8-a*10,29);
  ctx.moveTo(5,9);ctx.lineTo(10+a*10,29);
  ctx.stroke();
  ctx.strokeStyle=pal.body2;
  ctx.lineWidth=5;
  ctx.beginPath();
  ctx.moveTo(-4,10);ctx.lineTo(-8-a*10,29);
  ctx.moveTo(5,10);ctx.lineTo(10+a*10,29);
  ctx.stroke();
  ctx.fillStyle=pal.foot;
  crRound(ctx,-15-a*10,28,14,5,3);ctx.fill();
  crRound(ctx,2+a*10,28,14,5,3);ctx.fill();
  ctx.restore();
}

function heroCapeFront(ctx,pal){
  if(!pal.lifted)return;
  ctx.save();
  ctx.fillStyle=pal.gold?"rgba(217,169,61,.62)":"rgba(31,95,191,.60)";
  ctx.strokeStyle="rgba(255,255,255,.18)";
  ctx.lineWidth=1;
  ctx.beginPath();
  ctx.moveTo(-14,-12);ctx.lineTo(-21,9);ctx.lineTo(-10,16);ctx.lineTo(-8,-4);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(14,-12);ctx.lineTo(21,9);ctx.lineTo(10,16);ctx.lineTo(8,-4);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.restore();
}

function heroCapeBack(ctx,pal,walk){
  if(!pal.lifted)return;
  const flap=Math.sin((walk||0))*2;
  ctx.save();
  const grad=ctx.createLinearGradient(0,-14,0,33);
  grad.addColorStop(0,pal.gold?"#ffd84d":"#2f8cff");
  grad.addColorStop(1,pal.cape);
  ctx.fillStyle=grad;
  ctx.strokeStyle="rgba(255,255,255,.22)";
  ctx.lineWidth=1;
  ctx.beginPath();
  ctx.moveTo(-18,-12);
  ctx.lineTo(18,-12);
  ctx.quadraticCurveTo(22,8+flap,16,31);
  ctx.lineTo(5,24);
  ctx.lineTo(0,33);
  ctx.lineTo(-5,24);
  ctx.lineTo(-16,31);
  ctx.quadraticCurveTo(-22,8-flap,-18,-12);
  ctx.closePath();
  ctx.fill();ctx.stroke();
  ctx.fillStyle="rgba(0,0,0,.14)";
  ctx.beginPath();ctx.moveTo(-2,-8);ctx.lineTo(0,31);ctx.lineTo(-8,25);ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.moveTo(2,-8);ctx.lineTo(0,31);ctx.lineTo(8,25);ctx.closePath();ctx.fill();
  ctx.restore();
}

function heroCapeSide(ctx,pal){
  if(!pal.lifted)return;
  ctx.save();
  ctx.fillStyle=pal.gold?"#d9a93d":"#1f5fbf";
  ctx.strokeStyle="rgba(255,255,255,.18)";
  ctx.lineWidth=1;
  ctx.beginPath();
  ctx.moveTo(-12,-11);ctx.lineTo(6,-9);ctx.lineTo(15,27);ctx.lineTo(-15,24);ctx.lineTo(-20,4);ctx.closePath();
  ctx.fill();ctx.stroke();
  ctx.fillStyle="rgba(0,0,0,.13)";
  ctx.beginPath();ctx.moveTo(-8,-9);ctx.lineTo(0,24);ctx.lineTo(-15,27);ctx.closePath();ctx.fill();
  ctx.restore();
}

function heroTorsoFront(ctx,pal){
  ctx.save();
  const grad=ctx.createLinearGradient(0,-18,0,15);
  grad.addColorStop(0,pal.body);
  grad.addColorStop(1,pal.body2);
  ctx.fillStyle=grad;
  ctx.strokeStyle=pal.outline;
  ctx.lineWidth=2;
  ctx.beginPath();
  ctx.moveTo(0,-18);ctx.lineTo(13,-5);ctx.lineTo(9,14);ctx.lineTo(-9,14);ctx.lineTo(-13,-5);ctx.closePath();
  ctx.fill();ctx.stroke();
  if(!pal.lifted){crEllipse(ctx,0,-1,5,10,0,pal.belly);}
  ctx.fillStyle="#6b4a2a";ctx.fillRect(-10,7,20,4);
  ctx.fillStyle="rgba(255,255,255,.22)";
  ctx.beginPath();ctx.moveTo(-5,-13);ctx.lineTo(0,-4);ctx.lineTo(5,-13);ctx.closePath();ctx.fill();
  ctx.restore();
}

function heroTorsoBack(ctx,pal){
  ctx.save();
  ctx.fillStyle=pal.body2;
  ctx.strokeStyle=pal.outline;
  ctx.lineWidth=2;
  ctx.beginPath();
  ctx.moveTo(0,-18);ctx.lineTo(13,-5);ctx.lineTo(9,14);ctx.lineTo(-9,14);ctx.lineTo(-13,-5);ctx.closePath();
  ctx.fill();ctx.stroke();
  ctx.fillStyle="#6b4a2a";ctx.fillRect(-10,7,20,4);
  ctx.restore();
}

function heroTorsoSide(ctx,pal){
  ctx.save();
  const grad=ctx.createLinearGradient(-8,-16,8,14);
  grad.addColorStop(0,pal.body);
  grad.addColorStop(1,pal.body2);
  crEllipse(ctx,0,-2,9,17,0,grad,pal.outline,2);
  if(!pal.lifted){crEllipse(ctx,4,0,3,9,-0.1,"#d6ae78");}
  ctx.fillStyle="#6b4a2a";ctx.fillRect(-8,7,16,4);
  ctx.restore();
}

function heroHeadFront(ctx,pal){
  ctx.save();
  crEllipse(ctx,0,-30,10,10.5,0,pal.face,pal.outline,1.6);
  if(pal.lifted){
    crEllipse(ctx,0,-36,10.8,5.6,0,pal.hair);
    ctx.fillStyle=pal.hair;
    ctx.beginPath();
    ctx.ellipse(-5,-35,4,4,-0.4,0,Math.PI*2);
    ctx.ellipse(2,-37,5,4,0.2,0,Math.PI*2);
    ctx.ellipse(6,-34,3,4,0.4,0,Math.PI*2);
    ctx.fill();
  }else{
    crEllipse(ctx,-8,-37,5,7,-0.8,"#6b3e24",pal.outline,1);
    crEllipse(ctx,8,-37,5,7,0.8,"#6b3e24",pal.outline,1);
    crEllipse(ctx,-8,-36,2.3,3.5,-0.8,"#8b5a32");
    crEllipse(ctx,8,-36,2.3,3.5,0.8,"#8b5a32");
  }
  ctx.fillStyle="#172334";
  ctx.fillRect(-4,-31,2,2);
  ctx.fillRect(3,-31,2,2);
  ctx.fillStyle="#fff";
  ctx.fillRect(-3.6,-31,1,1);
  ctx.fillRect(3.4,-31,1,1);
  ctx.fillStyle=pal.cheek;
  ctx.globalAlpha=.55;
  ctx.beginPath();ctx.arc(-6,-27,2,0,Math.PI*2);ctx.arc(6,-27,2,0,Math.PI*2);ctx.fill();
  ctx.globalAlpha=1;
  if(!pal.lifted){crEllipse(ctx,0,-26.5,2.2,1.4,0,"#2a1a12");}
  ctx.restore();
}

function heroHeadBack(ctx,pal){
  ctx.save();
  crEllipse(ctx,0,-30,9.8,11,0,pal.lifted?pal.hair:pal.face,pal.outline,1.5);
  if(!pal.lifted){
    crEllipse(ctx,-8,-37,5,7,-0.8,"#6b3e24",pal.outline,1);
    crEllipse(ctx,8,-37,5,7,0.8,"#6b3e24",pal.outline,1);
  }
  ctx.restore();
}

function heroHeadSide(ctx,pal){
  ctx.save();
  crEllipse(ctx,2,-30,8.6,10,0,pal.face,pal.outline,1.5);
  if(pal.lifted){crEllipse(ctx,0,-36,9,5,0,pal.hair);}
  else{crEllipse(ctx,-2,-37,5,7,-0.6,"#6b3e24",pal.outline,1);}
  ctx.fillStyle="#172334";ctx.fillRect(4,-31,2,2);
  ctx.fillStyle="#fff";ctx.fillRect(4.4,-31,1,1);
  if(!pal.lifted){crEllipse(ctx,8,-27,2,1.4,0,"#2a1a12");}
  ctx.restore();
}

function heroArmsFront(ctx,pal,g,walk,sw,spin){
  const a=walk*0.24;
  ctx.save();
  ctx.strokeStyle=pal.outline;ctx.lineWidth=7;ctx.lineCap="round";
  ctx.beginPath();ctx.moveTo(-10,-7);ctx.lineTo(-19-a*6,-1+a*4);ctx.moveTo(10,-7);ctx.lineTo(19+a*6,2-a*4);ctx.stroke();
  ctx.strokeStyle=pal.body2;ctx.lineWidth=5;
  ctx.beginPath();ctx.moveTo(-10,-7);ctx.lineTo(-19-a*6,-1+a*4);ctx.moveTo(10,-7);ctx.lineTo(19+a*6,2-a*4);ctx.stroke();
  ctx.save();ctx.translate(-22-a*6,0+a*4);drawSwordInHand(ctx,g,-0.75-sw*0.75,sw,spin);ctx.restore();
  ctx.save();ctx.translate(23+a*6,2-a*4);drawShieldInHand(ctx,g,0.2,1);ctx.restore();
  ctx.restore();
}

function heroArmsBack(ctx,pal,g,walk,sw,spin){
  const a=walk*0.24;
  ctx.save();
  ctx.strokeStyle=pal.outline;ctx.lineWidth=7;ctx.lineCap="round";
  ctx.beginPath();ctx.moveTo(10,-7);ctx.lineTo(19+a*6,-1+a*4);ctx.moveTo(-10,-7);ctx.lineTo(-19-a*6,2-a*4);ctx.stroke();
  ctx.strokeStyle=pal.body2;ctx.lineWidth=5;
  ctx.beginPath();ctx.moveTo(10,-7);ctx.lineTo(19+a*6,-1+a*4);ctx.moveTo(-10,-7);ctx.lineTo(-19-a*6,2-a*4);ctx.stroke();
  ctx.save();ctx.translate(22+a*6,0+a*4);drawSwordInHand(ctx,g,0.62+sw*0.45,sw,spin);ctx.restore();
  ctx.save();ctx.translate(-23-a*6,2-a*4);drawShieldInHand(ctx,g,-0.2,0.92);ctx.restore();
  ctx.restore();
}

function heroArmsSide(ctx,pal,g,walk,sw,spin){
  const a=walk*0.16;
  ctx.save();
  ctx.strokeStyle=pal.outline;ctx.lineWidth=7;ctx.lineCap="round";
  ctx.beginPath();ctx.moveTo(8,-7);ctx.lineTo(18+a*6,2+a*4);ctx.moveTo(-8,-7);ctx.lineTo(-17-a*5,3-a*3);ctx.stroke();
  ctx.strokeStyle=pal.body2;ctx.lineWidth=5;
  ctx.beginPath();ctx.moveTo(8,-7);ctx.lineTo(18+a*6,2+a*4);ctx.moveTo(-8,-7);ctx.lineTo(-17-a*5,3-a*3);ctx.stroke();
  ctx.save();ctx.translate(21+a*6,3+a*4);drawSwordInHand(ctx,g,-0.35-sw*0.85,sw,spin);ctx.restore();
  ctx.save();ctx.translate(-20-a*5,4-a*3);drawShieldInHand(ctx,g,-0.18,0.85);ctx.restore();
  ctx.restore();
}

/* =========================================================
主人公: 方向別
========================================================= */
function drawHeroFront(ctx,p,walk,sw,spin){
  const pal=crPalette(p),g=crGearColors(p);
  heroCapeFront(ctx,pal);
  heroLegsFront(ctx,pal,walk);
  heroTorsoFront(ctx,pal);
  heroArmsFront(ctx,pal,g,walk,sw,spin);
  heroHeadFront(ctx,pal);
}

function drawHeroBack(ctx,p,walk,sw,spin){
  const pal=crPalette(p),g=crGearColors(p);
  heroLegsBack(ctx,pal,walk);
  heroTorsoBack(ctx,pal);
  heroArmsBack(ctx,pal,g,walk,sw,spin);
  heroHeadBack(ctx,pal);
  heroCapeBack(ctx,pal,walk);
}

function drawHeroSide(ctx,p,walk,sw,spin){
  const pal=crPalette(p),g=crGearColors(p);
  heroLegsSide(ctx,pal,walk);
  heroCapeSide(ctx,pal);
  heroTorsoSide(ctx,pal);
  heroArmsSide(ctx,pal,g,walk,sw,spin);
  heroHeadSide(ctx,pal);
}

function drawHeroAura(ctx,p,time){
  const pal=crPalette(p);
  if(!pal.aura)return;
  ctx.save();
  const pulse=1+Math.sin((time||0)*0.08)*0.06;
  ctx.globalAlpha=pal.legend?0.30:0.20;
  ctx.fillStyle=pal.aura;
  ctx.shadowBlur=pal.legend?28:18;
  ctx.shadowColor=pal.aura;
  ctx.beginPath();
  ctx.ellipse(0,2,30*pulse,42*pulse,0,0,Math.PI*2);
  ctx.fill();
  ctx.restore();
}

function drawHeroAdventurer3D(ctx,p,wx,wy,time,atkBox){
  if(!p)return;
  if(p.inv>0&&p.inv%8<4)return;

  const x=wx(p.x),y=wy(p.y);
  const cx=x+p.w/2,cy=y+p.h/2;
  const sp=Math.hypot(p.vx||0,p.vy||0);
  p.anim=(p.anim||0)+sp*0.18+0.04;
  const walk=Math.sin(p.anim);
  const bob=sp>0.05?Math.abs(walk)*2:Math.sin((time||0)*0.05)*0.5;
  const attacking=p.attackT>0;
  const spin=attacking&&p.combo===3;
  const attackTotal=spin?18:12;
  const raw=attacking?1-(p.attackT/attackTotal):0;
  const swing=attacking?Math.sin(raw*Math.PI):0;
  const g=crGearColors(p);

  crShadow(ctx,x-12,y+6,p.w+24,p.h+14,0.30);

  ctx.save();
  // game.js側で20%圧縮パッチを入れている場合に近い見た目へ。
  ctx.translate(cx,cy+bob+4);
  ctx.scale(1,0.82);

  drawHeroAura(ctx,p,time);

  if(p.trueGold){ctx.shadowBlur=22;ctx.shadowColor="#ffd84d";}
  else if(p.curseLifted){ctx.shadowBlur=12;ctx.shadowColor="#9ef7ff";}

  if(attacking){drawAttackArc(ctx,g,swing,spin);}

  const dir=p.dir||"down";
  if(dir==="up")drawHeroBack(ctx,p,walk,swing,spin);
  else if(dir==="left"){ctx.scale(-1,1);drawHeroSide(ctx,p,walk,swing,spin);}
  else if(dir==="right")drawHeroSide(ctx,p,walk,swing,spin);
  else drawHeroFront(ctx,p,walk,swing,spin);

  ctx.restore();

  if(p.attackT>0&&typeof atkBox==="function"){
    try{atkBox();}catch(e){}
  }
}

/* =========================================================
敵描画
========================================================= */
function drawEnemy3D(ctx,e,wx,wy){
  if(!e)return;
  const x=wx(e.x),y=wy(e.y),w=e.w||24,h=e.h||22;
  const col=e.hitT>0?"#fff":(e.color||"#78df72");
  const t=(typeof G!=="undefined"?G.time:0)+(e.t||0);
  const bob=e.type==="bat"?Math.sin(t*0.12)*3:Math.sin(t*0.08)*1.2;

  crShadow(ctx,x,y+2,w,h,0.16);
  ctx.save();
  ctx.translate(0,bob);

  if(e.type==="bat"){
    const flap=Math.sin(t*0.28)*0.25;
    ctx.fillStyle="rgba(20,35,55,.35)";
    crEllipse(ctx,x+w/2,y+h/2+5,w*0.38,h*0.30,0,"rgba(20,35,55,.35)");
    ctx.fillStyle=col;
    ctx.beginPath();
    ctx.ellipse(x+4,y+10,14,5,-0.55-flap,0,Math.PI*2);
    ctx.ellipse(x+w-4,y+10,14,5,0.55+flap,0,Math.PI*2);
    ctx.fill();
    crEllipse(ctx,x+w/2,y+11,8,8,0,col,"rgba(255,255,255,.45)",1.2);
    ctx.fillStyle="#10202a";
    ctx.fillRect(x+w/2-4,y+9,2,2);
    ctx.fillRect(x+w/2+3,y+9,2,2);
  }else if(e.type==="fast"){
    ctx.save();
    ctx.rotate(0);
    crEllipse(ctx,x+w/2,y+h/2,w/2,h/2,0,col,"rgba(255,255,255,.42)",1.2);
    ctx.fillStyle="rgba(255,255,255,.28)";
    crEllipse(ctx,x+w*0.38,y+h*0.38,w*0.18,h*0.10,-0.4,"rgba(255,255,255,.28)");
    ctx.fillStyle="#14202c";
    ctx.fillRect(x+w/2-5,y+h/2-2,3,3);
    ctx.fillRect(x+w/2+3,y+h/2-2,3,3);
    ctx.restore();
  }else{
    const grad=ctx.createRadialGradient(x+w*0.35,y+h*0.28,2,x+w/2,y+h/2,w*0.58);
    grad.addColorStop(0,"#ffffff");
    grad.addColorStop(0.30,col);
    grad.addColorStop(1,"rgba(40,80,45,.85)");
    crEllipse(ctx,x+w/2,y+h/2,w/2,h/2,0,grad,"rgba(255,255,255,.38)",1.2);
    ctx.fillStyle="#14202c";
    ctx.fillRect(x+w/2-5,y+h/2-2,3,3);
    ctx.fillRect(x+w/2+3,y+h/2-2,3,3);
  }
  ctx.restore();
}

/* =========================================================
ボス描画
========================================================= */
function drawBossEyeSafe(ctx,x,y,color){
  ctx.fillStyle="#10202a";
  ctx.beginPath();ctx.ellipse(x,y,5,6,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=color||"#fff";
  ctx.beginPath();ctx.ellipse(x+1.4,y-1.4,2,2.6,0,0,Math.PI*2);ctx.fill();
}

function drawBossGlowSafe(ctx,cx,cy,w,h,color,a){
  ctx.save();
  ctx.globalAlpha=a==null?0.22:a;
  ctx.fillStyle=color||"#9effa1";
  ctx.shadowBlur=22;
  ctx.shadowColor=color||"#9effa1";
  ctx.beginPath();ctx.ellipse(cx,cy,w*0.72,h*0.55,0,0,Math.PI*2);ctx.fill();
  ctx.restore();
}

function bossThemeByStage(){
  const i=typeof G!=="undefined"?(G.stageIndex||0):0;
  return [
    {main:"#73df78",sub:"#b7ff9a",dark:"#1e6b45",glow:"#9effa1",shape:"griffin"},
    {main:"#46c66a",sub:"#b9ff9a",dark:"#1f6f3a",glow:"#a8ff86",shape:"tree"},
    {main:"#72f7ff",sub:"#d8ffff",dark:"#237e9a",glow:"#b9fbff",shape:"crystal"},
    {main:"#ff7048",sub:"#ffd84d",dark:"#8b2d22",glow:"#ffb347",shape:"wyvern"},
    {main:"#ffd84d",sub:"#fff7a8",dark:"#8c6d35",glow:"#fff2a5",shape:"guardian"},
    {main:"#9b7cff",sub:"#cfd8ff",dark:"#35266f",glow:"#b8a8ff",shape:"leviathan"},
    {main:"#8b5cff",sub:"#efe7ff",dark:"#171026",glow:"#b56bff",shape:"void"}
  ][i]||{main:"#73df78",sub:"#b7ff9a",dark:"#1e6b45",glow:"#9effa1",shape:"griffin"};
}

function drawBoss3D(ctx,b,wx,wy,t){
  if(!b)return;
  const th=bossThemeByStage();
  const x=wx(b.x),y=wy(b.y),w=b.w||120,h=b.h||100;
  const cx=x+w/2,cy=y+h/2+Math.sin((t||0)*0.05)*3;
  const hpRate=Math.max(0,Math.min(1,(b.hp||1)/(b.maxHp||1)));

  crShadow(ctx,x,y,w,h,0.36);
  drawBossGlowSafe(ctx,cx,cy,w,h,th.glow,hpRate<0.35?0.34:0.22);

  ctx.save();
  ctx.translate(cx,cy);
  ctx.shadowBlur=hpRate<0.35?28:16;
  ctx.shadowColor=th.glow;
  ctx.fillStyle=th.main;
  ctx.strokeStyle=th.sub;
  ctx.lineWidth=3;

  if(th.shape==="tree"){
    ctx.fillStyle="#5b3922";crRound(ctx,-w*.18,-h*.22,w*.36,h*.62,16);ctx.fill();ctx.stroke();
    ctx.fillStyle=th.main;
    crEllipse(ctx,0,-h*.35,w*.36,h*.28,0,th.main);
    crEllipse(ctx,-w*.24,-h*.18,w*.24,h*.20,0,th.main);
    crEllipse(ctx,w*.24,-h*.18,w*.24,h*.20,0,th.main);
  }else if(th.shape==="crystal"){
    ctx.beginPath();ctx.moveTo(0,-h*.55);ctx.lineTo(w*.34,-h*.05);ctx.lineTo(w*.18,h*.45);ctx.lineTo(-w*.18,h*.45);ctx.lineTo(-w*.34,-h*.05);ctx.closePath();ctx.fill();ctx.stroke();
  }else if(th.shape==="leviathan"){
    ctx.lineWidth=12;ctx.lineCap="round";ctx.strokeStyle=th.sub;ctx.beginPath();
    for(let i=0;i<7;i++){const xx=-w*.36+i*w*.12,yy=Math.sin((t||0)*.05+i*.8)*18+i*5;if(i===0)ctx.moveTo(xx,yy);else ctx.lineTo(xx,yy);}ctx.stroke();
    ctx.fillStyle=th.main;crEllipse(ctx,w*.18,-h*.18,w*.26,h*.18,.1,th.main,"#fff",3);
  }else if(th.shape==="void"){
    const grad=ctx.createRadialGradient(0,-h*.1,8,0,0,w*.55);
    grad.addColorStop(0,th.sub);grad.addColorStop(.45,th.main);grad.addColorStop(1,"#05020a");
    crEllipse(ctx,0,0,w*.34,h*.40,0,grad,th.sub,3);
    ctx.strokeStyle=th.glow;
    for(let i=0;i<4;i++){const a=(t||0)*.025+i/4*Math.PI*2;ctx.beginPath();ctx.arc(Math.cos(a)*w*.40,Math.sin(a)*h*.32,12,0,Math.PI*2);ctx.stroke();}
  }else{
    const flap=Math.sin((t||0)*0.08)*0.18;
    ctx.beginPath();ctx.ellipse(-w*.38,0,w*.30,h*.20,-.55-flap,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.ellipse(w*.38,0,w*.30,h*.20,.55+flap,0,Math.PI*2);ctx.fill();
    crEllipse(ctx,0,5,w*.30,h*.34,0,th.main,th.sub,3);
    crEllipse(ctx,0,-h*.26,w*.22,h*.17,0,th.main,"#fff",2);
  }
  drawBossEyeSafe(ctx,-10,-h*.12,"#fff");
  drawBossEyeSafe(ctx,10,-h*.12,"#fff");
  ctx.restore();

  crText(ctx,b.name||"BOSS",cx,y-10,12,"#fff","center");
  ctx.save();
  ctx.fillStyle="rgba(8,25,45,.55)";crRound(ctx,cx-48,y-5,96,6,999);ctx.fill();
  ctx.fillStyle=hpRate<=.33?"#ff6262":hpRate<=.66?"#ffd84d":th.glow;
  crRound(ctx,cx-48,y-5,Math.max(2,96*hpRate),6,999);ctx.fill();
  ctx.restore();
}

/* =========================================================
NPC / Shop / Coin
========================================================= */
function drawNPC3D(ctx,n,wx,wy){
  if(!n)return;
  const x=wx(n.x),y=wy(n.y),w=n.w||24,h=n.h||32;
  const skin=n.skin||"#f1c79b";
  const hair=n.hair||"#2d1b12";
  const outfit=n.outfit||n.color||"#3f6fb5";
  const accent=n.accent||"#e8edf5";
  const t=(typeof G!=="undefined"?G.time:0);
  const bob=Math.sin(t*0.05+(n.x||0))*0.6;

  crShadow(ctx,x-4,y+5,w+8,h+10,0.24);
  ctx.save();ctx.translate(x+w/2,y+h/2+bob);
  ctx.fillStyle="#2b3445";crRound(ctx,-8,7,6,14,3);ctx.fill();crRound(ctx,2,7,6,14,3);ctx.fill();
  ctx.fillStyle="#1d2230";crRound(ctx,-10,19,9,4,2);ctx.fill();crRound(ctx,1,19,9,4,2);ctx.fill();
  ctx.fillStyle=outfit;ctx.strokeStyle="rgba(255,255,255,.45)";ctx.lineWidth=1;crRound(ctx,-11,-3,22,19,5);ctx.fill();ctx.stroke();
  ctx.fillStyle=accent;ctx.beginPath();ctx.moveTo(-5,-3);ctx.lineTo(0,5);ctx.lineTo(5,-3);ctx.closePath();ctx.fill();
  ctx.strokeStyle=outfit;ctx.lineWidth=5;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(-11,1);ctx.lineTo(-15,12);ctx.moveTo(11,1);ctx.lineTo(15,12);ctx.stroke();
  ctx.fillStyle=skin;ctx.beginPath();ctx.arc(-15,13,3,0,Math.PI*2);ctx.arc(15,13,3,0,Math.PI*2);ctx.fill();
  crRound(ctx,-4,-9,8,7,3);ctx.fill();
  crEllipse(ctx,0,-17,9,10,0,skin,"rgba(80,35,30,.25)",1);
  crEllipse(ctx,-9,-17,2.3,3.2,0,skin);crEllipse(ctx,9,-17,2.3,3.2,0,skin);
  crEllipse(ctx,0,-23,9.5,5.5,0,hair);
  ctx.fillStyle=hair;ctx.beginPath();ctx.ellipse(-4,-21,4,4,-0.4,0,Math.PI*2);ctx.ellipse(2,-22,5,4,0.25,0,Math.PI*2);ctx.ellipse(6,-20,3,4,0.45,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#172334";ctx.fillRect(-4,-18,2,2);ctx.fillRect(3,-18,2,2);
  ctx.strokeStyle="rgba(80,35,30,.55)";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-3,-10);ctx.quadraticCurveTo(0,-9,3,-10);ctx.stroke();
  ctx.restore();
}

function drawShop3D(ctx,s,wx,wy){
  if(!s)return;
  const x=wx(s.x),y=wy(s.y),w=s.w||34,h=s.h||34;
  const t=(typeof G!=="undefined"?G.time:0);
  crShadow(ctx,x-4,y+2,w+8,h+8,0.25);
  ctx.save();
  ctx.globalAlpha=.25;ctx.fillStyle="#fff7a8";ctx.beginPath();ctx.ellipse(x+w/2,y+h/2,w*.95,h*.85,0,0,Math.PI*2);ctx.fill();
  const grad=ctx.createLinearGradient(x,y,x,y+h);grad.addColorStop(0,"#ffcc66");grad.addColorStop(1,s.color||"#ff8f3d");
  ctx.globalAlpha=1;ctx.fillStyle=grad;crRound(ctx,x,y,w,h,9);ctx.fill();
  ctx.strokeStyle="rgba(255,255,255,.55)";ctx.lineWidth=2;crRound(ctx,x+2,y+2,w-4,h-4,7);ctx.stroke();
  ctx.fillStyle="rgba(255,255,255,.24)";crRound(ctx,x+5,y+4,w-10,h*.24,6);ctx.fill();
  ctx.fillStyle="#fff";ctx.font="900 12px system-ui";ctx.textAlign="center";ctx.fillText("強",x+w/2,y+h*.68);ctx.textAlign="left";
  if(t%50<25){crSpark(ctx,x+w*.22,y+h*.24,4,"#fff7a8");}
  ctx.restore();
}

function drawCoin3D(ctx,d,wx,wy){
  if(!d)return;
  const x=wx(d.x),y=wy(d.y);
  const pulse=1+Math.sin((typeof G!=="undefined"?G.time:0)*0.18)*0.08;
  ctx.save();
  ctx.globalAlpha=.35;ctx.fillStyle="#fff7a8";ctx.beginPath();ctx.ellipse(x,y+1,9*pulse,5*pulse,0,0,Math.PI*2);ctx.fill();
  const grad=ctx.createRadialGradient(x-2,y-2,1,x,y,7*pulse);
  grad.addColorStop(0,"#fff7b0");grad.addColorStop(.45,"#ffd84d");grad.addColorStop(1,"#c99022");
  ctx.globalAlpha=1;ctx.fillStyle=grad;ctx.beginPath();ctx.arc(x,y,5.5*pulse,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle="rgba(255,255,255,.55)";ctx.lineWidth=1;ctx.beginPath();ctx.arc(x,y,5.5*pulse,0,Math.PI*2);ctx.stroke();
  ctx.restore();
}
