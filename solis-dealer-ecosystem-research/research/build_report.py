from pathlib import Path
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
import json,re,csv,collections
ROOT=Path(__file__).resolve().parents[1]
SOURCES=[]
for name in ['identity_sources.json','benchmark_sources.json','finance_sources.json','main_sources.json','nl_identity_sources.json','nl_journey_sources.json']:
    SOURCES+=json.loads((ROOT/'research'/name).read_text(encoding='utf-8-sig'))
SOURCE={x['id']:x for x in SOURCES}
fields=['id','title','publisher','url','publication_date','access_date','classification','claim','evidence','limitations']
with (ROOT/'Source_Register.csv').open('w',newline='',encoding='utf-8-sig') as ff:
    w=csv.DictWriter(ff,fieldnames=fields,extrasaction='ignore');w.writeheader();w.writerows(SOURCES)
text=(ROOT/'research'/'report.md').read_text(encoding='utf-8')
used=set()
for refs in re.findall(r'\[([IBFM]\d\d(?:,[IBFM]\d\d)*)\]',text): used.update(refs.split(','))
assert used.issubset(SOURCE),f'Missing sources {used-set(SOURCE)}'
doc=Document();section=doc.sections[0]
section.page_width=Inches(8.2677);section.page_height=Inches(11.6929)
section.top_margin=Inches(.68);section.bottom_margin=Inches(.66)
section.left_margin=Inches(.72);section.right_margin=Inches(.72)
section.header_distance=Inches(.25);section.footer_distance=Inches(.26)
styles=doc.styles
for sn in ['Normal','Body Text','Title','Subtitle','Heading 1','Heading 2','Heading 3','Caption']:
    st=styles[sn];st.font.name='Arial';st.font.color.rgb=RGBColor(0,0,0)
normal=styles['Normal'];normal.font.size=Pt(10.5)
normal.paragraph_format.space_after=Pt(5)
normal.paragraph_format.line_spacing=1.06
normal.paragraph_format.keep_together=False
normal.paragraph_format.widow_control=True
styles['Title'].font.size=Pt(32);styles['Title'].font.bold=True
styles['Subtitle'].font.size=Pt(16)
for name,size in [('Heading 1',21),('Heading 2',14),('Heading 3',11.5)]:
    s=styles[name];s.font.size=Pt(size);s.font.bold=True
    s.paragraph_format.space_before=Pt(10 if name!='Heading 3' else 7);s.paragraph_format.space_after=Pt(5 if name!='Heading 3' else 3)
    s.paragraph_format.keep_with_next=True
styles['Caption'].font.size=Pt(8.5);styles['Caption'].font.color.rgb=RGBColor.from_string('536571')
for n in ['Normal','Title','Subtitle','Heading 1','Heading 2','Heading 3']:
    pp=styles[n].element.find(qn('w:pPr'))
    if pp is not None:
        for b in list(pp.findall(qn('w:pBdr'))):pp.remove(b)
doc.core_properties.title='Solis Dealer Digital Ecosystem Research'
doc.core_properties.subject='Evidence and investment decisions for the Netherlands dealer ecosystem'
doc.core_properties.author='Research prepared for Raja'
doc.core_properties.keywords='Solis ITL AgriXpert dealer parts onboarding research'
page_break_pending=False
space_after_table_pending=False
def para(*args,**kwargs):
    global page_break_pending,space_after_table_pending
    p=doc.add_paragraph(*args,**kwargs)
    if space_after_table_pending:
        inherited=p.style.paragraph_format.space_before
        p.paragraph_format.space_before=Pt(max(inherited.pt if inherited else 0,4))
        space_after_table_pending=False
    if page_break_pending:
        p.paragraph_format.page_break_before=True
        page_break_pending=False
    return p
foot=section.footer.paragraphs[0];foot.alignment=WD_ALIGN_PARAGRAPH.RIGHT
r=foot.add_run('Solis dealer ecosystem research  |  ');r.font.size=Pt(8);r.font.color.rgb=RGBColor.from_string('536571')
fld=OxmlElement('w:fldSimple');fld.set(qn('w:instr'),'PAGE');foot._p.append(fld)
def hyperlink(p,label,url,size=None):
    h=OxmlElement('w:hyperlink');rid=p.part.relate_to(url,'http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink',is_external=True);h.set(qn('r:id'),rid)
    rr=OxmlElement('w:r');rp=OxmlElement('w:rPr');color=OxmlElement('w:color');color.set(qn('w:val'),'087E8B');rp.append(color)
    if size:
        sz=OxmlElement('w:sz');sz.set(qn('w:val'),str(int(size*2)));rp.append(sz)
    rr.append(rp);t=OxmlElement('w:t');t.text=label;rr.append(t);h.append(rr);p._p.append(h)
