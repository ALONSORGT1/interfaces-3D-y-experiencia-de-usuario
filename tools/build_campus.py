"""Build the 100 x 54 corporate campus (15 times the original floor area).
Uses the original GLB writer; models, materials and colliders share one source.
"""
import json
from generate_assets import GLB, OUT, employee

def build():
    a=GLB()
    colors={'carpet':'#c5d0b9','mint':'#b9cbbb','cream':'#e8dfc3','pink':'#dec8bf','blue':'#b8cbd2','gold':'#d7c399','hall':'#e3e3d2','wall':'#e5e6d6','trim':'#5c7b6a','wood':'#ba9876','desk':'#f0e9d3','dark':'#264f44','screen':'#9abfb2','white':'#fff5df','coral':'#d39985'}
    m={n:a.mat(n,c,n=='carpet') for n,c in colors.items()};coll=[]
    def box(name,p,s,mat,solid=False):
        a.box(name,p,s,m[mat])
        if solid:coll.append({'name':name,'position':p,'size':s})
    box('Campus floor',(0,-.22,0),(100,.44,54),'carpet',True)
    box('Campus foundation',(0,-.57,0),(100.5,.26,54.5),'trim')
    for x in (-50.15,50.15):box('Boundary side',(x,1.7,0),(.3,3.4,54.6),'wall',True)
    box('Boundary back',(0,1.7,-27.15),(100,3.4,.3),'wall',True)
    box('Boundary front',(0,.28,27.15),(100,.56,.3),'trim',True)
    coll.append({'name':'Front limit','position':[0,2,27.35],'size':[100.6,4,.3]})
    rooms=[]
    north=[('ARCHIVO MUERTO','cream'),('ARCHIVO / EVIDENCIAS','gold'),('REUNIÓN ETERNA','pink'),('SISTEMAS / TI','blue'),('DIRECCIÓN','mint')]
    south=[('RECEPCIÓN / SALIDA','mint'),('CREATIVIDAD','pink'),('CAFETERÍA','cream'),('LOGÍSTICA','gold'),('AZOTEA / JARDÍN','blue')]
    for row,zoneZ,defs in [('north',-17,north),('south',17,south)]:
        for column,(name,color) in enumerate(defs):
            x=-40+column*20
            rooms.append({'id':f'{row}-{column}','name':name,'x':x,'z':zoneZ,'width':18,'depth':20,'color':colors[color]})
            box(f'{name} floor',(x,.008,zoneZ),(18,.015,20),color)
            frontZ=-6.8 if row=='north' else 6.8
            # Two segments leave a wide, genuine doorway.
            for dx in (-5.9,5.9):box('Room front',(x+dx,1.2,frontZ),(6.2,2.4,.2),'wall',True)
            for side in (-9.1,9.1):box('Room divider',(x+side,.95,zoneZ),(.18,1.9,20),'wall',True)
            box('Door lintel',(x,2.85,frontZ),(5.6,.3,.22),'trim')
            box('Door stripe',(x,.025,frontZ),(5.5,.025,.8),'coral')
            backZ=-26.85 if row=='north' else 26.8
            for dx in (-5.5,0,5.5):
                box('Window frame',(x+dx,2.1,backZ),(3.4,1.9,.12),'trim')
                box('Window',(x+dx,2.1,backZ+(.08 if row=='north' else -.08)),(3.18,1.7,.03),'screen')
            # Side desks preserve an open path down every room.
            for dx,dz in ([(-6,-5),(6,-5)] if row=='north' else [(-6,5),(6,5)]):
                xx,zz=x+dx,zoneZ+dz
                box('Desk top',(xx,1.05,zz),(2.7,.16,1.35),'desk',True)
                for lx in (-1.1,1.1):
                    for lz in (-.5,.5):box('Desk leg',(xx+lx,.49,zz+lz),(.1,.98,.1),'trim',True)
                box('Monitor',(xx,1.58,zz-.25),(1,.66,.1),'dark',True)
                box('Screen',(xx,1.58,zz-.19),(.86,.52,.02),'screen')
                box('Keyboard',(xx,1.15,zz+.32),(.8,.05,.3),'trim')
                box('Monitor base',(xx,1.19,zz-.25),(.15,.28,.15),'dark')
            # Side shelving is decorative and collidable, not a mission target.
            box('Side storage',(x-7.5,.8,zoneZ),(1.2,1.6,3),'wood',True)
            for zoff in (-1,0,1):box('Storage face',(x-6.87,.8,zoneZ+zoff),(.04,1.4,.85),'desk')
    # Central boulevard: five additional distinct public areas.
    for n,name in enumerate(['PLAZA DE BIENVENIDA','GALERÍA DEL EMPLEADO','PATIO CENTRAL','PASILLO DE AUDITORÍA','FOYER EJECUTIVO']):
        x=-40+20*n;rooms.append({'id':f'hall-{n}','name':name,'x':x,'z':0,'width':20,'depth':12,'color':colors['hall']})
        box('Boulevard tile',(x,.01,0),(20,.02,12),'hall')
        box('Wayfinding strip',(x,.03,0),(18,.02,.12),'trim')
        for z in (-4.4,4.4):
            box('Bench',(x-6,.5,z),(2.8,.2,.65),'wood',True)
            for dx in (-1,1):box('Bench foot',(x-6+dx,.25,z),(.1,.5,.5),'trim',True)
    # Cafeteria tables, meeting room and logistics create distinct silhouettes.
    for x,z in [(3,22),(-3,22),(-4,-21),(4,-21),(-20,19),(-24,23)]:
        box('Shared table',(x,1,z),(2.4,.18,1.3),'wood',True)
        box('Table pedestal',(x,.45,z),(.45,.9,.6),'trim',True)
    for x,z,h in [(14,22,1.5),(17,23,2),(24,21,1),(26,24,1.5),(-44,-23,1.8),(-37,-23,1.3)]:
        box('Packed storage',(x,h/2,z),(1.5,h,1.4),'wood',True)
        box('Packing band',(x,h+.02,z),(1.51,.035,.2),'desk')
    box('Director desk',(40,1,-24),(5,.2,1.5),'wood',True)
    for x in (38,42):box('Director desk foot',(x,.45,-24),(.3,.9,1.2),'trim',True)
    # Seven refill points, always beside an accessible aisle.
    dispensers=[[-43,12],[-25,-10],[5,10],[25,-10],[45,-10],[-20,4],[35,4]]
    for x,z in dispensers:
        box('Dispenser base',(x,.65,z),(1.25,1.3,1),'coral',True)
        box('Dispenser lid',(x,1.36,z),(1.35,.12,1.1),'dark',True)
        box('Dispenser opening',(x,.8,z+.52),(.65,.45,.04),'dark')
        box('Dispenser sign',(x,1.9,z+.2),(1.2,.85,.1),'dark')
    a.save('campus.glb')
    (OUT/'campus-colliders.json').write_text(json.dumps(coll,indent=2),encoding='utf-8')
    (OUT/'campus.json').write_text(json.dumps({'width':100,'depth':54,'previousArea':360,'areaMultiplier':15,'spawn':[-40,18],'exit':[-44,23],'rooms':rooms,'dispensers':dispensers},indent=2,ensure_ascii=False),encoding='utf-8')
    employee()
    print(f'Campus: 100 x 54 = 5400 units², exactly 15x. {len(rooms)} areas; {len(coll)} static colliders.')
if __name__=='__main__':build()
