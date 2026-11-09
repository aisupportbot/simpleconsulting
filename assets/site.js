(() => {
  const menu = document.querySelector('.mobile-menu');
  if (menu) {
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && menu.open) { menu.open = false; menu.querySelector('summary').focus(); } });
    document.addEventListener('click', e => { if (!menu.contains(e.target)) menu.open = false; });
    menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => { menu.open = false; }));
  }
  // Only these non-personal campaign labels are retained, in this tab for 30 minutes.
  const campaignValues = {
    utm_source: ['google', 'bing', 'linkedin', 'instagram', 'ig', 'newsletter'],
    utm_medium: ['cpc', 'organic', 'referral', 'email', 'social', 'bio', 'story', 'reel'],
    utm_campaign: /^[a-z0-9]+(?:[-_][a-z0-9]+){0,8}$/
  };
  const campaignAllowed = (rule, value) => !!value && value.length <= 64 && (rule instanceof RegExp ? rule.test(value) : rule.includes(value));
  const cleanCampaign = data => Object.fromEntries(Object.entries(campaignValues).filter(([k, rule]) => campaignAllowed(rule, data?.[k])).map(([k]) => [k, data[k]]));
  let campaign = {};
  try {
    const saved = JSON.parse(sessionStorage.getItem('sc-campaign') || 'null');
    if (saved && saved.expires > Date.now()) campaign = cleanCampaign(saved.values);
    else sessionStorage.removeItem('sc-campaign');
  } catch {}
  const incoming = cleanCampaign(Object.fromEntries(new URLSearchParams(location.search)));
  if (Object.keys(incoming).length) {
    campaign = incoming;
    try { sessionStorage.setItem('sc-campaign', JSON.stringify({values:campaign,expires:Date.now()+30*60*1000})); } catch {}
  }
  window.scCampaign = Object.freeze(campaign);
  // The shared page template installs the Google Ads tag.
  // These event payloads contain no names, emails or message text.
  window.scTrack = (name, props = {}) => {
    document.dispatchEvent(new CustomEvent('simple:analytics', {detail: {event: name, ...campaign, ...props}}));
    if (typeof window.gtag === 'function') {
      const analyticsEvent = name === 'generate_lead' && props.method === 'calendar' ? 'appointment_booked' : name;
      // Route engagement events to GA4 only; the dedicated Ads action stays separate.
      const safeProps = {page_path: location.pathname};
      const allowed = {
        method: ['form', 'calendar', 'direct', 'embed', 'tool', 'store_check'],
        mode: ['site', 'listing'],
        sales_band: ['pre', 'lt10k', '10-50k', '50-250k', '250k+'],
        timeline: ['asap', '1m', '1-3m', 'exploring'],
        service: ['amazon', 'walmart', 'reimbursement', 'operations', 'shopify', 'fractional', 'systems', 'google', 'other'],
        next_step: ['book', 'message'],
        tool: ['amazon_readiness', 'launch_margin', 'reimbursement_checklist', 'fba_wfs']
      };
      for (const [key, values] of Object.entries(allowed)) {
        if (values.includes(props[key])) safeProps[key] = props[key];
      }
      window.gtag('event', analyticsEvent, {...campaign, ...safeProps, send_to: 'G-0DL10SRED9'});
      // This conversion action is specifically for accepted contact-form enquiries.
      // contact.js emits it only after Formspree succeeds and prevents duplicates.
      // There is no separate booking label in this repo. A confirmed appointment is
      // appointment_booked on GA4 property G-0DL10SRED9, which Ads can import.
      // Store check leads get their own GA4 event so they can be imported into
      // Google Ads as a separate, lower-value lead conversion.
      if (name === 'generate_lead' && props.method === 'store_check') {
        window.gtag('event', 'store_check_lead', {...campaign, ...safeProps, value: 0.5, currency: 'CAD', send_to: 'G-0DL10SRED9'});
      }
      if (name === 'generate_lead' && props.method === 'form') {
        // Weight the enquiry by stated business size so Ads bidding favours
        // enquiries that are more likely to become ongoing clients.
        const leadValue = {pre: 0.5, lt10k: 1, '10-50k': 2, '50-250k': 4, '250k+': 6}[props.sales_band] || 1;
        window.gtag('event', 'conversion', {
          send_to: 'AW-18519722703/E1iQCLaD4aAdEM-V8v5E',
          value: leadValue,
          currency: 'CAD'
        });
      }
    }
  };
  // A new-tab Calendly booking can be counted when the event type redirects here
  // with ?appointment_booked=1. The value must be exactly "1". Nothing else in the
  // query string is copied into the event.
  try {
    const bookingParams = new URLSearchParams(location.search);
    if (bookingParams.get('appointment_booked') === '1') {
      let already = false;
      try { already = sessionStorage.getItem('sc-appointment-tracked') === '1'; } catch {}
      if (!already) {
        try { sessionStorage.setItem('sc-appointment-tracked', '1'); } catch {}
        const bookedService = bookingParams.get('service') || '';
        const bookedProps = {method: 'calendar', page_path: location.pathname};
        if (['amazon','walmart','reimbursement','operations','shopify','fractional','systems','google','other'].includes(bookedService)) bookedProps.service = bookedService;
        window.scTrack('generate_lead', bookedProps);
      }
      bookingParams.delete('appointment_booked');
      const rest = bookingParams.toString();
      history.replaceState(null, '', location.pathname + (rest ? '?' + rest : '') + location.hash);
    }
  } catch {}
  // Paid diagnostic: Stripe redirects to /diagnostic-confirmed.html?session_id=…
  // Record one GA4 purchase per checkout session (import it into Google Ads).
  try {
    if (location.pathname === '/diagnostic-confirmed.html') {
      const sid = new URLSearchParams(location.search).get('session_id') || '';
      // Only a real Stripe checkout session counts; visiting the page directly does not.
      const valid = /^cs_[A-Za-z0-9_]{8,200}$/.test(sid);
      const key = 'sc-purchase-' + sid;
      let seen = false; try { seen = localStorage.getItem(key) === '1'; } catch {}
      if (valid && !seen && typeof window.gtag === 'function') {
        try { localStorage.setItem(key, '1'); } catch {}
        window.gtag('event', 'purchase', {...campaign, transaction_id: sid, value: 750, currency: 'CAD', items: [{item_id: 'channel-diagnostic', item_name: 'Channel diagnostic', price: 750, quantity: 1}], send_to: 'G-0DL10SRED9'});
      }
      if (sid) history.replaceState(null, '', location.pathname);
    }
  } catch {}
  document.querySelectorAll('[data-event]').forEach(a => a.addEventListener('click', () => window.scTrack(a.dataset.event, {page_path: location.pathname})));
  document.querySelectorAll('a[href^="mailto:"]').forEach(a => {
    if (!a.dataset.event) a.addEventListener('click', () => window.scTrack('email_click', {page_path: location.pathname}));
  });
  document.querySelectorAll('a[href*="calendly.com"]').forEach(a => {
    if (!a.dataset.event) a.addEventListener('click', () => window.scTrack('booking_open', {method:'direct',page_path:location.pathname}));
  });
  const search = document.getElementById('article-search');
  if (search) {
    const buttons = [...document.querySelectorAll('[data-filter]')];
    const cards = [...document.querySelectorAll('#post-grid .post-card')];
    const previous = document.getElementById('previous-articles');
    const next = document.getElementById('next-articles');
    const clear = document.getElementById('clear-filters');
    const pageSize = 12;
    let tag = 'all', page = 1;
    const readState = () => {
      const params = new URLSearchParams(location.search);
      tag = buttons.some(b => b.dataset.filter === params.get('topic')) ? params.get('topic') : 'all';
      search.value = (params.get('q') || '').slice(0, 150);
      page = Math.max(1, parseInt(params.get('page'), 10) || 1);
    };
    const apply = () => {
      const query = search.value.trim().toLowerCase();
      const matches = cards.filter(card => (tag === 'all' || card.dataset.tag === tag) && card.textContent.toLowerCase().includes(query));
      const pages = Math.max(1, Math.ceil(matches.length / pageSize));
      page = Math.min(page, pages);
      const visible = new Set(matches.slice((page - 1) * pageSize, page * pageSize));
      const before = new Set(cards.filter(c => !c.hidden));
      cards.forEach(card => { card.hidden = !visible.has(card); });
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) [...visible].forEach((card, k) => { if ((!before.has(card) || before.size !== visible.size) && card.animate) card.animate([{opacity: 0, transform: 'translateY(10px) scale(.985)'}, {opacity: 1, transform: 'none'}], {duration: 380, delay: Math.min(k, 8) * 35, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards'}); });
      buttons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.filter === tag)));
      const count = matches.length;
      document.getElementById('filter-status').textContent = count > pageSize ? ((page - 1) * pageSize + 1) + '–' + Math.min(page * pageSize, count) + ' of ' + count + ' articles' : count + ' article' + (count === 1 ? '' : 's');
      document.getElementById('no-articles').hidden = count !== 0;
      document.getElementById('article-pagination').hidden = pages <= 1;
      document.getElementById('article-page-status').textContent = 'Page ' + page + ' of ' + pages;
      previous.disabled = page === 1; next.disabled = page === pages;
      clear.hidden = !query && tag === 'all';
    };
    const saveState = (push = false) => {
      const u = new URL(location.href);
      [['topic',tag === 'all' ? '' : tag],['q',search.value.trim()],['page',page > 1 ? String(page) : '']].forEach(([key,value]) => value ? u.searchParams.set(key,value) : u.searchParams.delete(key));
      if (u.href !== location.href) history[push ? 'pushState' : 'replaceState'](null, '', u);
    };
    buttons.forEach(button => button.addEventListener('click', () => {
      tag = button.dataset.filter; page = 1; apply(); saveState(true);
    }));
    search.addEventListener('input', () => { page = 1; apply(); saveState(); });
    clear.addEventListener('click', () => { tag = 'all'; page = 1; search.value = ''; apply(); saveState(true); search.focus(); });
    const changePage = delta => {
      page += delta; apply(); saveState(true);
      const first = cards.find(card => !card.hidden);
      if (first) first.focus();
    };
    previous.addEventListener('click', () => changePage(-1));
    next.addEventListener('click', () => changePage(1));
    addEventListener('popstate', () => { readState(); apply(); });
    readState(); apply();
  }
})();

