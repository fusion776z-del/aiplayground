// js/game4.js
// Stage4: ここだけ編集すれば、ステージごとの敵出現・背景・クリア条件を変えられます。
window.Stage4 = (() => {
  let timer = 0;
  let spawnTimer = 0;
  let spawned = 0;
  const goal = 34;
  const enemyColor = 0x84cc16;
  const enemySpeed = 7.4;

  function init(game) {
    timer = 0; spawnTimer = 0; spawned = 0;
    game.camera.position.set(0, 3.2, 8);
    game.scene.fog.color.set(0x052e16);
  }

  function update(game, dt) {
    timer += dt; spawnTimer -= dt;
    if (spawnTimer <= 0 && spawned < goal) {
      const wave = Math.sin(timer * 2.6) * 2.5;
      game.spawnEnemy({
        x: wave + (Math.random() - .5) * 3.0,
        y: (Math.random() - .5) * 4.2,
        z: -26,
        hp: 2,
        speed: enemySpeed + Math.random() * 2.5,
        size: 0.58,
        color: enemyColor,
        emissive: 0x1a2e05
      });
      spawned++;
      spawnTimer = 0.4;
    }
  }

  function isClear(game) {
    return spawned >= goal && game.enemies.length === 0;
  }

  return { init, update, isClear };
})();
