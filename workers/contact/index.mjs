import {confirmationEmail, escapeHtml} from './email.mjs';
import {handleResults} from './results.mjs';

const origins = new Set(['https://www.simpleconsulting.ca','https://simpleconsulting.ca']);
const channels = new Set(['','amazon','walmart','reimbursement','operations','shopify','fractional','systems','google','both','other']);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    const headers = {'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin'};
    if (origins.has(origin)) headers['Access-Control-Allow-Origin'] = origin;
    const reply = (status, body) => new Response(JSON.stringify(body), {status, headers});
    if (!origins.has(origin)) return reply(403,{error:'origin_not_allowed'});
    const path=new URL(request.url).pathname;
    if (path !== '/contact' && path !== '/results') return reply(404,{error:'not_found'});
    if (request.method === 'OPTIONS') return new Response(null, {status:204,headers:{...headers,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'600'}});
    if (request.method !== 'POST') return reply(405,{error:'method_not_allowed'});
    if (!env.RESEND_API_KEY || !env.TURNSTILE_SECRET_KEY || !env.FROM_EMAIL || !env.TO_EMAIL) return reply(503,{error:'service_unavailable'});
    if (!request.headers.get('Content-Type')?.startsWith('application/json')) return reply(415,{error:'json_required'});
    // Bound the streamed body, including when Content-Length is absent or incorrect.
    let body;
    try {
      const reader=request.body.getReader();let size=0;const chunks=[];
      while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>65536){await reader.cancel();return reply(413,{error:'too_large'});}chunks.push(value);}
      const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.byteLength;}
      body=JSON.parse(new TextDecoder().decode(bytes));
    } catch {return reply(400,{error:'invalid_request'});}
    if (!body || typeof body !== 'object' || Array.isArray(body)) return reply(400,{error:'invalid_request'});
    if (path === '/results') return handleResults(body, env, origin, reply);
    const string = (key,max) => typeof body[key]==='string' && body[key].length<=max ? body[key].trim() : null;
    const name=string('name',150),email=string('email',254),message=string('message',12000),channel=string('channel',50),source=string('source_page',1500);
    const token=string('turnstileToken',2048),id=string('submissionId',36);
    if (typeof body._gotcha === 'string' && body._gotcha) return reply(422,{error:'invalid_request'});
    if (!name || /[\r\n\x00-\x1f\x7f]/.test(name) || !email || !/^[^\s<>(),;:"\\]+@[^\s<>(),;:"\\]+\.[^\s<>(),;:"\\]+$/.test(email) || !message || message.length<5 || !channels.has(channel) || source===null || !token || !uuid.test(id||'')) return reply(422,{error:'invalid_fields'});
    try {
      // Bind verification retries to the same enquiry. Changing the recipient or
      // message must not reuse a cached successful challenge verification.
      const binding=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify({id,name,email,message,channel,source})));
      const h=Array.from(new Uint8Array(binding),v=>v.toString(16).padStart(2,'0')).join('').slice(0,32).split('');
      h[12]='4';h[16]=((parseInt(h[16],16)&3)|8).toString(16);
      const hex=h.join(''),validationId=`${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
      const verify=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({secret:env.TURNSTILE_SECRET_KEY,response:token,idempotency_key:validationId}),signal:AbortSignal.timeout(7000)});
      if(!verify.ok)return reply(503,{error:'verification_unavailable'});
      const check=await verify.json();
      if(!check.success || check.hostname!==new URL(origin).hostname || check.action!=='contact')return reply(422,{error:'verification_failed'});
      const confirmation=confirmationEmail(name);
      const notification=`Name: ${name}\nEmail: ${email}\nService: ${channel||'Not specified'}\nSource: ${source}\n\n${message}`;
      const emails=[
        {from:env.FROM_EMAIL,to:[env.TO_EMAIL],reply_to:email,subject:'Simple Consulting website enquiry',text:notification,html:`<h1>New website enquiry</h1><pre style="white-space:pre-wrap;font:15px/1.6 Arial,sans-serif;">${escapeHtml(notification)}</pre>`},
        {from:env.FROM_EMAIL,to:[email],reply_to:env.TO_EMAIL,...confirmation}
      ];
      const payload=JSON.stringify(emails);
      const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(payload));
      const hash=Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');
      const sent=await fetch('https://api.resend.com/emails/batch',{method:'POST',headers:{'Authorization':`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`enquiry/${id}/${hash}`,'x-batch-validation':'strict'},body:payload,signal:AbortSignal.timeout(10000)});
      if(!sent.ok)return reply(503,{error:'email_unavailable'});
      const result=await sent.json();
      if(result.errors?.length || !Array.isArray(result.data) || result.data.length!==2 || result.data.some(x=>!x.id))return reply(503,{error:'email_unavailable'});
      // Acceptance by Resend is not proof of delivery. Do not log form fields or keys.
      return reply(200,{ok:true});
    } catch {return reply(503,{error:'service_unavailable'});}
  }
};
