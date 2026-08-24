/* eslint-disable */
/* global WebImporter */

/**
 * Parser for columns-alert variant. Base: columns.
 * Source: https://www.healthdirect.gov.au/chest-pain
 * Selector: .cont_layout-media-object
 * Shape: emergency callout — decorative warning <i> + <p><strong>…</strong></p>.
 * Single-cell columns block. The decorative icon <i> has no content and is dropped.
 * NOTE: Columns blocks carry default content only — NO field hints (hinting.md Rule 4).
 */
export default function parse(element, { document }) {
  const cells = [];

  // The emphasized warning sentence lives in the <p> (keep its inline emphasis).
  const paragraph = element.querySelector('p');

  const contentCell = [];
  if (paragraph) {
    contentCell.push(paragraph);
  }

  // Empty-block guard: nothing meaningful to emit.
  if (contentCell.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  // Single column: one row, one cell holding all content.
  cells.push([contentCell]);

  const block = WebImporter.Blocks.createBlock(document, { name: 'columns-alert', cells });
  element.replaceWith(block);
}
