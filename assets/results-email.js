// "Email me these results" on the free tools. Sends only the email address,
// the tool's own summary text and the optional tips choice.
(() => {
  document.querySelectorAll('form.results-email').forEach(form => {
    const status = form.querySelector('.status'), button = form.querySelector('button'), email = form.elements.namedItem('email');
    const tool = form.dataset.tool;
    let token = '', widgetId, loading = false, sending = false, submissionId;
    const loadVerification = () => {
      if (loading) return; loading = true;
      const render = () => { widgetId = window.turnstile.render(form.querySelector('.re-verify'), {sitekey: form.dataset.sitekey, action: 'results', theme: 'light', appearance: 'interaction-only', callback: t => { token = t; }, 'expired-callback': () => { token = ''; window.turnstile.reset(widgetId); }}); };
      if (window.turnstile) return render();
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'; script.async = true;
      script.onload = render; script.onerror = () => { status.textContent = 'Verification could not load. Please reload the page.'; };
      document.head.appendChild(script);
    };
    email.addEventListener('focus', loadVerification, {once: true});
    form.addEventListener('input', () => { if (!sending) submissionId = undefined; });
    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (sending) return;
      const summary = (window.scToolSummary?.[tool]?.() || '').trim();
      if (!summary) { status.textContent = 'Run the tool first, then send the results.'; return; }
      if (!email.value.trim() || !email.validity.valid) { status.textContent = 'Enter a valid email address.'; email.focus(); return; }
      if (form.elements.namedItem('_gotcha').value) return;
      loadVerification();
      if (!token) { status.textContent = 'One moment while we check this is not automated, then press Send again.'; return; }
      sending = true; button.disabled = true; button.textContent = 'Sending…'; status.textContent = '';
      submissionId ||= crypto.randomUUID();
      try {
        const res = await fetch(form.dataset.endpoint, {method: 'POST', headers: {'Content-Type': 'application/json', Accept: 'application/json'}, body: JSON.stringify({email: email.value.trim(), tool, summary: summary.slice(0, 6000), tips: form.elements.namedItem('tips').checked, source_page: location.pathname, _gotcha: '', turnstileToken: token, submissionId}), signal: AbortSignal.timeout(20000)});
        const out = await res.json().catch(() => null);
        if (!res.ok || out?.ok !== true) { if (out?.error === 'verification_failed') { token = ''; window.turnstile?.reset(widgetId); } throw new Error('not sent'); }
        form.classList.add('sent');
        status.textContent = 'Sent. Check your inbox in a minute or two.';
        button.textContent = 'Sent';
        window.scTrack?.('generate_lead', {method: 'tool', tool, page_path: location.pathname});
      } catch {
        status.textContent = 'That did not send. Please try again, or use “Discuss” to send it to Scott.';
        button.disabled = false; button.textContent = 'Send';
      } finally { sending = false; }
    });
  });
})();
