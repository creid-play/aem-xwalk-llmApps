/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import columnsAlertParser from './parsers/columns-alert.js';
import columnsKeyfactsParser from './parsers/columns-keyfacts.js';
import columnsPromoParser from './parsers/columns-promo.js';
import embedParser from './parsers/embed.js';
import tabsParser from './parsers/tabs.js';

// TRANSFORMER IMPORTS
import healthdirectCleanupTransformer from './transformers/healthdirect-cleanup.js';

// PARSER REGISTRY - Map parser names to functions
const parsers = {
  'columns-alert': columnsAlertParser,
  'columns-keyfacts': columnsKeyfactsParser,
  'columns-promo': columnsPromoParser,
  'embed': embedParser,
  'tabs': tabsParser,
};

// TRANSFORMER REGISTRY - runs for DOM cleanup (before/after parsing)
const transformers = [
  healthdirectCleanupTransformer,
];

// PAGE TEMPLATE CONFIGURATION - Embedded from page-templates.json
const PAGE_TEMPLATE = {
  name: 'symptom-page',
  description: 'Healthdirect symptom topic page (main content column only). H1 + read-time; optional emergency alert; Key facts box; On-this-page TOC; H2/H3 body prose & lists (default content); recurring promo CTA tiles; figure/infographic; embedded video; partner search-results tabs; Sources + last-reviewed. Header/nav, right sidebar, hotline/partners straps and footer are out of scope.',
  urls: [
    'https://www.healthdirect.gov.au/chest-pain',
    'https://www.healthdirect.gov.au/fever-and-high-temperature-in-children',
    'https://www.healthdirect.gov.au/anxiety',
    'https://www.healthdirect.gov.au/sore-throat',
  ],
  blocks: [
    {
      name: 'columns-alert',
      instances: ['.cont_layout-media-object'],
    },
    {
      name: 'columns-keyfacts',
      instances: ['.cont_layout-standout'],
    },
    {
      name: 'columns-promo',
      instances: ['a.cont_layout-media-object__icon-standout'],
    },
    {
      name: 'embed',
      instances: ['.cont_youtube-video', '.cont_iframe-video'],
    },
    {
      name: 'tabs',
      instances: ['.main_content-search-results-partners'],
    },
  ],
};

/**
 * Execute all page transformers for a specific hook
 * @param {string} hookName - The hook name ('beforeTransform' or 'afterTransform')
 * @param {Element} element - The DOM element to transform (typically document.body)
 * @param {Object} payload - The payload containing { document, url, html, params }
 */
function executeTransformers(hookName, element, payload) {
  const enhancedPayload = {
    ...payload,
    template: PAGE_TEMPLATE,
  };

  transformers.forEach((transformerFn) => {
    try {
      transformerFn.call(null, hookName, element, enhancedPayload);
    } catch (e) {
      console.error(`Transformer failed at ${hookName}:`, e);
    }
  });
}

/**
 * Find all blocks on the page based on the embedded template configuration
 * @param {Document} document - The DOM document
 * @param {Object} template - The embedded PAGE_TEMPLATE object
 * @returns {Array} Array of block instances found on the page
 */
function findBlocksOnPage(document, template) {
  const pageBlocks = [];

  template.blocks.forEach((blockDef) => {
    blockDef.instances.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      if (elements.length === 0) {
        console.warn(`Block "${blockDef.name}" selector not found: ${selector}`);
      }
      elements.forEach((element) => {
        pageBlocks.push({
          name: blockDef.name,
          selector,
          element,
          section: blockDef.section || null,
        });
      });
    });
  });

  console.log(`Found ${pageBlocks.length} block instances on page`);
  return pageBlocks;
}

// EXPORT DEFAULT CONFIGURATION
export default {
  transform: (payload) => {
    const { document, url, html, params } = payload;

    const main = document.body;

    // 1. Execute beforeTransform transformers (initial cleanup)
    executeTransformers('beforeTransform', main, payload);

    // 2. Find blocks on page using embedded template
    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);

    // 3. Parse each block using registered parsers
    //    Skip elements already replaced by a prior parser (detached from DOM)
    pageBlocks.forEach((block) => {
      if (!block.element.parentNode) return; // Already replaced by earlier parser
      const parser = parsers[block.name];
      if (parser) {
        try {
          parser(block.element, { document, url, params });
        } catch (e) {
          console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
        }
      } else {
        console.warn(`No parser found for block: ${block.name}`);
      }
    });

    // 4. Execute afterTransform transformers (final cleanup)
    executeTransformers('afterTransform', main, payload);

    // 5. Apply WebImporter built-in rules
    const hr = document.createElement('hr');
    main.appendChild(hr);
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    // 6. Generate sanitized path (full localized path without extension).
    //    Map the root/homepage URL to `/index` to avoid the bundled importer's
    //    empty-path crash.
    const rawPath = new URL(params.originalURL).pathname
      .replace(/\/$/, '')
      .replace(/\.html?$/, '');
    const path = WebImporter.FileUtils.sanitizePath(rawPath === '' ? '/index' : rawPath);

    return [{
      element: main,
      path,
      report: {
        title: document.title,
        template: PAGE_TEMPLATE.name,
        blocks: pageBlocks.map((b) => b.name),
      },
    }];
  },
};
