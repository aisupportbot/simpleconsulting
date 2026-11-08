import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker from './index.mjs';
import {safeUrl, analyseHtml, siteRules, listingRules, buildReport, reportEmail} from './store-check.mjs';

const env = {RESEND_API_KEY: 'k', TURNSTILE_SECRET_KEY: 's', FROM_EMAIL: 'Simple Consulting <hello@notify.simpleconsulting.ca>', TO_EMAIL: 'scott@simpleconsulting.ca'};
const base = {email: 'owner@shop.example.ca', consent: true, turnstileToken: 't', submissionId: 'bd7608e8-2b96-425c-9d87-e126c7c6aff1', source_page: '/store-check.html', _gotcha: ''};
const req = body => new Request('https://w.example/store-check', {method: 'POST', headers: {Origin: 'https://www.simpleconsulting.ca', 'Content-Type': 'application/json'}, body: JSON.stringify({...base, ...body})});
const WEAK = '<html><head><title>Home</title></head><body><h1>Welcome</h1><img src="a.jpg"><img src="b.jpg"><a href="/collections/all">Explore</a></body></html>';
const GOOD = `<html><head><title>Organic Cotton Baby Sheets | Nestly</title><meta name="description" content="Soft organic cotton crib sheets made in Canada."><meta name="viewport" content="width=device-width"><meta property="og:image" content="x.jpg"><link rel="canonical" href="https://nestly.ca/"><script type="application/ld+json">{"@type":"Product","aggregateRating":{"ratingValue":4.8}}</script></head><body><h1>Organic crib sheets that stay soft</h1>${'<p>Soft breathable organic cotton for better sleep. </p>'.repeat(30)}<img src="a.jpg" alt="Crib sheet"><a href="/collections/best-sellers">Shop best sellers</a><a href="/policies/shipping-policy">Shipping</a><a href="/policies/refund-policy">Returns</a><a href="/pages/contact">Contact</a><a href="https://www.amazon.ca/stores/nestly">Amazon</a><div class="jdgm-widget">judge.me 120 reviews</div></body></html>`;

test('marketplace links are recognised', async () => {
  const {marketplaceOf} = await import('./store-check.mjs');
  assert.equal(marketplaceOf('www.amazon.ca'), 'amazon'); assert.equal(marketplaceOf('amzn.to'), 'amazon');
  assert.equal(marketplaceOf('walmart.ca'), 'walmart'); assert.equal(marketplaceOf('www.bestbuy.ca'), 'bestbuy');
  assert.equal(marketplaceOf('notamazon.ca'), null); assert.equal(marketplaceOf('shop.ca'), null);
});

test('safeUrl blocks internal and odd addresses', () => {
  assert.equal(safeUrl('localhost'), null);
  assert.equal(safeUrl('http://127.0.0.1/admin'), null);
  assert.equal(safeUrl('http://10.0.0.5'), null);
  assert.equal(safeUrl('https://shop.internal'), null);
  assert.equal(safeUrl('https://user:pw@shop.com'), null);
  assert.equal(safeUrl('https://shop.com:8080'), null);
  assert.equal(safeUrl('ftp://shop.com'), null);
  assert.equal(safeUrl('yourstore.com').href, 'https://yourstore.com/');
});

test('rules separate a weak store from a strong one', () => {
  const weak = siteRules(analyseHtml(WEAK, 'https://weak.ca/', WEAK.length), null);
  const good = siteRules(analyseHtml(GOOD, 'https://nestly.ca/', GOOD.length), {score: 91, lcp: 1800, cls: 0.01});
  const avg = s => Object.values(s.scores).reduce((a, b) => a + b, 0) / 5;
  assert.ok(avg(good) > 85, 'good store scores high: ' + avg(good));
  assert.ok(avg(weak) < 65, 'weak store scores low: ' + avg(weak));
  assert.ok(weak.issues.some(i => i.area === 'Trust' && i.sev === 'high'));
  assert.ok(!good.issues.some(i => i.sev === 'high'));
});

test('listing rules apply marketplace limits', () => {
  const r = listingRules({marketplace: 'walmart', title: 'BEST SELLER!!! Crib Sheet Crib Sheet Crib Sheet Organic Cotton Soft Fitted Baby Toddler Mattress Cover Free Shipping Deal', bullets: ['Soft'], description: 'Nice sheet.', images: 2, rating: 3.8, reviews: 4});
  assert.ok(r.issues.length >= 6);
  assert.ok(r.scores.Title < 50);
  const unknown = listingRules({marketplace: 'amazon', title: 'Nestly Organic Cotton Fitted Crib Sheet, 28 x 52 in, Breathable and Soft, 2 Pack', bullets: Array(5).fill('Breathable organic cotton keeps baby cool all night, certified GOTS and machine washable'), description: 'word '.repeat(200), images: null, rating: null, reviews: null});
  assert.equal(unknown.scores.Images, null);
  const rep = buildReport('listing', 'Amazon listing', unknown, null);
  assert.ok(rep.score >= 90, 'score ignores unknown areas: ' + rep.score);
});

