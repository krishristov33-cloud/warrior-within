// ===================== SIMULATION =====================
// ---------- difficulty ----------
const DIFFS = {
  easy:  {label:'EASY',   dmg:0.35, cool:2.0, sense:0.7,  bolt:0.65, windup:1.6, regenDelay:2.0, regen:30, pit:15, inv:1.0, infAmmo:true, infNades:true},
  normal:{label:'NORMAL', dmg:0.65, cool:1.4, sense:0.85, bolt:0.8,  windup:1.25,regenDelay:3.0, regen:18, pit:30, inv:0.8},
  hard:  {label:'HARD',   dmg:1.0,  cool:1.0, sense:1.0,  bolt:1.0,  windup:1.0, regenDelay:4.0, regen:12, pit:-1, inv:0.55},
};
let DIFF = DIFFS.normal, DIFF_NAME='normal';
function setDifficulty(n){ DIFF_NAME=n; DIFF=DIFFS[n]; try{ localStorage.setItem('w2_diff',n); }catch(e){}
  document.querySelectorAll('[data-diff]').forEach(b=>b.classList.toggle('sel',b.dataset.diff===n)); const el=document.getElementById('diffTag'); if(el) el.textContent=DIFF.label; }
const ENEMY = {
  target :{hp:3, r:19, sense:0,   col:[1,0.42,0.25]},
  gunner :{hp:4, r:21, sense:880, col:[1,0.6,0.15]},
  charger:{hp:3, r:18, sense:740, col:[0.85,0.35,1], dscale:1.1},
};
const targets = enemiesDef.map(([x,y,type],i)=>({type,x,y,bx:x,by:y,vx:0,vy:0,r:ENEMY[type].r,hp:ENEMY[type].hp,dead:0,ph:i*1.7,hit:0,state:'idle',t:0,cool:1+Math.random(),aggro:0}));
const SPAWN = {x:checkpoints[0].x, y:checkpoints[0].y};
const P = {hp:100,inv:0,dead:0,regenT:0,hurtFlash:0,x:SPAWN.x,y:SPAWN.y,vx:0,vy:0,w:44*HERO,h:140*HERO,ground:false,gs:null,face:1,fuel:1,
  coyote:0,buf:0,dbl:false,flip:0,land:0,jet:false,crouch:false,drop:0,intro:0,celebrate:0,ammo:30,nades:2,throwT:0,thrown:false,throwA:0,reload:0,cool:0,recoil:0,flash:0,flashN:0,
  climb:null,score:0,gems:0,treasures:0,secrets:0,cp:SPAWN,time:0,done:false,stepT:0,prevY:0,aimWorld:0};
checkpoints[0].on=true;
const K={}, M={x:innerWidth*0.6,y:innerHeight*0.45,wx:0,wy:0,l:false,r:false};
addEventListener('keydown',e=>{const k=e.key.toLowerCase(); if(!K[k]&&(k==='w'||k===' '||k==='arrowup'))P.buf=0.12; if(k==='r'&&!K.r)startReload(); if(k==='g'&&!K.g)startThrow();
  K[k]=true; if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(k))e.preventDefault();});
addEventListener('keyup',e=>{K[e.key.toLowerCase()]=false;});
canvas.addEventListener('mousemove',e=>{M.x=e.clientX;M.y=e.clientY;});
canvas.addEventListener('mousedown',e=>{if(e.button===1){e.preventDefault();startThrow();} if(e.button===0)M.l=true; if(e.button===2)M.r=true; canvas.focus();});
addEventListener('mouseup',e=>{if(e.button===0)M.l=false; if(e.button===2)M.r=false;});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
addEventListener('blur',()=>{for(const k in K)K[k]=false; M.l=M.r=false;});
let VIEW_H = REF_H;
const zoomBy=f=>{ VIEW_H=clamp(VIEW_H*f,600,REF_H); };
canvas.addEventListener('wheel',e=>{e.preventDefault(); zoomBy(e.deltaY>0?1.1:1/1.1);},{passive:false});

const G=2150, RUN=660, RUN_ANIM=440, WALK=230, ACC_G=3400, ACC_A=1500, FRIC=2800, JUMP=800, DJUMP=720,
      JET=3500, JET_X=1700, FUEL_USE=0.55, FUEL_REGEN=0.75, MAXVX=950, MAXUP=900, MAXDOWN=1600, KILL_Y=-90;

function overlaps(x,y,w,h,r){return x<r.x+r.w && x+w>r.x && y<r.y+r.h && y+h>r.y;}
function pointSolid(x,y){
  for(const r of solids) if(r.on&&x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h) return r;
  return null;
}
// bullets hit a floor only when travelling down through it (what you see is what blocks)
function floorHit(x0,y0,x1,y1){
  if(y1>=y0) return null;
  for(const s of surfaces){ if(!s.on||(s.piece&&s.piece.dead)) continue; const a=surfY(s,x0), b=surfY(s,x1); if(a===null||b===null) continue;
    if(y0>=a && y1<b) return s; } return null;
}
function lineOfSight(x1,y1,x2,y2){ const n=Math.ceil(Math.hypot(x2-x1,y2-y1)/40);
  for(let i=1;i<n;i++){ if(pointSolid(x1+(x2-x1)*i/n, y1+(y2-y1)*i/n)) return false; } return true; }

function surfY(s,x){ const p=s.pts; if(x<p[0][0]||x>p[p.length-1][0]) return null;
  for(let i=0;i<p.length-1;i++){ const a=p[i], b=p[i+1]; if(x>=a[0]&&x<=b[0]){ const t=(x-a[0])/((b[0]-a[0])||1); return a[1]+(b[1]-a[1])*t; } } return null; }
