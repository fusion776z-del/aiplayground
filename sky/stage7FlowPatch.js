/*
  stage7FlowPatch.js

  必ず game.js より後、できれば一番最後に読み込む。

  修正内容:
  - Stage7の扉開放直後にボスラッシュが始まる問題を止める
  - 扉を開ける → 魔法陣出現
  - 魔法陣に乗る → Stage1〜Stage6のボスラッシュ開始
  - ボスラッシュ全撃破 → 真の魔法陣出現
  - 真の魔法陣に乗る → アビス・オーバーロード戦開始
  - ボスラッシュ中のボスが全部アビスになる問題を修正
  - ボスラッシュ / アビス戦の背景を宇宙背景にする
*/
(function(){
  "use strict";

  if(window.__stage7FinalRushFlowV5Applied){
    return;
  }

  window.__stage7FinalRushFlowV5Applied = true;
  window.__stage7FlowPatchVersion = "stage7-final-rush-flow-v5-space-bg";

  var TWO_PI = Math.PI * 2;

  function isStage7(){
    try{
      if(typeof G === "undefined" || !G.map) return false;

      return (
        G.stageIndex === 6 ||
        G.map.id === "stage7" ||
        String(G.map.name || "").indexOf("虚空") >= 0 ||
        String(G.map.name || "").indexOf("最終決戦") >= 0 ||
        String(G.map.name || "").indexOf("ボスラッシュ") >= 0 ||
        !!G.__stage7Rush ||
        !!G.__stage7FinalAbyss
      );
    }catch(e){
      return false;
    }
  }

  function hitSafe(a,b){
    return !!(
      a && b &&
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y
    );
  }

  function say(text, t){
    if(typeof msg === "function"){
      msg(text, t || 90);
    }else if(typeof G !== "undefined"){
      G.message = text;
      G.messageT = t || 90;
    }
  }

  function flushInput(){
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

  function consumeActionInputs(){
    if(typeof input === "undefined") return;

    input.attack = 0;
    input.action = 0;
    input.start = 0;
  }

  function wasActionPressed(){
    if(typeof input === "undefined") return false;

    return !!(
      input.action ||
      input.attack ||
      input.start
    );
  }

  function playerRect(extraX, extraY){
    if(typeof G === "undefined" || !G.player) return null;

    var p = G.player;

    extraX = extraX || 0;
    extraY = extraY || 0;

    return {
      x: p.x - extraX,
      y: p.y - extraY,
      w: p.w + extraX * 2,
      h: p.h + extraY * 2
    };
  }

  function playerCenter(){
    if(typeof G === "undefined" || !G.player) return null;

    var p = G.player;

    return {
      x: p.x + p.w / 2,
      y: p.y + p.h / 2
    };
  }

  function isBossDoor(d){
    if(!d) return false;

    return (
      d.id === "boss_door" ||
      String(d.id || "").indexOf("boss") >= 0 ||
      String(d.label || "").indexOf("扉") >= 0 ||
      String(d.requiredItem || "").indexOf("key") >= 0
    );
  }

  function getTouchedDoor(){
    if(typeof G === "undefined" || !G.player || !Array.isArray(G.doors)){
      return null;
    }

    /*
      locked door は壁判定で完全には重なれないため少し広め。
      ただし離れた場所からは届かない。
    */
    var r = playerRect(34, 34);

    for(var i = 0; i < G.doors.length; i++){
      var d = G.doors[i];

      if(d && hitSafe(r, d)){
        return d;
      }
    }

    return null;
  }

  function hasItemSafe(id){
    if(typeof G === "undefined" || !G.player || !id){
      return false;
    }

    if(typeof hasItem === "function"){
      try{
        if(hasItem(id)) return true;
      }catch(e){}
    }

    var inv = G.player.inventory || [];

    for(var i = 0; i < inv.length; i++){
      var v = inv[i];

      if(v === id){
        return true;
      }

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

  function cloneObj(o){
    var r = {};

    if(!o) return r;

    for(var k in o){
      if(Object.prototype.hasOwnProperty.call(o,k)){
        r[k] = o[k];
      }
    }

    return r;
  }

  function ensureFlow(){
    if(!isStage7()) return;

    if(!G.stage7Flow){
      G.stage7Flow = {};
    }

    var f = G.stage7Flow;

    if(typeof f.doorOpened !== "boolean") f.doorOpened = false;

    if(typeof f.normalCircleShown !== "boolean") f.normalCircleShown = false;
    if(typeof f.normalCircleArmed !== "boolean") f.normalCircleArmed = false;
    if(typeof f.normalCircleConsumed !== "boolean") f.normalCircleConsumed = false;

    if(typeof f.bossRushStarted !== "boolean") f.bossRushStarted = false;
    if(typeof f.bossRushCleared !== "boolean") f.bossRushCleared = false;

    if(typeof f.trueCircleShown !== "boolean") f.trueCircleShown = false;
    if(typeof f.trueCircleArmed !== "boolean") f.trueCircleArmed = false;
    if(typeof f.trueCircleConsumed !== "boolean") f.trueCircleConsumed = false;

    if(typeof f.abyssStarted !== "boolean") f.abyssStarted = false;

    if(G.map && !f.bossRushStarted && !f.abyssStarted){
      /*
        他のボス扉・決闘空間系パッチが使う魔法陣を消す。
        Stage7ではこのパッチ専用の __stage7Circle を使う。
      */
      G.map.__bossWarpCircle = null;
      G.map.__bossDoorOpened = false;
    }
  }

  function saveFinalAbyssSource(){
    if(!isStage7()) return;

    if(G.__stage7FinalAbyssSource) return;

    var src = null;

    if(typeof STAGES !== "undefined" && Array.isArray(STAGES) && STAGES[6] && STAGES[6].boss){
      src = STAGES[6].boss;
    }else if(G.map && G.map.boss){
      src = G.map.boss;
    }

    if(!src){
      src = {
        id: "abyss_overlord",
        name: "アビス・オーバーロード",
        w: 154,
        h: 122,
        hp: 2600,
        maxHp: 2600,
        color: "#8b5cff"
      };
    }

    G.__stage7FinalAbyssSource = cloneObj(src);
  }

  function getRushBossSourceList(){
    /*
      重要:
      ここで G.map.boss を使うと、Stage7のアビスだけが何度も出る。
      必ず STAGES[0]〜STAGES[5] の boss をコピーする。
    */
    var list = [];

    if(typeof STAGES !== "undefined" && Array.isArray(STAGES)){
      for(var i = 0; i < 6; i++){
        if(STAGES[i] && STAGES[i].boss){
          var b = cloneObj(STAGES[i].boss);
          b.rushStageIndex = i;
          list.push(b);
        }
      }
    }

    /*
      STAGES が見えない場合の保険。
      通常はここには入らない。
    */
    if(!list.length){
      list = [
        {name:"モスグリフォン", color:"#73df78", w:112, h:97, hp:120, maxHp:120, rushStageIndex:0},
        {name:"エルダートレント", color:"#46c66a", w:119, h:102, hp:180, maxHp:180, rushStageIndex:1},
        {name:"クリスタル・アーク", color:"#72f7ff", w:126, h:107, hp:250, maxHp:250, rushStageIndex:2},
        {name:"ラヴァワイバーン", color:"#ff7048", w:133, h:112, hp:340, maxHp:340, rushStageIndex:3},
        {name:"スカイガーディアン", color:"#ffd84d", w:140, h:117, hp:460, maxHp:460, rushStageIndex:4},
        {name:"アストラルリヴァイアサン", color:"#9b7cff", w:147, h:122, hp:620, maxHp:620, rushStageIndex:5}
      ];
    }

    return list;
  }

  function stopPrematureBossObjects(){
    if(!isStage7()) return;

    ensureFlow();

    if(G.stage7Flow.bossRushStarted || G.stage7Flow.abyssStarted){
      return;
    }

    G.boss = null;

    if(G.bossRush){
      G.bossRush.active = false;
      G.bossRush.started = false;
      G.bossRush.cleared = false;
    }

    G.bossRushCleared = false;
  }

  function makeCircle(kind, cx, cy){
    return {
      id: kind === "true" ? "stage7_true_magic_circle" : "stage7_magic_circle",
      kind: kind,
      x: cx - 36,
      y: cy - 24,
      w: 72,
      h: 48,
      cx: cx,
      cy: cy,
      r: 42,
      active: true,
      armed: false,
      mustLeave: true,
      createdAt: G.time || 0
    };
  }

  function createNormalCircleFromDoor(d){
    var cx = d.x + d.w / 2;

    /*
      扉の奥。
      近すぎると開けた瞬間に重なるので、少し上へ出す。
    */
    var cy = Math.max(80, d.y - 86);

    return makeCircle("normal", cx, cy);
  }

  function createTrueCircle(){
    var w = G.map && G.map.width ? G.map.width : 920;
    var h = G.map && G.map.height ? G.map.height : 1180;

    /*
      ボスラッシュ後、プレイヤーの近くに出す。
      出現直後の即発火を避けるため mustLeave は true。
    */
    return makeCircle("true", w / 2, h - 260);
  }

  function setCircle(circle){
    if(!isStage7() || !G.map || !circle) return;

    G.map.__stage7Circle = circle;

    if(circle.kind === "true"){
      G.stage7Flow.trueCircleShown = true;
      G.stage7Flow.trueCircleArmed = false;
      G.stage7Flow.trueCircleConsumed = false;
      G.map.objective = "真の魔法陣に乗る";
      say("真の魔法陣が出現した！", 130);
    }else{
      G.stage7Flow.normalCircleShown = true;
      G.stage7Flow.normalCircleArmed = false;
      G.stage7Flow.normalCircleConsumed = false;
      G.map.objective = "魔法陣に乗る";
      say("魔法陣が出現した！", 120);
    }
  }

  function clearCircle(){
    if(G && G.map){
      G.map.__stage7Circle = null;
    }
  }

  function playerOnCircle(c){
    var p = playerCenter();

    if(!p || !c || !c.active) return false;

    var dx = p.x - c.cx;
    var dy = p.y - c.cy;

    return dx * dx + dy * dy <= c.r * c.r;
  }

  function openStage7DoorOnly(d){
    if(!isStage7() || !d) return false;

    ensureFlow();
    saveFinalAbyssSource();

    if(d.requiredItem && !hasItemSafe(d.requiredItem)){
      say("鍵が必要だ", 60);
      consumeActionInputs();
      return true;
    }

    d.locked = false;
    d.opened = true;
    d.used = true;

    G.stage7Flow.doorOpened = true;
    G.stage7Flow.normalCircleShown = true;
    G.stage7Flow.normalCircleArmed = false;
    G.stage7Flow.normalCircleConsumed = false;
    G.stage7Flow.bossRushStarted = false;
    G.stage7Flow.bossRushCleared = false;
    G.stage7Flow.trueCircleShown = false;
    G.stage7Flow.trueCircleConsumed = false;
    G.stage7Flow.abyssStarted = false;

    stopPrematureBossObjects();

    setCircle(createNormalCircleFromDoor(d));

    G.map.objective = "魔法陣に乗る";

    say((d.label || "扉") + "が開いた！ 奥の魔法陣へ向かおう", 120);

    consumeActionInputs();
    flushInput();

    return true;
  }

  function preemptStage7DoorInput(){
    if(!isStage7()) return;
    if(!G || G.state !== "field") return;
    if(!wasActionPressed()) return;

    ensureFlow();

    /*
      ボスラッシュ中・アビス戦中は扉処理しない。
    */
    if(
      G.stage7Flow.normalCircleConsumed ||
      G.stage7Flow.bossRushStarted ||
      G.stage7Flow.abyssStarted
    ){
      return;
    }

    var d = getTouchedDoor();

    if(!d) return;

    if(isBossDoor(d)){
      openStage7DoorOnly(d);
      return;
    }
  }

  function makeRushArena(){
    var w = 920;
    var h = 1180;

    saveFinalAbyssSource();

    G.map.__stage7RushArena = true;
    G.map.name = "虚空ボスラッシュ";
    G.map.objective = "ボスラッシュを突破する";
    G.map.width = w;
    G.map.height = h;
    G.map.bossRoom = {
      x: 70,
      y: 90,
      w: w - 140,
      h: h - 250
    };

    var terrain = [
      {x:0, y:0, w:w, h:34, type:"cliff"},
      {x:0, y:0, w:34, h:h, type:"cliff"},
      {x:w-34, y:0, w:34, h:h, type:"cliff"},
      {x:0, y:h-34, w:w, h:34, type:"cliff"},
      {x:90, y:120, w:170, h:32, type:"stone"},
      {x:w-260, y:120, w:170, h:32, type:"stone"},
      {x:100, y:h-190, w:150, h:32, type:"stone"},
      {x:w-250, y:h-190, w:150, h:32, type:"stone"}
    ];

    G.map.terrain = terrain;
    G.terrain = terrain;

    G.map.npcs = [];
    G.map.shops = [];
    G.map.chests = [];
    G.map.doors = [];
    G.map.enemies = [];

    G.npcs = [];
    G.shops = [];
    G.chests = [];
    G.doors = [];
    G.enemies = [];
    G.drops = [];
    G.bullets = [];
    G.effects = [];

    G.player.x = w / 2 - G.player.w / 2;
    G.player.y = h - 170;
    G.player.dir = "up";
    G.player.vx = 0;
    G.player.vy = 0;
    G.player.inv = Math.max(G.player.inv || 0, 90);
    G.player.attackT = 0;
    G.player.attackCd = 0;
    G.player.combo = 0;
    G.player.comboT = 0;

    if(typeof cam === "function"){
      cam();
    }
  }

  function createRushBoss(src, index, total){
    src = src || {};

    var room = G.map.bossRoom;
    var bw = src.w || 130;
    var bh = src.h || 105;

    var baseHp = src.maxHp || src.hp || 160;
    var hp = Math.max(120, Math.round(baseHp * (0.90 + index * 0.20)));

    return {
      id: "stage7_rush_boss_" + index,
      name: src.name || ("ボス " + (index + 1)),
      x: room.x + room.w / 2 - bw / 2,
      y: room.y + 110,
      w: bw,
      h: bh,
      hp: hp,
      maxHp: hp,
      atk: src.atk || 3,
      color: src.color || "#8b5cff",
      t: 0,
      shot: 82,
      phase: 1,
      stage7RushBoss: true,
      rushIndex: index,
      rushTotal: total,
      rushStageIndex: typeof src.rushStageIndex === "number" ? src.rushStageIndex : index
    };
  }

  function spawnRushBoss(){
    var rush = G.__stage7Rush;

    if(!rush || !rush.active) return;

    var src = rush.bosses[rush.index];

    if(!src){
      completeRush();
      return;
    }

    G.boss = createRushBoss(src, rush.index, rush.bosses.length);
    G.state = "field";
    G.lock = Math.max(G.lock || 0, 20);

    say(
      "ボスラッシュ " + (rush.index + 1) + "/" + rush.bosses.length + "： " + G.boss.name,
      110
    );
  }

  function startRushFromCircle(){
    if(!isStage7()) return;

    ensureFlow();

    if(G.stage7Flow.bossRushStarted) return;

    G.stage7Flow.normalCircleConsumed = true;
    G.stage7Flow.bossRushStarted = true;

    clearCircle();

    makeRushArena();

    G.__stage7Rush = {
      active: true,
      index: 0,
      bosses: getRushBossSourceList(),
      cleared: false
    };

    spawnRushBoss();

    say("ボスラッシュ開始！", 100);
    flushInput();
  }

  function completeRush(){
    if(!isStage7()) return;

    ensureFlow();

    if(G.__stage7Rush){
      G.__stage7Rush.active = false;
      G.__stage7Rush.cleared = true;
    }

    G.boss = null;
    G.bullets = [];
    G.bossBullets = [];
    G.bossZones = [];

    G.stage7Flow.bossRushCleared = true;
    G.stage7Flow.trueCircleShown = true;
    G.stage7Flow.trueCircleConsumed = false;

    setCircle(createTrueCircle());

    G.map.objective = "真の魔法陣に乗る";

    say("ボスラッシュ突破！ 真の魔法陣が出現した！", 150);
  }

  function startAbyssFromTrueCircle(){
    if(!isStage7()) return;

    ensureFlow();

    if(G.stage7Flow.abyssStarted) return;

    G.stage7Flow.trueCircleConsumed = true;
    G.stage7Flow.abyssStarted = true;

    clearCircle();

    G.__stage7Rush = null;
    G.__stage7FinalAbyss = true;

    var src = G.__stage7FinalAbyssSource || (G.map && G.map.boss) || {
      id: "abyss_overlord",
      name: "アビス・オーバーロード",
      w: 154,
      h: 122,
      hp: 2600,
      maxHp: 2600,
      color: "#8b5cff"
    };

    var room = G.map.bossRoom || {
      x: 70,
      y: 90,
      w: G.map.width - 140,
      h: G.map.height - 250
    };

    var bw = src.w || 154;
    var bh = src.h || 122;
    var hp = Math.max(src.maxHp || src.hp || 2600, 2600);

    G.boss = {
      id: src.id || "abyss_overlord",
      name: src.name || "アビス・オーバーロード",
      x: room.x + room.w / 2 - bw / 2,
      y: room.y + 110,
      w: bw,
      h: bh,
      hp: hp,
      maxHp: hp,
      atk: src.atk || 4,
      color: src.color || "#8b5cff",
      t: 0,
      shot: 82,
      phase: 1,
      stage7FinalBoss: true
    };

    G.state = "field";
    G.lock = Math.max(G.lock || 0, 45);
    G.bullets = [];
    G.bossBullets = [];
    G.bossZones = [];
    G.map.objective = "アビス・オーバーロードを倒す";

    say("アビス・オーバーロード出現！", 140);
    flushInput();
  }

  function updateStage7Circle(){
    if(!isStage7()) return;
    if(!G.map || !G.map.__stage7Circle) return;

    ensureFlow();

    var c = G.map.__stage7Circle;
    var on = playerOnCircle(c);

    /*
      出現直後に重なっていても発火しない。
      一度離れたら armed。
    */
    if(c.mustLeave){
      if(!on){
        c.mustLeave = false;
        c.armed = true;

        if(c.kind === "true"){
          G.stage7Flow.trueCircleArmed = true;
        }else{
          G.stage7Flow.normalCircleArmed = true;
        }
      }

      return;
    }

    if(!c.armed){
      c.armed = true;
    }

    if(!on) return;

    if(c.kind === "normal"){
      if(!G.stage7Flow.normalCircleConsumed && !G.stage7Flow.bossRushStarted){
        startRushFromCircle();
      }

      return;
    }

    if(c.kind === "true"){
      if(!G.stage7Flow.trueCircleConsumed && !G.stage7Flow.abyssStarted){
        startAbyssFromTrueCircle();
      }
    }
  }

  /*
    action / tryDoor は保険として上書き。
    ただし本命は update 前の preemptStage7DoorInput。
  */
  var oldAction = typeof action === "function" ? action : null;

  action = function(){
    if(isStage7() && G && G.state === "field"){
      ensureFlow();

      if(
        !G.stage7Flow.normalCircleConsumed &&
        !G.stage7Flow.bossRushStarted &&
        !G.stage7Flow.abyssStarted
      ){
        var d = getTouchedDoor();

        if(d && isBossDoor(d)){
          openStage7DoorOnly(d);
          return;
        }
      }
    }

    if(oldAction){
      return oldAction.apply(this, arguments);
    }
  };

  var oldTryDoor = typeof tryDoor === "function" ? tryDoor : null;

  tryDoor = function(d){
    if(isStage7()){
      ensureFlow();

      if(d && isBossDoor(d)){
        var touched = getTouchedDoor();

        if(touched === d){
          openStage7DoorOnly(d);
        }

        return;
      }
    }

    if(oldTryDoor){
      return oldTryDoor.apply(this, arguments);
    }
  };

  /*
    spawnBoss も保険。
    Stage7でボスラッシュ前に呼ばれたら、ボス生成ではなく魔法陣を維持する。
  */
  var oldSpawnBoss = typeof spawnBoss === "function" ? spawnBoss : null;

  spawnBoss = function(){
    if(isStage7()){
      ensureFlow();

      /*
        アビス戦中だけ通常ボス生成を許可。
        ただしこのパッチでは startAbyssFromTrueCircle で直接 G.boss を作る。
      */
      if(!G.stage7Flow.bossRushStarted && !G.stage7Flow.abyssStarted){
        stopPrematureBossObjects();

        var d = getTouchedDoor();

        if(d && isBossDoor(d) && !G.map.__stage7Circle){
          openStage7DoorOnly(d);
        }

        return;
      }
    }

    if(oldSpawnBoss){
      return oldSpawnBoss.apply(this, arguments);
    }
  };

  /*
    ボスラッシュ中のボス撃破処理。
    通常の dmgB に渡すと bossDefeat / clear に入る可能性があるため、
    ボスラッシュ中だけここで処理する。
  */
  var oldDmgB = typeof dmgB === "function" ? dmgB : null;

  dmgB = function(damage){
    if(
      isStage7() &&
      G.__stage7Rush &&
      G.__stage7Rush.active &&
      G.boss &&
      G.boss.stage7RushBoss
    ){
      G.boss.hp -= damage;

      if(typeof fx === "function"){
        fx(G.boss.x + G.boss.w / 2, G.boss.y + G.boss.h / 2, "#fff7a8", 14, 3);
      }

      if(G.boss.hp <= 0){
        G.__stage7Rush.index++;
        G.boss = null;
        G.bullets = [];
        G.bossBullets = [];
        G.bossZones = [];

        if(G.__stage7Rush.index >= G.__stage7Rush.bosses.length){
          completeRush();
        }else{
          spawnRushBoss();
        }
      }

      return;
    }

    if(oldDmgB){
      return oldDmgB.apply(this, arguments);
    }
  };

  /*
    ボスラッシュ中、既存のボス描画やAIが G.stageIndex を見て全部アビス扱いにする場合がある。
    その対策として、ラッシュボスの処理中だけ一時的に stageIndex を差し替える。
  */
  if(typeof drawBoss3D === "function" && !drawBoss3D.__stage7RushVisualWrapped){
    var oldDrawBoss3D = drawBoss3D;

    drawBoss3D = function(ctxArg, b, wxArg, wyArg, t){
      if(isStage7() && b && b.stage7RushBoss && typeof b.rushStageIndex === "number"){
        var oldIndex = G.stageIndex;

        G.stageIndex = b.rushStageIndex;

        try{
          return oldDrawBoss3D.call(this, ctxArg, b, wxArg, wyArg, t);
        }finally{
          G.stageIndex = oldIndex;
        }
      }

      return oldDrawBoss3D.call(this, ctxArg, b, wxArg, wyArg, t);
    };

    drawBoss3D.__stage7RushVisualWrapped = true;
  }

  if(typeof updBoss === "function" && !updBoss.__stage7RushAIWrapped){
    var oldUpdBoss = updBoss;

    updBoss = function(){
      if(
        isStage7() &&
        G &&
        G.boss &&
        G.boss.stage7RushBoss &&
        typeof G.boss.rushStageIndex === "number"
      ){
        var oldIndex = G.stageIndex;

        G.stageIndex = G.boss.rushStageIndex;

        try{
          return oldUpdBoss.apply(this, arguments);
        }finally{
          G.stageIndex = oldIndex;
        }
      }

      return oldUpdBoss.apply(this, arguments);
    };

    updBoss.__stage7RushAIWrapped = true;
  }

  /*
    宇宙背景。
    既存の bg が Stage7 ボスラッシュ中に草原系 fallback になる場合を上書きする。
  */
  var oldBgStage7Space = typeof bg === "function" ? bg : null;

  function drawStage7SpaceBackground(){
    if(typeof ctx === "undefined") return;

    var time = (typeof G !== "undefined" && G) ? (G.time || 0) : 0;
    var vw = typeof VW !== "undefined" ? VW : 360;
    var vh = typeof VH !== "undefined" ? VH : 640;

    /*
      宇宙グラデーション
    */
    var sky = ctx.createLinearGradient(0, 0, 0, vh);
    sky.addColorStop(0, "#050014");
    sky.addColorStop(0.30, "#10002c");
    sky.addColorStop(0.62, "#22104d");
    sky.addColorStop(1, "#04000b");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, vw, vh);

    /*
      星雲
    */
    ctx.save();

    ctx.globalAlpha = 0.34;
    var nebula1 = ctx.createRadialGradient(
      vw * 0.26,
      vh * 0.22,
      10,
      vw * 0.26,
      vh * 0.22,
      vh * 0.56
    );
    nebula1.addColorStop(0, "rgba(181,107,255,0.62)");
    nebula1.addColorStop(0.45, "rgba(99,216,255,0.22)");
    nebula1.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = nebula1;
    ctx.fillRect(0, 0, vw, vh);

    ctx.globalAlpha = 0.25;
    var nebula2 = ctx.createRadialGradient(
      vw * 0.78,
      vh * 0.45,
      12,
      vw * 0.78,
      vh * 0.45,
      vh * 0.52
    );
    nebula2.addColorStop(0, "rgba(255,216,77,0.30)");
    nebula2.addColorStop(0.42, "rgba(139,92,255,0.25)");
    nebula2.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = nebula2;
    ctx.fillRect(0, 0, vw, vh);

    ctx.restore();

    /*
      星
    */
    ctx.save();

    for(var i = 0; i < 110; i++){
      var x = (i * 73 + 19) % vw;
      var y = (i * 131 + 47 + Math.floor(time * 0.10)) % vh;
      var twinkle = 0.35 + Math.sin(time * 0.06 + i * 1.7) * 0.28;
      var size = 1 + (i % 3) * 0.45;

      ctx.globalAlpha = Math.max(0.12, twinkle);
      ctx.fillStyle = i % 7 === 0 ? "#fff7a8" : i % 5 === 0 ? "#9ef7ff" : "#ffffff";
      ctx.fillRect(x, y, size, size);
    }

    ctx.restore();

    /*
      流れ星
    */
    ctx.save();
    ctx.globalAlpha = 0.56;
    ctx.strokeStyle = "#9ef7ff";
    ctx.lineWidth = 1.4;
    ctx.lineCap = "round";

    for(var s = 0; s < 3; s++){
      var sx = (time * (1.6 + s * 0.45) + s * 120) % (vw + 160) - 80;
      var sy = 90 + s * 145 + Math.sin(time * 0.015 + s) * 28;

      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx - 42, sy + 18);
      ctx.stroke();
    }

    ctx.restore();

    /*
      宇宙に浮かぶアリーナ床。
      terrain は後で drawTerrain が描くので、ここでは土台と魔法円を描く。
    */
    if(typeof G !== "undefined" && G && G.map && G.camera){
      ctx.save();
      ctx.translate(-G.camera.x, -G.camera.y);

      var mapW = G.map.width || 920;
      var mapH = G.map.height || 1180;

      var floorGrad = ctx.createRadialGradient(
        mapW / 2,
        mapH / 2,
        80,
        mapW / 2,
        mapH / 2,
        Math.max(mapW, mapH) * 0.70
      );

      floorGrad.addColorStop(0, "#3b2a7a");
      floorGrad.addColorStop(0.45, "#241052");
      floorGrad.addColorStop(0.82, "#10051f");
      floorGrad.addColorStop(1, "#05000d");

      ctx.fillStyle = floorGrad;

      if(typeof RR === "function"){
        RR(34, 34, mapW - 68, mapH - 68, 42);
        ctx.fill();
      }else{
        ctx.fillRect(34, 34, mapW - 68, mapH - 68);
      }

      /*
        外周ライン
      */
      ctx.save();
      ctx.globalAlpha = 0.38;
      ctx.strokeStyle = "#b56bff";
      ctx.lineWidth = 6;

      if(typeof RR === "function"){
        RR(52, 52, mapW - 104, mapH - 104, 38);
        ctx.stroke();
      }else{
        ctx.strokeRect(52, 52, mapW - 104, mapH - 104);
      }

      /*
        魔法円
      */
      ctx.globalAlpha = 0.30;
      ctx.strokeStyle = "#9ef7ff";
      ctx.lineWidth = 3;

      ctx.beginPath();
      ctx.arc(mapW / 2, mapH / 2 + 70, 220, 0, TWO_PI);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(mapW / 2, mapH / 2 + 70, 145, 0, TWO_PI);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(mapW / 2, mapH / 2 + 70, 72, 0, TWO_PI);
      ctx.stroke();

      /*
        回転ルーン線
      */
      ctx.globalAlpha = 0.44;
      ctx.strokeStyle = "#efe7ff";
      ctx.lineWidth = 2;

      var spin = time * 0.006;

      for(var r = 0; r < 12; r++){
        var a = spin + r / 12 * TWO_PI;
        var x1 = mapW / 2 + Math.cos(a) * 90;
        var y1 = mapH / 2 + 70 + Math.sin(a) * 90;
        var x2 = mapW / 2 + Math.cos(a) * 218;
        var y2 = mapH / 2 + 70 + Math.sin(a) * 218;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      /*
        浮遊する光粒
      */
      ctx.fillStyle = "#ffffff";

      for(var p = 0; p < 36; p++){
        var pa = p * 0.83 + time * 0.012;
        var pr = 260 + Math.sin(time * 0.02 + p) * 46;
        var px = mapW / 2 + Math.cos(pa) * pr;
        var py = mapH / 2 + 70 + Math.sin(pa) * pr * 0.72;

        ctx.globalAlpha = 0.18 + (p % 5) * 0.05;
        ctx.beginPath();
        ctx.arc(px, py, 2 + (p % 3), 0, TWO_PI);
        ctx.fill();
      }

      ctx.restore();
      ctx.restore();
    }
  }

  bg = function(){
    if(
      typeof G !== "undefined" &&
      G &&
      G.map &&
      (
        G.map.__stage7RushArena ||
        G.__stage7Rush ||
        G.__stage7FinalAbyss ||
        (
          G.stageIndex === 6 &&
          String(G.map.name || "").indexOf("ボスラッシュ") >= 0
        )
      )
    ){
      drawStage7SpaceBackground();
      return;
    }

    if(oldBgStage7Space){
      oldBgStage7Space();
    }
  };

  /*
    oldUpdate の前に Stage7扉入力を奪う。
  */
  var oldUpdate = typeof update === "function" ? update : null;

  update = function(){
    preemptStage7DoorInput();

    if(oldUpdate){
      oldUpdate.apply(this, arguments);
    }

    if(isStage7()){
      ensureFlow();

      /*
        扉開放後、ボスラッシュ開始前に何かがボスを作ったら消す。
      */
      if(
        G.stage7Flow.doorOpened &&
        !G.stage7Flow.bossRushStarted &&
        !G.stage7Flow.abyssStarted
      ){
        stopPrematureBossObjects();
      }

      updateStage7Circle();
    }
  };

  function drawStage7Circle(){
    if(!isStage7()) return;
    if(!G.map || !G.map.__stage7Circle) return;

    var c = G.map.__stage7Circle;

    if(!c.active) return;

    var sx = typeof wx === "function" ? wx(c.cx) : c.cx;
    var sy = typeof wy === "function" ? wy(c.cy) : c.cy;

    var t = G.time || 0;
    var pulse = 1 + Math.sin(t * 0.12) * 0.08;
    var spin = t * 0.035;

    var main = c.kind === "true" ? "#fff7a8" : "#9ef7ff";
    var sub = c.kind === "true" ? "#ffd84d" : "#b56bff";
    var label = c.kind === "true" ? "真の魔法陣に乗る" : "魔法陣に乗る";

    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    ctx.globalAlpha = 0.24;
    ctx.fillStyle = main;
    ctx.beginPath();
    ctx.ellipse(sx, sy + 2, 62 * pulse, 30 * pulse, 0, 0, TWO_PI);
    ctx.fill();

    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = main;
    ctx.lineWidth = 3;
    ctx.shadowBlur = 18;
    ctx.shadowColor = main;
    ctx.beginPath();
    ctx.ellipse(sx, sy, 42 * pulse, 22 * pulse, 0, 0, TWO_PI);
    ctx.stroke();

    ctx.globalAlpha = 0.78;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(sx, sy, 27 * pulse, 14 * pulse, 0, 0, TWO_PI);
    ctx.stroke();

    ctx.strokeStyle = sub;
    ctx.lineWidth = 1.5;

    for(var i = 0; i < 8; i++){
      var a = spin + i / 8 * TWO_PI;

      ctx.beginPath();
      ctx.moveTo(
        sx + Math.cos(a) * 10 * pulse,
        sy + Math.sin(a) * 6 * pulse
      );
      ctx.lineTo(
        sx + Math.cos(a) * 38 * pulse,
        sy + Math.sin(a) * 20 * pulse
      );
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
    ctx.textAlign = "center";
    ctx.font = "900 12px system-ui";
    ctx.fillStyle = "#fff";
    ctx.shadowBlur = 8;
    ctx.shadowColor = "#000";
    ctx.fillText(label, sx, sy - 44);
    ctx.textAlign = "left";

    ctx.restore();
  }

  var oldDraw = typeof draw === "function" ? draw : null;

  draw = function(){
    if(oldDraw){
      oldDraw.apply(this, arguments);
    }

    if(typeof G !== "undefined" && G.state !== "title"){
      drawStage7Circle();
    }
  };

  console.log("stage7FlowPatch loaded:", window.__stage7FlowPatchVersion);
})();
