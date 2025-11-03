// Deluxe build
import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

// -------------------- UI Elements --------------------
const hud = q('#hud');
const timeEl=q('#time'), scoreEl=q('#score'), multEl=q('#mult'), carriedEl=q('#carried');
const oxyFill = q('#o2fill');
const menu=q('#menu'), pause=q('#pause'), how=q('#how'), settings=q('#settings'), board=q('#board'), credits=q('#credits'), prompt=q('#prompt'), over=q('#over'), cinema=q('#cinema');
const btn = (sel, fn)=> q(sel).addEventListener('click', fn);
btn('#btnAdventure', startAdventure);
btn('#btnStory', startStory);
btn('#btnHow', ()=> showPanel(how));
btn('#btnSettings', ()=> showPanel(settings));
btn('#btnLeaderboard', ()=> {populateLeaders(); showPanel(board);});
btn('#btnCredits', ()=> showPanel(credits));
btn('#resumeBtn', resumeGame);
btn('#restartBtn', ()=>{ if(state.mode==='story') beginStoryChapter(state.chapterIndex,true); else startAdventure(); });
btn('#menuBtn', ()=> showPanel(menu));
$$('.back').forEach(b=> b.addEventListener('click', ()=> showPanel(menu)));
btn('#again', startAdventure);
btn('#saveBtn', saveScore);
btn('#muteBtn', ()=> toggleMute());
btn('#hqBtn', ()=> { state.hq = !state.hq; });
q('#sens').addEventListener('input', e=> state.sens = parseFloat(e.target.value));

function q(s){ return document.querySelector(s); }
function $$(s){ return document.querySelectorAll(s); }
function showPanel(p){ [menu,pause,how,settings,board,credits,over,prompt,cinema].forEach(x=> x.classList.add('hidden')); p.classList.remove('hidden'); hud.classList.add('hidden'); controls.unlock(); state.running=false; }
function hidePanels(){ [menu,pause,how,settings,board,credits,over,prompt,cinema].forEach(x=> x.classList.add('hidden')); hud.classList.remove('hidden'); }

// -------------------- Audio --------------------
const actx = new (window.AudioContext || window.webkitAudioContext)();
let master = actx.createGain(); master.connect(actx.destination); master.gain.value = 0.7;
let muted=false;
function tone(f=440,d=0.14,type='sine',vol=0.4){
  const t0=actx.currentTime; const o=actx.createOscillator(); o.type=type; o.frequency.value=f;
  const g=actx.createGain(); g.gain.value=0; o.connect(g); g.connect(master); o.start();
  g.gain.linearRampToValueAtTime(vol, t0+0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0+d); o.stop(t0+d);
}
function collectSfx(){ tone(900,0.12,'sine',0.5); tone(1350,0.12,'sine',0.25); }
function uiSfx(){ tone(660,0.09,'square',0.25); }
function completeSfx(){ tone(523,0.2,'triangle',0.4); tone(659,0.25,'triangle',0.35); tone(784,0.3,'triangle',0.3); }
function stingSfx(){ tone(190,0.2,'sawtooth',0.5); }
function ambientStart(){ if(state.amb) state.amb.stop(); const o=actx.createOscillator(); o.type='sine'; o.frequency.value=110; const g=actx.createGain(); g.gain.value=0.03; o.connect(g); g.connect(master); o.start(); state.amb=o; }
function ambientStop(){ if(state.amb){ state.amb.stop(); state.amb=null; } }
function toggleMute(){ muted=!muted; master.gain.value = muted?0:0.7; }

