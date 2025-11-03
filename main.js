import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { Water } from 'three/examples/jsm/objects/Water2.js';

function qs(s){return document.querySelector(s)} function btn(s,fn){qs(s).addEventListener('click',fn)}
const hud=qs('#hud'),timeEl=qs('#time'),scoreEl=qs('#score'),multEl=qs('#mult'),carriedEl=qs('#carried'),oxyFill=qs('#o2fill'),menu=qs('#menu'),cinema=qs('#cinema'),quest=qs('#quest');
btn('#btnAdventure',start);btn('#btnStory',start);btn('#continueBtn',()=>endIntro(true));

const renderer=new THREE.WebGLRenderer({canvas:document.getElementById('bg'),antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);
const scene=new THREE.Scene();scene.background=new THREE.Color(0x87c9f5);scene.fog=new THREE.FogExp2(0x8ed0f7,0.0022);
const camera=new THREE.PerspectiveCamera(70,innerWidth/innerHeight,0.1,4000);camera.position.set(0,6,60);
const controls=new PointerLockControls(camera,document.body);scene.add(controls.getObject());
document.addEventListener('mousedown',()=>{if(state.running&&!controls.isLocked)controls.lock()});
const hemi=new THREE.HemisphereLight(0xcde8ff,0x416d66,0.95);scene.add(hemi);const dir=new THREE.DirectionalLight(0xffeecc,1.0);dir.position.set(160,220,100);scene.add(dir);

const sky=new THREE.Mesh(new THREE.SphereGeometry(3000,32,32),new THREE.MeshBasicMaterial({color:0x87c9f5,side:THREE.BackSide}));scene.add(sky);
const clouds=makeClouds(18);scene.add(clouds);

const waterNormals=new THREE.TextureLoader().load('https://threejs.org/examples/textures/waternormals.jpg',t=>{t.wrapS=t.wrapT=THREE.RepeatWrapping});
const water=new Water(new THREE.PlaneGeometry(4000,4000),{color:'#146a9b',scale:6,flowDirection:new THREE.Vector2(1,1),textureWidth:1024,textureHeight:1024,normalMap0:waterNormals,normalMap1:waterNormals});
water.rotation.x=-Math.PI/2;water.position.y=0.2;scene.add(water);

const causticsTex=new THREE.DataTexture(genCaustics(256,256),256,256,THREE.RGBAFormat);causticsTex.needsUpdate=true;causticsTex.wrapS=causticsTex.wrapT=THREE.RepeatWrapping;
const caust=new THREE.Mesh(new THREE.PlaneGeometry(4000,4000),new THREE.MeshBasicMaterial({map:causticsTex,color:0xe6c88f,transparent:true,opacity:.08}));caust.rotation.x=-Math.PI/2;caust.position.y=-2;scene.add(caust);
const seabed=new THREE.Mesh(new THREE.PlaneGeometry(4000,4000,220,220),new THREE.MeshPhongMaterial({color:0x7c7a5e,flatShading:true}));seabed.rotation.x=-Math.PI/2;displacePlane(seabed.geometry,(x,z)=>noise2(x*.003,z*.003)*22-36);scene.add(seabed);

const ISLAND_Y=3.2;const island=new THREE.Group();scene.add(island);
const islandMesh=new THREE.Mesh(new THREE.CircleGeometry(120,64),new THREE.MeshPhongMaterial({color:0xd6c29a}));islandMesh.rotation.x=-Math.PI/2;islandMesh.position.y=ISLAND_Y;island.add(islandMesh);
for(let i=0;i<18;i++){const p=makePalm();const r=75+Math.random()*35,a=Math.random()*Math.PI*2;p.position.set(Math.cos(a)*r,ISLAND_Y,Math.sin(a)*r);island.add(p)}
const foamRing=new THREE.Mesh(new THREE.RingGeometry(120,126,180),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.28,side:THREE.DoubleSide}));foamRing.rotation.x=-Math.PI/2;foamRing.position.y=.2;scene.add(foamRing);

const dhow=new THREE.Group();const hull=new THREE.Mesh(new THREE.BoxGeometry(40,8,14),new THREE.MeshPhongMaterial({color:0x7a5533}));hull.position.y=2;hull.rotation.y=.3;dhow.add(hull);
const mast=new THREE.Mesh(new THREE.CylinderGeometry(.45,.45,26,10),new THREE.MeshPhongMaterial({color:0x7a5533}));mast.position.set(0,13,0);dhow.add(mast);
const sail=new THREE.Mesh(new THREE.PlaneGeometry(28,16,20,1),new THREE.MeshPhongMaterial({color:0xffffff,side:THREE.DoubleSide}));sail.position.set(11,10,0);sail.rotation.set(0,Math.PI/2.4,0);dhow.add(sail);
dhow.position.set(-30,1,-200);scene.add(dhow);
const bankRing=new THREE.Mesh(new THREE.TorusGeometry(22,.7,16,64),new THREE.MeshBasicMaterial({color:0xffe28a}));bankRing.rotation.x=Math.PI/2;bankRing.position.set(-30,-6,-200);scene.add(bankRing);