def inline(p,s):
    pattern=r'(\*\*[^*]+\*\*|\[[IBFM]\d\d(?:,[IBFM]\d\d)*\]|\[[^\]]+\]\(https?://[^)]+\))'
    for part in re.split(pattern,s):
        if not part:continue
        if part.startswith('**'):
            rr=p.add_run(part[2:-2]);rr.bold=True
        elif re.fullmatch(r'\[[IBFM]\d\d(?:,[IBFM]\d\d)*\]',part):
            p.add_run('[')
            for i,ref in enumerate(part[1:-1].split(',')):
                if i:p.add_run(', ')
                hyperlink(p,ref,SOURCE[ref]['url'])
            p.add_run(']')
        elif re.match(r'\[.*\]\(https',part):
            m=re.match(r'\[([^\]]+)\]\(([^)]+)\)',part);hyperlink(p,m[1],m[2])
        else:p.add_run(part)
def table(lines):
    global space_after_table_pending
    rows=[[c.strip() for c in l.strip().strip('|').split('|')] for l in lines]
    rows=[r for r in rows if not all(re.fullmatch(r'[: -]+',v) for v in r)]
    cols=max(map(len,rows));t=doc.add_table(rows=0,cols=cols);t.alignment=WD_TABLE_ALIGNMENT.CENTER
    t.autofit=False
    if cols==4: widths=[1.6,1.95,1.85,1.42]
    elif cols==3:widths=[1.85,2.55,2.42]
    elif cols==5:widths=[1.7,1.25,1.25,1.3,1.32]
    elif cols==6:widths=[1.35,1.0,1.05,1.13,1.25,1.04]
    else:widths=[6.82/cols]*cols
    for i,row in enumerate(rows):
        cells=t.add_row().cells
        for j,c in enumerate(cells):
            c.width=Inches(widths[j]);c.vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER
            tcPr=c._tc.get_or_add_tcPr()
            sh=OxmlElement('w:shd');sh.set(qn('w:fill'),'19354C' if i==0 else ('EDF4F6' if i%2 else 'FFFFFF'));tcPr.append(sh)
            margins=OxmlElement('w:tcMar')
            for edge in ['top','left','bottom','right']:
                ee=OxmlElement('w:'+edge);ee.set(qn('w:w'),'65');ee.set(qn('w:type'),'dxa');margins.append(ee)
            tcPr.append(margins)
            p=c.paragraphs[0];p.paragraph_format.space_after=Pt(1);p.paragraph_format.line_spacing=1.04
            if i==0:p.paragraph_format.keep_with_next=True
            inline(p,row[j] if j<len(row) else '')
            for rr in p.runs:
                rr.font.size=Pt(8.8 if cols>=5 else 9.2)
                if i==0:rr.font.bold=True;rr.font.color.rgb=RGBColor(255,255,255)
        trPr=t.rows[-1]._tr.get_or_add_trPr()
        no=OxmlElement('w:cantSplit');trPr.append(no)
        if i==0:
            hdr=OxmlElement('w:tblHeader');trPr.append(hdr)
    borders=OxmlElement('w:tblBorders')
    for edge in ['top','left','bottom','right','insideH','insideV']:
        e=OxmlElement('w:'+edge);e.set(qn('w:val'),'single');e.set(qn('w:sz'),'4');e.set(qn('w:color'),'D9D9D9');borders.append(e)
    t._tbl.tblPr.append(borders)
    # Set explicit grid widths so Word respects deliberate column sizing.
    for col,wid in zip(t.columns,widths):col.width=Inches(wid)
    space_after_table_pending=True
