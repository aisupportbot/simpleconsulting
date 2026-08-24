#!/usr/bin/env node
/**
 * build-blog.js — turns the posts array inside blog.html into real, crawlable pages.
 *
 * Run it from your site folder:   node build-blog.js
 *
 * What it does:
 *   1. Reads posts.json. On the first run posts.json doesn't exist yet, so it
 *      extracts the posts array out of blog.html and writes posts.json for you.
 *      After that, posts.json is your content source — edit it to add a post.
 *   2. Writes /blog/<slug>.html for every post: a real page with its own URL,
 *      title, meta description, canonical, Open Graph tags, Article schema,
 *      related links and a CTA.
 *   3. Rewrites blog.html so the card grid is real HTML with real <a> links,
 *      instead of an empty div a crawler sees as a blank page.
 *   4. Writes sitemap.xml listing every page, and robots.txt pointing at it.
 *
 * Nothing is overwritten without a backup: blog.html is copied to
 * blog.html.backup on the first run.
 */

const fs = require('fs');
const path = require('path');

const SITE = 'https://www.simpleconsulting.ca';    // must match GitHub Pages custom domain
const AUTHOR = 'Scott Nguyen';
const BRAND = 'Simple Consulting';
const ROOT = process.cwd();
const BLOG_DIR = path.join(ROOT, 'blog');

