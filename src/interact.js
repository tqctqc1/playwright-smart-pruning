/**
 * High-speed direct DOM action helpers using data-ag-id.
 */

export function clickElementById(id) {
  const el = document.querySelector(`[data-ag-id="${id}"]`);
  if (!el) {
    throw new Error(`Element with data-ag-id="${id}" not found.`);
  }
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
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }));
    }
  }

  return { success: true };
}
