#!/usr/bin/env python3
"""Generate the static site. Edit content/services.json, posts.json and content/homepage.src; run python3 scripts/build_site.py.

The homepage is maintained as a complete page in content/homepage.src and copied as-is.
The 2026 design additions for inner pages (process graphic, pricing row, service search,
chart, booking steps, About stats, 404 graphic) are applied in redesign_overlay()."""
from pathlib import Path
from html import escape, unescape
import json, re, datetime

ROOT = Path(__file__).resolve().parent.parent
SITE = 'https://www.simpleconsulting.ca'
TODAY = '2026-10-18'
GOOGLE_TAG = """<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=AW-18519722703"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'AW-18519722703');
  // Keep free-text queries and fragments out of Analytics page URLs.
  const analyticsUrl = new URL(location.pathname, /^https?:$/.test(location.protocol) ? location.origin : 'https://www.simpleconsulting.ca');
  const analyticsParams = new URLSearchParams(location.search);
  const analyticsCampaigns = {
    utm_source: ['google', 'bing', 'linkedin', 'newsletter'],
    utm_medium: ['cpc', 'organic', 'referral', 'email', 'social'],
    utm_campaign: ['amazon-management', 'walmart-management', 'inventory-fulfilment', 'marketplace-guides']
  };
  for (const [key, values] of Object.entries(analyticsCampaigns)) {
    if (values.includes(analyticsParams.get(key))) analyticsUrl.searchParams.set(key, analyticsParams.get(key));
  }
  for (const key of ['gclid', 'gbraid', 'wbraid']) {
    const value = analyticsParams.get(key);
    if (value && /^[A-Za-z0-9_-]{1,256}$/.test(value)) analyticsUrl.searchParams.set(key, value);
  }
  let analyticsReferrer = '';
  try {
    const ref = new URL(document.referrer);
    analyticsReferrer = ref.origin === location.origin ? ref.origin + ref.pathname : ref.origin;
  } catch {}
  gtag('config', 'G-0DL10SRED9', {
    page_location: analyticsUrl.href,
    page_referrer: analyticsReferrer,
    allow_google_signals: false,
    allow_ad_personalization_signals: false
  });
</script>"""
SERVICES = json.loads((ROOT/'content/services.json').read_text())
BY_KEY = {s['key']:s for s in SERVICES}
CONTACT = json.loads((ROOT/'content/contact.json').read_text())
CONTACT_WORKER = CONTACT['provider'] == 'worker'
if CONTACT['provider'] not in ('formspree', 'worker'):
    raise ValueError('Unknown contact provider')
if CONTACT_WORKER:
    from urllib.parse import urlparse
    endpoint = urlparse(CONTACT['worker_endpoint'])
    if endpoint.scheme != 'https' or not endpoint.netloc or endpoint.path != '/contact' or not CONTACT['turnstile_sitekey']:
        raise ValueError('Configure a deployed HTTPS Worker endpoint and production Turnstile site key before cutover')

GENERAL = {'key':'general','slug':'services','label':'E-commerce consulting services','fit':'Explore practical support for your channels, operations, website and advertising. We can discuss which service fits your situation.'}
POSTS = json.loads((ROOT/'posts.json').read_text())
COMMERCIAL = ['amazon-seller-central-consultant-canada.html','amazon-vendor-central-consultant-canada.html','amazon-ppc-management-canada.html','amazon-listing-optimization-canada.html','walmart-wfs-consultant-canada.html','walmart-listing-optimization-canada.html','walmart-connect-management-canada.html','best-buy-marketplace-consultant-canada.html','3pl-fulfilment-consultant-canada.html','retail-marketplace-vendor-onboarding-canada.html']
RESOURCES = ['channel-diagnostic.html','store-check.html','tools.html','selected-work.html','marketplace-assessment.html','amazon-fba-vs-walmart-wfs-calculator.html','marketplace-reimbursement-checklist.html','marketplace-launch-margin-calculator.html','amazon-canada-launch-readiness.html']
CORE = ['index.html','services.html','about.html','booking.html','privacy.html','blog.html']+[s['slug']+'.html' for s in SERVICES]+COMMERCIAL+RESOURCES
E = lambda s: escape(str(s), quote=True)
def plain(s): return unescape(re.sub('<[^>]+>',' ',s)).strip()
def url(file): return SITE + ('/' if file=='index.html' else '/'+file)
def slugify(s):
    return re.sub(r'[^a-z0-9]+','-',s.lower().replace("'","").replace('’','')).strip('-')[:70]
def postdate(p): return datetime.datetime.strptime(p['date'],'%b %d, %Y').strftime('%Y-%m-%d')
def service_for(p):
    if p.get('service'): return BY_KEY.get(p['service'], GENERAL)
    t=p['title'].lower()
    if 'walmart' in t: k='walmart'
    elif 'amazon' in t: k='amazon'
    elif 'google ads' in t or p['tag']=='Google Ads': k='google'
    elif p['tag']=='ERP' or any(x in t for x in ['dashboard','power bi','data to make','edi']): k='systems'
    elif p['tag']=='Operations' or any(x in t for x in ['3pl','fulfillment','forecast','supply','supplier','inventory','chargeback']): k='operations'
    elif p['tag']=='E-commerce' or 'shopify' in t or 'e-commerce website' in t: k='shopify'
    elif any(x in t for x in ['monthly business review','e-commerce employee','wholesale','strategic partnership']): k='fractional'
    else: return GENERAL
    return BY_KEY[k]
LOGO = '<a class="logo" href="/" aria-label="Simple Consulting home">simple <span class="word-two">consulting</span><span class="period">.</span></a>'
SERVICE_NAV_PAGES = {'services.html','amazon-management.html','walmart-management.html','ecommerce-operations.html','reimbursement-recovery.html','shopify-consulting.html','ecommerce-systems-reporting.html','google-ads-management.html','fractional-ecommerce-manager.html','amazon-ppc-management-canada.html','amazon-listing-optimization-canada.html','walmart-listing-optimization-canada.html','walmart-connect-management-canada.html','best-buy-marketplace-consultant-canada.html','3pl-fulfilment-consultant-canada.html','retail-marketplace-vendor-onboarding-canada.html','amazon-seller-central-consultant-canada.html','amazon-vendor-central-consultant-canada.html','walmart-wfs-consultant-canada.html'}
TOOL_NAV_PAGES = {'tools.html','store-check.html','marketplace-assessment.html','amazon-fba-vs-walmart-wfs-calculator.html','marketplace-launch-margin-calculator.html','marketplace-reimbursement-checklist.html','amazon-canada-launch-readiness.html'}
def nav(file):
    items=[('/services.html','Services'),('/tools.html','Free tools'),('/about.html','About'),('/blog.html','Insights')]
    def current(href,label):
        return (file==href.strip('/')) or (label=='Insights' and (file.startswith(('blog/','insights/')) or file=='blog.html')) \
            or (label=='Services' and file in SERVICE_NAV_PAGES) or (label=='Free tools' and file in TOOL_NAV_PAGES)
    links=''.join(f'<a href="{href}"'+(' aria-current="page"' if current(href,label) else '')+f'>{label}</a>' for href,label in items)
    return ('<a class="skip" href="#main">Skip to content</a><header class="site-header"><nav class="container site-nav" aria-label="Main navigation">'+LOGO+
      '<div class="desktop-links">'+links+'<a class="btn" data-event="review_click" href="/booking.html#booking">Book a free call <span aria-hidden="true">→</span></a></div>'
      '<details class="mobile-menu"><summary>Menu</summary><div class="mobile-links">'+links+'<a href="/booking.html#start">Send a message</a><a class="btn" data-event="review_click" href="/booking.html#booking">Book a free call</a></div></details></nav></header>')
def footer():
    return ('<footer class="site-footer"><div class="container"><div class="foot-row">'+LOGO+
     '<nav class="foot-links" aria-label="Footer"><a href="/services.html">Services</a><a href="/tools.html">Free tools</a><a href="/about.html">About</a><a href="/blog.html">Insights</a><a href="/booking.html#start">Contact</a><a href="/privacy.html">Privacy</a><a href="https://www.linkedin.com/in/scott-nguyen-0b97723a0" rel="me">LinkedIn ↗</a><a href="https://www.instagram.com/simpleconsulting.ca/" rel="me">Instagram ↗</a></nav></div>'
     '<nav class="foot-services" aria-label="Services"><a href="/amazon-management.html">Amazon management</a><a href="/walmart-management.html">Walmart management</a><a href="/ecommerce-operations.html">Inventory &amp; fulfilment</a><a href="/reimbursement-recovery.html">Reimbursement reviews</a><a href="/shopify-consulting.html">Shopify &amp; DTC</a><a href="/ecommerce-systems-reporting.html">Systems &amp; reporting</a><a href="/google-ads-management.html">Google Ads &amp; Shopping</a><a href="/fractional-ecommerce-manager.html">Fractional e-commerce support</a><a href="/selected-work.html">Selected work</a><a href="/channel-diagnostic.html">Channel diagnostic</a><a href="mailto:scott@simpleconsulting.ca" data-event="email_click">scott@simpleconsulting.ca</a></nav>'
     '<nav class="foot-services foot-tools" aria-label="Free tools"><a data-event="review_click" href="/booking.html#booking">Book a free 30-minute call</a><a data-event="store_check_start" href="/store-check.html">Free store check</a><a data-event="assessment_landing_click" href="/marketplace-assessment.html">Free marketplace assessment</a><a data-event="calculator_click" href="/amazon-fba-vs-walmart-wfs-calculator.html">FBA vs WFS calculator</a><a data-event="margin_calculator_click" href="/marketplace-launch-margin-calculator.html">Marketplace margin calculator</a><a data-event="reimbursement_tool_click" href="/marketplace-reimbursement-checklist.html">Reimbursement checklist</a><a data-event="amazon_readiness_click" href="/amazon-canada-launch-readiness.html">Amazon.ca launch readiness</a></nav>'
     '<div class="footer-bottom"><span>© 2026 Simple Consulting. Consulting made simple.<br>Toronto, Ontario · Serving Canada and the US.</span><span class="foot-note">Independent consulting. Retailer and platform names describe services and experience; they do not imply affiliation, endorsement or partnership.</span></div></div></footer>')
def btns(key='',assessment=False):
    q='?service='+key if key else ''
    return f'''<div class="actions"><a class="btn" data-event="review_click" href="/booking.html{q}#booking">Book a free call</a><a class="btn secondary" data-event="message_click" href="/booking.html{q}#start">Send a message</a></div><p class="hero-note">30 minutes · Work directly with Scott · No preparation needed</p>'''
def cta(key=''):
    q='?service='+key if key else ''
    return f'''<section class="bottom-cta"><div class="container"><div><h2>What keeps landing back on your desk?</h2><p>Tell me about the channel or recurring issue. We will talk through where help would make a difference and a practical next step.</p></div><a class="btn" data-event="review_click" href="/booking.html{q}#booking">Book a free call</a></div></section>'''
def faq(items):
    return '<div class="faq">'+''.join(f'<details><summary>{E(q)}</summary><p>{E(a)}</p></details>' for q,a in items)+'</div>'
def service_card(s,n=None):
    number=f'<span class="card-number">{n:02d}</span>' if n else ''
    return f'''<div class="card">{number}<h3>{E(s['label'])}</h3><p>{E(s['fit'])}</p><a class="card-link" href="/{s['slug']}.html">Explore {E(s['label'].lower())} →</a></div>'''
def base(file,title,description,body,extra_schema=None,scripts='',robots=None):
    canonical=url(file)
    org={'@type':'Organization','@id':SITE+'/#organization','name':'Simple Consulting','url':SITE+'/','email':'scott@simpleconsulting.ca','founder':{'@id':SITE+'/about.html#scott'},'areaServed':[{'@type':'Country','name':'Canada'},{'@type':'Country','name':'United States'}],'location':{'@type':'Place','name':'Toronto, Ontario, Canada'},'logo':{'@type':'ImageObject','url':SITE+'/assets/simple-consulting-logo.svg','contentUrl':SITE+'/assets/simple-consulting-logo.svg','caption':'Simple Consulting.'},'sameAs':['https://www.linkedin.com/in/scott-nguyen-0b97723a0','https://www.instagram.com/simpleconsulting.ca/']}
    person={'@type':'Person','@id':SITE+'/about.html#scott','name':'Scott Nguyen','url':SITE+'/about.html','jobTitle':'E-commerce and marketplace consultant','worksFor':{'@id':SITE+'/#organization'}}
    page={'@type':'WebPage','@id':canonical+'#page','url':canonical,'name':title,'description':description,'inLanguage':'en-CA','isPartOf':{'@id':SITE+'/#website'},'about':{'@id':SITE+'/#organization'}}
    graph=[org,person,{'@type':'WebSite','@id':SITE+'/#website','url':SITE+'/','name':'Simple Consulting','publisher':{'@id':SITE+'/#organization'}},page]+(extra_schema or [])
    schema=json.dumps({'@context':'https://schema.org','@graph':graph},ensure_ascii=False).replace('</','<\\/')
    is_post=file.startswith('blog/')
    text=f'''<!doctype html><html lang="en-CA"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>{E(title)}</title><meta name="description" content="{E(description)}"><link rel="canonical" href="{canonical}"><meta name="theme-color" content="#ffffff"><meta name="author" content="Scott Nguyen"><meta property="og:type" content="{'article' if is_post else 'website'}"><meta property="og:title" content="{E(title)}"><meta property="og:description" content="{E(description)}"><meta property="og:url" content="{canonical}"><meta property="og:site_name" content="Simple Consulting"><meta property="og:locale" content="en_CA"><meta property="og:image" content="{SITE}/assets/scott-nguyen.webp"><meta property="og:image:alt" content="Scott Nguyen, founder of Simple Consulting"><meta property="og:image:width" content="720"><meta property="og:image:height" content="691"><meta name="twitter:card" content="summary"><meta name="twitter:title" content="{E(title)}"><meta name="twitter:description" content="{E(description)}"><meta name="twitter:image" content="{SITE}/assets/scott-nguyen.webp"><link rel="icon" type="image/svg+xml" href="/assessment/favicon.svg"><link rel="stylesheet" href="/assets/site.css"><script type="application/ld+json">{schema}</script>{'<meta name="robots" content="'+robots+'">' if robots else ''}<script src="/assets/site.js" defer></script>{scripts}{GOOGLE_TAG}</head><body>{nav(file)}<main id="main">{body}</main>{footer()}</body></html>'''
    text=redesign_overlay(file,text)
    text=growth_overlay(file,text)
    target=ROOT/file;target.parent.mkdir(parents=True,exist_ok=True);target.write_text(text)
TOPICS = {
 'amazon': {'label':'Amazon', 'heading':'A clearer view of your Amazon account.', 'description':'Amazon account guides for Canadian brands: review listings, advertising, account health and the stock behind the offer.', 'intro':'Start with the part of the account that needs attention. Review the offer before changing traffic, connect campaigns to product economics, and keep account issues in a clear work queue.', 'services':['amazon'], 'featured':['amazon-ppc-audit-checklist-canada','5-reasons-your-amazon-listings-arent-converting-and-how-to-fix-them','how-to-manage-your-amazon-account-health-dashboard'], 'steps':[('The listing is not converting','Check the offer, images and product information before adding more traffic.'),('Advertising needs a review','Compare search intent, contribution and available stock before changing spend.'),('Account work is piling up','Keep a clear record of notices, cases, owners and next actions.')]},
 'walmart': {'label':'Walmart', 'heading':'Build a Walmart channel you can operate.', 'description':'Walmart Marketplace guides for Canadian brands planning a launch or expansion: assortment, fulfilment, product economics and account ownership.', 'intro':'A launch needs more than a copied catalogue. Choose the market, decide how orders will be fulfilled and make someone responsible for each handoff. Keep Canadian and US programme requirements separate.', 'services':['walmart'], 'featured':['walmart-wfs-canada-guide','amazon-fba-vs-walmart-wfs-canada','walmart-marketplace-launch-readiness-checklist'], 'steps':[('You are preparing a launch','Use a readiness checklist to identify missing product data and unowned tasks.'),('You already sell on Amazon','Model the Walmart assortment and fulfilment work as a separate channel decision.'),('You need ongoing support','Define who maintains items, stock, cases and performance reporting.')]},
 'inventory': {'label':'Inventory & fulfilment', 'heading':'Connect your stock to the work around it.', 'description':'Inventory, fulfilment and reconciliation guides for marketplace operators: demand planning, 3PL handoffs and records for potential reimbursement reviews.', 'intro':'Inventory problems often sit between systems, warehouses and marketplaces. Trace the records and the handoffs before choosing a fix. Use these guides to separate planning, fulfilment and reconciliation work.', 'services':['operations','reimbursement'], 'featured':['how-to-build-a-demand-forecasting-system-for-e-commerce','the-e-commerce-fulfillment-audit-10-things-to-check-right-now','marketplace-reimbursement-review-records-checklist'], 'steps':[('Stock feels reactive','Start with demand, usable inventory and replenishment lead times.'),('Orders create repeated exceptions','Check warehouse handoffs and the evidence behind each fulfilment step.'),('The records do not reconcile','Investigate the discrepancy and applicable eligibility rules before assuming a claim.')]}
}
def post_card(p,filterable=False):
    attrs=f' data-tag="{E(p["tag"])}"' if filterable else ''
    date='Updated '+p['updated'] if p.get('updated') else p['date']
    return f'<a class="post-card"{attrs} href="/blog/{p["slug"]}.html"><span class="post-tag">{E(p["tag"])}</span><h2>{E(p["title"])}</h2><p>{E(p["blurb"])}</p><div class="post-meta">{E(date)} · {max(1,round(len(plain(p["body"]).split())/200))} min read<br>Read guide →</div></a>'
def guides_section():
    cards=''.join(f'<a class="topic-card" href="/insights/{key}.html"><span class="card-number">0{i+1} / GUIDES</span><h3>{E(t["label"])}</h3><p>{E(t["description"])}</p><span class="card-link">Explore the guides <span aria-hidden="true">→</span></span></a>' for i,(key,t) in enumerate(TOPICS.items()))
    return '<section class="section"><div class="container"><div class="section-heading"><p class="eyebrow">Practical reading</p><h2>Start with what needs attention.</h2><p>Focused reading paths for the channels and operating work you manage.</p></div><div class="grid">'+cards+'</div></div></section>'
def topic_breadcrumb(p):
    k=service_for(p)['key']
    for key,t in TOPICS.items():
        if k in t['services']: return f'<a href="/insights/{key}.html">{E(t["label"])}</a>'
    return E(p['tag'])
def service_guides(s):
    posts=sorted([p for p in POSTS if service_for(p)['key']==s['key']],key=lambda p:(bool(p.get('featured')),p.get('updated',postdate(p))),reverse=True)[:3]
    if not posts: return ''
    return '<section class="section soft"><div class="container"><div class="section-heading"><p class="eyebrow">Before we talk</p><h2>Useful reading for this work.</h2><p>Use these guides to understand the records, decisions and operating work behind the service before deciding whether you need outside support.</p></div><div class="post-list">'+''.join(post_card(p) for p in posts)+'</div></div></section>'
def topic_pages():
    for key,t in TOPICS.items():
        posts=[p for p in POSTS if service_for(p)['key'] in t['services']]
        featured=[next(p for p in POSTS if p['slug']==slug) for slug in t['featured']]
        rest=[p for p in posts if p not in featured]
        steps=''.join(f'<div><span class="step-number">0{i+1}</span><h3>{E(title)}</h3><p>{E(desc)}</p></div>' for i,(title,desc) in enumerate(t['steps']))
        body=f'''<div class="container crumbs"><a href="/">Home</a> / <a href="/blog.html">Insights</a> / {E(t['label'])}</div><section class="page-hero"><div class="container"><p class="eyebrow">{E(t['label'])} guides</p><h1>{E(t['heading'])}</h1><p class="lead">{E(t['intro'])}</p><a href="/{BY_KEY[t['services'][0]]['slug']}.html">Explore {E(t['label'].lower())} support →</a></div></section><section class="section"><div class="container"><div class="grid work-grid">{steps}</div></div></section><section class="section soft"><div class="container"><h2>Start with these guides.</h2><div class="post-list">{''.join(post_card(p) for p in featured)}</div></div></section>'''
        if rest: body+='<section class="section"><div class="container"><h2>Keep exploring.</h2><div class="post-list">'+''.join(post_card(p) for p in rest)+'</div></div></section>'
        body+=cta(t['services'][0])
        canonical=url('insights/'+key+'.html')
        schema=[{'@type':'CollectionPage','@id':canonical+'#collection','url':canonical,'name':t['label']+' guides','mainEntity':{'@type':'ItemList','itemListElement':[{'@type':'ListItem','position':i+1,'url':url('blog/'+p['slug']+'.html'),'name':p['title']} for i,p in enumerate(featured+rest)]}},{'@type':'BreadcrumbList','itemListElement':[{'@type':'ListItem','position':1,'name':'Home','item':SITE+'/'},{'@type':'ListItem','position':2,'name':'Insights','item':SITE+'/blog.html'},{'@type':'ListItem','position':3,'name':t['label'],'item':canonical}]}]
        base('insights/'+key+'.html',t['label']+' Guides for Marketplace Teams | Simple Consulting',t['description'],body,schema)