function moveAndCollide(dt){
  // carry with moving platform
  if(P.ground && P.gs && P.gs.dyn){ P.x+=P.gs.dx||0; P.y+=P.gs.dy||0; }
  if(P.climb){ P.x+=P.vx*dt; P.y+=P.vy*dt; return; }
  const prevY=P.y;
  P.x += P.vx*dt;
  for(const r of solids){ if(!r.on) continue; const L=P.x-P.w/2; if(overlaps(L,P.y,P.w,P.h,r)){
      if(P.vx>0) P.x=r.x-P.w/2-0.01; else if(P.vx<0) P.x=r.x+r.w+P.w/2+0.01; else P.x += (P.x<r.x+r.w/2?-1:1)*2; P.vx=0; } }
  P.y += P.vy*dt;
  const was=P.ground, wasS=P.gs; P.ground=false; P.gs=null;
  for(const r of solids){ if(!r.on) continue; const L=P.x-P.w/2; if(overlaps(L,P.y,P.w,P.h,r)){
      if(P.vy<=0 && prevY>=r.y+r.h-2){ P.y=r.y+r.h; if(!was && P.vy<-650) landed(); P.vy=0; P.ground=true; }
      else if(P.vy>0){ P.y=r.y-P.h-0.01; P.vy=0; } } }
  // one-way surfaces (stairs/slopes: stick when walking, step up small ledges)
  if(P.vy<=0 && P.drop<=0 && !P.climb){
    let best=null, by=-1e9;
    for(const s of surfaces){ if(!s.on || (s.piece&&s.piece.dead)) continue;
      const sy=surfY(s,P.x); if(sy===null) continue;
      const stick = was && (P.y-sy)<46 && (P.y-sy)>-46;
      const cross = prevY>=sy-2 && P.y<=sy+0.5;
      if((stick||cross) && sy>by){ best=s; by=sy; } }
    if(best){ if(!was && P.vy<-650) landed(); P.y=by; P.vy=0; P.ground=true; P.gs=best; onLand(best,was&&wasS===best); }
  }
}
function landed(){ P.land=0.22; fxLand(P.x,P.y,1); }
function onLand(s,already){
  if(s.sw && !already){ const w=s.sw; w.om += clamp(P.vx/w.L*0.45,-0.6,0.6); w.dipV -= w.heavy?260:180; fxLand(P.x,P.y,0.5); }
  if(s.piece && s.piece.brk && s.piece.brk.state==='idle'){ s.piece.brk.state='shake'; s.piece.brk.t=0.6; }
}

