(() => {
  const form=document.getElementById('amazon-readiness');
  if(!form) return;
  const boxes=[...form.querySelectorAll('input[type="checkbox"]')],score=document.getElementById('amazon-readiness-score'),summary=document.getElementById('amazon-readiness-summary'),missing=document.getElementById('amazon-readiness-missing');
  const update=()=>{
    const done=boxes.filter(b=>b.checked).length,open=boxes.filter(b=>!b.checked);
    score.textContent=done+' of '+boxes.length+' ready';
    summary.textContent=done===boxes.length?'Your operating checklist is complete. Confirm current Amazon requirements and account eligibility before launch.':done>=9?'Most of the operating foundation is covered. Close the remaining gaps before committing more inventory or launch spend.':done>=5?'Several launch components are defined, but important operating gaps remain.':'Start with the account model and product records, then connect the economics, fulfilment and inventory plan.';
    missing.innerHTML=open.length?'<strong>Still to confirm:</strong><ul>'+open.slice(0,6).map(b=>'<li>'+b.dataset.label+'</li>').join('')+(open.length>6?'<li>+'+(open.length-6)+' more item'+(open.length-6===1?'':'s')+'</li>':'')+'</ul>':'';
  };
  form.addEventListener('change',update);
  document.getElementById('copy-amazon-readiness').addEventListener('click',async()=>{
    const text='Amazon Canada launch readiness\n\n'+boxes.map(b=>(b.checked?'[x] ':'[ ] ')+b.dataset.label).join('\n');
    try{await navigator.clipboard.writeText(text);window.scTrack?.('amazon_readiness_copy',{page_path:location.pathname});summary.textContent='Readiness summary copied. Review it before sharing or using it in your launch plan.';}catch{summary.textContent='Automatic copy is unavailable in this browser.';}
  });
  update();
})();