import json,sys
src,anims,out=sys.argv[1:4]
d=json.load(open(src)); A=json.load(open(anims))
for n,a in A.items():
    bones={}
    for b,ch in a['keys'].items():
        tl={}
        if 'rotate' in ch: tl['rotate']=[{'time':t,'value':v} for t,v in ch['rotate']]
        if 'translate' in ch: tl['translate']=[{'time':t,'x':x,'y':y} for t,x,y in ch['translate']]
        bones[b]=tl
    an={'bones':bones}
    if a['events']: an['events']=[{'time':e['t'],'name':e['name']} for e in a['events']]
    d['animations'][n]=an
json.dump(d,open(out,'w'))
