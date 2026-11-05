from pathlib import Path
import csv, io, json, zipfile
from decimal import Decimal
from xml.etree import ElementTree as ET

root = Path(__file__).resolve().parents[1]
csv_path = root / 'Financial_Analysis.csv'
with csv_path.open(encoding='utf-8-sig', newline='') as f:
    reader = csv.DictReader(f)
    fields, records = reader.fieldnames, list(reader)
original = json.loads((root / 'research/financial_data.json').read_text(encoding='utf-8'))['actuals']
assert len(records) == len(original) == 43
for record, source in zip(records, original):
    assert Decimal(record['Original reported value']) == Decimal(str(source['value']))
    scale = source['unit']
    multiplier = 10_000_000 if 'crore' in scale else 1000 if 'thousand' in scale else 1_000_000
    record['Equivalent full currency amount'] = str(int(Decimal(str(source['value'])) * multiplier))
with csv_path.open('w', encoding='utf-8', newline='') as f:
    writer = csv.DictWriter(f, fields, quoting=csv.QUOTE_ALL)
    writer.writeheader()
    writer.writerows(records)

ns = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
with zipfile.ZipFile(root / 'Financial_Analysis.xlsx') as z:
    assert z.testzip() is None
    workbook = ET.fromstring(z.read('xl/workbook.xml'))
    names = [s.attrib['name'] for s in workbook.findall('s:sheets/s:sheet', ns)]
    assert names == ['Start here', 'Company financials', 'Example only', 'Source data']
    source_sheet = ET.fromstring(z.read('xl/worksheets/sheet4.xml'))
    cells = {c.attrib['r']: c for c in source_sheet.findall('.//s:sheetData/s:row/s:c', ns)}
    for row, source in enumerate(original, 6):
        assert Decimal(cells[f'D{row}'].find('s:v', ns).text) == Decimal(str(source['value']))
    assert sum(1 for name in z.namelist() if name.startswith('xl/worksheets/sheet') and name.endswith('.xml')) == 4
    for name in z.namelist():
        if name.startswith('xl/worksheets/sheet') and name.endswith('.xml'):
            sheet = ET.fromstring(z.read(name))
            assert not sheet.findall('.//s:c[@t="e"]', ns)

financial_checks = json.loads((root / 'research/QA/clarity/checks.json').read_text())
assert financial_checks['record_count'] == 43
assert financial_checks['plain_money_example'] == 8_711_000_000
assert [r['values'][6] for r in financial_checks['scenario_checks']] == [995, 3980, 7960]

files = [root / name for name in [
    'Solis_Dealer_Ecosystem_Research_Report.docx',
    'Solis_Dealer_Ecosystem_Research_Report.pdf',
    'Executive_Summary.md', 'Source_Register.csv', 'Financial_Analysis.xlsx',
    'Financial_Analysis.csv', 'Financial_Analysis_Explained.md',
    'Research_Methodology_and_Gaps.md', 'Delivery_Verification.md',
]] + sorted((root / 'Visual_Assets').glob('*'))
assert all(p.is_file() for p in files)
assert len(files) == 28
package = root / 'Solis_Dealer_Ecosystem_Research_Package.zip'
with zipfile.ZipFile(package, 'w', compression=zipfile.ZIP_DEFLATED) as z:
    for p in files:
        z.write(p, p.relative_to(root).as_posix())
with zipfile.ZipFile(package) as z:
    assert z.testzip() is None
    assert len(z.namelist()) == 28
    assert all(not p.startswith('research/') for p in z.namelist())
result = {'package_files': 28, 'workbook_tabs': names, 'financial_records_preserved': 43,
          'csv_full_currency_amounts': 'exact integer units', 'spreadsheet_error_cells': 0,
          'package_integrity': 'passed'}
(root / 'research/QA/revision_package_checks.json').write_text(json.dumps(result, indent=2))
print(json.dumps(result, indent=2))
