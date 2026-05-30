// =========================
// お店データ
// =========================
const shops = {
  ramenNear: { name: "近いラーメン屋", item: "ramen", cost: 1000, distanceLabel: "近い", travelSteps: 3 },
  ramenFar:  { name: "遠いラーメン屋", item: "ramen", cost: 500,  distanceLabel: "遠い", travelSteps: 6 },

  pizzaNear: { name: "近いピザ屋", item: "pizza", cost: 1100, distanceLabel: "近い", travelSteps: 3 },
  pizzaFar:  { name: "遠いピザ屋", item: "pizza", cost: 600,  distanceLabel: "遠い", travelSteps: 6 },

  cakeNear:  { name: "近いケーキ屋", item: "cake",  cost: 1200, distanceLabel: "近い", travelSteps: 3 },
  cakeFar:   { name: "遠いケーキ屋", item: "cake",  cost: 700,  distanceLabel: "遠い", travelSteps: 6 },

  sushiNear: { name: "近い寿司屋", item: "sushi", cost: 1300, distanceLabel: "近い", travelSteps: 3 },
  sushiFar:  { name: "遠い寿司屋", item: "sushi", cost: 800,  distanceLabel: "遠い", travelSteps: 6 }
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
// moveTime: 前進1回ごとに増える経過時間
// cost: 購入金額（仮のおすすめ値。好きに変えられます）
// =========================
const movementSkills = {
  walk:      { key: "walk",      name: "歩く",       moveTime: 8, cost: 0,    ownedByDefault: true },
  run:       { key: "run",       name: "走る",       moveTime: 7, cost: 120,  ownedByDefault: false },
  bicycle:   { key: "bicycle",   name: "自転車",     moveTime: 6, cost: 260,  ownedByDefault: false },
  bike:      { key: "bike",      name: "バイク",     moveTime: 5, cost: 520,  ownedByDefault: false },
  car:       { key: "car",       name: "自動車",     moveTime: 4, cost: 900,  ownedByDefault: false },
  parkour:   { key: "parkour",   name: "パルクール", moveTime: 3, cost: 1400, ownedByDefault: false }
};

// =========================
// 状態
// =========================
let currentOrder = null;
let selectedShopKey = null;
let selectedShop = null;
let time = 0;
let money = 0;         // 所持金（購入に使う）
let totalEarned = 0;   // 累計報酬
let bestMoney = parseInt(localStorage.getItem("deliveryBestMoney") || "0", 10);
let progressSteps = 0;
let orderFinished = false;
let activeMoveSkill = localStorage.getItem("deliveryActiveMoveSkill") || "walk";
let ownedSkills = loadOwnedSkills();

// =========================
// 初期化
// =========================
window.onload = () => {
  if (!ownedSkills.walk) {
    ownedSkills.walk = true;
  }
  if (!ownedSkills[activeMoveSkill]) {
    activeMoveSkill = "walk";
  }

  renderSkillShop();
  updateMoveText();
  updateScoreBoard();
  newOrder();
};

function loadOwnedSkills() {
  const raw = localStorage.getItem("deliveryOwnedSkills");
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      return { walk: true, ...parsed };
    } catch (e) {
      return { walk: true };
    }
  }
  return { walk: true };
}

function saveSkillState() {
  localStorage.setItem("deliveryOwnedSkills", JSON.stringify(ownedSkills));
  localStorage.setItem("deliveryActiveMoveSkill", activeMoveSkill);
  localStorage.setItem("deliveryBestMoney", String(bestMoney));
}

// =========================
// 新しい注文
// =========================
function newOrder() {
  currentOrder = orders[Math.floor(Math.random() * orders.length)];
  selectedShopKey = null;
  selectedShop = null;
  time = 0;
  progressSteps = 0;
  orderFinished = false;

  document.getElementById("orderText").innerText = "注文：" + currentOrder.name;
  document.getElementById("orderRule").innerText = "制限時間：" + currentOrder.timeLimit + "秒";
  document.getElementById("status").innerHTML =
    "店を選んでください。<br>注文に合う『近い店』か『遠い店』を選ぶと有利です。";

  updateTimer();
  updateProgress();
  updateMoveText();
  document.getElementById("nextBtn").style.display = "none";
}

// =========================
// 店選択
// =========================
function chooseShop(shopKey) {
  if (orderFinished) return;

  selectedShopKey = shopKey;
  selectedShop = shops[shopKey];
  progressSteps = 0;

  document.getElementById("status").innerHTML =
    `<span class="selected-shop">${selectedShop.name}</span> を選択しました。<br>` +
    `前進してお店まで移動してください。`;

  updateProgress();
}

// =========================
// タイマー表示
// =========================
function updateTimer() {
  document.getElementById("timer").innerText = "経過時間：" + time + "秒";
}

function updateProgress() {
  if (!selectedShop) {
    document.getElementById("progress").innerText = "移動距離：0 / 0";
    return;
  }

  document.getElementById("progress").innerText =
    "移動距離：" + Math.min(progressSteps, selectedShop.travelSteps) + " / " + selectedShop.travelSteps;
}

function updateMoveText() {
  const skill = movementSkills[activeMoveSkill];
  document.getElementById("selectedMoveText").innerText =
    `現在の移動方法：${skill.name}（1回で経過時間 +${skill.moveTime}秒）`;
}

