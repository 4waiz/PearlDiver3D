// Pearl Diver 3D — UAE Heritage
// Runs in browser (Three.js via CDN).

import * as THREE from 'https://unpkg.com/three@0.161.0/build/three.module.js';
import { PointerLockControls } from 'https://unpkg.com/three@0.161.0/examples/jsm/controls/PointerLockControls.js';

// -------------------- Config --------------------
const GAME_LENGTH_SECONDS = 300; // 5 minutes
const WORLD_SIZE = 900;
const SEA_LEVEL = 0;
const OYSTER_COUNT = 45;
const JELLY_COUNT = 18;
const BANK_RADIUS = 18;
const OXY_MAX = 100;
const OXY_DRAIN = 0.011;
const OXY_STING = 18;

// -------------------- UI --------------------
const elTime = document.getElementById('time');
const elOxy  = document.getElementById('oxygen');
const elScore= document.getElementById('score');
const elMult = document.getElementById('mult');
const startScreen = document.getElementById('startScreen');
const pauseScreen = document.getElementById('pauseScreen');
const gameOver = document.getElementById('gameOver');
const finalScore = document.getElementById('finalScore');
const leadersEl = document.getElementById('leaders');
const startBtn = document.getElementById('startBtn');
const saveBtn = document.getElementById('saveBtn');
const restartBtn = document.getElementById('restartBtn');
const nameInput = document.getElementById('playerName');

// -------------------- Audio (WebAudio) --------------------
const actx = new (window.AudioContext || window.webkitAudioContext)();
let master = actx.createGain(); master.connect(actx.destination); master.gain.value = 0.6;
let muted = false;
function tone(freq=440, dur=0.15, type='sine', vol=0.4) {
  const t0 = actx.currentTime;
  const o = actx.createOscillator(); o.type=type; o.frequency.value = freq;
  const g = actx.createGain(); g.gain.value = 0;
  o.connect(g); g.connect(master);
  o.start();
  g.gain.linearRampToValueAtTime(vol, t0+0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0+dur);
  o.stop(t0+dur);
}
function collectSfx(){ tone(880,0.12,'sine',0.5); tone(1320,0.12,'sine',0.25); }
function stingSfx(){ tone(220,0.25,'triangle',0.7); }
function bankSfx(){ tone(660,0.2,'square',0.25); tone(990,0.2,'square',0.2); }
function ambientPad(){
  const o=actx.createOscillator(); o.type='sine'; o.frequency.value=110;
  const g=actx.createGain(); g.gain.value=0.03;
  o.connect(g); g.connect(master); o.start();
  return { stop: ()=>o.stop() };
}
let ambient;

// -------------------- Scene --------------------
const canvas = document.getElementById('bg');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = false;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0a2b4a, 0.011);
scene.background = new THREE.Color(0x06203a);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(0, -6, 50);

const controls = new PointerLockControls(camera, document.body);
scene.add(controls.getObject());

// Lights (soft blue ambient + shafts)
const hemi = new THREE.HemisphereLight(0x87c8ff, 0x0a2b4a, 0.9);
scene.add(hemi);
const dir = new THREE.DirectionalLight(0xffffff, 0.6);
dir.position.set(120, 200, 80); scene.add(dir);

// God ray-ish planes
const rayMat = new THREE.MeshBasicMaterial({ color: 0x99c9ff, transparent:true, opacity:0.05, depthWrite:false });
for (let i=0;i<5;i++){
  const ray = new THREE.Mesh(new THREE.PlaneGeometry(800, 400), rayMat.clone());
  ray.position.set(300-i*60, 180, -100-i*40);
  ray.rotation.set(-1.2, 0.2*i, -0.2);
  scene.add(ray);
}

// Water caustics (scrolling transparent plane)
const causticsTex = new THREE.DataTexture(generateCausticsTexture(256,256),256,256,THREE.RGBAFormat);
causticsTex.needsUpdate = true; causticsTex.wrapS=causticsTex.wrapT=THREE.RepeatWrapping;
const caustics = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), new THREE.MeshBasicMaterial({
  map: causticsTex, color:0x88aaff, transparent:true, opacity:0.06
}));
caustics.rotation.x = -Math.PI/2;
caustics.position.y = -2;
scene.add(caustics);

// Seabed (displaced plane)
const seabed = new THREE.Mesh(
  new THREE.PlaneGeometry(1200,1200, 150,150),
  new THREE.MeshPhongMaterial({ color: 0x7c7a5e, flatShading:true })
);
seabed.rotation.x = -Math.PI/2;
displacePlane(seabed.geometry, (x,z)=>0.0 + noise2(x*0.005, z*0.005)*12 - 30);
scene.add(seabed);

