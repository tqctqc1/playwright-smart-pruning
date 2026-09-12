/**
 * Playwright Smart Viewport DOM Pruner (v2.0)
 * Extracts visible, interactive elements within the current viewport
 * and tags them with data-ag-id for direct, low-latency interaction.
 */

export function getViewportInteractiveElements() {
  const isVisible = (el) => {
    const s = window.getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.top < window.innerHeight && r.bottom > 0 && r.left < window.innerWidth && r.right > 0;
  };

  const isInteractive = (el) => {
    const tag = el.tagName.toLowerCase();
    // Ignore pure decorative SVG / canvas graphic paths
    if (['svg', 'path', 'g', 'use', 'circle', 'rect', 'polygon'].includes(tag)) return false;

    // Form inputs and controls are always interactive
    if (['input', 'select', 'textarea'].includes(tag)) return true;

    // Clickable tags, roles, or pointer cursors
    const isClickable = ['button', 'a'].includes(tag) ||
      ['button', 'link', 'checkbox', 'menuitem', 'tab', 'option', 'radio', 'switch', 'combobox'].includes(el.getAttribute('role')) ||
      el.onclick != null || el.getAttribute('onclick') != null ||
      window.getComputedStyle(el).cursor === 'pointer';

    if (!isClickable) return false;

    // Anti-nesting: Avoid duplicate nested children when an interactive ancestor is already captured
    const interactiveParent = el.parentElement ? el.parentElement.closest('button, a, [role="button"], [role="link"]') : null;
    if (interactiveParent && isVisible(interactiveParent)) return false;

    // Must have meaningful textual content or valid input tag
    const text = (el.innerText || el.value || el.placeholder || el.getAttribute('aria-label') || el.getAttribute('title') || '').trim();
    return text.length > 0 || ['button', 'a', 'input'].includes(tag);
  };

  let id = 0;
  const items = [];
  document.querySelectorAll('*').forEach(el => {
    if (isVisible(el) && isInteractive(el)) {
      id++;
      el.setAttribute('data-ag-id', id.toString());
      const text = (el.innerText || el.value || el.placeholder || el.getAttribute('aria-label') || el.getAttribute('title') || '').trim().replace(/\s+/g, ' ').slice(0, 60);
      items.push({ id, tag: el.tagName.toLowerCase(), type: el.getAttribute('type') || undefined, text });
    }
  });

  return items;
}