// 2026 refresh: flowing line in page heroes and a gentle reveal on scroll.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ns = 'http://www.w3.org/2000/svg';
  document.querySelectorAll('.page-hero, .hero').forEach(hero => {
    if (hero.querySelector('.hero-flow, .motion-stage')) return;
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'hero-flow'); svg.setAttribute('viewBox', '0 0 1440 90');
    svg.setAttribute('preserveAspectRatio', 'none'); svg.setAttribute('aria-hidden', 'true');
    const d1 = 'M0 70 C240 70 300 30 520 30 S860 62 1040 50 1300 18 1440 26';
    const d2 = 'M0 84 C300 84 420 56 700 60 S1120 84 1440 64';
    [['fl', d1], ['fl', d2], ['fp', d1], ['fp d2', d2]].forEach(([c, d]) => {
      const p = document.createElementNS(ns, 'path'); p.setAttribute('class', c); p.setAttribute('d', d);
      p.setAttribute('vector-effect', 'non-scaling-stroke'); p.setAttribute('pathLength', '1000'); svg.append(p);
    });
    hero.prepend(svg);
  });
  if (reduce || !('IntersectionObserver' in window)) return;
  const els = document.querySelectorAll('main .card, main .post-card, main .topic-card, main .case-card, main .start-step, main .section-heading, main .service-content > section, main .callout, main .related-service');
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('sc-in'); io.unobserve(e.target); } }), {threshold: .08, rootMargin: '0px 0px -40px 0px'});
  els.forEach(el => { if (el.getBoundingClientRect().top > innerHeight) { el.classList.add('sc-reveal'); io.observe(el); } });
})();