def home():
    src=(ROOT/'content/homepage.src').read_text()
    block=('<section class="section results-section" id="results" aria-labelledby="results-title"><div class="wrap reveal">'
           '<div class="section-intro"><div><p class="label">Results</p><h2 id="results-title">Brands I’ve helped grow.</h2></div>'
           '<p>Hands-on work across listings, search and advertising.</p></div>'+results_block()+'</div></section>')
    assert src.count('<!--RESULTS-->')==1
    src=src.replace('<!--RESULTS-->',block+STORE_BAND)
    anchor='<details class="service"><summary><span class="service-name"><span class="service-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="6" height="6" rx="1"/>'
    assert src.count(anchor)==1
    src=src.replace(anchor,STORE_SERVICE+'\n'+anchor)
    (ROOT/'index.html').write_text(src)

def pricing_section():
    return '''<section class="section" id="pricing" aria-labelledby="pricing-heading"><div class="container"><div class="section-heading"><p class="eyebrow">Clear scope. Clear pricing.</p><h2 id="pricing-heading">How working together starts</h2><p>Each step is useful on its own. You decide whether to continue after each one.</p></div><ol class="start-steps"><li class="start-step"><span class="start-step-n">Step 1</span><h3>Free introduction call</h3><p class="start-price">Free</p><p>Thirty minutes on your marketplace, the problem and what you have tried. You leave with a practical next step.</p><a class="btn secondary" href="/booking.html#booking">Book a free call</a></li><li class="start-step start-step-feature"><span class="start-step-n">Step 2</span><h3>Channel diagnostic</h3><p class="start-price">CAD $750</p><p>A review of one marketplace channel: listings, advertising and inventory health. You receive a written priority plan with the evidence behind it.</p><p class="start-credit">Start ongoing support within 30 days and the $750 is credited toward your first month.</p><a class="btn" href="/booking.html?service=general#start">Ask about a diagnostic</a></li><li class="start-step"><span class="start-step-n">Step 3</span><h3>Ongoing management</h3><p class="start-price">Quoted</p><p>Recurring account work with agreed responsibilities, a review cadence and clear reporting. Scoped and priced after the diagnostic.</p><a class="btn secondary" href="/booking.html#start">Tell me what needs attention</a></li></ol><p class="small muted">Prices in Canadian dollars. Taxes, advertising spend, marketplace fees and third-party costs are additional.</p></div></section>'''
def marketplace_work_example(key, on_service=False):
    examples = {
        'amazon': (
            'Amazon account operations', 'Connecting listings, advertising and replenishment',
            'My Amazon work has included suppressed listings, advertising that needed a closer search-term review, and inventory or replenishment issues affecting the account.',
            'Worked through catalogue issues, reviewed advertising search terms and spending, and connected replenishment priorities with the products being promoted.',
            'A prioritized action list, documented listing changes and a weekly account dashboard to keep issues, inventory and follow-up visible.',
            '/amazon-management.html', 'Amazon management'),
        'walmart': (
            'Walmart Marketplace and WFS', 'Coordinating the launch and the work after it',
            'My Walmart work has included preparing listings, coordinating WFS shipments and bringing advertising and inventory planning into the same operating view.',
            'Organized item data, checked fulfilment assumptions, coordinated shipment requirements and prepared inventory and campaign plans around the chosen marketplace.',
            'A launch checklist, shipment tracker and reporting dashboard showing readiness, open issues and the next actions to take.',
            '/walmart-management.html', 'Walmart and WFS support')
    }
    if key not in examples:
        return ''
    label, title, context, work, deliverable, href, service = examples[key]
    link_text = 'Explore ' + service
    if on_service:
        href = '/selected-work.html#' + key + '-work'
        link_text = 'See more of my marketplace work'
    return f'''<article class="case-card" id="{key}-work"><p class="eyebrow">{E(label)} · work I’ve handled</p><h2>{E(title)}</h2><h3>Context</h3><p>{E(context)}</p><h3>Work</h3><p>{E(work)}</p><h3>Deliverables</h3><p>{E(deliverable)}</p><a href="{href}">{E(link_text)} →</a></article>'''

def enquiry_form(key=''):
    endpoint = CONTACT['worker_endpoint'] if CONTACT_WORKER else 'https://formspree.io/f/mreegwjn'
    provider_attrs = f' data-provider="worker" data-turnstile-sitekey="{E(CONTACT["turnstile_sitekey"])}"' if CONTACT_WORKER else ''
    options=''.join(f'<option value="{x["key"]}">{E(x["label"])}</option>' for x in SERVICES)
    return f'''<form class="contact-form" id="leadform" data-service="{E(key)}" action="{E(endpoint)}"{provider_attrs} method="post"><input type="hidden" name="_subject" value="Simple Consulting website enquiry"><input type="hidden" name="source_page" id="source-page" value="booking.html"><div class="hp" aria-hidden="true"><label for="company_website">Leave this blank</label><input type="text" id="company_website" name="_gotcha" autocomplete="off" tabindex="-1"></div><div class="form-row"><div class="field"><label for="name">Your name</label><input id="name" name="name" autocomplete="name" required maxlength="150"><p class="error" id="name-error" hidden>Add your name.</p></div><div class="field"><label for="email">Email</label><input type="email" id="email" name="email" autocomplete="email" required maxlength="254"><p class="error" id="email-error" hidden>Enter a valid email address so I can reply.</p></div></div><div class="field"><label for="channel">What would you like help with? <span class="muted">(optional)</span></label><select id="channel" name="channel"><option value="">Choose a service, or leave this open</option>{options}<option value="both">Amazon and Walmart</option><option value="other">Another retailer or not sure yet</option></select></div><div class="field"><label for="message">Your message</label><textarea id="message" name="message" required minlength="5" maxlength="12000" placeholder="Which channel or part of the business needs attention? Include your website or store link if useful."></textarea><p class="error" id="message-error" hidden>Add a short message about what you need.</p></div><button class="btn form-submit" type="submit" id="send-button">Send message</button><p class="status" id="send-status" role="status" aria-live="polite"></p><p class="small muted">Your message goes to Scott. Sending an enquiry does not subscribe you to marketing emails. <a href="/privacy.html">About your enquiry</a>.</p></form><div id="form-success" class="callout" hidden tabindex="-1"><h2>Your enquiry was submitted.</h2><p>Thank you. I'll reply within one business day. You can also email <a href="mailto:scott@simpleconsulting.ca">scott@simpleconsulting.ca</a>.</p></div><button class="btn secondary" type="button" id="copy-enquiry">Copy your enquiry</button><p class="status" id="copy-status" role="status"></p><textarea class="copy-fallback" id="copy-fallback" aria-label="Enquiry to copy" hidden></textarea>'''


def engagement_options(key):
    return f'''<section class="callout" aria-labelledby="engagement-options"><h2 id="engagement-options">Choose the support your account needs.</h2><h3>A focused account review</h3><p>Start with one defined listing, advertising, inventory or reconciliation issue. Agree on the records and scope to review, then receive an action plan with findings, supporting evidence, priorities and next steps. Implementation is scoped separately unless included in the agreement.</p><h3>Launch or account cleanup</h3><p>Define the products, marketplace and backlog first. The agreed project may include a readiness checklist, item-data corrections, shipment coordination or a tracked queue of account issues. Responsibilities and completion checks are documented before work begins.</p><h3>Ongoing account management</h3><p>Agree on the recurring tasks Scott will own, the work your team will retain, reporting frequency and how account changes will be approved. Review progress using an action log and the measures relevant to your products.</p><p><a href="/selected-work.html#sample-action-plan">See an illustrative action plan →</a></p><p>Each engagement is quoted individually. Scope, deliverables, timing and fees are agreed before paid work begins. The free 30-minute call is an initial discussion; it does not include a detailed written audit.</p><a href="/booking.html?service={key}#start">Describe the issue and request a scope →</a></section>'''

def service_pages():
    for s in SERVICES:
        hero_grid = ' hero-grid' if s['key'] in ('amazon','walmart') else ''
        hero_card = f'''<aside class="start-card" aria-label="Who you will work with and how pricing works"><div class="hero-person"><img src="/assets/scott-nguyen.webp" width="64" height="80" alt="Scott Nguyen, founder of Simple Consulting"><div><strong>Scott Nguyen</strong><span>Your point of contact.<br>The person doing the work.</span></div></div><h2>How it starts</h2><ul class="hero-pricing"><li><strong>Free</strong> 30-minute call to talk through the issue</li><li><strong>CAD $750</strong> channel diagnostic with a written priority plan, credited toward your first month</li><li><strong>Then your choice</strong> a scoped project or ongoing support, quoted up front</li></ul><p class="small muted">Scope, time and fees agreed before paid work begins.</p></aside>''' if hero_grid else ''
        proof = '<p class="service-proof">Work directly with Scott Nguyen · 17+ years in e-commerce · Brands grown to $3M, $6M and $2M+ in sales</p>' if s['key'] in ('amazon','walmart') else ''
        body=f'''<div class="container crumbs"><a href="/">Home</a> / <a href="/services.html">Services</a> / {E(s['label'])}</div><section class="page-hero"><div class="container{hero_grid}"><div><p class="eyebrow">{E(s['label'])}</p><h1>{E(s['heading'])}</h1><p class="lead">{E(s['intro'])}</p>{proof}{btns(s['key'])}</div>{hero_card}</div></section><section class="section"><div class="container service-layout"><div class="service-content">'''
        if s['key'] in ('amazon', 'walmart'):
            body+=engagement_options(s['key'])
            body+='<section aria-label="Relevant work example">'+marketplace_work_example(s['key'], on_service=True)+'</section>'
        for i,sec in enumerate(s['sections']):
            title,p,*lists=sec
            body+=f'<section id="section-{i+1}"><h2>{E(title)}</h2><p>{E(p)}</p>'
            if lists: body+='<ul>'+''.join('<li>'+E(x)+'</li>' for x in lists[0])+'</ul>'
            body+='</section>'
        pathways=''
        if s['key']=='amazon':
            pathways='''<section class="section"><div class="container"><div class="section-heading"><p class="eyebrow">Amazon account models</p><h2>Looking for a specific type of Amazon support?</h2><p>Choose the account model that matches the work in front of you.</p></div><div class="grid"><div class="card"><h3>Seller Central consulting</h3><p>Listings, FBA, account issues, inventory and advertising work for brands operating a seller account.</p><a class="card-link" href="/amazon-seller-central-consultant-canada.html">Explore Seller Central support →</a></div><div class="card"><h3>Vendor Central consulting</h3><p>Purchase orders, shortages, chargebacks, catalogue and reporting for brands selling wholesale to Amazon.</p><a class="card-link" href="/amazon-vendor-central-consultant-canada.html">Explore Vendor Central support →</a></div><div class="card"><h3>Amazon PPC management</h3><p>Campaign, search-term, budget and product-level advertising work connected to listings, margin and stock.</p><a class="card-link" href="/amazon-ppc-management-canada.html">Explore Amazon PPC management →</a></div><div class="card"><h3>Amazon listing optimization</h3><p>Titles, bullets, images, attributes, variations and catalogue issues for a clearer, more accurate detail page.</p><a class="card-link" href="/amazon-listing-optimization-canada.html">Explore listing optimization →</a></div></div></div></section>'''
        elif s['key']=='walmart':
            pathways='''<section class="section"><div class="container"><div class="section-heading"><p class="eyebrow">Walmart operations</p><h2>Go deeper on WFS and reimbursement work.</h2><p>Practical guides and tools for WFS shipments, fulfilment costs, listing issues and reimbursement reviews.</p></div><div class="grid"><div class="card"><h3>WFS consulting</h3><p>Hands-on support for onboarding, inbound shipments, inventory, receiving, returns and reconciliation.</p><a class="card-link" href="/walmart-wfs-consultant-canada.html">Explore WFS consulting →</a></div><div class="card"><h3>Amazon FBA vs Walmart WFS</h3><p>Compare fulfilment economics, inventory allocation, inbound work, returns and reconciliation by SKU and channel.</p><a class="card-link" href="/amazon-fba-vs-walmart-wfs-calculator.html">Compare FBA and WFS →</a></div><div class="card"><h3>Marketplace assessment</h3><p>Review channel readiness, operating priorities and where support may be useful before changing the account.</p><a class="card-link" href="/marketplace-assessment.html">Take the free assessment →</a></div><div class="card"><h3>Walmart reimbursement reviews</h3><p>Reconcile WFS receiving, returns, settlement activity and prior credits before assessing a potential claim.</p><a class="card-link" href="/reimbursement-recovery.html">Explore reimbursement reviews →</a></div><div class="card"><h3>Walmart listing optimization</h3><p>Item setup, attributes, content, variants and publishing issues for Walmart Marketplace.</p><a class="card-link" href="/walmart-listing-optimization-canada.html">Explore listing optimization →</a></div><div class="card"><h3>Walmart Connect management</h3><p>Campaign management connected to product readiness, inventory and channel economics.</p><a class="card-link" href="/walmart-connect-management-canada.html">Explore Walmart Connect →</a></div></div></div></section>'''
        body+=f'''</div><aside class="service-sidebar"><h2>A good fit</h2><p>{E(s['fit'])}</p><hr><h2>What you can expect</h2><p>{E(s['deliverable'])}</p><hr><h2>Work directly with Scott</h2><p>No handoff to a junior account manager. I stay involved in the agreed work from review through follow-up.</p><p class="small muted">17+ years in e-commerce and retail operations, with one brand grown from $700K to $3M+ in a year and another from $20K to $6M in a year.</p><hr><h2>Talk it through first</h2><p>Bring one marketplace challenge to a free 30-minute call. We will clarify the issue, identify what needs reviewing and discuss whether a focused project or ongoing support makes sense. Scope and fees are agreed before paid work begins.</p><a class="btn" href="/booking.html?service={s['key']}#booking">Book a free call</a><a href="/booking.html?service={s['key']}#start">Prefer to send a message?</a></aside></div></section><section class="section soft"><div class="container"><h2>Questions before we start</h2>{faq(s['faq'])}</div></section>{pathways}<section class="section"><div class="container"><div class="section-heading"><p class="eyebrow">Connected work</p><h2>Related support</h2><p>Marketplace issues rarely stay in one part of the business. These services cover the adjacent account, inventory and reporting work that may be involved.</p></div><div class="grid">{''.join(service_card(BY_KEY[k]) for k in s['related'])}</div></div></section>{service_guides(s)}{cta(s['key'])}'''
        if s['key'] in ('amazon','walmart'):
            enquiry=f'''<section class="section soft" id="start"><div class="container landing-enquiry"><h2>Tell me about your {E(s['key'].title())} account.</h2><p>A sentence or two is enough. I'll reply within one business day. Scope and fees are agreed before paid work begins.</p>{enquiry_form(s['key'])}</div></section>'''
            body=body.replace('</aside></div></section>', '</aside></div></section>'+enquiry, 1)
            body=body.replace(f'/booking.html?service={s["key"]}#start', '#start')
            body+=f'''<nav class="mobile-contact" aria-label="Quick contact"><a class="btn secondary" href="#start" data-event="message_click">Send a message</a><a class="btn" href="/booking.html?service={s['key']}#booking" data-event="review_click">Book a free call</a></nav>'''
        body=body.replace('<h2>Talk it through first</h2>', '<h2>Pricing</h2><p>A channel diagnostic is <strong>CAD $750</strong>, credited toward your first month if you start ongoing support within 30 days. Ongoing work is quoted after the diagnostic. Scope and fees are confirmed before paid work begins. Applicable taxes and third-party costs are additional.</p><p><a href="/booking.html#pricing">See pricing and starting options →</a></p><hr><h2>Talk it through first</h2>', 1)
        canonical=url(s['slug']+'.html')
        schemas=[{'@type':'Service','@id':canonical+'#service','name':s['label'],'serviceType':s['heading'].rstrip('.'),'description':s['intro'],'url':canonical,'provider':{'@id':SITE+'/#organization'},'areaServed':[{'@type':'Country','name':'Canada'},{'@type':'Country','name':'United States'}]},{'@type':'BreadcrumbList','itemListElement':[{'@type':'ListItem','position':1,'name':'Home','item':SITE+'/'},{'@type':'ListItem','position':2,'name':'Services','item':SITE+'/services.html'},{'@type':'ListItem','position':3,'name':s['label'],'item':canonical}]}]
        base(s['slug']+'.html',s['title'],s['description'],body,schemas,scripts='<script src="/assets/contact.js" defer></script>' if s['key'] in ('amazon','walmart') else '')
def commercial_pages():
    pages=[
      {
        'file':'amazon-seller-central-consultant-canada.html',
        'title':'Amazon Seller Central Consultant Canada | Simple Consulting',
        'description':'Hands-on Amazon Seller Central consulting for Canadian brands. Listings, FBA, account issues, inventory and advertising support with Scott Nguyen.',
        'eyebrow':'Amazon Seller Central consultant · Canada',
        'h1':'Seller Central support for the account work that needs an owner.',
        'intro':'If Seller Central keeps pulling your team into listing issues, FBA questions, advertising decisions and unresolved cases, I can take on a defined part of the work or help manage the account on an ongoing basis.',
        'sections':[
          ('Seller Central account management','Support can cover catalogue maintenance, listing issues, account notices, FBA inventory, shipment follow-up and the recurring work that otherwise stays on an internal to-do list.'),
          ('FBA and inventory coordination','Seller Central decisions should connect to stock. I review sellable inventory, inbound shipments, replenishment needs and discrepancies so account actions are not made in isolation.'),
          ('Advertising and listing follow-through','Campaign changes work better when the offer, listing and inventory are ready. I review the relevant reports and coordinate the agreed listing or PPC actions with the wider account priorities.'),
          ('One problem or ongoing support','You do not need to outsource the whole account. Start with a recurring issue, a backlog of tasks or a defined Seller Central responsibility and build the scope from there.')
        ],
        'faq':[
          ('Do you work directly in Seller Central?','Where account access is appropriate, use Amazon permission controls rather than sharing a password. We agree on the scope and access needed before work begins.'),
          ('Can you help with FBA issues?','Yes. The work can include inbound planning, receiving discrepancies, inventory questions and the records needed to understand an issue. Amazon determines account and reimbursement decisions.'),
          ('Can you work with an existing agency or employee?','Yes. I can own a defined set of Seller Central tasks and coordinate with your existing team, agency or operations provider.'),
          ('What is the first step?','Book a free 30-minute call or send a message describing the account issue. Detailed review or implementation is scoped separately.')
        ],
        'service':'amazon'
      },
      {
        'file':'amazon-vendor-central-consultant-canada.html',
        'title':'Amazon Vendor Central Consultant Canada | Simple Consulting',
        'description':'Amazon Vendor Central consulting for Canadian brands: purchase orders, shortages, chargebacks, catalogue, reporting and operating follow-through.',
        'eyebrow':'Amazon Vendor Central consultant · Canada',
        'h1':'Vendor Central support for the work behind the wholesale account.',
        'intro':'Vendor Central has a different operating rhythm from Seller Central. I help brands organise purchase orders, shipment records, catalogue work, deductions and reporting so the wholesale account has clear ownership.',
        'sections':[
          ('Purchase orders and shipment coordination','Review purchase-order confirmations, shipment requirements, fulfilment records and the handoffs between the account, warehouse and internal team.'),
          ('Shortages, deductions and chargebacks','Compare Amazon records with shipment and receiving evidence before deciding what needs explanation or follow-up. A deduction is not automatically recoverable; the supporting records and programme rules matter.'),
          ('Catalogue and reporting','Keep item information, operational reports and open account issues in a usable work queue. When a business uses both Vendor Central and Seller Central, responsibilities and reporting should stay clearly separated.'),
          ('Practical account ownership','Support can be a focused Vendor Central project or an ongoing operating role. The goal is to keep purchase orders, exceptions and follow-up visible rather than letting issues sit across several teams.')
        ],
        'faq':[
          ('Do you support Amazon Vendor Central in Canada?','Yes. I work with Canadian businesses using Vendor Central and can also help coordinate work that spans Seller Central. Country-specific requirements are checked for the account in question.'),
          ('Can you help review shortages or chargebacks?','Yes. I can reconcile the relevant records and organise the follow-up. Amazon determines whether any dispute or adjustment is accepted.'),
          ('Do you negotiate Amazon commercial terms?','The scope can include reviewing the operational and reporting impact of terms. Formal commercial negotiations depend on the engagement and the information available.'),
          ('How do we start?','Begin with a free 30-minute conversation about the Vendor Central issue, account model and records available. Paid work is agreed before a detailed review begins.')
        ],
        'service':'amazon'
      }
    ]
    for p in pages:
        body=f'''<div class="container crumbs"><a href="/">Home</a> / <a href="/amazon-management.html">Amazon management</a> / {E(p['eyebrow'].split(' · ')[0])}</div><section class="page-hero"><div class="container"><p class="eyebrow">{E(p['eyebrow'])}</p><h1>{E(p['h1'])}</h1><p class="lead">{E(p['intro'])}</p>{btns('amazon')}</div></section><section class="section"><div class="container service-layout"><div class="service-content">'''
        for i,(title,text) in enumerate(p['sections']):
            body+=f'<section id="section-{i+1}"><h2>{E(title)}</h2><p>{E(text)}</p></section>'
        body+=f'''</div><aside class="service-sidebar"><h2>Work directly with Scott</h2><p>No handoff to a junior account manager. I stay involved in the agreed work from review through follow-up.</p><hr><h2>Related Amazon support</h2><p>Need broader account ownership? See <a href="/amazon-management.html">Amazon account management</a>.</p><hr><h2>Start with the issue</h2><a class="btn" href="/booking.html?service=amazon#booking">Book a free call</a><a href="/booking.html?service=amazon#start">Prefer to send a message?</a></aside></div></section><section class="section soft"><div class="container"><h2>Questions before we start</h2>{faq(p['faq'])}</div></section>{cta('amazon')}'''
        canonical=url(p['file'])
        schemas=[{'@type':'Service','@id':canonical+'#service','name':p['eyebrow'].split(' · ')[0],'serviceType':p['h1'].rstrip('.'),'description':p['intro'],'url':canonical,'provider':{'@id':SITE+'/#organization'},'areaServed':[{'@type':'Country','name':'Canada'}]}]
        base(p['file'],p['title'],p['description'],body,schemas)