/* ------------------------------------------------------------ load posts */
function loadPosts() {
  const jsonPath = path.join(ROOT, 'posts.json');
  if (fs.existsSync(jsonPath)) {
    console.log('Reading posts.json');
    return JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  }

  console.log('No posts.json yet — extracting the posts array from blog.html');
  const html = fs.readFileSync(path.join(ROOT, 'blog.html'), 'utf8');
  const start = html.indexOf('const posts = [');
  if (start === -1) throw new Error('Could not find "const posts = [" in blog.html');
  const open = html.indexOf('[', start);

  // walk the array to its matching bracket, skipping brackets inside strings
  let depth = 0, inStr = null, esc = false, end = -1;
  for (let i = open; i < html.length; i++) {
    const c = html[i];
    if (esc) { esc = false; continue; }
    if (c === '\\') { esc = true; continue; }
    if (inStr) { if (c === inStr) inStr = null; continue; }
    if (c === '"' || c === "'" || c === '`') { inStr = c; continue; }
    if (c === '[') depth++;
    else if (c === ']') { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end === -1) throw new Error('Could not find the end of the posts array');

  const posts = eval(html.slice(open, end + 1));   // it's our own file, not user input
  fs.writeFileSync(jsonPath, JSON.stringify(posts, null, 2));
  console.log(`Wrote posts.json (${posts.length} posts). Edit that file from now on.`);
  return posts;
}

/* ---------------------------------------------------------------- helpers */
const esc = s => String(s ?? '').replace(/[&<>"]/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const stripTags = s => String(s ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

function slugify(title) {
  return title.toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70);
}

function isoDate(human) {
  const d = new Date(human);
  return isNaN(d) ? new Date().toISOString().slice(0, 10) : d.toISOString().slice(0, 10);
}

/** Meta descriptions get truncated by Google past ~155 characters. */
function metaDesc(post) {
  const raw = post.blurb || stripTags(post.body);
  return raw.length <= 155 ? raw : raw.slice(0, 152).replace(/\s+\S*$/, '') + '…';
}

function readingTime(body) {
  const words = stripTags(body).split(' ').length;
  return Math.max(1, Math.round(words / 220));
}

/* ------------------------------------------------------------ shared CSS */
const CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--black:#0d0d0d;--white:#fff;--off:#f6f6f4;--border:#e8e8e5;--muted:#999;--text:#555}
html{scroll-behavior:smooth}
body{font-family:'DM Sans',sans-serif;color:var(--black);background:var(--white);line-height:1.6;-webkit-font-smoothing:antialiased}
header{position:sticky;top:0;z-index:100;background:rgba(255,255,255,.97);border-bottom:1px solid var(--border);backdrop-filter:blur(12px)}
nav{max-width:1160px;margin:auto;display:flex;justify-content:space-between;align-items:center;padding:18px 32px}
.logo{font-family:'DM Serif Display',serif;font-size:1.2em;letter-spacing:-.01em;color:var(--black);text-decoration:none}
.nav-links{display:flex;gap:6px;align-items:center}
.nav-links a{font-size:.86em;font-weight:500;color:var(--text);padding:8px 14px;border-radius:6px;text-decoration:none;transition:background .15s,color .15s}
.nav-links a:hover{background:var(--off);color:var(--black)}
.nav-links a.btn{background:var(--black);color:var(--white);font-weight:600;margin-left:6px}
.nav-links a.btn:hover{background:#2a2a2a}
.crumbs{max-width:760px;margin:auto;padding:26px 32px 0;font-size:.8em;color:var(--muted)}
.crumbs a{color:var(--muted);text-decoration:none}
.crumbs a:hover{color:var(--black)}
article{max-width:760px;margin:auto;padding:22px 32px 72px}
.post-tag{display:inline-block;font-size:.72em;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-bottom:14px}
h1{font-family:'DM Serif Display',serif;font-size:2.5em;letter-spacing:-.025em;line-height:1.15;margin-bottom:18px}
.byline{font-size:.85em;color:var(--muted);padding-bottom:26px;margin-bottom:32px;border-bottom:1px solid var(--border)}
.body{font-size:1.02em;color:var(--text);line-height:1.85}
.body p{margin-bottom:20px}
.body h2,.body h3{font-family:'DM Sans',sans-serif;font-size:1.15em;font-weight:700;color:var(--black);margin:34px 0 14px;line-height:1.35}
.body ul,.body ol{padding-left:22px;margin-bottom:20px}
.body li{margin-bottom:9px}
.body strong{color:var(--black)}
.cta-box{background:var(--off);border:1px solid var(--border);border-radius:14px;padding:34px;margin-top:52px;text-align:center}
.cta-box h2{font-family:'DM Serif Display',serif;font-size:1.5em;margin-bottom:12px;letter-spacing:-.02em}
.cta-box p{font-size:.92em;color:var(--text);margin-bottom:22px}
.cta-box a{display:inline-block;background:var(--black);color:var(--white);text-decoration:none;font-size:.88em;font-weight:600;padding:13px 28px;border-radius:6px}
.cta-box a:hover{background:#2a2a2a}
.related{max-width:760px;margin:auto;padding:0 32px 72px}
.related h2{font-size:.72em;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);border-bottom:1px solid var(--border);padding-bottom:8px;margin-bottom:8px}
.related a{display:block;padding:16px 0;border-bottom:1px solid var(--border);text-decoration:none;color:var(--black)}
.related a:hover{color:var(--muted)}
.related .t{font-weight:600;font-size:.98em;margin-bottom:3px}
.related .b{font-size:.83em;color:var(--text)}
.pager{max-width:760px;margin:auto;padding:0 32px 72px;display:flex;justify-content:space-between;gap:18px;font-size:.85em}
.pager a{color:var(--text);text-decoration:none;max-width:48%}
.pager a:hover{color:var(--black)}
.pager span{display:block;font-size:.85em;color:var(--muted);margin-bottom:3px}
footer{border-top:1px solid var(--border);padding:30px 32px}
.footer-inner{max-width:1160px;margin:auto;display:flex;justify-content:space-between;align-items:center;font-size:.8em;color:var(--muted);flex-wrap:wrap;gap:14px}
.footer-links{display:flex;gap:22px}
.footer-links a{color:var(--muted);text-decoration:none}
.footer-links a:hover{color:var(--black)}
@media(max-width:960px){nav{padding:15px 24px}.nav-links a:not(.btn){display:none}h1{font-size:1.9em}article,.related,.pager,.crumbs{padding-left:22px;padding-right:22px}}
`.trim();

const NAV = `
<header>
  <nav>
    <a class="logo" href="/">${BRAND}</a>
    <div class="nav-links">
      <a href="/#services">Services</a>
      <a href="/about.html">About</a>
      <a href="/blog.html">Blog</a>
      <a href="/booking.html" class="btn">Book a Call</a>
    </div>
  </nav>
</header>`;

const FOOT = `
<footer>
  <div class="footer-inner">
    <span>© ${BRAND} — Erin, Ontario</span>
    <div class="footer-links">
      <a href="/#services">Services</a>
      <a href="/about.html">About</a>
      <a href="/blog.html">Blog</a>
      <a href="/booking.html">Contact</a>
    </div>
  </div>
</footer>`;

/* ------------------------------------------------------- post page render */
function postPage(post, all, i) {
  const url = `${SITE}/blog/${post.slug}.html`;
  const published = isoDate(post.date);
  const related = all
    .filter(p => p.tag === post.tag && p.slug !== post.slug)
    .slice(0, 3);
  const prev = all[i - 1], next = all[i + 1];

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: metaDesc(post),
    datePublished: published,
    dateModified: published,
    author: { '@type': 'Person', name: AUTHOR },
    publisher: { '@type': 'Organization', name: BRAND, url: SITE + '/' },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    articleSection: post.tag,
    inLanguage: 'en-CA'
  };

  return `<!DOCTYPE html>
<html lang="en-CA">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(post.title)} | ${BRAND}</title>
<meta name="description" content="${esc(metaDesc(post))}">
<meta name="author" content="${AUTHOR} — ${BRAND}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(post.title)}">
<meta property="og:description" content="${esc(metaDesc(post))}">
<meta property="og:url" content="${url}">
<meta property="og:site_name" content="${BRAND}">
<meta property="article:published_time" content="${published}">
<meta property="article:section" content="${esc(post.tag)}">
<meta name="twitter:card" content="summary">
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&family=DM+Serif+Display:ital@0;1&display=swap" rel="stylesheet">
<style>${CSS}</style>
<script type="application/ld+json">${JSON.stringify(schema)}</script>
</head>
<body>
${NAV}

<p class="crumbs"><a href="/">Home</a> › <a href="/blog.html">Blog</a> › ${esc(post.tag)}</p>

<article>
  <span class="post-tag">${esc(post.tag)}</span>
  <h1>${esc(post.title)}</h1>
  <p class="byline">By ${AUTHOR} · ${esc(post.date)} · ${readingTime(post.body)} min read</p>
  <div class="body">${post.body}</div>

  <div class="cta-box">
    <h2>Want help putting this into practice?</h2>
    <p>Book a free consultation and we'll walk through what's holding your business back.</p>
    <a href="/booking.html">Book a Free Call</a>
  </div>
</article>

${related.length ? `<div class="related">
  <h2>More on ${esc(post.tag)}</h2>
  ${related.map(r => `<a href="/blog/${r.slug}.html">
    <span class="t">${esc(r.title)}</span>
    <span class="b">${esc(r.blurb || '')}</span>
  </a>`).join('\n  ')}
</div>` : ''}

<div class="pager">
  ${prev ? `<a href="/blog/${prev.slug}.html"><span>← Previous</span>${esc(prev.title)}</a>` : '<span></span>'}
  ${next ? `<a href="/blog/${next.slug}.html" style="text-align:right"><span>Next →</span>${esc(next.title)}</a>` : '<span></span>'}
</div>

${FOOT}
</body>
</html>`;
}

/* ------------------------------------------------- rewrite the blog index */
function rewriteIndex(posts) {
  const file = path.join(ROOT, 'blog.html');
  let html = fs.readFileSync(file, 'utf8');

  const backup = path.join(ROOT, 'blog.html.backup');
  if (!fs.existsSync(backup)) {
    fs.writeFileSync(backup, html);
    console.log('Backed up the original to blog.html.backup');
  }

  // Real anchors, rendered server-side, so a crawler sees 90 links to 90 pages.
  const cards = posts.map(p => `      <a class="post-card" data-tag="${esc(p.tag)}" href="/blog/${p.slug}.html">
        <span class="post-tag">${esc(p.tag)}</span>
        <h3>${esc(p.title)}</h3>
        <p>${esc(p.blurb || '')}</p>
        <div class="post-meta"><span>${AUTHOR} &middot; ${esc(p.date)}</span><span class="read-more">Read &rarr;</span></div>
      </a>`).join('\n');

  html = html.replace(
    /<div class="post-grid" id="post-grid">\s*<\/div>/,
    `<div class="post-grid" id="post-grid">\n${cards}\n    </div>`
  );

  // The old script rendered cards and ran the modal. Neither is needed now.
  html = html.replace(/<script>\s*const posts = \[[\s\S]*?renderPosts\('all'\);\s*<\/script>/,
`<script>
function filterPosts(filter, btn) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.post-card').forEach(card => {
    const show = filter === 'all' || card.dataset.tag.includes(filter);
    card.classList.toggle('hidden', !show);
  });
}
</script>`);

  // The modal markup has nothing left to open.
  html = html.replace(/<div class="modal-overlay" id="modal-overlay"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/, '');

  // Cards are anchors now, so they need to look like cards, not links.
  html = html.replace('.post-card:hover {', '.post-card { text-decoration: none; color: inherit; }\n.post-card:hover {');

  // Point the canonical at the domain that actually serves the site.
  html = html.replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${SITE}/blog.html">`);

  // Internal links should agree on one homepage URL, not two.
  html = html.replace(/href="index\.html#services"/g, 'href="/#services"')
             .replace(/href="index\.html"/g, 'href="/"');

  fs.writeFileSync(file, html);
  console.log(`Rewrote blog.html with ${posts.length} real links`);
}