// -------------------- Three.js --------------------
const canvas = document.getElementById('bg');
const renderer = new THREE.WebGLRenderer({ canvas, antialias:true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = false;

const scene = new THREE.Scene();
const UNDERWATER_BG = 0x052129;
const SKY_BG = 0x78b7e0;
scene.background = new THREE.Color(SKY_BG);
scene.fog = new THREE.FogExp2(0x84c2e3, 0.0025); // light fog above water

const camera = new THREE.PerspectiveCamera(70, innerWidth/innerHeight, 0.1, 3000);
camera.position.set(0,6,40); // start above water on island
const controls = new PointerLockControls(camera, document.body);
scene.add(controls.getObject());

// lighting
const hemi = new THREE.HemisphereLight(0xcde8ff, 0x416d66, 0.95); scene.add(hemi);
const dir = new THREE.DirectionalLight(0xffffff, 0.7); dir.position.set(120,220,80); scene.add(dir);

// Sky dome
const skyGeo = new THREE.SphereGeometry(2000, 32, 32);
const skyMat = new THREE.MeshBasicMaterial({ color: 0x74b6e3, side: THREE.BackSide });
const sky = new THREE.Mesh(skyGeo, skyMat); scene.add(sky);

// Water surface
const waterGeo = new THREE.PlaneGeometry(2000, 2000, 200, 200);
const waterMat = new THREE.MeshPhongMaterial({ color: 0x2dc2c7, transparent:true, opacity:0.35, side:THREE.DoubleSide });
const water = new THREE.Mesh(waterGeo, waterMat); water.rotation.x = -Math.PI/2; water.position.y = 0; scene.add(water);

// Underwater caustics ground
const causticsTex = new THREE.DataTexture(genCaustics(256,256),256,256,THREE.RGBAFormat); causticsTex.needsUpdate=true; causticsTex.wrapS=causticsTex.wrapT=THREE.RepeatWrapping;
const caustics = new THREE.Mesh(new THREE.PlaneGeometry(2000,2000), new THREE.MeshBasicMaterial({ map: causticsTex, color:0xe6c88f, transparent:true, opacity:0.08 }));
caustics.rotation.x = -Math.PI/2; caustics.position.y=-2; scene.add(caustics);

// Seabed
const seabed = new THREE.Mesh(new THREE.PlaneGeometry(2000,2000,180,180), new THREE.MeshPhongMaterial({ color:0x7c7a5e, flatShading:true }));
seabed.rotation.x = -Math.PI/2; displacePlane(seabed.geometry,(x,z)=> noise2(x*0.004,z*0.004)*14 - 34); scene.add(seabed);

// Island
const island = new THREE.Group(); scene.add(island);
const islandGeo = new THREE.CircleGeometry(80, 64);
const islandMat = new THREE.MeshPhongMaterial({ color:0xd6c29a });
const islandMesh = new THREE.Mesh(islandGeo, islandMat);
islandMesh.rotation.x = -Math.PI/2; islandMesh.position.y = 3.2; island.add(islandMesh);
// palm trees
for (let i=0;i<12;i++){
  const palm = makePalm();
  const r = 50 + Math.random()*20, a = Math.random()*Math.PI*2;
  palm.position.set(Math.cos(a)*r, 3.2, Math.sin(a)*r);
  island.add(palm);
}

// Dhow near shore
const dhow = new THREE.Group();
const hull = new THREE.Mesh(new THREE.BoxGeometry(34,6,12), new THREE.MeshPhongMaterial({ color:0x7a5533 })); hull.position.y = 2; hull.rotation.y=0.3; dhow.add(hull);
const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.35,0.35,22,10), new THREE.MeshPhongMaterial({ color:0x7a5533 })); mast.position.set(0,11,0); dhow.add(mast);
const sail = new THREE.Mesh(new THREE.PlaneGeometry(24,14), new THREE.MeshPhongMaterial({ color:0xffffff, side:THREE.DoubleSide })); sail.position.set(9,8,0); sail.rotation.set(0,Math.PI/2.4,0); dhow.add(sail);
dhow.position.set(0,1,-120); scene.add(dhow);

const bankRing = new THREE.Mesh(new THREE.TorusGeometry(18, 0.6, 16, 48), new THREE.MeshBasicMaterial({ color:0xffe28a }));
bankRing.rotation.x = Math.PI/2; bankRing.position.set(0,-6,-120); scene.add(bankRing);

