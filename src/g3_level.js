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
