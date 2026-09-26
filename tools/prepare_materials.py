"""Fetch the credited CC0 scans once; runtime uses compressed local textures only."""
import io,json,urllib.request
from pathlib import Path
from PIL import Image,ImageOps,ImageEnhance,ImageStat
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets/textures/pbr';OUT.mkdir(parents=True,exist_ok=True)
sets={'oak':('wood_floor','Diffuse',1024),'plaster':('white_plaster_02','Diffuse',512),'concrete':('concrete_floor_02','Diffuse',1024),'fabric':('dirty_carpet','Diffuse',512)}
manifest=[]
def fetch(url):
    with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'RenunciaDefinitivaStudentProject/1.0'}),timeout=60) as r:return r.read()
for name,(asset,color_key,size) in sets.items():
    files=json.loads(fetch('https://api.polyhaven.com/files/'+asset))
    for suffix,key in [('color',color_key),('normal','nor_gl'),('roughness','Rough')]:
        url=files[key]['1k']['jpg']['url']
        im=Image.open(io.BytesIO(fetch(url))).convert('RGB').resize((size,size),Image.Resampling.LANCZOS)
        if suffix=='color' and name in ('plaster','fabric','concrete'):
            im=ImageOps.grayscale(im).convert('RGB')
            # Remove baked color cast; tint shared materials in linear lighting at runtime.
            if name=='fabric':im=ImageEnhance.Contrast(ImageEnhance.Brightness(im).enhance(195/max(1,ImageStat.Stat(im).mean[0]))).enhance(.45)
            if name=='concrete':im=ImageEnhance.Contrast(ImageEnhance.Brightness(im).enhance(1.25)).enhance(.4)
            if name=='plaster':im=ImageEnhance.Contrast(ImageEnhance.Brightness(im).enhance(1.3)).enhance(.22)
        target=OUT/f'{name}-{suffix}.webp';im.save(target,'WEBP',quality=90 if suffix=='normal' else 86,method=6)
        manifest.append({'file':target.relative_to(ROOT).as_posix(),'source':url,'asset':'https://polyhaven.com/a/'+asset,'license':'CC0','resolution':size,'bytes':target.stat().st_size})
    print(name,size)
(OUT/'sources.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
print('Total bytes:',sum(x['bytes'] for x in manifest))
