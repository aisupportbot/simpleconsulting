# Site improvements prepared for review — 18 September 2026

Based on the live simpleconsulting.ca website and repository main at 608534c. These changes are prepared on a review branch. Merging to the production branch may publish them; publication needs Scott's approval.

## Findings and changes

| Finding | Implemented change | Practical effect |
| --- | --- | --- |
| The archive had 112 articles across eight broad categories, shown in one long list. Only one existing article explicitly covered Walmart. | Added Amazon, Walmart and inventory/fulfilment guide collections, plus three substantive articles. | Visitors can start with their channel or problem and follow a useful reading path. |
| Legacy root article URLs still served full article copies; their canonical tags pointed to `/blog/`, but the intended redirects had not been generated. | Regenerated 112 legacy URLs as immediate redirects with canonical links and accessible fallback links. Preserved every existing slug. | Readers following old links reach the maintained article version. Existing canonical tags already provided a consolidation signal; this change also resolves the stale reader experience. |
| Generated files did not match the generator; the repository's validation failed. | Regenerated all pages from the current source and verified build reproducibility. | Shared navigation, source content and output are consistent. |
| Articles linked to services, but service pages did not offer matching reading. | Added relevant reading to every service page and collection breadcrumbs to relevant articles. | People can move between learning about a problem and asking for help. |
| The homepage assessment was mainly discoverable through the footer. | Added a quiet assessment link beneath the main homepage actions. | Visitors who are not ready to book have a useful first step. |
| The founder PNG was 530,229 bytes. | Created a 22,764-byte WebP from the same image; updated shared references and social metadata. | About 96% less image transfer, with no additional image request for the social metadata itself. This is an asset-size result, not a measured Core Web Vitals claim. |
| There was no configured analytics property and no campaign source in enquiries. | Retained approved campaign labels in the browser tab for 30 minutes, included them in form enquiries and analytics hooks, and updated the privacy explanation. | Future campaigns can carry recognisable source labels without retaining arbitrary query values, click IDs or form text. Analytics is still not installed. |
| Mobile menus could exceed a short viewport. | Bounded the menu height and allowed internal scrolling; checked 320, 390 and 1440 px layouts. | Navigation stays reachable on small screens. |

## New articles

- **Amazon PPC Audit Checklist: What to Check Before Increasing Spend** — offer readiness, relevant traffic, contribution, stock and a concrete change log. The worked margin calculation is explicitly illustrative.
- **Walmart Marketplace Launch Checklist for Canadian Brands** — country and account model, a pilot assortment, economics, fulfilment handoffs and launch review. US documentation is labelled as US guidance.
- **Marketplace Reimbursement Review: Records to Prepare Before a Claim** — transaction evidence, timing differences, prior adjustments, eligibility and payment reconciliation. No assumed entitlement or guaranteed recovery.

New copy is prepared for Scott's editorial review before publication. No invented client results, testimonials, credentials or account-performance figures were added. The broader existing article archive has not received a complete new fact-check in this change.

## Validation

- Static checks: 246 HTML files, 132 indexable canonical pages and 112 legacy redirects; metadata, JSON-LD, sitemap, local links and fragment targets pass.
- DOM tests: invalid, failed and accepted form submissions; duplicate prevention; assessment origin/source validation; calendar event validation; article filters; mobile menu keyboard handling. Responses are simulated.
- Chromium checks: ten key pages at 1440, 390 and 320 px; no page overflow or JavaScript errors. Search, empty state, clear filters, pagination, URL reload, campaign handoff and the full assessment-to-message/booking path are exercised.
- No-JavaScript archive: all 115 article links remain visible and crawlable. Pagination progressively enhances the existing HTML.
- Screenshots inspected for homepage, Insights, collection pages, article and booking layouts. Test images are local review artifacts, not production assets.
- No real enquiry, appointment, advertising campaign or tracking-property change was made. Actual Formspree delivery and Calendly completion still require an authorised live check.

## Traffic plan after publication

This is a prioritised editorial and campaign plan, not a search-volume forecast. No Search Console, GA4 or Google Ads account data was available for this review.

### First two weeks: establish the baseline

1. Verify Search Console access, inspect the canonical homepage and service URLs, and submit the updated sitemap. Review indexing and search queries before changing existing article URLs or deleting content.
2. Connect the chosen analytics property with an appropriate privacy setup. The existing hooks distinguish booking clicks from form acceptance and embedded Calendly scheduling events. Validate the implementation before using any event for ad bidding.
3. Track qualified enquiries, held calls and resulting proposals. A form accepted by the service is not proof of delivery, a qualified prospect or a sale. Direct Calendly bookings in another tab need their own reconciliation or integration.

