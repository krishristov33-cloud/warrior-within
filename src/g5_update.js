// ===================== UPDATE =====================
let cur='idle_aim', curEntry=st.getCurrent(0);
function play(name, loop=true){ if(cur===name) return curEntry; cur=name; curEntry=st.setAnimation(0,name,loop); return curEntry; }
const cam = R.camera; let camX=SPAWN.x+600, camY=REF_H/2;
function screenToWorld(sx,sy){ const v=new spine.Vector3(sx,sy,0); cam.screenToWorld(v, canvas.clientWidth, canvas.clientHeight); return v; }
let toastT=0;
function toast(text,t=3.2){ const el=hud('toast'); el.textContent=text; el.classList.add('on'); toastT=t; }

function updateWorld(dt){
  // chain platforms
  for(const s of swings){
    s.occupied = P.ground && P.gs===s.surf;
    const g=2150/s.L;
    s.om += (-g*Math.sin(s.th) - 0.35*s.om)*dt;
    if(s.occupied){ const inX=(K.d||K.arrowright?1:0)-(K.a||K.arrowleft?1:0); s.om -= inX*0.35*dt*(s.heavy?0.5:1); }
    s.th += s.om*dt;
    const tgt = s.occupied ? (s.heavy?-42:-28) : 0;
    s.dipV += (-(s.heavy?90:140)*(s.dip-tgt) - 9*s.dipV)*dt; s.dip += s.dipV*dt;
    s.rot = s.heavy ? clamp(s.th*0.85 + Math.sin(performance.now()/900+s.ax)*0.015,-0.35,0.35) : 0;
    placeSwing(s,dt);
  }
  // crumbling platforms
  for(const b of breakables){
    if(b.state==='shake'){ b.t-=dt; b.p.ox=(Math.random()-0.5)*7; b.p.oy=(Math.random()-0.5)*4;
      if(Math.random()<0.3) part({sp:'smoke2',x:b.p.x+rnd(0,b.p.w),y:b.p.top-b.p.h*0.6,vx:rnd(-20,20),vy:-rnd(30,80),rot:rnd(0,6),life:0.6,s0:0.2,s1:0.5,rgb:[0.75,0.68,0.55],tint:true,k:0.35});
      if(b.t<=0){ b.state='broken'; b.t=b.respawn; b.p.dead=true; b.p.ox=b.p.oy=0; fxCrumble(b.p); shake=Math.min(shake+5,10); if(P.gs&&P.gs.piece===b.p){P.ground=false;P.gs=null;} } }
    else if(b.state==='broken'){ b.t-=dt; if(b.t<=0){ b.state='return'; b.t=0.6; b.p.dead=false; b.p.a=0; } }
    else if(b.state==='return'){ b.t-=dt; b.p.a=1-Math.max(0,b.t/0.6); if(b.t<=0){ b.state='idle'; b.p.a=1; } }
  }
  for(const d of debris){ d.vy-=G*0.8*dt; d.x+=d.vx*dt; d.y+=d.vy*dt; d.rot+=d.vr*dt; d.life-=dt; }
  for(let i=debris.length-1;i>=0;i--) if(debris[i].life<=0) debris.splice(i,1);
  for(const w of walls) w.hit=Math.max(0,w.hit-dt);
  // secrets
  for(const s of secrets){ const inside = P.x>s.x && P.x<s.x+s.w && P.y+40>s.y && P.y<s.y+s.h+40;
    if(inside && !s.found){ s.found=true; P.secrets++; toast('✦ Secret area discovered'); fxSparkle(P.x,P.y+120*HERO,true); } }
  // crystals
  for(const c of crystals){ if(c.taken) continue; c.ph+=dt;
    const dx=P.x-c.x, dy=P.y+80*HERO-c.y, d=Math.hypot(dx,dy);
    if(d<150 && P.dead<=0) c.mag=true;
    if(c.mag){ const sp=Math.max(500,1600-d*4); c.x+=dx/(d||1)*sp*dt; c.y+=dy/(d||1)*sp*dt; }
    if(d<40 && P.dead<=0){ c.taken=true; P.gems++; fxSparkle(c.x,c.y); }
  }
  for(const ch of chests){ if(ch.open) { ch.t+=dt; continue; }
    if(Math.abs(P.x-ch.x)<80 && Math.abs(P.y-ch.y)<90 && P.dead<=0){ ch.open=true; P.treasures++;
      for(let i=0;i<8;i++){ crystals.push({x:ch.x,y:ch.y+80,bx:0,by:0,taken:false,ph:0,mag:false,burst:{vx:rnd(-400,400),vy:rnd(500,900)},t:0}); }
      fxSparkle(ch.x,ch.y+90,true); fxExplode(ch.x,ch.y+90,[0.45,1,0.95],0.7); toast('✦ '+ch.name+' found!  +8 crystals'); } }
  for(const c of crystals){ if(c.burst){ c.t+=dt; if(c.t<0.45){ c.x+=c.burst.vx*dt; c.y+=c.burst.vy*dt; c.burst.vy-=2400*dt; c.mag=false; } else c.mag=true; } }
  for(const cp of checkpoints){ cp.t+=dt; if(!cp.on && Math.abs(P.x-cp.x)<120 && Math.abs(P.y-cp.y)<200 && P.dead<=0){
      cp.on=true; P.cp={x:cp.x,y:cp.y}; for(const o of checkpoints) if(o!==cp && o.x<cp.x) o.on=true; toast('Checkpoint reached'); fxSpawn(cp.x,cp.y); } }
  for(const h of hints){ if(!h.shown && P.x>h.x0 && P.x<h.x1 && P.y>h.ymin && P.y<h.ymax && P.dead<=0){ h.shown=true; toast(h.text,5); } }
  if(!RELIC.taken && Math.abs(P.x-RELIC.x)<110 && Math.abs(P.y-RELIC.y)<150 && P.dead<=0){ RELIC.taken=true; P.done=true; fxExplode(RELIC.x,RELIC.y+120,[0.5,1,1],1.4); fxSparkle(RELIC.x,RELIC.y+120,true); finish(); }
  toastT-=dt; if(toastT<=0) hud('toast').classList.remove('on');
}
function finish(){
  const t=P.time, m=Math.floor(t/60), s=Math.floor(t%60).toString().padStart(2,'0');
  hud('endstats').innerHTML=`Time <b>${m}:${s}</b><br>Crystals <b>${P.gems} / ${totalCrystals}</b><br>Treasures <b>${P.treasures} / ${chests.length}</b><br>Secrets <b>${P.secrets} / ${secrets.length}</b><br>Drones destroyed <b>${P.score}</b>`;
  hud('end').style.display='grid';
}

