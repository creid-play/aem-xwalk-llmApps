/* eslint-disable */
var CustomImportScript = (() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // tools/importer/import-symptom-page.js
  var import_symptom_page_exports = {};
  __export(import_symptom_page_exports, {
    default: () => import_symptom_page_default
  });

  // tools/importer/parsers/columns-alert.js
  function parse(element, { document }) {
    const cells = [];
    const paragraph = element.querySelector("p");
    const contentCell = [];
    if (paragraph) {
      contentCell.push(paragraph);
    }
    if (contentCell.length === 0) {
      element.replaceWith(...element.childNodes);
      return;
    }
    cells.push([contentCell]);
    const block = WebImporter.Blocks.createBlock(document, { name: "columns-alert", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/columns-keyfacts.js
  function parse2(element, { document }) {
    const cells = [];
    const heading = element.querySelector('h2, h1, h3, [id="key-facts"]');
    const list = element.querySelector("ul, ol");
    const contentCell = [];
    if (heading) contentCell.push(heading);
    if (list) contentCell.push(list);
    if (contentCell.length === 0) {
      element.replaceWith(...element.childNodes);
      return;
    }
    cells.push([contentCell]);
    const block = WebImporter.Blocks.createBlock(document, { name: "columns-keyfacts", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/columns-promo.js
  function parse3(element, { document }) {
    const cells = [];
    const anchor = element.matches("a[href]") ? element : element.querySelector("a[href]");
    const href = anchor ? anchor.getAttribute("href") : null;
    const paragraph = element.querySelector("p");
    const contentCell = [];
    if (href) {
      const link = document.createElement("a");
      link.setAttribute("href", href);
      if (paragraph) {
        link.appendChild(paragraph);
      } else {
        link.textContent = (anchor.textContent || "").trim();
      }
      const p = document.createElement("p");
      p.appendChild(link);
      contentCell.push(p);
    } else if (paragraph) {
      contentCell.push(paragraph);
    }
    if (contentCell.length === 0) {
      element.replaceWith(...element.childNodes);
      return;
    }
    cells.push([contentCell]);
    const block = WebImporter.Blocks.createBlock(document, { name: "columns-promo", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/embed.js
  function parse4(element, { document }) {
    const cells = [];
    const iframe = element.querySelector("iframe[src]");
    const src = iframe ? iframe.getAttribute("src") : null;
    if (!src) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const contentFrag = document.createDocumentFragment();
    contentFrag.appendChild(document.createComment(" field:embed_uri "));
    const link = document.createElement("a");
    link.setAttribute("href", src);
    link.textContent = src;
    contentFrag.appendChild(link);
    cells.push([contentFrag]);
    const block = WebImporter.Blocks.createBlock(document, { name: "embed", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/tabs.js
  function parse5(element, { document }) {
    const cells = [];
    const tabButtons = Array.from(
      element.querySelectorAll("nav .dor-tabs_item-btn, .dor-tabs_item-btn")
    );
    const panels = Array.from(
      element.querySelectorAll(":scope > section[id], :scope > section")
    ).filter((s) => !s.classList.contains("main_content-search-show-more"));
    const count = Math.min(tabButtons.length, panels.length);
    for (let i = 0; i < count; i += 1) {
      const button = tabButtons[i];
      const panel = panels[i];
      const titleFrag = document.createDocumentFragment();
      titleFrag.appendChild(document.createComment(" field:title "));
      titleFrag.appendChild(document.createTextNode((button.textContent || "").trim()));
      const contentFrag = document.createDocumentFragment();
      contentFrag.appendChild(document.createComment(" field:content_richtext "));
      const leadP = panel.querySelector(":scope > p");
      if (leadP) {
        const p = document.createElement("p");
        p.textContent = leadP.textContent.trim();
        contentFrag.appendChild(p);
      }
      const tiles = Array.from(panel.querySelectorAll("a.main_content-search-tile"));
      tiles.forEach((tile) => {
        const href = tile.getAttribute("href");
        const headingEl = tile.querySelector("h3, h2, h4");
        if (headingEl) {
          const h3 = document.createElement("h3");
          if (href) {
            const a = document.createElement("a");
            a.setAttribute("href", href);
            a.textContent = headingEl.textContent.trim();
            h3.appendChild(a);
          } else {
            h3.textContent = headingEl.textContent.trim();
          }
          contentFrag.appendChild(h3);
        }
        const introP = tile.querySelector(".main_content-search-tile-intro p, .main_content-search-tile-intro");
        if (introP) {
          const p = document.createElement("p");
          p.textContent = introP.textContent.trim();
          contentFrag.appendChild(p);
        }
        const readMore = tile.querySelector(".main_content-search-tile-read-more");
        if (readMore) {
          const label = (readMore.textContent || "").trim();
          if (label) {
            const p = document.createElement("p");
            if (href) {
              const a = document.createElement("a");
              a.setAttribute("href", href);
              a.textContent = label;
              p.appendChild(a);
            } else {
              p.textContent = label;
            }
            contentFrag.appendChild(p);
          }
        }
        const logo = tile.querySelector("img.main_content-search-tile-logo, img");
        if (logo) {
          contentFrag.appendChild(logo);
        }
      });
      cells.push([titleFrag, contentFrag]);
    }
    if (cells.length === 0) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const block = WebImporter.Blocks.createBlock(document, { name: "tabs", cells });
    element.replaceWith(block);
  }

  // tools/importer/transformers/healthdirect-cleanup.js
  var TransformHook = { beforeTransform: "beforeTransform", afterTransform: "afterTransform" };
  function transform(hookName, element, payload) {
    if (hookName === TransformHook.beforeTransform) {
      WebImporter.DOMUtils.remove(element, [
        ".partner-popup-content",
        // "Disclaimer" modal inside the search section (line 758)
        ".veyron-global-popup",
        // global popup shell (line 1092)
        ".veyron-legacy-browser-msg-popup-content",
        // legacy-browser message modal (line 1105)
        "#veyron-throbber",
        // loading throbber (line 1139)
        ".grecaptcha-badge",
        // reCAPTCHA badges (lines 371, 1166)
        '[id^="batBeacon"]'
        // Bing tracking beacon wrapper (line 1177)
      ]);
    }
    if (hookName === TransformHook.afterTransform) {
      WebImporter.DOMUtils.remove(element, [
        "header.hda-head",
        // site header / top nav (line 4)
        "span.rs_do_not_process",
        // Print / Share / Save toolbar + Share-by-email modal (line 244)
        "#readspeaker_button1",
        // Listen / webReader control + player (line 392)
        ".main_content-back-to-top",
        // "Back To Top" nav helper (line 621)
        "section.main_content-links",
        // duplicate "Related pages" / "Search our site for" block (line 629)
        "aside.main_content-col-right",
        // right sidebar: Related pages, Search, Symptom checker widget, Find-a-health-service form (line 775)
        ".veyron-sc-hsf-action-nav",
        // wrapper holding hotline + partners straps (line 908) — removes both and the empty leftover wrapper
        "section.content_hotline",
        // "Healthdirect 24hr 7 days a week hotline" strap (line 909)
        "section.content_partners",
        // government-partners strap (veyron-partner-strap-ui) (line 921)
        "footer.hda-foot",
        // site footer (line 955)
        ".hda-foot_acknowledge"
        // acknowledgement-of-country strip (line 1082)
      ]);
    }
  }

  // tools/importer/import-symptom-page.js
  var parsers = {
    "columns-alert": parse,
    "columns-keyfacts": parse2,
    "columns-promo": parse3,
    "embed": parse4,
    "tabs": parse5
  };
  var transformers = [
    transform
  ];
  var PAGE_TEMPLATE = {
    name: "symptom-page",
    description: "Healthdirect symptom topic page (main content column only). H1 + read-time; optional emergency alert; Key facts box; On-this-page TOC; H2/H3 body prose & lists (default content); recurring promo CTA tiles; figure/infographic; embedded video; partner search-results tabs; Sources + last-reviewed. Header/nav, right sidebar, hotline/partners straps and footer are out of scope.",
    urls: [
      "https://www.healthdirect.gov.au/chest-pain",
      "https://www.healthdirect.gov.au/fever-and-high-temperature-in-children",
      "https://www.healthdirect.gov.au/anxiety",
      "https://www.healthdirect.gov.au/sore-throat"
    ],
    blocks: [
      {
        name: "columns-alert",
        instances: [".cont_layout-media-object"]
      },
      {
        name: "columns-keyfacts",
        instances: [".cont_layout-standout"]
      },
      {
        name: "columns-promo",
        instances: ["a.cont_layout-media-object__icon-standout"]
      },
      {
        name: "embed",
        instances: [".cont_youtube-video", ".cont_iframe-video"]
      },
      {
        name: "tabs",
        instances: [".main_content-search-results-partners"]
      }
    ]
  };
  function executeTransformers(hookName, element, payload) {
    const enhancedPayload = __spreadProps(__spreadValues({}, payload), {
      template: PAGE_TEMPLATE
    });
    transformers.forEach((transformerFn) => {
      try {
        transformerFn.call(null, hookName, element, enhancedPayload);
      } catch (e) {
        console.error(`Transformer failed at ${hookName}:`, e);
      }
    });
  }
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
            section: blockDef.section || null
          });
        });
      });
    });
    console.log(`Found ${pageBlocks.length} block instances on page`);
    return pageBlocks;
  }
  var import_symptom_page_default = {
    transform: (payload) => {
      const { document, url, html, params } = payload;
      const main = document.body;
      executeTransformers("beforeTransform", main, payload);
      const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);
      pageBlocks.forEach((block) => {
        if (!block.element.parentNode) return;
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
      executeTransformers("afterTransform", main, payload);
      const hr = document.createElement("hr");
      main.appendChild(hr);
      WebImporter.rules.createMetadata(main, document);
      WebImporter.rules.transformBackgroundImages(main, document);
      WebImporter.rules.adjustImageUrls(main, url, params.originalURL);
      const rawPath = new URL(params.originalURL).pathname.replace(/\/$/, "").replace(/\.html?$/, "");
      const path = WebImporter.FileUtils.sanitizePath(rawPath === "" ? "/index" : rawPath);
      return [{
        element: main,
        path,
        report: {
          title: document.title,
          template: PAGE_TEMPLATE.name,
          blocks: pageBlocks.map((b) => b.name)
        }
      }];
    }
  };
  return __toCommonJS(import_symptom_page_exports);
})();
