import {escapeHtml} from './email.mjs';

// "Email me these results" from the free tools. The visitor asked for this email,
// so it is transactional. Marketing tips are a separate, unticked opt-in (CASL).
export const TOOLS = {
  launch_margin: {name: 'Marketplace margin calculator', path: '/marketplace-launch-margin-calculator.html'},
  fba_wfs: {name: 'FBA vs WFS calculator', path: '/amazon-fba-vs-walmart-wfs-calculator.html'},
  reimbursement_checklist: {name: 'Reimbursement checklist', path: '/marketplace-reimbursement-checklist.html'},
  amazon_readiness: {name: 'Amazon.ca launch readiness checklist', path: '/amazon-canada-launch-readiness.html'}
};
const SITE = 'https://www.simpleconsulting.ca';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function resultsEmail(toolKey, summary) {
  const tool = TOOLS[toolKey];
  const next = `Want a second pair of eyes on these numbers? Book a free 30-minute call: ${SITE}/booking.html#booking\n\nReady for a full review? The CAD $750 channel diagnostic gives you a written priority plan for one marketplace: ${SITE}/channel-diagnostic.html`;
  const text = `Here are your results from the ${tool.name}.\n\n${summary}\n\nThese figures are estimates based on the information you entered. They are not an account audit or financial advice.\n\n${next}\n\nScott Nguyen\nFounder & Consultant, Simple Consulting\nConsulting made simple.\nscott@simpleconsulting.ca\n\nYou received this because you asked for these results on simpleconsulting.ca.`;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>Your results | Simple Consulting</title></head>
<body style="margin:0;padding:0;background:#f7f8fa;color:#111214;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f7f8fa;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #e7e8eb;border-radius:18px;">
<tr><td style="padding:30px 34px 24px;border-bottom:1px solid #e7e8eb;"><a href="${SITE}/" style="font-family:Arial,Helvetica,sans-serif;font-size:25px;letter-spacing:-0.9px;color:#111214;text-decoration:none;"><strong>simple</strong> consulting<strong>.</strong></a></td></tr>
<tr><td style="padding:32px 34px 10px;"><p style="margin:0 0 12px;font-size:10px;font-weight:600;letter-spacing:1.5px;color:#737780;">YOUR RESULTS</p><h1 style="font-family:Arial,Helvetica,sans-serif;margin:0 0 22px;font-size:28px;line-height:1.2;font-weight:600;letter-spacing:-1px;">${escapeHtml(tool.name)}</h1>
<pre style="margin:0;padding:20px 22px;background:#f7f8fa;border:1px solid #eceef1;border-radius:12px;white-space:pre-wrap;font:14px/1.7 -apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#111214;">${escapeHtml(summary)}</pre>
<p style="margin:16px 0 0;font-size:12px;line-height:1.7;color:#737780;">Estimates based on the information you entered. Not an account audit or financial advice. <a href="${SITE}${tool.path}" style="color:#64676d;">Run it again</a></p></td></tr>
<tr><td style="padding:22px 34px 32px;"><p style="margin:0 0 6px;font-size:15px;font-weight:600;">Want a second pair of eyes?</p><p style="margin:0 0 18px;font-size:14px;line-height:1.75;color:#64676d;">Bring these numbers to a free 30-minute call. If you need a full review, the CAD $750 channel diagnostic gives you a written priority plan for one marketplace.</p>
<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td bgcolor="#111214" style="background:#111214;border-radius:26px;"><a href="${SITE}/booking.html#booking" style="display:inline-block;padding:13px 22px;font-size:13px;font-weight:600;color:#ffffff;text-decoration:none;">Book a free call &nbsp;&rarr;</a></td><td style="padding-left:16px;"><a href="${SITE}/channel-diagnostic.html" style="font-size:13px;font-weight:600;color:#111214;">About the diagnostic</a></td></tr></table>
<p style="margin:26px 0 0;font-size:14px;line-height:1.6;color:#64676d;">Scott Nguyen<br><span style="font-size:12px;color:#737780;">Founder &amp; Consultant, Simple Consulting · scott@simpleconsulting.ca</span></p></td></tr></table>
<p style="margin:18px 0 0;font-size:11px;line-height:1.8;color:#858a93;text-align:center;">You received this because you asked for these results on simpleconsulting.ca.<br><a href="${SITE}/privacy.html" style="color:#737780;">Privacy</a></p>
</td></tr></table></body></html>`;
  return {subject: `Your results: ${tool.name}`, text, html};
}

export async function handleResults(body, env, origin, reply) {
  const string = (key, max) => typeof body[key] === 'string' && body[key].length <= max ? body[key].trim() : null;
  const email = string('email', 254), tool = string('tool', 40), summary = string('summary', 6000), source = string('source_page', 1500);
  const token = string('turnstileToken', 2048), id = string('submissionId', 36), tips = body.tips === true;
  if (typeof body._gotcha === 'string' && body._gotcha) return reply(422, {error: 'invalid_request'});
  if (!email || !/^[^\s<>(),;:"\\]+@[^\s<>(),;:"\\]+\.[^\s<>(),;:"\\]+$/.test(email) || !Object.hasOwn(TOOLS, tool || '') || !summary || summary.length < 10 || source === null || !token || !uuid.test(id || '')) return reply(422, {error: 'invalid_fields'});
  try {
    const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({secret: env.TURNSTILE_SECRET_KEY, response: token, idempotency_key: id}), signal: AbortSignal.timeout(7000)});
    if (!verify.ok) return reply(503, {error: 'verification_unavailable'});
    const check = await verify.json();
    if (!check.success || check.hostname !== new URL(origin).hostname || check.action !== 'results') return reply(422, {error: 'verification_failed'});
    const notification = `Tool: ${TOOLS[tool].name}\nEmail: ${email}\nPractical tips opt-in: ${tips ? 'Yes' : 'No'}\nSource: ${source}\n\n${summary}`;
    const emails = [
      {from: env.FROM_EMAIL, to: [email], reply_to: env.TO_EMAIL, ...resultsEmail(tool, summary)},
      {from: env.FROM_EMAIL, to: [env.TO_EMAIL], reply_to: email, subject: `Tool lead: ${TOOLS[tool].name}${tips ? ' (tips opt-in)' : ''}`, text: notification, html: `<h1>New tool lead</h1><pre style="white-space:pre-wrap;font:15px/1.6 Arial,sans-serif;">${escapeHtml(notification)}</pre>`}
    ];
    const sent = await fetch('https://api.resend.com/emails/batch', {method: 'POST', headers: {'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `results/${id}`, 'x-batch-validation': 'strict'}, body: JSON.stringify(emails), signal: AbortSignal.timeout(10000)});
    if (!sent.ok) return reply(503, {error: 'email_unavailable'});
    const result = await sent.json();
    if (result.errors?.length || !Array.isArray(result.data) || result.data.length !== 2) return reply(503, {error: 'email_unavailable'});
    // Optional: add opted-in contacts to a Resend segment for the follow-up emails.
    // Needs a separate full-access key; the sending key cannot manage contacts.
    if (tips && env.RESEND_CONTACTS_KEY && env.RESEND_SEGMENT_ID) {
      try {
        await fetch('https://api.resend.com/contacts', {method: 'POST', headers: {'Authorization': `Bearer ${env.RESEND_CONTACTS_KEY}`, 'Content-Type': 'application/json'}, body: JSON.stringify({email, unsubscribed: false, segments: [env.RESEND_SEGMENT_ID], properties: {source_tool: tool}}), signal: AbortSignal.timeout(7000)});
      } catch {}
    }
    return reply(200, {ok: true});
  } catch { return reply(503, {error: 'service_unavailable'}); }
}
