(() => {
  const form=document.getElementById('reimbursement-checklist');
  if(!form) return;
  const boxes=[...form.querySelectorAll('input[type="checkbox"]')];
  const progress=document.getElementById('reimbursement-progress');
  const summary=document.getElementById('reimbursement-summary');
  const update=()=>{
    const done=boxes.filter(b=>b.checked).length;
    progress.textContent=done+' of '+boxes.length+' reviewed';
    summary.textContent=done===boxes.length?'You have worked through the full checklist. Confirm current marketplace requirements before deciding on any submission.':done>=10?'The evidence trail is taking shape. Finish the remaining checks before treating the discrepancy as ready for follow-up.':done>=5?'You have part of the review assembled. Keep reconciling timing, prior credits and open cases.':'Start with scope and evidence before treating a report difference as a claim.';
  };
  form.addEventListener('change',update);
  const lines=()=>boxes.map(b=>(b.checked?'[x] ':'[ ] ')+b.dataset.label);
  document.getElementById('copy-reimbursement-checklist').addEventListener('click',async()=>{
    const text='Marketplace reimbursement reconciliation checklist\n\n'+lines().join('\n');
    try{await navigator.clipboard.writeText(text);window.scTrack?.('reimbursement_checklist_copy',{page_path:location.pathname});summary.textContent='Checklist copied. Review it before sharing or using it in your working file.';}catch{summary.textContent='Automatic copy is unavailable in this browser.';}
  });
  document.getElementById('download-reimbursement-checklist').addEventListener('click',()=>{
    const csv=['Status,Checklist item',...boxes.map(b=>'"'+(b.checked?'Reviewed':'Not reviewed')+'","'+b.dataset.label.replaceAll('"','""')+'"')].join('\n');
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='marketplace-reimbursement-checklist.csv';a.click();URL.revokeObjectURL(a.href);
    window.scTrack?.('reimbursement_checklist_download',{page_path:location.pathname});
  });
  update();
})();