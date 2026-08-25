#!/usr/bin/env node
/*
 * generate-nav-footer-placeholders.js
 *
 * The EDS boilerplate (scripts/scripts.js -> loadHeader/loadFooter) always fetches
 * /nav.plain.html and /footer.plain.html. Navigation and footer were out of scope for
 * the symptoms migration, so those documents don't exist and the preview logs 404s +
 * "failed to load module for header/footer" errors.
 *
 * This writes MINIMAL placeholder nav and footer fragment documents so the header/footer
 * blocks load successfully and the preview error tab clears. They are intentionally
 * bare — replace them with the real Healthdirect nav/footer when that migration is done.
 *
 * Output (content/ is the preview docroot; /nav -> content/nav.plain.html):
 *   content/nav.plain.html
 *   content/footer.plain.html
 *
 * Usage: node tools/cf/generate-nav-footer-placeholders.js
 */

const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..', '..');
const CONTENT = path.join(REPO, 'content');

// Nav fragment: the header block expects .nav-brand / .nav-sections / .nav-tools groups.
// A single brand link is enough to decorate without errors.
const NAV = `<div>
  <div class="nav-brand">
    <p><a href="/">Healthdirect</a></p>
  </div>
  <div class="nav-sections"></div>
  <div class="nav-tools"></div>
</div>
`;

// Footer fragment: a single line is enough for the footer block to decorate cleanly.
const FOOTER = `<div>
  <p>© 2026 Healthdirect Australia Limited</p>
</div>
`;

const targets = [
  ['nav.plain.html', NAV],
  ['footer.plain.html', FOOTER],
];

for (const [name, html] of targets) {
  const dest = path.join(CONTENT, name);
  if (fs.existsSync(dest)) {
    console.log(`skip  ${name} (already exists)`);
    continue;
  }
  fs.writeFileSync(dest, html);
  console.log(`wrote content/${name}`);
}
