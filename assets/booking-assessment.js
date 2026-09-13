(() => {
 const panel=document.getElementById('assessment-panel'),frame=document.getElementById('assessment-frame');
 const form=document.getElementById('leadform');
 if(!panel||!frame||!form)return;
 function openAssessment(){panel.open=true;if(!frame.getAttribute('src'))frame.src=frame.dataset.src;}
 panel.addEventListener('toggle',()=>{if(panel.open)openAssessment();});
 document.querySelectorAll('[data-open-assessment]').forEach(a=>a.addEventListener('click',openAssessment));
 const fromHash=()=>{if(location.hash==='#assessment')openAssessment();};
 addEventListener('hashchange',fromHash);fromHash();
 let previousSummary='';
 addEventListener('message',event=>{
  if(event.origin!==location.origin||event.source!==frame.contentWindow)return;
  const data=event.data;
  if(!data||typeof data!=='object')return;
  if(data.type==='simple-assessment-resize'){
   if(Number.isFinite(data.height)&&data.height>=200&&data.height<=4000)frame.style.height=Math.ceil(data.height+2)+'px';
   return;
  }
  if(data.type!=='simple-assessment-result'||!['book','message'].includes(data.action)||typeof data.summary!=='string'||data.summary.length>10000||!Array.isArray(data.channels)||!data.channels.length||data.channels.some(k=>!['amazon','walmart'].includes(k)))return;
  const message=form.elements.namedItem('message'),channel=form.elements.namedItem('channel');
  const text=message.value;
  message.value=previousSummary&&text.includes(previousSummary)?text.replace(previousSummary,data.summary):text.trim()?text+'\n\n'+data.summary:data.summary;
  previousSummary=data.summary;
  channel.value=data.channels.length===2?'Both Amazon and Walmart':data.channels[0]==='walmart'?'Walmart Marketplace / WFS':data.summary.includes('Vendor Central')&&!data.summary.includes('Seller Central')&&!data.summary.includes('FBA')?'Amazon — Vendor Central':'Amazon — Seller Central / FBA';
  document.dispatchEvent(new Event('assessment:prefill'));
  const target=document.getElementById(data.action==='book'?'booking':'start');
  let status=target.querySelector('.review-success');
  if(!status){status=document.createElement('p');status.className='review-success';status.setAttribute('role','status');target.prepend(status);}
  status.textContent=data.action==='book'?'Your assessment summary has been added to the booking notes. Choose a time below.':'Your assessment summary has been added below. Add your contact details, review the message and send when ready.';
  target.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
  if(data.action==='message')form.elements.namedItem('name').focus({preventScroll:true});
 });
 document.getElementById('copy-enquiry').addEventListener('click',async()=>{
  const v=n=>form.elements.namedItem(n).value;
  const body='Name: '+v('name')+'\nEmail: '+v('email')+'\nChannel: '+v('channel')+'\n\n'+v('message');
  const status=document.getElementById('copy-status');
  try{await navigator.clipboard.writeText(body);status.textContent='Enquiry copied. You can email it to scott@simpleconsulting.ca.';}
  catch{const fallback=document.getElementById('copy-fallback');fallback.value=body;fallback.hidden=false;fallback.focus();fallback.select();status.textContent='Select and copy the enquiry below, then email scott@simpleconsulting.ca.';}
 });
})();
