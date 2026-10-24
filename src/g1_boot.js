// ===== Warrior2 — Ruins of the Deep (reference-built level) =====
(async function(){
"use strict";
// keep mobile GPUs fast: cap render resolution
{ const real=window.devicePixelRatio||1; if(('ontouchstart' in window)&&real>1.5) try{ Object.defineProperty(window,'devicePixelRatio',{get:()=>1.5}); }catch(e){} }
const S = 0.125, FOOT = 78*S;              // character scale (≈166 units tall)
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
const [imgChar, imgTiles, imgFx, imgFxg, imgPlate, imgRef] = await Promise.all([sf.png, EMBED_IMG.tiles, EMBED_IMG.fx, EMBED_IMG.fxg, EMBED_IMG.plate, EMBED_IMG.refspr].map(loadImg));
const TX = { tiles:new spine.GLTexture(ctx,imgTiles), fx:new spine.GLTexture(ctx,imgFx), fxg:new spine.GLTexture(ctx,imgFxg), plate:new spine.GLTexture(ctx,imgPlate), ref:new spine.GLTexture(ctx,imgRef) };
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
