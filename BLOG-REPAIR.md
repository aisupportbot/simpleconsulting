# Blog URL repair

Prepared from the latest uploaded main commit, `422afbb`.

The live archive was checked: 115 article URLs, 112 successful responses and three confirmed HTTP 404 responses:

- `/blog/amazon-ppc-audit-checklist-canada.html`
- `/blog/marketplace-reimbursement-review-records-checklist.html`
- `/blog/walmart-marketplace-launch-readiness-checklist.html`

The corresponding files were uploaded at the repository root, rather than in `blog/`. Some existing files inside `blog/` also retained the previous header and stylesheet.

The repair regenerates article pages from the existing, uploaded source. It adds the three missing canonical files, updates all article pages to the shared current header and turns root article copies into redirects to their maintained `/blog/` versions. Existing article slugs are preserved. No new design, campaign or service changes are included.

Validation: 249 HTML files, 132 indexable canonical pages, 115 legacy redirects; metadata, JSON-LD, sitemap, internal links and fragments pass. All 115 archive article URLs return HTTP 200 on the local server and have the same shared header as the homepage. No form submission or appointment was made.

Publication is pending approval. After publication, repeat the live URL check to confirm all 115 links return successful responses.

For a manual upload, preserve the archive's folder paths: the `blog` folder belongs at the repository root and its HTML files belong inside it. The root-level article files in this repair are redirects. Do not flatten the `blog` folder or upload only the ZIP file itself. A GitHub commit is preferable to avoid another partial or flattened upload.
