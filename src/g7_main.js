// ===================== MAIN LOOP =====================
let last=performance.now(), fpsT=0, fpsN=0, paused=true;
function setPause(v){ paused=v; document.body.classList.toggle('paused',v); hud('ptitle').textContent=started?'PAUSED':'CHOOSE DIFFICULTY'; hud('resume').style.display=started?'':'none'; hud('pause').style.display=paused?'grid':'none'; if(paused){ M.l=M.r=false; for(const k in K) K[k]=false; } }
let started=false;
function startGame(n){ setDifficulty(n); started=true; setPause(false); }
addEventListener('keydown',e=>{ if(e.key==='Escape' && !P.done && started){ e.preventDefault(); setPause(!paused); }
  if(paused && ['1','2','3'].includes(e.key)) startGame(['easy','normal','hard'][+e.key-1]); });
document.querySelectorAll('[data-diff]').forEach(b=>b.addEventListener('click',ev=>{ ev.stopPropagation(); startGame(b.dataset.diff); }));
hud('resume').addEventListener('click',()=>{ if(started) setPause(false); });
{ let saved='normal'; try{ saved=localStorage.getItem('w2_diff')||'normal'; }catch(e){} setDifficulty(DIFFS[saved]?saved:'normal'); }
hud('ptitle').textContent='CHOOSE DIFFICULTY'; hud('resume').style.display='none'; hud('pause').style.display='grid'; document.body.classList.add('paused');

// ===================== MOBILE / TOUCH CONTROLS =====================
const IS_TOUCH = /[?&#]mobile/.test(location.href) || (('ontouchstart' in window || navigator.maxTouchPoints>0) && matchMedia('(pointer:coarse)').matches);
const TOUCH = {active:IS_TOUCH, aim:false, ax:1, ay:0};
if(IS_TOUCH){
  document.body.classList.add('touch');
  VIEW_H = 1000;
  hud('help').style.display='none';
  const tc=hud('tc');
  // left stick: move / crouch / ladders
  const stick=(el,knob,onMove,onEnd)=>{ let id=null, cx=0, cy=0; const R0=56;
    const set=(x,y)=>{ let dx=x-cx, dy=y-cy; const L=Math.hypot(dx,dy); if(L>R0){ dx*=R0/L; dy*=R0/L; } knob.style.transform=`translate(${dx}px,${dy}px)`; onMove(dx/R0,dy/R0); };
    el.addEventListener('pointerdown',e=>{ e.preventDefault(); if(id!==null) return; id=e.pointerId; el.setPointerCapture(id); const r=el.getBoundingClientRect(); cx=r.left+r.width/2; cy=r.top+r.height/2; set(e.clientX,e.clientY); });
    el.addEventListener('pointermove',e=>{ if(e.pointerId===id) set(e.clientX,e.clientY); });
    const end=e=>{ if(e.pointerId!==id) return; id=null; knob.style.transform=''; onEnd(); };
    el.addEventListener('pointerup',end); el.addEventListener('pointercancel',end); };
  stick(hud('stickL'),hud('knobL'),(x,y)=>{ if(paused) return; K.a=x<-0.35; K.d=x>0.35; const up=y<-0.55, dn=y>0.55; if(up&&!K.w&&!P.climb){} K.w=up; K.s=dn; },()=>{ K.a=K.d=K.w=K.s=false; });
  // right stick: aim + auto-fire while pushed
  stick(hud('stickR'),hud('knobR'),(x,y)=>{ if(paused) return; const L=Math.hypot(x,y); if(L>0.2){ TOUCH.ax=x/L; TOUCH.ay=-y/L; TOUCH.aim=true; } M.l = L>0.55; },()=>{ M.l=false; });
  const btn=(id,down,up)=>{ const el=hud(id); el.addEventListener('pointerdown',e=>{ e.preventDefault(); el.classList.add('on'); el.setPointerCapture(e.pointerId); down(); });
    const u=e=>{ el.classList.remove('on'); up&&up(); }; el.addEventListener('pointerup',u); el.addEventListener('pointercancel',u); };
  btn('bJump',()=>{ if(!paused) P.buf=0.12; K[' ']=true; },()=>{ K[' ']=false; });
  btn('bJet',()=>{ if(!paused) M.r=true; },()=>{ M.r=false; });
  btn('bReload',()=>{ if(!paused) startReload(); });
  btn('bPause',()=>{ if(started && !P.done) setPause(!paused); });
  hud('end').addEventListener('click',()=>{ if(P.done) location.reload(); });
  for(const h of hints){ h.text=h.text
    .replace('A/D move · W/Space jump (again mid-air = flip) · Mouse aims & turns you · Left click shoot','Left stick: move · JUMP (tap again mid-air to flip) · Right stick: aim & fire')
    .replace('Press W / S at a ladder to climb','Push the left stick up / down at a ladder to climb')
    .replace('Hold RIGHT MOUSE or SHIFT to jet. Fuel refills on the ground','Hold JET to fly. Fuel refills on the ground'); }
  document.addEventListener('gesturestart',e=>e.preventDefault());
}
function frame(now){
  const real=(now-last)/1000, dt=window.__dt||Math.min(0.033,real); last=now;
  fpsT+=real; fpsN++; if(fpsT>0.5){ hud('fps').textContent=Math.round(fpsN/fpsT)+' fps'; fpsT=fpsN=0; }
  R.resize(spine.ResizeMode.Expand); cam.zoom = VIEW_H/Math.max(1,canvas.height); cam.update();
  if(!paused) update(dt); else if(!started && !window.__primed){ update(1/60); window.__primed=true; }
  draw(paused?0:dt);
  requestAnimationFrame(frame);
}
hud('src').textContent = 'Character: '+sf.src;
hud('gemsTotal').textContent = '/'+totalCrystals;
hud('loading').style.display='none';
window.__game={P,st,sk,K,M,targets,swings,breakables,secrets,crystals,chests,RELIC,ladders,surfaces,placements,LEVEL_W,setView:v=>VIEW_H=v};
requestAnimationFrame(t=>{last=t; requestAnimationFrame(frame);});
})().catch(e=>{document.getElementById('loading').textContent='Error: '+e.message; console.error(e);});
