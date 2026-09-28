(() => {
  const form=document.getElementById('launch-margin-calculator');
  if(!form) return;
  const n=id=>Math.max(0,Number(document.getElementById(id).value)||0);
  const money=new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD'});
  let lastSummary='';
  form.addEventListener('submit',e=>{
    e.preventDefault();
    const price=n('margin-price'),cogs=n('margin-cogs'),fee=price*n('margin-marketplace')/100,ads=price*n('margin-ads')/100;
    const variable=cogs+fee+ads+n('margin-fulfilment')+n('margin-inbound')+n('margin-storage')+n('margin-returns')+n('margin-other');
    const contribution=price-variable,rate=price>0?contribution/price:0,units=n('margin-units'),monthly=contribution*units;
    document.getElementById('margin-variable').textContent=money.format(variable);
    document.getElementById('margin-contribution').textContent=money.format(contribution);
    document.getElementById('margin-rate').textContent=(rate*100).toFixed(1)+'%';
    document.getElementById('margin-monthly').textContent=money.format(monthly);
    document.querySelector('#margin-results .metric-stack').hidden=false;
    const s=document.getElementById('margin-summary');s.hidden=false;
    s.textContent=contribution>0?'Under these assumptions, each order leaves '+money.format(contribution)+' before fixed overhead and tax. Re-check the inputs and model a slower-sales or higher-cost scenario before committing inventory.':contribution===0?'Under these assumptions, the order reaches break-even before fixed overhead and tax. Revisit the cost and pricing inputs before treating the launch as viable.':'Under these assumptions, the variable costs exceed the selling price by '+money.format(Math.abs(contribution))+' per order. Review pricing, fees, fulfilment and advertising assumptions.';
    lastSummary='Marketplace launch margin scenario\nSelling price: '+money.format(price)+'\nVariable cost / order: '+money.format(variable)+'\nContribution / order: '+money.format(contribution)+'\nContribution margin: '+(rate*100).toFixed(1)+'%\nScenario orders / month: '+units+'\nMonthly contribution scenario: '+money.format(monthly)+'\n\n'+s.textContent;
    window.scTrack?.('launch_margin_calculator_complete',{page_path:location.pathname});
  });
  document.getElementById('discuss-margin')?.addEventListener('click',()=>{if(lastSummary){try{sessionStorage.setItem('sc-tool-transfer',JSON.stringify({summary:lastSummary,service:'operations'}));}catch{} window.scTrack?.('tool_result_to_contact',{tool:'launch_margin',page_path:location.pathname});}});
})();