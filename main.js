import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { Water } from 'three/examples/jsm/objects/Water2.js';

// helpers
function qs(s){return document.querySelector(s)} function $$(s){return document.querySelectorAll(s)} function btn(s,fn){qs(s).addEventListener('click',fn)}

// UI refs
const hud=qs('#hud'),timeEl=qs('#time'),scoreEl=qs('#score'),multEl=qs('#mult'),carriedEl=qs('#carried'),oxyFill=qs('#o2fill'),menu=qs('#menu'),cinema=qs('#cinema'),quest=qs('#quest'),pausePanel=qs('#pause'),prompt=qs('#prompt'),over=qs('#over');

// simple audio
const AC=new (window.AudioContext||window.webkitAudioContext)();const master=AC.createGain();master.connect(AC.destination);master.gain.value=.6;
function tone(f=440,d=.12,type='sine',v=.3){const t=AC.currentTime,o=AC.createOscillator(),g=AC.createGain();o.type=type;o.frequency.value=f;g.gain.value=0;o.connect(g);g.connect(master);o.start();g.gain.linearRampToValueAtTime(v,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.stop(t+d)}
const collect=()=>{tone(900,.12,'sine',.4);tone(1350,.12,'sine',.25)};

// renderer/scene/camera
const renderer=new THREE.WebGLRenderer({canvas:document.getElementById('bg'),antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);
const scene=new THREE.Scene();scene.background=new THREE.Color(0x87c9f5);scene.fog=new THREE.FogExp2(0x8ed0f7,.0022);
const camera=new THREE.PerspectiveCamera(70,innerWidth/innerHeight,.1,4000);camera.position.set(0,6,60);
const controls=new PointerLockControls(camera,document.body);scene.add(controls.getObject());
document.addEventListener('mousedown',()=>{if(state.running&&!controls.isLocked)controls.lock()});
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});

// lights + sun
const hemi=new THREE.HemisphereLight(0xcde8ff,0x416d66,.95);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffeecc,1.0);sun.position.set(160,220,100);scene.add(sun);

// sky + clouds
const sky=new THREE.Mesh(new THREE.SphereGeometry(3000,32,32),new THREE.MeshBasicMaterial({color:0x87c9f5,side:THREE.BackSide}));scene.add(sky);
const clouds=makeClouds(16);scene.add(clouds);

// Water2 ocean
const waterNormals=new THREE.TextureLoader().load('https://threejs.org/examples/textures/waternormals.jpg',t=>{t.wrapS=t.wrapT=THREE.RepeatWrapping});
const water=new Water(new THREE.PlaneGeometry(4000,4000),{color:'#0a7fb0',scale:6,flowDirection:new THREE.Vector2(1,1),textureWidth:1024,textureHeight:1024,normalMap0:waterNormals,normalMap1:waterNormals});
water.rotation.x=-Math.PI/2;water.position.y=0.15;scene.add(water);

// seabed + caustics
const causticsTex=new THREE.DataTexture(genCaustics(256,256),256,256,THREE.RGBAFormat);causticsTex.needsUpdate=true;causticsTex.wrapS=causticsTex.wrapT=THREE.RepeatWrapping;
const caust=new THREE.Mesh(new THREE.PlaneGeometry(4000,4000),new THREE.MeshBasicMaterial({map:causticsTex,color:0xe6c88f,transparent:true,opacity:.08}));caust.rotation.x=-Math.PI/2;caust.position.y=-2;scene.add(caust);
const seabed=new THREE.Mesh(new THREE.PlaneGeometry(4000,4000,220,220),new THREE.MeshPhongMaterial({color:0x7c7a5e,flatShading:true}));seabed.rotation.x=-Math.PI/2;displacePlane(seabed.geometry,(x,z)=>noise2(x*.003,z*.003)*22-36);scene.add(seabed);

// island + palms
const ISLAND_Y=3.2;const island=new THREE.Group();scene.add(island);
const islandMesh=new THREE.Mesh(new THREE.CircleGeometry(120,64),new THREE.MeshPhongMaterial({color:0xd6c29a}));islandMesh.rotation.x=-Math.PI/2;islandMesh.position.y=ISLAND_Y;island.add(islandMesh);
for(let i=0;i<18;i++){const p=makePalm();const r=75+Math.random()*35,a=Math.random()*Math.PI*2;p.position.set(Math.cos(a)*r,ISLAND_Y,Math.sin(a)*r);island.add(p)}
const foamRing=new THREE.Mesh(new THREE.RingGeometry(120,126,180),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.24,side:THREE.DoubleSide}));foamRing.rotation.x=-Math.PI/2;foamRing.position.y=.16;scene.add(foamRing);

