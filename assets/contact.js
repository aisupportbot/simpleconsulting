(() => {
  const form = document.getElementById('leadform');
  if (!form) return;
  form.noValidate = true;
  const field = n => form.elements.namedItem(n);
  const status = document.getElementById('send-status');
  const button = document.getElementById('send-button');
  const services = {amazon:'Amazon account',walmart:'Walmart channel',reimbursement:'reimbursement records',operations:'inventory and fulfilment',shopify:'Shopify store',fractional:'e-commerce priorities',systems:'systems and reporting',google:'Google Ads'};
  const params = new URLSearchParams(location.search);
  const key = params.get('service') || params.get('src') || form.dataset.service;
  if (Object.hasOwn(services, key)) {
    field('channel').value = key;
    if (document.getElementById('contact-heading')) document.getElementById('contact-heading').textContent = 'Let’s talk about your ' + services[key] + '.';
    if (document.getElementById('contact-intro')) document.getElementById('contact-intro').textContent = 'Describe what you would like help with, or book a free 30-minute call with Scott. Tell me what is happening and we will work out a useful next step.';
  }
  let source = location.pathname;
  if (Object.hasOwn(services, key)) source += ' | service: ' + key;
  try { const ref = new URL(document.referrer); if (ref.origin === location.origin) source += ' | from: ' + ref.pathname; } catch {}
  for (const [name, value] of Object.entries(window.scCampaign || {})) source += ' | ' + name + ': ' + value;
  field('source_page').value = source;
  try {
    const transfer = JSON.parse(sessionStorage.getItem('sc-assessment-transfer') || 'null');
    if (transfer && typeof transfer.summary === 'string' && transfer.summary.length <= 10000 && Array.isArray(transfer.channels)) {
      field('message').value = transfer.summary;
      field('channel').value = transfer.channels.length === 1 && ['amazon','walmart'].includes(transfer.channels[0]) ? transfer.channels[0] : transfer.channels.length > 1 ? 'both' : '';
      sessionStorage.removeItem('sc-assessment-transfer');
      document.getElementById('copy-status').textContent = 'Your assessment summary is ready below. Add your contact details or copy it into your booking notes.';
    }
  } catch {}
  try {
    const tool = JSON.parse(sessionStorage.getItem('sc-tool-transfer') || 'null');
    if (tool && typeof tool.summary === 'string' && tool.summary.length <= 10000) {
      field('message').value = field('message').value.trim() ? field('message').value.trim()+'\n\n'+tool.summary : tool.summary;
      if (typeof tool.service === 'string' && ['amazon','walmart','reimbursement','operations','shopify','fractional','systems','google'].includes(tool.service)) field('channel').value = tool.service;
      sessionStorage.removeItem('sc-tool-transfer');
      document.getElementById('copy-status').textContent = 'Your tool results are ready below. Add your contact details, review the message and press Send when ready.';
    }
  } catch {}
  let attempted = false, sending = false, completed = false;
  function validateOne(name) {
    const el = field(name);
    const valid = name === 'email' ? Boolean(el.value.trim()) && el.validity.valid : name === 'message' ? el.value.trim().length >= 5 : Boolean(el.value.trim());
    el.setAttribute('aria-invalid', String(!valid));
    const err = document.getElementById(name+'-error'); err.hidden=valid;
    if (!valid) el.setAttribute('aria-describedby',err.id); else el.removeAttribute('aria-describedby');
    return valid;
  }
  ['name','email','message'].forEach(n => field(n).addEventListener('input', () => { if(attempted) validateOne(n); }));
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (sending || completed) return;
    attempted = true;
    const valid = ['name','email','message'].map(validateOne);
    if (valid.includes(false)) { field(['name','email','message'][valid.indexOf(false)]).focus(); return; }
    if (field('_gotcha').value) return;
    sending=true;button.disabled=true;button.textContent='Sending…';status.textContent='';status.classList.remove('error');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(form.action,{method:'POST',body:new FormData(form),headers:{Accept:'application/json'},signal:controller.signal});
      if(!response.ok) throw new Error('Submission not accepted');
      completed=true;
      form.hidden=true;
      const success=document.getElementById('form-success');success.hidden=false;success.focus();
      window.scTrack?.('generate_lead',{method:'form',service: Object.hasOwn(services,field('channel').value)?field('channel').value:'other',page_path:location.pathname});
    } catch {
      status.classList.add('error');
      status.textContent='We could not confirm submission. Your message is still here. Copy it below and email scott@simpleconsulting.ca, or try again.';
      button.disabled=false;button.textContent='Send message';
    } finally {clearTimeout(timer);sending=false;}
  });
  document.getElementById('copy-enquiry').addEventListener('click',async()=>{
    const selected=field('channel').selectedOptions[0]?.textContent || '';
    const text='Name: '+field('name').value+'\nEmail: '+field('email').value+'\nService: '+selected+'\n\n'+field('message').value;
    const copyStatus=document.getElementById('copy-status');
    try {await navigator.clipboard.writeText(text);copyStatus.textContent='Enquiry copied. You can paste it into an email or your booking notes.';}
    catch {const fallback=document.getElementById('copy-fallback');fallback.hidden=false;fallback.value=text;fallback.focus();fallback.select();copyStatus.textContent='Select and copy the enquiry below.';}
  });
  const calendarButton=document.getElementById('load-calendar'),slot=document.getElementById('calendar-slot');
  let calendarCounted=false, calendarLoading=false, calendarLoaded=false;
  async function openCalendar() {
    if (!slot || calendarLoading) return;
    if (calendarLoaded) {
      slot.hidden=!slot.hidden;
      calendarButton.textContent=slot.hidden?'Choose a time':'Hide the calendar';
      calendarButton.setAttribute('aria-expanded',String(!slot.hidden));
      return;
    }
    calendarLoading=true; slot.hidden=false;
    calendarButton.disabled=true;
    const calendarStatus=document.getElementById('calendar-status');
    calendarStatus.textContent='Loading available times…';
    try {
      if (!window.Calendly?.initInlineWidget) await new Promise((resolve,reject)=>{
        const script=document.createElement('script');
        script.src='https://assets.calendly.com/assets/external/widget.js';
        const timeout=setTimeout(()=>reject(new Error('Calendar timeout')),15000);
        script.onload=()=>{clearTimeout(timeout);resolve();};
        script.onerror=()=>{clearTimeout(timeout);reject(new Error('Calendar failed'));};
        document.head.appendChild(script);
      });
      if (!window.Calendly?.initInlineWidget) throw new Error('Calendar unavailable');
      // The official widget enables confirmed scheduling events. No typed form data is forwarded.
      const calendarUrl=new URL(document.getElementById('calendar-direct').href);
      for (const [name,value] of Object.entries(window.scCampaign || {})) calendarUrl.searchParams.set(name,value);
      window.Calendly.initInlineWidget({url:calendarUrl.href,parentElement:slot,resize:true});
      calendarLoaded=true;
      calendarButton.textContent='Hide the calendar';
      calendarButton.setAttribute('aria-expanded','true');
      calendarStatus.textContent='Choose a time below. If the calendar does not display, use the link to open Calendly in a new tab.';
      window.scTrack?.('booking_open',{method:'embed',page_path:location.pathname});
    } catch {
      slot.hidden=true;
      calendarStatus.textContent='The calendar could not load. Open Calendly in a new tab using the link above, or send a message.';
    } finally {calendarLoading=false;calendarButton.disabled=false;}
  }
  calendarButton?.addEventListener('click',openCalendar);
  if (calendarButton && location.hash==='#booking') openCalendar();
  addEventListener('hashchange',()=>{if(calendarButton && location.hash==='#booking' && !calendarLoaded) openCalendar();});
  const panel=document.getElementById('assessment-panel'),frame=document.getElementById('assessment-frame');
  function openAssessment(){panel.open=true;frame.hidden=false;if(!frame.getAttribute('src')) {frame.src=frame.dataset.src;window.scTrack?.('assessment_start',{page_path:location.pathname});}}
  panel?.addEventListener('toggle',()=>{if(panel.open)openAssessment();});
  const fromHash=()=>{if(panel && location.hash==='#assessment')openAssessment();};
  addEventListener('hashchange',fromHash);fromHash();
  let previousSummary='';
  addEventListener('message',e=>{
    let calData=e.data;
    if (typeof calData==='string') { try { calData=JSON.parse(calData); } catch { calData=null; } }
    const calFrame=slot?.querySelector('iframe');
    let fromWidget=false;
    if (calFrame && e.source) {
      if (e.source===calFrame.contentWindow) fromWidget=true;
      else { try { fromWidget=e.source.parent===calFrame.contentWindow; } catch { fromWidget=false; } }
    }
    if (calendarLoaded && e.origin==='https://calendly.com' && fromWidget && calData?.event==='calendly.event_scheduled' && !calendarCounted) {
      calendarCounted=true;
      let already=false;
      try { already=sessionStorage.getItem('sc-appointment-tracked')==='1'; } catch {}
      if (!already) {
        try { sessionStorage.setItem('sc-appointment-tracked','1'); } catch {}
        // Do not forward Calendly's payload. It can identify the invitee.
        window.scTrack?.('generate_lead',{method:'calendar',service:Object.hasOwn(services,key)?key:'other',page_path:location.pathname});
      }
      return;
    }
    if(!frame || e.origin!==location.origin || e.source!==frame.contentWindow) return;
    const data=e.data;
    if(!data || typeof data!=='object')return;
    if(data.type==='simple-assessment-resize'){
      if(Number.isFinite(data.height)&&data.height>=200&&data.height<=6000)frame.style.height=Math.ceil(data.height+2)+'px';
      return;
    }
    if(data.type!=='simple-assessment-result'||!['book','message'].includes(data.action)||typeof data.summary!=='string'||data.summary.length>10000||!Array.isArray(data.channels)||!data.channels.length||data.channels.some(k=>!['amazon','walmart'].includes(k)))return;
    const text=field('message').value;
    field('message').value=previousSummary&&text.includes(previousSummary)?text.replace(previousSummary,data.summary):text.trim()?text+'\n\n'+data.summary:data.summary;
    previousSummary=data.summary;
    field('channel').value=data.channels.length===1?data.channels[0]:'both';
    window.scTrack?.('assessment_complete',{next_step:data.action,page_path:location.pathname});
    if(completed){form.hidden=false;document.getElementById('form-success').hidden=true;completed=false;button.disabled=false;button.textContent='Send message';}
    const target=document.getElementById(data.action==='book'?'booking':'start');
    const message='Your summary is in the message form. '+(data.action==='book'?'You can copy it into your Calendly notes when booking.':'Add your contact details, review the message and press Send when ready.');
    document.getElementById('copy-status').textContent=message;
    target.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
    if(data.action==='message')field('name').focus({preventScroll:true});
  });
})();
