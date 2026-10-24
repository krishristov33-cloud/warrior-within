// ===================== DRAW =====================
const amb=[];
const CH=TILE.tile8, CHW=16, CHH=404*0.8;
function chain(xa,ya,xb,yb,tint){
  const dx=xb-xa, dy=yb-ya, L=Math.hypot(dx,dy); if(L<1) return; const r=Math.atan2(dy,dx)+Math.PI/2, ux=dx/L, uy=dy/L;
  let d=0; while(d<L){ const seg=Math.min(CHH,L-d), f=seg/CHH; const uv=[CH.uv[0],CH.uv[1],CH.uv[2],CH.uv[1]+(CH.uv[3]-CH.uv[1])*f];
    spr(TX.tiles, uv, xa+ux*d, ya+uy*d, CHW, seg, r, tint, false, 0.5, 1); d+=CHH-2; }
}
function shapesAdditive(on){ R.enableRenderer(R.shapes); if(on) R.shapes.setBlendMode(gl.SRC_ALPHA, gl.ONE, gl.ONE); else R.shapes.setBlendMode(gl.SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA); }
function drawPiece(p,dx,dy,x0,x1,y0,y1,aMul=1){
  const X=p.x+dx+p.ox, T=p.top+dy+p.oy; if(X>x1||X+p.w<x0||T-p.h>y1||T<y0) return;
  const a=p.a*aMul; if(a<=0.01||p.dead) return;
  spr(TX.tiles, TILE[p.n].uv, X, T, p.w, p.h, 0, col(p.tint[0],p.tint[1],p.tint[2],a), p.flip, 0, 1);
}
function draw(dt){
  gl.clearColor(0.05,0.07,0.1,1); gl.clear(gl.COLOR_BUFFER_BIT);
  R.begin(); blend=-1;
  const vw=canvas.width*cam.zoom, vh=canvas.height*cam.zoom, cx=cam.position.x, cy=cam.position.y;
  const x0=cx-vw/2-60, y0=cy-vh/2-60, x1=x0+vw+120, y1=y0+vh+120;
  const now=performance.now()/1000;
  // ---- the painted level (reference plate), chunk by chunk ----
  setBlend(false);
  for(const pl of placements){ if(pl.off>x1||pl.off+pl.w<x0) continue;
    const ua=pl.a/imgPlate.width, ub=pl.b/imgPlate.width, uv=[ua,0,ub,1];
    if(!pl.seam) quadA(TX.plate,uv,pl.off,0,pl.off+pl.w,REF_H,[1,1,1,1],pl.m);
    else { // cross-fade the first SEAM px
      const f=SEAM/pl.w, us=pl.m? [ub-(ub-ua)*f, 0, ub, 1] : [ua,0,ua+(ub-ua)*f,1], ur=pl.m? [ua,0,ub-(ub-ua)*f,1] : [ua+(ub-ua)*f,0,ub,1];
      quadA(TX.plate,us,pl.off,0,pl.off+SEAM,REF_H,[0,0,1,1],pl.m); quadA(TX.plate,ur,pl.off+SEAM,0,pl.off+pl.w,REF_H,[1,1,1,1],pl.m); }
  }
  // painted crystals glow
  for(const g of glows){ if(g.x<x0||g.x>x1) continue; const k=Math.max(0,Math.sin(now*1.3+g.ph*3)); if(k>0.9) fx('twinkle',g.x+Math.sin(g.ph)*14,g.y+10,0.35*k,0,[0.7,1,1],(k-0.9)*9); }
  // ---- hanging platforms ----
  setBlend(false);
  const chainTint=new spine.Color(0.92,0.9,0.92,1);
  for(const s of swings){ if(s.cx<x0-400||s.cx>x1+400) continue;
    for(let i=0;i<s.anc.length;i++){ const a=R2(s.rot,s.att[i]); chain(s.anc[i][0],s.anc[i][1]+40,s.cx+a[0],s.cy+a[1],chainTint); }
    spr(TX.ref,RSP[s.spr].uv,s.cx,s.cy,s.w,s.h,s.rot,WHITE,s.m,s.pfx,s.pfy); }
  for(const p of pieces) if(p.layer==='game') drawPiece(p,0,0,x0,x1,y0,y1);
  for(const d of debris){ spr(TX.tiles,d.uv,d.x,d.y,d.w,d.h,d.rot,col(1,1,1,clamp(d.life*1.5,0,1)),d.flip); }
  // checkpoints, chests, relic
  for(const cp of checkpoints){ if(cp.x<x0-300||cp.x>x1+300) continue; const [w,h]=tileSize('tile57',0.42);
    setBlend(false); spr(TX.tiles,TILE.tile57.uv,cp.x,cp.y+h-8,w,h,0,cp.on?WHITE:col(0.5,0.55,0.62,1),false,0.5,1);
    if(cp.on){ fx('orb_s',cp.x,cp.y+60,1.0+0.1*Math.sin(now*3),0,[0.3,0.9,1],0.35); fx('twinkle',cp.x+12,cp.y+110,0.4+0.25*Math.sin(now*4),0,[0.6,1,1],0.9); } }
  for(const ch of chests){ if(ch.x<x0-300||ch.x>x1+300) continue;
    if(!ch.painted){ const [w,h]=tileSize('tile10',0.55); setBlend(false); spr(TX.tiles,TILE.tile10.uv,ch.x,ch.y+h-4,w,h,0,ch.open?col(0.55,0.55,0.6,1):WHITE,false,0.5,1); }
    if(!ch.open){ fx('orb_s',ch.x,ch.y+40,1.1+0.2*Math.sin(now*3.3),0,[0.3,0.9,1],0.45); fx('star4',ch.x+22,ch.y+80,0.25+0.12*Math.sin(now*5),now,[0.7,1,1],0.9); } }
  if(RELIC.x>x0-600&&RELIC.x<x1+600){ const [w,h]=tileSize('tile59',0.42);
    shapesAdditive(true); const c1=col(0.4,0.9,1,RELIC.taken?0.04:0.16), c2=new spine.Color(0.4,0.9,1,0);
    R.quad(true,RELIC.x-60,RELIC.y,RELIC.x+60,RELIC.y,RELIC.x+180,RELIC.y+1100,RELIC.x-180,RELIC.y+1100,c1,c1,c2,c2); shapesAdditive(false);
    setBlend(false); spr(TX.tiles,TILE.tile59.uv,RELIC.x,RELIC.y+h-10,w,h,0,WHITE,false,0.5,1);
    if(!RELIC.taken){ fx('orb_s',RELIC.x,RELIC.y+70,1.0+0.12*Math.sin(now*2),0,[0.3,0.9,1],0.45); fx('star4',RELIC.x,RELIC.y+110,0.5+0.15*Math.sin(now*3),now*0.6,[0.7,1,1],0.9); } }
  // crystals
  for(const c of crystals){ if(c.taken||c.x<x0||c.x>x1||c.y<y0||c.y>y1) continue;
    const bob=c.mag?0:Math.sin(c.ph*2.2)*8, sxs=Math.abs(Math.cos(c.ph*1.6))*0.8+0.2;
    fx('orb_s',c.x,c.y+bob,0.5,0,[0.25,0.85,1],0.35); fx('diamond',c.x,c.y+bob,0.5,0,[0.75,1,1],1.25,false,false,0.5,0.5,sxs);
    if(Math.sin(c.ph*3+c.x)>0.97) fx('twinkle',c.x+10,c.y+bob+14,0.3,0,[0.8,1,1],1); }
  // enemies: drone sprite (faces right) + rotor blur, eye glow, thruster haze, hit flash
  for(const t of targets){ if(t.dead>0||t.x<x0-200||t.x>x1+200) continue;
    const E=ENEMY[t.type], alert=t.aggro>0, charging=t.state==='charge'||t.state==='windup', k=charging?1-t.t/0.55:0;
    let x=t.x, y=t.y+Math.sin(t.ph*3.1)*4; if(t.state==='windup'){ x+=(Math.random()-0.5)*6; y+=(Math.random()-0.5)*6; }
    // face the player when alert, else the way it drifts
    if(alert) t.face=P.x>t.x?1:-1; else if(Math.abs(t.vx)>25) t.face=Math.sign(t.vx); const f=t.face||1;
    const rot=clamp(-t.vx*0.0009,-0.35,0.35)+Math.sin(t.ph*1.9)*0.04 + (t.state==='dash'?0:0);
    const W=t.r*3.1*(E.dscale||1), H=W*165/202, zs=W/130, c=Math.cos(rot), s=Math.sin(rot);
    const at=(u,v)=>{ const dx=(u-0.5)*W*f, dy=(0.42-v)*H; return [x+c*dx-s*dy, y+s*dx+c*dy]; };   // sprite fraction (u from left, v from top) -> world
    const eyeCol=[lerp(0.35,E.col[0],alert?1:0),lerp(0.95,E.col[1],alert?1:0),lerp(1,E.col[2],alert?1:0)];
    // downdraft haze under the rotors
    const [hx,hy]=at(0.5,1.0); fx('jet2',hx,hy+4,(0.22+0.03*Math.sin(t.ph*20))*zs,Math.PI,[0.45,0.8,1],0.14,true,false,0.5,1);
    fx('orb_soft',x,y,(t.r/40)*(alert?0.75:0.6),0,eyeCol,alert?0.3:0.16,true);
    if(t.state==='dash') fx('ribbon',x,y,0.6*zs,Math.atan2(t.vy,t.vx)+Math.PI,E.col,0.8,true,false,0.05,0.5);
    // hit: tint the body red (darken green/blue, then add a red glow masked by the sprite's alpha)
    const hk=t.hit>0?Math.min(1,t.hit/0.08):0;
    setBlend(false); spr(TX.drone,[0,0,1,1],x,y,W,H,rot,hk?col(1,1-0.6*hk,1-0.65*hk,1):WHITE,f<0,0.5,0.58);
    if(hk){ setBlendAddA(); spr(TX.drone,[0,0,1,1],x,y,W,H,rot,col(0.75*hk,0.08*hk,0.04*hk,1),f<0,0.5,0.58); }
    // spinning rotor blur over both discs
    for(const [u,v,ph] of [[0.22,0.12,0],[0.79,0.18,1.7]]){ const [rx,ry]=at(u,v), sp=t.ph*38+ph;
      fx('ring1',rx,ry,W/330,rot,[0.8,0.95,1],0.22,true,false,0.5,0.5,1.0);
      fx('streak',rx,ry,W/420,rot+(Math.sin(sp)>0?0:Math.PI),[0.85,0.95,1],0.35,true,false,0.5,0.5,Math.abs(Math.cos(sp))*0.9+0.1); }
    // eye: steady glow, brightening while it winds up a shot / dash
    const [ex,ey]=at(0.69,0.46), pulse=0.6+0.4*Math.sin(t.ph*6);
    fx('orb_s',ex,ey,W/300*(1+0.25*pulse),0,eyeCol,alert?0.9:0.55,true);
    if(charging){ fx('orb_m',ex,ey,(0.35+k*0.9)*zs,0,E.col,0.4+0.6*k,true); fx('twinkle',ex,ey,(0.25+k*0.5)*zs,k*3,E.col,k,true); }
    for(let i=0;i<E.hp;i++) R.rect(true,x-E.hp*4.5+i*9,y-H*0.62-4,7,3,i<t.hp?col(0.3,1,0.8,1):col(0.3,0.3,0.3,1));
  }
  for(const b of ebolts){ fx('fireball',b.x,b.y,0.12,b.a,[1,0.5,0.18],1.3,true,true,0.85,0.5); fx('orb_s',b.x,b.y,0.18,0,[1,0.6,0.2],0.75,true); }
  // player
  sk.color.a = (P.inv>0 && P.dead<=0) ? (Math.floor(performance.now()/70)%2?0.35:1) : 1;
  R.drawSkeleton(sk,charAtlas.pages[0].pma); blend=-1;
  for(const b of bullets){ const ba=Math.atan2(b.vy,b.vx), Lt=Math.min(170,(0.8-b.life)*3000+40);   // rifle tracer: long thin streak, hot head
    gshape(0,b.x,b.y,Lt,9,ba,[1,0.5,0.12],0.9,1); gshape(0,b.x,b.y,Lt*0.6,3.5,ba,[1,0.92,0.7],1,1); fx('orb_s',b.x,b.y,0.12,0,[1,0.7,0.3],0.9,true); }
  for(const p of parts){ if(p.x<x0-300||p.x>x1+300||p.y<y0-300||p.y>y1+300) continue;
    const t=1-p.life/p.max, s=lerp(p.s0,p.s1,t);
    if(p.gs!==undefined){ const r=p.line?Math.atan2(p.vy,p.vx):p.rot; gshape(p.gs,p.x,p.y,s,p.w,r,p.rgb,p.k*Math.max(0,p.life/p.max),p.px??0.5); continue; }
    if(p.puff!==undefined){ puff(p.puff,p.x,p.y,s,p.rot,p.rgb,p.k*Math.min(1,t*7)*Math.pow(Math.max(0,1-t),1.4)); continue; }
    const a=p.k*Math.pow(Math.max(0,p.life/p.max),0.6);
    fx(p.sp,p.x,p.y,s,p.rot,p.rgb,a,p.tint,p.flipX,p.px??0.5,p.py??0.5,p.sx??1); }
  // ambient embers & motes
  if(amb.length<160){ for(let i=0;i<2;i++){ const ember=Math.random()<0.6;
    amb.push({x:rnd(x0,x1), y:ember?rnd(0,REF_H*0.35):rnd(y0,y1), vx:rnd(-20,20), vy:ember?rnd(40,110):rnd(-15,15), life:rnd(3,6), max:6, ember, ph:rnd(0,6)}); } }
  for(const a of amb){ a.life-=dt; a.x+=(a.vx+Math.sin(now*1.3+a.ph)*25)*dt; a.y+=a.vy*dt; const k=Math.min(1,a.life)*Math.min(1,(a.max-a.life));
    if(a.ember) fx('dot',a.x,a.y,0.18,0,[1,0.55,0.2],0.9*k,true); else fx('dot',a.x,a.y,0.13,0,[0.5,1,1],0.6*k); }
  for(let i=amb.length-1;i>=0;i--) if(amb[i].life<=0||amb[i].x<x0-400||amb[i].x>x1+400) amb.splice(i,1);
  // foreground
  setBlend(false);
  for(const p of pieces) if(p.layer==='fgs') drawPiece(p,0,0,x0,x1,y0,y1);
  for(const p of pieces) if(p.layer==='fg') drawPiece(p,cx*(1-p.par),cy*(1-p.par),x0,x1,y0,y1);
  // crosshair
  const zs=cam.zoom*(canvas.height/canvas.clientHeight), g=(6+P.recoil*8)*zs, cc=new spine.Color(0.6,1,1,0.95);
  fx('orb_s',M.wx,M.wy,0.5*zs,0,[0.4,1,1],0.35);
  R.circle(false,M.wx,M.wy,(13+P.recoil*6)*zs,cc,24); const L=12*zs, w=2*zs;
  R.rectLine(true,M.wx-g-L,M.wy,M.wx-g,M.wy,w,cc); R.rectLine(true,M.wx+g,M.wy,M.wx+g+L,M.wy,w,cc);
  R.rectLine(true,M.wx,M.wy-g-L,M.wx,M.wy-g,w,cc); R.rectLine(true,M.wx,M.wy+g,M.wx,M.wy+g+L,w,cc);
  if(DEBUG){ const c1=new spine.Color(0,1,0,1), c2=new spine.Color(1,0,0,0.8), c3=new spine.Color(1,0,1,0.9);
    for(const s of surfaces){ if(!s.on||(s.piece&&s.piece.dead)) continue; for(let i=0;i<s.pts.length-1;i++) R.rectLine(true,s.pts[i][0],s.pts[i][1],s.pts[i+1][0],s.pts[i+1][1],3,c1); }
    for(const l of ladders) R.rect(false,l.x-20,l.bot,40,l.top-l.bot,c3);
    for(const r of solids) if(r.on) R.rect(false,r.x,r.y,r.w,r.h,c2);
    R.rect(false,P.x-P.w/2,P.y,P.w,P.h,c2); }
  R.end();
}