// =========================
// 前進
// =========================
function move() {
  if (orderFinished) return;

  if (!selectedShop) {
    alert("先に店を選んでください！");
    return;
  }

  const skill = movementSkills[activeMoveSkill];
  progressSteps++;
  time += skill.moveTime;

  updateTimer();
  updateProgress();

  const remain = selectedShop.travelSteps - progressSteps;

  if (remain > 0) {
    document.getElementById("status").innerHTML =
      `<span class="selected-shop">${selectedShop.name}</span> に移動中…<br>` +
      `到着まであと ${remain} 回前進`;
  } else {
    document.getElementById("status").innerHTML =
      `<span class="selected-shop">${selectedShop.name}</span> に到着しました！<br>` +
      `『配達する』を押してください。`;
  }
}

// =========================
// 配達
// =========================
function deliver() {
  if (orderFinished) return;

  if (!selectedShop) {
    alert("店を選んでください！");
    return;
  }

  if (progressSteps < selectedShop.travelSteps) {
    document.getElementById("status").innerHTML =
      `${selectedShop.name} にまだ到着していません。<br>前進してから配達してください。`;
    return;
  }

  // 間違った店のとき
  if (selectedShop.item !== currentOrder.item) {
    const wrongPenalty = 60;
    money -= wrongPenalty;
    if (money < 0) money = 0;

    document.getElementById("status").innerHTML =
      `❌ 間違えた店に入ってしまった！<br><br>` +
      `注文：${currentOrder.name}<br>` +
      `選んだ店：${selectedShop.name}<br>` +
      `ペナルティ：-${wrongPenalty}円<br><br>` +
      `正しい種類の店を選び直してください。`;

    selectedShopKey = null;
    selectedShop = null;
    progressSteps = 0;

    updateProgress();
    updateScoreBoard();
    renderSkillShop();
    saveSkillState();
    return;
  }

  // 正しい店のとき
  let reward = 220;

  // 時間ペナルティ
  reward -= time;

  // コスト反映（高いほど不利）
  reward += Math.floor((1400 - selectedShop.cost) / 10);

  // 時間オーバー
  let late = false;
  if (time > currentOrder.timeLimit) {
    late = true;
    reward -= 70;
  }

  // 遠い店は遅延しやすい
  let delay = false;
  const delayChance = selectedShop.distanceLabel === "遠い" ? 0.35 : 0.15;
  if (Math.random() < delayChance) {
    delay = true;
    reward -= 20;
  }

  // ケーキは壊れやすい
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

  document.getElementById("status").innerHTML =
    `✅ 配達完了！<br><br>` +
    `注文：${currentOrder.name}<br>` +
    `店：${selectedShop.name}<br>` +
    `経過時間：${time}秒<br>` +
    `遅延：${delay ? "あり" : "なし"}<br>` +
    `商品状態：${damage ? "崩れた…" : "無事！"}<br>` +
    `時間オーバー：${late ? "あり" : "なし"}<br><br>` +
    `💰 報酬：${reward}円`;

  orderFinished = true;
  document.getElementById("nextBtn").style.display = "inline-block";
  updateScoreBoard();
  renderSkillShop();
  saveSkillState();
}

// =========================
// スキルショップ
// =========================
function renderSkillShop() {
  const wrap = document.getElementById("skillShop");
  wrap.innerHTML = "";

  Object.values(movementSkills).forEach((skill) => {
    const owned = !!ownedSkills[skill.key];
    const active = activeMoveSkill === skill.key;

    const card = document.createElement("div");
    card.className = "skill-card";

    const badges = [
      owned ? '<span class="badge-owned">購入済み</span>' : '',
      active ? '<span class="badge-active">使用中</span>' : ''
    ].join('');

    card.innerHTML = `
      <div class="skill-title">${skill.name}${badges}</div>
      <div class="skill-desc">
        前進1回で経過時間 +${skill.moveTime}秒<br>
        価格：${skill.cost}円
      </div>
      <div class="skill-actions">
        <button class="buy-btn" ${owned ? 'disabled' : ''} onclick="buySkill('${skill.key}')">購入</button>
        <button class="use-btn" ${owned ? '' : 'disabled'} onclick="setActiveSkill('${skill.key}')">使う</button>
      </div>
    `;

    wrap.appendChild(card);
  });
}

function buySkill(skillKey) {
  const skill = movementSkills[skillKey];

  if (ownedSkills[skillKey]) {
    return;
  }

  if (money < skill.cost) {
    alert("所持金が足りません！");
    return;
  }

  money -= skill.cost;
  ownedSkills[skillKey] = true;

  document.getElementById("status").innerHTML =
    `🛒 ${skill.name} を購入しました！<br>` +
    `『使う』を押すと移動方法を切り替えられます。`;

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
  document.getElementById("status").innerHTML =
    `🚀 移動方法を ${skill.name} に変更しました！<br>` +
    `前進1回で経過時間 +${skill.moveTime}秒です。`;
}

// =========================
// スコア表示
// =========================
function updateScoreBoard() {
  let rank = "C";

  if (totalEarned >= 1600) {
    rank = "S";
  } else if (totalEarned >= 1000) {
    rank = "A";
  } else if (totalEarned >= 500) {
    rank = "B";
  }

  document.getElementById("scoreBoard").innerHTML =
    `所持金：${money}円<br>` +
    `累計報酬：${totalEarned}円<br>` +
    `最高所持金：${bestMoney}円<br>` +
    `ランク：${rank}`;
}
