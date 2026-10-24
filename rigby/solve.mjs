import * as spine from '@esotericsoftware/spine-core';
import fs from 'fs';
import {HEADTOP,HEADX,STAND,WALK,RUN,JUMP} from './data.mjs';
const SRC=process.argv[2]||'/root/char3/warrior2.json';
const json=JSON.parse(fs.readFileSync(SRC,'utf8'));
const atlas=new spine.TextureAtlas(fs.readFileSync(SRC.replace('.json','.atlas'),'utf8'));
for(const p of atlas.pages) p.setTexture({setFilters(){},setWraps(){},dispose(){}});
const sd=new spine.SkeletonJson(new spine.AtlasAttachmentLoader(atlas)).readSkeletonData(json);
const sk=new spine.Skeleton(sd);
const B=n=>sk.findBone(n);
const FPS=24, S_B=2.4, S_R=2.60, S_L=2.38, S_A=2.54, S_AF=2.2;
const CAPE=['hair1','hair1b','hair1c','hair2','hair2b','hair2c'];
const KEYB=['hip','chest','head','gun','ik_hand_l','ik_hand_r','ik_foot_l','ik_foot_r','foot_l','foot_r',...CAPE,'hip2','hip3','hip4'];
const lerp=(a,b,t)=>a+(b-a)*t, rad=d=>d*Math.PI/180;
function reset(){ sk.setToSetupPose(); sk.updateWorldTransform(spine.Physics.update); }
// ---- aim pose offsets from the existing idle_aim (t=0) ----
reset(); sd.findAnimation('idle_aim').apply(sk,0,0,false,[],1,spine.MixBlend.setup,spine.MixDirection.mixIn);
const AIM={}; for(const n of ['gun','ik_hand_l','ik_hand_r']){ const b=B(n); AIM[n]={x:b.x-b.data.x,y:b.y-b.data.y,r:b.rotation-b.data.rotation}; }
reset();
const SET={}; for(const n of ['ik_foot_l','ik_foot_r','upperarm_r','upperarm_l','ik_hand_r']){ const b=B(n); SET[n]=[b.worldX,b.worldY]; }
const gripRel=[SET.ik_hand_r[0]-SET.upperarm_r[0], SET.ik_hand_r[1]-SET.upperarm_r[1]];
function apply(K){ reset(); for(const [n,k] of Object.entries(K)){ const b=B(n), d=b.data;
    if(k.rotate!==undefined) b.rotation=d.rotation+k.rotate; if(k.translate){ b.x=d.x+k.translate[0]; b.y=d.y+k.translate[1]; } }
  sk.updateWorldTransform(spine.Physics.update); }