let pearls=[],oysters=[],jellies=[],bubbles=[];

const state={running:false,startTime:0,timeLimit:300,score:0,carried:0,mult:1,oxy:100};
function start(){ reset(); hidePanels(); cinema.classList.remove('hidden'); quest.textContent='Collect pearls and bank them at the dhow!'; }
function endIntro(){ cinema.classList.add('hidden'); state.running=true; state.startTime=performance.now(); controls.lock(); }
function reset(){ state.oxy=100; state.score=0; state.carried=0; state.mult=1; controls.getObject().position.set(0,6,60); camera.lookAt(-30,6,-200); spawnOysters(40); spawnJellies(10); }

function spawnOysters(n){const oG=new THREE.SphereGeometry(2,16,16),oM1=new THREE.MeshPhongMaterial({color:0xa28f72,flatShading:true}),oM2=new THREE.MeshPhongMaterial({color:0xc1b496,flatShading:true}),pM=new THREE.MeshPhongMaterial({color:0xffffff,emissive:0xaa8844,shininess:120,specular:0xffffff});for(let i=0;i<n;i++){const top=new THREE.Mesh(oG,oM2),bot=new THREE.Mesh(oG,oM1);top.scale.set(1.2,.4,1.2);bot.scale.set(1.2,.4,1.2);bot.rotation.z=Math.PI;const o=new THREE.Group();o.add(top);o.add(bot);const x=rand(-1200,1200),z=rand(-1200,1200),y=-30+noise2(x*.004,z*.004)*14;o.position.set(x,y,z);o.userData.open=0;scene.add(o);oysters.push(o);const p=new THREE.Mesh(new THREE.SphereGeometry(.8,16,16),pM.clone());p.position.set(x,y+.8,z);p.userData.active=true;scene.add(p);pearls.push(p)}}
function spawnJellies(n){for(let i=0;i<n;i++){const j=makeJelly();j.position.set(rand(-1200,1200),-20,rand(-1200,1200));j.userData.phase=Math.random()*Math.PI*2;jellies.push(j);scene.add(j)}}

function setOxy(v){v=Math.max(0,Math.min(100,v));oxyFill.style.width=v+'%';}
function updateHUD(){hud.classList.remove('hidden');const rem=Math.max(0,state.timeLimit-Math.floor((performance.now()-state.startTime)/1000));timeEl.textContent=fmt(rem);scoreEl.textContent=state.score;multEl.textContent=state.mult.toFixed(1);carriedEl.textContent=state.carried;setOxy(state.oxy);if(rem<=0){state.running=false;}}
function fmt(t){const m=String(Math.floor(t/60)).padStart(2,'0');const s=String(t%60).padStart(2,'0');return `${m}:${s}`}

const keys={};addEventListener('keydown',e=>{keys[e.code]=true;if(e.code==='KeyE')interact()});addEventListener('keyup',e=>keys[e.code]=false);
const vel=new THREE.Vector3();
function step(dt){const speed=(keys['ShiftLeft']||keys['ShiftRight'])?28:16;vel.set(0,0,0);if(keys['KeyW'])vel.z+=1;if(keys['KeyS'])vel.z-=1;if(keys['KeyA'])vel.x-=1;if(keys['KeyD'])vel.x+=1;if(keys['Space'])vel.y+=1;if(keys['ControlLeft']||keys['ControlRight'])vel.y-=1;vel.normalize().multiplyScalar(speed*dt);controls.moveRight(vel.x);controls.moveForward(vel.z);controls.getObject().position.y+=vel.y;controls.getObject().position.y=THREE.MathUtils.clamp(controls.getObject().position.y,-72,40);const uw=controls.getObject().position.y<0;if(uw){state.oxy=Math.max(0,state.oxy-0.012*dt*60);scene.fog.density=THREE.MathUtils.lerp(scene.fog.density,0.010,0.05)}else{state.oxy=Math.min(100,state.oxy+0.35);scene.fog.density=THREE.MathUtils.lerp(scene.fog.density,0.0022,0.05)}}

