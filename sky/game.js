"use strict";

const cvs=document.getElementById("game");
const ctx=cvs.getContext("2d");
const VW=360,VH=640;
const STAGES=[Stage1,Stage2,Stage3,Stage4,Stage5,Stage6,Stage7];

ctx.imageSmoothingEnabled=false;

// ─── バランステーブル（旧 balance_patch.js） ───────────────────────────────
// 注: bossHpMul / bossAtkMul / bossShotMul は以前ここにあったが、
// ボス生成処理が魔法陣ワープ式パッチ側に完全に置き換わった際に
// 参照されなくなった（実質デッドコード）。ボスHPは BOSS_HP_SCALE
// （このファイル内の「ステージ進行型 ボスHP大幅強化パッチ」）が
// 単独で管理しているため、ここでは雑魚敵用の値だけを残す。
const BALANCE=[
  {name:"Stage 1",enemyHpMul:0.70,enemyAtkMul:0.55,enemySpeedMul:0.68,
   enemyAggro:135,enemyGiveUp:195,enemyContactInv:92,coinBonus:1.00},
  {name:"Stage 2",enemyHpMul:0.90,enemyAtkMul:0.75,enemySpeedMul:0.82,
   enemyAggro:155,enemyGiveUp:220,enemyContactInv:84,coinBonus:1.00},
  {name:"Stage 3",enemyHpMul:1.08,enemyAtkMul:0.95,enemySpeedMul:0.96,
   enemyAggro:178,enemyGiveUp:250,enemyContactInv:78,coinBonus:1.00},
  {name:"Stage 4",enemyHpMul:1.32,enemyAtkMul:1.15,enemySpeedMul:1.06,
   enemyAggro:205,enemyGiveUp:285,enemyContactInv:72,coinBonus:1.05},
  {name:"Stage 5",enemyHpMul:1.62,enemyAtkMul:1.35,enemySpeedMul:1.16,
   enemyAggro:230,enemyGiveUp:320,enemyContactInv:66,coinBonus:1.08},
  {name:"Stage 6",enemyHpMul:1.95,enemyAtkMul:1.55,enemySpeedMul:1.26,
   enemyAggro:255,enemyGiveUp:355,enemyContactInv:62,coinBonus:1.12},
  {name:"Stage 7",enemyHpMul:2.30,enemyAtkMul:1.80,enemySpeedMul:1.34,
   enemyAggro:285,enemyGiveUp:395,enemyContactInv:58,coinBonus:1.15}
];

function getBalance(){
  const i=Math.max(0,Math.min(BALANCE.length-1,G.stageIndex||0));
  return BALANCE[i];
}

// ─── ダッシュ攻撃定数（旧 dash_attack_patch.js） ─────────────────────────
const DASH_DURATION=10;
const DASH_COOLDOWN=60;
const DASH_KILL_RECOVER=30;
const DASH_SPEED=7.6;
const DASH_INVINCIBLE=18;
const DASH_DAMAGE_RATE=0.95;
const DASH_BOSS_DAMAGE_RATE=0.55;
const DASH_PUSH_ENEMY=18;
const DASH_PUSH_BOSS=8;
let dashSerial=0;

// 注: 旧 stage7_boss_nerf_patch.js の S7_HP_RATE / S7_ATK_RATE /
// S7_SHOT_RATE / S7_MOVE_RATE はここにあったが、参照元だった旧
// spawnBoss() が魔法陣ワープ式パッチで完全に上書きされたため、
// 実際には一度も使われていなかった（デッドコード）。
// b.__s7MoveRate は他の場所で参照されているが、設定箇所がなくなった
// ことで常に undefined → ||1 のフォールバックになる。これは現状の
// 実機動作と同じなので挙動は変わらない。

const input={
  up:0,down:0,left:0,right:0,
  ax:0,ay:0,
  attack:0,magic:0,dash:0,action:0,start:0
};

const G={
  state:"title",
  stageIndex:0,
  time:0,
  lock:0,
  camera:{x:0,y:0},
  map:null,
  player:null,
  enemies:[],
  npcs:[],
  shops:[],
  chests:[],
  doors:[],
  terrain:[],
  drops:[],
  effects:[],
  bullets:[],
  boss:null,
  talk:null,
  shop:null,
  bossDefeatT:0,
  message:"",
  messageT:0
};

function flush(){
  input.attack=input.action=input.start=input.magic=input.dash=0;
}

function C(k){
  const v=input[k];
  input[k]=0;
  return G.lock>0?0:v;
}

function cl(v,a,b){
  return Math.max(a,Math.min(b,v));
}

function R(a,b){
  return Math.random()*(b-a)+a;
}

function hit(a,b){
  return a&&b&&a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
}

function nrm(x,y){
  const l=Math.hypot(x,y)||1;
  return {x:x/l,y:y/l,l};
}

function msg(s,t=90){
  G.message=s;
  G.messageT=t;
}

function RR(x,y,w,h,r){
  r=Math.min(r,w/2,h/2);
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);
  ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath();
}

function clone(s){
  return {
    ...s,
    terrain:s.terrain.map(o=>({...o})),
    npcs:s.npcs.map(o=>({...o,lines:[...o.lines]})),
    shops:s.shops.map(o=>({...o})),
    chests:s.chests.map(o=>({...o,item:{...o.item}})),
    enemies:s.enemies.map(o=>({...o})),
    doors:s.doors.map(o=>({...o})),
    boss:{...s.boss},
    bossRoom:{...s.bossRoom},
    onClear:s.onClear
  };
}

function newP(x,y){
  return {
    x,y,w:24,h:28,
    dir:"down",
    vx:0,vy:0,
    hp:16,maxHp:16,
    mp:6,maxMp:6,
    atk:3,def:1,
    magic:3,magicLv:1,magicRadius:18,
    speed:3.35,
    inv:60,
    dashT:0,dashCd:0,
    attackT:0,attackCd:0,
    combo:0,comboT:0,
    coins:0,
    inventory:[],
    cores:[],
    swordLv:0,
    shieldLv:0,
    armorLv:0,
    bookLv:0,
    anim:0,
    curseLifted:false,
    trueGold:false
  };
}

function mkE(e){
  const b=getBalance();
  const st=G.stageIndex||0;

  // enemyTypes.js が読み込まれていれば、敵性能は EnemyTypes 側から作る。
  // 読み込まれていない場合でも旧処理相当で動くようにフォールバックする。
  let enemy;
  if(typeof createEnemyFromPlacement === "function"){
    enemy=createEnemyFromPlacement(e);
  }else if(e.id==="wind_bat"){
    enemy={...e,type:"bat",w:24,h:20,hp:2,maxHp:2,atk:2,speed:1.25,t:0,hitT:0,color:"#8de7ff"};
  }else if(e.id==="fast"){
    enemy={...e,type:"fast",w:24,h:22,hp:2,maxHp:2,atk:2,speed:1.55,t:0,hitT:0,color:"#ffcc66"};
  }else{
    enemy={...e,type:"slime",w:24,h:22,hp:3,maxHp:3,atk:2,speed:.9,t:0,hitT:0,color:"#78df72"};
  }

  // 必須値の保険。EnemyTypes 側に未定義の敵IDが来ても落ちないようにする。
  enemy.type=enemy.type||enemy.id||"slime";
  enemy.w=enemy.w||24;
  enemy.h=enemy.h||22;
  enemy.hp=enemy.hp||1;
  enemy.maxHp=enemy.maxHp||enemy.hp;
  enemy.atk=enemy.atk||enemy.touchDamage||1;
  enemy.speed=enemy.speed||0.9;
  enemy.t=enemy.t||0;
  enemy.hitT=enemy.hitT||0;
  enemy.color=enemy.color||"#78df72";

  // バランス倍率適用
  enemy.hp=Math.max(1,Math.round(enemy.hp*b.enemyHpMul));
  enemy.maxHp=enemy.hp;
  enemy.atk=Math.max(1,Math.round(enemy.atk*b.enemyAtkMul));
  enemy.speed=Math.max(0.45,enemy.speed*b.enemySpeedMul);

  // ステージ1だけ追加抑制
  if(st===0){
    if(enemy.type==="fast"){
      enemy.speed*=0.82;
      enemy.hp=Math.max(1,enemy.hp-1);
      enemy.maxHp=enemy.hp;
    }
    if(enemy.type==="bat"){
      enemy.speed*=0.78;
      enemy.atk=1;
    }
  }

  // 後半の雑魚を少し硬く
  if(st>=4){
    if(enemy.type==="fast"){
      enemy.hp+=1;
      enemy.maxHp=enemy.hp;
    }
    if(enemy.type==="bat")enemy.speed*=1.05;
  }

  enemy.wake=false;
  enemy.attackPause=0;
  enemy.balanceApplied=true;
  return enemy;
}
// ─── 雑魚敵数 増加設定 ─────────────────────────────// ─── 雑魚敵数 増加設定 ─────────────────────────1.00 = そのまま
// 1.50 = 約1.5倍
// 2.00 = 約2倍
// ステージが進むほど多めにする設定
const ENEMY_COUNT_MUL = [
  1.35, // Stage1
  1.50, // Stage2
  1.65, // Stage3
  1.80, // Stage4
  2.00, // Stage5
  2.20, // Stage6
  2.40  // Stage7
];

const ENEMY_EXTRA_OFFSETS = [
  {x: 34, y: 0},
  {x: -34, y: 0},
  {x: 0, y: 34},
  {x: 0, y: -34},
  {x: 28, y: 28},
  {x: -28, y: 28},
  {x: 28, y: -28},
  {x: -28, y: -28}
];

function rectHit(a,b){
  return a && b &&
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y;
}

function canPlaceExtraEnemy(x,y,w,h){
  if(!G.map) return true;

  const r = {x,y,w,h};

  // マップ外に出さない
  if(x < 36 || y < 36) return false;
  if(x + w > G.map.width - 36) return false;
  if(y + h > G.map.height - 36) return false;

  // 地形に重ならないようにする
  for(const t of G.map.terrain || []){
    if(rectHit(r,t)) return false;
  }

  // 鍵扉などに重ならないようにする
  for(const d of G.map.doors || []){
    if(rectHit(r,d)) return false;
  }

  // 宝箱・店・NPCに近すぎる位置を避ける
  for(const c of G.map.chests || []){
    if(rectHit(r,{x:c.x-12,y:c.y-12,w:c.w+24,h:c.h+24})) return false;
  }

  for(const s of G.map.shops || []){
    if(rectHit(r,{x:s.x-12,y:s.y-12,w:s.w+24,h:s.h+24})) return false;
  }

  for(const n of G.map.npcs || []){
    if(rectHit(r,{x:n.x-18,y:n.y-18,w:(n.w||24)+36,h:(n.h||32)+36})) return false;
  }

  // プレイヤー初期位置の近くに増やしすぎない
  if(G.map.spawn){
    const dx = x - G.map.spawn.x;
    const dy = y - G.map.spawn.y;
    if(dx * dx + dy * dy < 120 * 120) return false;
  }

  return true;
}

function enemyPlacementHash(stageIndex,enemyIndex,copyIndex){
  // Math.random ではなく固定っぽくするための簡易ハッシュ
  let n = (stageIndex + 1) * 73856093 ^
          (enemyIndex + 1) * 19349663 ^
          (copyIndex + 1) * 83492791;

  n = Math.abs(n);
  return n % 1000 / 1000;
}

function expandEnemyPlacements(list){
  const src = Array.isArray(list) ? list : [];
  const stageIndex = G.stageIndex || 0;
  const mul = ENEMY_COUNT_MUL[Math.max(0,Math.min(ENEMY_COUNT_MUL.length-1,stageIndex))] || 1;

  const result = [];

  for(let i=0;i<src.length;i++){
    const base = src[i];
    if(!base) continue;

    // 元の敵は必ず残す
    result.push(base);

    const extraFloat = Math.max(0,mul - 1);
    const guaranteed = Math.floor(extraFloat);
    const fractional = extraFloat - guaranteed;

    let extraCount = guaranteed;

    // 端数分は固定ハッシュで一部だけ追加
    if(enemyPlacementHash(stageIndex,i,0) < fractional){
      extraCount++;
    }

    for(let c=0;c<extraCount;c++){
      const off = ENEMY_EXTRA_OFFSETS[(i + c) % ENEMY_EXTRA_OFFSETS.length];

      const w = base.w || 24;
      const h = base.h || 22;

      const nx = (base.x || 0) + off.x;
      const ny = (base.y || 0) + off.y;

      if(!canPlaceExtraEnemy(nx,ny,w,h)){
        continue;
      }

      result.push({
        ...base,
        x: nx,
        y: ny,
        __extraEnemy: true,
        __extraFrom: i,
        __extraIndex: c
      });
    }
  }

  return result;
}

function load(s,keep=false){
  const old=G.player;

  G.map=clone(s);

  if(keep&&old){
    G.player={
      ...old,
      x:s.spawn.x,
      y:s.spawn.y,
      hp:old.maxHp,
      mp:old.maxMp,
      inv:90,
      dashT:0,
      dashCd:0,
      attackT:0,
      attackCd:0,
      combo:0,
      comboT:0,
      inventory:old.inventory.filter(v=>typeof v==="object"),
      cores:[...old.cores]
    };
  }else{
    G.player=newP(s.spawn.x,s.spawn.y);
  }

  G.enemies=s.enemies.map(mkE);
  G.npcs=G.map.npcs;
  G.shops=G.map.shops;
  G.chests=G.map.chests;
  G.doors=G.map.doors;
  G.terrain=G.map.terrain;
  G.drops=[];
  G.effects=[];
  G.bullets=[];
  G.boss=null;
  G.talk=null;
  G.shop=null;
  G.bossDefeatT=0;
  G.state="field";
  G.lock=34;

  flush();
  msg(s.name,100);
  cam();

  // ステージ1だけプレイヤーのHP初期ボーナス
  if(G.stageIndex===0&&!G.player.__balanceStartBoost){
    G.player.__balanceStartBoost=true;
    G.player.maxHp=Math.max(G.player.maxHp,18);
    G.player.hp=G.player.maxHp;
    G.player.inv=Math.max(G.player.inv||0,100);
  }
}

function start(){
  G.stageIndex=0;
  load(STAGES[0],false);
}

addEventListener("keydown",e=>{
  const k=e.key.toLowerCase();

  if(k==="arrowup"||k==="w")input.up=1;
  if(k==="arrowdown"||k==="s")input.down=1;
  if(k==="arrowleft"||k==="a")input.left=1;
  if(k==="arrowright"||k==="d")input.right=1;

  if(
    e.key==="ArrowUp"||
    e.key==="ArrowDown"||
    e.key==="ArrowLeft"||
    e.key==="ArrowRight"||
    e.code==="Space"
  ){
    e.preventDefault();
  }

  if(!e.repeat){
    if(k==="z"||e.key==="Enter"){
      input.attack=1;
      input.action=1;
      input.start=1;
    }

    if(k==="x")input.magic=1;

    if(e.code==="Space"){
      input.dash=1;
    }

    if(k==="c")herb();

    if(G.state==="shop"){
      if(k==="1")buy(0);
      if(k==="2")buy(1);
      if(k==="3")buy(2);
      if(e.key==="Escape")closeShop();
    }
  }
},{passive:false});

addEventListener("keyup",e=>{
  const k=e.key.toLowerCase();

  if(k==="arrowup"||k==="w")input.up=0;
  if(k==="arrowdown"||k==="s")input.down=0;
  if(k==="arrowleft"||k==="a")input.left=0;
  if(k==="arrowright"||k==="d")input.right=0;
});

function tap(id,k){
  const el=document.getElementById(id);
  if(!el)return;

  el.addEventListener("pointerdown",e=>{
    e.preventDefault();
    if(G.lock<=0)input[k]=1;
  },{passive:false});
}

tap("attackBtn","attack");
tap("magicBtn","magic");
tap("dashBtn","dash");
tap("actionBtn","action");

cvs.addEventListener("pointerdown",e=>{
  e.preventDefault();
  if(G.lock>0)return;
  input.start=1;
  input.action=1;
},{passive:false});

function ph(){
  const p=G.player;
  return {x:p.x+4,y:p.y+8,w:p.w-8,h:p.h-10};
}

function solid(x,y,w,h){
  const r={x,y,w,h};

  for(const t of G.terrain){
    if(hit(r,t))return true;
  }

  for(const d of G.doors){
    if(d.locked&&hit(r,d))return true;
  }

  return false;
}

function move(o,dx,dy){
  if(dx&&!solid(o.x+dx+4,o.y+8,o.w-8,o.h-10)){
    o.x+=dx;
  }

  if(dy&&!solid(o.x+4,o.y+dy+8,o.w-8,o.h-10)){
    o.y+=dy;
  }

  o.x=cl(o.x,28,G.map.width-28-o.w);
  o.y=cl(o.y,28,G.map.height-28-o.h);
}

// 注: この updP() は実際には呼ばれない。
// スマホ操作 最終安定化パッチが起動時に updP を完全に上書きするため、
// ここにあった移動・ダッシュ・攻撃処理はずっとデッドコードだった。
// （ダッシュ攻撃自体は dashStrike() ごと最終版の updP に移植済み）
function updP(){}

// ダッシュ攻撃判定ボックス
function dashAttackBox(){
  const p=G.player;
  const dir=p.__dashDir||p.dir||"down";
  if(dir==="up")   return{x:p.x-8,y:p.y-42,w:p.w+16,h:54};
  if(dir==="down") return{x:p.x-8,y:p.y+p.h-10,w:p.w+16,h:54};
  if(dir==="left") return{x:p.x-42,y:p.y-8,w:54,h:p.h+16};
  return{x:p.x+p.w-10,y:p.y-8,w:54,h:p.h+16};
}

// ダッシュ中の攻撃処理
function dashStrike(){
  const p=G.player;
  if(!p.__dashActive||!p.__dashSerial)return;
  const box=dashAttackBox();
  const dx=p.__dashVX||0;
  const dy=p.__dashVY||0;

  for(let i=G.enemies.length-1;i>=0;i--){
    const e=G.enemies[i];
    if(!e||e.__dashHitSerial===p.__dashSerial)continue;
    if(!hit(box,e))continue;
    e.__dashHitSerial=p.__dashSerial;
    const dmg=Math.max(1,Math.round(p.atk*DASH_DAMAGE_RATE));
    const prevLen=G.enemies.length;
    dmgE(e,dmg);
    const killed=e.hp<=0||G.enemies.length<prevLen;
    if(killed){
      p.dashCd=Math.max(0,(p.dashCd||0)-DASH_KILL_RECOVER);
    }else{
      e.x+=dx*DASH_PUSH_ENEMY;
      e.y+=dy*DASH_PUSH_ENEMY;
    }
    fx(e.x+e.w/2,e.y+e.h/2,killed?"#fff7a8":"#d9fbff",killed?16:12,killed?3:2.4);
  }

  if(G.boss&&G.boss.__dashHitSerial!==p.__dashSerial&&hit(box,G.boss)){
    G.boss.__dashHitSerial=p.__dashSerial;
    const dmg=Math.max(1,Math.round(p.atk*DASH_BOSS_DAMAGE_RATE));
    dmgB(dmg);
    if(G.boss){
      G.boss.x+=dx*DASH_PUSH_BOSS;
      G.boss.y+=dy*DASH_PUSH_BOSS;
      fx(G.boss.x+G.boss.w/2,G.boss.y+G.boss.h/2,"#fff7a8",14,2.8);
    }
  }

  // 軌跡エフェクト
  if(G.time%3===0)fx(p.x+p.w/2-dx*10,p.y+p.h/2-dy*10,p.trueGold?"#ffd84d":"#9ef7ff",9,1.4);
}

function atkBox(){
  const p=G.player;
  const cx=p.x+p.w/2;
  const cy=p.y+p.h/2;

  if(p.dir==="up")return {x:cx-22,y:p.y-32,w:44,h:36};
  if(p.dir==="down")return {x:cx-22,y:p.y+p.h-4,w:44,h:36};
  if(p.dir==="left")return {x:p.x-34,y:cy-19,w:38,h:38};

  return {x:p.x+p.w-4,y:cy-19,w:38,h:38};
}

function distHit(a,cx,cy,r){
  if(!a)return false;

  const ex=a.x+a.w/2;
  const ey=a.y+a.h/2;

  return (ex-cx)*(ex-cx)+(ey-cy)*(ey-cy)<=r*r;
}

function attack(){
  const p=G.player;
  const st=G.stageIndex||0;

  p.combo=p.combo%3+1;
  p.comboT=38;

  const sweep=p.combo===3;
  const r=sweep?(p.trueGold?94:p.curseLifted?82:70):0;

  p.attackT=sweep?18:12;
  p.attackCd=sweep?18:12;

  const a=atkBox();
  // 後半は攻撃が強くなりすぎないよう少し抑制
  const atkMul=st>=4?(p.trueGold?0.82:0.92):1;
  const d=p.atk*atkMul*(sweep?1.35:1);

  if(sweep){
    const cx=p.x+p.w/2;
    const cy=p.y+p.h/2;
    // 後半の金色時は範囲も少し抑制
    const rr=st>=4&&p.trueGold?Math.round(r*0.90):r;
    let hits=0;

    for(let i=G.enemies.length-1;i>=0;i--){
      const e=G.enemies[i];
      if(e&&distHit(e,cx,cy,rr)){dmgE(e,d);hits++;}
    }
    if(G.boss&&distHit(G.boss,cx,cy,rr))dmgB(d*.8);
    ring(cx,cy,rr,p.trueGold?"#ffd84d":"#9ef7ff");
    msg("なぎ払い！ x"+hits,36);
  }else{
    for(let i=G.enemies.length-1;i>=0;i--){
      const e=G.enemies[i];
      if(e&&hit(a,e))dmgE(e,d);
    }
    if(G.boss&&hit(a,G.boss))dmgB(d);
  }
}

function magic(){
  const p=G.player;
  const st=G.stageIndex||0;

  if(p.mp<=0){msg("MPが足りない",40);return;}
  p.mp--;

  // ステージ1は魔法を少し強く、後半は少し抑制
  const magicBonus=st===0?1:0;
  const magicMul=st>=5?0.94:1;
  const effectiveMagic=Math.max(1,Math.round((p.magic+magicBonus)*magicMul));

  let vx=0,vy=0;
  if(p.dir==="up")vy=-5.6;
  else if(p.dir==="down")vy=5.6;
  else if(p.dir==="left")vx=-5.6;
  else vx=5.6;

  const s=8+p.magicLv*3;

  G.bullets.push({
    x:p.x+12-s/2,y:p.y+14-s/2,
    w:s,h:s,vx,vy,
    life:72,dmg:effectiveMagic+1,
    magic:true,radius:p.magicRadius,
    color:p.trueGold?"#ffd84d":p.magicLv>=3?"#b56bff":p.magicLv>=2?"#89ff9b":"#63d8ff"
  });
}

function action(){
  if(G.state==="title"){
    start();
    return;
  }

  if(G.talk){
    talkNext();
    return;
  }

  const p=G.player;
  if(!p)return;

  const pr={
    x:p.x-12,
    y:p.y-12,
    w:p.w+24,
    h:p.h+24
  };

  for(const s of G.shops){
    if(hit(pr,s)){
      G.shop={shop:s};
      G.state="shop";
      return;
    }
  }

  for(const n of G.npcs){
    if(hit(pr,n)){
      G.talk={npc:n,index:0};
      G.state="talk";
      return;
    }
  }

  for(const c of G.chests){
    if(!c.opened&&hit(pr,c)){
      openChest(c);
      return;
    }
  }

  for(const d of G.doors){
    if(hit(pr,d)){
      tryDoor(d);
      return;
    }
  }
}

// 注: この talkNext() は実際には呼ばれない。
// NPC会話関連パッチが talkNext を二重に上書きしており、最終的に
// 「NPC会話 一瞬で終わる問題 最終修正版」側の talkNext が使われる
// （onTalk コールバックは finishTalk() 経由で同等に呼ばれる）。
function talkNext(){}

// 注: この checkAwaken() は実際には呼ばれない。
// 「主人公成長仕様 最終上書きパッチ v3」が checkAwaken を完全に
// 上書きしており、ステータス成長は applyGrowthStats() に統合されている。
function checkAwaken(){}

function shopItems(){
  const p=G.player;
  return[
    {
      name:"剣を強化",
      cost:50+p.swordLv*65+Math.max(0,p.swordLv-2)*35,
      desc:"攻撃力+1 / 後半も敵が強くなる",
      buy(){p.swordLv++;p.atk++;checkAwaken();}
    },
    {
      name:"盾を強化",
      cost:55+p.shieldLv*70+Math.max(0,p.shieldLv-2)*35,
      desc:"防御力+1 HP+1",
      buy(){p.shieldLv++;p.armorLv=p.shieldLv;p.def++;p.maxHp++;p.hp++;checkAwaken();}
    },
    {
      name:"魔法を強化",
      cost:65+p.bookLv*85+Math.max(0,p.bookLv-2)*45,
      desc:"魔法+1 MP+1 / Lv3で金色覚醒",
      buy(){p.bookLv++;p.magic++;p.magicLv++;p.magicRadius+=8;p.maxMp++;p.mp++;checkAwaken();}
    }
  ];
}

function closeShop(){
  G.shop=null;
  G.state="field";
}

function buy(i){
  const it=shopItems()[i];
  if(!it)return;

  if(G.player.coins>=it.cost){
    G.player.coins-=it.cost;
    it.buy();
    msg(it.name+"した！",70);
  }else{
    msg("コインが足りない",50);
  }
}

function openChest(c){
  c.opened=true;
  const it=c.item;

  if(it.type==="key"){
    G.player.inventory.push(it.id);
    G.map.objective="北のボス扉を開ける";
    msg(it.name+"を手に入れた！",80);
  }else if(it.type==="coin"){
    G.player.coins+=it.amount;
    msg(it.amount+"コイン手に入れた！",70);
  }else{
    addInv(it.id,it.count||1);
    msg((it.name||it.id)+"を手に入れた！",70);
  }
}

function addInv(id,count=1){
  const f=G.player.inventory.find(v=>typeof v==="object"&&v.id===id);

  if(f)f.count+=count;
  else G.player.inventory.push({id,count});
}

function hasItem(id){
  return G.player.inventory.some(v=>v===id||(typeof v==="object"&&v.id===id&&v.count>0));
}

function tryDoor(d){
  if(hasItem(d.requiredItem)){
    d.locked=false;
    G.map.objective="守護獣を倒す";
    spawnBoss();
    msg(d.label+"が開いた！",80);
  }else{
    msg("鍵が必要だ",50);
  }
}

function herb(){
  const inv=G.player?.inventory.find(v=>typeof v==="object"&&v.id==="small_herb"&&v.count>0);

  if(inv&&G.player.hp<G.player.maxHp){
    inv.count--;
    G.player.hp=Math.min(G.player.maxHp,G.player.hp+5);
  }
}

function spawnBoss(){
  if(G.boss)return;

  const b={...G.map.boss};
  b.x-=b.w/2;
  b.y-=b.h/2;
  b.t=0;
  b.shot=82;
  b.phase=1;

  G.boss=b;

  // 注: この spawnBoss() は実際のゲーム中には呼ばれない。
  // 魔法陣ワープ式パッチが起動時に spawnBoss を完全に上書きするため、
  // ここにあった bossHpMul / bossAtkMul / bossShotMul やステージ7弱体化の
  // 適用処理はずっとデッドコードだった（数値は一度も反映されていない）。
  // ボスのHP管理は BOSS_HP_SCALE（ステージ進行型 ボスHP大幅強化パッチ）
  // 側の1箇所に統一したので、ここでは何もしない。
}


function dmgE(e,d){
  if(!e)return;

  e.hp-=d;
  e.hitT=10;

  fx(e.x+e.w/2,e.y+e.h/2,"#fff",10,2);

  if(e.hp<=0){
    const idx=G.enemies.indexOf(e);
    if(idx>=0)G.enemies.splice(idx,1);

    G.drops.push({
      x:e.x+e.w/2,
      y:e.y+e.h/2,
      type:"coin"
    });
  }
}

function dmgB(d){
  const hpScale = (typeof window !== "undefined") ? window.__applyStageBossHpScale : null;
  if(typeof hpScale === "function") hpScale();
  const b=G.boss;
  if(!b)return;

  b.hp-=d;

  if(b.hp<=0){
    G.boss=null;
    G.bossDefeatT=120;
    G.state="bossDefeat";
    G.bullets=[];
    G.bossBullets=[];
    G.bossZones=[];
    if(G.map)G.map.__bossDefeated=true;
    msg("ボス撃破！",120);
  }
}

function updEnemies(){
  const p=G.player;
  const box=ph();
  const b=getBalance();
  const st=G.stageIndex||0;

  for(let i=G.enemies.length-1;i>=0;i--){
    const e=G.enemies[i];
    if(!e){G.enemies.splice(i,1);continue;}

    e.t=(e.t||0)+1;
    if(e.hitT>0)e.hitT--;
    if(e.attackPause>0)e.attackPause--;

    const pcx=p.x+p.w/2,pcy=p.y+p.h/2;
    const ecx=e.x+e.w/2,ecy=e.y+e.h/2;
    const toP=nrm(pcx-ecx,pcy-ecy);
    const d=toP.l;

    if(d<b.enemyAggro)e.wake=true;
    if(d>b.enemyGiveUp)e.wake=false;
    if(st===0&&e.t<25)e.wake=false;

    if(!e.wake){
      const idleSpeed=st===0?0.16:0.24;
      e.x+=Math.sin(e.t*0.025+i)*idleSpeed;
      e.y+=Math.cos(e.t*0.021+i)*idleSpeed;
      continue;
    }

    if(e.hitT>0){
      const stopRate=st<=1?0.18:0.35;
      e.x+=toP.x*e.speed*stopRate;
      e.y+=toP.y*e.speed*stopRate;
    }else{
      let sx=toP.x*e.speed;
      let sy=toP.y*e.speed;
      if(e.type==="bat"){
        sx+=Math.sin(e.t*0.12)*(st===0?0.35:0.55);
        sy+=Math.cos(e.t*0.10)*(st===0?0.35:0.55);
      }
      if(e.type==="fast"){
        const pulse=1+Math.sin(e.t*0.08)*0.16;
        sx*=pulse;sy*=pulse;
      }
      e.x+=sx;e.y+=sy;
    }

    if(p.inv<=0&&hit(box,e)){
      hurt(e.atk||1);
      p.inv=Math.max(p.inv||0,b.enemyContactInv);
      const push=st===0?18:10;
      e.x-=toP.x*push;
      e.y-=toP.y*push;
    }
  }
}

function updBoss(){
  const b=G.boss;
  if(!b)return;

  b.t++;
  const r=G.map.bossRoom;
  const mv=b.__s7MoveRate||1;
  const ampX=Math.min(170,r.w*0.24)*mv;
  const ampY=Math.min(62,r.h*0.25)*mv;

  b.x=r.x+r.w/2-b.w/2+Math.cos(b.t*.024)*ampX;
  b.y=r.y+r.h/2-b.h/2+Math.sin(b.t*.034)*ampY;
}

function updBullets(){
  for(let i=G.bullets.length-1;i>=0;i--){
    const b=G.bullets[i];

    if(!b||typeof b.life!=="number"){
      G.bullets.splice(i,1);
      continue;
    }

    b.life--;
    b.x+=b.vx||0;
    b.y+=b.vy||0;

    if(b.life<=0){
      G.bullets.splice(i,1);
      continue;
    }

    for(let j=G.enemies.length-1;j>=0;j--){
      const e=G.enemies[j];

      if(e&&hit(b,e)){
        dmgE(e,b.dmg);
        G.bullets.splice(i,1);
        break;
      }
    }
  }
}

function updDrops(){
  const p=G.player;

  for(let i=G.drops.length-1;i>=0;i--){
    const d=G.drops[i];
    if(!d){G.drops.splice(i,1);continue;}

    const nn=nrm(p.x+12-d.x,p.y+14-d.y);
    if(nn.l<80){d.x+=nn.x*3.4;d.y+=nn.y*3.4;}

    if(nn.l<18){
      // 雑魚敵からドロップしたコイン取得量を2.5倍にする。
      // 旧: base=10 → 新: base=25
      const base=30;
      const bonus=Math.floor(base*(getBalance().coinBonus-1));
      p.coins+=base+bonus;
      G.drops.splice(i,1);
    }
  }
}

function hurt(d){
  const p=G.player;
  if(p.inv>0)return;

  const st=G.stageIndex||0;
  const b=getBalance();
  let raw=Number(d||1)*b.enemyAtkMul;
  const defPower=st<=1?1.10:st<=3?0.95:0.75;
  let dmg=Math.max(st<=4?1:2,Math.round(raw-(p.def||0)*defPower));
  if(st===0)dmg=Math.min(dmg,3);
  else if(st===1)dmg=Math.min(dmg,4);

  p.hp-=dmg;
  p.inv=b.enemyContactInv;
  msg("HIT -"+dmg,30);

  if(p.hp<=0){p.hp=0;G.state="gameover";}
}

function fx(x,y,color,life=20,spread=2){
  for(let i=0;i<10;i++){
    G.effects.push({
      type:"p",
      x,y,
      vx:R(-spread,spread),
      vy:R(-spread,spread),
      life,
      max:life,
      color,
      size:R(1,2.6)
    });
  }
}

function ring(x,y,r,color){
  G.effects.push({
    type:"ring",
    x,y,r,
    life:34,
    max:34,
    color
  });
}

function updFx(){
  for(let i=G.effects.length-1;i>=0;i--){
    const e=G.effects[i];

    if(!e||typeof e.life!=="number"){
      G.effects.splice(i,1);
      continue;
    }

    if(e.type==="ring"){
      e.r=(e.r||0)+2.4;
      e.life--;
    }else{
      e.x+=(e.vx||0);
      e.y+=(e.vy||0);
      e.life--;
    }

    if(e.life<=0)G.effects.splice(i,1);
  }
}

function cam(){
  const p=G.player;
  if(!p)return;

  G.camera.x=cl(
    p.x+p.w/2-VW/2,
    0,
    Math.max(0,G.map.width-VW)
  );

  G.camera.y=cl(
    p.y+p.h/2-VH/2,
    0,
    Math.max(0,G.map.height-VH)
  );
}

function update(){
  G.time++;

  if(G.lock>0){
    G.lock--;
    flush();
  }

  if(G.messageT>0)G.messageT--;

  if(G.state==="title"){
    if(C("start")||C("action")||C("attack"))start();
  }else if(G.state==="field"){
    updP();
    updEnemies();
    if(G.boss)updBoss();
    updBullets();
    updDrops();
    updFx();
    cam();
  }else if(G.state==="talk"){
    if(C("action")||C("attack")||C("start"))talkNext();
    updFx();
    cam();
  }else if(G.state==="shop"){
    if(C("action"))closeShop();
    updFx();
    cam();
  }else if(G.state==="bossDefeat"){
    G.bossDefeatT--;
    updFx();
    cam();

    if(G.bossDefeatT<=0){
      if(typeof G.map.onClear==="function")G.map.onClear(G);
      G.state="clear";
      G.lock=36;
      flush();
      msg(G.stageIndex+1<STAGES.length?"島クリア！ 次の島へ":"5島クリア！",180);
    }
  }else if(G.state==="clear"){
    if(C("start")||C("action")||C("attack")){
      if(G.stageIndex+1<STAGES.length){
        G.stageIndex++;
        load(STAGES[G.stageIndex],true);
      }else{
        G.state="title";
        G.lock=48;
        flush();
      }
    }
  }else if(G.state==="gameover"){
    if(C("start")||C("action")||C("attack")){
      G.state="title";
      G.lock=36;
      flush();
    }
  }
}

function wx(x){
  return Math.round(x-G.camera.x);
}

function wy(y){
  return Math.round(y-G.camera.y);
}

function bg(){
  ctx.fillStyle="#8fe8ff";
  ctx.fillRect(0,0,VW,VH);

  ctx.fillStyle=["#66d86f","#56c96a","#66cce6","#d56d45","#d9c56a"][G.stageIndex]||"#66d86f";

  if(G.map){
    ctx.save();
    ctx.translate(-G.camera.x,-G.camera.y);
    RR(28,28,G.map.width-56,G.map.height-56,36);
    ctx.fill();
    ctx.restore();
  }
}

function drawTerrain(){
  for(const t of G.terrain){
    const x=wx(t.x);
    const y=wy(t.y);

    ctx.fillStyle=t.type==="tree"?"#50c85e":t.type==="rock"?"#8fa3ad":"#91a9b5";
    RR(x,y,t.w,t.h,10);
    ctx.fill();
  }
}

function draw(){
  if(G.state==="title"){
    ctx.fillStyle="#8fe8ff";
    ctx.fillRect(0,0,VW,VH);

    ctx.fillStyle="#fff";
    ctx.textAlign="center";
    ctx.font="900 34px system-ui";
    ctx.fillText("SKY ISLAND",VW/2,210);
    ctx.fillText("ADVENTURE",VW/2,250);

    ctx.font="800 15px system-ui";
    ctx.fillText("TAP / Z TO START",VW/2,326);
    ctx.fillText("direction fixed",VW/2,360);

    ctx.textAlign="left";
    return;
  }

  bg();
  drawTerrain();

  for(const d of G.doors){
    ctx.fillStyle=d.locked?"#8c6136":"#55d68a";
    RR(wx(d.x),wy(d.y),d.w,d.h,10);
    ctx.fill();
  }

  for(const c of G.chests){
    ctx.fillStyle=c.opened?"#6a4a2d":"#b77233";
    RR(wx(c.x),wy(c.y),c.w,c.h,5);
    ctx.fill();
  }

  for(const s of G.shops)drawShop3D(ctx,s,wx,wy);
  for(const n of G.npcs)drawNPC3D(ctx,n,wx,wy);
  for(const d of G.drops)drawCoin3D(ctx,d,wx,wy);
  for(const e of G.enemies)drawEnemy3D(ctx,e,wx,wy);

  if(G.boss)drawBoss3D(ctx,G.boss,wx,wy,G.time);

  for(const b of G.bullets){
    if(!b)continue;

    ctx.fillStyle=b.color||"#fff";
    ctx.beginPath();
    ctx.arc(wx(b.x+b.w/2),wy(b.y+b.h/2),b.w/2,0,Math.PI*2);
    ctx.fill();
  }

  drawHeroAdventurer3D(ctx,G.player,wx,wy,G.time,atkBox);

  for(const e of G.effects){
    if(!e||typeof e.life!=="number")continue;

    ctx.save();
    ctx.globalAlpha=Math.max(0,Math.min(1,e.life/(e.max||e.life||1)));

    if(e.type==="ring"){
      ctx.strokeStyle=e.color||"#fff";
      ctx.lineWidth=3;
      ctx.beginPath();
      ctx.arc(wx(e.x),wy(e.y),e.r||1,0,Math.PI*2);
      ctx.stroke();
    }else{
      ctx.fillStyle=e.color||"#fff";
      ctx.fillRect(wx(e.x),wy(e.y),e.size||2,e.size||2);
    }

    ctx.restore();
  }

  ui();
}

function bar(x,y,w,h,r,c){
  ctx.fillStyle="rgba(255,255,255,.18)";
  RR(x,y,w,h,999);
  ctx.fill();

  ctx.fillStyle=c;
  RR(x,y,Math.max(1,w*cl(r,0,1)),h,999);
  ctx.fill();
}

function ui(){
  const p=G.player;

  ctx.setTransform(1,0,0,1,0,0);

  ctx.fillStyle="rgba(8,25,45,.58)";
  RR(10,10,VW-20,88,14);
  ctx.fill();

  ctx.fillStyle="#fff";
  ctx.font="800 13px system-ui";
  ctx.fillText((G.stageIndex+1)+"/"+STAGES.length+" "+G.map.name,22,31);
  ctx.fillText("目的: "+G.map.objective,22,54);

  bar(22,68,130,10,p.hp/p.maxHp,"#ff6262");
  bar(170,68,76,10,p.mp/p.maxMp,"#63d8ff");

  ctx.fillText("Coin "+p.coins,260,78);

  ctx.font="800 11px system-ui";
  ctx.fillText(
    "向き"+p.dir+" 剣"+p.swordLv+" 盾"+p.shieldLv+" 魔"+p.bookLv+" Combo"+p.combo,
    155,
    55
  );

  if(G.messageT>0){
    ctx.textAlign="center";
    ctx.font="900 20px system-ui";
    ctx.fillText(G.message,VW/2,180);
    ctx.textAlign="left";
  }

  if(G.boss){
    ctx.fillStyle="rgba(8,25,45,.58)";
    RR(10,106,VW-20,44,14);
    ctx.fill();

    ctx.fillStyle="#fff";
    ctx.font="900 13px system-ui";
    ctx.fillText("BOSS "+G.boss.name,22,128);

    bar(128,120,206,12,G.boss.hp/G.boss.maxHp,"#7cff92");
  }

  if(G.talk){
    const n=G.talk.npc;

    ctx.fillStyle="rgba(8,25,45,.82)";
    RR(18,VH-150,VW-36,124,16);
    ctx.fill();

    ctx.fillStyle="#ffd84d";
    ctx.font="900 14px system-ui";
    ctx.fillText(n.name,34,VH-120);

    ctx.fillStyle="#fff";
    ctx.font="700 15px system-ui";
    ctx.fillText(n.lines[G.talk.index]||"",34,VH-92);
  }

  if(G.state==="shop"){
    const items=shopItems();

    ctx.fillStyle="rgba(8,25,45,.90)";
    RR(18,210,VW-36,330,18);
    ctx.fill();

    ctx.fillStyle="#ffd84d";
    ctx.font="900 20px system-ui";
    ctx.fillText(G.shop.shop.name,38,244);

    ctx.fillStyle="#fff";
    ctx.font="800 13px system-ui";
    ctx.fillText("Coin "+p.coins+" / 1,2,3で強化 / ACTで閉じる",38,270);

    for(let i=0;i<items.length;i++){
      const y=305+i*60;
      const it=items[i];

      ctx.fillStyle="rgba(255,255,255,.10)";
      RR(34,y,VW-68,48,12);
      ctx.fill();

      ctx.fillStyle="#fff";
      ctx.font="900 15px system-ui";
      ctx.fillText((i+1)+". "+it.name+" "+it.cost+"C",48,y+20);

      ctx.font="700 12px system-ui";
      ctx.fillText(it.desc,48,y+39);
    }
  }

  if(G.state==="clear"){
    ctx.fillStyle="rgba(255,255,255,.2)";
    ctx.fillRect(0,0,VW,VH);

    ctx.textAlign="center";
    ctx.fillStyle="#fff";
    ctx.font="900 32px system-ui";
    ctx.fillText(G.stageIndex+1<STAGES.length?"STAGE CLEAR":"ALL CLEAR",VW/2,280);

    ctx.font="700 14px system-ui";
    ctx.fillText(G.lock>0?"入力ロック中":"TAP / Zで進む",VW/2,318);

    ctx.textAlign="left";
  }

  // DASHクールタイムゲージ
  if(p.dashCd>0){
    const ratio=cl(1-p.dashCd/DASH_COOLDOWN,0,1);
    ctx.fillStyle="rgba(8,25,45,.58)";
    RR(22,84,124,8,999);ctx.fill();
    ctx.fillStyle=p.trueGold?"#ffd84d":"#9ef7ff";
    RR(22,84,Math.max(1,124*ratio),8,999);ctx.fill();
    ctx.fillStyle="#fff";ctx.font="800 10px system-ui";
    ctx.fillText("DASH",150,92);
  }else{
    ctx.fillStyle=p.trueGold?"#ffd84d":"#9ef7ff";
    RR(22,84,70,8,999);ctx.fill();
    ctx.fillStyle="#fff";ctx.font="800 10px system-ui";
    ctx.fillText("DASH OK",98,92);
  }

  if(G.state==="gameover"){
    ctx.fillStyle="rgba(0,0,0,.45)";
    ctx.fillRect(0,0,VW,VH);

    ctx.textAlign="center";
    ctx.fillStyle="#fff";
    ctx.font="900 42px system-ui";
    ctx.fillText("GAME OVER",VW/2,VH/2);

    ctx.textAlign="left";
  }
}

function loop(){
  try{
    update();
    draw();
  }catch(err){
    console.error(err);
    msg("内部エラーを回避しました。続行します",90);
    G.effects=[];
    G.bullets=G.bullets.filter(Boolean);
    G.enemies=G.enemies.filter(Boolean);
  }

  requestAnimationFrame(loop);
}

loop();

// ─── モバイル操作初期化 ──────────────────────────────────────────────────────
(function(){
  // ズーム・選択・長押し抑制
  let meta=document.querySelector('meta[name="viewport"]');
  if(!meta){meta=document.createElement("meta");meta.name="viewport";document.head.appendChild(meta);}
  meta.setAttribute("content","width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover");

  const styleEl=document.createElement("style");
  styleEl.textContent=`
    html,body,canvas,#game,#joystick,#stick,.actions,.tbtn{
      touch-action:none!important;-webkit-user-select:none!important;
      user-select:none!important;-webkit-touch-callout:none!important;
      -webkit-tap-highlight-color:transparent!important;}
    #actionBtn{background:rgba(46,190,100,.30)!important;color:#eaffd2!important;position:relative!important;}
    #actionBtn::after{content:attr(data-count);position:absolute;right:7px;top:5px;
      min-width:18px;height:18px;padding:0 4px;border-radius:999px;
      background:rgba(8,25,45,.72);color:#fff7a8;font-size:11px;line-height:18px;
      text-align:center;pointer-events:none;}
    #attackBtn{position:relative!important;}
  `;
  document.head.appendChild(styleEl);

  ["gesturestart","gesturechange","gestureend"].forEach(t=>{
    document.addEventListener(t,e=>e.preventDefault(),{passive:false});
  });
  let lastTouchEnd=0;
  document.addEventListener("touchend",e=>{
    const now=Date.now();
    if(now-lastTouchEnd<=350)e.preventDefault();
    lastTouchEnd=now;
  },{passive:false});

  // ─ ジョイスティック ─
  const JOY_RADIUS=54,STICK_MAX=42,DEAD_ZONE=0.16;
  const joy=document.getElementById("joystick");
  const stick=document.getElementById("stick");

  window.__mobileJoy={active:false,pointerId:null,centerX:0,centerY:0,ax:0,ay:0};
  const joyState=window.__mobileJoy;

  function updateCenter(){
    if(!joy)return;
    const r=joy.getBoundingClientRect();
    joyState.centerX=r.left+r.width/2;joyState.centerY=r.top+r.height/2;
  }
  function setStickVisual(nx,ny){
    if(!stick)return;
    stick.style.transform=`translate(calc(-50% + ${nx*STICK_MAX}px), calc(-50% + ${ny*STICK_MAX}px))`;
  }
  function resetJoy(){
    joyState.active=false;joyState.pointerId=null;joyState.ax=0;joyState.ay=0;
    input.ax=0;input.ay=0;setStickVisual(0,0);
  }
  function applyJoy(cx,cy){
    let dx=cx-joyState.centerX,dy=cy-joyState.centerY;
    const len=Math.hypot(dx,dy);
    if(len>JOY_RADIUS){dx=dx/len*JOY_RADIUS;dy=dy/len*JOY_RADIUS;}
    let nx=dx/JOY_RADIUS,ny=dy/JOY_RADIUS;
    if(Math.hypot(nx,ny)<DEAD_ZONE){nx=0;ny=0;}
    joyState.ax=nx;joyState.ay=ny;input.ax=nx;input.ay=ny;
    setStickVisual(nx,ny);
  }

  if(joy&&stick){
    joy.addEventListener("pointerdown",e=>{
      e.preventDefault();e.stopPropagation();
      joyState.active=true;joyState.pointerId=e.pointerId;
      updateCenter();try{joy.setPointerCapture(e.pointerId);}catch(err){}
      applyJoy(e.clientX,e.clientY);
    },{passive:false});
    joy.addEventListener("pointermove",e=>{
      if(!joyState.active||joyState.pointerId!==e.pointerId)return;
      e.preventDefault();applyJoy(e.clientX,e.clientY);
    },{passive:false});
    joy.addEventListener("pointerup",e=>{
      if(joyState.pointerId!==e.pointerId)return;
      e.preventDefault();try{joy.releasePointerCapture(e.pointerId);}catch(err){}
      resetJoy();
    },{passive:false});
    joy.addEventListener("pointercancel",e=>{
      if(joyState.pointerId!==e.pointerId)return;resetJoy();
    },{passive:false});
    joy.addEventListener("lostpointercapture",()=>{if(joyState.active)resetJoy();});
  }

  document.addEventListener("pointerup",e=>{
    if(!joyState.active||joyState.pointerId!==e.pointerId)return;resetJoy();
  },{passive:true});
  window.addEventListener("blur",resetJoy);
  document.addEventListener("visibilitychange",()=>{if(document.hidden)resetJoy();});
  window.addEventListener("orientationchange",resetJoy);

  // 右ボタンがジョイスティックに干渉しないようにする
  ["attackBtn","magicBtn","dashBtn","actionBtn"].forEach(id=>{
    const el=document.getElementById(id);
    if(!el)return;
    ["pointerdown","pointermove","pointerup","pointercancel","touchstart","touchend"].forEach(t=>{
      el.addEventListener(t,e=>{e.preventDefault();e.stopPropagation();},{passive:false,capture:true});
    });
  });

  // ─ HERBボタン（ACTボタンを流用） ─
  const actionBtn=document.getElementById("actionBtn");
  const attackBtn=document.getElementById("attackBtn");

  if(actionBtn){
    actionBtn.textContent="HERB";
    actionBtn.title="薬草を使う";
    actionBtn.setAttribute("data-count","0");
  }

  function herbCount(){
    if(!G.player)return 0;
    return(G.player.inventory||[]).reduce((s,v)=>
      s+(typeof v==="object"&&v&&v.id==="small_herb"?(v.count||0):0),0);
  }
  function updateHerbBadge(){
    if(!actionBtn)return;
    const c=herbCount();
    actionBtn.setAttribute("data-count",String(c));
    actionBtn.style.opacity=c>0?"0.66":"0.34";
  }

  if(actionBtn){
    actionBtn.addEventListener("pointerdown",e=>{
      e.preventDefault();e.stopPropagation();
      if(G.state!=="field")return;
      const p=G.player;if(!p)return;
      if(herbCount()<=0){msg("薬草を持っていない",50);return;}
      if(p.hp>=p.maxHp){msg("HPは満タンだ",45);return;}
      herb();
    },{capture:true,passive:false});
  }

// MAGIC / DASH ボタン修正：capture 側で stopPropagation されても入力を立てる
  const magicBtn=document.getElementById("magicBtn");
  const dashBtn=document.getElementById("dashBtn");

  function mobileOnceButton(el,fn){
    if(!el)return;
    el.addEventListener("pointerdown",e=>{
      e.preventDefault();
      e.stopPropagation();
      if(G.lock>0)return;
      fn();
    },{capture:true,passive:false});

    // 古いスマホ向け保険
    el.addEventListener("touchstart",e=>{
      e.preventDefault();
      e.stopPropagation();
      if(G.lock>0)return;
      fn();
    },{capture:true,passive:false});
  }

  mobileOnceButton(magicBtn,()=>{
    input.magic=1;
  });

  mobileOnceButton(dashBtn,()=>{
    input.dash=1;
  });
  if(attackBtn){
    attackBtn.addEventListener("pointerdown",e=>{
      e.preventDefault();e.stopPropagation();
      if(G.lock>0)return;
      input.attack=1;input.action=1;input.start=1;
    },{capture:true,passive:false});
  }

  // ショップのタップ購入
  const SHOP_Y0=305,SHOP_H=48,SHOP_GAP=60;
  cvs.addEventListener("pointerdown",e=>{
    if(G.state!=="shop")return;
    const rect=cvs.getBoundingClientRect();
    const cy=(e.clientY-rect.top)*(cvs.height/rect.height);
    for(let i=0;i<3;i++){
      const y=SHOP_Y0+i*SHOP_GAP;
      if(cy>=y&&cy<=y+SHOP_H){buy(i);return;}
    }
  },{passive:true});

  // 毎フレームjoy状態をinputに同期 & HERBバッジ更新
  const _origUpdate=update;
  update=function(){
    if(joyState.active){input.ax=joyState.ax;input.ay=joyState.ay;}
    _origUpdate();
    if(joyState.active){input.ax=joyState.ax;input.ay=joyState.ay;}
    updateHerbBadge();
  };

  updateHerbBadge();
})();
/* === NPC 2人化・会話安定化 完全版 ===
   貼る場所:
   - game.js の一番下
   - loop(); の後

   効果:
   - ステージ側のNPCが1人だけで複数行セリフを持つ場合、自動で2人に分ける
   - 1人目と2人目のセリフが混ざらない
   - 「名前: セリフ」「名前：セリフ」形式なら話者名ごとに分ける
   - 話者名がない場合は、内容を2人に分配する
   - 会話開始直後の入力暴発で一瞬で閉じる問題を防ぐ
   - game.js のゲーム構造、移動、戦闘、ステージ構造は変更しない
*/
(function(){
  if(window.__npcTwoPeopleStableFinalApplied)return;
  window.__npcTwoPeopleStableFinalApplied = true;

  const NPC_GAP = 46;
  const TALK_START_BLOCK = 10;
  const TALK_NEXT_BLOCK = 7;

  const NPC_LOOKS = [
    {
      npcStyle:0,
      skin:"#f1c79b",
      hair:"#3a2418",
      outfit:"#3f6fb5",
      accent:"#d8dee8"
    },
    {
      npcStyle:1,
      skin:"#d9a06d",
      hair:"#24160f",
      outfit:"#8a4f3a",
      accent:"#ead7b0"
    }
  ];

  function cleanLinesFromArray(lines){
    if(!Array.isArray(lines))return ["……"];

    const cleaned = lines
      .map(v => String(v || "").trim())
      .filter(Boolean);

    return cleaned.length ? cleaned : ["……"];
  }

  function cleanNpcLines(n){
    if(!n)return ["……"];

    n.lines = cleanLinesFromArray(n.lines);
    return n.lines;
  }

  function applyNpcLook(n,index,forcedLook){
    const look = forcedLook || NPC_LOOKS[index % NPC_LOOKS.length];

    return {
      ...n,
      w:n.w || 24,
      h:n.h || 32,
      npcStyle:n.npcStyle ?? look.npcStyle,
      skin:n.skin || look.skin,
      hair:n.hair || look.hair,
      outfit:n.outfit || n.color || look.outfit,
      accent:n.accent || look.accent
    };
  }

  function splitBySpeakerPrefix(lines){
    const groups = {};
    const names = [];

    for(const line of lines){
      const m = String(line).match(/^([^:：]{1,12})[:：]\s*(.+)$/);

      if(!m){
        return null;
      }

      const name = m[1].trim();
      const text = m[2].trim();

      if(!groups[name]){
        groups[name] = [];
        names.push(name);
      }

      groups[name].push(text);
    }

    if(names.length < 2){
      return null;
    }

    const aName = names[0];
    const bName = names[1];

    const aLines = groups[aName].slice();
    const bLines = groups[bName].slice();

    // 3人以上の話者が混ざっている場合は、2人目側に名前つきでまとめる
    for(let i=2;i<names.length;i++){
      const extraName = names[i];

      for(const text of groups[extraName]){
        bLines.push(extraName + "：" + text);
      }
    }

    return {
      aName,
      bName,
      aLines:aLines.length ? aLines : ["……"],
      bLines:bLines.length ? bLines : ["……"]
    };
  }

  function splitPlainLines(originalNpc){
    const lines = cleanNpcLines(originalNpc);

    // 1行だけの場合は無理に2人にしないための保険。
    // ただしこの関数は通常 lines.length >= 2 の時だけ呼ばれる。
    if(lines.length < 2){
      return {
        aName:originalNpc.name || "案内人",
        bName:"相棒",
        aLines:lines.length ? lines : ["……"],
        bLines:["……"]
      };
    }

    // 3行構成のステージ案内を自然に分ける:
    // 1人目: 場所説明 + 操作ヒント
    // 2人目: 目的説明
    if(lines.length === 3){
      return {
        aName:originalNpc.name || "案内人",
        bName:"相棒",
        aLines:[lines[0], lines[2]],
        bLines:[lines[1]]
      };
    }

    // それ以外は前半・後半に分ける
    const mid = Math.ceil(lines.length / 2);

    return {
      aName:originalNpc.name || "案内人",
      bName:"相棒",
      aLines:lines.slice(0,mid),
      bLines:lines.slice(mid).length ? lines.slice(mid) : ["……"]
    };
  }

  function splitNpcLinesIntoTwo(originalNpc){
    const lines = cleanNpcLines(originalNpc);

    const speakerSplit = splitBySpeakerPrefix(lines);
    if(speakerSplit)return speakerSplit;

    return splitPlainLines(originalNpc);
  }

  function normalizeNPCsToTwoPeople(map){
    if(!map || !Array.isArray(map.npcs))return;

    // 既存NPCにも描画用プロパティを付ける
    map.npcs = map.npcs.map((n,i)=>applyNpcLook(n,i));

    // すでに2人以上いるステージは人数を変更しない
    if(map.npcs.length !== 1)return;

    const original = map.npcs[0];
    const lines = cleanNpcLines(original);

    // セリフが1行以下なら2人化しない
    if(lines.length < 2)return;

    const split = splitNpcLinesIntoTwo(original);

    const baseX = original.x || 0;
    const baseY = original.y || 0;
    const originalOnTalk = original.onTalk;

    function callOriginalOnTalkOnce(gameState){
      if(map.__npcTwoPeopleStableOnTalkDone)return;

      map.__npcTwoPeopleStableOnTalkDone = true;

      if(typeof originalOnTalk === "function"){
        originalOnTalk(gameState);
      }
    }

    const npcA = applyNpcLook(
      {
        ...original,
        id:(original.id || "npc") + "_a",
        name:split.aName,
        x:baseX - NPC_GAP / 2,
        y:baseY,
        lines:cleanLinesFromArray(split.aLines),
        onTalk:callOriginalOnTalkOnce
      },
      0,
      NPC_LOOKS[0]
    );

    const npcB = applyNpcLook(
      {
        ...original,
        id:(original.id || "npc") + "_b",
        name:split.bName,
        x:baseX + NPC_GAP / 2,
        y:baseY + 4,
        lines:cleanLinesFromArray(split.bLines),
        onTalk:callOriginalOnTalkOnce
      },
      1,
      NPC_LOOKS[1]
    );

    map.npcs = [npcA,npcB];
  }

  function beginTalk(npc){
    cleanNpcLines(npc);

    G.talk = {
      npc,
      index:0,
      startedAt:G.time || 0,
      lastAdvanceAt:G.time || 0,
      blockUntil:(G.time || 0) + TALK_START_BLOCK
    };

    G.state = "talk";
  }

  // 注: finishTalk はこのパッチ内では使われていない
  // （呼び出し元の talkNext がさらに後のパッチで上書きされ、デッドコード化したため削除済み）
  // loadを包んで、ステージ読み込み直後にNPCを2人化する
  if(typeof load === "function"){
    const originalLoad = load;

    load = function(s,keep=false){
      originalLoad(s,keep);

      if(typeof G !== "undefined" && G.map){
        normalizeNPCsToTwoPeople(G.map);
        G.npcs = G.map.npcs;
      }
    };
  }

  // 注: talkNext はこのパッチで一度安定版に上書きされていたが、
  // さらに後の「NPC会話 一瞬で終わる問題 最終修正版」パッチで
  // 完全に上書きされ、デッドコード化したため削除済み。

  // 話しかけ処理を安定版にする
  action = function(){
    if(typeof G === "undefined")return;

    if(G.state === "title"){
      start();
      return;
    }

    if(G.talk){
      talkNext();
      return;
    }

    const p = G.player;
    if(!p)return;

    const pr = {
      x:p.x - 12,
      y:p.y - 12,
      w:p.w + 24,
      h:p.h + 24
    };

    for(const s of G.shops || []){
      if(hit(pr,s)){
        G.shop = {shop:s};
        G.state = "shop";
        return;
      }
    }

    for(const n of G.npcs || []){
      if(hit(pr,n)){
        beginTalk(n);
        return;
      }
    }

    for(const c of G.chests || []){
      if(!c.opened && hit(pr,c)){
        openChest(c);
        return;
      }
    }

    for(const d of G.doors || []){
      if(hit(pr,d)){
        tryDoor(d);
        return;
      }
    }
  };

  // すでにステージ開始済みの状態で貼った場合にも反映
  if(typeof G !== "undefined" && G.map){
    normalizeNPCsToTwoPeople(G.map);
    G.npcs = G.map.npcs;
  }

  // すでに会話中だった場合の復旧
  if(typeof G !== "undefined" && G.talk && G.talk.npc){
    cleanNpcLines(G.talk.npc);
    G.talk.index = Math.max(0,G.talk.index || 0);
    G.talk.lastAdvanceAt = G.time || 0;
    G.talk.blockUntil = (G.time || 0) + TALK_NEXT_BLOCK;
  }
})();
/* =========================================================
   ステージ装飾・オブジェクト美化パッチ
   対象:
   - 木 tree
   - 岩 rock
   - 石壁 stone / cliff
   - ショップ
   - 宝箱
   - 扉
   - コイン
   - 背景
   貼る場所:
   - game.js の一番下
   - loop(); の後
   ========================================================= */
(function(){
  if(window.__prettyStageObjectsPatchApplied)return;
  window.__prettyStageObjectsPatchApplied = true;

  function theme(){
    const i = G.stageIndex || 0;

    return [
      {
        id:"grass",
        sky1:"#bff7ff",
        sky2:"#7fe7ff",
        ground1:"#86e26f",
        ground2:"#4eb65a",
        grass:"#6bdc63",
        grassDark:"#3a9f48",
        treeTrunk:"#7a4a2a",
        treeLeaf1:"#4fd268",
        treeLeaf2:"#2eaa4f",
        treeLeaf3:"#88f08a",
        rock1:"#9caeb6",
        rock2:"#6f858f",
        stone1:"#9fb0b7",
        stone2:"#6f848f",
        shop1:"#ffcc66",
        shop2:"#ff8f3d",
        chest1:"#c47a34",
        chest2:"#7a421f",
        glow:"#9effa1",
        door1:"#8c6136",
        door2:"#c09455"
      },
      {
        id:"forest",
        sky1:"#d7fff0",
        sky2:"#8ce8c3",
        ground1:"#5fc96a",
        ground2:"#287743",
        grass:"#43b85a",
        grassDark:"#246f38",
        treeTrunk:"#6b3e24",
        treeLeaf1:"#2f9f4f",
        treeLeaf2:"#1f743a",
        treeLeaf3:"#73d86f",
        rock1:"#879a8f",
        rock2:"#526a5f",
        stone1:"#809889",
        stone2:"#4f675c",
        shop1:"#ffbf62",
        shop2:"#c96a35",
        chest1:"#b66e31",
        chest2:"#63391e",
        glow:"#b9ff9a",
        door1:"#6f4a2d",
        door2:"#a87844"
      },
      {
        id:"crystal",
        sky1:"#dffbff",
        sky2:"#78e7ff",
        ground1:"#68d4ea",
        ground2:"#327c9a",
        grass:"#67d5e6",
        grassDark:"#2c8faa",
        treeTrunk:"#60798a",
        treeLeaf1:"#8df4ff",
        treeLeaf2:"#45b9d2",
        treeLeaf3:"#d8ffff",
        rock1:"#b9f4ff",
        rock2:"#65aebd",
        stone1:"#8fddea",
        stone2:"#4d91a3",
        shop1:"#9df7ff",
        shop2:"#53b8ff",
        chest1:"#8cd8ff",
        chest2:"#356d9c",
        glow:"#d8ffff",
        door1:"#4c8da3",
        door2:"#9ff6ff"
      },
      {
        id:"flame",
        sky1:"#ffd4a3",
        sky2:"#ff8b62",
        ground1:"#d46a43",
        ground2:"#7f3029",
        grass:"#c05a3a",
        grassDark:"#713029",
        treeTrunk:"#5a2b22",
        treeLeaf1:"#d85b35",
        treeLeaf2:"#8c3028",
        treeLeaf3:"#ff9e4d",
        rock1:"#9b6a60",
        rock2:"#573a37",
        stone1:"#a46c5d",
        stone2:"#5b3631",
        shop1:"#ffb347",
        shop2:"#ff663d",
        chest1:"#c55d2d",
        chest2:"#60251e",
        glow:"#ffd84d",
        door1:"#73321f",
        door2:"#ff8c45"
      },
      {
        id:"ruin",
        sky1:"#f5fbff",
        sky2:"#a8e8ff",
        ground1:"#d8c76c",
        ground2:"#8f8145",
        grass:"#d3bd58",
        grassDark:"#837638",
        treeTrunk:"#8a6634",
        treeLeaf1:"#d9d06a",
        treeLeaf2:"#a49742",
        treeLeaf3:"#fff2a5",
        rock1:"#c8c09a",
        rock2:"#837a5b",
        stone1:"#d2c891",
        stone2:"#8b805a",
        shop1:"#ffe27a",
        shop2:"#c9983e",
        chest1:"#c8983e",
        chest2:"#6b4e22",
        glow:"#fff7a8",
        door1:"#8c6d35",
        door2:"#ffe27a"
      }
    ][i] || {
      sky1:"#bff7ff",
      sky2:"#7fe7ff",
      ground1:"#86e26f",
      ground2:"#4eb65a",
      grass:"#6bdc63",
      grassDark:"#3a9f48",
      treeTrunk:"#7a4a2a",
      treeLeaf1:"#4fd268",
      treeLeaf2:"#2eaa4f",
      treeLeaf3:"#88f08a",
      rock1:"#9caeb6",
      rock2:"#6f858f",
      stone1:"#9fb0b7",
      stone2:"#6f848f",
      shop1:"#ffcc66",
      shop2:"#ff8f3d",
      chest1:"#c47a34",
      chest2:"#7a421f",
      glow:"#9effa1",
      door1:"#8c6136",
      door2:"#c09455"
    };
  }

  function roundRect(x,y,w,h,r){
    RR(x,y,w,h,r);
  }

  function ellipse(x,y,rx,ry,rot,fill){
    ctx.fillStyle=fill;
    ctx.beginPath();
    ctx.ellipse(x,y,rx,ry,rot||0,0,Math.PI*2);
    ctx.fill();
  }

  function strokeEllipse(x,y,rx,ry,rot,color,width){
    ctx.strokeStyle=color;
    ctx.lineWidth=width||1;
    ctx.beginPath();
    ctx.ellipse(x,y,rx,ry,rot||0,0,Math.PI*2);
    ctx.stroke();
  }

  function drawSoftShadow(x,y,w,h,a){
    ctx.save();
    ctx.globalAlpha=a==null?.24:a;
    ctx.fillStyle="rgba(0,25,40,.35)";
    ctx.beginPath();
    ctx.ellipse(x+w/2,y+h*.86,w*.55,h*.18,0,0,Math.PI*2);
    ctx.fill();
    ctx.restore();
  }

  function drawPrettyTree(t){
    const th=theme();
    const x=wx(t.x);
    const y=wy(t.y);
    const w=t.w;
    const h=t.h;

    drawSoftShadow(x,y,w,h,.22);

    // 幹
    const trunkW=Math.max(12,w*.18);
    const trunkH=h*.48;
    const tx=x+w*.5-trunkW/2;
    const ty=y+h*.42;

    const trunkGrad=ctx.createLinearGradient(tx,ty,tx+trunkW,ty+trunkH);
    trunkGrad.addColorStop(0,"#4d2a1b");
    trunkGrad.addColorStop(.5,th.treeTrunk);
    trunkGrad.addColorStop(1,"#3b2117");

    ctx.fillStyle=trunkGrad;
    roundRect(tx,ty,trunkW,trunkH,5);
    ctx.fill();

    // 幹の筋
    ctx.strokeStyle="rgba(255,230,180,.16)";
    ctx.lineWidth=1;
    ctx.beginPath();
    ctx.moveTo(tx+trunkW*.35,ty+4);
    ctx.quadraticCurveTo(tx+trunkW*.15,ty+trunkH*.5,tx+trunkW*.4,ty+trunkH-3);
    ctx.moveTo(tx+trunkW*.68,ty+6);
    ctx.quadraticCurveTo(tx+trunkW*.88,ty+trunkH*.45,tx+trunkW*.55,ty+trunkH-4);
    ctx.stroke();

    // 葉の塊
    ellipse(x+w*.50,y+h*.28,w*.38,h*.28,0,th.treeLeaf2);
    ellipse(x+w*.31,y+h*.35,w*.30,h*.24,-.18,th.treeLeaf1);
    ellipse(x+w*.68,y+h*.35,w*.31,h*.25,.18,th.treeLeaf1);
    ellipse(x+w*.50,y+h*.17,w*.31,h*.23,0,th.treeLeaf3);

    // 葉の影
    ctx.save();
    ctx.globalAlpha=.20;
    ellipse(x+w*.56,y+h*.38,w*.34,h*.17,0,"#063a2a");
    ctx.restore();

    // ハイライト
    ctx.save();
    ctx.globalAlpha=.32;
    ellipse(x+w*.38,y+h*.20,w*.13,h*.07,-.4,"#ffffff");
    ellipse(x+w*.60,y+h*.16,w*.10,h*.055,.2,"#ffffff");
    ctx.restore();
  }

  function drawPrettyRock(t){
    const th=theme();
    const x=wx(t.x);
    const y=wy(t.y);
    const w=t.w;
    const h=t.h;

    drawSoftShadow(x,y,w,h,.20);

    const grad=ctx.createLinearGradient(x,y,x+w,y+h);
    grad.addColorStop(0,th.rock1);
    grad.addColorStop(.55,th.rock2);
    grad.addColorStop(1,"rgba(25,25,30,.88)");

    ctx.fillStyle=grad;
    ctx.beginPath();
    ctx.moveTo(x+w*.14,y+h*.72);
    ctx.lineTo(x+w*.24,y+h*.32);
    ctx.lineTo(x+w*.48,y+h*.12);
    ctx.lineTo(x+w*.77,y+h*.22);
    ctx.lineTo(x+w*.92,y+h*.63);
    ctx.lineTo(x+w*.74,y+h*.88);
    ctx.lineTo(x+w*.34,y+h*.88);
    ctx.closePath();
    ctx.fill();

    // 面
    ctx.fillStyle="rgba(255,255,255,.18)";
    ctx.beginPath();
    ctx.moveTo(x+w*.28,y+h*.35);
    ctx.lineTo(x+w*.49,y+h*.15);
    ctx.lineTo(x+w*.54,y+h*.58);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle="rgba(0,0,0,.18)";
    ctx.beginPath();
    ctx.moveTo(x+w*.54,y+h*.58);
    ctx.lineTo(x+w*.80,y+h*.25);
    ctx.lineTo(x+w*.88,y+h*.64);
    ctx.lineTo(x+w*.70,y+h*.84);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle="rgba(255,255,255,.20)";
    ctx.lineWidth=1;
    ctx.beginPath();
    ctx.moveTo(x+w*.25,y+h*.36);
    ctx.lineTo(x+w*.49,y+h*.15);
    ctx.lineTo(x+w*.79,y+h*.25);
    ctx.stroke();
  }

  function drawPrettyStone(t){
    const th=theme();
    const x=wx(t.x);
    const y=wy(t.y);
    const w=t.w;
    const h=t.h;

    const grad=ctx.createLinearGradient(x,y,x,y+h);
    grad.addColorStop(0,th.stone1);
    grad.addColorStop(1,th.stone2);

    ctx.fillStyle=grad;
    roundRect(x,y,w,h,9);
    ctx.fill();

    // 上面の光
    ctx.fillStyle="rgba(255,255,255,.18)";
    roundRect(x+3,y+3,w-6,Math.max(6,h*.28),7);
    ctx.fill();

    // ブロック線
    ctx.strokeStyle="rgba(30,35,45,.25)";
    ctx.lineWidth=1;

    const blockW=52;
    for(let bx=x+blockW;bx<x+w;bx+=blockW){
      ctx.beginPath();
      ctx.moveTo(bx,y+5);
      ctx.lineTo(bx,y+h-5);
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.moveTo(x+5,y+h*.55);
    ctx.lineTo(x+w-5,y+h*.55);
    ctx.stroke();
  }

  function drawPrettyCliff(t){
    const th=theme();
    const x=wx(t.x);
    const y=wy(t.y);
    const w=t.w;
    const h=t.h;

    const grad=ctx.createLinearGradient(x,y,x+w,y+h);
    grad.addColorStop(0,th.stone2);
    grad.addColorStop(1,"#34424a");

    ctx.fillStyle=grad;
    ctx.fillRect(x,y,w,h);

    ctx.save();
    ctx.globalAlpha=.25;
    ctx.strokeStyle="#fff";
    ctx.lineWidth=1;

    const step=24;
    for(let i=-h;i<w;i+=step){
      ctx.beginPath();
      ctx.moveTo(x+i,y);
      ctx.lineTo(x+i+h,y+h);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawPrettyTerrain(){
    for(const t of G.terrain){
      if(t.type==="tree"){
        drawPrettyTree(t);
      }else if(t.type==="rock"){
        drawPrettyRock(t);
      }else if(t.type==="stone"){
        drawPrettyStone(t);
      }else if(t.type==="cliff"){
        drawPrettyCliff(t);
      }else{
        const x=wx(t.x),y=wy(t.y);
        ctx.fillStyle="#91a9b5";
        roundRect(x,y,t.w,t.h,10);
        ctx.fill();
      }
    }
  }

  function drawPrettyDoor(d){
    const th=theme();
    const x=wx(d.x);
    const y=wy(d.y);
    const w=d.w;
    const h=d.h;

    drawSoftShadow(x,y,w,h,.18);

    const grad=ctx.createLinearGradient(x,y,x,y+h);
    grad.addColorStop(0,d.locked?th.door2:th.glow);
    grad.addColorStop(.55,d.locked?th.door1:"#3fdc83");
    grad.addColorStop(1,"#2a1e18");

    ctx.fillStyle=grad;
    roundRect(x,y,w,h,12);
    ctx.fill();

    ctx.strokeStyle=d.locked?th.door2:"#d9ffe8";
    ctx.lineWidth=2;
    roundRect(x+2,y+2,w-4,h-4,10);
    ctx.stroke();

    // 中央の紋章
    ctx.save();
    ctx.globalAlpha=.85;
    ctx.fillStyle=d.locked?th.glow:"#ffffff";
    ctx.beginPath();
    ctx.arc(x+w/2,y+h/2,Math.min(10,h*.22),0,Math.PI*2);
    ctx.fill();
    ctx.restore();

    if(d.locked){
      ctx.fillStyle="rgba(0,0,0,.28)";
      roundRect(x+w/2-8,y+h/2-2,16,12,3);
      ctx.fill();

      ctx.strokeStyle=th.glow;
      ctx.lineWidth=2;
      ctx.beginPath();
      ctx.arc(x+w/2,y+h/2-3,6,Math.PI,Math.PI*2);
      ctx.stroke();
    }
  }

  function drawPrettyChest(c){
    const th=theme();
    const x=wx(c.x);
    const y=wy(c.y);
    const w=c.w;
    const h=c.h;

    drawSoftShadow(x,y,w,h,.22);

    const baseGrad=ctx.createLinearGradient(x,y,x,y+h);
    baseGrad.addColorStop(0,c.opened?"#8b6b4b":th.chest1);
    baseGrad.addColorStop(1,c.opened?"#4a3527":th.chest2);

    ctx.fillStyle=baseGrad;
    roundRect(x,y+h*.24,w,h*.72,5);
    ctx.fill();

    // フタ
    ctx.fillStyle=c.opened?"#6b4d34":th.chest1;
    ctx.beginPath();
    ctx.moveTo(x+2,y+h*.34);
    ctx.quadraticCurveTo(x+w/2,y-5,x+w-2,y+h*.34);
    ctx.lineTo(x+w-2,y+h*.48);
    ctx.lineTo(x+2,y+h*.48);
    ctx.closePath();
    ctx.fill();

    // 金属帯
    ctx.fillStyle="rgba(255,224,105,.88)";
    ctx.fillRect(x+3,y+h*.48,w-6,3);
    ctx.fillRect(x+w*.44,y+h*.25,w*.12,h*.65);

    // 鍵穴
    ctx.fillStyle="rgba(45,25,15,.75)";
    roundRect(x+w/2-3,y+h*.56,6,7,2);
    ctx.fill();

    if(!c.opened){
      ctx.save();
      ctx.globalAlpha=.45;
      ctx.strokeStyle="#fff7b0";
      ctx.lineWidth=1;
      ctx.beginPath();
      ctx.moveTo(x+5,y+h*.35);
      ctx.lineTo(x+w*.34,y+h*.16);
      ctx.stroke();
      ctx.restore();
    }else{
      ctx.save();
      ctx.globalAlpha=.35;
      ctx.fillStyle="#fff7b0";
      ctx.beginPath();
      ctx.ellipse(x+w/2,y+h*.25,w*.22,h*.11,0,0,Math.PI*2);
      ctx.fill();
      ctx.restore();
    }
  }

function drawPrettyShop(s){
    const th=theme();
    const x=wx(s.x);
    const y=wy(s.y);
    const w=s.w;
    const h=s.h;

    // 店を大きめに描く。当たり判定は s.x/s.y/s.w/s.h のまま。
    const bx=x-8;
    const by=y-18;
    const bw=w+16;
    const bh=h+24;

    drawSoftShadow(bx-5,by+8,bw+10,bh+8,.30);

    ctx.restore();

    // 壁
    const wall=ctx.createLinearGradient(bx,by+24,bx,by+bh);
    wall.addColorStop(0,"#fff2a5");
    wall.addColorStop(.32,th.shop1);
    wall.addColorStop(1,th.shop2);

    ctx.fillStyle=wall;
    roundRect(bx,by+24,bw,bh-20,10);
    ctx.fill();

    ctx.strokeStyle="rgba(255,255,255,.58)";
    ctx.lineWidth=2;
    roundRect(bx+2,by+26,bw-4,bh-24,8);
    ctx.stroke();


// 屋根
const roof=ctx.createLinearGradient(bx,by-14,bx,by+34);
roof.addColorStop(0,"#ffb0a0");
roof.addColorStop(.48,"#e64236");
roof.addColorStop(1,"#8f1f1a");

    ctx.fillStyle=roof;
    ctx.beginPath();
    ctx.moveTo(bx-9,by+28);
    ctx.lineTo(bx+bw/2,by-16);
    ctx.lineTo(bx+bw+9,by+28);
    ctx.lineTo(bx+bw+4,by+38);
    ctx.lineTo(bx-4,by+38);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle="rgba(255,255,255,.75)";
    ctx.lineWidth=2;
    ctx.beginPath();
    ctx.moveTo(bx-8,by+28);
    ctx.lineTo(bx+bw/2,by-15);
    ctx.lineTo(bx+bw+8,by+28);
    ctx.stroke();

    // 看板
    ctx.fillStyle="rgba(70,38,20,.90)";
    roundRect(bx+bw*.16,by+31,bw*.68,20,5);
    ctx.fill();
    ctx.fillStyle="#fff7a8";
    ctx.font="900 11px system-ui";
    ctx.textAlign="center";
    ctx.fillText("SHOP",bx+bw/2,by+45);
    ctx.textAlign="left";
  }


function drawPrettyCoin(d){
    const th=theme();
    if(!d)return;

    const x=wx(d.x);
    const y=wy(d.y);
    const pulse=1+Math.sin((G.time||0)*.18)*.08;

    ctx.save();
    ctx.globalAlpha=.35;
    ctx.fillStyle=th.glow;
    ctx.beginPath();
    ctx.ellipse(x,y+1,9*pulse,5*pulse,0,0,Math.PI*2);
    ctx.fill();
    ctx.restore();

    const grad=ctx.createRadialGradient(x-2,y-2,1,x,y,7*pulse);
    grad.addColorStop(0,"#fff7b0");
    grad.addColorStop(.45,"#ffd84d");
    grad.addColorStop(1,"#c99022");

    ctx.fillStyle=grad;
    ctx.beginPath();
    ctx.arc(x,y,5.5*pulse,0,Math.PI*2);
    ctx.fill();

    ctx.strokeStyle="rgba(255,255,255,.55)";
    ctx.lineWidth=1;
    ctx.beginPath();
    ctx.arc(x,y,5.5*pulse,0,Math.PI*2);
    ctx.stroke();
  }

  function prettyBg(){
    const th=theme();

    const sky=ctx.createLinearGradient(0,0,0,VH*.45);
    sky.addColorStop(0,th.sky1);
    sky.addColorStop(1,th.sky2);

    ctx.fillStyle=sky;
    ctx.fillRect(0,0,VW,VH);

    const ground=ctx.createLinearGradient(0,VH*.10,0,VH);
    ground.addColorStop(0,th.ground1);
    ground.addColorStop(1,th.ground2);

    ctx.fillStyle=ground;
    ctx.fillRect(0,0,VW,VH);

    // 島のベース
    if(G.map){
      ctx.save();
      ctx.translate(-G.camera.x,-G.camera.y);

      const islandGrad=ctx.createLinearGradient(0,0,0,G.map.height);
      islandGrad.addColorStop(0,th.ground1);
      islandGrad.addColorStop(1,th.ground2);

      ctx.fillStyle=islandGrad;
      roundRect(28,28,G.map.width-56,G.map.height-56,36);
      ctx.fill();

      // 草・地面の細かい模様
      ctx.save();
      ctx.globalAlpha=.14;
      ctx.strokeStyle="#ffffff";
      ctx.lineWidth=1;

      for(let yy=80;yy<G.map.height-80;yy+=90){
        ctx.beginPath();
        ctx.moveTo(60,yy);
        for(let xx=60;xx<G.map.width-60;xx+=80){
          ctx.quadraticCurveTo(xx+30,yy+12,xx+60,yy);
        }
        ctx.stroke();
      }
      ctx.restore();

      ctx.restore();
    }
  }

  // 既存の描画を美化版で上書き
  bg = prettyBg;
  drawTerrain = drawPrettyTerrain;
  drawShop3D = function(ctxArg,s,wxArg,wyArg){
    drawPrettyShop(s);
  };
  drawCoin3D = function(ctxArg,d,wxArg,wyArg){
    drawPrettyCoin(d);
  };

  // chest / door は元の draw() 内に直書きなので draw 全体を安全に上書き
  const __prettyOldDraw = draw;

  draw = function(){
    if(G.state==="title"){
      ctx.fillStyle="#8fe8ff";
      ctx.fillRect(0,0,VW,VH);

      ctx.fillStyle="#fff";
      ctx.textAlign="center";
      ctx.font="900 34px system-ui";
      ctx.fillText("SKY ISLAND",VW/2,210);
      ctx.fillText("ADVENTURE",VW/2,250);

      ctx.font="800 15px system-ui";
      ctx.fillText("TAP / Z TO START",VW/2,326);
      ctx.fillText("direction fixed",VW/2,360);

      ctx.textAlign="left";
      return;
    }

    bg();
    drawTerrain();

    for(const d of G.doors){
      drawPrettyDoor(d);
    }

    for(const c of G.chests){
      drawPrettyChest(c);
    }

    for(const s of G.shops){
      drawPrettyShop(s);
    }

    for(const n of G.npcs){
      drawNPC3D(ctx,n,wx,wy);
    }

    for(const d of G.drops){
      drawPrettyCoin(d);
    }

    for(const e of G.enemies){
      drawEnemy3D(ctx,e,wx,wy);
    }

    if(G.boss){
      drawBoss3D(ctx,G.boss,wx,wy,G.time);
    }

    for(const b of G.bullets){
      if(!b)continue;

      ctx.fillStyle=b.color||"#fff";
      ctx.beginPath();
      ctx.arc(wx(b.x+b.w/2),wy(b.y+b.h/2),b.w/2,0,Math.PI*2);
      ctx.fill();
    }

    drawHeroAdventurer3D(ctx,G.player,wx,wy,G.time,atkBox);

    for(const e of G.effects){
      if(!e||typeof e.life!=="number")continue;

      ctx.save();
      ctx.globalAlpha=Math.max(0,Math.min(1,e.life/(e.max||e.life||1)));

      if(e.type==="ring"){
        ctx.strokeStyle=e.color||"#fff";
        ctx.lineWidth=3;
        ctx.beginPath();
        ctx.arc(wx(e.x),wy(e.y),e.r||1,0,Math.PI*2);
        ctx.stroke();
      }else{
        ctx.fillStyle=e.color||"#fff";
        ctx.fillRect(wx(e.x),wy(e.y),e.size||2,e.size||2);
      }

      ctx.restore();
    }

    ui();
  };
})();

/* =========================================================
   魔法陣ワープ式・決闘空間ボスバトル 完全版
   貼る場所:
   - game.js の一番下
   - 既存コードの最後の })(); より後ろ
   - 以前のボス扉/広いアリーナ/決闘空間パッチより後ろ

   流れ:
   1. 鍵を持ってボス扉に触れる
   2. ACT / Z / Enter で扉を開く
   3. 扉の奥に魔法陣が出現
   4. 魔法陣に乗る
   5. 決闘空間へワープ
   6. ボスと1対1
   ========================================================= */
(function(){
  if(window.__bossMagicCircleDuelPatchApplied) return;
  window.__bossMagicCircleDuelPatchApplied = true;

  const DUEL_W = 920;
  const DUEL_H = 1180;

  const DUEL_ROOM = {
    x: 70,
    y: 90,
    w: 780,
    h: 860
  };

  const PLAYER_START = {
    x: DUEL_W / 2 - 12,
    y: DUEL_H - 210
  };

  function hitSafe(a,b){
    return a && b &&
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y;
  }

  function isBossDoor(d){
    if(!d) return false;
    return (
      d.id === "boss_door" ||
      String(d.id || "").includes("boss") ||
      String(d.label || "").includes("扉") ||
      String(d.requiredItem || "").includes("key")
    );
  }

  function normalActionRect(){
    const p = G.player;
    if(!p) return null;

    return {
      x: p.x - 12,
      y: p.y - 12,
      w: p.w + 24,
      h: p.h + 24
    };
  }

  function doorTouchRect(){
    const p = G.player;
    if(!p) return null;

    const ex = 30;
    const ey = 30;

    return {
      x: p.x - ex,
      y: p.y - ey,
      w: p.w + ex * 2,
      h: p.h + ey * 2
    };
  }

  function getTouchedDoor(){
    if(!G || !G.player || !Array.isArray(G.doors)) return null;

    const r = doorTouchRect();
    if(!r) return null;

    for(const d of G.doors){
      if(!d) continue;
      if(hitSafe(r,d)) return d;
    }

    return null;
  }

  function getBossDoor(){
    if(!G || !Array.isArray(G.doors)) return null;

    for(const d of G.doors){
      if(isBossDoor(d)) return d;
    }

    return null;
  }

  function hasItemSafe(id){
    if(!G || !G.player || !id) return false;

    if(typeof hasItem === "function"){
      try{
        if(hasItem(id)) return true;
      }catch(e){}
    }

    const inv = G.player.inventory || [];

    for(const v of inv){
      if(v === id) return true;

      if(
        typeof v === "object" &&
        v &&
        v.id === id &&
        (v.count == null || v.count > 0)
      ){
        return true;
      }
    }

    return false;
  }

  function clSafe(v,a,b){
    if(typeof cl === "function"){
      return cl(v,a,b);
    }
    return Math.max(a, Math.min(b, v));
  }

  function markBossDefeated(){
    if(G && G.map){
      G.map.__bossDefeated = true;
    }
  }

  function stageThemeColor(){
    const i = G.stageIndex || 0;

    return [
      {
        name:"風の決闘空間",
        sky1:"#cfffff",
        sky2:"#5bcfff",
        floor1:"#5fdc82",
        floor2:"#257a54",
        ring:"#9effa1",
        rune:"#e8ffe8",
        dark:"#0d3140",
        circle:"#9effa1"
      },
      {
        name:"森の決闘空間",
        sky1:"#d7fff0",
        sky2:"#6ed99b",
        floor1:"#49c865",
        floor2:"#1e6137",
        ring:"#b9ff9a",
        rune:"#eaffd2",
        dark:"#0e3024",
        circle:"#b9ff9a"
      },
      {
        name:"水晶の決闘空間",
        sky1:"#e3fbff",
        sky2:"#65e8ff",
        floor1:"#66d8ee",
        floor2:"#256b93",
        ring:"#d8ffff",
        rune:"#ffffff",
        dark:"#0a3046",
        circle:"#d8ffff"
      },
      {
        name:"炎の決闘空間",
        sky1:"#ffd1a1",
        sky2:"#ff7048",
        floor1:"#d96a42",
        floor2:"#61251f",
        ring:"#ffd84d",
        rune:"#fff1a3",
        dark:"#3d1715",
        circle:"#ffd84d"
      },
      {
        name:"遺跡の決闘空間",
        sky1:"#fff7cc",
        sky2:"#b9e8ff",
        floor1:"#d6c15c",
        floor2:"#746634",
        ring:"#fff7a8",
        rune:"#ffffff",
        dark:"#332c19",
        circle:"#fff7a8"
      },
      {
        name:"星霜の決闘空間",
        sky1:"#edf1ff",
        sky2:"#9b7cff",
        floor1:"#7ca7ff",
        floor2:"#31245f",
        ring:"#cfd8ff",
        rune:"#ffffff",
        dark:"#171231",
        circle:"#cfd8ff"
      },
      {
        name:"虚空の決闘空間",
        sky1:"#d6c8ff",
        sky2:"#3d236f",
        floor1:"#6951b8",
        floor2:"#13091f",
        ring:"#8b5cff",
        rune:"#efe7ff",
        dark:"#0b0612",
        circle:"#efe7ff"
      }
    ][i] || {
      name:"決闘空間",
      sky1:"#cfffff",
      sky2:"#5bcfff",
      floor1:"#5fdc82",
      floor2:"#257a54",
      ring:"#9effa1",
      rune:"#e8ffe8",
      dark:"#0d3140",
      circle:"#9effa1"
    };
  }

  function makeDuelTerrain(){
    return [
      {x:0,y:0,w:DUEL_W,h:34,type:"cliff"},
      {x:0,y:0,w:34,h:DUEL_H,type:"cliff"},
      {x:DUEL_W-34,y:0,w:34,h:DUEL_H,type:"cliff"},
      {x:0,y:DUEL_H-34,w:DUEL_W,h:34,type:"cliff"},

      {x:74,y:82,w:190,h:30,type:"stone"},
      {x:DUEL_W-264,y:82,w:190,h:30,type:"stone"},

      {x:92,y:240,w:72,h:52,type:"rock"},
      {x:DUEL_W-164,y:240,w:72,h:52,type:"rock"},

      {x:96,y:DUEL_H-350,w:76,h:56,type:"rock"},
      {x:DUEL_W-172,y:DUEL_H-350,w:76,h:56,type:"rock"},

      {x:90,y:DUEL_H-160,w:130,h:32,type:"stone"},
      {x:DUEL_W-220,y:DUEL_H-160,w:130,h:32,type:"stone"}
    ];
  }

  function rememberOriginalStageState(){
    if(!G || !G.map) return;

    G.__duelOriginalStage = {
      id: G.map.id,
      name: G.map.name,
      width: G.map.width,
      height: G.map.height,
      objective: G.map.objective,
      terrain: Array.isArray(G.terrain) ? G.terrain.map(o => ({...o})) : [],
      npcs: Array.isArray(G.npcs) ? G.npcs.map(o => ({...o})) : [],
      shops: Array.isArray(G.shops) ? G.shops.map(o => ({...o})) : [],
      chests: Array.isArray(G.chests) ? G.chests.map(o => ({...o})) : [],
      doors: Array.isArray(G.doors) ? G.doors.map(o => ({...o})) : [],
      enemies: Array.isArray(G.enemies) ? G.enemies.map(o => ({...o})) : []
    };
  }

  function canCreateMagicCircle(){
    if(!G) return false;
    if(G.state !== "field") return false;
    if(!G.map) return false;
    if(!G.player) return false;
    if(!G.map.boss) return false;
    if(G.map.__bossDefeated) return false;
    if(G.map.__duelSpace) return false;
    return true;
  }

  function createBossWarpCircleFromDoor(d){
    if(!canCreateMagicCircle()) return false;
    if(!d) return false;

    const requiredItem = d.requiredItem;

    if(requiredItem && !hasItemSafe(requiredItem)){
      msg("鍵が必要だ", 60);
      return true;
    }

    d.locked = false;

    /*
      魔法陣は扉の少し奥に出す。
      扉の y はだいたい 270、ボス側はその上なので、
      y を少し上に置くと「扉の奥」の感じが出る。
    */
    const cx = d.x + d.w / 2;
    const cy = Math.max(70, d.y - 72);

    G.map.__bossDoorOpened = true;
    G.map.__bossWarpCircle = {
      x: cx - 34,
      y: cy - 22,
      w: 68,
      h: 44,
      cx,
      cy,
      r: 38,
      active: true,
      doorLabel: d.label || "扉"
    };

    G.map.objective = "魔法陣に乗る";

    msg((d.label || "扉") + "が開いた！ 奥の魔法陣へ向かおう", 120);

    return true;
  }

  function playerOnWarpCircle(){
    if(!G || !G.player || !G.map || !G.map.__bossWarpCircle) return false;

    const c = G.map.__bossWarpCircle;
    if(!c.active) return false;

    const p = G.player;
    const px = p.x + p.w / 2;
    const py = p.y + p.h / 2;

    const dx = px - c.cx;
    const dy = py - c.cy;

    return dx * dx + dy * dy <= c.r * c.r;
  }

  function createBossForDuel(){
    if(!G || !G.map || !G.map.boss) return false;

    const src = G.map.boss;
    const bw = src.w || 120;
    const bh = src.h || 100;

    G.boss = {
      ...src,
      x: DUEL_ROOM.x + DUEL_ROOM.w / 2 - bw / 2,
      y: DUEL_ROOM.y + 110,
      w: bw,
      h: bh,
      t: 0,
      shot: 82,
      phase: 1,
      duelBoss: true
    };

    return true;
  }

  function enterDuelSpaceFromCircle(){
    if(!G || !G.map || !G.player) return false;
    if(G.map.__duelSpace) return false;
    if(G.map.__bossDefeated) return false;
    if(!G.map.boss) return false;

    rememberOriginalStageState();

    const th = stageThemeColor();
    const oldMapName = G.map.name || "島";

    G.map.name = th.name;
    G.map.objective = "決闘空間で守護獣を倒す";
    G.map.width = DUEL_W;
    G.map.height = DUEL_H;
    G.map.bossRoom = {...DUEL_ROOM};
    G.map.__duelSpace = true;
    G.map.__duelOriginalName = oldMapName;
    G.map.__bossSpawned = true;
    G.map.__bossWarpCircle = null;

    const terrain = makeDuelTerrain();

    G.map.terrain = terrain;
    G.terrain = terrain;

    G.npcs = [];
    G.shops = [];
    G.chests = [];
    G.doors = [];
    G.enemies = [];
    G.drops = [];
    G.effects = [];
    G.bullets = [];

    G.map.npcs = [];
    G.map.shops = [];
    G.map.chests = [];
    G.map.doors = [];
    G.map.enemies = [];

    G.player.x = PLAYER_START.x;
    G.player.y = PLAYER_START.y;
    G.player.vx = 0;
    G.player.vy = 0;
    G.player.dir = "up";
    G.player.inv = Math.max(G.player.inv || 0, 100);
    G.player.dashT = 0;
    G.player.attackT = 0;
    G.player.attackCd = 0;
    G.player.combo = 0;
    G.player.comboT = 0;

    createBossForDuel();

    G.state = "field";
    G.lock = 58;
    G.duelTransitionT = 78;
    G.duelTransitionMax = 78;
    G.duelIntroText = "決闘空間へ";

    flush();
    cam();

    msg("魔法陣が光り、決闘空間へ転送された！", 130);

    return true;
  }

  function handleNormalObjectsBeforeDoor(){
    if(!G || !G.player) return false;

    const pr = normalActionRect();
    if(!pr) return false;

    for(const s of G.shops || []){
      if(hitSafe(pr,s)){
        G.shop = {shop:s};
        G.state = "shop";
        return true;
      }
    }

    for(const n of G.npcs || []){
      if(hitSafe(pr,n)){
        if(typeof beginTalk === "function"){
          beginTalk(n);
        }else{
          G.talk = {npc:n,index:0};
          G.state = "talk";
        }
        return true;
      }
    }

    for(const c of G.chests || []){
      if(!c.opened && hitSafe(pr,c)){
        openChest(c);
        return true;
      }
    }

    return false;
  }

  /*
    spawnBoss は、この方式では直接ボスを出さない。
    扉を開けたら魔法陣を作る。
  */
  spawnBoss = function(){
    const hpScale = (typeof window !== "undefined") ? window.__applyStageBossHpScale : null;
    if(typeof hpScale === "function") hpScale();

    if(G && G.map && G.map.__duelSpace){
      createBossForDuel();
      if(typeof hpScale === "function") hpScale();
      return;
    }

    const d = getTouchedDoor() || getBossDoor();

    if(d && isBossDoor(d)){
      createBossWarpCircleFromDoor(d);
      if(typeof hpScale === "function") hpScale();
    }
  };

  /*
    tryDoor:
    扉に触れている時だけ開く。
    開いたらボスではなく魔法陣を出す。
  */
  tryDoor = function(d){
    if(!d) return;

    const touched = getTouchedDoor();

    if(!touched || touched !== d){
      return;
    }

    if(isBossDoor(d)){
      createBossWarpCircleFromDoor(d);
      return;
    }

    if(d.requiredItem && !hasItemSafe(d.requiredItem)){
      msg("鍵が必要だ", 60);
      return;
    }

    d.locked = false;
    msg((d.label || "扉") + "が開いた！", 80);
  };

  /*
    action:
    古い action を最後に呼ばない。
    これで以前の「扉を開けた瞬間にボス出現」系パッチを無効化する。
  */
  action = function(){
    if(typeof G === "undefined") return;

    if(G.state === "title"){
      start();
      return;
    }

    if(G.talk){
      talkNext();
      return;
    }

    if(G.state !== "field"){
      if(G.state === "shop"){
        closeShop();
      }
      return;
    }

    if(G.map && G.map.__duelSpace){
      return;
    }

    /*
      魔法陣が出ている時は、ACTで入るのではなく、
      乗ったら自動ワープ。
      そのため action では何もしない。
    */

    if(handleNormalObjectsBeforeDoor()){
      return;
    }

    const touchedDoor = getTouchedDoor();

    if(!touchedDoor){
      return;
    }

    if(isBossDoor(touchedDoor)){
      createBossWarpCircleFromDoor(touchedDoor);
      return;
    }

    tryDoor(touchedDoor);
  };

  /*
    update を包む:
    - 魔法陣に乗ったら自動ワープ
    - ワープ演出タイマーを減らす
  */
  if(typeof update === "function"){
    const __oldUpdateMagicCircleDuel = update;

    update = function(){
      __oldUpdateMagicCircleDuel();

      if(G && G.duelTransitionT > 0){
        G.duelTransitionT--;
      }

      if(
        G &&
        G.state === "field" &&
        G.map &&
        !G.map.__duelSpace &&
        G.map.__bossWarpCircle &&
        playerOnWarpCircle()
      ){
        enterDuelSpaceFromCircle();
      }
    };
  }

  /*
    ボス移動:
    決闘空間では広く動く。
  */
  updBoss = function(){
    const b = G.boss;
    if(!b || !G.map) return;

    const r = G.map.bossRoom || DUEL_ROOM;

    b.t = (b.t || 0) + 1;

    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;

    const ampX = G.map.__duelSpace
      ? Math.min(310, r.w * 0.36)
      : Math.min(170, r.w * 0.24);

    const ampY = G.map.__duelSpace
      ? Math.min(260, r.h * 0.32)
      : Math.min(70, r.h * 0.25);

    let nx = cx - b.w / 2 + Math.cos(b.t * 0.019) * ampX;
    let ny = cy - b.h / 2 + Math.sin(b.t * 0.027) * ampY;

    nx = clSafe(nx, r.x + 10, r.x + r.w - b.w - 10);
    ny = clSafe(ny, r.y + 10, r.y + r.h - b.h - 10);

    b.x = nx;
    b.y = ny;
  };

  /*
    魔法陣描画。
    通常ステージ側の draw に後乗せする。
  */
  function drawBossWarpCircle(){
    if(!G || !G.map || !G.map.__bossWarpCircle) return;
    if(G.map.__duelSpace) return;

    const c = G.map.__bossWarpCircle;
    if(!c.active) return;

    const th = stageThemeColor();

    const x = wx(c.cx);
    const y = wy(c.cy);

    const pulse = 1 + Math.sin((G.time || 0) * 0.12) * 0.08;
    const spin = (G.time || 0) * 0.025;

    ctx.save();

    /*
      外側の光
    */
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = th.circle;
    ctx.beginPath();
    ctx.ellipse(x, y + 2, 54 * pulse, 28 * pulse, 0, 0, Math.PI * 2);
    ctx.fill();

    /*
      魔法陣本体
    */
    ctx.globalAlpha = 0.88;
    ctx.strokeStyle = th.circle;
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.ellipse(x, y, 38 * pulse, 22 * pulse, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.globalAlpha = 0.75;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.ellipse(x, y, 25 * pulse, 14 * pulse, 0, 0, Math.PI * 2);
    ctx.stroke();

    /*
      回転するルーン線
    */
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = th.rune;
    ctx.lineWidth = 1.5;

    for(let i=0;i<8;i++){
      const a = spin + i / 8 * Math.PI * 2;
      const x1 = x + Math.cos(a) * 10 * pulse;
      const y1 = y + Math.sin(a) * 6 * pulse;
      const x2 = x + Math.cos(a) * 36 * pulse;
      const y2 = y + Math.sin(a) * 20 * pulse;

      ctx.beginPath();
      ctx.moveTo(x1,y1);
      ctx.lineTo(x2,y2);
      ctx.stroke();
    }

    /*
      上昇する光粒
    */
    ctx.fillStyle = "#ffffff";

    for(let i=0;i<10;i++){
      const t = ((G.time || 0) * 0.025 + i * 0.17) % 1;
      const px = x + Math.cos(i * 2.1) * (12 + i % 4 * 6);
      const py = y + 10 - t * 54;

      ctx.globalAlpha = 0.15 + (1 - t) * 0.55;
      ctx.beginPath();
      ctx.arc(px, py, 1.5 + (i % 3), 0, Math.PI * 2);
      ctx.fill();
    }

    /*
      案内テキスト
    */
    ctx.globalAlpha = 1;
    ctx.textAlign = "center";
    ctx.font = "900 12px system-ui";
    ctx.fillStyle = "#fff";
    ctx.fillText("乗ると決闘空間へ", x, y - 44);
    ctx.textAlign = "left";

    ctx.restore();
  }

  /*
    決闘空間専用背景。
  */
  const __oldBgMagicCircleDuel = typeof bg === "function" ? bg : null;

  bg = function(){
    if(!G || !G.map || !G.map.__duelSpace){
      if(__oldBgMagicCircleDuel){
        __oldBgMagicCircleDuel();
      }
      return;
    }

    const th = stageThemeColor();

    const sky = ctx.createLinearGradient(0,0,0,VH);
    sky.addColorStop(0, th.sky1);
    sky.addColorStop(0.42, th.sky2);
    sky.addColorStop(1, th.dark);

    ctx.fillStyle = sky;
    ctx.fillRect(0,0,VW,VH);

    ctx.save();
    ctx.translate(-G.camera.x, -G.camera.y);

    const floor = ctx.createRadialGradient(
      DUEL_W / 2,
      DUEL_H / 2,
      80,
      DUEL_W / 2,
      DUEL_H / 2,
      620
    );

    floor.addColorStop(0, th.floor1);
    floor.addColorStop(0.68, th.floor2);
    floor.addColorStop(1, th.dark);

    ctx.fillStyle = floor;
    RR(34,34,DUEL_W-68,DUEL_H-68,42);
    ctx.fill();

    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = th.ring;
    ctx.lineWidth = 8;
    RR(48,48,DUEL_W-96,DUEL_H-96,38);
    ctx.stroke();
    ctx.restore();

    const cx = DUEL_W / 2;
    const cy = DUEL_H / 2 + 40;

    ctx.save();

    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = th.ring;
    ctx.lineWidth = 4;

    ctx.beginPath();
    ctx.arc(cx, cy, 210, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, 142, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, 74, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = th.rune;
    ctx.lineWidth = 2;

    for(let i=0;i<12;i++){
      const a = i / 12 * Math.PI * 2 + (G.time || 0) * 0.002;
      const x1 = cx + Math.cos(a) * 88;
      const y1 = cy + Math.sin(a) * 88;
      const x2 = cx + Math.cos(a) * 205;
      const y2 = cy + Math.sin(a) * 205;

      ctx.beginPath();
      ctx.moveTo(x1,y1);
      ctx.lineTo(x2,y2);
      ctx.stroke();
    }

    ctx.fillStyle = th.rune;

    for(let i=0;i<28;i++){
      const a = i * 0.91 + (G.time || 0) * 0.012;
      const rr = 260 + Math.sin(i * 1.7 + (G.time || 0) * 0.02) * 50;
      const x = cx + Math.cos(a) * rr;
      const y = cy + Math.sin(a) * rr * 0.72;

      ctx.globalAlpha = 0.25 + (i % 5) * 0.08;
      ctx.beginPath();
      ctx.arc(x,y,2 + (i % 3),0,Math.PI*2);
      ctx.fill();
    }

    ctx.restore();
    ctx.restore();
  };

  /*
    draw を包む:
    - 通常ステージでは魔法陣を描く
    - ワープ直後は演出を重ねる
  */
  if(typeof draw === "function"){
    const __oldDrawMagicCircleDuel = draw;

    draw = function(){
      __oldDrawMagicCircleDuel();

      drawBossWarpCircle();

      if(!G || !G.duelTransitionT || G.duelTransitionT <= 0) return;

      const max = G.duelTransitionMax || 78;
      const t = G.duelTransitionT / max;

      ctx.save();
      ctx.setTransform(1,0,0,1,0,0);

      ctx.globalAlpha = Math.min(0.86, t * 0.86);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0,0,VW,VH);

      ctx.globalAlpha = Math.min(0.72, t * 0.72);
      ctx.fillStyle = "rgba(8,25,45,.88)";
      ctx.fillRect(0,0,VW,VH);

      ctx.globalAlpha = Math.min(1, t * 1.2);
      ctx.textAlign = "center";
      ctx.fillStyle = "#fff";
      ctx.font = "900 28px system-ui";
      ctx.fillText(G.duelIntroText || "決闘空間へ", VW/2, VH/2 - 12);

      ctx.font = "800 13px system-ui";
      ctx.fillText("守護獣との一騎打ち", VW/2, VH/2 + 22);

      ctx.textAlign = "left";
      ctx.restore();
    };
  }
})();
/* =========================================================
   ボス超強化グラフィック + ステージ別攻撃AI 完全版
   貼る場所:
   - game.js の一番下
   - 魔法陣ワープ式・決闘空間パッチよりさらに後ろ

   効果:
   - drawBoss3D を完全上書きして、全ステージのボスを派手に描画
   - updBoss を完全上書きして、各ステージテーマ別の攻撃を追加
   - ボス弾 / 予兆範囲 / 持続ダメージ床を追加
   - 既存の player, hurt, fx, ring, msg, cl, wx, wy, draw などを利用
   ========================================================= */
(function(){
  if(window.__superBossGraphicsAndAttackPatchApplied) return;
  window.__superBossGraphicsAndAttackPatchApplied = true;

  const TWO_PI = Math.PI * 2;

  function safeCl(v,a,b){
    if(typeof cl === "function") return cl(v,a,b);
    return Math.max(a, Math.min(b,v));
  }

  function hitSafe(a,b){
    return a && b &&
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y;
  }

  function playerBox(){
    const p = G.player;
    if(!p) return null;
    return {
      x:p.x + 4,
      y:p.y + 8,
      w:p.w - 8,
      h:p.h - 10
    };
  }

  function centerOf(o){
    return {
      x:o.x + o.w / 2,
      y:o.y + o.h / 2
    };
  }

  function dist2(ax,ay,bx,by){
    const dx = ax - bx;
    const dy = ay - by;
    return dx * dx + dy * dy;
  }

  function norm(x,y){
    const l = Math.hypot(x,y) || 1;
    return {x:x/l,y:y/l,l};
  }

  function theme(){
    const i = G.stageIndex || 0;

    return [
      {
        id:"wind",
        name:"風",
        main:"#73df78",
        sub:"#b7ff9a",
        dark:"#1e6b45",
        glow:"#9effa1",
        eye:"#eaffd2",
        bullet:"#9effa1",
        warn:"#eaffd2"
      },
      {
        id:"forest",
        name:"森",
        main:"#46c66a",
        sub:"#b9ff9a",
        dark:"#1f6f3a",
        glow:"#a8ff86",
        eye:"#f3ffd8",
        bullet:"#8cff6f",
        warn:"#ccff99"
      },
      {
        id:"crystal",
        name:"水晶",
        main:"#72f7ff",
        sub:"#d8ffff",
        dark:"#237e9a",
        glow:"#b9fbff",
        eye:"#ffffff",
        bullet:"#91f9ff",
        warn:"#e5ffff"
      },
      {
        id:"flame",
        name:"炎",
        main:"#ff7048",
        sub:"#ffd84d",
        dark:"#8b2d22",
        glow:"#ffb347",
        eye:"#fff1a3",
        bullet:"#ff8a35",
        warn:"#ffd84d"
      },
      {
        id:"ruin",
        name:"遺跡",
        main:"#ffd84d",
        sub:"#fff7a8",
        dark:"#8c6d35",
        glow:"#fff2a5",
        eye:"#ffffff",
        bullet:"#ffe27a",
        warn:"#fff7a8"
      },
      {
        id:"star",
        name:"星霜",
        main:"#9b7cff",
        sub:"#cfd8ff",
        dark:"#35266f",
        glow:"#b8a8ff",
        eye:"#ffffff",
        bullet:"#b7c4ff",
        warn:"#e4e8ff"
      },
      {
        id:"void",
        name:"虚空",
        main:"#8b5cff",
        sub:"#efe7ff",
        dark:"#171026",
        glow:"#b56bff",
        eye:"#ffffff",
        bullet:"#a56bff",
        warn:"#d8b7ff"
      }
    ][i] || {
      id:"wind",
      name:"風",
      main:"#73df78",
      sub:"#b7ff9a",
      dark:"#1e6b45",
      glow:"#9effa1",
      eye:"#eaffd2",
      bullet:"#9effa1",
      warn:"#eaffd2"
    };
  }

  function bossHpRate(b){
    if(!b || !b.maxHp) return 1;
    return Math.max(0, Math.min(1, b.hp / b.maxHp));
  }

  function bossPhase(b){
    const r = bossHpRate(b);
    if(r <= 0.33) return 3;
    if(r <= 0.66) return 2;
    return 1;
  }

  function bossCenter(){
    if(!G.boss) return null;
    return centerOf(G.boss);
  }

  function playerCenter(){
    if(!G.player) return null;
    return centerOf(G.player);
  }

  function ensureBossArrays(){
    if(!Array.isArray(G.bossBullets)) G.bossBullets = [];
    if(!Array.isArray(G.bossZones)) G.bossZones = [];
  }

  function addBossBullet(o){
    ensureBossArrays();

    G.bossBullets.push({
      x:o.x || 0,
      y:o.y || 0,
      w:o.w || 14,
      h:o.h || 14,
      vx:o.vx || 0,
      vy:o.vy || 0,
      life:o.life || 120,
      max:o.life || 120,
      dmg:o.dmg || 2,
      color:o.color || theme().bullet,
      kind:o.kind || "orb",
      radius:o.radius || 0,
      spin:o.spin || 0,
      pierce:!!o.pierce,
      homing:o.homing || 0,
      accel:o.accel || 0,
      grow:o.grow || 0,
      owner:"boss"
    });
  }

  function addBossZone(o){
    ensureBossArrays();

    G.bossZones.push({
      type:o.type || "circle",
      x:o.x || 0,
      y:o.y || 0,
      w:o.w || 80,
      h:o.h || 80,
      r:o.r || 48,
      life:o.life || 60,
      max:o.life || 60,
      warn:o.warn || 28,
      dmg:o.dmg || 2,
      color:o.color || theme().warn,
      tick:o.tick || 18,
      t:0,
      activeAfter:o.activeAfter == null ? o.warn || 28 : o.activeAfter,
      label:o.label || ""
    });
  }

  function shootAtPlayer(speed, opts){
    const b = bossCenter();
    const p = playerCenter();
    if(!b || !p) return;

    const n = norm(p.x - b.x, p.y - b.y);
    opts = opts || {};

    addBossBullet({
      x:b.x - (opts.size || 14) / 2,
      y:b.y - (opts.size || 14) / 2,
      w:opts.size || 14,
      h:opts.size || 14,
      vx:n.x * speed,
      vy:n.y * speed,
      life:opts.life || 120,
      dmg:opts.dmg || 2,
      color:opts.color || theme().bullet,
      kind:opts.kind || "orb",
      homing:opts.homing || 0,
      pierce:opts.pierce || false
    });
  }

  function shootRadial(count, speed, opts){
    const b = bossCenter();
    if(!b) return;

    opts = opts || {};
    const offset = opts.offset || 0;

    for(let i=0;i<count;i++){
      const a = offset + i / count * TWO_PI;
      const size = opts.size || 13;

      addBossBullet({
        x:b.x - size / 2,
        y:b.y - size / 2,
        w:size,
        h:size,
        vx:Math.cos(a) * speed,
        vy:Math.sin(a) * speed,
        life:opts.life || 120,
        dmg:opts.dmg || 2,
        color:opts.color || theme().bullet,
        kind:opts.kind || "orb",
        spin:opts.spin || 0,
        pierce:opts.pierce || false
      });
    }
  }

  function shootArc(count, speed, spread, opts){
    const b = bossCenter();
    const p = playerCenter();
    if(!b || !p) return;

    opts = opts || {};

    const base = Math.atan2(p.y - b.y, p.x - b.x);
    const start = base - spread / 2;

    for(let i=0;i<count;i++){
      const a = count === 1 ? base : start + spread * (i / (count - 1));
      const size = opts.size || 13;

      addBossBullet({
        x:b.x - size / 2,
        y:b.y - size / 2,
        w:size,
        h:size,
        vx:Math.cos(a) * speed,
        vy:Math.sin(a) * speed,
        life:opts.life || 120,
        dmg:opts.dmg || 2,
        color:opts.color || theme().bullet,
        kind:opts.kind || "orb",
        homing:opts.homing || 0
      });
    }
  }

  function addZoneAtPlayer(opts){
    const p = playerCenter();
    if(!p) return;
    opts = opts || {};

    addBossZone({
      type:opts.type || "circle",
      x:p.x - (opts.w || opts.r * 2 || 100) / 2,
      y:p.y - (opts.h || opts.r * 2 || 100) / 2,
      w:opts.w || (opts.r || 50) * 2,
      h:opts.h || (opts.r || 50) * 2,
      r:opts.r || 50,
      life:opts.life || 70,
      warn:opts.warn || 34,
      activeAfter:opts.activeAfter,
      dmg:opts.dmg || 2,
      color:opts.color || theme().warn,
      tick:opts.tick || 18,
      label:opts.label || ""
    });
  }

  function addZoneAtBoss(opts){
    const b = bossCenter();
    if(!b) return;
    opts = opts || {};

    addBossZone({
      type:opts.type || "circle",
      x:b.x - (opts.w || opts.r * 2 || 120) / 2,
      y:b.y - (opts.h || opts.r * 2 || 120) / 2,
      w:opts.w || (opts.r || 60) * 2,
      h:opts.h || (opts.r || 60) * 2,
      r:opts.r || 60,
      life:opts.life || 70,
      warn:opts.warn || 26,
      activeAfter:opts.activeAfter,
      dmg:opts.dmg || 2,
      color:opts.color || theme().warn,
      tick:opts.tick || 18,
      label:opts.label || ""
    });
  }

  function updateBossBullets(){
    ensureBossArrays();

    const pb = playerBox();

    for(let i=G.bossBullets.length-1;i>=0;i--){
      const b = G.bossBullets[i];

      if(!b){
        G.bossBullets.splice(i,1);
        continue;
      }

      b.life--;

      if(b.homing && G.player){
        const pc = playerCenter();
        const bc = centerOf(b);
        const n = norm(pc.x - bc.x, pc.y - bc.y);

        b.vx = b.vx * (1 - b.homing) + n.x * Math.hypot(b.vx,b.vy) * b.homing;
        b.vy = b.vy * (1 - b.homing) + n.y * Math.hypot(b.vx,b.vy) * b.homing;
      }

      if(b.accel){
        b.vx *= b.accel;
        b.vy *= b.accel;
      }

      if(b.grow){
        b.x -= b.grow / 2;
        b.y -= b.grow / 2;
        b.w += b.grow;
        b.h += b.grow;
      }

      b.x += b.vx;
      b.y += b.vy;

      if(pb && G.player && G.player.inv <= 0 && hitSafe(pb,b)){
        hurt(b.dmg || 2);

        if(!b.pierce){
          G.bossBullets.splice(i,1);
          continue;
        }
      }

      if(
        b.life <= 0 ||
        b.x < -120 ||
        b.y < -120 ||
        b.x > (G.map ? G.map.width : 1000) + 120 ||
        b.y > (G.map ? G.map.height : 1400) + 120
      ){
        G.bossBullets.splice(i,1);
      }
    }
  }

  function updateBossZones(){
    ensureBossArrays();

    const pb = playerBox();

    for(let i=G.bossZones.length-1;i>=0;i--){
      const z = G.bossZones[i];

      if(!z){
        G.bossZones.splice(i,1);
        continue;
      }

      z.life--;
      z.t++;

      const active = z.t >= z.activeAfter;

      if(active && pb && G.player && G.player.inv <= 0){
        let hitNow = false;

        if(z.type === "circle"){
          const pc = playerCenter();
          const cx = z.x + z.w / 2;
          const cy = z.y + z.h / 2;
          hitNow = pc && dist2(pc.x,pc.y,cx,cy) <= z.r * z.r;
        }else if(z.type === "rect"){
          hitNow = hitSafe(pb,z);
        }

        if(hitNow && z.t % z.tick === 0){
          hurt(z.dmg || 2);
        }
      }

      if(z.life <= 0){
        G.bossZones.splice(i,1);
      }
    }
  }

  function clearBossProjectiles(){
    G.bossBullets = [];
    G.bossZones = [];
  }

  function initBossAI(b){
    if(!b) return;

    if(!b.__superAI){
      b.__superAI = true;
      b.aiT = 0;
      b.patternT = 0;
      b.nextAttack = 40;
      b.moveSeed = Math.random() * TWO_PI;
      b.enraged = false;

      clearBossProjectiles();

      msg((b.name || "BOSS") + "が力を解放した！", 120);
    }
  }

  function bossMovement(b){
    const r = G.map && G.map.bossRoom
      ? G.map.bossRoom
      : {x:42,y:42,w:(G.map ? G.map.width - 84 : 700),h:520};

    b.t = (b.t || 0) + 1;
    b.aiT = (b.aiT || 0) + 1;

    const phase = bossPhase(b);
    const spd = phase === 3 ? 1.35 : phase === 2 ? 1.16 : 1;

    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;

    const ampX = G.map && G.map.__duelSpace
      ? Math.min(330, r.w * 0.38)
      : Math.min(210, r.w * 0.30);

    const ampY = G.map && G.map.__duelSpace
      ? Math.min(270, r.h * 0.32)
      : Math.min(90, r.h * 0.25);

    const nx = cx - b.w / 2 + Math.cos(b.t * 0.018 * spd + b.moveSeed) * ampX;
    const ny = cy - b.h / 2 + Math.sin(b.t * 0.025 * spd + b.moveSeed * 0.7) * ampY;

    b.x = safeCl(nx, r.x + 10, r.x + r.w - b.w - 10);
    b.y = safeCl(ny, r.y + 10, r.y + r.h - b.h - 10);
  }

  function bossAttackStage1(b, phase){
    const th = theme();

    if(b.aiT % Math.max(42, 80 - phase * 12) === 0){
      shootArc(3 + phase, 3.2 + phase * 0.35, Math.PI * 0.42, {
        size:14,
        life:130,
        dmg:2,
        color:th.bullet,
        kind:"wind"
      });
    }

    if(b.aiT % Math.max(110, 160 - phase * 20) === 32){
      addZoneAtBoss({
        r:72 + phase * 18,
        life:58,
        warn:24,
        dmg:2 + phase,
        color:th.glow,
        tick:16,
        label:"突風"
      });

      if(typeof ring === "function"){
        const c = bossCenter();
        if(c) ring(c.x,c.y,90 + phase * 22,th.glow);
      }
    }
  }

  function bossAttackStage2(b, phase){
    const th = theme();

    if(b.aiT % Math.max(70, 110 - phase * 12) === 0){
      addZoneAtPlayer({
        type:"rect",
        w:52 + phase * 12,
        h:180 + phase * 50,
        life:76,
        warn:35,
        dmg:2 + phase,
        color:th.warn,
        tick:18,
        label:"根"
      });
    }

    if(b.aiT % Math.max(50, 92 - phase * 10) === 20){
      shootRadial(6 + phase * 2, 2.3 + phase * 0.22, {
        size:12,
        life:150,
        dmg:2,
        color:th.bullet,
        kind:"leaf",
        offset:b.aiT * 0.04
      });
    }
  }

  function bossAttackStage3(b, phase){
    const th = theme();

    if(b.aiT % Math.max(78, 130 - phase * 16) === 0){
      const p = playerCenter();
      const bc = bossCenter();

      if(p && bc){
        const n = norm(p.x - bc.x, p.y - bc.y);
        const len = 620;
        const w = 34 + phase * 8;

        addBossZone({
          type:"rect",
          x:bc.x + n.x * 50 - w / 2,
          y:bc.y + n.y * 50 - len / 2,
          w:w,
          h:len,
          life:62,
          warn:34,
          dmg:3 + phase,
          color:th.warn,
          tick:10,
          label:"水晶レーザー"
        });

        /*
          rect は縦長固定なので、レーザー感を補うため追加で高速弾も撃つ。
        */
      }
    }

    if(b.aiT % Math.max(46, 82 - phase * 10) === 18){
      shootArc(2 + phase, 3.0 + phase * 0.35, Math.PI * 0.55, {
        size:16,
        life:150,
        dmg:2,
        color:th.bullet,
        kind:"crystal",
        pierce:false
      });
    }
  }

  function bossAttackStage4(b, phase){
    const th = theme();

    if(b.aiT % Math.max(44, 86 - phase * 10) === 0){
      shootArc(3 + phase, 3.0 + phase * 0.42, Math.PI * 0.50, {
        size:16,
        life:130,
        dmg:2 + phase,
        color:th.bullet,
        kind:"fire"
      });
    }

    if(b.aiT % Math.max(90, 140 - phase * 18) === 35){
      for(let i=0;i<phase+1;i++){
        addZoneAtPlayer({
          r:42 + phase * 8,
          life:96,
          warn:30,
          activeAfter:30,
          dmg:2 + phase,
          color:th.glow,
          tick:20,
          label:"溶岩"
        });
      }
    }
  }

  function bossAttackStage5(b, phase){
    const th = theme();

    if(b.aiT % Math.max(62, 108 - phase * 12) === 0){
      shootRadial(10 + phase * 4, 2.2 + phase * 0.18, {
        size:12,
        life:150,
        dmg:2,
        color:th.bullet,
        kind:"light",
        offset:b.aiT * 0.033
      });
    }

    if(b.aiT % Math.max(100, 155 - phase * 20) === 40){
      addZoneAtPlayer({
        r:50 + phase * 10,
        life:58,
        warn:34,
        dmg:3 + phase,
        color:th.warn,
        tick:8,
        label:"雷柱"
      });
    }
  }

  function bossAttackStage6(b, phase){
    const th = theme();

    if(b.aiT % Math.max(38, 72 - phase * 8) === 0){
      const count = 7 + phase * 3;
      shootRadial(count, 2.5 + phase * 0.22, {
        size:11,
        life:170,
        dmg:2,
        color:th.bullet,
        kind:"star",
        offset:b.aiT * 0.06,
        spin:0.08
      });
    }

    if(b.aiT % Math.max(115, 170 - phase * 20) === 55){
      shootArc(5 + phase, 3.5 + phase * 0.35, Math.PI * 0.82, {
        size:14,
        life:155,
        dmg:3,
        color:th.sub,
        kind:"starbeam",
        homing:0.012
      });
    }
  }

  function bossAttackStage7(b, phase){
    const th = theme();

    if(b.aiT % Math.max(34, 68 - phase * 8) === 0){
      shootRadial(12 + phase * 5, 2.1 + phase * 0.24, {
        size:12,
        life:165,
        dmg:2,
        color:th.bullet,
        kind:"void",
        offset:b.aiT * 0.045
      });
    }

    if(b.aiT % Math.max(76, 125 - phase * 15) === 22){
      shootArc(5 + phase * 2, 3.4 + phase * 0.36, Math.PI * 0.70, {
        size:15,
        life:150,
        dmg:3,
        color:th.sub,
        kind:"voidfang",
        homing:0.018
      });
    }

    if(b.aiT % Math.max(130, 190 - phase * 22) === 66){
      addZoneAtPlayer({
        r:68 + phase * 18,
        life:78,
        warn:38,
        dmg:4 + phase,
        color:th.glow,
        tick:12,
        label:"虚空爆縮"
      });
    }
  }

  function bossAttackAI(b){
    const phase = bossPhase(b);
    const idx = G.stageIndex || 0;

    if(phase >= 2 && !b.enraged){
      b.enraged = true;
      msg((b.name || "BOSS") + "が怒り状態になった！", 120);

      const c = bossCenter();
      if(c && typeof ring === "function"){
        ring(c.x,c.y,130,theme().glow);
      }
    }

    if(idx === 0) bossAttackStage1(b,phase);
    else if(idx === 1) bossAttackStage2(b,phase);
    else if(idx === 2) bossAttackStage3(b,phase);
    else if(idx === 3) bossAttackStage4(b,phase);
    else if(idx === 4) bossAttackStage5(b,phase);
    else if(idx === 5) bossAttackStage6(b,phase);
    else bossAttackStage7(b,phase);

    /*
      共通: 近距離にいるとボスの衝撃波
    */
    if(b.aiT % Math.max(95, 150 - phase * 18) === 12){
      const bc = bossCenter();
      const pc = playerCenter();

      if(bc && pc && dist2(bc.x,bc.y,pc.x,pc.y) < 150 * 150){
        addZoneAtBoss({
          r:95 + phase * 16,
          life:46,
          warn:18,
          dmg:2 + phase,
          color:theme().glow,
          tick:12,
          label:"衝撃波"
        });
      }
    }
  }

  /*
    既存 updBoss を完全上書き。
    ここで移動 + 攻撃 + 弾更新を全部やる。
  */
  updBoss = function(){
    const b = G.boss;

    ensureBossArrays();

    if(!b){
      updateBossBullets();
      updateBossZones();
      return;
    }

    initBossAI(b);
    bossMovement(b);
    bossAttackAI(b);
    updateBossBullets();
    updateBossZones();
  };

  /*
    弾とゾーンの描画
  */
  function drawBossBulletOne(o){
    const th = theme();

    const x = wx(o.x);
    const y = wy(o.y);
    const w = o.w;
    const h = o.h;
    const cx = x + w / 2;
    const cy = y + h / 2;
    const t = G.time || 0;

    ctx.save();

    ctx.globalAlpha = Math.max(0.25, Math.min(1, o.life / (o.max || o.life || 1)));

    ctx.shadowBlur = 14;
    ctx.shadowColor = o.color;

    if(o.kind === "leaf"){
      ctx.fillStyle = o.color;
      ctx.translate(cx,cy);
      ctx.rotate(t * 0.12);
      ctx.beginPath();
      ctx.ellipse(0,0,w * 0.55,h * 0.28,0,0,TWO_PI);
      ctx.fill();
      ctx.strokeStyle = "#eaffd2";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-w * 0.35,0);
      ctx.lineTo(w * 0.35,0);
      ctx.stroke();
    }else if(o.kind === "crystal"){
      ctx.translate(cx,cy);
      ctx.rotate(t * 0.05);
      ctx.fillStyle = o.color;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0,-h * 0.65);
      ctx.lineTo(w * 0.5,0);
      ctx.lineTo(0,h * 0.65);
      ctx.lineTo(-w * 0.5,0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }else if(o.kind === "fire"){
      const grad = ctx.createRadialGradient(cx-3,cy-3,1,cx,cy,w);
      grad.addColorStop(0,"#fff7a8");
      grad.addColorStop(0.45,o.color);
      grad.addColorStop(1,"#8b2d22");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx,cy,w * 0.55,0,TWO_PI);
      ctx.fill();
    }else if(o.kind === "star" || o.kind === "starbeam"){
      ctx.translate(cx,cy);
      ctx.rotate(t * 0.09);
      ctx.fillStyle = o.color;
      ctx.beginPath();
      for(let i=0;i<10;i++){
        const r = i % 2 === 0 ? w * 0.58 : w * 0.25;
        const a = -Math.PI / 2 + i / 10 * TWO_PI;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        if(i === 0) ctx.moveTo(px,py);
        else ctx.lineTo(px,py);
      }
      ctx.closePath();
      ctx.fill();
    }else if(o.kind === "void" || o.kind === "voidfang"){
      const grad = ctx.createRadialGradient(cx,cy,1,cx,cy,w);
      grad.addColorStop(0,th.sub);
      grad.addColorStop(0.55,o.color);
      grad.addColorStop(1,"rgba(10,0,20,.9)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx,cy,w * 0.58,0,TWO_PI);
      ctx.fill();

      ctx.strokeStyle = "#efe7ff";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx,cy,w * 0.75,0,TWO_PI);
      ctx.stroke();
    }else{
      const grad = ctx.createRadialGradient(cx-3,cy-3,1,cx,cy,w);
      grad.addColorStop(0,"#ffffff");
      grad.addColorStop(0.45,o.color);
      grad.addColorStop(1,th.dark);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx,cy,w * 0.55,0,TWO_PI);
      ctx.fill();
    }

    ctx.restore();
  }

  function drawBossZoneOne(z){
    const active = z.t >= z.activeAfter;
    const rate = z.life / (z.max || z.life || 1);

    const x = wx(z.x);
    const y = wy(z.y);

    ctx.save();

    ctx.globalAlpha = active
      ? 0.34 + Math.sin((G.time || 0) * 0.35) * 0.08
      : 0.18 + Math.sin((G.time || 0) * 0.28) * 0.06;

    ctx.strokeStyle = z.color;
    ctx.fillStyle = z.color;
    ctx.lineWidth = active ? 4 : 2;

    ctx.shadowBlur = active ? 18 : 8;
    ctx.shadowColor = z.color;

    if(z.type === "circle"){
      const cx = x + z.w / 2;
      const cy = y + z.h / 2;

      ctx.beginPath();
      ctx.arc(cx,cy,z.r,0,TWO_PI);
      ctx.fill();

      ctx.globalAlpha = active ? 0.88 : 0.55;
      ctx.beginPath();
      ctx.arc(cx,cy,z.r,0,TWO_PI);
      ctx.stroke();

      ctx.globalAlpha = active ? 0.72 : 0.45;
      ctx.beginPath();
      ctx.arc(cx,cy,z.r * (0.55 + 0.25 * Math.sin((G.time || 0) * 0.18)),0,TWO_PI);
      ctx.stroke();
    }else{
      RR(x,y,z.w,z.h,14);
      ctx.fill();

      ctx.globalAlpha = active ? 0.84 : 0.52;
      RR(x,y,z.w,z.h,14);
      ctx.stroke();

      ctx.globalAlpha = 0.75;
      ctx.beginPath();
      ctx.moveTo(x + z.w / 2, y + 8);
      ctx.lineTo(x + z.w / 2, y + z.h - 8);
      ctx.stroke();
    }

    if(z.label){
      ctx.globalAlpha = Math.min(1, 1 - rate + 0.3);
      ctx.fillStyle = "#fff";
      ctx.font = "900 11px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(z.label, x + z.w / 2, y - 6);
      ctx.textAlign = "left";
    }

    ctx.restore();
  }

  function drawBossProjectiles(){
    ensureBossArrays();

    for(const z of G.bossZones){
      drawBossZoneOne(z);
    }

    for(const b of G.bossBullets){
      drawBossBulletOne(b);
    }
  }

  /*
    ボス本体グラフィック
  */
  function bossEye(ctx,x,y,color){
    ctx.save();
    ctx.fillStyle = "#071018";
    ctx.beginPath();
    ctx.ellipse(x,y,6,7,0,0,TWO_PI);
    ctx.fill();

    ctx.fillStyle = color || "#fff";
    ctx.beginPath();
    ctx.ellipse(x+1,y-2,2.5,3,0,0,TWO_PI);
    ctx.fill();
    ctx.restore();
  }

  function drawWing(ctx,side,w,h,th,t,phase){
    ctx.save();
    ctx.scale(side,1);

    const flap = Math.sin(t * 0.08) * 0.18;
    ctx.fillStyle = th.main;
    ctx.globalAlpha = 0.88;
    ctx.beginPath();
    ctx.ellipse(-w * 0.33,0,w * 0.32,h * 0.22,-0.55 - flap,0,TWO_PI);
    ctx.fill();

    ctx.fillStyle = th.sub;
    ctx.globalAlpha = 0.42;
    ctx.beginPath();
    ctx.ellipse(-w * 0.45,-h * 0.05,w * 0.15,h * 0.06,-0.55 - flap,0,TWO_PI);
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,.55)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-w * 0.12,-h * 0.02);
    ctx.lineTo(-w * 0.58,-h * 0.18);
    ctx.moveTo(-w * 0.12,h * 0.05);
    ctx.lineTo(-w * 0.55,h * 0.13);
    ctx.stroke();

    ctx.restore();
  }

  function drawHorns(ctx,w,h,th,phase){
    ctx.save();
    ctx.strokeStyle = phase >= 3 ? th.sub : th.glow;
    ctx.lineWidth = phase >= 3 ? 4 : 3;
    ctx.lineCap = "round";

    ctx.beginPath();
    ctx.moveTo(-w * 0.11,-h * 0.32);
    ctx.quadraticCurveTo(-w * 0.27,-h * 0.58,-w * 0.40,-h * 0.48);
    ctx.moveTo(w * 0.11,-h * 0.32);
    ctx.quadraticCurveTo(w * 0.27,-h * 0.58,w * 0.40,-h * 0.48);
    ctx.stroke();

    ctx.restore();
  }

  function drawBossCoreShape(ctx,b,th,t,phase){
    const w = b.w || 120;
    const h = b.h || 100;
    const idx = G.stageIndex || 0;

    /*
      ステージ別シルエット
    */
    if(idx === 0){
      /*
        モスグリフォン: 翼獣
      */
      drawWing(ctx,-1,w,h,th,t,phase);
      drawWing(ctx,1,w,h,th,t,phase);

      ctx.globalAlpha = 1;
      ctx.fillStyle = th.main;
      ctx.strokeStyle = th.sub;
      ctx.lineWidth = 3;

      ctx.beginPath();
      ctx.ellipse(0,5,w * 0.27,h * 0.32,0,0,TWO_PI);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = th.sub;
      ctx.beginPath();
      ctx.ellipse(0,h * 0.10,w * 0.12,h * 0.18,0,0,TWO_PI);
      ctx.fill();

      ctx.fillStyle = th.main;
      ctx.strokeStyle = "#fff";
      ctx.beginPath();
      ctx.ellipse(0,-h * 0.25,w * 0.20,h * 0.16,0,0,TWO_PI);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#f0d46c";
      ctx.beginPath();
      ctx.moveTo(0,-h * 0.23);
      ctx.lineTo(w * 0.14,-h * 0.18);
      ctx.lineTo(0,-h * 0.12);
      ctx.closePath();
      ctx.fill();

      drawHorns(ctx,w,h,th,phase);
      bossEye(ctx,-8,-h * 0.27,th.eye);
      bossEye(ctx,8,-h * 0.27,th.eye);

    }else if(idx === 1){
      /*
        エルダートレント: 巨木
      */
      ctx.fillStyle = "#5b3922";
      ctx.strokeStyle = th.sub;
      ctx.lineWidth = 3;

      ctx.beginPath();
      ctx.moveTo(-w * 0.22,h * 0.40);
      ctx.lineTo(-w * 0.15,-h * 0.05);
      ctx.quadraticCurveTo(0,-h * 0.34,w * 0.15,-h * 0.05);
      ctx.lineTo(w * 0.22,h * 0.40);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = th.main;
      ctx.beginPath();
      ctx.ellipse(-w * 0.17,-h * 0.18,w * 0.25,h * 0.22,-0.2,0,TWO_PI);
      ctx.ellipse(w * 0.18,-h * 0.18,w * 0.26,h * 0.22,0.2,0,TWO_PI);
      ctx.ellipse(0,-h * 0.34,w * 0.30,h * 0.24,0,0,TWO_PI);
      ctx.fill();

      ctx.strokeStyle = th.dark;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-w * 0.42,-h * 0.10);
      ctx.quadraticCurveTo(-w * 0.62,-h * 0.25,-w * 0.70,-h * 0.42);
      ctx.moveTo(w * 0.42,-h * 0.10);
      ctx.quadraticCurveTo(w * 0.62,-h * 0.25,w * 0.70,-h * 0.42);
      ctx.stroke();

      bossEye(ctx,-10,-h * 0.02,th.eye);
      bossEye(ctx,10,-h * 0.02,th.eye);

      ctx.strokeStyle = "#26150d";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0,h * 0.10,16,0.1,Math.PI-0.1);
      ctx.stroke();

    }else if(idx === 2){
      /*
        クリスタル・アーク
      */
      ctx.save();
      ctx.rotate(Math.sin(t * 0.03) * 0.08);

      const grad = ctx.createLinearGradient(0,-h * 0.45,0,h * 0.45);
      grad.addColorStop(0,"#ffffff");
      grad.addColorStop(0.42,th.main);
      grad.addColorStop(1,th.dark);

      ctx.fillStyle = grad;
      ctx.strokeStyle = th.sub;
      ctx.lineWidth = 3;

      ctx.beginPath();
      ctx.moveTo(0,-h * 0.52);
      ctx.lineTo(w * 0.34,-h * 0.05);
      ctx.lineTo(w * 0.18,h * 0.45);
      ctx.lineTo(-w * 0.18,h * 0.45);
      ctx.lineTo(-w * 0.34,-h * 0.05);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "rgba(255,255,255,.38)";
      ctx.beginPath();
      ctx.moveTo(-w * 0.08,-h * 0.40);
      ctx.lineTo(w * 0.08,-h * 0.06);
      ctx.lineTo(0,h * 0.28);
      ctx.closePath();
      ctx.fill();

      ctx.restore();

      bossEye(ctx,-9,-h * 0.05,th.eye);
      bossEye(ctx,9,-h * 0.05,th.eye);

      for(let i=0;i<5;i++){
        const a = t * 0.025 + i / 5 * TWO_PI;
        ctx.fillStyle = th.sub;
        ctx.globalAlpha = 0.65;
        ctx.beginPath();
        ctx.arc(Math.cos(a)*w*0.50, Math.sin(a)*h*0.36, 5, 0, TWO_PI);
        ctx.fill();
      }

    }else if(idx === 3){
      /*
        ラヴァワイバーン
      */
      drawWing(ctx,-1,w,h,th,t,phase);
      drawWing(ctx,1,w,h,th,t,phase);

      const grad = ctx.createRadialGradient(-w*0.08,-h*0.12,5,0,0,w*0.5);
      grad.addColorStop(0,th.sub);
      grad.addColorStop(0.42,th.main);
      grad.addColorStop(1,th.dark);

      ctx.fillStyle = grad;
      ctx.strokeStyle = th.sub;
      ctx.lineWidth = 3;

      ctx.beginPath();
      ctx.ellipse(0,4,w * 0.30,h * 0.34,0,0,TWO_PI);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(0,-h * 0.26,w * 0.22,h * 0.17,0,0,TWO_PI);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = th.sub;
      for(let i=-2;i<=2;i++){
        ctx.beginPath();
        ctx.moveTo(i * w * 0.08,-h * 0.38);
        ctx.lineTo(i * w * 0.08 + 8,-h * 0.57);
        ctx.lineTo(i * w * 0.08 + 16,-h * 0.38);
        ctx.closePath();
        ctx.fill();
      }

      bossEye(ctx,-10,-h * 0.28,th.eye);
      bossEye(ctx,10,-h * 0.28,th.eye);

    }else if(idx === 4){
      /*
        スカイガーディアン: 黄金騎士
      */
      ctx.fillStyle = th.main;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;

      ctx.beginPath();
      ctx.moveTo(0,-h * 0.50);
      ctx.lineTo(w * 0.30,-h * 0.18);
      ctx.lineTo(w * 0.24,h * 0.35);
      ctx.lineTo(0,h * 0.50);
      ctx.lineTo(-w * 0.24,h * 0.35);
      ctx.lineTo(-w * 0.30,-h * 0.18);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "rgba(255,255,255,.35)";
      ctx.beginPath();
      ctx.moveTo(0,-h * 0.40);
      ctx.lineTo(w * 0.12,h * 0.25);
      ctx.lineTo(0,h * 0.38);
      ctx.lineTo(-w * 0.12,h * 0.25);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = th.sub;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0,-h * 0.02,w * 0.48,0,TWO_PI);
      ctx.stroke();

      bossEye(ctx,-10,-h * 0.16,th.eye);
      bossEye(ctx,10,-h * 0.16,th.eye);

    }else if(idx === 5){
      /*
        アストラルリヴァイアサン: 星龍
      */
      ctx.strokeStyle = th.sub;
      ctx.lineWidth = 12;
      ctx.lineCap = "round";

      ctx.beginPath();
      for(let i=0;i<7;i++){
        const px = -w * 0.36 + i * w * 0.12;
        const py = Math.sin(t * 0.05 + i * 0.8) * 18 + i * 5;
        if(i===0) ctx.moveTo(px,py);
        else ctx.lineTo(px,py);
      }
      ctx.stroke();

      ctx.fillStyle = th.main;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;

      ctx.beginPath();
      ctx.ellipse(w * 0.18,-h * 0.18,w * 0.26,h * 0.18,0.1,0,TWO_PI);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = th.sub;
      for(let i=0;i<6;i++){
        const px = -w * 0.30 + i * w * 0.13;
        const py = Math.sin(t * 0.05 + i) * 16 + i * 4;
        ctx.beginPath();
        ctx.arc(px,py,5 + i % 2,0,TWO_PI);
        ctx.fill();
      }

      bossEye(ctx,w * 0.10,-h * 0.20,th.eye);
      bossEye(ctx,w * 0.26,-h * 0.20,th.eye);

    }else{
      /*
        アビス・オーバーロード: 虚空王
      */
      const grad = ctx.createRadialGradient(0,-h*0.1,8,0,0,w*0.55);
      grad.addColorStop(0,th.sub);
      grad.addColorStop(0.45,th.main);
      grad.addColorStop(1,"#05020a");

      ctx.fillStyle = grad;
      ctx.strokeStyle = th.sub;
      ctx.lineWidth = 3;

      ctx.beginPath();
      ctx.ellipse(0,0,w * 0.34,h * 0.40,0,0,TWO_PI);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "rgba(0,0,0,.35)";
      ctx.beginPath();
      ctx.ellipse(0,h * 0.08,w * 0.20,h * 0.22,0,0,TWO_PI);
      ctx.fill();

      drawHorns(ctx,w,h,th,phase);

      ctx.strokeStyle = th.glow;
      ctx.lineWidth = 3;
      for(let i=0;i<4;i++){
        const a = t * 0.025 + i / 4 * TWO_PI;
        ctx.beginPath();
        ctx.arc(Math.cos(a)*w*0.40, Math.sin(a)*h*0.32, 12,0,TWO_PI);
        ctx.stroke();
      }

      bossEye(ctx,-12,-h * 0.14,th.eye);
      bossEye(ctx,12,-h * 0.14,th.eye);
    }
  }

  drawBoss3D = function(ctxArg,b,wxArg,wyArg,t){
    if(!b) return;

    const th = theme();
    const phase = bossPhase(b);
    const hpRate = bossHpRate(b);

    const x = wxArg(b.x);
    const y = wyArg(b.y);
    const w = b.w || 120;
    const h = b.h || 100;

    const cx = x + w / 2;
    const cy = y + h / 2 + Math.sin((t || 0) * 0.05) * 3;

    ctx.save();

    /*
      影
    */
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = "rgba(0,20,30,.45)";
    ctx.beginPath();
    ctx.ellipse(cx, y + h * 0.86, w * 0.48, h * 0.16, 0, 0, TWO_PI);
    ctx.fill();

    /*
      怒りオーラ / ボスオーラ
    */
    ctx.globalAlpha = phase === 3 ? 0.38 : phase === 2 ? 0.26 : 0.18;
    ctx.fillStyle = th.glow;
    ctx.beginPath();
    ctx.ellipse(cx, cy, w * (0.76 + phase * 0.05), h * (0.60 + phase * 0.04), 0, 0, TWO_PI);
    ctx.fill();

    ctx.restore();

    /*
      本体
    */
    ctx.save();
    ctx.translate(cx,cy);

    ctx.shadowBlur = phase === 3 ? 28 : 18;
    ctx.shadowColor = th.glow;

    drawBossCoreShape(ctx,b,th,t || 0,phase);

    /*
      フェーズ3の追加輪郭
    */
    if(phase === 3){
      ctx.globalAlpha = 0.48 + Math.sin((t || 0) * 0.18) * 0.12;
      ctx.strokeStyle = th.sub;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(0,0,w * 0.48,h * 0.50,0,0,TWO_PI);
      ctx.stroke();
    }

    ctx.restore();

    /*
      名前
    */
    ctx.save();
    ctx.fillStyle = "#fff";
    ctx.font = "900 12px system-ui";
    ctx.textAlign = "center";
    ctx.shadowBlur = 8;
    ctx.shadowColor = th.dark;
    ctx.fillText(b.name || "BOSS", cx, y - 10);
    ctx.restore();

    /*
      小さいHPオーラバー
    */
    ctx.save();
    ctx.fillStyle = "rgba(8,25,45,.55)";
    RR(cx - 48, y - 5, 96, 6, 999);
    ctx.fill();

    ctx.fillStyle = hpRate <= 0.33 ? "#ff6262" : hpRate <= 0.66 ? "#ffd84d" : th.glow;
    RR(cx - 48, y - 5, Math.max(2,96 * hpRate), 6, 999);
    ctx.fill();
    ctx.restore();
  };

  /*
    draw を包んで、ボスの攻撃エフェクトを描画。
    既存 draw は中で drawBoss3D を呼ぶため、本体は自動で強化される。
    ここでは弾とゾーンを上乗せする。
  */
  if(typeof draw === "function"){
    const __oldDrawSuperBoss = draw;

    draw = function(){
      __oldDrawSuperBoss();

      /*
        UIより後ろに出ると少し見づらいが、
        既存 draw の内部構造を大きく壊さないため後乗せ。
        ゾーン/弾は画面座標変換を使うので問題なく表示される。
      */
      if(G && G.state !== "title"){
        drawBossProjectiles();
      }
    };
  }
})();
/* =========================================================
   盾反射 + 魔法ボス命中 強化パッチ 完全版
   貼る場所:
   - game.js の一番下
   - 魔法陣ワープ式パッチより後ろ
   - ボス超強化グラフィック + ステージ別攻撃AI パッチより後ろ

   効果:
   - 魔法弾がボスに当たる
   - 魔法Lv / bookLv に応じてボスへの魔法爆風が強くなる
   - 盾Lv1以上で、正面から来たボス弾を自動で弾く
   - 盾Lvが高いほど弾ける角度・距離・反射威力が上がる
   - 弾いたボス弾は反射弾になり、ボスに当たる
   - 盾Lv3以上で、弾いた瞬間に小さいガード波を出す
   ========================================================= */
(function(){
  if(window.__shieldReflectAndMagicBossHitPatchApplied) return;
  window.__shieldReflectAndMagicBossHitPatchApplied = true;

  const TWO_PI = Math.PI * 2;

  function safeCl(v,a,b){
    if(typeof cl === "function") return cl(v,a,b);
    return Math.max(a, Math.min(b, v));
  }

  function hitSafe(a,b){
    return a && b &&
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y;
  }

  function centerOf(o){
    return {
      x:o.x + o.w / 2,
      y:o.y + o.h / 2
    };
  }

  function norm(x,y){
    const l = Math.hypot(x,y) || 1;
    return {x:x/l,y:y/l,l};
  }

  function playerCenter(){
    if(!G || !G.player) return null;
    return centerOf(G.player);
  }

  function bossCenter(){
    if(!G || !G.boss) return null;
    return centerOf(G.boss);
  }

  function playerHitBox(){
    const p = G.player;
    if(!p) return null;

    return {
      x:p.x + 4,
      y:p.y + 8,
      w:p.w - 8,
      h:p.h - 10
    };
  }

  function dist2(ax,ay,bx,by){
    const dx = ax - bx;
    const dy = ay - by;
    return dx * dx + dy * dy;
  }

  function ensureArrays(){
    if(!Array.isArray(G.bullets)) G.bullets = [];
    if(!Array.isArray(G.bossBullets)) G.bossBullets = [];
    if(!Array.isArray(G.effects)) G.effects = [];
  }

  function stageShieldColor(){
    const i = G.stageIndex || 0;

    return [
      "#9effa1",
      "#b9ff9a",
      "#d8ffff",
      "#ffd84d",
      "#fff7a8",
      "#cfd8ff",
      "#efe7ff"
    ][i] || "#9effa1";
  }

  function magicColor(){
    const p = G.player || {};
    if(p.trueGold) return "#ffd84d";
    if((p.magicLv || 1) >= 3) return "#b56bff";
    if((p.magicLv || 1) >= 2) return "#89ff9b";
    return "#63d8ff";
  }

  function shieldLevel(){
    const p = G.player || {};
    return Math.max(0, p.shieldLv || p.armorLv || 0);
  }

  function magicLevel(){
    const p = G.player || {};
    return Math.max(1, p.magicLv || p.bookLv || 1);
  }

  function playerDirVector(){
    const p = G.player;
    if(!p) return {x:0,y:1};

    if(p.dir === "up") return {x:0,y:-1};
    if(p.dir === "down") return {x:0,y:1};
    if(p.dir === "left") return {x:-1,y:0};
    return {x:1,y:0};
  }

  function dot(a,b){
    return a.x * b.x + a.y * b.y;
  }

  /*
    盾で弾けるか判定。
    条件:
    - 盾Lv1以上
    - プレイヤーが無敵中でも弾ける
    - プレイヤーの正面側から来たボス弾だけ弾く
    - 盾Lvが高いほど判定角度が広い
  */
  function canShieldReflectBullet(b){
    const p = G.player;
    if(!p || !b) return false;

    const lv = shieldLevel();
    if(lv <= 0) return false;

    if(b.reflectedByPlayer) return false;
    if(b.owner === "player") return false;

    const pc = playerCenter();
    const bc = centerOf(b);
    if(!pc || !bc) return false;

    const dx = bc.x - pc.x;
    const dy = bc.y - pc.y;
    const distance = Math.hypot(dx,dy);

    /*
      盾判定距離。
      盾Lvが上がるほど少し広くする。
    */
    const guardRange = 30 + lv * 12;
    if(distance > guardRange) return false;

    /*
      プレイヤー正面ベクトルと、プレイヤーから弾への方向が近ければガード成功。
      lv1: だいたい正面
      lv2: 斜めも少し拾う
      lv3+: かなり広く拾う
    */
    const dir = playerDirVector();
    const toBullet = norm(dx,dy);

    const angleLimitDot = lv >= 3 ? 0.18 : lv >= 2 ? 0.34 : 0.52;

    return dot(dir,toBullet) >= angleLimitDot;
  }

  function addGuardSpark(x,y,color){
    ensureArrays();

    if(typeof fx === "function"){
      fx(x,y,color || stageShieldColor(),18,3.4);
    }

    G.effects.push({
      type:"shield_flash",
      x,
      y,
      r:22 + shieldLevel() * 7,
      life:18,
      max:18,
      color:color || stageShieldColor()
    });
  }

  function addGuardWave(){
    const p = G.player;
    if(!p) return;

    const lv = shieldLevel();
    if(lv < 3) return;

    const pc = playerCenter();
    if(!pc) return;

    const color = stageShieldColor();

    G.effects.push({
      type:"shield_wave",
      x:pc.x,
      y:pc.y,
      r:34,
      life:22,
      max:22,
      color
    });

    /*
      盾Lv3以上は近くのボス弾も少し押し返す。
      強すぎないよう、ダメージは与えず方向だけ変える。
    */
    for(const b of G.bossBullets || []){
      if(!b || b.reflectedByPlayer) continue;

      const bc = centerOf(b);
      const d2 = dist2(pc.x,pc.y,bc.x,bc.y);
      const range = 72 + lv * 10;

      if(d2 <= range * range){
        const n = norm(bc.x - pc.x, bc.y - pc.y);
        const sp = Math.max(2.8, Math.hypot(b.vx || 0,b.vy || 0));

        b.vx = n.x * sp;
        b.vy = n.y * sp;
      }
    }
  }

  function reflectBossBullet(b){
    const p = G.player;
    const boss = G.boss;
    if(!p || !boss || !b) return false;

    const lv = shieldLevel();
    if(lv <= 0) return false;

    const pc = playerCenter();
    const bc = bossCenter();
    const bulletC = centerOf(b);

    if(!pc || !bc || !bulletC) return false;

    /*
      基本はボス方向へ反射。
      ボスがいない場合の保険として、プレイヤーの向きへ飛ばす。
    */
    let n;

    if(boss){
      n = norm(bc.x - bulletC.x, bc.y - bulletC.y);
    }else{
      const d = playerDirVector();
      n = {x:d.x,y:d.y,l:1};
    }

    const oldSpeed = Math.hypot(b.vx || 0, b.vy || 0);
    const reflectSpeed = Math.max(4.2 + lv * 0.55, oldSpeed * (1.05 + lv * 0.08));

    b.vx = n.x * reflectSpeed;
    b.vy = n.y * reflectSpeed;

    b.owner = "player";
    b.reflectedByPlayer = true;
    b.reflected = true;
    b.pierce = false;

    b.dmg = Math.max(2 + lv, Math.round((b.dmg || 2) * (1.0 + lv * 0.35)));
    b.life = Math.max(b.life || 0, 90);
    b.max = Math.max(b.max || 0, b.life || 90);

    b.color = p.trueGold ? "#ffd84d" : stageShieldColor();
    b.kind = "reflected_shield";

    addGuardSpark(bulletC.x,bulletC.y,b.color);
    addGuardWave();

    G.player.inv = Math.max(G.player.inv || 0, 8);

    if(!G.__lastShieldReflectMsg || G.time - G.__lastShieldReflectMsg > 34){
      G.__lastShieldReflectMsg = G.time || 0;
      msg("盾ではじいた！", 34);
    }

    return true;
  }

  /*
    反射弾がボスに当たる処理。
  */
  function reflectedBulletHitsBoss(b,index){
    if(!G.boss || !b || !b.reflectedByPlayer) return false;

    if(hitSafe(b,G.boss)){
      if(typeof dmgB === "function"){
        dmgB(b.dmg || 3);
      }else{
        G.boss.hp -= b.dmg || 3;
      }

      const c = centerOf(b);

      if(typeof fx === "function"){
        fx(c.x,c.y,b.color || stageShieldColor(),16,3);
      }

      if(typeof ring === "function"){
        ring(c.x,c.y,34 + shieldLevel() * 6,b.color || stageShieldColor());
      }

      G.bossBullets.splice(index,1);
      return true;
    }

    return false;
  }

  /*
    魔法弾のボス命中処理。
    既存の G.bullets を見る。
  */
  function playerMagicBulletHitsBoss(b,index){
    if(!G.boss || !b) return false;

    /*
      magic() で作られた弾には magic:true が付く。
      ただし将来の保険として、color や radius がある弾も拾う。
    */
    const isMagic = !!b.magic || !!b.radius;
    if(!isMagic) return false;

    if(!hitSafe(b,G.boss)) return false;

    const mlv = magicLevel();
    const p = G.player || {};

    const baseDmg = b.dmg || (p.magic || 3);
    const bossDmg = Math.round(baseDmg * (1.25 + mlv * 0.18));

    if(typeof dmgB === "function"){
      dmgB(bossDmg);
    }else{
      G.boss.hp -= bossDmg;
    }

    const c = centerOf(b);
    const color = b.color || magicColor();

    /*
      魔法爆風。
      雑魚とボス両方に意味が出るようにする。
    */
    const radius = Math.max(30, (b.radius || p.magicRadius || 22) + mlv * 6);

    if(typeof fx === "function"){
      fx(c.x,c.y,color,22,4);
    }

    if(typeof ring === "function"){
      ring(c.x,c.y,radius,color);
    }

    /*
      爆風がボス中心に届いていれば追加ダメージ。
      これにより魔法強化がボス戦で明確に効く。
    */
    const bc = bossCenter();
    if(bc && dist2(c.x,c.y,bc.x,bc.y) <= radius * radius){
      const splash = Math.max(1, Math.round((p.magic || 3) * 0.45 + mlv));

      if(typeof dmgB === "function"){
        dmgB(splash);
      }else if(G.boss){
        G.boss.hp -= splash;
      }
    }

    G.bullets.splice(index,1);

    if(!G.__lastMagicBossHitMsg || G.time - G.__lastMagicBossHitMsg > 42){
      G.__lastMagicBossHitMsg = G.time || 0;
      msg("魔法がボスに効いた！", 42);
    }

    return true;
  }

  /*
    通常弾も、必要ならボスに当てられるようにする。
    今は主に魔法用。
  */
  function updatePlayerBulletsAgainstBoss(){
    ensureArrays();

    if(!G.boss) return;

    for(let i=G.bullets.length-1;i>=0;i--){
      const b = G.bullets[i];
      if(!b) continue;

      if(playerMagicBulletHitsBoss(b,i)){
        continue;
      }
    }
  }

  /*
    既存 updBullets を包む。
    既存処理:
    - プレイヤー魔法が雑魚に当たる
    追加処理:
    - プレイヤー魔法がボスにも当たる
  */
  if(typeof updBullets === "function"){
    const __oldUpdBulletsShieldMagic = updBullets;

    updBullets = function(){
      __oldUpdBulletsShieldMagic();
      updatePlayerBulletsAgainstBoss();
    };
  }else{
    updBullets = function(){
      updatePlayerBulletsAgainstBoss();
    };
  }

  /*
    ボス弾処理を強化。
    既存ボスAIパッチの updateBossBullets は内部関数なので直接触れない。
    そこで updBoss の後に、G.bossBullets をもう一度チェックして、
    盾反射と反射弾のボス命中を追加する。
  */
  function processShieldReflectionAndReflectedHits(){
    ensureArrays();

    if(!G.player) return;

    for(let i=G.bossBullets.length-1;i>=0;i--){
      const b = G.bossBullets[i];
      if(!b) continue;

      /*
        反射済み弾はボスに当たる。
      */
      if(b.reflectedByPlayer){
        if(reflectedBulletHitsBoss(b,i)){
          continue;
        }

        /*
          反射弾はプレイヤーに当たらないようにする。
          既存ボス弾処理が先にプレイヤーへ当ててしまう可能性を減らすため、
          ownerをplayerにしているが、念のためプレイヤー付近では少し寿命を保つ。
        */
        continue;
      }

      /*
        盾でボス弾を弾く。
      */
      if(canShieldReflectBullet(b)){
        reflectBossBullet(b);
      }
    }
  }

  /*
    updBoss を包む。
    既存ボスAIがボス弾を動かした後に盾反射を処理する。
  */
  if(typeof updBoss === "function"){
    const __oldUpdBossShieldMagic = updBoss;

    updBoss = function(){
      const hpScale = (typeof window !== "undefined") ? window.__applyStageBossHpScale : null;
      if(typeof hpScale === "function") hpScale();
      __oldUpdBossShieldMagic();
      processShieldReflectionAndReflectedHits();
    };
  }else{
    updBoss = function(){
      const hpScale = (typeof window !== "undefined") ? window.__applyStageBossHpScale : null;
      if(typeof hpScale === "function") hpScale();
      processShieldReflectionAndReflectedHits();
    };
  }

  /*
    ただし、既存 update の順序によっては G.boss がいない時に updBoss が呼ばれない場合がある。
    念のため update も包み、毎フレーム反射弾の命中だけ見る。
  */
  if(typeof update === "function"){
    const __oldUpdateShieldMagic = update;

    update = function(){
      __oldUpdateShieldMagic();
      processShieldReflectionAndReflectedHits();
      updatePlayerBulletsAgainstBoss();
      const hpScale = (typeof window !== "undefined") ? window.__applyStageBossHpScale : null;
      if(typeof hpScale === "function") hpScale();
    };
  }

  /*
    盾エフェクト描画。
  */
  function drawShieldPatchEffects(){
    if(!G || !Array.isArray(G.effects)) return;

    for(const e of G.effects){
      if(!e) continue;

      if(e.type !== "shield_flash" && e.type !== "shield_wave") continue;

      const rate = e.life / (e.max || e.life || 1);
      const x = wx(e.x);
      const y = wy(e.y);

      ctx.save();

      ctx.globalAlpha = Math.max(0, Math.min(1, rate));
      ctx.strokeStyle = e.color || stageShieldColor();
      ctx.fillStyle = e.color || stageShieldColor();
      ctx.shadowBlur = e.type === "shield_wave" ? 22 : 16;
      ctx.shadowColor = e.color || stageShieldColor();

      if(e.type === "shield_flash"){
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(x,y,e.r * (1.15 - rate * 0.15),0,TWO_PI);
        ctx.stroke();

        ctx.globalAlpha *= 0.26;
        ctx.beginPath();
        ctx.arc(x,y,e.r,0,TWO_PI);
        ctx.fill();
      }

      if(e.type === "shield_wave"){
        ctx.lineWidth = 3;
        const rr = e.r + (1 - rate) * 48;

        ctx.globalAlpha *= 0.75;
        ctx.beginPath();
        ctx.arc(x,y,rr,0,TWO_PI);
        ctx.stroke();

        ctx.globalAlpha *= 0.28;
        ctx.beginPath();
        ctx.arc(x,y,rr * 0.72,0,TWO_PI);
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  /*
    反射弾の見た目を少し強化。
    既存のボス弾描画の上から光を足す。
  */
  function drawReflectedBulletGlow(){
    if(!G || !Array.isArray(G.bossBullets)) return;

    for(const b of G.bossBullets){
      if(!b || !b.reflectedByPlayer) continue;

      const x = wx(b.x + b.w / 2);
      const y = wy(b.y + b.h / 2);
      const r = Math.max(b.w,b.h) * 0.75;

      ctx.save();

      ctx.globalAlpha = 0.78;
      ctx.strokeStyle = b.color || stageShieldColor();
      ctx.fillStyle = b.color || stageShieldColor();
      ctx.shadowBlur = 18;
      ctx.shadowColor = b.color || stageShieldColor();

      ctx.beginPath();
      ctx.arc(x,y,r,0,TWO_PI);
      ctx.stroke();

      ctx.globalAlpha = 0.18;
      ctx.beginPath();
      ctx.arc(x,y,r * 1.5,0,TWO_PI);
      ctx.fill();

      ctx.restore();
    }
  }

  /*
    プレイヤーの前に小さい盾判定の光を出す。
    盾Lv1以上の時だけ、今どちら向きにガードできるか分かるようにする。
  */
  function drawShieldFacingHint(){
    const p = G.player;
    if(!p) return;

    const lv = shieldLevel();
    if(lv <= 0) return;

    const pc = playerCenter();
    const d = playerDirVector();
    const color = p.trueGold ? "#ffd84d" : stageShieldColor();

    const gx = wx(pc.x + d.x * (22 + lv * 3));
    const gy = wy(pc.y + d.y * (22 + lv * 3));

    ctx.save();

    ctx.globalAlpha = 0.16 + Math.sin((G.time || 0) * 0.15) * 0.04;
    ctx.fillStyle = color;
    ctx.shadowBlur = 14;
    ctx.shadowColor = color;

    ctx.beginPath();

    if(p.dir === "left" || p.dir === "right"){
      ctx.ellipse(gx,gy,8 + lv * 3,22 + lv * 4,0,0,TWO_PI);
    }else{
      ctx.ellipse(gx,gy,22 + lv * 4,8 + lv * 3,0,0,TWO_PI);
    }

    ctx.fill();

    ctx.restore();
  }

  /*
    draw を包んでエフェクトを重ねる。
  */
  if(typeof draw === "function"){
    const __oldDrawShieldMagic = draw;

    draw = function(){
      __oldDrawShieldMagic();

      if(!G || G.state === "title") return;

      drawShieldFacingHint();
      drawReflectedBulletGlow();
      drawShieldPatchEffects();
    };
  }

  /*
    エフェクト寿命処理。
    既存 updFx は unknown type でも life を減らしてくれるが、
    パッチ単体でも動くように保険を入れる。
  */
  if(typeof updFx === "function"){
    const __oldUpdFxShieldMagic = updFx;

    updFx = function(){
      __oldUpdFxShieldMagic();

      if(!G || !Array.isArray(G.effects)) return;

      for(let i=G.effects.length-1;i>=0;i--){
        const e = G.effects[i];

        if(!e) continue;

        if(e.type === "shield_flash" || e.type === "shield_wave"){
          if(typeof e.life === "number"){
            e.life--;
            if(e.life <= 0){
              G.effects.splice(i,1);
            }
          }
        }
      }
    };
  }

})();
/* =========================================================
   ステージ進行型 ボスHP大幅強化パッチ 完全版
   貼る場所:
   - game.js の一番下
   - 魔法陣ワープ式パッチより後ろ
   - ボス超強化グラフィック + 攻撃AI パッチより後ろ
   - 盾反射 + 魔法ボス命中パッチより後ろ

   効果:
   - ステージが進むほどボスHPを倍率で増やす
   - 反射弾の気持ちよさは残す
   - 決闘空間で生成されたボスにも適用
   - 既存 stage1.js ～ stage7.js は書き換え不要
   - 途中で同じボスに何度も倍率が乗らないよう安全処理つき

   調整したい場合:
   - BOSS_HP_SCALE の mult / flat を変更する

   2024-06 追記:
   - 以前ファイル先頭の BALANCE.bossHpMul と二重に効いているように
     見えていたが、調査の結果 bossHpMul 側は既にデッドコードだった
     ため実際には二重スケーリングは発生していなかった。
   - bossHpMul 関連のコードは削除済み。ボスHPはこのパッチの
     BOSS_HP_SCALE が唯一の計算元。数値はそのまま変更なし。
   ========================================================= */
(function(){
  if(window.__stageProgressBossHpScalePatchApplied) return;
  window.__stageProgressBossHpScalePatchApplied = true;

  /*
    ステージごとのHP倍率。
    反射弾が強い前提で、後半ほどかなり硬くする。

    stageIndex:
    0 = Stage1
    1 = Stage2
    2 = Stage3
    3 = Stage4
    4 = Stage5
    5 = Stage6
    6 = Stage7
  */
  const BOSS_HP_SCALE = [
    {
      stage:1,
      label:"はじまりの草原島",
      mult:1.00,
      flat:0,
      min:52
    },
    {
      stage:2,
      label:"風車の森島",
      mult:1.35,
      flat:10,
      min:110
    },
    {
      stage:3,
      label:"水晶洞窟島",
      mult:1.75,
      flat:24,
      min:190
    },
    {
      stage:4,
      label:"炎の鍛冶島",
      mult:2.25,
      flat:45,
      min:335
    },
    {
      stage:5,
      label:"雲上遺跡島",
      mult:3.00,
      flat:80,
      min:590
    },
    {
      stage:6,
      label:"星霜の神殿島",
      mult:4.10,
      flat:140,
      min:1080
    },
    {
      stage:7,
      label:"虚空王城・最終決戦",
      mult:5.80,
      flat:260,
      min:2200
    }
  ];

  function getStageIndex(){
    if(typeof G === "undefined") return 0;
    return Math.max(0, Math.min(6, G.stageIndex || 0));
  }

  function getHpScaleConfig(){
    return BOSS_HP_SCALE[getStageIndex()] || BOSS_HP_SCALE[0];
  }

  function bossNameOf(b){
    return String((b && b.name) || "BOSS");
  }

  function getNumber(v, fallback){
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  /*
    元のHPを保存する。
    これをしないと、load / spawn / update のたびに
    HP倍率が重複して乗ってしまう。
  */
  function getBaseBossMaxHp(b){
    if(!b) return 1;

    if(!b.__baseBossMaxHp){
      const base = Math.max(
        1,
        getNumber(b.maxHp, 0) ||
        getNumber(b.hp, 0) ||
        1
      );

      b.__baseBossMaxHp = base;
    }

    return b.__baseBossMaxHp;
  }

  function calcScaledMaxHp(b){
    const cfg = getHpScaleConfig();
    const base = getBaseBossMaxHp(b);

    return Math.max(
      cfg.min || 1,
      Math.round(base * cfg.mult + (cfg.flat || 0))
    );
  }

  /*
    ボスHPをステージ倍率に合わせて変更。
    preserveRatio:
    - true なら現在HP割合を維持
    - false なら最大HPまで回復
  */
  function applyHpScaleToBossObject(b, options){
    if(!b) return false;

    options = options || {};

    const stageIndex = getStageIndex();
    const cfg = getHpScaleConfig();
    const scaledMax = calcScaledMaxHp(b);

    /*
      すでにこのステージ用に適用済みなら何もしない。
    */
    if(
      b.__bossHpScaleApplied &&
      b.__bossHpScaleStageIndex === stageIndex &&
      b.maxHp === scaledMax
    ){
      return false;
    }

    const oldMax = Math.max(1, getNumber(b.maxHp, getBaseBossMaxHp(b)));
    const oldHp = Math.max(0, getNumber(b.hp, oldMax));

    let newHp;

    /*
      生成直後やマップ定義側のボスは全回復扱い。
      戦闘中に貼った場合はHP割合をなるべく維持。
    */
    if(options.fullHeal){
      newHp = scaledMax;
    }else{
      const ratio = oldHp >= oldMax - 0.001
        ? 1
        : Math.max(0.01, Math.min(1, oldHp / oldMax));

      newHp = Math.max(1, Math.round(scaledMax * ratio));
    }

    b.maxHp = scaledMax;
    b.hp = Math.min(scaledMax, newHp);

    b.__bossHpScaleApplied = true;
    b.__bossHpScaleStageIndex = stageIndex;
    b.__bossHpScaleMultiplier = cfg.mult;
    b.__bossHpScaleFlat = cfg.flat || 0;
    b.__bossHpScaleLabel = cfg.label;

    return true;
  }

  /*
    G.map.boss 側を先に強化しておく。
    魔法陣ワープ式の決闘空間では G.map.boss から G.boss が作られるため、
    ここを強化しておくと生成時点で硬くなる。
  */
  function applyHpScaleToMapBoss(){
    if(typeof G === "undefined") return false;
    if(!G.map || !G.map.boss) return false;

    return applyHpScaleToBossObject(G.map.boss, {
      fullHeal:true
    });
  }

  /*
    実際に出現中の G.boss 側も強化。
    すでに出現しているボスにも対応する。
  */
  function applyHpScaleToActiveBoss(){
    if(typeof G === "undefined") return false;
    if(!G.boss) return false;

    const beforeMax = G.boss.maxHp;
    const changed = applyHpScaleToBossObject(G.boss, {
      fullHeal:false
    });

    /*
      出現直後にHPが強化されたことが分かるように一度だけ表示。
      連発しないよう stage + boss名 で記録する。
    */
    if(changed && beforeMax !== G.boss.maxHp){
      const key = getStageIndex() + ":" + bossNameOf(G.boss);

      if(G.__lastBossHpScaleMsgKey !== key){
        G.__lastBossHpScaleMsgKey = key;

        if(typeof msg === "function"){
          msg(
            bossNameOf(G.boss) + "の生命力が増大した！ HP " + G.boss.maxHp,
            110
          );
        }
      }
    }

    return changed;
  }

  /*
    現在ステージのボスHP設定をまとめて適用。
  */
  function applyStageBossHpScale(){
    applyHpScaleToMapBoss();
    applyHpScaleToActiveBoss();
  }


  // spawnBoss/dmgB/update/updBossからHP補正を直接呼べるように公開する。
  if(typeof window !== "undefined"){
    window.__applyStageBossHpScale = applyStageBossHpScale;
  }

  /*
    load を包む:
    ステージ読み込み直後に map.boss のHPを強化。
  */
  if(typeof load === "function"){
    const __oldLoadStageBossHpScale = load;

    load = function(s, keep){
      __oldLoadStageBossHpScale(s, keep);
      applyStageBossHpScale();
    };
  }
/*
    UIにボス強化倍率を少し表示する。
    既存UIを壊さず、画面下寄りに小さく出す。
  */
  function drawBossHpScaleBadge(){
    if(typeof G === "undefined") return;
    if(!G.boss) return;
    if(G.state === "title") return;

    const cfg = getHpScaleConfig();

    ctx.save();
    ctx.setTransform(1,0,0,1,0,0);

    ctx.globalAlpha = 0.86;
    ctx.fillStyle = "rgba(8,25,45,.58)";

    if(typeof RR === "function"){
      RR(10,154,160,28,12);
      ctx.fill();
    }else{
      ctx.fillRect(10,154,160,28);
    }

    ctx.globalAlpha = 1;
    ctx.fillStyle = "#fff";
    ctx.font = "800 11px system-ui";
    ctx.fillText(
      "BOSS HP x" + cfg.mult.toFixed(2) + " +" + (cfg.flat || 0),
      22,
      172
    );

    ctx.restore();
  }

  if(typeof draw === "function"){
    const __oldDrawStageBossHpScale = draw;

    draw = function(){
      __oldDrawStageBossHpScale();
      drawBossHpScaleBadge();
    };
  }

  /*
    すでにゲーム開始中に貼った場合にも即反映。
  */
  applyStageBossHpScale();

})();
/* =========================================================
   NPC会話 一瞬で終わる問題 最終修正版
   貼る場所:
   - game.js の一番下
   - これまで貼った全パッチよりさらに後ろ

   修正内容:
   - 右のNPCに話しかけても一瞬で会話が終わらない
   - 会話開始直後の Z / ACT / Enter 入力暴発を防ぐ
   - 連打で会話が一気に閉じる問題を防ぐ
   - 既存のNPC2人化パッチ、魔法陣パッチ、ボスパッチより後ろで有効
   ========================================================= */
(function(){
  if(window.__finalStableNpcTalkPatchApplied) return;
  window.__finalStableNpcTalkPatchApplied = true;

  const TALK_START_BLOCK = 14;
  const TALK_NEXT_BLOCK = 9;

  function hitSafe(a,b){
    return a && b &&
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y;
  }

  function cleanLines(lines){
    if(!Array.isArray(lines)) return ["……"];

    const arr = lines
      .map(v => String(v || "").trim())
      .filter(Boolean);

    return arr.length ? arr : ["……"];
  }

  function cleanNpc(npc){
    if(!npc) return null;

    npc.lines = cleanLines(npc.lines);

    if(!npc.name){
      npc.name = "案内人";
    }

    return npc;
  }

  /*
    グローバルに安定版 beginTalk を出す。
    これにより、後から追加した別パッチが beginTalk(n) を呼んでも安定する。
  */
  window.beginTalk = function(npc){
    if(typeof G === "undefined") return;
    if(!npc) return;

    cleanNpc(npc);

    G.talk = {
      npc,
      index:0,
      startedAt:G.time || 0,
      lastAdvanceAt:G.time || 0,
      blockUntil:(G.time || 0) + TALK_START_BLOCK,
      stableTalk:true
    };

    G.state = "talk";

    /*
      会話開始に使った入力が次フレームで talkNext に入らないように消す。
    */
    if(typeof flush === "function"){
      flush();
    }else if(typeof input !== "undefined"){
      input.attack = 0;
      input.action = 0;
      input.start = 0;
    }
  };

  function finishTalk(t){
    if(!t || !t.npc){
      G.talk = null;
      G.state = "field";
      return;
    }

    const npc = t.npc;
    const fn = npc.onTalk;

    G.talk = null;
    G.state = "field";

    /*
      onTalk は会話終了時に1回だけ。
      NPC2人化パッチ側で一度だけ実行する関数になっている場合もそのまま尊重。
    */
    if(typeof fn === "function"){
      fn(G);
    }

    if(typeof flush === "function"){
      flush();
    }else if(typeof input !== "undefined"){
      input.attack = 0;
      input.action = 0;
      input.start = 0;
    }
  }

  /*
    talkNext を最終上書き。
    右NPCでも左NPCでも、開始直後・連打を必ずブロックする。
  */
  talkNext = function(){
    if(typeof G === "undefined") return;

    const t = G.talk;

    if(!t || !t.npc){
      G.talk = null;
      if(G.state === "talk") G.state = "field";
      return;
    }

    const now = G.time || 0;

    cleanNpc(t.npc);

    if(typeof t.index !== "number"){
      t.index = 0;
    }

    if(typeof t.startedAt !== "number"){
      t.startedAt = now;
    }

    if(typeof t.lastAdvanceAt !== "number"){
      t.lastAdvanceAt = now;
    }

    if(typeof t.blockUntil !== "number"){
      t.blockUntil = now + TALK_START_BLOCK;
    }

    /*
      会話開始直後の同じ入力を無視。
      これが「一瞬で終わる」問題の本命対策。
    */
    if(now < t.blockUntil){
      if(typeof flush === "function"){
        flush();
      }
      return;
    }

    /*
      連打で一気に最後まで進むのを防ぐ。
    */
    if(now - t.lastAdvanceAt < TALK_NEXT_BLOCK){
      if(typeof flush === "function"){
        flush();
      }
      return;
    }

    t.index++;

    if(t.index >= t.npc.lines.length){
      finishTalk(t);
      return;
    }

    t.lastAdvanceAt = now;
    t.blockUntil = now + TALK_NEXT_BLOCK;

    if(typeof flush === "function"){
      flush();
    }
  };

  function actionRect(){
    const p = G.player;
    if(!p) return null;

    return {
      x:p.x - 12,
      y:p.y - 12,
      w:p.w + 24,
      h:p.h + 24
    };
  }

  function doorTouchRect(){
    const p = G.player;
    if(!p) return null;

    const ex = 30;
    const ey = 30;

    return {
      x:p.x - ex,
      y:p.y - ey,
      w:p.w + ex * 2,
      h:p.h + ey * 2
    };
  }

  function isBossDoor(d){
    if(!d) return false;

    return (
      d.id === "boss_door" ||
      String(d.id || "").includes("boss") ||
      String(d.label || "").includes("扉") ||
      String(d.requiredItem || "").includes("key")
    );
  }

  function getTouchedDoor(){
    if(!G || !G.player || !Array.isArray(G.doors)) return null;

    const r = doorTouchRect();
    if(!r) return null;

    for(const d of G.doors || []){
      if(d && hitSafe(r,d)) return d;
    }

    return null;
  }

  function hasItemSafe(id){
    if(!G || !G.player || !id) return false;

    if(typeof hasItem === "function"){
      try{
        if(hasItem(id)) return true;
      }catch(e){}
    }

    const inv = G.player.inventory || [];

    for(const v of inv){
      if(v === id) return true;

      if(
        typeof v === "object" &&
        v &&
        v.id === id &&
        (v.count == null || v.count > 0)
      ){
        return true;
      }
    }

    return false;
  }

  function openDoorOrCreateWarpCircle(d){
    if(!d) return false;

    if(d.requiredItem && !hasItemSafe(d.requiredItem)){
      msg("鍵が必要だ", 60);
      return true;
    }

    /*
      魔法陣ワープ式パッチが入っている場合は、
      その関数名がローカルで見えないことがある。
      そのためここでも最低限の魔法陣生成を行う。
    */
    if(isBossDoor(d) && G.map && G.map.boss && !G.map.__duelSpace){
      d.locked = false;

      const cx = d.x + d.w / 2;
      const cy = Math.max(70, d.y - 72);

      G.map.__bossDoorOpened = true;
      G.map.__bossWarpCircle = {
        x:cx - 34,
        y:cy - 22,
        w:68,
        h:44,
        cx,
        cy,
        r:38,
        active:true,
        doorLabel:d.label || "扉"
      };

      G.map.objective = "魔法陣に乗る";

      msg((d.label || "扉") + "が開いた！ 奥の魔法陣へ向かおう", 120);
      return true;
    }

    d.locked = false;
    msg((d.label || "扉") + "が開いた！", 80);
    return true;
  }

  /*
    action を最終上書き。
    重要:
    - NPCは必ず window.beginTalk で開始
    - 右NPCも左NPCも同じ安定会話処理に入る
    - 古い action は呼ばない。呼ぶと簡易会話が復活する可能性がある
  */
  action = function(){
    if(typeof G === "undefined") return;

    if(G.state === "title"){
      start();
      return;
    }

    if(G.talk){
      talkNext();
      return;
    }

    if(G.state !== "field"){
      if(G.state === "shop"){
        closeShop();
      }
      return;
    }

    /*
      決闘空間ではNPC/扉操作なし。
    */
    if(G.map && G.map.__duelSpace){
      return;
    }

    const pr = actionRect();
    if(!pr) return;

    /*
      店
    */
    for(const s of G.shops || []){
      if(hitSafe(pr,s)){
        G.shop = {shop:s};
        G.state = "shop";

        if(typeof flush === "function") flush();
        return;
      }
    }

    /*
      NPC
      右NPC/左NPCどちらもここで安定版 beginTalk。
    */
    for(const n of G.npcs || []){
      if(hitSafe(pr,n)){
        window.beginTalk(n);
        return;
      }
    }

    /*
      宝箱
    */
    for(const c of G.chests || []){
      if(!c.opened && hitSafe(pr,c)){
        openChest(c);

        if(typeof flush === "function") flush();
        return;
      }
    }

    /*
      扉
    */
    const touchedDoor = getTouchedDoor();

    if(touchedDoor){
      openDoorOrCreateWarpCircle(touchedDoor);

      if(typeof flush === "function") flush();
      return;
    }
  };

  /*
    念のため、すでに簡易形式の会話が始まっていた場合も安定形式に補正。
  */
  if(typeof update === "function"){
    const __oldUpdateFinalStableNpcTalk = update;

    update = function(){
      if(G && G.talk && G.talk.npc && !G.talk.stableTalk){
        const npc = G.talk.npc;
        const idx = Math.max(0, G.talk.index || 0);

        cleanNpc(npc);

        G.talk = {
          npc,
          index:idx,
          startedAt:G.time || 0,
          lastAdvanceAt:G.time || 0,
          blockUntil:(G.time || 0) + TALK_START_BLOCK,
          stableTalk:true
        };

        if(typeof flush === "function"){
          flush();
        }
      }

      __oldUpdateFinalStableNpcTalk();
    };
  }


})();
/* =========================================================
   全ステージクリア演出・メッセージ強化パッチ 完全版
   貼る場所:
   - game.js の一番下
   - これまで貼った全パッチよりさらに後ろ

   修正内容:
   - 「5島クリア！」を廃止
   - 全7島クリアにふさわしいメッセージへ変更
   - 最終クリア時だけ特別な演出を追加
   - clear画面の表示も強化
   ========================================================= */
(function(){
  if(window.__epicAllClearMessagePatchApplied) return;
  window.__epicAllClearMessagePatchApplied = true;

  const ALL_CLEAR_TITLE = "SKY ISLANDS LIBERATED";
  const ALL_CLEAR_SUBTITLE = "すべての島に光が戻った";
  const ALL_CLEAR_MESSAGE = "七つの空島を解放した！ 真の冒険者の伝説が始まる！";

  function isFinalStageClear(){
    if(typeof G === "undefined") return false;
    if(typeof STAGES === "undefined") return false;
    return G.stageIndex + 1 >= STAGES.length;
  }

  function startAllClearEffect(){
    if(typeof G === "undefined") return;

    G.__epicAllClear = true;
    G.__epicAllClearT = 0;
    G.__epicAllClearMax = 260;

    if(typeof msg === "function"){
      msg(ALL_CLEAR_MESSAGE, 260);
    }else{
      G.message = ALL_CLEAR_MESSAGE;
      G.messageT = 260;
    }

    /*
      祝福エフェクトを少し追加。
      既存 effects の形式に近い粒子として入れる。
    */
    if(!Array.isArray(G.effects)) G.effects = [];

    const cx = G.player ? G.player.x + G.player.w / 2 : 360;
    const cy = G.player ? G.player.y + G.player.h / 2 : 320;

    const colors = [
      "#ffd84d",
      "#fff7a8",
      "#9effa1",
      "#63d8ff",
      "#b56bff",
      "#ffffff"
    ];

    for(let i=0;i<90;i++){
      const a = i / 90 * Math.PI * 2;
      const sp = 1.5 + (i % 7) * 0.32;
      const col = colors[i % colors.length];

      G.effects.push({
        type:"p",
        x:cx,
        y:cy,
        vx:Math.cos(a) * sp,
        vy:Math.sin(a) * sp,
        life:80 + (i % 5) * 18,
        max:80 + (i % 5) * 18,
        color:col,
        size:2 + (i % 3)
      });
    }

    /*
      大きな光輪。
    */
    G.effects.push({
      type:"ring",
      x:cx,
      y:cy,
      r:60,
      life:90,
      max:90,
      color:"#ffd84d"
    });

    G.effects.push({
      type:"ring",
      x:cx,
      y:cy,
      r:110,
      life:120,
      max:120,
      color:"#ffffff"
    });
  }

  /*
    update を包む。
    bossDefeat から clear に入った直後、
    最終ステージなら特別演出を発火する。
  */
  if(typeof update === "function"){
    const __oldUpdateEpicAllClear = update;

    update = function(){
      const beforeState = G ? G.state : null;
      const beforeFinal = isFinalStageClear();

      __oldUpdateEpicAllClear();

      if(
        G &&
        beforeState === "bossDefeat" &&
        G.state === "clear" &&
        beforeFinal &&
        !G.__epicAllClear
      ){
        startAllClearEffect();
      }

      if(G && G.__epicAllClear){
        G.__epicAllClearT = (G.__epicAllClearT || 0) + 1;
      }
    };
  }

  /*
    msgを包む。
    既存コード内に残っている「5島クリア！」が呼ばれても、
    ここでかっこいい文言に差し替える。
  */
  if(typeof msg === "function"){
    const __oldMsgEpicAllClear = msg;

    msg = function(s,t){
      if(
        typeof s === "string" &&
        (
          s.includes("5島クリア") ||
          s.includes("ALL CLEAR") ||
          s.includes("島クリア！ 次の島へ")
        ) &&
        isFinalStageClear()
      ){
        __oldMsgEpicAllClear(ALL_CLEAR_MESSAGE, Math.max(t || 0, 240));
        return;
      }

      __oldMsgEpicAllClear(s,t);
    };
  }

  /*
    clear画面の見た目を最終クリア時だけ強化する。
    既存 draw の後に上乗せするので安全。
  */
  if(typeof draw === "function"){
    const __oldDrawEpicAllClear = draw;

    draw = function(){
      __oldDrawEpicAllClear();

      if(!G) return;
      if(G.state !== "clear") return;
      if(!isFinalStageClear()) return;

      const time = G.time || 0;
      const pulse = 1 + Math.sin(time * 0.08) * 0.04;

      ctx.save();
      ctx.setTransform(1,0,0,1,0,0);

      /*
        画面全体の祝福オーバーレイ
      */
      const grad = ctx.createRadialGradient(
        VW / 2,
        VH / 2,
        40,
        VW / 2,
        VH / 2,
        VH * 0.72
      );

      grad.addColorStop(0,"rgba(255,248,180,.36)");
      grad.addColorStop(0.48,"rgba(99,216,255,.20)");
      grad.addColorStop(1,"rgba(8,25,45,.42)");

      ctx.fillStyle = grad;
      ctx.fillRect(0,0,VW,VH);

      /*
        光の粒
      */
      for(let i=0;i<36;i++){
        const a = i * 0.73 + time * 0.018;
        const r = 80 + (i % 9) * 28 + Math.sin(time * 0.025 + i) * 12;
        const x = VW / 2 + Math.cos(a) * r;
        const y = VH / 2 + Math.sin(a) * r * 0.72;

        ctx.globalAlpha = 0.24 + (i % 5) * 0.08;
        ctx.fillStyle = i % 3 === 0 ? "#ffd84d" : i % 3 === 1 ? "#ffffff" : "#9effff";
        ctx.beginPath();
        ctx.arc(x,y,2 + (i % 3),0,Math.PI*2);
        ctx.fill();
      }

      /*
        タイトルパネル
      */
      ctx.globalAlpha = 0.92;
      ctx.fillStyle = "rgba(8,25,45,.76)";
      if(typeof RR === "function"){
        RR(18,196,VW-36,220,22);
        ctx.fill();
      }else{
        ctx.fillRect(18,196,VW-36,220);
      }

      ctx.globalAlpha = 1;
      ctx.textAlign = "center";

      ctx.shadowBlur = 20;
      ctx.shadowColor = "#ffd84d";

      ctx.fillStyle = "#ffd84d";
      ctx.font = "900 24px system-ui";
      ctx.fillText(ALL_CLEAR_TITLE, VW/2, 245);

      ctx.shadowBlur = 12;
      ctx.shadowColor = "#ffffff";

      ctx.fillStyle = "#fff";
      ctx.font = "900 30px system-ui";
      ctx.save();
      ctx.translate(VW/2, 292);
      ctx.scale(pulse,pulse);
      ctx.fillText("完全制覇", 0, 0);
      ctx.restore();

      ctx.shadowBlur = 0;
      ctx.fillStyle = "#eaffff";
      ctx.font = "800 15px system-ui";
      ctx.fillText(ALL_CLEAR_SUBTITLE, VW/2, 330);

      ctx.fillStyle = "#fff7a8";
      ctx.font = "700 12px system-ui";
      ctx.fillText("TAP / Z でタイトルへ", VW/2, 372);

      /*
        七島制覇の印
      */
      const total = typeof STAGES !== "undefined" ? STAGES.length : 7;
      const startX = VW / 2 - (total - 1) * 13;

      for(let i=0;i<total;i++){
        const x = startX + i * 26;
        const y = 395;
        const rr = 7 + Math.sin(time * 0.08 + i) * 1.2;

        ctx.fillStyle = "#ffd84d";
        ctx.beginPath();
        ctx.arc(x,y,rr,0,Math.PI*2);
        ctx.fill();

        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x,y,rr+3,0,Math.PI*2);
        ctx.stroke();
      }

      ctx.textAlign = "left";
      ctx.restore();
    };
  }

})();
/* =========================================================
   雑魚敵AI強化 + 敵弾 + 盾反射 完全版
   貼る場所:
   - game.js の一番下
   - これまで貼った全パッチよりさらに後ろ

   効果:
   - 雑魚敵が常時追跡しない
   - ある程度近づいた時だけプレイヤーを追う
   - wind_bat は弾を撃つ
   - fast は近づくと突進
   - slime は近距離追跡
   - 敵弾は盾ではじける
   - はじいた敵弾は雑魚・ボスに当たる
   ========================================================= */
(function(){
  if(window.__smartEnemyAggroAndShieldReflectPatchApplied) return;
  window.__smartEnemyAggroAndShieldReflectPatchApplied = true;

  const TWO_PI = Math.PI * 2;

  const ENEMY_AI = {
    slime:{
      aggro:230,
      forget:310,
      speedMul:1.00,
      idleMove:0.22,
      contactDmg:2
    },
    fast:{
      aggro:280,
      forget:370,
      speedMul:1.05,
      idleMove:0.30,
      contactDmg:2,
      dashRange:175,
      dashCooldown:95,
      dashTime:18,
      dashSpeed:4.7
    },
    bat:{
      aggro:330,
      forget:430,
      speedMul:0.78,
      idleMove:0.35,
      contactDmg:2,
      keepDistance:155,
      shootRange:360,
      shootCooldown:105,
      bulletSpeed:3.15
    }
  };

  function hitSafe(a,b){
    return a && b &&
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y;
  }

  function centerOf(o){
    return {
      x:o.x + o.w / 2,
      y:o.y + o.h / 2
    };
  }

  function norm(x,y){
    const l = Math.hypot(x,y) || 1;
    return {x:x/l,y:y/l,l};
  }

  function dist(a,b){
    const ac = centerOf(a);
    const bc = centerOf(b);
    return Math.hypot(ac.x - bc.x, ac.y - bc.y);
  }

  function safeCl(v,a,b){
    if(typeof cl === "function") return cl(v,a,b);
    return Math.max(a, Math.min(b,v));
  }

  function playerBox(){
    const p = G.player;
    if(!p) return null;
    return {
      x:p.x + 4,
      y:p.y + 8,
      w:p.w - 8,
      h:p.h - 10
    };
  }

  function shieldLevel(){
    const p = G.player || {};
    return Math.max(0, p.shieldLv || p.armorLv || 0);
  }

  function playerDirVector(){
    const p = G.player;
    if(!p) return {x:0,y:1};

    if(p.dir === "up") return {x:0,y:-1};
    if(p.dir === "down") return {x:0,y:1};
    if(p.dir === "left") return {x:-1,y:0};
    return {x:1,y:0};
  }

  function dot(a,b){
    return a.x * b.x + a.y * b.y;
  }

  function stageEnemyColor(){
    const i = G.stageIndex || 0;
    return [
      "#9effa1",
      "#b9ff9a",
      "#d8ffff",
      "#ffb347",
      "#fff7a8",
      "#cfd8ff",
      "#efe7ff"
    ][i] || "#9effa1";
  }

  function ensureEnemyArrays(){
    if(!Array.isArray(G.enemyBullets)) G.enemyBullets = [];
    if(!Array.isArray(G.effects)) G.effects = [];
  }

  function enemyType(e){
    if(!e) return "slime";
    if(e.type === "bat") return "bat";
    if(e.type === "fast") return "fast";
    return "slime";
  }

  function enemyCfg(e){
    return ENEMY_AI[enemyType(e)] || ENEMY_AI.slime;
  }

  function initEnemySmartAI(e){
    if(!e || e.__smartEnemyAI) return;

    e.__smartEnemyAI = true;
    e.aiT = Math.floor(Math.random() * 60);
    e.aggro = false;
    e.homeX = e.x;
    e.homeY = e.y;
    e.idleAngle = Math.random() * TWO_PI;
    e.shootCd = 40 + Math.floor(Math.random() * 80);
    e.dashCd = 50 + Math.floor(Math.random() * 90);
    e.dashT = 0;
    e.dashVx = 0;
    e.dashVy = 0;
  }

  function addEnemyBullet(o){
    ensureEnemyArrays();

    G.enemyBullets.push({
      x:o.x || 0,
      y:o.y || 0,
      w:o.w || 12,
      h:o.h || 12,
      vx:o.vx || 0,
      vy:o.vy || 0,
      life:o.life || 130,
      max:o.life || 130,
      dmg:o.dmg || 2,
      color:o.color || stageEnemyColor(),
      kind:o.kind || "enemy_orb",
      reflectedByPlayer:false,
      owner:"enemy"
    });
  }

  function shootEnemyBulletAtPlayer(e){
    if(!G.player || !e) return;

    const ec = centerOf(e);
    const pc = centerOf(G.player);
    const cfg = enemyCfg(e);
    const n = norm(pc.x - ec.x, pc.y - ec.y);

    const size = e.type === "bat" ? 13 : 11;

    addEnemyBullet({
      x:ec.x - size / 2,
      y:ec.y - size / 2,
      w:size,
      h:size,
      vx:n.x * (cfg.bulletSpeed || 3),
      vy:n.y * (cfg.bulletSpeed || 3),
      life:140,
      dmg:2,
      color:e.color || stageEnemyColor(),
      kind:e.type === "bat" ? "wind_enemy" : "enemy_orb"
    });
  }

  function smartMoveEnemy(e){
    if(!G.player || !e) return;

    initEnemySmartAI(e);

    const cfg = enemyCfg(e);
    const p = G.player;
    const ec = centerOf(e);
    const pc = centerOf(p);

    e.aiT++;
    if(e.shootCd > 0) e.shootCd--;
    if(e.dashCd > 0) e.dashCd--;

    const d = Math.hypot(pc.x - ec.x, pc.y - ec.y);

    /*
      近づいたら反応、離れたら忘れる。
    */
    if(!e.aggro && d <= cfg.aggro){
      e.aggro = true;
    }else if(e.aggro && d >= cfg.forget){
      e.aggro = false;
    }

    /*
      被弾中は少し止まる。
    */
    if(e.hitT > 0){
      e.hitT--;
      return;
    }

    /*
      fast: 突進中
    */
    if(e.type === "fast" && e.dashT > 0){
      e.dashT--;

      move(e, e.dashVx, e.dashVy);
      return;
    }

    /*
      非アクティブ時: その場周辺を小さくうろうろ。
    */
    if(!e.aggro){
      const idle = cfg.idleMove || 0.2;
      const ax = Math.cos(e.aiT * 0.025 + e.idleAngle) * idle;
      const ay = Math.sin(e.aiT * 0.021 + e.idleAngle) * idle;

      /*
        初期位置から離れすぎたら戻る。
      */
      const back = norm(e.homeX - e.x, e.homeY - e.y);
      const away = Math.hypot(e.x - e.homeX, e.y - e.homeY);

      if(away > 55){
        move(e, back.x * 0.55, back.y * 0.55);
      }else{
        move(e, ax, ay);
      }

      return;
    }

    /*
      アクティブ時のタイプ別行動。
    */
    const toP = norm(pc.x - ec.x, pc.y - ec.y);

    if(e.type === "bat"){
      /*
        wind_bat:
        一定距離を保ちつつ弾を撃つ。
      */
      const keep = cfg.keepDistance || 150;
      let vx = 0;
      let vy = 0;

      if(d < keep - 35){
        vx = -toP.x * e.speed * 0.85;
        vy = -toP.y * e.speed * 0.85;
      }else if(d > keep + 45){
        vx = toP.x * e.speed * cfg.speedMul;
        vy = toP.y * e.speed * cfg.speedMul;
      }else{
        /*
          横に回り込む。
        */
        vx = -toP.y * e.speed * 0.68;
        vy = toP.x * e.speed * 0.68;
      }

      vx += Math.sin(e.aiT * 0.12) * 0.45;
      vy += Math.cos(e.aiT * 0.10) * 0.45;

      move(e, vx, vy);

      if(d <= cfg.shootRange && e.shootCd <= 0){
        shootEnemyBulletAtPlayer(e);

        e.shootCd = Math.max(48, cfg.shootCooldown - (G.stageIndex || 0) * 5);

        if(typeof fx === "function"){
          fx(ec.x, ec.y, e.color || stageEnemyColor(), 10, 1.8);
        }
      }

      return;
    }

    if(e.type === "fast"){
      /*
        fast:
        普段は近づく。距離が合うと突進。
      */
      if(d <= cfg.dashRange && e.dashCd <= 0){
        e.dashT = cfg.dashTime;
        e.dashCd = cfg.dashCooldown;

        e.dashVx = toP.x * cfg.dashSpeed;
        e.dashVy = toP.y * cfg.dashSpeed;

        if(typeof fx === "function"){
          fx(ec.x, ec.y, "#ffcc66", 12, 2.5);
        }

        return;
      }

      move(
        e,
        toP.x * e.speed * cfg.speedMul,
        toP.y * e.speed * cfg.speedMul
      );

      return;
    }

    /*
      slime:
      近づいたら普通に追う。
    */
    move(
      e,
      toP.x * e.speed * cfg.speedMul,
      toP.y * e.speed * cfg.speedMul
    );
  }

  /*
    雑魚敵の接触ダメージ。
  */
  function enemyContactDamage(e){
    if(!G.player || !e) return;

    const pb = playerBox();
    if(!pb) return;

    if(G.player.inv <= 0 && hitSafe(pb,e)){
      const cfg = enemyCfg(e);
      hurt(cfg.contactDmg || e.atk || 2);
    }
  }

  /*
    既存 updEnemies を完全上書き。
  */
  updEnemies = function(){
    if(!G || !G.player) return;

    for(let i=G.enemies.length-1;i>=0;i--){
      const e = G.enemies[i];

      if(!e){
        G.enemies.splice(i,1);
        continue;
      }

      smartMoveEnemy(e);
      enemyContactDamage(e);
    }
  };

  /*
    敵弾が盾で弾けるか。
  */
  function canReflectEnemyBullet(b){
    const p = G.player;
    if(!p || !b) return false;

    const lv = shieldLevel();
    if(lv <= 0) return false;

    if(b.reflectedByPlayer) return false;
    if(b.owner === "player") return false;

    const pc = centerOf(p);
    const bc = centerOf(b);

    const dx = bc.x - pc.x;
    const dy = bc.y - pc.y;
    const distance = Math.hypot(dx,dy);

    const guardRange = 32 + lv * 13;
    if(distance > guardRange) return false;

    const dir = playerDirVector();
    const toBullet = norm(dx,dy);

    /*
      lv1は正面のみ、lv2以降はやや広め。
    */
    const limit = lv >= 3 ? 0.16 : lv >= 2 ? 0.32 : 0.52;

    return dot(dir,toBullet) >= limit;
  }

  function reflectEnemyBullet(b){
    if(!G.player || !b) return false;

    const lv = shieldLevel();
    const pc = centerOf(G.player);
    const bc = centerOf(b);

    /*
      近くの雑魚を狙う。いなければプレイヤーの向きへ飛ばす。
    */
    let target = null;
    let best = Infinity;

    for(const e of G.enemies || []){
      if(!e) continue;
      const ec = centerOf(e);
      const d2 = (ec.x - bc.x) * (ec.x - bc.x) + (ec.y - bc.y) * (ec.y - bc.y);
      if(d2 < best){
        best = d2;
        target = e;
      }
    }

    if(!target && G.boss){
      target = G.boss;
    }

    let n;

    if(target){
      const tc = centerOf(target);
      n = norm(tc.x - bc.x, tc.y - bc.y);
    }else{
      n = playerDirVector();
    }

    const oldSpeed = Math.hypot(b.vx || 0,b.vy || 0);
    const sp = Math.max(4.0 + lv * 0.45, oldSpeed * 1.12);

    b.vx = n.x * sp;
    b.vy = n.y * sp;
    b.owner = "player";
    b.reflectedByPlayer = true;
    b.dmg = Math.max(2 + lv, Math.round((b.dmg || 2) * (1 + lv * 0.25)));
    b.life = Math.max(b.life || 0, 90);
    b.max = Math.max(b.max || 0, b.life || 90);
    b.color = G.player.trueGold ? "#ffd84d" : stageEnemyColor();
    b.kind = "reflected_enemy";

    G.player.inv = Math.max(G.player.inv || 0, 6);

    if(typeof fx === "function"){
      fx(bc.x, bc.y, b.color, 14, 2.6);
    }

    G.effects.push({
      type:"enemy_shield_flash",
      x:bc.x,
      y:bc.y,
      r:24 + lv * 6,
      life:16,
      max:16,
      color:b.color
    });

    if(!G.__lastEnemyBulletReflectMsg || G.time - G.__lastEnemyBulletReflectMsg > 30){
      G.__lastEnemyBulletReflectMsg = G.time || 0;
      msg("敵弾をはじいた！", 32);
    }

    return true;
  }

  function reflectedEnemyBulletHitTargets(b,index){
    if(!b || !b.reflectedByPlayer) return false;

    /*
      雑魚に当たる。
    */
    for(let i=G.enemies.length-1;i>=0;i--){
      const e = G.enemies[i];
      if(!e) continue;

      if(hitSafe(b,e)){
        if(typeof dmgE === "function"){
          dmgE(e,b.dmg || 3);
        }else{
          e.hp -= b.dmg || 3;
        }

        const c = centerOf(b);

        if(typeof fx === "function"){
          fx(c.x,c.y,b.color || stageEnemyColor(),16,3);
        }

        G.enemyBullets.splice(index,1);
        return true;
      }
    }

    /*
      ボスにも当たる。
    */
    if(G.boss && hitSafe(b,G.boss)){
      if(typeof dmgB === "function"){
        dmgB(b.dmg || 3);
      }else{
        G.boss.hp -= b.dmg || 3;
      }

      const c = centerOf(b);

      if(typeof fx === "function"){
        fx(c.x,c.y,b.color || stageEnemyColor(),16,3);
      }

      G.enemyBullets.splice(index,1);
      return true;
    }

    return false;
  }

  function updateEnemyBullets(){
    ensureEnemyArrays();

    const pb = playerBox();

    for(let i=G.enemyBullets.length-1;i>=0;i--){
      const b = G.enemyBullets[i];

      if(!b){
        G.enemyBullets.splice(i,1);
        continue;
      }

      b.life--;

      b.x += b.vx || 0;
      b.y += b.vy || 0;

      /*
        反射済みなら敵側へ当たる。
      */
      if(b.reflectedByPlayer){
        if(reflectedEnemyBulletHitTargets(b,i)){
          continue;
        }
      }else{
        /*
          盾反射。
        */
        if(canReflectEnemyBullet(b)){
          reflectEnemyBullet(b);
          continue;
        }

        /*
          プレイヤー命中。
        */
        if(pb && G.player.inv <= 0 && hitSafe(pb,b)){
          hurt(b.dmg || 2);
          G.enemyBullets.splice(i,1);
          continue;
        }
      }

      if(
        b.life <= 0 ||
        b.x < -100 ||
        b.y < -100 ||
        b.x > (G.map ? G.map.width : 1000) + 100 ||
        b.y > (G.map ? G.map.height : 1400) + 100
      ){
        G.enemyBullets.splice(i,1);
      }
    }
  }

  /*
    updateに敵弾更新を追加。
  */
  if(typeof update === "function"){
    const __oldUpdateSmartEnemyAggro = update;

    update = function(){
      __oldUpdateSmartEnemyAggro();

      if(G && G.state === "field"){
        updateEnemyBullets();
      }
    };
  }

  function drawEnemyBullet(b){
    const x = wx(b.x);
    const y = wy(b.y);
    const w = b.w || 12;
    const h = b.h || 12;
    const cx = x + w / 2;
    const cy = y + h / 2;

    ctx.save();

    ctx.globalAlpha = Math.max(0.25, Math.min(1, b.life / (b.max || b.life || 1)));
    ctx.shadowBlur = b.reflectedByPlayer ? 18 : 12;
    ctx.shadowColor = b.color || stageEnemyColor();

    if(b.kind === "wind_enemy"){
      ctx.strokeStyle = b.color || "#8de7ff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx,cy,w * 0.65,0,TWO_PI);
      ctx.stroke();

      ctx.globalAlpha *= 0.55;
      ctx.beginPath();
      ctx.arc(cx,cy,w * 1.05,0,TWO_PI);
      ctx.stroke();
    }else if(b.kind === "reflected_enemy"){
      ctx.fillStyle = b.color || "#ffd84d";
      ctx.beginPath();
      ctx.arc(cx,cy,w * 0.62,0,TWO_PI);
      ctx.fill();

      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx,cy,w * 0.9,0,TWO_PI);
      ctx.stroke();
    }else{
      const grad = ctx.createRadialGradient(cx-2,cy-2,1,cx,cy,w);
      grad.addColorStop(0,"#ffffff");
      grad.addColorStop(0.45,b.color || stageEnemyColor());
      grad.addColorStop(1,"rgba(0,30,40,.85)");

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx,cy,w * 0.58,0,TWO_PI);
      ctx.fill();
    }

    ctx.restore();
  }

  function drawEnemyBullets(){
    ensureEnemyArrays();

    for(const b of G.enemyBullets){
      if(b) drawEnemyBullet(b);
    }
  }

  function drawEnemyShieldFlash(){
    if(!G || !Array.isArray(G.effects)) return;

    for(const e of G.effects){
      if(!e || e.type !== "enemy_shield_flash") continue;

      const rate = e.life / (e.max || e.life || 1);
      const x = wx(e.x);
      const y = wy(e.y);

      ctx.save();

      ctx.globalAlpha = Math.max(0, rate);
      ctx.strokeStyle = e.color || stageEnemyColor();
      ctx.fillStyle = e.color || stageEnemyColor();
      ctx.shadowBlur = 18;
      ctx.shadowColor = e.color || stageEnemyColor();

      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(x,y,e.r * (1.1 - rate * 0.1),0,TWO_PI);
      ctx.stroke();

      ctx.globalAlpha *= 0.20;
      ctx.beginPath();
      ctx.arc(x,y,e.r,0,TWO_PI);
      ctx.fill();

      ctx.restore();
    }
  }

  /*
    drawに敵弾描画を追加。
  */
  if(typeof draw === "function"){
    const __oldDrawSmartEnemyAggro = draw;

    draw = function(){
      __oldDrawSmartEnemyAggro();

      if(!G || G.state === "title") return;

      drawEnemyBullets();
      drawEnemyShieldFlash();
    };
  }

  /*
    effect寿命処理。
  */
  if(typeof updFx === "function"){
    const __oldUpdFxSmartEnemyAggro = updFx;

    updFx = function(){
      __oldUpdFxSmartEnemyAggro();

      if(!G || !Array.isArray(G.effects)) return;

      for(let i=G.effects.length-1;i>=0;i--){
        const e = G.effects[i];
        if(!e) continue;

        if(e.type === "enemy_shield_flash"){
          e.life--;
          if(e.life <= 0){
            G.effects.splice(i,1);
          }
        }
      }
    };
  }

  /*
    ステージ切り替え時に敵弾を掃除。
  */
  if(typeof load === "function"){
    const __oldLoadSmartEnemyAggro = load;

    load = function(s,keep){
      __oldLoadSmartEnemyAggro(s,keep);

      if(G){
        G.enemyBullets = [];
      }
    };
  }

  /*
    ボス撃破・ゲームオーバー時などの保険。
  */
  if(typeof start === "function"){
    const __oldStartSmartEnemyAggro = start;

    start = function(){
      __oldStartSmartEnemyAggro();

      if(G){
        G.enemyBullets = [];
      }
    };
  }

})();
/* =========================================================
   スマホ操作 最終安定化パッチ
   - ジョイスティックが右ボタン操作で止まる問題を修正
   - アタック連打で画面が拡大する問題を防止
   - 移動しながら ATK / MAGIC / DASH / ACT を押せる
   - 既存の joystick パッチよりさらに後ろに貼る
   ========================================================= */
(function(){
  if(window.__finalMobileControlStabilityPatchApplied) return;
  window.__finalMobileControlStabilityPatchApplied = true;

  const JOY_RADIUS = 54;
  const STICK_MAX = 42;
  const DEAD_ZONE = 0.16;

  const joy = document.getElementById("joystick");
  const stick = document.getElementById("stick");

  /*
    1) スマホのダブルタップズーム・選択・長押しメニューを抑制
  */
  (function preventMobileZoomAndSelection(){
    let meta = document.querySelector('meta[name="viewport"]');

    if(!meta){
      meta = document.createElement("meta");
      meta.name = "viewport";
      document.head.appendChild(meta);
    }

    meta.setAttribute(
      "content",
      "width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover"
    );

    const style = document.createElement("style");
    style.textContent = `
      html, body, canvas, #game, #joystick, #stick, .actions, .tbtn {
        touch-action: none !important;
        -ms-touch-action: none !important;
        -webkit-user-select: none !important;
        user-select: none !important;
        -webkit-touch-callout: none !important;
        -webkit-tap-highlight-color: transparent !important;
      }

      #joystick, #stick, .actions, .tbtn {
        overscroll-behavior: none !important;
      }

      .tbtn {
        cursor: pointer;
      }
    `;
    document.head.appendChild(style);

    /*
      iOS Safari 対策。
      gesturestart / gesturechange は Safari 系でピンチ拡大を止めるための保険。
    */
    ["gesturestart","gesturechange","gestureend"].forEach(type=>{
      document.addEventListener(type,function(e){
        e.preventDefault();
      },{passive:false});
    });

    /*
      ダブルタップズーム対策。
    */
    let lastTouchEnd = 0;

    document.addEventListener("touchend",function(e){
      const now = Date.now();

      if(now - lastTouchEnd <= 350){
        e.preventDefault();
      }

      lastTouchEnd = now;
    },{passive:false});

    document.addEventListener("dblclick",function(e){
      e.preventDefault();
    },{passive:false});
  })();

  /*
    2) 右ボタンを押した時に左スティックが止まらないよう、
       ジョイスティック状態を input.ax / input.ay とは別に保持する。
       以前のパッチが input.ax を 0 にしても、ここで毎フレーム戻す。
  */
  window.__mobileJoy = window.__mobileJoy || {
    active:false,
    pointerId:null,
    centerX:0,
    centerY:0,
    ax:0,
    ay:0
  };

  const joyState = window.__mobileJoy;

  if(input){
    input.ax = input.ax || 0;
    input.ay = input.ay || 0;
  }

  function updateCenter(){
    if(!joy) return;

    const rect = joy.getBoundingClientRect();

    joyState.centerX = rect.left + rect.width / 2;
    joyState.centerY = rect.top + rect.height / 2;
  }

  function setStickVisual(nx,ny){
    if(!stick) return;

    const sx = nx * STICK_MAX;
    const sy = ny * STICK_MAX;

    stick.style.transform =
      "translate(calc(-50% + " + sx + "px), calc(-50% + " + sy + "px))";
  }

  function resetJoy(){
    joyState.active = false;
    joyState.pointerId = null;
    joyState.ax = 0;
    joyState.ay = 0;

    if(input){
      input.ax = 0;
      input.ay = 0;
    }

    setStickVisual(0,0);
  }

  function applyJoystickPoint(clientX,clientY){
    let dx = clientX - joyState.centerX;
    let dy = clientY - joyState.centerY;

    const len = Math.hypot(dx,dy);

    if(len > JOY_RADIUS){
      dx = dx / len * JOY_RADIUS;
      dy = dy / len * JOY_RADIUS;
    }

    let nx = dx / JOY_RADIUS;
    let ny = dy / JOY_RADIUS;

    const mag = Math.hypot(nx,ny);

    if(mag < DEAD_ZONE){
      nx = 0;
      ny = 0;
    }

    joyState.ax = nx;
    joyState.ay = ny;

    if(input){
      input.ax = nx;
      input.ay = ny;
    }

    setStickVisual(nx,ny);
  }

  /*
    3) ジョイスティックの pointer 処理。
       重要:
       - reset は同じ pointerId の時だけ
       - 右ボタンの pointerup では reset しない
  */
  if(joy && stick){
    joy.addEventListener("pointerdown",function(e){
      e.preventDefault();
      e.stopPropagation();

      joyState.active = true;
      joyState.pointerId = e.pointerId;

      updateCenter();

      try{
        joy.setPointerCapture(e.pointerId);
      }catch(err){}

      applyJoystickPoint(e.clientX,e.clientY);
    },{passive:false});

    joy.addEventListener("pointermove",function(e){
      if(!joyState.active) return;
      if(joyState.pointerId !== e.pointerId) return;

      e.preventDefault();
      e.stopPropagation();

      applyJoystickPoint(e.clientX,e.clientY);
    },{passive:false});

    joy.addEventListener("pointerup",function(e){
      if(joyState.pointerId !== e.pointerId) return;

      e.preventDefault();
      e.stopPropagation();

      try{
        joy.releasePointerCapture(e.pointerId);
      }catch(err){}

      resetJoy();
    },{passive:false});

    joy.addEventListener("pointercancel",function(e){
      if(joyState.pointerId !== e.pointerId) return;

      e.preventDefault();
      e.stopPropagation();

      resetJoy();
    },{passive:false});

    joy.addEventListener("lostpointercapture",function(){
      /*
        lostpointercapture は攻撃ボタンでは基本発生しないが、
        スティック側の capture が失われた時だけ止める。
      */
      if(joyState.active){
        resetJoy();
      }
    });
  }

  /*
    4) 右ボタン側の pointerup がジョイスティックへ影響しないようにする。
       既存の tap() は pointerdown だけを使って input を入れているため、
       ここでは stopPropagation と preventDefault を追加する。
  */
  ["attackBtn","magicBtn","dashBtn","actionBtn"].forEach(id=>{
    const el = document.getElementById(id);
    if(!el) return;

    function stopTouch(e){
      e.preventDefault();
      e.stopPropagation();
    }

    el.addEventListener("pointerdown",function(e){
      stopTouch(e);
    },{passive:false});

    el.addEventListener("pointermove",function(e){
      stopTouch(e);
    },{passive:false});

    el.addEventListener("pointerup",function(e){
      stopTouch(e);
    },{passive:false});

    el.addEventListener("pointercancel",function(e){
      stopTouch(e);
    },{passive:false});

    el.addEventListener("touchstart",function(e){
      stopTouch(e);
    },{passive:false});

    el.addEventListener("touchend",function(e){
      stopTouch(e);
    },{passive:false});
  });

  /*
    5) document pointerup で雑に reset しない。
       ただし、ジョイスティックの pointerId と一致する時だけ reset する。
       これが「ATKを離すと移動が止まる」対策の本命。
  */
  document.addEventListener("pointerup",function(e){
    if(!joyState.active) return;
    if(joyState.pointerId !== e.pointerId) return;

    resetJoy();
  },{passive:true});

  document.addEventListener("pointercancel",function(e){
    if(!joyState.active) return;
    if(joyState.pointerId !== e.pointerId) return;

    resetJoy();
  },{passive:true});

  window.addEventListener("blur",function(){
    resetJoy();
  });

  document.addEventListener("visibilitychange",function(){
    if(document.hidden){
      resetJoy();
    }
  });

  window.addEventListener("resize",function(){
    if(joyState.active){
      updateCenter();
    }
  });

  window.addEventListener("orientationchange",function(){
    resetJoy();
  });

  /*
    6) updP を最終上書き。
       input.ax / input.ay が他の古いパッチで 0 にされても、
       joyState.ax / joyState.ay を優先して移動する。
  */
  updP = function(){
    const p = G.player;
    if(!p) return;

    ["inv","dashCd","attackCd","attackT","comboT"].forEach(k=>{
      if(p[k] > 0){
        p[k]--;
      }
    });

    if(p.comboT <= 0){
      p.combo = 0;
    }

    let mx = input.right - input.left;
    let my = input.down - input.up;

    /*
      ジョイスティックが生きている間は joyState を優先。
      これにより、ATKボタンの pointerup で input.ax が一瞬0になっても止まらない。
    */
    const jx = joyState.active ? joyState.ax : (input.ax || 0);
    const jy = joyState.active ? joyState.ay : (input.ay || 0);

    if(Math.hypot(jx,jy) > DEAD_ZONE){
      mx = jx;
      my = jy;
    }

    const nn = nrm(mx,my);

    p.vx = nn.l > .001 ? nn.x : 0;
    p.vy = nn.l > .001 ? nn.y : 0;

    /*
      ダッシュ中は向きを固定する。
      (本来のダッシュ攻撃仕様: ダッシュ中に向きが変わるとヒットボックスの
      向きがブレるため、ダッシュ中は p.dir を上書きしない)
    */
    if(Math.abs(mx) + Math.abs(my) > 0.001 && !(p.dashT > 0)){
      p.dir = Math.abs(mx) > Math.abs(my)
        ? (mx > 0 ? "right" : "left")
        : (my > 0 ? "down" : "up");
    }

    /*
      ダッシュ開始。
      入力方向が無ければ現在向いている方向へダッシュする。
    */
    if(C("dash") && p.dashCd <= 0){
      let dvx = mx, dvy = my;

      if(Math.abs(dvx) + Math.abs(dvy) < 0.001){
        const dv = {up:{x:0,y:-1},down:{x:0,y:1},left:{x:-1,y:0},right:{x:1,y:0}};
        const d = dv[p.dir || "down"];
        dvx = d.x; dvy = d.y;
      }

      const dn = nrm(dvx,dvy);
      p.__dashVX = dn.x;
      p.__dashVY = dn.y;
      p.__dashDir = Math.abs(dn.x) > Math.abs(dn.y) ? (dn.x > 0 ? "right" : "left") : (dn.y > 0 ? "down" : "up");
      p.dir = p.__dashDir;
      p.dashT = DASH_DURATION;
      p.dashCd = DASH_COOLDOWN;
      p.inv = Math.max(p.inv || 0, DASH_INVINCIBLE);
      p.__dashActive = true;
      dashSerial++;
      p.__dashSerial = dashSerial;
      ring(p.x + p.w / 2, p.y + p.h / 2, 22, p.trueGold ? "#ffd84d" : "#9ef7ff");
    }

    if(p.dashT > 0){
      p.dashT--;
      const vx = p.__dashVX || 0;
      const vy = p.__dashVY || 0;
      move(p, vx * DASH_SPEED, vy * DASH_SPEED);
      dashStrike();

      if(p.dashT <= 0){
        p.__dashActive = false;
        p.__dashVX = 0;
        p.__dashVY = 0;
      }
    }else{
      p.__dashActive = false;
      if(nn.l > .001) move(p, nn.x * p.speed, nn.y * p.speed);
    }

    /*
      攻撃・魔法・アクションは移動と独立して処理。
      これで移動しながらATKを押しても止まりにくい。
    */
    if(C("attack") && p.attackCd <= 0){
      attack();
    }

    if(C("magic")){
      magic();
    }

    if(C("action")){
      action();
    }
  };

  /*
    7) 毎フレーム input.ax/ay を復元する保険。
       古いパッチの document pointerup が input.ax/ay を0にしても、
       左スティックが active なら次フレームで復活する。
  */
  if(typeof update === "function"){
    const __oldUpdateFinalMobileControl = update;

    update = function(){
      if(joyState.active && input){
        input.ax = joyState.ax;
        input.ay = joyState.ay;
      }

      __oldUpdateFinalMobileControl();

      if(joyState.active && input){
        input.ax = joyState.ax;
        input.ay = joyState.ay;
      }
    };
  }

})();
/* =========================================================
   スマホ用 ショップ強化タップ対応パッチ 完全版
   貼る場所:
   - game.js の一番下
   - これまで貼った全パッチよりさらに後ろ

   効果:
   - スマホでショップ項目を直接タップして購入できる
   - 剣 / 盾 / 魔法 の3項目をタップ購入
   - 移動用ジョイスティックや右ボタン操作と干渉しにくい
   - キーボード 1 / 2 / 3 購入もそのまま維持
   - ショップUIに「タップで強化」を追加表示
   ========================================================= */
(function(){
  if(window.__mobileShopTapBuyPatchApplied) return;
  window.__mobileShopTapBuyPatchApplied = true;

  /*
    shop UI は game.js の ui() 内でこの位置に描画されている:
    for(let i=0;i<items.length;i++){
      const y=305+i*60;
      RR(34,y,VW-68,48,12);
    }
    そのため、この矩形をタップ判定に使う。
  */
  const SHOP_ITEM_X = 34;
  const SHOP_ITEM_W = VW - 68;
  const SHOP_ITEM_Y0 = 305;
  const SHOP_ITEM_H = 48;
  const SHOP_ITEM_GAP = 60;

  function canvasPointFromEvent(e){
    const rect = cvs.getBoundingClientRect();

    /*
      canvas は CSS で拡大縮小されているので、
      実座標を 360x640 のゲーム座標へ変換する。
    */
    const x = (e.clientX - rect.left) * (cvs.width / rect.width);
    const y = (e.clientY - rect.top) * (cvs.height / rect.height);

    return {x,y};
  }

  function getShopItemIndexAt(x,y){
    if(typeof shopItems !== "function") return -1;

    const items = shopItems();

    for(let i=0;i<items.length;i++){
      const iy = SHOP_ITEM_Y0 + i * SHOP_ITEM_GAP;

      if(
        x >= SHOP_ITEM_X &&
        x <= SHOP_ITEM_X + SHOP_ITEM_W &&
        y >= iy &&
        y <= iy + SHOP_ITEM_H
      ){
        return i;
      }
    }

    return -1;
  }

  function tryTapBuyShopItem(e){
    if(typeof G === "undefined") return false;
    if(G.state !== "shop") return false;
    if(!G.shop) return false;

    const p = canvasPointFromEvent(e);
    const idx = getShopItemIndexAt(p.x,p.y);

    if(idx < 0){
      return false;
    }

    /*
      ここで止めないと、既存の canvas pointerdown が input.action=1 を立てて
      ショップを閉じることがある。
    */
    e.preventDefault();
    e.stopPropagation();

    if(typeof e.stopImmediatePropagation === "function"){
      e.stopImmediatePropagation();
    }

    if(typeof buy === "function"){
      buy(idx);
    }

    /*
      購入タップが ACT として処理されてショップが閉じないようにする。
    */
    if(typeof flush === "function"){
      flush();
    }else if(typeof input !== "undefined"){
      input.attack = 0;
      input.action = 0;
      input.start = 0;
      input.magic = 0;
      input.dash = 0;
    }

    return true;
  }

  /*
    capture:true で、既存の cvs pointerdown より先に拾う。
    これがスマホでショップが勝手に閉じる対策。
  */
  cvs.addEventListener("pointerdown",function(e){
    tryTapBuyShopItem(e);
  },{capture:true,passive:false});

  cvs.addEventListener("touchstart",function(e){
    if(typeof G === "undefined") return;
    if(G.state !== "shop") return;

    /*
      touchstart でもブラウザのダブルタップズームやスクロールを抑制。
      実際の購入処理は pointerdown 側で行う。
    */
    e.preventDefault();
  },{capture:true,passive:false});

  /*
    右側 ACT ボタンはこれまで通り閉じる用に残す。
    ただしショップ中に ATK/MAGIC/DASH を押しても変な入力が残らないようにする。
  */
  ["attackBtn","magicBtn","dashBtn"].forEach(id=>{
    const el = document.getElementById(id);
    if(!el) return;

    el.addEventListener("pointerdown",function(e){
      if(typeof G !== "undefined" && G.state === "shop"){
        e.preventDefault();
        e.stopPropagation();

        if(typeof e.stopImmediatePropagation === "function"){
          e.stopImmediatePropagation();
        }

        if(typeof flush === "function"){
          flush();
        }
      }
    },{capture:true,passive:false});
  });

  /*
    ショップUIの説明文をスマホ向けに上乗せ表示。
    既存 ui() を壊さず、draw の最後に説明だけ追加する。
  */
  function drawMobileShopTapHint(){
    if(typeof G === "undefined") return;
    if(G.state !== "shop") return;

    ctx.save();
    ctx.setTransform(1,0,0,1,0,0);

    /*
      既存UIの説明文付近に、スマホ向け文言を追加。
    */
    ctx.fillStyle = "#fff7a8";
    ctx.font = "900 12px system-ui";
    ctx.textAlign = "left";
    ctx.fillText("スマホ: 強化したい項目をタップ",38,286);

    /*
      各購入枠に薄いタップガイドを追加。
    */
    const items = typeof shopItems === "function" ? shopItems() : [];

    for(let i=0;i<items.length;i++){
      const y = SHOP_ITEM_Y0 + i * SHOP_ITEM_GAP;

      ctx.save();
      ctx.globalAlpha = 0.18 + Math.sin((G.time || 0) * 0.08 + i) * 0.04;
      ctx.strokeStyle = "#ffd84d";
      ctx.lineWidth = 2;

      if(typeof RR === "function"){
        RR(SHOP_ITEM_X,y,SHOP_ITEM_W,SHOP_ITEM_H,12);
        ctx.stroke();
      }else{
        ctx.strokeRect(SHOP_ITEM_X,y,SHOP_ITEM_W,SHOP_ITEM_H);
      }

      ctx.restore();

      ctx.fillStyle = "rgba(255,255,255,.82)";
      ctx.font = "800 10px system-ui";
      ctx.textAlign = "right";
      ctx.fillText("TAP",SHOP_ITEM_X + SHOP_ITEM_W - 14,y + 30);
    }

    ctx.restore();
  }

  if(typeof draw === "function"){
    const __oldDrawMobileShopTapBuy = draw;

    draw = function(){
      __oldDrawMobileShopTapBuy();
      drawMobileShopTapHint();
    };
  }

})();
/* =========================================================
   スマホ操作ボタン再割り当て 最終版
   貼る場所:
   - game.js の一番下
   - これまで貼った全パッチよりさらに後ろ

   変更内容:
   - ACTボタンを HERB ボタンに変更
   - ATKボタンに ACT / START の効果も追加
   - スマホでは ATK で攻撃・会話送り・宝箱・扉・ショップ閉じる
   - HERBボタンで薬草を使用
   - 既存の actionBtn の古い action 入力を止める
   - 以前追加した herbBtn があれば削除して重複を防ぐ
   ========================================================= */
(function(){
  if(window.__atkIncludesActAndActBecomesHerbPatchApplied) return;
  window.__atkIncludesActAndActBecomesHerbPatchApplied = true;

  const attackBtn = document.getElementById("attackBtn");
  const actionBtn = document.getElementById("actionBtn");

  /*
    以前の薬草ボタン追加パッチで herbBtn が存在する場合は削除。
    今回は ACT ボタン自体を HERB にする。
  */
  const oldHerbBtn = document.getElementById("herbBtn");
  if(oldHerbBtn && oldHerbBtn !== actionBtn){
    oldHerbBtn.remove();
  }

  function stop(e){
    if(!e) return;

    e.preventDefault();
    e.stopPropagation();

    if(typeof e.stopImmediatePropagation === "function"){
      e.stopImmediatePropagation();
    }
  }

  function restoreJoystickIfActive(){
    /*
      右ボタン操作でジョイスティックが止まらないように保険。
      以前のスマホ操作安定化パッチの joyState がある場合は復元する。
    */
    if(window.__mobileJoy && window.__mobileJoy.active && typeof input !== "undefined"){
      input.ax = window.__mobileJoy.ax || 0;
      input.ay = window.__mobileJoy.ay || 0;
    }
  }

  function clearButtonInputsOnly(){
    /*
      移動入力は消さず、ボタン系だけ消す。
      ジョイスティック移動を邪魔しない。
    */
    if(typeof input === "undefined") return;

    input.attack = 0;
    input.action = 0;
    input.start = 0;
    input.magic = 0;
    input.dash = 0;

    restoreJoystickIfActive();
  }

  function herbCount(){
    if(typeof G === "undefined" || !G.player) return 0;

    const inv = G.player.inventory || [];
    let total = 0;

    for(const v of inv){
      if(
        typeof v === "object" &&
        v &&
        v.id === "small_herb" &&
        (v.count || 0) > 0
      ){
        total += v.count || 0;
      }
    }

    return total;
  }

  function useHerbFromActButton(){
    if(typeof G === "undefined") return;
    if(!G.player) return;

    /*
      HERBボタンはフィールド中だけ有効。
      会話中・ショップ中・クリア画面などで暴発しないようにする。
      ショップを閉じたい時は ATK ボタンを押す。
    */
    if(G.state !== "field"){
      return;
    }

    const p = G.player;

    if(herbCount() <= 0){
      if(typeof msg === "function"){
        msg("薬草を持っていない", 50);
      }
      clearButtonInputsOnly();
      return;
    }

    if(p.hp >= p.maxHp){
      if(typeof msg === "function"){
        msg("HPは満タンだ", 45);
      }
      clearButtonInputsOnly();
      return;
    }

    /*
      既存の herb() を使う。
      herb() は small_herb を1個減らして HP を回復する既存処理。
    */
    if(typeof herb === "function"){
      herb();
    }else{
      /*
        herb() が何らかの理由で見えない場合の保険。
      */
      const item = (p.inventory || []).find(v =>
        typeof v === "object" &&
        v &&
        v.id === "small_herb" &&
        v.count > 0
      );

      if(item){
        item.count--;
        p.hp = Math.min(p.maxHp, p.hp + 5);
      }
    }

    if(typeof msg === "function"){
      msg("薬草を使った！", 45);
    }

    clearButtonInputsOnly();
  }

  function pressAtkWithAct(){
    if(typeof input === "undefined") return;

    /*
      ATKボタンに以下をまとめる:
      - attack: 攻撃
      - action: 会話送り / 宝箱 / 扉 / ショップ閉じる
      - start : タイトル開始 / クリア画面送り
    */
    if(typeof G !== "undefined" && G.lock > 0){
      return;
    }

    input.attack = 1;
    input.action = 1;
    input.start = 1;

    restoreJoystickIfActive();
  }

  /*
    ACTボタンをHERBボタンとして見た目変更。
  */
  if(actionBtn){
    actionBtn.textContent = "HERB";
    actionBtn.setAttribute("data-count", "0");
    actionBtn.title = "薬草を使う";

    actionBtn.style.background = "rgba(46,190,100,.30)";
    actionBtn.style.color = "#eaffd2";
    actionBtn.style.position = "relative";
  }

  /*
    HERB所持数バッジ用CSS。
  */
  const style = document.createElement("style");
  style.textContent = `
    #actionBtn{
      background:rgba(46,190,100,.30) !important;
      color:#eaffd2 !important;
      position:relative !important;
    }

    #actionBtn::after{
      content:attr(data-count);
      position:absolute;
      right:7px;
      top:5px;
      min-width:18px;
      height:18px;
      padding:0 4px;
      border-radius:999px;
      background:rgba(8,25,45,.72);
      color:#fff7a8;
      font-size:11px;
      line-height:18px;
      text-align:center;
      pointer-events:none;
    }

    #attackBtn::after{
      content:"ACT";
      position:absolute;
      right:6px;
      top:5px;
      font-size:10px;
      color:#fff7a8;
      opacity:.9;
      pointer-events:none;
    }

    #attackBtn{
      position:relative !important;
    }
  `;
  document.head.appendChild(style);

  /*
    重要:
    元の game.js には tap("actionBtn","action") がある。
    それを止めるため、capture:true + stopImmediatePropagation で先に拾う。
  */
  if(actionBtn){
    actionBtn.addEventListener("pointerdown",function(e){
      stop(e);
      useHerbFromActButton();
    },{capture:true,passive:false});

    actionBtn.addEventListener("pointerup",function(e){
      stop(e);
    },{capture:true,passive:false});

    actionBtn.addEventListener("pointermove",function(e){
      stop(e);
    },{capture:true,passive:false});

    actionBtn.addEventListener("pointercancel",function(e){
      stop(e);
    },{capture:true,passive:false});

    actionBtn.addEventListener("touchstart",function(e){
      stop(e);
    },{capture:true,passive:false});

    actionBtn.addEventListener("touchend",function(e){
      stop(e);
    },{capture:true,passive:false});
  }

  /*
    ATKボタンを ATK + ACT + START にする。
    元の tap("attackBtn","attack") を止めて、こちらでまとめて入力する。
  */
  if(attackBtn){
    attackBtn.addEventListener("pointerdown",function(e){
      stop(e);
      pressAtkWithAct();
    },{capture:true,passive:false});

    attackBtn.addEventListener("pointerup",function(e){
      stop(e);
      restoreJoystickIfActive();
    },{capture:true,passive:false});

    attackBtn.addEventListener("pointermove",function(e){
      stop(e);
      restoreJoystickIfActive();
    },{capture:true,passive:false});

    attackBtn.addEventListener("pointercancel",function(e){
      stop(e);
      restoreJoystickIfActive();
    },{capture:true,passive:false});

    attackBtn.addEventListener("touchstart",function(e){
      stop(e);
    },{capture:true,passive:false});

    attackBtn.addEventListener("touchend",function(e){
      stop(e);
    },{capture:true,passive:false});
  }

  function updateHerbCountBadge(){
    if(!actionBtn) return;

    const c = herbCount();
    actionBtn.setAttribute("data-count", String(c));

    /*
      薬草がない時は薄く、ある時は見やすく。
    */
    if(c <= 0){
      actionBtn.style.opacity = "0.34";
    }else{
      actionBtn.style.opacity = "0.66";
    }
  }

  /*
    update/draw のたびに所持数表示を更新。
  */
  if(typeof update === "function"){
    const __oldUpdateAtkActHerbPatch = update;

    update = function(){
      updateHerbCountBadge();
      __oldUpdateAtkActHerbPatch();
      updateHerbCountBadge();
      restoreJoystickIfActive();
    };
  }

  if(typeof draw === "function"){
    const __oldDrawAtkActHerbPatch = draw;

    draw = function(){
      __oldDrawAtkActHerbPatch();
      updateHerbCountBadge();
    };
  }

  /*
    すでにロード済みでも即反映。
  */
  updateHerbCountBadge();

})();

/* =========================================================
   FINAL FIX: 幅広・アニメーション付き波動砲 v2
   目的:
   - 波動砲の当たり判定と見た目を広くする
   - 光る楕円、残像、中心線、粒子でアニメーション感を追加
   - 既存のスマホ操作パッチ/ボスラッシュパッチより後ろで最終上書きする
========================================================= */
(function(){
  if(window.__wideAnimatedWaveCannonV2Applied)return;
  window.__wideAnimatedWaveCannonV2Applied=true;

  function hitSafe(a,b){
    return a&&b&&a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
  }
  function distHitSafe(a,cx,cy,r){
    if(!a)return false;
    const ex=a.x+a.w/2;
    const ey=a.y+a.h/2;
    return (ex-cx)*(ex-cx)+(ey-cy)*(ey-cy)<=r*r;
  }
  function canUseEightWayWave(){
    const p=G.player;
    return !!p && (p.swordLv||0)>=5 && (p.shieldLv||0)>=5 && (p.bookLv||0)>=5;
  }
  function directionAngle(dx,dy){
    return Math.atan2(dy,dx);
  }
  function waveSizeForDir(dx,dy,wideLevel){
    // 直線方向は横長/縦長、斜めは正方形寄りにして広く当てる。
    const diag=Math.abs(dx)>0 && Math.abs(dy)>0;
    if(diag){
      return {
        w:wideLevel>=2?44:38,
        h:wideLevel>=2?44:38,
        visualLen:wideLevel>=2?78:64,
        visualThick:wideLevel>=2?30:24
      };
    }
    if(Math.abs(dx)>0){
      return {
        w:wideLevel>=2?58:46,
        h:wideLevel>=2?28:22,
        visualLen:wideLevel>=2?92:74,
        visualThick:wideLevel>=2?34:26
      };
    }
    return {
      w:wideLevel>=2?28:22,
      h:wideLevel>=2?58:46,
      visualLen:wideLevel>=2?92:74,
      visualThick:wideLevel>=2?34:26
    };
  }
  function pushWaveParticle(x,y,color,angle,spread){
    if(!Array.isArray(G.effects))G.effects=[];
    const back=angle+Math.PI;
    for(let i=0;i<4;i++){
      const a=back+(Math.random()-0.5)*(spread||0.8);
      const sp=0.8+Math.random()*1.8;
      G.effects.push({
        type:"wave_spark",
        x:x+(Math.random()-0.5)*18,
        y:y+(Math.random()-0.5)*18,
        vx:Math.cos(a)*sp,
        vy:Math.sin(a)*sp,
        life:18+Math.floor(Math.random()*10),
        max:28,
        color:color||"#9ef7ff",
        size:2+Math.random()*2
      });
    }
  }
  function shootWaveDir(dx,dy,opt){
    const p=G.player;
    if(!p)return;
    opt=opt||{};
    const n=nrm(dx,dy);
    const wideLevel=opt.wideLevel||1;
    const size=waveSizeForDir(dx,dy,wideLevel);
    const color=opt.color||(p.trueGold?"#ffd84d":"#9ef7ff");
    const x=p.x+p.w/2-size.w/2;
    const y=p.y+p.h/2-size.h/2;
    const angle=directionAngle(n.x,n.y);

    G.bullets.push({
      x,
      y,
      w:size.w,
      h:size.h,
      vx:n.x*(opt.speed||7.2),
      vy:n.y*(opt.speed||7.2),
      life:opt.life||82,
      maxLife:opt.life||82,
      dmg:opt.dmg||Math.max(2,Math.round((p.atk||3)*0.8)),
      magic:true,
      wave:true,
      wideWave:true,
      animatedWave:true,
      angle,
      visualLen:size.visualLen,
      visualThick:size.visualThick,
      radius:opt.radius||38,
      color,
      pulseSeed:Math.random()*Math.PI*2
    });

    pushWaveParticle(p.x+p.w/2,p.y+p.h/2,color,angle,0.9);
  }
  function shootForwardWave(baseDamage){
    const p=G.player;
    if(!p)return;
    const wideLevel=p.trueGold?2:1;
    const opt={
      speed:p.trueGold?7.8:6.9,
      life:p.trueGold?90:74,
      dmg:Math.max(2,Math.round((baseDamage||p.atk||3)*(p.trueGold?1.02:0.78))),
      radius:p.trueGold?44:34,
      color:p.trueGold?"#ffd84d":"#9ef7ff",
      wideLevel
    };
    if(p.dir==="up")shootWaveDir(0,-1,opt);
    else if(p.dir==="down")shootWaveDir(0,1,opt);
    else if(p.dir==="left")shootWaveDir(-1,0,opt);
    else shootWaveDir(1,0,opt);
  }
  function shootEightWayWave(baseDamage){
    const p=G.player;
    if(!p)return;
    const dirs=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
    const color="#fff7a8";
    const dmg=Math.max(3,Math.round((baseDamage||p.atk||3)*0.88));
    for(const d of dirs){
      shootWaveDir(d[0],d[1],{
        speed:7.8,
        life:90,
        dmg,
        radius:46,
        color,
        wideLevel:2
      });
    }
    if(typeof ring==="function")ring(p.x+p.w/2,p.y+p.h/2,130,color);
    msg("八方向・幅広波動砲！",58);
  }

  // attack() を再度、最終上書き。後ろの操作パッチで消されないよう、このパッチを一番最後に置く。
  attack=function(){
    const p=G.player;
    if(!p)return;
    const st=G.stageIndex||0;
    p.combo=p.combo%3+1;
    p.comboT=38;
    const sweep=p.combo===3;
    const r=sweep?(p.trueGold?94:p.curseLifted?82:70):0;
    p.attackT=sweep?18:12;
    p.attackCd=sweep?18:12;
    const a=atkBox();
    const atkMul=st>=4?(p.trueGold?0.82:0.92):1;
    const d=p.atk*atkMul*(sweep?1.35:1);

    if(sweep&&canUseEightWayWave()){
      shootEightWayWave(d);
    }else if(p.curseLifted||p.trueGold){
      shootForwardWave(d);
    }

    if(sweep){
      const cx=p.x+p.w/2;
      const cy=p.y+p.h/2;
      const rr=st>=4&&p.trueGold?Math.round(r*0.90):r;
      let hits=0;
      for(let i=G.enemies.length-1;i>=0;i--){
        const e=G.enemies[i];
        if(e&&distHitSafe(e,cx,cy,rr)){dmgE(e,d);hits++;}
      }
      if(G.boss&&distHitSafe(G.boss,cx,cy,rr))dmgB(d*.8);
      if(typeof ring==="function")ring(cx,cy,rr,p.trueGold?"#ffd84d":"#9ef7ff");
      if(!canUseEightWayWave())msg("なぎ払い！ x"+hits,36);
    }else{
      for(let i=G.enemies.length-1;i>=0;i--){
        const e=G.enemies[i];
        if(e&&hitSafe(a,e))dmgE(e,d);
      }
      if(G.boss&&hitSafe(a,G.boss))dmgB(d);
    }
  };

  // 波動砲をボスにも確実に当てる。
  const oldUpdBullets=updBullets;
  updBullets=function(){
    oldUpdBullets();
    if(!G||!Array.isArray(G.bullets))return;
    for(let i=G.bullets.length-1;i>=0;i--){
      const b=G.bullets[i];
      if(!b||!b.wave)continue;
      if(G.boss&&hitSafe(b,G.boss)){
        dmgB(Math.max(1,Math.round(b.dmg||3)));
        const x=b.x+b.w/2;
        const y=b.y+b.h/2;
        if(typeof fx==="function")fx(x,y,b.color||"#fff7a8",18,3.5);
        if(typeof ring==="function")ring(x,y,b.radius||38,b.color||"#fff7a8");
        G.bullets.splice(i,1);
      }
    }
  };

  function drawAnimatedWaveBullet(b){
    if(!b||!b.wave)return;
    const x=wx(b.x+b.w/2);
    const y=wy(b.y+b.h/2);
    const age=(b.maxLife||b.life||1)-(b.life||0);
    const max=b.maxLife||80;
    const t=age/max;
    const pulse=1+Math.sin((G.time||0)*0.35+(b.pulseSeed||0))*0.10;
    const fade=Math.max(0.20,Math.min(1,(b.life||0)/max));
    const len=(b.visualLen||70)*(1+0.18*t)*pulse;
    const thick=(b.visualThick||26)*(1+0.10*Math.sin((G.time||0)*0.5));
    const angle=b.angle||0;

    ctx.save();
    ctx.translate(x,y);
    ctx.rotate(angle);

    // 後ろの残像
    for(let i=3;i>=1;i--){
      ctx.globalAlpha=0.10*fade*i;
      ctx.fillStyle=b.color||"#9ef7ff";
      ctx.shadowBlur=18;
      ctx.shadowColor=b.color||"#9ef7ff";
      ctx.beginPath();
      ctx.ellipse(-i*13,0,len*(0.45+i*0.08),thick*(0.50+i*0.10),0,0,Math.PI*2);
      ctx.fill();
    }

    // 外側の光
    ctx.globalAlpha=0.30*fade;
    ctx.fillStyle=b.color||"#9ef7ff";
    ctx.shadowBlur=28;
    ctx.shadowColor=b.color||"#9ef7ff";
    ctx.beginPath();
    ctx.ellipse(0,0,len*0.62,thick*0.82,0,0,Math.PI*2);
    ctx.fill();

    // 本体
    const grad=ctx.createLinearGradient(-len/2,0,len/2,0);
    grad.addColorStop(0,"rgba(255,255,255,0.05)");
    grad.addColorStop(0.22,b.color||"#9ef7ff");
    grad.addColorStop(0.55,"#ffffff");
    grad.addColorStop(0.82,b.color||"#9ef7ff");
    grad.addColorStop(1,"rgba(255,255,255,0.10)");
    ctx.globalAlpha=0.82*fade;
    ctx.fillStyle=grad;
    ctx.beginPath();
    ctx.ellipse(0,0,len*0.46,thick*0.48,0,0,Math.PI*2);
    ctx.fill();

    // 中心線
    ctx.globalAlpha=0.92*fade;
    ctx.strokeStyle="#ffffff";
    ctx.lineWidth=3;
    ctx.lineCap="round";
    ctx.beginPath();
    ctx.moveTo(-len*0.36,0);
    ctx.lineTo(len*0.42,0);
    ctx.stroke();

    // 回転する小リング
    ctx.globalAlpha=0.55*fade;
    ctx.strokeStyle=b.color||"#9ef7ff";
    ctx.lineWidth=2;
    for(let i=0;i<3;i++){
      const ox=-len*0.20+i*len*0.20;
      ctx.beginPath();
      ctx.ellipse(ox,0,thick*(0.42+i*0.08),thick*(0.16+i*0.03),Math.sin((G.time||0)*0.12+i)*0.45,0,Math.PI*2);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawWaveSparks(){
    if(!G||!Array.isArray(G.effects))return;
    for(const e of G.effects){
      if(!e||e.type!=="wave_spark")continue;
      const rate=Math.max(0,Math.min(1,e.life/(e.max||e.life||1)));
      ctx.save();
      ctx.globalAlpha=rate;
      ctx.fillStyle=e.color||"#9ef7ff";
      ctx.shadowBlur=12;
      ctx.shadowColor=e.color||"#9ef7ff";
      ctx.beginPath();
      ctx.arc(wx(e.x),wy(e.y),e.size||2,0,Math.PI*2);
      ctx.fill();
      ctx.restore();
    }
  }

  // 既存drawの後に、幅広波動砲の見た目を上乗せする。
  const oldDraw=draw;
  draw=function(){
    oldDraw();
    if(!G||G.state==="title")return;
    if(Array.isArray(G.bullets)){
      for(const b of G.bullets){
        if(b&&b.wave)drawAnimatedWaveBullet(b);
      }
    }
    drawWaveSparks();
  };

  msg("波動砲が幅広く進化した！",110);
})();




/* =========================================================
   FINAL RESTORE v3: Stage7 Boss Rush + Attack Link
   直近仕様の復元:
   - Stage7の鍵扉を開けると歴代ボスラッシュ開始
   - Stage1〜Stage6ボスを順番に出す
   - 各ボスの攻撃AIを元ステージにリンク
   - 全員撃破後、真の魔法陣が出現
   - 魔法陣に乗るとStage7ボス/アビス戦
   - clear/title/gameover ではBOSS RUSH表示を消す
========================================================= */
(function(){
  if(window.__stage7BossRushAttackLinkedRestoreV3Applied)return;
  window.__stage7BossRushAttackLinkedRestoreV3Applied=true;

  const ARENA_W=920;
  const ARENA_H=1180;
  const ROOM={x:70,y:90,w:780,h:860};
  const PLAYER_START={x:ARENA_W/2-12,y:ARENA_H-210};

  function isStage7(){return typeof G!=="undefined"&&G.stageIndex===6;}
  function hitSafe(a,b){return a&&b&&a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;}
  function center(o){return {x:o.x+o.w/2,y:o.y+o.h/2};}
  function isBossDoor(d){return !!d&&(d.id==="boss_door"||String(d.id||"").includes("boss")||String(d.label||"").includes("扉")||String(d.requiredItem||"").includes("key"));}
  function hasItemSafe(id){
    if(!G||!G.player||!id)return false;
    if(typeof hasItem==="function"){
      try{if(hasItem(id))return true;}catch(e){}
    }
    for(const v of G.player.inventory||[]){
      if(v===id)return true;
      if(typeof v==="object"&&v&&v.id===id&&(v.count==null||v.count>0))return true;
    }
    return false;
  }
  function playerRect(extra){
    const p=G.player;if(!p)return null;
    const e=extra==null?12:extra;
    return {x:p.x-e,y:p.y-e,w:p.w+e*2,h:p.h+e*2};
  }
  function touchedDoor(){
    if(!G||!Array.isArray(G.doors))return null;
    const r=playerRect(38);if(!r)return null;
    for(const d of G.doors){if(d&&hitSafe(r,d))return d;}
    return null;
  }
  function clearRushUiFlags(){
    if(!G||!G.map)return;
    G.map.__stage7AbyssPortal=null;
    if(G.state==="clear"||G.state==="title"||G.state==="gameover"){
      G.map.__stage7RushArena=false;
      G.map.__stage7RushDone=false;
    }
  }
  function arenaTerrain(){
    return [
      {x:0,y:0,w:ARENA_W,h:34,type:"cliff"},
      {x:0,y:0,w:34,h:ARENA_H,type:"cliff"},
      {x:ARENA_W-34,y:0,w:34,h:ARENA_H,type:"cliff"},
      {x:0,y:ARENA_H-34,w:ARENA_W,h:34,type:"cliff"},
      {x:78,y:90,w:190,h:30,type:"stone"},
      {x:ARENA_W-268,y:90,w:190,h:30,type:"stone"},
      {x:92,y:250,w:76,h:56,type:"rock"},
      {x:ARENA_W-168,y:250,w:76,h:56,type:"rock"},
      {x:112,y:ARENA_H-360,w:76,h:56,type:"rock"},
      {x:ARENA_W-188,y:ARENA_H-360,w:76,h:56,type:"rock"},
      {x:90,y:ARENA_H-160,w:130,h:32,type:"stone"},
      {x:ARENA_W-220,y:ARENA_H-160,w:130,h:32,type:"stone"}
    ];
  }

  const RUSH_VISUALS=[
    {main:"#73df78",sub:"#b7ff9a",dark:"#1e6b45",glow:"#9effa1",shape:"griffin"},
    {main:"#46c66a",sub:"#b9ff9a",dark:"#1f6f3a",glow:"#a8ff86",shape:"tree"},
    {main:"#72f7ff",sub:"#d8ffff",dark:"#237e9a",glow:"#b9fbff",shape:"crystal"},
    {main:"#ff7048",sub:"#ffd84d",dark:"#8b2d22",glow:"#ffb347",shape:"wyvern"},
    {main:"#ffd84d",sub:"#fff7a8",dark:"#8c6d35",glow:"#fff2a5",shape:"guardian"},
    {main:"#9b7cff",sub:"#cfd8ff",dark:"#35266f",glow:"#b8a8ff",shape:"leviathan"},
    {main:"#8b5cff",sub:"#efe7ff",dark:"#171026",glow:"#b56bff",shape:"void"}
  ];
  function visual(i){return RUSH_VISUALS[Math.max(0,Math.min(RUSH_VISUALS.length-1,i||0))]||RUSH_VISUALS[0];}

  function rushList(){
    const titles=["一番目の守護者","二番目の守護者","三番目の守護者","四番目の守護者","五番目の守護者","六番目の守護者"];
    const list=[];
    for(let i=0;i<6;i++){
      const src=STAGES[i]&&STAGES[i].boss?STAGES[i].boss:null;
      if(src)list.push({...src,__rushIndex:i,__sourceStageIndex:i,rushTitle:titles[i]||"守護者"});
    }
    return list;
  }
  function rushHp(src,index){
    const base=Math.max(1,src.maxHp||src.hp||60);
    const mult=[1.25,1.35,1.50,1.65,1.85,2.10][index]||1.5;
    const min=[90,130,190,280,420,620][index]||120;
    return Math.max(min,Math.round(base*mult));
  }
  function createBossFromSource(src,index,kind){
    const sourceIndex=kind==="abyss"?6:(src.__sourceStageIndex??index);
    const w=src.w||128,h=src.h||108;
    const hp=kind==="abyss"?Math.max(1600,Math.round((src.maxHp||src.hp||450)*3.0)):rushHp(src,index);
    return {
      ...src,
      x:ROOM.x+ROOM.w/2-w/2,y:ROOM.y+110,w,h,
      hp,maxHp:hp,t:0,shot:82,phase:1,aiT:0,patternT:0,nextAttack:40,enraged:false,
      duelBoss:true,
      __stage7RushLinkedBoss:true,
      __sourceStageIndex:sourceIndex,
      __rushIndex:index,
      __rushKind:kind,
      __rushMaxHp:hp,
      __baseBossMaxHp:hp,
      __bossHpScaleApplied:true,
      __bossHpScaleStageIndex:6,
      __lastRushHp:hp,
      __lastRushMax:hp
    };
  }
  function setupArena(){
    G.map.name="虚空王城・歴代守護者の間";
    G.map.objective="歴代ボスをすべて倒す";
    G.map.width=ARENA_W;G.map.height=ARENA_H;
    G.map.bossRoom={...ROOM};
    G.map.__duelSpace=true;
    G.map.__stage7RushArena=true;
    G.map.terrain=arenaTerrain();G.terrain=G.map.terrain;
    G.npcs=[];G.shops=[];G.chests=[];G.doors=[];G.enemies=[];G.drops=[];
    G.map.npcs=[];G.map.shops=[];G.map.chests=[];G.map.doors=[];G.map.enemies=[];
    G.bullets=[];G.bossBullets=[];G.bossZones=[];G.enemyBullets=[];G.effects=[];
    G.player.x=PLAYER_START.x;G.player.y=PLAYER_START.y;G.player.dir="up";
    G.player.hp=G.player.maxHp;G.player.mp=G.player.maxMp;G.player.inv=Math.max(G.player.inv||0,130);
    G.state="field";G.lock=70;
    G.duelTransitionT=90;G.duelTransitionMax=90;G.duelIntroText="歴代守護者オンパレード";
    flush();cam();
  }
  function startRush(){
    if(!isStage7()||!G.map||G.map.__stage7RushStarted)return;
    const finalSource={...(STAGES[6]&&STAGES[6].boss?STAGES[6].boss:G.map.boss)};
    G.map.__stage7RushStarted=true;
    G.map.__stage7RushDone=false;
    G.map.__stage7AbyssStarted=false;
    G.map.__stage7AbyssCleared=false;
    G.map.__stage7AbyssPortal=null;
    G.map.__stage7FinalBossSource=finalSource;
    G.map.__stage7RushList=rushList();
    G.map.__stage7RushIndex=0;
    setupArena();spawnRushBoss(0);
    msg("歴代ボスラッシュ開始！",140);
  }
  function spawnRushBoss(index){
    const list=G.map.__stage7RushList||rushList();G.map.__stage7RushList=list;
    if(index>=list.length){createAbyssPortal();return;}
    const src=list[index];
    G.boss=createBossFromSource(src,index,"rush");
    G.map.boss={...G.boss};G.map.__stage7RushIndex=index;
    G.map.objective=(index+1)+"/"+list.length+" "+(src.name||"BOSS")+"を倒す";
    G.bullets=[];G.bossBullets=[];G.bossZones=[];G.enemyBullets=[];
    if(typeof ring==="function")ring(center(G.boss).x,center(G.boss).y,120,visual(G.boss.__sourceStageIndex).glow);
    msg((src.rushTitle||"守護者")+"「"+(src.name||"BOSS")+"」出現！",130);
  }
  function createAbyssPortal(){
    G.boss=null;G.bullets=[];G.bossBullets=[];G.bossZones=[];G.enemyBullets=[];
    G.map.__stage7RushDone=true;
    G.map.__stage7AbyssPortal={x:ARENA_W/2-54,y:ROOM.y+ROOM.h/2-34,w:108,h:68,cx:ARENA_W/2,cy:ROOM.y+ROOM.h/2,r:62,active:true};
    G.map.objective="真の魔法陣に入る";
    if(typeof ring==="function")ring(ARENA_W/2,ROOM.y+ROOM.h/2,150,"#ffffff");
    msg("歴代守護者を突破した！ 真の魔法陣が現れた！",180);
  }
  function onAbyssPortal(){
    const c=G.map&&G.map.__stage7AbyssPortal;if(!c||!c.active||!G.player)return false;
    const pc=center(G.player),dx=pc.x-c.cx,dy=pc.y-c.cy;
    return dx*dx+dy*dy<=c.r*c.r;
  }
  function startAbyss(){
    if(!isStage7()||!G.map||G.map.__stage7AbyssStarted)return;
    const src=G.map.__stage7FinalBossSource||STAGES[6].boss||G.map.boss;
    G.map.__stage7AbyssStarted=true;if(G.map.__stage7AbyssPortal)G.map.__stage7AbyssPortal.active=false;
    G.map.name="虚空王城・真の最終決戦";G.map.objective="アビス・オーバーロードを倒す";
    G.player.x=PLAYER_START.x;G.player.y=PLAYER_START.y;G.player.dir="up";
    G.player.hp=G.player.maxHp;G.player.mp=G.player.maxMp;G.player.inv=Math.max(G.player.inv||0,150);
    G.bullets=[];G.bossBullets=[];G.bossZones=[];G.enemyBullets=[];
    G.boss=createBossFromSource(src,6,"abyss");G.boss.name=src.name||"アビス・オーバーロード";G.map.boss={...G.boss};
    G.duelTransitionT=100;G.duelTransitionMax=100;G.duelIntroText="真の最終決戦";G.lock=70;
    flush();cam();msg("アビス・オーバーロードが現れた！",160);
  }
  function lockRushHp(){
    const b=G&&G.boss;if(!b||!b.__stage7RushLinkedBoss)return;
    const desired=b.__rushMaxHp||b.maxHp||1;
    if(b.maxHp!==desired){
      const oldMax=Math.max(1,b.__lastRushMax||desired),oldHp=Math.max(1,b.__lastRushHp||b.hp||desired);
      const ratio=Math.max(0.001,Math.min(1,oldHp/oldMax));
      b.maxHp=desired;b.hp=Math.max(1,Math.min(desired,Math.round(desired*ratio)));
    }
    b.__baseBossMaxHp=desired;b.__bossHpScaleApplied=true;b.__bossHpScaleStageIndex=6;b.__lastRushHp=b.hp;b.__lastRushMax=b.maxHp;
  }

  const oldAction=action;
  action=function(){
    if(typeof G==="undefined")return;
    if(!isStage7()||!G.map||G.map.__stage7RushArena){oldAction();return;}
    if(G.state==="title"){start();return;}
    if(G.talk){talkNext();return;}
    if(G.state!=="field"){if(G.state==="shop")closeShop();else oldAction();return;}
    const pr=playerRect(12);
    for(const s of G.shops||[]){if(hitSafe(pr,s)){G.shop={shop:s};G.state="shop";flush();return;}}
    for(const n of G.npcs||[]){if(hitSafe(pr,n)){if(window.beginTalk)window.beginTalk(n);else{G.talk={npc:n,index:0};G.state="talk";}return;}}
    for(const c of G.chests||[]){if(!c.opened&&hitSafe(pr,c)){openChest(c);flush();return;}}
    const d=touchedDoor();
    if(d&&isBossDoor(d)){
      if(d.requiredItem&&!hasItemSafe(d.requiredItem)){msg("鍵が必要だ",70);flush();return;}
      d.locked=false;startRush();return;
    }
    oldAction();
  };

  const oldTryDoor=tryDoor;
  tryDoor=function(d){
    if(isStage7()&&d&&isBossDoor(d)&&!G.map.__stage7RushArena){
      if(d.requiredItem&&!hasItemSafe(d.requiredItem)){msg("鍵が必要だ",70);return;}
      d.locked=false;startRush();return;
    }
    oldTryDoor(d);
  };

  const oldDmgB=dmgB;
  dmgB=function(damage){
    const b=G&&G.boss?G.boss:null;
    if(b&&b.__stage7RushLinkedBoss){
      b.hp-=damage;b.__lastRushHp=b.hp;b.__lastRushMax=b.maxHp;
      if(b.hp<=0){
        const defeated={...b};
        G.boss=null;G.bullets=[];G.bossBullets=[];G.bossZones=[];G.enemyBullets=[];
        if(typeof fx==="function")fx(center(defeated).x,center(defeated).y,visual(defeated.__sourceStageIndex).glow,28,5);
        if(defeated.__rushKind==="rush"){
          const next=(defeated.__rushIndex||0)+1,list=G.map.__stage7RushList||[];
          if(next<list.length){
            msg((defeated.name||"BOSS")+"撃破！ 次の守護者が現れる…",120);
            G.__stage7NextRushBossT=85;G.__stage7NextRushBossIndex=next;G.lock=Math.max(G.lock||0,45);
          }else createAbyssPortal();
        }else{
          G.map.__stage7AbyssCleared=true;G.state="bossDefeat";G.bossDefeatT=120;msg("アビス・オーバーロード撃破！",180);
        }
      }
      return;
    }
    oldDmgB(damage);
  };

  // 攻撃AIリンク: 既存ボスAIが G.stageIndex を見て攻撃を選ぶため、
  // ボスラッシュ中だけ一時的に元ステージ番号へ差し替える。
  const oldUpdBoss=updBoss;
  updBoss=function(){
    const b=G&&G.boss?G.boss:null;
    if(b&&b.__stage7RushLinkedBoss&&typeof b.__sourceStageIndex==="number"){
      const realStageIndex=G.stageIndex;
      G.stageIndex=b.__sourceStageIndex;
      try{oldUpdBoss();}finally{G.stageIndex=realStageIndex;}
      return;
    }
    oldUpdBoss();
  };

  const oldUpdate=update;
  update=function(){
    const b=G&&G.boss&&G.boss.__stage7RushLinkedBoss?G.boss:null;
    if(b){b.__lastRushHp=b.hp;b.__lastRushMax=b.maxHp;}
    oldUpdate();
    lockRushHp();
    if(G&&G.__stage7NextRushBossT>0){
      G.__stage7NextRushBossT--;
      if(G.__stage7NextRushBossT<=0){spawnRushBoss(G.__stage7NextRushBossIndex||0);G.__stage7NextRushBossIndex=0;}
    }
    if(G&&isStage7()&&G.state==="field"&&G.map&&G.map.__stage7RushDone&&!G.map.__stage7AbyssStarted&&onAbyssPortal())startAbyss();
    if(G&&(G.state==="clear"||G.state==="title"||G.state==="gameover"))clearRushUiFlags();
  };

  function drawAbyssPortal(){
    if(!G||!G.map||!G.map.__stage7AbyssPortal||G.state!=="field")return;
    const c=G.map.__stage7AbyssPortal;if(!c.active)return;
    const x=wx(c.cx),y=wy(c.cy),t=G.time||0,pulse=1+Math.sin(t*0.11)*0.10;
    ctx.save();
    ctx.globalAlpha=0.32;ctx.fillStyle="#ffffff";ctx.shadowBlur=34;ctx.shadowColor="#ffffff";ctx.beginPath();ctx.ellipse(x,y+4,82*pulse,44*pulse,0,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=0.95;ctx.strokeStyle="#fff7a8";ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(x,y,62*pulse,32*pulse,0,0,Math.PI*2);ctx.stroke();
    ctx.strokeStyle="#b56bff";ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(x,y,40*pulse,21*pulse,0,0,Math.PI*2);ctx.stroke();
    ctx.strokeStyle="#ffffff";
    for(let i=0;i<14;i++){const a=t*0.035+i/14*Math.PI*2;ctx.beginPath();ctx.moveTo(x+Math.cos(a)*12,y+Math.sin(a)*6);ctx.lineTo(x+Math.cos(a)*66*pulse,y+Math.sin(a)*34*pulse);ctx.stroke();}
    ctx.fillStyle="#fff";ctx.font="900 12px system-ui";ctx.textAlign="center";ctx.fillText("真の魔法陣",x,y-58);ctx.fillText("乗るとアビス戦へ",x,y-42);ctx.textAlign="left";ctx.restore();
  }
  function drawRushBadge(){
    if(!G||!G.map||!G.map.__stage7RushArena||G.state!=="field")return;
    const list=G.map.__stage7RushList||[],isAbyss=G.boss&&G.boss.__rushKind==="abyss";
    const idx=G.boss&&G.boss.__rushKind==="rush"?G.boss.__rushIndex:(G.map.__stage7RushIndex||0);
    ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle="rgba(8,25,45,.76)";RR(10,186,VW-20,40,13);ctx.fill();
    ctx.fillStyle=isAbyss?"#ffd84d":"#fff7a8";ctx.font="900 12px system-ui";ctx.fillText(isAbyss?"TRUE FINAL BOSS":"BOSS RUSH "+Math.min(idx+1,list.length)+"/"+list.length,22,208);
    if(G.boss){ctx.fillStyle="#fff";ctx.fillText(G.boss.name||"BOSS",150,208);}else if(G.map.__stage7RushDone){ctx.fillStyle="#fff";ctx.fillText("真の魔法陣へ",150,208);}
    ctx.restore();
  }
  const oldDraw=draw;
  draw=function(){oldDraw();drawAbyssPortal();drawRushBadge();};

  const oldDrawBoss3D=drawBoss3D;
  drawBoss3D=function(ctxArg,b,wxArg,wyArg,t){
    if(!b||!b.__stage7RushLinkedBoss){oldDrawBoss3D(ctxArg,b,wxArg,wyArg,t);return;}
    const th=visual(b.__sourceStageIndex),x=wxArg(b.x),y=wyArg(b.y),w=b.w||120,h=b.h||100;
    const cx=x+w/2,cy=y+h/2+Math.sin((t||0)*0.05)*3,hpRate=Math.max(0,Math.min(1,(b.hp||1)/(b.maxHp||1)));
    ctx.save();ctx.globalAlpha=.35;ctx.fillStyle="rgba(0,20,30,.45)";ctx.beginPath();ctx.ellipse(cx,y+h*.86,w*.48,h*.16,0,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=.25;ctx.fillStyle=th.glow;ctx.shadowBlur=24;ctx.shadowColor=th.glow;ctx.beginPath();ctx.ellipse(cx,cy,w*.72,h*.58,0,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=1;ctx.shadowBlur=18;ctx.shadowColor=th.glow;ctx.translate(cx,cy);ctx.fillStyle=th.main;ctx.strokeStyle=th.sub;ctx.lineWidth=3;
    const shape=th.shape;
    if(shape==="tree"){
      ctx.fillStyle="#5b3922";RR(-w*.18,-h*.22,w*.36,h*.62,16);ctx.fill();ctx.stroke();ctx.fillStyle=th.main;ctx.beginPath();ctx.ellipse(0,-h*.35,w*.36,h*.28,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(-w*.24,-h*.18,w*.24,h*.20,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(w*.24,-h*.18,w*.24,h*.20,0,0,Math.PI*2);ctx.fill();
    }else if(shape==="crystal"){
      ctx.beginPath();ctx.moveTo(0,-h*.55);ctx.lineTo(w*.34,-h*.05);ctx.lineTo(w*.18,h*.45);ctx.lineTo(-w*.18,h*.45);ctx.lineTo(-w*.34,-h*.05);ctx.closePath();ctx.fill();ctx.stroke();
    }else if(shape==="leviathan"){
      ctx.lineWidth=12;ctx.lineCap="round";ctx.strokeStyle=th.sub;ctx.beginPath();for(let i=0;i<7;i++){const xx=-w*.36+i*w*.12,yy=Math.sin((t||0)*.05+i*.8)*18+i*5;if(i===0)ctx.moveTo(xx,yy);else ctx.lineTo(xx,yy);}ctx.stroke();ctx.fillStyle=th.main;ctx.beginPath();ctx.ellipse(w*.18,-h*.18,w*.26,h*.18,.1,0,Math.PI*2);ctx.fill();ctx.stroke();
    }else if(shape==="void"){
      ctx.fillStyle=th.main;ctx.beginPath();ctx.ellipse(0,0,w*.34,h*.40,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.strokeStyle=th.glow;for(let i=0;i<4;i++){const a=(t||0)*.025+i/4*Math.PI*2;ctx.beginPath();ctx.arc(Math.cos(a)*w*.40,Math.sin(a)*h*.32,12,0,Math.PI*2);ctx.stroke();}
    }else{
      ctx.beginPath();ctx.ellipse(-w*.38,0,w*.30,h*.20,-.55,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(w*.38,0,w*.30,h*.20,.55,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(0,5,w*.30,h*.34,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.beginPath();ctx.ellipse(0,-h*.26,w*.22,h*.17,0,0,Math.PI*2);ctx.fill();ctx.stroke();
    }
    ctx.fillStyle="#071018";ctx.beginPath();ctx.ellipse(-9,-h*.12,5,6,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(9,-h*.12,5,6,0,0,Math.PI*2);ctx.fill();ctx.restore();
    ctx.save();ctx.fillStyle="#fff";ctx.font="900 12px system-ui";ctx.textAlign="center";ctx.shadowBlur=8;ctx.shadowColor=th.dark;ctx.fillText(b.name||"BOSS",cx,y-10);ctx.restore();
    ctx.save();ctx.fillStyle="rgba(8,25,45,.55)";RR(cx-48,y-5,96,6,999);ctx.fill();ctx.fillStyle=hpRate<=.33?"#ff6262":hpRate<=.66?"#ffd84d":th.glow;RR(cx-48,y-5,Math.max(2,96*hpRate),6,999);ctx.fill();ctx.restore();
  };

  msg("ボスラッシュ設定を復元した！",130);
})();
/* =========================================================
   ゲームオーバー後リスタート時の背景・エフェクト残留修正パッチ
   貼る場所:
   - game.js の一番下
   - 既存の全パッチよりさらに後ろ

   修正内容:
   - ゲームオーバー後にリスタートした時、
     前回のボス戦背景・衝撃波・魔法陣・Stage7ラッシュ情報が残らないようにする
   ========================================================= */
(function(){
  if(window.__restartVisualCleanupPatchApplied) return;
  window.__restartVisualCleanupPatchApplied = true;

  function clearInputSafe(){
    if(typeof flush === "function"){
      flush();
      return;
    }
    if(typeof input !== "undefined"){
      input.attack = 0;
      input.action = 0;
      input.start = 0;
      input.magic = 0;
      input.dash = 0;
    }
  }

  function clearMapTemporaryFlags(map){
    if(!map) return;

    delete map.__duelSpace;
    delete map.__duelOriginalName;
    delete map.__bossWarpCircle;
    delete map.__bossDoorOpened;
    delete map.__bossSpawned;
    delete map.__stage7Circle;
    delete map.__stage7RushArena;
    delete map.__stage7FinalArena;
    delete map.__stage7AbyssArena;
    delete map.__stage7SavedBoss;
    delete map.__stage7FinalAbyssSource;
  }

  function clearGlobalTemporaryFlags(){
    if(typeof G === "undefined") return;

    /*
      通常ゲーム本体の一時データ
    */
    G.boss = null;
    G.bossDefeatT = 0;
    G.talk = null;
    G.shop = null;

    G.drops = [];
    G.effects = [];
    G.bullets = [];

    /*
      ボスAI / 衝撃波 / ボス弾パッチ系
      ここが残ると、次のステージで「衝撃波」やボス弾が出る
    */
    G.bossBullets = [];
    G.bossZones = [];

    /*
      決闘空間・魔法陣ワープ系
    */
    G.duelTransitionT = 0;
    G.duelTransitionMax = 0;
    G.duelIntroText = "";
    delete G.__duelOriginalStage;

    /*
      Stage7 ボスラッシュ系
      ここが残ると、Stage1でも宇宙背景になることがある
    */
    delete G.__stage7Rush;
    delete G.__stage7FinalAbyss;
    delete G.__stage7RushBossSourceList;
    delete G.__stage7FinalAbyssSource;
    delete G.__stage7RushReturnMap;
    delete G.__stage7RushReturnPlayer;

    /*
      全クリア演出系
    */
    G.__epicAllClear = false;
    G.__epicAllClearT = 0;
    G.__epicAllClearMax = 0;

    /*
      メッセージ連打防止・一時メッセージ系
      message自体は start/load 後にステージ名を出したいので、
      ここでは強制的に空にしない。
    */
    G.__lastShieldReflectMsg = 0;
    G.__lastMagicBossHitMsg = 0;
    G.__lastBossHpScaleMsgKey = "";

    clearMapTemporaryFlags(G.map);
  }

  /*
    start() を包む。
    ゲームオーバー後の再スタート時に、
    前回の背景・弾・衝撃波・ボスラッシュ情報を完全に消す。
  */
  if(typeof start === "function"){
    const oldStartRestartCleanup = start;

    start = function(){
      clearGlobalTemporaryFlags();
      clearInputSafe();

      oldStartRestartCleanup.apply(this, arguments);

      /*
        start() 内の load() 後にも念のため掃除。
        ただし load() が作った G.map / G.player は残す。
      */
      clearGlobalTemporaryFlags();
      clearInputSafe();

      if(G && G.player){
        G.player.inv = Math.max(G.player.inv || 0, 90);
        G.player.dashT = 0;
        G.player.attackT = 0;
        G.player.attackCd = 0;
        G.player.combo = 0;
        G.player.comboT = 0;
      }

      if(G){
        G.state = "field";
      }
    };
  }

  /*
    load() も包む。
    ステージ移動時にも、前ステージの特殊演出が混ざらないようにする。
  */
  if(typeof load === "function"){
    const oldLoadRestartCleanup = load;

    load = function(s, keep){
      clearGlobalTemporaryFlags();
      clearInputSafe();

      oldLoadRestartCleanup.apply(this, arguments);

      clearGlobalTemporaryFlags();
      clearInputSafe();

      /*
        load() 後の基本状態を保証
      */
      if(G){
        G.boss = null;
        G.bossDefeatT = 0;
        G.bossBullets = [];
        G.bossZones = [];
        G.effects = [];
        G.bullets = [];
        G.drops = [];
      }
    };
  }

  /*
    gameover -> title に戻った瞬間も掃除する。
    これでタイトル画面を経由しても残留しない。
  */
  if(typeof update === "function"){
    const oldUpdateRestartCleanup = update;

    update = function(){
      const beforeState = G ? G.state : null;

      oldUpdateRestartCleanup.apply(this, arguments);

      if(G && beforeState === "gameover" && G.state === "title"){
        clearGlobalTemporaryFlags();
        clearInputSafe();

        /*
          タイトルでは前回マップを参照しないようにする。
          start() が呼ばれたら新しい Stage1 が load される。
        */
        G.map = null;
        G.player = null;
        G.enemies = [];
        G.npcs = [];
        G.shops = [];
        G.chests = [];
        G.doors = [];
        G.terrain = [];
      }
    };
  }

})();
/* =========================================================
   覚醒段階 最終上書きパッチ
   貼る場所:
   - game.js の一番最後
   - これまでの覚醒 / マント / 電撃 / 金色覚醒パッチより後ろ

   最終仕様:
   - 全Lv0〜2: 通常
   - 全Lv3以上: 青い人
   - 全Lv5以上: 覚醒前金色
       金色の見た目だけ
       マントなし / 電撃なし / 波動拡散なし
   - 全Lv7以上: 覚醒後金色
       マント + 電撃
   ========================================================= */
(function(){
  if(window.__FINAL_AWAKENING_OVERRIDE_V2_APPLIED) return;
  window.__FINAL_AWAKENING_OVERRIDE_V2_APPLIED = true;

  const TWO_PI = Math.PI * 2;

  function lv(v){
    return Math.max(0, v | 0);
  }

  function gearMin(p){
    if(!p) return 0;
    return Math.min(
      lv(p.swordLv),
      lv(p.shieldLv),
      lv(p.bookLv || p.magicLv)
    );
  }

  function tierOf(p){
    const m = gearMin(p);
    if(m >= 7) return "gold_awaken";
    if(m >= 5) return "pre_gold";
    if(m >= 3) return "blue";
    return "normal";
  }

  function syncAwakeningFinal(p){
    if(!p) return;

    const tier = tierOf(p);

    p.curseLifted = tier === "blue" || tier === "pre_gold" || tier === "gold_awaken";
    p.trueGold = tier === "pre_gold" || tier === "gold_awaken";

    /*
      重要:
      Lv7以上だけ true。
      Lv5では絶対に false。
    */
    p.goldAwaken = tier === "gold_awaken";
    p.trueGoldAwaken = tier === "gold_awaken";
    p.legendAwaken = tier === "gold_awaken";

    p.awakenTier = tier;

    if(tier === "gold_awaken"){
      p.awakenName = "覚醒後金色";
    }else if(tier === "pre_gold"){
      p.awakenName = "覚醒前金色";
    }else if(tier === "blue"){
      p.awakenName = "青い人";
    }else{
      p.awakenName = "通常";
    }
  }

  /*
    旧パッチ由来の「Lv5で覚醒後っぽいメッセージ」を抑止。
    Lv7未満では波動砲 / 電撃 / マント解放系の表示を出さない。
  */
  if(typeof msg === "function" && !msg.__finalAwakeningMsgWrapped){
    const oldMsg = msg;

    msg = function(text, t){
      try{
        const p = typeof G !== "undefined" ? G.player : null;
        const isLv7 = p && gearMin(p) >= 7;
        const s = String(text || "");

        if(!isLv7){
          if(
            s.includes("波動") ||
            s.includes("八方向") ||
            s.includes("電撃") ||
            s.includes("マント") ||
            s.includes("覚醒後") ||
            s.includes("伝説の力")
          ){
            return;
          }
        }
      }catch(e){}

      return oldMsg.apply(this, arguments);
    };

    msg.__finalAwakeningMsgWrapped = true;
  }

  function colorsByTier(p){
    const tier = tierOf(p);

    if(tier === "gold_awaken"){
      return {
        tier,
        body: "#ffd84d",
        bodyDark: "#d99a22",
        outline: "#7b5b16",
        face: "#ffe4bd",
        hair: "#fff7a8",
        sword: "#fff7a8",
        swordCore: "#ffffff",
        shield: "#ffd84d",
        trail: "#fff7a8",
        trail2: "#ffffff",
        cape1: "#fff7a8",
        cape2: "#ffd84d",
        cape3: "#8f5f18"
      };
    }

    if(tier === "pre_gold"){
      return {
        tier,
        body: "#ffd84d",
        bodyDark: "#d99a22",
        outline: "#7b5b16",
        face: "#ffe4bd",
        hair: "#fff7a8",
        sword: "#fff7a8",
        swordCore: "#ffffff",
        shield: "#ffd84d",
        trail: "#ffd84d",
        trail2: "#fff7a8",
        cape1: "",
        cape2: "",
        cape3: ""
      };
    }

    if(tier === "blue"){
      return {
        tier,
        body: "#2f8cff",
        bodyDark: "#1f62d0",
        outline: "#143f8f",
        face: "#ffe4bd",
        hair: "#f4c35a",
        sword: "#9ef7ff",
        swordCore: "#ffffff",
        shield: "#35c7ff",
        trail: "#9ef7ff",
        trail2: "#63d8ff",
        cape1: "",
        cape2: "",
        cape3: ""
      };
    }

    return {
      tier,
      body: "#8b5a32",
      bodyDark: "#6b4328",
      outline: "#4a2c1c",
      face: "#a8784a",
      hair: "#5b3520",
      sword: "#e9fbff",
      swordCore: "#ffffff",
      shield: "#346bd8",
      trail: "#fff7a8",
      trail2: "#ffffff",
      cape1: "",
      cape2: "",
      cape3: ""
    };
  }

  function clamp(v,a,b){
    return Math.max(a, Math.min(b, v));
  }

  function easeInOut(t){
    return 0.5 - Math.cos(t * Math.PI) * 0.5;
  }

  function easeOutBack(t){
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

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

  function drawShadow(ctx){
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = "rgba(0,25,40,.42)";
    ctx.beginPath();
    ctx.ellipse(0, 23, 27, 8, 0, 0, TWO_PI);
    ctx.fill();
    ctx.restore();
  }

  function drawSword(ctx, c, length){
    length = length || 42;

    ctx.save();

    ctx.shadowBlur = 10;
    ctx.shadowColor = c.sword;

    ctx.strokeStyle = "rgba(20,25,35,.72)";
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, 5);
    ctx.lineTo(0, -length);
    ctx.stroke();

    const grad = ctx.createLinearGradient(-3, -length, 3, 6);
    grad.addColorStop(0, c.swordCore);
    grad.addColorStop(0.45, c.sword);
    grad.addColorStop(1, "#89cfff");

    ctx.strokeStyle = grad;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 5);
    ctx.lineTo(0, -length);
    ctx.stroke();

    ctx.fillStyle = c.swordCore;
    ctx.beginPath();
    ctx.moveTo(0, -length - 7);
    ctx.lineTo(-4, -length + 2);
    ctx.lineTo(4, -length + 2);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#6b4a2a";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-9, 5);
    ctx.lineTo(9, 5);
    ctx.stroke();

    ctx.strokeStyle = "#3b2b20";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 5);
    ctx.lineTo(0, 15);
    ctx.stroke();

    ctx.restore();
  }

  function drawShield(ctx, c, scale){
    scale = scale || 1;

    ctx.save();
    ctx.scale(scale, scale);

    const grad = ctx.createLinearGradient(-12, -14, 14, 18);
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.35, c.shield);
    grad.addColorStop(1, "#1a418e");

    ctx.fillStyle = grad;
    ctx.strokeStyle = c.swordCore;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(-11, -15);
    ctx.lineTo(8, -17);
    ctx.lineTo(15, -1);
    ctx.lineTo(4, 18);
    ctx.lineTo(-14, 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,.24)";
    ctx.beginPath();
    ctx.moveTo(-5, -10);
    ctx.lineTo(5, -12);
    ctx.lineTo(8, -1);
    ctx.lineTo(1, 11);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  function getProgress(p, combo){
    if(!(p.attackT > 0)) return 0;
    const total = combo === 3 ? 18 : 12;
    return clamp(1 - p.attackT / total, 0, 1);
  }

  function getPose(p, dir, combo, progress){
    const hit = Math.sin(progress * Math.PI);
    const cut = easeInOut(progress);

    const pose = {
      bodyRot: 0,
      bodyX: 0,
      bodyY: 0,
      headX: 0,
      headY: 0,
      swordX: 18,
      swordY: 2,
      swordAngle: -0.35,
      swordLen: 38,
      shieldX: -18,
      shieldY: 4,
      shieldAngle: -0.15,
      shieldScale: 0.86,
      footA: 0,
      footB: 0
    };

    if(!(p.attackT > 0)){
      return pose;
    }

    const isUp = dir === "up";
    const isSide = dir === "left" || dir === "right";

    if(combo === 1){
      const s = easeOutBack(clamp((progress - 0.10) / 0.75, 0, 1));

      if(isSide){
        pose.bodyX = 4 * hit;
        pose.bodyRot = -0.05 + 0.12 * s;
        pose.swordX = 18 + 18 * s;
        pose.swordY = -12 + 18 * s;
        pose.swordAngle = -2.00 + 1.95 * s;
        pose.shieldX = -16;
        pose.shieldY = 5;
      }else if(isUp){
        pose.bodyY = -2 * hit;
        pose.bodyRot = 0.08 - 0.14 * s;
        pose.swordX = -16 - 9 * s;
        pose.swordY = -6 - 15 * s;
        pose.swordAngle = 2.15 - 1.85 * s;
        pose.shieldX = 18;
        pose.shieldY = 4;
      }else{
        pose.bodyY = 1 * hit;
        pose.bodyRot = -0.10 + 0.18 * s;
        pose.swordX = 12 + 14 * s;
        pose.swordY = -10 + 18 * s;
        pose.swordAngle = -2.35 + 2.15 * s;
        pose.shieldX = -18;
        pose.shieldY = 4;
      }

      pose.swordLen = 42;
      pose.footA = -3 * hit;
      pose.footB = 5 * hit;
    }

    if(combo === 2){
      const s = cut;

      if(isSide){
        pose.bodyX = 6 * hit;
        pose.bodyRot = 0.12 - 0.20 * s;
        pose.swordX = 38 - 30 * s;
        pose.swordY = 3 - 18 * s;
        pose.swordAngle = 0.50 - 1.95 * s;
        pose.shieldX = -16 + 4 * hit;
        pose.shieldY = 2;
      }else if(isUp){
        pose.bodyY = -1 * hit;
        pose.bodyRot = -0.12 + 0.22 * s;
        pose.swordX = 24 - 30 * s;
        pose.swordY = -18 + 18 * s;
        pose.swordAngle = -0.45 + 1.95 * s;
        pose.shieldX = 18 - 5 * hit;
        pose.shieldY = 3;
      }else{
        pose.bodyY = 1 * hit;
        pose.bodyRot = 0.16 - 0.30 * s;
        pose.swordX = 28 - 22 * s;
        pose.swordY = 8 - 22 * s;
        pose.swordAngle = 0.72 - 2.15 * s;
        pose.shieldX = -18 + 5 * hit;
        pose.shieldY = 2;
      }

      pose.swordLen = 44;
      pose.footA = 4 * hit;
      pose.footB = -4 * hit;
    }

    if(combo === 3){
      const spin = progress * TWO_PI;
      const r = isSide ? 25 : 23;

      pose.bodyRot = isSide ? Math.sin(spin) * 0.12 : spin * 0.10;
      pose.bodyX = isSide ? 3 * hit : 0;
      pose.bodyY = isUp ? -1 * hit : 1 * hit;

      if(isSide){
        pose.swordX = Math.cos(spin) * r + 8;
        pose.swordY = Math.sin(spin) * r * 0.72;
      }else if(isUp){
        pose.swordX = Math.cos(spin + Math.PI) * r;
        pose.swordY = -4 + Math.sin(spin + Math.PI) * r * 0.72;
      }else{
        pose.swordX = Math.cos(spin - 0.15) * r;
        pose.swordY = Math.sin(spin - 0.15) * r * 0.72;
      }

      pose.swordAngle = spin + Math.PI / 2;
      pose.swordLen = 48;

      pose.shieldX = -pose.swordX * 0.65;
      pose.shieldY = -pose.swordY * 0.55;
      pose.shieldAngle = spin * 0.7;
      pose.shieldScale = 0.78;

      pose.footA = Math.sin(spin) * 5;
      pose.footB = -Math.sin(spin) * 5;
    }

    return pose;
  }

  function drawSlash(ctx, p, c, dir, combo, progress){
    if(!(p.attackT > 0)) return;

    const alpha = Math.sin(progress * Math.PI);
    if(alpha <= 0.01) return;

    const isUp = dir === "up";
    const isSide = dir === "left" || dir === "right";

    ctx.save();
    ctx.globalAlpha = 0.65 * alpha;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowBlur = 18;
    ctx.shadowColor = c.trail;
    ctx.strokeStyle = c.trail;

    if(combo === 1){
      ctx.lineWidth = 5;
      ctx.beginPath();

      if(isSide){
        ctx.moveTo(14, -26);
        ctx.quadraticCurveTo(42, -8, 43, 20);
      }else if(isUp){
        ctx.moveTo(-12, -30);
        ctx.quadraticCurveTo(-36, -14, -40, 16);
      }else{
        ctx.moveTo(8, -28);
        ctx.quadraticCurveTo(36, -12, 42, 20);
      }

      ctx.stroke();
    }else if(combo === 2){
      ctx.lineWidth = 6;
      ctx.beginPath();

      if(isSide){
        ctx.moveTo(45, -16);
        ctx.quadraticCurveTo(18, 4, 2, 24);
      }else if(isUp){
        ctx.moveTo(36, -18);
        ctx.quadraticCurveTo(12, 2, -20, 22);
      }else{
        ctx.moveTo(42, -20);
        ctx.quadraticCurveTo(20, 2, -3, 24);
      }

      ctx.stroke();
    }else{
      ctx.scale(1, 0.72);
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(0, 0, 50 + alpha * 8, progress * TWO_PI, progress * TWO_PI + Math.PI * 1.55);
      ctx.stroke();

      ctx.globalAlpha = 0.38 * alpha;
      ctx.strokeStyle = c.trail2;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 34 + alpha * 5, progress * TWO_PI + Math.PI * 0.7, progress * TWO_PI + Math.PI * 2.05);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawLegs(ctx, c, pose, walk, view){
    ctx.save();

    const side = view === "side";

    ctx.strokeStyle = c.outline;
    ctx.lineWidth = 7;
    ctx.lineCap = "round";

    ctx.beginPath();

    if(side){
      ctx.moveTo(-4, 9);
      ctx.lineTo(-8 + pose.footA + walk * 2, 28);
      ctx.moveTo(5, 9);
      ctx.lineTo(10 + pose.footB - walk * 2, 28);
    }else{
      ctx.moveTo(-6, 9);
      ctx.lineTo(-11 + pose.footA + walk * 2, 28);
      ctx.moveTo(6, 9);
      ctx.lineTo(11 + pose.footB - walk * 2, 28);
    }

    ctx.stroke();

    ctx.strokeStyle = c.bodyDark;
    ctx.lineWidth = 5;
    ctx.beginPath();

    if(side){
      ctx.moveTo(-4, 10);
      ctx.lineTo(-8 + pose.footA + walk * 2, 28);
      ctx.moveTo(5, 10);
      ctx.lineTo(10 + pose.footB - walk * 2, 28);
    }else{
      ctx.moveTo(-6, 10);
      ctx.lineTo(-11 + pose.footA + walk * 2, 28);
      ctx.moveTo(6, 10);
      ctx.lineTo(11 + pose.footB - walk * 2, 28);
    }

    ctx.stroke();

    ctx.fillStyle = "#263149";
    rr(ctx, -17 + pose.footA + walk * 2, 27, 14, 5, 3);
    ctx.fill();
    rr(ctx, 3 + pose.footB - walk * 2, 27, 14, 5, 3);
    ctx.fill();

    ctx.restore();
  }

  function drawBody(ctx, c, pose, view){
    ctx.save();
    ctx.translate(pose.bodyX, pose.bodyY);
    ctx.rotate(pose.bodyRot);

    const grad = ctx.createLinearGradient(0, -18, 0, 16);
    grad.addColorStop(0, c.body);
    grad.addColorStop(1, c.bodyDark);

    ctx.fillStyle = grad;
    ctx.strokeStyle = c.outline;
    ctx.lineWidth = 2;

    if(view === "side"){
      ctx.beginPath();
      ctx.ellipse(0, -2, 9, 17, 0, 0, TWO_PI);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#6b4a2a";
      ctx.fillRect(-8, 7, 16, 4);
    }else{
      ctx.beginPath();
      ctx.moveTo(0, -18);
      ctx.lineTo(13, -5);
      ctx.lineTo(9, 14);
      ctx.lineTo(-9, 14);
      ctx.lineTo(-13, -5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      if(view === "front"){
        ctx.fillStyle = "rgba(255,255,255,.18)";
        ctx.beginPath();
        ctx.moveTo(-5, -13);
        ctx.lineTo(0, -4);
        ctx.lineTo(5, -13);
        ctx.closePath();
        ctx.fill();
      }

      ctx.fillStyle = "#6b4a2a";
      ctx.fillRect(-10, 7, 20, 4);
    }

    ctx.restore();
  }

  function drawHead(ctx, p, c, pose, view){
    ctx.save();
    ctx.translate(pose.headX, pose.headY);

    ctx.fillStyle = c.face;
    rr(ctx, -4, -21, 8, 7, 3);
    ctx.fill();

    ctx.fillStyle = view === "back" && p.curseLifted ? c.hair : c.face;
    ctx.strokeStyle = c.outline;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, -30, 10, 10.5, 0, 0, TWO_PI);
    ctx.fill();
    ctx.stroke();

    if(p.curseLifted){
      ctx.fillStyle = c.hair;
      ctx.beginPath();
      ctx.ellipse(0, -36, 10.8, 5.6, 0, 0, TWO_PI);
      ctx.fill();

      if(view !== "back"){
        ctx.beginPath();
        ctx.ellipse(-5, -35, 4, 4, -0.4, 0, TWO_PI);
        ctx.ellipse(2, -37, 5, 4, 0.2, 0, TWO_PI);
        ctx.ellipse(6, -34, 3, 4, 0.4, 0, TWO_PI);
        ctx.fill();
      }
    }else{
      ctx.fillStyle = "#6b3e24";
      ctx.strokeStyle = c.outline;
      ctx.lineWidth = 1;

      ctx.beginPath();
      ctx.ellipse(-8, -37, 5, 7, -0.8, 0, TWO_PI);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(8, -37, 5, 7, 0.8, 0, TWO_PI);
      ctx.fill();
      ctx.stroke();
    }

    if(view !== "back"){
      ctx.fillStyle = "#172334";

      if(view === "side"){
        ctx.fillRect(4, -31, 2, 2);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(4.4, -31, 1, 1);
      }else{
        ctx.fillRect(-4, -31, 2, 2);
        ctx.fillRect(3, -31, 2, 2);

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(-3.6, -31, 1, 1);
        ctx.fillRect(3.4, -31, 1, 1);
      }
    }

    ctx.restore();
  }

  function drawArmsGear(ctx, c, pose, view){
    const back = view === "back";

    const swordShoulderX = back ? -10 : 10;
    const shieldShoulderX = back ? 10 : -10;

    ctx.save();
    ctx.strokeStyle = c.outline;
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(shieldShoulderX, -6);
    ctx.lineTo(pose.shieldX, pose.shieldY);
    ctx.stroke();

    ctx.strokeStyle = c.bodyDark;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(shieldShoulderX, -6);
    ctx.lineTo(pose.shieldX, pose.shieldY);
    ctx.stroke();

    ctx.translate(pose.shieldX, pose.shieldY);
    ctx.rotate(pose.shieldAngle);
    drawShield(ctx, c, pose.shieldScale);
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = c.outline;
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(swordShoulderX, -6);
    ctx.lineTo(pose.swordX, pose.swordY);
    ctx.stroke();

    ctx.strokeStyle = c.bodyDark;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(swordShoulderX, -6);
    ctx.lineTo(pose.swordX, pose.swordY);
    ctx.stroke();

    ctx.translate(pose.swordX, pose.swordY);
    ctx.rotate(pose.swordAngle);
    drawSword(ctx, c, pose.swordLen);
    ctx.restore();
  }

  function drawCape(ctx, p, c, dir, time){
    /*
      Lv7以上だけ。
      Lv5では呼ばれない。
    */
    if(tierOf(p) !== "gold_awaken") return;

    const flap = Math.sin((time || 0) * 0.08) * 3;

    ctx.save();

    if(dir === "up"){
      const g = ctx.createLinearGradient(0, -22, 0, 45);
      g.addColorStop(0, c.cape1);
      g.addColorStop(0.36, c.cape2);
      g.addColorStop(1, c.cape3);

      ctx.fillStyle = g;
      ctx.strokeStyle = "rgba(255,255,255,.34)";
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      ctx.moveTo(-19, -18);
      ctx.lineTo(19, -18);
      ctx.quadraticCurveTo(28, 3 + flap, 22, 35);
      ctx.lineTo(10, 28 + flap * 0.45);
      ctx.lineTo(0, 44);
      ctx.lineTo(-10, 28 - flap * 0.45);
      ctx.lineTo(-22, 35);
      ctx.quadraticCurveTo(-28, 3 - flap, -19, -18);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
else if(dir === "left" || dir === "right"){
      const g = ctx.createLinearGradient(-34, -18, 8, 38);
      g.addColorStop(0, c.cape1);
      g.addColorStop(0.36, c.cape2);
      g.addColorStop(1, c.cape3);

      ctx.fillStyle = g;
      ctx.strokeStyle = "rgba(255,255,255,.28)";
      ctx.lineWidth = 1.3;

      ctx.beginPath();
      ctx.moveTo(-5, -15);
      ctx.quadraticCurveTo(-29, -8 + flap, -34, 16);
      ctx.quadraticCurveTo(-28, 36, -8, 30);
      ctx.quadraticCurveTo(4, 20 + flap * 0.25, 6, 0);
      ctx.lineTo(5, -13);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }else{
      const g = ctx.createLinearGradient(0, -16, 0, 38);
      g.addColorStop(0, c.cape1);
      g.addColorStop(0.36, c.cape2);
      g.addColorStop(1, c.cape3);

      ctx.fillStyle = g;
      ctx.strokeStyle = "rgba(255,255,255,.26)";
      ctx.lineWidth = 1.2;

      /*
        正面は前掛け防止で外側と下端だけ。
      */
      ctx.beginPath();
      ctx.moveTo(-13, -13);
      ctx.quadraticCurveTo(-30, 0 + flap, -28, 24);
      ctx.quadraticCurveTo(-22, 36 + flap, -10, 28);
      ctx.quadraticCurveTo(-14, 10, -13, -13);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(13, -13);
      ctx.quadraticCurveTo(30, 0 - flap, 28, 24);
      ctx.quadraticCurveTo(22, 36 - flap, 10, 28);
      ctx.quadraticCurveTo(14, 10, 13, -13);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawBolt(ctx, x1, y1, x2, y2, parts, jitter){
    const pts = [{x:x1, y:y1}];

    for(let i = 1; i < parts; i++){
      const t = i / parts;
      const x = x1 + (x2 - x1) * t;
      const y = y1 + (y2 - y1) * t;

      const nx = -(y2 - y1);
      const ny = x2 - x1;
      const len = Math.hypot(nx, ny) || 1;

      pts.push({
        x: x + nx / len * (Math.random() * 2 - 1) * jitter,
        y: y + ny / len * (Math.random() * 2 - 1) * jitter
      });
    }

    pts.push({x:x2, y:y2});

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for(let i = 1; i < pts.length; i++){
      ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.stroke();
  }

  function drawLightningScreen(ctx, p, wx, wy, time){
    /*
      Lv7以上だけ。
      Lv5では出さない。
      波動拡散系の丸いオーラは描かない。
    */
    if(tierOf(p) !== "gold_awaken") return;

    const x = wx(p.x);
    const y = wy(p.y);
    const cx = x + p.w / 2;
    const cy = y + p.h / 2 + 4;
    const t = time || 0;

    ctx.save();

    ctx.globalAlpha = 0.92;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.shadowBlur = 18;
    ctx.shadowColor = "#fff7a8";

    const count = 5 + ((t / 7) | 0) % 3;

    for(let i = 0; i < count; i++){
      const a1 = t * 0.10 + i / count * TWO_PI;
      const a2 = a1 + 0.65 + Math.sin(t * 0.04 + i) * 0.25;

      const x1 = cx + Math.cos(a1) * 24;
      const y1 = cy + Math.sin(a1) * 34;
      const x2 = cx + Math.cos(a2) * 40;
      const y2 = cy + Math.sin(a2) * 52;

      drawBolt(ctx, x1, y1, x2, y2, 5, 7);
    }

    ctx.globalAlpha = 0.90;
    ctx.fillStyle = "#fff7a8";
    ctx.shadowBlur = 12;
    ctx.shadowColor = "#ffd84d";

    for(let i = 0; i < 10; i++){
      const a = t * 0.06 + i / 10 * TWO_PI;
      const r = 24 + (i % 4) * 6;
      const px = cx + Math.cos(a) * r;
      const py = cy + Math.sin(a) * r * 1.25;

      ctx.beginPath();
      ctx.arc(px, py, 1.4 + (i % 2), 0, TWO_PI);
      ctx.fill();
    }

    ctx.restore();
  }

  function finalHeroDraw(ctx, p, wx, wy, time, atkBox){
    if(!p) return;

    syncAwakeningFinal(p);

    if(p.inv > 0 && p.inv % 8 < 4){
      return;
    }

    /*
      Lv5以下で旧波動メッセージが残っていたら消す。
    */
    if(tierOf(p) !== "gold_awaken" && typeof G !== "undefined"){
      const s = String(G.message || "");
      if(
        s.includes("波動") ||
        s.includes("八方向") ||
        s.includes("電撃") ||
        s.includes("マント") ||
        s.includes("覚醒後")
      ){
        G.message = "";
        G.messageT = 0;
      }
    }

    const x = wx(p.x);
    const y = wy(p.y);
    const cx = x + p.w / 2;
    const cy = y + p.h / 2;

 const moveAmount =
  Math.abs(p.vx || 0) +
  Math.abs(p.vy || 0) +
  ((p.dashT || 0) > 0 ? 1.0 : 0);

/*
  移動量を0〜1に正規化。
  速く動いているほど歩幅・揺れを大きくする。
*/
const moveRate = clamp(moveAmount / 1.8, 0, 1);

/*
  歩行アニメ速度。
  止まっている時はゆっくり呼吸、
  移動中はテンポよく足を動かす。
*/
p.anim = (p.anim || 0) + 0.035 + moveRate * 0.16;

/*
  足の前後運動。
  旧版より少し大きめにして、歩いている感を出す。
*/
const walk = Math.sin(p.anim) * (moveRate > 0.05 ? 1.65 : 0.18);

/*
  上下の揺れ。
  人が歩く時は足を出すたびに少し上下するので、
  sinを2倍周期にして「トン、トン」という感じにする。
*/
const stepBounce = Math.max(0, -Math.cos(p.anim * 2));

const bob = moveRate > 0.05
  ? stepBounce * (1.2 + moveRate * 1.2)
  : Math.sin((time || 0) * 0.05) * 0.45;

    const dir = p.dir || "down";
    const combo = clamp(p.combo || 1, 1, 3);
    const progress = getProgress(p, combo);

    const c = colorsByTier(p);
    const pose = getPose(p, dir, combo, progress);

    let view = "front";
    let flip = 1;

    if(dir === "up"){
      view = "back";
    }else if(dir === "left"){
      view = "side";
      flip = -1;
    }else if(dir === "right"){
      view = "side";
      flip = 1;
    }else{
      view = "front";
    }

ctx.save();
ctx.translate(cx, cy + bob + 4);
ctx.scale(flip, 1);
ctx.scale(1, 0.86);

/*
  移動方向への体の傾き。
  これを入れると、ただ滑っている感じではなく
  体重移動して歩いている感じになる。
*/
const leanX = clamp((p.vx || 0) * 2.2, -2.6, 2.6);
const leanY = clamp((p.vy || 0) * 1.2, -1.8, 1.8);
const leanRot = clamp((p.vx || 0) * 0.035, -0.08, 0.08);

ctx.translate(leanX, leanY);
ctx.rotate(leanRot);

drawShadow(ctx);
drawSlash(ctx, p, c, dir, combo, progress);

if(view === "back"){
  /*
    上向き時だけ、マントを最後に描く。
    Canvasでは後に描いたものが最前面になる。
  */
  drawArmsGear(ctx, c, pose, view);
  drawLegs(ctx, c, pose, walk, view);
  drawBody(ctx, c, pose, view);
  drawHead(ctx, p, c, pose, view);

  // 上向き時はマントを最前面へ
  drawCape(ctx, p, c, dir, time);

}else{
  /*
    正面・横向きは今まで通り、マントを先に描く。
  */
  drawCape(ctx, p, c, dir, time);
  drawLegs(ctx, c, pose, walk, view);
  drawBody(ctx, c, pose, view);
  drawArmsGear(ctx, c, pose, view);
  drawHead(ctx, p, c, pose, view);
}

    ctx.restore();

    /*
      Lv7の電撃は画面座標で上乗せ。
    */
    drawLightningScreen(ctx, p, wx, wy, time);
  }

  /*
    ここで完全に上書き。
    旧マント・旧電撃・旧波動系の drawHero ラッパーは呼ばない。
  */
  window.drawHeroAdventurer3D = finalHeroDraw;

  try{
    drawHeroAdventurer3D = finalHeroDraw;
  }catch(e){}

  /*
    注: ここで checkAwaken を上書きしていたが、さらに後の
    「主人公成長仕様 最終上書きパッチ v3」が checkAwaken を
    再度完全に上書きするため、このバージョンは実際には呼ばれない
    （該当のメッセージ・色変化は v3 側の applyGrowthStats に統合済み）。
    削除済み。syncAwakeningFinal 自体は下の update ラップと
    描画用の colorsByTier/tierOf から使われているため残す。
  */

  if(typeof update === "function" && !update.__finalAwakeningOverrideWrapped){
    const oldUpdate = update;

    update = function(){
      oldUpdate.apply(this, arguments);

      if(typeof G !== "undefined" && G.player){
        syncAwakeningFinal(G.player);

        /*
          Lv7未満で旧演出の残留メッセージを消す。
        */
        if(tierOf(G.player) !== "gold_awaken"){
          const s = String(G.message || "");
          if(
            s.includes("波動") ||
            s.includes("八方向") ||
            s.includes("電撃") ||
            s.includes("マント") ||
            s.includes("覚醒後")
          ){
            G.message = "";
            G.messageT = 0;
          }
        }
      }
    };

    update.__finalAwakeningOverrideWrapped = true;
  }

  if(typeof G !== "undefined" && G.player){
    syncAwakeningFinal(G.player);
  }

})();
/* =========================================================
   主人公成長仕様 最終上書きパッチ v3
   仕様:
   - 剣盾本 Lv3以上:
       青い人
       波動砲なし
   - 剣盾本 Lv5以上:
       黄色い人
       キラキラなし
       マントなし
       ステータスアップ
       前方のみ波動砲
   - 剣盾本 Lv7以上:
       黄色い人
       キラキラあり
       背中にマントあり
       全方向波動砲解禁
   貼る場所:
   - game.js の一番最後
   ========================================================= */

(function(){
  if(window.__heroGrowthFinalSpecV3Applied) return;
  window.__heroGrowthFinalSpecV3Applied = true;

  const TWO_PI = Math.PI * 2;

  function lv(v){
    return Math.max(0, v | 0);
  }

  function gearMin(p){
    if(!p) return 0;
    return Math.min(
      lv(p.swordLv),
      lv(p.shieldLv),
      lv(p.bookLv || p.magicLv)
    );
  }

  function growthTier(p){
    const m = gearMin(p);
    if(m >= 7) return 7;
    if(m >= 5) return 5;
    if(m >= 3) return 3;
    return 0;
  }

  function syncHeroGrowthFlags(p){
    if(!p) return;

    const tier = growthTier(p);

    p.heroGrowthTier = tier;

    /*
      既存描画パッチとの互換用フラグ。
      curseLifted = 人型化
      trueGold = 黄色化
      goldAwaken / trueGoldAwaken / legendAwaken = Lv7専用
    */
    p.curseLifted = tier >= 3;
    p.trueGold = tier >= 5;

    p.goldAwaken = tier >= 7;
    p.trueGoldAwaken = tier >= 7;
    p.legendAwaken = tier >= 7;

    if(tier >= 7){
      p.awakenTier = "gold_awaken";
      p.awakenName = "黄金覚醒";
    }else if(tier >= 5){
      p.awakenTier = "pre_gold";
      p.awakenName = "黄色い人";
    }else if(tier >= 3){
      p.awakenTier = "blue";
      p.awakenName = "青い人";
    }else{
      p.awakenTier = "normal";
      p.awakenName = "通常";
    }
  }

  /*
    ステータスアップ。
    二重に加算されないよう、到達済み段階を保存する。
  */
  function applyGrowthStats(p){
    if(!p) return;

    const tier = growthTier(p);
    p.__growthStatsAppliedTier = p.__growthStatsAppliedTier || 0;

    /*
      Lv3:
      青い人化。ここでは軽めの基礎成長。
    */
    if(tier >= 3 && p.__growthStatsAppliedTier < 3){
      p.maxHp += 6;
      p.hp = p.maxHp;

      p.maxMp += 3;
      p.mp = p.maxMp;

      p.atk += 2;
      p.def += 1;
      p.magic += 2;
      p.speed += 0.20;

      p.__growthStatsAppliedTier = 3;

      if(typeof msg === "function"){
        msg("青い力に目覚めた！", 130);
      }
    }

    /*
      Lv5:
      黄色い人化。
      キラキラなし / マントなし / 前方波動砲。
      ここがメインのステータスアップ。
    */
    if(tier >= 5 && p.__growthStatsAppliedTier < 5){
      p.maxHp += 10;
      p.hp = p.maxHp;

      p.maxMp += 5;
      p.mp = p.maxMp;

      p.atk += 4;
      p.def += 3;
      p.magic += 3;
      p.speed += 0.22;

      p.__growthStatsAppliedTier = 5;

      if(typeof msg === "function"){
        msg("黄色い力に覚醒！ 前方波動砲を習得した！", 150);
      }
    }

    /*
      Lv7:
      完全覚醒。
      キラキラ + マント + 全方向波動砲。
      ステータスも少し追加。
    */
    if(tier >= 7 && p.__growthStatsAppliedTier < 7){
      p.maxHp += 12;
      p.hp = p.maxHp;

      p.maxMp += 6;
      p.mp = p.maxMp;

      p.atk += 4;
      p.def += 3;
      p.magic += 4;
      p.speed += 0.18;

      p.__growthStatsAppliedTier = 7;

      if(typeof msg === "function"){
        msg("黄金完全覚醒！ マントと全方向波動砲が解放された！", 180);
      }
    }

    syncHeroGrowthFlags(p);
  }

  /*
    checkAwaken を新仕様に上書き。
    ショップ強化時に呼ばれるので、ここで成長を反映する。
  */
  checkAwaken = function(){
    if(typeof G === "undefined" || !G.player) return;
    applyGrowthStats(G.player);
  };

  /*
    色判定。
    既存の drawHeroAdventurer3D をそのまま使う場合でも、
    p.trueGold / p.goldAwaken のフラグで見た目が変わる。
  */
  function heroColor(p){
    const tier = growthTier(p);
    if(tier >= 5) return "#ffd84d";
    if(tier >= 3) return "#63d8ff";
    return "#9ef7ff";
  }

  function hitSafe(a,b){
    return a && b &&
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y;
  }

  function distHitSafe(a,cx,cy,r){
    if(!a) return false;
    const ex = a.x + a.w / 2;
    const ey = a.y + a.h / 2;
    return (ex - cx) * (ex - cx) + (ey - cy) * (ey - cy) <= r * r;
  }

  function waveAngle(dx,dy){
    return Math.atan2(dy,dx);
  }

  function waveSize(dx,dy,tier){
    const diagonal = Math.abs(dx) > 0 && Math.abs(dy) > 0;
    const strong = tier >= 7;

    if(diagonal){
      return {
        w: strong ? 44 : 36,
        h: strong ? 44 : 36,
        visualLen: strong ? 78 : 62,
        visualThick: strong ? 30 : 24
      };
    }

    if(Math.abs(dx) > 0){
      return {
        w: strong ? 58 : 48,
        h: strong ? 28 : 24,
        visualLen: strong ? 92 : 76,
        visualThick: strong ? 34 : 28
      };
    }

    return {
      w: strong ? 28 : 24,
      h: strong ? 58 : 48,
      visualLen: strong ? 92 : 76,
      visualThick: strong ? 34 : 28
    };
  }

  function addWaveSpark(x,y,color,angle){
    if(!Array.isArray(G.effects)) G.effects = [];

    const back = angle + Math.PI;

    for(let i=0;i<4;i++){
      const a = back + (Math.random() - 0.5) * 0.8;
      const sp = 0.8 + Math.random() * 1.8;

      G.effects.push({
        type:"growth_wave_spark",
        x:x + (Math.random() - 0.5) * 18,
        y:y + (Math.random() - 0.5) * 18,
        vx:Math.cos(a) * sp,
        vy:Math.sin(a) * sp,
        life:18 + Math.floor(Math.random() * 10),
        max:28,
        color,
        size:2 + Math.random() * 2
      });
    }
  }

  function shootWaveDir(dx,dy,opt){
    const p = G.player;
    if(!p) return;

    opt = opt || {};

    const tier = growthTier(p);
    const n = nrm(dx,dy);
    const s = waveSize(dx,dy,tier);
    const color = opt.color || heroColor(p);
    const angle = waveAngle(n.x,n.y);

    G.bullets.push({
      x:p.x + p.w / 2 - s.w / 2,
      y:p.y + p.h / 2 - s.h / 2,
      w:s.w,
      h:s.h,
      vx:n.x * (opt.speed || (tier >= 7 ? 7.8 : 7.0)),
      vy:n.y * (opt.speed || (tier >= 7 ? 7.8 : 7.0)),
      life:opt.life || (tier >= 7 ? 90 : 78),
      maxLife:opt.life || (tier >= 7 ? 90 : 78),
      dmg:opt.dmg || Math.max(2, Math.round((p.atk || 3) * (tier >= 7 ? 0.9 : 0.75))),
      magic:true,
      wave:true,
      growthWave:true,
      angle,
      visualLen:s.visualLen,
      visualThick:s.visualThick,
      radius:opt.radius || (tier >= 7 ? 46 : 36),
      color,
      pulseSeed:Math.random() * TWO_PI
    });

    addWaveSpark(p.x + p.w / 2, p.y + p.h / 2, color, angle);
  }

  /*
    Lv5:
    前方のみ波動砲。
  */
  function shootForwardWave(baseDamage){
    const p = G.player;
    if(!p) return;

    const color = "#ffd84d";

    const opt = {
      speed:7.1,
      life:80,
      dmg:Math.max(2, Math.round((baseDamage || p.atk || 3) * 0.82)),
      radius:38,
      color
    };

    if(p.dir === "up") shootWaveDir(0,-1,opt);
    else if(p.dir === "down") shootWaveDir(0,1,opt);
    else if(p.dir === "left") shootWaveDir(-1,0,opt);
    else shootWaveDir(1,0,opt);
  }

  /*
    Lv7:
    全方向波動砲。
  */
  function shootAllDirectionWave(baseDamage){
    const p = G.player;
    if(!p) return;

    const dirs = [
      [1,0],
      [-1,0],
      [0,1],
      [0,-1],
      [1,1],
      [1,-1],
      [-1,1],
      [-1,-1]
    ];

    const color = "#fff7a8";
    const dmg = Math.max(3, Math.round((baseDamage || p.atk || 3) * 0.90));

    for(const d of dirs){
      shootWaveDir(d[0],d[1],{
        speed:7.8,
        life:92,
        dmg,
        radius:48,
        color
      });
    }

    if(typeof ring === "function"){
      ring(p.x + p.w / 2, p.y + p.h / 2, 130, color);
    }

    if(typeof msg === "function"){
      msg("全方向波動砲！", 58);
    }
  }

  /*
    attack を新仕様に最終上書き。
    - Lv3: 青い人だけ。波動砲なし。
    - Lv5: 前方波動砲。
    - Lv7: 全方向波動砲。
  */
  attack = function(){
    const p = G.player;
    if(!p) return;

    applyGrowthStats(p);

    const tier = growthTier(p);
    const st = G.stageIndex || 0;

    p.combo = p.combo % 3 + 1;
    p.comboT = 38;

    const sweep = p.combo === 3;

    const r = sweep
      ? (tier >= 7 ? 96 : tier >= 5 ? 84 : tier >= 3 ? 74 : 70)
      : 0;

    p.attackT = sweep ? 18 : 12;
    p.attackCd = sweep ? 18 : 12;

    const a = atkBox();

    const atkMul = st >= 4
      ? (tier >= 7 ? 0.84 : tier >= 5 ? 0.88 : 0.92)
      : 1;

    const d = p.atk * atkMul * (sweep ? 1.35 : 1);

    /*
      波動砲条件:
      Lv5以上で前方波動砲。
      Lv7以上で全方向波動砲。
      3段目だけ発射にすると強すぎにくい。
    */
    if(sweep){
      if(tier >= 7){
        shootAllDirectionWave(d);
      }else if(tier >= 5){
        shootForwardWave(d);
      }
    }

    /*
      既存の近接攻撃。
    */
    if(sweep){
      const cx = p.x + p.w / 2;
      const cy = p.y + p.h / 2;
      const rr = st >= 4 && tier >= 7 ? Math.round(r * 0.90) : r;

      let hits = 0;

      for(let i=G.enemies.length-1;i>=0;i--){
        const e = G.enemies[i];
        if(e && distHitSafe(e,cx,cy,rr)){
          dmgE(e,d);
          hits++;
        }
      }

      if(G.boss && distHitSafe(G.boss,cx,cy,rr)){
        dmgB(d * 0.8);
      }

      if(typeof ring === "function"){
        ring(cx,cy,rr,tier >= 5 ? "#ffd84d" : "#9ef7ff");
      }

      if(tier < 7 && typeof msg === "function"){
        msg("なぎ払い！ x" + hits, 36);
      }

    }else{
      for(let i=G.enemies.length-1;i>=0;i--){
        const e = G.enemies[i];
        if(e && hitSafe(a,e)){
          dmgE(e,d);
        }
      }

      if(G.boss && hitSafe(a,G.boss)){
        dmgB(d);
      }
    }
  };

  /*
    波動砲をボスにも確実に当てる。
  */
  if(typeof updBullets === "function" && !updBullets.__heroGrowthWaveWrappedV3){
    const oldUpdBullets = updBullets;

    updBullets = function(){
      oldUpdBullets();

      if(!G || !Array.isArray(G.bullets)) return;

      for(let i=G.bullets.length-1;i>=0;i--){
        const b = G.bullets[i];
        if(!b || !b.growthWave) continue;

        if(G.boss && hitSafe(b,G.boss)){
          dmgB(Math.max(1, Math.round(b.dmg || 3)));

          const x = b.x + b.w / 2;
          const y = b.y + b.h / 2;

          if(typeof fx === "function"){
            fx(x,y,b.color || "#fff7a8",18,3.5);
          }

          if(typeof ring === "function"){
            ring(x,y,b.radius || 38,b.color || "#fff7a8");
          }

          G.bullets.splice(i,1);
        }
      }
    };

    updBullets.__heroGrowthWaveWrappedV3 = true;
  }

  function drawGrowthWaveBullet(b){
    if(!b || !b.growthWave) return;

    const x = wx(b.x + b.w / 2);
    const y = wy(b.y + b.h / 2);

    const age = (b.maxLife || b.life || 1) - (b.life || 0);
    const max = b.maxLife || 80;
    const t = age / max;

    const pulse = 1 + Math.sin((G.time || 0) * 0.35 + (b.pulseSeed || 0)) * 0.10;
    const fade = Math.max(0.20, Math.min(1, (b.life || 0) / max));

    const len = (b.visualLen || 70) * (1 + 0.18 * t) * pulse;
    const thick = (b.visualThick || 26) * (1 + 0.10 * Math.sin((G.time || 0) * 0.5));
    const angle = b.angle || 0;

    ctx.save();
    ctx.translate(x,y);
    ctx.rotate(angle);

    /*
      残像
    */
    for(let i=3;i>=1;i--){
      ctx.globalAlpha = 0.10 * fade * i;
      ctx.fillStyle = b.color || "#ffd84d";
      ctx.shadowBlur = 18;
      ctx.shadowColor = b.color || "#ffd84d";
      ctx.beginPath();
      ctx.ellipse(-i * 13,0,len * (0.45 + i * 0.08),thick * (0.50 + i * 0.10),0,0,TWO_PI);
      ctx.fill();
    }

    /*
      外側の光
    */
    ctx.globalAlpha = 0.30 * fade;
    ctx.fillStyle = b.color || "#ffd84d";
    ctx.shadowBlur = 28;
    ctx.shadowColor = b.color || "#ffd84d";
    ctx.beginPath();
    ctx.ellipse(0,0,len * 0.62,thick * 0.82,0,0,TWO_PI);
    ctx.fill();

    /*
      本体
    */
    const grad = ctx.createLinearGradient(-len / 2,0,len / 2,0);
    grad.addColorStop(0,"rgba(255,255,255,0.05)");
    grad.addColorStop(0.22,b.color || "#ffd84d");
    grad.addColorStop(0.55,"#ffffff");
    grad.addColorStop(0.82,b.color || "#ffd84d");
    grad.addColorStop(1,"rgba(255,255,255,0.10)");

    ctx.globalAlpha = 0.82 * fade;
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0,0,len * 0.46,thick * 0.48,0,0,TWO_PI);
    ctx.fill();

    /*
      中心線
    */
    ctx.globalAlpha = 0.92 * fade;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-len * 0.36,0);
    ctx.lineTo(len * 0.42,0);
    ctx.stroke();

    ctx.restore();
  }

  function drawGrowthWaveSparks(){
    if(!G || !Array.isArray(G.effects)) return;

    for(const e of G.effects){
      if(!e || e.type !== "growth_wave_spark") continue;

      const rate = Math.max(0, Math.min(1, e.life / (e.max || e.life || 1)));

      ctx.save();
      ctx.globalAlpha = rate;
      ctx.fillStyle = e.color || "#ffd84d";
      ctx.shadowBlur = 12;
      ctx.shadowColor = e.color || "#ffd84d";
      ctx.beginPath();
      ctx.arc(wx(e.x),wy(e.y),e.size || 2,0,TWO_PI);
      ctx.fill();
      ctx.restore();
    }
  }

  /*
    描画上乗せ:
    - 波動砲の見た目
    - Lv5はキラキラを出さない
    - Lv7のキラキラ/マントは既存の最終覚醒描画パッチ側の goldAwaken フラグで出る
  */
  if(typeof draw === "function" && !draw.__heroGrowthFinalSpecV3Wrapped){
    const oldDraw = draw;

    draw = function(){
      oldDraw();

      if(!G || G.state === "title") return;

      if(Array.isArray(G.bullets)){
        for(const b of G.bullets){
          if(b && b.growthWave){
            drawGrowthWaveBullet(b);
          }
        }
      }

      drawGrowthWaveSparks();
    };

    draw.__heroGrowthFinalSpecV3Wrapped = true;
  }

  /*
    毎フレーム同期。
    既存パッチが trueGold / curseLifted を書き換えても戻す。
  */
  if(typeof update === "function" && !update.__heroGrowthFinalSpecV3Wrapped){
    const oldUpdate = update;

    update = function(){
      oldUpdate();

      if(typeof G !== "undefined" && G.player){
        syncHeroGrowthFlags(G.player);
      }
    };

    update.__heroGrowthFinalSpecV3Wrapped = true;
  }

  /*
    すでにゲーム中の場合も即反映。
  */
  if(typeof G !== "undefined" && G.player){
    applyGrowthStats(G.player);
  }

  console.log("hero growth final spec v3 loaded");
})();
/* =========================================================
   Lv7 移動速度アップ専用パッチ 安全版
   貼る場所:
   - game.js の一番最後
   - 連射パッチ、覚醒パッチ、マント描画順修正より後ろ

   効果:
   - 剣Lv7 / 盾Lv7 / 本Lv7 以上で移動速度アップ
   - attack(), drawHeroAdventurer3D(), finalHeroDraw() には触らない
   - 剣モーションや連射機能を壊さない
   ========================================================= */

(function(){
  if(window.__lv7MoveSpeedOnlyPatchApplied) return;
  window.__lv7MoveSpeedOnlyPatchApplied = true;

  /*
    速度倍率。
    1.12 = 少し速い
    1.18 = 体感で速い
    1.25 = かなり速い
  */
  const LV7_SPEED_RATE = 1.20;

  function lv(v){
    return Math.max(0, v | 0);
  }

  function isLv7Hero(p){
    if(!p) return false;

    const sword = lv(p.swordLv);
    const shield = lv(p.shieldLv);
    const book = lv(p.bookLv || p.magicLv);

    return sword >= 7 && shield >= 7 && book >= 7;
  }

  function applyLv7Speed(p){
    if(!p) return;

    /*
      元速度を一度だけ保存。
      これをしないと毎フレーム speed が増え続ける。
    */
    if(p.__lv7SpeedBase == null){
      p.__lv7SpeedBase = p.speed || 3.35;
    }

    if(isLv7Hero(p)){
      p.speed = p.__lv7SpeedBase * LV7_SPEED_RATE;
    }else{
      p.speed = p.__lv7SpeedBase;
    }
  }

  if(typeof update === "function"){
    const oldUpdateLv7MoveSpeedOnly = update;

    update = function(){
      /*
        update前にも反映。
        updP() の移動処理が update 内で呼ばれるため、
        移動前に speed をセットする。
      */
      if(typeof G !== "undefined" && G.player){
        applyLv7Speed(G.player);
      }

      oldUpdateLv7MoveSpeedOnly.apply(this, arguments);

      /*
        update後にも保険で反映。
        他パッチが speed を戻しても次フレーム安定する。
      */
      if(typeof G !== "undefined" && G.player){
        applyLv7Speed(G.player);
      }
    };
  }

  console.log("lv7 move speed only patch loaded");
})();
/* =========================================================
   スマホATK押しっぱなし連射 修正版
   貼る場所:
   - game.js の一番最後
   - スマホ操作ボタン再割り当てパッチより後ろ

   効果:
   - PC: Z / Enter 押しっぱなし連射
   - スマホ: ATKボタン押しっぱなし連射
   - NPC会話 / ショップ / 宝箱を邪魔しない
   ========================================================= */

(function(){
  if(window.__mobileAndPcAutoAttackHoldFinalApplied) return;
  window.__mobileAndPcAutoAttackHoldFinalApplied = true;

  const AUTO_ATTACK_INTERVAL = 2;

  const hold = {
    attack:false,
    pointerId:null,
    timer:0
  };

  function isAttackKey(e){
    if(!e) return false;
    const k = String(e.key || "").toLowerCase();
    return k === "z" || e.key === "Enter";
  }

  function isAttackButtonEvent(e){
    const t = e.target;
    if(!t) return false;

    if(t.id === "attackBtn") return true;

    if(typeof t.closest === "function"){
      return !!t.closest("#attackBtn");
    }

    return false;
  }

  function canAutoAttack(){
    if(typeof G === "undefined") return false;
    if(!G.player) return false;

    // フィールド中だけ自動連射
    if(G.state !== "field") return false;

    // 入力ロック中は連射しない
    if((G.lock || 0) > 0) return false;

    return true;
  }

  function attackCooldown(){
    if(typeof G === "undefined" || !G.player) return 999;
    return G.player.attackCd || 0;
  }

  /*
    PC用
  */
  window.addEventListener("keydown", function(e){
    if(!isAttackKey(e)) return;
    hold.attack = true;
  }, {capture:true, passive:true});

  window.addEventListener("keyup", function(e){
    if(!isAttackKey(e)) return;
    hold.attack = false;
    hold.timer = 0;
  }, {capture:true, passive:true});

  /*
    スマホ用。
    attackBtn 自体ではなく document capture で拾う。
    これにより、attackBtn 側の stopImmediatePropagation より先に反応できる。
  */
  document.addEventListener("pointerdown", function(e){
    if(!isAttackButtonEvent(e)) return;

    hold.attack = true;
    hold.pointerId = e.pointerId;
    hold.timer = 0;
  }, {capture:true, passive:true});

  document.addEventListener("pointerup", function(e){
    if(hold.pointerId !== null && e.pointerId !== hold.pointerId) return;

    hold.attack = false;
    hold.pointerId = null;
    hold.timer = 0;
  }, {capture:true, passive:true});

  document.addEventListener("pointercancel", function(e){
    if(hold.pointerId !== null && e.pointerId !== hold.pointerId) return;

    hold.attack = false;
    hold.pointerId = null;
    hold.timer = 0;
  }, {capture:true, passive:true});

  window.addEventListener("blur", function(){
    hold.attack = false;
    hold.pointerId = null;
    hold.timer = 0;
  });

  document.addEventListener("visibilitychange", function(){
    if(document.hidden){
      hold.attack = false;
      hold.pointerId = null;
      hold.timer = 0;
    }
  });

  /*
    updateを包む。
    既存の updP() は C("attack") で input.attack を消費するので、
    押しっぱなし中に毎回 input.attack を再投入する。
  */
  if(typeof update === "function"){
    const oldUpdateAutoAttackHoldFinal = update;

    update = function(){
      if(hold.attack && canAutoAttack()){
        if(hold.timer > 0){
          hold.timer--;
        }

        if(hold.timer <= 0 && attackCooldown() <= 0){
          input.attack = 1;

          /*
            重要:
            action/start は入れない。
            入れると押しっぱなし中にNPC会話・宝箱・ショップが暴発する。
            最初のタップ時の action/start は既存ATKボタン処理が担当する。
          */

          hold.timer = AUTO_ATTACK_INTERVAL;
        }
      }else{
        hold.timer = 0;
      }

      oldUpdateAutoAttackHoldFinal.apply(this, arguments);
    };
  }

  console.log("mobile and pc auto attack hold final loaded");
})();