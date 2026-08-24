/* eslint-disable */
/* global WebImporter */

/**
 * Parser for columns-promo variant. Base: columns.
 * Source: https://www.healthdirect.gov.au/chest-pain
 * Selector: a.cont_layout-media-object__icon-standout
 * Shape: clickable CTA tile — wrapping <a href>, decorative <i>, and a <p> with
 *   a bold label + description. Preserve the link href as the tile target and keep
 *   the label/description rich text. The decorative icon <i> is dropped.
 * NOTE: Columns blocks carry default content only — NO field hints (hinting.md Rule 4).
 */
export default function parse(element, { document }) {
  const cells = [];

  // The wrapping element is itself the <a>; fall back to a nested anchor if the
  // selector ever resolves to a container.
  const anchor = element.matches('a[href]') ? element : element.querySelector('a[href]');
  const href = anchor ? anchor.getAttribute('href') : null;

  // The label + description live in the <p> (with inline <strong> emphasis).
  const paragraph = element.querySelector('p');

  const contentCell = [];
  if (href) {
    // Wrap the rich label/description text inside an anchor so the tile target
    // (href) is preserved as a link.
    const link = document.createElement('a');
    link.setAttribute('href', href);
    if (paragraph) {
      link.appendChild(paragraph);
    } else {
      link.textContent = (anchor.textContent || '').trim();
    }
    const p = document.createElement('p');
    p.appendChild(link);
    contentCell.push(p);
  } else if (paragraph) {
    contentCell.push(paragraph);
  }

  // Empty-block guard: nothing meaningful to emit.
  if (contentCell.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  // Single column: one row, one cell holding the linked promo content.
  cells.push([contentCell]);

  const block = WebImporter.Blocks.createBlock(document, { name: 'columns-promo', cells });
  element.replaceWith(block);
}
