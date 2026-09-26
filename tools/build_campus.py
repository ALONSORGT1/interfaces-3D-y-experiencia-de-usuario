"""Build the 100 x 54 corporate campus (15 times the original floor area).
Uses the original GLB writer; models, materials and colliders share one source.
"""
import json, math
from generate_assets import GLB, OUT, employee

def build():
    a=GLB()
    colors={'glass':'#aacbdc','metal':'#97a8b3','light':'#fff2dc','carpetBlue':'#6e889b','carpetGreen':'#8ba297','carpetCoral':'#b78580','carpet':'#bdc7cd','mint':'#3a9d83','cream':'#dfd9cd','pink':'#d56a75','blue':'#327bd1','gold':'#edb72f','hall':'#e3e3d2','wall':'#edf1ef','trim':'#38474f','wood':'#ba9876','desk':'#f0e9d3','dark':'#264f44','screen':'#9abfb2','white':'#fff5df','coral':'#d95d50'}
    m={n:a.mat(n,c) for n,c in colors.items()};coll=[]; solids=[]
    def box(name,p,s,mat,solid=False):
        a.box(name,p,s,m[mat])
        if solid:
            coll.append({'name':name,'position':p,'size':s})
            solids.append({'name':name,'position':p,'size':s})
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
            floorMat='wood' if (row,column) in [('south',0),('south',2),('north',4)] else 'carpetBlue' if column in (0,3) else 'carpetCoral' if column==1 and row=='south' else 'carpetGreen'
            box(f'{name} floor',(x,.008,zoneZ),(18,.015,20),floorMat)
            frontZ=-6.8 if row=='north' else 6.8
            # Two segments leave a wide, genuine doorway.
            for dx in (-5.9,5.9):box('Room front',(x+dx,1.6,frontZ),(6.2,3.2,.22),color if dx<0 else 'wall',True)
            for side in (-9.1,9.1):
                box('Room divider base',(x+side,.4,zoneZ),(.18,.8,20),'wood',True)
                box('Glass partition',(x+side,2,zoneZ),(.1,2.4,20),'glass',True)
                for dz in (-9.9,-5,0,5,9.9):box('Partition post',(x+side,1.6,zoneZ+dz),(.16,3.2,.1),'metal',True)
                box('Partition top rail',(x+side,3.2,zoneZ),(.16,.08,20),'metal')
            box('Door lintel',(x,3.22,frontZ),(5.6,.22,.25),'trim',True)
            box('Door stripe',(x,.025,frontZ),(5.5,.025,.8),'coral')
            backZ=-26.85 if row=='north' else 26.8
            for dx in (-5.5,0,5.5):
                box('Window frame',(x+dx,2.1,backZ),(3.4,1.9,.12),'metal')
                box('Window',(x+dx,2.1,backZ+(.08 if row=='north' else -.08)),(3.18,1.7,.06),'glass',True)
            # Side desks preserve an open path down every room.
            for dx,dz in ([(-6,-5),(6,-5)] if row=='north' else [(-6,5),(6,5)]):
                if row=="south" and column==0 and dx==-6: continue # clear elevator lobby
                xx,zz=x+dx,zoneZ+dz
                box('Desk top',(xx,1.05,zz),(2.7,.16,1.35),'wood',True)
                for lx in (-1.1,1.1):
                    for lz in (-.5,.5):box('Desk leg',(xx+lx,.49,zz+lz),(.1,.98,.1),'trim',True)
                box('Monitor',(xx,1.58,zz-.25),(1,.66,.1),'dark',True)
                box('Screen',(xx,1.58,zz-.19),(.86,.52,.02),'screen')
                box('Keyboard',(xx,1.15,zz+.32),(.8,.05,.3),'trim')
                box('Monitor base',(xx,1.19,zz-.25),(.15,.28,.15),'dark')
                box('Office printer',(xx+.88,1.35,zz),(.62,.45,.55),'white',True)
                box('Printer lid',(xx+.88,1.6,zz),(.6,.05,.52),'trim')
                box('Printer output',(xx+.88,1.3,zz+.29),(.42,.07,.07),'dark')
                box('Printed page',(xx+.88,1.28,zz+.4),(.35,.02,.24),'white')
                box('Coffee mug',(xx-.94,1.28,zz+.3),(.18,.25,.18),'coral')
                for sheet in range(3):box('Paper stack',(xx-.8,1.15+sheet*.025,zz-.15),(.5,.02,.35),'white')
                box('Pen holder',(xx+.55,1.26,zz+.35),(.13,.22,.13),'gold')
                for pen in range(3):box('Pen',(xx+.51+pen*.035,1.44,zz+.35),(.015,.25,.015),'dark')
            # Side shelving is decorative and collidable, not a mission target.
            box('Side storage',(x-7.5,.8,zoneZ),(1.2,1.6,3),'wood',True)
            for zoff in (-1,0,1):box('Storage face',(x-6.87,.8,zoneZ+zoff),(.04,1.4,.85),'desk')
            # Wall decoration stays above the navigation corridor.
            artZ=zoneZ+(-7 if row=='north' else 7)
            box('Picture frame',(x+8.94,2.35,artZ),(.07,1.1,1.6),'metal')
            box('Abstract print',(x+8.89,2.35,artZ),(.03,.92,1.42),'blue')
            box('Art accent',(x+8.86,2.5,artZ+.23),(.025,.3,.6),'coral')
            box('Noticeboard',(x-8.93,2.35,zoneZ+4),(.08,1.1,1.6),'gold')
            for note in range(3):box('Pinned note',(x-8.87,2.4,zoneZ+3.5+note*.48),(.02,.4,.3),'white')
            box('Wall clock',(x,2.45,backZ+(.12 if row=='north' else -.12)),(.6,.6,.09),'dark')
            box('Clock face',(x,2.45,backZ+(.18 if row=='north' else -.18)),(.5,.5,.03),'white')
    # A recessed elevator cabin, not a floor marker.
    box('Elevator back',(-44,1.6,26),(4,3.2,.15),'dark',True)
    for xx in (-46,-42):box('Elevator side',(xx,1.6,24.3),(.18,3.2,3.5),'trim',True)
    box('Elevator ceiling',(-44,3.25,24.3),(4.2,.18,3.5),'trim')
    box('Elevator cabin floor',(-44,.025,24.3),(3.8,.05,3.4),'desk',True)
    box('Elevator mirror',(-44,1.85,25.89),(2.8,1.8,.03),'screen')
    box('Elevator handrail',(-44,1.1,25.7),(3.1,.08,.08),'metal',True)
    box('Elevator threshold',(-44,.035,22.55),(4,.06,.4),'dark',True)
    box('Elevator light',(-44,3.12,24.3),(2,.035,.4),'light')
    box('Elevator call panel',(-41.8,1.2,22.6),(.23,.5,.14),'dark')
    box('Elevator call button',(-41.8,1.22,22.51),(.1,.1,.02),'gold')
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
    dispensers=[[-43,12],[-25,-10],[5,10],[25,-10],[45,-10],[-17,2],[35,4]]
    for x,z in dispensers:
        box('Dispenser base',(x,.65,z),(1.25,1.3,1),'coral',True)
        box('Dispenser lid',(x,1.36,z),(1.35,.12,1.1),'dark',True)
        box('Dispenser opening',(x,.8,z+.52),(.65,.45,.04),'dark')
        box('Dispenser sign',(x,1.9,z+.2),(1.2,.85,.1),'dark')
    # Collaboration lounges occupy side bays, preserving all mission anchors and doors.
    for x,z,color in [(-34,-15,'blue'),(-14,14,'coral'),(6,-15,'gold'),(34,14,'mint')]:
        box('Lounge rug',(x,.026,z),(4.4,.035,5),'carpetBlue')
        box('Sofa plinth',(x,.2,z),(2.8,.3,1.05),'dark',True)
        box('Sofa seat',(x,.48,z),(2.8,.3,1.1),color,True)
        box('Sofa back',(x,.95,z+.45),(2.8,.9,.28),color,True)
        for dx in (-1.36,1.36):box('Sofa arm',(x+dx,.65,z),(.24,.64,1.1),color,True)
        box('Lounge table top',(x,.65,z-1.8),(1.8,.14,.9),'wood',True)
        for dx in (-.65,.65):box('Lounge table leg',(x+dx,.29,z-1.8),(.12,.58,.6),'metal',True)
    # Timber slats, acoustic panels and linear LED fixtures are consistent across zones.
    for room in rooms[:10]:
        x,z=room['x'],room['z'];back=-26.7 if z<0 else 26.6
        for dx in range(8):box('Acoustic timber fin',(x-8+dx*.25,1.65,back),( .1,3.1,.13),'wood')
        for dx in (-4,4):
            box('Pendant housing',(x+dx,3.75,z),(3.6,.13,.38),'metal',True)
            box('LED diffuser',(x+dx,3.67,z),(3.4,.025,.3),'light')
            for sx in (-1.2,1.2):box('Pendant cable',(x+dx+sx,4.2,z),(.018,.8,.018),'metal')
        # Whiteboard and a low credenza, away from playable centers.
        box('Whiteboard frame',(x+8.87,2.2,z+4),(.09,1.2,2.2),'metal')
        box('Whiteboard',(x+8.80,2.2,z+4),(.035,1.08,2.08),'white')
        for line in range(3):box('Whiteboard note',(x+8.77,2.45-line*.22,z+3.5),(.015,.025,.65),'blue')
    for x,z in [(-47,20),(-28,-12),(-8,20),(12,-12),(28,12),(47,19)]:
        a.cylinder('Planter pot',(x,.4,z),(.85,.8,.85),m['white'])
        pot={'name':'Planter pot','position':[x,.4,z],'size':[.85,.8,.85],'shape':'cylinder'};coll.append(pot);solids.append(pot)
        a.cylinder('Planter soil',(x,.81,z),(.72,.04,.72),m['dark'])
        a.cylinder('Plant stem',(x,1.25,z),(.07,1,.07),m['wood'])
        for leaf in range(9):
            angle=leaf*2.4;dx=math.cos(angle)*.26;dz=math.sin(angle)*.26
            node=a.box('Foliage',(x+dx,1.4+leaf*.065,z+dz),(.18,.58,.1),m['mint'])
            a.g['nodes'][node]['rotation']=[0,0,math.sin(math.cos(angle)*.4),math.cos(math.cos(angle)*.4)]
    # Each uninterrupted divider is a single compound envelope, avoiding seam contacts.
    divider_names={'Room divider base','Glass partition','Partition post'}
    coll=[c for c in coll if c['name'] not in divider_names]
    for room in rooms[:10]:
        for side in (-9.1,9.1):coll.append({'name':'Partition solid envelope','position':[room['x']+side,1.62,room['z']],'size':[.18,3.24,20]})
    a.save('campus.glb')
    (OUT/'campus-colliders.json').write_text(json.dumps(coll,indent=2),encoding='utf-8')
    (OUT/'campus.json').write_text(json.dumps({'width':100,'depth':54,'previousArea':360,'areaMultiplier':15,'spawn':[-40,18],'exit':[-44,23],'rooms':rooms,'dispensers':dispensers,'solidManifest':solids},indent=2,ensure_ascii=False),encoding='utf-8')
    employee()
    print(f'Campus: 100 x 54 = 5400 units², exactly 15x. {len(rooms)} areas; {len(coll)} static colliders.')
if __name__=='__main__':build()