def specialty_service_pages():
    pages=[
      {
        'file':'amazon-ppc-management-canada.html','parent':'amazon','parent_url':'amazon-management.html',
        'title':'Amazon PPC Management Canada | Simple Consulting',
        'description':'Hands-on Amazon PPC management for Canadian brands. Campaign reviews, search terms, targeting, budgets, listings, inventory and reporting with Scott Nguyen.',
        'eyebrow':'Amazon PPC management · Canada',
        'h1':'Amazon advertising managed with the product economics behind it.',
        'intro':'I manage and review Amazon advertising for brands that need more than bid changes. Campaign decisions are connected to the listing, contribution, inventory position and the operating work around the account.',
        'sections':[
          ('Start with the offer and objective','Before changing spend, I review what the campaign is meant to accomplish, which products are being advertised and whether the offer is ready to convert. Price, availability, listing quality and stock can change the meaning of the advertising results.',['Campaign and advertised-product structure','Search-term and targeting review','Budget, bidding and placement settings available in the account','Listing readiness and inventory constraints']),
          ('Connect advertising to product economics','Advertising metrics are useful only when they are interpreted alongside product economics. I compare the available attributed sales and spend with the contribution assumptions you use for the product, while keeping marketplace attribution separate from total channel sales.'),
          ('Make changes with a review plan','Changes are documented with a reason, owner and review period. That can include search-term exclusions, targeting changes, budget reallocations, campaign restructuring or a listing task that needs to happen before more spend is justified.'),
          ('Keep PPC connected to the wider account','Advertising work can be managed as a focused engagement or as part of broader Amazon account management. When stock, catalogue issues or account notices affect the advertising plan, those dependencies stay visible rather than being treated as separate problems.')
        ],
        'faq':[
          ('Do you manage Amazon Sponsored Products?','Yes. Scope can include Sponsored Products and other advertising formats available in the relevant account and marketplace. Available formats and reporting should be confirmed in the account you use.'),
          ('Can you review an existing agency or in-house setup?','Yes. A focused review can examine campaign structure, search terms, product selection, measurement and the operating constraints around the account.'),
          ('Do you guarantee a target ACoS or ROAS?','No. Results depend on the product, price, demand, competition, listing, inventory and measurement. We agree on the business measures to watch and document what changes are made.'),
          ('Can you manage Amazon.ca and Amazon.com?','Yes, where the engagement covers those marketplaces. Campaigns, economics and account requirements are reviewed separately by country.')
        ]
      },
      {
        'file':'amazon-listing-optimization-canada.html','parent':'amazon','parent_url':'amazon-management.html',
        'title':'Amazon Listing Optimization Canada | Simple Consulting',
        'description':'Amazon listing optimization for Canadian brands: titles, bullets, images, attributes, variations, catalogue issues and conversion-focused listing reviews.',
        'eyebrow':'Amazon listing optimization · Canada',
        'h1':'Make the Amazon detail page clearer, accurate and easier to operate.',
        'intro':'I help brands improve Amazon product listings by connecting customer-facing content with catalogue accuracy, variation structure, account requirements and the product information your team can actually maintain.',
        'sections':[
          ('Review the complete offer, not only the copy','A listing can underperform because of content, but also because of price, availability, delivery, variation setup or a mismatch between the product and the traffic reaching it. I start by separating those issues.',['Titles, bullets and product descriptions','Images and eligible enhanced content','Attributes, variation relationships and identifiers','Price, availability and fulfilment context']),
          ('Improve clarity without inventing claims','Content should help the right shopper understand the product. I use available product facts, customer questions and recurring review themes to improve clarity while avoiding unsupported performance claims or keyword repetition that hurts readability.'),
          ('Resolve catalogue and publishing issues','Some listing problems are operational rather than editorial. The work can include item attributes, variation relationships, suppressed or unpublished content, duplicate data and cases that need evidence or follow-up in Seller Central.'),
          ('Measure changes in context','When a listing changes, I document what changed and review available performance over a comparable period. Price, stock, advertising and seasonality are noted so a content edit is not automatically credited with every change in results.')
        ],
        'faq':[
          ('Do you write Amazon titles and bullets?','Yes. I can review or rewrite customer-facing listing content using the product facts and current requirements that apply to the category and marketplace.'),
          ('Can you help with images or A+ Content?','I can review the content plan, required information and marketplace presentation, and coordinate the agreed work. Eligibility and content options depend on the account and programme.'),
          ('Can you fix variation or catalogue issues?','I can investigate the records, item setup and account messages and coordinate the follow-up. Resolution depends on the underlying issue and Amazon requirements.'),
          ('Is this Amazon SEO?','Search discoverability is one consideration, but the work is broader than inserting keywords. Product accuracy, shopper clarity, catalogue structure and the complete offer all matter.')
        ]
      },
      {
        'file':'walmart-listing-optimization-canada.html','parent':'walmart','parent_url':'walmart-management.html',
        'title':'Walmart Listing Optimization Canada | Simple Consulting',
        'description':'Walmart Marketplace listing optimization for Canadian brands: item setup, attributes, titles, images, variants, publishing issues and catalogue maintenance.',
        'eyebrow':'Walmart listing optimization · Canada',
        'h1':'Walmart listings built for accurate catalogue data and a clearer customer offer.',
        'intro':'I help brands improve Walmart Marketplace item setup and customer-facing content, then keep the catalogue work connected to publishing status, inventory and the account tasks required to maintain it.',
        'sections':[
          ('Start with item setup and required data','Before rewriting content, I review the item record, category, identifiers, required attributes and variation structure for the marketplace you use. Canadian and US requirements are checked separately.',['Titles and product descriptions','Images and available rich content','Attributes, identifiers and variants','Publishing status and item-level account messages']),
          ('Improve the customer-facing listing','The goal is to make the product easy to identify and understand using accurate product information. Content work is based on the actual item, customer questions and the fields available in the marketplace rather than copying another retailer.'),
          ('Work through unpublished and catalogue issues','If an item is not publishing correctly, I review the stated errors, item data and account notices to identify the next action. Some problems require data changes; others require evidence or marketplace support follow-up.'),
          ('Maintain the catalogue after launch','Listing optimization is not a one-time rewrite. New variants, inventory changes, content updates and platform requirements create recurring work. Ongoing support can keep those tasks in a visible queue with ownership and follow-up.')
        ],
        'faq':[
          ('Can you help with unpublished Walmart items?','Yes. I review item status, feed or setup errors and account notices to identify what is blocking publication. Walmart determines the final publication outcome.'),
          ('Do you work with Walmart Canada and Walmart US?','Yes, where the engagement includes those marketplaces. Country-specific data, services and requirements are treated separately.'),
          ('Can you optimize an existing Walmart catalogue?','Yes. We can start with a priority assortment, identify recurring data or presentation issues and work through the highest-impact items first.'),
          ('Does listing optimization include Walmart advertising?','Advertising is a separate but connected workstream. If you need campaign management as well, see Walmart Connect management.')
        ]
      },
      {
        'file':'walmart-connect-management-canada.html','parent':'walmart','parent_url':'walmart-management.html',
        'title':'Walmart Connect Management Canada | Simple Consulting',
        'description':'Walmart Connect advertising management for Canadian brands. Campaign structure, product selection, budgets, search terms, listings, inventory and reporting.',
        'eyebrow':'Walmart Connect management · Canada',
        'h1':'Walmart advertising managed alongside the catalogue and inventory behind it.',
        'intro':'I help brands review and manage Walmart advertising with the product, listing and stock position in view. The aim is to make campaign decisions that your wider Walmart operation can support.',
        'sections':[
          ('Check product readiness before increasing spend','Advertising cannot solve an unavailable item or an unclear listing. I review the products being promoted, their publishing status, price, inventory and the customer-facing offer before treating campaign settings as the only issue.',['Campaign and product selection','Budget and bidding settings available in the account','Search-term and performance reports where available','Listing and inventory dependencies']),
          ('Use the available reports to make documented decisions','I review performance using the reports and attribution periods available in the relevant Walmart account. Changes are recorded with the reason, owner and next review point instead of relying on a one-time dashboard snapshot.'),
          ('Keep advertising connected to margin and stock','A campaign can create demand faster than inventory can be replenished. I connect advertising choices with product economics, sellable stock, inbound timing and the priorities of the broader marketplace account.'),
          ('Manage Walmart Connect as part of the channel','Walmart Connect can be a focused workstream or part of ongoing Walmart Marketplace management. Available campaign formats, reporting and programme features should be confirmed for the country and account you use.')
        ],
        'faq':[
          ('Do you manage Walmart Sponsored Products?','I can manage the advertising formats available in the relevant Walmart Connect account. Formats and reporting vary by market and can change, so the live account is the source of truth.'),
          ('Can you review campaigns without taking over the account?','Yes. A scoped review can focus on campaign structure, product selection, search terms, budgets, measurement and listing or inventory constraints.'),
          ('Do you guarantee a target ROAS?','No. Results depend on demand, price, competition, product content, inventory and measurement. We agree on the business measures to review and document the changes made.'),
          ('Can you manage Walmart listings and ads together?','Yes. Listing optimization and advertising can be coordinated when both are in scope.')
        ]
      }
    ]
    for p in pages:
        parent_url='/'+p['parent_url']
        body=f'''<div class="container crumbs"><a href="/">Home</a> / <a href="{parent_url}">{E(p['parent'].title())} management</a> / {E(p['eyebrow'].split(' · ')[0])}</div><section class="page-hero"><div class="container"><p class="eyebrow">{E(p['eyebrow'])}</p><h1>{E(p['h1'])}</h1><p class="lead">{E(p['intro'])}</p>{btns(p['parent'])}</div></section><section class="section"><div class="container service-layout"><div class="service-content">'''
        for i,sec in enumerate(p['sections']):
            title,text,*lists=sec
            body+=f'<section id="section-{i+1}"><h2>{E(title)}</h2><p>{E(text)}</p>'
            if lists: body+='<ul>'+''.join('<li>'+E(x)+'</li>' for x in lists[0])+'</ul>'
            body+='</section>'
        body+=f'''</div><aside class="service-sidebar"><h2>Work directly with Scott</h2><p>I stay involved in the agreed work from review through implementation and follow-up.</p><hr><h2>Broader account support</h2><p>Need the surrounding account work managed too? See <a href="{parent_url}">{E(p['parent'].title())} account management</a>.</p><hr><h2>Start with the issue</h2><a class="btn" href="/booking.html?service={p['parent']}#booking">Book a free call</a><a href="/booking.html?service={p['parent']}#start">Prefer to send a message?</a></aside></div></section><section class="section soft"><div class="container"><h2>Questions before we start</h2>{faq(p['faq'])}</div></section>{cta(p['parent'])}'''
        canonical=url(p['file'])
        schemas=[{'@type':'Service','@id':canonical+'#service','name':p['eyebrow'].split(' · ')[0],'serviceType':p['h1'].rstrip('.'),'description':p['intro'],'url':canonical,'provider':{'@id':SITE+'/#organization'},'areaServed':[{'@type':'Country','name':'Canada'}]}]
        base(p['file'],p['title'],p['description'],body,schemas)

def wfs_consultant_page():
    file='walmart-wfs-consultant-canada.html'
    title='Walmart WFS Consultant Canada | Simple Consulting'
    description='Hands-on Walmart Fulfillment Services consulting for Canadian brands. WFS onboarding, inbound shipments, inventory, returns and reconciliation with Scott Nguyen.'
    body=f'''<div class="container crumbs"><a href="/">Home</a> / <a href="/walmart-management.html">Walmart management</a> / Walmart WFS consultant</div><section class="page-hero"><div class="container"><p class="eyebrow">Walmart WFS consultant · Canada</p><h1>WFS support from onboarding through day-to-day operations.</h1><p class="lead">I help Canadian brands plan and operate Walmart Fulfillment Services: product selection, inbound shipments, receiving, replenishment, returns and settlement reconciliation.</p>{btns('walmart')}</div></section>
    <section class="section"><div class="container service-layout"><div class="service-content">
    <section><h2>Decide whether WFS fits the SKU</h2><p>Use your actual product dimensions, margin, demand, replenishment lead time and return handling to decide which products belong in WFS. A product that works in Amazon FBA is not automatically a good WFS candidate.</p></section>
    <section><h2>Coordinate inbound shipments and receiving</h2><p>Prepare shipment quantities, labels and supporting records, coordinate the handoff to the fulfilment network, and keep an evidence trail for receiving exceptions.</p><ul><li>Shipment creation and quantity planning</li><li>Labelling and carton requirements</li><li>Carrier and delivery coordination</li><li>Receiving discrepancies and follow-up</li></ul></section>
    <section><h2>Plan replenishment without starving other channels</h2><p>WFS inventory competes with Amazon, Shopify and retail for the same stock. I help connect Walmart demand, sellable inventory, open purchase orders and supplier lead times into a practical replenishment plan.</p></section>
    <section><h2>Review returns, settlements and prior credits</h2><p>WFS reduces parcel-level fulfilment work but still needs seller-side reconciliation. I connect return, inventory and settlement records and distinguish unresolved differences from credits already issued.</p><p><a href="/reimbursement-recovery.html">Explore Walmart reimbursement reviews →</a></p></section>
    </div><aside class="service-sidebar"><h2>Work directly with Scott</h2><p>No handoff to a junior account manager. I stay involved in the agreed WFS work from planning through follow-up.</p><hr><h2>Compare the economics</h2><p>Use your own current fee inputs in the free comparison tool.</p><a href="/amazon-fba-vs-walmart-wfs-calculator.html">Open the FBA vs WFS calculator →</a><hr><h2>Prefer a guide first?</h2><a href="/blog/walmart-wfs-canada-guide.html">Read the Walmart WFS Canada guide →</a></aside></div></section>
    <section class="section soft"><div class="container"><h2>WFS questions</h2>{faq([
      ('Are Canadian and US WFS requirements the same?','Do not assume they are. Programme availability, fees, reports and operating requirements should be checked for the country and account you use.'),
      ('Can you help with WFS onboarding?','Yes. The work can include readiness, product selection, item setup, inbound planning and the operating responsibilities that need an owner. Walmart determines account and programme eligibility.'),
      ('Can you compare WFS with Amazon FBA?','Yes. Compare the two at SKU level using current marketplace fees, fulfilment, storage, inbound freight, returns, advertising assumptions and the inventory commitment required.'),
      ('Can you review WFS reimbursements?','Yes. I can reconcile receiving, return and settlement records and assess potential claim eligibility. Walmart determines whether a claim is approved.')
    ])}</div></section>{cta('walmart')}'''
    canonical=url(file)
    schemas=[{'@type':'Service','@id':canonical+'#service','name':'Walmart WFS consulting','serviceType':'Walmart Fulfillment Services consulting','description':description,'url':canonical,'provider':{'@id':SITE+'/#organization'},'areaServed':[{'@type':'Country','name':'Canada'}]}]
    base(file,title,description,body,schemas)

def selected_work():
    file='selected-work.html'
    body=f'''<div class="container crumbs"><a href="/">Home</a> / Selected work</div><section class="page-hero"><div class="container"><p class="eyebrow">Selected work · anonymized</p><h1>Examples of marketplace work I’ve handled.</h1><p class="lead">These examples draw on marketplace work I have handled, from Amazon account operations to Walmart launches and WFS coordination. Client names, confidential figures and identifying details are omitted.</p>{btns()}</div></section>
    <section class="section"><div class="container case-grid">
      {marketplace_work_example('amazon')}
      {marketplace_work_example('walmart')}
      <article class="case-card"><p class="eyebrow">Marketplace reconciliation</p><h2>Untangling returns, settlements and prior credits</h2><h3>Situation</h3><p>Return and settlement records did not align cleanly, making it difficult to separate open discrepancies from payments or adjustments already issued.</p><h3>Work</h3><p>Normalized the review period, matched order and transaction identifiers, checked prior credits, isolated formula and quantity exceptions, and documented unresolved items for follow-up.</p><h3>Deliverable</h3><p>A cleaner reconciliation file with defined categories, supporting evidence and a next-action list. The marketplace remained responsible for eligibility and payment decisions.</p><a href="/reimbursement-recovery.html">Explore reimbursement reviews →</a></article>
      <article class="case-card"><p class="eyebrow">WFS inbound operations</p><h2>Coordinating a multi-SKU fulfilment-network inbound</h2><h3>Situation</h3><p>A large marketplace inbound required product quantities, carton counts, labels, shipment identifiers and delivery details to stay coordinated across several handoffs.</p><h3>Work</h3><p>Built the shipment breakdown, checked carton and unit requirements, organised labels and shipment references, and maintained a visible issue trail for receiving follow-up.</p><h3>Deliverable</h3><p>A shared operating view of what was shipping, how it was labelled and what still needed resolution before or after delivery.</p><a href="/walmart-wfs-consultant-canada.html">Explore WFS consulting →</a></article>
      <article class="case-card"><p class="eyebrow">Marketplace account operations</p><h2>Turning scattered account tasks into an owned work queue</h2><h3>Situation</h3><p>Catalogue issues, listing updates, inventory questions and support cases were spread across different people and systems with no single operating view.</p><h3>Work</h3><p>Grouped the work by commercial impact and dependency, clarified who owned each action, connected listing and inventory decisions, and established a regular follow-up rhythm.</p><h3>Deliverable</h3><p>A prioritized issue list with owners, evidence and next actions rather than a collection of disconnected marketplace tasks.</p><a href="/services.html">Explore marketplace support →</a></article>
    </div></section>
    <section class="section" id="sample-action-plan"><div class="container article-shell"><p class="eyebrow">Illustrative sample · not a client result</p><h2>What an account action plan looks like.</h2><p>This fictional example shows the format of a focused review. It is not a completed client audit, a marketplace policy statement or a promise of results. Actual findings depend on the records reviewed and agreed scope.</p><div class="table-wrap"><table><caption>Sample account review: evidence, action and completion check</caption><thead><tr><th scope="col">Issue to investigate</th><th scope="col">Evidence to review</th><th scope="col">Next action and owner</th><th scope="col">Completion check</th></tr></thead><tbody><tr><th scope="row">A product is not available for sale</th><td>Current item status, error details and required product attributes.</td><td>Scott identifies the missing or conflicting fields; the brand confirms product facts before an agreed update.</td><td>Check the item status and customer-facing page after processing; record any unresolved case.</td></tr><tr><th scope="row">Advertising spend is concentrated on unrelated searches</th><td>Search-term report, product relevance, attribution window and product margin.</td><td>Scott proposes targeting changes; the brand approves changes under the agreed authority.</td><td>Log approved changes and compare subsequent relevant traffic, spend and attributed orders.</td></tr><tr><th scope="row">Received units differ from shipment records</th><td>Shipment ID, quantities, delivery records, later adjustments and prior credits.</td><td>Scott reconciles the same SKU and review period, then records unresolved exceptions and supporting evidence.</td><td>Separate explained differences, credited units and unresolved items; record case status without assuming payment is owed.</td></tr></tbody></table></div><p>A working plan can also record priority, dependencies, due dates and account-specific report references. Supporting material and implementation responsibilities are agreed for each project.</p><a class="btn" href="/booking.html#start">Discuss a focused account review</a></div></section>
    <section class="section soft"><div class="container article-shell"><p class="eyebrow">A concrete paid deliverable</p><h2>An action plan you can work from.</h2><p class="lead">A marketplace action plan brings the issue, supporting evidence, business impact, next action and owner into one working document.</p><p>The plan makes priorities and dependencies visible, so your team can see what needs attention first and how to follow it through. Depending on the agreed scope, supporting files can include a launch checklist, shipment tracker, documented listing changes or an account dashboard.</p><p>Project scope, deliverables, timing and fees are agreed before paid work begins.</p><a class="btn" href="/booking.html#start">Discuss your project</a></div></section>
    <section class="section soft"><div class="container"><div class="section-heading"><p class="eyebrow">How I work</p><h2>Evidence first. Clear ownership. Follow-through.</h2><p class="lead">I do not use a case study to imply that the same outcome is guaranteed for another account. The value is in the operating process: understand the records, define the issue, assign the work and keep it moving.</p></div><div class="grid"><div class="card"><h3>Start with the records</h3><p>Use the actual marketplace reports, shipment records, catalogue data and operating context before deciding what the problem is.</p></div><div class="card"><h3>Separate facts from assumptions</h3><p>A discrepancy, error message or performance change is a reason to investigate—not automatically proof of a specific cause or recovery.</p></div><div class="card"><h3>Make the next action visible</h3><p>Every review should end with an owner, evidence, next step and way to confirm what happened.</p></div></div></div></section>{cta()}'''
    schemas=[{'@type':'CollectionPage','name':'Selected marketplace work','description':'Anonymized examples of marketplace reconciliation, WFS inbound coordination and account operations handled by Simple Consulting.','url':url(file)}]
    base(file,'Selected Marketplace Work | Simple Consulting','Anonymized examples of marketplace reconciliation, Walmart WFS inbound coordination and Amazon/Walmart account operations with Scott Nguyen.',body,schemas)