// Kelp & Coral (underwater)
const kelp = new THREE.Group(); scene.add(kelp);
for(let i=0;i<160;i++){ const k=makeKelp(); k.position.set(rand(-900,900),-32,rand(-900,900)); kelp.add(k); }
const coralGroup = new THREE.Group(); scene.add(coralGroup);
for(let i=0;i<80;i++){ const col=(i%2===0)?0xe76f51:0xf4a261; const geo=new THREE.ConeGeometry(rand(0.6,1.2),rand(1.2,2.4),6); const mat=new THREE.MeshPhongMaterial({ color:col, emissive:0x240a05, shininess:16 }); const c=new THREE.Mesh(geo,mat); c.position.set(rand(-900,900), -33, rand(-900,900)); coralGroup.add(c); }

// Fish schools
const fishGroup = new THREE.Group(); scene.add(fishGroup);
for(let i=0;i<120;i++){ fishGroup.add(makeFish()); }

// oysters / pearls / jellies / artifacts
let oysters=[], pearls=[], jellies=[], artifacts=[], bubbles=[];

// -------------------- Game State --------------------
const state = {
  running:false, paused:false, mode:null,
  chapterIndex:0, chapter:null, startTime:0, timeLimit:300,
  score:0, carried:0, mult:1, oxy:100, hq:true, sens:1, amb:null,
  inIntro:false, tIntro:0
};

// Story chapters (same goals)
const CHAPTERS = [
  { name:"Chapter 1 — Shallow Waters",
    intro:"Reach the dhow, collect <b>5 pearls</b>, and bank them to honor your first harvest.",
    goals:{ pearls:5, bank:true }, time:210, facts:"Pearling once formed the backbone of the UAE's coastal economy.",
    setup: ()=>{} },
  { name:"Chapter 2 — The Falcon's Compass",
    intro:"Find the <b>Falcon Compass</b> on the seabed. Its guidance echoes navigators' wisdom.",
    goals:{ artifact:'compass' }, time:240, facts:"Traditional navigators relied on sea currents, winds, and the stars.",
    setup: ()=>{ addArtifact('compass'); } },
  { name:"Chapter 3 — Moonlight Harvest",
    intro:"Night waters are calm. Gather <b>10 pearls</b> and bank them before time fades.",
    goals:{ pearls:10, bank:true }, time:210, facts:"Merchants traded natural pearls across the Gulf and beyond.",
    setup: ()=>{} },
];

// -------------------- Mode starters --------------------
function startAdventure(){ uiSfx(); resetWorld(); state.mode='adventure'; state.timeLimit=300; state.score=0; state.carried=0; state.mult=1; state.oxy=100; playIntroThen(()=>{ spawnOysters(45); spawnJellies(18); }); }
function startStory(){ uiSfx(); resetWorld(); state.mode='story'; state.chapterIndex=0; beginStoryChapter(0,true); }
function beginStoryChapter(i, fresh=false){
  resetWorld();
  const ch=CHAPTERS[i]; state.chapter=ch; state.chapterIndex=i;
  state.timeLimit=ch.time; state.score=fresh?0:state.score; state.carried=0; state.mult=1; state.oxy=100;
  ch.setup(i);
  playIntroThen(()=>{
    spawnOysters(i===2?30:20); spawnJellies(i===2?14:10);
    prompt.innerHTML = `<h3>${ch.name}</h3><p>${ch.intro}</p>`; prompt.classList.remove('hidden'); setTimeout(()=>prompt.classList.add('hidden'), 3000);
  });
}

function playIntroThen(after){
  // player on island looking at water
  controls.getObject().position.set(20, 6, 40);
  controls.getObject().rotation.set(0,0,0);
  hidePanels();
  cinema.classList.remove('hidden');
  state.inIntro = true; state.tIntro = 0;
  ambientStart();
  const onClick = ()=>{ document.removeEventListener('mousedown', onClick); controls.lock(); cinema.classList.add('hidden'); };
  document.addEventListener('mousedown', onClick);
  state.startTime = performance.now(); state.running=true; // timer will advance in slow-mo
  state.afterIntro = after;
}

