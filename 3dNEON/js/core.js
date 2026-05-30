// js/core.js
window.GameApp = (() => {
  const canvas = document.getElementById('gameCanvas');
  const hud = document.getElementById('hud');
  const touch = document.getElementById('touchControls');
  const screens = {
    title: document.getElementById('titleScreen'),
    stages: document.getElementById('stageScreen'),
    clear: document.getElementById('clearScreen')
  };
  const hudStage = document.getElementById('hudStage');
  const hudHp = document.getElementById('hudHp');
  const hudScore = document.getElementById('hudScore');

  let renderer, scene, camera, clock;
  let player, bullets = [], enemies = [], stars = [];
  let currentStage = 1, stageModule = null;
  let score = 0, hp = 100, running = false;
  let move = { x:0, y:0 }, firing = false, fireCooldown = 0;

  function boot() {
    renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x020617, 12, 48);
    camera = new THREE.PerspectiveCamera(70, innerWidth/innerHeight, 0.1, 100);
    camera.position.set(0, 3.2, 8);
    clock = new THREE.Clock();
    setupLights();
    setupUi();
    setupTouch();
    resize();
    addEventListener('resize', resize);
    loop();
  }

  function setupLights(){
    scene.add(new THREE.AmbientLight(0x88ccff, .75));
    const d = new THREE.DirectionalLight(0xffffff, 1.1);
    d.position.set(2,4,6); scene.add(d);
  }

  function setupUi(){
    document.getElementById('startBtn').onclick = () => startStage(1);
    document.getElementById('stageSelectBtn').onclick = () => show('stages');
    document.getElementById('backTitleBtn').onclick = () => show('title');
    document.getElementById('clearToTitleBtn').onclick = () => show('title');
    document.getElementById('nextStageBtn').onclick = () => {
      if (currentStage < 5) startStage(currentStage + 1); else show('title');
    };
    document.getElementById('soundBtn').onclick = (e) => {
      const on = AudioManager.toggle(); e.target.textContent = `SOUND: ${on ? 'ON':'OFF'}`;
    };
    const wrap = document.getElementById('stageButtons');
    for(let i=1;i<=5;i++){
      const b = document.createElement('button'); b.textContent = `STAGE ${i}`; b.onclick = () => startStage(i); wrap.appendChild(b);
    }
  }

  function show(name){
    Object.values(screens).forEach(s=>s.classList.remove('active'));
    screens[name].classList.add('active');
    hud.classList.add('hidden'); touch.classList.add('hidden'); running = false;
    AudioManager.playMusic(name === 'title' ? 'title' : 'clear');
  }

  function startStage(n){
    currentStage = n; stageModule = window[`Stage${n}`];
    if (!stageModule) return alert(`Stage${n} が見つかりません`);
    clearWorld();
    score = 0; hp = 100; running = true;
    Object.values(screens).forEach(s=>s.classList.remove('active'));
    hud.classList.remove('hidden'); touch.classList.remove('hidden');
    hudStage.textContent = n;
    createPlayer(); createStarfield(); stageModule.init?.(api());
    AudioManager.playMusic(`stage${n}`);
  }

  function clearWorld(){
    [...bullets, ...enemies, ...stars].forEach(o=>scene.remove(o.mesh || o));
    bullets=[]; enemies=[]; stars=[];
    if(player){ scene.remove(player); player = null; }
  }

  function createPlayer(){
    const geo = new THREE.ConeGeometry(.42, 1.15, 4);
    const mat = new THREE.MeshStandardMaterial({ color:0x38bdf8, emissive:0x075985, metalness:.25, roughness:.35 });
    player = new THREE.Mesh(geo, mat); player.rotation.x = Math.PI/2; player.position.set(0,0,2.8); scene.add(player);
  }

  function createStarfield(){
    const geo = new THREE.SphereGeometry(.025, 6, 6);
    const mat = new THREE.MeshBasicMaterial({ color:0xdef7ff });
    for(let i=0;i<130;i++){
      const s = new THREE.Mesh(geo, mat); resetStar(s, true); scene.add(s); stars.push(s);
    }
  }
  function resetStar(s, randomZ=false){ s.position.set((Math.random()-.5)*12, (Math.random()-.5)*8, randomZ ? -Math.random()*42 : -42); }

  function spawnEnemy(opts={}){
    const geo = new THREE.BoxGeometry(opts.size||.55, opts.size||.55, opts.size||.55);
    const mat = new THREE.MeshStandardMaterial({ color:opts.color||0xf43f5e, emissive:opts.emissive||0x450a0a });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(opts.x ?? (Math.random()-.5)*7, opts.y ?? (Math.random()-.5)*4.2, opts.z ?? -25);
    scene.add(mesh);
    enemies.push({ mesh, hp:opts.hp||1, speed:opts.speed||7, rot:Math.random()*3 });
  }

  function shoot(){
    const geo = new THREE.SphereGeometry(.08, 10, 10);
    const mat = new THREE.MeshBasicMaterial({ color:0xa7f3d0 });
    const mesh = new THREE.Mesh(geo, mat); mesh.position.copy(player.position); mesh.position.z -= .8; scene.add(mesh);
    bullets.push({ mesh, speed:18 }); AudioManager.playSfx('shot');
  }

  function loop(){
    requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), .033);
    if(running) update(dt);
    renderer.render(scene, camera);
  }

  function update(dt){
    stageModule.update?.(api(), dt);
    player.position.x = THREE.MathUtils.clamp(player.position.x + move.x * dt * 5.8, -4.2, 4.2);
    player.position.y = THREE.MathUtils.clamp(player.position.y + move.y * dt * 4.2, -2.55, 2.55);
    player.rotation.z = -move.x * .35;
    fireCooldown -= dt; if(firing && fireCooldown <= 0){ shoot(); fireCooldown = .16; }
    stars.forEach(s=>{ s.position.z += dt*18; if(s.position.z > 6) resetStar(s); });
    bullets.forEach(b=>b.mesh.position.z -= b.speed*dt);
    enemies.forEach(e=>{ e.mesh.position.z += e.speed*dt; e.mesh.rotation.x += dt*e.rot; e.mesh.rotation.y += dt*(e.rot+.5); });
    handleCollisions();
    bullets = bullets.filter(b=> b.mesh.position.z > -44 || (scene.remove(b.mesh), false));
    enemies = enemies.filter(e=> {
      if(e.mesh.position.z > 4.1){ damage(10); scene.remove(e.mesh); return false; }
      return true;
    });
    hudHp.textContent = Math.max(0, Math.floor(hp)); hudScore.textContent = score;
    if(hp <= 0) finish(false);
    if(stageModule.isClear?.(api())) finish(true);
  }

  function handleCollisions(){
    for(const b of bullets){
      for(const e of enemies){
        if(b.mesh.visible && e.mesh.visible && b.mesh.position.distanceTo(e.mesh.position) < .48){
          b.mesh.visible = false; e.hp--; AudioManager.playSfx('hit');
          if(e.hp <= 0){ e.mesh.visible = false; score += 100; }
        }
      }
    }
    bullets.filter(b=>!b.mesh.visible).forEach(b=>scene.remove(b.mesh));
    enemies.filter(e=>!e.mesh.visible).forEach(e=>scene.remove(e.mesh));
    bullets = bullets.filter(b=>b.mesh.visible); enemies = enemies.filter(e=>e.mesh.visible);
  }

  function damage(v){ hp -= v; AudioManager.playSfx('damage'); }

  function finish(clear){
    running = false; hud.classList.add('hidden'); touch.classList.add('hidden');
    document.getElementById('clearTitle').textContent = clear ? 'STAGE CLEAR!' : 'GAME OVER';
    document.getElementById('clearText').textContent = `STAGE ${currentStage} / SCORE ${score}`;
    document.getElementById('nextStageBtn').style.display = clear && currentStage < 5 ? '' : 'none';
    show('clear');
  }

  function setupTouch(){
    const base = document.getElementById('stickBase'), knob = document.getElementById('stickKnob'), fire = document.getElementById('fireBtn');
    let stickId = null, rect;
    base.addEventListener('pointerdown', e=>{ stickId=e.pointerId; rect=base.getBoundingClientRect(); base.setPointerCapture(stickId); updateStick(e); });
    base.addEventListener('pointermove', e=>{ if(e.pointerId===stickId) updateStick(e); });
    base.addEventListener('pointerup', resetStick); base.addEventListener('pointercancel', resetStick);
    function updateStick(e){
      const cx=rect.left+rect.width/2, cy=rect.top+rect.height/2;
      let dx=e.clientX-cx, dy=e.clientY-cy; const len=Math.hypot(dx,dy), max=42;
      if(len>max){dx=dx/len*max;dy=dy/len*max} knob.style.transform=`translate(${dx}px,${dy}px)`; move.x=dx/max; move.y=-dy/max;
    }
    function resetStick(){ stickId=null; knob.style.transform='translate(0,0)'; move.x=move.y=0; }
    fire.addEventListener('pointerdown', e=>{ firing=true; fire.setPointerCapture(e.pointerId); });
    fire.addEventListener('pointerup', ()=>firing=false); fire.addEventListener('pointercancel', ()=>firing=false);
  }

  function resize(){
    const w=innerWidth, h=innerHeight; renderer.setSize(w,h,false); camera.aspect=w/h; camera.updateProjectionMatrix();
  }

  function api(){ return { scene, camera, player, spawnEnemy, get enemies(){return enemies}, get score(){return score}, get hp(){return hp}, set score(v){score=v}, damage, finish }; }
  return { boot, startStage };
})();