const wrap=a=>{ while(a>180)a-=360; while(a<-180)a+=360; return a; };
// pose -> keys
function solve(p){
  const K={}; for(const n of KEYB) K[n]={};
  K.hip={rotate:0.6*p.lean, translate:[p.hx,p.hy]}; K.chest={rotate:0.4*p.lean}; K.head={rotate:-0.7*p.lean+(p.nod||0)};
  K.gun={rotate:lerp(0,AIM.gun.r,p.w), translate:[lerp(0,AIM.gun.x,p.w),lerp(0,AIM.gun.y,p.w)]};
  K.ik_hand_r={translate:[lerp(0,AIM.ik_hand_r.x,p.w),lerp(0,AIM.ik_hand_r.y,p.w)]};
  K.ik_hand_l={translate:[lerp(0,AIM.ik_hand_l.x,p.w),lerp(0,AIM.ik_hand_l.y,p.w)]};
  apply(K);
  // gun barrel world angle
  for(let i=0;i<4;i++){ const cur=B('gun').getWorldRotationX(); K.gun.rotate+=wrap(p.gun-cur); apply(K); }
  // walk: grip follows the near hand
  if(p.grip){ const sh=B('upperarm_r'); const G=[sh.worldX+gripRel[0]+p.grip[0]*S_A, sh.worldY+gripRel[1]-p.grip[1]*S_A];
    for(let i=0;i<4;i++){ const h=B('ik_hand_r'), ch=B('chest'); const a=new spine.Vector2(h.worldX,h.worldY), b=new spine.Vector2(G[0],G[1]);
      ch.worldToLocal(a); ch.worldToLocal(b); K.gun.translate[0]+=b.x-a.x; K.gun.translate[1]+=b.y-a.y; apply(K);
      const cur=B('gun').getWorldRotationX(); K.gun.rotate+=wrap(p.gun-cur); apply(K); } }
  if(p.farHand){ const sh=B('upperarm_l'), g=B('gun'), hl=B('ik_hand_l'); const T=new spine.Vector2(sh.worldX+p.farHand[0]*S_AF, sh.worldY-p.farHand[1]*S_AF);
    g.worldToLocal(T); K.ik_hand_l.translate=[T.x-hl.data.x, T.y-hl.data.y]; apply(K); }
  // feet (root space)
  for(const [side,ik,ft] of [['R','ik_foot_r','foot_r'],['L','ik_foot_l','foot_l']]){ const f=p.feet[side];
    K[ik]={translate:[f[0]-SET[ik][0], f[1]-SET[ik][1]]}; K[ft]={rotate:Math.max(-60,Math.min(30,f[2]))}; }
  // cape: world angles per chain segment
  for(let i=0;i<CAPE.length;i++){ K[CAPE[i]]={rotate:0}; }
  apply(K);
  for(let i=0;i<CAPE.length;i++){ for(let it=0;it<3;it++){ const cur=B(CAPE[i]).getWorldRotationX(); K[CAPE[i]].rotate+=wrap(p.cape[i]-cur); apply(K); } }
  // tunic flaps
  if(p.flap!==undefined){ K.hip2={rotate:p.flap}; K.hip3={rotate:p.flap*0.8}; K.hip4={rotate:p.flap*0.6}; }
  return K;
}
// ---- helpers: interpolation ----
function hermite(xs,ys,x,period){ // monotone-ish cubic through samples; periodic if period given
  let X=xs.slice(), Y=ys.slice();
  if(period){ X=[xs[xs.length-1]-period,...xs,xs[0]+period,xs[1]+period]; Y=[ys[ys.length-1],...ys,ys[0],ys[1]]; x=((x-xs[0])%period+period)%period+xs[0]; }
  let i=0; while(i<X.length-2 && x>X[i+1]) i++;
  const x0=X[i],x1=X[i+1],y0=Y[i],y1=Y[i+1];
  const m=(k)=>{ if(k<=0) return (Y[1]-Y[0])/(X[1]-X[0]); if(k>=X.length-1) return (Y[k]-Y[k-1])/(X[k]-X[k-1]); return 0.5*((Y[k+1]-Y[k])/(X[k+1]-X[k])+(Y[k]-Y[k-1])/(X[k]-X[k-1])); };
  const h=x1-x0, t=(x-x0)/h, t2=t*t, t3=t2*t;
  return (2*t3-3*t2+1)*y0+(t3-2*t2+t)*h*m(i)+(-2*t3+3*t2)*y1+(t3-t2)*h*m(i+1);
}
function headtop(tab,f){ const ks=Object.keys(tab).map(Number).sort((a,b)=>a-b); let a=ks[0],b=ks[ks.length-1];
  for(const k of ks){ if(k<=f) a=k; if(k>=f){ b=k; break; } } if(a===b) return tab[a]; return lerp(tab[a],tab[b],(f-a)/(b-a)); }
const smooth=(tab,f)=>(headtop(tab,f-1)+2*headtop(tab,f)+headtop(tab,f+1))/4;
const hipY=(ht,lean)=>ht+343*Math.sin(rad(84+lean))/Math.sin(rad(84));
const capeChain=(fn,f,lag)=>CAPE.map((_,i)=>{ const a=fn(f-i*lag), base=fn(f); return a+Math.max(0,(-120-base)/60)*i*4; });
function footTarget(side,vx,vy,ang,hipx,hy,ground,vhipx){ const s=side==='R'?S_R:S_L, set=SET[side==='R'?'ik_foot_r':'ik_foot_l'];
  return [set[0]+((vx-vhipx)+20)*s+hipx, set[1]+(ground-vy)*s+hy*0, ang]; }