// -------------------- Entities --------------------
function resetWorld(){
  [...oysters,...pearls,...jellies,...artifacts,...bubbles].forEach(m=> scene.remove(m));
  oysters=[]; pearls=[]; jellies=[]; artifacts=[]; bubbles=[];
  // reset environment
  scene.background.set(SKY_BG); scene.fog.color.set(0x84c2e3); scene.fog.density = 0.0025;
  controls.getObject().position.set(20,6,40);
  // remove lingering prompt/cinema
  [prompt, cinema].forEach(x=> x.classList.add('hidden'));
}
function spawnOysters(n){
  const oysterGeo=new THREE.SphereGeometry(2,16,16);
  const oysterMat1=new THREE.MeshPhongMaterial({ color:0xa28f72, flatShading:true });
  const oysterMat2=new THREE.MeshPhongMaterial({ color:0xc1b496, flatShading:true });
  const pearlMat=new THREE.MeshPhongMaterial({ color:0xffffff, emissive:0xaa8844, shininess:120, specular:0xffffff });
  for(let i=0;i<n;i++){
    const top=new THREE.Mesh(oysterGeo,oysterMat2), bot=new THREE.Mesh(oysterGeo,oysterMat1);
    top.scale.set(1.2,0.4,1.2); bot.scale.set(1.2,0.4,1.2); bot.rotation.z=Math.PI;
    const o=new THREE.Group(); o.add(top); o.add(bot);
    const x=rand(-900,900), z=rand(-900,900), y=-30+noise2(x*0.006,z*0.006)*8;
    o.position.set(x,y,z); o.userData.open=0; scene.add(o); oysters.push(o);
    const p=new THREE.Mesh(new THREE.SphereGeometry(0.8,16,16), pearlMat.clone()); p.position.set(x,y+0.8,z); p.userData.active=true; scene.add(p); pearls.push(p);
  }
}
function spawnJellies(n){ for(let i=0;i<n;i++){ const j=makeJelly(); j.position.set(rand(-900,900),-20,rand(-900,900)); j.userData.phase=Math.random()*Math.PI*2; jellies.push(j); scene.add(j); } }
function addArtifact(kind){
  if(kind==='compass'){
    const g=new THREE.TorusKnotGeometry(1.2,0.35,80,12); const m=new THREE.MeshPhongMaterial({ color:0xffdd88, emissive:0x553300, shininess:80 });
    const mesh=new THREE.Mesh(g,m); mesh.position.set(rand(-700,700),-24,rand(-700,700)); mesh.userData.kind='compass'; scene.add(mesh); artifacts.push(mesh);
  }
  // Treasure chest
  const chest = new THREE.Mesh(new THREE.BoxGeometry(3,2,2), new THREE.MeshPhongMaterial({ color:0x8b5a2b }));
  chest.position.set(rand(-700,700), -28, rand(-700,700)); chest.userData.kind='chest'; scene.add(chest); artifacts.push(chest);
}

// -------------------- Update & Render --------------------
const keys={}; window.addEventListener('keydown', e=>{ keys[e.code]=true; if(e.code==='KeyP'){togglePause();} if(e.code==='KeyM'){toggleMute();} if(e.code==='KeyF'){toggleFS();} if(e.code==='KeyE'){interact();} });
window.addEventListener('keyup', e=> keys[e.code]=false);

function resumeGame(){ pause.classList.add('hidden'); controls.lock(); state.paused=false; }
function togglePause(){ if(!state.running) return; state.paused=!state.paused; pause.classList.toggle('hidden', !state.paused); if(state.paused) controls.unlock(); else controls.lock(); }