// dhow (bank)
const dhow=new THREE.Group();const hull=new THREE.Mesh(new THREE.BoxGeometry(40,8,14),new THREE.MeshPhongMaterial({color:0x7a5533}));hull.position.y=2;hull.rotation.y=.3;dhow.add(hull);
const mast=new THREE.Mesh(new THREE.CylinderGeometry(.45,.45,26,10),new THREE.MeshPhongMaterial({color:0x7a5533}));mast.position.set(0,13,0);dhow.add(mast);
const sail=new THREE.Mesh(new THREE.PlaneGeometry(28,16,20,1),new THREE.MeshPhongMaterial({color:0xffffff,side:THREE.DoubleSide}));sail.position.set(11,10,0);sail.rotation.set(0,Math.PI/2.4,0);dhow.add(sail);
dhow.position.set(-30,1,-200);scene.add(dhow);
const bankRing=new THREE.Mesh(new THREE.TorusGeometry(22,.7,16,64),new THREE.MeshBasicMaterial({color:0xffe28a}));bankRing.rotation.x=Math.PI/2;bankRing.position.set(-30,-6,-200);scene.add(bankRing);

// fauna arrays
let oysters=[],pearls=[],jellies=[],artifacts=[],bubbles=[],stars=null;

// state + chapters
const state={running:false,paused:false,mode:null,chapterIndex:0,chapter:null,startTime:0,timeLimit:300,score:0,carried:0,mult:1,oxy:100,hq:true,sens:1};
const CHAPTERS=[
  {name:'Chapter 1 — Shallow Waters', quest:'Collect 5 pearls and bank them', time:240, setup:()=>{ dayLighting(); spawnOysters(30); spawnJellies(8);} },
  {name:'Chapter 2 — The Falcon’s Compass', quest:'Find the Falcon Compass and bank 1 pearl', time:260, setup:()=>{ sunsetLighting(); spawnOysters(25); spawnJellies(12); addArtifact('compass'); } },
  {name:'Chapter 3 — Moonlight Harvest', quest:'Night dive: collect 10 pearls and avoid jellies', time:240, setup:()=>{ nightLighting(); addStars(); spawnOysters(36); spawnJellies(16);} },
];

// buttons
btn('#btnAdventure',startAdventure);btn('#btnStory',startStory);
btn('#continueBtn',()=>endIntro(true));btn('#resumeBtn',resume);btn('#restartBtn',()=>{state.mode==='story'?beginChapter(state.chapterIndex,true):startAdventure()});btn('#menuBtn',()=>show(menu));
$$('.back').forEach(b=>b.addEventListener('click',()=>show(menu)));btn('#again',startAdventure);btn('#muteBtn',()=>master.gain.value = master.gain.value>0?0:.6);btn('#hqBtn',()=>state.hq=!state.hq);
qs('#sens').addEventListener('input',e=>state.sens=parseFloat(e.target.value));

function show(p){[menu,cinema,pausePanel,qs('#how'),qs('#settings'),qs('#board'),qs('#credits'),over].forEach(x=>x.classList.add('hidden'));p.classList.remove('hidden');hud.classList.add('hidden');quest.classList.add('hidden');controls.unlock();state.running=false}
function hideAll(){[menu,cinema,pausePanel,qs('#how'),qs('#settings'),qs('#board'),qs('#credits'),over].forEach(x=>x.classList.add('hidden'));hud.classList.remove('hidden');quest.classList.remove('hidden')}

// modes
function startAdventure(){resetWorld();state.mode='adventure';state.timeLimit=300;state.score=0;state.carried=0;state.mult=1;state.oxy=100;playIntroThen(()=>{spawnOysters(60);spawnJellies(18);setQuest('Collect as many pearls as you can and bank them!')})}
function startStory(){resetWorld();state.mode='story';state.chapterIndex=0;beginChapter(0,true)}
function beginChapter(i,fresh=false){resetWorld();state.chapterIndex=i;const ch=CHAPTERS[i];state.chapter=ch;state.timeLimit=ch.time;state.score=fresh?0:state.score;ch.setup();playIntroThen(()=>{prompt.innerHTML=`<h3>${ch.name}</h3><p>${ch.quest}</p>`;prompt.classList.remove('hidden');setTimeout(()=>prompt.classList.add('hidden'),2600);setQuest(ch.quest)})}
function endChapter(){state.running=false;controls.unlock();const last=(state.mode==='story'&&state.chapterIndex===CHAPTERS.length-1);qs('#overTitle').textContent=last?'Season Complete — You Win!':'Mission Complete';qs('#finalScore').textContent=state.score;show(over);if(state.mode==='story'&&!last)state.chapterIndex++}

