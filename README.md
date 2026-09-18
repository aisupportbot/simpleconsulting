# Simple Consulting

Static website for www.simpleconsulting.ca. Generated HTML is committed so the existing static host needs no build service or production JavaScript dependencies.

## Editing

- `content/services.json`: service scope, page titles, descriptions and FAQs.
- `posts.json`: articles, category, optional featured flag and stable URL slug.
- `scripts/build_site.py`: homepage, contact, about, services hub and shared templates.
- `assets/site.css`: shared responsive styling.
- `assets/site.js`: navigation, shareable article filters/pagination, campaign labels and optional analytics hook.
- `assets/contact.js`: enquiry form, calendar and assessment handoff.
- `assessment/`: existing standalone and embedded assessment.

Run `python3 scripts/build_site.py` after editing. Do not change an existing article's `slug` when revising its title. Update its `updated` date only for a substantive editorial change. Set the generator's `TODAY` date when core pages materially change. The generator preserves the original publication date and creates canonical `/blog/` pages, focused `/insights/` collections and redirects for the 112 legacy root article URLs already present in this repository.

## Verification

`python3 scripts/check_site.py` checks metadata, JSON-LD syntax, canonical pages, sitemap entries, DOM IDs, local assets, links and fragments. The Google verification file is intentionally excluded from page checks.

`npm install` installs the development-only DOM test dependency. Run `npm test` for form validation, failure recovery, success and duplicate handling, assessment message validation, analytics payload checks, calendar event handling, navigation and blog filtering. These tests simulate responses and never send an enquiry or book a call. Run `npm run check` for source and generated-page checks.

For local visual review, run `python3 -m http.server 8000` in the repository, then open the local site in your own browser. Check desktop and narrow-screen layouts, keyboard navigation, the assessment and the calendar before publishing.

## Publishing and remaining checks

This change is prepared for review; merging into the branch used by the existing host may publish it. Do not merge or publish without Scott's approval.

The static, DOM and Chromium checks pass. Browser coverage includes 1440, 390 and 320 px layouts, archive pagination/search, the assessment handoff, campaign labels, and mocked form failure/success. Screenshots were inspected. No real enquiry or appointment was submitted. Verify actual delivery and scheduling through an authorised live check after publication.

Run `npm ci`, `npm run build`, `npm run check` and `npm test`. For browser QA run `npx playwright install chromium` and `npm run test:browser`; alternatively set `CHROMIUM_PATH` to an existing compatible Chromium executable. Local QA intercepts third-party requests. Test reports/screenshots are saved in ignored `test-results/`.

Before committing, run the generator and confirm generated files are included. After committing, rerun `npm run build` and `git diff --exit-code` to detect stale outputs. See `GROWTH-REVIEW.md` for the audit, exact changes, traffic plan and remaining account-dependent work.

The existing Formspree endpoint and Calendly event are retained. Analytics hooks are present, but no analytics property or tracker is configured. A click on a booking link is not counted as a completed lead; form success and an embedded Calendly scheduling event are separate signals. Direct bookings in another tab must be reconciled through Calendly or an appropriately configured integration. Validate actual attribution before using it to evaluate acquisition.

No client performance metrics, testimonials, active platform certifications or partnerships have been invented. Services are based on the capabilities described on the previous public site. Any case study needs supported results and the client's permission. New article guidance that depends on platform rules should be checked against current documentation before further revisions.
