const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const output=path.join(root,'test-results');fs.mkdirSync(output,{recursive:true});
const server=http.createServer((req,res)=>{const p=path.join(root,decodeURIComponent(new URL(req.url,'http://localhost').pathname));const file=p.endsWith('/')?p+'index.html':p;try{const ext=path.extname(file);res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.svg':'image/svg+xml','.ttf':'font/ttf'})[ext]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.statusCode=404;res.end('Not found');}});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {}),args:['--no-sandbox'],headless:true});
 const report=[];
 try {
 for(const width of [1440,390,320]) {
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://**',route=>route.fulfill({status:200,contentType:'text/html',body:'<p>External booking service stub for local QA.</p>'}));
  const pages=['/','/services.html','/amazon-management.html','/walmart-management.html','/booking.html','/blog.html','/insights/amazon.html','/insights/walmart.html','/insights/inventory.html','/blog/amazon-ppc-audit-checklist-canada.html'];
  for(const file of pages){
   await page.goto(origin+file);await page.evaluate(()=>document.fonts.ready);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Overflow '+width+' '+file);
   if(width!==320 && ['/','/blog.html','/insights/walmart.html','/booking.html','/blog/amazon-ppc-audit-checklist-canada.html'].includes(file)) await page.screenshot({path:path.join(output,width+'-'+(file==='/'?'home':file.replaceAll('/','_'))+'.png'),fullPage:true});
  }
  if(width<900){await page.locator('.mobile-menu summary').click();assert(await page.locator('.mobile-links').isVisible());await page.keyboard.press('Escape');assert(!(await page.locator('.mobile-links').isVisible()));}
  await page.goto(origin+'/blog.html');assert.equal(await page.locator('#post-grid .post-card:visible').count(),12);
  await page.locator('#next-articles').click();assert.match(page.url(),/page=2/);assert.match(await page.locator('#article-page-status').textContent(),/Page 2/);
  await page.reload();assert.match(await page.locator('#article-page-status').textContent(),/Page 2/);
  await page.locator('#article-search').fill('Amazon PPC Audit');assert.equal(await page.locator('#post-grid .post-card:visible').count(),1);
  await page.locator('#article-search').fill('not-a-matching-topic-qa');assert(await page.locator('#no-articles').isVisible());await page.locator('#clear-filters').click();assert.equal(await page.locator('#post-grid .post-card:visible').count(),12);
  await page.locator('[data-filter="Marketplaces"]').click();assert(await page.locator('#post-grid .post-card:visible').count()>0);
  await page.goto(origin+'/amazon-management.html?utm_source=google&utm_medium=cpc&utm_campaign=amazon-management&utm_term=private-example');
  await page.locator('main a[href="/booking.html?service=amazon#start"]').first().click();assert.equal(await page.locator('#channel').inputValue(),'amazon');
  const source=await page.locator('#source-page').inputValue();assert(source.includes('utm_campaign: amazon-management'));assert(!source.includes('private-example'));
  let posts=0;await page.route('https://formspree.io/**',async route=>{posts++;await route.fulfill({status:posts===1?422:200,contentType:'application/json',body:'{}'});});
  await page.locator('#send-button').click();assert.equal(posts,0);assert(await page.locator('#name-error').isVisible());
  await page.locator('#name').fill('QA Example');await page.locator('#email').fill('qa@example.com');await page.locator('#message').fill('Please review inventory.');await page.locator('#send-button').click();await page.locator('#send-status.error').waitFor();assert.equal(await page.locator('#message').inputValue(),'Please review inventory.');
  await page.locator('#send-button').click();await page.locator('#form-success').waitFor();assert.equal(posts,2);
  await page.goto(origin+'/booking.html#assessment');const frame=page.frameLocator('#assessment-frame');await frame.locator('body').waitFor();
  await frame.locator('#continue').click();assert.match(await frame.locator('#channel-error').textContent(),/Choose/);
  await frame.locator('label[for="channel-amazon"]').click();await frame.locator('label[for="channel-walmart"]').click();await frame.locator('#continue').click();
  await frame.locator('label[for="issue-listings"]').click();await frame.locator('label[for="issue-reimbursements"]').click();await frame.locator('#continue').click();
  await frame.locator('#message').waitFor();assert.match(await frame.locator('.caveat').textContent(),/not guaranteed/);
  await frame.locator('#message').click();await page.waitForFunction(()=>document.querySelector('#message').value.includes('Amazon'));
  assert.equal(await page.locator('#channel').inputValue(),'both');assert.match(await page.locator('#message').inputValue(),/Walmart/);
  await page.locator('#message').fill((await page.locator('#message').inputValue())+'\nExtra note from prospect.');
  await frame.locator('#book').click();assert.match(await page.locator('#message').inputValue(),/Extra note/);
  await page.locator('#load-calendar').click();assert.match(await page.locator('#calendar-slot iframe').getAttribute('src'),/calendly.com/);
  assert.equal(await page.locator('#calendar-direct').getAttribute('target'),'_blank');
  const dimensions=await page.locator('#assessment-frame').evaluate(el=>({frame:el.clientHeight,body:el.contentDocument.body.scrollHeight}));assert(dimensions.frame>=dimensions.body-2,JSON.stringify(dimensions));
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Assessment overflow');
  await page.screenshot({path:path.join(output,width+'-assessment-complete.png'),fullPage:true});
  assert.equal(errors.length,0,errors.join('\n'));report.push({width,pages:pages.length,overflow:false,errors,forms:'mocked failure and success',filters:'pagination, reload, search, empty, reset',attribution:'retained, arbitrary term excluded',assessment:'both channels, summary, message/book handoff, notes preserved, frame sizing'});await page.close();
 }
 const nojs=await browser.newPage({javaScriptEnabled:false,viewport:{width:390,height:844}});await nojs.goto(origin+'/blog.html');assert.equal(await nojs.locator('#post-grid .post-card:visible').count(),115);await nojs.close();
 fs.writeFileSync(path.join(output,'browser-report.json'),JSON.stringify(report,null,2));console.log('PASS browser checks',JSON.stringify(report));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