// Kelp forest
const kelpGroup = new THREE.Group(); scene.add(kelpGroup);
for (let i=0;i<130;i++){
  const k = makeKelp();
  k.position.set(randRange(-WORLD_SIZE/2, WORLD_SIZE/2), -30, randRange(-WORLD_SIZE/2, WORLD_SIZE/2));
  kelpGroup.add(k);
}

// Dhow (simple stylized boat near surface)
const dhow = new THREE.Group();
const hull = new THREE.Mesh(new THREE.BoxGeometry(30,6,10), new THREE.MeshPhongMaterial({ color:0x6e4b3a }));
hull.position.y = SEA_LEVEL + 2; hull.rotation.y = 0.3; dhow.add(hull);
const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.3,18,8), new THREE.MeshPhongMaterial({ color:0x6e4b3a }));
mast.position.set(0, SEA_LEVEL+11, 0); dhow.add(mast);
const sail = new THREE.Mesh(new THREE.PlaneGeometry(22,12), new THREE.MeshPhongMaterial({ color:0xffffff, side:THREE.DoubleSide }));
sail.position.set(8, SEA_LEVEL+8, 0); sail.rotation.set(0, Math.PI/2.4, 0);
dhow.add(sail);
dhow.position.set(0, 0, 0);
scene.add(dhow);

// Bank zone gizmo
const bankRing = new THREE.Mesh(new THREE.TorusGeometry(BANK_RADIUS, 0.5, 16, 50), new THREE.MeshBasicMaterial({ color:0xffe28a }));
bankRing.rotation.x = Math.PI/2;
bankRing.position.copy(dhow.position); bankRing.position.y = -6;
scene.add(bankRing);

// Oysters & Pearls
const oysters = [];
const pearls = [];
const oysterGeo = new THREE.SphereGeometry(2, 16, 16);
const oysterMat1 = new THREE.MeshPhongMaterial({ color:0xa28f72, flatShading:true });
const oysterMat2 = new THREE.MeshPhongMaterial({ color:0xc1b496, flatShading:true });
const pearlMat = new THREE.MeshPhongMaterial({ color:0xffffff, emissive:0x6666aa, shininess:120, specular:0xffffff });

for (let i=0;i<OYSTER_COUNT;i++){
  const g = oysterGeo.clone();
  const top = new THREE.Mesh(g, oysterMat2);
  const bottom = new THREE.Mesh(g, oysterMat1);
  top.scale.set(1.2,0.4,1.2);
  bottom.scale.set(1.2,0.4,1.2); bottom.rotation.z = Math.PI;
  const o = new THREE.Group();
  o.add(top); o.add(bottom);
  const x = randRange(-WORLD_SIZE/2, WORLD_SIZE/2);
  const z = randRange(-WORLD_SIZE/2, WORLD_SIZE/2);
  const y = -30 + noise2(x*0.006, z*0.006)*8;
  o.position.set(x, y, z);
  o.userData.open = 0;
  scene.add(o);
  oysters.push(o);

  const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.8, 16, 16), pearlMat.clone());
  pearl.position.set(x, y+0.8, z);
  pearl.userData.active = true;
  scene.add(pearl);
  pearls.push(pearl);
}

// Jellyfish
const jellies = [];
for (let i=0;i<JELLY_COUNT;i++){
  const j = makeJelly();
  j.position.set(randRange(-WORLD_SIZE/2, WORLD_SIZE/2), -18, randRange(-WORLD_SIZE/2, WORLD_SIZE/2));
  j.userData.phase = Math.random()*Math.PI*2;
  jellies.push(j); scene.add(j);
}

// -------------------- Game State --------------------
let running = false;
let paused = false;
let startTime = 0;
let score = 0;
let carried = 0;
let mult = 1;
let oxy = OXY_MAX;

const keys = {};
window.addEventListener('keydown', (e)=>{
  keys[e.code]=true;
  if (e.code==='KeyM'){ muted = !muted; master.gain.value = muted ? 0 : 0.6; }
  if (e.code==='KeyP'){ togglePause(); }
  if (e.code==='KeyF'){ toggleFullscreen(); }
  if (e.code==='KeyE'){ tryCollect(); }
});
window.addEventListener('keyup', (e)=> keys[e.code]=false);