test('report email escapes content and carries sender identification', () => {
  const rules = siteRules(analyseHtml(WEAK.replace('Welcome', '<script>x</script>Welcome'), 'https://weak.ca/', 100), null);
  const r = buildReport('site', 'weak.ca <b>', rules, null);
  const e = reportEmail(r, {MAILING_ADDRESS: '123 Example St, Toronto ON'});
  assert.ok(!e.html.includes('<b>'));
  assert.ok(e.html.includes('17700679 Canada Inc.') && e.html.includes('123 Example St'));
  assert.ok(e.text.includes('Overall score'));
});

test('handler: validates, verifies, checks the site, emails visitor and Scott', async () => {
  const original = globalThis.fetch; const calls = [];
  globalThis.fetch = async (url, o) => {
    calls.push({url: String(url), o});
    if (String(url).includes('siteverify')) return Response.json({success: true, hostname: 'www.simpleconsulting.ca', action: 'store_check'});
    if (String(url).includes('pagespeedonline')) return Response.json({lighthouseResult: {categories: {performance: {score: 0.42}}, audits: {'largest-contentful-paint': {numericValue: 6100}}}});
    if (String(url).includes('api.resend.com')) return Response.json({data: [{id: 'a'}, {id: 'b'}]});
    if (String(url).includes('api.anthropic.com')) return Response.json({content: [{type: 'text', text: '{"summary":"Your shoppers cannot see shipping.","issues":[{"sev":"high","area":"First impression","finding":"Headline says Welcome.","fix":"Say what you sell."}],"rewrite":{"label":"New homepage headline","before":"Welcome","after":"Organic baby sheets, made in Canada","note":"Names the product."}}'}]});
    return new Response(WEAK, {headers: {'Content-Type': 'text/html; charset=utf-8'}});
  };
  try {
    assert.equal((await worker.fetch(req({mode: 'site', url: 'http://127.0.0.1'}), env)).status, 422);
    const mpRes = await worker.fetch(req({mode: 'site', url: 'https://www.amazon.ca/dp/B0TEST'}), env);
    assert.equal(mpRes.status, 422); assert.equal((await mpRes.json()).marketplace, 'amazon');
    assert.equal((await worker.fetch(req({mode: 'site', url: 'weak.ca', consent: false}), env)).status, 422);
    assert.equal(calls.length, 0);
    const res = await worker.fetch(req({mode: 'site', url: 'weak.ca'}), env);
    assert.equal(res.status, 200);
    const out = await res.json();
    assert.equal(out.ok, true); assert.equal(out.emailed, true);
    assert.equal(out.report.areas['Speed & mobile'], 40);
    assert.equal(out.report.ai, false);
    const sent = JSON.parse(calls.find(c => c.url.includes('resend')).o.body);
    assert.deepEqual(sent[0].to, ['owner@shop.example.ca']); assert.deepEqual(sent[1].to, ['scott@simpleconsulting.ca']);
    assert.ok(sent[1].text.includes('Follow-up consent: yes'));
    // With an API key, Claude's judgement calls and rewrite are merged in.
    const res2 = await worker.fetch(req({mode: 'site', url: 'weak.ca', submissionId: 'cd7608e8-2b96-425c-9d87-e126c7c6aff2'}), {...env, ANTHROPIC_API_KEY: 'x'});
    const out2 = await res2.json();
    assert.equal(out2.report.ai, true);
    assert.equal(out2.report.rewrite.after, 'Organic baby sheets, made in Canada');
    assert.ok(out2.report.issues.some(i => i.finding === 'Headline says Welcome.'));
    // Listing mode never fetches a page.
    const before = calls.filter(c => !/siteverify|resend|anthropic|pagespeed/.test(c.url)).length;
    const res3 = await worker.fetch(req({mode: 'listing', marketplace: 'amazon', title: 'Crib Sheet', bullets: 'Soft\nCotton', description: '', images: '3', rating: '4.1', reviews: '9', submissionId: 'dd7608e8-2b96-425c-9d87-e126c7c6aff3'}), env);
    assert.equal(res3.status, 200);
    assert.equal(calls.filter(c => !/siteverify|resend|anthropic|pagespeed/.test(c.url)).length, before);
    assert.equal((await worker.fetch(req({mode: 'listing', marketplace: 'etsy', title: 'x'}), env)).status, 422);
  } finally { globalThis.fetch = original; }
});
