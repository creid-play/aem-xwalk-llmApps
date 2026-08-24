/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: Healthdirect site-wide cleanup.
 *
 * Removes non-authorable site furniture from the symptom-page template so the
 * import contains only page-level authorable content. All selectors below are
 * taken from the captured DOM in migration-work/cleaned.html.
 *
 * IN-SCOPE content that must survive (do NOT target these):
 *   - main.main_content-article-text        (article body: H1, read-time, alert,
 *                                             Key facts, On-this-page TOC, prose,
 *                                             figures, promo tiles, video)
 *   - footer.main_content-article-text-footer (Sources list — KEEP)
 *   - section.main_content-search           (partner-results tabs — KEEP)
 *
 * Because the in-scope article contains its own nested <header> (H1 + read-time)
 * and a nested <footer> (Sources), this transformer never targets bare `header`
 * or `footer`; only class/id-scoped site-furniture selectors are used.
 */

const TransformHook = { beforeTransform: 'beforeTransform', afterTransform: 'afterTransform' };

export default function transform(hookName, element, payload) {
  if (hookName === TransformHook.beforeTransform) {
    // Modals, overlays, throbbers, captcha and tracking beacons. Removed early
    // so they never interfere with block matching. None overlap a parser target.
    WebImporter.DOMUtils.remove(element, [
      '.partner-popup-content',                 // "Disclaimer" modal inside the search section (line 758)
      '.veyron-global-popup',                   // global popup shell (line 1092)
      '.veyron-legacy-browser-msg-popup-content', // legacy-browser message modal (line 1105)
      '#veyron-throbber',                       // loading throbber (line 1139)
      '.grecaptcha-badge',                      // reCAPTCHA badges (lines 371, 1166)
      '[id^="batBeacon"]',                      // Bing tracking beacon wrapper (line 1177)
    ]);
  }

  if (hookName === TransformHook.afterTransform) {
    // Non-authorable site chrome. Selectors are class/id-scoped so in-scope
    // nested <header>/<footer> in the article are not touched.
    WebImporter.DOMUtils.remove(element, [
      'header.hda-head',                 // site header / top nav (line 4)
      'span.rs_do_not_process',          // Print / Share / Save toolbar + Share-by-email modal (line 244)
      '#readspeaker_button1',            // Listen / webReader control + player (line 392)
      '.main_content-back-to-top',       // "Back To Top" nav helper (line 621)
      'section.main_content-links',      // duplicate "Related pages" / "Search our site for" block (line 629)
      'aside.main_content-col-right',    // right sidebar: Related pages, Search, Symptom checker widget, Find-a-health-service form (line 775)
      '.veyron-sc-hsf-action-nav',       // wrapper holding hotline + partners straps (line 908) — removes both and the empty leftover wrapper
      'section.content_hotline',         // "Healthdirect 24hr 7 days a week hotline" strap (line 909)
      'section.content_partners',        // government-partners strap (veyron-partner-strap-ui) (line 921)
      'footer.hda-foot',                 // site footer (line 955)
      '.hda-foot_acknowledge',           // acknowledgement-of-country strip (line 1082)
    ]);
  }
}
