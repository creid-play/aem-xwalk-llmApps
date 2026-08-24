/* eslint-disable */
/* global WebImporter */

/**
 * Parser for columns-keyfacts variant. Base: columns.
 * Source: https://www.healthdirect.gov.au/chest-pain
 * Selector: .cont_layout-standout
 * Shape: "Key facts" <h2> followed by a bulleted <ul>.
 * Single-cell columns block preserving the heading + list.
 * NOTE: Columns blocks carry default content only — NO field hints (hinting.md Rule 4).
 */
export default function parse(element, { document }) {
  const cells = [];

  const heading = element.querySelector('h2, h1, h3, [id="key-facts"]');
  const list = element.querySelector('ul, ol');

  const contentCell = [];
  if (heading) contentCell.push(heading);
  if (list) contentCell.push(list);

  // Empty-block guard: nothing meaningful to emit.
  if (contentCell.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  // Single column: one row, one cell holding heading + list.
  cells.push([contentCell]);

  const block = WebImporter.Blocks.createBlock(document, { name: 'columns-keyfacts', cells });
  element.replaceWith(block);
}
