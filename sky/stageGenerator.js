function rand(min, max){
  min = Math.floor(min);
  max = Math.floor(max);
  if(max <= min){
    return min;
  }
  return Math.floor(Math.random() * (max - min)) + min;
}

const LayoutTypes = {
  LINE: "line",
  SPLIT: "split",
  LOOP: "loop",
  ZIGZAG: "zigzag",
  MAZE: "maze",
  CROSS: "cross",
  ISLANDS: "islands",
  RUIN_SAFE: "ruin_safe",
  STAR_TEMPLE: "star_temple",
  VOID_CASTLE: "void_castle"
};

function getStageName(theme){
  const names = {
    grass: "はじまりの草原島",
    forest: "風車の森島",
    cave: "水晶洞窟島",
    fire: "炎の鍛冶島",
    ruin: "雲上遺跡島",
    star: "星霜の神殿島",
    void: "虚空王城・最終決戦"
  };
  return names[theme] || theme;
}

function getObjectiveName(theme){
  const names = {
    grass: "草原の鍵を探す",
    forest: "森の鍵を探す",
    cave: "水晶の鍵を探す",
    fire: "炎の鍵を探す",
    ruin: "遺跡の鍵を探す",
    star: "星霜の鍵を探す",
    void: "虚空の鍵を探す"
  };
  return names[theme] || "鍵を探す";
}

function getKeyName(theme){
  const names = {
    grass: "草原の鍵",
    forest: "森の鍵",
    cave: "水晶の鍵",
    fire: "炎の鍵",
    ruin: "遺跡の鍵",
    star: "星霜の鍵",
    void: "虚空の鍵"
  };
  return names[theme] || "鍵";
}

function getDoorName(theme){
  const names = {
    grass: "草原の扉",
    forest: "森の扉",
    cave: "水晶の扉",
    fire: "炎の扉",
    ruin: "遺跡の扉",
    star: "星霜の扉",
    void: "虚空王の扉"
  };
  return names[theme] || "扉";
}

function getBossName(theme){
  const names = {
    grass: "モスグリフォン",
    forest: "エルダートレント",
    cave: "クリスタル・アーク",
    fire: "ラヴァワイバーン",
    ruin: "スカイガーディアン",
    star: "アストラルリヴァイアサン",
    void: "アビス・オーバーロード"
  };
  return names[theme] || "守護者";
}

function getBossColor(theme){
  const colors = {
    grass: "#73df78",
    forest: "#46c66a",
    cave: "#72f7ff",
    fire: "#ff7048",
    ruin: "#ffd84d",
    star: "#9b7cff",
    void: "#8b5cff"
  };
  return colors[theme] || "#ffffff";
}

function getShopName(theme){
  const names = {
    grass: "強化の祭壇",
    forest: "森の強化祭壇",
    cave: "水晶強化炉",
    fire: "炎の鍛錬炉",
    ruin: "古代強化装置",
    star: "星霜強化祭壇",
    void: "最終強化装置"
  };
  return names[theme] || "強化の祭壇";
}

function getCoreName(theme){
  const cores = {
    grass: "wind_core",
    forest: "forest_core",
    cave: "crystal_core",
    fire: "flame_core",
    ruin: "ruin_core",
    star: "star_core",
    void: "void_core"
  };
  return cores[theme] || theme + "_core";
}

function getClearMessage(theme){
  const messages = {
    grass: "風の古代コアを手に入れた！",
    forest: "森の古代コアを手に入れた！",
    cave: "水晶の古代コアを手に入れた！",
    fire: "炎の古代コアを手に入れた！",
    ruin: "遺跡の古代コアを手に入れた！",
    star: "星霜の古代コアを手に入れた！",
    void: "虚空王を倒した！ 全ての島に光が戻った！"
  };
  return messages[theme] || getStageName(theme) + "クリア！";
}

function getEnemyPool(theme){
  const pools = {
    grass: [
      "slime",
      "slime",
      "slime",
      "fast",
      "wind_bat",
      "spike_beast"
    ],

    forest: [
      "slime",
      "slime",
      "blue_slime",
      "fast",
      "fast",
      "wind_bat",
      "wind_bat",
      "spike_beast",
      "rune_mage"
    ],

    cave: [
      "blue_slime",
      "blue_slime",
      "crystal_slime",
      "crystal_slime",
      "fast",
      "wind_bat",
      "dark_bat",
      "rune_mage",
      "star_drone"
    ],

    fire: [
      "slime",
      "armored_slime",
      "armored_slime",
      "fast",
      "red_fast",
      "red_fast",
      "fire_bat",
      "fire_bat",
      "spike_beast",
      "shadow_knight"
    ],

    ruin: [
      "armored_slime",
      "armored_slime",
      "crystal_slime",
      "red_fast",
      "wind_bat",
      "fire_bat",
      "dark_bat",
      "rune_mage",
      "shadow_knight",
      "star_drone",
      "star_drone"
    ],

    star: [
      "crystal_slime",
      "crystal_slime",
      "armored_slime",
      "void_fast",
      "wind_bat",
      "dark_bat",
      "rune_mage",
      "shadow_knight",
      "star_drone",
      "star_drone",
      "abyss_wraith"
    ],

    void: [
      "armored_slime",
      "void_fast",
      "void_fast",
      "fire_bat",
      "dark_bat",
      "dark_bat",
      "rune_mage",
      "shadow_knight",
      "shadow_knight",
      "star_drone",
      "abyss_wraith",
      "abyss_wraith"
    ]
  };

  return pools[theme] || ["slime"];
}

