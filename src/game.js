// ===== Warrior2 — Ruins of the Deep (reference-built level) =====
(async function(){
"use strict";
// keep mobile GPUs fast: cap render resolution
{ const real=window.devicePixelRatio||1; if(('ontouchstart' in window)&&real>1.5) try{ Object.defineProperty(window,'devicePixelRatio',{get:()=>1.5}); }catch(e){} }
const HERO = 0.68;                           // hero size relative to the original build (hitbox + body offsets scale with it)
const S = 0.125*HERO, FOOT = 78*S;           // character scale (≈113 units tall)
const SINK = 9;                             // surfaces trace the back edge of the painted decks: draw the feet a bit into the deck
const TS = 1.25;                            // world units per original tile pixel
const C = (r,g,b,a=1)=>new spine.Color(r,g,b,a);
const WHITE = C(1,1,1,1);
const hud = id=>document.getElementById(id);
const rnd=(a,b)=>a+Math.random()*(b-a), clamp=(v,a,b)=>v<a?a:v>b?b:v, lerp=(a,b,t)=>a+(b-a)*t;
const DEBUG = /debug/.test(location.hash);

// ---------- assets ----------
async function loadSkeletonFiles(){
  if (location.protocol.startsWith('http')) {
    try {
      const [j,a] = await Promise.all([fetch('warrior2.json').then(r=>{if(!r.ok)throw 0;return r.json()}),
                                       fetch('warrior2.atlas').then(r=>{if(!r.ok)throw 0;return r.text()})]);
      return {json:j, atlas:a, png:'warrior2.png', src:'warrior2.json'};
    } catch(e) {}
  }
  return {json:EMBED_JSON, atlas:EMBED_ATLAS, png:EMBED_PNG, src:'embedded warrior2.json'};
}
const sf = await loadSkeletonFiles();
const canvas = document.getElementById('c');
const ctx = new spine.ManagedWebGLRenderingContext(canvas, {alpha:false, antialias:true});
const gl = ctx.gl;
const R = new spine.SceneRenderer(canvas, ctx, true);
async function loadImg(src){ const i=new Image(); i.src=src; await i.decode(); return i; }
const [imgChar, imgTiles, imgFx, imgFxg, imgPlate, imgRef, imgDrone] = await Promise.all([sf.png, EMBED_IMG.tiles, EMBED_IMG.fx, EMBED_IMG.fxg, EMBED_IMG.plate, EMBED_IMG.refspr, EMBED_IMG.drone].map(loadImg));
// soft smoke/dust puffs (normal-blended, unlike the glowing fx sheet): 4 noisy cloud variants, white + alpha
const PUFF_N=4, imgPuff=(()=>{ const S=128, c=document.createElement('canvas'); c.width=S*PUFF_N; c.height=S; const g=c.getContext('2d'), im=g.createImageData(S*PUFF_N,S);
  const grid=(n)=>{ const v=new Float32Array((n+1)*(n+1)); for(let i=0;i<v.length;i++) v[i]=Math.random(); return (x,y)=>{ const X=x*n, Y=y*n, i=Math.floor(X), j=Math.floor(Y), fx=X-i, fy=Y-j,
    sx=fx*fx*(3-2*fx), sy=fy*fy*(3-2*fy), a=v[j*(n+1)+i], b=v[j*(n+1)+i+1], c2=v[(j+1)*(n+1)+i], d=v[(j+1)*(n+1)+i+1]; return lerp(lerp(a,b,sx),lerp(c2,d,sx),sy); }; };
  for(let p=0;p<PUFF_N;p++){ const o=[grid(4),grid(8),grid(16)], cx=0.5+rnd(-0.04,0.04), cy=0.5+rnd(-0.04,0.04);
    for(let y=0;y<S;y++) for(let x=0;x<S;x++){ const u=x/S, v=y/S, r=Math.hypot((u-cx)/0.46,(v-cy)/0.42);
      const n=o[0](u,v)*0.55+o[1](u,v)*0.3+o[2](u,v)*0.15, fall=Math.max(0,1-r*r), m=Math.max(0,Math.min(1,(n*fall*1.9-0.32)*1.6));
      const k=(y*S*PUFF_N+p*S+x)*4, sh=215+40*n; im.data[k]=sh; im.data[k+1]=sh; im.data[k+2]=sh; im.data[k+3]=m*m*(3-2*m)*235; } }
  g.putImageData(im,0,0); return c; })();
const imgRing=(()=>{ const S=128, c=document.createElement('canvas'); c.width=c.height=S; const g=c.getContext('2d'), im=g.createImageData(S,S);   // soft glowing annulus
  for(let y=0;y<S;y++) for(let x=0;x<S;x++){ const r=Math.hypot(x-S/2+0.5,y-S/2+0.5)/(S/2), a=Math.exp(-Math.pow((r-0.82)/0.07,2))+0.25*Math.exp(-Math.pow((r-0.82)/0.2,2));
    const k=(y*S+x)*4; im.data[k]=im.data[k+1]=im.data[k+2]=255; im.data[k+3]=Math.min(1,a)*255; }
  g.putImageData(im,0,0); return c; })();
const imgNade=(()=>{ const c=document.createElement('canvas'); c.width=48; c.height=64; const g=c.getContext('2d');   // placeholder grenade art
  g.fillStyle='#3d4a2c'; g.beginPath(); g.ellipse(24,40,16,20,0,0,6.29); g.fill();
  g.strokeStyle='rgba(0,0,0,.35)'; g.lineWidth=2; for(const y of [32,42,52]){ g.beginPath(); g.moveTo(9,y); g.lineTo(39,y); g.stroke(); } g.beginPath(); g.moveTo(24,21); g.lineTo(24,60); g.stroke();
  const hl=g.createRadialGradient(17,32,1,17,32,13); hl.addColorStop(0,'rgba(220,240,180,.55)'); hl.addColorStop(1,'rgba(220,240,180,0)'); g.fillStyle=hl; g.beginPath(); g.ellipse(24,40,16,20,0,0,6.29); g.fill();
  g.fillStyle='#8b8f94'; g.fillRect(17,14,14,9); g.fillStyle='#b9bdc2'; g.fillRect(17,14,14,3);
  g.fillStyle='#9a9ea3'; g.beginPath(); g.moveTo(30,15); g.lineTo(42,22); g.lineTo(40,25); g.lineTo(29,19); g.fill();
  g.strokeStyle='#c8a64a'; g.lineWidth=2.5; g.beginPath(); g.arc(13,12,6,0,6.29); g.stroke();
  return c; })();
const imgGun=(()=>{ const W=128, H=32, c=document.createElement('canvas'); c.width=W*2; c.height=H; const g=c.getContext('2d'), im=g.createImageData(W*2,H);
  for(let y=0;y<H;y++) for(let x=0;x<W;x++){ const u=x/(W-1), v=Math.abs(y-(H-1)/2)/((H-1)/2);
    const tr=Math.pow(u,1.6)*Math.max(0,1-Math.pow(v,1.4)*1.15);                                   // tracer: tail -> head
    const half=0.12+0.88*Math.sin(Math.min(1,u*1.15)*Math.PI*0.5)*(1-u)*1.9, sp=Math.max(0,Math.min(1,(Math.min(1,half)-v)*3))*Math.min(1,u*8)*Math.min(1,(1-u)*6);
    for(const [o,a] of [[0,tr],[W,sp]]){ const k=(y*W*2+o+x)*4, w=Math.max(0,1-v*1.6); im.data[k]=255; im.data[k+1]=255; im.data[k+2]=255; im.data[k+3]=Math.min(1,a)*255; } }
  g.putImageData(im,0,0); return c; })();
const TX = { tiles:new spine.GLTexture(ctx,imgTiles), fx:new spine.GLTexture(ctx,imgFx), fxg:new spine.GLTexture(ctx,imgFxg), plate:new spine.GLTexture(ctx,imgPlate), ref:new spine.GLTexture(ctx,imgRef), drone:new spine.GLTexture(ctx,imgDrone), puff:new spine.GLTexture(ctx,imgPuff), gun:new spine.GLTexture(ctx,imgGun), ring:new spine.GLTexture(ctx,imgRing), nade:new spine.GLTexture(ctx,imgNade) };
for (const t of Object.values(TX)) t.setFilters(gl.LINEAR, gl.LINEAR);
const TA = LEVEL_ATLAS;
function uvOf(rect,size){ return [rect[0]/size[0], rect[1]/size[1], (rect[0]+rect[2])/size[0], (rect[1]+rect[3])/size[1]]; }
const TILE = {}; for (const [n,r] of Object.entries(TA.tiles)) TILE[n] = {uv:uvOf(r,TA.tileSize), ow:r[4], oh:r[5]};
const FXS  = {}; for (const [n,r] of Object.entries(TA.fx))    FXS[n]  = {uv:uvOf(r,TA.fxSize), w:r[2], h:r[3]};
const RSP = {}; for (const [n,r] of Object.entries(REF_SPR.map)) RSP[n] = {uv:uvOf(r,REF_SPR.size), w:r[2], h:r[3]};

// ---------- sprite batching ----------
const QV = new Float32Array(48), QI = [0,1,2,2,3,0];
let blend = -1;
function setBlend(add){ const b=add?1:0; if(blend===b) return; blend=b; R.enableRenderer(R.batcher);
  R.batcher.setBlendMode(add?spine.BlendMode.Additive:spine.BlendMode.Normal, add); }
// additive that respects the texture's alpha (sprite tints / hit flashes on non-premultiplied textures)
function setBlendAddA(){ if(blend===2) return; blend=2; R.enableRenderer(R.batcher); R.batcher.setBlendMode(spine.BlendMode.Additive, false); }
// gunfire shape (0 tracer, 1 spike): length along rot, pivot px along the length (0 = tail/base)
function gshape(i,x,y,len,wid,rot,rgb,a,px=0.5){ setBlendAddA(); spr(TX.gun,[i/2,0,(i+1)/2,1],x,y,len,wid,rot,col(rgb[0],rgb[1],rgb[2],a),false,px,0.5); }
function gring(x,y,size,rgb,a,sy=1){ setBlendAddA(); spr(TX.ring,[0,0,1,1],x,y,size,size*sy,0,col(rgb[0],rgb[1],rgb[2],a),false); }
function puffAdd(v,x,y,size,rot,rgb,a){ setBlendAddA(); spr(TX.puff,[v/PUFF_N,0,(v+1)/PUFF_N,1],x,y,size,size,rot,col(rgb[0],rgb[1],rgb[2],a),false); }
function puff(v,x,y,size,rot,rgb,a){ setBlend(false); spr(TX.puff,[v/PUFF_N,0,(v+1)/PUFF_N,1],x,y,size,size,rot,col(rgb[0],rgb[1],rgb[2],a),false); }
// draw texture region uv=[u0,v0,u1,v1] with pivot (px,py) fractions (y-up), world size w,h
function spr(tex, uv, x, y, w, h, rot, col, flipX, px=0.5, py=0.5){
  R.enableRenderer(R.batcher);
  const fx=-px*w, fy=-py*h, fx2=w+fx, fy2=h+fy, c=Math.cos(rot||0), s=Math.sin(rot||0);
  let u0=uv[0], u1=uv[2]; if(flipX){ const t=u0; u0=u1; u1=t; }
  const v0=uv[1], v1=uv[3];
  const cr=col?col.r:1, cg=col?col.g:1, cb=col?col.b:1, ca=col?col.a:1;
  const P=[[fx,fy,u0,v1],[fx,fy2,u0,v0],[fx2,fy2,u1,v0],[fx2,fy,u1,v1]];
  let i=0; for(const [ax,ay,u,v] of P){ QV[i++]=x+c*ax-s*ay; QV[i++]=y+s*ax+c*ay; QV[i++]=cr; QV[i++]=cg; QV[i++]=cb; QV[i++]=ca; QV[i++]=u; QV[i++]=v; QV[i++]=0;QV[i++]=0;QV[i++]=0;QV[i++]=0; }
  R.batcher.draw(tex, QV, QI);
}
// axis-aligned quad with per-corner alpha (for seam cross-fades): x0..x1, y0..y1 world; uv; alphas [bl,tl,tr,br]
function quadA(tex,uv,x0,y0,x1,y1,al,flipX,k=1){
  R.enableRenderer(R.batcher);
  let u0=uv[0], u1=uv[2]; if(flipX){ const t=u0; u0=u1; u1=t; }
  const P=[[x0,y0,u0,uv[3],al[0]],[x0,y1,u0,uv[1],al[1]],[x1,y1,u1,uv[1],al[2]],[x1,y0,u1,uv[3],al[3]]];
  let i=0; for(const [x,y,u,v,a] of P){ QV[i++]=x; QV[i++]=y; QV[i++]=k; QV[i++]=k; QV[i++]=k; QV[i++]=a; QV[i++]=u; QV[i++]=v; QV[i++]=0;QV[i++]=0;QV[i++]=0;QV[i++]=0; }
  R.batcher.draw(tex, QV, QI);
}
const tmpCol = C(1,1,1,1);
function col(r,g,b,a=1){ tmpCol.set(r,g,b,a); return tmpCol; }
// fx sprite: name, center, size scale (world units per sprite px), rotation, color [r,g,b], intensity, tinted (uses gray sheet)
function fx(name,x,y,scale,rot,rgb,k=1,tint=false,flipX=false,px=0.5,py=0.5,sx=1){
  const f=FXS[name]; setBlend(true);
  spr(tint?TX.fxg:TX.fx, f.uv, x,y, f.w*scale*sx, f.h*scale, rot, col(rgb[0]*k,rgb[1]*k,rgb[2]*k,1), flipX, px, py);
}

// ---------- character ----------
const charAtlas = new spine.TextureAtlas(sf.atlas);
for (const p of charAtlas.pages) p.setTexture(new spine.GLTexture(ctx, imgChar));
const sj = new spine.SkeletonJson(new spine.AtlasAttachmentLoader(charAtlas)); sj.scale = S;
const data = sj.readSkeletonData(sf.json);
const UPPER = new Set(['chest','head','gun','ik_hand_l','ik_hand_r'].map(n=>data.findBone(n).index));
const FLASH_SLOT = data.findSlot('flash').index, GUN_I = data.findBone('gun').index;
function upperOnly(name, keepGun=true, allSlots=false){
  const a = data.findAnimation(name);
  const tl = a.timelines.filter(t => (t.boneIndex!==undefined && UPPER.has(t.boneIndex) && (keepGun || t.boneIndex!==GUN_I))
                                   || (allSlots && t.slotIndex!==undefined && t.slotIndex!==FLASH_SLOT));
  data.animations.push(new spine.Animation(name+'_upper', tl, a.duration));
}
upperOnly('shoot', false); upperOnly('reload'); upperOnly('hurt', false, true); upperOnly('aim_up'); upperOnly('shoot_down'); upperOnly('throw');
const sk = new spine.Skeleton(data);
const sd = new spine.AnimationStateData(data); sd.defaultMix = 0.12;
[['jump_rise','fall',0.25],['fall','land',0.04],['land','idle_aim',0.2],['land','run',0.1],['idle_aim','run',0.1],
 ['run','idle_aim',0.15],['double_jump','fall',0.15]].forEach(([a,b,t])=>sd.setMix(a,b,t));
const st = new spine.AnimationState(sd); st.setAnimation(0,'idle_aim',true);
const B = n=>sk.findBone(n);
// boot nozzles: find each leg mesh's sole and ankle vertices in the setup pose
const BOOTS=[]; { sk.setToSetupPose(); sk.updateWorldTransform(spine.Physics.update);
  for(const n of ['legBack','legFront']){ const slot=sk.findSlot(n), at=slot&&slot.getAttachment(); if(!at||!at.computeWorldVertices) continue;
    const N=at.worldVerticesLength, buf=new Float32Array(N); at.computeWorldVertices(slot,0,N,buf,0,2);
    let minY=1e9; for(let i=1;i<N;i+=2) minY=Math.min(minY,buf[i]);
    const sole=[], up=[]; for(let i=0;i<N;i+=2){ const h=buf[i+1]-minY; if(h<6) sole.push(i); else if(h>14&&h<26) up.push(i); }
    if(sole.length&&up.length) BOOTS.push({slot,at,buf,sole,up}); } }
const bHip=B('hip'), bChest=B('chest'), bHead=B('head'), bGun=B('gun'), bMuzzle=B('muzzle');
const flashSlot = sk.slots[FLASH_SLOT];
const bThrowHand = B('ik_hand_l');
// aim poses authored in Spine (upper body only): blended in by aim angle, then the gun is set to the exact angle.
// AIM_*_ANG = muzzle world angle (deg) each pose was authored at, measured on top of idle_aim.
const AIM_UP=data.findAnimation('aim_up_upper'), AIM_DN=data.findAnimation('shoot_down_upper');
function poseAng(a){ sk.setToSetupPose(); data.findAnimation('idle_aim').apply(sk,0,0,false,null,1,spine.MixBlend.setup,spine.MixDirection.mixIn);
  if(a) a.apply(sk,0,0,false,null,1,spine.MixBlend.replace,spine.MixDirection.mixIn); sk.updateWorldTransform(spine.Physics.update); return bMuzzle.getWorldRotationX(); }
const AIM_0=poseAng(null), AIM_UP_ANG=poseAng(AIM_UP)-AIM_0, AIM_DN_ANG=poseAng(AIM_DN)-AIM_0; sk.setToSetupPose();


// ===================== LEVEL (built from the reference painting) =====================
const REF_H = 1344;
const R2=(r,v)=>{ const c=Math.cos(r), s=Math.sin(r); return [c*v[0]-s*v[1], s*v[0]+c*v[1]]; };
// ---- everything below is measured on the reference image (x right, y DOWN, pixels) ----
const REF = {
  surf: [
    [[0,768],[372,770]], [[283,1145],[465,1145]], [[0,420],[190,420]],
    [[835,714],[1000,712]], [[1000,702],[1228,702]], [[1228,707],[1420,707],[1590,808],[1728,815]],
    [[1528,572],[1678,572]], [[1610,100],[1790,100]],
    [[1840,832],[1998,832]], [[1832,1186],[2002,1186]], [[1975,820],[2400,820],[2540,826]],
    [[2018,570],[2246,570]], [[2240,560],[2440,560],[2652,568]], [[1790,100],[2330,100]],
    [[2885,430],[3168,430]], [[2828,630],[3092,630]], [[2700,797],[3002,797]],
    [[2468,1063],[2885,1063],[2890,1047],[3168,1047]],
  ],
  ladders: [[343,785,1005],[1947,838,1185],[2583,568,1050],[3003,633,795],[3005,800,1050]],
  // hanging objects: sprite, sprite origin on the reference, pivot (chain attach centre), chain anchors + attach points, walk surface (all ref px)
  dyn: [
    {spr:'swingA', o:[388,680], piv:[469,715], anchors:[[441,0],[497,0]], att:[[441,722],[497,708]], surf:[[400,718],[555,700]], rigid:true},
    {spr:'blockB', o:[571,430], piv:[627,445], anchors:[[627,0]], att:[[627,445]], surf:[[585,462],[692,458]], rigid:false},
    {spr:'blockC', o:[726,536], piv:[804,562], anchors:[[804,0]], att:[[804,562]], surf:[[745,585],[830,572]], rigid:false},
    {spr:'swingD', o:[1861,588], piv:[1927,598], anchors:[[1882,250],[1927,250],[1967,250]], att:[[1882,598],[1927,598],[1967,598]], surf:[[1870,598],[1985,598]], rigid:true},
    {spr:'swingE', o:[2634,381], piv:[2751,392], anchors:[[2668,0],[2834,0]], att:[[2668,392],[2834,392]], surf:[[2643,392],[2862,392]], rigid:true},
  ],
  crates: [[98,768,'Ruin-wall cache'],[1275,707,'Temple offering'],[2222,820,'Scaffold crate']],
  hiddenCrates: [[95,420,'Hidden ledge relic box'],[2250,100,'Lintel hoard']],
  secrets: [[0,330,200,430],[1600,20,2340,140]],
  crystals: [[210,690],[470,640],[630,400],[800,510],[1100,640],[1500,700],[1640,520],[1927,540],[2130,510],[2340,500],
             [2751,330],[3000,370],[2940,570],[2820,740],[2680,1000],[1920,1130],[380,1090],[1800,60],[2050,60],[90,370]],
  glows: [[1045,660],[1580,778],[1188,868],[2290,520],[2215,760],[2432,1018],[2208,1192],[1150,1040]],
  enemies: [['gunner',300,330],['target',720,300],['charger',1300,420],['gunner',2120,430],['charger',1880,720],['gunner',2950,500],['charger',2780,930],['target',2500,250]],
};
const CHUNK = { A:[0,560], B:[560,1790], C:[1790,2650], D:[2650,3168] };
// level = sequence of reference chunks (m = mirrored); seams between non-adjacent chunks are cross-faded and hidden behind foreground
const SEQ = [
  ['A',0],['B',0],['C',0],['D',0],            // 1. the reference, 1:1
  ['D',1],['C',1],['B',1],['A',1],            // 2. mirrored continuation (seamless)
  ['A',0],['C',0,1],['B',1,1],['D',0,1],      // 3. remix (3rd value = cross-faded seam)
  ['D',1],['C',1],['B',1],                    // 4. sanctum
];
const SEAM = 150;
// which crate holds a treasure in which placement (index into SEQ)
const TREASURE_AT = {1:'Temple offering', 2:'Lintel hoard', 7:'Hidden ledge relic box', 9:'Scaffold crate', 13:'Lintel hoard'};
const placements=[]; { let x=0; for(const [c,m,seam] of SEQ){ const [a,b]=CHUNK[c]; if(seam) x-=SEAM; placements.push({c,a,b,m:!!m,off:x,w:b-a,seam:!!seam}); x+=b-a; } }
const LEVEL_W = placements[placements.length-1].off + placements[placements.length-1].w;
// out-of-bounds scenery left of x=0 so the camera can centre the hero at the start (drawn only, darkened, behind a wall)
const DECOR=[]; { let x=0; for(const c of ['A','B']){ const [a,b]=CHUNK[c]; x-=b-a; DECOR.push({c,a,b,m:true,off:x,w:b-a,seam:false}); } }
const DECOR_W = -DECOR[DECOR.length-1].off;
const mapX=(pl,rx)=> pl.off + (pl.m ? (pl.b-rx) : (rx-pl.a));
const mapY=ry=> REF_H-ry;
const inC=(pl,rx)=> rx>=pl.a && rx<pl.b;

const pieces=[], surfaces=[], solids=[], ladders=[], swings=[], breakables=[], debris=[], secrets=[], crystals=[], chests=[], checkpoints=[], hints=[], glows=[];
const enemiesDef=[];
function clipPoly(pts,a,b){ const out=[]; for(let i=0;i<pts.length-1;i++){ let [x1,y1]=pts[i], [x2,y2]=pts[i+1];
    if(x2<=a||x1>=b) continue; const lerpY=(x)=>y1+(y2-y1)*(x-x1)/((x2-x1)||1);
    const sx=Math.max(x1,a), ex=Math.min(x2,b); if(!out.length||out[out.length-1][0]!==sx) out.push([sx,lerpY(sx)]); out.push([ex,lerpY(ex)]); } return out; }
function addSurf(pts,o={}){ pts.sort((p,q)=>p[0]-q[0]); const s={pts,on:true,vx:0,vy:0,...o}; surfaces.push(s); return s; }
function solid(x,y,w,h,o={}){ const r={x,y,w,h,on:true,...o}; solids.push(r); return r; }

for(const pl of placements){
  for(const s of REF.surf){ const c=clipPoly(s,pl.a,pl.b); if(c.length>=2) addSurf(c.map(([x,y])=>[mapX(pl,x),mapY(y)])); }
  for(const [x,t,b] of REF.ladders) if(inC(pl,x)) ladders.push({x:mapX(pl,x), top:mapY(t), bot:mapY(b)});
  for(const d of REF.dyn) if(inC(pl,d.piv[0])) makeSwing(d,pl);
  const pi=placements.indexOf(pl);
  for(const [x,y,n,ix] of REF.crates.concat(REF.hiddenCrates)) if(inC(pl,x) && TREASURE_AT[pi]===n) chests.push({x:mapX(pl,x),y:mapY(y),open:false,t:0,name:n,painted:REF.crates.some(c=>c[2]===n)});
  for(const [x0,y0,x1,y1] of REF.secrets){ const a=Math.max(x0,pl.a), b=Math.min(x1,pl.b); if(b-a>40){ const X0=mapX(pl,a), X1=mapX(pl,b); secrets.push({x:Math.min(X0,X1),y:mapY(y1),w:Math.abs(X1-X0),h:y1-y0,found:false}); } }
  for(const [x,y] of REF.crystals) if(inC(pl,x)) crystals.push({x:mapX(pl,x),y:mapY(y),bx:0,by:0,taken:false,ph:Math.random()*6,mag:false});
  for(const [x,y] of REF.glows) if(inC(pl,x)) glows.push({x:mapX(pl,x),y:mapY(y),ph:Math.random()*6});
  for(const [t,x,y] of REF.enemies) if(inC(pl,x)) enemiesDef.push([mapX(pl,x),mapY(y),t]);
}
function makeSwing(d,pl){
  const sp=RSP[d.spr], m=pl.m, px=d.piv[0]-d.o[0], py=d.piv[1]-d.o[1];
  const anc=d.anchors.map(([x,y])=>[mapX(pl,x),mapY(y)]);
  const axc=anc.reduce((s,a)=>s+a[0],0)/anc.length, ayc=anc.reduce((s,a)=>s+a[1],0)/anc.length;
  const pivW=[mapX(pl,d.piv[0]),mapY(d.piv[1])];
  const loc=(lx,ly)=>[ m? -(lx-px) : (lx-px), -(ly-py) ];      // local (ref px, y down, relative to sprite origin) -> pivot-relative, y up
  const s={d,spr:d.spr,w:sp.w,h:sp.h,m,pfx:(m?sp.w-px:px)/sp.w, pfy:1-py/sp.h, ax:axc, ay:ayc, L:ayc-pivW[1], th:0, om:0, dip:0, dipV:0,
    rigid:d.rigid, heavy:!d.rigid, rot:0, anc, att:d.att.map(([x,y])=>loc(x-d.o[0],y-d.o[1])), sl:d.surf.map(([x,y])=>loc(x-d.o[0],y-d.o[1])),
    surf:null, cx:pivW[0], cy:pivW[1], occupied:false, ancOff:anc.map(a=>a[0]-axc)};
  // keep the painted resting angle: offset the anchor so the rest pose matches the reference
  s.ax=pivW[0]; s.surf=addSurf([[0,0],[0,0]],{dyn:true,sw:s}); swings.push(s); placeSwing(s,0);
}
function placeSwing(s,dt){
  const ox=s.cx, oy=s.cy;
  s.cx=s.ax+Math.sin(s.th)*s.L; s.cy=s.ay-Math.cos(s.th)*s.L+s.dip;
  const pts=s.sl.map(v=>{ const r=R2(s.rot,v); return [s.cx+r[0], s.cy+r[1]]; }).sort((p,q)=>p[0]-q[0]);
  s.surf.pts=pts;
  if(dt>0){ s.surf.dx=s.cx-ox; s.surf.dy=s.cy-oy; s.surf.vx=s.surf.dx/dt; s.surf.vy=s.surf.dy/dt; } else { s.surf.dx=s.surf.dy=0; }
}
// ---- tile-based additions (use the tile sheets) ----
function tileSize(n,sc=1){ const t=TILE[n]; return [t.ow*sc, t.oh*sc]; }
function piece(n,x,top,o={}){ const [w,h]=tileSize(n,o.sc||1); const p={n,x,top,w,h,flip:!!o.flip,a:1,dead:false,ox:0,oy:0,tint:o.tint||[1,1,1],layer:o.layer||'game',par:o.par||1}; pieces.push(p); return p; }
function breakable(n,x,y,sc,surfLocalY){ const p=piece(n,x,y+surfLocalY*sc,{sc}); const s=addSurf([[x+6*sc,y],[x+p.w-6*sc,y]],{piece:p}); const b={p,s,state:'idle',t:0,respawn:5}; p.brk=b; breakables.push(b); return b; }
function checkpoint(x,y){ checkpoints.push({x,y,on:false,t:0}); }
function hint(x0,x1,text,ymin=-1e9,ymax=1e9){ hints.push({x0,x1,ymin,ymax,text,shown:false}); }
const P_OFF=i=>placements[i].off;
// section boundaries & extras
solid(-600,-400,600,2400);
solid(LEVEL_W,-400,600,2400); solid(-600,-400,600,2400);
solid(-600,REF_H-30,LEVEL_W+1200,400);
checkpoint(120,mapY(768));
hint(0,500,'A/D run · Shift walk · W/Space jump (again mid-air = flip) · Mouse aims & turns you · Left click shoot');
hint(330,420,'Press W / S at a ladder to climb',-1e9,700);
hint(380,700,'Chained platforms swing and sag — use them to cross',300);
hint(1500,1800,'Hold RIGHT MOUSE to jet. Fuel refills on the ground',400);
// section 2 (mirrored) – crumbling stepping stones across the big drop
{ const o=P_OFF(4); checkpoint(o+140,mapY(1047));
  breakable('tile33',o+560,mapY(1000),0.62,18); breakable('tile33',o+820,mapY(930),0.62,18);
  hint(o+300,o+700,'Cracked slabs crumble moments after you land!',0,700); }
// section 3 (remix)
{ const o=P_OFF(8); checkpoint(o+140,mapY(768));
  breakable('tile24',o+620,mapY(890),0.6,22); breakable('tile33',P_OFF(10)+260,mapY(980),0.62,18); breakable('tile5',P_OFF(11)-40,mapY(900),0.62,22); }
// section 4 (sanctum) + relic on the temple floor
{ const o=P_OFF(12); checkpoint(o+140,mapY(1047)); }
const RELIC = (()=>{ const pl=placements[placements.length-1]; return {x:mapX(pl,1330), y:mapY(707), taken:false}; })();
hint(RELIC.x-900,RELIC.x-300,'The relic rests in the old temple ahead');
// foreground: dark vines/chains, and big silhouettes over the remix seams
let seed=777; const srand=()=>{ seed=(seed*16807)%2147483647; return seed/2147483647; };
const pick=a=>a[Math.floor(srand()*a.length)];
for(let x=-200; x<LEVEL_W*1.12+400; x+=1100+srand()*1400){ const n=pick(['tile29','tile62']); piece(n,x,REF_H*1.12+srand()*120,{sc:0.7+srand()*0.4,layer:'fg',par:1.12,tint:[0.12,0.15,0.2],flip:srand()<0.5}); }
const totalCrystals = crystals.length + chests.length*8;
const walls=[];

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

// ===================== UPDATE =====================
let cur='idle_aim', curEntry=st.getCurrent(0);
function play(name, loop=true){ if(cur===name) return curEntry; cur=name; curEntry=st.setAnimation(0,name,loop); return curEntry; }
const cam = R.camera; let camX=SPAWN.x, camY=SPAWN.y+90*HERO;
let camK=1, camKT=1;          // camera zoom multiplier on VIEW_H (intro / celebration close-ups), eased toward camKT
const INTRO_T=2.6, INTRO_HIT=1.0, CELEB_T=4.2;   // intro length, time left when the beam strikes; relic celebration length
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
  // grenade supply crates (normal / hard)
  if(!DIFF.infNades) for(const n of nadePacks){ if(n.taken) continue; n.ph+=dt;
    if(Math.hypot(P.x-n.x,P.y+60*HERO-n.y)<70 && P.dead<=0){ n.taken=true; P.nades=Math.min(9,P.nades+2); toast('+2 grenades',1.4); fxSparkle(n.x,n.y); } }
  updateNades(dt);
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
      cp.on=true; P.cp={x:cp.x,y:cp.y}; for(const o of checkpoints) if(o!==cp && o.x<cp.x) o.on=true; toast('Checkpoint reached'); fxCheckpoint(cp.x,cp.y); } }
  if(started && !(P.intro>0)) for(const h of hints){ if(!h.shown && P.x>h.x0 && P.x<h.x1 && P.y>h.ymin && P.y<h.ymax && P.dead<=0){ h.shown=true; toast(h.text,5); } }
  if(!RELIC.taken && Math.abs(P.x-RELIC.x)<110 && Math.abs(P.y-RELIC.y)<150 && P.dead<=0){ RELIC.taken=true; P.done=true; fxRelic(RELIC.x,RELIC.y+120); fxSparkle(RELIC.x,RELIC.y+120,true); P.celebrate=CELEB_T; ebolts.length=0; nades.length=0; camKT=0.62; }
  toastT-=dt; if(toastT<=0) hud('toast').classList.remove('on');
}
function finish(){
  const t=P.time, m=Math.floor(t/60), s=Math.floor(t%60).toString().padStart(2,'0');
  hud('endstats').innerHTML=`Time <b>${m}:${s}</b><br>Crystals <b>${P.gems} / ${totalCrystals}</b><br>Treasures <b>${P.treasures} / ${chests.length}</b><br>Secrets <b>${P.secrets} / ${secrets.length}</b><br>Drones destroyed <b>${P.score}</b>`;
  hud('end').style.display='grid'; requestAnimationFrame(()=>hud('end').classList.add('on'));
}

