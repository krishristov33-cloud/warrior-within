import json, base64, os
H=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.dirname(H)
P=lambda *a: os.path.join(ROOT,*a)
t=open(os.path.join(H,'template.html')).read()
spine=open(P('src','vendor','spine-webgl.min.js')).read()
j=open(P('assets','character','warrior2.json')).read(); a=open(P('assets','character','warrior2.atlas')).read()
b64=lambda p,m: f'data:{m};base64,'+base64.b64encode(open(p,'rb').read()).decode()
imgs={'tiles':b64(P('assets','level','tiles.webp'),'image/webp'),'fx':b64(P('assets','level','fx.webp'),'image/webp'),
      'fxg':b64(P('assets','level','fxg.webp'),'image/webp'),'plate':b64(P('assets','level','plate.webp'),'image/webp'),'refspr':b64(P('assets','level','refspr.webp'),'image/webp'),
      'drone':b64(P('assets','level','drone.webp'),'image/webp')}
data=('const EMBED_JSON='+json.dumps(json.loads(j),separators=(',',':'))+';\nconst EMBED_ATLAS='+json.dumps(a)+
      ';\nconst EMBED_PNG="'+b64(P('assets','character','warrior2.png'),'image/png')+'";\nconst EMBED_IMG='+json.dumps(imgs)+
      ';\nconst LEVEL_ATLAS='+open(P('assets','level','atlas.json')).read()+';\nconst REF_SPR='+open(P('assets','level','refspr.json')).read()+';')
g=''.join(open(f).read()+'\n' for f in [os.path.join(H,x) for x in ['g1_boot.js','g2_char.js','g3_level.js','g4_sim.js','g5_update.js','g6_draw.js','g7_main.js']])
open(os.path.join(H,'game.js'),'w').write(g)
out=t.replace('/*SPINE*/',spine.replace('</script','<\\/script')).replace('/*DATA*/',data).replace('/*GAME*/',g)
open(P('index.html'),'w').write(out); print(len(out)//1024,'KB')