function playIntroThen(after){controls.getObject().position.set(0,6,60);camera.lookAt(-30,6,-200);hideAll();cinema.classList.remove('hidden');state.afterIntro=after}
function endIntro(){cinema.classList.add('hidden');state.startTime=performance.now();state.running=true;if(typeof state.afterIntro==='function')state.afterIntro();controls.lock()}
function resume(){pausePanel.classList.add('hidden');controls.lock();state.paused=false}

// world helpers
function resetWorld(){[...oysters,...pearls,...jellies,...artifacts,...bubbles].forEach(m=>scene.remove(m));oysters=[];pearls=[];jellies=[];artifacts=[];bubbles=[];if(stars){scene.remove(stars);stars=null}dayLighting();controls.getObject().position.set(0,6,60);[prompt,cinema].forEach(x=>x.classList.add('hidden'));quest.classList.add('hidden')}
function setQuest(txt){quest.textContent=txt;quest.classList.remove('hidden')}
function dayLighting(){scene.background.set(0x87c9f5);scene.fog.color.set(0x8ed0f7);scene.fog.density=.0022;hemi.intensity=.95;sun.color.set(0xffeecc);sun.intensity=1.0}
function sunsetLighting(){scene.background.set(0xffc387);scene.fog.color.set(0xff9866);scene.fog.density=.003;hemi.intensity=.8;sun.color.set(0xffc387);sun.intensity=.8}
function nightLighting(){scene.background.set(0x03161c);scene.fog.color.set(0x0b3c4a);scene.fog.density=.010;hemi.intensity=.5;sun.intensity=.25}
function addStars(){const starGeo=new THREE.BufferGeometry();const N=2000;const pos=new Float32Array(N*3);for(let i=0;i<N;i++){const r=2200+Math.random()*400,th=Math.random()*Math.PI*2,ph=Math.random()*Math.PI;pos[i*3]=Math.sin(ph)*Math.cos(th)*r;pos[i*3+1]=Math.cos(ph)*r;pos[i*3+2]=Math.sin(ph)*Math.sin(th)*r}starGeo.setAttribute('position',new THREE.BufferAttribute(pos,3));const starMat=new THREE.PointsMaterial({color:0xffffff,size:2,sizeAttenuation:true});stars=new THREE.Points(starGeo,starMat);scene.add(stars)}

function spawnOysters(n){const oG=new THREE.SphereGeometry(2,16,16),oM1=new THREE.MeshPhongMaterial({color:0xa28f72,flatShading:true}),oM2=new THREE.MeshPhongMaterial({color:0xc1b496,flatShading:true}),pM=new THREE.MeshPhongMaterial({color:0xffffff,emissive:0xaa8844,shininess:120,specular:0xffffff});for(let i=0;i<n;i++){const top=new THREE.Mesh(oG,oM2),bot=new THREE.Mesh(oG,oM1);top.scale.set(1.2,.4,1.2);bot.scale.set(1.2,.4,1.2);bot.rotation.z=Math.PI;const o=new THREE.Group();o.add(top);o.add(bot);const x=rand(-1200,1200),z=rand(-1200,1200),y=-30+noise2(x*.004,z*.004)*14;o.position.set(x,y,z);o.userData.open=0;scene.add(o);oysters.push(o);const p=new THREE.Mesh(new THREE.SphereGeometry(.8,16,16),pM.clone());p.position.set(x,y+.8,z);p.userData.active=true;scene.add(p);pearls.push(p)}}
function spawnJellies(n){for(let i=0;i<n;i++){const j=makeJelly();j.position.set(rand(-1200,1200),-20,rand(-1200,1200));j.userData.phase=Math.random()*Math.PI*2;jellies.push(j);scene.add(j)}}
function addArtifact(kind){if(kind==='compass'){const g=new THREE.TorusKnotGeometry(1.2,.35,80,12);const m=new THREE.MeshPhongMaterial({color:0xffdd88,emissive:0x553300,shininess:80});const mesh=new THREE.Mesh(g,m);mesh.position.set(rand(-900,900),-24,rand(-900,900));mesh.userData.kind='compass';scene.add(mesh);artifacts.push(mesh)}const chest=new THREE.Mesh(new THREE.BoxGeometry(3,2,2),new THREE.MeshPhongMaterial({color:0x8b5a2b}));chest.position.set(rand(-900,900),-28,rand(-900,900));chest.userData.kind='chest';scene.add(chest);artifacts.push(chest)}