def assessment_landing():
    file='marketplace-assessment.html'
    body='''<div class="container crumbs"><a href="/">Home</a> / Free marketplace assessment</div><section class="page-hero"><div class="container"><p class="eyebrow">Free Amazon & Walmart marketplace assessment</p><h1>Turn “we need help” into a clearer starting point.</h1><p class="lead">Answer a few questions about your channels and what needs attention. You’ll get a concise needs summary and suggested starting points. No login, password or account access required.</p><ul class="inline-facts"><li><strong>~2 min</strong>to complete</li><li><strong>No login</strong>or account access</li><li><strong>No email</strong>required to see the summary</li></ul></div></section>
    <section class="section"><div class="container"><div class="tool-shell"><iframe id="assessment-tool" title="Amazon and Walmart marketplace assessment" src="/assessment/index.html?embed=1"></iframe></div><p class="notice">This is a starting-point tool, not an account audit. Detailed review or implementation is separate paid work when agreed.</p></div></section>
    <section class="section soft"><div class="container"><div class="section-heading"><p class="eyebrow">What it helps with</p><h2>Useful when the problem spans more than one dashboard.</h2></div><div class="grid"><div class="card"><h3>Amazon</h3><p>Seller Central, Vendor Central, FBA, listings, advertising and account issues.</p></div><div class="card"><h3>Walmart</h3><p>Marketplace, WFS, item setup, inbound inventory, returns and reconciliation.</p></div><div class="card"><h3>Operating priorities</h3><p>Inventory, fulfilment, reporting and the recurring work that needs a clear owner.</p></div></div></div></section>'''
    base(file,'Free Amazon & Walmart Marketplace Assessment | Simple Consulting','Free 2-minute Amazon and Walmart marketplace assessment for Canadian brands. Get a concise needs summary before booking or messaging Scott.',body,[{'@type':'WebApplication','name':'Simple Consulting Marketplace Assessment','applicationCategory':'BusinessApplication','operatingSystem':'Web','url':url(file),'offers':{'@type':'Offer','price':'0','priceCurrency':'CAD'}}],scripts='<script src="/assets/assessment-landing.js" defer></script>')

def calculator_page():
    file='amazon-fba-vs-walmart-wfs-calculator.html'
    body='''<div class="container crumbs"><a href="/">Home</a> / FBA vs WFS calculator</div><section class="page-hero"><div class="container"><p class="eyebrow">Free fulfilment comparison tool</p><h1>Amazon FBA vs Walmart WFS calculator for Canadian sellers.</h1><p class="lead">Compare the contribution from one SKU using your own current marketplace, fulfilment, storage, inbound, advertising and return assumptions. No marketplace fees are hard-coded.</p></div></section>
    <section class="section"><div class="container calculator-layout"><form class="calculator-form" id="fulfilment-calculator"><div class="calc-common"><h2>Product inputs</h2><div class="form-row"><div class="field"><label for="sell-price">Selling price (CAD)</label><input id="sell-price" type="number" min="0" step="0.01" placeholder="0.00"></div><div class="field"><label for="product-cost">Product cost (CAD)</label><input id="product-cost" type="number" min="0" step="0.01" placeholder="0.00"></div></div></div>
      <div class="calc-grid"><fieldset><legend>Amazon FBA</legend><div class="field"><label for="fba-referral">Referral / marketplace fee (%)</label><input id="fba-referral" type="number" min="0" step="0.01" placeholder="0.00"></div><div class="field"><label for="fba-fulfilment">Fulfilment fee</label><input id="fba-fulfilment" type="number" min="0" step="0.01" placeholder="0.00"></div><div class="field"><label for="fba-storage">Storage allocation per order</label><input id="fba-storage" type="number" min="0" step="0.01" placeholder="0.00"></div><div class="field"><label for="fba-inbound">Inbound freight / prep per unit</label><input id="fba-inbound" type="number" min="0" step="0.01" placeholder="0.00"></div><div class="field"><label for="fba-returns">Expected return cost per order</label><input id="fba-returns" type="number" min="0" step="0.01" placeholder="0.00"></div><div class="field"><label for="fba-ads">Advertising cost per order</label><input id="fba-ads" type="number" min="0" step="0.01" placeholder="0.00"></div><div class="field"><label for="fba-other">Other variable cost</label><input id="fba-other" type="number" min="0" step="0.01" placeholder="0.00"></div></fieldset>
      <fieldset><legend>Walmart WFS</legend><div class="field"><label for="wfs-referral">Referral / marketplace fee (%)</label><input id="wfs-referral" type="number" min="0" step="0.01" placeholder="0.00"></div><div class="field"><label for="wfs-fulfilment">Fulfilment fee</label><input id="wfs-fulfilment" type="number" min="0" step="0.01" placeholder="0.00"></div><div class="field"><label for="wfs-storage">Storage allocation per order</label><input id="wfs-storage" type="number" min="0" step="0.01" placeholder="0.00"></div><div class="field"><label for="wfs-inbound">Inbound freight / prep per unit</label><input id="wfs-inbound" type="number" min="0" step="0.01" placeholder="0.00"></div><div class="field"><label for="wfs-returns">Expected return cost per order</label><input id="wfs-returns" type="number" min="0" step="0.01" placeholder="0.00"></div><div class="field"><label for="wfs-ads">Advertising cost per order</label><input id="wfs-ads" type="number" min="0" step="0.01" placeholder="0.00"></div><div class="field"><label for="wfs-other">Other variable cost</label><input id="wfs-other" type="number" min="0" step="0.01" placeholder="0.00"></div></fieldset></div>
      <button class="btn" type="submit">Calculate comparison</button><p class="small muted">Use current fee information from your own marketplace account or current programme documentation. This calculator does not determine programme eligibility or include every possible cost.</p></form>
      <aside class="calculator-results" id="calculator-results" aria-live="polite"><p class="eyebrow">Comparison</p><h2>Enter your assumptions and calculate.</h2><div class="result-table" hidden><div><span></span><strong>FBA</strong><strong>WFS</strong></div><div><span>Total variable cost / order</span><strong id="fba-total"></strong><strong id="wfs-total"></strong></div><div><span>Contribution / order</span><strong id="fba-contribution"></strong><strong id="wfs-contribution"></strong></div><div><span>Contribution margin</span><strong id="fba-margin"></strong><strong id="wfs-margin"></strong></div></div><p id="calc-summary" class="callout" hidden></p><p><a href="/blog/amazon-fba-vs-walmart-wfs-canada.html">Read the full FBA vs WFS comparison →</a></p><p><a href="/walmart-wfs-consultant-canada.html">Need help evaluating WFS? →</a></p><a class="btn secondary" id="discuss-fba-wfs" href="/booking.html#start">Discuss these results</a></aside></div></section>'''
    base(file,'Amazon FBA vs Walmart WFS Calculator Canada | Simple Consulting','Free Amazon FBA vs Walmart WFS calculator for Canadian sellers. Compare your own fees, fulfilment, storage, inbound, returns and advertising assumptions.',body,[{'@type':'WebApplication','name':'Amazon FBA vs Walmart WFS Calculator','applicationCategory':'BusinessApplication','operatingSystem':'Web','url':url(file),'offers':{'@type':'Offer','price':'0','priceCurrency':'CAD'}}],scripts='<script src="/assets/marketplace-calculator.js" defer></script>')

def growth_tools():
    file='marketplace-reimbursement-checklist.html'
    body='''<div class="container crumbs"><a href="/">Home</a> / Marketplace reimbursement checklist</div><section class="page-hero"><div class="container"><p class="eyebrow">Free reimbursement review tool</p><h1>Marketplace reimbursement reconciliation checklist.</h1><p class="lead">Organise the records behind a potential Amazon or Walmart discrepancy before deciding whether a claim or support case is warranted.</p></div></section>
    <section class="section"><div class="container tool-grid"><form class="tool-panel" id="reimbursement-checklist"><h2>Build your review file</h2><p class="muted">Check an item only when you have reviewed it for the specific transaction or period.</p>
    <fieldset><legend>Scope</legend><label><input type="checkbox" data-label="Marketplace, country and programme identified"> Marketplace, country and programme identified</label><label><input type="checkbox" data-label="Review period and transaction IDs defined"> Review period and transaction IDs defined</label><label><input type="checkbox" data-label="Issue type separated from other discrepancies"> Issue type separated from other discrepancies</label></fieldset>
    <fieldset><legend>Evidence</legend><label><input type="checkbox" data-label="Shipment or order records collected"> Shipment or order records collected</label><label><input type="checkbox" data-label="Carrier or delivery evidence collected where relevant"> Carrier or delivery evidence collected where relevant</label><label><input type="checkbox" data-label="Inventory and receiving records compared"> Inventory and receiving records compared</label><label><input type="checkbox" data-label="Return, refund or adjustment records compared"> Return, refund or adjustment records compared</label><label><input type="checkbox" data-label="Settlement or payment records reviewed"> Settlement or payment records reviewed</label></fieldset>
    <fieldset><legend>Reconciliation</legend><label><input type="checkbox" data-label="Timing differences checked"> Timing differences checked</label><label><input type="checkbox" data-label="Prior credits or reimbursements checked"> Prior credits or reimbursements checked</label><label><input type="checkbox" data-label="Open cases or duplicate submissions checked"> Open cases or duplicate submissions checked</label><label><input type="checkbox" data-label="Unresolved quantity or amount documented separately"> Unresolved quantity or amount documented separately</label></fieldset>
    <fieldset><legend>Before follow-up</legend><label><input type="checkbox" data-label="Current programme requirements checked"> Current programme requirements checked</label><label><input type="checkbox" data-label="Applicable deadline or waiting period checked"> Applicable deadline or waiting period checked</label><label><input type="checkbox" data-label="Required supporting documents identified"> Required supporting documents identified</label><label><input type="checkbox" data-label="Owner and next action assigned"> Owner and next action assigned</label></fieldset>
    <div class="actions"><button class="btn" type="button" id="copy-reimbursement-checklist">Copy checklist</button><button class="btn secondary" type="button" id="download-reimbursement-checklist">Download CSV</button></div></form>
    <aside class="tool-result"><p class="eyebrow">Progress</p><h2 id="reimbursement-progress">0 of 16 reviewed</h2><p id="reimbursement-summary">Start with scope and evidence before treating a report difference as a claim.</p><p class="small muted">This tool does not determine eligibility. Marketplace rules, evidence requirements and deadlines can vary by programme, country and issue.</p><a href="/reimbursement-recovery.html">Need help reconciling the records? →</a><div class="actions"><a class="btn secondary" id="discuss-reimbursement" href="/booking.html?service=reimbursement#start">Send this checklist to Scott</a></div></aside></div></section>'''
    base(file,'Marketplace Reimbursement Checklist | Simple Consulting','Free marketplace reimbursement reconciliation checklist for Amazon and Walmart sellers. Organise shipment, return, inventory, settlement and prior-credit records.',body,[{'@type':'WebApplication','name':'Marketplace Reimbursement Reconciliation Checklist','applicationCategory':'BusinessApplication','operatingSystem':'Web','url':url(file),'offers':{'@type':'Offer','price':'0','priceCurrency':'CAD'}}],scripts='<script src="/assets/reimbursement-checklist.js" defer></script>')

    file='marketplace-launch-margin-calculator.html'
    body='''<div class="container crumbs"><a href="/">Home</a> / Marketplace launch margin calculator</div><section class="page-hero"><div class="container"><p class="eyebrow">Free marketplace economics tool</p><h1>Marketplace launch margin calculator.</h1><p class="lead">Model contribution per order and a simple monthly scenario using your own selling price, costs, fees, fulfilment, advertising and return assumptions.</p></div></section>
    <section class="section"><div class="container calculator-layout"><form class="calculator-form" id="launch-margin-calculator"><h2>Your assumptions</h2><div class="form-row"><div class="field"><label for="margin-price">Selling price (CAD)</label><input id="margin-price" type="number" min="0" step="0.01" placeholder="0.00"></div><div class="field"><label for="margin-cogs">Product cost / COGS</label><input id="margin-cogs" type="number" min="0" step="0.01" placeholder="0.00"></div></div><div class="form-row"><div class="field"><label for="margin-marketplace">Marketplace / referral fee (%)</label><input id="margin-marketplace" type="number" min="0" step="0.01" placeholder="0.00"></div><div class="field"><label for="margin-ads">Advertising cost (% of sales)</label><input id="margin-ads" type="number" min="0" step="0.01" placeholder="0.00"></div></div><div class="form-row"><div class="field"><label for="margin-fulfilment">Fulfilment / pick-pack per order</label><input id="margin-fulfilment" type="number" min="0" step="0.01" placeholder="0.00"></div><div class="field"><label for="margin-inbound">Inbound freight / prep per unit</label><input id="margin-inbound" type="number" min="0" step="0.01" placeholder="0.00"></div></div><div class="form-row"><div class="field"><label for="margin-storage">Storage allocation per order</label><input id="margin-storage" type="number" min="0" step="0.01" placeholder="0.00"></div><div class="field"><label for="margin-returns">Expected return cost per order</label><input id="margin-returns" type="number" min="0" step="0.01" placeholder="0.00"></div></div><div class="form-row"><div class="field"><label for="margin-other">Other variable cost per order</label><input id="margin-other" type="number" min="0" step="0.01" placeholder="0.00"></div><div class="field"><label for="margin-units">Scenario orders per month</label><input id="margin-units" type="number" min="0" step="1" placeholder="0"></div></div><button class="btn" type="submit">Calculate margin</button><p class="small muted">Use current fees and your own cost assumptions. This is a planning scenario, not a sales forecast or guarantee.</p></form>
    <aside class="calculator-results" id="margin-results"><p class="eyebrow">Scenario result</p><h2>Enter your assumptions and calculate.</h2><div class="metric-stack" hidden><div><span>Variable cost / order</span><strong id="margin-variable"></strong></div><div><span>Contribution / order</span><strong id="margin-contribution"></strong></div><div><span>Contribution margin</span><strong id="margin-rate"></strong></div><div><span>Monthly contribution scenario</span><strong id="margin-monthly"></strong></div></div><p id="margin-summary" class="callout" hidden></p><p><a href="/blog/walmart-marketplace-launch-readiness-checklist.html">Read the Walmart launch checklist →</a></p><p><a href="/amazon-fba-vs-walmart-wfs-calculator.html">Comparing FBA and WFS? →</a></p><a class="btn secondary" id="discuss-margin" href="/booking.html#start">Discuss this scenario</a></aside></div></section>'''
    base(file,'Marketplace Launch Margin Calculator Canada | Simple Consulting','Free marketplace margin calculator for Canadian brands. Model selling price, fees, fulfilment, inbound freight, advertising, returns and contribution.',body,[{'@type':'WebApplication','name':'Marketplace Launch Margin Calculator','applicationCategory':'BusinessApplication','operatingSystem':'Web','url':url(file),'offers':{'@type':'Offer','price':'0','priceCurrency':'CAD'}}],scripts='<script src="/assets/launch-margin-calculator.js" defer></script>')

    file='amazon-canada-launch-readiness.html'
    body='''<div class="container crumbs"><a href="/">Home</a> / Amazon Canada launch readiness</div><section class="page-hero"><div class="container"><p class="eyebrow">Free Amazon.ca launch tool</p><h1>Amazon Canada launch readiness checklist.</h1><p class="lead">Check whether the product data, fulfilment, inventory, pricing, advertising and operating ownership behind an Amazon.ca launch are ready to move together.</p></div></section>
    <section class="section"><div class="container tool-grid"><form class="tool-panel" id="amazon-readiness"><h2>What is ready today?</h2><p class="muted">Select an item only when the requirement is actually covered for the products you plan to launch.</p>
    <fieldset><legend>Account &amp; catalogue</legend><label><input type="checkbox" data-label="Selling model and account responsibilities are clear"> Selling model and account responsibilities are clear</label><label><input type="checkbox" data-label="Product identifiers, brand information and required attributes are available"> Product identifiers, brand information and required attributes are available</label><label><input type="checkbox" data-label="Titles, bullets, images and product facts are prepared"> Titles, bullets, images and product facts are prepared</label><label><input type="checkbox" data-label="Variation structure has been planned where relevant"> Variation structure has been planned where relevant</label></fieldset>
    <fieldset><legend>Economics &amp; fulfilment</legend><label><input type="checkbox" data-label="Marketplace economics have been modelled by SKU"> Marketplace economics have been modelled by SKU</label><label><input type="checkbox" data-label="Fulfilment approach and responsibilities are defined"> Fulfilment approach and responsibilities are defined</label><label><input type="checkbox" data-label="Packaged dimensions and weights are checked"> Packaged dimensions and weights are checked</label><label><input type="checkbox" data-label="Return handling and customer-service ownership are defined"> Return handling and customer-service ownership are defined</label></fieldset>
    <fieldset><legend>Inventory &amp; launch operations</legend><label><input type="checkbox" data-label="Initial inventory allocation is defined"> Initial inventory allocation is defined</label><label><input type="checkbox" data-label="Replenishment lead time and reorder logic are documented"> Replenishment lead time and reorder logic are documented</label><label><input type="checkbox" data-label="Advertising or launch-traffic plan is defined"> Advertising or launch-traffic plan is defined</label><label><input type="checkbox" data-label="Someone owns account notices, cases and post-launch follow-up"> Someone owns account notices, cases and post-launch follow-up</label></fieldset>
    <button class="btn" type="button" id="copy-amazon-readiness">Copy readiness summary</button></form>
    <aside class="tool-result"><p class="eyebrow">Readiness summary</p><h2 id="amazon-readiness-score">0 of 12 ready</h2><p id="amazon-readiness-summary">Start with the account model and product records, then connect the economics, fulfilment and inventory plan.</p><div id="amazon-readiness-missing" class="missing-list"></div><p class="small muted">This checklist does not determine Amazon account, product or programme eligibility. Confirm current requirements in the relevant Amazon account and documentation.</p><a href="/amazon-seller-central-consultant-canada.html">Need launch or Seller Central support? →</a><div class="actions"><a class="btn secondary" id="discuss-amazon-readiness" href="/booking.html?service=amazon#start">Send this summary to Scott</a></div></aside></div></section>'''
    base(file,'Amazon Canada Launch Readiness Checklist | Simple Consulting','Free Amazon.ca launch readiness checklist for Canadian brands covering catalogue, fulfilment, economics, inventory, advertising and account ownership.',body,[{'@type':'WebApplication','name':'Amazon Canada Launch Readiness Checklist','applicationCategory':'BusinessApplication','operatingSystem':'Web','url':url(file),'offers':{'@type':'Offer','price':'0','priceCurrency':'CAD'}}],scripts='<script src="/assets/amazon-launch-readiness.js" defer></script>')

