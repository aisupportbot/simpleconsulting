import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker from './index.mjs';
import {confirmationEmail} from './email.mjs';

const env={RESEND_API_KEY:'test-key',TURNSTILE_SECRET_KEY:'test-secret',FROM_EMAIL:'Simple Consulting <hello@notify.simpleconsulting.ca>',TO_EMAIL:'scott@simpleconsulting.ca'};
const body={name:'Alex <Test>',email:'alex@example.com',message:'Please help with my Amazon account.',channel:'amazon',source_page:'/booking.html',_gotcha:'',turnstileToken:'test-token',submissionId:'bd7608e8-2b96-425c-9d87-e126c7c6aff1'};
const request=(overrides={},origin='https://www.simpleconsulting.ca')=>new Request('https://contact.example.com/contact',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({...body,...overrides})});

test('form handler validates, blocks abuse, sends two emails and fails honestly',async()=>{
  const original=globalThis.fetch;const calls=[];let verification={success:true,hostname:'www.simpleconsulting.ca',action:'contact'},emailStatus=200;
  globalThis.fetch=async(url,options)=>{calls.push({url,options});return url.includes('siteverify')?Response.json(verification):Response.json(emailStatus===200?{data:[{id:'notification'},{id:'confirmation'}]}:{error:'quota'},{status:emailStatus});};
  try{
    assert.equal((await worker.fetch(request({},'https://evil.example'),env)).status,403);
    assert.equal((await worker.fetch(request({email:'victim@example.com\r\nBcc: other@example.com'}),env)).status,422);
    assert.equal((await worker.fetch(request({_gotcha:'spam'}),env)).status,422);
    assert.equal((await worker.fetch(request({message:'a'.repeat(70000)}),env)).status,413);
    assert.equal((await worker.fetch(request(),{})).status,503);
    assert.equal(calls.length,0);
    verification={...verification,hostname:'evil.example'};
    assert.equal((await worker.fetch(request(),env)).status,422);assert.equal(calls.length,1);
    verification={success:true,hostname:'www.simpleconsulting.ca',action:'wrong'};
    assert.equal((await worker.fetch(request(),env)).status,422);assert.equal(calls.length,2);
    verification={success:true,hostname:'www.simpleconsulting.ca',action:'contact'};
    const success=await worker.fetch(request(),env);
    assert.equal(success.status,200);assert.deepEqual(await success.json(),{ok:true});
    assert.equal(success.headers.get('Access-Control-Allow-Origin'),'https://www.simpleconsulting.ca');
    const sent=calls.at(-1),emails=JSON.parse(sent.options.body);
    assert.equal(emails.length,2);assert.deepEqual(emails[0].to,[env.TO_EMAIL]);assert.equal(emails[0].reply_to,body.email);
    assert.deepEqual(emails[1].to,[body.email]);assert.equal(emails[1].reply_to,env.TO_EMAIL);
    assert.match(emails[1].html,/Alex &lt;Test&gt;/);assert.doesNotMatch(emails[1].html,/<Test>/);
    assert.match(emails[1].text,/one business day/);assert.doesNotMatch(emails[1].html,/Please help with my Amazon account/);
    const key=sent.options.headers['Idempotency-Key'];
    const verifyId=JSON.parse(calls.at(-2).options.body).idempotency_key;
    await worker.fetch(request(),env);assert.equal(calls.at(-1).options.headers['Idempotency-Key'],key);
    assert.equal(JSON.parse(calls.at(-2).options.body).idempotency_key,verifyId);
    await worker.fetch(request({email:'changed@example.com'}),env);
    assert.notEqual(JSON.parse(calls.at(-2).options.body).idempotency_key,verifyId,'A changed recipient cannot reuse cached challenge verification');
    emailStatus=429;assert.equal((await worker.fetch(request(),env)).status,503);
    globalThis.fetch=async()=>{throw new Error('network unavailable');};
    assert.equal((await worker.fetch(request(),env)).status,503);
  }finally{globalThis.fetch=original;}
});

test('confirmation has readable HTML and plain text with no subscription or untrusted markup',()=>{
  const email=confirmationEmail('Alex <img src=x onerror=alert(1)>');
  assert.match(email.html,/&lt;img/);assert.doesNotMatch(email.html,/<img/);
  assert.match(email.html,/role="presentation"/);assert.match(email.text,/haven’t been subscribed/);
});

test('results handler emails the visitor their results and notifies Scott, opt-in only when ticked',async()=>{
  const original=globalThis.fetch;const calls=[];
  globalThis.fetch=async(url,options)=>{calls.push({url,options});return url.includes('siteverify')?Response.json({success:true,hostname:'www.simpleconsulting.ca',action:'results'}):url.endsWith('/contacts')?Response.json({id:'c1'}):Response.json({data:[{id:'a'},{id:'b'}]});};
  const results=(o={},e=env)=>worker.fetch(new Request('https://contact.example.com/results',{method:'POST',headers:{Origin:'https://www.simpleconsulting.ca','Content-Type':'application/json'},body:JSON.stringify({email:'alex@example.com',tool:'launch_margin',summary:'Contribution / order: $4.20 <b>',source_page:'/marketplace-launch-margin-calculator.html',turnstileToken:'t',submissionId:'bd7608e8-2b96-425c-9d87-e126c7c6aff1',...o})}),e);
  try{
    assert.equal((await results({tool:'unknown'})).status,422);
    assert.equal((await results({summary:''})).status,422);
    assert.equal(calls.length,0);
    const ok=await results();assert.equal(ok.status,200);
    const emails=JSON.parse(calls.at(-1).options.body);
    assert.deepEqual(emails[0].to,['alex@example.com']);assert.match(emails[0].html,/\$4\.20 &lt;b&gt;/);assert.doesNotMatch(emails[0].html,/<b>/);
    assert.deepEqual(emails[1].to,[env.TO_EMAIL]);assert.match(emails[1].text,/opt-in: No/);
    const withTips={...env,RESEND_CONTACTS_KEY:'k',RESEND_SEGMENT_ID:'seg'};
    await results({},withTips);assert.ok(!calls.at(-1).url.endsWith('/contacts'),'No contact without opt-in');
    await results({tips:true},withTips);assert.ok(calls.at(-1).url.endsWith('/contacts'));
  }finally{globalThis.fetch=original;}
});
