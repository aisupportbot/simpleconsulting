(() => {
  const menu = document.querySelector('.mobile-menu');
  if (menu) {
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && menu.open) { menu.open = false; menu.querySelector('summary').focus(); } });
    document.addEventListener('click', e => { if (!menu.contains(e.target)) menu.open = false; });
    menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => { menu.open = false; }));
  }
  // Only these non-personal campaign labels are retained, in this tab for 30 minutes.
  const campaignValues = {
    utm_source: ['google', 'bing', 'linkedin', 'newsletter'],
    utm_medium: ['cpc', 'organic', 'referral', 'email', 'social'],
    utm_campaign: ['amazon-management', 'walmart-management', 'inventory-fulfilment', 'marketplace-guides']
  };
  const cleanCampaign = data => Object.fromEntries(Object.entries(campaignValues).filter(([k, values]) => values.includes(data?.[k])).map(([k]) => [k, data[k]]));
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
  // Optional analytics hook only: no tracker or identifier is installed here.
  // No names, emails, message text, or URL query strings enter analytics.
  window.scTrack = (name, props = {}) => {
    document.dispatchEvent(new CustomEvent('simple:analytics', {detail: {event: name, ...campaign, ...props}}));
    if (typeof window.gtag === 'function') window.gtag('event', name, {...campaign, ...props});
  };
  document.querySelectorAll('[data-event]').forEach(a => a.addEventListener('click', () => window.scTrack(a.dataset.event, {page_path: location.pathname})));
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
      cards.forEach(card => { card.hidden = !visible.has(card); });
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