// input/movement
const keys={};addEventListener('keydown',e=>{keys[e.code]=TrueFix=false})

addEventListener('keydown',e=>{
  keys[e.code]=true;
  if(e.code==='KeyP'){ state.paused=!state.paused; pausePanel.classList.toggle('hidden',!state.paused); if(state.paused) controls.unlock(); else controls.lock(); }
  if(e.code==='KeyE'){ interact(); }
});
addEventListener('keyup',e=> keys[e.code]=false);

const vel=new THREE.Vector3();
function step(dt){
  const speed=(keys['ShiftLeft']||keys['ShiftRight'])?28:16;
  vel.set(0,0,0);
  if(keys['KeyW']) vel.z+=1;
  if(keys['KeyS']) vel.z-=1;
  if(keys['KeyA']) vel.x-=1;
  if(keys['KeyD']) vel.x+=1;
  if(keys['Space']) vel.y+=1;
  if(keys['ControlLeft']||keys['ControlRight']) vel.y-=1;
  vel.normalize().multiplyScalar(speed*dt);
  controls.moveRight(vel.x);
  controls.moveForward(vel.z);
  controls.getObject().position.y+=vel.y;
  controls.getObject().position.y=THREE.MathUtils.clamp(controls.getObject().position.y,-72,40);

  const uw=controls.getObject().position.y<0;
  if(uw){ state.oxy=Math.max(0,state.oxy-0.012*dt*60); scene.fog.density=THREE.MathUtils.lerp(scene.fog.density,.010,.05); }
  else { state.oxy=Math.min(100,state.oxy+0.35); scene.fog.density=THREE.MathUtils.lerp(scene.fog.density,.0022,.05); }
}

function interact(){
  if(!state.running||state.paused) return;
  const p=controls.getObject().position;
  let nearest=null; let dist=4;
  for(const pr of pearls){
    if(!pr.userData.active) continue;
    const d=pr.position.distanceTo(p);
    if(d<dist){ dist=d; nearest=pr; }
  }
  if(nearest){
    nearest.userData.active=false; nearest.visible=false; state.carried++; collect(); return;
  }
  if(p.distanceTo(bankRing.position)<22){
    if(state.carried>0){ state.score+=Math.floor(state.carried*12*state.mult); state.carried=0; state.mult=Math.min(6,state.mult+.8); }
    state.oxy=Math.min(100,state.oxy+.65);
  }
  for(const a of artifacts){
    if(a.visible && a.position.distanceTo(p)<4){
      a.visible=false; tone(784,.3,'triangle',.3);
      state.score += (a.userData.kind==='chest'?200:120);
      prompt.innerHTML = (a.userData.kind==='chest')
        ? '<h3>Treasure Chest!</h3><p>Trade tokens and ornaments from historic souqs.</p>'
        : '<h3>Artifact Found!</h3><p>The Falcon Compass guided navigators using stars and currents.</p>';
      prompt.classList.remove('hidden');
      setTimeout(()=>prompt.classList.add('hidden'),3000);
    }
  }
}

// HUD
function setOxy(v){
  v=Math.max(0,Math.min(100,v));
  oxyFill.style.width=v+'%';
  oxyFill.style.background = v>50 ? 'linear-gradient(90deg,#60eac2,#1aa5a1)'
    : (v>25 ? 'linear-gradient(90deg,#ffd166,#f3a712)' : 'linear-gradient(90deg,#ef476f,#e63946)');
}
function updateHUD(){
  hud.classList.remove('hidden');
  const rem=Math.max(0,state.timeLimit-Math.floor((performance.now()-state.startTime)/1000));
  timeEl.textContent=fmt(rem);
  scoreEl.textContent=state.score; multEl.textContent=state.mult.toFixed(1); carriedEl.textContent=state.carried;
  setOxy(state.oxy);
  if(rem<=0) endChapter();
}
function fmt(t){ const m=String(Math.floor(t/60)).padStart(2,'0'); const s=String(t%60).padStart(2,'0'); return `${m}:${s}`; }

