import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js";

// =====================================
// HTML の onclick から呼べるようにする
// =====================================
window.chooseShop = chooseShop;
window.move = move;
window.deliver = deliver;
window.newOrder = newOrder;
window.buySkill = buySkill;
window.setActiveSkill = setActiveSkill;
window.turnLeft = turnLeft;
window.turnRight = turnRight;
window.lookCenter = lookCenter;
window.toggleSkillShop = toggleSkillShop;

// =========================
// お店データ
// =========================
const shops = {
  ramenNear: { name: "近いラーメン屋", item: "ramen", cost: 1000, distanceLabel: "近い", travelSteps: 3, color: 0xef4444 },
  ramenFar:  { name: "遠いラーメン屋", item: "ramen", cost: 500,  distanceLabel: "遠い", travelSteps: 6, color: 0xb91c1c },

  pizzaNear: { name: "近いピザ屋", item: "pizza", cost: 1100, distanceLabel: "近い", travelSteps: 3, color: 0xf97316 },
  pizzaFar:  { name: "遠いピザ屋", item: "pizza", cost: 600,  distanceLabel: "遠い", travelSteps: 6, color: 0xc2410c },

  cakeNear:  { name: "近いケーキ屋", item: "cake",  cost: 1200, distanceLabel: "近い", travelSteps: 3, color: 0xec4899 },
  cakeFar:   { name: "遠いケーキ屋", item: "cake",  cost: 700,  distanceLabel: "遠い", travelSteps: 6, color: 0xbe185d },

  sushiNear: { name: "近い寿司屋", item: "sushi", cost: 1300, distanceLabel: "近い", travelSteps: 3, color: 0x06b6d4 },
  sushiFar:  { name: "遠い寿司屋", item: "sushi", cost: 800,  distanceLabel: "遠い", travelSteps: 6, color: 0x0e7490 }
};

// =========================
// 注文データ
// =========================
const orders = [
  { item: "ramen", name: "ラーメン", timeLimit: 45, fragile: false },
  { item: "pizza", name: "ピザ", timeLimit: 55, fragile: false },
  { item: "cake",  name: "ケーキ", timeLimit: 40, fragile: true },
  { item: "sushi", name: "寿司", timeLimit: 50, fragile: false }
];

// =========================
// スキルデータ
// moveTime: 前進1回で増える経過時間
// maxUses: 1注文あたりの使用回数
// maintenance: 1回使うごとの維持費
// =========================
const movementSkills = {
  walk: {
    key: "walk",
    name: "歩く",
    moveTime: 8,
    cost: 0,
    maxUses: Infinity,
    maintenance: 0
  },
  run: {
    key: "run",
    name: "走る",
    moveTime: 7,
    cost: 120,
    maxUses: Infinity,
    maintenance: 0
  },
  bicycle: {
    key: "bicycle",
    name: "自転車",
    moveTime: 6,
    cost: 260,
    maxUses: 6,
    maintenance: 5
  },
  bike: {
    key: "bike",
    name: "バイク",
    moveTime: 5,
    cost: 520,
    maxUses: 4,
    maintenance: 12
  },
  car: {
    key: "car",
    name: "自動車",
    moveTime: 4,
    cost: 900,
    maxUses: 3,
    maintenance: 20
  },
  parkour: {
    key: "parkour",
    name: "パルクール",
    moveTime: 3,
    cost: 1400,
    maxUses: 2,
    maintenance: 0
  }
};

// =========================
// 状態
// =========================
let currentOrder = null;
let selectedShopKey = null;
let selectedShop = null;
let time = 0;
let money = 0;
let totalEarned = 0;
let bestMoney = parseInt(localStorage.getItem("delivery3DBestMoney") || "0", 10);
let progressSteps = 0;
let orderFinished = false;
let ownedSkills = loadOwnedSkills();
let activeMoveSkill = localStorage.getItem("delivery3DActiveMoveSkill") || "walk";
let skillUsesLeft = {};

// =========================
// 3D状態
// =========================
let scene = null;
let camera = null;
let renderer = null;
let clock = null;
let worldGroup = null;
let roadGroup = null;
let targetShopMesh = null;
let highlightRing = null;
let deliveryGate = null;
let horizonSign = null;
let shopMeshes = {};

let currentYaw = 0;
let targetYaw = 0;
let isAnimatingStep = false;
let stepFromZ = 0;
let stepToZ = 0;
let stepProgress = 0;

