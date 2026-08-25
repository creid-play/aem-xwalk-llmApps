#!/usr/bin/env node
/*
 * generate-symptom-cfs.js
 *
 * Reads the already-imported symptom pages (content/<slug>.plain.html) and, for each,
 * produces:
 *   1) content-fragments/fragments/<slug>.json  — a Symptom Content Fragment payload
 *      (field values) ready to import into the DAM against the 'symptom' CF model.
 *   2) content-fragments/pages/<slug>.json       — a page definition that references the
 *      fragment (reusable article core lives in the CF; page keeps SEO metadata + the embed).
 *
 * Field split (per user's "only reusable core as fragment" choice):
 *   FRAGMENT (reusable core): title, readTime, emergencyAlert, keyFacts, body, sources, lastReviewed, sourceUrl
 *   PAGE (page-specific):     SEO Title/Description/Image/og:title metadata + a Content Fragment reference
 *                             + the page-side "Need more information?" partner-results tabs (kept on page,
 *                             not in the reusable fragment, since they are per-page search results).
 *
 * Usage: node tools/cf/generate-symptom-cfs.js
 */

const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..', '..');
const CONTENT_DIR = path.join(REPO, 'content');
const FRAG_DIR = path.join(REPO, 'content-fragments', 'fragments');
const PAGE_DIR = path.join(REPO, 'content-fragments', 'pages');
const URLS_ALL = path.join(REPO, 'catalog', 'urls-all.json');

// DAM + site placement (author-side). Adjust prefixes here if your instance differs.
const CF_DAM_ROOT = '/content/dam/aem-xwalk-llmapps/symptoms';
const CF_MODEL_PATH = '/conf/creid-play/settings/dam/cfm/models/symptom';
const PAGE_ROOT = '/content/aem-xwalk-llmapps/symptoms';

const cheerio = require('/home/node/.excat-marketplaces/excat-marketplace/excat/skills/excat-url-discovery/scripts/node_modules/cheerio');

