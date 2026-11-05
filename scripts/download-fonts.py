import re,urllib.request
from pathlib import Path
s=Path('scripts/fonts.css').read_text()
for i,url in enumerate(re.findall(r'url\((.*?)\)',s)):
 name=f'font-{i}.ttf'
 urllib.request.urlretrieve(url,'frontend/public/assets/'+name)
 s=s.replace(url,'/assets/'+name)
Path('frontend/src/app/fonts.css').write_text(s)