const STEP_WORLD_LENGTH = 12;
const START_Z = 18;

const TARGET_X_BY_ITEM = {
  ramen: -18,
  pizza: -6,
  cake: 6,
  sushi: 18
};

// =========================
// 初期化
// =========================
window.addEventListener("load", () => {
  if (!ownedSkills.walk) {
    ownedSkills.walk = true;
  }

  if (!ownedSkills[activeMoveSkill]) {
    activeMoveSkill = "walk";
  }

  // 先にUIを最低限動かす
  resetSkillUses();
  renderSkillShop();
  updateMoveText();
  updateScoreBoard();

  // 3D初期化（失敗しても注文UIは動かす）
  try {
    init3D();
    if (renderer) {
      animate();
      window.addEventListener("resize", onResize);
    }
  } catch (e) {
    console.error("3D初期化エラー:", e);
    const statusEl = document.getElementById("status");
    if (statusEl) {
      statusEl.innerHTML =
        "3Dの初期化に失敗しました。<br>GitHub Pages / Live Server / localhost で開いてください。";
    }
  }

  // 最後に必ず注文生成
  newOrder();
});

// =========================
// ローカル保存
// =========================
function loadOwnedSkills() {
  const raw = localStorage.getItem("delivery3DOwnedSkills");

  if (!raw) return { walk: true };

  try {
    return { walk: true, ...JSON.parse(raw) };
  } catch (e) {
    return { walk: true };
  }
}

function saveSkillState() {
  localStorage.setItem("delivery3DOwnedSkills", JSON.stringify(ownedSkills));
  localStorage.setItem("delivery3DActiveMoveSkill", activeMoveSkill);
  localStorage.setItem("delivery3DBestMoney", String(bestMoney));
}

// =========================
// スキル使用回数
// =========================
function resetSkillUses() {
  skillUsesLeft = {};

  Object.values(movementSkills).forEach(skill => {
    skillUsesLeft[skill.key] = skill.maxUses;
  });
}

function usesLabel(skill) {
  return skill.maxUses === Infinity
    ? "無制限"
    : `${skillUsesLeft[skill.key]}回 / ${skill.maxUses}回`;
}

// =========================
// 3D 初期化
// =========================
function init3D() {
  const mount = document.getElementById("game3d");
  if (!mount) return;

  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0f172a, 40, 180);

  camera = new THREE.PerspectiveCamera(
    72,
    mount.clientWidth / mount.clientHeight,
    0.1,
    500
  );
  camera.position.set(0, 1.7, START_Z);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(mount.clientWidth, mount.clientHeight);
  renderer.shadowMap.enabled = true;
  mount.appendChild(renderer.domElement);

  clock = new THREE.Clock();

  const hemi = new THREE.HemisphereLight(0xbfe3ff, 0x223344, 1.25);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(12, 24, 8);
  sun.castShadow = true;
  scene.add(sun);

  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(220, 24, 24),
    new THREE.MeshBasicMaterial({
      color: 0x0b1220,
      side: THREE.BackSide
    })
  );
  scene.add(sky);

  worldGroup = new THREE.Group();
  scene.add(worldGroup);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(240, 240),
    new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  ground.receiveShadow = true;
  worldGroup.add(ground);

  roadGroup = new THREE.Group();
  worldGroup.add(roadGroup);

  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 220),
    new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.95 })
  );
  road.rotation.x = -Math.PI / 2;
  road.position.z = -60;
  road.receiveShadow = true;
  roadGroup.add(road);

  for (let i = 0; i < 16; i++) {
    const stripe = new THREE.Mesh(
      new THREE.PlaneGeometry(1.4, 5.5),
      new THREE.MeshStandardMaterial({ color: 0xe5e7eb })
    );
    stripe.rotation.x = -Math.PI / 2;
    stripe.position.set(0, 0.01, START_Z - 8 - i * 13);
    roadGroup.add(stripe);
  }

  const leftWall = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 3.2, 220),
    new THREE.MeshStandardMaterial({ color: 0x334155 })
  );
  leftWall.position.set(-11, 1.6, -60);
  leftWall.castShadow = true;
  worldGroup.add(leftWall);

  const rightWall = leftWall.clone();
  rightWall.position.x = 11;
  worldGroup.add(rightWall);

  createScenery();
  createShopMarkers();
  createHighlightRing();
  createDeliveryGate();
}

