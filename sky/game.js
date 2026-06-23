"use strict";

/* =========================================================
   Sky Island Adventure - reconstructed game.js
   10ファイル構成用 / type="module" 不使用
   必要ファイル:
   stage1.js ... stage7.js
   characterRenderer.js
   enemyTypes.js
========================================================= */

const cvs = document.getElementById("game");
const ctx = cvs.getContext("2d");
const VW = 360;
const VH = 640;
const STAGES = [Stage1, Stage2, Stage3, Stage4, Stage5, Stage6, Stage7];
ctx.imageSmoothingEnabled = false;

const BALANCE = [
  { enemyHpMul: 0.70, enemyAtkMul: 0.55, enemySpeedMul: 0.68, enemyAggro: 135, enemyGiveUp: 195, enemyContactInv: 92, bossHpMul: 0.78, bossAtkMul: 0.55, coinBonus: 1.00 },
  { enemyHpMul: 0.90, enemyAtkMul: 0.75, enemySpeedMul: 0.82, enemyAggro: 155, enemyGiveUp: 220, enemyContactInv: 84, bossHpMul: 0.95, bossAtkMul: 0.78, coinBonus: 1.00 },
  { enemyHpMul: 1.08, enemyAtkMul: 0.95, enemySpeedMul: 0.96, enemyAggro: 178, enemyGiveUp: 250, enemyContactInv: 78, bossHpMul: 1.12, bossAtkMul: 1.00, coinBonus: 1.00 },
  { enemyHpMul: 1.32, enemyAtkMul: 1.15, enemySpeedMul: 1.06, enemyAggro: 205, enemyGiveUp: 285, enemyContactInv: 72, bossHpMul: 1.35, bossAtkMul: 1.18, coinBonus: 1.05 },
  { enemyHpMul: 1.62, enemyAtkMul: 1.35, enemySpeedMul: 1.16, enemyAggro: 230, enemyGiveUp: 320, enemyContactInv: 66, bossHpMul: 1.60, bossAtkMul: 1.35, coinBonus: 1.08 },
  { enemyHpMul: 1.95, enemyAtkMul: 1.55, enemySpeedMul: 1.26, enemyAggro: 255, enemyGiveUp: 355, enemyContactInv: 62, bossHpMul: 1.90, bossAtkMul: 1.55, coinBonus: 1.12 },
  { enemyHpMul: 2.30, enemyAtkMul: 1.80, enemySpeedMul: 1.34, enemyAggro: 285, enemyGiveUp: 395, enemyContactInv: 58, bossHpMul: 2.25, bossAtkMul: 1.85, coinBonus: 1.15 }
];

const DASH_DURATION = 10;
const DASH_COOLDOWN = 60;
const DASH_SPEED = 7.6;
const DASH_INVINCIBLE = 18;

const input = { up: 0, down: 0, left: 0, right: 0, ax: 0, ay: 0, attack: 0, magic: 0, dash: 0, action: 0, start: 0 };

const G = {
  state: "title", stageIndex: 0, time: 0, lock: 0,
  camera: { x: 0, y: 0 }, map: null, player: null,
  terrain: [], enemies: [], npcs: [], shops: [], chests: [], doors: [], drops: [], effects: [], bullets: [],
  boss: null, talk: null, shop: null, bossDefeatT: 0, message: "", messageT: 0
};

