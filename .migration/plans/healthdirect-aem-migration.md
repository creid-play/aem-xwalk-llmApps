# Healthdirect Symptoms Pages → AEM Edge Delivery Migration Plan

## Overview

Migrate all **symptoms pages** from **https://www.healthdirect.gov.au/** to AEM Edge Delivery Services (Crosswalk / Universal Editor project).

Healthdirect's symptoms content lives under a dedicated section (e.g. `/symptoms/...` and related symptom articles). These pages tend to share a common structure — a symptom overview, "what causes it," "when to see a doctor," self-care guidance, and related links — which usually maps to a **single reusable page template**. We'll discover every symptoms URL, confirm they share one template (or split into a small number of variants), then migrate the whole set in bulk.

Scope decisions carried forward:
- **Navigation & footer:** Deferred — this effort focuses on page content only.
- **Nav/footer, commerce, forms:** Out of scope unless a symptoms page specifically requires them.

## Phase 1 — Discover & Catalog Symptoms Pages

- [ ] Confirm the AEM project type and target Block Library endpoint (xwalk/da/doc) for this repo
- [ ] Discover all symptoms URLs (via sitemap.xml filtered to the symptoms section, or targeted crawl)
- [ ] Report the count of symptoms pages found and confirm the set/URL pattern with you
- [ ] Group the symptoms URLs into a page template (expect one template; split into variants only if structures differ)
- [ ] Record the symptoms template with representative URLs and description in the site catalog

## Phase 2 — Symptoms Template Analysis

- [ ] Scrape a representative symptoms page (content, metadata, images)
- [ ] Analyze page structure: sections, content sequences, and authoring decisions
- [ ] Survey available EDS blocks; map content to existing blocks vs. new block variants
- [ ] Record block mappings back into the symptoms template

## Phase 3 — Design System Migration

- [ ] Extract site-level design tokens (colors, typography, spacing) from the source
- [ ] Apply site styling to the EDS project
- [ ] Style each block/variant used by symptoms pages to match the original, verifying visually

## Phase 4 — Import Infrastructure

- [ ] Generate block parsers for each block variant used by the symptoms template
- [ ] Generate page transformers (cleanup, sections, media handling)
- [ ] Assemble the import script combining the symptoms template + parsers + transformers

## Phase 5 — Bulk Import & Verification

- [ ] Run bulk import for the full set of symptoms pages using the project's import script
- [ ] Preview a sample of imported pages and compare against the originals
- [ ] Run post-import validation (content completeness + visual critique) across the set and fix divergences

## Phase 6 — Wrap-up

- [ ] Summarize how many symptoms pages migrated, known gaps, and next steps
- [ ] Note navigation & footer as the recommended follow-up (deferred per scope decision)

## Deferred / Out of Scope

- Header / navigation instrumentation
- Footer migration
- Other page types (articles, tools, service finders) — separate effort
- Commerce / Forms conversion — enable only if a symptoms page requires it

## Checklist (Execution Gate)

- [ ] **Requires Execute mode** — this plan is read-only until switched out of plan mode
- [ ] Begin with Phase 1: discover all symptoms URLs and confirm the set before importing
- [ ] Confirm the symptoms template groups cleanly before generating import infrastructure

---

*Execution of this plan requires switching to Execute mode. Once switched, I'll start by discovering all symptoms URLs and reporting how many pages are in scope before doing any import work.*