function update(dt){
  if(!P.done && !(P.intro>0)) P.time+=dt;
  // ---- first spawn: energy gathers into a rune circle, a beam strikes, the hero materialises ----
  if(P.intro>0){ const was=P.intro; P.intro-=dt; const k=1-P.intro/INTRO_T;
    if(P.intro>INTRO_HIT){ ebolts.length=0; const n=2+Math.floor(k*7); for(let i=0;i<n;i++){ const b=rnd(0,6.28), r=rnd(160,320)*(1.2-k*0.5), l=rnd(0.35,0.6), cy=P.y+60*HERO;
        part({gs:0,x:P.x+Math.cos(b)*r,y:cy+Math.sin(b)*r,vx:-Math.cos(b)*r/l,vy:-Math.sin(b)*r/l,life:l,s0:rnd(26,44),s1:8,w:4,px:1,rgb:Math.random()<0.3?[1,0.9,0.6]:[0.45,0.95,1],k:1,line:1}); }
      if(Math.random()<0.15+k*0.3) part({puff:(Math.random()*PUFF_N)|0,x:P.x+rnd(-90,90),y:P.y+4,vx:0,vy:rnd(20,60),rot:rnd(0,6),vr:rnd(-1,1),life:0.8,s0:20,s1:50,rgb:DUST,k:0.35,drag:2}); }
    if(was>INTRO_HIT && P.intro<=INTRO_HIT) fxSpawnEpic(P.x,P.y);
    if(P.intro<=0){ P.intro=0; camKT=1; P.inv=1.5; } }
  // ---- relic celebration, then the end menu ----
  if(P.celebrate>0){ P.celebrate-=dt; P.vx*=Math.max(0,1-6*dt);
    if(Math.random()<dt*2.6){ const a=rnd(0.4,2.7), d=rnd(160,320); fxFirework(P.x+Math.cos(a)*d, P.y+90*HERO+Math.sin(a)*d*0.8); }
    if(P.celebrate<=0){ P.celebrate=0; finish(); } }
  const alive = P.dead<=0 && !P.done && !(P.intro>0);
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
  const maxv = P.crouch?WALK*0.6 : K.shift?WALK:RUN;   // run by default, hold Shift to walk
  if(P.climb){ moveAndCollide(dt); }
  else {
  if(P.ground){
    if(inX){ const d=inX*maxv-P.vx; P.vx += Math.sign(d)*Math.min(Math.abs(d),ACC_G*dt); }
    else { const s=Math.sign(P.vx); P.vx -= s*Math.min(Math.abs(P.vx),FRIC*dt); }
  } else { if(inX && inX*P.vx < (K.shift?RUN_ANIM:RUN)) P.vx += inX*ACC_A*dt; P.vx -= P.vx*0.12*dt; }
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
  if(P.throwT>0){ P.throwT-=dt; if(!P.thrown && THROW_T-P.throwT>=THROW_REL){ P.thrown=true; if(alive) releaseNade(); } }
  if(M.l && alive && P.cool<=0 && P.ammo>0 && P.reload<=0 && P.flip<=0 && P.throwT<=0) fire();
  P.inv=Math.max(0,P.inv-dt); P.hurtFlash=Math.max(0,P.hurtFlash-dt*2.5);
  if(alive){ P.regenT-=dt; if(P.regenT<=0 && P.hp<100) P.hp=Math.min(100,P.hp+DIFF.regen*dt); }
  else if(P.dead>0){ P.dead-=dt; if(P.dead<=0) respawn(); }

  // ---- base animation ----
  const speed=Math.abs(P.vx), back=P.vx*P.face<-20;
  if(P.dead>0){} else if(P.celebrate>0 && P.ground){ play('victory',false); } else if(P.climb){ play('walk'); } else if(P.flip>0){}
  else if(!P.ground){ if(P.jet||P.vy>120) play('jump_rise'); else play('fall'); }
  else if(P.land>0 && speed<200) play('land',false);
  else if(P.crouch) play('crouch_idle');
  else if(speed<35) play(P.done?'victory':'idle_aim', !P.done);
  else if(speed<300) play('walk'); else play('run');
  if(P.climb && curEntry){ curEntry.timeScale=Math.abs(P.vy)/260; }
  else if(curEntry && (cur==='walk'||cur==='run')){
    const rate = cur==='run'? speed/RUN_ANIM : speed/WALK;   // faster run plays the cycle faster
    if(back){ curEntry.timeScale=0; const d=curEntry.animation.duration; curEntry.trackTime=((curEntry.trackTime - dt*rate*0.85)%d+d)%d; }
    else curEntry.timeScale=Math.max(0.5,rate);
  } else if(curEntry) curEntry.timeScale=1;

  // ---- skeleton + aim ----
  sk.scaleX=P.face; sk.x=P.x; sk.y=P.y-FOOT-SINK;
  st.update(dt); st.apply(sk);
  const piv={x:bGun.worldX||P.x, y:bGun.worldY||P.y+90*HERO};
  let dx=(M.wx-piv.x)*P.face, dy=M.wy-piv.y;
  let th=Math.atan2(dy,Math.max(dx,4))*180/Math.PI; th=clamp(th,-78,82);
  const lock = P.flip>0 || P.reload>0 || P.throwT>0 || P.dead>0 || P.done;
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
    camX=clamp(camX, vw/2-DECOR_W, Math.max(vw/2, LEVEL_W-vw/2)); camY = vh>=REF_H-1 ? REF_H/2 : clamp(camY, vh/2, REF_H-vh/2); }
  camK += (camKT-camK)*Math.min(1,dt*(camKT<camK?2.2:1.2));
  if((P.intro>0||P.celebrate>0)){ camX=lerp(camX,P.x,Math.min(1,dt*5)); camY=lerp(camY,P.y+80*HERO,Math.min(1,dt*5)); }
  if(window.__camOv){ camX=window.__camOv[0]; camY=window.__camOv[1]; }
  shake=Math.max(0,shake-dt*40);
  cam.position.x=camX+(Math.random()-0.5)*shake; cam.position.y=camY+(Math.random()-0.5)*shake; cam.update();

  hud('fuel').style.width=(P.fuel*100)+'%'; hud('fuel').classList.toggle('low',P.fuel<0.2);
  hud('hp').style.width=P.hp+'%'; hud('hp').classList.toggle('low',P.hp<30);
  hud('ammo').textContent = DIFF.infAmmo ? '∞' : P.reload>0 ? 'RELOAD' : P.ammo; hud('nades').textContent = DIFF.infNades ? '∞' : P.nades;
  hud('gems').textContent = P.gems; hud('treas').textContent = `${P.treasures}/${chests.length}`; hud('kills').textContent=P.score;
  hud('vign').style.opacity=Math.max(P.hurtFlash*0.9, P.hp<30&&P.dead<=0?0.25+0.15*Math.sin(performance.now()/180):0, P.dead>0?0.6:0);
  hud('dead').style.display=P.dead>0?'grid':'none';
}

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
  for(const pl of DECOR.concat(placements)){ if(pl.off>x1||pl.off+pl.w<x0) continue;
    const ua=pl.a/imgPlate.width, ub=pl.b/imgPlate.width, uv=[ua,0,ub,1];
    if(!pl.seam) quadA(TX.plate,uv,pl.off,0,pl.off+pl.w,REF_H,[1,1,1,1],pl.m);
    else { // cross-fade the first SEAM px
      const f=SEAM/pl.w, us=pl.m? [ub-(ub-ua)*f, 0, ub, 1] : [ua,0,ua+(ub-ua)*f,1], ur=pl.m? [ua,0,ub-(ub-ua)*f,1] : [ua+(ub-ua)*f,0,ub,1];
      quadA(TX.plate,us,pl.off,0,pl.off+SEAM,REF_H,[0,0,1,1],pl.m); quadA(TX.plate,ur,pl.off+SEAM,0,pl.off+pl.w,REF_H,[1,1,1,1],pl.m); }
  }
  if(x0<0){ R.enableRenderer(R.shapes); R.shapes.setBlendMode(gl.SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);   // fade the out-of-bounds scenery into the dark
    const d0=new spine.Color(0.02,0.04,0.07,0.9), d1=new spine.Color(0.02,0.04,0.07,0.35);
    R.quad(true,-DECOR_W,0,0,0,0,REF_H,-DECOR_W,REF_H,d0,d1,d1,d0); }
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
    const sp=t.spawnT>0?1-t.spawnT/0.7:1;                                  // materialise: grow in while warping
    const W=t.r*3.1*(E.dscale||1)*(0.2+0.8*sp*sp), H=W*165/202, zs=W/130, c=Math.cos(rot), s=Math.sin(rot);
    const at=(u,v)=>{ const dx=(u-0.5)*W*f, dy=(0.42-v)*H; return [x+c*dx-s*dy, y+s*dx+c*dy]; };   // sprite fraction (u from left, v from top) -> world
    const eyeCol=[lerp(0.35,E.col[0],alert?1:0),lerp(0.95,E.col[1],alert?1:0),lerp(1,E.col[2],alert?1:0)];
    // downdraft haze under the rotors
    const [hx,hy]=at(0.5,1.0); fx('jet2',hx,hy+4,(0.22+0.03*Math.sin(t.ph*20))*zs,Math.PI,[0.45,0.8,1],0.14,true,false,0.5,1);
    fx('orb_soft',x,y,(t.r/40)*(alert?0.75:0.6),0,eyeCol,alert?0.3:0.16,true);
    if(t.state==='dash') fx('ribbon',x,y,0.6*zs,Math.atan2(t.vy,t.vx)+Math.PI,E.col,0.8,true,false,0.05,0.5);
    // hit: tint the body red (darken green/blue, then add a red glow masked by the sprite's alpha)
    const hk=t.hit>0?Math.min(1,t.hit/0.08):0;
    setBlend(false); spr(TX.drone,[0,0,1,1],x,y,W,H,rot,hk?col(1,1-0.6*hk,1-0.65*hk,1):col(1,1,1,sp),f<0,0.5,0.58);
    if(sp<1){ setBlendAddA(); spr(TX.drone,[0,0,1,1],x,y,W,H,rot,col(0.3*(1-sp),0.9*(1-sp),1-sp,1),f<0,0.5,0.58); }   // cyan energy fading out
    if(hk){ setBlendAddA(); spr(TX.drone,[0,0,1,1],x,y,W,H,rot,col(0.75*hk,0.08*hk,0.04*hk,1),f<0,0.5,0.58); }
    // spinning rotor blur over both discs
    for(const [u,v,ph] of [[0.22,0.12,0],[0.79,0.18,1.7]]){ const [rx,ry]=at(u,v), sp=t.ph*38+ph;
      gring(rx,ry,W*0.42,[0.8,0.95,1],0.3,0.28);
      fx('streak',rx,ry,W/420,rot+(Math.sin(sp)>0?0:Math.PI),[0.85,0.95,1],0.35,true,false,0.5,0.5,Math.abs(Math.cos(sp))*0.9+0.1); }
    // eye: steady glow, brightening while it winds up a shot / dash
    const [ex,ey]=at(0.69,0.46), pulse=0.6+0.4*Math.sin(t.ph*6);
    fx('orb_s',ex,ey,W/300*(1+0.25*pulse),0,eyeCol,alert?0.9:0.55,true);
    if(charging){ fx('orb_m',ex,ey,(0.35+k*0.9)*zs,0,E.col,0.4+0.6*k,true); fx('twinkle',ex,ey,(0.25+k*0.5)*zs,k*3,E.col,k,true); }
    if(sp>=1) for(let i=0;i<E.hp;i++) R.rect(true,x-E.hp*4.5+i*9,y-H*0.62-4,7,3,i<t.hp?col(0.3,1,0.8,1):col(0.3,0.3,0.3,1));
  }
  for(const b of ebolts){ fx('fireball',b.x,b.y,0.12,b.a,[1,0.5,0.18],1.3,true,true,0.85,0.5); fx('orb_s',b.x,b.y,0.18,0,[1,0.6,0.2],0.75,true); }
  // grenade supply crates (normal / hard) + live grenades
  if(!DIFF.infNades) for(const n of nadePacks){ if(n.taken||n.x<x0-100||n.x>x1+100) continue; const bob=Math.sin(n.ph*2)*5;
    fx('orb_soft',n.x,n.y+bob,0.45,0,[1,0.6,0.2],0.35,true);
    setBlend(false); spr(TX.nade,[0,0,1,1],n.x-8,n.y+bob,18,24,0.25,WHITE,false); spr(TX.nade,[0,0,1,1],n.x+8,n.y+bob,18,24,-0.2,WHITE,true); }
  for(const g of nades){ setBlend(false); spr(TX.nade,[0,0,1,1],g.x,g.y+9,15,20,g.rot,WHITE,false);
    if(Math.sin((1.6-g.fuse)*(8+(1.6-g.fuse)*14))>0) fx('orb_s',g.x,g.y+9,0.16,0,[1,0.25,0.1],1.2,true); }
  // player
  sk.color.a = !started ? 0 : P.intro>0 ? clamp((INTRO_HIT-P.intro)/0.45,0,1) : (P.inv>0 && P.dead<=0) ? (Math.floor(performance.now()/70)%2?0.35:1) : 1;
  if(P.intro>INTRO_HIT){ const k=1-(P.intro-INTRO_HIT)/(INTRO_T-INTRO_HIT);   // rune circle + thin gathering beam before the strike
    gring(P.x,P.y+4,(120+140*k)*HERO*1.6,[0.4,0.95,1],0.35+0.5*k,0.28); gring(P.x,P.y+4,(60+90*k)*HERO*1.6,[0.8,1,1],0.25+0.4*k*Math.abs(Math.sin(now*9)),0.28);
    gshape(1,P.x,P.y,1100,(8+40*k*k)*HERO,Math.PI/2,[0.35,0.85,1],0.35+0.55*k,0); gshape(1,P.x,P.y,1000,(3+12*k*k)*HERO,Math.PI/2,[0.9,1,1],0.3+0.6*k,0);
    fx('orb_m',P.x,P.y+60*HERO,0.3+0.8*k,0,[0.35,0.85,1],0.4+0.7*k,true); fx('star4',P.x,P.y+60*HERO,0.15+0.35*k,now*2,[0.8,1,1],0.5+0.8*k*Math.abs(Math.sin(now*7)),true); }
  R.drawSkeleton(sk,charAtlas.pages[0].pma); blend=-1;
  for(const b of bullets){ const ba=Math.atan2(b.vy,b.vx), Lt=Math.min(170,(0.8-b.life)*3000+40);   // rifle tracer: long thin streak, hot head
    gshape(0,b.x,b.y,Lt,9,ba,[1,0.5,0.12],0.9,1); gshape(0,b.x,b.y,Lt*0.6,3.5,ba,[1,0.92,0.7],1,1); fx('orb_s',b.x,b.y,0.12,0,[1,0.7,0.3],0.9,true); }
  for(const p of parts){ if(p.x<x0-300||p.x>x1+300||p.y<y0-300||p.y>y1+300) continue;
    const t=1-p.life/p.max, s=lerp(p.s0,p.s1,t);
    if(p.ring){ gring(p.x,p.y,s,p.rgb,p.k*Math.pow(Math.max(0,p.life/p.max),0.8),p.sy??1); continue; }
    if(p.gs!==undefined){ const r=p.line?Math.atan2(p.vy,p.vx):p.rot; gshape(p.gs,p.x,p.y,s,p.w,r,p.rgb,p.k*Math.max(0,p.life/p.max),p.px??0.5); continue; }
    if(p.puff!==undefined){ (p.add?puffAdd:puff)(p.puff,p.x,p.y,s,p.rot,p.rgb,p.k*Math.min(1,t*7)*Math.pow(Math.max(0,1-t),1.4)); continue; }
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
  // crosshair (hidden behind the menus / during the spawn and celebration)
  if(started && !(P.intro>0) && !P.done){
  const zs=cam.zoom*(canvas.height/canvas.clientHeight), g=(6+P.recoil*8)*zs, cc=new spine.Color(0.6,1,1,0.95);
  fx('orb_s',M.wx,M.wy,0.5*zs,0,[0.4,1,1],0.35);
  R.circle(false,M.wx,M.wy,(13+P.recoil*6)*zs,cc,24); const L=12*zs, w=2*zs;
  R.rectLine(true,M.wx-g-L,M.wy,M.wx-g,M.wy,w,cc); R.rectLine(true,M.wx+g,M.wy,M.wx+g+L,M.wy,w,cc);
  R.rectLine(true,M.wx,M.wy-g-L,M.wx,M.wy-g,w,cc); R.rectLine(true,M.wx,M.wy+g,M.wx,M.wy+g+L,w,cc); }
  if(DEBUG){ const c1=new spine.Color(0,1,0,1), c2=new spine.Color(1,0,0,0.8), c3=new spine.Color(1,0,1,0.9);
    for(const s of surfaces){ if(!s.on||(s.piece&&s.piece.dead)) continue; for(let i=0;i<s.pts.length-1;i++) R.rectLine(true,s.pts[i][0],s.pts[i][1],s.pts[i+1][0],s.pts[i+1][1],3,c1); }
    for(const l of ladders) R.rect(false,l.x-20,l.bot,40,l.top-l.bot,c3);
    for(const r of solids) if(r.on) R.rect(false,r.x,r.y,r.w,r.h,c2);
    R.rect(false,P.x-P.w/2,P.y,P.w,P.h,c2); }
  R.end();
}

