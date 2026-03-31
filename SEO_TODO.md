# AI Resume Pass SEO Roadmap

This document tracks the current SEO, GEO, and social-discovery work for `https://www.airesumepass.com`.

It is focused on the current product state:

- English-first marketing and metadata
- Global search discovery
- AI search / LLM discoverability
- Template landing pages as the main scalable SEO surface
- Social sharing quality on X, Facebook, LinkedIn, and other Open Graph consumers

ROI labels:

- **[ROI: High]** likely to improve crawl quality, rankings, or CTR quickly
- **[ROI: Medium]** important medium-term authority or conversion work
- **[ROI: Low]** useful refinement, but not urgent

## Current production baseline

- [x] Canonical production domain is `https://www.airesumepass.com`.
- [x] Global metadata exists in `src/app/layout.tsx`.
- [x] Open Graph and Twitter image metadata exist and point to `/og-image.png`.
- [x] `favicon.ico`, `apple-touch-icon.png`, and generated brand assets are in place.
- [x] `robots.txt` exists at `src/app/robots.ts`.
- [x] `sitemap.xml` exists at `src/app/sitemap.ts`.
- [x] `llms.txt` exists at `src/app/llms.txt/route.ts`.
- [x] The sitemap no longer includes disabled article routes.
- [x] `llms.txt` now uses the current `www` domain and current public page inventory.

## Phase 1: Crawlability and indexing hygiene

- [x] **[ROI: High]** Keep `robots.txt` index-friendly for public pages and disallow private surfaces like `/editor`, `/admin`, and API routes.
- [x] **[ROI: High]** Keep `sitemap.xml` aligned with currently indexable routes only.
- [x] **[ROI: High]** Keep canonical URLs aligned to the `www` production domain.
- [x] **[ROI: High]** Verify that the non-`www` domain permanently redirects to `https://www.airesumepass.com`.
- [ ] **[ROI: High]** Submit the current sitemap to Google Search Console and Bing Webmaster Tools.
- [ ] **[ROI: Medium]** Review Search Console coverage for soft 404, duplicate canonical, and excluded-by-noindex issues after deployment.

## Phase 2: Page-level metadata quality

- [x] **[ROI: High]** Global metadata exists for the site root layout.
- [ ] **[ROI: High]** Add dedicated metadata for `/ai`.
- [ ] **[ROI: High]** Add dedicated metadata for `/import`.
- [ ] **[ROI: High]** Add dedicated metadata for `/templates`.
- [ ] **[ROI: High]** Add dedicated metadata for `/about`.
- [ ] **[ROI: High]** Add dedicated metadata for `/templates/[role]` pages based on template content.
- [ ] **[ROI: Medium]** Add dedicated metadata for `/templates/category/[category]` and `/templates/industry/[industry]` pages.
- [ ] **[ROI: Medium]** Ensure every major landing page has a unique title and description with no duplication.

## Phase 3: Structured data and entity clarity

- [x] **[ROI: Medium]** Global `SoftwareApplication` JSON-LD exists.
- [ ] **[ROI: High]** Add `Organization` JSON-LD with brand name, URL, logo, and support email.
- [ ] **[ROI: Medium]** Add `WebSite` JSON-LD with a consistent site name and canonical URL.
- [ ] **[ROI: Medium]** Add `sameAs` links once public brand profiles exist.
- [ ] **[ROI: Medium]** Add page-specific structured data where appropriate, such as `BreadcrumbList` on visible template pages.
- [ ] **[ROI: Low]** Evaluate `FAQPage` structured data for homepage or support/trust content if the visible content justifies it.

## Phase 4: Programmatic SEO for templates

- [x] **[ROI: High]** Template hub pages exist.
- [x] **[ROI: High]** Role, category, and industry template routes are included in the sitemap.
- [ ] **[ROI: High]** Expand template landing pages with role-specific intro copy, writing tips, and keyword-aligned summaries.
- [ ] **[ROI: High]** Add stronger internal links between related roles, categories, and industries.
- [ ] **[ROI: Medium]** Add visible breadcrumbs to template pages, not only structured data.
- [ ] **[ROI: Medium]** Ensure template pages expose enough static content for crawlers beyond UI chrome.

