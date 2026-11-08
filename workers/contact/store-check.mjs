import {escapeHtml} from './email.mjs';

// Free store check. Two modes:
//  - site:    fetch a public store page, run rule-based checks (+ Google PageSpeed),
//             optionally ask Claude for judgement calls a rule can't make.
//  - listing: the visitor pastes a marketplace listing (Amazon, Walmart, Best Buy),
//             because those sites block automated reading. Rules + optional Claude rewrite.
// The visitor asked for the report, so it is a requested email. They also tick a box
// allowing one follow-up from Scott (express consent under CASL).

const SITE = 'https://www.simpleconsulting.ca';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s<>(),;:"\\]+@[^\s<>(),;:"\\]+\.[^\s<>(),;:"\\]+$/;
export const AREAS = ['Speed & mobile', 'First impression', 'Product pages', 'Trust', 'Search basics'];
export const LISTING_AREAS = ['Title', 'Bullets', 'Description', 'Images', 'Reviews'];
export const MARKETPLACES = {
  amazon: {name: 'Amazon', titleMax: 200, titleIdeal: [80, 150], bullets: [5, 5], images: 7, descWords: 150},
  walmart: {name: 'Walmart', titleMax: 90, titleIdeal: [50, 75], bullets: [3, 10], images: 4, descWords: 150},
  bestbuy: {name: 'Best Buy', titleMax: 150, titleIdeal: [40, 100], bullets: [3, 8], images: 4, descWords: 100}
};
const SEV_ORDER = {high: 0, med: 1, low: 2};
const issue = (sev, area, finding, fix) => ({sev, area, finding, fix});

// ---------- site mode: fetching ----------
export function safeUrl(raw) {
  let u;
  try { u = new URL(/^https?:\/\//i.test(raw) ? raw : 'https://' + raw); } catch { return null; }
  if (!/^https?:$/.test(u.protocol) || u.username || u.password) return null;
  const h = u.hostname.toLowerCase();
  if (!h.includes('.') || h === 'localhost' || /\.(local|internal|localhost|test|example|invalid|lan|home)$/.test(h)) return null;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(h) || h.includes(':') || h.startsWith('[')) return null; // no raw IPs
  if (u.port && !['80', '443'].includes(u.port)) return null;
  u.hash = '';
  return u;
}

async function fetchPage(u) {
  const res = await fetch(u.href, {redirect: 'follow', headers: {'User-Agent': 'Mozilla/5.0 (compatible; SimpleConsultingStoreCheck/1.0; +https://www.simpleconsulting.ca/store-check.html)', 'Accept': 'text/html,application/xhtml+xml'}, signal: AbortSignal.timeout(12000)});
  const type = res.headers.get('Content-Type') || '';
  if (!res.ok) return {error: `The page returned an error (${res.status}).`};
  if (!/html/i.test(type)) return {error: 'That address is not a web page.'};
  const reader = res.body.getReader(); let size = 0; const parts = [];
  while (true) { const {value, done} = await reader.read(); if (done) break; size += value.byteLength; parts.push(value); if (size > 3_000_000) { await reader.cancel(); break; } }
  const bytes = new Uint8Array(size); let o = 0; for (const p of parts) { bytes.set(p, o); o += p.byteLength; }
  return {html: new TextDecoder().decode(bytes), finalUrl: res.url || u.href, bytes: size};
}

async function pageSpeed(u, env) {
  try {
    const q = new URLSearchParams({url: u.href, strategy: 'mobile', category: 'performance'});
    if (env.PAGESPEED_API_KEY) q.set('key', env.PAGESPEED_API_KEY);
    const r = await fetch('https://www.googleapis.com/pagespeedonline/v5/runPagespeed?' + q, {signal: AbortSignal.timeout(45000)});
    if (!r.ok) return null;
    const d = await r.json(), lh = d.lighthouseResult, a = lh?.audits || {};
    const num = k => a[k]?.numericValue;
    return {score: Math.round((lh?.categories?.performance?.score ?? NaN) * 100), lcp: num('largest-contentful-paint'), cls: num('cumulative-layout-shift'), tbt: num('total-blocking-time'), weight: num('total-byte-weight')};
  } catch { return null; }
}

// ---------- site mode: analysis ----------
const decode = s => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&#x27;|&apos;/g, "'").replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n));
const attr = (tag, name) => { const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i')); return m ? decode(m[2] ?? m[3] ?? m[4] ?? '') : null; };
const meta = (html, key) => { for (const t of html.match(/<meta\b[^>]*>/gi) || []) { const n = (attr(t, 'name') || attr(t, 'property') || '').toLowerCase(); if (n === key) return attr(t, 'content'); } return null; };
export function visibleText(html) {
  return decode(html.replace(/<(script|style|noscript|svg|template)\b[\s\S]*?<\/\1>/gi, ' ').replace(/<!--[\s\S]*?-->/g, ' ').replace(/<br\s*\/?>|<\/(p|div|li|h[1-6]|section|tr)>/gi, '\n').replace(/<[^>]+>/g, ' ')).replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
}

export function analyseHtml(html, finalUrl, bytes) {
  const lower = html.toLowerCase();
  const title = decode((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').replace(/\s+/g, ' ').trim());
  const desc = (meta(html, 'description') || '').trim();
  const h1s = (html.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/gi) || []).map(h => visibleText(h)).filter(Boolean);
  const viewport = !!meta(html, 'viewport');
  const canonical = /<link\b[^>]*rel=["']?canonical/i.test(html);
  const ogImage = !!meta(html, 'og:image');
  const ld = (html.match(/<script\b[^>]*application\/ld\+json[^>]*>[\s\S]*?<\/script>/gi) || []).join(' ');
  const hasProductLd = /"@type"\s*:\s*"Product"/i.test(ld) || /"@type"\s*:\s*\[[^\]]*"Product"/i.test(ld);
  const hasRatingLd = /aggregateRating/i.test(ld);
  const hasOrgLd = /"@type"\s*:\s*"(Organization|Store|OnlineStore|LocalBusiness)"/i.test(ld);
  const imgs = html.match(/<img\b[^>]*>/gi) || [];
  const noAlt = imgs.filter(t => { const a = attr(t, 'alt'); return a === null || !a.trim(); }).length;
  const scripts = (html.match(/<script\b[^>]*\ssrc=/gi) || []).length;
  const text = visibleText(html), words = text.split(/\s+/).filter(Boolean).length;
  const platform = /cdn\.shopify\.com|shopify\.theme|myshopify\.com/i.test(html) ? 'Shopify' : /woocommerce|wp-content/i.test(html) ? 'WooCommerce / WordPress' : /bigcommerce/i.test(html) ? 'BigCommerce' : /squarespace/i.test(html) ? 'Squarespace' : /wix\.com|wixstatic/i.test(html) ? 'Wix' : '';
  const hrefs = (html.match(/<a\b[^>]*href=[^>]*>/gi) || []).map(t => (attr(t, 'href') || '').toLowerCase());
  const linkText = (html.match(/<a\b[^>]*>[\s\S]*?<\/a>/gi) || []).map(a => visibleText(a).toLowerCase()).join(' | ');
  const has = re => re.test(linkText) || hrefs.some(h => re.test(h));
  const shipping = has(/shipping|delivery/) || /free shipping|ships in|shipping policy/i.test(text);
  const returns = has(/return|refund|exchange/) || /returns?\s+policy|money[- ]back|30[- ]day/i.test(text);
  const contact = has(/contact|support|help/) || /mailto:|tel:/.test(lower);
  const reviewApp = /judge\.me|judgeme|yotpo|okendo|stamped\.io|loox|reviews\.io|trustpilot|junip|klaviyo.*reviews|product-reviews|spr-badge|shopify-product-reviews/i.test(html);
  const reviews = reviewApp || hasRatingLd || /\b\d{1,5}\+?\s+(reviews|ratings)\b|★★★★/i.test(text);
  const marketplaces = ['amazon', 'walmart', 'bestbuy', 'costco', 'wayfair', 'etsy', 'ebay'].filter(m => hrefs.some(h => new RegExp(`https?://(www\\.)?${m}\\.`).test(h)));
  const ctas = (html.match(/<(a|button)\b[^>]*>[\s\S]*?<\/(a|button)>/gi) || []).slice(0, 80).map(x => visibleText(x)).filter(t => t && t.length < 40);
  return {finalUrl, bytes, title, desc, h1s, viewport, canonical, ogImage, hasProductLd, hasRatingLd, hasOrgLd, imgs: imgs.length, noAlt, scripts, words, platform, shipping, returns, contact, reviews, reviewApp, marketplaces, ctas: [...new Set(ctas)].slice(0, 12), https: finalUrl.startsWith('https://'), text};
}

const clamp = n => Math.max(0, Math.min(100, Math.round(n)));
export function siteRules(a, ps) {
  const out = [];
  const scores = Object.fromEntries(AREAS.map(x => [x, 100]));
  const hit = (area, pts, sev, finding, fix) => { scores[area] -= pts; out.push(issue(sev, area, finding, fix)); };
  // Speed & mobile
  if (ps && Number.isFinite(ps.score)) {
    scores['Speed & mobile'] = ps.score;
    if (ps.score < 50) out.push(issue('high', 'Speed & mobile', `Google rates the page ${ps.score}/100 for mobile speed${ps.lcp ? `; the main content takes about ${(ps.lcp / 1000).toFixed(1)} seconds to appear` : ''}.`, 'Compress and resize large images, remove unused apps and scripts, and lazy-load images below the fold.'));
    else if (ps.score < 80) out.push(issue('med', 'Speed & mobile', `Google rates the page ${ps.score}/100 for mobile speed${ps.lcp ? ` (main content in about ${(ps.lcp / 1000).toFixed(1)}s)` : ''}.`, 'Resize the largest images and trim third-party scripts. Under 2.5 seconds for the main content is the target.'));
    if (ps.cls > 0.1) out.push(issue('med', 'Speed & mobile', 'Content jumps around while the page loads.', 'Give images and banners fixed dimensions so the layout does not shift.'));
  } else {
    if (a.bytes > 600_000) hit('Speed & mobile', 20, 'med', `The page's HTML alone is ${(a.bytes / 1e6).toFixed(1)} MB before images.`, 'Reduce inline scripts and apps; heavy pages load slowly on phones.');
    if (a.scripts > 40) hit('Speed & mobile', 20, 'med', `${a.scripts} separate scripts load on this page.`, 'Remove apps and tracking tags you no longer use.');
  }
  if (!a.viewport) { scores['Speed & mobile'] = Math.min(scores['Speed & mobile'], 40); out.push(issue('high', 'Speed & mobile', 'The page is not set up for mobile screens.', 'Add a mobile viewport tag or switch to a responsive theme.')); }
  if (!a.https) hit('Trust', 30, 'high', 'The page does not load over a secure (https) connection.', 'Turn on SSL for your domain; browsers warn shoppers about insecure pages.');
  // First impression
  const h1 = a.h1s[0] || '';
  if (!a.h1s.length) hit('First impression', 30, 'high', 'There is no main headline that tells visitors what you sell.', 'Add one clear headline near the top: what you sell and who it is for.');
  else if (h1.split(/\s+/).length <= 2) hit('First impression', 15, 'med', `The main headline is just “${h1.slice(0, 60)}”, which doesn’t say what you sell.`, 'Use a headline that names the product and the main benefit.');
  if (!a.ctas.some(c => /shop|buy|add to cart|order|best ?sellers|browse|view (all|products)/i.test(c))) hit('First impression', 20, 'med', 'No clear “Shop” or “Buy” button was found.', 'Make the first button go straight to best sellers or the main collection.');
  if (!a.ogImage) hit('First impression', 10, 'low', 'Links shared on social or in messages show no preview image.', 'Set a share image (Open Graph image) in your store settings.');
  // Product pages
  if (!a.hasProductLd) hit('Product pages', 25, 'med', 'No product data (price, stock, reviews) is marked up for Google on this page.', 'Add Product structured data so Google can show price and stars in search. Most themes and review apps can do this.');
  if (a.imgs && a.noAlt / a.imgs > 0.3) hit('Product pages', 20, 'med', `${a.noAlt} of ${a.imgs} images have no description (alt text).`, 'Describe each product image in a few words. It helps search, accessibility and AI shopping tools.');
  if (a.words < 150) hit('Product pages', 20, 'med', `Only about ${a.words} words of text are visible on the page.`, 'Add product benefits, sizes, materials and FAQs. Thin pages convert and rank worse.');
  // Trust
  if (!a.reviews) hit('Trust', 35, 'high', 'No customer reviews or ratings are visible.', 'Add a reviews app and show star ratings on product and collection pages.');
  if (!a.shipping) hit('Trust', 25, 'high', 'Shipping costs and times are hard to find.', 'Show shipping cost and delivery time near the price and link a shipping page in the header or footer.');
  if (!a.returns) hit('Trust', 20, 'med', 'No return or refund policy is easy to find.', 'Link your return policy in the footer and mention it under the add-to-cart button.');
  if (!a.contact) hit('Trust', 15, 'med', 'There is no obvious way to contact you.', 'Add a Contact link in the header or footer with an email address.');
  // Search basics
  if (!a.title) hit('Search basics', 30, 'high', 'The page has no title for Google to show.', 'Write a page title with your brand and main product type.');
  else if (a.title.length < 25 || a.title.length > 70) hit('Search basics', 15, 'med', `The page title is ${a.title.length} characters: “${a.title.slice(0, 80)}”.`, 'Aim for 30–65 characters: main product type first, brand last.');
  if (!a.desc) hit('Search basics', 20, 'med', 'There is no search description, so Google writes its own snippet.', 'Write a 120–155 character description that sells the click.');
  if (a.h1s.length > 1) hit('Search basics', 10, 'low', `There are ${a.h1s.length} main headings on the page.`, 'Keep one main heading per page; use subheadings for the rest.');
  if (!a.canonical) hit('Search basics', 10, 'low', 'The page has no canonical tag, so duplicate versions can compete in search.', 'Set a canonical URL. Most platforms add one automatically once enabled.');
  // Channel reach (informational)
  if (!a.marketplaces.length) out.push(issue('low', 'Channel reach', 'No links to marketplace stores were found on the page.', 'If your products suit Amazon, Walmart or Best Buy, those marketplaces can add sales from shoppers who never visit brand sites.'));
  for (const k of AREAS) scores[k] = clamp(scores[k]);
  return {scores, issues: out};
}

// ---------- listing mode ----------
export function listingRules(L) {
  const mp = MARKETPLACES[L.marketplace];
  const out = [], scores = Object.fromEntries(LISTING_AREAS.map(x => [x, 100]));
  const hit = (area, pts, sev, finding, fix) => { scores[area] -= pts; out.push(issue(sev, area, finding, fix)); };
  const t = L.title, tl = t.length;
  if (tl > mp.titleMax) hit('Title', 40, 'high', `The title is ${tl} characters; ${mp.name} allows up to about ${mp.titleMax}.`, `Cut it to ${mp.titleIdeal[0]}–${mp.titleIdeal[1]} characters: brand, product type, key feature, size or count.`);
  else if (tl < mp.titleIdeal[0]) hit('Title', 25, 'high', `The title is only ${tl} characters, so it misses search terms shoppers use.`, `Expand to ${mp.titleIdeal[0]}–${mp.titleIdeal[1]} characters with product type, main feature and size or count.`);
  else if (tl > mp.titleIdeal[1]) hit('Title', 10, 'low', `The title is ${tl} characters; the end is cut off on phones.`, 'Put the most important words in the first 60–80 characters.');
  if (/[!$?_{}^¬¦~#<>*]/.test(t)) hit('Title', 15, 'med', 'The title contains symbols marketplaces often reject or suppress.', 'Remove symbols such as ! $ ? _ { } ^ ~ # < > *.');
  if (/free shipping|best seller|bestseller|sale|% off|hot deal|limited time|guarantee/i.test(t)) hit('Title', 20, 'high', 'The title includes promotional wording, which marketplaces prohibit in titles.', 'Remove promotional phrases; put offers in a coupon or deal instead.');
  const words = t.toLowerCase().match(/[a-z0-9]{3,}/g) || [], counts = {};
  words.forEach(w => counts[w] = (counts[w] || 0) + 1);
  const rep = Object.entries(counts).filter(([w, n]) => n > 2 && !['and', 'for', 'the', 'with'].includes(w)).map(([w]) => w);
  if (rep.length) hit('Title', 10, 'med', `Words repeat in the title (${rep.slice(0, 3).join(', ')}).`, 'Use each word once; repetition reads as keyword stuffing.');
  if (t === t.toUpperCase() && /[A-Z]{6,}/.test(t)) hit('Title', 10, 'med', 'The title is written in capitals.', 'Use title case. All caps is against most marketplace style rules.');
  const b = L.bullets;
  if (b.length < mp.bullets[0]) hit('Bullets', 35, 'high', `There are ${b.length} bullet points; ${mp.name} shoppers expect at least ${mp.bullets[0]}.`, `Write ${mp.bullets[0]}${mp.bullets[1] > mp.bullets[0] ? '–' + mp.bullets[1] : ''} benefit-led bullets: benefit first, then the spec that proves it.`);
  const shortB = b.filter(x => x.length < 60).length;
  if (b.length && shortB > b.length / 2) hit('Bullets', 20, 'med', 'Most bullets are very short and list features without benefits.', 'Start each bullet with what the shopper gets, then the detail (size, material, compatibility).');
  if (b.some(x => x.length > 500)) hit('Bullets', 10, 'low', 'At least one bullet is very long and hard to scan.', 'Keep bullets to one or two sentences.');
  const dw = (L.description.match(/\S+/g) || []).length;
  if (!dw) hit('Description', 50, 'high', 'There is no product description.', `Write ${mp.descWords}+ words covering use cases, what’s in the box, care and sizing.`);
  else if (dw < mp.descWords) hit('Description', 25, 'med', `The description is about ${dw} words.`, `Expand to ${mp.descWords}+ words with use cases, what’s in the box, care and sizing.`);
  if (L.images === null) scores.Images = null;
  else if (L.images < mp.images) hit('Images', Math.min(70, (mp.images - L.images) * 15), L.images < 3 ? 'high' : 'med', `The listing has ${L.images} image${L.images === 1 ? '' : 's'}; aim for at least ${mp.images}.`, 'Add lifestyle, scale, detail, packaging and infographic images. Images are the first thing shoppers judge.');
  if (L.rating === null && L.reviews === null) scores.Reviews = null;
  else {
    if (L.reviews !== null && L.reviews < 15) hit('Reviews', 35, 'high', `The listing has ${L.reviews} review${L.reviews === 1 ? '' : 's'}.`, L.marketplace === 'amazon' ? 'Use Amazon Vine and the Request a Review button. Listings with under 15 reviews convert far lower.' : 'Join the marketplace’s review programme and follow up with buyers through approved channels.');
    if (L.rating !== null && L.rating < 4) hit('Reviews', 40, 'high', `The rating is ${L.rating.toFixed(1)} stars. Below 4.0, many shoppers skip the listing.`, 'Read the 1–3 star reviews for patterns, fix the product or the expectation in the listing, and answer recent complaints.');
    else if (L.rating !== null && L.rating < 4.3) hit('Reviews', 15, 'med', `The rating is ${L.rating.toFixed(1)} stars.`, 'Find the most common complaint in recent reviews and address it in the bullets and images.');
  }
  for (const k of LISTING_AREAS) if (scores[k] !== null) scores[k] = clamp(scores[k]);
  return {scores, issues: out};
}

// ---------- Claude (optional) ----------
export const aiStatus = {last: ''};
async function askClaude(env, system, user) {
  if (!env.ANTHROPIC_API_KEY) { aiStatus.last = 'no key set'; return null; }
  const models = [...new Set([env.ANTHROPIC_MODEL, 'claude-haiku-5-5', 'claude-haiku-4-5'].filter(Boolean))];
  for (const model of models) {
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {method: 'POST', headers: {'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json'},
        body: JSON.stringify({model, max_tokens: 1400, system, messages: [{role: 'user', content: user}]}), signal: AbortSignal.timeout(40000)});
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        aiStatus.last = `${model}: HTTP ${r.status} ${String(e?.error?.type || '')} ${String(e?.error?.message || '').slice(0, 200)}`.trim();
        if (r.status === 404 || (r.status === 400 && /model/i.test(aiStatus.last))) continue; // try the next model name
        return null;
      }
      const d = await r.json(), text = (d.content || []).filter(c => c.type === 'text').map(c => c.text).join('');
      const out = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
      aiStatus.last = `ok (${model})`;
      return out;
    } catch (err) { aiStatus.last = `${model}: ${String(err?.message || err).slice(0, 200)}`; return null; }
  }
  return null;
}
const AI_SYSTEM = 'You are a senior e-commerce conversion consultant with 17 years of experience on Shopify, Amazon, Walmart and Best Buy. Be specific, plain-spoken and practical. Never invent facts that are not in the data. Reply with JSON only.';
const cleanIssues = (arr, areas) => (Array.isArray(arr) ? arr : []).filter(i => i && ['high', 'med', 'low'].includes(i.sev) && typeof i.finding === 'string' && typeof i.fix === 'string').slice(0, 4).map(i => issue(i.sev, areas.includes(i.area) ? i.area : areas[1] || areas[0], i.finding.slice(0, 300), i.fix.slice(0, 300)));

async function aiSite(env, a, rules) {
  const user = `Store page: ${a.finalUrl}\nPlatform: ${a.platform || 'unknown'}\nTitle: ${a.title}\nMain headline: ${a.h1s[0] || '(none)'}\nButtons: ${a.ctas.join(' | ')}\nAutomated findings already reported: ${JSON.stringify(rules.issues.map(i => i.finding))}\n\nVisible page text (truncated):\n${a.text.slice(0, 7000)}\n\nReturn JSON: {"summary":"2-3 sentences on the biggest opportunity, addressed to the store owner","issues":[up to 3 NEW issues a shopper would notice that the automated findings missed, each {"sev":"high|med|low","area":"First impression|Product pages|Trust","finding":"specific, quote the page where useful","fix":"specific"}],"rewrite":{"label":"New homepage headline","before":"current headline","after":"your improved headline, max 10 words","note":"one short line on why"}}`;
  return askClaude(env, AI_SYSTEM, user);
}
async function aiListing(env, L, rules) {
  const mp = MARKETPLACES[L.marketplace];
  const user = `Marketplace: ${mp.name}\nTitle: ${L.title}\nBullets:\n${L.bullets.map(b => '- ' + b).join('\n')}\nDescription: ${L.description.slice(0, 4000)}\nImages: ${L.images ?? 'unknown'}\nRating: ${L.rating ?? 'unknown'} from ${L.reviews ?? 'unknown'} reviews\nAutomated findings already reported: ${JSON.stringify(rules.issues.map(i => i.finding))}\n\nReturn JSON: {"summary":"2-3 sentences on the biggest opportunity","issues":[up to 3 NEW issues the automated findings missed, each {"sev":"high|med|low","area":"Title|Bullets|Description","finding":"specific","fix":"specific"}],"rewrite":{"title":"rewritten title within ${mp.name} rules, ${mp.titleIdeal[0]}-${mp.titleIdeal[1]} characters, no promotional words","bullets":["5 benefit-led bullets, benefit first then proof, under 220 characters each"]}}. Only use facts present in the listing.`;
  return askClaude(env, AI_SYSTEM, user);
}

// ---------- report assembly ----------
export function buildReport(kind, label, rules, ai, extra = {}) {
  const vals = Object.values(rules.scores).filter(v => v !== null);
  const score = vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : 0;
  const aiIssues = cleanIssues(ai?.issues, kind === 'site' ? AREAS : LISTING_AREAS);
  // Prefer Claude's wording when it covers the same topic as a rule (e.g. the headline).
  const topic = t => /headline/i.test(t) ? 'headline' : /\btitle\b/i.test(t) ? 'title' : /bullet/i.test(t) ? 'bullets' : null;
  const aiTopics = new Set(aiIssues.map(i => i.area + ':' + topic(i.finding)).filter(k => !k.endsWith(':null')));
  const ruleIssues = rules.issues.filter(i => !aiTopics.has(i.area + ':' + topic(i.finding)) || i.sev === 'high');
  const issues = [...ruleIssues, ...aiIssues].sort((x, y) => SEV_ORDER[x.sev] - SEV_ORDER[y.sev]);
  const fallback = issues.length ? `The biggest opportunity: ${issues[0].finding.replace(/\.$/, '')}. Fixing the high-impact items first is likely to make the most difference to sales.` : 'No major issues found by the automated checks.';
  let rewrite = null;
  if (kind === 'site' && ai?.rewrite?.after) rewrite = {label: String(ai.rewrite.label || 'New homepage headline').slice(0, 60), before: String(ai.rewrite.before || '').slice(0, 200), after: String(ai.rewrite.after).slice(0, 200), note: String(ai.rewrite.note || '').slice(0, 200)};
  if (kind === 'listing' && ai?.rewrite?.title) rewrite = {label: 'Rewritten title and bullets', after: String(ai.rewrite.title).slice(0, 250), bullets: (Array.isArray(ai.rewrite.bullets) ? ai.rewrite.bullets : []).slice(0, 6).map(b => String(b).slice(0, 300))};
  return {kind, label, score, areas: rules.scores, issues: issues.slice(0, 10), summary: typeof ai?.summary === 'string' ? ai.summary.slice(0, 600) : fallback, rewrite, ai: !!ai, ...extra};
}

// ---------- emails ----------
const sevColor = {high: '#b4282e', med: '#c27c0e', low: '#a3a7ae'};
const sevLabel = {high: 'HIGH IMPACT', med: 'MEDIUM', low: 'LOW'};
export function reportText(r) {
  const areas = Object.entries(r.areas).filter(([, v]) => v !== null).map(([k, v]) => `  ${k}: ${v}/100`).join('\n');
  const list = r.issues.map((i, n) => `${n + 1}. [${sevLabel[i.sev]} · ${i.area}] ${i.finding}\n   Fix: ${i.fix}`).join('\n\n');
  const rw = r.rewrite ? `\n\n${r.rewrite.label}:\n${r.rewrite.after}${r.rewrite.bullets?.length ? '\n' + r.rewrite.bullets.map(b => '- ' + b).join('\n') : ''}` : '';
  return `Store check: ${r.label}\nOverall score: ${r.score}/100\n${areas}\n\n${r.summary}\n\n${list}${rw}`;
}
export function reportEmail(r, env) {
  const address = env.MAILING_ADDRESS || 'Toronto, Ontario';
  const bars = Object.entries(r.areas).filter(([, v]) => v !== null).map(([k, v]) => `<tr><td style="padding:3px 0;font-size:12px;color:#64676d;width:140px;">${escapeHtml(k)}</td><td style="padding:3px 10px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td style="background:#111214;height:6px;width:${v}%;border-radius:3px;font-size:0;line-height:0;">&nbsp;</td><td style="background:#eceef1;height:6px;font-size:0;line-height:0;">&nbsp;</td></tr></table></td><td style="font-size:12px;font-weight:600;width:28px;text-align:right;">${v}</td></tr>`).join('');
  const items = r.issues.map(i => `<tr><td style="padding:0 0 10px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #e7e8eb;border-left:4px solid ${sevColor[i.sev]};border-radius:10px;"><tr><td style="padding:11px 14px;"><p style="margin:0 0 3px;font-size:10px;letter-spacing:1px;font-weight:600;color:#737780;">${sevLabel[i.sev]} · ${escapeHtml(i.area.toUpperCase())}</p><p style="margin:0 0 4px;font-size:14px;line-height:1.55;color:#111214;">${escapeHtml(i.finding)}</p><p style="margin:0;font-size:13px;line-height:1.55;color:#64676d;"><strong style="color:#111214;">Fix:</strong> ${escapeHtml(i.fix)}</p></td></tr></table></td></tr>`).join('');
  const rw = r.rewrite ? `<tr><td style="padding:6px 34px 8px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f7f8fa;border:1px solid #eceef1;border-radius:12px;"><tr><td style="padding:18px 20px;"><p style="margin:0 0 8px;font-size:10px;letter-spacing:1.5px;font-weight:600;color:#737780;">${escapeHtml(r.rewrite.label.toUpperCase())}</p>${r.rewrite.before ? `<p style="margin:0 0 6px;font-size:13px;color:#737780;text-decoration:line-through;">${escapeHtml(r.rewrite.before)}</p>` : ''}<p style="margin:0;font-size:16px;line-height:1.5;font-weight:600;color:#111214;">${escapeHtml(r.rewrite.after)}</p>${(r.rewrite.bullets || []).length ? '<ul style="margin:10px 0 0;padding-left:18px;font-size:13px;line-height:1.6;color:#111214;">' + r.rewrite.bullets.map(b => `<li style="margin:0 0 4px;">${escapeHtml(b)}</li>`).join('') + '</ul>' : ''}${r.rewrite.note ? `<p style="margin:8px 0 0;font-size:12px;color:#64676d;">${escapeHtml(r.rewrite.note)}</p>` : ''}</td></tr></table></td></tr>` : '';
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>Your store check | Simple Consulting</title></head>
<body style="margin:0;padding:0;background:#f7f8fa;color:#111214;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Score ${r.score}/100 · ${r.issues.filter(i => i.sev === 'high').length} high-impact issues and how to fix them.</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f7f8fa;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #e7e8eb;border-radius:18px;">
<tr><td style="padding:28px 34px 22px;border-bottom:1px solid #e7e8eb;"><a href="${SITE}/" style="font-family:Arial,Helvetica,sans-serif;font-size:25px;letter-spacing:-0.9px;color:#111214;text-decoration:none;"><strong>simple</strong> consulting<strong>.</strong></a></td></tr>
<tr><td style="padding:30px 34px 6px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td><p style="margin:0 0 10px;font-size:10px;font-weight:600;letter-spacing:1.5px;color:#737780;">YOUR STORE CHECK</p><h1 style="font-family:Arial,Helvetica,sans-serif;margin:0;font-size:24px;line-height:1.25;font-weight:600;letter-spacing:-0.6px;word-break:break-word;">${escapeHtml(r.label)}</h1></td><td align="right" valign="top" style="width:96px;"><table role="presentation" cellspacing="0" cellpadding="0" border="0" style="background:${r.score >= 75 ? '#e8f4ed' : r.score >= 50 ? '#fdf3e6' : '#fbeaea'};border-radius:12px;"><tr><td style="padding:10px 14px;font-size:30px;font-weight:600;color:${r.score >= 75 ? '#1d7a4a' : r.score >= 50 ? '#8a4b00' : '#b4282e'};white-space:nowrap;">${r.score}<span style="font-size:13px;">/100</span></td></tr></table></td></tr></table></td></tr>
<tr><td style="padding:16px 34px 4px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">${bars}</table></td></tr>
<tr><td style="padding:16px 34px 6px;"><p style="margin:0;font-size:15px;line-height:1.7;color:#111214;">${escapeHtml(r.summary)}</p></td></tr>
<tr><td style="padding:16px 34px 4px;"><p style="margin:0 0 10px;font-size:15px;font-weight:600;">What to fix, in order</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">${items || '<tr><td style="font-size:14px;color:#64676d;">No major issues found by the automated checks.</td></tr>'}</table></td></tr>
${rw}
<tr><td style="padding:20px 34px 30px;border-top:1px solid #e7e8eb;"><p style="margin:0 0 6px;font-size:15px;font-weight:600;">Want these fixed for you?</p><p style="margin:0 0 16px;font-size:14px;line-height:1.75;color:#64676d;">Reply to this email and I’ll tell you which fixes matter most for your products. If it makes sense, I can rebuild the pages and listings for a fixed fee agreed up front.</p>
<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td bgcolor="#111214" style="background:#111214;border-radius:26px;"><a href="${SITE}/booking.html#booking" style="display:inline-block;padding:13px 22px;font-size:13px;font-weight:600;color:#ffffff;text-decoration:none;">Book a free call &nbsp;&rarr;</a></td><td style="padding-left:16px;"><a href="${SITE}/store-check.html#rebuild" style="font-size:13px;font-weight:600;color:#111214;">About the rebuild</a></td></tr></table>
<p style="margin:24px 0 0;font-size:14px;line-height:1.6;color:#64676d;">Scott Nguyen<br><span style="font-size:12px;color:#737780;">Founder &amp; Consultant, Simple Consulting · scott@simpleconsulting.ca</span></p></td></tr></table>
<p style="margin:18px 0 0;font-size:11px;line-height:1.8;color:#858a93;text-align:center;">You received this because you requested a free store check on simpleconsulting.ca.<br>Automated checks give a starting point, not a full audit.<br>17700679 Canada Inc. o/a Simple Consulting · ${escapeHtml(address)}<br>Don’t want a follow-up? Reply “unsubscribe”. · <a href="${SITE}/privacy.html" style="color:#737780;">Privacy</a></p>
</td></tr></table></body></html>`;
  const text = `${reportText(r)}\n\nWant these fixed for you? Reply to this email, or book a free call: ${SITE}/booking.html#booking\n\nScott Nguyen\nFounder & Consultant, Simple Consulting\nscott@simpleconsulting.ca\n\nYou received this because you requested a free store check on simpleconsulting.ca.\n17700679 Canada Inc. o/a Simple Consulting · ${address}\nDon’t want a follow-up? Reply “unsubscribe”.`;
  return {subject: `Your store check: ${r.score}/100 for ${r.label}`.slice(0, 150), text, html};
}

// ---------- handler ----------
export async function handleStoreCheck(body, env, origin, reply) {
  const string = (key, max) => typeof body[key] === 'string' && body[key].length <= max ? body[key].trim() : null;
  aiStatus.last = '';
  const mode = body.mode === 'listing' ? 'listing' : 'site';
  const email = string('email', 254), token = string('turnstileToken', 2048), id = string('submissionId', 36), source = string('source_page', 1500);
  if (typeof body._gotcha === 'string' && body._gotcha) return reply(422, {error: 'invalid_request'});
  if (!email || !EMAIL_RE.test(email) || body.consent !== true || !token || !uuid.test(id || '') || source === null) return reply(422, {error: 'invalid_fields'});
  let target = null, listing = null;
  if (mode === 'site') {
    target = safeUrl(string('url', 500) || '');
    if (!target) return reply(422, {error: 'invalid_url', message: 'Enter a public store address, like https://yourstore.com.'});
  } else {
    const mp = string('marketplace', 20), title = string('title', 600), desc = string('description', 8000) ?? '';
    const bullets = (string('bullets', 6000) || '').split(/\n+/).map(s => s.replace(/^[\s•\-*·–]+/, '').trim()).filter(Boolean).slice(0, 12);
    const num = (k, lo, hi) => { const v = body[k]; if (v === '' || v === null || v === undefined) return null; const n = Number(v); return Number.isFinite(n) && n >= lo && n <= hi ? n : NaN; };
    const images = num('images', 0, 30), rating = num('rating', 1, 5), reviews = num('reviews', 0, 1e7);
    if (!Object.hasOwn(MARKETPLACES, mp || '') || !title || title.length < 5 || [images, rating, reviews].some(Number.isNaN)) return reply(422, {error: 'invalid_fields', message: 'Add the marketplace and at least the listing title.'});
    listing = {marketplace: mp, title, bullets, description: desc, images, rating, reviews};
  }
  try {
    const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({secret: env.TURNSTILE_SECRET_KEY, response: token, idempotency_key: id}), signal: AbortSignal.timeout(7000)});
    if (!verify.ok) return reply(503, {error: 'verification_unavailable'});
    const check = await verify.json();
    if (!check.success || check.hostname !== new URL(origin).hostname || check.action !== 'store_check') return reply(422, {error: 'verification_failed'});
    let report;
    if (mode === 'site') {
      const [page, ps] = await Promise.all([fetchPage(target).catch(() => ({error: 'We couldn’t reach that page. Check the address and try again.'})), pageSpeed(target, env)]);
      if (page.error) return reply(422, {error: 'fetch_failed', message: page.error});
      const a = analyseHtml(page.html, page.finalUrl, page.bytes);
      const rules = siteRules(a, ps);
      const ai = await aiSite(env, a, rules);
      report = buildReport('site', new URL(a.finalUrl).hostname.replace(/^www\./, ''), rules, ai, {url: a.finalUrl, platform: a.platform, marketplaces: a.marketplaces, speed: ps});
    } else {
      const rules = listingRules(listing);
      const ai = await aiListing(env, listing, rules);
      report = buildReport('listing', `${MARKETPLACES[listing.marketplace].name} listing: ${listing.title.slice(0, 70)}${listing.title.length > 70 ? '…' : ''}`, rules, ai, {marketplace: listing.marketplace});
    }
    const lead = `New store check lead\n\nEmail: ${email}\nMode: ${mode}${target ? `\nURL: ${report.url}\nPlatform: ${report.platform || 'unknown'}\nMarketplaces linked: ${report.marketplaces.join(', ') || 'none'}` : ''}\nFollow-up consent: yes (ticked on the form)\nAI-written: ${report.ai ? 'yes' : 'no'} (${aiStatus.last || 'not attempted'})\n\n${reportText(report)}${listing ? `\n\n--- Listing as submitted ---\nTitle: ${listing.title}\n${listing.bullets.map(b => '- ' + b).join('\n')}\n\n${listing.description}` : ''}`;
    const emails = [
      {from: env.FROM_EMAIL, to: [email], reply_to: env.TO_EMAIL, ...reportEmail(report, env)},
      {from: env.FROM_EMAIL, to: [env.TO_EMAIL], reply_to: email, subject: `Store check lead: ${report.label.slice(0, 80)} (${report.score}/100)`, text: lead, html: `<h1 style="font:600 20px Arial,sans-serif">New store check lead</h1><pre style="white-space:pre-wrap;font:14px/1.6 Arial,sans-serif;">${escapeHtml(lead)}</pre>`}
    ];
    const sent = await fetch('https://api.resend.com/emails/batch', {method: 'POST', headers: {'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `store-check/${id}`, 'x-batch-validation': 'strict'}, body: JSON.stringify(emails), signal: AbortSignal.timeout(10000)});
    const result = sent.ok ? await sent.json().catch(() => null) : null;
    const emailed = !!(result && !result.errors?.length && Array.isArray(result.data) && result.data.length === 2);
    const {speed, ...publicReport} = report;
    return reply(200, {ok: true, emailed, report: publicReport});
  } catch { return reply(503, {error: 'service_unavailable'}); }
}