// ===================== MAIN LOOP =====================
let last=performance.now(), fpsT=0, fpsN=0, paused=true;
function setPause(v){ paused=v; document.body.classList.toggle('paused',v); hud('ptitle').textContent=started?'PAUSED':'CHOOSE DIFFICULTY'; hud('resume').style.display=started?'':'none'; hud('pause').style.display=paused?'grid':'none'; if(paused){ M.l=M.r=false; for(const k in K) K[k]=false; } }
let started=false;
let helpT=0;
// startGame: from the intro menu (first time) runs the long spawn; from the pause menu just switches difficulty and resumes
function startGame(n){ setDifficulty(n); const first=!started; started=true; setPause(false);
  if(first){ hud('intro').classList.add('hide'); document.body.classList.remove('menu'); camX=P.x; camY=P.y+80*HERO; camK=camKT=0.72; P.intro=INTRO_T; setTimeout(()=>{ camKT=1; },INTRO_T*700);
    clearTimeout(helpT); helpT=setTimeout(()=>{ hud('help').classList.remove('off'); helpT=setTimeout(()=>hud('help').classList.add('off'),7000); },INTRO_T*1000); }
  if(IS_TOUCH && !document.fullscreenElement){ const de=document.documentElement; try{ const p=(de.requestFullscreen||de.webkitRequestFullscreen)?.call(de,{navigationUI:'hide'}); p&&p.then&&p.then(()=>screen.orientation?.lock?.('landscape')).catch(()=>{}); }catch(e){} } }
