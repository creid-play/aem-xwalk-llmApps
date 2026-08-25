/*
 * build-author-package.mjs
 *
 * Builds an AEM FileVault content package containing the JCR content for every
 * imported symptom page, so they can be installed into the AEM author instance
 * (Package Manager) and then previewed/published via admin.hlx.page.
 *
 * Why this exists: this is an AEM-author-backed (xwalk) project. A page is only
 * previewable/publishable once its content lives in the AEM author JCR. The bulk
 * import only produced local content/*.plain.html — it never uploaded to author,
 * so only a handful of pages reached author and the sync list shows just those.
 * This package carries all pages' content into author in one install.
 *
 * Pipeline per page: content/<slug>.plain.html
 *   -> html2md (helix-importer)  -> markdown (AEM/UE ingest form, hints preserved)
 *   -> md2jcr  (helix-md2jcr)    -> cq:Page JCR XML, using this project's models
 *   -> written to <staging>/jcr_root/content/aem-xwalk-llmapps/<slug>/.content.xml
 *
 * Output: a staging tree under build/author-package/ ready to `zip` into a
 * FileVault package, plus META-INF/vault/{filter.xml,properties.xml}.
 *
 * Must run from the import-validator scripts dir so @adobe/* resolve:
 *   cd <import-validator dir> && node <repo>/tools/cf/build-author-package.mjs [slug...]
 * No slugs => all content/*.plain.html (excluding index and the nav/footer placeholders).
 *
 * After it runs, from the repo:  (cd build/author-package && zip -r ../symptoms-author-package.zip jcr_root META-INF)
 * then install symptoms-author-package.zip via AEM author Package Manager.
 */
import { md2jcr } from '@adobe/helix-md2jcr';
import * as importer from '@adobe/helix-importer';
import { JSDOM } from 'jsdom';
import { readFileSync, readdirSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { dirname } from 'path';

const html2md = importer.html2md;

const REPO = '/backups/creid-play/aem-xwalk-llmapps/repo';
const SITE_PATH = '/content/aem-xwalk-llmapps'; // aemSitePath from .migration/project.json
const OUT = `${REPO}/build/author-package`;
const JCR_ROOT = `${OUT}/jcr_root`;

const models = JSON.parse(readFileSync(`${REPO}/component-models.json`, 'utf8'));
const definition = JSON.parse(readFileSync(`${REPO}/component-definition.json`, 'utf8'));
const filters = JSON.parse(readFileSync(`${REPO}/component-filters.json`, 'utf8'));

// Pages to exclude from the page package (site furniture / not symptom pages).
const EXCLUDE = new Set(['index', 'nav', 'footer']);

const argv = process.argv.slice(2);
const slugs = (argv.length
  ? argv
  : readdirSync(`${REPO}/content`)
    .filter((f) => f.endsWith('.plain.html'))
    .map((f) => f.replace(/\.plain\.html$/, '')))
  .filter((s) => !EXCLUDE.has(s));

// Fresh staging tree.
if (existsSync(OUT)) rmSync(OUT, { recursive: true, force: true });
mkdirSync(JCR_ROOT, { recursive: true });

function writeFileEnsured(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

let ok = 0;
let fail = 0;
const failures = [];
const created = [];

for (const slug of slugs) {
  try {
    const html = readFileSync(`${REPO}/content/${slug}.plain.html`, 'utf8');
    const dom = new JSDOM(`<!DOCTYPE html><html><body><main>${html}</main></body></html>`);
    const md = await html2md(`https://www.healthdirect.gov.au/${slug}`, dom.window.document, undefined, {});
    const markdown = typeof md === 'string' ? md : md.md;
    const jcr = await md2jcr(markdown, { models, definition, filters });
    // One page node per slug: /content/aem-xwalk-llmapps/<slug>/.content.xml
    const dest = `${JCR_ROOT}${SITE_PATH}/${slug}/.content.xml`;
    writeFileEnsured(dest, jcr);
    created.push(`${SITE_PATH}/${slug}`);
    ok += 1;
  } catch (e) {
    const msg = (e && e.message ? e.message : String(e)).split('\n')[0];
    failures.push(`${slug}: ${msg}`);
    fail += 1;
  }
}

// META-INF/vault/filter.xml — scope the package to exactly the pages we wrote,
// so installing it never touches anything else in author.
const filterEntries = created
  .map((p) => `  <filter root="${p}" mode="replace"/>`) // replace = overwrite that page only
  .join('\n');
const filterXml = `<?xml version="1.0" encoding="UTF-8"?>
<workspaceFilter version="1.0">
${filterEntries}
</workspaceFilter>
`;
writeFileEnsured(`${OUT}/META-INF/vault/filter.xml`, filterXml);

const propsXml = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!DOCTYPE properties SYSTEM "http://java.sun.com/dtd/properties.dtd">
<properties>
  <comment>FileVault Package Definition</comment>
  <entry key="name">healthdirect-symptoms</entry>
  <entry key="group">excat-migration</entry>
  <entry key="version">1.0</entry>
  <entry key="packageType">content</entry>
</properties>
`;
writeFileEnsured(`${OUT}/META-INF/vault/properties.xml`, propsXml);

console.log(`Author package staged at build/author-package/`);
console.log(`  pages: ${ok} ok, ${fail} fail, ${slugs.length} total`);
if (failures.length) console.log('  failures:\n    ' + failures.join('\n    '));
console.log('\nNext:');
console.log('  cd build/author-package && zip -r ../symptoms-author-package.zip jcr_root META-INF');
console.log('  then install build/symptoms-author-package.zip via AEM author Package Manager,');
console.log('  and bulk-preview/publish all pages via admin.hlx.page.');