function interact(){if(!state.running)return;const p=controls.getObject().position;let nearest=null;let dist=4;for(const pr of pearls){if(!pr.userData.active)continue;const d=pr.position.distanceTo(p);if(d<dist){dist=d;nearest=pr}}if(nearest){nearest.userData.active=false;nearest.visible=false;state.carried++;return}if(p.distanceTo(bankRing.position)<22){if(state.carried>0){state.score+=Math.floor(state.carried*12*state.mult);state.carried=0;state.mult=Math.min(6,state.mult+.8)}state.oxy=Math.min(100,state.oxy+.65)}}

function animate(){requestAnimationFrame(animate);const now=performance.now();const dt=(animate._t?(now-animate._t):16)/1000;animate._t=now;if(state.running){step(dt);updateHUD();for(const o of oysters){const d=o.position.distanceTo(controls.getObject().position);o.userData.open+=((d<6?1:0)-o.userData.open)*0.1;o.children[0].rotation.z=-o.userData.open*1.1}for(const pr of pearls){pr.rotation.y+=dt*1.5}for(const j of jellies){j.userData.phase+=dt*.7;j.position.y=-22+Math.sin(j.userData.phase)*4;j.position.x+=Math.sin(j.userData.phase*.6)*.12;j.position.z+=Math.cos(j.userData.phase*.5)*.12;if(j.position.distanceTo(controls.getObject().position)<2.8){state.oxy=Math.max(0,state.oxy-18*dt*1.5)}}clouds.children.forEach((c,i)=>{c.position.x+=Math.sin(now*.0001+i)*.02});foamRing.material.opacity=.24+Math.sin(now*.002)*.05}renderer.render(scene,camera)}
animate();

function rand(a,b){return a+Math.random()*(b-a)}function noise2(x,y){return(Math.sin(x*2.1+Math.sin(y*1.3))*.5+Math.sin(y*2.7+Math.sin(x*.7))*.5)}
function displacePlane(g,fn){const p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i);p.setY(i,fn(x,z))}p.needsUpdate=true;g.computeVertexNormals()}
function makePalm(){const g=new THREE.Group();const h=10;const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.4,.6,h,8),new THREE.MeshPhongMaterial({color:0x7a5533}));trunk.position.y=h/2;g.add(trunk);for(let i=0;i<6;i++){const leaf=new THREE.Mesh(new THREE.PlaneGeometry(6,2),new THREE.MeshLambertMaterial({color:0x1e6f5c,side:THREE.DoubleSide}));leaf.position.set(0,h+3,0);leaf.rotation.set(0,i*Math.PI/3,-Math.PI/6);g.add(leaf)}return g}
function makeJelly(){const g=new THREE.Group();const bell=new THREE.Mesh(new THREE.SphereGeometry(1.4,16,16),new THREE.MeshPhongMaterial({color:0xbf80ff,emissive:0x442266,shininess:60}));g.add(bell);const mat=new THREE.LineBasicMaterial({color:0xd2a0ff});for(let i=0;i<6;i++){const geo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0),new THREE.Vector3(rand(-.6,.6),-2.4-rand(0,1),rand(-.6,.6))]);g.add(new THREE.Line(geo,mat))}return g}
function genCaustics(w,h){const d=new Uint8Array(w*h*4);let i=0;for(let y=0;y<h;y++){for(let x=0;x<w;x++){const n=(Math.sin(x*.2)+Math.sin(y*.27)+Math.sin((x+y)*.13))*.33;const v=Math.max(0,Math.min(255,180+n*70));d[i++]=v;d[i++]=v;d[i++]=255;d[i++]=255}}return d}
function cloudTexture(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');const grd=ctx.createLinearGradient(0,0,0,h);grd.addColorStop(0,'rgba(255,255,255,.9)');grd.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=grd;ctx.fillRect(0,0,w,h);for(let i=0;i<20;i++){const r=20+Math.random()*40;const x=Math.random()*w;const y=Math.random()*(h*.6);const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'rgba(255,255,255,.9)');g.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill()}return new THREE.CanvasTexture(c)}
function makeClouds(n=16){const grp=new THREE.Group();for(let i=0;i<n;i++){const tex=cloudTexture(256,128);const mat=new THREE.SpriteMaterial({map:tex,depthWrite:false,transparent:true,opacity:.65});const spr=new THREE.Sprite(mat);spr.scale.set(300+Math.random()*200,150+Math.random()*120,1);spr.position.set((Math.random()-.5)*2500,280+Math.random()*80,(Math.random()-.5)*2500);grp.add(spr)}return grp}
