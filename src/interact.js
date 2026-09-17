/**
 * High-speed direct DOM action helpers for Playwright Smart Pruning.
 * v3.1: Supports full pointer lifecycle, React/Vue property setters,
 * robust multi-strategy element resolution, hover, and select helpers.
 */

export function resolveElement(target) {
  if (target === undefined || target === null) return null;
  const strTarget = String(target).trim();
  if (!strTarget) return null;

  // 1. Try finding by numeric data-ag-id first (prioritizing visible viewport)
  if (/^\d+$/.test(strTarget)) {
    const matches = Array.from(document.querySelectorAll(`[data-ag-id="${strTarget}"]`));
    if (matches.length > 0) {
      const inView = matches.find(m => {
        const r = m.getBoundingClientRect();
        return r.top < window.innerHeight && r.bottom > 0 && r.left < window.innerWidth && r.right > 0;
      });
      return inView || matches[0];
    }
  }

  // 2. Try as CSS selector
  try {
    const el = document.querySelector(strTarget);
    if (el) return el;
  } catch (e) {
    // Not a valid CSS selector syntax
  }

  // 3. Try [data-ag-id="..."]
  try {
    const el = document.querySelector(`[data-ag-id="${strTarget}"]`);
    if (el) return el;
  } catch (e) {}

  // 4. Try matching common attributes: name, placeholder, aria-label, id
  try {
    const escaped = CSS.escape ? CSS.escape(strTarget) : strTarget.replace(/["\\]/g, '\\$&');
    const byAttr = document.querySelector(`[name="${escaped}"], [placeholder="${escaped}"], [aria-label="${escaped}"]`);
    if (byAttr) return byAttr;
  } catch (e) {}

  // 5. Try matching text content on interactive elements
  const candidates = document.querySelectorAll('button, a, input, select, textarea, [role="button"], [role="link"], [tabindex]');
  for (const c of candidates) {
    const txt = (c.innerText || c.value || c.getAttribute('aria-label') || '').trim();
    if (txt === strTarget || txt.toLowerCase() === strTarget.toLowerCase()) {
      return c;
    }
  }

  return null;
}

export function clickElement(target, options = {}) {
  const { doubleClick = false } = options;
  const el = resolveElement(target);

  if (!el) {
    throw new Error(`Element "${target}" not found in current page context.`);
  }

  if (el.disabled || el.getAttribute('aria-disabled') === 'true') {
    throw new Error(`Element "${target}" is disabled.`);
  }

  // Scroll into view if needed
  if (typeof el.scrollIntoView === 'function') {
    el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
  }

  // Focus element if focusable
  if (typeof el.focus === 'function') {
    try { el.focus(); } catch (e) {}
  }

  // Dispatch full pointer lifecycle for frameworks like React 18, Vue 3, Angular
  const pointerProps = { bubbles: true, cancelable: true, view: window, isPrimary: true };
  const mouseProps = { bubbles: true, cancelable: true, view: window };

  if (typeof PointerEvent !== 'undefined') {
    el.dispatchEvent(new PointerEvent('pointerdown', pointerProps));
  }
  el.dispatchEvent(new MouseEvent('mousedown', mouseProps));

  if (typeof PointerEvent !== 'undefined') {
    el.dispatchEvent(new PointerEvent('pointerup', pointerProps));
  }
  el.dispatchEvent(new MouseEvent('mouseup', mouseProps));
  el.click();

  if (doubleClick) {
    if (typeof PointerEvent !== 'undefined') {
      el.dispatchEvent(new PointerEvent('pointerdown', pointerProps));
    }
    el.dispatchEvent(new MouseEvent('mousedown', mouseProps));
    if (typeof PointerEvent !== 'undefined') {
      el.dispatchEvent(new PointerEvent('pointerup', pointerProps));
    }
    el.dispatchEvent(new MouseEvent('mouseup', mouseProps));
    el.dispatchEvent(new MouseEvent('dblclick', mouseProps));
  }

  return {
    success: true,
    id: el.getAttribute('data-ag-id') || null,
    tag: el.tagName.toLowerCase(),
    text: (el.innerText || el.value || el.getAttribute('aria-label') || '').slice(0, 80).trim()
  };
}

export function hoverElement(target) {
  const el = resolveElement(target);

  if (!el) {
    throw new Error(`Element "${target}" not found for hover.`);
  }

  if (typeof el.scrollIntoView === 'function') {
    el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
  }

  const pointerProps = { bubbles: true, cancelable: true, view: window };
  const mouseProps = { bubbles: true, cancelable: true, view: window };

  if (typeof PointerEvent !== 'undefined') {
    el.dispatchEvent(new PointerEvent('pointerover', pointerProps));
    el.dispatchEvent(new PointerEvent('pointerenter', pointerProps));
    el.dispatchEvent(new PointerEvent('pointermove', pointerProps));
  }
  el.dispatchEvent(new MouseEvent('mouseover', mouseProps));
  el.dispatchEvent(new MouseEvent('mouseenter', mouseProps));
  el.dispatchEvent(new MouseEvent('mousemove', mouseProps));

  return {
    success: true,
    id: el.getAttribute('data-ag-id') || null,
    tag: el.tagName.toLowerCase(),
    text: (el.innerText || el.value || el.getAttribute('aria-label') || '').slice(0, 80).trim()
  };
}

export function selectOption(target, valueOrLabel) {
  const el = resolveElement(target);

  if (!el) {
    throw new Error(`Element "${target}" not found for selection.`);
  }

  if (el.tagName.toLowerCase() !== 'select') {
    throw new Error(`Target element "${target}" is a <${el.tagName.toLowerCase()}>, not a <select> element.`);
  }

  const strVal = String(valueOrLabel).trim().toLowerCase();
  let matched = false;

  for (let i = 0; i < el.options.length; i++) {
    const opt = el.options[i];
    if (opt.value.toLowerCase() === strVal || opt.text.trim().toLowerCase() === strVal) {
      el.selectedIndex = i;
      opt.selected = true;
      matched = true;
      break;
    }
  }

  if (!matched && el.options.length > 0) {
    el.value = valueOrLabel;
  }

  el.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  el.dispatchEvent(new Event('change', { bubbles: true, composed: true }));

  return {
    success: true,
    id: el.getAttribute('data-ag-id') || null,
    value: el.value,
    selectedText: el.options[el.selectedIndex]?.text || ''
  };
}

export function typeIntoElement(target, text, options = {}) {
  const { submit = false, clear = true } = options;
  const el = resolveElement(target);

  if (!el) {
    throw new Error(`Element "${target}" not found for typing.`);
  }

  if (typeof el.scrollIntoView === 'function') {
    el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
  }

  if (typeof el.focus === 'function') {
    try { el.focus(); } catch (e) {}
  }

  const finalValue = clear ? text : (el.value || '') + text;

  // React/Vue controlled component prototype descriptor setter trick
  let setterCalled = false;
  try {
    const proto = Object.getPrototypeOf(el);
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set ||
                   Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set ||
                   Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
    if (setter) {
      setter.call(el, finalValue);
      setterCalled = true;
    }
  } catch (e) {}

  if (!setterCalled) {
    el.value = finalValue;
  }

  // Dispatch input & change events for reactive state synchronization
  el.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  el.dispatchEvent(new Event('change', { bubbles: true, composed: true }));

  // Handle optional submission: dispatch Enter on input AND submit form
  if (submit) {
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, composed: true }));
    el.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, composed: true }));
    el.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, composed: true }));

    if (el.form) {
      el.form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      if (typeof el.form.requestSubmit === 'function') {
        try { el.form.requestSubmit(); } catch (e) {}
      }
    }
  }

  return {
    success: true,
    id: el.getAttribute('data-ag-id') || null,
    tag: el.tagName.toLowerCase(),
    value: el.value
  };
}