// Features from the design update: process graphic, service search, reading progress.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const copy = ['Understand the issue, your current setup and the records available.',
    'Agree on the priorities, responsibilities and next steps before work begins.',
    'Carry out the agreed work, share progress and review what needs attention next.'];
  document.querySelectorAll('.workflow').forEach(w => {
    const steps = [...w.querySelectorAll('.workflow-step')], text = w.querySelector('.workflow-copy');
    let i = 0, timer;
    const go = n => { i = n; steps.forEach((b, k) => b.setAttribute('aria-pressed', String(k === n))); w.dataset.stage = n; text.textContent = copy[n]; };
    const auto = () => { clearInterval(timer); if (!reduce) timer = setInterval(() => go((i + 1) % 3), 4500); };
    steps.forEach((b, k) => b.addEventListener('click', () => { go(k); auto(); }));
    if (reduce) w.classList.add('paused'); else auto();
  });
  const services = [...document.querySelectorAll('details.service')];
  services.forEach(d => d.addEventListener('toggle', () => { if (d.open) services.forEach(x => { if (x !== d) x.open = false; }); }));
  const search = document.getElementById('service-search');
  if (search) {
    const status = document.getElementById('service-search-status'), empty = document.getElementById('service-search-empty');
    search.addEventListener('input', () => {
      const q = search.value.trim().toLowerCase(); let n = 0;
      services.forEach(s => { const hit = !q || s.textContent.toLowerCase().includes(q); s.hidden = !hit; if (hit) n++; });
      status.textContent = n + ' service' + (n === 1 ? '' : 's'); empty.hidden = n > 0;
    });
  }
  if (document.querySelector('.article-shell')) {
    const bar = document.createElement('div'); bar.className = 'read-progress'; bar.setAttribute('aria-hidden', 'true'); bar.innerHTML = '<i></i>';
    document.body.append(bar);
    const update = () => { const total = document.documentElement.scrollHeight - innerHeight; bar.firstChild.style.width = (total > 0 ? Math.min(100, scrollY / total * 100) : 0) + '%'; };
    addEventListener('scroll', update, {passive: true}); update();
  }
})();