def retail_service_pages():
    pages=[
      {
        'file':'best-buy-marketplace-consultant-canada.html',
        'title':'Best Buy Marketplace Consultant Canada | Simple Consulting',
        'description':'Hands-on Best Buy Canada Marketplace consulting for brands and sellers: onboarding, catalogue setup, fulfilment, integrations, advertising and ongoing account operations.',
        'eyebrow':'Best Buy Marketplace consultant · Canada',
        'h1':'Best Buy Marketplace support from onboarding through ongoing operations.',
        'intro':'I help brands and sellers organise the work behind a Best Buy Canada Marketplace launch or existing account: seller setup, product data, fulfilment, integrations, advertising and the recurring account tasks that need an owner.',
        'sections':[
          ('Prepare the seller and launch work','Start with the account model, required business information, product assortment, catalogue data and the operating responsibilities that need to be ready before launch. Current Best Buy requirements and commercial terms should be confirmed directly for the seller account.'),
          ('Build and maintain the catalogue','Prepare item identifiers, product information, images, attributes and pricing, then keep publishing or content issues in a visible work queue rather than treating launch as the end of catalogue work.'),
          ('Connect fulfilment and integrations','Define who owns inventory feeds, order handling, shipping, returns and customer-service handoffs. If a 3PL or integration partner is involved, make the data and exception responsibilities explicit.'),
          ('Manage the account after launch','Ongoing support can include item maintenance, inventory coordination, promotions or advertising work available in the account, performance review and issue follow-up.')
        ],
        'faq':[
          ('Can you help with Best Buy Marketplace onboarding?','Yes. I can coordinate the seller-readiness, product-data, fulfilment and integration work required for the launch. Best Buy determines seller approval and current programme requirements.'),
          ('Can you help with catalogue and product listings?','Yes. Scope can include item setup, content, attributes, images, pricing and publishing issues.'),
          ('Can you work with a 3PL or integration provider?','Yes. I can coordinate the operating handoffs between the marketplace, your internal team and a fulfilment or integration provider.'),
          ('Do you work with Best Buy retail-vendor relationships too?','I can support the operational work around retail/vendor onboarding and account coordination where that is the engagement. Marketplace and retail-vendor models should be scoped separately.')
        ],
        'service':'operations'
      },
      {
        'file':'3pl-fulfilment-consultant-canada.html',
        'title':'3PL & Fulfilment Consultant Canada | Simple Consulting',
        'description':'Independent 3PL and e-commerce fulfilment consulting for Canadian brands. Provider selection, pricing review, onboarding, SLAs, inventory, returns and marketplace handoffs.',
        'eyebrow':'3PL & fulfilment consultant · Canada',
        'h1':'Choose and operate a 3PL around the work your channels actually require.',
        'intro':'I help brands evaluate 3PL options, compare the full operating cost, define service expectations and coordinate the inventory, order, return and marketplace handoffs after onboarding.',
        'sections':[
          ('Define the requirements before comparing providers','Document order volume, SKU profile, storage needs, receiving patterns, parcel mix, marketplace requirements, returns and systems before asking 3PLs to quote. A low pick fee is not useful if important operating work is missing.'),
          ('Compare the complete cost structure','Review receiving, storage, pick-and-pack, packaging, parcel, return, special-project, account-management and exit costs using the same operating assumptions across providers.'),
          ('Set measurable operating expectations','Clarify service levels, reporting, inventory accuracy, order cutoffs, escalation routes, claims, shrinkage handling and what evidence the 3PL returns when something goes wrong.'),
          ('Manage the handoffs after launch','A 3PL transition is not complete when inventory arrives. I can help coordinate marketplace feeds, stock reconciliation, inbound receipts, returns, exceptions and the recurring operating review.')
        ],
        'faq':[
          ('Can you help choose a 3PL?','Yes. I can help define requirements, compare proposals and identify operating questions or cost gaps before a decision.'),
          ('Do you receive referral fees from 3PLs?','Simple Consulting is positioned as independent consulting. Any commercial relationship relevant to a recommendation should be disclosed before it influences an engagement.'),
          ('Can you help after the warehouse is selected?','Yes. Onboarding, data handoffs, inventory reconciliation, SLA tracking and exception management are often as important as the selection itself.'),
          ('Do you work with marketplace fulfilment as well as 3PLs?','Yes. The operating model can include FBA, WFS, retailer fulfilment requirements and third-party warehouses where those channels are in scope.')
        ],
        'service':'operations'
      },
      {
        'file':'retail-marketplace-vendor-onboarding-canada.html',
        'title':'Retail Marketplace & Vendor Onboarding Canada | Simple Consulting',
        'description':'Retail marketplace and vendor onboarding support for Canadian brands working with Best Buy, Costco, Wayfair, Home Depot and other retail channels.',
        'eyebrow':'Retail marketplace & vendor onboarding · Canada',
        'h1':'Retail-channel onboarding with the catalogue, fulfilment and operations connected.',
        'intro':'I help Canadian brands prepare for and operate additional retail channels beyond Amazon and Walmart. The work can cover marketplace onboarding, vendor setup, product data, fulfilment, EDI or integration coordination, returns and recurring account operations.',
        'sections':[
          ('Separate marketplace and wholesale/vendor models','A third-party marketplace account and a wholesale or first-party vendor relationship create different economics, data flows, service requirements and responsibilities. I help define the model before the team builds the operating process around it.'),
          ('Prepare the product and business records','Organise item identifiers, product content, images, pricing or wholesale cost inputs, banking and insurance information, shipping details and other records required for the specific retailer relationship.'),
          ('Coordinate fulfilment, EDI and system handoffs','Retail programmes can create new order, inventory, ASN, invoicing, return and routing requirements. I help translate those requirements into owners, systems and exception processes rather than treating integration as a checkbox.'),
          ('Build a repeatable operating rhythm','After launch, keep purchase orders or marketplace orders, item issues, inventory, deductions, returns and account follow-up visible. The scope can be a focused onboarding or ongoing channel support.')
        ],
        'faq':[
          ('Which retailers can you support?','My experience includes Best Buy Canada, Costco, Wayfair, Home Depot and other retail channels. The exact scope depends on the account model and current retailer requirements.'),
          ('Can you guarantee retailer approval or a purchase order?','No. The retailer controls seller, supplier and assortment decisions. I can help prepare the operating and onboarding work around the opportunity.'),
          ('Can you help with EDI and integrations?','Yes. I can help define the business requirements, coordinate the implementation and verify the resulting order, inventory or document flow with the relevant systems or partners.'),
          ('Can this be ongoing support after launch?','Yes. The engagement can continue into catalogue, orders, inventory, reporting, deductions, returns and other recurring retail-channel work.')
        ],
        'service':'operations'
      }
    ]
    for p in pages:
        body=f'''<div class="container crumbs"><a href="/">Home</a> / <a href="/services.html">Services</a> / {E(p['eyebrow'].split(' · ')[0])}</div><section class="page-hero"><div class="container"><p class="eyebrow">{E(p['eyebrow'])}</p><h1>{E(p['h1'])}</h1><p class="lead">{E(p['intro'])}</p>{btns('operations')}</div></section><section class="section"><div class="container service-layout"><div class="service-content">'''
        for i,(title,text) in enumerate(p['sections']):
            body+=f'<section id="section-{i+1}"><h2>{E(title)}</h2><p>{E(text)}</p></section>'
        body+=f'''</div><aside class="service-sidebar"><h2>Work directly with Scott</h2><p>I stay involved in the agreed onboarding, fulfilment or retail-channel work from review through follow-up.</p><hr><h2>Related support</h2><p>Need broader inventory and fulfilment help? See <a href="/ecommerce-operations.html">e-commerce operations</a>.</p><hr><h2>Start with the channel</h2><a class="btn" href="/booking.html?service=operations#booking">Book a free call</a><a href="/booking.html?service=operations#start">Prefer to send a message?</a></aside></div></section><section class="section soft"><div class="container"><h2>Questions before we start</h2>{faq(p['faq'])}</div></section>{cta('operations')}'''
        canonical=url(p['file'])
        schemas=[{'@type':'Service','@id':canonical+'#service','name':p['eyebrow'].split(' · ')[0],'serviceType':p['h1'].rstrip('.'),'description':p['intro'],'url':canonical,'provider':{'@id':SITE+'/#organization'},'areaServed':[{'@type':'Country','name':'Canada'}]}]
        base(p['file'],p['title'],p['description'],body,schemas)

def services_hub():
    body=f'''<section class="page-hero"><div class="container"><p class="eyebrow">Marketplace &amp; e-commerce services</p><h1>The channel work.<br>The operations behind it.</h1><p class="lead">Start with Amazon, Walmart or a recurring inventory and fulfilment problem. I can take on a focused project, manage the ongoing work or coordinate priorities across your channels.</p>{btns()}</div></section><section class="section"><div class="container"><div class="section-heading"><p class="eyebrow">Core services</p><h2>Where I can take work off your plate.</h2></div><div class="grid">{''.join(service_card(BY_KEY[k],i+1) for i,k in enumerate(['amazon','walmart','operations']))}</div></div></section><section class="section soft"><div class="container"><div class="section-heading"><p class="eyebrow">Specialized marketplace services</p><h2>Start with the exact work that needs attention.</h2><p>These focused services can stand alone or sit inside broader Amazon or Walmart account management.</p></div><div class="grid"><div class="card"><h3>Amazon PPC management</h3><p>Campaigns, search terms, budgets and measurement connected to listings, margin and stock.</p><a class="card-link" href="/amazon-ppc-management-canada.html">Explore Amazon PPC →</a></div><div class="card"><h3>Amazon listing optimization</h3><p>Titles, bullets, images, attributes, variations and catalogue issues.</p><a class="card-link" href="/amazon-listing-optimization-canada.html">Explore Amazon listings →</a></div><div class="card"><h3>Walmart listing optimization</h3><p>Item setup, content, attributes, variants and publishing issues.</p><a class="card-link" href="/walmart-listing-optimization-canada.html">Explore Walmart listings →</a></div><div class="card"><h3>Walmart Connect management</h3><p>Advertising management tied to product readiness, inventory and channel economics.</p><a class="card-link" href="/walmart-connect-management-canada.html">Explore Walmart Connect →</a></div></div></div></section><section class="section soft"><div class="container"><div class="section-heading"><p class="eyebrow">Supporting your wider business</p><h2>Connect the work around your channels.</h2><p>Choose these services when the issue extends into your store, records, reporting, advertising or the coordination between teams.</p></div><div class="grid two">{''.join(service_card(BY_KEY[k]) for k in ['reimbursement','fractional','shopify','systems','google'])}</div></div></section><section class="section"><div class="container"><div class="section-heading"><p class="eyebrow">Other retail channels</p><h2>Support beyond Amazon and Walmart.</h2><p>My background also includes Best Buy Canada, Costco, Wayfair, Home Depot and other retail channels. Start with the operating model that matches the work.</p></div><div class="grid"><div class="card"><h3>Best Buy Marketplace</h3><p>Seller onboarding, catalogue setup, fulfilment, integrations, advertising and recurring account work.</p><a class="card-link" href="/best-buy-marketplace-consultant-canada.html">Explore Best Buy Marketplace support →</a></div><div class="card"><h3>3PL & fulfilment consulting</h3><p>Provider selection, cost comparison, onboarding, service levels, inventory and marketplace handoffs.</p><a class="card-link" href="/3pl-fulfilment-consultant-canada.html">Explore 3PL consulting →</a></div><div class="card"><h3>Retail marketplace & vendor onboarding</h3><p>Product setup, vendor requirements, fulfilment, EDI/integration coordination and ongoing retail operations.</p><a class="card-link" href="/retail-marketplace-vendor-onboarding-canada.html">Explore retail onboarding support →</a></div></div></div></section>{cta()}'''
    base('services.html','Marketplace & E-commerce Consulting Canada | Simple Consulting','Amazon and Walmart management, inventory and fulfilment consulting, with supporting Shopify, reporting and fractional e-commerce services. Work with Scott.',body)
def about():
    body=f'''<section class="page-hero"><div class="container"><p class="eyebrow">About Scott Nguyen</p><h1>An experienced operator.<br>Your day-to-day partner.</h1><p class="lead">I'm the founder of Simple Consulting, based in Toronto. I help brands, manufacturers and distributors manage marketplace accounts and the inventory, fulfilment and reporting behind them.</p>{btns()}</div></section><section class="section"><div class="container split"><img class="founder-image" src="/assets/scott-nguyen.webp" width="340" height="425" alt="Scott Nguyen, founder of Simple Consulting"><div><h2>A practical perspective, built over 17+ years.</h2><p>My background spans retail, e-commerce and operations, including nine years in progressive roles at Staples Canada. My experience across Amazon, Walmart and other channels has developed through that broader career.</p><p>I work on the details that connect channel performance: listings, advertising, stock availability, purchase orders, fulfilment, returns and reporting. A useful recommendation needs an owner and a way to put it into practice.</p><p>You work with me directly. We agree on responsibilities, access, approvals and the reporting cadence before work begins.</p><a href="https://www.linkedin.com/in/scott-nguyen-0b97723a0">View my professional background on LinkedIn →</a></div></div></section><section class="section soft"><div class="container"><h2>Where I can help</h2><div class="grid"><div class="card"><h3>Marketplaces and retail</h3><p>Amazon Vendor Central, Seller Central and FBA; Walmart Marketplace and WFS; and experience with Best Buy, Costco, Wayfair, Home Depot and other retail channels.</p></div><div class="card"><h3>Operations and process</h3><p>Inventory planning, fulfilment coordination, returns, vendor requirements and practical process improvement informed by Lean Six Sigma training.</p></div><div class="card"><h3>Systems and reporting</h3><p>ERP, Power BI, business-system integration, Google Ads and analytics work that connects the available information to operating decisions.</p></div></div><p class="small muted" style="margin-top:24px"></p></div></section><section class="section"><div class="container"><div class="section-heading"><p class="eyebrow">Working together</p><h2>Clear priorities. Direct communication. Agreed responsibilities.</h2><p class="lead">A project can address one defined issue. Ongoing management can cover recurring channel tasks. Fractional support can coordinate priorities across your wider business.</p><p>Start by telling me what is happening and what you want to improve. We will discuss the right scope and the information needed to assess it.</p></div><a href="/services.html">Explore the services →</a></div></section>{cta()}'''
    base('about.html','Scott Nguyen | E-commerce & Marketplace Consultant Canada','Meet Scott Nguyen, founder of Simple Consulting in Toronto. 17+ years in e-commerce, with brands grown to $3M, $6M and $2M+ in sales. Direct, practical channel support.',body)
def booking():
    options=''.join(f'<option value="{s["key"]}">{E(s["label"])}</option>' for s in SERVICES)
    body=f'''<section class="page-hero"><div class="container"><p class="eyebrow" id="contact-eyebrow">Start a conversation</p><h1 id="contact-heading">Let’s get the work moving.</h1><p class="lead" id="contact-intro">Bring one marketplace challenge to a free 30-minute call, or send a short message. We will clarify the issue, identify what needs reviewing and discuss a practical next step for your business.</p><div class="actions"><a class="btn" href="#booking">Book a free call</a><a class="btn secondary" href="#start">Send a message</a></div><p class="hero-note">A short description is enough to start. No presentation or account access needed.</p></div></section>
    <section class="section"><div class="container contact-layout"><section id="start"><h2>What's on your mind?</h2><p class="muted">A sentence or two is enough to start. I'll reply within one business day.</p>{enquiry_form()}</section>
    <aside class="contact-aside" id="booking"><div class="contact-person"><img src="/assets/scott-nguyen.webp" width="70" height="85" alt="Scott Nguyen" loading="lazy"><p><strong>Speak directly with Scott</strong><br><span class="small muted">Toronto, Ontario · Canada</span></p></div><h2>Book a free call.</h2><p>Leave the free 30-minute call with a clearer problem to solve, the information needed for a review and a sense of whether project or ongoing support fits. A detailed audit or written action plan is scoped separately.</p><button type="button" class="btn" id="load-calendar" aria-controls="calendar-slot" aria-expanded="false">Choose a time</button><br><a class="calendar-fallback" id="calendar-direct" data-event="booking_open" href="https://calendly.com/simpleconsulting/30min" target="_blank" rel="noopener noreferrer">Open Calendly ↗<span class="small"> &nbsp;(new tab)</span></a><p class="small muted" style="margin-top:15px">Choose a time in your timezone. If you have already written a message, use “Copy your enquiry” to add it to your booking notes.</p><div id="calendar-slot" class="calendar-slot" hidden></div><p class="small muted" id="calendar-status" role="status"></p><hr style="border:0;border-top:1px solid var(--line);margin:26px 0"><h3>What to bring</h3><p>A description of your business, your channels and what you want to improve. No password, account access or prepared presentation is needed.</p><p class="small">Prefer email? <a href="mailto:scott@simpleconsulting.ca" data-event="email_click">scott@simpleconsulting.ca</a></p></aside></div>
    <div class="container" id="assessment"><details class="assessment-panel" id="assessment-panel"><summary>Not sure what your Amazon or Walmart channel needs? Try the optional 2-minute assessment.</summary><p>Choose your channels and issues to create a starting summary. No contact details are required. Nothing is sent until you choose to share it.</p><iframe id="assessment-frame" title="Optional Amazon and Walmart channel assessment" data-src="/assessment/index.html?embed=1" hidden></iframe><noscript><p><a href="/assessment/index.html">Open the assessment</a>. You can book or send a message without completing it.</p></noscript></details></div></section>
    <section class="section soft"><div class="container"><h2>Before you get in touch</h2>{faq([('What does the first review include?','A free 30-minute conversation to understand your situation, identify what to examine next and discuss a suitable scope. A detailed account audit or implementation is separate work unless agreed otherwise.'),('Do I need to know exactly which service I need?','No. Describe the problem and we can work out whether the starting point is the account, advertising, inventory, store, reporting or a broader operating role.'),('Can we start with a focused project?','Yes. A specific issue may suit a project before you consider ongoing support.'),('When will I hear back?','I reply to messages within one business day. If you book a call, Calendly confirms your selected time and meeting details.')])}</div></section>'''
    body=body.replace('<section class="section soft"><div class="container"><h2>Before you get in touch</h2>', pricing_section()+'<section class="section soft"><div class="container"><h2>Before you get in touch</h2>', 1)
    base('booking.html','Free E-commerce & Marketplace Review | Simple Consulting','Book a free 30-minute call or message Scott about Amazon, Walmart, Shopify, inventory, advertising or e-commerce operations. Channel diagnostics from CAD $750.',body,scripts='<script src="/assets/contact.js" defer></script>')
