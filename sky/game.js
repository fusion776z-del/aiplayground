"use strict";

const cvs=document.getElementById("game");
const ctx=cvs.getContext("2d");
const VW=360,VH=640;
const STAGES=[Stage1,Stage2,Stage3,Stage4,Stage5,Stage6,Stage7];

ctx.imageSmoothingEnabled=false;

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
  if(e.id==="wind_bat"){
    return {
      ...e,
      type:"bat",
      w:24,h:20,
      hp:2,atk:2,
      speed:1.25,
      t:0,hitT:0,
      color:"#8de7ff"
    };
  }

  return {
    ...e,
    type:e.id==="fast"?"fast":"slime",
    w:24,h:22,
    hp:e.id==="fast"?2:3,
    atk:2,
    speed:e.id==="fast"?1.55:.9,
    t:0,hitT:0,
    color:e.id==="fast"?"#ffcc66":"#78df72"
  };
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

function updP(){
  const p=G.player;

  ["inv","dashCd","attackCd","attackT","comboT"].forEach(k=>{
    if(p[k]>0)p[k]--;
  });

  if(p.comboT<=0)p.combo=0;

  const mx=input.right-input.left;
  const my=input.down-input.up;
  const nn=nrm(mx,my);

  p.vx=nn.l>.001?nn.x:0;
  p.vy=nn.l>.001?nn.y:0;

  if(Math.abs(mx)+Math.abs(my)>0){
    p.dir=Math.abs(mx)>Math.abs(my)
      ? (mx>0?"right":"left")
      : (my>0?"down":"up");
  }

  let sp=p.speed;

  if(C("dash")&&p.dashCd<=0){
    p.dashT=10;
    p.dashCd=40;
    p.inv=Math.max(p.inv,16);
  }

  if(p.dashT>0){
    p.dashT--;
    sp=7.4;
  }

  if(nn.l>.001){
    move(p,nn.x*sp,nn.y*sp);
  }

  if(C("attack")&&p.attackCd<=0)attack();
  if(C("magic"))magic();
  if(C("action"))action();
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

  p.combo=p.combo%3+1;
  p.comboT=38;

  const sweep=p.combo===3;
  const r=sweep?(p.trueGold?94:p.curseLifted?82:70):0;

  p.attackT=sweep?18:12;
  p.attackCd=sweep?18:12;

  const a=atkBox();
  const d=p.atk*(sweep?1.35:1);

  if(sweep){
    const cx=p.x+p.w/2;
    const cy=p.y+p.h/2;
    let hits=0;

    for(let i=G.enemies.length-1;i>=0;i--){
      const e=G.enemies[i];
      if(e&&distHit(e,cx,cy,r)){
        dmgE(e,d);
        hits++;
      }
    }

    if(G.boss&&distHit(G.boss,cx,cy,r)){
      dmgB(d*.8);
    }

    ring(cx,cy,r,p.trueGold?"#ffd84d":"#9ef7ff");
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

  if(p.mp<=0){
    msg("MPが足りない",40);
    return;
  }

  p.mp--;

  let vx=0,vy=0;

  if(p.dir==="up")vy=-5.6;
  else if(p.dir==="down")vy=5.6;
  else if(p.dir==="left")vx=-5.6;
  else vx=5.6;

  const s=8+p.magicLv*3;

  G.bullets.push({
    x:p.x+12-s/2,
    y:p.y+14-s/2,
    w:s,h:s,
    vx,vy,
    life:72,
    dmg:p.magic+1,
    magic:true,
    radius:p.magicRadius,
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

function talkNext(){
  const t=G.talk;
  if(!t||!t.npc){
    G.talk=null;
    G.state="field";
    return;
  }

  t.index++;

  if(t.index>=t.npc.lines.length){
    if(typeof t.npc.onTalk==="function"){
      t.npc.onTalk(G);
    }

    G.talk=null;
    G.state="field";
  }
}

function checkAwaken(){
  const p=G.player;

  if(!p.curseLifted&&p.swordLv>=3&&p.shieldLv>=3){
    p.curseLifted=true;
    p.maxHp+=14;
    p.hp=p.maxHp;
    p.maxMp+=6;
    p.mp=p.maxMp;
    p.atk+=6;
    p.def+=4;
    p.magic+=3;
    p.speed+=.55;
    msg("たぬきの呪いが解けた！",150);
  }

  if(!p.trueGold&&p.curseLifted&&p.bookLv>=3){
    p.trueGold=true;
    p.maxHp+=10;
    p.hp=p.maxHp;
    p.maxMp+=8;
    p.mp=p.maxMp;
    p.atk+=4;
    p.def+=3;
    p.magic+=6;
    p.speed+=.35;
    msg("金色覚醒！",150);
  }
}

function shopItems(){
  return [
    {
      name:"剣を強化",
      cost:60+G.player.swordLv*50,
      desc:"攻撃力+1",
      buy(){
        G.player.swordLv++;
        G.player.atk++;
        checkAwaken();
      }
    },
    {
      name:"盾を強化",
      cost:70+G.player.shieldLv*55,
      desc:"防御力+1",
      buy(){
        G.player.shieldLv++;
        G.player.armorLv=G.player.shieldLv;
        G.player.def++;
        G.player.maxHp++;
        G.player.hp++;
        checkAwaken();
      }
    },
    {
      name:"魔法を強化",
      cost:80+G.player.bookLv*70,
      desc:"魔法Lv3で金色覚醒",
      buy(){
        G.player.bookLv++;
        G.player.magic++;
        G.player.magicLv++;
        G.player.magicRadius+=10;
        G.player.maxMp++;
        G.player.mp++;
        checkAwaken();
      }
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
  const b=G.boss;
  if(!b)return;

  b.hp-=d;

  if(b.hp<=0){
    G.boss=null;
    G.bossDefeatT=120;
    G.state="bossDefeat";
    G.bullets=[];
    msg("ボス撃破！",120);
  }
}

function updEnemies(){
  const p=G.player;
  const box=ph();

  for(let i=G.enemies.length-1;i>=0;i--){
    const e=G.enemies[i];

    if(!e){
      G.enemies.splice(i,1);
      continue;
    }

    e.t++;
    if(e.hitT>0)e.hitT--;

    const nn=nrm(
      p.x+p.w/2-(e.x+e.w/2),
      p.y+p.h/2-(e.y+e.h/2)
    );

    e.x+=nn.x*e.speed+(e.type==="bat"?Math.sin(e.t*.12)*.7:0);
    e.y+=nn.y*e.speed+(e.type==="bat"?Math.cos(e.t*.1)*.7:0);

    if(p.inv<=0&&hit(box,e)){
      hurt(e.atk||2);
    }
  }
}

function updBoss(){
  const b=G.boss;
  if(!b)return;

  b.t++;

  const r=G.map.bossRoom;

  b.x=r.x+r.w/2-b.w/2+Math.cos(b.t*.024)*Math.min(170,r.w*.24);
  b.y=r.y+r.h/2-b.h/2+Math.sin(b.t*.034)*Math.min(62,r.h*.25);
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

    if(!d){
      G.drops.splice(i,1);
      continue;
    }

    const nn=nrm(p.x+12-d.x,p.y+14-d.y);

    if(nn.l<80){
      d.x+=nn.x*3.4;
      d.y+=nn.y*3.4;
    }

    if(nn.l<18){
      p.coins+=5;
      G.drops.splice(i,1);
    }
  }
}

function hurt(d){
  const p=G.player;

  if(p.inv>0)return;

  const t=Math.max(1,Math.round(d-p.def));

  p.hp-=t;
  p.inv=70;
  msg("HIT -"+t,30);

  if(p.hp<=0){
    p.hp=0;
    G.state="gameover";
  }
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

  function finishTalk(t){
    const fn = t && t.npc ? t.npc.onTalk : null;

    G.talk = null;
    G.state = "field";

    if(typeof fn === "function"){
      fn(G);
    }
  }

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

  // 会話送りを安定版にする
  talkNext = function(){
    if(typeof G === "undefined" || !G.talk)return;

    const t = G.talk;
    const now = G.time || 0;

    if(!t.npc){
      G.talk = null;
      G.state = "field";
      return;
    }

    cleanNpcLines(t.npc);

    // 会話開始直後の同じ入力で即送り・即終了するのを防ぐ
    if(typeof t.blockUntil === "number" && now < t.blockUntil){
      return;
    }

    // 連打で一瞬で閉じるのを防ぐ
    if(typeof t.lastAdvanceAt === "number" && now - t.lastAdvanceAt < TALK_NEXT_BLOCK){
      return;
    }

    t.index++;

    if(t.index >= t.npc.lines.length){
      finishTalk(t);
      return;
    }

    t.lastAdvanceAt = now;
    t.blockUntil = now + TALK_NEXT_BLOCK;
  };

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

    drawSoftShadow(x-4,y+2,w+8,h+8,.25);

    // 光輪
    ctx.save();
    ctx.globalAlpha=.25;
    ctx.fillStyle=th.glow;
    ctx.beginPath();
    ctx.ellipse(x+w/2,y+h/2,w*.95,h*.85,0,0,Math.PI*2);
    ctx.fill();
    ctx.restore();

    // 台座
    const grad=ctx.createLinearGradient(x,y,x,y+h);
    grad.addColorStop(0,th.shop1);
    grad.addColorStop(1,th.shop2);

    ctx.fillStyle=grad;
    roundRect(x,y,w,h,9);
    ctx.fill();

    ctx.strokeStyle="rgba(255,255,255,.55)";
    ctx.lineWidth=2;
    roundRect(x+2,y+2,w-4,h-4,7);
    ctx.stroke();

    // 祭壇の上面
    ctx.fillStyle="rgba(255,255,255,.24)";
    roundRect(x+5,y+4,w-10,h*.24,6);
    ctx.fill();

    // 強化アイコン
    ctx.fillStyle="#fff";
    ctx.font="900 12px system-ui";
    ctx.textAlign="center";
    ctx.fillText("強",x+w/2,y+h*.67);
    ctx.textAlign="left";

    // きらめき
    ctx.save();
    ctx.globalAlpha=.9;
    ctx.strokeStyle="#fff7b0";
    ctx.lineWidth=1.5;
    ctx.beginPath();
    ctx.moveTo(x+w*.23,y+h*.20);
    ctx.lineTo(x+w*.23,y+h*.36);
    ctx.moveTo(x+w*.15,y+h*.28);
    ctx.lineTo(x+w*.31,y+h*.28);
    ctx.stroke();
    ctx.restore();
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
   ボス扉ボタン開閉パッチ 完全版
   貼る場所:
   - game.js の一番下
   - 既存コードの最後の })(); より後ろ

   効果:
   - 近づくだけではボスを出さない
   - ACTボタン / Z / Enter を押した時だけボス扉を開く
   - 扉判定を広めにして、押したのに反応しない問題を防ぐ
   - 鍵があれば扉を開けてボス出現
   - 鍵がなければ「鍵が必要だ」
   - ボス撃破後は再出現しない
   ========================================================= */
(function(){
  if(window.__bossDoorButtonOpenPatchApplied) return;
  window.__bossDoorButtonOpenPatchApplied = true;

  function isBossDoor(d){
    if(!d) return false;

    return (
      d.id === "boss_door" ||
      String(d.label || "").includes("扉") ||
      String(d.requiredItem || "").includes("key")
    );
  }

  function playerButtonDoorRect(){
    const p = G.player;
    if(!p) return null;

    /*
      扉は solid 判定で重なりにくいので、
      ACT/Z/Enterを押した時だけ広めの範囲で拾う。
    */
    const extraX = 42;
    const extraY = 42;

    return {
      x: p.x - extraX,
      y: p.y - extraY,
      w: p.w + extraX * 2,
      h: p.h + extraY * 2
    };
  }

  function markBossDefeated(){
    if(G && G.map){
      G.map.__bossDefeated = true;
    }
  }

  function canSpawnBossByDoor(){
    if(!G) return false;
    if(!G.map) return false;
    if(!G.player) return false;
    if(!G.map.boss) return false;
    if(G.boss) return false;
    if(G.map.__bossDefeated) return false;
    return true;
  }

  function spawnBossFromDoor(){
    if(!canSpawnBossByDoor()) return false;

    spawnBoss();

    if(G.map){
      G.map.objective = "守護獣を倒す";
      G.map.__bossSpawned = true;
    }

    return true;
  }

  function openBossDoorByButton(d){
    if(!d) return false;

    if(d.requiredItem && !hasItem(d.requiredItem)){
      msg("鍵が必要だ", 60);
      return false;
    }

    d.locked = false;

    if(G.map){
      G.map.objective = "守護獣を倒す";
    }

    const spawned = spawnBossFromDoor();

    if(spawned){
      msg((d.label || "扉") + "が開いた！ ボスが出現した！", 110);
    }else{
      msg((d.label || "扉") + "が開いた！", 80);
    }

    return true;
  }

  function tryBossDoorByButton(){
    if(!G || G.state !== "field") return false;
    if(!G.player) return false;
    if(!Array.isArray(G.doors)) return false;

    const pr = playerButtonDoorRect();
    if(!pr) return false;

    for(const d of G.doors){
      if(!isBossDoor(d)) continue;

      if(hit(pr, d)){
        openBossDoorByButton(d);
        return true;
      }
    }

    return false;
  }

  /*
    tryDoorを強化。
    既存コードでも tryDoor() から spawnBoss() されるが、
    ここではボス扉の場合にメッセージと再出現防止も含めて安定化する。
  */
  if(typeof tryDoor === "function"){
    const __oldTryDoorForBossButton = tryDoor;

    tryDoor = function(d){
      if(isBossDoor(d)){
        openBossDoorByButton(d);
        return;
      }

      __oldTryDoorForBossButton(d);
    };
  }

  /*
    dmgBを強化。
    ボス撃破後に map.__bossDefeated を付けて再出現を防ぐ。
  */
  if(typeof dmgB === "function"){
    const __oldDmgBForBossButton = dmgB;

    dmgB = function(damage){
      const hadBossBefore = !!G.boss;

      __oldDmgBForBossButton(damage);

      if(hadBossBefore && !G.boss){
        markBossDefeated();
      }
    };
  }

  /*
    actionを強化。
    ACTボタン / Z / Enter が押された時だけ、
    広めの扉判定でボス扉を開く。
  */
  if(typeof action === "function"){
    const __oldActionForBossButton = action;

    action = function(){
      if(typeof G === "undefined"){
        return;
      }

      /*
        title / talk / shop などは既存処理を優先。
        ボス扉チェックは field の時だけ。
      */
      if(G.state !== "field"){
        __oldActionForBossButton();
        return;
      }

      /*
        先にボス扉を広め判定で確認。
        ボス扉に届いていなければ、通常の会話・宝箱・店処理へ進む。
      */
      if(tryBossDoorByButton()){
        return;
      }

      __oldActionForBossButton();
    };
  }

})();

/* =========================================================
   ボス出現 最終修正版
   貼る場所:
   - game.js の一番下
   - 既存コードの最後の })(); より後ろ

   原因対策:
   - 扉の hit 判定に依存しない
   - ACT / Z / Enter を押した時に処理する
   - 鍵を持っていれば、扉判定に失敗してもボスを直接生成する
   - stage1 の grass_key だけでなく、各ステージの door.requiredItem に対応
   - ボス撃破後は再出現しない
   - Bキーで強制出現デバッグ可能
   ========================================================= */
(function(){
  if(window.__finalBossSpawnFixApplied) return;
  window.__finalBossSpawnFixApplied = true;

  function bossFixLog(){
    if(typeof console !== "undefined"){
      console.log.apply(console, ["[FinalBossSpawnFix]"].concat([].slice.call(arguments)));
    }
  }

  function getBossDoor(){
    if(!G || !Array.isArray(G.doors)) return null;

    for(const d of G.doors){
      if(!d) continue;

      if(
        d.id === "boss_door" ||
        String(d.id || "").includes("boss") ||
        String(d.label || "").includes("扉") ||
        String(d.requiredItem || "").includes("key")
      ){
        return d;
      }
    }

    return null;
  }

  function getBossRequiredItem(){
    const d = getBossDoor();

    if(d && d.requiredItem){
      return d.requiredItem;
    }

    /*
      Stage1 の保険。
      stage1.js 側では grass_key を使っている想定。
      ただし通常は door.requiredItem を優先する。
    */
    return "grass_key";
  }

  function playerHasItemSafe(id){
    if(!G || !G.player || !id) return false;

    if(typeof hasItem === "function"){
      try{
        if(hasItem(id)) return true;
      }catch(e){
        bossFixLog("hasItem failed", e);
      }
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

  function hasBossKey(){
    return playerHasItemSafe(getBossRequiredItem());
  }

  function markBossDefeated(){
    if(G && G.map){
      G.map.__bossDefeated = true;
    }
  }

  function canCreateBoss(){
    if(!G) return false;
    if(G.state !== "field") return false;
    if(!G.map) return false;
    if(!G.player) return false;
    if(!G.map.boss) return false;
    if(G.boss) return false;
    if(G.map.__bossDefeated) return false;

    return true;
  }

  function unlockBossDoor(){
    const d = getBossDoor();

    if(d){
      d.locked = false;
    }

    if(G && G.map){
      G.map.objective = "守護獣を倒す";
    }

    return d;
  }

  function createBossDirectly(){
    if(!canCreateBoss()){
      bossFixLog("createBossDirectly skipped", {
        state:G && G.state,
        hasMap:!!(G && G.map),
        hasPlayer:!!(G && G.player),
        hasMapBoss:!!(G && G.map && G.map.boss),
        hasBoss:!!(G && G.boss),
        defeated:!!(G && G.map && G.map.__bossDefeated)
      });
      return false;
    }

    const src = G.map.boss;

    /*
      元の spawnBoss() と同じ初期化を直接行う。
      これにより、tryDoor / hit 判定に失敗しても必ず G.boss が作られる。
    */
    G.boss = {
      ...src,
      x: src.x - src.w / 2,
      y: src.y - src.h / 2,
      t: 0,
      shot: 82,
      phase: 1
    };

    G.map.__bossSpawned = true;
    G.map.objective = "守護獣を倒す";

    bossFixLog("boss created", G.boss);

    return true;
  }

  function openDoorAndSpawnBoss(){
    if(!canCreateBoss()){
      return false;
    }

    const requiredItem = getBossRequiredItem();

    if(!hasBossKey()){
      msg("鍵が必要だ", 70);
      bossFixLog("no key", requiredItem, G.player ? G.player.inventory : null);
      return false;
    }

    const d = unlockBossDoor();
    const ok = createBossDirectly();

    if(ok){
      if(d && d.label){
        msg(d.label + "が開いた！ ボスが出現した！", 120);
      }else{
        msg("扉が開いた！ ボスが出現した！", 120);
      }
      return true;
    }

    return false;
  }

  function playerNearRect(target, extraX, extraY){
    if(!G || !G.player || !target) return false;

    const p = G.player;

    const pr = {
      x: p.x - extraX,
      y: p.y - extraY,
      w: p.w + extraX * 2,
      h: p.h + extraY * 2
    };

    return hit(pr, target);
  }

  function tryNormalObjectsFirst(){
    /*
      店・NPC・宝箱は従来通り優先する。
      これをしないと、鍵入手後に宝箱や会話より先にボスが出るため。
    */
    if(!G || !G.player) return false;

    const p = G.player;

    const pr = {
      x: p.x - 12,
      y: p.y - 12,
      w: p.w + 24,
      h: p.h + 24
    };

    for(const s of G.shops || []){
      if(hit(pr, s)){
        G.shop = {shop:s};
        G.state = "shop";
        return true;
      }
    }

    for(const n of G.npcs || []){
      if(hit(pr, n)){
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
      if(!c.opened && hit(pr, c)){
        openChest(c);
        return true;
      }
    }

    return false;
  }

  function tryBossDoorWideThenForce(){
    if(!canCreateBoss()) return false;

    const d = getBossDoor();

    /*
      まずは広めの扉判定。
      かなり広くして、solid の壁に阻まれても届くようにする。
    */
    if(d && playerNearRect(d, 120, 120)){
      return openDoorAndSpawnBoss();
    }

    /*
      それでも届かない場合:
      鍵を持っていて、ACT/Z/Enter を押したならボスを出す。
      これで「どうしても出現しない」状態を潰す。
    */
    if(hasBossKey()){
      return openDoorAndSpawnBoss();
    }

    msg("鍵が必要だ", 70);
    return false;
  }

  /*
    action() を最終上書き。
    ACTボタン / Z / Enter で呼ばれる処理。
  */
  if(typeof action === "function"){
    const __oldActionFinalBossFix = action;

    action = function(){
      if(typeof G === "undefined"){
        return;
      }

      if(G.state === "title"){
        start();
        return;
      }

      if(G.talk){
        talkNext();
        return;
      }

      if(G.state !== "field"){
        __oldActionFinalBossFix();
        return;
      }

      /*
        まず通常オブジェクト。
        これにより鍵宝箱を開ける操作を邪魔しない。
      */
      if(tryNormalObjectsFirst()){
        return;
      }

      /*
        次にボス扉。
        hit が届かなくても、鍵を持っていれば最終的に出す。
      */
      if(tryBossDoorWideThenForce()){
        return;
      }

      /*
        何もなければ元の action に戻す。
      */
      __oldActionFinalBossFix();
    };
  }

  /*
    tryDoor() も上書き。
    既存ルートから来た場合も、同じ確実処理にする。
  */
  if(typeof tryDoor === "function"){
    const __oldTryDoorFinalBossFix = tryDoor;

    tryDoor = function(d){
      const bossDoor = getBossDoor();

      if(d && bossDoor && d === bossDoor){
        openDoorAndSpawnBoss();
        return;
      }

      if(
        d &&
        (
          d.id === "boss_door" ||
          String(d.id || "").includes("boss") ||
          String(d.label || "").includes("扉") ||
          String(d.requiredItem || "").includes("key")
        )
      ){
        openDoorAndSpawnBoss();
        return;
      }

      __oldTryDoorFinalBossFix(d);
    };
  }

  /*
    spawnBoss() も安全化。
    どこから呼ばれても直接生成ロジックを使う。
  */
  if(typeof spawnBoss === "function"){
    const __oldSpawnBossFinalBossFix = spawnBoss;

    spawnBoss = function(){
      if(G && G.boss) return;

      if(G && G.map && G.map.boss){
        createBossDirectly();
        return;
      }

      __oldSpawnBossFinalBossFix();
    };
  }

  /*
    dmgB() を上書き。
    撃破後の再出現防止。
  */
  if(typeof dmgB === "function"){
    const __oldDmgBFinalBossFix = dmgB;

    dmgB = function(damage){
      const hadBoss = !!(G && G.boss);

      __oldDmgBFinalBossFix(damage);

      if(hadBoss && G && !G.boss){
        markBossDefeated();
      }
    };
  }

  /*
    デバッグ:
    Bキーで鍵・位置に関係なくボスを直接出す。
    これでも出ない場合は、drawBoss3D / characterRenderer.js / stage1.js 読み込み問題。
  */
  addEventListener("keydown", function(e){
    const k = String(e.key || "").toLowerCase();

    if(k === "b" && !e.repeat){
      if(G && G.state === "field"){
        unlockBossDoor();

        if(createBossDirectly()){
          msg("デバッグ: ボスを出現させた！", 100);
        }else{
          msg("ボス生成に失敗。Consoleを確認", 100);
        }
      }
    }
  });

})();
/* =========================================================
   ボス扉 接触時のみ開閉パッチ 完全版
   貼る場所:
   - game.js の一番下
   - これまで貼ったボス出現系パッチより後ろ

   修正内容:
   - 何もない場所で Z / ACT / Enter を押しても「鍵が必要だ」を出さない
   - 鍵を持っていても、扉に触れていなければ扉を開けない
   - 扉に触れていて鍵がない時だけ「鍵が必要だ」
   - 扉に触れていて鍵がある時だけボス扉を開けてボス出現
   - Bキーなどの強制出現デバッグはこのパッチでは追加しない
   ========================================================= */
(function(){
  if(window.__bossDoorTouchOnlyPatchApplied) return;
  window.__bossDoorTouchOnlyPatchApplied = true;

  /*
    ボス扉かどうかを判定。
    stage1.js の boss_door / requiredItem / label に対応。
  */
  function isBossDoor(d){
    if(!d) return false;

    return (
      d.id === "boss_door" ||
      String(d.id || "").includes("boss") ||
      String(d.label || "").includes("扉") ||
      String(d.requiredItem || "").includes("key")
    );
  }

  /*
    通常のプレイヤー周辺アクション範囲。
    店・NPC・宝箱はこれを使う。
  */
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

  /*
    扉専用の接触判定。
    locked door は solid によって完全には重なれないので、
    少しだけ広めにする。
    ただし離れた場所からは絶対に届かない距離に制限する。
  */
  function doorTouchRect(){
    const p = G.player;
    if(!p) return null;

    const extraX = 24;
    const extraY = 24;

    return {
      x: p.x - extraX,
      y: p.y - extraY,
      w: p.w + extraX * 2,
      h: p.h + extraY * 2
    };
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

  function markBossDefeated(){
    if(G && G.map){
      G.map.__bossDefeated = true;
    }
  }

  function canSpawnBossFromDoor(){
    if(!G) return false;
    if(!G.map) return false;
    if(!G.player) return false;
    if(!G.map.boss) return false;
    if(G.boss) return false;
    if(G.map.__bossDefeated) return false;

    return true;
  }

  /*
    元の spawnBoss() 相当。
    直接 G.boss を作ることで、古いパッチの影響を避ける。
  */
  function createBossFromMap(){
    if(!canSpawnBossFromDoor()) return false;

    const src = G.map.boss;

    G.boss = {
      ...src,
      x: src.x - src.w / 2,
      y: src.y - src.h / 2,
      t: 0,
      shot: 82,
      phase: 1
    };

    G.map.objective = "守護獣を倒す";
    G.map.__bossSpawned = true;

    return true;
  }

  /*
    扉に触れている時だけ呼ばれる扉処理。
    ここ以外では「鍵が必要だ」を出さない。
  */
  function openDoorOnlyWhenTouched(d){
    if(!d) return false;

    const requiredItem = d.requiredItem;

    if(requiredItem && !hasItemSafe(requiredItem)){
      msg("鍵が必要だ", 60);
      return true;
    }

    d.locked = false;

    if(G.map){
      G.map.objective = "守護獣を倒す";
    }

    const spawned = createBossFromMap();

    if(spawned){
      msg((d.label || "扉") + "が開いた！ ボスが出現した！", 110);
    }else{
      msg((d.label || "扉") + "が開いた！", 80);
    }

    return true;
  }

  /*
    今プレイヤーが接触している扉を探す。
    触れていない場合は null。
  */
  function getTouchedDoor(){
    if(!G || !G.player || !Array.isArray(G.doors)) return null;

    const r = doorTouchRect();
    if(!r) return null;

    for(const d of G.doors){
      if(!d) continue;

      if(hit(r,d)){
        return d;
      }
    }

    return null;
  }

  /*
    店・NPC・宝箱を通常処理。
    扉ではないものを先に拾う。
  */
  function handleNormalObjects(){
    if(!G || !G.player) return false;

    const pr = normalActionRect();
    if(!pr) return false;

    for(const s of G.shops || []){
      if(hit(pr,s)){
        G.shop = {shop:s};
        G.state = "shop";
        return true;
      }
    }

    for(const n of G.npcs || []){
      if(hit(pr,n)){
        /*
          NPC安定化パッチがある場合は beginTalk を使う。
          なければ元の形式で会話開始。
        */
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
      if(!c.opened && hit(pr,c)){
        openChest(c);
        return true;
      }
    }

    return false;
  }

  /*
    action() を最終版に置き換え。
    重要:
    - 最後に古い action を呼ばない。
    - 古い action / 古いボスパッチを呼ぶと、離れた場所でも開く挙動が復活するため。
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
      まず店・NPC・宝箱。
    */
    if(handleNormalObjects()){
      return;
    }

    /*
      次に扉。
      扉に触れていない場合は何もしない。
      つまり、何もない場所でZを押しても「鍵が必要だ」は出ない。
    */
    const touchedDoor = getTouchedDoor();

    if(!touchedDoor){
      return;
    }

    /*
      扉に触れている場合だけ tryDoor 相当を実行。
    */
    openDoorOnlyWhenTouched(touchedDoor);
  };

  /*
    tryDoor() も最終版に置き換え。
    これも「扉に触れている時だけ」処理する。
    直接 tryDoor(d) が呼ばれた場合でも、触れていないなら何もしない。
  */
  tryDoor = function(d){
    if(!d) return;

    const touchedDoor = getTouchedDoor();

    if(!touchedDoor || touchedDoor !== d){
      return;
    }

    openDoorOnlyWhenTouched(d);
  };

  /*
    spawnBoss() も安全版にする。
    ただしこれは tryDoor / action からしか呼ばれない想定。
  */
  spawnBoss = function(){
    createBossFromMap();
  };

  /*
    dmgB() は撃破後の再出現防止だけ維持。
  */
  if(typeof dmgB === "function"){
    const __oldDmgBTouchOnly = dmgB;

    dmgB = function(damage){
      const hadBoss = !!G.boss;

      __oldDmgBTouchOnly(damage);

      if(hadBoss && !G.boss){
        markBossDefeated();
      }
    };
  }

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
    if(G && G.map && G.map.__duelSpace){
      createBossForDuel();
      return;
    }

    const d = getTouchedDoor() || getBossDoor();

    if(d && isBossDoor(d)){
      createBossWarpCircleFromDoor(d);
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

  /*
    ボス撃破後の再出現防止。
  */
  if(typeof dmgB === "function"){
    const __oldDmgBMagicCircleDuel = dmgB;

    dmgB = function(damage){
      const hadBoss = !!G.boss;

      __oldDmgBMagicCircleDuel(damage);

      if(hadBoss && !G.boss){
        markBossDefeated();
      }
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
        setTimeout(function(){},0);
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

  /*
    ボスが消えた時に弾も掃除。
  */
  if(typeof dmgB === "function"){
    const __oldDmgBSuperBoss = dmgB;

    dmgB = function(damage){
      const hadBoss = !!G.boss;

      __oldDmgBSuperBoss(damage);

      if(hadBoss && !G.boss){
        clearBossProjectiles();
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
      __oldUpdBossShieldMagic();
      processShieldReflectionAndReflectedHits();
    };
  }else{
    updBoss = function(){
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
    spawnBoss を包む:
    通常のボス生成にも、決闘空間のボス生成にも対応。
  */
  if(typeof spawnBoss === "function"){
    const __oldSpawnBossStageHpScale = spawnBoss;

    spawnBoss = function(){
      /*
        生成前に map.boss を強化。
      */
      applyHpScaleToMapBoss();

      __oldSpawnBossStageHpScale();

      /*
        生成後に G.boss を強化。
      */
      applyHpScaleToActiveBoss();
    };
  }

  /*
    dmgB を包む:
    もし何らかの理由でHP強化前にダメージが入っても、
    最初のダメージ時点で強化を保証する。
  */
  if(typeof dmgB === "function"){
    const __oldDmgBStageHpScale = dmgB;

    dmgB = function(damage){
      applyStageBossHpScale();
      __oldDmgBStageHpScale(damage);
    };
  }

  /*
    update を包む:
    魔法陣ワープや他パッチが独自に G.boss を作った場合でも、
    毎フレーム軽く確認してHP強化を取りこぼさない。
    二重適用はフラグで防止済み。
  */
  if(typeof update === "function"){
    const __oldUpdateStageBossHpScale = update;

    update = function(){
      __oldUpdateStageBossHpScale();
      applyStageBossHpScale();
    };
  }

  /*
    updBoss も包む:
    ボスAI開始時にもHP強化を保証する。
  */
  if(typeof updBoss === "function"){
    const __oldUpdBossStageHpScale = updBoss;

    updBoss = function(){
      applyStageBossHpScale();
      __oldUpdBossStageHpScale();
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
   主人公 上下30%圧縮パッチ 完全版
   貼る場所:
   - game.js の一番下
   - これまで貼った全パッチよりさらに後ろ

   効果:
   - 主人公の見た目だけ上下方向に30%圧縮
   - 8頭身っぽい縦長感を少し抑える
   - 当たり判定、移動、攻撃範囲、ゲーム性能は変更しない
   - 剣、盾、マント、髪、体、足もまとめて縦方向に圧縮
   ========================================================= */
(function(){
  if(window.__heroVerticalCompress30PatchApplied) return;
  window.__heroVerticalCompress30PatchApplied = true;

  /*
    1.00 = 元の縦サイズ
    0.70 = 上下30%圧縮
    0.75 = 25%圧縮
    0.80 = 20%圧縮

    今回はユーザー指定どおり 20% 圧縮。
  */
  const HERO_Y_SCALE = 0.80;

  /*
    圧縮すると少し上に浮いて見える場合があるため、
    足元を自然に合わせるための微調整。
    数字を大きくすると少し下に表示される。
  */
  const HERO_FOOT_ADJUST_Y = 4;

  /*
    既存の drawHeroAdventurer3D を完全上書き。
    characterRenderer.js 内の helper 関数:
    - crShadow
    - crGearColors
    - drawAttackArc
    - drawHeroFront
    - drawHeroBack
    - drawHeroSide
    などはそのまま使う。
  */
  drawHeroAdventurer3D = function(ctx,p,wx,wy,time,atkBox){
    if(!p) return;

    /*
      ダメージ無敵中の点滅。
      元コードと同じ。
    */
    if(p.inv > 0 && p.inv % 8 < 4){
      return;
    }

    const x = wx(p.x);
    const y = wy(p.y);

    const cx = x + p.w / 2;
    const cy = y + p.h / 2;

    const sp = Math.hypot(p.vx || 0, p.vy || 0);

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

    /*
      影は圧縮しすぎると不自然なので、
      キャラ本体より少しだけ自然な楕円にする。
      当たり判定には影響しない。
    */
    crShadow(
      ctx,
      x - 12,
      y + 6,
      p.w + 24,
      p.h + 14,
      0.30
    );

    ctx.save();

    /*
      ここが重要。
      キャラ中心へ移動してから Y だけ 0.70 倍にする。
      これで、横幅はそのまま、上下だけ30%圧縮される。
    */
    ctx.translate(cx, cy + bob + HERO_FOOT_ADJUST_Y);
    ctx.scale(1, HERO_Y_SCALE);

    /*
      覚醒時の光。
      圧縮後のキャラ全体に自然にかかる。
    */
    if(p.trueGold){
      ctx.shadowBlur = 24;
      ctx.shadowColor = "#ffd84d";
    }else if(p.curseLifted){
      ctx.shadowBlur = 12;
      ctx.shadowColor = "#9ef7ff";
    }

    /*
      攻撃エフェクトも主人公の見た目と一緒に圧縮。
      攻撃判定自体は game.js の atkBox() 側なので変わらない。
    */
    if(attacking){
      drawAttackArc(ctx,g,swing,spin);
    }

    const dir = p.dir || "down";

    /*
      方向別描画。
      元コードの向き処理を維持。
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

    /*
      atkBox は元コードでも実質描画には使っていないが、
      将来のデバッグ表示などに備えて呼び出し互換だけ残す。
    */
    if(p.attackT > 0 && typeof atkBox === "function"){
      try{
        atkBox();
      }catch(e){}
    }
  };

})();
/* =========================================================
   スマホ左ジョイスティック有効化パッチ 完全版
   貼る場所:
   - game.js の一番下
   - これまで貼った全パッチよりさらに後ろ

   効果:
   - index.html の #joystick / #stick を使って移動できる
   - 左下ジョイスティックで上下左右・斜め移動
   - PCのキーボード操作はそのまま維持
   - 指を離したら自動で停止
   - タイトル画面でもジョイスティック操作中に誤作動しにくい
   ========================================================= */
(function(){
  if(window.__mobileJoystickControlPatchApplied) return;
  window.__mobileJoystickControlPatchApplied = true;

  const JOY_RADIUS = 54;
  const STICK_MAX = 42;
  const DEAD_ZONE = 0.16;

  const joy = document.getElementById("joystick");
  const stick = document.getElementById("stick");

  if(!joy || !stick){
    console.warn("[JoystickPatch] #joystick または #stick が見つかりません");
    return;
  }

  let active = false;
  let pointerId = null;
  let centerX = 0;
  let centerY = 0;

  /*
    キーボード入力と競合しないように、
    ジョイスティック専用の値を input.ax / input.ay に入れる。
  */
  input.ax = 0;
  input.ay = 0;

  function resetStick(){
    active = false;
    pointerId = null;

    input.ax = 0;
    input.ay = 0;

    /*
      ジョイスティック由来の方向入力だけ戻す。
      キーボード操作中でも変になりにくいよう、
      ここでは ax/ay を主に使う。
    */
    stick.style.transform = "translate(-50%,-50%)";
  }

  function updateCenter(){
    const rect = joy.getBoundingClientRect();
    centerX = rect.left + rect.width / 2;
    centerY = rect.top + rect.height / 2;
  }

  function applyPointer(clientX, clientY){
    let dx = clientX - centerX;
    let dy = clientY - centerY;

    const len = Math.hypot(dx,dy);

    if(len > JOY_RADIUS){
      dx = dx / len * JOY_RADIUS;
      dy = dy / len * JOY_RADIUS;
    }

    const nx = dx / JOY_RADIUS;
    const ny = dy / JOY_RADIUS;

    const mag = Math.hypot(nx,ny);

    if(mag < DEAD_ZONE){
      input.ax = 0;
      input.ay = 0;
    }else{
      input.ax = nx;
      input.ay = ny;
    }

    const sx = nx * STICK_MAX;
    const sy = ny * STICK_MAX;

    stick.style.transform =
      "translate(calc(-50% + " + sx + "px), calc(-50% + " + sy + "px))";
  }

  joy.addEventListener("pointerdown",function(e){
    e.preventDefault();

    active = true;
    pointerId = e.pointerId;

    try{
      joy.setPointerCapture(pointerId);
    }catch(err){}

    updateCenter();
    applyPointer(e.clientX,e.clientY);
  },{passive:false});

  joy.addEventListener("pointermove",function(e){
    if(!active) return;
    if(pointerId !== null && e.pointerId !== pointerId) return;

    e.preventDefault();
    applyPointer(e.clientX,e.clientY);
  },{passive:false});

  joy.addEventListener("pointerup",function(e){
    if(pointerId !== null && e.pointerId !== pointerId) return;

    e.preventDefault();

    try{
      joy.releasePointerCapture(pointerId);
    }catch(err){}

    resetStick();
  },{passive:false});

  joy.addEventListener("pointercancel",function(e){
    if(pointerId !== null && e.pointerId !== pointerId) return;

    e.preventDefault();
    resetStick();
  },{passive:false});

  joy.addEventListener("lostpointercapture",function(){
    resetStick();
  });

  /*
    画面回転・リサイズ時に中心座標を取り直す。
  */
  window.addEventListener("resize",function(){
    if(active){
      updateCenter();
    }
  });

  window.addEventListener("orientationchange",function(){
    resetStick();
  });

  /*
    元の updP を上書き。
    既存コードは input.right - input.left / input.down - input.up だけを見ているので、
    ここで input.ax / input.ay も移動に反映する。
  */
  if(typeof updP === "function"){
    const __oldUpdPForJoystick = updP;

    updP = function(){
      const p = G.player;

      if(!p){
        __oldUpdPForJoystick();
        return;
      }

      /*
        元の updP とほぼ同じ処理を再実装。
        違いは mx / my に joystick の ax / ay を加えること。
      */
      ["inv","dashCd","attackCd","attackT","comboT"].forEach(k=>{
        if(p[k] > 0) p[k]--;
      });

      if(p.comboT <= 0){
        p.combo = 0;
      }

      /*
        キーボード入力 + ジョイスティック入力。
        キーボードが押されていればキーボードも使える。
      */
      let mx = input.right - input.left;
      let my = input.down - input.up;

      const jx = input.ax || 0;
      const jy = input.ay || 0;

      /*
        ジョイスティックが入力されている場合はそちらを優先。
        これで斜め移動がなめらかになる。
      */
      if(Math.hypot(jx,jy) > DEAD_ZONE){
        mx = jx;
        my = jy;
      }

      const nn = nrm(mx,my);

      p.vx = nn.l > .001 ? nn.x : 0;
      p.vy = nn.l > .001 ? nn.y : 0;

      if(Math.abs(mx) + Math.abs(my) > 0.001){
        p.dir = Math.abs(mx) > Math.abs(my)
          ? (mx > 0 ? "right" : "left")
          : (my > 0 ? "down" : "up");
      }

      let sp = p.speed;

      if(C("dash") && p.dashCd <= 0){
        p.dashT = 10;
        p.dashCd = 40;
        p.inv = Math.max(p.inv,16);
      }

      if(p.dashT > 0){
        p.dashT--;
        sp = 7.4;
      }

      if(nn.l > .001){
        move(p,nn.x * sp,nn.y * sp);
      }

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
  }

  /*
    念のため、ページ外へ指が出た時も止める。
  */
  document.addEventListener("pointerup",function(){
    if(active){
      resetStick();
    }
  },{passive:true});

  document.addEventListener("visibilitychange",function(){
    if(document.hidden){
      resetStick();
    }
  });

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

    if(Math.abs(mx) + Math.abs(my) > 0.001){
      p.dir = Math.abs(mx) > Math.abs(my)
        ? (mx > 0 ? "right" : "left")
        : (my > 0 ? "down" : "up");
    }

    let sp = p.speed;

    if(C("dash") && p.dashCd <= 0){
      p.dashT = 10;
      p.dashCd = 40;
      p.inv = Math.max(p.inv,16);
    }

    if(p.dashT > 0){
      p.dashT--;
      sp = 7.4;
    }

    if(nn.l > .001){
      move(p,nn.x * sp,nn.y * sp);
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