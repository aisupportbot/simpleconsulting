(() => {
  const menu = document.querySelector('.mobile-menu');
  if (menu) {
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && menu.open) { menu.open = false; menu.querySelector('summary').focus(); } });
    document.addEventListener('click', e => { if (!menu.contains(e.target)) menu.open = false; });
    menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => { menu.open = false; }));
  }
  // Optional analytics hook only: no tracker or identifier is installed here.
  // No names, emails, message text, or URL query strings enter analytics.
  window.scTrack = (name, props = {}) => {
    document.dispatchEvent(new CustomEvent('simple:analytics', {detail: {event: name, ...props}}));
    if (typeof window.gtag === 'function') window.gtag('event', name, props);
  };
  document.querySelectorAll('[data-event]').forEach(a => a.addEventListener('click', () => window.scTrack(a.dataset.event, {page_path: location.pathname})));
  const search = document.getElementById('article-search');
  if (search) {
    let tag = 'all';
    const buttons = [...document.querySelectorAll('[data-filter]')];
    const cards = [...document.querySelectorAll('#post-grid .post-card')];
    const apply = () => {
      const query = search.value.trim().toLowerCase();
      let count = 0;
      cards.forEach(card => {
        const show = (tag === 'all' || card.dataset.tag === tag) && card.textContent.toLowerCase().includes(query);
        card.hidden = !show; if (show) count++;
      });
      document.getElementById('filter-status').textContent = count + ' article' + (count === 1 ? '' : 's');
      document.getElementById('no-articles').hidden = count !== 0;
    };
    buttons.forEach(button => button.addEventListener('click', () => {
      tag = button.dataset.filter;
      buttons.forEach(b => b.setAttribute('aria-pressed', String(b === button)));
      apply();
    }));
    search.addEventListener('input', apply);
    apply();
  }
})();