def source_appendix():
    # Group identical originals and retain all original IDs.
    groups=collections.OrderedDict()
    for s in SOURCES:groups.setdefault(s['url'],[]).append(s)
    for url,group in groups.items():
        ss=group[-1];ids=', '.join(x['id'] for x in group)
        p=para(style='Heading 3');p.add_run(ids+'  '+ss['title'])
        p=para();p.paragraph_format.space_after=Pt(2);p.paragraph_format.keep_with_next=True
        inline(p,ss['publisher']+' | '+ss['classification']+' | Published '+(ss.get('publication_date') or 'not stated')+' | Accessed '+ss['access_date'])
        for rr in p.runs:rr.font.size=Pt(8.7)
        p=para();p.paragraph_format.space_after=Pt(2);p.paragraph_format.keep_with_next=True;hyperlink(p,url,url,8.2)
        p=para();p.paragraph_format.space_after=Pt(2);p.paragraph_format.keep_with_next=True
        inline(p,'Supports: '+ss['claim'])
        for rr in p.runs:rr.font.size=Pt(9)
        p=para();p.paragraph_format.space_after=Pt(5)
        inline(p,'Evidence and limits: '+ss.get('evidence','')+' '+ss.get('limitations',''))
        for rr in p.runs:rr.font.size=Pt(8.7)
lines=text.splitlines();i=0;imagecount=0;headingcount=0;break_count=0
while i<len(lines):
    line=lines[i].strip()
    if not line:i+=1;continue
    if line=='<!-- PAGE -->':
        break_count+=1
        if break_count<=3:page_break_pending=True
        i+=1;continue
    if line=='<!-- SOURCES -->':source_appendix();i+=1;continue
    if line.startswith('|'):
        ls=[]
        while i<len(lines) and lines[i].strip().startswith('|'):ls.append(lines[i].strip());i+=1
        table(ls);continue
    if line.startswith('!['):
        m=re.match(r'!\[([^\]]+)\]\(([^)]+)\)',line);path=ROOT/m[2]
        p=para();p.paragraph_format.keep_with_next=True;p.paragraph_format.space_before=Pt(5);p.paragraph_format.space_after=Pt(2)
        r=p.add_run();r.add_picture(str(path),width=Inches(6.8))
        # Alt text retained in editable file.
        for pic in r._r.xpath('.//wp:docPr'):pic.set('descr',m[1])
        cp=para(m[1]+'  |  '+('Peer evidence only' if 'financial_mix' in m[2] else 'Evidence map or proposed design as labelled'),style='Caption')
        cp.paragraph_format.space_before=Pt(1);cp.paragraph_format.space_after=Pt(5);cp.paragraph_format.keep_with_next=False
        imagecount+=1;i+=1;continue
    if line.startswith('# '):
        p=para(line[2:],style='Title');p.paragraph_format.space_before=Pt(28);p.paragraph_format.space_after=Pt(18)
        i+=1;continue
    if line.startswith('## '):
        if line.startswith('## 3 '):
            para('Contents',style='Heading 2')
            p=para()
            rr=p.add_run();begin=OxmlElement('w:fldChar');begin.set(qn('w:fldCharType'),'begin');rr._r.append(begin)
            code=OxmlElement('w:instrText');code.set(qn('xml:space'),'preserve');code.text=' TOC \\o "1-1" \\h \\z \\u ';rr._r.append(code)
            sep=OxmlElement('w:fldChar');sep.set(qn('w:fldCharType'),'separate');rr._r.append(sep)
            p.add_run('Contents will update when opened in Word')
            end=OxmlElement('w:fldChar');end.set(qn('w:fldCharType'),'end');p.add_run()._r.append(end)
            page_break_pending=True
        headingcount+=1;para(line[3:],style='Heading 1');i+=1;continue
    if line.startswith('### '):para(line[4:],style='Heading 2');i+=1;continue
    if re.match(r'^\d+\. ',line):p=para(style='List Number');inline(p,re.sub(r'^\d+\. ','',line));i+=1;continue
    p=para();inline(p,line)
    i+=1
    # Insert contents after decision section, before scope begins.
    if i<len(lines) and lines[i].startswith('<!-- impossible marker -->'):pass
out=ROOT/'Solis_Dealer_Ecosystem_Research_Report.docx';doc.save(out)
assert headingcount==24,headingcount
assert imagecount>=14,imagecount
summary={'sources':len(SOURCES),'unique_source_urls':len(set(s['url'] for s in SOURCES)),'cited_source_ids':len(used),'sections':headingcount,'visuals_in_report':imagecount,'word_count_main_markdown':len(text.split())}
(ROOT/'research'/'content_validation.json').write_text(json.dumps(summary,indent=2),encoding='utf-8')
print(json.dumps(summary));print(str(out))