// intro menu: pick a difficulty card, then PLAY (or 1/2/3 + Enter)
let introDiff='normal';
function pickIntro(n){ introDiff=n; document.querySelectorAll('[data-idiff]').forEach(b=>b.classList.toggle('sel',b.dataset.idiff===n)); }
document.querySelectorAll('[data-idiff]').forEach(b=>{ b.addEventListener('click',()=>pickIntro(b.dataset.idiff)); b.addEventListener('dblclick',()=>startGame(b.dataset.idiff)); });
hud('play').addEventListener('click',()=>startGame(introDiff));
function replay(){ try{ sessionStorage.setItem('w2_autostart',DIFF_NAME); }catch(e){} location.reload(); }
hud('again').addEventListener('click',replay); hud('tomenu').addEventListener('click',()=>location.reload());
addEventListener('keydown',e=>{ if(e.key==='Escape' && !P.done && started && !(P.intro>0)){ e.preventDefault(); setPause(!paused); }
  if(!started && ['1','2','3'].includes(e.key)) pickIntro(['easy','normal','hard'][+e.key-1]);
  else if(paused && started && ['1','2','3'].includes(e.key)) startGame(['easy','normal','hard'][+e.key-1]);
  if(!started && (e.key==='Enter'||e.key===' ')){ e.preventDefault(); startGame(introDiff); }
  if(P.done && !(P.celebrate>0) && e.key==='Enter') replay(); });