## Phase 5: Trust, E-E-A-T, and conversion-supporting pages

- [x] **[ROI: Medium]** About page exists.
- [ ] **[ROI: High]** Add a dedicated Privacy Policy page.
- [ ] **[ROI: High]** Add a dedicated Terms of Service page.
- [ ] **[ROI: High]** Add a dedicated Contact or Support page using `support@airesumepass.com`.
- [ ] **[ROI: Medium]** Add a Changelog or Updates page to show ongoing product maintenance.
- [ ] **[ROI: Medium]** Expand the About page with founder, product mission, and trust details.
- [ ] **[ROI: Medium]** Link trust pages from the footer and other crawlable public pages.

## Phase 6: Social discovery and share quality

- [x] **[ROI: High]** Shared Open Graph image generation is in place.
- [x] **[ROI: High]** Favicon and Apple touch icon generation is in place.
- [ ] **[ROI: Medium]** Add page-specific Open Graph titles and descriptions for the highest-value landing pages.
- [ ] **[ROI: Medium]** Consider role-specific Open Graph images for template detail pages if social sharing becomes a traffic channel.
- [ ] **[ROI: Low]** Validate previews on X, Facebook, LinkedIn, and Discord after each major metadata update.

## Phase 7: GEO / AI search readiness

- [x] **[ROI: Medium]** `llms.txt` exists and points to current public routes.
- [ ] **[ROI: High]** Add short factual product claims to the homepage and About page, such as “100% free”, “ATS-friendly”, and “watermark-free PDF export”.
- [ ] **[ROI: Medium]** Create comparison content that is factual and citation-friendly.
- [ ] **[ROI: Medium]** Add stronger source-of-truth wording to trust pages so AI systems can summarize product facts more reliably.
- [ ] **[ROI: Low]** Periodically review `llms.txt` so it reflects the current public information architecture.

## Phase 8: Content roadmap

- [ ] **[ROI: High]** Build an English-first pillar and cluster content strategy around resume writing, ATS optimization, job-targeted resumes, and resume examples.
- [ ] **[ROI: High]** Create high-intent pages such as “how to write a resume”, “ATS resume template”, and “resume summary examples”.
- [ ] **[ROI: Medium]** Reintroduce article content only if the content quality, language quality, and internal-linking strategy are strong enough to support indexation.
- [ ] **[ROI: Medium]** If article pages return, ensure they get unique metadata, structured data, and related-template linking before re-adding them to the sitemap.

## Phase 9: Technical SEO follow-up

- [ ] **[ROI: High]** Review Core Web Vitals for homepage and major landing pages.
- [ ] **[ROI: Medium]** Audit image delivery and caching strategy for public assets.
- [ ] **[ROI: Medium]** Confirm there are no mixed-content, hydration, or rendering issues affecting crawler-visible HTML.
- [ ] **[ROI: Medium]** Review redirect behavior for login/protected routes to ensure crawlers are not sent into auth loops.
- [ ] **[ROI: Low]** Add recurring checks for broken links, orphan pages, and metadata regressions.

## Phase 10: Monitoring and operating rhythm

- [ ] **[ROI: High]** Check Google Search Console weekly for coverage, impressions, CTR, and top landing pages.
- [ ] **[ROI: High]** Check Bing Webmaster Tools weekly for crawl and index issues.
- [ ] **[ROI: Medium]** Track rankings for a small set of target keywords tied to landing pages.
- [ ] **[ROI: Medium]** Keep a changelog of SEO-impacting edits such as metadata, sitemap, robots, and route visibility changes.
- [ ] **[ROI: Low]** Revalidate social previews after brand or metadata updates.

## Immediate next actions

- [ ] Add dedicated metadata for `/ai`, `/import`, `/templates`, and `/about`.
- [ ] Add trust pages: Privacy Policy, Terms, and Contact/Support.
- [ ] Verify `www` redirect behavior in production.
- [ ] Submit and monitor the current sitemap in Search Console and Bing Webmaster Tools.
