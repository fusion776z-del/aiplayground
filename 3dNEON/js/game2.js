// js/game2.js
// Stage2: ここだけ編集すれば、ステージごとの敵出現・背景・クリア条件を変えられます。
window.Stage2 = (() => {
  let timer = 0;
  let spawnTimer = 0;
  let spawned = 0;
  const goal = 24;
  const enemyColor = 0xa78bfa;
  const enemySpeed = 6.2;

  function init(game) {
    timer = 0; spawnTimer = 0; spawned = 0;
    game.camera.position.set(0, 3.2, 8);
    game.scene.fog.color.set(0x111827);
  }

  function update(game, dt) {
    timer += dt; spawnTimer -= dt;
    if (spawnTimer <= 0 && spawned < goal) {
      const wave = Math.sin(timer * 1.8) * 2.5;
      game.spawnEnemy({
        x: wave + (Math.random() - .5) * 2.2,
        y: (Math.random() - .5) * 4.2,
        z: -26,
        hp: 1,
        speed: enemySpeed + Math.random() * 2.0,
        size: 0.56,
        color: enemyColor,
        emissive: 0x2e1065
      });
      spawned++;
      spawnTimer = 0.48;
    }
  }

  function isClear(game) {
    return spawned >= goal && game.enemies.length === 0;
  }

  return { init, update, isClear };
})();
