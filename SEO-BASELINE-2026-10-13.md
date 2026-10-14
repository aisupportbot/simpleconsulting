# SEO baseline and follow-up — 13 October 2026

The figures below are from Google Search Console tables supplied by the site owner, not a live connector export. Google can revise recent data. The 3-month, 28-day, 7-day and 24-hour windows **overlap** and must not be subtracted from each other to infer month-over-month gains.

## Priority search queries

| Query | 3-month impressions | 3-month avg position | Last 28-day impressions | Last 28-day avg position | Last 7-day impressions | Last 7-day avg position |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| amazon account management services | 116 | 67.0 | 40 | 50.8 | 17 | 38.1 |
| amazon account management companies | 83 | 55.9 | 32 | 41.4 | 12 | 34.8 |
| amazon seller central consultant | 82 | 62.2 | 27 | 50.2 | 13 | 53.5 |
| amazon consulting | — | — | 28 | 30.4 | 11 | 53.5 |
| amazon account management canada | — | — | 26 | 23.7 | — | — |
| wfs seller review | 57 | 19.3 | 35 | 15.5 | 11 | 13.0 |
| wfs vs fba reimbursement | — | — | 33 | 24.6 | 10 | 11.3 |

All listed search queries had **zero clicks** in the relevant non-brand intervals supplied. The branded query “simple consulting” produced 13 clicks from 48 impressions with a three-month average position of 16.4, and 6 clicks from 18 impressions with a last-28-day average position of 5.8.

A single 24-hour view also showed WFS vs FBA long-tail queries, each with one or two impressions: “how does wfs compare to fba” position 8, “wfs vs fba reimbursement” position 11, “wfs vs fba tax questions” position 12, “wfs vs fba label requirements” position 13 and other variants. This sample is far too small to treat as stable ranking evidence.

## Editorial changes in this review branch

1. Clarify the existing Amazon account management service page and its commercial search intent without creating a competing service page or changing its URL.
2. Publish a supporting buying guide about comparing Amazon consultants and agencies, pricing structures, scope and deliverables. The article should not claim unverified market-rate benchmarks or guaranteed results.
3. Expand the existing WFS vs FBA comparison with fulfillment expectations, seller support, inbound/label checks and inventory reporting. Keep its canonical URL and links to Walmart and Amazon services.
4. Allow the site's existing source-driven generator to include the new article in the archive, Amazon reading cards, sitemap and canonical page on deploy.

## Measurement plan — after approval and deployment

- First check that canonical URLs, the generated sitemap and internal links resolve. **Do not** change published URL slugs.
- Capture site-level Google Search Console clicks, impressions, CTR and average position for a complete 28-day period before and after rollout, using **non-overlapping** settled dates; compare the same country (Canada) and search type (Web).
- For each priority query, review the **query + page** combination. A ranking change might reflect a different landing page or different demand, not an editorial improvement.
- Track `amazon-management.html` visibility alongside `amazon-seller-central-consultant-canada.html`; watch for unintended cannibalization.
- Track the new Amazon pricing article separately: whether it becomes indexed, the queries it appears for and whether it drives visits into the service page.
- Check actual qualified enquiries, held calls and proposals. Clicks to booking are *not* completed bookings.
- Allow crawl/indexing time, and avoid making another broad series of edits before results can be assessed.

## Tracking limitations

The current repository has a Google Ads tag and client-side hooks for form success and embedded appointment events. A verified Google Analytics 4 measurement ID/property is **not** configured in the repository. Configure GA4 only once the property and consent/privacy setup are confirmed; don't guess an ID. Formspree submission acceptance, delivered enquiries and qualified leads are different milestones.

The linked GSC Wizard connector previously returned `payment_required`, so future automatic live Search Console analysis requires restored access or owner exports.
