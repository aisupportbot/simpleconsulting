const {chromium}=require('playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');const out=path.join(root,'test-results');fs.mkdirSync(out,{recursive:true});
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.ttf':'font/ttf','.png':'image/png','.svg':'image/svg+xml','.json':'application/json'};
const server=http.createServer((req,res)=>{let pathname=decodeURIComponent(req.url.split('?')[0]);if(pathname.endsWith('/'))pathname+='index.html';const p=path.join(root,pathname);if(!p.startsWith(root)||!fs.existsSync(p)){res.writeHead(404);return res.end('Not found');}res.setHeader('Content-Type',types[path.extname(p)]||'text/plain');res.end(fs.readFileSync(p));});
const widget=`window.Calendly={initInlineWidget({url,parentElement}){const frame=document.createElement('iframe');frame.title='Scheduling calendar';frame.src=url;frame.style='width:100%;height:650px;border:0';parentElement.appendChild(frame);}};`;
(async()=>{
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,executablePath:'/tmp/simple-browser/chrome-headless-shell-linux64/chrome-headless-shell',args:['--no-sandbox']});const report=[];
try{
for(const width of [1440,390]){
 const context=await browser.newContext({viewport:{width,height:950},permissions:['clipboard-read','clipboard-write']});let ok=false,sends=0;
 await context.route('**/*',async route=>{
  const url=route.request().url();
  if(url.startsWith(base))return route.continue();
  if(url.startsWith('https://fonts.googleapis.com/'))return route.fulfill({contentType:'text/css',body:fs.readFileSync(path.join(root,'assessment/fonts/fonts.css'),'utf8').replaceAll('url(./','url('+base+'/assessment/fonts/')});
  if(url.startsWith('https://assets.calendly.com/'))return route.fulfill({contentType:'text/javascript',body:widget});
  if(url.startsWith('https://calendly.com/'))return route.fulfill({contentType:'text/html',body:'<html><body style="font-family:Arial;padding:30px"><h2>Choose a time</h2><p>Calendar test fixture — no real appointments</p></body></html>'});
  if(url==='https://formspree.io/f/mreegwjn'){sends++;assert.equal(route.request().method(),'POST');return route.fulfill({status:ok?200:422,contentType:'application/json',body:JSON.stringify(ok?{ok:true}:{error:'Test failure'})});}
  return route.abort();
 });
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 async function shot(name){await page.addStyleTag({content:'.reveal,.fade{opacity:1!important;transform:none!important;animation:none!important}'});await page.screenshot({path:path.join(out,width+'-'+name+'.png'),fullPage:true,animations:'disabled'});}
 async function overflow(){assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Overflow at '+page.url()+' '+width+' '+JSON.stringify(await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(el=>el.getBoundingClientRect().right>innerWidth+1).map(el=>({tag:el.tagName,cls:el.className,right:el.getBoundingClientRect().right})).slice(0,12))));}
 await page.goto(base+'/');await page.evaluate(()=>document.fonts.ready);await overflow();await shot('home');
 assert.equal(await page.locator('.nav-links a[href="/booking.html"]').innerText(),'Book a Call');assert.equal(await page.locator('a:text-is("Get Money Back")').count(),0);
 await page.goto(base+'/booking.html');await page.locator('#calWidget iframe').waitFor();assert.equal(await page.locator('#assessment-panel').getAttribute('open'),null);
 await overflow();await shot('booking');
 await page.locator('[data-open-assessment]').click();const f=page.frameLocator('#assessment-frame');
 await f.locator('label[for="channel-amazon"]').click();await f.locator('label[for="channel-walmart"]').click();await f.locator('label[for="amazon-fba"]').click();
 await f.locator('#continue').click();for(const key of ['reimbursements','inventory'])await f.locator('label[for="issue-'+key+'"]').click();await f.locator('#continue').click();
 assert.match(await f.locator('.caveat').innerText(),/not guaranteed/);
 await f.locator('#message').click();
 await page.waitForFunction(()=>document.getElementById('message').value.includes('Reimbursements are not guaranteed'));
 assert.equal(await page.locator('#channel').inputValue(),'Both Amazon and Walmart');assert.equal(sends,0);
 const original=await page.locator('#message').inputValue();await page.locator('#message').fill(original+'\nMy additional note.');
 await f.locator('#book').click();await page.waitForFunction(()=>decodeURIComponent(document.querySelector('#calWidget iframe').src).includes('My additional note.'));
 const cal=new URL(await page.locator('#calWidget iframe').getAttribute('src'));assert.ok(cal.searchParams.get('a1').includes('My additional note.'));assert.ok(cal.searchParams.get('a1').includes('not guaranteed'));
 assert.equal((await page.locator('#message').inputValue()).split('Simple Consulting — Channel needs summary').length-1,1);
 const h=await page.locator('#assessment-frame').evaluate(el=>el.clientHeight);const inner=await f.locator('body').evaluate(el=>el.scrollHeight);assert.ok(h>=inner&&h<4000,'Frame sizing '+h+' '+inner);
 await overflow();await shot('assessment');
 await page.evaluate(()=>window.postMessage({type:'simple-assessment-result',action:'message',summary:'INJECTED',channels:['walmart']},location.origin));assert.ok(!(await page.locator('#message').inputValue()).includes('INJECTED'));
 await page.locator('#submit').click();assert.equal(sends,0);assert.equal(await page.locator('#name').getAttribute('aria-invalid'),'true');
 await page.locator('#name').fill('Test Prospect');await page.locator('#email').fill('test@example.com');await page.locator('#submit').click();await page.locator('#sendErr').waitFor({state:'visible'});assert.equal(await page.locator('#sent').isVisible(),false);
 await page.locator('#copy-enquiry').click();await page.waitForFunction(()=>document.getElementById('copy-status').textContent.includes('copied'));
 ok=true;await page.locator('#submit').click();await page.locator('#sent').waitFor({state:'visible'});assert.equal(sends,2);
 for(const file of ['reimbursement-recovery.html','about.html','amazon-management.html','walmart-management.html']){await page.goto(base+'/'+file);await overflow();if(file==='reimbursement-recovery.html')await shot('reimbursements');}
 await page.goto(base+'/booking.html?src=reimbursement');assert.match(await page.locator('#headline').innerText(),/potential claims/);
 await page.goto(base+'/booking.html?src=__proto__');assert.match(await page.locator('#headline').innerText(),/next step/);
 assert.deepEqual(errors,[]);report.push({width,status:'PASS',checks:'Navigation, optional assessment, automatic height, summary handoff, preserved notes, booking prefill, validation, mocked send failure/success, copy, channel-specific copy, core-page overflow and JS errors'});await context.close();
}
const context=await browser.newContext({viewport:{width:390,height:844}});await context.route('https://**/*',r=>r.abort());const page=await context.newPage();await page.goto(base+'/booking.html');await page.locator('#calendar-direct').waitFor({state:'visible'});assert.equal(await page.locator('#calendar-direct').getAttribute('target'),'_blank');await context.close();report.push({status:'PASS',checks:'Blocked calendar fallback; no live messages or bookings sent'});
fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exit(1)});