startBtn.addEventListener('click', begin);
saveBtn.addEventListener('click', saveScore);
restartBtn.addEventListener('click', ()=>{ location.reload(); });

function begin(){
  startScreen.classList.add('hidden');
  controls.lock();
  running = true; paused = false;
  startTime = performance.now();
  score = 0; carried = 0; mult = 1; oxy = OXY_MAX;
  ambient = ambientPad();
}

function togglePause(){
  if (!running) return;
  paused = !paused;
  pauseScreen.classList.toggle('hidden', !paused);
  if (paused) controls.unlock(); else controls.lock();
}

function endGame(){
  running=false; paused=false; controls.unlock();
  if (ambient) ambient.stop();
  finalScore.textContent = score;
  populateLeaders();
  gameOver.classList.remove('hidden');
}

function tryCollect(){
  if (!running || paused) return;
  // find nearest active pearl in small radius
  let nearest=null, dist=4;
  const p = controls.getObject().position;
  for (const pr of pearls){
    if (!pr.userData.active) continue;
    const d = pr.position.distanceTo(p);
    if (d < dist){ dist = d; nearest = pr; }
  }
  if (nearest){
    nearest.userData.active = false; nearest.visible=false;
    carried++;
    collectSfx();
  }
}

function bankIfClose(){
  const p = controls.getObject().position;
  const d = p.distanceTo(bankRing.position);
  if (d < BANK_RADIUS){
    if (carried>0){
      score += Math.floor(carried*12*mult);
      carried = 0; mult = Math.min(6, mult+0.8);
      bankSfx();
    }
    oxy = Math.min(OXY_MAX, oxy + 0.35); // slow refill near dhow
  } else {
    mult = Math.max(1, mult - 0.002);
  }
}

function updateUI(){
  const rem = Math.max(0, GAME_LENGTH_SECONDS - Math.floor((performance.now()-startTime)/1000));
  const m = String(Math.floor(rem/60)).padStart(2,'0');
  const s = String(rem%60).padStart(2,'0');
  elTime.textContent = `${m}:${s}`;
  elOxy.textContent = `${Math.round(oxy)}%`;
  elScore.textContent = score;
  elMult.textContent = mult.toFixed(1);
  if (rem<=0) endGame();
}

// -------------------- Movement --------------------
const velocity = new THREE.Vector3();
const dirVec = new THREE.Vector3();
const up = new THREE.Vector3(0,1,0);

function stepMovement(dt){
  const speed = keys['ShiftLeft']||keys['ShiftRight'] ? 28 : 16;
  velocity.set(0,0,0);
  if (keys['KeyW']) velocity.z -= 1;
  if (keys['KeyS']) velocity.z += 1;
  if (keys['KeyA']) velocity.x -= 1;
  if (keys['KeyD']) velocity.x += 1;
  if (keys['Space']) velocity.y += 1;
  if (keys['ControlLeft']||keys['ControlRight']) velocity.y -= 1;
  velocity.normalize().multiplyScalar(speed*dt);

  // move in camera space (forward/right)
  controls.moveRight(velocity.x);
  controls.moveForward(velocity.z);
  controls.getObject().position.y += velocity.y;

  // clamp to world bounds and depth
  controls.getObject().position.x = THREE.MathUtils.clamp(controls.getObject().position.x, -WORLD_SIZE/2, WORLD_SIZE/2);
  controls.getObject().position.z = THREE.MathUtils.clamp(controls.getObject().position.z, -WORLD_SIZE/2, WORLD_SIZE/2);
  controls.getObject().position.y = THREE.MathUtils.clamp(controls.getObject().position.y, -60, 26);

  // oxygen drain
  oxy -= (OXY_DRAIN * (keys['ShiftLeft']||keys['ShiftRight']?1.8:1)) * dt * 60;
  oxy = Math.max(0, oxy);
}

