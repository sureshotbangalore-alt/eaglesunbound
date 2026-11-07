"""Verify the actual Next proxy and SSR content update, then restore the original content."""
from pathlib import Path
import re
import httpx

root=Path(__file__).resolve().parents[1]
import argparse
from urllib.parse import urlsplit
from dotenv import dotenv_values
parser=argparse.ArgumentParser(description='Mutation test restricted to a separate local SQLite fixture.')
parser.add_argument('--env-file',required=True,help='Explicit isolated QA backend environment file')
parser.add_argument('--base',default='http://127.0.0.1:3000')
parser.add_argument('--allow-writes',action='store_true')
args=parser.parse_args()
env=dotenv_values(args.env_file)
if not args.allow_writes or not str(env.get('DATABASE_URL','')).startswith('sqlite:') or urlsplit(args.base).hostname not in {'localhost','127.0.0.1'}:
    parser.error('Requires --allow-writes, an isolated SQLite profile, and a loopback frontend URL. Production profiles are rejected.')
headers={'Origin':args.base.rstrip('/'),'X-Requested-With':'EaglesAdmin'}
with httpx.Client(base_url=args.base,timeout=20,headers=headers) as client:
    assert client.get('/api/admin/records/bookings').status_code==401
    login=client.post('/api/admin/login',json={'email':env['ADMIN_EMAIL'],'password':env['ADMIN_PASSWORD']})
    assert login.status_code==200, f'Login failed: {login.status_code}'
    original=client.get('/api/admin/content').json()
    try:
        changed={**original,'hero_title':'HTTP CMS PERSISTENCE CHECK.'}
        saved=client.put('/api/admin/content',json=changed)
        assert saved.status_code==200
        assert client.get('/api/public/home').json()['hero_title']==changed['hero_title']
        # Public SSR content is cached; retry after an explicit local development refresh.
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
