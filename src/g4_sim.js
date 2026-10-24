// ===================== SIMULATION =====================
// ---------- difficulty ----------
const DIFFS = {
  easy:  {label:'EASY',   dmg:0.35, cool:2.0, sense:0.7,  bolt:0.65, windup:1.6, regenDelay:2.0, regen:30, pit:15, inv:1.0},
  normal:{label:'NORMAL', dmg:0.65, cool:1.4, sense:0.85, bolt:0.8,  windup:1.25,regenDelay:3.0, regen:18, pit:30, inv:0.8},
  hard:  {label:'HARD',   dmg:1.0,  cool:1.0, sense:1.0,  bolt:1.0,  windup:1.0, regenDelay:4.0, regen:12, pit:-1, inv:0.55},
};
let DIFF = DIFFS.normal, DIFF_NAME='normal';
function setDifficulty(n){ DIFF_NAME=n; DIFF=DIFFS[n]; try{ localStorage.setItem('w2_diff',n); }catch(e){}
  document.querySelectorAll('[data-diff]').forEach(b=>b.classList.toggle('sel',b.dataset.diff===n)); const el=document.getElementById('diffTag'); if(el) el.textContent=DIFF.label; }
const ENEMY = {
  target :{hp:3, r:26, sense:0,   col:[1,0.42,0.25]},
  gunner :{hp:4, r:28, sense:880, col:[1,0.6,0.15]},
  charger:{hp:3, r:24, sense:740, col:[0.85,0.35,1], dscale:1.1},
};
const targets = enemiesDef.map(([x,y,type],i)=>({type,x,y,bx:x,by:y,vx:0,vy:0,r:ENEMY[type].r,hp:ENEMY[type].hp,dead:0,ph:i*1.7,hit:0,state:'idle',t:0,cool:1+Math.random(),aggro:0}));
const SPAWN = {x:checkpoints[0].x, y:checkpoints[0].y};
const P = {hp:100,inv:0,dead:0,regenT:0,hurtFlash:0,x:SPAWN.x,y:SPAWN.y,vx:0,vy:0,w:44,h:140,ground:false,gs:null,face:1,fuel:1,
  coyote:0,buf:0,dbl:false,flip:0,land:0,jet:false,crouch:false,drop:0,ammo:30,reload:0,cool:0,recoil:0,flash:0,flashN:0,
  climb:null,score:0,gems:0,treasures:0,secrets:0,cp:SPAWN,time:0,done:false,stepT:0,prevY:0,aimWorld:0};
checkpoints[0].on=true;
const K={}, M={x:innerWidth*0.6,y:innerHeight*0.45,wx:0,wy:0,l:false,r:false};
addEventListener('keydown',e=>{const k=e.key.toLowerCase(); if(!K[k]&&(k==='w'||k===' '||k==='arrowup'))P.buf=0.12; if(k==='r'&&!K.r)startReload();
  if(k==='enter'&&P.done) location.reload(); K[k]=true; if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(k))e.preventDefault();});
addEventListener('keyup',e=>{K[e.key.toLowerCase()]=false;});
canvas.addEventListener('mousemove',e=>{M.x=e.clientX;M.y=e.clientY;});
canvas.addEventListener('mousedown',e=>{if(e.button===0)M.l=true; if(e.button===2)M.r=true; canvas.focus();});
addEventListener('mouseup',e=>{if(e.button===0)M.l=false; if(e.button===2)M.r=false;});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
addEventListener('blur',()=>{for(const k in K)K[k]=false; M.l=M.r=false;});
let VIEW_H = REF_H;
const zoomBy=f=>{ VIEW_H=clamp(VIEW_H*f,600,REF_H); };
canvas.addEventListener('wheel',e=>{e.preventDefault(); zoomBy(e.deltaY>0?1.1:1/1.1);},{passive:false});