// Build slug -> source URL map from the catalog.
const slugToUrl = {};
try {
  const urls = JSON.parse(fs.readFileSync(URLS_ALL, 'utf8'))['analysis-urls-all'].urls;
  urls.forEach((u) => {
    const slug = new URL(u.url).pathname.replace(/^\//, '');
    slugToUrl[slug] = u.url;
  });
} catch (e) {
  console.warn('Could not read urls-all.json for source URLs:', e.message);
}

function outer($, el) {
  return $.html(el).trim();
}

function innerHtmlOfBox($, boxSel) {
  // columns-* blocks wrap content in div>div>div; return the innermost content HTML.
  const box = $(boxSel).first();
  if (!box.length) return '';
  const inner = box.find('> div > div').first();
  return (inner.length ? inner.html() : box.html() || '').trim();
}

// Remove xwalk import field-hint comments (e.g. <!-- field:embed_uri -->) from a string.
function stripFieldHints(html) {
  return (html || '').replace(/<!--\s*field:[\s\S]*?-->/g, '').trim();
}

// Drop anchors/paragraphs that carry no text or child content.
function dropEmpty($ctx, scope) {
  scope.find('a').each((_, a) => {
    const $a = $ctx(a);
    if ($a.text().trim() === '' && $a.children().length === 0) $a.remove();
  });
  scope.find('p').each((_, p) => {
    const $p = $ctx(p);
    if ($p.text().trim() === '' && $p.children().length === 0) $p.remove();
  });
}

// Unwrap EDS block scaffolding from a body context in place:
//  - columns-promo: lift the meaningful CTA content out, drop the empty duplicate anchor
//  - embed: replace the block with a plain link to the embedded resource (no field hint)
function unwrapBlocks($ctx) {
  $ctx('.columns-promo').each((_, el) => {
    const $el = $ctx(el);
    const inner = $el.find('> div > div').first();
    if (inner.length) {
      dropEmpty($ctx, inner);
      $el.replaceWith(inner.html() || '');
    } else {
      $el.remove();
    }
  });
  $ctx('.embed').each((_, el) => {
    const $el = $ctx(el);
    const a = $el.find('a').first();
    const href = a.attr('href') || '';
    if (href) $el.replaceWith(`<p><a href="${href}">${href}</a></p>`);
    else $el.remove();
  });
}

// Rebuild the partner-results tabs as a clean tabs block (EDS row-per-tab table),
// stripping the xwalk field-hint comments that were baked into the imported markup.
function rebuildTabs($, tabsEl) {
  const rows = [];
  $(tabsEl).children('div').each((_, row) => {
    const cells = $(row).children('div');
    if (cells.length < 2) return;
    const label = $(cells[0]).text().trim();
    const content = stripFieldHints($(cells[1]).html() || '');
    if (label || content) rows.push({ label, content });
  });
  if (!rows.length) return '';
  const rowsHtml = rows
    .map((r) => `<div><div><p>${r.label}</p></div><div>${r.content}</div></div>`)
    .join('');
  return `<div class="tabs">${rowsHtml}</div>`;
}

function processFile(file) {
  const slug = file.replace(/\.plain\.html$/, '');
  const html = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf8');
  const $ = cheerio.load(html, { decodeEntities: false });

  // ---- Page-level SEO metadata (from the trailing .metadata block) ----
  const meta = {};
  $('div.metadata > div').each((_, row) => {
    const cells = $(row).children('div');
    if (cells.length >= 2) {
      const key = $(cells[0]).text().trim();
      const valCell = $(cells[1]);
      const img = valCell.find('img').first();
      meta[key] = img.length ? (img.attr('src') || '') : valCell.text().trim();
    }
  });

  // ---- Title + read time ----
  const title = ($('h1').first().text() || meta['og:title'] || slug).trim();
  let readTime = '';
  const h1 = $('h1').first();
  const afterH1 = h1.nextAll('p').first();
  if (afterH1.length && afterH1.find('em').length) readTime = afterH1.find('em').first().text().trim();

  // ---- Emergency alert (columns-alert) ----
  const emergencyAlert = stripFieldHints(innerHtmlOfBox($, '.columns-alert'));

  // ---- Key facts (columns-keyfacts) — keep the <ul>, drop the inner "Key facts" heading ----
  let keyFacts = '';
  const kf = $('.columns-keyfacts').first();
  if (kf.length) {
    const ul = kf.find('ul').first();
    keyFacts = stripFieldHints(ul.length ? outer($, ul) : (kf.find('> div > div').first().html() || ''));
  }

  // ---- Sources (h4 "Sources:" + following <p>) + last reviewed ----
  let sources = '';
  let lastReviewed = '';
  const srcHeading = $('h4#sources, h4:contains("Sources")').first();
  if (srcHeading.length) {
    const p = srcHeading.nextAll('p').first();
    if (p.length) sources = stripFieldHints(outer($, p));
  }
  $('p').each((_, p) => {
    const t = $(p).text().trim();
    const m = t.match(/^Last reviewed:\s*(.+)$/i);
    if (m) lastReviewed = m[1].trim();
  });

  // ---- Body: everything in-scope between the TOC and the "Need more information?" section,
  //      minus the alert/keyfacts (already captured), the TOC list, and the sources/last-reviewed footer.
  // Strategy: clone body, drop known non-body regions, then serialise the remaining flow.
  const $body = cheerio.load(html, { decodeEntities: false });
  const root = $body('body > div').first();
  // Remove page furniture & already-extracted parts:
  $body('.columns-alert').remove();
  $body('.columns-keyfacts').remove();
  $body('.tabs').remove();                 // partner results -> page side
  $body('div.metadata').closest('div').remove();
  // Remove the facebook tracking pixel + "beginning of content" anchor
  $body('img[src*="facebook.com/tr"]').closest('p').remove();
  $body('a:contains("beginning of content")').closest('p').remove();
  // Remove H1 + read-time (captured as fields)
  $body('h1').first().nextAll('p').first().remove();
  $body('h1').first().remove();
  // Remove "On this page" TOC (heading + following <ul>)
  const toc = $body('h2#on-this-page, h2:contains("On this page")').first();
  if (toc.length) { toc.nextAll('ul').first().remove(); toc.remove(); }
  // Remove Sources heading + its paragraph, "about our content" line, last-reviewed, and "Need more information?" heading/intro
  const sh = $body('h4#sources, h4:contains("Sources")').first();
  if (sh.length) { sh.nextAll('p').first().remove(); sh.remove(); }
  $body('p:contains("development and quality assurance of healthdirect content")').remove();
  $body('p').each((_, p) => { if (/^Last reviewed:/i.test($body(p).text().trim())) $body(p).remove(); });
  const nmi = $body('h2#need-more-information, h2:contains("Need more information")').first();
  if (nmi.length) { nmi.nextAll('p').first().remove(); nmi.remove(); }

  // Unwrap EDS block scaffolding (promo/embed) and strip any leaked field-hint comments.
  unwrapBlocks($body);
  const bodyHtml = stripFieldHints((root.length ? root.html() : $body('body').html() || ''));

  // ---- Page-side partner results tabs (rebuilt as a clean tabs block) ----
  const tabsHtml = (() => {
    const t = $('.tabs').first();
    return t.length ? rebuildTabs($, t.get(0)) : '';
  })();

  const sourceUrl = slugToUrl[slug] || `https://www.healthdirect.gov.au/${slug}`;

  // ---- Fragment payload ----
  const fragment = {
    model: CF_MODEL_PATH,
    fragmentPath: `${CF_DAM_ROOT}/${slug}`,
    name: slug,
    title,
    fields: {
      title,
      readTime,
      emergencyAlert,
      keyFacts,
      body: bodyHtml,
      sources,
      lastReviewed,
      sourceUrl,
    },
  };

  // ---- Page-with-embed definition ----
  const page = {
    pagePath: `${PAGE_ROOT}/${slug}`,
    template: 'symptom-page-cf',
    title,
    metadata: {
      title: meta['Title'] || `${title} | healthdirect`,
      description: meta['Description'] || '',
      image: meta['Image'] || '',
      ogTitle: meta['og:title'] || title,
    },
    contentFragmentRef: `${CF_DAM_ROOT}/${slug}`,
    pageSideContent: {
      partnerResultsTabs: tabsHtml,
    },
  };

  fs.writeFileSync(path.join(FRAG_DIR, `${slug}.json`), JSON.stringify(fragment, null, 2) + '\n');
  fs.writeFileSync(path.join(PAGE_DIR, `${slug}.json`), JSON.stringify(page, null, 2) + '\n');

  return {
    slug,
    title,
    hasAlert: !!emergencyAlert,
    keyFactsLen: keyFacts.length,
    bodyLen: bodyHtml.length,
    sourcesLen: sources.length,
    lastReviewed,
    hasTabs: !!tabsHtml,
  };
}

const files = fs.readdirSync(CONTENT_DIR)
  .filter((f) => f.endsWith('.plain.html') && f !== 'index.plain.html');

const summary = [];
for (const f of files) {
  try {
    summary.push(processFile(f));
  } catch (e) {
    console.error(`FAILED ${f}: ${e.message}`);
  }
}

// Manifest
const manifest = {
  generatedFrom: 'content/*.plain.html',
  model: CF_MODEL_PATH,
  cfDamRoot: CF_DAM_ROOT,
  pageRoot: PAGE_ROOT,
  count: summary.length,
  fragments: summary,
};
fs.writeFileSync(
  path.join(REPO, 'content-fragments', 'manifest.json'),
  JSON.stringify(manifest, null, 2) + '\n',
);

console.log(`Generated ${summary.length} fragment + page definitions.`);
const noBody = summary.filter((s) => s.bodyLen < 200);
const noKeyFacts = summary.filter((s) => s.keyFactsLen === 0);
const withAlert = summary.filter((s) => s.hasAlert);
console.log(`  with emergency alert: ${withAlert.length}`);
console.log(`  missing key facts:    ${noKeyFacts.length}`);
console.log(`  short body (<200ch):  ${noBody.length}${noBody.length ? ' -> ' + noBody.map((s) => s.slug).join(', ') : ''}`);
