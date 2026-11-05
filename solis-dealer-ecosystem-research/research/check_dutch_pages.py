from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import json, re, html
from urllib.request import urlopen, Request
root = Path(__file__).resolve().parents[1]
urls = {
    'comparison':'https://www.solistractor.nl/vergelijken/?modellen%5B%5D=s26&modellen%5B%5D=h26',
    'narrow_selector':'https://www.solistractor.nl/keuzehulp/?situation=laden&transmission=shuttle&width=100',
    'demo':'https://www.solistractor.nl/demonstratie/?model=s26',
    'registration':'https://www.solistractor.nl/garantieformulier/',
}
def fetch(item):
    key, url = item
    with urlopen(Request(url, headers={'User-Agent':'Mozilla/5.0'}), timeout=35) as response:
        status = response.status
        markup = response.read().decode('utf-8')
    markup = re.sub(r'<(script|style)\b[^>]*>.*?</\1>', '', markup, flags=re.S|re.I)
    text = ' '.join(html.unescape(re.sub(r'<[^>]+>', ' ', markup)).split())
    return key, dict(url=url, status=status, text=text)
snapshots = dict(ThreadPoolExecutor(max_workers=4).map(fetch, urls.items()))
assert 'S26' in snapshots['comparison']['text'] and 'H26' in snapshots['comparison']['text']
assert '0 cm' in snapshots['narrow_selector']['text']
assert 'Nog in te vullen' in snapshots['demo']['text']
assert 'Origineel aankoopbewijs' in snapshots['registration']['text']
(root/'research/QA/dutch_source_snapshots.json').write_text(json.dumps(snapshots, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({key:{'status':v['status'],'characters':len(v['text'])} for key,v in snapshots.items()}))
