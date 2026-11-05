"""Read-only HTTP audit. Does not launch or control a browser."""
import argparse
import json
import re
from collections import deque
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlsplit, urldefrag
from urllib.request import urlopen, Request
import httpx
from xml.etree import ElementTree


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links=[]; self.assets=[]; self.ids=set(); self.h1=0; self.title=''; self.in_title=False; self.description=''; self.canonical=''; self.alt_missing=[]
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if 'id' in a:self.ids.add(a['id'])
        if tag=='a' and a.get('href'):self.links.append(a['href'])
        if tag in ('video','source') and a.get('src'):self.assets.append(a['src'])
        if tag=='link' and a.get('rel')=='stylesheet' and a.get('href'):self.assets.append(a['href'])
        if tag=='img':
            if a.get('src'):self.assets.append(a['src'])
            if 'alt' not in a:self.alt_missing.append(a.get('src'))
        if tag=='h1':self.h1+=1
        if tag=='title':self.in_title=True
        if tag=='meta' and a.get('name')=='description':self.description=a.get('content','')
        if tag=='link' and a.get('rel')=='canonical':self.canonical=a.get('href','')
    def handle_endtag(self, tag):
        if tag=='title':self.in_title=False
    def handle_data(self, text):
        if self.in_title:self.title+=text


def audit(base):
    client=httpx.Client(follow_redirects=True,timeout=15,headers={'User-Agent':'EaglesRouteAudit/1.0'})
    required=['/','/the-bootcamp','/what-we-offer','/activities','/packages','/clients','/about','/gallery','/book-now','/contact','/faqs','/privacy-policy','/terms-and-conditions','/booking-policy']
    admin=['/admin','/admin/login','/admin/dashboard','/admin/pages','/admin/programmes','/admin/activities','/admin/packages','/admin/bookings','/admin/enquiries','/admin/gallery','/admin/clients','/admin/media','/admin/settings','/admin/seo']
    pending=deque(required+admin+['/sitemap.xml','/robots.txt','/missing-route-check','/bootcamp','/programmes','/book','/contact-us'])
    seen=set(); checked=[]; broken=[]; redirects=[]; warnings=[]; externals=set(); incoming=set(); titles={}; assets=set()
    while pending and len(seen)<200:
        path=pending.popleft();path=urldefrag(path)[0] or '/'
        if path in seen:continue
        seen.add(path);url=base+path
        try:
            response=client.get(url)
            response.raise_for_status()
            text=response.text;status=response.status_code;final=str(response.url)
            content_type=response.headers.get('content-type','')
            checked.append({'path':path,'status':status})
            if final!=url:redirects.append({'from':path,'to':urlsplit(final).path})
            if path=='/sitemap.xml':
                for node in ElementTree.fromstring(text).iter():
                    if node.tag.endswith('loc'):
                        loc=urlsplit(node.text or '');pending.append(loc.path)
                        if loc.netloc!=urlsplit(base).netloc:warnings.append({'path':path,'issue':'Sitemap origin differs from audit origin; verify production configuration','url':node.text})
                continue
            if 'html' not in content_type:continue
            parser=Page();parser.feed(text)
            if not path.startswith('/admin'):
                if parser.h1!=1:warnings.append({'path':path,'issue':f'{parser.h1} H1 elements'})
                if not parser.title:warnings.append({'path':path,'issue':'Missing title'})
                if not parser.description:warnings.append({'path':path,'issue':'Missing description'})
                if parser.title in titles and titles[parser.title]!=urlsplit(final).path:warnings.append({'path':path,'issue':'Duplicate title','other':titles[parser.title]})
                titles[parser.title]=urlsplit(final).path
                if not parser.canonical:warnings.append({'path':path,'issue':'Missing canonical'})
                elif (urlsplit(parser.canonical).path or '/')!=(urlsplit(final).path or '/'):warnings.append({'path':path,'issue':'Canonical path differs from route','canonical':parser.canonical})
                for src in parser.alt_missing:warnings.append({'path':path,'issue':'Missing image alt attribute','src':src})
            else:
                if 'noindex' not in text:warnings.append({'path':path,'issue':'Admin noindex missing'})
            assets.update(a for a in parser.assets if a.startswith('/'))
            for href in parser.links:
                if href.startswith('#'):
                    if href[1:] not in parser.ids:warnings.append({'path':path,'issue':'Unresolved fragment','href':href})
                    continue
                parsed=urlsplit(urljoin(base,href))
                if parsed.scheme in ('tel','mailto'):continue
                if parsed.netloc!=urlsplit(base).netloc:externals.add(href);continue
                target=parsed.path or '/';incoming.add(target)
                if not target.startswith(('/api','/_next')):pending.append(target)
        except httpx.HTTPStatusError as e:
            if path=='/missing-route-check' and e.response.status_code==404:checked.append({'path':path,'status':404,'expected':True})
            else:broken.append({'path':path,'status':e.response.status_code})
        except (httpx.RequestError,TimeoutError) as e:broken.append({'path':path,'error':str(e)})
    for asset in sorted(assets):
        try:
            response=client.get(base+asset);response.raise_for_status();checked.append({'path':asset,'status':response.status_code})
        except Exception as e:broken.append({'path':asset,'error':str(e)})
    for path in required:
        if path not in incoming and path!='/':warnings.append({'path':path,'issue':'No discoverable incoming link'})
    result={'checked_urls':checked,'broken_urls':broken,'redirected_urls':redirects,'warnings':warnings,'external_urls_not_probed':sorted(externals),'unconfigured_external_urls':['WhatsApp business number','Public email','Facebook','Instagram','YouTube','Verified Google Business Profile'], 'browser_checks':'Not run: browser preview permission was denied. Playwright suite provided separately.'}
    client.close()
    Path('docs/route-audit.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
    print(json.dumps({'checked':len(checked),'broken':len(broken),'redirects':len(redirects),'warnings':len(warnings)}))
    return len(broken)


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--base',default='http://localhost:3000');args=parser.parse_args()
    raise SystemExit(1 if audit(args.base.rstrip('/')) else 0)