// ---------- player actions ----------
const bullets=[], parts=[], ebolts=[];
let shake=0;
function startReload(){ if(DIFF.infAmmo||P.reload>0||P.throwT>0||P.ammo===30||P.flip>0||P.dead>0) return; P.reload=1.2; st.setAnimation(1,'reload_upper',false).mixDuration=0.1; st.addEmptyAnimation(1,0.15,0); }
function fire(){
  if(!DIFF.infAmmo) P.ammo--; P.cool=0.085; P.recoil=1; P.flash=0.06; P.flashN^=1; shake=Math.min(shake+2.5,7);
  const e=st.setAnimation(1,'shoot_upper',false); e.mixDuration=0; st.addEmptyAnimation(1,0.08,0);
  const ang=P.aimWorld+(Math.random()-0.5)*0.035, sp=3000;
  bullets.push({x:bMuzzle.worldX,y:bMuzzle.worldY,vx:Math.cos(ang)*sp+P.vx*0.3,vy:Math.sin(ang)*sp+P.vy*0.3,life:0.8,ang});
  fxMuzzle(bMuzzle.worldX,bMuzzle.worldY,P.aimWorld);
  part({sp:'dot',x:bGun.worldX,y:bGun.worldY,vx:-P.face*rnd(120,240),vy:rnd(260,400),life:0.7,s0:0.18,s1:0.12,rgb:[1,0.85,0.45],tint:true,grav:1600,shell:1});
  P.vx -= Math.cos(P.aimWorld)*28;
  if(P.ammo<=0) setTimeout(startReload,120);
}
function hurtPlayer(dmg, fromX, kb=520){
  if(P.inv>0 || P.dead>0 || P.done) return;
  dmg=Math.round(dmg*DIFF.dmg); P.hp=Math.max(0,P.hp-dmg); P.inv=DIFF.inv; P.regenT=DIFF.regenDelay; P.hurtFlash=1; shake=Math.min(shake+10,16);
  const dir=Math.sign(P.x-fromX)||1; P.vx=dir*kb; P.vy=Math.max(P.vy,340); P.ground=false; P.gs=null;
  fxHurt(P.x,P.y+90*HERO);
  if(P.hp<=0){ die(); return; }
  const e=st.setAnimation(1,'hurt_upper',false); e.mixDuration=0.05; st.addEmptyAnimation(1,0.15,0);
}
function die(){
  P.dead=2.8; P.reload=0; P.flip=0; st.setEmptyAnimation(1,0.05);
  cur='death'; curEntry=st.setAnimation(0,'death',false); curEntry.mixDuration=0.08;
  fxExplode(P.x,P.y+80*HERO,[1,0.35,0.25],0.7); P.climb=null;
}
function respawn(){
  Object.assign(P,{x:P.cp.x,y:P.cp.y+5,vx:0,vy:0,hp:100,fuel:1,ammo:30,dead:0,inv:1.5,reload:0,gs:null,climb:null});
  for(const t of targets){ t.state='idle'; t.aggro=0; }
  ebolts.length=0; cur=''; play('idle_aim'); fxSpawn(P.x,P.y);
}
// ---------- grenades ----------
// THROW_REL = time of the 'throw' event in the Spine animation (hand at release)
const nades=[], THROW_T=0.8, THROW_REL=0.44, NADE_R=200;
// grenade supply crates for normal / hard: one roughly every 1300u, placed on a crystal spot (known reachable)
const nadePacks=[]; { let next=900; for(const c of [...crystals].sort((a,b)=>a.x-b.x)) if(c.x>=next){ nadePacks.push({x:c.x,y:c.y+34,taken:false,ph:Math.random()*6}); next=c.x+1300; } }
function startThrow(){
  if(P.throwT>0||P.dead>0||P.flip>0||P.reload>0||P.done||paused) return;
  if(!DIFF.infNades && P.nades<=0){ toast('No grenades — find a supply crate',1.6); return; }
  P.throwT=THROW_T; P.thrown=false; P.throwA=Math.atan2(M.wy-(P.y+90*HERO), M.wx-P.x);
  P.face = Math.cos(P.throwA)>=0?1:-1;
  const e=st.setAnimation(1,'throw_upper',false); e.mixDuration=0.08; st.addEmptyAnimation(1,0.15,0);
}
function releaseNade(){
  const a=P.throwA, sp=600;
  nades.push({x:bThrowHand.worldX,y:bThrowHand.worldY,vx:Math.cos(a)*sp+P.vx*0.4,vy:Math.sin(a)*sp+170+Math.max(0,P.vy)*0.3,fuse:1.6,rot:0,vr:-P.face*12,rest:false});
  if(!DIFF.infNades) P.nades--;
}
function explodeNade(g){
  fxBlast(g.x,g.y,1.25); shake=Math.min(shake+6,18);
  for(const t of targets){ if(t.dead>0||t.spawnT>0) continue; const d=Math.hypot(t.x-g.x,t.y-g.y);
    if(d<NADE_R+t.r && lineOfSight(g.x,g.y,t.x,t.y)){ t.hp-=d<NADE_R*0.6?99:2; t.hit=0.16; t.aggro=2.5; t.vx+=(t.x-g.x)/(d||1)*500; t.vy+=(t.y-g.y)/(d||1)*500+200;
      if(t.hp<=0){ t.dead=4; P.score++; fxBlast(t.x,t.y,0.8); } } }
  for(const b of breakables){ if(b.state!=='idle') continue; const cx=b.p.x+b.p.w/2, cy=b.p.top-b.p.h/2; if(Math.hypot(cx-g.x,cy-g.y)<NADE_R+b.p.w/2){ b.state='shake'; b.t=0.08; } }
}
function updateNades(dt){
  for(const g of nades){
    g.fuse-=dt; g.vy-=G*0.85*dt; g.rot+=g.vr*dt;
    for(let i=0;i<3;i++){ const nx=g.x+g.vx*dt/3, ny=g.y+g.vy*dt/3;
      if(pointSolid(nx,g.y)){ g.vx*=-0.45; g.vr*=-0.6; } else g.x=nx;
      if(pointSolid(g.x,ny)){ if(g.vy<0){ g.vy*=-0.38; g.vx*=0.7; g.vr*=0.6; } else g.vy*=-0.3; }
      else { const s=floorHit(g.x,g.y,g.x,ny); if(s){ g.y=surfY(s,g.x)+0.5; g.vy=Math.abs(g.vy)>140?-g.vy*0.38:0; g.vx*=0.7; g.vr*=0.6; } else g.y=ny; } }
    if(g.vy===0) { g.vx-=g.vx*Math.min(1,4*dt); g.vr=g.vx*-0.08; }
    for(const t of targets) if(t.dead<=0 && !(t.spawnT>0) && Math.hypot(t.x-g.x,t.y-g.y)<t.r+8) g.fuse=Math.min(g.fuse,0);   // contact with a drone
    if(Math.random()<0.25) part({puff:(Math.random()*PUFF_N)|0,x:g.x,y:g.y,vx:rnd(-20,20),vy:rnd(20,50),rot:rnd(0,6),life:0.5,s0:6,s1:18,rgb:[0.55,0.52,0.5],k:0.35,drag:2});
    if(g.y<KILL_Y-200) g.fuse=-1;
    if(g.fuse<=0){ g.dead=true; if(g.y>KILL_Y-200) explodeNade(g); } }
  for(let i=nades.length-1;i>=0;i--) if(nades[i].dead) nades.splice(i,1);
}
// ---------- particles ----------
function part(o){ parts.push(Object.assign({x:0,y:0,vx:0,vy:0,rot:0,vr:0,life:0.5,s0:0.3,s1:0.3,rgb:[1,1,1],k:1,grav:0,drag:0,tint:false,align:false,flipX:false,fade:1},o,{max:o.life||0.5})); }
function fxMuzzle(x,y,a){
  const fx_=x-Math.cos(a)*20, fy_=y-Math.sin(a)*20, L=rnd(0.8,1.2);   // muzzle bone sits ~20u past the barrel tip
  // rifle flash: hot core, long forward spike, two short side prongs (randomised per shot), embers + gun smoke
  part({gs:1,x:fx_,y:fy_,rot:a,life:0.05,s0:62*L,s1:48*L,w:15,px:0.02,rgb:[1,0.62,0.2],k:1});
  part({gs:1,x:fx_,y:fy_,rot:a,life:0.04,s0:38*L,s1:30*L,w:7,px:0.02,rgb:[1,0.95,0.75],k:1});
  for(const s of [-1,1]){ const r=a+s*rnd(0.6,0.8); part({gs:1,x:fx_+Math.cos(a)*6,y:fy_+Math.sin(a)*6,rot:r,life:0.04,s0:rnd(16,24),s1:12,w:6,px:0.02,rgb:[1,0.6,0.18],k:0.9}); }
  part({sp:'orb_s',x:fx_+Math.cos(a)*8,y:fy_+Math.sin(a)*8,life:0.05,s0:0.3,s1:0.42,rgb:[1,0.55,0.15],tint:true,k:1});
  for(let i=0;i<2;i++){ const b=a+rnd(-0.5,0.5), v=rnd(350,700); part({gs:0,x:fx_,y:fy_,vx:Math.cos(b)*v,vy:Math.sin(b)*v,life:rnd(0.07,0.14),s0:14,s1:6,w:2.5,px:1,rgb:[1,rnd(0.55,0.8),0.2],k:1,drag:4,line:1}); }
  if(Math.random()<0.6) part({puff:(Math.random()*PUFF_N)|0,x:fx_+Math.cos(a)*14,y:fy_+Math.sin(a)*14,vx:Math.cos(a)*rnd(60,120)+P.vx*0.4,vy:Math.sin(a)*rnd(60,120)+rnd(30,60),rot:rnd(0,6),vr:rnd(-1.5,1.5),life:rnd(0.45,0.7),s0:16,s1:46,rgb:[0.5,0.47,0.44],k:0.5,drag:3});
}
function fxImpact(x,y,a){
  // bullet strike: small hot flash + streaking sparks ricocheting back + a dust puff
  part({sp:'orb_s',x,y,life:0.08,s0:0.32,s1:0.5,rgb:[1,0.55,0.15],tint:true,k:1});
  part({sp:'star4',x,y,rot:rnd(0,6),life:0.05,s0:0.13,s1:0.08,rgb:[1,0.9,0.6],tint:true,k:1.3});
  for(let i=0;i<7;i++){ const b=a+Math.PI+rnd(-1.1,1.1), s=rnd(350,900); part({gs:0,x,y,vx:Math.cos(b)*s,vy:Math.sin(b)*s,life:rnd(0.12,0.28),s0:rnd(14,26),s1:4,w:2.5,px:1,rgb:[1,rnd(0.5,0.85),0.2],k:1,grav:1200,drag:2,line:1}); }
  part({puff:(Math.random()*PUFF_N)|0,x,y,vx:-Math.cos(a)*40,vy:rnd(20,50),rot:rnd(0,6),vr:rnd(-1,1),life:rnd(0.45,0.7),s0:14,s1:42,rgb:[0.42,0.39,0.36],k:0.55,drag:2});
}
function fxExplode(x,y,rgb=[0.45,1,0.95],sc=1){
  part({sp:'star_g',x,y,rot:rnd(0,6),life:0.22,s0:1.1*sc,s1:1.8*sc,rgb,tint:true,k:1.4});
  part({sp:'orb_big',x,y,life:0.35,s0:1.2*sc,s1:2.6*sc,rgb,tint:true,k:0.9});
  part({sp:'spark_burst',x,y,rot:rnd(0,6),life:0.4,s0:1.2*sc,s1:2.2*sc,rgb,tint:true,k:1});
  part({ring:1,x,y,life:0.45,s0:40*sc,s1:260*sc,rgb,k:0.8});
  for(let i=0;i<14;i++){ const b=rnd(0,6.28), s=rnd(300,900)*sc; part({sp:'dot',x,y,vx:Math.cos(b)*s,vy:Math.sin(b)*s,life:rnd(0.4,0.9),s0:0.45,s1:0.05,rgb,tint:true,grav:700,drag:1.2}); }
  for(let i=0;i<4;i++) part({sp:pick(['smoke1','smoke2']),x:x+rnd(-30,30),y:y+rnd(-30,30),vx:rnd(-80,80),vy:rnd(40,140),rot:rnd(0,6),vr:rnd(-1,1),life:rnd(0.6,1.1),s0:0.6*sc,s1:1.3*sc,rgb:[0.55,0.62,0.7],tint:true,k:0.45});
  shake=Math.min(shake+12*sc,18);
}
// dust/smoke clouds kicked up along the ground (normal-blended puffs, sandy grey)
const DUST=[0.6,0.55,0.48];
function fxLand(x,y,k=1){
  for(let i=0;i<8;i++){ const s=i%2?1:-1, sp=rnd(120,330)*k;
    part({puff:(Math.random()*PUFF_N)|0,x:x+s*rnd(4,30)*k,y:y+rnd(4,14),vx:s*sp,vy:rnd(8,50),rot:rnd(0,6),vr:rnd(-1.2,1.2),life:rnd(0.55,0.95),s0:32*k,s1:rnd(75,110)*k,rgb:DUST,k:0.9,drag:3.2}); }
  for(let i=0;i<3;i++) part({puff:(Math.random()*PUFF_N)|0,x:x+rnd(-20,20)*k,y:y+12,vx:rnd(-30,30),vy:rnd(40,90)*k,rot:rnd(0,6),vr:rnd(-0.8,0.8),life:rnd(0.7,1.1),s0:34*k,s1:95*k,rgb:DUST,k:0.6,drag:2});
  for(let i=0;i<5;i++){ const s=Math.random()<0.5?-1:1; part({puff:(Math.random()*PUFF_N)|0,x,y:y+6,vx:s*rnd(80,260)*k,vy:rnd(160,320)*k,rot:0,life:rnd(0.35,0.55),s0:9,s1:6,rgb:[0.38,0.33,0.28],k:0.9,grav:1500}); }
}
function fxAirKick(x,y){
  for(let i=0;i<7;i++){ const b=-Math.PI/2+rnd(-1.1,1.1), s=rnd(140,300);
    part({puff:(Math.random()*PUFF_N)|0,x:x+rnd(-12,12),y:y+rnd(0,12),vx:Math.cos(b)*s,vy:Math.sin(b)*s*0.6,rot:rnd(0,6),vr:rnd(-1.2,1.2),life:rnd(0.4,0.65),s0:22,s1:rnd(55,80),rgb:[0.62,0.58,0.52],k:0.75,drag:3.5}); }
}
// drone warp-in: light converging into a point while the drone materialises, then a pop when it arrives
function fxDroneSpawn(x,y){
  part({ring:1,x,y,life:0.7,s0:200,s1:16,rgb:[0.4,0.9,1],k:0.9});
  part({ring:1,x,y,life:0.55,s0:150,s1:12,rgb:[0.6,1,1],k:0.6,sy:0.35});
  part({sp:'orb_m',x,y,life:0.7,s0:0.15,s1:0.55,rgb:[0.3,0.8,1],tint:true,k:0.7});
  for(let i=0;i<16;i++){ const b=rnd(0,6.28), r=rnd(70,130), l=rnd(0.35,0.65);
    part({gs:0,x:x+Math.cos(b)*r,y:y+Math.sin(b)*r,vx:-Math.cos(b)*r/l,vy:-Math.sin(b)*r/l,life:l,s0:20,s1:8,w:3,px:1,rgb:[0.5,0.95,1],k:0.9,line:1}); }
}
function fxDroneArrive(x,y){
  part({sp:'star4',x,y,rot:rnd(0,1),life:0.18,s0:0.45,s1:0.15,rgb:[0.7,1,1],tint:true,k:1.4});
  part({sp:'orb_s',x,y,life:0.25,s0:0.5,s1:1.2,rgb:[0.4,0.9,1],tint:true,k:0.8});
  part({ring:1,x,y,life:0.3,s0:30,s1:120,rgb:[0.5,1,1],k:0.7});
}
// drone destroyed: flash, fireball, shockwave, shrapnel sparks, burning bits and a rolling smoke cloud
function fxBlast(x,y,sc=1){
  part({sp:'star4',x,y,rot:rnd(0,1),life:0.08,s0:0.7*sc,s1:0.4*sc,rgb:[1,0.95,0.8],tint:true,k:1.6});
  part({sp:'orb_big',x,y,life:0.14,s0:0.2*sc,s1:0.45*sc,rgb:[1,0.5,0.12],tint:true,k:0.8});
  part({ring:1,x,y,life:0.3,s0:40*sc,s1:230*sc,rgb:[1,0.6,0.25],k:0.8});
  for(let i=0;i<11;i++){ const b=rnd(0,6.28), s=rnd(140,360)*sc;
    part({puff:(Math.random()*PUFF_N)|0,add:1,x,y,vx:Math.cos(b)*s,vy:Math.sin(b)*s+60,rot:rnd(0,6),vr:rnd(-2,2),life:rnd(0.25,0.45),s0:16*sc,s1:rnd(45,75)*sc,rgb:[1,rnd(0.28,0.55),0.05],k:0.6,drag:4}); }
  for(let i=0;i<7;i++){ const b=rnd(0,6.28), s=rnd(40,140)*sc;
    part({puff:(Math.random()*PUFF_N)|0,x:x+rnd(-15,15),y:y+rnd(-15,15),vx:Math.cos(b)*s,vy:Math.sin(b)*s*0.5+rnd(40,110),rot:rnd(0,6),vr:rnd(-1,1),life:rnd(1.0,1.6),s0:30*sc,s1:rnd(100,140)*sc,rgb:[0.22,0.2,0.19],k:0.7,drag:1.6}); }
  for(let i=0;i<16;i++){ const b=rnd(0,6.28), s=rnd(400,1000)*sc;
    part({gs:0,x,y,vx:Math.cos(b)*s,vy:Math.sin(b)*s,life:rnd(0.25,0.55),s0:rnd(18,32),s1:5,w:3,px:1,rgb:[1,rnd(0.5,0.85),0.2],k:1,grav:1100,drag:1.5,line:1}); }
  for(let i=0;i<6;i++){ const b=rnd(0.3,2.84), s=rnd(250,520)*sc;
    part({puff:(Math.random()*PUFF_N)|0,x,y,vx:Math.cos(b)*s,vy:Math.sin(b)*s,rot:rnd(0,6),vr:rnd(-8,8),life:rnd(0.6,1.0),s0:10,s1:7,rgb:[0.16,0.15,0.15],k:1,grav:1500,drag:0.5}); }
  shake=Math.min(shake+9*sc,16);
}
function fxDust(x,y){ part({puff:(Math.random()*PUFF_N)|0,x,y:y+10,vx:-P.vx*0.15+rnd(-30,30),vy:rnd(15,45),rot:rnd(0,6),vr:rnd(-1,1),life:rnd(0.45,0.65),s0:18,s1:48,rgb:DUST,k:0.55,drag:2}); }
function fxHurt(x,y){ part({sp:'zap',x,y,rot:rnd(0,6),life:0.2,s0:0.6,s1:0.9,rgb:[1,0.3,0.25],tint:true,k:1.2}); part({sp:'star_b',x,y,life:0.12,s0:0.6,s1:0.9,rgb:[1,0.4,0.3],tint:true,k:1}); }
// hero teleports in (start, respawn, pit return): light column, ground halo, rising motes, arrival flash, a little dust
function fxSpawn(x,y){
  const H=150*HERO;
  part({gs:1,x,y,rot:Math.PI/2,life:0.55,s0:H*2.2,s1:H*2.6,w:46*HERO,px:0,rgb:[0.35,0.85,1],k:0.9});
  part({gs:1,x,y,rot:Math.PI/2,life:0.4,s0:H*1.8,s1:H*2.2,w:16*HERO,px:0,rgb:[0.85,1,1],k:1});
  part({ring:1,x,y:y+4,life:0.6,s0:40,s1:190*HERO,rgb:[0.4,0.95,1],k:0.9,sy:0.28});
  part({sp:'star4',x,y:y+H*0.6,rot:0,life:0.2,s0:0.5,s1:0.15,rgb:[0.8,1,1],tint:true,k:1.4});
  part({sp:'orb_m',x,y:y+H*0.55,life:0.4,s0:0.4,s1:0.9,rgb:[0.3,0.85,1],tint:true,k:0.6});
  for(let i=0;i<16;i++){ const ox=rnd(-40,40)*HERO; part({gs:0,x:x+ox,y:y+rnd(0,H*0.5),vx:0,vy:rnd(250,520),life:rnd(0.4,0.8),s0:rnd(14,26),s1:6,w:2.5,px:1,rgb:[0.5,1,1],k:0.9,drag:1.5,line:1}); }
  for(let i=0;i<6;i++){ const s=i%2?1:-1; part({puff:(Math.random()*PUFF_N)|0,x:x+s*rnd(4,20),y:y+6,vx:s*rnd(80,200),vy:rnd(10,40),rot:rnd(0,6),vr:rnd(-1,1),life:rnd(0.5,0.8),s0:20,s1:60,rgb:DUST,k:0.6,drag:3}); }
}
// the long first spawn's strike: thick sky beam, double shockwave, flash, debris dust, shake
function fxSpawnEpic(x,y){
  fxSpawn(x,y);
  part({gs:1,x,y:y-20,rot:Math.PI/2,life:1.2,s0:1300,s1:1500,w:200*HERO,px:0,rgb:[0.3,0.8,1],k:0.85});
  part({gs:1,x,y:y-20,rot:Math.PI/2,life:0.9,s0:1200,s1:1400,w:70*HERO,px:0,rgb:[0.9,1,1],k:1});
  part({sp:'star4',x,y:y+60*HERO,rot:0,life:0.5,s0:2.0,s1:0.4,rgb:[0.85,1,1],tint:true,k:1.8});
  part({sp:'star4',x,y:y+60*HERO,rot:0.78,life:0.35,s0:1.2,s1:0.3,rgb:[0.6,0.95,1],tint:true,k:1.4});
  part({sp:'orb_big',x,y:y+50*HERO,life:0.45,s0:0.4,s1:1.5,rgb:[0.35,0.85,1],tint:true,k:0.7});
  for(const [l,s1,sy] of [[0.7,520,0.3],[0.9,340,1],[1.1,760,0.22]]) part({ring:1,x,y:y+(sy<1?4:60*HERO),life:l,s0:40,s1,rgb:[0.45,0.95,1],k:0.9,sy});
  for(let i=0;i<14;i++){ const s=i%2?1:-1; part({puff:(Math.random()*PUFF_N)|0,x:x+s*rnd(4,40),y:y+rnd(4,16),vx:s*rnd(160,420),vy:rnd(10,80),rot:rnd(0,6),vr:rnd(-1.2,1.2),life:rnd(0.7,1.2),s0:30,s1:rnd(90,140),rgb:DUST,k:0.7,drag:2.8}); }
  for(let i=0;i<30;i++){ const b=rnd(0.15,2.99), s=rnd(300,900); part({gs:0,x,y:y+20,vx:Math.cos(b)*s,vy:Math.sin(b)*s,life:rnd(0.4,0.9),s0:rnd(16,30),s1:5,w:2.5,px:1,rgb:Math.random()<0.3?[1,0.9,0.6]:[0.5,1,1],k:1,grav:900,drag:1,line:1}); }
  shake=Math.min(shake+18,22);
}
// celebration fireworks around the hero after taking the relic
function fxFirework(x,y){
  const c=pick([[1,0.85,0.4],[0.5,1,1],[1,0.6,0.3],[0.8,0.6,1]]);
  part({sp:'star4',x,y,rot:rnd(0,1),life:0.18,s0:0.5,s1:0.15,rgb:c,tint:true,k:1.5});
  part({ring:1,x,y,life:0.5,s0:20,s1:200,rgb:c,k:0.8});
  for(let i=0;i<20;i++){ const b=i/20*6.28+rnd(-0.1,0.1), s=rnd(260,420); part({gs:0,x,y,vx:Math.cos(b)*s,vy:Math.sin(b)*s,life:rnd(0.6,0.9),s0:rnd(16,26),s1:5,w:2.5,px:1,rgb:c,k:1,grav:380,drag:1.4,line:1}); }
}
// checkpoint lit: beacon flare shooting up from the shrine, halo, sparks
function fxCheckpoint(x,y){
  part({gs:1,x,y:y+40,rot:Math.PI/2,life:0.8,s0:260,s1:420,w:34,px:0,rgb:[0.35,0.9,1],k:0.85});
  part({gs:1,x,y:y+40,rot:Math.PI/2,life:0.6,s0:200,s1:340,w:12,px:0,rgb:[0.9,1,1],k:1});
  part({ring:1,x,y:y+6,life:0.7,s0:40,s1:260,rgb:[0.4,0.95,1],k:0.9,sy:0.3});
  part({ring:1,x,y:y+70,life:0.5,s0:30,s1:170,rgb:[0.6,1,1],k:0.7});
  part({sp:'star4',x,y:y+110,rot:0,life:0.3,s0:0.7,s1:0.2,rgb:[0.8,1,1],tint:true,k:1.5});
  for(let i=0;i<22;i++){ const b=Math.PI/2+rnd(-0.6,0.6), s=rnd(300,750); part({gs:0,x:x+rnd(-14,14),y:y+70,vx:Math.cos(b)*s,vy:Math.sin(b)*s,life:rnd(0.5,0.9),s0:rnd(16,28),s1:5,w:2.5,px:1,rgb:[0.5,1,1],k:1,grav:500,drag:1,line:1}); }
  for(let i=0;i<8;i++){ const b=rnd(0,6.28), s=rnd(60,200); part({sp:'diamond',x,y:y+80,vx:Math.cos(b)*s,vy:Math.sin(b)*s+120,rot:rnd(0,6),vr:rnd(-6,6),life:rnd(0.6,1.0),s0:0.2,s1:0.05,rgb:[0.6,1,1],drag:1.5,k:1.2}); }
}
// relic taken: tall golden-cyan light pillar, rolling shockwave halos, spiralling sparkles and a burst
function fxRelic(x,y){
  part({gs:1,x,y:y-60,rot:Math.PI/2,life:1.6,s0:900,s1:1300,w:90,px:0,rgb:[1,0.85,0.45],k:0.7});
  part({gs:1,x,y:y-60,rot:Math.PI/2,life:1.3,s0:800,s1:1200,w:30,px:0,rgb:[1,1,0.9],k:1});
  for(let i=0;i<3;i++) part({ring:1,x,y,life:0.7+i*0.25,s0:40,s1:380+i*160,rgb:i%2?[0.5,1,1]:[1,0.85,0.45],k:0.9-i*0.2});
  part({ring:1,x,y:y-110,life:1.0,s0:60,s1:520,rgb:[1,0.85,0.45],k:0.8,sy:0.25});
  part({sp:'star4',x,y,rot:0,life:0.45,s0:1.6,s1:0.4,rgb:[1,0.95,0.8],tint:true,k:1.6});
  part({sp:'orb_big',x,y,life:0.5,s0:0.5,s1:1.6,rgb:[1,0.8,0.4],tint:true,k:0.7});
  for(let i=0;i<40;i++){ const b=rnd(0,6.28), s=rnd(150,700); part({gs:0,x,y,vx:Math.cos(b)*s,vy:Math.sin(b)*s+200,life:rnd(0.6,1.3),s0:rnd(18,34),s1:6,w:3,px:1,rgb:Math.random()<0.5?[1,0.85,0.4]:[0.5,1,1],k:1,grav:350,drag:1,line:1}); }
  for(let i=0;i<24;i++){ const b=rnd(0,6.28), s=rnd(80,260); part({sp:'diamond',x:x+Math.cos(b)*30,y:y+Math.sin(b)*30,vx:Math.cos(b)*s,vy:rnd(150,420),rot:rnd(0,6),vr:rnd(-6,6),life:rnd(1.0,1.8),s0:0.28,s1:0.06,rgb:Math.random()<0.5?[1,0.9,0.5]:[0.6,1,1],drag:0.8,k:1.3}); }
  shake=Math.min(shake+8,14);
}
function fxSparkle(x,y,big=false){
  part({sp:'twinkle',x,y,rot:rnd(-0.3,0.3),life:0.35,s0:big?1.4:0.7,s1:big?0.3:0.1,rgb:[0.6,1,1],k:1.3});
  part({sp:'orb_m',x,y,life:0.3,s0:0.6,s1:big?2.4:1.4,rgb:[0.4,0.95,1],k:0.7});
  for(let i=0;i<(big?14:5);i++){ const b=rnd(0,6.28), s=rnd(100,big?600:300); part({sp:'diamond',x,y,vx:Math.cos(b)*s,vy:Math.sin(b)*s,rot:rnd(0,6),vr:rnd(-6,6),life:rnd(0.3,0.7),s0:0.22,s1:0.05,rgb:[0.6,1,1],drag:2,k:1.2}); }
}
function fxCrumble(p){
  const t=TILE[p.n], N=5;
  for(let i=0;i<N;i++){ const u0=t.uv[0]+(t.uv[2]-t.uv[0])*i/N, u1=t.uv[0]+(t.uv[2]-t.uv[0])*(i+1)/N;
    debris.push({uv:[u0,t.uv[1],u1,t.uv[3]], x:p.x+p.w*(i+0.5)/N, y:p.top-p.h/2, w:p.w/N, h:p.h, vx:rnd(-90,90), vy:rnd(-60,80), rot:0, vr:rnd(-2.5,2.5), life:2.2, flip:p.flip}); }
  for(let i=0;i<6;i++){ const n=pick(['tile54','tile55','tile56']), [w,h]=tileSize(n,rnd(0.5,0.9)); const tt=TILE[n];
    debris.push({uv:tt.uv, x:p.x+rnd(0,p.w), y:p.top-rnd(0,40), w, h, vx:rnd(-160,160), vy:rnd(60,260), rot:rnd(0,6), vr:rnd(-6,6), life:2}); }
  for(let i=0;i<5;i++) part({sp:pick(['smoke1','smoke2']),x:p.x+rnd(0,p.w),y:p.top-30,vx:rnd(-60,60),vy:rnd(-40,40),rot:rnd(0,6),vr:rnd(-1,1),life:rnd(0.6,1),s0:0.4,s1:1.0,rgb:[0.75,0.68,0.55],tint:true,k:0.4});
}