/* ----------------------------------------------------------- sitemap etc. */
function writeSitemap(posts) {
  const today = new Date().toISOString().slice(0, 10);
  const urls = [
    { loc: `${SITE}/`, pri: '1.0' },
    { loc: `${SITE}/about.html`, pri: '0.8' },
    { loc: `${SITE}/blog.html`, pri: '0.9' },
    { loc: `${SITE}/booking.html`, pri: '0.8' },
    ...posts.map(p => ({ loc: `${SITE}/blog/${p.slug}.html`, pri: '0.7', lastmod: isoDate(p.date) }))
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod || today}</lastmod><priority>${u.pri}</priority></url>`).join('\n')}
</urlset>`;
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), xml);
  fs.writeFileSync(path.join(ROOT, 'robots.txt'),
    `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
  console.log(`Wrote sitemap.xml (${urls.length} URLs) and robots.txt`);
}

/* -------------------------------------------------------------------- run */
function main() {
  const posts = loadPosts();

  const seen = new Set();
  posts.forEach(p => {
    let s = slugify(p.title), n = 2;
    while (seen.has(s)) s = slugify(p.title) + '-' + n++;
    seen.add(s);
    p.slug = s;
  });

  // Newest first, so the blog index and the prev/next links read chronologically.
  posts.sort((a, b) => new Date(b.date) - new Date(a.date));

  fs.mkdirSync(BLOG_DIR, { recursive: true });
  posts.forEach((p, i) =>
    fs.writeFileSync(path.join(BLOG_DIR, p.slug + '.html'), postPage(p, posts, i)));
  console.log(`Wrote ${posts.length} pages into /blog/`);

  rewriteIndex(posts);
  writeSitemap(posts);

  const tags = [...new Set(posts.map(p => p.tag))];
  console.log(`\nDone. ${posts.length} posts across ${tags.length} categories.`);
  console.log('Upload: the whole /blog/ folder, blog.html, sitemap.xml, robots.txt');
}

main();
