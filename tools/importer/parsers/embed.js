/* eslint-disable */
/* global WebImporter */

/**
 * Parser for embed variant. Base: embed.
 * Source: https://www.healthdirect.gov.au/chest-pain
 * Selector: .cont_youtube-video, .cont_iframe-video
 * Shape: wraps an <iframe> YouTube player. Emit the canonical embed block —
 *   extract the iframe src URL as the embed target (single cell containing the link).
 * UE model (embed): embed_placeholder (reference), embed_placeholderAlt (collapsed),
 *   embed_uri (text). Only embed_uri carries content here → single field hint.
 */
export default function parse(element, { document }) {
  const cells = [];

  const iframe = element.querySelector('iframe[src]');
  const src = iframe ? iframe.getAttribute('src') : null;

  // Empty-block guard: no embeddable URL found.
  if (!src) {
    element.replaceWith(...element.childNodes);
    return;
  }

  // Canonical embed: a single cell containing the URL as a link.
  // Field hint for embed_uri (embed_placeholder is optional and absent here).
  const contentFrag = document.createDocumentFragment();
  contentFrag.appendChild(document.createComment(' field:embed_uri '));
  const link = document.createElement('a');
  link.setAttribute('href', src);
  link.textContent = src;
  contentFrag.appendChild(link);

  cells.push([contentFrag]);

  const block = WebImporter.Blocks.createBlock(document, { name: 'embed', cells });
  element.replaceWith(block);
}