def privacy():
    body='''<section class="page-hero"><div class="container"><p class="eyebrow">Privacy & enquiries</p><h1>About the information you share here.</h1><p class="lead">Use the contact form, email or booking link to start a conversation with Scott at Simple Consulting.</p></div></section><section class="section"><div class="container article-shell"><h2>Enquiry information</h2><p>The contact form asks for your name, email and message. You can optionally choose a service. It also includes the page or service source to help explain your enquiry. Formspree processes the form and delivers it to Scott. The information is used to respond to your request and discuss the work you are considering.</p><p>Sending an enquiry does not subscribe you to marketing emails. Please do not include passwords, payment-card information or sensitive customer records in this form. We can agree on a suitable way to share relevant project records if needed.</p><h2>Booking a call</h2><p>The primary booking button loads Calendly on this page. A separate link opens Calendly in a new tab if you prefer. Information you provide there is processed by Calendly for booking. Details typed into the message form are not automatically forwarded to the calendar.</p><h2>The optional assessment and tools</h2><p>The assessment and interactive calculators or checklists create results from information you enter or select. Those results remain in your browser tab unless you choose an action such as “Send this summary to Scott” or “Discuss these results.” If you choose that action, the result is placed into the enquiry form in your browser so you can review it before sending. Nothing is submitted until you press Send or complete a booking yourself.</p><h2>Third-party services</h2><p>Formspree, Calendly, the website host and your email provider may process information as part of delivering their services. Their policies explain their handling of that information. This website uses Google Analytics 4 to measure page visits, campaign sources and interactions with booking links, assessments and tools. Accepted enquiry-form submissions and confirmed appointments made through the embedded calendar are recorded as separate events. Opening a booking link does not count as a completed appointment. Automatic form and site-search measurement is disabled. Analytics page URLs exclude free-text query parameters and fragments; only recognised campaign labels and supported advertising click identifiers are retained. Google signals and advertising personalisation signals are disabled for this Analytics property. The Google Ads tag separately measures successful enquiry-form submissions. Google may use cookies and advertising click identifiers to connect a visit or enquiry with an ad interaction. We do not include your name, email address or message in the conversion event. Recognised campaign labels from a link, such as Google or LinkedIn and the named service, may be retained in this browser tab for up to 30 minutes and included with an enquiry you submit. This helps Scott understand which campaign led to the conversation. Our campaign-label storage does not retain arbitrary link parameters, advertising click IDs or your typed form details. Google’s separate tag may process advertising click identifiers for conversion measurement.</p><p><a href="https://policies.google.com/privacy">Google privacy policy</a> · <a href="https://policies.google.com/technologies/partner-sites">How Google uses information from this site</a> · <a href="https://formspree.io/legal/privacy-policy/">Formspree privacy policy</a> · <a href="https://calendly.com/privacy">Calendly privacy policy</a> · <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement">GitHub privacy statement</a></p><h2>Questions about your information</h2><p>Email <a href="mailto:scott@simpleconsulting.ca">scott@simpleconsulting.ca</a> to ask about your enquiry or request correction or deletion. Scott will respond to discuss the request and any relevant record-keeping requirements.</p></div></section>'''
    if CONTACT_WORKER:
        body = body.replace('Formspree processes the form and delivers it to Scott.', 'Cloudflare Workers processes the form, Cloudflare Turnstile checks for automated submissions, and Resend delivers your enquiry to Scott and sends an acknowledgement to the email address you provide.')
        body = body.replace('Formspree, Calendly,', 'Cloudflare, Resend, Calendly,')
        body = body.replace('<a href="https://formspree.io/legal/privacy-policy/">Formspree privacy policy</a>', '<a href="https://www.cloudflare.com/privacypolicy/">Cloudflare privacy policy</a> · <a href="https://resend.com/legal/privacy-policy">Resend privacy policy</a>')
    body = body.replace('You can optionally choose a service.', 'You can optionally choose a service and tell me where you sell, your approximate monthly online sales and when you would like to start.', 1)
    extra = ''
    if RESULTS_EMAIL:
        extra += '<h2>Emailing tool results</h2><p>On some free tools you can choose “Email me” to receive a copy of your results. Your email address and the results are sent through Cloudflare and Resend so the email can be delivered, and Scott is notified of the request. Requesting results does not subscribe you to marketing emails. If you also tick the optional box, you will receive up to four short, practical marketplace emails. Each includes a way to unsubscribe.</p>'
    if PAY_URL:
        extra += '<h2>Paying for a diagnostic</h2><p>Diagnostic payments are processed by Stripe on Stripe’s checkout page. Card details are not handled or stored by this website. Stripe sends your receipt and shares the details needed to confirm your purchase.</p>'
    if extra:
        body = body.replace('<h2>Third-party services</h2>', extra + '<h2>Third-party services</h2>', 1)
    base('privacy.html','Privacy & Enquiries | Simple Consulting','How enquiries, booking details and optional channel-assessment answers are handled on the Simple Consulting website.',body)
def blog():
    seen=set()
    for p in POSTS:
        slug=p.get('slug') or slugify(p['title'])
        if slug in seen: raise ValueError('Duplicate post slug: '+slug)
        seen.add(slug);p['slug']=slug
    sorted_posts=sorted(POSTS,key=lambda p: (p.get('updated',postdate(p)),postdate(p)),reverse=True)
    priority_keys={'amazon','walmart','operations','reimbursement'}
    display_posts=[p for p in sorted_posts if service_for(p)['key'] in priority_keys]+[p for p in sorted_posts if service_for(p)['key'] not in priority_keys]
    cards=''.join(post_card(p, filterable=True) for p in display_posts)
    tags=['Marketplaces','E-commerce','Operations','Google Ads','ERP','SEO','Web','Growth']
    buttons='<button type="button" data-filter="all" aria-pressed="true">All</button>'+''.join(f'<button type="button" data-filter="{E(t)}" aria-pressed="false">{E("Systems & reporting" if t=="ERP" else t)}</button>' for t in tags)
    body=f'''<section class="page-hero"><div class="container"><p class="eyebrow">The operator’s reading list</p><h1>Find the next step for your marketplace.</h1><p class="lead">Start with the channel or operating problem in front of you. These guides connect the records to check, the decisions to make and the support available.</p><a href="/booking.html#assessment">Not sure where to start? Assess your channels →</a></div></section>{guides_section()}<section class="section soft" id="all-insights"><div class="container"><div class="section-heading"><p class="eyebrow">The full library</p><h2>Find a specific answer.</h2><p>Marketplace, reimbursement and inventory guides are shown first because they reflect the core consulting work. Use search or filters to browse the wider e-commerce library.</p></div><label for="article-search">Search by topic or question</label><br><input class="search-field" id="article-search" type="search" placeholder="Try inventory, Amazon, Shopify or reporting" aria-controls="post-grid"><div class="filters" role="group" aria-label="Filter articles by topic">{buttons}</div><div class="library-status"><p class="small muted" id="filter-status" role="status" aria-live="polite">{len(POSTS)} articles</p><button class="text-button" id="clear-filters" type="button" hidden>Clear search and filters</button></div><p id="no-articles" hidden>No matching articles. Try another term or clear the filters.</p><div class="post-list" id="post-grid">{cards}</div><nav class="article-pagination" id="article-pagination" aria-label="Article pages" hidden><button class="btn secondary" id="previous-articles" type="button">Previous</button><span id="article-page-status" role="status"></span><button class="btn secondary" id="next-articles" type="button">Next</button></nav></div></section>{cta()}'''
    base('blog.html','Amazon, Walmart & Inventory Guides | Simple Consulting','Find practical Amazon, Walmart and inventory guides, plus a searchable library on marketplace advertising, fulfilment and e-commerce operations.',body)
    for p in sorted_posts:
        file='blog/'+p['slug']+'.html';canonical=url(file);s=service_for(p)
        # Stable URLs are stored in posts.json before any title edits.
        body_html=p['body']
        headings=[]
        def heading(m):
            text=plain(m.group(2)); hid='part-'+str(len(headings)+1);headings.append((hid,text))
            return '<h2 id="'+hid+'">'+m.group(2)+'</h2>'
        body_html=re.sub(r'<h([23])[^>]*>(.*?)</h[23]>',heading,body_html,flags=re.S)
        toc='<details class="article-toc"><summary>In this article</summary><ol>'+''.join(f'<li><a href="#{i}">{E(t)}</a></li>' for i,t in headings)+'</ol></details>' if headings else ''
        article_ctas={
          'amazon-ppc-audit-checklist-canada':('Amazon PPC management','Need help reviewing or managing the campaigns behind this checklist?','/amazon-ppc-management-canada.html'),
          'how-to-use-amazon-sponsored-products-to-drive-organic-rank':('Amazon PPC management','Want the advertising work managed alongside listings, margin and inventory?','/amazon-ppc-management-canada.html'),
          '5-reasons-your-amazon-listings-arent-converting-and-how-to-fix-them':('Amazon listing optimization','Need help working through listing content, catalogue or variation issues?','/amazon-listing-optimization-canada.html'),
          'how-to-write-amazon-product-titles-that-rank-and-convert':('Amazon listing optimization','Want a broader Amazon detail-page and catalogue review?','/amazon-listing-optimization-canada.html'),
          'how-to-get-your-product-listed-on-amazon-canada':('Amazon Seller Central consulting','Need help coordinating an Amazon.ca launch or listing setup?','/amazon-seller-central-consultant-canada.html'),
          'how-to-launch-a-new-product-on-amazon-the-complete-playbook':('Amazon Seller Central consulting','Need someone to coordinate the account, listing, inventory and launch work?','/amazon-seller-central-consultant-canada.html'),
          'walmart-marketplace-launch-readiness-checklist':('Walmart Marketplace management','Need help turning the launch checklist into owned work and follow-through?','/walmart-management.html'),
          'how-to-sell-on-best-buy-canada-what-you-need-to-know':('Best Buy Marketplace consulting','Need help with Best Buy onboarding, catalogue, fulfilment or integrations?','/best-buy-marketplace-consultant-canada.html'),
          'how-to-choose-the-right-3pl-and-what-to-look-for-in-the-contract':('3PL & fulfilment consulting','Need an independent review of 3PL requirements, proposals or onboarding?','/3pl-fulfilment-consultant-canada.html'),
          'the-e-commerce-fulfillment-audit-10-things-to-check-right-now':('3PL & fulfilment consulting','Need help diagnosing fulfilment costs, handoffs or service issues?','/3pl-fulfilment-consultant-canada.html'),
          'how-to-sell-on-costco-canada-what-vendors-need-to-know':('Retail marketplace & vendor onboarding','Need help preparing the operations behind a retailer opportunity?','/retail-marketplace-vendor-onboarding-canada.html'),
          'how-to-sell-on-wayfair-what-you-need-to-know-before-you-apply':('Retail marketplace & vendor onboarding','Need help with product data, fulfilment or onboarding for another retail channel?','/retail-marketplace-vendor-onboarding-canada.html'),
          'how-to-manage-chargebacks-from-major-retailers':('Reimbursement & deduction review','Need help reconciling deductions, evidence and prior credits?','/reimbursement-recovery.html'),
          'how-to-build-a-returns-management-process-that-recovers-value':('E-commerce operations','Need help designing the returns, inventory and fulfilment handoffs?','/ecommerce-operations.html')
        }
        cta_data=article_ctas.get(p['slug'])
        inline_cta=(f'<aside class="article-inline-cta"><p class="eyebrow">Related support</p><h2>{E(cta_data[0])}</h2><p>{E(cta_data[1])}</p><a href="{cta_data[2]}">Explore this service →</a></aside>' if cta_data else '')
        related=sorted([x for x in POSTS if x['slug']!=p['slug'] and service_for(x)['key']==s['key']],key=lambda x: (bool(x.get('featured')),postdate(x)),reverse=True)[:3]
        reading=max(1,round(len(plain(p['body']).split())/200))
        modified=' · Updated '+E(p['updated']) if p.get('updated') else ''
        body=f'''<div class="container"><div class="article-shell"><p class="crumbs"><a href="/">Home</a> / <a href="/blog.html">Insights</a> / {topic_breadcrumb(p)}</p><article><span class="post-tag">{E(p['tag'])}</span><h1>{E(p['title'])}</h1><p class="byline">By <a href="/about.html">Scott Nguyen</a> · Published {E(p['date'])}{modified} · {reading} min read</p>{toc}{inline_cta}<div class="article-body">{body_html}</div><aside class="related-service"><p class="eyebrow">Help with this part of the business</p><h2>{E(s['label'])}</h2><p>{E(s['fit'])}</p><a href="/{s['slug']}.html">Explore {E(s['label'].lower())} →</a><div class="actions"><a class="btn" href="/booking.html?service={s['key']}#start">Discuss this with Scott</a><a href="/booking.html?service={s['key']}#booking">Book a free call</a></div></aside></article><div class="article-related"><h2>Related reading</h2><ul>{''.join(f'<li><a href="/blog/{x["slug"]}.html">{E(x["title"])}</a></li>' for x in related)}</ul><a href="/blog.html">Browse all insights →</a></div></div></div>'''
        desc=p['blurb']
        schema=[{'@type':'BlogPosting','@id':canonical+'#article','headline':p['title'],'description':desc,'datePublished':postdate(p),'dateModified':p.get('updated',postdate(p)),'author':{'@id':SITE+'/about.html#scott'},'publisher':{'@id':SITE+'/#organization'},'mainEntityOfPage':{'@id':canonical+'#page'},'inLanguage':'en-CA','articleSection':p['tag']},{'@type':'BreadcrumbList','itemListElement':[{'@type':'ListItem','position':1,'name':'Home','item':SITE+'/'},{'@type':'ListItem','position':2,'name':'Insights','item':SITE+'/blog.html'},{'@type':'ListItem','position':3,'name':p['title'],'item':canonical}]}]
        base(file,p['title']+' | Simple Consulting',desc,body,schema)
        legacy=ROOT/(p['slug']+'.html')
        if legacy.exists():
            legacy.write_text(f'<!doctype html><html lang="en-CA"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>{E(p["title"])}</title><link rel="canonical" href="{canonical}"><meta http-equiv="refresh" content="0;url={canonical}"></head><body><p>This article is available at <a href="{canonical}">{E(p["title"])}</a>.</p></body></html>')
    # Persist explicit slugs so future title edits do not change existing URLs.
    (ROOT/'posts.json').write_text(json.dumps(POSTS,ensure_ascii=False,indent=2)+'\n')
def sitemap():
    entries=[(url(f),'2026-11-04' if f in ('amazon-management.html','walmart-management.html') else '2026-10-28' if f=='selected-work.html' else TODAY) for f in CORE]+[(url('insights/'+k+'.html'),TODAY) for k in TOPICS]
    entries +=[(url('blog/'+p['slug']+'.html'),p.get('updated',postdate(p))) for p in POSTS]
    xml='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+''.join(f'  <url><loc>{loc}</loc><lastmod>{date}</lastmod></url>\n' for loc,date in entries)+'</urlset>\n'
    (ROOT/'sitemap.xml').write_text(xml)
    (ROOT/'robots.txt').write_text('User-agent: *\nAllow: /\n\nSitemap: '+SITE+'/sitemap.xml\n')
def locale_redirects():
    # Retired locale URLs still requested by Google (reported as 404 in Search Console).
    for loc in ('en-us','en-gb','en-au'):
        d=ROOT/loc; d.mkdir(exist_ok=True)
        (d/'index.html').write_text(f'<!doctype html><html lang="en-CA"><head><meta charset="utf-8"><title>Simple Consulting</title><meta name="robots" content="noindex"><link rel="canonical" href="{SITE}/"><meta http-equiv="refresh" content="0;url={SITE}/"></head><body><p>This page has moved to <a href="{SITE}/">simpleconsulting.ca</a>.</p></body></html>')
def not_found():
    base('404.html','Page Not Found | Simple Consulting','Find the Simple Consulting service or guide you need.','<section class="section"><div class="container"><p class="eyebrow">404 · Page not found</p><h1>Let’s get you to the right place.</h1><p>The page may have moved. Browse the services or search the article library.</p><div class="actions"><a class="btn" href="/services.html">Explore services</a><a class="btn secondary" href="/blog.html">Find an article</a></div><a href="/">Return to the homepage</a></div></section>',robots='noindex,follow')

TOOLS_BODY = '<div class="container crumbs"><a href="/">Home</a> / Free tools</div><section class="page-hero"><div class="container"><p class="eyebrow">Free tools</p><h1>Clarity you can use.</h1><p class="lead">Test an assumption, check your margins or get your records in order. Everything runs in your browser. No sign-up or email required.</p><div class="actions"><a class="btn" href="/marketplace-assessment.html">Start the free assessment</a><a class="btn secondary" href="/booking.html#booking">Book a free call</a></div></div></section><section class="section"><div class="container"><div class="grid tool-grid-cards"><a class="card tool-card tool-card-feature" href="/store-check.html"><span class="tool-kind">Free report</span><h3>Free store check</h3><p>Check your store or a marketplace listing and get a scored report, with the fix for each issue.</p><span class="card-link">Check my store →</span></a><a class="card tool-card" href="/marketplace-assessment.html"><span class="tool-kind">Interactive</span><h3>Marketplace assessment</h3><p>Answer a few questions about Amazon or Walmart and get a short starting summary.</p><span class="card-link">Start the assessment →</span></a><a class="card tool-card" href="/amazon-fba-vs-walmart-wfs-calculator.html"><span class="tool-kind">Calculator</span><h3>FBA vs WFS calculator</h3><p>Compare contribution per order for Amazon FBA and Walmart WFS using your own fees.</p><span class="card-link">Open the calculator →</span></a><a class="card tool-card" href="/marketplace-launch-margin-calculator.html"><span class="tool-kind">Calculator</span><h3>Marketplace margin calculator</h3><p>See what is left from each sale after fees, fulfilment, advertising and returns.</p><span class="card-link">Calculate your margin →</span></a><a class="card tool-card" href="/#tools"><span class="tool-kind">Interactive</span><h3>Support finder</h3><p>Choose your priority and get a suggested starting point and service.</p><span class="card-link">Find your support →</span></a><a class="card tool-card" href="/marketplace-reimbursement-checklist.html"><span class="tool-kind">Checklist</span><h3>Reimbursement checklist</h3><p>Organise shipment, return, inventory and settlement records before a claim.</p><span class="card-link">Open the checklist →</span></a><a class="card tool-card" href="/amazon-canada-launch-readiness.html"><span class="tool-kind">Checklist</span><h3>Amazon.ca launch readiness</h3><p>Check catalogue, economics, fulfilment and ownership before launching on Amazon.ca.</p><span class="card-link">Check readiness →</span></a><a class="card tool-card" href="/blog/walmart-marketplace-launch-readiness-checklist.html"><span class="tool-kind">Checklist</span><h3>Walmart launch readiness</h3><p>The setup, catalogue and fulfilment items to confirm before a Walmart Marketplace launch.</p><span class="card-link">Read the checklist →</span></a><a class="card tool-card" href="/blog/amazon-ppc-audit-checklist-canada.html"><span class="tool-kind">Checklist</span><h3>Amazon PPC audit checklist</h3><p>A step-by-step review of campaigns, search terms, budgets and tracking.</p><span class="card-link">Read the checklist →</span></a><a class="card tool-card" href="/blog/marketplace-reimbursement-review-records-checklist.html"><span class="tool-kind">Checklist</span><h3>Reimbursement records checklist</h3><p>The records to gather before reviewing a marketplace discrepancy.</p><span class="card-link">Read the checklist →</span></a></div><p class="small muted" style="margin-top:22px">Tools give estimates and starting points from the information you enter. They are not account audits or financial advice.</p></div></section><section class="bottom-cta"><div class="container"><div><h2>Want a second pair of eyes on the numbers?</h2><p>Bring your results to a free 30-minute call. We will talk through what they mean and a practical next step.</p></div><a class="btn" data-event="review_click" href="/booking.html#booking">Book a free call</a></div></section>'
def tools_page():
    base('tools.html','Free E-commerce & Marketplace Tools | Simple Consulting','Free calculators, checklists and assessments for Amazon, Walmart and marketplace sellers in Canada. No email required.',TOOLS_BODY)

# ---------------------------------------------------------------------------
# 2026 design additions for inner pages. Applied to each generated page.
# ---------------------------------------------------------------------------
WORKFLOW_LABELS = {'amazon-management.html':'Amazon','walmart-management.html':'Walmart','ecommerce-operations.html':'Operations','ecommerce-systems-reporting.html':'Your systems','fractional-ecommerce-manager.html':'Your channels','google-ads-management.html':'Campaigns','reimbursement-recovery.html':'Records','shopify-consulting.html':'Your store'}
def workflow(label):
    return ('<div class="workflow" aria-label="How the work happens"><div class="workflow-canvas">'
     '<svg viewBox="0 0 420 210" aria-hidden="true">'
     '<path class="workflow-line" d="M40 105H380"/><path class="workflow-line" d="M75 105C135 20 280 20 345 105C280 190 135 190 75 105Z"/>'
     '<circle class="workflow-ring" cx="210" cy="105" r="66"/>'
     '<circle class="workflow-dot" cx="75" cy="105" r="5"/><circle class="workflow-dot" cx="345" cy="105" r="5"/>'
     '<circle class="workflow-pulse" r="3.4"><animateMotion dur="4.2s" repeatCount="indefinite" path="M75 105H345"/></circle>'
     '<circle class="workflow-pulse soft" r="2.6"><animateMotion dur="7s" repeatCount="indefinite" path="M75 105C135 20 280 20 345 105C280 190 135 190 75 105Z"/></circle>'
     '</svg>'
     f'<span class="workflow-node from">{label}</span><div class="workflow-core"><span aria-hidden="true">s.</span></div><span class="workflow-node to">Clear next steps</span></div>'
     '<div class="workflow-controls" role="group" aria-label="How the work happens"><button type="button" class="workflow-step" aria-pressed="true" data-step="0"><span>01</span> Review</button><button type="button" class="workflow-step" aria-pressed="false" data-step="1"><span>02</span> Prioritise</button><button type="button" class="workflow-step" aria-pressed="false" data-step="2"><span>03</span> Deliver</button></div>'
     '<p class="workflow-copy" aria-live="polite">Understand the issue, your current setup and the records available.</p>'
     '</div>')