### Following eight weeks: publish and improve focused guides

Start with two useful articles per month plus two substantive updates to existing articles. Increase the pace only when each article has a concrete checklist, worked example or decision process worth reading. These are candidates to validate against real queries and enquiry questions:

| Priority | Topic | Intended reader task | Service destination |
| --- | --- | --- | --- |
| 1 | Amazon account handover checklist | Prepare access, open cases and responsibilities when changing operators | Amazon management |
| 2 | Walmart item publishing problems: a diagnostic log | Separate attribute errors, offer notices and missing evidence using current country-specific docs | Walmart management |
| 3 | FBA, WFS and 3PL inventory reconciliation worksheet | Match physical stock, platform records and stock in transit | Inventory & fulfilment |
| 4 | What should an Amazon account management scope include? | Compare responsibilities, reporting and project versus ongoing support | Amazon management |
| 5 | A weekly marketplace operations review | Use a practical agenda covering offers, stock, orders and unresolved cases | Fractional support |
| 6 | Walmart Canada versus US launch preparation | Identify what must be verified separately for each market; source current requirements | Walmart management |
| 7 | Marketplace contribution reporting: costs to include | Define an operating report without treating attributed ad revenue as profit | Systems & reporting |
| 8 | Reimbursement case tracking: from discrepancy to reconciliation | Show a redacted or fictional worked register, clearly labelled | Reimbursement reviews |

Use the existing collections to distribute these guides. Link each new article from its relevant service page and two genuinely related articles. Share concise excerpts on Scott's established business channels when approved. Do not create location pages or multiple near-identical posts just to target keyword variations. Obtain permission and supporting evidence before publishing any client example.

### Paid search: prepare a small, measurable test

Use separate Amazon and Walmart service campaigns rather than sending every click to the homepage. Start with the countries Scott actually wants to serve, exact/phrase intent-led queries, and an agreed test budget. The examples below are hypotheses, not verified keyword demand or cost estimates.

| Campaign | Example query themes | Landing page | Measurement |
| --- | --- | --- | --- |
| Amazon management | amazon account management canada; amazon marketplace consultant | `/amazon-management.html` | Qualified enquiry and held call |
| Walmart management | walmart marketplace consultant; walmart account management | `/walmart-management.html` | Qualified enquiry and held call |
| Inventory & fulfilment (later test) | ecommerce inventory consultant; marketplace operations support | `/ecommerce-operations.html` | Qualified enquiry and agreed project scope |

Ad messages should match the page: direct work with Scott, marketplace operations and a free introductory call. Do not advertise guaranteed growth, recovered amounts, platform endorsement or a free detailed audit. Review actual search terms for irrelevant job searches, consumer orders, login assistance and training requests; avoid blanket exclusions that remove relevant consulting enquiries.

Choose the maximum acceptable acquisition cost from the economics of a suitable engagement, then set the test budget. Do not scale based on clicks, CTR or unqualified form submissions alone. No spend is authorised or launched by this change.

Recognised campaign examples:

`https://www.simpleconsulting.ca/amazon-management.html?utm_source=google&utm_medium=cpc&utm_campaign=amazon-management`

`https://www.simpleconsulting.ca/walmart-management.html?utm_source=google&utm_medium=cpc&utm_campaign=walmart-management`

Supported sources: `google`, `bing`, `linkedin`, `newsletter`. Supported media: `cpc`, `organic`, `referral`, `email`, `social`. Supported campaign names: `amazon-management`, `walmart-management`, `inventory-fulfilment`, `marketplace-guides`. Other values are deliberately ignored. Retention is limited to the current tab; this is a lightweight source aid, not a full attribution system.

## Reference material checked

- [Google: creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) supports useful, focused articles rather than publishing volume for its own sake.
- [Google: canonical URLs and duplicate consolidation](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls) informs preservation of canonical paths and consolidation of legacy copies. Server-side redirects would be preferable if the host supported configuring them; immediate HTML redirects work within this static repository.
- [Google Ads: Quality Score](https://support.google.com/google-ads/answer/6167118) includes ad relevance and landing-page experience; service-specific destinations support a clearer match to the enquiry intent.
- [Amazon Ads: Sponsored Products](https://advertising.amazon.com/solutions/products/sponsored-products), [Walmart US Marketplace](https://marketplace.walmart.com/sell-on-walmart/), and [Amazon Canada FBA overview](https://sell.amazon.ca/fulfilment-by-amazon) are linked in the new guides for their respective programme context. Account-specific policy and claim deadlines must be checked in the relevant marketplace account.
