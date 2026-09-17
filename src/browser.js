import { chromium } from 'playwright';
import { getViewportInteractiveElements } from './pruner.js';
import {
  clickElement,
  typeIntoElement,
  hoverElement,
  selectOption,
  scrollPage,
  toggleInteractionLock,
  resolveElement
} from './interact.js';

export class BrowserController {
  constructor(options = {}) {
    this.options = options;
    this.browser = null;
    this.context = null;
    this.activePage = null;
    this.headless = options.headless ?? (process.env.HEADLESS === 'true' || process.env.HEADLESS === '1');
    this.lastDialog = null;
    this.autoDialogAction = 'accept';
    this.autoDialogPrompt = '';
  }

  async ensureBrowser() {
    if (this.browser && this.browser.isConnected() && this.context) {
      return;
    }

    const launchArgs = [
      '--disable-blink-features=AutomationControlled',
      '--no-default-browser-check',
      '--no-first-run',
      '--disable-infobars',
      '--window-size=1280,800'
    ];

    let browser = null;

    // Try Google Chrome first (native codecs, anti-bot resilience), then fallback to bundled Chromium
    try {
      browser = await chromium.launch({
        channel: 'chrome',
        headless: this.headless,
        args: launchArgs
      });
    } catch (e) {
      // Fallback to bundled chromium
      browser = await chromium.launch({
        headless: this.headless,
        args: launchArgs
      });
    }

    this.browser = browser;

    this.context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1,
      locale: 'vi-VN',
      timezoneId: 'Asia/Ho_Chi_Minh'
    });

    // 1. Network-level Ad & Tracker Filter
    await this.context.route('**/*', (route) => {
      const url = route.request().url();
      if (
        /googleads|doubleclick\.net|googlesyndication|adservice\.google|taboola|outbrain|adnxs|scorecardresearch|moatads/i.test(url) ||
        /youtube\.com\/(api\/stats\/ads|pagead\/|ptracking)/i.test(url)
      ) {
        return route.abort().catch(() => {});
      }
      return route.continue().catch(() => {});
    });

    // 2. Client-side Autonomic Guard (Auto-dismiss overlays, cookies & YouTube ads)
    await this.context.addInitScript(() => {
      const cleanOverlaysAndAds = () => {
        try {
          // YouTube skip ads
          const skipBtn = document.querySelector('.ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern, .videoAdUiSkipButton');
          if (skipBtn) skipBtn.click();

          const video = document.querySelector('video');
          if (video && document.querySelector('.ad-showing, .ad-interrupting')) {
            if (video.duration && !isNaN(video.duration) && video.duration > 0) {
              video.currentTime = video.duration;
            }
          }

          // Cookie consent & banner dismiss
          const cookieSelectors = [
            '#onetrust-accept-btn-handler',
            '.cookie-banner__accept',
            '[aria-label="Accept all" i]',
            '[aria-label="Chấp nhận tất cả" i]',
            'button[id*="cookie" i][id*="accept" i]',
            'button[class*="cookie" i][class*="accept" i]'
          ];
          for (const sel of cookieSelectors) {
            const btn = document.querySelector(sel);
            if (btn && btn.offsetParent !== null) {
              btn.click();
              break;
            }
          }
        } catch (_) {}
      };

      setInterval(cleanOverlaysAndAds, 500);
    });

    const setupPageListeners = (page) => {
      this.activePage = page;

      // Handle JS alert/confirm/prompt automatically so automation never freezes
      page.on('dialog', async (dialog) => {
        this.lastDialog = {
          type: dialog.type(),
          message: dialog.message(),
          defaultValue: dialog.defaultValue(),
          time: new Date().toISOString()
        };

        try {
          if (this.autoDialogAction === 'accept') {
            await dialog.accept(this.autoDialogPrompt || undefined);
          } else {
            await dialog.dismiss();
          }
        } catch (e) {
          // Dialog may have already been dismissed
        }
      });
    };

    this.context.on('page', (page) => {
      setupPageListeners(page);
    });

    const initialPage = await this.context.newPage();
    setupPageListeners(initialPage);
  }

  async getPage() {
    await this.ensureBrowser();

    if (!this.activePage || this.activePage.isClosed()) {
      const pages = this.context.pages().filter(p => !p.isClosed());
      if (pages.length > 0) {
        this.activePage = pages[pages.length - 1];
      } else {
        this.activePage = await this.context.newPage();
      }
    }

    return this.activePage;
  }

  normalizeUrl(rawUrl) {
    let url = rawUrl.trim();
    if (!/^(https?|file|about|data|blob|chrome):/i.test(url)) {
      url = 'https://' + url;
    }
    return url;
  }

  async navigate(rawUrl, options = {}) {
    const page = await this.getPage();
    const url = this.normalizeUrl(rawUrl);
    const waitUntil = options.waitUntil || 'domcontentloaded';
    const timeout = options.timeout || 15000;
    const start = performance.now();

    try {
      await page.goto(url, { waitUntil, timeout });
    } catch (err) {
      // If timed out on networkidle/load but HTML content is already loaded, proceed gracefully
      const isTimeout = err.message && err.message.toLowerCase().includes('timeout');
      const currentUrl = page.url();
      if (isTimeout && currentUrl && currentUrl !== 'about:blank') {
        // Recovered: DOM is present
      } else {
        throw new Error(`Failed to navigate to ${url}: ${err.message}`);
      }
    }

    // Brief settling window allowing client SPA hydration/components to mount
    if (waitUntil === 'domcontentloaded') {
      await page.waitForTimeout(250);
    }

    const elapsed = Math.round(performance.now() - start);
    const title = await page.title();
    const currentUrl = page.url();

    // Automatically produce smart snapshot for 1-turn navigation + observation
    const elements = await page.evaluate(getViewportInteractiveElements, 'semantic');
    const linesCount = elements ? elements.split('\n').filter(Boolean).length : 0;

    return {
      success: true,
      url: currentUrl,
      title,
      navigationTimeMs: elapsed,
      elementCount: linesCount,
      elements
    };
  }

  async snapshot(format = 'semantic') {
    const page = await this.getPage();
    await page.waitForLoadState('domcontentloaded', { timeout: 3000 }).catch(() => {});
    const start = performance.now();
    const result = await page.evaluate(getViewportInteractiveElements, format);
    const elapsed = Math.round(performance.now() - start);

    const isArray = Array.isArray(result);
    const count = isArray ? result.length : (result ? result.split('\n').filter(Boolean).length : 0);

    return {
      success: true,
      format,
      count,
      scanTimeMs: elapsed,
      url: page.url(),
      title: await page.title().catch(() => ''),
      elements: result
    };
  }

  async _maybeAutoSnapshot(page, autoSnapshot) {
    if (!autoSnapshot) return null;
    await page.waitForLoadState('domcontentloaded', { timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(200);
    const elements = await page.evaluate(getViewportInteractiveElements, 'semantic').catch(() => null);
    const elementCount = elements ? elements.split('\n').filter(Boolean).length : 0;
    return { elements, elementCount };
  }

  async click(target, options = {}) {
    const page = await this.getPage();
    const start = performance.now();

    // 1. Direct in-page execution via interact.js helper
    try {
      const result = await page.evaluate(({ target, options, clickElementStr, resolveElementStr }) => {
        const fn = new Function('target', 'options', resolveElementStr + '\n' + clickElementStr + '\nreturn clickElement(target, options);');
        return fn(target, options);
      }, {
        target,
        options,
        clickElementStr: clickElement.toString(),
        resolveElementStr: resolveElement.toString()
      });

      const elapsed = Math.round(performance.now() - start);
      const snap = await this._maybeAutoSnapshot(page, options.autoSnapshot);
      return {
        ...result,
        target,
        latencyMs: elapsed,
        ...(snap || {})
      };
    } catch (inPageErr) {
      const errMsg = inPageErr.message || '';

      // If click triggered instant page navigation or execution context destruction, that means click succeeded!
      if (errMsg.includes('Execution context was destroyed') || errMsg.includes('navigation')) {
        await page.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => {});
        const elapsed = Math.round(performance.now() - start);
        const snap = await this._maybeAutoSnapshot(page, options.autoSnapshot);
        return {
          success: true,
          target,
          navigated: true,
          url: page.url(),
          latencyMs: elapsed,
          ...(snap || {})
        };
      }

      // 2. Fallback to native Playwright locator click
      try {
        const selector = /^\d+$/.test(String(target).trim())
          ? `[data-ag-id="${target}"]`
          : String(target);
        const loc = page.locator(selector).first();
        await loc.click({ timeout: 3000 });
        const elapsed = Math.round(performance.now() - start);
        const snap = await this._maybeAutoSnapshot(page, options.autoSnapshot);
        return {
          success: true,
          target,
          fallback: 'playwright-locator',
          latencyMs: elapsed,
          ...(snap || {})
        };
      } catch (locatorErr) {
        throw new Error(`Click failed for "${target}": ${inPageErr.message} (Fallback error: ${locatorErr.message})`);
      }
    }
  }

  async hover(target) {
    const page = await this.getPage();
    const start = performance.now();

    try {
      const result = await page.evaluate(({ target, hoverElementStr, resolveElementStr }) => {
        const fn = new Function('target', resolveElementStr + '\n' + hoverElementStr + '\nreturn hoverElement(target);');
        return fn(target);
      }, {
        target,
        hoverElementStr: hoverElement.toString(),
        resolveElementStr: resolveElement.toString()
      });

      const elapsed = Math.round(performance.now() - start);
      return {
        ...result,
        target,
        latencyMs: elapsed
      };
    } catch (inPageErr) {
      try {
        const selector = /^\d+$/.test(String(target).trim())
          ? `[data-ag-id="${target}"]`
          : String(target);
        await page.locator(selector).first().hover({ timeout: 3000 });
        const elapsed = Math.round(performance.now() - start);
        return {
          success: true,
          target,
          fallback: 'playwright-locator',
          latencyMs: elapsed
        };
      } catch (locatorErr) {
        throw new Error(`Hover failed for "${target}": ${inPageErr.message} (Fallback error: ${locatorErr.message})`);
      }
    }
  }

  async selectOption(target, valueOrLabel) {
    const page = await this.getPage();
    const start = performance.now();

    try {
      const result = await page.evaluate(({ target, valueOrLabel, selectOptionStr, resolveElementStr }) => {
        const fn = new Function('target', 'valueOrLabel', resolveElementStr + '\n' + selectOptionStr + '\nreturn selectOption(target, valueOrLabel);');
        return fn(target, valueOrLabel);
      }, {
        target,
        valueOrLabel,
        selectOptionStr: selectOption.toString(),
        resolveElementStr: resolveElement.toString()
      });

      const elapsed = Math.round(performance.now() - start);
      return {
        ...result,
        target,
        latencyMs: elapsed
      };
    } catch (inPageErr) {
      try {
        const selector = /^\d+$/.test(String(target).trim())
          ? `[data-ag-id="${target}"]`
          : String(target);
        const loc = page.locator(selector).first();
        await loc.selectOption(valueOrLabel, { timeout: 3000 });
        const elapsed = Math.round(performance.now() - start);
        return {
          success: true,
          target,
          fallback: 'playwright-locator',
          latencyMs: elapsed
        };
      } catch (locatorErr) {
        throw new Error(`Select option failed for "${target}": ${inPageErr.message} (Fallback error: ${locatorErr.message})`);
      }
    }
  }

  async type(target, text, options = {}) {
    const page = await this.getPage();
    const start = performance.now();

    try {
      const result = await page.evaluate(({ target, text, options, typeIntoElementStr, resolveElementStr }) => {
        const fn = new Function('target', 'text', 'options', resolveElementStr + '\n' + typeIntoElementStr + '\nreturn typeIntoElement(target, text, options);');
        return fn(target, text, options);
      }, {
        target,
        text,
        options,
        typeIntoElementStr: typeIntoElement.toString(),
        resolveElementStr: resolveElement.toString()
      });

      const elapsed = Math.round(performance.now() - start);
      const snap = await this._maybeAutoSnapshot(page, options.autoSnapshot);
      return {
        ...result,
        target,
        text,
        latencyMs: elapsed,
        ...(snap || {})
      };
    } catch (inPageErr) {
      // Fallback to Playwright locator fill
      try {
        const selector = /^\d+$/.test(String(target).trim())
          ? `[data-ag-id="${target}"]`
          : String(target);
        const loc = page.locator(selector).first();
        if (options.clear !== false) {
          await loc.fill(text, { timeout: 3000 });
        } else {
          await loc.pressSequentially(text, { timeout: 3000 });
        }
        if (options.submit) {
          await loc.press('Enter');
        }
        const elapsed = Math.round(performance.now() - start);
        const snap = await this._maybeAutoSnapshot(page, options.autoSnapshot);
        return {
          success: true,
          target,
          text,
          fallback: 'playwright-locator',
          latencyMs: elapsed,
          ...(snap || {})
        };
      } catch (locatorErr) {
        throw new Error(`Type failed for "${target}": ${inPageErr.message} (Fallback error: ${locatorErr.message})`);
      }
    }
  }

  async pressKey(key, options = {}) {
    const page = await this.getPage();
    const start = performance.now();
    await page.keyboard.press(key);
    const elapsed = Math.round(performance.now() - start);
    const snap = await this._maybeAutoSnapshot(page, options.autoSnapshot);
    return {
      success: true,
      key,
      latencyMs: elapsed,
      ...(snap || {})
    };
  }

  async waitFor(options = {}) {
    const page = await this.getPage();
    const start = performance.now();
    const { selector, text, timeMs, state = 'visible', timeout = 10000 } = options;

    if (timeMs) {
      await page.waitForTimeout(timeMs);
      return {
        success: true,
        waitedMs: timeMs,
        latencyMs: Math.round(performance.now() - start)
      };
    }

    if (selector) {
      const s = /^\d+$/.test(String(selector).trim())
        ? `[data-ag-id="${selector}"]`
        : String(selector);
      await page.locator(s).first().waitFor({ state, timeout });
      return {
        success: true,
        selector,
        state,
        latencyMs: Math.round(performance.now() - start)
      };
    }

    if (text) {
      await page.getByText(text).first().waitFor({ state, timeout });
      return {
        success: true,
        text,
        state,
        latencyMs: Math.round(performance.now() - start)
      };
    }

    throw new Error('Must provide at least one parameter for browser_wait_for: selector, text, or timeMs');
  }

  async handleDialog(action = 'accept', promptText = '') {
    this.autoDialogAction = action === 'dismiss' ? 'dismiss' : 'accept';
    this.autoDialogPrompt = promptText || '';
    return {
      success: true,
      policy: this.autoDialogAction,
      promptText: this.autoDialogPrompt,
      lastDialog: this.lastDialog
    };
  }

  async scroll(direction = 'down', amount = 600, autoSnapshot = true) {
    const page = await this.getPage();
    const start = performance.now();

    const scrollResult = await page.evaluate(({ direction, amount, scrollPageStr }) => {
      const fn = new Function('direction', 'amount', scrollPageStr + '\nreturn scrollPage(direction, amount);');
      return fn(direction, amount);
    }, {
      direction,
      amount,
      scrollPageStr: scrollPage.toString()
    });

    // Short pause for reactive render/reflow
    await page.waitForTimeout(100);

    let snapshotResult = null;
    if (autoSnapshot) {
      snapshotResult = await page.evaluate(getViewportInteractiveElements, 'semantic');
    }

    const elapsed = Math.round(performance.now() - start);
    return {
      success: true,
      direction,
      amount,
      scroll: scrollResult,
      latencyMs: elapsed,
      elements: snapshotResult
    };
  }

  async takeScreenshot(options = {}) {
    const page = await this.getPage();
    const { fullPage = false, path } = options;

    await page.waitForLoadState('domcontentloaded', { timeout: 3000 }).catch(() => {});

    // Temporarily hide interaction overlay if present
    try {
      await page.evaluate(() => {
        const overlay = document.getElementById('__agent_interaction_lock__');
        if (overlay) {
          overlay.dataset.prevVisibility = overlay.style.visibility || 'visible';
          overlay.style.visibility = 'hidden';
        }
      });
    } catch (e) {
      // Ignore context destruction during page transition
    }

    const screenshotOptions = {
      fullPage,
      type: 'png'
    };
    if (path) screenshotOptions.path = path;

    const buffer = await page.screenshot(screenshotOptions);

    // Restore interaction overlay
    try {
      await page.evaluate(() => {
        const overlay = document.getElementById('__agent_interaction_lock__');
        if (overlay) overlay.style.visibility = overlay.dataset.prevVisibility || 'visible';
      });
    } catch (e) {
      // Ignore
    }

    return {
      success: true,
      base64: buffer.toString('base64'),
      path: path || null,
      sizeBytes: buffer.length
    };
  }

  async lock(action = 'lock', message = 'AI Agent đang thực hiện tác vụ') {
    const page = await this.getPage();
    const result = await page.evaluate(({ action, message, toggleInteractionLockStr }) => {
      const fn = new Function('action', 'message', toggleInteractionLockStr + '\nreturn toggleInteractionLock(action, message);');
      return fn(action, message);
    }, {
      action,
      message,
      toggleInteractionLockStr: toggleInteractionLock.toString()
    });

    return {
      success: true,
      ...result
    };
  }

  async evaluate(script) {
    const page = await this.getPage();
    const result = await page.evaluate((code) => {
      const trimmed = code.trim();
      // If code is an arrow function or function expression, execute it and return result
      if (/^(async\s+)?(\([^)]*\)|[a-zA-Z_$][\w$]*)\s*=>/.test(trimmed) || /^(async\s+)?function\b/.test(trimmed)) {
        const fn = new Function('return (' + trimmed + ')()');
        return fn();
      }
      return window.eval(code);
    }, script);

    return {
      success: true,
      result
    };
  }

  async tabs(action = 'list', options = {}) {
    await this.ensureBrowser();
    const pages = this.context.pages().filter(p => !p.isClosed());

    if (action === 'list') {
      const tabList = await Promise.all(pages.map(async (p, idx) => {
        const title = await p.title().catch(() => '');
        const url = p.url();
        const isActive = p === this.activePage;
        return { index: idx, title, url, isActive };
      }));
      return { success: true, tabs: tabList, count: tabList.length };
    }

    if (action === 'new') {
      const newPage = await this.context.newPage();
      this.activePage = newPage;
      if (options.url) {
        await this.navigate(options.url);
      }
      return { success: true, message: 'Opened new tab', index: pages.length };
    }

    if (action === 'switch') {
      const idx = options.index ?? 0;
      if (idx >= 0 && idx < pages.length) {
        this.activePage = pages[idx];
        await this.activePage.bringToFront();
        return { success: true, message: `Switched to tab ${idx}`, url: this.activePage.url() };
      }
      throw new Error(`Tab index ${idx} out of range (0 to ${pages.length - 1}).`);
    }

    if (action === 'close') {
      const idx = options.index;
      let targetPage = this.activePage;
      if (typeof idx === 'number' && idx >= 0 && idx < pages.length) {
        targetPage = pages[idx];
      }
      if (targetPage) {
        await targetPage.close();
      }
      const remaining = this.context.pages().filter(p => !p.isClosed());
      this.activePage = remaining.length > 0 ? remaining[remaining.length - 1] : null;
      return { success: true, message: 'Closed tab', remainingCount: remaining.length };
    }

    throw new Error(`Unknown tabs action: ${action}`);
  }

  async close() {
    if (this.context) {
      await this.context.close().catch(() => {});
      this.context = null;
    }
    if (this.browser) {
      await this.browser.close().catch(() => {});
      this.browser = null;
    }
    this.activePage = null;
    return { success: true, message: 'Browser session closed.' };
  }
}