// ---------- enemies ----------
function updateEnemies(dt){
  const px=P.x, py=P.y+85*HERO;
  for(const t of targets){
    t.ph+=dt; t.hit=Math.max(0,t.hit-dt);
    if(t.dead>0){ t.dead-=dt; if(t.dead<=0){ t.hp=ENEMY[t.type].hp; t.x=t.bx; t.y=t.by; t.vx=t.vy=0; t.state='idle'; t.spawnT=0.7; fxDroneSpawn(t.bx,t.by);} continue; }
    if(t.spawnT>0){ t.spawnT-=dt; t.aggro=0; if(t.spawnT<=0) fxDroneArrive(t.x,t.y); continue; }   // warping in: no AI yet
    const E=ENEMY[t.type], dx=px-t.x, dy=py-t.y, d=Math.hypot(dx,dy);
    if(Math.abs(dx)>2600) continue;
    const sees = E.sense>0 && P.dead<=0 && !P.done && !(P.intro>0) && d<E.sense*DIFF.sense && lineOfSight(t.x,t.y,px,py);
    t.aggro = sees ? 2.5 : Math.max(0,t.aggro-dt);
    let ax=0, ay=0;
    const hoverX=t.bx+Math.sin(t.ph*0.9)*40, hoverY=t.by+Math.sin(t.ph*1.7)*18;
    if(t.type==='gunner' && t.aggro>0){
      const want=460, nx=dx/(d||1), ny=dy/(d||1), push=(d-want)*2.2;
      ax=nx*push - ny*Math.sin(t.ph*1.3)*180; ay=ny*push + nx*Math.sin(t.ph*1.3)*180 + (py+170*HERO-t.y)*1.2;
      if(!sees){ ax+=(px-t.x)*1.5; ay+=(py+120*HERO-t.y)*1.5; }
      t.cool-=dt;
      if(t.state==='idle' && t.cool<=0 && sees){ t.state='charge'; t.t=0.55*DIFF.windup; }
      if(t.state==='charge'){ t.t-=dt; if(t.t<=0){ t.state='idle'; t.cool=(1.4+Math.random()*0.7)*DIFF.cool;
          const lead=0.25, tx=px+P.vx*lead, ty=py+P.vy*lead*0.5, a=Math.atan2(ty-t.y,tx-t.x), sp=850*DIFF.bolt;
          ebolts.push({x:t.x,y:t.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:2.4,dmg:10,a});
          part({sp:'star_b',x:t.x,y:t.y,life:0.1,s0:0.14,s1:0.22,rgb:E.col,tint:true,k:1.1}); } }
    } else if(t.type==='charger' && (t.aggro>0 || t.state!=='idle')){
      t.cool-=dt;
      if(t.state==='idle'){ ax=(px-t.x)*1.6; ay=(py+60*HERO-t.y)*1.6; if(sees && d<540 && t.cool<=0){ t.state='windup'; t.t=0.55*DIFF.windup; } }
      else if(t.state==='windup'){ t.t-=dt; t.vx*=0.85; t.vy*=0.85; if(t.t<=0){ const a=Math.atan2(dy,dx); t.vx=Math.cos(a)*1250; t.vy=Math.sin(a)*1250; t.state='dash'; t.t=0.55; } }
      else if(t.state==='dash'){ t.t-=dt; if(Math.random()<0.7) part({sp:'wisp',x:t.x,y:t.y,rot:Math.atan2(t.vy,t.vx)+Math.PI,life:0.3,s0:0.5,s1:0.2,rgb:E.col,tint:true,k:0.8});
        if(d<t.r+60*HERO && Math.abs(dy)<95*HERO){ hurtPlayer(18,t.x,620); t.state='idle'; t.cool=1.6*DIFF.cool; t.vx*=-0.4; t.vy*=-0.4; }
        if(t.t<=0){ t.state='idle'; t.cool=1.3; } }
    } else { ax=(hoverX-t.x)*6 - t.vx*2.5; ay=(hoverY-t.y)*6 - t.vy*2.5; }
    if(t.state!=='dash'){ t.vx+=ax*dt; t.vy+=ay*dt; const damp=t.state==='windup'?0:2.2; t.vx-=t.vx*damp*dt; t.vy-=t.vy*damp*dt;
      const sp=Math.hypot(t.vx,t.vy), mx=t.type==='charger'?380:300; if(sp>mx){t.vx*=mx/sp;t.vy*=mx/sp;} }
    const nx=t.x+t.vx*dt, ny=t.y+t.vy*dt;
    if(!pointSolid(nx,t.y)) t.x=nx; else { t.vx*=-0.5; if(t.state==='dash'){t.state='idle';t.cool=1;} }
    if(!pointSolid(t.x,ny)) t.y=ny; else t.vy*=-0.5;
  }
  for(const b of ebolts){ b.life-=dt; for(let i=0;i<3&&b.life>0;i++){ b.x+=b.vx*dt/3; b.y+=b.vy*dt/3;
      if(pointSolid(b.x,b.y)){ b.life=0; part({sp:'burst_s',x:b.x,y:b.y,rot:b.a+Math.PI,life:0.15,s0:0.4,s1:0.7,rgb:[1,0.55,0.2],tint:true,k:1.2}); }
      else if(P.dead<=0 && Math.abs(b.x-P.x)<P.w/2+8 && b.y>P.y && b.y<P.y+P.h){ b.life=0; hurtPlayer(b.dmg,b.x-b.vx,220); } }
    if(Math.random()<0.6) part({sp:'dot',x:b.x,y:b.y,vx:rnd(-30,30),vy:rnd(-30,30),life:0.25,s0:0.18,s1:0.03,rgb:[1,0.55,0.2],tint:true}); }
  for(let i=ebolts.length-1;i>=0;i--) if(ebolts[i].life<=0) ebolts.splice(i,1);
}
