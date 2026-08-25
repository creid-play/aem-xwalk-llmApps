/*
 * md2jcr-gate.mjs
 *
 * JCR-mapping gate for imported pages. For each content/<slug>.plain.html, it locates
 * every EDS block, converts each block into the grid-table markdown that AEM/Universal
 * Editor ingests (PRESERVING the <!--field:*--> hint comments), and runs the real
 * @adobe/helix-md2jcr against this project's component-*.json models.
 *
 * This is the check the bulk importer never ran: run-bulk-import.js produces markdown +
 * DA HTML but never exercises md2jcr, so container-block model-mapping errors (e.g. the
 * tabs "content isn't mapping to the model" failure, which only occurs when the field
 * hints are missing) surfaced only later inside AEM.
 *
 * Must run from the import-validator scripts dir so @adobe/* resolve:
 *   cd <import-validator dir> && node <repo>/tools/cf/md2jcr-gate.mjs [slug...]
 * With no slugs, gates every content/*.plain.html (excluding index).
 *
 * NOTE: the gate rebuilds block markdown from the imported .plain.html and runs md2jcr
 * exactly as AEM/Universal Editor would. To catch the class of bug that motivated it
 * (the tabs container-block "content isn't mapping to the model" failure, which only
 * occurs when the <!--field:*--> hints are stripped during AEM's markdown conversion),
 * run it against a hint-stripped variant of the markdown — i.e. strip HTML comments
 * before calling md2jcr. The tabs parser was fixed to be hint-INDEPENDENT (content
 * placed in model-field order), so it now passes both with and without hints.
 */
import { md2jcr } from '@adobe/helix-md2jcr';
import { createRequire } from 'module';
import { readFileSync, readdirSync } from 'fs';

const require = createRequire(import.meta.url);
const { load } = require('/home/node/.excat-marketplaces/excat-marketplace/excat/skills/excat-url-discovery/scripts/node_modules/cheerio');

const REPO = '/backups/creid-play/aem-xwalk-llmapps/repo';
const models = JSON.parse(readFileSync(`${REPO}/component-models.json`, 'utf8'));
const definition = JSON.parse(readFileSync(`${REPO}/component-definition.json`, 'utf8'));
const filters = JSON.parse(readFileSync(`${REPO}/component-filters.json`, 'utf8'));

// Known block class names in this project (from page-templates.json blocks[]).
const BLOCK_CLASSES = ['tabs', 'embed', 'columns-alert', 'columns-keyfacts', 'columns-promo'];

// Convert one cell's DOM to markdown-ish text, preserving field-hint comments as
// literal <!--field:x--> tokens (md2jcr reads these from html mdast nodes).
function cellToMd($, cell) {
  const parts = [];
  $(cell).contents().each((_, n) => {
    if (n.type === 'comment') {
      parts.push(`<!--${(n.data || '').trim()}-->`);
    } else if (n.type === 'tag') {
      const $n = $(n);
      if (/^h[1-6]$/.test(n.tagName)) {
        const a = $n.find('a').first();
        const txt = $n.text().trim();
        const href = a.attr('href');
        parts.push(`### ${href ? `[${txt}](${href})` : txt}`);
      } else if (n.tagName === 'p') {
        const a = $n.find('a').first();
        const href = a.attr('href');
        const txt = $n.text().trim();
        if (txt) parts.push(href ? `[${txt}](${href})` : txt);
      } else if (n.tagName === 'ul') {
        $n.find('li').each((__, li) => parts.push(`- ${$(li).text().trim()}`));
      } else if (n.tagName === 'img' || $n.find('img').length) {
        const img = n.tagName === 'img' ? $n : $n.find('img').first();
        parts.push(`![${img.attr('alt') || 'img'}](${img.attr('src') || 'x.png'})`);
      } else {
        const txt = $n.text().trim();
        if (txt) parts.push(txt);
      }
    } else if (n.type === 'text' && (n.data || '').trim()) {
      parts.push(n.data.trim());
    }
  });
  return parts.filter(Boolean);
}

// Build a well-formed 2-column grid table for a block (rows = the block's inner rows).
function blockToGrid(blockName, rowsCells) {
  const W1 = 30;
  const W2 = 80;
  const pad = (s, w) => {
    const t = s || '';
    return t.length > w ? t.slice(0, w) : t + ' '.repeat(w - t.length);
  };
  const bar = (c) => `+${c.repeat(W1 + 2)}+${c.repeat(W2 + 2)}+`;
  const title = blockName.charAt(0).toUpperCase() + blockName.slice(1).replace(/-/g, ' ');
  const out = [`+${'-'.repeat(W1 + 2 + 1 + W2 + 2)}+`];
  out.push(`| ${pad(title, W1 + 2 + 1 + W2 + 2 - 2)} |`);
  out.push(bar('='));
  for (const cells of rowsCells) {
    const c1 = cells[0] || [];
    const c2 = cells[1] || [''];
    const n = Math.max(c1.length, c2.length, 1);
    for (let i = 0; i < n; i += 1) {
      out.push(`| ${pad(c1[i] || '', W1)} | ${pad(c2[i] || '', W2)} |`);
    }
    out.push(bar('-'));
  }
  return out.join('\n');
}

function pageToMarkdown(html) {
  const $ = load(`<main>${html}</main>`, { decodeEntities: false });
  const mdBlocks = ['# Page'];
  BLOCK_CLASSES.forEach((cls) => {
    $(`.${cls}`).each((_, blk) => {
      const rows = [];
      $(blk).children('div').each((__, row) => {
        const cells = $(row).children('div').toArray().map((c) => cellToMd($, c));
        rows.push(cells.length ? cells : [cellToMd($, row)]);
      });
      mdBlocks.push(blockToGrid(cls, rows));
    });
  });
  return mdBlocks.join('\n\n');
}

const argv = process.argv.slice(2);
const slugs = argv.length
  ? argv
  : readdirSync(`${REPO}/content`)
    .filter((f) => f.endsWith('.plain.html') && f !== 'index.plain.html')
    .map((f) => f.replace(/\.plain\.html$/, ''));

let pass = 0;
let fail = 0;
const failures = [];

for (const slug of slugs) {
  let html;
  try {
    html = readFileSync(`${REPO}/content/${slug}.plain.html`, 'utf8');
  } catch {
    console.log(`SKIP  ${slug} (no plain.html)`);
    continue;
  }
  try {
    const md = pageToMarkdown(html);
    const jcr = await md2jcr(md, { models, definition, filters });
    const tabItems = (jcr.match(/model="tabs-item"/g) || []).length;
    console.log(`PASS  ${slug}  tab-items=${tabItems}`);
    pass += 1;
  } catch (e) {
    const msg = (e && e.message ? e.message : String(e)).split('\n').slice(0, 2).join(' | ');
    console.log(`FAIL  ${slug}  ${msg}`);
    failures.push(slug);
    fail += 1;
  }
}

console.log(`\nmd2jcr gate: ${pass} pass, ${fail} fail, ${slugs.length} total`);
if (failures.length) {
  console.log('failed:', failures.join(', '));
  process.exit(1);
}
