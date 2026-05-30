// js/game5.js
// Stage5: ここだけ編集すれば、ステージごとの敵出現・背景・クリア条件を変えられます。
window.Stage5 = (() => {
  let timer = 0;
  let spawnTimer = 0;
  let spawned = 0;
  const goal = 42;
  const enemyColor = 0xfb7185;
  const enemySpeed = 8.2;

  function init(game) {
    timer = 0; spawnTimer = 0; spawned = 0;
    game.camera.position.set(0, 3.2, 8);
    game.scene.fog.color.set(0x450a0a);
  }

  function update(game, dt) {
    timer += dt; spawnTimer -= dt;
    if (spawnTimer <= 0 && spawned < goal) {
      const wave = Math.sin(timer * 3.0) * 2.5;
      game.spawnEnemy({
        x: wave + (Math.random() - .5) * 3.5,
        y: (Math.random() - .5) * 4.2,
        z: -26,
        hp: 3,
        speed: enemySpeed + Math.random() * 2.8,
        size: 0.7,
        color: enemyColor,
        emissive: 0x4c0519
      });
      spawned++;
      spawnTimer = 0.36;
    }
  }

  function isClear(game) {
    return spawned >= goal && game.enemies.length === 0;
  }

  return { init, update, isClear };
})();
