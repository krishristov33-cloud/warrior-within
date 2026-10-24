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
upperOnly('shoot', false); upperOnly('reload'); upperOnly('hurt', false, true); upperOnly('aim_up'); upperOnly('shoot_down');
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
// aim poses authored in Spine (upper body only): blended in by aim angle, then the gun is set to the exact angle.
// AIM_*_ANG = muzzle world angle (deg) each pose was authored at, measured on top of idle_aim.
const AIM_UP=data.findAnimation('aim_up_upper'), AIM_DN=data.findAnimation('shoot_down_upper');
function poseAng(a){ sk.setToSetupPose(); data.findAnimation('idle_aim').apply(sk,0,0,false,null,1,spine.MixBlend.setup,spine.MixDirection.mixIn);
  if(a) a.apply(sk,0,0,false,null,1,spine.MixBlend.replace,spine.MixDirection.mixIn); sk.updateWorldTransform(spine.Physics.update); return bMuzzle.getWorldRotationX(); }
const AIM_0=poseAng(null), AIM_UP_ANG=poseAng(AIM_UP)-AIM_0, AIM_DN_ANG=poseAng(AIM_DN)-AIM_0; sk.setToSetupPose();

