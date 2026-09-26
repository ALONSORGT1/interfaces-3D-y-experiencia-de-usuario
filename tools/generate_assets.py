"""Original low-poly GLB assets. Python standard library; no third-party models."""
import json, math, struct, zlib
from pathlib import Path
OUT=Path(__file__).resolve().parents[1]/'assets'/'models'
OUT.mkdir(parents=True,exist_ok=True)
class GLB:
    def __init__(self):
        self.data=bytearray();self.meshes={}
        self.g=dict(asset={'version':'2.0','generator':'Renuncia definitiva / original assets'},scene=0,scenes=[{'nodes':[]}],nodes=[],meshes=[],materials=[],accessors=[],bufferViews=[],buffers=[],animations=[])
        pos=[];norm=[];uv=[];ind=[]
        faces=[([1,0,0],[(.5,-.5,.5),(.5,-.5,-.5),(.5,.5,-.5),(.5,.5,.5)]),([-1,0,0],[(-.5,-.5,-.5),(-.5,-.5,.5),(-.5,.5,.5),(-.5,.5,-.5)]),([0,1,0],[(-.5,.5,.5),(.5,.5,.5),(.5,.5,-.5),(-.5,.5,-.5)]),([0,-1,0],[(-.5,-.5,-.5),(.5,-.5,-.5),(.5,-.5,.5),(-.5,-.5,.5)]),([0,0,1],[(-.5,-.5,.5),(.5,-.5,.5),(.5,.5,.5),(-.5,.5,.5)]),([0,0,-1],[(.5,-.5,-.5),(-.5,-.5,-.5),(-.5,.5,-.5),(.5,.5,-.5)])]
        for n,verts in faces:
            i=len(pos)//3
            for v in verts:pos.extend(v);norm.extend(n)
            uv.extend([0,0,1,0,1,1,0,1]);ind.extend([i,i+1,i+2,i,i+2,i+3])
        self.geo={'POSITION':self.access(pos,'VEC3'),'NORMAL':self.access(norm,'VEC3'),'TEXCOORD_0':self.access(uv,'VEC2')};self.indices=self.access(ind,'SCALAR',5123)
    def view(self,blob):
        while len(self.data)%4:self.data.append(0)
        start=len(self.data);self.data.extend(blob);self.g['bufferViews'].append({'buffer':0,'byteOffset':start,'byteLength':len(blob)});return len(self.g['bufferViews'])-1
    def access(self,v,kind,ctype=5126):
        n={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[kind];a={'bufferView':self.view(struct.pack('<'+('f' if ctype==5126 else 'H')*len(v),*v)),'componentType':ctype,'count':len(v)//n,'type':kind}
        if kind in ('SCALAR','VEC3'):a.update(min=[min(v[i::n]) for i in range(n)],max=[max(v[i::n]) for i in range(n)])
        self.g['accessors'].append(a);return len(self.g['accessors'])-1
    def mat(self,name,color,texture=False):
        c=[int(color.lstrip('#')[i:i+2],16)/255 for i in (0,2,4)];c=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in c]
        p={'baseColorFactor':c+[1],'metallicFactor':0,'roughnessFactor':.8}
        if texture:
            def chunk(t,d):return struct.pack('>I',len(d))+t+d+struct.pack('>I',zlib.crc32(t+d)&0xffffffff)
            rows=b''.join(b'\x00'+b''.join(bytes((190,204,181,255) if (x//8+y//8)%2 else (212,220,202,255)) for x in range(32)) for y in range(32))
            png=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',32,32,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(rows))+chunk(b'IEND',b'')
            self.g['images']=[{'bufferView':self.view(png),'mimeType':'image/png','name':'Original carpet'}];self.g['samplers']=[{'magFilter':9728,'minFilter':9728,'wrapS':10497,'wrapT':10497}];self.g['textures']=[{'source':0,'sampler':0}];p.update(baseColorTexture={'index':0},baseColorFactor=[1,1,1,1])
        self.g['materials'].append({'name':name,'pbrMetallicRoughness':p});return len(self.g['materials'])-1
    def node(self,name,pos=(0,0,0),parent=None):
        i=len(self.g['nodes']);self.g['nodes'].append({'name':name,'translation':list(pos),'children':[]})
        (self.g['scenes'][0]['nodes'] if parent is None else self.g['nodes'][parent]['children']).append(i);return i
    def box(self,name,pos,size,mat,parent=None):
        if mat not in self.meshes:self.meshes[mat]=len(self.g['meshes']);self.g['meshes'].append({'primitives':[{'attributes':self.geo,'indices':self.indices,'material':mat}]})
        i=self.node(name,pos,parent);self.g['nodes'][i].update(mesh=self.meshes[mat],scale=list(size));return i
    def cylinder(self,name,pos,size,mat,segments=16):
        key=('cylinder',mat)
        if key not in self.meshes:
            positions=[];normals=[];uv=[];indices=[]
            for i in range(segments):
                t0=2*math.pi*i/segments;t1=2*math.pi*(i+1)/segments
                x0,z0=math.cos(t0)*.5,math.sin(t0)*.5;x1,z1=math.cos(t1)*.5,math.sin(t1)*.5
                n=len(positions)//3
                for x,y,z in [(x0,-.5,z0),(x0,.5,z0),(x1,.5,z1),(x1,-.5,z1)]:positions.extend((x,y,z));normals.extend((x*2,0,z*2));uv.extend((x+.5,y+.5))
                indices.extend((n,n+1,n+2,n,n+2,n+3))
                for y,sign in [(-.5,-1),(.5,1)]:
                    n=len(positions)//3
                    verts=[(0,y,0),(x0,y,z0),(x1,y,z1)] if sign<0 else [(0,y,0),(x1,y,z1),(x0,y,z0)]
                    for v in verts:positions.extend(v);normals.extend((0,sign,0));uv.extend((v[0]+.5,v[2]+.5))
                    indices.extend((n,n+1,n+2))
            self.meshes[key]=len(self.g['meshes']);self.g['meshes'].append({'primitives':[{'attributes':{'POSITION':self.access(positions,'VEC3'),'NORMAL':self.access(normals,'VEC3'),'TEXCOORD_0':self.access(uv,'VEC2')},'indices':self.access(indices,'SCALAR',5123),'material':mat}]})
        i=self.node(name,pos);self.g['nodes'][i].update(mesh=self.meshes[key],scale=list(size));return i
    def animation(self,name,tracks,duration):
        a={'name':name,'samplers':[],'channels':[]}
        for node,axis,angles in tracks:
            qs=[]
            for angle in angles:
                q=[0,0,0,math.cos(angle/2)];q[axis]=math.sin(angle/2);qs.extend(q)
            a['samplers'].append({'input':self.access([duration*i/(len(angles)-1) for i in range(len(angles))],'SCALAR'),'output':self.access(qs,'VEC4'),'interpolation':'LINEAR'});a['channels'].append({'sampler':len(a['samplers'])-1,'target':{'node':node,'path':'rotation'}})
        self.g['animations'].append(a)
    def save(self,name):
        if not self.g['animations']:del self.g['animations']
        self.g['buffers']=[{'byteLength':len(self.data)}];j=json.dumps(self.g,separators=(',',':')).encode()
        while len(j)%4:j+=b' '
        while len(self.data)%4:self.data.append(0)
        (OUT/name).write_bytes(struct.pack('<III',0x46546c67,2,12+8+len(j)+8+len(self.data))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(self.data),0x004e4942)+self.data)
def office():
    a=GLB();colors={'floor':'#c5d0b9','wall':'#e3e4cb','trim':'#67806b','wood':'#c39b76','desk':'#eee9ce','dark':'#284d46','screen':'#a6c4b8','white':'#fcf7e8','pink':'#e5ac9e','yellow':'#e7c978','glass':'#b7d8c4'};m={n:a.mat(n,c,n=='floor') for n,c in colors.items()};coll=[]
    def box(n,p,s,mat,solid=False):
        a.box(n,p,s,m[mat])
        if solid:coll.append({'name':n,'position':p,'size':s})
    box('Carpet',(0,-.2,0),(20,.4,18),'floor',True);box('Foundation',(0,-.48,0),(20.4,.2,18.4),'trim')
    box('Back wall',(0,1.8,-9.15),(20.6,3.6,.3),'wall',True);box('Left wall',(-10.15,1.8,0),(.3,3.6,18),'wall',True)
    box('Right sill',(10.15,.22,0),(.3,.44,18),'trim',True);box('Front sill',(0,.22,9.15),(20.6,.44,.3),'trim',True)
    box('Back skirting',(0,.12,-8.94),(20,.24,.07),'trim');box('Left skirting',(-9.94,.12,0),(.07,.24,18),'trim')
    coll.extend([{'name':'Right limit','position':[10.3,2,0],'size':[.25,4,18.6]},{'name':'Front limit','position':[0,2,9.3],'size':[20.6,4,.25]}])
    for x in (-6.8,-2.2,2.4):
        box('Window frame',(x,2.25,-8.91),(3.5,2.05,.12),'trim');box('Window glass',(x,2.25,-8.81),(3.32,1.87,.07),'glass');box('Window center',(x,2.25,-8.74),(.055,1.87,.035),'white')
        for y in (1.55,1.8,2.05,2.3,2.55,2.8):box('Window blind',(x,y,-8.70),(3.3,.025,.08),'white')
    box('Noticeboard',(-9.91,2,-3),(.1,1.8,2.8),'wood')
    for z,y in ((-3.7,2.2),(-3,1.7),(-2.3,2.35)):box('Pinned note',(-9.83,y,z),(.03,.55,.6),'yellow')
    for x,z in ((-7,-6.8),(-2,-7),(4,-7),(7.8,2.8),(-7,2)):
        box('Desk top',(x,1.08,z),(2.6,.16,1.25),'desk',True)
        for dx in (-1.08,1.08):
            for dz in (-.43,.43):box('Desk leg',(x+dx,.5,z+dz),(.09,1,.09),'trim',True)
        box('Monitor foot',(x,1.21,z-.1),(.5,.08,.35),'dark');box('Monitor stem',(x,1.4,z-.25),(.1,.45,.1),'dark');box('Monitor',(x,1.7,z-.25),(1,.65,.12),'dark',True);box('Monitor display',(x,1.7,z-.18),(.88,.51,.025),'screen');box('Keyboard',(x,1.2,z+.28),(.75,.045,.26),'trim');box('Paper',(x+.87,1.18,z+.1),(.42,.03,.55),'white')
    box('Coffee counter',(8.25,.6,-6.5),(2.7,1.2,1.5),'wood',True);box('Coffee counter top',(8.25,1.24,-6.5),(2.85,.12,1.6),'desk',True)
    for x in (7.45,8.25,9.05):box('Cup',(x,1.42,-6.1),(.18,.23,.18),'white')
    box('Dispenser base',(-3.8,.65,6.1),(1.5,1.3,1.2),'pink',True);box('Dispenser lid',(-3.8,1.35,6.1),(1.6,.14,1.3),'dark',True);box('Dispenser sign',(-3.8,2.05,6.4),(1.4,1.1,.12),'dark');box('Dispenser opening',(-3.8,.78,6.72),(.75,.55,.04),'dark');box('Dispenser tray',(-3.8,.42,6.98),(1,.12,.52),'trim',True)
    a.save('office.glb');(OUT/'office-colliders.json').write_text(json.dumps(coll,indent=2),encoding='utf-8')
def employee():
    a=GLB();m={n:a.mat(n,c) for n,c in {'shirt':'#e5c579','pants':'#314b43','skin':'#dba381','hair':'#4d392d','shoe':'#26392f','tie':'#c27462','white':'#fff8e7'}.items()};root=a.node('Employee');body=a.node('Torso',(0,1.05,0),root)
    for n,p,s,c in [('Shirt',(0,.14,0),(.55,.64,.32),'shirt'),('Tie',(0,.16,-.176),(.075,.42,.025),'tie'),('Badge',(-.15,.27,-.18),(.14,.12,.025),'white'),('Neck',(0,.53,0),(.18,.18,.18),'skin'),('Head',(0,.77,0),(.4,.45,.37),'skin'),('Hair',(0,.97,.02),(.42,.12,.39),'hair'),('Hair back',(0,.82,.18),(.42,.24,.07),'hair'),('Nose',(0,.72,-.21),(.08,.085,.08),'skin')]:a.box(n,p,s,m[c],body)
    for x in (-.105,.105):a.box('Glasses',(x,.80,-.195),(.15,.085,.035),m['pants'],body)
    arms=[];legs=[]
    for side in (-1,1):
        arm=a.node('LeftArm' if side<0 else 'RightArm',(side*.36,.36,0),body);arms.append(arm)
        a.box('Sleeve',(0,-.12,0),(.19,.28,.25),m['shirt'],arm);a.box('Forearm',(0,-.39,0),(.16,.29,.19),m['skin'],arm);a.box('Hand',(0,-.56,0),(.18,.12,.2),m['skin'],arm)
        leg=a.node('LeftLeg' if side<0 else 'RightLeg',(side*.15,.85,0),root);legs.append(leg);a.box('Trousers',(0,-.35,0),(.22,.7,.28),m['pants'],leg);a.box('Shoe',(0,-.76,-.08),(.25,.16,.43),m['shoe'],leg)
    a.animation('Idle',[(body,2,[0,.016,0,-.016,0]),(arms[0],0,[0,.035,0,-.035,0]),(arms[1],0,[0,-.035,0,.035,0]),(legs[0],0,[0,0]),(legs[1],0,[0,0])],2.4)
    for name,angle,duration in [('Walk',.5,.8),('Run',.9,.5)]:
        a.animation(name,[(body,2,[0,.025,0,-.025,0])]+[(node,0,[0,angle*sign,0,-angle*sign,0]) for node,sign in [(arms[0],-1),(arms[1],1),(legs[0],1),(legs[1],-1)]],duration)
    a.animation('Throw',[(arms[1],0,[0,-1.6,-.9,1.3,.5,0]),(arms[0],0,[0,.25,.4,.2,0,0]),(body,2,[0,.13,.1,-.13,0,0]),(legs[0],0,[0,.25,.3,.1,0,0]),(legs[1],0,[0,-.2,-.2,0,0,0])],.65)
    a.save('employee.glb')
if __name__=='__main__':office();employee();print('Original GLBs generated. Employee clips: Idle, Walk, Run, Throw.')