// loop
function animate(){
  requestAnimationFrame(animate);
  const now=performance.now(); const dt=(animate._t?(now-animate._t):16)/1000; animate._t=now;
  if(state.running&&!state.paused){
    step(dt); updateHUD();
    clouds.children.forEach((c,i)=>{ c.position.x += Math.sin(now*.0001+i)*.02; });
    foamRing.material.opacity=.24+Math.sin(now*.002)*.05;
    const p=controls.getObject().position;
    for(const o of oysters){ const d=o.position.distanceTo(p); o.userData.open+=((d<6?1:0)-o.userData.open)*0.1; o.children[0].rotation.z=-o.userData.open*1.1; }
    for(const pr of pearls){ pr.rotation.y+=dt*1.5; }
    for(const j of jellies){
      j.userData.phase+=dt*.7;
      j.position.y=-22+Math.sin(j.userData.phase)*4;
      j.position.x+=Math.sin(j.userData.phase*.6)*.12;
      j.position.z+=Math.cos(j.userData.phase*.5)*.12;
      if(j.position.distanceTo(p)<2.8){ state.oxy=Math.max(0,state.oxy-18*dt*1.5); }
    }
    caust.material.map.offset.x += dt*0.02; caust.material.map.offset.y += dt*0.04;
  }
  renderer.setPixelRatio(state.hq?Math.min(devicePixelRatio,2):1);
  renderer.render(scene,camera);
}
animate();

// utils + tiny geometry
function rand(a,b){return a+Math.random()*(b-a)}
function noise2(x,y){return(Math.sin(x*2.1+Math.sin(y*1.3))*.5+Math.sin(y*2.7+Math.sin(x*.7))*.5)}
function displacePlane(g,fn){const p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i);p.setY(i,fn(x,z))}p.needsUpdate=true;g.computeVertexNormals()}
function makePalm(){const g=new THREE.Group();const h=10;const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.4,.6,h,8),new THREE.MeshPhongMaterial({color:0x7a5533}));trunk.position.y=h/2;g.add(trunk);for(let i=0;i<6;i++){const leaf=new THREE.Mesh(new THREE.PlaneGeometry(6,2),new THREE.MeshLambertMaterial({color:0x1e6f5c,side:THREE.DoubleSide}));leaf.position.set(0,h+3,0);leaf.rotation.set(0,i*Math.PI/3,-Math.PI/6);g.add(leaf)}return g}
function makeJelly(){const g=new THREE.Group();const bell=new THREE.Mesh(new THREE.SphereGeometry(1.4,16,16),new THREE.MeshPhongMaterial({color:0xbf80ff,emissive:0x442266,shininess:60}));g.add(bell);const mat=new THREE.LineBasicMaterial({color:0xd2a0ff});for(let i=0;i<6;i++){const geo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0),new THREE.Vector3(rand(-.6,.6),-2.4-rand(0,1),rand(-.6,.6))]);g.add(new THREE.Line(geo,mat))}return g}
function genCaustics(w,h){const d=new Uint8Array(w*h*4);let i=0;for(let y=0;y<h;y++){for(let x=0;x<w;x++){const n=(Math.sin(x*.2)+Math.sin(y*.27)+Math.sin((x+y)*.13))*.33;const v=Math.max(0,Math.min(255,180+n*70));d[i++]=v;d[i++]=v;d[i++]=255;d[i++]=255}}return d}
function cloudTexture(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');const grd=ctx.createLinearGradient(0,0,0,h);grd.addColorStop(0,'rgba(255,255,255,.9)');grd.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=grd;ctx.fillRect(0,0,w,h);for(let i=0;i<20;i++){const r=20+Math.random()*40;const x=Math.random()*w;const y=Math.random()*(h*.6);const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'rgba(255,255,255,.9)');g.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill()}return new THREE.CanvasTexture(c)}
function makeClouds(n=16){const grp=new THREE.Group();for(let i=0;i<n;i++){const tex=cloudTexture(256,128);const mat=new THREE.SpriteMaterial({map:tex,depthWrite:false,transparent:true,opacity:.65});const spr=new THREE.Sprite(mat);spr.scale.set(300+Math.random()*200,150+Math.random()*120,1);spr.position.set((Math.random()-.5)*2500,280+Math.random()*80,(Math.random()-.5)*2500);grp.add(spr)}return grp}