PRICE_STEPS = ('<ol class="price-steps" aria-label="How working together starts">'
 '<li><span class="ps-dot">1</span><strong>Free intro call</strong><span>30 minutes</span></li>'
 '<li class="feat"><span class="ps-dot">2</span><strong>CAD $750 diagnostic</strong><span>Credited to month one if you continue</span></li>'
 '<li><span class="ps-dot">3</span><strong>Ongoing support</strong><span>Scoped and quoted</span></li></ol>')
NEXT_STEPS = ('<ol class="price-steps next-steps" aria-label="What happens next">'
 '<li><span class="ps-dot">1</span><strong>Pick a time</strong><span>Or send a short message</span></li>'
 '<li class="feat"><span class="ps-dot">2</span><strong>30-minute call</strong><span>Free, directly with Scott</span></li>'
 '<li><span class="ps-dot">3</span><strong>A clear next step</strong><span>Scope and fees agreed first</span></li></ol>')
ABOUT_FACTS = ('<ul class="inline-facts count-facts">'
 '<li><strong><span data-count="17">17</span>+</strong>years in e-commerce</li>'
 '<li><strong>$<span data-count="6">6</span>M</strong>brand grown in one year</li>'
 '<li><strong><span data-count="1">1</span></strong>business day to reply</li></ul>')
FBA_CHART = ('<div class="comparison-chart" hidden aria-label="Contribution comparison from your inputs"><p class="eyebrow">Your scenario, visualised</p>'
 '<div class="comparison-row"><span>Amazon FBA</span><div class="comparison-track"><i id="fba-bar"></i></div><strong id="fba-chart-value"></strong></div>'
 '<div class="comparison-row"><span>Walmart WFS</span><div class="comparison-track"><i id="wfs-bar"></i></div><strong id="wfs-chart-value"></strong></div>'
 '<p class="small muted">Bars show positive contribution per order, relative to the larger result. Negative amounts show as text.</p></div>')
LOST_GRAPHIC = ('<div class="lost-graphic" aria-hidden="true"><svg viewBox="0 0 320 140">'
 '<path class="lost-path" d="M20 70 H300"/><path class="lost-path dashed" d="M160 70 C200 70 220 20 270 24"/>'
 '<circle class="lost-dot" r="5"><animateMotion dur="6s" repeatCount="indefinite" keyPoints="0;0.5;1;0.5;0" keyTimes="0;0.3;0.55;0.8;1" calcMode="spline" keySplines=".4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1" path="M40 70 H160 C200 70 220 20 270 24"/></circle>'
 '</svg><div class="lost-core"><span>s.</span></div><span class="lost-q">?</span></div>')
def service_directory():
    home=(ROOT/'content/homepage.src').read_text()
    a=home.index('<div class="services reveal">'); b=home.index('<div class="services-foot">',a)
    items=home[a+len('<div class="services reveal">'):b]; items=items[:items.rindex('</div>')]
    c=home.index('<details class="specialties">',b); d=home.index('</details>',c)+10
    return ('<section class="section" id="all-services"><div class="container service-directory">'
     '<div class="section-heading"><p class="eyebrow">All services</p><h2>Find the support you need.</h2></div>'
     '<div class="service-search"><label for="service-search">Find a service</label><input id="service-search" type="search" placeholder="Try advertising, Shopify, inventory…" autocomplete="off"><p id="service-search-status" role="status">8 services</p></div>'
     '<div class="services">'+items+'</div>'
     '<p id="service-search-empty" class="small muted" hidden>No services match. Try another term or <a href="/booking.html#start">tell me what you need</a>.</p>'
     '<div class="services-foot"><p>Not sure where to begin? Try the <a href="/tools.html">free tools</a> or <a href="/booking.html#booking">book a free call</a>.</p>'+home[c:d]+'</div></div></section>')
def _once(text,old,new,file):
    if text.count(old)<1: raise ValueError(f'redesign_overlay: expected markup not found in {file}: {old[:60]}')
    return text.replace(old,new,1)
def redesign_overlay(file,text):
    if file in WORKFLOW_LABELS:
        hero=re.search(r'<section class="page-hero">.*?</section>',text,flags=re.S).group(0)
        if '<aside class="start-card"' in hero:
            new=re.sub(r'<aside class="start-card".*?</aside>',lambda m:workflow(WORKFLOW_LABELS[file]),hero,flags=re.S).replace('container hero-grid','container hero-grid service-hero',1)
        else:
            new=_once(hero,'<div class="container"><div>','<div class="container hero-grid service-hero"><div>',file)
            new=new[:-len('</div></section>')]+workflow(WORKFLOW_LABELS[file])+'</div></section>'
        text=text.replace(hero,new,1)
    note='<p class="hero-note">30 minutes · Work directly with Scott · No preparation needed</p>'
    if file in ('amazon-management.html','walmart-management.html'):
        text=_once(text,note,note+PRICE_STEPS,file)
    if file=='services.html':
        main=text[text.index('<main'):text.index('</main>')]
        secs=[m.group(0) for m in re.finditer(r'<section class="section[^"]*"[^>]*>.*?</section>',main,flags=re.S)
              if any(k in m.group(0) for k in ['Core services','Specialized marketplace services','Supporting your wider business'])]
        new_main=main.replace(secs[0],service_directory(),1)
        for sec in secs[1:]: new_main=new_main.replace(sec,'',1)
        text=text.replace(main,new_main,1)
    if file=='amazon-fba-vs-walmart-wfs-calculator.html':
        text=_once(text,'<p id="calc-summary" class="callout" hidden></p>',FBA_CHART+'<p id="calc-summary" class="callout" hidden></p>',file)
    if file=='booking.html':
        bn='<p class="hero-note">A short description is enough to start. No presentation or account access needed.</p>'
        text=_once(text,bn,bn+NEXT_STEPS,file)
    if file=='about.html':
        text=_once(text,note+'</div></section>',note+ABOUT_FACTS+'</div></section>',file)
    if file=='404.html':
        text=_once(text,'<section class="section"><div class="container"><p class="eyebrow">404 · Page not found</p>',
                   '<section class="section lost-section"><div class="container">'+LOST_GRAPHIC+'<p class="eyebrow">404 · Page not found</p>',file)
    return text
# ---------------------------------------------------------------------------
# Growth: paid diagnostic, fixed-scope packages, proof, qualifying questions and
# tool email capture. Switches live in content/contact.json and
# content/testimonials.json so features can go live without code changes.
# ---------------------------------------------------------------------------
TESTIMONIALS = json.loads((ROOT/'content/testimonials.json').read_text())
PAY_URL = CONTACT.get('diagnostic_payment_url','').strip()
KICKOFF_URL = CONTACT.get('diagnostic_kickoff_url','').strip() or 'https://calendly.com/simpleconsulting/30min'
RESULTS_EMAIL = bool(CONTACT.get('results_email')) and CONTACT_WORKER

def diagnostic_buttons(secondary=True):
    if PAY_URL:
        main=f'<a class="btn" data-event="diagnostic_checkout_click" href="{E(PAY_URL)}">Buy the diagnostic · CAD $750</a>'
    else:
        main='<a class="btn" data-event="diagnostic_request_click" href="/booking.html?topic=diagnostic#start">Request the diagnostic</a>'
    second='<a class="btn secondary" data-event="review_click" href="/booking.html#booking">Book a free call first</a>' if secondary else ''
    return f'<div class="actions">{main}{second}</div>'

PROOF_ITEMS = ['17+ years in e-commerce','Brands grown to $3M, $6M and $2M+ in sales','Lean Six Sigma training','Amazon, Walmart, Best Buy, Costco &amp; Wayfair experience']
def proof_row():
    quotes=''.join(f'<figure class="proof-quote"><blockquote>“{E(t["quote"])}”</blockquote><figcaption><strong>{E(t["name"])}</strong>{(" · "+E(t["role"])) if t.get("role") else ""}</figcaption></figure>' for t in TESTIMONIALS[:2] if t.get('quote') and t.get('name'))
    items=''.join(f'<li>{x}</li>' for x in PROOF_ITEMS)
    return (f'<div class="proof-quotes">{quotes}</div>' if quotes else '')+f'<ul class="proof-row" aria-label="Experience">{items}</ul>'

DIAG_FACTS=[('Listings &amp; catalogue','Suppressed or incomplete items, content gaps, pricing and Buy Box or offer issues.'),('Advertising','Search terms, wasted spend, campaign structure and how ads connect to margin and stock.'),('Inventory &amp; fulfilment','Stock cover, inbound shipments, fulfilment costs, returns and discrepancies.'),('Account health','Open cases, notices, performance metrics and the issues nobody owns yet.')]
def diagnostic_page():
    file='channel-diagnostic.html'
    facts=''.join(f'<div class="card"><h3>{a}</h3><p>{b}</p></div>' for a,b in DIAG_FACTS)
    steps=('<ol class="price-steps diag-steps" aria-label="How the diagnostic works">'
      f'<li><span class="ps-dot">1</span><strong>{"Pay and book" if PAY_URL else "Request it"}</strong><span>{"Choose your kickoff time" if PAY_URL else "Confirm scope by email"}</span></li>'
      '<li><span class="ps-dot">2</span><strong>Share the records</strong><span>Reports or permission-based access</span></li>'
      '<li class="feat"><span class="ps-dot">3</span><strong>Review</strong><span>Scott works through the channel</span></li>'
      '<li><span class="ps-dot">4</span><strong>Plan and walkthrough</strong><span>Written plan plus a call</span></li></ol>')
    channels=''.join(f'<li>{x}</li>' for x in ['Amazon.ca (Seller or Vendor Central)','Walmart.ca and WFS','Best Buy Marketplace','Costco.ca and retail vendor portals','Wayfair','Shopify'])
    body=f'''<div class="container crumbs"><a href="/">Home</a> / Channel diagnostic</div><section class="page-hero diag-hero"><div class="container"><p class="eyebrow">Channel diagnostic · CAD $750</p><h1>A clear priority plan for one marketplace channel.</h1><p class="lead">Scott reviews your listings, advertising, inventory and account health on one channel. You get a written plan showing what to fix first, the evidence behind it and who should own each action.</p>{diagnostic_buttons()}<p class="hero-note">CAD $750 plus applicable tax · Credited to your first month if you start ongoing support within 30 days</p></div></section>
    <section class="section diag-how"><div class="container"><div class="section-heading"><p class="eyebrow">How it works</p><h2>Four steps from paying to a plan you can use.</h2></div>{steps}</div></section>
    <section class="section soft"><div class="container"><div class="section-heading"><p class="eyebrow">What’s reviewed</p><h2>The four areas that decide how a channel performs.</h2><p>One marketplace, reviewed as a whole, because a listing, ad or stock problem rarely sits on its own.</p></div><div class="grid diag-grid">{facts}</div></div></section>
    <section class="section"><div class="container diag-split"><div><p class="eyebrow">What you receive</p><h2>A plan your team can work from on Monday.</h2><ul class="check-list"><li>A written priority plan: each issue, the evidence, the commercial impact, the next action and its owner</li><li>Quick fixes separated from structural work</li><li>A walkthrough call to go through the findings and answer questions</li><li>A clear recommendation on whether ongoing support makes sense, with no obligation</li></ul></div><div class="diag-card"><p class="eyebrow">Channels</p><ul class="plain-list">{channels}</ul><p class="small muted">Need more than one channel reviewed? Ask and the scope will be quoted before you pay.</p></div></div></section>
    <section class="section"><div class="container diag-split"><div><p class="eyebrow">After the diagnostic</p><h2>Most of the value comes from follow-through.</h2><p>A plan only helps if someone works through it. Ongoing support means Scott owns an agreed set of recurring channel tasks: listings, advertising, inventory follow-up and open cases. You get a weekly action log and a monthly review against the measures that matter for your products.</p><p>Start ongoing support within 30 days of the diagnostic and the $750 is credited toward your first month. The diagnostic effectively becomes part of the work.</p><a class="link" href="/services.html">Explore ongoing support <span class="arrow" aria-hidden="true">→</span></a></div><div><h3>Questions</h3>{faq([("Do I need to share my password?","No. Use the marketplace’s permission controls to add a user with the access needed, or export the reports. Access is agreed before the review starts."),("Can my own team carry out the plan?","Yes. The plan is written so your team, an agency or Scott can carry it out. Implementation is separate unless you choose ongoing support."),("Not sure the diagnostic is the right first step?","Book the free 30-minute call first. If a focused project or a different starting point fits better, Scott will say so."),("Are taxes included?","No. The price is CAD $750 plus applicable tax. Marketplace fees, advertising spend and third-party costs are not included.")])}</div></div></section>
    <section class="bottom-cta"><div class="container"><div><h2>Know what to fix first.</h2><p>One channel, reviewed properly, with a written plan and a walkthrough call.</p></div>{diagnostic_buttons(False).replace('<div class="actions">','').replace('</div>','')}</div>{proof_row()}</section>'''
    schema=[{'@type':'Service','name':'Marketplace channel diagnostic','serviceType':'E-commerce marketplace review','provider':{'@id':SITE+'/#organization'},'areaServed':['CA','US'],'url':url(file),'description':'A review of one marketplace channel covering listings, advertising, inventory and account health, delivered as a written priority plan with a walkthrough call.','offers':{'@type':'Offer','price':'750','priceCurrency':'CAD','url':url(file)}}]
    base(file,'Marketplace Channel Diagnostic, CAD $750 | Simple Consulting','A CAD $750 review of one Amazon, Walmart, Best Buy or Costco channel: listings, advertising, inventory and account health, with a written priority plan.',body,schema)

def diagnostic_confirmed():
    file='diagnostic-confirmed.html'
    body=f'''<section class="page-hero confirmed-hero"><div class="container"><p class="eyebrow">Payment received</p><h1>Thank you. Let’s book your kickoff.</h1><p class="lead">Your channel diagnostic is confirmed. Pick a time for a short kickoff call. We will agree on the channel, the records to share and the timing of your written plan.</p><div class="actions"><a class="btn" data-event="diagnostic_kickoff_click" href="{E(KICKOFF_URL)}" target="_blank" rel="noopener noreferrer">Choose a kickoff time ↗</a><a class="btn secondary" href="mailto:scott@simpleconsulting.ca">Email Scott</a></div><p class="hero-note">A receipt is on its way from Stripe. Questions? Reply to it or email scott@simpleconsulting.ca.</p></div></section>
    <section class="section"><div class="container"><h2>Before the kickoff</h2><ul class="check-list"><li>Decide which channel you want reviewed first</li><li>Note the two or three issues that worry you most</li><li>Check who on your team can add a user through the marketplace’s permission settings. No passwords needed.</li></ul></div></section>'''
    base(file,'Diagnostic Confirmed | Simple Consulting','Your Simple Consulting channel diagnostic is confirmed. Book your kickoff call.',body,robots='noindex,nofollow')

PACKAGES=[
  {'id':'walmart-launch','page':'walmart-management.html','service':'walmart','name':'Walmart.ca Marketplace launch','for':'Brands approved for, or applying to, Walmart Marketplace in Canada.',
   'includes':['Seller and catalogue readiness review','Item setup and data corrections for the agreed SKUs','WFS or seller-fulfilled decision, and first inbound coordination','Launch tracker with owners and open issues','Post-launch review of the first weeks of sales, ads and stock']},
  {'id':'bestbuy-onboarding','page':'best-buy-marketplace-consultant-canada.html','service':'other','name':'Best Buy Marketplace onboarding','for':'Brands and sellers launching on Best Buy Canada Marketplace.',
   'includes':['Account and onboarding requirements checklist','Catalogue preparation: identifiers, attributes, images and pricing','Inventory feed, order, shipping and returns responsibilities defined','Integration or 3PL handoffs documented','Launch tracker and post-launch issue review']},
  {'id':'retail-vendor','page':'retail-marketplace-vendor-onboarding-canada.html','service':'other','name':'Costco.ca and retail vendor onboarding','for':'Vendors setting up with Costco.ca, Wayfair, Home Depot or similar retail portals.',
   'includes':['Vendor requirements and document checklist','Item data and portal setup for the agreed assortment','Routing, labelling and compliance requirements mapped','Chargeback and exception risks flagged before first orders','Handover checklist for your team']},
  {'id':'amazon-launch','page':'amazon-management.html','service':'amazon','name':'Amazon.ca launch','for':'Brands launching new products, or launching for the first time, on Amazon.ca.',
   'includes':['Account model and launch-readiness review','Listing build or clean-up for the agreed ASINs','FBA inbound plan and first shipment coordination','Launch advertising structure and budget guardrails','Post-launch review of sales, search terms and stock']}]
def package_card(p,link_page=False):
    inc=''.join(f'<li>{E(x)}</li>' for x in p['includes'])
    more=f'<a class="link" href="/{p["page"]}">About this service <span class="arrow" aria-hidden="true">→</span></a>' if link_page else ''
    return f'''<article class="package-card" id="{p['id']}"><p class="eyebrow">Fixed-scope project</p><h3>{E(p['name'])}</h3><p class="muted">{E(p['for'])}</p><ul class="check-list">{inc}</ul><p class="package-price">Fixed project fee, agreed before work starts</p><div class="package-actions"><a class="btn" data-event="package_click" href="/booking.html?service={p['service']}&amp;package={p['id']}#start">Discuss this package</a>{more}</div></article>'''
def packages_section(page=None):
    items=[p for p in PACKAGES if page is None or p['page']==page]
    if not items: return ''
    head=('<div class="section-heading"><p class="eyebrow">Fixed-scope packages</p><h2>Launching on a new channel? Start with a defined project.</h2><p>Clear deliverables and one agreed fee, so you know what you are getting before work begins. Not sure which fits? <a href="/channel-diagnostic.html">Start with the diagnostic</a>.</p></div>' if page is None
          else '<div class="section-heading"><p class="eyebrow">Fixed-scope package</p><h2>Prefer a defined project?</h2></div>')
    cls='package-grid' if page is None else 'package-grid single'
    return f'<section class="section packages" id="packages"><div class="container">{head}<div class="{cls}">'+''.join(package_card(p,page is None) for p in items)+'</div></div></section>'

QUALIFY = ('<fieldset class="qualify"><legend>About your business <span class="muted">(optional, helps me prepare)</span></legend>'
  '<p class="qualify-label" id="sells-label">Where do you sell today?</p><div class="chips" role="group" aria-labelledby="sells-label">'
  + ''.join(f'<label class="chip"><input type="checkbox" name="sells" value="{v}"><span>{v}</span></label>' for v in ['Amazon','Walmart','Best Buy','Costco','Wayfair','Shopify / own site','Not selling online yet'])
  + '</div><div class="form-row"><div class="field"><label for="sales_band">Monthly online sales</label><select id="sales_band" name="sales_band"><option value="">Prefer not to say</option><option value="pre">Not selling yet</option><option value="lt10k">Under $10k</option><option value="10-50k">$10k–$50k</option><option value="50-250k">$50k–$250k</option><option value="250k+">Over $250k</option></select></div>'
  '<div class="field"><label for="timeline">When would you like to start?</label><select id="timeline" name="timeline"><option value="">Not sure yet</option><option value="asap">As soon as possible</option><option value="1m">Within a month</option><option value="1-3m">In 1–3 months</option><option value="exploring">Just exploring</option></select></div></div></fieldset>')

