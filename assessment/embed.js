if(window.parent!==window && new URLSearchParams(location.search).get('embed')==='1'){
 document.documentElement.classList.add('embedded');
 let pending=false;
 const sendHeight=()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;window.parent.postMessage({type:'simple-assessment-resize',height:document.body.scrollHeight},location.origin);});};
 new ResizeObserver(sendHeight).observe(document.body);
 document.fonts.ready.then(sendHeight);sendHeight();
}