// ======== WALK ========
function walk(){ const out=[]; const T=30, F0=WALK.frames[0];
  const per=(arr,f,j)=>hermite(WALK.frames,arr.map(a=>j===undefined?a:a[j]),f,T);
  for(let k=0;k<=T;k++){ const f=F0+k;
    const ht=smooth(HEADTOP.walk,f), lean=-2+0.8*Math.cos(2*Math.PI*(f-34)/15);
    const hy=-(hipY(ht,lean)-hipY(STAND.headtop,0))*S_B; const hx=(hermite(Object.keys(HEADX.walk).map(Number),Object.values(HEADX.walk),f)-961)*0.8;
    const feet={}; for(const [side,arr] of [['R',WALK.near],['L',WALK.far]]){ let vx=per(arr,f,0), vy=Math.min(840,per(arr,f,1)), a=per(arr,f,2);
      feet[side]=footTarget(side,vx,vy,a,hx,hy,840,960); }
    const capeA=g=>-102+2.5*Math.sin(2*Math.PI*(g-19)/15)-0.6*(g%1);
    out.push({t:k/FPS, K:solve({lean,hx,hy,nod:1.2*Math.sin(2*Math.PI*(f-27)/15),gun:per(WALK.gun,f),w:0,
      grip:[per(WALK.hand,f,0)-(STAND.hand[0]-STAND.sh[0]), per(WALK.hand,f,1)-(STAND.hand[1]-STAND.sh[1])],
      farHand:[per(WALK.far_hand,f,0),per(WALK.far_hand,f,1)], feet, cape:capeChain(capeA,f,1.5), flap:2*Math.sin(2*Math.PI*(f-30)/15)})}); }
  return {dur:T/FPS,frames:out,events:[{t:(WALK.contacts.far-F0)/FPS,name:'footstep'},{t:(WALK.contacts.near-F0)/FPS,name:'footstep'}]};
}
// ======== RUN ========
function run(){ const out=[]; const T=RUN.period, F0=RUN.start;
  const leg=(ph,j)=>hermite(RUN.legPhase,RUN.leg.map(a=>a[j]),ph,T);
  for(let k=0;k<=T;k++){ const f=F0+k;
    const lean=RUN.lean+1.5*Math.cos(2*Math.PI*(f-37)/10);
    const ht=smooth(HEADTOP.run,f); const hy=-(hipY(ht,lean)-hipY(STAND.headtop,0))*S_B;
    const feet={}; for(const [side,off] of [['R',0],['L',10]]){ const ph=((f-F0-off)%T+T)%T; feet[side]=footTarget(side,leg(ph,0),Math.min(845,leg(ph,1)),leg(ph,2),0,hy,845,RUN.hipx); }
    const gf=RUN.gun.f.slice(0,5), ga=RUN.gun.a.slice(0,5);
    const capeA=g=>-128+6*Math.sin(2*Math.PI*(g-34)/10);
    out.push({t:k/FPS, K:solve({lean,hx:0,hy,nod:2*Math.sin(2*Math.PI*(f-36)/10),gun:hermite(gf,ga,f,10),w:1,feet,cape:capeChain(capeA,f,2),flap:5*Math.sin(2*Math.PI*(f-35)/10)})}); }
  return {dur:T/FPS,frames:out,events:[{t:0,name:'footstep'},{t:10/FPS,name:'footstep'}]};
}
// ======== JUMP ========
const JF=JUMP.map(k=>k.f);
const jv=(key,f)=>hermite(JF,JUMP.map(k=>k[key]),f);
const isAir=f=>f>=27&&f<=41;
function jumpPose(f,inPlace){
  const lean=jv('lean',f), ht=headtop(HEADTOP.jump,f);
  let hy=-(hipY(ht,lean)-hipY(STAND.headtop,0))*S_B; const hx=(jv('hx',f)-958)*S_B;
  if(inPlace && isAir(f)) hy=0;
  const feet={};
  for(const side of ['R','L']){ const s=side==='R'?S_R:S_L, set=SET[side==='R'?'ik_foot_r':'ik_foot_l'], sx=side==='R'?8:-8;
    const air=(g,hyy,hxx)=>{ const ks=JUMP.filter(k=>k.leg); const dx=hermite(ks.map(k=>k.f),ks.map(k=>k.leg[0]),g), dy=hermite(ks.map(k=>k.f),ks.map(k=>k.leg[1]),g), ta=hermite(ks.map(k=>k.f),ks.map(k=>k.leg[2]),g);
      return [set[0]+(dx+20+sx)*s+hxx, set[1]-(dy-244)*s+hyy, ta]; };
    if(isAir(f)) feet[side]=air(f,hy,hx);
    else if(f===26||f===42){ const a=air(f===26?27:41, inPlace?0:-(hipY(headtop(HEADTOP.jump,f===26?27:41),jv('lean',f===26?27:41))-hipY(STAND.headtop,0))*S_B, hx); feet[side]=[lerp(set[0],a[0],0.5),lerp(set[1],a[1],0.5),a[2]*0.5]; }
    else feet[side]=[set[0],set[1],0];
    if(!inPlace||!isAir(f)) feet[side][1]=Math.max(feet[side][1],set[1]); }
  const capeA=g=>jv('cape',g)+(isAir(g)?3*Math.sin(g*1.3):0);
  const vy=(headtop(HEADTOP.jump,f+1)-headtop(HEADTOP.jump,f-1));
  return {lean,hx,hy,nod:0,gun:jv('gun',f),w:Math.max(0,Math.min(1,jv('w',f))),feet,cape:capeChain(capeA,f,1.5),flap:Math.max(-14,Math.min(14,vy*0.25))};
}
function jumpRange(f0,f1,inPlace){ const out=[]; for(let f=f0;f<=f1;f++) out.push({t:(f-f0)/FPS,K:solve(jumpPose(f,inPlace))}); return {dur:(f1-f0)/FPS,frames:out,events:[]}; }
function loopPose(fA,fB,dur,inPlace){ // gentle loop between two air poses
  const out=[]; const N=Math.round(dur*FPS); for(let k=0;k<=N;k++){ const u=0.5-0.5*Math.cos(2*Math.PI*k/N); const f=fA+(fB-fA)*u;
    const p=jumpPose(Math.round(f),inPlace); p.cape=p.cape.map((c,i)=>c+4*Math.sin(2*Math.PI*k/N*2-i*0.6)); out.push({t:k/FPS,K:solve(p)}); }
  return {dur:N/FPS,frames:out,events:[]}; }