RESULTS_TOOLS={'marketplace-launch-margin-calculator.html':('launch_margin','discuss-margin','this scenario'),'amazon-fba-vs-walmart-wfs-calculator.html':('fba_wfs','discuss-fba-wfs','these results'),'marketplace-reimbursement-checklist.html':('reimbursement_checklist','discuss-reimbursement','this checklist'),'amazon-canada-launch-readiness.html':('amazon_readiness','discuss-amazon-readiness','this summary')}
def results_panel(tool,what):
    endpoint=CONTACT['worker_endpoint'].rsplit('/',1)[0]+'/results'
    return f'''<form class="results-email" data-tool="{tool}" data-endpoint="{E(endpoint)}" data-sitekey="{E(CONTACT['turnstile_sitekey'])}" novalidate><p class="re-title">Email me {what}</p><p class="re-sub">A copy for your files, with suggested next steps.</p><div class="re-row"><label class="visually-hidden" for="re-email-{tool}">Email address</label><input type="email" id="re-email-{tool}" name="email" autocomplete="email" placeholder="you@company.com" required maxlength="254"><button class="btn" type="submit">Send</button></div><div class="hp" aria-hidden="true"><input type="text" name="_gotcha" tabindex="-1" autocomplete="off"></div><label class="re-tips"><input type="checkbox" name="tips"> Also send me up to four short, practical marketplace emails. Unsubscribe anytime.</label><div class="re-verify"></div><p class="status" role="status" aria-live="polite"></p><p class="small muted">Only your email and these results are sent. <a href="/privacy.html">Privacy</a></p></form>'''

RESULTS=[('$700K → $3M+','Grew an established brand’s sales more than fourfold in one year.','Amazon Seller Central (US & CA) · Amazon Vendor Central (US & CA) · Costco.ca · Wayfair Canada & US · Walmart.ca'),
         ('$20K → $6M','Grew a brand from $20K to $6M in sales in one year.','Walmart.ca · Walmart.com · BestBuy.ca · Shopify · Amazon FBA Canada · Lowe’s Canada & US · Overstock · Groupon · Loblaws'),
         ('$0 → $2M','Took a newly started company to $2M in sales in 18 months.','Amazon Seller Central Canada · BestBuy.ca · Shopify · Groupon')]
RESULTS_SCOPE='For the three brands above, I handled the full scope myself: listing creation and optimization, SEO and GEO, and advertising campaigns.'
RESULTS_NOTE='Client names are withheld under confidentiality agreements. These results reflect those businesses; yours will depend on your products, market and starting point.'
RESULTS_EXTRA=('eBay recovery channel for a retail chain','Launched an eBay auction store to sell discontinued and aging inventory and customer returns, and built the inventory, electronics data-wipe and sales-processing workflows behind it.')
RESULTS_EBAY=[('200K+','items sold in 3 years'),('99.7%','positive feedback'),('24K','followers')]
def results_block(heading_tag='h2',compact=False):
    cards=''.join(f'<div class="result-card"><p class="result-num">{E(a)}</p><p class="result-txt">{E(b)}</p><p class="result-channels">{E(c)}</p></div>' for a,b,c in RESULTS)
    stats=''.join(f'<li><strong>{E(a)}</strong>{E(b)}</li>' for a,b in RESULTS_EBAY)
    extra=f'<div class="result-card result-wide"><div><p class="result-num result-num-sm">{E(RESULTS_EXTRA[0])}</p><p class="result-txt">{E(RESULTS_EXTRA[1])}</p></div><ul class="result-stats">{stats}</ul></div>'
    return f'<div class="results-grid">{cards}{extra}</div><p class="results-scope">{E(RESULTS_SCOPE)}</p><p class="results-note">{E(RESULTS_NOTE)}</p>'
def results_section():
    return f'<section class="section results-section" id="results" aria-labelledby="results-title"><div class="container"><div class="section-heading"><p class="eyebrow">Results</p><h2 id="results-title">Brands I’ve helped grow.</h2></div>{results_block()}</div></section>'

def growth_overlay(file,text):
    # Diagnostic links from existing pricing steps.
    text=text.replace('<a class="btn" href="/booking.html?service=general#start">Ask about a diagnostic</a>','<a class="btn" data-event="diagnostic_page_click" href="/channel-diagnostic.html">See what’s included</a>')
    text=text.replace('<li class="feat"><span class="ps-dot">2</span><strong>CAD $750 diagnostic</strong><span>Credited to month one if you continue</span></li>','<li class="feat"><span class="ps-dot">2</span><strong><a href="/channel-diagnostic.html">CAD $750 diagnostic</a></strong><span>Credited to month one if you continue</span></li>')
    text=text.replace('<h3>Ongoing management</h3><p class="start-price">Quoted</p><p>Recurring account work with agreed responsibilities, a review cadence and clear reporting. Scoped and priced after the diagnostic.</p>','<h3>Ongoing management</h3><p class="start-price">Monthly, quoted</p><p>Scott owns an agreed set of recurring channel tasks, with a weekly action log and a monthly review. Scoped and priced after the diagnostic.</p>')
    if file=='selected-work.html':
        k=text.index('</section>',text.index('<section class="page-hero">'))+len('</section>')
        text=text[:k]+results_section()+text[k:]
        text=text.replace('Client names, confidential figures and identifying details are omitted.','Client names and identifying details are omitted under confidentiality agreements.')
    if file=='channel-diagnostic.html':
        k=text.rfind('<section class="bottom-cta">')
        text=text[:k]+results_section()+text[k:]
    # Proof under every closing call to action.
    if '<section class="bottom-cta">' in text and 'proof-row' not in text:
        i=text.rfind('<section class="bottom-cta">');j=text.index('</section>',i)
        text=text[:j]+proof_row()+text[j:]
    # Packages on matching service pages and the services hub.
    if file=='services.html':
        text=_once(text,'<section class="bottom-cta">',packages_section()+'<section class="bottom-cta">',file)
    elif any(p['page']==file for p in PACKAGES):
        k=text.rfind('<section class="bottom-cta">')
        text=text[:k]+packages_section(file)+text[k:]
    # Qualifying questions on every enquiry form.
    text=text.replace('<div class="field"><label for="message">Your message</label>',QUALIFY+'<div class="field"><label for="message">Your message</label>')
    # Email-me-results on the free tools.
    if RESULTS_EMAIL and file in RESULTS_TOOLS:
        tool,btn,what=RESULTS_TOOLS[file]
        m=re.search(r'<a class="btn secondary" id="'+btn+r'"[^>]*>[^<]*</a>',text)
        text=text[:m.end()]+results_panel(tool,what)+text[m.end():]
        text=text.replace('</head>','<script src="/assets/results-email.js" defer></script></head>',1)
    return text

# ---------------------------------------------------------------------------
# Free store check (lead magnet) and Store & listing rebuild service.
# ---------------------------------------------------------------------------
SC_CHECKS=[('Speed &amp; mobile','How fast the page loads on a phone, layout shifts, and oversized images that slow shoppers down.'),
  ('First impression','Whether a visitor can tell what you sell, why it is better and what to click within a few seconds.'),
  ('Product pages','Titles, images, descriptions, variants and price clarity: the details that decide add-to-cart.'),
  ('Trust','Reviews, shipping costs, return policy and contact details, and whether shoppers can find them before checkout.'),
  ('Search basics','Page titles, descriptions, headings and product data that Google and AI search read.'),
  ('Marketplace listings','Amazon, Walmart and Best Buy titles, bullets, description, images and reviews, checked against each marketplace’s rules, with a rewritten title and bullets.')]
SC_EXAMPLE=[('high','Trust','Shipping cost and return policy only appear at checkout.','Show both under the price and in a short policy block on every product page.'),
  ('high','Product pages','Product titles are brand names only, with no product type or key spec.','Lead with what it is, then the main benefit and size, e.g. “Organic Cotton Crib Sheet, 28×52”.'),
  ('med','Speed &amp; mobile','Homepage images total 9.4 MB and take about 6 seconds to appear on mobile.','Compress and resize hero images; lazy-load images below the fold.'),
  ('med','First impression','The homepage headline is a slogan and the first button says “Explore”.','Say what you sell and who it is for; make the first button go to best sellers.'),
  ('low','Search basics','Product pages share one generic meta description.','Write a short unique description for your top 20 products.')]
SC_LADDER=[('Free store check','Free · emailed in minutes','A scored report of what is costing you sales, with the fix for each issue.','/store-check.html'),
  ('Channel diagnostic','CAD $750','Scott reviews one marketplace channel in depth and writes your priority plan.','/channel-diagnostic.html'),
  ('Store &amp; listing rebuild','Fixed project fee','The issues fixed: pages, product copy, trust and search basics, checked against the same scorecard.','/store-check.html#rebuild'),
  ('Ongoing management','Monthly, quoted','Scott owns the recurring work across your store and marketplaces.','/services.html')]
SC_REBUILD=['Homepage hero and key landing pages rewritten around what shoppers need to decide','Product titles, bullets and descriptions for the agreed products, on your store and your marketplace listings','Shipping, returns and review blocks added where shoppers look for them','Search basics fixed: page titles, descriptions, headings and product data','A before-and-after check on the same scorecard, so you can see what changed']
SC_FAQ=[("Is the store check really free?","Yes. It costs nothing and there is no obligation. If the report shows issues worth fixing, you can fix them yourself or ask about a rebuild."),
  ("Do you need access to my store?","No. The check reads the same public pages your customers see. No logins, passwords or app installs."),
  ("Will I be added to a mailing list?","No. You get your report, and Scott may follow up once about the findings. Every email includes a way to opt out."),
  ("Does it check Amazon, Walmart or Best Buy listings?","Yes. Choose “My marketplace listing” and paste the title, bullets and description. Marketplaces block automated tools from reading listings, so pasting is the reliable way. A full account review, with advertising and inventory, is part of the channel diagnostic.")]
def store_check_form(idx='hero'):
    endpoint=CONTACT['worker_endpoint'].rsplit('/',1)[0]+'/store-check'
    mps=''.join(f'<label class="sc-mp"><input type="radio" name="marketplace" value="{v}"{" checked" if v=="amazon" else ""}><span>{n}</span></label>' for v,n in [('amazon','Amazon'),('walmart','Walmart'),('bestbuy','Best Buy')])
    return (f'<form class="sc-form" data-endpoint="{E(endpoint)}" data-sitekey="{E(CONTACT["turnstile_sitekey"])}" novalidate>'
      '<div class="sc-tabs" role="tablist" aria-label="What to check"><button type="button" role="tab" class="sc-tab" id="sc-tab-site" aria-controls="sc-panel-site" aria-selected="true" data-mode="site">My website</button><button type="button" role="tab" class="sc-tab" id="sc-tab-listing" aria-controls="sc-panel-listing" aria-selected="false" data-mode="listing" tabindex="-1">My marketplace listing</button></div>'
      f'<div class="sc-panel" id="sc-panel-site" role="tabpanel" aria-labelledby="sc-tab-site"><div class="sc-field"><label for="sc-url-{idx}">Store or product page</label><input id="sc-url-{idx}" name="url" type="text" inputmode="url" autocomplete="url" placeholder="https://yourstore.com" maxlength="500"></div></div>'
      f'<div class="sc-panel" id="sc-panel-listing" role="tabpanel" aria-labelledby="sc-tab-listing" hidden><fieldset class="sc-mps"><legend>Marketplace</legend>{mps}</fieldset>'
      f'<div class="sc-field"><label for="sc-title-{idx}">Listing title</label><input id="sc-title-{idx}" name="title" type="text" maxlength="600" placeholder="Paste the product title"></div>'
      f'<div class="sc-field"><label for="sc-bullets-{idx}">Bullet points <span class="muted">(one per line)</span></label><textarea id="sc-bullets-{idx}" name="bullets" rows="5" maxlength="6000" placeholder="Paste the key features or bullet points"></textarea></div>'
      f'<div class="sc-field"><label for="sc-desc-{idx}">Description <span class="muted">(optional)</span></label><textarea id="sc-desc-{idx}" name="description" rows="3" maxlength="8000"></textarea></div>'
      f'<div class="sc-nums"><div class="sc-field"><label for="sc-img-{idx}">Number of images</label><input id="sc-img-{idx}" name="images" type="number" min="0" max="30" inputmode="numeric"></div><div class="sc-field"><label for="sc-rate-{idx}">Star rating</label><input id="sc-rate-{idx}" name="rating" type="number" min="1" max="5" step="0.1" inputmode="decimal" placeholder="e.g. 4.3"></div><div class="sc-field"><label for="sc-rev-{idx}">Number of reviews</label><input id="sc-rev-{idx}" name="reviews" type="number" min="0" inputmode="numeric"></div></div>'
      '<p class="small muted sc-why">Marketplaces block automated tools from reading listings, so paste yours in. It takes a minute.</p></div>'
      f'<div class="sc-fields"><div class="sc-field"><label for="sc-email-{idx}">Email for the report</label><input id="sc-email-{idx}" name="email" type="email" autocomplete="email" placeholder="you@company.com" required maxlength="254"></div><button class="btn" type="submit" data-event="store_check_submit">Check my store</button></div>'
      '<div class="hp" aria-hidden="true"><input type="text" name="_gotcha" tabindex="-1" autocomplete="off"></div>'
      '<label class="sc-consent"><input type="checkbox" name="consent"> Email me the report. Scott may follow up once about the findings. You can opt out anytime.</label>'
      '<div class="sc-verify"></div><p class="status" role="status" aria-live="polite"></p></form><div class="sc-result" id="sc-result" hidden tabindex="-1"></div>')
def store_check_report():
    sev={'high':'High impact','med':'Medium','low':'Low'}
    rows=''.join(f'<li class="sc-issue {s}"><span class="sc-sev">{sev[s]} · {a}</span><p>{f}</p><p class="sc-fix"><strong>Fix:</strong> {x}</p></li>' for s,a,f,x in SC_EXAMPLE)
    bars=''.join(f'<li class="{"good" if v>=75 else "mid" if v>=50 else "low"}"><span>{n}</span><i style="--v:{v}%"></i><b>{v}</b></li>' for n,v in [('Speed &amp; mobile',52),('First impression',61),('Product pages',44),('Trust',38),('Search basics',70)])
    return ('<div class="sc-report" aria-label="Example store check report"><div class="sc-report-head"><div><p class="eyebrow">Example report</p><h3>Sample home goods store</h3><p class="small muted">Illustrates the format. Not a client.</p></div>'
      f'<div class="sc-score" aria-label="Overall score 54 out of 100"><b>54</b><span>/100</span></div></div><ul class="sc-bars">{bars}</ul><ol class="sc-issues">{rows}</ol></div>')
def store_check_ladder():
    items=''.join(('<li class="feat">' if i==0 else '<li>')+f'<span class="ps-dot">{i+1}</span><strong><a href="{h}">{n}</a></strong><span class="sc-price">{p}</span><span>{d}</span></li>' for i,(n,p,d,h) in enumerate(SC_LADDER))
    return f'<ol class="sc-ladder" aria-label="How the services connect">{items}</ol>'
def store_check_page():
    file='store-check.html'
    checks=''.join(f'<div class="card"><h3>{a}</h3><p>{b}</p></div>' for a,b in SC_CHECKS)
    inc=''.join(f'<li>{x}</li>' for x in SC_REBUILD)
    body=('<div class="container crumbs"><a href="/">Home</a> / Free store check</div>'
      '<section class="page-hero sc-hero" id="top-form"><div class="container"><p class="eyebrow">Free store check</p><h1>See what’s costing your store sales.</h1><p class="lead">Check your online store or a marketplace listing. You get a scored report of the problems shoppers run into, ranked by impact, with the fix for each one.</p>'
      + store_check_form() + '<p class="hero-note">Free · Results in about a minute, plus a copy by email · No logins or access needed</p></div></section>'
      '<section class="section"><div class="container sc-split"><div><p class="eyebrow">What you get</p><h2>A short report you can act on this week.</h2><p>Every issue comes with the evidence and a specific fix, sorted so the changes most likely to lift sales come first. Fix them yourself, hand them to your developer, or have Scott rebuild the pages for you.</p><ul class="check-list"><li>An overall score and a score for each area</li><li>The issues, ranked high, medium and low impact</li><li>A plain-English fix for every issue</li><li>For listings, a rewritten title and bullet points</li></ul></div>'
      + store_check_report() + '</div></section>'
      '<section class="section soft"><div class="container"><div class="section-heading"><p class="eyebrow">What’s checked</p><h2>Six areas that decide whether a visitor buys.</h2></div><div class="grid sc-grid">' + checks + '</div><p class="small muted" style="margin-top:22px">Want the whole account reviewed, including advertising, inventory and account health? That’s the <a href="/channel-diagnostic.html">channel diagnostic</a>.</p></div></section>'
      '<section class="section"><div class="container"><div class="section-heading"><p class="eyebrow">Where it goes from here</p><h2>Start free. Go further only if it makes sense.</h2></div>' + store_check_ladder() + '</div></section>'
      '<section class="section soft" id="rebuild"><div class="container diag-split"><div><p class="eyebrow">Store &amp; listing rebuild</p><h2>Want the fixes done for you?</h2><p>Scott takes the issues from your store check or diagnostic and fixes them across your store and marketplace listings. The scope is agreed up front, then everything is re-checked on the same scorecard, so you can see what changed.</p><ul class="check-list">' + inc + '</ul></div>'
      '<div class="diag-card"><p class="eyebrow">Fixed-scope project</p><h3>Store &amp; listing rebuild</h3><p class="package-price">Fixed project fee, agreed before work starts</p><p class="small muted">Scoped from your store check, so you know exactly which pages and products are included.</p><div class="actions"><a class="btn" data-event="package_click" href="/booking.html?service=shopify&amp;package=store-rebuild#start">Discuss a rebuild</a><a class="btn secondary" href="#top-form">Run the free check first</a></div></div></div></section>'
      '<section class="section"><div class="container diag-split"><div><p class="eyebrow">Questions</p><h2>Before you run it.</h2></div><div>' + faq(SC_FAQ) + '</div></div></section>'
      '<section class="bottom-cta"><div class="container"><div><h2>Rather talk it through?</h2><p>Bring your store to a free 30-minute call. We will go through what’s holding it back and a practical next step.</p></div><a class="btn" data-event="review_click" href="/booking.html#booking">Book a free call</a></div></section>')
    schema=[{'@type':'Service','name':'Free store check','serviceType':'E-commerce website audit','provider':{'@id':SITE+'/#organization'},'areaServed':['CA','US'],'url':url(file),'description':'A free, automated check of an online store or Amazon, Walmart or Best Buy listing, delivered as a scored report with fixes.','offers':{'@type':'Offer','price':'0','priceCurrency':'CAD','url':url(file)}},
            {'@type':'Service','name':'Store and listing rebuild','serviceType':'E-commerce store and listing optimization','provider':{'@id':SITE+'/#organization'},'areaServed':['CA','US'],'url':url(file)+'#rebuild'}]
    base(file,'Free Store Check: Find What’s Costing You Sales | Simple Consulting','Get a free scored report on your online store or Amazon, Walmart or Best Buy listing, with a specific fix for every issue.',body,schema,scripts='<script src="/assets/store-check.js" defer></script>')
STORE_BAND=('<section class="sc-band" id="store-check" aria-labelledby="sc-band-title"><div class="wrap sc-band-row reveal"><div class="sc-band-copy"><p class="label">Free store check</p><h2 id="sc-band-title">Find out what’s costing your store sales.</h2><p>Check your store or an Amazon, Walmart or Best Buy listing. Get a scored report with the fix for each issue. Free, in about a minute.</p></div>'
  '<form class="sc-band-form" action="/store-check.html" method="get"><label class="sr-only" for="sc-band-url">Your store or product page</label><div class="sc-band-input"><input id="sc-band-url" name="url" type="url" inputmode="url" placeholder="https://yourstore.com" required><button class="btn light" type="submit" data-event="store_check_start">Check my store <span aria-hidden="true">→</span></button></div><p class="sc-band-note">No logins or access needed. Selling on Amazon, Walmart or Best Buy? <a href="/store-check.html?mode=listing">Check a listing →</a></p></form></div></section>')
STORE_SERVICE=('<details class="service"><summary><span class="service-name"><span class="service-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16M6 16l3-3 3 3 6-6M15 10h3v3"/></svg></span>Store &amp; listing rebuild</span><span class="plus" aria-hidden="true">+</span></summary><div class="service-content"><p>Fix what’s costing you sales across your store and marketplace listings: pages, product copy, trust and search basics. Start with the free store check.</p><a class="link" href="/store-check.html">Run a free store check <span aria-hidden="true">→</span></a></div></details>')

if __name__=='__main__':
    home();service_pages();locale_redirects();commercial_pages();specialty_service_pages();wfs_consultant_page();retail_service_pages();selected_work();assessment_landing();calculator_page();growth_tools();tools_page();services_hub();about();booking();diagnostic_page();diagnostic_confirmed();store_check_page();privacy();blog();topic_pages();sitemap();not_found()
    print('Generated',len(CORE),'core pages and',len(POSTS),'articles; existing legacy URLs redirect to their canonical articles.')