function update(dt){
  if(!P.done) P.time+=dt;
  const alive = P.dead<=0 && !P.done;
  const left = K.a||K.arrowleft, right=K.d||K.arrowright;
  const inX = alive ? (right?1:0)-(left?1:0) : 0;
  const down = alive && (K.s||K.arrowdown);
  P.crouch = down && P.ground && !P.climb;
  const jetBtn = alive && M.r;
  if(!alive) P.buf=0;
  if(TOUCH.active){ M.wx=P.x+TOUCH.ax*520; M.wy=P.y+95*HERO+TOUCH.ay*520; } else { const mw=screenToWorld(M.x,M.y); M.wx=mw.x; M.wy=mw.y; }
  // the mouse alone decides which way the warrior faces
  if(alive){ const cxp=P.x; if(M.wx < cxp-4) P.face=-1; else if(M.wx > cxp+4) P.face=1; }
  updateWorld(dt);
  // ---- ladders ----
  const upK=alive&&(K.w||K.arrowup), dnK=alive&&(K.s||K.arrowdown);
  let lad=null; for(const l of ladders){ if(Math.abs(P.x-l.x)<34 && P.y>=l.bot-30 && P.y<=l.top+14){ lad=l; break; } }
  if(lad && (K.w||K.arrowup) && !K[' ']) P.buf=0;              // W at a ladder climbs instead of jumping
  if(!P.climb && lad && alive && P.flip<=0 && ((upK && P.y<lad.top-4) || (dnK && P.y>lad.bot+4 && !(P.ground&&P.y<lad.top-30)))){
    P.climb=lad; P.ground=false; P.gs=null; P.vx=0; P.vy=0; P.dbl=false; P.drop=0.2; }
  if(P.climb){ const l=P.climb;
    P.x=lerp(P.x,l.x,Math.min(1,dt*16)); P.vx=0; P.vy=((upK?1:0)-(dnK?1:0))*330; P.fuel=Math.min(1,P.fuel+FUEL_REGEN*dt);
    if(P.y>=l.top-1 && !dnK){ let ty=l.top+2; for(const sf of surfaces){ if(!sf.on) continue; const sy=surfY(sf,l.x); if(sy!==null && sy>=l.top-12 && sy<=l.top+50) ty=Math.max(ty,sy); }
      P.y=ty; P.vy=0; P.climb=null; P.ground=true; P.drop=0; }
    else if(P.y<=l.bot && dnK){ P.climb=null; P.drop=0; }
    else if(inX && !upK && !dnK){ P.climb=null; P.vx=inX*200; }
    if(P.climb && P.buf>0){ P.climb=null; P.buf=0; P.vy=JUMP*0.85; P.vx=inX*RUN*0.7; }
    if(P.climb) P.y=clamp(P.y,l.bot-2,l.top+2);
  }
  const maxv = P.crouch?WALK*0.6 : K.shift?RUN:WALK;   // walk by default, hold Shift to run
  if(P.climb){ moveAndCollide(dt); }
  else {
  if(P.ground){
    if(inX){ const d=inX*maxv-P.vx; P.vx += Math.sign(d)*Math.min(Math.abs(d),ACC_G*dt); }
    else { const s=Math.sign(P.vx); P.vx -= s*Math.min(Math.abs(P.vx),FRIC*dt); }
  } else { if(inX && inX*P.vx < RUN) P.vx += inX*ACC_A*dt; P.vx -= P.vx*0.12*dt; }
  P.coyote = P.ground?0.09:Math.max(0,P.coyote-dt); P.buf=Math.max(0,P.buf-dt); P.drop=Math.max(0,P.drop-dt);
  if(P.buf>0){
    if(down && P.ground && P.gs && !lad){ P.drop=0.22; P.ground=false; P.gs=null; P.buf=0; P.vy=-120; }
    else if(P.coyote>0){ P.vy=JUMP + (P.gs&&P.gs.vy>0?P.gs.vy*0.4:0); P.ground=false; P.gs=null; P.coyote=0; P.buf=0; P.dbl=false; fxLand(P.x,P.y,0.8); }
    else if(!P.dbl && !jetBtn){ P.vy=Math.max(P.vy,DJUMP); P.dbl=true; P.buf=0; P.flip=0.55; play('double_jump',false);
      fxAirKick(P.x,P.y+10); }
  }
  P.jet=false;
  if(jetBtn && P.fuel>0.001 && P.flip<=0){ P.jet=true; P.fuel=Math.max(0,P.fuel-FUEL_USE*dt); P.vy += JET*dt; P.vx += inX*JET_X*dt; P.ground=false; P.gs=null; }
  if(P.ground && !P.jet) P.fuel=Math.min(1,P.fuel+FUEL_REGEN*dt);
  P.vy -= G*dt;
  P.vx=clamp(P.vx,-MAXVX,MAXVX); P.vy=clamp(P.vy,-MAXDOWN,MAXUP);
  P.h = (P.crouch?100:140)*HERO;
  moveAndCollide(dt);
  if(P.ground) P.dbl=false;
  if(P.ground && P.gs && !P.gs.dyn && !(P.gs.piece&&P.gs.piece.brk)) P.safe={x:P.x,y:P.y};
  if(P.y < KILL_Y){ if(P.dead<=0){
      if(DIFF.pit>=0 && P.safe && P.hp>DIFF.pit){ P.hp-=DIFF.pit; P.regenT=DIFF.regenDelay; Object.assign(P,{x:P.safe.x,y:P.safe.y+4,vx:0,vy:0,inv:1.2,gs:null,climb:null}); P.hurtFlash=1; fxSpawn(P.x,P.y); toast('Fell — returned to safe ground (−'+DIFF.pit+' HP)',2); }
      else { P.hp=0; die(); } }
    if(P.dead>0){ P.vy=0; P.y=KILL_Y; } }
  if(P.ground && Math.abs(P.vx)>300){ P.stepT-=dt; if(P.stepT<=0){ P.stepT=0.15; fxDust(P.x-P.face*10,P.y); } }
  }

  P.flip=Math.max(0,P.flip-dt); P.land=Math.max(0,P.land-dt); P.cool=Math.max(0,P.cool-dt);
  P.recoil=Math.max(0,P.recoil-dt*9); P.flash=Math.max(0,P.flash-dt);
  if(P.reload>0){ P.reload-=dt; if(P.reload<=0){P.reload=0;P.ammo=30;} }
  if(M.l && alive && P.cool<=0 && P.ammo>0 && P.reload<=0 && P.flip<=0) fire();
  P.inv=Math.max(0,P.inv-dt); P.hurtFlash=Math.max(0,P.hurtFlash-dt*2.5);
  if(alive){ P.regenT-=dt; if(P.regenT<=0 && P.hp<100) P.hp=Math.min(100,P.hp+DIFF.regen*dt); }
  else if(P.dead>0){ P.dead-=dt; if(P.dead<=0) respawn(); }

  // ---- base animation ----
  const speed=Math.abs(P.vx), back=P.vx*P.face<-20;
  if(P.dead>0){} else if(P.climb){ play('walk'); } else if(P.flip>0){}
  else if(!P.ground){ if(P.jet||P.vy>120) play('jump_rise'); else play('fall'); }
  else if(P.land>0 && speed<200) play('land',false);
  else if(P.crouch) play('crouch_idle');
  else if(speed<35) play(P.done?'victory':'idle_aim', !P.done);
  else if(speed<300) play('walk'); else play('run');
  if(P.climb && curEntry){ curEntry.timeScale=Math.abs(P.vy)/260; }
  else if(curEntry && (cur==='walk'||cur==='run')){
    const rate = cur==='run'? speed/RUN : speed/WALK;
    if(back){ curEntry.timeScale=0; const d=curEntry.animation.duration; curEntry.trackTime=((curEntry.trackTime - dt*rate*0.85)%d+d)%d; }
    else curEntry.timeScale=Math.max(0.5,rate);
  } else if(curEntry) curEntry.timeScale=1;

  // ---- skeleton + aim ----
  sk.scaleX=P.face; sk.x=P.x; sk.y=P.y-FOOT-SINK;
  st.update(dt); st.apply(sk);
  const piv={x:bGun.worldX||P.x, y:bGun.worldY||P.y+90*HERO};
  let dx=(M.wx-piv.x)*P.face, dy=M.wy-piv.y;
  let th=Math.atan2(dy,Math.max(dx,4))*180/Math.PI; th=clamp(th,-78,82);
  const lock = P.flip>0 || P.reload>0 || P.dead>0 || P.done;
  if(!lock){
    const up=th>0?clamp(th/AIM_UP_ANG,0,1):0, dn=th<0?clamp(th/AIM_DN_ANG,0,1):0;
    if(up>0) AIM_UP.apply(sk,0,0,false,null,up,spine.MixBlend.replace,spine.MixDirection.mixIn);
    if(dn>0) AIM_DN.apply(sk,0,0,false,null,dn,spine.MixBlend.replace,spine.MixDirection.mixIn);
    bHead.rotation += clamp((th-clamp(th,AIM_DN_ANG,AIM_UP_ANG))*0.3,-15,15);   // past the authored poses, just tilt the head
    bGun.rotation = th + 7*P.recoil - bHip.rotation - bChest.rotation;
    const gr=bGun.rotation*Math.PI/180, k=4.5*P.recoil; bGun.x -= Math.cos(gr)*k; bGun.y -= Math.sin(gr)*k;
  }
  flashSlot.setAttachment(null);
  sk.updateWorldTransform(spine.Physics.update);
  P.aimWorld = lock ? bMuzzle.getWorldRotationX()*Math.PI/180 : (P.face>0 ? th*Math.PI/180 : Math.PI - th*Math.PI/180);

  // jet flame: boot thrusters. Nozzles are read from the rendered boot meshes every frame:
  // sole centre = the boot's bottom vertices, flame direction = from the ankle vertices out through the sole.
  if(P.jet){
    let sx=0, sy=0;
    for(const B of BOOTS){
      const n=B.at.worldVerticesLength; B.at.computeWorldVertices(B.slot,0,n,B.buf,0,2);
      let ax=0,ay=0,ux=0,uy=0; for(const i of B.sole){ ax+=B.buf[i]; ay+=B.buf[i+1]; } ax/=B.sole.length; ay/=B.sole.length;
      for(const i of B.up){ ux+=B.buf[i]; uy+=B.buf[i+1]; } ux/=B.up.length; uy/=B.up.length;
      let dx=ax-ux, dy=ay-uy; const L=Math.hypot(dx,dy)||1; dx/=L; dy/=L;
      const rot=Math.atan2(dx,-dy) - P.face*0.12, nx=ax+dx*2, ny=ay+dy*2;
      sx+=nx; sy+=ny;
      part({sp:pick(['jet1','jet2']),x:nx,y:ny,vx:P.vx,vy:P.vy,rot:rot+rnd(-0.06,0.06),life:0.06,s0:0.3,s1:0.24,rgb:[0.55,1,1],py:0.95,k:1.1,sx:0.5});
      part({sp:'orb_s',x:nx,y:ny,vx:P.vx,vy:P.vy,life:0.05,s0:0.3,s1:0.26,rgb:[0.7,1,1],k:0.9});
      if(Math.random()<0.45) part({sp:'dot',x:nx,y:ny-8,vx:Math.sin(rot)*rnd(250,500)+rnd(-40,40),vy:-Math.cos(rot)*rnd(250,500),life:0.3,s0:0.22,s1:0.04,rgb:[0.6,1,1],drag:1});
    }
    if(Math.random()<0.6) part({sp:pick(['smoke_t1','smoke_t2','wisp']),x:sx/2,y:sy/2-70,vx:rnd(-50,50),vy:-rnd(120,220),rot:rnd(-2,2),vr:rnd(-2,2),life:rnd(0.5,0.8),s0:0.2,s1:0.5,rgb:[0.6,0.75,0.9],tint:true,k:0.24});
  }
  // bullets
  for(const b of bullets){ b.life-=dt;
    for(let i=0;i<4&&b.life>0;i++){ const px=b.x, py=b.y; b.x+=b.vx*dt/4; b.y+=b.vy*dt/4;
      if(pointSolid(b.x,b.y) || floorHit(px,py,b.x,b.y)){ b.life=0; fxImpact(b.x,b.y,b.ang); break; }
      for(const t of targets){ if(t.dead<=0 && Math.hypot(b.x-t.x,b.y-t.y)<t.r+6){ b.life=0; t.hp--; t.hit=0.16; t.aggro=2.5; t.vx+=b.vx*0.04; t.vy+=b.vy*0.04; if(t.state==='windup') t.t+=0.12;
          fxImpact(b.x,b.y,b.ang);
          if(t.hp<=0){ t.dead=4; P.score++; fxBlast(t.x,t.y,0.8); } break; } }
    }
  }
  for(let i=bullets.length-1;i>=0;i--) if(bullets[i].life<=0) bullets.splice(i,1);
  updateEnemies(dt);
  for(const p of parts){ p.life-=dt; p.vy-=p.grav*dt; if(p.drag){ p.vx-=p.vx*p.drag*dt; p.vy-=p.vy*p.drag*dt; } p.x+=p.vx*dt; p.y+=p.vy*dt; p.rot+=p.vr*dt;
    if(p.shell && pointSolid(p.x,p.y)){ p.vy=Math.abs(p.vy)*0.35; p.vx*=0.6; } }
  for(let i=parts.length-1;i>=0;i--) if(parts[i].life<=0) parts.splice(i,1);
  if(parts.length>1400) parts.splice(0,parts.length-1400);

  // camera
  const lookX=clamp((M.wx-P.x)*0.3,-320,320), lookY=clamp((M.wy-P.y-80*HERO)*0.25,-200,200);
  camX += (P.x+lookX-camX)*Math.min(1,dt*6); camY += (P.y+90*HERO+lookY-camY)*Math.min(1,dt*6);
  { const vw=canvas.width*cam.zoom, vh=canvas.height*cam.zoom;
    camX=clamp(camX, vw/2, Math.max(vw/2, LEVEL_W-vw/2)); camY = vh>=REF_H-1 ? REF_H/2 : clamp(camY, vh/2, REF_H-vh/2); }
  if(window.__camOv){ camX=window.__camOv[0]; camY=window.__camOv[1]; }
  shake=Math.max(0,shake-dt*40);
  cam.position.x=camX+(Math.random()-0.5)*shake; cam.position.y=camY+(Math.random()-0.5)*shake; cam.update();

  hud('fuel').style.width=(P.fuel*100)+'%'; hud('fuel').classList.toggle('low',P.fuel<0.2);
  hud('hp').style.width=P.hp+'%'; hud('hp').classList.toggle('low',P.hp<30);
  hud('ammo').textContent = P.reload>0 ? 'RELOAD' : P.ammo;
  hud('gems').textContent = P.gems; hud('treas').textContent = `${P.treasures}/${chests.length}`; hud('kills').textContent=P.score;
  hud('vign').style.opacity=Math.max(P.hurtFlash*0.9, P.hp<30&&P.dead<=0?0.25+0.15*Math.sin(performance.now()/180):0, P.dead>0?0.6:0);
  hud('dead').style.display=P.dead>0?'grid':'none';
}
