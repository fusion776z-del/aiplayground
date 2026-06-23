// stage1.js

const Stage1 = (() => {

  const enemyData = [
    ["slime", 264, 764],
    ["fast", 361, 681],
    ["wind_bat", 458, 598],

    // ✅ 新しい敵（これだけで追加される）
    ["blue_slime", 300, 700],
    ["red_fast", 420, 800],
    ["dark_bat", 520, 600]
  ];

  const makeEnemy = ([id, x, y]) => ({ id, x, y });

  return {
    id: "stage1",

    enemies: enemyData.map(makeEnemy)

  };

})();
``
