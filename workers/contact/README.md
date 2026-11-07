# Contact form email service

Cloudflare Workers Free + Resend Free. No production secrets belong in this repository.
Production uses the Cloudflare Worker at https://simple-consulting-contact.scott-877.workers.dev/contact. Resend verified notify.simpleconsulting.ca. The controlled live delivery check on November 6, 2026 confirmed both notification and acknowledgement emails reached Scott’s mailbox; the acknowledgement Reply-To points to scott@simpleconsulting.ca. Secrets are encrypted in the Worker runtime.

## Setup and cutover

1. Sign into Cloudflare and Resend. Stay on the free plans.
2. Verify `notify.simpleconsulting.ca` in Resend using its exact generated DNS records. A sending subdomain keeps the existing mailbox's MX records intact. Use `Simple Consulting <hello@notify.simpleconsulting.ca>` as From and `scott@simpleconsulting.ca` as Reply-To.
3. Configure a managed Turnstile widget allowing only `www.simpleconsulting.ca` and `simpleconsulting.ca`. Record the public site key for the frontend. Put the secret in the Worker's `TURNSTILE_SECRET_KEY` secret.
4. Create a Resend sending-only API key restricted to the sending domain. Put it in the Worker's `RESEND_API_KEY` secret. Do not copy either secret into logs, source, browser code or chat.
5. Deploy this directory with Wrangler, using its returned Worker URL (do not invent a workers.dev hostname). Keep the Worker on Free. Endpoint is `<returned-origin>/contact`.
6. Set `content/contact.json` to `provider: worker`, the returned `worker_endpoint`, and the public `turnstile_sitekey`. The prepared frontend sends a Turnstile token, `action: contact`, a random UUID v4 `submissionId`, and the existing form fields. It POSTs JSON, retains the UUID and token on uncertain network failures, refreshes expired challenges, and reports success only for `{ok:true}`.
7. Verify delivery of both the Scott notification and visitor acknowledgement using a controlled live submission. Verify Reply-To and mobile HTML rendering. Acceptance by the sending API alone does not prove inbox delivery.
8. After testing, run the generator with the completed configuration; it replaces the Formspree endpoint across service/contact pages and updates the privacy page to name Cloudflare and Resend. Run all site checks and deploy. Keep analytics tied to accepted submissions.

## Checks

Run `node --test workers/contact/contact.test.mjs`. Tests mock both external APIs and send no email. Run the repository's build, check and DOM tests after integrating the frontend.

`email-preview.htm` is generated directly from `confirmationEmail('Alex')` in `email.mjs`; it contains no real enquiry data.

Resend accepts both the notification and acknowledgement in a strict batch. A stable payload hash and submission UUID provide a retry idempotency key. Its idempotency retention is provider-limited; this is not permanent deduplication. Turnstile is verified on the server with hostname and action checks. No form content is included in application logs. Provider free-tier limits stop sends when exhausted; the frontend must retain the message and offer email as a fallback.