function updateHUD(){
  hud.classList.remove('hidden');
  const rem = Math.max(0, state.timeLimit - Math.floor((performance.now()-state.startTime)/1000));
  timeEl.textContent = fmtTime(rem);
  scoreEl.textContent = state.score; multEl.textContent = state.mult.toFixed(1); carriedEl.textContent = state.carried;
  setOxyBar(state.oxy);
  if(rem<=0) return endChapterOrGame();
}
function fmtTime(t){ const m=String(Math.floor(t/60)).padStart(2,'0'); const s=String(t%60).padStart(2,'0'); return `${m}:${s}`; }
function setOxyBar(v){ v=Math.max(0,Math.min(100,v)); oxyFill.style.width = `${v}%`; oxyFill.style.background = v>50? 'linear-gradient(90deg,#2bc4ad,#69d0b7)': (v>25? 'linear-gradient(90deg,#ffd166,#f3a712)' : 'linear-gradient(90deg,#ef476f,#e63946)'); }

function interact(){
  if(!state.running || state.paused) return;
  const p = controls.getObject().position; let nearest=null; let dist=4;
  for(const pr of pearls){ if(!pr.userData.active) continue; const d=pr.position.distanceTo(p); if(d<dist){dist=d; nearest=pr;} }
  if(nearest){ nearest.userData.active=false; nearest.visible=false; state.carried++; collectSfx(); return; }
  if(controls.getObject().position.distanceTo(bankRing.position) < 18){
    if(state.carried>0){ state.score += Math.floor(state.carried*12*state.mult); state.carried=0; state.mult=Math.min(6, state.mult+0.8); tone(880,0.15,'square',0.24); }
    state.oxy=Math.min(100, state.oxy+0.65);
  }
  for(const a of artifacts){
    if(a.visible && a.position.distanceTo(p)<4){
      a.visible=false; completeSfx();
      state.score += (a.userData.kind==='chest'? 200 : 120);
      prompt.innerHTML = (a.userData.kind==='chest')
        ? `<h3>Treasure Chest!</h3><p>Trade tokens and ornaments from historic souqs.</p>`
        : `<h3>Artifact Found!</h3><p>The Falcon Compass guided navigators using stars and currents.</p>`;
      prompt.classList.remove('hidden'); setTimeout(()=> prompt.classList.add('hidden'), 3000);
      if(state.mode==='story' && state.chapter.goals.artifact==='compass' && a.userData.kind!=='chest'){ state.chapter.goals.artifactDone=true; }
    }
  }
}

function bankIfClose(){
  const d = controls.getObject().position.distanceTo(bankRing.position);
  if(d<18){ state.oxy=Math.min(100, state.oxy+0.65); } else { state.mult=Math.max(1, state.mult-0.002); }
}

function endChapterOrGame(){
  state.running=false; ambientStop(); controls.unlock();
  let msg = (state.mode==='story') ? "Chapter complete!":"Dive complete!";
  document.getElementById('finalScore').textContent = state.score;
  document.getElementById('overMsg').innerHTML = `${msg} Your score: <span id="finalScore">${state.score}</span>`;
  showPanel(over);
}

// -------------------- Movement & Simulation --------------------
const vel = new THREE.Vector3();
function step(dt){
  const speed = (keys['ShiftLeft']||keys['ShiftRight'])?28:16;
  vel.set(0,0,0);
  if(keys['KeyW']) vel.z -= 1;
  if(keys['KeyS']) vel.z += 1;
  if(keys['KeyA']) vel.x -= 1;
  if(keys['KeyD']) vel.x += 1;
  if(keys['Space']) vel.y += 1;
  if(keys['ControlLeft']||keys['ControlRight']) vel.y -= 1;
  vel.normalize().multiplyScalar(speed*dt);
  controls.moveRight(vel.x);
  controls.moveForward(vel.z);
  controls.getObject().position.y += vel.y;

  // world bounds
  controls.getObject().position.x = THREE.MathUtils.clamp(controls.getObject().position.x, -980,980);
  controls.getObject().position.z = THREE.MathUtils.clamp(controls.getObject().position.z, -980,980);
  controls.getObject().position.y = THREE.MathUtils.clamp(controls.getObject().position.y, -64, 26);

  // oxygen: drains only underwater
  const underwater = controls.getObject().position.y < 0;
  if (underwater) {
    state.oxy -= (0.012*(keys['ShiftLeft']||keys['ShiftRight']?1.8:1))*dt*60;
    maybeBubble(controls.getObject().position);
  } else {
    state.oxy = Math.min(100, state.oxy + 0.35);
  }
  state.oxy = Math.max(0, state.oxy);
}

