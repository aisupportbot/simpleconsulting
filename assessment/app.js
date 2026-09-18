import { CHANNELS, PROGRAMS, STAGES, TIMING, ISSUES, BOOKING_URL, EMAIL, RECOVERY_NOTE, freshState, cleanState, assess } from './logic.js';
const key = 'simple-consulting-website-assessment-v1';
const flow = document.getElementById('flow');
let state = freshState();
try { state = cleanState(JSON.parse(sessionStorage.getItem(key))); } catch { /* Storage is optional. */ }
const esc = value => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const store = () => { try { sessionStorage.setItem(key, JSON.stringify(state)); } catch { /* Continue in memory. */ } };
const icon = '<svg class="market-symbol" viewBox="0 0 32 28" fill="none" aria-hidden="true"><path d="M5 12v12h22V12M3 8l3-5h20l3 5v4c-2 2-5 2-7 0-2 2-5 2-7 0-2 2-5 2-7 0-2 2-5 2-5 0V8Z" stroke="currentColor" stroke-width="1.3"/><path d="M13 24v-8h7v8M3 8h26" stroke="currentColor" stroke-width="1.3"/></svg>';
function option({id, name, value, checked, type='checkbox', classes='', body}) {
  return `<label class="option ${classes}" for="${id}"><input id="${id}" type="${type}" name="${name}" value="${value}" ${checked ? 'checked' : ''}><span class="choice">${body}</span></label>`;
}
const check = '<span class="check" aria-hidden="true"></span>';
function top(step) { return `<div class="step-top"><span class="step-label">STEP 0${step + 1} OF 03</span><button class="reset" id="reset">Start over</button></div>`; }
function channelView() {
  return `${top(0)}<h2 id="step-title" tabindex="-1">Where do you sell?</h2><p class="section-sub" id="channel-help">Choose the channels you use or plan to launch. You can select both.</p>
    <div class="channel-grid" role="group" aria-label="Choose channels" aria-describedby="channel-help channel-error">${Object.keys(CHANNELS).map(k => option({id:'channel-'+k,name:'channel',value:k,checked:state.channels.includes(k),classes:'channel',body:icon+check+`<span><span class="channel-title">${CHANNELS[k]}</span><span class="channel-desc">${k==='amazon'?'Seller Central, Vendor Central<br>and Fulfillment by Amazon':'Walmart Marketplace<br>and Walmart Fulfillment Services'}</span></span>`})).join('')}</div>
    <div id="program-details"></div>
    <div class="stage-row"><label class="field-label" for="stage">Where is your business today?</label><select id="stage">${Object.entries(STAGES).map(([k,n])=>`<option value="${k}" ${k===state.stage?'selected':''}>${n}</option>`).join('')}</select></div>
    <p class="error" id="channel-error" role="alert"></p>
    <div class="actions"><p class="small">Your answers stay in this tab until you choose to share them.</p><button class="primary" id="continue">Continue <span aria-hidden="true">→</span></button></div>`;
}
function renderPrograms() {
  const target = document.getElementById('program-details');
  if (!target) return;
  target.innerHTML = state.channels.length ? `<div class="details-panel">${state.channels.map(k=>`<div class="detail-group"><p class="detail-title">${CHANNELS[k]} setup <span>· Optional — select what applies</span></p><div class="chips" role="group" aria-label="${CHANNELS[k]} setup">${Object.entries(PROGRAMS[k]).map(([p,n])=>option({id:k+'-'+p,name:'program-'+k,value:p,checked:state.programs[k].includes(p),classes:'chip',body:check+esc(n)})).join('')}</div></div>`).join('')}</div>` : '';
}
function needsView() {
  return `${top(1)}<h2 id="step-title" tabindex="-1">What needs attention?</h2><p class="section-sub" id="needs-help">Select the areas you’d like help with. Choose as many as you need.</p>
    <div class="issues-grid" role="group" aria-label="Areas for support" aria-describedby="needs-help needs-error">${Object.entries(ISSUES).filter(([k])=>k!=='unsure').map(([k,v])=>option({id:'issue-'+k,name:'issue',value:k,checked:state.issues.includes(k),classes:'issue',body:check+`<span><strong>${v.name}</strong><small>${v.desc}</small></span>`})).join('')}</div>
    ${option({id:'issue-unsure',name:'issue',value:'unsure',checked:state.issues.includes('unsure'),classes:'unsure',body:check+'I’m not sure yet — help me find a starting point'})}
    <fieldset class="timing"><legend>What best describes your timing?</legend><div class="timing-grid">${Object.entries(TIMING).map(([k,n])=>option({id:'timing-'+k,name:'timing',value:k,type:'radio',checked:state.timing===k,classes:'timing-choice',body:check+esc(n)})).join('')}</div></fieldset>
    <p class="error" id="needs-error" role="alert"></p>
    <div class="actions"><button class="back" id="back"><span aria-hidden="true">←</span> Back</button><button class="primary" id="continue">See my summary <span aria-hidden="true">→</span></button></div>`;
}
function summaryView() {
  const r=assess(state);
  const book=`<a id="book" class="${r.route==='review'?'primary':'secondary'}" href="${BOOKING_URL}" target="_blank" rel="noopener noreferrer">Book a free call <span aria-hidden="true">↗</span><span class="sr-only"> (opens a new tab)</span></a>`;
  const message=`<button id="message" class="${r.route==='message'?'primary':'secondary'}">Send a message <span aria-hidden="true">↗</span></button>`;
  return `${top(2)}<h2 id="step-title" tabindex="-1">Here’s your starting point.</h2><p class="section-sub">Based on your answers. A closer review will help confirm the priorities.</p>
    <div class="brief"><p class="brief-eyebrow">YOUR NEEDS, AT A GLANCE</p><p class="summary-text">${esc(r.summary)}</p><div class="summary-meta"><span>${STAGES[state.stage]}</span><span>${TIMING[state.timing]}</span></div></div>
    <h3 class="focus-heading">${r.priorities.length>1?'Suggested starting points':'Suggested starting point'}</h3><ol class="focus-list">${r.priorities.map((k,i)=>`<li><span class="focus-num" aria-hidden="true">0${i+1}</span><div><strong>${ISSUES[k].focus}</strong><p>${ISSUES[k].action}</p></div></li>`).join('')}</ol>
    ${r.recovery?`<p class="caveat">${RECOVERY_NOTE}</p>`:''}
    <div class="next-step"><span class="recommend-label">A RECOMMENDED NEXT STEP</span><h3>${r.route==='message'?'Start with a message.':'Let’s talk through your channels.'}</h3><p>${r.reason}</p><div class="cta-row">${r.route==='review'?book+message:message+book}</div><p class="booking-hint">Free 30-minute conversation with Scott. Detailed audits are scoped separately. Copy your summary to include with your booking.</p></div>
    <div class="utility-row"><button class="text-link" id="copy-summary">Copy needs summary <span aria-hidden="true">↗</span></button><button class="text-link" id="back">← Edit my answers</button></div><p class="status" id="summary-status" role="status"></p><div class="summary-export" id="summary-export" hidden><label class="field-label" for="summary-text">Select and copy your summary</label><textarea id="summary-text" readonly>${esc(r.text)}</textarea></div>`;
}
function render(focus=false) {
  flow.innerHTML = `<div class="fade-in">${[channelView,needsView,summaryView][state.step]()}</div>`;
  if (state.step===0) renderPrograms();
  document.querySelectorAll('.steps li').forEach((li,i)=>{
    li.className = i===state.step?'current':i<state.step?'done':'';
    if(i===state.step) li.setAttribute('aria-current','step'); else li.removeAttribute('aria-current');
    li.querySelector('button').disabled=i===1?!state.channels.length:i===2?!(state.channels.length&&state.issues.length):false;
  });
  store();
  if(focus){document.getElementById('step-title').focus({preventScroll:true});document.getElementById('assessment').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});}
}
function next(){
  if(state.step===0&&!state.channels.length){document.getElementById('channel-error').textContent='Choose Amazon, Walmart, or both to continue.';document.getElementById('channel-amazon').focus();return;}
  if(state.step===1&&!state.issues.length){document.getElementById('needs-error').textContent='Choose at least one area, or select “I’m not sure yet”.';document.getElementById('issue-listings').focus();return;}
  state.step=Math.min(state.step+1,2);render(true);
}
flow.addEventListener('change',e=>{
  const el=e.target;
  if(el.name==='channel'){
    state.channels=Object.keys(CHANNELS).filter(k=>document.getElementById('channel-'+k).checked);
    for(const k of Object.keys(CHANNELS)) if(!state.channels.includes(k)) state.programs[k]=[];
    renderPrograms();document.getElementById('channel-error').textContent='';
  }
  if(el.name.startsWith('program-')){const k=el.name.slice(8);state.programs[k]=[...flow.querySelectorAll(`input[name="program-${k}"]:checked`)].map(i=>i.value);}
  if(el.id==='stage')state.stage=el.value;
  if(el.name==='issue'){
    if(el.value==='unsure'&&el.checked){state.issues=['unsure'];flow.querySelectorAll('input[name="issue"]').forEach(i=>{i.checked=i.value==='unsure';});}
    else {if(el.value!=='unsure'&&el.checked)document.getElementById('issue-unsure').checked=false;state.issues=[...flow.querySelectorAll('input[name="issue"]:checked')].map(i=>i.value);}
    document.getElementById('needs-error').textContent='';
  }
  if(el.name==='timing')state.timing=el.value;
  store();
  // Keep direct progress navigation in sync with edited selections.
  document.querySelector('[data-step="1"]').disabled=!state.channels.length;
  document.querySelector('[data-step="2"]').disabled=!(state.channels.length&&state.issues.length);
});
flow.addEventListener('click',async e=>{
  const id=e.target.closest('button,a')?.id;
  if(id==='continue')next();
  if(id==='back'){state.step=Math.max(0,state.step-1);render(true);}
  if(id==='reset'){state=freshState();store();render(true);}
  if(id==='copy-summary'){
    const ok=await copy(assess(state).text);
    if(state.step!==2)return;
    document.getElementById('summary-status').textContent=ok?'Summary copied. Paste it into your booking notes or a message.':'Automatic copy is unavailable. Select and copy the summary below.';
    if(!ok){document.getElementById('summary-export').hidden=false;document.getElementById('summary-text').focus();document.getElementById('summary-text').select();}
  }
  if(id==='message'){ if(isEmbedded)shareWithParent('message'); else openMessage(); }
  if(id==='book' && isEmbedded){ e.preventDefault(); shareWithParent('book'); return; }
  if(id==='book')document.getElementById('summary-status').textContent='The booking page opens in a new tab. Your appointment is confirmed only after you complete the booking there.';
});
document.querySelectorAll('[data-step]').forEach(button=>button.addEventListener('click',()=>{const next=Number(button.dataset.step);if(!button.disabled){state.step=next;render(true);}}));
async function copy(text){try{await navigator.clipboard.writeText(text);return true;}catch{return false;}}
const dialog=document.getElementById('message-dialog');
const messageBody=document.getElementById('message-body');
function updateEmail(){document.getElementById('open-email').href=`mailto:${EMAIL}?subject=${encodeURIComponent(assess(state).subject)}&body=${encodeURIComponent(messageBody.value)}`;}
function openMessage(){messageBody.value=assess(state).message;updateEmail();document.getElementById('message-status').textContent='';dialog.showModal();document.getElementById('close-message').focus();}
messageBody.addEventListener('input',updateEmail);
document.getElementById('close-message').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
document.getElementById('copy-message').addEventListener('click',async()=>{const ok=await copy(messageBody.value);document.getElementById('message-status').textContent=ok?'Message copied. Paste it into an email to scott@simpleconsulting.ca.':'Select and copy the message above, then email scott@simpleconsulting.ca.';if(!ok){messageBody.focus();messageBody.select();}});
document.getElementById('open-email').addEventListener('click',()=>{document.getElementById('message-status').textContent='If your email app doesn’t open, use Copy message and email Scott directly. Nothing is sent automatically.';});
document.getElementById('year').textContent=new Date().getFullYear();
render();

const isEmbedded = window.parent !== window && new URLSearchParams(location.search).get('embed') === '1';
function shareWithParent(action) { const result = assess(state); window.parent.postMessage({type:'simple-assessment-result',action,summary:result.text,channels:state.channels},location.origin); }
