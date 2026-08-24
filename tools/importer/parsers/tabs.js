/* eslint-disable */
/* global WebImporter */

/**
 * Parser for tabs variant. Base: tabs.
 * Source: https://www.healthdirect.gov.au/chest-pain
 * Selector: .main_content-search-results-partners
 * Shape: two-tab partner search-results switcher.
 *   - Tab labels come from the .dor-tabs_item-btn buttons in the <nav>.
 *   - Each tab panel is a <section> (#searchGeneralResults / #searchProfessionalResults)
 *     containing repeated partner result tiles (heading link, snippet paragraph,
 *     "Read more on … website" line, partner logo image).
 *   Tiles are authored as rich text / default content INSIDE each panel (NO nested block).
 *
 * Container block: one row per tab. Item model (tabs-item) fields, in order:
 *   title (text, tab label) → cell 1;
 *   content_heading (text, collapsed group start), content_headingType (collapsed/skip),
 *   content_image (reference), content_richtext (richtext) → cell 2 (grouped content_*).
 * Here each panel holds multiple heterogeneous tiles, so all panel content is authored
 * as content_richtext (a single grouped cell). No single heading/image applies at the
 * tab level, so content_heading / content_image are omitted.
 */
export default function parse(element, { document }) {
  const cells = [];

  // Tab labels from the nav buttons.
  const tabButtons = Array.from(
    element.querySelectorAll('nav .dor-tabs_item-btn, .dor-tabs_item-btn'),
  );

  // Tab panels: the top-level <section> panels (exclude the "show more" sub-sections).
  const panels = Array.from(
    element.querySelectorAll(':scope > section[id], :scope > section'),
  ).filter((s) => !s.classList.contains('main_content-search-show-more'));

  const count = Math.min(tabButtons.length, panels.length);

  for (let i = 0; i < count; i += 1) {
    const button = tabButtons[i];
    const panel = panels[i];

    // Cell 1: title (tab label).
    const titleFrag = document.createDocumentFragment();
    titleFrag.appendChild(document.createComment(' field:title '));
    titleFrag.appendChild(document.createTextNode((button.textContent || '').trim()));

    // Cell 2: content_richtext — all tile content authored as default/rich content.
    const contentFrag = document.createDocumentFragment();
    contentFrag.appendChild(document.createComment(' field:content_richtext '));

    // Leading "Top results" paragraph (direct child of the panel).
    const leadP = panel.querySelector(':scope > p');
    if (leadP) {
      const p = document.createElement('p');
      p.textContent = leadP.textContent.trim();
      contentFrag.appendChild(p);
    }

    // Each partner result tile.
    const tiles = Array.from(panel.querySelectorAll('a.main_content-search-tile'));
    tiles.forEach((tile) => {
      const href = tile.getAttribute('href');

      // Heading link: wrap the tile heading text in the tile's link.
      const headingEl = tile.querySelector('h3, h2, h4');
      if (headingEl) {
        const h3 = document.createElement('h3');
        if (href) {
          const a = document.createElement('a');
          a.setAttribute('href', href);
          a.textContent = headingEl.textContent.trim();
          h3.appendChild(a);
        } else {
          h3.textContent = headingEl.textContent.trim();
        }
        contentFrag.appendChild(h3);
      }

      // Snippet paragraph.
      const introP = tile.querySelector('.main_content-search-tile-intro p, .main_content-search-tile-intro');
      if (introP) {
        const p = document.createElement('p');
        p.textContent = introP.textContent.trim();
        contentFrag.appendChild(p);
      }

      // "Read more on … website" line.
      const readMore = tile.querySelector('.main_content-search-tile-read-more');
      if (readMore) {
        const label = (readMore.textContent || '').trim();
        if (label) {
          const p = document.createElement('p');
          if (href) {
            const a = document.createElement('a');
            a.setAttribute('href', href);
            a.textContent = label;
            p.appendChild(a);
          } else {
            p.textContent = label;
          }
          contentFrag.appendChild(p);
        }
      }

      // Partner logo image.
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