function animate(){
  requestAnimationFrame(animate);
  let now=performance.now(); let dt=(animate._last? (now-animate._last):16)/1000; animate._last=now;

  // Cinematic intro (slow motion + auto glide into water)
  if(state.inIntro){
    dt *= 0.2; // slow-mo
    state.tIntro += dt;
    // gentle move toward shore & dip
    const pos = controls.getObject().position;
    pos.z += (-120 - pos.z) * 0.05 * dt * 60;
    pos.y += (2 - pos.y) * 0.03 * dt * 60;
    if(state.tIntro > 3.0){ state.inIntro=false; cinema.classList.add('hidden'); controls.lock(); state.afterIntro && state.afterIntro(); }
  }

  if(state.running && !state.paused){
    // waves
    const posAttr = water.geometry.attributes.position;
    for(let i=0;i<posAttr.count;i++){
      const x=posAttr.getX(i), z=posAttr.getZ(i);
      const y = Math.sin((x+now*0.05)*0.01)*0.4 + Math.cos((z+now*0.04)*0.01)*0.3;
      posAttr.setY(i, y);
    }
    posAttr.needsUpdate = true; water.geometry.computeVertexNormals();

    step(dt);
    bankIfClose();
    updateHUD();

    // open oysters near player and spin pearls
    const p=controls.getObject().position;
    for(const o of oysters){ const d=o.position.distanceTo(p); o.userData.open += ((d<6?1:0)-o.userData.open)*0.1; o.children[0].rotation.z = -o.userData.open*1.1; }
    for(const pr of pearls){ pr.rotation.y += dt*1.5; }

    // jellies
    for(const j of jellies){
      j.userData.phase += dt*0.7;
      j.position.y = -22 + Math.sin(j.userData.phase)*4;
      j.position.x += Math.sin(j.userData.phase*0.6)*0.12;
      j.position.z += Math.cos(j.userData.phase*0.5)*0.12;
      if(j.position.distanceTo(p)<2.8){ state.oxy=Math.max(0,state.oxy-18*dt*1.5); stingSfx(); }
    }

    // fish swim
    fishGroup.children.forEach(f=>{
      f.userData.a += dt * f.userData.speed;
      f.position.x += Math.cos(f.userData.a) * f.userData.speed * 10;
      f.position.z += Math.sin(f.userData.a*0.9) * f.userData.speed * 10;
      f.position.y = -18 + Math.sin(f.userData.a*2) * 3;
      if (f.position.length() > 1200) { f.position.set(rand(-900,900), -18, rand(-900,900)); }
      f.rotation.y = Math.atan2(f.userData.vx||1, f.userData.vz||1);
    });

    // textures motion
    caustics.material.map.offset.x += dt*0.02; caustics.material.map.offset.y += dt*0.04;
  }
  renderer.setPixelRatio( (state.hq? Math.min(devicePixelRatio, 2) : 1) );
  renderer.render(scene, camera);
}

// -------------------- Bubbles --------------------
function maybeBubble(pos){
  if (Math.random() < 0.2){
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), new THREE.MeshBasicMaterial({ color:0xcfeffc, transparent:true, opacity:0.6 }));
    b.position.copy(pos); bubbles.push(b); scene.add(b);
  }
  // rise & fade
  bubbles.forEach((b, i)=>{
    b.position.y += 0.15;
    b.material.opacity -= 0.008;
    if (b.material.opacity <= 0) { scene.remove(b); bubbles.splice(i,1); }
  });
}