document.querySelectorAll('[data-diff]').forEach(b=>b.addEventListener('click',ev=>{ ev.stopPropagation(); startGame(b.dataset.diff); }));
hud('resume').addEventListener('click',()=>{ if(started) setPause(false); });
{ let saved='normal'; try{ saved=localStorage.getItem('w2_diff')||'normal'; }catch(e){} saved=DIFFS[saved]?saved:'normal'; setDifficulty(saved); pickIntro(saved); }
hud('resume').style.display='none'; document.body.classList.add('paused','menu');   // intro menu is showing; the game waits paused behind it

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
  R.resize(spine.ResizeMode.Expand); cam.zoom = VIEW_H*camK/Math.max(1,canvas.height); cam.update();
  if(!paused) update(dt); else if(!started && !window.__primed){ update(1/60); window.__primed=true; }
  draw(paused?0:dt);
  requestAnimationFrame(frame);
}
hud('src').textContent = 'Character: '+sf.src;
hud('gemsTotal').textContent = '/'+totalCrystals;
hud('loading').style.display='none';
{ let auto=null; try{ auto=sessionStorage.getItem('w2_autostart'); sessionStorage.removeItem('w2_autostart'); }catch(e){}   // PLAY AGAIN: skip the menu
  if(auto && DIFFS[auto]){ hud('intro').style.transition='none'; startGame(auto); } }
window.__game={P,st,sk,K,M,targets,checkpoints,nades,nadePacks,startThrow,setDifficulty,swings,breakables,secrets,crystals,chests,RELIC,ladders,surfaces,placements,LEVEL_W,setView:v=>VIEW_H=v};
requestAnimationFrame(t=>{last=t; requestAnimationFrame(frame);});
})().catch(e=>{document.getElementById('loading').textContent='Error: '+e.message; console.error(e);});

