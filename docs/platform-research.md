# Neckbeard M1 Platform Facts Verification Report

## 1. chrome.storage.local Quota & Content Script Access

**Fact:** chrome.storage.local has a 10 MB quota (5 MB in Chrome 113 and earlier). chrome.storage.session also has 10 MB (1 MB in Chrome 111 and earlier) and clears on extension reload. Content scripts can access both via setAccessLevel() to control permission scope.

**Implication for Neckbeard M1:** Personal best scores, spawn cooldown timestamps, and session state fit comfortably under 10 MB. Content scripts can persist domain-visit tracking and per-round metadata. The setAccessLevel() call allows M2 (cross-domain persistence) to restrict SW access to trusted contexts only without re-architecture.

**Source:** [Chrome Storage API Reference](https://developer.chrome.com/docs/extensions/reference/api/storage)

---

## 2. MV3 Service Worker Idle Teardown

**Fact:** Extension service workers terminate after **30 seconds of inactivity**. Receiving an event or calling an extension API resets this timer. Additionally, if a single request takes longer than 5 minutes, the SW terminates (though Chrome 110+ removed the hard 5-minute lifetime limit, allowing APIs like native messaging to extend it). **Global variables are lost on shutdown.**

**Implication for Neckbeard M1:** Memory-resident state (e.g., "is this page currently in a chase?") cannot survive a 30-second idle period. M1 scope (single-page encounters) does NOT require SW state persistence because encounters are per-tab and scoped to content-script lifetime. M2 (cross-page pursuit persistence) MUST use chrome.storage.local for state, not SW memory. The 30-second limit is NOT a blocker for M1.

**Sources:**
- [Extension Service Worker Lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle)
- [Chromium Issue #40733525](https://issues.chromium.org/issues/40733525)

---

## 3. Content Scripts all_frames Default & M1 Scope

**Fact:** all_frames defaults to **false**, injecting only into the top-level frame. When true, scripts run in all frames (top-level and nested) matching URL requirements. Each frame is checked independently against URL patterns.

**Implication for Neckbeard M1:** M1 explicitly targets single-page encounters, so all_frames: false is correct. The MOD door and chase remain top-frame-only; no iframe pursuit. M2 (cross-frame/cross-page) would require all_frames: true to make the sprite follow into embedded iframes (e.g., YouTube embedded in a blog). Staying top-frame-only protects against CSP violations in untrusted frames and keeps M1 simple.

**Source:** [Manifest Content Scripts Reference](https://developer.chrome.com/docs/extensions/reference/manifest/content-scripts)

---

## 4. No-Build Code Organization for Content Scripts

**Fact:** Multiple JS files in the manifest `"js"` array are injected in declaration order without a bundler. Each file shares the global namespace. Alternatively, files can be injected programmatically via chrome.scripting.executeScript() with a files array, preserving order. Web-accessible resources do NOT need to be declared for content scripts—they already have extension-context access.

**Recommendation for Neckbeard:** Use the manifest array approach (declarative):
```json
"content_scripts": [{
  "matches": ["<all_urls>"],
  "run_at": "document_idle",
  "js": ["sprites.js", "chase-physics.js", "ui-overlay.js", "content.js"]
}]
```
This is simpler than web_accessible_resources + dynamic import() and avoids CSP complications. Load order: sprites.js defines sprite data structures, chase-physics.js uses them, ui-overlay.js builds the DOM overlay, content.js orchestrates. All run in the content script's isolated world, safe from page CSP.

**Source:** [Manifest Content Scripts Reference](https://developer.chrome.com/docs/extensions/reference/manifest/content-scripts)

---

## 5. CSP and Content-Script-Created Content

**Fact:** Content scripts run in an **isolated world** with their own CSP: `script-src 'self' 'wasm-unsafe-eval' 'inline-speculation-rules' chrome-extension://...` + `object-src 'self'`. This CSP applies to the content script's own context but NOT to the page. However, when a content script injects an element into the page's DOM, the page's CSP applies to resources loaded via that element. **Canvas elements and data: URLs within extension-created overlay DOM are NOT subject to page CSP** because canvas drawing is API-driven (no network fetch) and overlay DOM can be styled in isolation.

**Recommendation for Neckbeard:** Use **canvas for sprite rendering** (both base sprite and Revenant tier). Render sprite frames to a canvas created in the content script, then place the canvas in a shadow DOM overlay. This escapes page CSP entirely—the canvas is API-driven, no external resources, no CSP restrictions. Pixel art is procedurally drawn or embedded as base64 image data (data: URL), both immune to page CSP because they're in the extension's context.

**Implication:** Never attempt to set img.src to a network URL in the overlay. If you must use img, embed as data: URL or render to canvas first.

**Sources:**
- [Content Scripts Concepts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts)
- [Manifest CSP Reference](https://developer.chrome.com/docs/extensions/mv3/manifest/content_security_policy/)

---

## 6. Style Isolation: Shadow DOM Overlay

**Fact:** Shadow DOM provides CSS encapsulation. General page CSS does NOT affect shadow DOM elements. However, **only the dir and lang attributes inherit from the host**. All other CSS properties are isolated. Shadow DOM styles do NOT leak out to the page. Z-index has no limits within a stacking context, but **elements in the top-layer (fullscreen, dialog, popover) render ABOVE all z-index values**. These elements are outside the normal stacking context hierarchy.

**Implication for Neckbeard M1:** Create a shadow DOM overlay for the game UI (door, sprite, game-over screen). Page CSS will not interfere. Set z-index: 999999 on the shadow host—this handles 99% of cases. However, if the page has a fullscreen video, `<dialog>`, or popover element, those WILL render above the overlay. **Mitigation:** Use a ::backdrop pseudo-element on the game-over screen if transitioning to fullscreen; more commonly, listen for fullscreenchange and maximize z-index dynamically, or suppress the overlay briefly if fullscreen is detected (low priority for M1 since it's rare).

**Source:** [MDN Stacking Context Guide](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Positioned_layout/Stacking_context) & [Chrome Top Layer Blog](https://developer.chrome.com/blog/what-is-the-top-layer)

---

## 7. Mouse Move Event Rate & Cursor Tracking

**Fact:** mousemove fires at a high, variable rate depending on hardware and system load. Browsers coalesce multiple pointer updates into single pointermove events for performance. However, the MouseEvent object always contains cursor position properties (clientX, clientY, screenX, screenY, pageX, pageY, x, y). The documentation does NOT explicitly state position is "unknown until first move," but practically, cursor position is available in any mouse event fired after the cursor enters the window.

**Implication for Neckbeard M1:** Chase logic uses requestAnimationFrame (~60fps) to smoothly update sprite position based on the latest known cursor position from mousemove. On first page load, cursor position is unknown until the user moves the mouse or hovers the MOD door. The sprite won't move until the first mousemove event fires. This is acceptable—the door is stationary and telegraphs its threat; once the user hovers/clicks, movement begins. No blocker.

**Source:** [MDN MouseEvent Documentation](https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent)

---

## 8. image-rendering: pixelated on High-DPI Displays

**Fact:** The CSS property image-rendering: pixelated uses nearest-neighbor scaling to an integer multiple, then smooth interpolation for final sizing. It applies to all elements. For canvas, the property affects the canvas element when CSS-scaled, but NOT the drawing context's internal resolution. On high-DPI (devicePixelRatio > 1), browsers automatically scale—image-rendering: pixelated should preserve the pixel-art look, though browser implementations vary slightly.

**Recommendation for Neckbeard:** Set CSS `image-rendering: pixelated` on the canvas wrapper. For internal consistency, also set canvas resolution to `canvas.width = 320; canvas.height = 180` (low res) and CSS size to `width: 640px; height: 360px` (2x integer scaling). This ensures chunky pixels at any devicePixelRatio. Test on both 1x and 2x displays.

**Source:** [MDN image-rendering](https://developer.mozilla.org/en-US/docs/Web/CSS/image-rendering)

---

## 9. prefers-reduced-motion Detection from Content Script

**Fact:** The media query `prefers-reduced-motion: reduce` detects user OS accessibility settings. In JavaScript, detect via `window.matchMedia('(prefers-reduced-motion: reduce)').matches`. This works in content scripts because matchMedia is a standard DOM API available in all contexts.

**Implication for Neckbeard M1:** On page load, check prefers-reduced-motion and suppress frame-stepping animations (8-12fps walk cycles). Movement itself can remain smooth (60fps positional change via requestAnimationFrame), but sprite frames stay on frame 0, or the sprite image itself is replaced with a static "standing" pose. Lunges and other motion-heavy effects are skipped or replaced with instant-teleport visuals (flash, screen shake). The panic key (hide UI for N seconds) is also appropriate here.

**Source:** [CSS prefers-reduced-motion](https://developer.chrome.com/blog/css-prefers-reduced-transparency) & [MDN matchMedia](https://developer.mozilla.org/en-US/docs/Web/API/Window/matchMedia)

---

## 10. Edge and Opera MV3 Parity Gotchas

**Edge:** Microsoft Edge's supported APIs for MV3 are comprehensive. **chrome.storage (local/session) is supported**, **chrome.scripting is supported**. Edge is a Chromium fork with excellent Chrome extension compatibility. No material gotchas for M1 scope—treat Edge as a direct Chrome port.

**Opera:** Opera is also Chromium-based, but the search results did not return specific 2026 API support documentation. Historically, Opera follows Chrome MV3 closely but may lag minor updates by 1-2 versions. Safest approach: test on latest Opera GX before release, assume chrome.storage and chrome.scripting work (they do in current versions), but file a test report if behavior diverges.

**Recommendation:** M1 targets Chrome/Edge primarily (both have full API support). Mark Opera as "secondary support" with a note to test before shipping. If a specific API fails on Opera, fall back gracefully—e.g., localStorage instead of chrome.storage if the API is unavailable (though this shouldn't happen).

**Sources:**
- [Microsoft Edge Supported APIs](https://learn.microsoft.com/en-us/microsoft-edge/extensions/developer-guide/api-support)
- [Chrome MV3 Announcement](https://developer.chrome.com/blog/resuming-the-transition-to-mv3)

---

## No Additional Platform Walls for M1

**Summary:** No hard blockers found for M1 scope (single-page encounter loop). The design aligns with MV3 constraints:
- Storage quota is ample for personal bests and cooldown tracking.
- Service worker 30-second idle does NOT require state persistence in M1.
- all_frames: false keeps the scope simple and avoids iframe CSP mess.
- Shadow DOM overlay + canvas rendering is CSP-proof.
- prefers-reduced-motion is detectable and implementable.
- Edge and Opera are viable secondary targets.

**Only platform consideration for M2 (future):** Cross-page pursuit persistence will require storing state in chrome.storage.local since SW memory is ephemeral. This is already accounted for in the design notes; no architectural change needed—just use the storage API when M2 activates.

---

Sources:
- [Chrome Storage API Reference](https://developer.chrome.com/docs/extensions/reference/api/storage)
- [Extension Service Worker Lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle)
- [Manifest Content Scripts Reference](https://developer.chrome.com/docs/extensions/reference/manifest/content-scripts)
- [Content Scripts Concepts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts)
- [Manifest CSP Reference](https://developer.chrome.com/docs/extensions/mv3/manifest/content_security_policy/)
- [MDN Stacking Context Guide](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Positioned_layout/Stacking_context)
- [Chrome Top Layer Blog](https://developer.chrome.com/blog/what-is-the-top-layer)
- [MDN MouseEvent Documentation](https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent)
- [MDN image-rendering](https://developer.mozilla.org/en-US/docs/Web/CSS/image-rendering)
- [Microsoft Edge Supported APIs](https://learn.microsoft.com/en-us/microsoft-edge/extensions/developer-guide/api-support)
- [Chrome MV3 Announcement](https://developer.chrome.com/blog/resuming-the-transition-to-mv3)