const G=2150, RUN=440, WALK=230, ACC_G=3400, ACC_A=1500, FRIC=2800, JUMP=800, DJUMP=720,
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
function startReload(){ if(P.reload>0||P.ammo===30||P.flip>0||P.dead>0) return; P.reload=1.2; st.setAnimation(1,'reload_upper',false).mixDuration=0.1; st.addEmptyAnimation(1,0.15,0); }
function fire(){
  P.ammo--; P.cool=0.085; P.recoil=1; P.flash=0.06; P.flashN^=1; shake=Math.min(shake+2.5,7);
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
  fxHurt(P.x,P.y+90);
  if(P.hp<=0){ die(); return; }
  const e=st.setAnimation(1,'hurt_upper',false); e.mixDuration=0.05; st.addEmptyAnimation(1,0.15,0);
}
function die(){
  P.dead=2.8; P.reload=0; P.flip=0; st.setEmptyAnimation(1,0.05);
  cur='death'; curEntry=st.setAnimation(0,'death',false); curEntry.mixDuration=0.08;
  fxExplode(P.x,P.y+80,[1,0.35,0.25],0.7); P.climb=null;
}
function respawn(){
  Object.assign(P,{x:P.cp.x,y:P.cp.y+5,vx:0,vy:0,hp:100,fuel:1,ammo:30,dead:0,inv:1.5,reload:0,gs:null,climb:null});
  for(const t of targets){ t.state='idle'; t.aggro=0; }
  ebolts.length=0; cur=''; play('idle_aim'); fxSpawn(P.x,P.y);
}
// ---------- particles ----------
function part(o){ parts.push(Object.assign({x:0,y:0,vx:0,vy:0,rot:0,vr:0,life:0.5,s0:0.3,s1:0.3,rgb:[1,1,1],k:1,grav:0,drag:0,tint:false,align:false,flipX:false,fade:1},o,{max:o.life||0.5})); }
function fxMuzzle(x,y,a){
  const fx_=x+Math.cos(a)*6, fy_=y+Math.sin(a)*6;
  // fiery flash: tinted flame tongue + hot core + embers, then a little gun smoke
  part({sp:'muzzle',x:fx_,y:fy_,rot:a,life:0.05,s0:0.2,s1:0.28,rgb:[1,0.5,0.12],tint:true,flipX:true,px:0.04,k:1.7,sx:rnd(0.85,1.2)});
  part({sp:'flame_m',x:fx_,y:fy_,rot:a-Math.PI/2+rnd(-0.15,0.15),life:0.055,s0:0.42,s1:0.3,rgb:[1,0.62,0.18],tint:true,py:0.12,k:1.5});
  part({sp:'star4',x:fx_+Math.cos(a)*10,y:fy_+Math.sin(a)*10,rot:a+rnd(-0.3,0.3),life:0.045,s0:0.17,s1:0.1,rgb:[1,0.85,0.45],tint:true,k:1.5});
  part({sp:'orb_s',x:fx_,y:fy_,life:0.06,s0:0.55,s1:0.75,rgb:[1,0.5,0.15],tint:true,k:0.8});
  for(let i=0;i<3;i++){ const b=a+rnd(-0.45,0.45), v=rnd(300,700); part({sp:'dot',x:fx_,y:fy_,vx:Math.cos(b)*v,vy:Math.sin(b)*v,life:rnd(0.08,0.18),s0:0.15,s1:0.04,rgb:[1,rnd(0.45,0.75),0.15],tint:true,drag:5,grav:400}); }
  if(Math.random()<0.6) part({puff:(Math.random()*PUFF_N)|0,x:fx_+Math.cos(a)*14,y:fy_+Math.sin(a)*14,vx:Math.cos(a)*rnd(60,120)+P.vx*0.4,vy:Math.sin(a)*rnd(60,120)+rnd(30,60),rot:rnd(0,6),vr:rnd(-1.5,1.5),life:rnd(0.45,0.7),s0:16,s1:46,rgb:[0.5,0.47,0.44],k:0.35,drag:3});
}
function fxImpact(x,y,a){
  part({sp:'burst_s',x,y,rot:a+Math.PI,life:0.12,s0:0.35,s1:0.55,rgb:[0.7,1,1],k:1.2});
  part({sp:'ring1',x,y,rot:a+Math.PI/2,life:0.25,s0:0.4,s1:1.0,rgb:[0.5,0.95,1],k:0.8});
  for(let i=0;i<6;i++){ const b=a+Math.PI+rnd(-1.2,1.2), s=rnd(250,650); part({sp:'dot',x,y,vx:Math.cos(b)*s,vy:Math.sin(b)*s,life:rnd(0.2,0.4),s0:0.3,s1:0.05,rgb:[0.7,1,1],grav:900,drag:1}); }
}
function fxExplode(x,y,rgb=[0.45,1,0.95],sc=1){
  part({sp:'star_g',x,y,rot:rnd(0,6),life:0.22,s0:1.1*sc,s1:1.8*sc,rgb,tint:true,k:1.4});
  part({sp:'orb_big',x,y,life:0.35,s0:1.2*sc,s1:2.6*sc,rgb,tint:true,k:0.9});
  part({sp:'spark_burst',x,y,rot:rnd(0,6),life:0.4,s0:1.2*sc,s1:2.2*sc,rgb,tint:true,k:1});
  part({sp:'ripple',x,y,life:0.5,s0:0.8*sc,s1:2.4*sc,rgb,tint:true,k:0.8});
  for(let i=0;i<14;i++){ const b=rnd(0,6.28), s=rnd(300,900)*sc; part({sp:'dot',x,y,vx:Math.cos(b)*s,vy:Math.sin(b)*s,life:rnd(0.4,0.9),s0:0.45,s1:0.05,rgb,tint:true,grav:700,drag:1.2}); }
  for(let i=0;i<4;i++) part({sp:pick(['smoke1','smoke2']),x:x+rnd(-30,30),y:y+rnd(-30,30),vx:rnd(-80,80),vy:rnd(40,140),rot:rnd(0,6),vr:rnd(-1,1),life:rnd(0.6,1.1),s0:0.6*sc,s1:1.3*sc,rgb:[0.55,0.62,0.7],tint:true,k:0.45});
  shake=Math.min(shake+12*sc,18);
}
// dust/smoke clouds kicked up along the ground (normal-blended puffs, sandy grey)
const DUST=[0.6,0.55,0.48];
function fxLand(x,y,k=1){
  for(let i=0;i<8;i++){ const s=i%2?1:-1, sp=rnd(120,330)*k;
    part({puff:(Math.random()*PUFF_N)|0,x:x+s*rnd(4,30)*k,y:y+rnd(4,14),vx:s*sp,vy:rnd(8,50),rot:rnd(0,6),vr:rnd(-1.2,1.2),life:rnd(0.55,0.95),s0:32*k,s1:rnd(75,110)*k,rgb:DUST,k:0.6,drag:3.2}); }
  for(let i=0;i<3;i++) part({puff:(Math.random()*PUFF_N)|0,x:x+rnd(-20,20)*k,y:y+12,vx:rnd(-30,30),vy:rnd(40,90)*k,rot:rnd(0,6),vr:rnd(-0.8,0.8),life:rnd(0.7,1.1),s0:34*k,s1:95*k,rgb:DUST,k:0.32,drag:2});
  for(let i=0;i<5;i++){ const s=Math.random()<0.5?-1:1; part({puff:(Math.random()*PUFF_N)|0,x,y:y+6,vx:s*rnd(80,260)*k,vy:rnd(160,320)*k,rot:0,life:rnd(0.35,0.55),s0:9,s1:6,rgb:[0.38,0.33,0.28],k:0.9,grav:1500}); }
}
function fxDust(x,y){ part({puff:(Math.random()*PUFF_N)|0,x,y:y+10,vx:-P.vx*0.15+rnd(-30,30),vy:rnd(15,45),rot:rnd(0,6),vr:rnd(-1,1),life:rnd(0.45,0.65),s0:18,s1:48,rgb:DUST,k:0.32,drag:2}); }
function fxHurt(x,y){ part({sp:'zap',x,y,rot:rnd(0,6),life:0.2,s0:0.6,s1:0.9,rgb:[1,0.3,0.25],tint:true,k:1.2}); part({sp:'star_b',x,y,life:0.12,s0:0.6,s1:0.9,rgb:[1,0.4,0.3],tint:true,k:1}); }
function fxSpawn(x,y){ part({sp:'ripple',x,y:y+8,life:0.7,s0:0.6,s1:2.2,rgb:[0.4,1,1],k:1}); part({sp:'orb_big',x,y:y+90,life:0.5,s0:1,s1:2.4,rgb:[0.4,0.9,1],k:0.8}); part({sp:'sparks_up2',x,y:y+60,life:0.6,s0:0.9,s1:1.4,rgb:[0.5,1,1],k:1}); }
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
  const px=P.x, py=P.y+85;
  for(const t of targets){
    t.ph+=dt; t.hit=Math.max(0,t.hit-dt);
    if(t.dead>0){ t.dead-=dt; if(t.dead<=0){ t.hp=ENEMY[t.type].hp; t.x=t.bx; t.y=t.by; t.vx=t.vy=0; t.state='idle'; fxSpawn(t.bx,t.by-90);} continue; }
    const E=ENEMY[t.type], dx=px-t.x, dy=py-t.y, d=Math.hypot(dx,dy);
    if(Math.abs(dx)>2600) continue;
    const sees = E.sense>0 && P.dead<=0 && !P.done && d<E.sense*DIFF.sense && lineOfSight(t.x,t.y,px,py);
    t.aggro = sees ? 2.5 : Math.max(0,t.aggro-dt);
    let ax=0, ay=0;
    const hoverX=t.bx+Math.sin(t.ph*0.9)*40, hoverY=t.by+Math.sin(t.ph*1.7)*18;
    if(t.type==='gunner' && t.aggro>0){
      const want=460, nx=dx/(d||1), ny=dy/(d||1), push=(d-want)*2.2;
      ax=nx*push - ny*Math.sin(t.ph*1.3)*180; ay=ny*push + nx*Math.sin(t.ph*1.3)*180 + (py+170-t.y)*1.2;
      if(!sees){ ax+=(px-t.x)*1.5; ay+=(py+120-t.y)*1.5; }
      t.cool-=dt;
      if(t.state==='idle' && t.cool<=0 && sees){ t.state='charge'; t.t=0.55*DIFF.windup; }
      if(t.state==='charge'){ t.t-=dt; if(t.t<=0){ t.state='idle'; t.cool=(1.4+Math.random()*0.7)*DIFF.cool;
          const lead=0.25, tx=px+P.vx*lead, ty=py+P.vy*lead*0.5, a=Math.atan2(ty-t.y,tx-t.x), sp=850*DIFF.bolt;
          ebolts.push({x:t.x,y:t.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:2.4,dmg:10,a});
          part({sp:'star_b',x:t.x,y:t.y,life:0.12,s0:0.5,s1:0.8,rgb:E.col,tint:true,k:1.2}); } }
    } else if(t.type==='charger' && (t.aggro>0 || t.state!=='idle')){
      t.cool-=dt;
      if(t.state==='idle'){ ax=(px-t.x)*1.6; ay=(py+60-t.y)*1.6; if(sees && d<540 && t.cool<=0){ t.state='windup'; t.t=0.55*DIFF.windup; } }
      else if(t.state==='windup'){ t.t-=dt; t.vx*=0.85; t.vy*=0.85; if(t.t<=0){ const a=Math.atan2(dy,dx); t.vx=Math.cos(a)*1250; t.vy=Math.sin(a)*1250; t.state='dash'; t.t=0.55; } }
      else if(t.state==='dash'){ t.t-=dt; if(Math.random()<0.7) part({sp:'wisp',x:t.x,y:t.y,rot:Math.atan2(t.vy,t.vx)+Math.PI,life:0.3,s0:0.5,s1:0.2,rgb:E.col,tint:true,k:0.8});
        if(d<t.r+60 && Math.abs(dy)<95){ hurtPlayer(18,t.x,620); t.state='idle'; t.cool=1.6*DIFF.cool; t.vx*=-0.4; t.vy*=-0.4; }
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
    if(Math.random()<0.6) part({sp:'dot',x:b.x,y:b.y,vx:rnd(-40,40),vy:rnd(-40,40),life:0.3,s0:0.35,s1:0.05,rgb:[1,0.55,0.2],tint:true}); }
  for(let i=ebolts.length-1;i>=0;i--) if(ebolts[i].life<=0) ebolts.splice(i,1);
}
