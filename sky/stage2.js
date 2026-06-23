const Stage2 = (() => {

  const enemyData = [
    ["fast", 70, 1050],
    ["wind_bat", 167, 967],
    ["slime", 264, 884],
    ["slime", 361, 801],
    ["slime", 458, 718],
    ["wind_bat", 555, 635],
    ["slime", 652, 552],
    ["slime", 129, 469],
    ["slime", 226, 386],
    ["wind_bat", 323, 1003],
    ["fast", 420, 920],
    ["slime", 517, 837],
    ["slime", 614, 754],
    ["wind_bat", 91, 671],
    ["slime", 188, 588],
    ["fast", 285, 505],
    ["slime", 382, 422],
    ["wind_bat", 479, 1039],
    ["slime", 576, 956],
    ["slime", 673, 873],
    ["fast", 150, 790],
    ["wind_bat", 247, 707],
    ["slime", 344, 624],
    ["slime", 441, 541],
    ["slime", 538, 458],
    ["wind_bat", 635, 375],
    ["slime", 112, 992],
    ["slime", 209, 909],
    ["slime", 306, 826],
    ["wind_bat", 403, 743],
    ["fast", 500, 660],
    ["slime", 597, 577],
    ["slime", 74, 494],
    ["wind_bat", 171, 411],
    ["slime", 268, 1028],
    ["fast", 365, 945],
    ["slime", 462, 862],
    ["wind_bat", 559, 779]
  ];

  // ✅ これがないと絶対クラッシュする
  const makeEnemy = ([id, x, y]) => ({
    id,
    x,
    y
  });

  return {
    id: "stage2",
    name: "風車の森島",
    width: 760,
    height: 1400,

    spawn: { x: 190, y: 1200 },
    objective: "案内人に話す",

    terrain: [
      { x: 0, y: 0, w: 760, h: 30, type: "cliff" },
      { x: 0, y: 0, w: 30, h: 1400, type: "cliff" },
      { x: 730, y: 0, w: 30, h: 1400, type: "cliff" },
      { x: 0, y: 1370, w: 760, h: 30, type: "cliff" },
      { x: 30, y: 270, w: 302, h: 44, type: "stone" },
      { x: 458, y: 270, w: 272, h: 44, type: "stone" },
      { x: 80, y: 1100, w: 86, h: 76, type: "tree" },
      { x: 520, y: 1100, w: 98, h: 78, type: "tree" },
      { x: 90, y: 880, w: 100, h: 78, type: "tree" },
      { x: 235, y: 850, w: 92, h: 74, type: "tree" },
      { x: 474, y: 860, w: 104, h: 80, type: "tree" },
      { x: 360, y: 1010, w: 78, h: 56, type: "rock" },
      { x: 190, y: 760, w: 74, h: 54, type: "rock" }
    ],

    npcs: [
      {
        id: "guide",
        name: "案内人",
        x: 168,
        y: 1194,
        w: 26,
        h: 30,
        color: "#89ff9b",
        lines: [
          "ここは風車の森島。",
          "森の鍵を探して北の扉へ向かおう。",
          "Z連打で通常斬り、3段目は広範囲なぎ払い！"
        ],
        onTalk: function (g) {
          g.map.objective = "森の鍵を探す";
        }
      }
    ],

    shops: [
      {
        id: "shop",
        name: "森の強化祭壇",
        x: 520,
        y: 1165,
        w: 34,
        h: 34,
        color: "#ffb347"
      }
    ],

    chests: [
      {
        id: "key",
        x: 620,
        y: 735,
        w: 30,
        h: 24,
        opened: false,
        item: { type: "key", id: "forest_key", name: "森の鍵" }
      },
      {
        id: "coin",
        x: 105,
        y: 620,
        w: 30,
        h: 24,
        opened: false,
        item: { type: "coin", amount: 320 }
      },
      {
        id: "herb",
        x: 585,
        y: 1040,
        w: 30,
        h: 24,
        opened: false,
        item: { type: "item", id: "small_herb", name: "小さな薬草", count: 1 }
      }
    ],

    // ✅ ここが最重要（これでクラッシュ防止）
    enemies: enemyData.map(makeEnemy),

    doors: [
      {
        id: "boss_door",
        x: 302,
        y: 270,
        w: 156,
        h: 44,
        locked: true,
        requiredItem: "forest_key",
        label: "森の扉"
      }
    ],

    boss: {
      id: "boss",
      name: "エルダートレント",
      x: 380,
      y: 165,
      w: 118,
      h: 102,
      hp: 76,
      maxHp: 76,
      color: "#46c66a"
    },

    bossRoom: { x: 42, y: 42, w: 676, h: 228 },

    onClear: function (g) {
      g.message = "森の古代コアを手に入れた！";
      if (!g.player.cores.includes("forest_core")) {
        g.player.cores.push("forest_core");
      }
      g.map.objective = "風車の森島クリア！";
    }
  };

})();
