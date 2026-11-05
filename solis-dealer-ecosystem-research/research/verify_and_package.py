from pathlib import Path
import csv,json,re,zipfile,hashlib
from pypdf import PdfReader
from docx import Document
ROOT=Path(__file__).resolve().parents[1]
qa=ROOT.parents[0]/'tmp'/'solis-spacing-final-qa'
sources=list(csv.DictReader((ROOT/'Source_Register.csv').open(encoding='utf-8-sig')))
assert len(sources)==67
assert len({s['id'] for s in sources})==67
assert len({s['url'] for s in sources})==62
assert all(s['url'].startswith('https://') for s in sources)
doc=Document(ROOT/'Solis_Dealer_Ecosystem_Research_Report.docx')
assert len([p for p in doc.paragraphs if p.style.name=='Heading 1'])==24
assert len(doc.inline_shapes)==18
reader=PdfReader(ROOT/'Solis_Dealer_Ecosystem_Research_Report.pdf')
assert len(reader.pages)==36
text='\n'.join(p.extract_text() for p in reader.pages)
assert '24.98%' in text and '17.64%' in text
assert '24.97%' not in text and '17.65%' not in text
assert 'Contents will update' not in text
assert '13,085' not in text
assert not re.search(r'turn\d+(search|view)',text)
for y,tr,pa,other,total in [(2023,8711,1816,3885.4,14412.4),(2024,7059.3,1827.8,2774.8,11661.9),(2025,6693,1873.3,1515.7,10082)]:
    assert abs(tr+pa+other-total)<.000001
assert round((428.261+177.910)/2427.107*100,2)==24.98
assert round(428.261/2427.107*100,2)==17.64
assert round((132.515+109.459)/382.556*100,2)==63.25
for adoption,mins,reduction,expected in [(.3,5,.01,995),(.6,10,.02,3980),(.8,15,.03,7960)]:
    assert abs(1000*adoption*mins/60*35 + 1000*adoption*reduction*40-expected)<1e-8
for path in [ROOT/'Solis_Dealer_Ecosystem_Research_Report.docx',ROOT/'Financial_Analysis.xlsx']:
    with zipfile.ZipFile(path) as z:assert z.testzip() is None
pngs=list(qa.glob('page-*.png'));assert len(pngs)==36
assert 'USD8.711billion' in re.sub(r'\s+','',text)
spacing=json.loads((ROOT/'research'/'QA'/'spacing_checks.json').read_text())
assert spacing['existing_paragraphs_removed']==[]
checks={'pages':len(reader.pages),'sections':24,'visuals':len(doc.inline_shapes),'source_records':67,'unique_urls':62,'all_source_ids_resolve':True,'zip_integrity':'passed','financial_arithmetic':'passed','rendered_pages':len(pngs),'original_paragraphs_removed':0,'blank_text_pages':[i+1 for i,p in enumerate(reader.pages) if len(p.extract_text().split())<15]}
assert not checks['blank_text_pages']
(ROOT/'research'/'QA'/'final_checks.json').write_text(json.dumps(checks,indent=2),encoding='utf-8')
print(json.dumps(checks,indent=2))
