// ===================== MAIN LOOP =====================
let last=performance.now(), fpsT=0, fpsN=0, paused=true;
function setPause(v){ paused=v; document.body.classList.toggle('paused',v); hud('ptitle').textContent=started?'PAUSED':'CHOOSE DIFFICULTY'; hud('resume').style.display=started?'':'none'; hud('pause').style.display=paused?'grid':'none'; if(paused){ M.l=M.r=false; for(const k in K) K[k]=false; } }
let started=false;
let helpT=0;
function startGame(n){ setDifficulty(n); started=true; setPause(false);
  clearTimeout(helpT); hud('help').classList.remove('off'); helpT=setTimeout(()=>hud('help').classList.add('off'),7000);   // controls panel fades out once play starts
  if(IS_TOUCH && !document.fullscreenElement){ const de=document.documentElement; try{ const p=(de.requestFullscreen||de.webkitRequestFullscreen)?.call(de,{navigationUI:'hide'}); p&&p.then&&p.then(()=>screen.orientation?.lock?.('landscape')).catch(()=>{}); }catch(e){} } }
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
  // floating sticks: the ring jumps to wherever the thumb lands inside its zone, then rests faintly in a corner
  const stick=(zone,el,knob,onMove,onEnd)=>{ let id=null, cx=0, cy=0; const R0=40;
    const place=(x,y)=>{ el.style.left=x+'px'; el.style.top=y+'px'; };
    const home=()=>{ el.style.left=el.style.top=''; };
    const set=(x,y)=>{ let dx=x-cx, dy=y-cy; const L=Math.hypot(dx,dy); if(L>R0){ dx*=R0/L; dy*=R0/L; } knob.style.transform=`translate(${dx}px,${dy}px)`; onMove(dx/R0,dy/R0); };
    zone.addEventListener('pointerdown',e=>{ e.preventDefault(); if(id!==null) return; id=e.pointerId; try{ zone.setPointerCapture(id); }catch(_){} const r=zone.getBoundingClientRect();
      const lx=clamp(e.clientX-r.left,48,Math.max(48,r.width-48)), ly=clamp(e.clientY-r.top,48,Math.max(48,r.height-48)); place(lx,ly); cx=r.left+lx; cy=r.top+ly; el.classList.add('on'); set(e.clientX,e.clientY); });
    zone.addEventListener('pointermove',e=>{ if(e.pointerId===id) set(e.clientX,e.clientY); });
    const end=e=>{ if(e.pointerId!==id) return; id=null; knob.style.transform=''; el.classList.remove('on'); home(); onEnd(); };
    zone.addEventListener('pointerup',end); zone.addEventListener('pointercancel',end); };
  stick(hud('zoneL'),hud('stickL'),hud('knobL'),(x,y)=>{ if(paused) return; K.a=x<-0.35; K.d=x>0.35; K.shift=Math.abs(x)<=0.85; /* partial push walks */ const up=y<-0.55, dn=y>0.55; if(up&&!K.w&&!P.climb){} K.w=up; K.s=dn; },()=>{ K.a=K.d=K.w=K.s=K.shift=false; });
  // right stick: aim + auto-fire while pushed
  stick(hud('zoneR'),hud('stickR'),hud('knobR'),(x,y)=>{ if(paused) return; const L=Math.hypot(x,y); if(L>0.2){ TOUCH.ax=x/L; TOUCH.ay=-y/L; TOUCH.aim=true; } M.l = L>0.55; },()=>{ M.l=false; });
  const btn=(id,down,up)=>{ const el=hud(id); el.addEventListener('pointerdown',e=>{ e.preventDefault(); el.classList.add('on'); try{ el.setPointerCapture(e.pointerId); }catch(_){} down(); });
    const u=e=>{ el.classList.remove('on'); up&&up(); }; el.addEventListener('pointerup',u); el.addEventListener('pointercancel',u); };
  btn('bJump',()=>{ if(!paused) P.buf=0.12; K[' ']=true; },()=>{ K[' ']=false; });
  btn('bJet',()=>{ if(!paused) M.r=true; },()=>{ M.r=false; });
  btn('bReload',()=>{ if(!paused) startReload(); });
  btn('bNade',()=>{ if(!paused) startThrow(); });
  btn('bZoomIn',()=>zoomBy(1/1.15)); btn('bZoomOut',()=>zoomBy(1.15));
  btn('bPause',()=>{ if(started && !P.done) setPause(!paused); });
  hud('end').addEventListener('click',()=>{ if(P.done) location.reload(); });
  for(const h of hints){ h.text=h.text
    .replace('A/D run · Shift walk · W/Space jump (again mid-air = flip) · Mouse aims & turns you · Left click shoot','Left stick: move (push partly to walk) · JUMP (tap again mid-air to flip) · Right stick: aim & fire')
    .replace('Press W / S at a ladder to climb','Push the left stick up / down at a ladder to climb')
    .replace('Hold RIGHT MOUSE to jet. Fuel refills on the ground','Hold JET to fly. Fuel refills on the ground'); }
  document.addEventListener('gesturestart',e=>e.preventDefault());
  // stop the browser from panning / overscrolling / swipe-navigating while the thumbs drag
  document.addEventListener('touchmove',e=>{ if(!e.target.closest?.('#pause .box')) e.preventDefault(); },{passive:false});
  tc.addEventListener('touchstart',e=>e.preventDefault(),{passive:false});
}
if(!IS_TOUCH) for(const [id,f] of [['bZoomIn',1/1.15],['bZoomOut',1.15]]) hud(id).addEventListener('mousedown',e=>{ e.preventDefault(); zoomBy(f); canvas.focus(); });
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
window.__game={P,st,sk,K,M,targets,checkpoints,nades,nadePacks,startThrow,setDifficulty,swings,breakables,secrets,crystals,chests,RELIC,ladders,surfaces,placements,LEVEL_W,setView:v=>VIEW_H=v};
requestAnimationFrame(t=>{last=t; requestAnimationFrame(frame);});
})().catch(e=>{document.getElementById('loading').textContent='Error: '+e.message; console.error(e);});
