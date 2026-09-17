/**
 * Playwright Smart Viewport DOM Pruner (v3.1)
 * 
 * Key Innovations:
 * 1. Native `checkVisibility()`: 3x faster than getComputedStyle() layout reflows.
 * 2. Stale ID Purge: Automatically clears all previous `data-ag-id` to eliminate scroll target collisions.
 * 3. Card & Tagged Anti-Nesting: Avoids duplicate wrappers and descendant spans when parent is interactive.
 * 4. Rich Form Context: Resolves associated <label> texts for checkboxes/radios, and options summary for <select>.
 * 5. Compact Semantic Lines (96% token savings) and Standard JSON serialization.
 * 6. Agent HUD Exclusion: Automatically ignores interaction lock overlays.
 */

export function getViewportInteractiveElements(format = 'semantic') {
  // 1. Purge all existing data-ag-id attributes to prevent stale ID collisions across scrolls/views
  try {
    document.querySelectorAll('[data-ag-id]').forEach(el => el.removeAttribute('data-ag-id'));
  } catch (e) {}

  const isVisible = (el) => {
    if (typeof el.checkVisibility === 'function') {
      if (!el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
    }
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.top < window.innerHeight && r.bottom > 0 && r.left < window.innerWidth && r.right > 0;
  };

  const isInteractive = (el) => {
    // Exclude interaction lock overlay and hidden elements
    if (el.id === '__agent_interaction_lock__' || el.closest('#__agent_interaction_lock__')) return false;
    if (el.getAttribute('aria-hidden') === 'true' || el.closest('[aria-hidden="true"]')) return false;

    const tag = el.tagName.toLowerCase();
    // Ignore pure decorative SVG / canvas / metadata elements
    if (['svg', 'path', 'g', 'use', 'circle', 'rect', 'polygon', 'script', 'style', 'meta', 'link', 'noscript'].includes(tag)) return false;

    // 1. Native interactive form elements
    if (['button', 'input', 'select', 'textarea'].includes(tag)) return true;
    if (tag === 'a') {
      return el.hasAttribute('href') || el.onclick != null || el.getAttribute('role') != null || (el.innerText || '').trim().length > 0;
    }

    // 2. Explicit ARIA interactive roles
    const role = el.getAttribute('role');
    if (['button', 'link', 'checkbox', 'menuitem', 'tab', 'option', 'radio', 'switch', 'combobox', 'searchbox'].includes(role)) return true;

    // 3. Explicit click listeners or action attributes
    if (el.onclick != null || el.getAttribute('onclick') != null || el.hasAttribute('data-action') || el.hasAttribute('data-click')) return true;

    // 4. Focusable controls
    const tabIndex = el.getAttribute('tabindex');
    if (tabIndex !== null && tabIndex !== '-1') return true;

    // 5. Elements with cursor: pointer (with strict inheritance & card-aware suppression)
    if (window.getComputedStyle(el).cursor === 'pointer') {
      // If it contains other interactive elements, it is merely a wrapper
      if (el.querySelector('a, button, input, select, textarea, [role="button"], [role="link"]')) return false;

      // Card-aware anti-nesting: Suppress descendant div/span if an ancestor card already has an anchor or button
      const parentCard = el.closest('a, button, [role="button"], [role="link"], article, li, [class*="card"], [class*="item"], [class*="video"]');
      if (parentCard) {
        if (['a', 'button'].includes(parentCard.tagName.toLowerCase()) || parentCard.getAttribute('role') === 'button') {
          return false;
        }
        if (parentCard.querySelector('a, button')) {
          return false;
        }
      }

      // Must have valid non-empty label and not be passive metadata (timestamps, view counts, badges)
      const text = (el.innerText || el.getAttribute('aria-label') || el.getAttribute('title') || '').trim();
      if (!text || text.length < 2) return false;
      if (/(\d+\s*(views|lượt xem)|ago|trước|•|Sponsored|Được tài trợ)/i.test(text)) return false;

      return true;
    }

    return false;
  };

  let id = 0;
  const items = [];
  const lines = [];

  document.querySelectorAll('*').forEach(el => {
    if (isVisible(el) && isInteractive(el)) {
      // Anti-nesting: Skip child if parent is already an interactive button or anchor or already tagged with data-ag-id
      const parentInteractive = el.parentElement ? el.parentElement.closest('a, button, select, textarea, [role="button"], [role="link"], [data-ag-id]') : null;
      if (parentInteractive && isVisible(parentInteractive)) return;

      const tag = el.tagName.toLowerCase();

      // Retrieve associated label if any (especially helpful for checkbox and radio)
      let labelText = '';
      if (el.labels && el.labels.length > 0) {
        labelText = Array.from(el.labels).map(l => l.innerText).join(' ').trim();
      }
      if (!labelText && el.closest('label')) {
        labelText = el.closest('label').innerText.trim();
      }

      let text = '';
      if (tag === 'select') {
        const selectedOpt = el.options[el.selectedIndex]?.text || '';
        const optCount = el.options.length;
        text = `Selected: "${selectedOpt}" (${optCount} options: ${Array.from(el.options).slice(0, 4).map(o => o.text.trim()).filter(Boolean).join(', ')}${optCount > 4 ? '...' : ''})`;
      } else {
        text = (el.getAttribute('aria-label') || labelText || el.innerText || el.value || el.placeholder || el.getAttribute('title') || '').trim().replace(/\s+/g, ' ');
      }

      if (!text && el.querySelector('img[alt]')) text = el.querySelector('img[alt]').getAttribute('alt').trim();
      if (!text && !['input', 'select', 'textarea'].includes(tag)) return;
      if (['•', '|', '/', '-', '·'].includes(text)) return;

      id++;
      el.setAttribute('data-ag-id', id.toString());
      const role = el.getAttribute('role') || undefined;
      const type = el.getAttribute('type') || role || undefined;
      const cleanText = text.slice(0, 80);

      items.push({ id, tag, type, text: cleanText });
      lines.push(`[${id}] <${tag}${type ? ':' + type : ''}> ${cleanText}`);
    }
  });

  return format === 'semantic' ? lines.join('\n') : items;
}
