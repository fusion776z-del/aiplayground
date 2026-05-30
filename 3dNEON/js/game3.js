// js/game3.js
// Stage3: ここだけ編集すれば、ステージごとの敵出現・背景・クリア条件を変えられます。
window.Stage3 = (() => {
  let timer = 0;
  let spawnTimer = 0;
  let spawned = 0;
  const goal = 28;
  const enemyColor = 0xf97316;
  const enemySpeed = 6.8;

  function init(game) {
    timer = 0; spawnTimer = 0; spawned = 0;
    game.camera.position.set(0, 3.2, 8);
    game.scene.fog.color.set(0x1c1917);
  }

  function update(game, dt) {
    timer += dt; spawnTimer -= dt;
    if (spawnTimer <= 0 && spawned < goal) {
      const wave = Math.sin(timer * 2.2) * 2.5;
      game.spawnEnemy({
        x: wave + (Math.random() - .5) * 2.6,
        y: (Math.random() - .5) * 4.2,
        z: -26,
        hp: 2,
        speed: enemySpeed + Math.random() * 2.2,
        size: 0.62,
        color: enemyColor,
        emissive: 0x431407
      });
      spawned++;
      spawnTimer = 0.45;
    }
  }

  function isClear(game) {
    return spawned >= goal && game.enemies.length === 0;
  }

  return { init, update, isClear };
})();
