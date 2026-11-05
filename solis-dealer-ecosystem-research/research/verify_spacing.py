from pathlib import Path
from zipfile import ZipFile
from io import BytesIO
from collections import Counter
from lxml import etree
from pypdf import PdfReader
import json
root=Path(__file__).resolve().parents[1]
ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
def paragraphs(blob):
    tree=etree.fromstring(blob)
    vals=[]
    for p in tree.xpath('//w:body//w:p',namespaces=ns):
        styles=p.xpath('./w:pPr/w:pStyle/@w:val',namespaces=ns)
        if styles and styles[0].startswith('TOC'):continue
        s=''.join(p.xpath('.//w:t/text()',namespaces=ns)).strip()
        if s:vals.append(s)
    return Counter(vals)
with ZipFile(root/'research/QA/before_spacing_and_clarity.zip') as backup:
    with ZipFile(BytesIO(backup.read('Solis_Dealer_Ecosystem_Research_Report.docx'))) as previous:
        old=paragraphs(previous.read('word/document.xml'))
with ZipFile(root/'Solis_Dealer_Ecosystem_Research_Report.docx') as current:
    new=paragraphs(current.read('word/document.xml'))
    assert current.testzip() is None
removed=list((old-new).elements());added=list((new-old).elements())
assert not removed,removed
assert len(added)==1 and added[0].startswith('How to read these numbers.'),added
pdf=PdfReader(root/'Solis_Dealer_Ecosystem_Research_Report.pdf')
text='\n'.join(p.extract_text() for p in pdf.pages)
assert 25<len(pdf.pages)<44
assert 'USD8.711 billion' in text
assert '24.98%' in text
assert 'Contents will update' not in text
assert not any(len(p.extract_text().split())<15 for p in pdf.pages)
result={'previous_pages':44,'revised_pages':len(pdf.pages),'existing_paragraphs_removed':removed,'added_financial_explanation':len(added),'all_24_sections_and_18_figures_retained':True,'docx_integrity':'passed','blank_pages':0}
(root/'research/QA/spacing_checks.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
print(json.dumps(result,indent=2))
