"""Parse and render PDFs exported by the real module's event handlers."""
from pathlib import Path
import json
import fitz
from pypdf import PdfReader
from PIL import Image, ImageDraw
root=Path(__file__).resolve().parent.parent
qa=root/'docs'/'qa'
reports=[]
thumbs=[]
for path in sorted(qa.glob('*.pdf')):
    reader=PdfReader(path,strict=True)
    assert len(reader.pages)==1,path
    doc=fitz.open(path)
    page=doc[0]
    expected=(792,612) if path.name=='paper-letter-landscape.pdf' else (595.276,841.89)
    assert abs(page.rect.width-expected[0])<.01,path
    assert abs(page.rect.height-expected[1])<.01,path
    for block in page.get_text('dict')['blocks']:
        if block['type']!=0:continue
        for line in block['lines']:
            x0,y0,x1,y1=line['bbox']
            assert x0>=0 and y0>=0 and x1<=page.rect.width and y1<=page.rect.height,(path,line)
    pix=page.get_pixmap(matrix=fitz.Matrix(.7,.7),alpha=False)
    png=qa/(path.stem+'.png');pix.save(png)
    thumb=Image.open(png).convert('RGB');thumb.thumbnail((270,350))
    tile=Image.new('RGB',(300,390),'#edf0e9');tile.paste(thumb,((300-thumb.width)//2,25))
    ImageDraw.Draw(tile).text((12,365),path.stem,fill='#193c30')
    thumbs.append(tile)
    reports.append({'file':path.name,'pages':1,'width_pt':round(page.rect.width,3),'height_pt':round(page.rect.height,3),'bytes':path.stat().st_size,'parsed':True,'text_within_page':True})
assert len(reports)==12,len(reports)
contact=Image.new('RGB',(1200,390*3),'white')
for i,tile in enumerate(thumbs):contact.paste(tile,((i%4)*300,(i//4)*390))
contact.save(qa/'pdf-contact-sheet.png')
(qa/'pdf-report.json').write_text(json.dumps({'passed':True,'files':reports},indent=2))
print(json.dumps({'passed':True,'pdfs':len(reports),'all_single_page':True,'dimensions_verified':True,'text_within_page':True},indent=2))