// Motion for remaining features: checklist progress rings and count-up numbers.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  [['reimbursement-progress', 'reviewed'], ['amazon-readiness-score', 'ready']].forEach(([id, word]) => {
    const text = document.getElementById(id); if (!text) return;
    const ring = document.createElement('div'); ring.className = 'progress-ring'; ring.setAttribute('aria-hidden', 'true');
    ring.innerHTML = '<svg viewBox="0 0 64 64"><circle class="pr-bg" cx="32" cy="32" r="27"/><circle class="pr-fg" cx="32" cy="32" r="27" pathLength="100"/></svg><span class="pr-pct">0%</span><span class="pr-check"></span>';
    const wrap = document.createElement('div'); wrap.className = 'progress-wrap';
    text.parentNode.insertBefore(wrap, text); wrap.append(ring, text);
    const fg = ring.querySelector('.pr-fg'), pct = ring.querySelector('.pr-pct');
    let last = -1;
    const sync = () => {
      const m = text.textContent.match(/(\d+)\s+of\s+(\d+)/); if (!m) return;
      const v = Math.round(+m[1] / +m[2] * 100);
      fg.style.strokeDasharray = v + ' 100'; pct.textContent = v + '%';
      ring.classList.toggle('complete', v === 100);
      if (last >= 0 && v !== last && !reduce && ring.animate) ring.animate([{transform: 'scale(1)'}, {transform: 'scale(1.06)'}, {transform: 'scale(1)'}], {duration: 320, easing: 'ease-out'});
      last = v;
    };
    new MutationObserver(sync).observe(text, {childList: true, characterData: true, subtree: true}); sync();
    const form = text.closest('.tool-grid')?.querySelector('form');
    form?.addEventListener('change', e => { const row = e.target.closest('label'); if (row && !reduce && row.animate) row.animate([{background: '#f3f4f6'}, {background: 'transparent'}], {duration: 600, easing: 'ease-out'}); });
  });
  const counters = document.querySelectorAll('main [data-count]');
  if (counters.length) {
    const run = el => { const end = +el.dataset.count; if (reduce) { el.textContent = end; return; } const t0 = performance.now(); const tick = t => { const p = Math.min((t - t0) / 1200, 1); el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(tick); }; el.textContent = '0'; requestAnimationFrame(tick); };
    if (!('IntersectionObserver' in window)) { counters.forEach(el => { el.textContent = el.dataset.count; }); }
    else { const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } }), {threshold: .6});
    counters.forEach(el => io.observe(el)); }
  }
})();
