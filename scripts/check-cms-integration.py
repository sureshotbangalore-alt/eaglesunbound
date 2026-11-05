"""Verify the actual Next proxy and SSR content update, then restore the original content."""
from pathlib import Path
import re
import httpx

root=Path(__file__).resolve().parents[1]
env={}
for line in (root/'backend'/'.env').read_text(encoding='utf-8').splitlines():
    if '=' in line and not line.lstrip().startswith('#'):
        key,value=line.split('=',1);env[key]=value
headers={'Origin':'http://localhost:3000','X-Requested-With':'EaglesAdmin'}
with httpx.Client(base_url='http://localhost:3000',timeout=20,headers=headers) as client:
    assert client.get('/api/admin/records/bookings').status_code==401
    login=client.post('/api/admin/login',json={'email':env['ADMIN_EMAIL'],'password':env['ADMIN_PASSWORD']})
    assert login.status_code==200, f'Login failed: {login.status_code}'
    original=client.get('/api/admin/content').json()
    try:
        changed={**original,'hero_title':'HTTP CMS PERSISTENCE CHECK.'}
        saved=client.put('/api/admin/content',json=changed)
        assert saved.status_code==200
        assert client.get('/api/public/home').json()['hero_title']==changed['hero_title']
        html=client.get('/').text
        h1=re.search(r'<h1[^>]*>(.*?)</h1>',html,re.S).group(1)
        text=re.sub(r'<[^>]+>','',h1)
        assert ' '.join(text.split())==changed['hero_title']
    finally:
        restored=client.put('/api/admin/content',json=original)
        assert restored.status_code==200
        client.post('/api/admin/logout')
    assert client.get('/api/admin/me').status_code==401
print('PASS: private proxy protection, cookie login, database-backed CMS save, server-rendered update, restore and logout.')
