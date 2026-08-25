/* eslint-disable */
/* global WebImporter */

/**
 * Parser for tabs variant. Base: tabs.
 * Source: https://www.healthdirect.gov.au/chest-pain
 * Selector: .main_content-search-results-partners
 *
 * Container block: one ROW per tab; each row becomes a `tabs-item`.
 * The tabs-item model fields, in order:
 *   title (text), content_heading (text), content_headingType (collapsed),
 *   content_image (reference), content_richtext (richtext).
 *
 * IMPORTANT — no field-hint comments are emitted. AEM/Universal Editor ingests the
 * imported document by converting it to markdown, and that conversion strips HTML
 * comments — so `<!-- field:* -->` hints do NOT survive and the tabs mapping then
 * fails ("content isn't mapping to the model correctly") or yields empty tabs.
 * Instead we rely on md2jcr's automatic field resolution, exactly like the working
 * Block-Collection `tabs`/`tabs-testimonial` reference: cell 1 is the tab title;
 * cell 2 leads with a heading (auto-maps to content_heading) followed by the rich
 * content (auto-maps to content_richtext). This is comment-free and round-trips
 * cleanly through html -> markdown -> md2jcr -> JCR. Verified with @adobe/helix-md2jcr.
 */
export default function parse(element, { document }) {
  const cells = [];

  // Tab labels from the nav buttons.
  const tabButtons = Array.from(
    element.querySelectorAll('nav .dor-tabs_item-btn, .dor-tabs_item-btn'),
  );

  // Tab panels: top-level <section> panels (exclude the "show more" sub-sections).
  const panels = Array.from(
    element.querySelectorAll(':scope > section[id], :scope > section'),
  ).filter((s) => !s.classList.contains('main_content-search-show-more'));

  const count = Math.min(tabButtons.length, panels.length);

  for (let i = 0; i < count; i += 1) {
    const button = tabButtons[i];
    const panel = panels[i];
    const label = (button.textContent || '').trim();

    // ---- Cell 1: title (tab label) ----
    const titleFrag = document.createDocumentFragment();
    titleFrag.appendChild(document.createTextNode(label));

    // ---- Cell 2: content group, in model order, comment-free ----
    // content_heading: a leading heading = the tab label (auto-resolves to content_heading).
    const contentFrag = document.createDocumentFragment();
    const heading = document.createElement('h3');
    heading.textContent = label;
    contentFrag.appendChild(heading);

    // content_richtext: the partner tiles as rich content.
    // Leading "Top results" paragraph (direct child of the panel).
    const leadP = panel.querySelector(':scope > p');
    if (leadP && leadP.textContent.trim()) {
      const p = document.createElement('p');
      p.textContent = leadP.textContent.trim();
      contentFrag.appendChild(p);
    }

    const tiles = Array.from(panel.querySelectorAll('a.main_content-search-tile'));
    tiles.forEach((tile) => {
      const href = tile.getAttribute('href');

      // Tile heading link -> h4 (kept below the tab's own h3 content_heading).
      const headingEl = tile.querySelector('h3, h2, h4');
      if (headingEl) {
        const h4 = document.createElement('h4');
        if (href) {
          const a = document.createElement('a');
          a.setAttribute('href', href);
          a.textContent = headingEl.textContent.trim();
          h4.appendChild(a);
        } else {
          h4.textContent = headingEl.textContent.trim();
        }
        contentFrag.appendChild(h4);
      }

      const introEl = tile.querySelector('.main_content-search-tile-intro p, .main_content-search-tile-intro');
      if (introEl && introEl.textContent.trim()) {
        const p = document.createElement('p');
        p.textContent = introEl.textContent.trim();
        contentFrag.appendChild(p);
      }

      const readMore = tile.querySelector('.main_content-search-tile-read-more');
      if (readMore && readMore.textContent.trim()) {
        const p = document.createElement('p');
        if (href) {
          const a = document.createElement('a');
          a.setAttribute('href', href);
          a.textContent = readMore.textContent.trim();
          p.appendChild(a);
        } else {
          p.textContent = readMore.textContent.trim();
        }
        contentFrag.appendChild(p);
      }

      const logo = tile.querySelector('img.main_content-search-tile-logo, img');
      if (logo) {
        contentFrag.appendChild(logo);
      }
    });

    cells.push([titleFrag, contentFrag]);
  }

  // Empty-block guard: no tabs resolved.
  if (cells.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'tabs', cells });
  element.replaceWith(block);
}