function getBalance() { return BALANCE[Math.max(0, Math.min(BALANCE.length - 1, G.stageIndex || 0))]; }
function cl(v, a, b) { return Math.max(a, Math.min(b, v)); }
function R(a, b) { return Math.random() * (b - a) + a; }
function nrm(x, y) { const l = Math.hypot(x, y) || 1; return { x: x / l, y: y / l, l }; }
function hit(a, b) { return a && b && a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
function msg(s, t = 90) { G.message = s; G.messageT = t; }
function flush() { input.attack = input.action = input.start = input.magic = input.dash = 0; }
function C(k) { const v = input[k]; input[k] = 0; return G.lock > 0 ? 0 : v; }

function RR(x, y, w, h, r) {
  r = Math.min(r || 0, w / 2, h / 2);
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

function cloneStage(s) {
  if (!s) throw new Error("stage is undefined");
  return {
    ...s,
    terrain: (s.terrain || []).map(o => ({ ...o })),
    npcs: (s.npcs || []).map(o => ({ ...o, lines: [...(o.lines || [])] })),
    shops: (s.shops || []).map(o => ({ ...o })),
    chests: (s.chests || []).map(o => ({ ...o, item: { ...(o.item || {}) } })),
    enemies: (s.enemies || []).map(o => ({ ...o })),
    doors: (s.doors || []).map(o => ({ ...o })),
    boss: s.boss ? { ...s.boss } : null,
    bossRoom: s.bossRoom ? { ...s.bossRoom } : { x: 42, y: 42, w: (s.width || 720) - 84, h: 228 },
    onClear: s.onClear
  };
}

function newPlayer(x, y) {
  return {
    x, y, w: 24, h: 28, dir: "down", vx: 0, vy: 0,
    hp: 18, maxHp: 18, mp: 6, maxMp: 6, atk: 3, def: 1,
    magic: 3, magicLv: 1, magicRadius: 18, speed: 3.35, inv: 60,
    dashT: 0, dashCd: 0, attackT: 0, attackCd: 0, combo: 0, comboT: 0,
    coins: 0, inventory: [], cores: [], swordLv: 0, shieldLv: 0, armorLv: 0, bookLv: 0,
    anim: 0, curseLifted: false, trueGold: false
  };
}

function mkE(e) {
  const b = getBalance(); const st = G.stageIndex || 0; let enemy;
  if (typeof createEnemyFromPlacement === "function") enemy = createEnemyFromPlacement(e);
  else if (e.id === "wind_bat") enemy = { ...e, type: "bat", w: 24, h: 20, hp: 2, maxHp: 2, atk: 2, speed: 1.25, color: "#8de7ff" };
  else if (e.id === "fast") enemy = { ...e, type: "fast", w: 24, h: 22, hp: 2, maxHp: 2, atk: 2, speed: 1.55, color: "#ffcc66" };
  else enemy = { ...e, type: "slime", w: 24, h: 22, hp: 3, maxHp: 3, atk: 2, speed: 0.9, color: "#78df72" };

  enemy.type = enemy.type || enemy.id || "slime"; enemy.w = enemy.w || 24; enemy.h = enemy.h || 22;
  enemy.hp = enemy.hp || 1; enemy.maxHp = enemy.maxHp || enemy.hp; enemy.atk = enemy.atk || enemy.touchDamage || 1;
  enemy.speed = enemy.speed || 0.9; enemy.color = enemy.color || "#78df72"; enemy.t = 0; enemy.hitT = 0; enemy.wake = false; enemy.attackPause = 0;
  enemy.hp = Math.max(1, Math.round(enemy.hp * b.enemyHpMul)); enemy.maxHp = enemy.hp;
  enemy.atk = Math.max(1, Math.round(enemy.atk * b.enemyAtkMul)); enemy.speed = Math.max(0.45, enemy.speed * b.enemySpeedMul);
  if (st === 0) { if (enemy.type === "fast") { enemy.speed *= 0.82; enemy.hp = Math.max(1, enemy.hp - 1); enemy.maxHp = enemy.hp; } if (enemy.type === "bat") { enemy.speed *= 0.78; enemy.atk = 1; } }
  if (st >= 4) { if (enemy.type === "fast") { enemy.hp += 1; enemy.maxHp = enemy.hp; } if (enemy.type === "bat") enemy.speed *= 1.05; }
  return enemy;
}

function load(s, keep = false) {
  const old = G.player; G.map = cloneStage(s);
  if (keep && old) G.player = { ...old, x: G.map.spawn.x, y: G.map.spawn.y, hp: old.maxHp, mp: old.maxMp, inv: 90, dashT: 0, dashCd: 0, attackT: 0, attackCd: 0, combo: 0, comboT: 0, inventory: old.inventory.filter(v => typeof v === "object"), cores: [...old.cores] };
  else G.player = newPlayer(G.map.spawn.x, G.map.spawn.y);
  G.terrain = G.map.terrain || []; G.npcs = G.map.npcs || []; G.shops = G.map.shops || []; G.chests = G.map.chests || []; G.doors = G.map.doors || [];
  G.enemies = (G.map.enemies || []).map(mkE); G.drops = []; G.effects = []; G.bullets = []; G.boss = null; G.talk = null; G.shop = null; G.bossDefeatT = 0;
  G.state = "field"; G.lock = 34; flush(); msg(G.map.name, 100); cam();
}
function start() { G.stageIndex = 0; load(STAGES[0], false); }

function ph() { const p = G.player; return { x: p.x + 4, y: p.y + 8, w: p.w - 8, h: p.h - 10 }; }
function solid(x, y, w, h) { const r = { x, y, w, h }; for (const t of G.terrain) if (hit(r, t)) return true; for (const d of G.doors) if (d.locked && hit(r, d)) return true; return false; }
function move(o, dx, dy) { if (dx && !solid(o.x + dx + 4, o.y + 8, o.w - 8, o.h - 10)) o.x += dx; if (dy && !solid(o.x + 4, o.y + dy + 8, o.w - 8, o.h - 10)) o.y += dy; o.x = cl(o.x, 28, G.map.width - 28 - o.w); o.y = cl(o.y, 28, G.map.height - 28 - o.h); }

addEventListener("keydown", e => { const k = e.key.toLowerCase(); if (["arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k) || e.code === "Space") e.preventDefault(); if (k === "arrowup" || k === "w") input.up = 1; if (k === "arrowdown" || k === "s") input.down = 1; if (k === "arrowleft" || k === "a") input.left = 1; if (k === "arrowright" || k === "d") input.right = 1; if (!e.repeat) { if (k === "z" || e.key === "Enter") { input.attack = 1; input.action = 1; input.start = 1; } if (k === "x") input.magic = 1; if (e.code === "Space") input.dash = 1; if (k === "c") herb(); if (G.state === "shop") { if (k === "1") buy(0); if (k === "2") buy(1); if (k === "3") buy(2); if (e.key === "Escape") closeShop(); } } }, { passive: false });
addEventListener("keyup", e => { const k = e.key.toLowerCase(); if (k === "arrowup" || k === "w") input.up = 0; if (k === "arrowdown" || k === "s") input.down = 0; if (k === "arrowleft" || k === "a") input.left = 0; if (k === "arrowright" || k === "d") input.right = 0; });
function tap(id, k) { const el = document.getElementById(id); if (!el) return; el.addEventListener("pointerdown", e => { e.preventDefault(); if (G.lock <= 0) input[k] = 1; }, { passive: false }); }
tap("attackBtn", "attack"); tap("magicBtn", "magic"); tap("dashBtn", "dash"); tap("actionBtn", "action");
cvs.addEventListener("pointerdown", e => { e.preventDefault(); if (G.lock <= 0) { input.start = 1; input.action = 1; } }, { passive: false });

function atkBox() { const p = G.player, cx = p.x + p.w / 2, cy = p.y + p.h / 2; if (p.dir === "up") return { x: cx - 22, y: p.y - 32, w: 44, h: 36 }; if (p.dir === "down") return { x: cx - 22, y: p.y + p.h - 4, w: 44, h: 36 }; if (p.dir === "left") return { x: p.x - 34, y: cy - 19, w: 38, h: 38 }; return { x: p.x + p.w - 4, y: cy - 19, w: 38, h: 38 }; }
function distHit(a, cx, cy, r) { if (!a) return false; const ex = a.x + a.w / 2, ey = a.y + a.h / 2; return (ex - cx) ** 2 + (ey - cy) ** 2 <= r ** 2; }
function shootWave() { const p = G.player, speed = 6.6; let vx = 0, vy = 0; if (p.dir === "up") vy = -speed; else if (p.dir === "down") vy = speed; else if (p.dir === "left") vx = -speed; else vx = speed; const s = p.trueGold ? 16 : 12; G.bullets.push({ x: p.x + p.w / 2 - s / 2, y: p.y + p.h / 2 - s / 2, w: s, h: s, vx, vy, life: 70, dmg: Math.max(2, Math.round(p.atk * 0.8)), wave: true, color: p.trueGold ? "#ffd84d" : "#9ef7ff" }); }
function attack() { const p = G.player; p.combo = p.combo % 3 + 1; p.comboT = 38; const sweep = p.combo === 3; p.attackT = sweep ? 18 : 12; p.attackCd = sweep ? 18 : 12; const d = p.atk * (sweep ? 1.35 : 1); if (p.trueGold || p.curseLifted) shootWave(); if (sweep) { const cx = p.x + p.w / 2, cy = p.y + p.h / 2, rr = p.trueGold ? 94 : p.curseLifted ? 82 : 70; let hits = 0; for (let i = G.enemies.length - 1; i >= 0; i--) if (G.enemies[i] && distHit(G.enemies[i], cx, cy, rr)) { dmgE(G.enemies[i], d); hits++; } if (G.boss && distHit(G.boss, cx, cy, rr)) dmgB(d * 0.8); ring(cx, cy, rr, p.trueGold ? "#ffd84d" : "#9ef7ff"); msg("なぎ払い！ x" + hits, 36); } else { const a = atkBox(); for (let i = G.enemies.length - 1; i >= 0; i--) if (G.enemies[i] && hit(a, G.enemies[i])) dmgE(G.enemies[i], d); if (G.boss && hit(a, G.boss)) dmgB(d); } }
function magic() { const p = G.player; if (p.mp <= 0) { msg("MPが足りない", 40); return; } p.mp--; let vx = 0, vy = 0; if (p.dir === "up") vy = -5.6; else if (p.dir === "down") vy = 5.6; else if (p.dir === "left") vx = -5.6; else vx = 5.6; const s = 8 + p.magicLv * 3; G.bullets.push({ x: p.x + 12 - s / 2, y: p.y + 14 - s / 2, w: s, h: s, vx, vy, life: 72, dmg: p.magic + 1, magic: true, color: p.trueGold ? "#ffd84d" : "#63d8ff" }); }

function updP() { const p = G.player; ["inv", "dashCd", "attackCd", "attackT", "comboT"].forEach(k => { if (p[k] > 0) p[k]--; }); if (p.comboT <= 0) p.combo = 0; let mx = input.right - input.left, my = input.down - input.up; const nn = nrm(mx, my); if (nn.l > 0.001 && !(p.dashT > 0)) p.dir = Math.abs(mx) > Math.abs(my) ? (mx > 0 ? "right" : "left") : (my > 0 ? "down" : "up"); if (C("dash") && p.dashCd <= 0) { let dvx = mx, dvy = my; if (Math.abs(dvx) + Math.abs(dvy) < 0.001) { const dv = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } }; dvx = dv[p.dir].x; dvy = dv[p.dir].y; } const dn = nrm(dvx, dvy); p.__dashVX = dn.x; p.__dashVY = dn.y; p.dashT = DASH_DURATION; p.dashCd = DASH_COOLDOWN; p.inv = Math.max(p.inv || 0, DASH_INVINCIBLE); ring(p.x + p.w / 2, p.y + p.h / 2, 22, p.trueGold ? "#ffd84d" : "#9ef7ff"); } if (p.dashT > 0) { p.dashT--; move(p, (p.__dashVX || 0) * DASH_SPEED, (p.__dashVY || 0) * DASH_SPEED); } else if (nn.l > 0.001) move(p, nn.x * p.speed, nn.y * p.speed); if (C("attack") && p.attackCd <= 0) attack(); if (C("magic")) magic(); if (C("action")) action(); }
function action() { if (G.state === "title") { start(); return; } if (G.talk) { talkNext(); return; } const p = G.player; if (!p) return; const pr = { x: p.x - 14, y: p.y - 14, w: p.w + 28, h: p.h + 28 }; for (const s of G.shops) if (hit(pr, s)) { G.shop = { shop: s }; G.state = "shop"; return; } for (const n of G.npcs) if (hit(pr, n)) { G.talk = { npc: n, index: 0, block: 8 }; G.state = "talk"; flush(); return; } for (const c of G.chests) if (!c.opened && hit(pr, c)) { openChest(c); return; } for (const d of G.doors) if (hit({ x: p.x - 30, y: p.y - 30, w: p.w + 60, h: p.h + 60 }, d)) { tryDoor(d); return; } }
function talkNext() { const t = G.talk; if (!t || !t.npc) { G.talk = null; G.state = "field"; return; } if (t.block && t.block-- > 0) { flush(); return; } t.index++; if (t.index >= (t.npc.lines || []).length) { const fn = t.npc.onTalk; G.talk = null; G.state = "field"; if (typeof fn === "function") fn(G); flush(); } }
function addInv(id, count = 1) { const f = G.player.inventory.find(v => typeof v === "object" && v.id === id); if (f) f.count += count; else G.player.inventory.push({ id, count }); }
function hasItem(id) { return G.player.inventory.some(v => v === id || (typeof v === "object" && v.id === id && v.count > 0)); }
function openChest(c) { c.opened = true; const it = c.item || {}; if (it.type === "key") { G.player.inventory.push(it.id); G.map.objective = "北のボス扉を開ける"; msg((it.name || it.id) + "を手に入れた！", 80); } else if (it.type === "coin") { G.player.coins += it.amount || 0; msg((it.amount || 0) + "コイン手に入れた！", 70); } else { addInv(it.id || "small_herb", it.count || 1); msg((it.name || it.id || "アイテム") + "を手に入れた！", 70); } }
function tryDoor(d) { if (!d.locked) return; if (hasItem(d.requiredItem)) { d.locked = false; G.map.objective = "守護獣を倒す"; spawnBoss(); msg((d.label || "扉") + "が開いた！", 90); } else msg("鍵が必要だ", 50); }
function herb() { const inv = G.player?.inventory.find(v => typeof v === "object" && v.id === "small_herb" && v.count > 0); if (inv && G.player.hp < G.player.maxHp) { inv.count--; G.player.hp = Math.min(G.player.maxHp, G.player.hp + 5); msg("薬草を使った", 40); } }
function shopItems() { const p = G.player; return [{ name: "剣を強化", cost: 50 + p.swordLv * 65, desc: "攻撃力+1", buy() { p.swordLv++; p.atk++; checkAwaken(); } }, { name: "盾を強化", cost: 55 + p.shieldLv * 70, desc: "防御力+1 HP+1", buy() { p.shieldLv++; p.armorLv = p.shieldLv; p.def++; p.maxHp++; p.hp++; checkAwaken(); } }, { name: "魔法を強化", cost: 65 + p.bookLv * 85, desc: "魔法+1 MP+1", buy() { p.bookLv++; p.magic++; p.magicLv++; p.magicRadius += 8; p.maxMp++; p.mp++; checkAwaken(); } }]; }
function closeShop() { G.shop = null; G.state = "field"; }
function buy(i) { const it = shopItems()[i]; if (!it) return; if (G.player.coins >= it.cost) { G.player.coins -= it.cost; it.buy(); msg(it.name + "した！", 70); } else msg("コインが足りない", 50); }
function checkAwaken() { const p = G.player; if (!p.curseLifted && p.swordLv >= 3 && p.shieldLv >= 3) { p.curseLifted = true; p.maxHp += 8; p.hp = p.maxHp; p.maxMp += 4; p.mp = p.maxMp; p.atk += 3; p.def += 2; p.magic += 2; p.speed += 0.35; msg("たぬきの呪いが解けた！ 波動砲解放！", 150); } if (!p.trueGold && p.curseLifted && p.bookLv >= 3) { p.trueGold = true; p.maxHp += 7; p.hp = p.maxHp; p.maxMp += 5; p.mp = p.maxMp; p.atk += 3; p.def += 2; p.magic += 4; p.speed += 0.22; msg("金色覚醒！", 150); } }
function spawnBoss() { if (G.boss || !G.map.boss) return; const bl = getBalance(), src = G.map.boss, b = { ...src }; b.x -= b.w / 2; b.y -= b.h / 2; b.t = 0; b.maxHp = Math.max(8, Math.round((b.maxHp || b.hp || 50) * bl.bossHpMul)); b.hp = b.maxHp; b.atk = Math.max(1, Math.round((b.atk || 2) * bl.bossAtkMul)); G.boss = b; }
function dmgE(e, d) { e.hp -= d; e.hitT = 10; fx(e.x + e.w / 2, e.y + e.h / 2, "#fff", 10, 2); if (e.hp <= 0) { const idx = G.enemies.indexOf(e); if (idx >= 0) G.enemies.splice(idx, 1); G.drops.push({ x: e.x + e.w / 2, y: e.y + e.h / 2, type: "coin" }); } }
function dmgB(d) { const b = G.boss; if (!b) return; b.hp -= d; if (b.hp <= 0) { G.boss = null; G.bossDefeatT = 120; G.state = "bossDefeat"; G.bullets = []; msg("ボス撃破！", 120); } }
function hurt(d) { const p = G.player; if (p.inv > 0) return; const b = getBalance(); const dmg = Math.max(1, Math.round((d || 1) * b.enemyAtkMul - (p.def || 0) * 0.8)); p.hp -= dmg; p.inv = b.enemyContactInv; msg("HIT -" + dmg, 30); if (p.hp <= 0) { p.hp = 0; G.state = "gameover"; } }

function updEnemies() { const p = G.player, box = ph(), b = getBalance(); for (let i = G.enemies.length - 1; i >= 0; i--) { const e = G.enemies[i]; if (!e) { G.enemies.splice(i, 1); continue; } e.t = (e.t || 0) + 1; if (e.hitT > 0) e.hitT--; const pcx = p.x + p.w / 2, pcy = p.y + p.h / 2, ecx = e.x + e.w / 2, ecy = e.y + e.h / 2, toP = nrm(pcx - ecx, pcy - ecy), d = toP.l; if (d < b.enemyAggro) e.wake = true; if (d > b.enemyGiveUp) e.wake = false; if (!e.wake) { e.x += Math.sin(e.t * 0.025 + i) * 0.22; e.y += Math.cos(e.t * 0.021 + i) * 0.22; } else { let sx = toP.x * e.speed, sy = toP.y * e.speed; if (e.type === "bat") { sx += Math.sin(e.t * 0.12) * 0.55; sy += Math.cos(e.t * 0.10) * 0.55; } if (e.type === "fast") { const pulse = 1 + Math.sin(e.t * 0.08) * 0.16; sx *= pulse; sy *= pulse; } e.x += sx; e.y += sy; } if (p.inv <= 0 && hit(box, e)) { hurt(e.atk || e.touchDamage || 1); e.x -= toP.x * 10; e.y -= toP.y * 10; } } }
function updBoss() { const b = G.boss; if (!b) return; b.t++; const r = G.map.bossRoom || { x: 42, y: 42, w: 700, h: 228 }; b.x = r.x + r.w / 2 - b.w / 2 + Math.cos(b.t * 0.024) * Math.min(170, r.w * 0.24); b.y = r.y + r.h / 2 - b.h / 2 + Math.sin(b.t * 0.034) * Math.min(62, r.h * 0.25); if (G.player.inv <= 0 && hit(ph(), b)) hurt(b.atk || 2); }
function updBullets() { for (let i = G.bullets.length - 1; i >= 0; i--) { const b = G.bullets[i]; if (!b) { G.bullets.splice(i, 1); continue; } b.life--; b.x += b.vx || 0; b.y += b.vy || 0; if (b.life <= 0) { G.bullets.splice(i, 1); continue; } let consumed = false; for (let j = G.enemies.length - 1; j >= 0; j--) { const e = G.enemies[j]; if (e && hit(b, e)) { dmgE(e, b.dmg || 1); if (!b.wave) { G.bullets.splice(i, 1); consumed = true; } break; } } if (consumed) continue; if (G.boss && hit(b, G.boss)) { dmgB((b.dmg || 1) * (b.wave ? 0.75 : 1)); if (!b.wave) G.bullets.splice(i, 1); } } }
function updDrops() { const p = G.player; for (let i = G.drops.length - 1; i >= 0; i--) { const d = G.drops[i], nn = nrm(p.x + 12 - d.x, p.y + 14 - d.y); if (nn.l < 80) { d.x += nn.x * 3.4; d.y += nn.y * 3.4; } if (nn.l < 18) { p.coins += 5 + Math.floor(5 * (getBalance().coinBonus - 1)); G.drops.splice(i, 1); } } }
function fx(x, y, color, life = 20, spread = 2) { for (let i = 0; i < 10; i++) G.effects.push({ type: "p", x, y, vx: R(-spread, spread), vy: R(-spread, spread), life, max: life, color, size: R(1, 2.6) }); }
function ring(x, y, r, color) { G.effects.push({ type: "ring", x, y, r, life: 34, max: 34, color }); }
function updFx() { for (let i = G.effects.length - 1; i >= 0; i--) { const e = G.effects[i]; e.life--; if (e.type === "ring") e.r += 2.4; else { e.x += e.vx || 0; e.y += e.vy || 0; } if (e.life <= 0) G.effects.splice(i, 1); } }
function cam() { const p = G.player; if (!p || !G.map) return; G.camera.x = cl(p.x + p.w / 2 - VW / 2, 0, Math.max(0, G.map.width - VW)); G.camera.y = cl(p.y + p.h / 2 - VH / 2, 0, Math.max(0, G.map.height - VH)); }
function wx(x) { return Math.round(x - G.camera.x); } function wy(y) { return Math.round(y - G.camera.y); }

function update() { G.time++; if (G.lock > 0) { G.lock--; flush(); } if (G.messageT > 0) G.messageT--; if (G.state === "title") { if (C("start") || C("action") || C("attack")) start(); } else if (G.state === "field") { updP(); updEnemies(); if (G.boss) updBoss(); updBullets(); updDrops(); updFx(); cam(); } else if (G.state === "talk") { if (G.talk && G.talk.block > 0) G.talk.block--; if (C("action") || C("attack") || C("start")) talkNext(); updFx(); cam(); } else if (G.state === "shop") { if (C("action")) closeShop(); updFx(); cam(); } else if (G.state === "bossDefeat") { G.bossDefeatT--; updFx(); cam(); if (G.bossDefeatT <= 0) { if (typeof G.map.onClear === "function") G.map.onClear(G); G.state = "clear"; G.lock = 36; flush(); msg(G.stageIndex + 1 < STAGES.length ? "島クリア！ 次の島へ" : "全島クリア！", 180); } } else if (G.state === "clear") { if (C("start") || C("action") || C("attack")) { if (G.stageIndex + 1 < STAGES.length) { G.stageIndex++; load(STAGES[G.stageIndex], true); } else { G.state = "title"; G.lock = 48; flush(); } } } else if (G.state === "gameover") { if (C("start") || C("action") || C("attack")) { G.state = "title"; G.lock = 36; flush(); } } }

function bg() { ctx.fillStyle = "#8fe8ff"; ctx.fillRect(0, 0, VW, VH); const colors = ["#66d86f", "#56c96a", "#66cce6", "#d56d45", "#d9c56a", "#7ca7ff", "#6951b8"]; ctx.fillStyle = colors[G.stageIndex] || "#66d86f"; if (G.map) { ctx.save(); ctx.translate(-G.camera.x, -G.camera.y); RR(28, 28, G.map.width - 56, G.map.height - 56, 36); ctx.fill(); ctx.restore(); } }
function drawTerrain() { for (const t of G.terrain) { const x = wx(t.x), y = wy(t.y); ctx.fillStyle = t.type === "tree" ? "#50c85e" : t.type === "rock" ? "#8fa3ad" : "#91a9b5"; RR(x, y, t.w, t.h, 10); ctx.fill(); } }
function fallbackDrawEnemy(e) { ctx.fillStyle = e.hitT > 0 ? "#fff" : (e.color || "#f66"); RR(wx(e.x), wy(e.y), e.w, e.h, 8); ctx.fill(); }
function fallbackDrawHero(p) { ctx.fillStyle = p.trueGold ? "#ffd84d" : p.curseLifted ? "#9ef7ff" : "#fff"; RR(wx(p.x), wy(p.y), p.w, p.h, 8); ctx.fill(); }
function draw() { if (G.state === "title") { ctx.fillStyle = "#8fe8ff"; ctx.fillRect(0, 0, VW, VH); ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.font = "900 34px system-ui"; ctx.fillText("SKY ISLAND", VW / 2, 210); ctx.fillText("ADVENTURE", VW / 2, 250); ctx.font = "800 15px system-ui"; ctx.fillText("TAP / Z TO START", VW / 2, 326); ctx.textAlign = "left"; return; } bg(); drawTerrain(); for (const d of G.doors) { ctx.fillStyle = d.locked ? "#8c6136" : "#55d68a"; RR(wx(d.x), wy(d.y), d.w, d.h, 10); ctx.fill(); } for (const c of G.chests) { ctx.fillStyle = c.opened ? "#6a4a2d" : "#b77233"; RR(wx(c.x), wy(c.y), c.w, c.h, 5); ctx.fill(); } for (const s of G.shops) { if (typeof drawShop3D === "function") drawShop3D(ctx, s, wx, wy); else { ctx.fillStyle = s.color || "#ffb347"; RR(wx(s.x), wy(s.y), s.w, s.h, 8); ctx.fill(); } } for (const n of G.npcs) { if (typeof drawNPC3D === "function") drawNPC3D(ctx, n, wx, wy); else { ctx.fillStyle = n.color || "#89ff9b"; RR(wx(n.x), wy(n.y), n.w, n.h, 8); ctx.fill(); } } for (const d of G.drops) { if (typeof drawCoin3D === "function") drawCoin3D(ctx, d, wx, wy); else { ctx.fillStyle = "#ffd84d"; ctx.beginPath(); ctx.arc(wx(d.x), wy(d.y), 5, 0, Math.PI * 2); ctx.fill(); } } for (const e of G.enemies) { if (typeof drawEnemy3D === "function") drawEnemy3D(ctx, e, wx, wy); else fallbackDrawEnemy(e); } if (G.boss) { if (typeof drawBoss3D === "function") drawBoss3D(ctx, G.boss, wx, wy, G.time); else { ctx.fillStyle = G.boss.color || "#7cff92"; RR(wx(G.boss.x), wy(G.boss.y), G.boss.w, G.boss.h, 20); ctx.fill(); } } for (const b of G.bullets) { ctx.save(); ctx.fillStyle = b.color || "#fff"; ctx.shadowBlur = b.wave ? 12 : 0; ctx.shadowColor = b.color || "#fff"; if (b.wave) { RR(wx(b.x), wy(b.y), b.w, b.h, 999); ctx.fill(); } else { ctx.beginPath(); ctx.arc(wx(b.x + b.w / 2), wy(b.y + b.h / 2), b.w / 2, 0, Math.PI * 2); ctx.fill(); } ctx.restore(); } if (typeof drawHeroAdventurer3D === "function") drawHeroAdventurer3D(ctx, G.player, wx, wy, G.time, atkBox); else fallbackDrawHero(G.player); for (const e of G.effects) { ctx.save(); ctx.globalAlpha = Math.max(0, Math.min(1, e.life / (e.max || e.life || 1))); if (e.type === "ring") { ctx.strokeStyle = e.color || "#fff"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(wx(e.x), wy(e.y), e.r || 1, 0, Math.PI * 2); ctx.stroke(); } else { ctx.fillStyle = e.color || "#fff"; ctx.fillRect(wx(e.x), wy(e.y), e.size || 2, e.size || 2); } ctx.restore(); } ui(); }
function bar(x, y, w, h, r, c) { ctx.fillStyle = "rgba(255,255,255,.18)"; RR(x, y, w, h, 999); ctx.fill(); ctx.fillStyle = c; RR(x, y, Math.max(1, w * cl(r, 0, 1)), h, 999); ctx.fill(); }
function ui() { const p = G.player; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = "rgba(8,25,45,.58)"; RR(10, 10, VW - 20, 88, 14); ctx.fill(); ctx.fillStyle = "#fff"; ctx.font = "800 13px system-ui"; ctx.fillText((G.stageIndex + 1) + "/" + STAGES.length + " " + G.map.name, 22, 31); ctx.fillText("目的: " + G.map.objective, 22, 54); bar(22, 68, 130, 10, p.hp / p.maxHp, "#ff6262"); bar(170, 68, 76, 10, p.mp / p.maxMp, "#63d8ff"); ctx.fillText("Coin " + p.coins, 260, 78); ctx.font = "800 11px system-ui"; ctx.fillText("向き" + p.dir + " 剣" + p.swordLv + " 盾" + p.shieldLv + " 魔" + p.bookLv + " Combo" + p.combo, 155, 55); if (G.messageT > 0) { ctx.textAlign = "center"; ctx.font = "900 20px system-ui"; ctx.fillText(G.message, VW / 2, 180); ctx.textAlign = "left"; } if (G.boss) { ctx.fillStyle = "rgba(8,25,45,.58)"; RR(10, 106, VW - 20, 44, 14); ctx.fill(); ctx.fillStyle = "#fff"; ctx.font = "900 13px system-ui"; ctx.fillText("BOSS " + G.boss.name, 22, 128); bar(128, 120, 206, 12, G.boss.hp / G.boss.maxHp, "#7cff92"); } if (G.talk) { const n = G.talk.npc; ctx.fillStyle = "rgba(8,25,45,.82)"; RR(18, VH - 150, VW - 36, 124, 16); ctx.fill(); ctx.fillStyle = "#ffd84d"; ctx.font = "900 14px system-ui"; ctx.fillText(n.name, 34, VH - 120); ctx.fillStyle = "#fff"; ctx.font = "700 15px system-ui"; ctx.fillText((n.lines || [])[G.talk.index] || "", 34, VH - 92); } if (G.state === "shop") { const items = shopItems(); ctx.fillStyle = "rgba(8,25,45,.90)"; RR(18, 210, VW - 36, 330, 18); ctx.fill(); ctx.fillStyle = "#ffd84d"; ctx.font = "900 20px system-ui"; ctx.fillText(G.shop.shop.name, 38, 244); ctx.fillStyle = "#fff"; ctx.font = "800 13px system-ui"; ctx.fillText("Coin " + p.coins + " / 1,2,3で強化 / ACTで閉じる", 38, 270); for (let i = 0; i < items.length; i++) { const y = 305 + i * 60, it = items[i]; ctx.fillStyle = "rgba(255,255,255,.10)"; RR(34, y, VW - 68, 48, 12); ctx.fill(); ctx.fillStyle = "#fff"; ctx.font = "900 15px system-ui"; ctx.fillText((i + 1) + ". " + it.name + " " + it.cost + "C", 48, y + 20); ctx.font = "700 12px system-ui"; ctx.fillText(it.desc, 48, y + 39); } } if (G.state === "clear") { ctx.fillStyle = "rgba(255,255,255,.2)"; ctx.fillRect(0, 0, VW, VH); ctx.textAlign = "center"; ctx.fillStyle = "#fff"; ctx.font = "900 32px system-ui"; ctx.fillText(G.stageIndex + 1 < STAGES.length ? "STAGE CLEAR" : "ALL CLEAR", VW / 2, 280); ctx.font = "700 14px system-ui"; ctx.fillText(G.lock > 0 ? "入力ロック中" : "TAP / Zで進む", VW / 2, 318); ctx.textAlign = "left"; } if (G.state === "gameover") { ctx.fillStyle = "rgba(0,0,0,.45)"; ctx.fillRect(0, 0, VW, VH); ctx.textAlign = "center"; ctx.fillStyle = "#fff"; ctx.font = "900 42px system-ui"; ctx.fillText("GAME OVER", VW / 2, VH / 2); ctx.textAlign = "left"; } }
function loop() { try { update(); draw(); } catch (err) { console.error(err); msg("内部エラーを回避しました", 90); } requestAnimationFrame(loop); }
loop();
