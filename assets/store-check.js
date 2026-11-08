// Free store check: website or marketplace listing. Shows the report on the page
// and the worker emails a copy to the visitor (and a lead alert to Scott).
(() => {
  const form = document.querySelector('form.sc-form'); if (!form) return;
  const status = form.querySelector('.status'), button = form.querySelector('button[type=submit]'), result = document.getElementById('sc-result');
  const tabs = [...form.querySelectorAll('.sc-tab')], el = n => form.elements.namedItem(n);
  let mode = 'site', token = '', widgetId, loading = false, sending = false, submissionId;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));

  const setMode = m => {
    mode = m;
    tabs.forEach(t => { const on = t.dataset.mode === m; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; document.getElementById(t.getAttribute('aria-controls')).hidden = !on; });
    button.textContent = m === 'site' ? 'Check my store' : 'Check my listing';
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => setMode(t.dataset.mode));
    t.addEventListener('keydown', e => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length]; n.focus(); setMode(n.dataset.mode); } });
  });
  try {
    const q = new URLSearchParams(location.search);
    if (q.get('mode') === 'listing' || location.hash === '#listing') setMode('listing');
    const u = q.get('url'); if (u) { el('url').value = u.slice(0, 500); }
  } catch {}

  const mpOf = raw => { try { const h = new URL(/^https?:\/\//i.test(raw) ? raw : 'https://' + raw).hostname.toLowerCase().replace(/^www\./, ''); if (/(^|\.)amazon\.[a-z.]+$|^a\.co$|^amzn\.(to|eu)$/.test(h)) return 'amazon'; if (/(^|\.)walmart\.(ca|com)$/.test(h)) return 'walmart'; if (/(^|\.)bestbuy\.(ca|com)$/.test(h)) return 'bestbuy'; } catch {} return null; };
  const mpNames = {amazon: 'Amazon', walmart: 'Walmart', bestbuy: 'Best Buy'};
  const toListing = mp => { setMode('listing'); const r = form.querySelector(`[name=marketplace][value=${mp}]`); if (r) r.checked = true; status.textContent = `That’s a ${mpNames[mp]} link. ${mpNames[mp]} blocks automated checks, so paste the listing’s title and bullets here instead.`; el('title').focus(); };
  el('url').addEventListener('change', () => { const mp = mpOf(el('url').value.trim()); if (mp) toListing(mp); });
  el('url').addEventListener('paste', () => setTimeout(() => { const mp = mpOf(el('url').value.trim()); if (mp) toListing(mp); }, 0));

  const loadVerification = () => {
    if (loading) return; loading = true;
    const render = () => { widgetId = window.turnstile.render(form.querySelector('.sc-verify'), {sitekey: form.dataset.sitekey, action: 'store_check', theme: 'light', appearance: 'interaction-only', callback: t => { token = t; }, 'expired-callback': () => { token = ''; window.turnstile.reset(widgetId); }}); };
    if (window.turnstile) return render();
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'; s.async = true;
    s.onload = render; s.onerror = () => { status.textContent = 'Verification could not load. Please reload the page.'; };
    document.head.appendChild(s);
  };
  form.addEventListener('focusin', loadVerification, {once: true});
  form.addEventListener('input', () => { if (!sending) submissionId = undefined; });

  const waitForToken = async () => { for (let i = 0; i < 40 && !token; i++) await new Promise(r => setTimeout(r, 250)); return token; };
  const sevName = {high: 'High impact', med: 'Medium', low: 'Low'};
  const render = (r, emailed) => {
    const tone = r.score >= 75 ? 'good' : r.score >= 50 ? 'mid' : 'low';
    const bars = Object.entries(r.areas).filter(([, v]) => v !== null).map(([k, v]) => `<li class="${v >= 75 ? 'good' : v >= 50 ? 'mid' : 'low'}"><span>${esc(k)}</span><i style="--v:${v}%"></i><b>${v}</b></li>`).join('');
    const items = r.issues.map(i => `<li class="sc-issue ${esc(i.sev)}"><span class="sc-sev">${sevName[i.sev]} · ${esc(i.area)}</span><p>${esc(i.finding)}</p><p class="sc-fix"><strong>Fix:</strong> ${esc(i.fix)}</p></li>`).join('');
    const rw = r.rewrite ? `<div class="sc-rewrite"><p class="eyebrow">${esc(r.rewrite.label)}</p>${r.rewrite.before ? `<p class="sc-before">${esc(r.rewrite.before)}</p>` : ''}<p class="sc-after">${esc(r.rewrite.after)}</p>${(r.rewrite.bullets || []).length ? '<ul>' + r.rewrite.bullets.map(b => `<li>${esc(b)}</li>`).join('') + '</ul>' : ''}${r.rewrite.note ? `<p class="small muted">${esc(r.rewrite.note)}</p>` : ''}</div>` : '';
    result.innerHTML = `<div class="sc-report sc-live"><div class="sc-report-head"><div><p class="eyebrow">Your store check</p><h3>${esc(r.label)}</h3><p class="small muted">${emailed ? 'A copy is on its way to your inbox.' : 'We couldn’t email a copy, so save this page.'}</p></div><div class="sc-score ${tone}" aria-label="Overall score ${r.score} out of 100"><b>${r.score}</b><span>/100</span></div></div><ul class="sc-bars">${bars}</ul><p class="sc-summary">${esc(r.summary)}</p><ol class="sc-issues">${items || '<li class="sc-issue low"><p>No major issues found by the automated checks.</p></li>'}</ol>${rw}
      <div class="sc-next"><div><strong>Want these fixed for you?</strong><p class="small muted">Scott can rebuild the pages and listings for a fixed fee agreed up front.</p></div><div class="actions"><a class="btn" data-event="review_click" href="/booking.html?service=shopify&amp;package=store-rebuild#booking">Book a free call</a><a class="btn secondary" href="#rebuild">About the rebuild</a></div></div></div>`;
    result.hidden = false; result.focus({preventScroll: true}); result.scrollIntoView({behavior: 'smooth', block: 'start'});
  };

  form.addEventListener('submit', async e => {
    e.preventDefault(); if (sending) return;
    const email = el('email'), payload = {mode, email: email.value.trim(), consent: el('consent').checked, source_page: location.pathname, _gotcha: el('_gotcha').value};
    if (mode === 'site' && mpOf(el('url').value.trim())) { toListing(mpOf(el('url').value.trim())); return; }
    if (mode === 'site') {
      let u = el('url').value.trim(); if (u && !/^https?:\/\//i.test(u)) u = 'https://' + u;
      try { new URL(u); if (!/\./.test(new URL(u).hostname)) throw 0; } catch { status.textContent = 'Enter your store address, like https://yourstore.com.'; el('url').focus(); return; }
      payload.url = u;
    } else {
      payload.marketplace = form.querySelector('[name=marketplace]:checked')?.value;
      payload.title = el('title').value.trim(); payload.bullets = el('bullets').value; payload.description = el('description').value;
      payload.images = el('images').value; payload.rating = el('rating').value; payload.reviews = el('reviews').value;
      if (payload.title.length < 5) { status.textContent = 'Paste the listing title.'; el('title').focus(); return; }
    }
    if (!payload.email || !email.validity.valid) { status.textContent = 'Enter the email where you want the report.'; email.focus(); return; }
    if (!payload.consent) { status.textContent = 'Tick the box so we can email you the report.'; return; }
    if (payload._gotcha) return;
    sending = true; button.disabled = true; const label = button.textContent; button.textContent = 'Checking…';
    status.textContent = mode === 'site' ? 'Checking your store. This takes up to a minute…' : 'Checking your listing…';
    loadVerification();
    try {
      if (!await waitForToken()) throw {message: 'Please complete the quick verification, then press the button again.'};
      submissionId ||= crypto.randomUUID();
      const res = await fetch(form.dataset.endpoint, {method: 'POST', headers: {'Content-Type': 'application/json', Accept: 'application/json'}, body: JSON.stringify({...payload, turnstileToken: token, submissionId}), signal: AbortSignal.timeout(90000)});
      const out = await res.json().catch(() => null);
      if (out?.error === 'marketplace_url' && out.marketplace) { toListing(out.marketplace); throw {message: status.textContent}; }
      if (!res.ok || out?.ok !== true) { token = ''; window.turnstile?.reset(widgetId); throw {message: out?.message || (out?.error === 'verification_failed' ? 'Verification failed. Please try again.' : 'That didn’t work. Please try again, or email scott@simpleconsulting.ca.')}; }
      status.textContent = '';
      render(out.report, out.emailed);
      window.scTrack?.('generate_lead', {method: 'store_check', mode, page_path: location.pathname});
      token = ''; window.turnstile?.reset(widgetId);
    } catch (err) {
      status.textContent = err?.message || 'That didn’t work. Please try again.';
    } finally { sending = false; button.disabled = false; button.textContent = label; }
  });
})();