export function scrollPage(direction = 'down', amount = 600) {
  const dir = String(direction).toLowerCase();
  let delta = 0;

  if (dir === 'top') {
    window.scrollTo({ top: 0, behavior: 'instant' });
  } else if (dir === 'bottom') {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' });
  } else if (dir === 'up') {
    delta = -Math.abs(amount);
    window.scrollBy({ top: delta, behavior: 'instant' });
  } else {
    delta = Math.abs(amount);
    window.scrollBy({ top: delta, behavior: 'instant' });
  }

  return {
    scrollX: window.scrollX,
    scrollY: window.scrollY,
    scrollHeight: document.body.scrollHeight,
    viewportHeight: window.innerHeight
  };
}

export function toggleInteractionLock(action = 'lock', message = 'AI Agent đang thực hiện tác vụ') {
  const OVERLAY_ID = '__agent_interaction_lock__';
  const existing = document.getElementById(OVERLAY_ID);

  if (action === 'unlock') {
    if (existing) existing.remove();
    if (window.__agentBlockedEvents) {
      const { blockEvent, events } = window.__agentBlockedEvents;
      events.forEach(evt => window.removeEventListener(evt, blockEvent, true));
      delete window.__agentBlockedEvents;
    }
    return { locked: false };
  }

  // Action is lock
  if (existing) {
    return { locked: true };
  }

  const overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;
  overlay.style.cssText = 'position:fixed!important;top:0!important;left:0!important;width:100vw!important;height:100vh!important;background:rgba(0,0,0,0.4)!important;backdrop-filter:blur(2px)!important;z-index:2147483647!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;color:#fff!important;font-family:system-ui,-apple-system,sans-serif!important;user-select:none!important;cursor:not-allowed!important;pointer-events:all!important;';
  
  overlay.innerHTML = `
    <div style="background:rgba(20,20,24,0.92);padding:18px 28px;border-radius:12px;border:1px solid rgba(255,255,255,0.18);box-shadow:0 20px 25px -5px rgba(0,0,0,0.5);text-align:center;">
      <div style="font-size:26px;margin-bottom:6px;">🤖</div>
      <div style="font-size:15px;font-weight:600;margin-bottom:4px;">${message}</div>
      <div style="font-size:12px;color:#a1a1aa;">Vui lòng không thao tác chuột hoặc bàn phím...</div>
    </div>
  `;

  const blockEvent = (e) => {
    e.stopImmediatePropagation();
    e.preventDefault();
  };
  const events = ['click', 'dblclick', 'mousedown', 'mouseup', 'keydown', 'keypress', 'keyup', 'contextmenu'];
  window.__agentBlockedEvents = { blockEvent, events };
  events.forEach(evt => window.addEventListener(evt, blockEvent, true));

  document.documentElement.appendChild(overlay);
  return { locked: true };
}