// -------------------- Animate Scene --------------------
let last = performance.now();
function animate(){
  requestAnimationFrame(animate);
  const now = performance.now();
  const dt = (now - last)/1000; last = now;

  if (running && !paused){
    stepMovement(dt);
    bankIfClose();
    updateUI();

    // open oysters near player
    const p = controls.getObject().position;
    for (const o of oysters){
      const d = o.position.distanceTo(p);
      o.userData.open += ((d<6?1:0)-o.userData.open)*0.1;
      o.children[0].rotation.z = -o.userData.open*1.1; // top shell
      // pearls float a bit
    }
    for (const pr of pearls){
      pr.rotation.y += dt*1.5;
    }
    // jellies
    for (const j of jellies){
      j.userData.phase += dt*0.7;
      j.position.y = -22 + Math.sin(j.userData.phase)*4;
      j.position.x += Math.sin(j.userData.phase*0.6)*0.12;
      j.position.z += Math.cos(j.userData.phase*0.5)*0.12;
      // collision
      if (running && prDist(j.position, p) < 2.8){
        oxy = Math.max(0, oxy - OXY_STING * dt * 1.5);
        stingSfx();
      }
    }
    // caustics scroll
    caustics.material.map.offset.x += dt*0.02;
    caustics.material.map.offset.y += dt*0.04;

    if (oxy <= 0){
      // drain time faster when out of oxygen (handled in updateUI by timer only)
    }
  }
  renderer.render(scene, camera);
}
animate();

// -------------------- Helpers --------------------
function prDist(a,b){ return Math.sqrt(a.distanceToSquared(b)); }
function randRange(a,b){ return a + Math.random()*(b-a); }

// Cheap 2D noise using sines
function noise2(x, y){
  return (Math.sin(x*2.1 + Math.sin(y*1.3))*0.5 + Math.sin(y*2.7 + Math.sin(x*0.7))*0.5);
}

// Displace plane vertices with a fn(x,z)->y
function displacePlane(geom, fn){
  geom.computeBoundingBox();
  const pos = geom.attributes.position;
  for (let i=0;i<pos.count;i++){
    const x = pos.getX(i), z = pos.getZ(i);
    pos.setY(i, fn(x,z));
  }
  pos.needsUpdate = true;
  geom.computeVertexNormals();
}

function makeKelp(){
  const g = new THREE.CapsuleGeometry(0.3, 6, 3, 6);
  const m = new THREE.MeshLambertMaterial({ color: 0x2fa67a });
  const blade = new THREE.Mesh(g, m);
  blade.scale.set(1, randRange(1,2.5), 1);
  blade.rotation.z = randRange(-0.5,0.5);
  return blade;
}

function makeJelly(){
  const group = new THREE.Group();
  const bell = new THREE.Mesh(new THREE.SphereGeometry(1.4, 16, 16), new THREE.MeshPhongMaterial({ color:0xbf80ff, emissive:0x442266, shininess:60 }));
  group.add(bell);
  const tentMat = new THREE.LineBasicMaterial({ color:0xd2a0ff });
  for (let i=0;i<6;i++){
    const geo = new THREE.BufferGeometry().setFromPoints([ new THREE.Vector3(0,0,0), new THREE.Vector3(randRange(-0.6,0.6), -2.4-randRange(0,1), randRange(-0.6,0.6)) ]);
    const line = new THREE.Line(geo, tentMat);
    group.add(line);
  }
  return group;
}

function generateCausticsTexture(w,h){
  const data = new Uint8Array(w*h*4);
  let idx=0;
  for (let y=0;y<h;y++){
    for (let x=0;x<w;x++){
      const n = (Math.sin(x*0.2)+Math.sin(y*0.27)+Math.sin((x+y)*0.13))*0.33;
      const v = Math.max(0, Math.min(255, 180 + n*70));
      data[idx++]=v; data[idx++]=v; data[idx++]=255; data[idx++]=255;
    }
  }
  return data;
}

// -------------------- Leaderboard --------------------
function loadLeaders(){
  try { return JSON.parse(localStorage.getItem('pearldiver_leaders')||'[]'); }
  catch(e){ return []; }
}
function saveLeaders(list){ localStorage.setItem('pearldiver_leaders', JSON.stringify(list)); }
function populateLeaders(){
  const list = loadLeaders();
  leadersEl.innerHTML = '';
  list.slice(0,10).forEach((e,i)=>{
    const li = document.createElement('li');
    li.textContent = `${i+1}. ${e.name} — ${e.score}`;
    leadersEl.appendChild(li);
  });
}
function saveScore(){
  const name = (nameInput.value||'Player').slice(0,24);
  const list = loadLeaders();
  list.push({ name, score, t: Date.now() });
  list.sort((a,b)=>b.score-a.score);
  saveLeaders(list.slice(0,10));
  populateLeaders();
}

// -------------------- Resize --------------------
window.addEventListener('resize', ()=>{
  camera.aspect = window.innerWidth/window.innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Pointer lock UX
controls.addEventListener('lock', ()=>{ document.body.style.cursor='none'; });
controls.addEventListener('unlock', ()=>{ document.body.style.cursor='auto'; });

// Start UI
populateLeaders();