function createScenery() {
  if (!worldGroup) return;

  for (let i = 0; i < 12; i++) {
    const z = START_Z - 10 - i * 16;

    const tree = new THREE.Mesh(
      new THREE.ConeGeometry(2, 5, 8),
      new THREE.MeshStandardMaterial({ color: 0x15803d })
    );
    tree.position.set(-18 - (i % 2) * 8, 4, z);
    worldGroup.add(tree);

    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.55, 2.8, 8),
      new THREE.MeshStandardMaterial({ color: 0x7c2d12 })
    );
    trunk.position.set(tree.position.x, 1.4, z);
    worldGroup.add(trunk);

    const box = new THREE.Mesh(
      new THREE.BoxGeometry(6, 4 + (i % 3), 6),
      new THREE.MeshStandardMaterial({
        color: i % 2 === 0 ? 0x475569 : 0x3f3f46
      })
    );
    box.position.set(18 + (i % 2) * 8, 2 + (i % 3) * 0.5, z - 3);
    box.castShadow = true;
    box.receiveShadow = true;
    worldGroup.add(box);
  }
}

function createShopMarkers() {
  if (!worldGroup) return;

  const boxGeo = new THREE.BoxGeometry(5, 4.5, 5);

  Object.entries(shops).forEach(([key, shop]) => {
    const mat = new THREE.MeshStandardMaterial({
      color: shop.color,
      emissive: 0x000000
    });

    const mesh = new THREE.Mesh(boxGeo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.visible = false;
    mesh.userData.shopKey = key;
    worldGroup.add(mesh);
    shopMeshes[key] = mesh;
  });

  horizonSign = new THREE.Mesh(
    new THREE.BoxGeometry(14, 5, 1.2),
    new THREE.MeshStandardMaterial({ color: 0x0ea5e9, emissive: 0x082f49 })
  );
  horizonSign.position.set(0, 4, -64);
  horizonSign.visible = false;
  worldGroup.add(horizonSign);
}

function createHighlightRing() {
  if (!worldGroup) return;

  const ringGeo = new THREE.TorusGeometry(3.8, 0.18, 12, 40);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
  highlightRing = new THREE.Mesh(ringGeo, ringMat);
  highlightRing.rotation.x = Math.PI / 2;
  highlightRing.position.y = 0.12;
  highlightRing.visible = false;
  worldGroup.add(highlightRing);
}

function createDeliveryGate() {
  if (!worldGroup) return;

  const gateMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    emissive: 0x052e16,
    transparent: true,
    opacity: 0.88
  });

  deliveryGate = new THREE.Mesh(
    new THREE.BoxGeometry(8, 7, 1.4),
    gateMat
  );
  deliveryGate.visible = false;
  deliveryGate.castShadow = true;
  worldGroup.add(deliveryGate);
}

function onResize() {
  const mount = document.getElementById("game3d");
  if (!camera || !renderer || !mount) return;

  camera.aspect = mount.clientWidth / mount.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(mount.clientWidth, mount.clientHeight);
}

function updateCameraTransform() {
  if (!camera) return;

  camera.position.x = 0;
  camera.rotation.order = "YXZ";
  camera.rotation.y = currentYaw;
  camera.rotation.x = 0;
}

function animate() {
  requestAnimationFrame(animate);

  if (!renderer || !scene || !camera || !clock) return;

  const delta = clock.getDelta();

  currentYaw += (targetYaw - currentYaw) * Math.min(1, delta * 7);

  if (isAnimatingStep) {
    stepProgress += delta * 3.5;
    const t = Math.min(stepProgress, 1);
    const eased = 1 - Math.pow(1 - t, 3);

    camera.position.z = THREE.MathUtils.lerp(stepFromZ, stepToZ, eased);
    camera.position.y = 1.7 + Math.sin(t * Math.PI) * 0.08;

    if (t >= 1) {
      isAnimatingStep = false;
      camera.position.z = stepToZ;
      camera.position.y = 1.7;
    }
  }

  if (highlightRing && highlightRing.visible) {
    highlightRing.rotation.z += delta * 1.5;
  }

  updateCameraTransform();
  renderer.render(scene, camera);
}

function resetWorldForNewOrder() {
  Object.values(shopMeshes).forEach(mesh => {
    if (!mesh) return;
    mesh.visible = false;
    mesh.material.emissive.setHex(0x000000);
  });

  if (highlightRing) highlightRing.visible = false;
  if (deliveryGate) deliveryGate.visible = false;
  if (horizonSign) horizonSign.visible = false;

  targetShopMesh = null;

  if (camera) {
    camera.position.set(0, 1.7, START_Z);
    currentYaw = 0;
    targetYaw = 0;
    isAnimatingStep = false;
    stepProgress = 0;
    updateCameraTransform();
  }

  updateLocationText("出発地点");
}

