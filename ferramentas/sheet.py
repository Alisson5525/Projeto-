import sys,os,math
from PIL import Image, ImageDraw
out=sys.argv[1]; files=sys.argv[2:]
cell=160; cols=8; rows=math.ceil(len(files)/cols)
sheet=Image.new('RGBA',(cols*cell,rows*(cell+14)),(40,40,48,255)); d=ImageDraw.Draw(sheet)
for i,f in enumerate(files):
    im=Image.open(f).convert('RGBA'); w,h=im.size; s=min((cell-4)/w,(cell-4)/h)
    s= max(1,int(s)) if s>=1 else s
    im=im.resize((max(1,int(w*s)),max(1,int(h*s))),Image.NEAREST)
    x=(i%cols)*cell; y=(i//cols)*(cell+14)
    bg=Image.new('RGBA',(cell,cell),(90,90,100,255))
    for yy in range(0,cell,8):
        for xx in range(0,cell,8):
            if (xx//8+yy//8)%2: bg.paste((110,110,120,255),(xx,yy,xx+8,yy+8))
    sheet.paste(bg,(x,y)); sheet.alpha_composite(im,(x+2,y+2))
    d.text((x+2,y+cell),os.path.basename(f)[:24],fill=(255,255,255,255))
sheet.save(out)
