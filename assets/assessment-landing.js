(() => {
  const frame=document.getElementById('assessment-tool');
  if(!frame) return;
  addEventListener('message',e=>{
    if(e.origin!==location.origin || e.source!==frame.contentWindow) return;
    const data=e.data;
    if(data?.type==='simple-assessment-resize' && Number.isFinite(data.height) && data.height>=200 && data.height<=6000){ frame.style.height=Math.ceil(data.height+2)+'px'; return; }
    if(!data || data.type!=='simple-assessment-result' || !['book','message'].includes(data.action) || typeof data.summary!=='string' || data.summary.length>10000 || !Array.isArray(data.channels)) return;
    try { sessionStorage.setItem('sc-assessment-transfer',JSON.stringify({summary:data.summary,channels:data.channels})); } catch {}
    window.scTrack?.('assessment_complete',{next_step:data.action,page_path:location.pathname});
    const service=data.channels.length===1 && ['amazon','walmart'].includes(data.channels[0]) ? '?service='+data.channels[0] : '';
    location.href='/booking.html'+service+(data.action==='book'?'#booking':'#start');
  });
})();