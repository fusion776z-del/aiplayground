// js/game1.js
// Stage1: ここだけ編集すれば、ステージごとの敵出現・背景・クリア条件を変えられます。
window.Stage1 = (() => {
  let timer = 0;
  let spawnTimer = 0;
  let spawned = 0;
  const goal = 18;
  const enemyColor = 0x22d3ee;
  const enemySpeed = 5.5;

  function init(game) {
    timer = 0; spawnTimer = 0; spawned = 0;
    game.camera.position.set(0, 3.2, 8);
    game.scene.fog.color.set(0x020617);
  }

  function update(game, dt) {
    timer += dt; spawnTimer -= dt;
    if (spawnTimer <= 0 && spawned < goal) {
      const wave = Math.sin(timer * 1.2) * 2.5;
      game.spawnEnemy({
        x: wave + (Math.random() - .5) * 1.8,
        y: (Math.random() - .5) * 4.2,
        z: -26,
        hp: 1,
        speed: enemySpeed + Math.random() * 1.5,
        size: 0.52,
        color: enemyColor,
        emissive: 0x083344
      });
      spawned++;
      spawnTimer = 0.55;
    }
  }

  function isClear(game) {
    return spawned >= goal && game.enemies.length === 0;
  }

  return { init, update, isClear };
})();