// -------------------- Leaderboard --------------------
function leaders(){ try{ return JSON.parse(localStorage.getItem('hpq_leaders')||'[]'); } catch(e){ return []; } }
function setLeaders(list){ localStorage.setItem('hpq_leaders', JSON.stringify(list)); }
function populateLeaders(){ const list=leaders(); const ol=document.getElementById('leaders'); ol.innerHTML=''; list.forEach((e,i)=>{ const li=document.createElement('li'); li.textContent=`${i+1}. ${e.name} — ${e.score}`; ol.appendChild(li); }); }
function saveScore(){ const name=(document.getElementById('playerName').value||'Player').slice(0,24); const list=leaders(); list.push({ name, score: state.score, t: Date.now() }); list.sort((a,b)=>b.score-a.score); setLeaders(list.slice(0,10)); populateLeaders(); uiSfx(); }

// -------------------- Utils --------------------
function rand(a,b){ return a + Math.random()*(b-a); }
function noise2(x,y){ return (Math.sin(x*2.1+Math.sin(y*1.3))*0.5 + Math.sin(y*2.7+Math.sin(x*0.7))*0.5); }
function displacePlane(geom, fn){ geom.computeBoundingBox(); const pos=geom.attributes.position; for(let i=0;i<pos.count;i++){ const x=pos.getX(i), z=pos.getZ(i); pos.setY(i, fn(x,z)); } pos.needsUpdate=true; geom.computeVertexNormals(); }
function makeKelp(){ const g=new THREE.CapsuleGeometry(0.3,6,3,6); const m=new THREE.MeshLambertMaterial({ color:0x1e6f5c }); const b=new THREE.Mesh(g,m); b.scale.set(1, rand(1,2.5), 1); b.rotation.z = rand(-0.5,0.5); return b; }
function makePalm(){
  const grp=new THREE.Group();
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(0.4,0.6,10,8), new THREE.MeshPhongMaterial({ color:0x7a5533 })); trunk.position.y=8; grp.add(trunk);
  for(let i=0;i<6;i++){ const leaf=new THREE.Mesh(new THREE.PlaneGeometry(6,2), new THREE.MeshLambertMaterial({ color:0x1e6f5c, side:THREE.DoubleSide })); leaf.position.set(0,13,0); leaf.rotation.set(0, i*Math.PI/3, -Math.PI/6); grp.add(leaf); }
  return grp;
}
function makeJelly(){ const g=new THREE.Group(); const bell=new THREE.Mesh(new THREE.SphereGeometry(1.4,16,16), new THREE.MeshPhongMaterial({ color:0xbf80ff, emissive:0x442266, shininess:60 })); g.add(bell); const mat=new THREE.LineBasicMaterial({ color:0xd2a0ff }); for(let i=0;i<6;i++){ const geo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(rand(-0.6,0.6), -2.4-rand(0,1), rand(-0.6,0.6))]); g.add(new THREE.Line(geo,mat)); } return g; }
function makeFish(){ const g=new THREE.ConeGeometry(0.6, 1.8, 8); const m=new THREE.MeshLambertMaterial({ color: (Math.random()<0.5? 0xf4a261:0x2bc4ad) }); const f=new THREE.Mesh(g,m); f.rotation.x = Math.PI/2; f.position.set(rand(-900,900), -18, rand(-900,900)); f.userData.speed = rand(0.5,1.4); f.userData.a=Math.random()*6.28; return f; }
function genCaustics(w,h){ const data=new Uint8Array(w*h*4); let idx=0; for(let y=0;y<h;y++){ for(let x=0;x<w;x++){ const n=(Math.sin(x*0.2)+Math.sin(y*0.27)+Math.sin((x+y)*0.13))*0.33; const v=Math.max(0,Math.min(255,180+n*70)); data[idx++]=v; data[idx++]=v; data[idx++]=255; data[idx++]=255; } } return data; }
function toggleFS(){ if(!document.fullscreenElement) document.body.requestFullscreen(); else document.exitFullscreen(); }

// -------------------- Resize --------------------
addEventListener('resize', ()=>{ camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth,innerHeight); });

// -------------------- Startup --------------------
showPanel(menu);
populateLeaders();