function placeSelectedShop(shopKey) {
  Object.values(shopMeshes).forEach(mesh => {
    if (!mesh) return;
    mesh.visible = false;
    mesh.material.emissive.setHex(0x000000);
  });

  const shop = shops[shopKey];
  const mesh = shopMeshes[shopKey];
  if (!shop || !mesh) return;

  const itemX = TARGET_X_BY_ITEM[shop.item];
  const z = START_Z - shop.travelSteps * STEP_WORLD_LENGTH;

  mesh.visible = true;
  mesh.position.set(itemX, 2.3, z);
  mesh.scale.set(1, 1, 1);
  mesh.material.color.setHex(shop.color);
  mesh.material.emissive.setHex(0x222222);
  targetShopMesh = mesh;

  if (highlightRing) {
    highlightRing.visible = true;
    highlightRing.position.set(itemX, 0.12, z);
  }

  if (horizonSign) {
    horizonSign.visible = true;
    horizonSign.position.set(itemX, 5.2, z - 2.5);
  }

  if (deliveryGate) {
    deliveryGate.visible = false;
  }
}

function showDeliveryGate() {
  if (!selectedShop || !deliveryGate) return;

  const itemX = TARGET_X_BY_ITEM[selectedShop.item];
  const z = START_Z - selectedShop.travelSteps * STEP_WORLD_LENGTH - 7;

  deliveryGate.visible = true;
  deliveryGate.position.set(itemX, 3.5, z);
}

function updateLocationText(text) {
  const el = document.getElementById("locationText");
  if (el) {
    el.innerText = `現在地：${text}`;
  }
}

// =========================
// UI 更新
// =========================
function updateTimer() {
  const el = document.getElementById("timer");
  if (el) {
    el.innerText = `経過時間：${time}秒`;
  }
}

function updateProgress() {
  const el = document.getElementById("progress");
  if (!el) return;

  if (!selectedShop) {
    el.innerText = "移動距離：0 / 0";
    return;
  }

  el.innerText =
    `移動距離：${Math.min(progressSteps, selectedShop.travelSteps)} / ${selectedShop.travelSteps}`;
}

function updateMoveText() {
  const skill = movementSkills[activeMoveSkill];
  const limit =
    skill.maxUses === Infinity
      ? "回数無制限"
      : `残り${skillUsesLeft[skill.key]}回`;

  const el = document.getElementById("selectedMoveText");
  if (el) {
    el.innerText =
      `現在の移動方法：${skill.name}（1回で経過時間 +${skill.moveTime}秒 / 維持費 ${skill.maintenance}円 / ${limit}）`;
  }
}

function updateScoreBoard() {
  let rank = "C";
  if (totalEarned >= 1600) rank = "S";
  else if (totalEarned >= 1000) rank = "A";
  else if (totalEarned >= 500) rank = "B";

  const el = document.getElementById("scoreBoard");
  if (el) {
    el.innerHTML =
      `所持金：${money}円<br>` +
      `累計報酬：${totalEarned}円<br>` +
      `最高所持金：${bestMoney}円<br>` +
      `ランク：${rank}`;
  }
}

function renderSkillShop() {
  const wrap = document.getElementById("skillShop");
  if (!wrap) return;

  wrap.innerHTML = "";

  Object.values(movementSkills).forEach(skill => {
    const owned = !!ownedSkills[skill.key];
    const active = activeMoveSkill === skill.key;

    const card = document.createElement("div");
    card.className = "skill-card";

    card.innerHTML = `
      <div class="skill-title">
        ${skill.name}
        ${owned ? '<span class="badge owned">購入済み</span>' : ""}
        ${active ? '<span class="badge active">使用中</span>' : ""}
      </div>
      <div class="skill-desc">
        前進1回で経過時間 +${skill.moveTime}秒<br>
        購入価格：${skill.cost}円<br>
        維持費：${skill.maintenance}円 / 回<br>
        残り回数：${usesLabel(skill)}
      </div>
      <div class="row">
        <button class="buy-btn" ${owned ? "disabled" : ""} onclick="buySkill('${skill.key}')">購入</button>
        <button class="use-btn" ${owned ? "" : "disabled"} onclick="setActiveSkill('${skill.key}')">使う</button>
      </div>
    `;

    wrap.appendChild(card);
  });
}

