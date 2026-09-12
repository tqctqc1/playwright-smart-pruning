/**
 * High-speed direct DOM action helpers using data-ag-id.
 * v3.0: Supports full pointer event dispatch for modern reactive SPA frameworks.
 */

export function clickElementById(id) {
  const el = document.querySelector(`[data-ag-id="${id}"]`);
  if (!el) {
    throw new Error(`Element with data-ag-id="${id}" not found.`);
  }

  // Focus element if focusable
  if (typeof el.focus === 'function') {
    el.focus();
  }

  // Dispatch full pointer lifecycle for frameworks like React/Vue/Angular
  el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
  el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
  el.click();

  return { success: true, text: (el.innerText || el.value || '').trim() };
}

export function typeIntoElementById(id, text, submit = false) {
  const el = document.querySelector(`[data-ag-id="${id}"]`);
  if (!el) {
    throw new Error(`Element with data-ag-id="${id}" not found.`);
  }

  el.focus();
  el.value = text;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));

  if (submit) {
    if (el.form) {
      el.form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    } else {
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
    }
  }

  return { success: true };
}
