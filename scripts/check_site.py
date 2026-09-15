#!/usr/bin/env python3
"""Validate generated pages, metadata, structured data and local links; stdlib only."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote
import json, xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parent.parent
SITE='www.simpleconsulting.ca'
class Page(HTMLParser):
 def __init__(self,path):
  super().__init__();self.path=path;self.h1=0;self.ids=[];self.links=[];self.canonical=[];self.description=[];self.title='';self.intitle=False;self.schema=None;self.schemas=[];self.redirect=False;self.noindex=False;self.feed(path.read_text())
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag=='h1':self.h1+=1
  if tag=='title':self.intitle=True
  if a.get('id'):self.ids.append(a['id'])
  if tag=='meta':
   if a.get('name')=='description':self.description.append(a.get('content',''))
   if a.get('name')=='robots' and 'noindex' in a.get('content',''):self.noindex=True
   if a.get('http-equiv','').lower()=='refresh':self.redirect=True
  if tag=='link' and a.get('rel')=='canonical':self.canonical.append(a.get('href'))
  if tag=='script' and a.get('type')=='application/ld+json':self.schema=''
  for attr in ['src','data-src']+(['href'] if tag=='a' or (tag=='link' and a.get('rel')!='canonical') else []):
   if a.get(attr):self.links.append(a[attr])
 def handle_data(self,data):
  if self.intitle:self.title+=data
  if self.schema is not None:self.schema+=data
 def handle_endtag(self,tag):
  if tag=='title':self.intitle=False
  if tag=='script' and self.schema is not None:self.schemas.append(json.loads(self.schema));self.schema=None
pages={p.relative_to(ROOT).as_posix():Page(p) for p in ROOT.rglob('*.html') if '.git' not in p.parts and not p.read_text().startswith('google-site-verification:')}
errors=[];titles={};canonical=[]
for name,p in pages.items():
 def check(test,msg):
  if not test:errors.append(name+': '+msg)
 if not p.redirect:
  check(p.h1==1,'expected one H1');check(bool(p.title),'missing title');check(len(p.description)==1 and bool(p.description[0]),'missing description');check(len(p.ids)==len(set(p.ids)),'duplicate DOM IDs')
  if not p.noindex:
   expected='https://'+SITE+('/' if name=='index.html' else '/'+name)
   check(p.canonical==[expected],'canonical mismatch');check(bool(p.schemas),'missing schema');canonical.append(expected)
   check(p.title not in titles,'duplicate title');titles[p.title]=name
 for link in p.links:
  u=urlsplit(link)
  if u.scheme and u.scheme not in ('http','https'):continue
  if u.netloc and u.netloc!=SITE:continue
  target=ROOT/unquote(u.path.lstrip('/')) if u.path.startswith('/') else (p.path.parent/unquote(u.path)) if u.path else p.path
  if target.is_dir():target=target/'index.html'
  check(target.exists(),'missing local target '+link)
  if target.exists() and u.fragment and target.suffix=='.html':
   t=pages.get(target.relative_to(ROOT).as_posix())
   # Assessment headings are rendered by its existing app.
   if t and not str(target).endswith('/assessment/index.html'):check(unquote(u.fragment) in t.ids,'missing fragment '+link)
sitemap=ET.parse(ROOT/'sitemap.xml').getroot();urls=[x.find('{*}loc').text for x in sitemap]
if set(urls)!=set(canonical):errors.append('Sitemap must match indexable canonical pages')
if len(urls)!=len(set(urls)):errors.append('Duplicate sitemap URLs')
if errors:print('\n'.join(errors));raise SystemExit(1)
print(f'PASS: {len(pages)} HTML files, {len(canonical)} indexable canonical pages, {sum(p.redirect for p in pages.values())} legacy redirects; metadata, JSON-LD, internal links and fragments valid.')