function pickEnemy(theme, index){
  const pool = getEnemyPool(theme);
  return pool[index % pool.length];
}

function generateTerrain(layout, width, height){
  const terrain = [];

  terrain.push({x:0, y:0, w:width, h:30, type:"cliff"});
  terrain.push({x:0, y:0, w:30, h:height, type:"cliff"});
  terrain.push({x:width - 30, y:0, w:30, h:height, type:"cliff"});
  terrain.push({x:0, y:height - 30, w:width, h:30, type:"cliff"});

  terrain.push({x:30, y:270, w:Math.floor(width / 2) - 108, h:44, type:"stone"});
  terrain.push({x:Math.floor(width / 2) + 78, y:270, w:Math.floor(width / 2) - 108, h:44, type:"stone"});

  if(layout === LayoutTypes.LINE){
    terrain.push({x:80, y:height - 300, w:86, h:76, type:"tree"});
    terrain.push({x:width - 210, y:height - 330, w:98, h:78, type:"tree"});
    terrain.push({x:rand(280, width - 280), y:height - 430, w:78, h:56, type:"rock"});
  }

  if(layout === LayoutTypes.SPLIT){
    terrain.push({x:85, y:height - 360, w:96, h:80, type:"tree"});
    terrain.push({x:width - 190, y:height - 360, w:96, h:80, type:"tree"});
    terrain.push({x:95, y:height - 590, w:120, h:42, type:"stone"});
    terrain.push({x:width - 235, y:height - 590, w:120, h:42, type:"stone"});
    terrain.push({x:Math.floor(width / 2) - 70, y:height - 930, w:140, h:42, type:"stone"});
  }

  if(layout === LayoutTypes.LOOP){
    terrain.push({x:90, y:height - 360, w:100, h:78, type:"tree"});
    terrain.push({x:width - 210, y:height - 420, w:104, h:80, type:"tree"});
    terrain.push({x:115, y:height - 650, w:130, h:42, type:"stone"});
    terrain.push({x:width - 245, y:height - 650, w:130, h:42, type:"stone"});
    terrain.push({x:Math.floor(width / 2) - 160, y:height - 830, w:320, h:40, type:"stone"});
  }

  if(layout === LayoutTypes.ZIGZAG){
    terrain.push({x:80, y:height - 350, w:360, h:42, type:"stone"});
    terrain.push({x:width - 440, y:height - 520, w:360, h:42, type:"stone"});
    terrain.push({x:80, y:height - 690, w:360, h:42, type:"stone"});
    terrain.push({x:width - 440, y:height - 860, w:360, h:42, type:"stone"});
    terrain.push({x:120, y:height - 1030, w:width - 240, h:42, type:"stone"});
  }

  if(layout === LayoutTypes.MAZE){
    terrain.push({x:120, y:height - 420, w:44, h:260, type:"stone"});
    terrain.push({x:280, y:height - 580, w:44, h:260, type:"stone"});
    terrain.push({x:440, y:height - 740, w:44, h:260, type:"stone"});
    terrain.push({x:600, y:height - 900, w:44, h:260, type:"stone"});
    terrain.push({x:80, y:height - 620, w:180, h:40, type:"stone"});
    terrain.push({x:330, y:height - 780, w:180, h:40, type:"stone"});
  }

  if(layout === LayoutTypes.RUIN_SAFE){
    terrain.push({x:width - 270, y:height - 520, w:180, h:44, type:"stone"});
    terrain.push({x:width - 330, y:height - 760, w:220, h:44, type:"stone"});
    terrain.push({x:120, y:height - 900, w:190, h:44, type:"stone"});
    terrain.push({x:Math.floor(width / 2) - 150, y:height - 1080, w:300, h:42, type:"stone"});
    terrain.push({x:width - 190, y:height - 650, w:86, h:60, type:"rock"});
    terrain.push({x:90, y:height - 820, w:88, h:62, type:"rock"});
    terrain.push({x:width - 220, y:height - 980, w:96, h:76, type:"tree"});
  }

  if(layout === LayoutTypes.STAR_TEMPLE){
    terrain.push({x:Math.floor(width / 2) - 32, y:height - 1040, w:64, h:600, type:"stone"});
    terrain.push({x:110, y:height - 780, w:width - 220, h:46, type:"stone"});
    terrain.push({x:150, y:height - 560, w:170, h:42, type:"stone"});
    terrain.push({x:width - 320, y:height - 560, w:170, h:42, type:"stone"});
    terrain.push({x:100, y:height - 920, w:130, h:44, type:"stone"});
    terrain.push({x:width - 230, y:height - 920, w:130, h:44, type:"stone"});
  }

  if(layout === LayoutTypes.VOID_CASTLE){
    terrain.push({x:Math.floor(width / 2) - 34, y:height - 1120, w:68, h:650, type:"stone"});
    terrain.push({x:90, y:height - 850, w:width - 180, h:48, type:"stone"});
    terrain.push({x:130, y:height - 620, w:180, h:44, type:"stone"});
    terrain.push({x:width - 310, y:height - 620, w:180, h:44, type:"stone"});
    terrain.push({x:110, y:height - 1020, w:160, h:44, type:"stone"});
    terrain.push({x:width - 270, y:height - 1020, w:160, h:44, type:"stone"});
    terrain.push({x:150, y:height - 740, w:84, h:60, type:"rock"});
    terrain.push({x:width - 235, y:height - 740, w:84, h:60, type:"rock"});
  }

  return terrain;
}