// =========================
// ゲーム進行
// =========================
function newOrder() {
  currentOrder = orders[Math.floor(Math.random() * orders.length)];
  selectedShopKey = null;
  selectedShop = null;
  time = 0;
  progressSteps = 0;
  orderFinished = false;

  resetSkillUses();
  resetWorldForNewOrder();

  const orderText = document.getElementById("orderText");
  if (orderText) {
    orderText.innerText = `注文：${currentOrder.name}`;
  }

  const orderRule = document.getElementById("orderRule");
  if (orderRule) {
    orderRule.innerText = `制限時間：${currentOrder.timeLimit}秒`;
  }

  const status = document.getElementById("status");
  if (status) {
    status.innerHTML =
      '店を選んでください。<br>注文に合う「近い店」か「遠い店」を選ぶと有利です。';
  }

  const nextBtn = document.getElementById("nextBtn");
  if (nextBtn) {
    nextBtn.style.display = "none";
  }

  updateTimer();
  updateProgress();
  updateMoveText();
  updateScoreBoard();
  renderSkillShop();
}

function chooseShop(shopKey) {
  if (orderFinished) return;

  selectedShopKey = shopKey;
  selectedShop = shops[shopKey];
  progressSteps = 0;

  placeSelectedShop(shopKey);
  lookCenter();
  updateProgress();
  updateLocationText(`${selectedShop.name}へ向かう道`);

  const status = document.getElementById("status");
  if (status) {
    status.innerHTML =
      `<span class="shop-name">${selectedShop.name}</span> を選択しました。<br>` +
      `3D空間の先に光る建物が目的地です。前進してください。`;
  }
}

function move() {
  if (orderFinished) return;

  if (!selectedShop) {
    alert("先に店を選んでください！");
    return;
  }

  if (isAnimatingStep) return;

  const skill = movementSkills[activeMoveSkill];

  if (skillUsesLeft[skill.key] <= 0) {
    const status = document.getElementById("status");
    if (status) {
      status.innerHTML =
        `⚠️ ${skill.name} はこの注文ではもう使えません。<br>別の移動方法に切り替えてください。`;
    }
    renderSkillShop();
    updateMoveText();
    return;
  }

  if (money < skill.maintenance) {
    const status = document.getElementById("status");
    if (status) {
      status.innerHTML =
        `⚠️ 所持金が足りないため ${skill.name} を使えません。<br>別の移動方法に切り替えてください。`;
    }
    return;
  }

  progressSteps++;
  time += skill.moveTime;
  money -= skill.maintenance;

  if (skill.maxUses !== Infinity) {
    skillUsesLeft[skill.key]--;
  }

  if (money < 0) money = 0;

  if (camera) {
    stepFromZ = camera.position.z;
    stepToZ = camera.position.z - STEP_WORLD_LENGTH;
    stepProgress = 0;
    isAnimatingStep = true;
  }

  updateTimer();
  updateProgress();
  updateMoveText();
  updateScoreBoard();
  renderSkillShop();

  const remain = selectedShop.travelSteps - progressSteps;
  const status = document.getElementById("status");

  if (remain > 0) {
    if (status) {
      status.innerHTML =
        `<span class="shop-name">${selectedShop.name}</span> に移動中…<br>` +
        `到着まであと ${remain} 回前進 / ${skill.name} を使用（維持費 -${skill.maintenance}円）`;
    }
    updateLocationText(`${selectedShop.name}へ移動中`);
  } else {
    if (status) {
      status.innerHTML =
        `<span class="shop-name">${selectedShop.name}</span> に到着しました！<br>` +
        `『配達する』を押してください。`;
    }
    updateLocationText(`${selectedShop.name} 前`);
    showDeliveryGate();
  }
}