const A={};
A.walk=walk(); A.run=run();
A.jump=jumpRange(10,68,false); A.jump.events=[{t:(27-10)/24,name:'jump'},{t:(42-10)/24,name:'land'}];
A.jump_start=jumpRange(10,27,true); A.jump_start.events=[{t:(27-10)/24,name:'jump'}];
A.jump_rise=loopPose(30,32,0.5,true);
A.jump_apex=jumpRange(31,37,true);
A.fall=loopPose(39,41,0.4,true);
A.land=jumpRange(42,63,true); A.land.events=[{t:0,name:'land'}];
const r2=v=>Math.round(v*100)/100;
const OUT={}; for(const [n,a] of Object.entries(A)){ OUT[n]={dur:r2(a.dur),events:a.events.map(e=>({t:r2(e.t),name:e.name})),keys:{}};
  for(const fr of a.frames){ for(const [b,k] of Object.entries(fr.K)){ OUT[n].keys[b]??={}; if(k.rotate!==undefined) (OUT[n].keys[b].rotate??=[]).push([r2(fr.t),r2(k.rotate)]);
      if(k.translate) (OUT[n].keys[b].translate??=[]).push([r2(fr.t),r2(k.translate[0]),r2(k.translate[1])]); } } }
fs.writeFileSync('/root/solve/anims.json',JSON.stringify(OUT));
console.log(Object.entries(OUT).map(([n,a])=>n+':'+a.dur+'s').join(' '), 'AIM',JSON.stringify(AIM));
