(() => {
  const form = document.getElementById('fulfilment-calculator');
  if (!form) return;
  const money = new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD'});
  const pct = n => (n*100).toFixed(1)+'%';
  const value = id => Math.max(0, Number(document.getElementById(id).value) || 0);
  const side = key => {
    const price=value('sell-price'), product=value('product-cost');
    const referral=price*(value(key+'-referral')/100);
    const total=product+referral+['fulfilment','storage','inbound','returns','ads','other'].reduce((sum,k)=>sum+value(key+'-'+k),0);
    const contribution=price-total;
    return {price,total,contribution,margin:price>0?contribution/price:0};
  };
  let tracked=false;
  form.addEventListener('submit',e=>{
    e.preventDefault();
    const fba=side('fba'), wfs=side('wfs');
    document.getElementById('fba-total').textContent=money.format(fba.total);
    document.getElementById('wfs-total').textContent=money.format(wfs.total);
    document.getElementById('fba-contribution').textContent=money.format(fba.contribution);
    document.getElementById('wfs-contribution').textContent=money.format(wfs.contribution);
    document.getElementById('fba-margin').textContent=pct(fba.margin);
    document.getElementById('wfs-margin').textContent=pct(wfs.margin);
    const diff=Math.abs(fba.contribution-wfs.contribution);
    const summary=document.getElementById('calc-summary');
    if (Math.abs(fba.contribution-wfs.contribution) < 0.005) {
      summary.textContent='With the assumptions entered, the estimated contribution per order is effectively the same. Compare inventory commitment, receiving work, service levels and channel demand before deciding.';
    } else {
      const stronger=fba.contribution>wfs.contribution?'FBA':'WFS';
      summary.textContent=`${stronger} shows about ${money.format(diff)} more contribution per order under these assumptions. That is a scenario result, not a recommendation; verify every input and consider channel demand, inventory allocation and operating workload.`;
    }
    document.querySelector('.result-table').hidden=false;
    summary.hidden=false;
    if(!tracked){window.scTrack?.('calculator_complete',{page_path:location.pathname});tracked=true;}
  });
})();