function generateChests(theme, width, height){
  const keyId = theme + "_key";

  return [
    {
      id:"key",
      x:rand(Math.floor(width * 0.55), width - 90),
      y:rand(Math.floor(height * 0.38), Math.floor(height * 0.64)),
      w:30,
      h:24,
      opened:false,
      item:{type:"key", id:keyId, name:getKeyName(theme)}
    },
    {
      id:"coin",
      x:rand(60, Math.floor(width * 0.45)),
      y:rand(Math.floor(height * 0.35), Math.floor(height * 0.72)),
      w:30,
      h:24,
      opened:false,
      item:{type:"coin", amount:rand(180, 620)}
    },
    {
      id:"herb",
      x:rand(Math.floor(width * 0.55), width - 90),
      y:rand(Math.floor(height * 0.68), height - 210),
      w:30,
      h:24,
      opened:false,
      item:{type:"item", id:"small_herb", name:"小さな薬草", count:1}
    }
  ];
}

function generateNPC(theme, width, height){
  return [{
    id:"guide",
    name:theme === "void" ? "最後の案内人" : "案内人",
    x:rand(95, 260),
    y:height - rand(130, 210),
    w:26,
    h:30,
    color:theme === "void" ? "#ffd84d" : "#89ff9b",
    lines:[
      "ここは" + getStageName(theme) + "。",
      getKeyName(theme) + "を探して北の扉へ向かおう。",
      theme === "void" ? "鍵を使ったら、魔法陣に乗ってから決戦へ進もう。" : "Z連打で通常斬り、3段目は広範囲なぎ払い！"
    ],
    onTalk:function(g){ g.map.objective = getObjectiveName(theme); }
  }];
}

function generateShops(theme, width, height){
  return [{
    id:"shop",
    name:getShopName(theme),
    x:Math.floor(width * 0.66),
    y:height - 165,
    w:34,
    h:34,
    color:theme === "star" ? "#9df7ff" : theme === "void" ? "#ffd84d" : "#ffb347"
  }];
}

function generateEnemies(theme, width, height, stageId){
  const enemies = [];
  const count = 18 + stageId * 6;

  for(let i = 0; i < count; i++){
    enemies.push({
      id:pickEnemy(theme, i + rand(0, 5)),
      x:rand(60, width - 90),
      y:rand(360, height - 260)
    });
  }

  return enemies;
}

function createStage(id, theme, layout){
  const width = 700 + id * 20;
  const height = 1200 + id * 60;
  const keyId = theme + "_key";
  const coreId = getCoreName(theme);
  const bossHp = 45 + id * id * 7;

  return {
    id:"stage" + id,
    name:getStageName(theme),
    width:width,
    height:height,
    spawn:{x:190, y:height - 200},
    objective:"案内人に話す",
    terrain:generateTerrain(layout, width, height),
    npcs:generateNPC(theme, width, height),
    shops:generateShops(theme, width, height),
    chests:generateChests(theme, width, height),
    enemies:generateEnemies(theme, width, height, id),
    doors:[{
      id:"boss_door",
      x:Math.floor(width / 2) - 78,
      y:270,
      w:156,
      h:44,
      locked:true,
      requiredItem:keyId,
      label:getDoorName(theme)
    }],
    boss:{
      id:"boss",
      name:getBossName(theme),
      x:Math.floor(width / 2),
      y:165,
      w:105 + id * 7,
      h:92 + id * 5,
      hp:bossHp,
      maxHp:bossHp,
      color:getBossColor(theme)
    },
    bossRoom:{x:42, y:42, w:width - 84, h:228},
    finalFlow: theme === "void" ? {
      keyToCircle:true,
      circleToBossRush:true,
      bossRushToTrueCircle:true,
      trueCircleToAbyss:true
    } : null,
    autoBossRush:false,
    requireMagicCircle:true,
    onClear:function(g){
      g.message = getClearMessage(theme);
      if(!g.player.cores.includes(coreId)){
        g.player.cores.push(coreId);
      }
      g.map.objective = getStageName(theme) + "クリア！";
    }
  };
}