function deliver() {
  if (orderFinished) return;

  if (!selectedShop) {
    alert("店を選んでください！");
    return;
  }

  if (progressSteps < selectedShop.travelSteps) {
    const status = document.getElementById("status");
    if (status) {
      status.innerHTML =
        `${selectedShop.name} にまだ到着していません。<br>前進してから配達してください。`;
    }
    return;
  }

  // 間違った店
  if (selectedShop.item !== currentOrder.item) {
    const wrongPenalty = 60;
    money -= wrongPenalty;
    if (money < 0) money = 0;

    const status = document.getElementById("status");
    if (status) {
      status.innerHTML =
        `❌ 間違えた店に入ってしまった！<br><br>` +
        `注文：${currentOrder.name}<br>` +
        `選んだ店：${selectedShop.name}<br>` +
        `ペナルティ：-${wrongPenalty}円<br><br>` +
        `正しい種類の店を選び直してください。`;
    }

    selectedShopKey = null;
    selectedShop = null;
    progressSteps = 0;
    resetWorldForNewOrder();

    updateProgress();
    updateMoveText();
    updateScoreBoard();
    renderSkillShop();
    saveSkillState();
    return;
  }

  // 正しい店
  let reward = 220;

  // 時間ペナルティ
  reward -= time;

  // コスト反映
  reward += Math.floor((1400 - selectedShop.cost) / 10);

  // 時間オーバー
  let late = false;
  if (time > currentOrder.timeLimit) {
    late = true;
    reward -= 70;
  }

  // 遅延
  let delay = false;
  const delayChance = selectedShop.distanceLabel === "遠い" ? 0.35 : 0.15;
  if (Math.random() < delayChance) {
    delay = true;
    reward -= 20;
  }

  // ケーキ破損
  let damage = false;
  if (currentOrder.fragile) {
    const damageChance = selectedShop.distanceLabel === "遠い" ? 0.45 : 0.2;
    if (Math.random() < damageChance) {
      damage = true;
      reward -= 80;
    }
  }

  if (reward < 0) reward = 0;

  money += reward;
  totalEarned += reward;

  if (money > bestMoney) {
    bestMoney = money;
  }

  const status = document.getElementById("status");
  if (status) {
    status.innerHTML =
      `✅ 配達完了！<br><br>` +
      `注文：${currentOrder.name}<br>` +
      `店：${selectedShop.name}<br>` +
      `経過時間：${time}秒<br>` +
      `遅延：${delay ? "あり" : "なし"}<br>` +
      `商品状態：${damage ? "崩れた…" : "無事！"}<br>` +
      `時間オーバー：${late ? "あり" : "なし"}<br><br>` +
      `💰 報酬：${reward}円`;
  }

  orderFinished = true;

  const nextBtn = document.getElementById("nextBtn");
  if (nextBtn) {
    nextBtn.style.display = "inline-block";
  }

  updateMoveText();
  updateScoreBoard();
  renderSkillShop();
  saveSkillState();
  updateLocationText("注文完了");

  if (deliveryGate) {
    deliveryGate.material.emissive.setHex(0x14532d);
  }
}

// =========================
// スキルショップ
// =========================
function buySkill(skillKey) {
  const skill = movementSkills[skillKey];

  if (ownedSkills[skillKey]) return;

  if (money < skill.cost) {
    alert("所持金が足りません！");
    return;
  }

  money -= skill.cost;
  ownedSkills[skillKey] = true;

  const status = document.getElementById("status");
  if (status) {
    status.innerHTML =
      `🛒 ${skill.name} を購入しました！<br>『使う』で切り替えられます。`;
  }

  updateScoreBoard();
  renderSkillShop();
  saveSkillState();
}

function setActiveSkill(skillKey) {
  if (!ownedSkills[skillKey]) {
    alert("まだ購入していません！");
    return;
  }

  activeMoveSkill = skillKey;
  updateMoveText();
  renderSkillShop();
  saveSkillState();

  const skill = movementSkills[skillKey];
  const status = document.getElementById("status");
  if (status) {
    status.innerHTML =
      `🚀 移動方法を ${skill.name} に変更しました！<br>` +
      `前進1回で経過時間 +${skill.moveTime}秒、維持費 ${skill.maintenance}円です。`;
  }
}


function toggleSkillShop(force) {
  const open = typeof force === "boolean"
    ? force
    : !document.body.classList.contains("skill-shop-open");
  document.body.classList.toggle("skill-shop-open", open);
  const btn = document.getElementById("skillShopToggle");
  if (btn) {
    btn.innerText = open ? "閉じる" : "🛒 スキル";
    btn.setAttribute("aria-expanded", String(open));
  }
}

// =========================
// 視点操作
// =========================
function turnLeft() {
  targetYaw = Math.max(targetYaw - Math.PI / 8, -Math.PI / 2.2);
}

function turnRight() {
  targetYaw = Math.min(targetYaw + Math.PI / 8, Math.PI / 2.2);
}

function lookCenter() {
  targetYaw = 0;
}