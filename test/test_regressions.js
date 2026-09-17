import { BrowserController } from '../src/browser.js';
import assert from 'assert';

async function runRegressionTests() {
  console.log('Running comprehensive regression test suite for playwright-smart-pruning...\n');
  const c = new BrowserController({ headless: true });

  try {
    // Regression 1: CSS selector matching with tag names
    console.log('--- 1. Testing CSS Tag Selectors (button, input#id, select) ---');
    const pageHtml1 = `
      <!DOCTYPE html>
      <html>
        <body>
          <input id="query-input" placeholder="Type here..." />
          <button id="submit-btn" onclick="document.getElementById('res').innerText = document.getElementById('query-input').value">Go</button>
          <div id="res">initial</div>
        </body>
      </html>
    `;
    await c.navigate(`data:text/html,${encodeURIComponent(pageHtml1)}`);
    const typeRes = await c.type('input#query-input', 'Tag Selectors Fixed!');
    assert.strictEqual(typeRes.success, true);
    console.log('Type into input#query-input succeeded in', typeRes.latencyMs, 'ms');

    const clickRes = await c.click('button');
    assert.strictEqual(clickRes.success, true);
    console.log('Click on button succeeded in', clickRes.latencyMs, 'ms');

    const checkRes = await c.evaluate(`document.getElementById('res').innerText`);
    assert.strictEqual(checkRes.result, 'Tag Selectors Fixed!');
    console.log('Verified in-page state:', checkRes.result);

    // Regression 2: Arrow Function & Function Expressions in evaluate
    console.log('\n--- 2. Testing Arrow Functions in evaluate ---');
    const arrowEval = await c.evaluate('() => document.getElementById("res").innerText');
    assert.strictEqual(arrowEval.result, 'Tag Selectors Fixed!');
    console.log('Arrow function evaluate result:', arrowEval.result);

    const fnEval = await c.evaluate('function() { return 42; }');
    assert.strictEqual(fnEval.result, 42);
    console.log('Standard function evaluate result:', fnEval.result);

    // Regression 3: Stale data-ag-id Purge & Scroll Collision Prevention
    console.log('\n--- 3. Testing Stale data-ag-id Scroll Collision Prevention ---');
    const scrollPageHtml = `
      <!DOCTYPE html>
      <html>
        <body style="margin:0; padding:0;">
          <div style="height: 50px;"><button id="btn-top" onclick="window.__clicked = 'TOP'">Top Button</button></div>
          <div style="height: 2500px; background: #eee;">Long Spacer</div>
          <div style="height: 50px;"><button id="btn-bottom" onclick="window.__clicked = 'BOTTOM'">Bottom Button</button></div>
        </body>
      </html>
    `;
    await c.navigate(`data:text/html,${encodeURIComponent(scrollPageHtml)}`);
    const topSnap = await c.snapshot();
    assert.ok(topSnap.elements.includes('Top Button'));
    console.log('Top snapshot captured:\n' + topSnap.elements.trim());

    // Scroll down 2400px
    const scrollRes = await c.scroll('down', 2400, true);
    assert.ok(scrollRes.elements.includes('Bottom Button'));
    console.log('Bottom snapshot captured:\n' + scrollRes.elements.trim());

    // Click '1' (which must be Bottom Button in the new viewport, NOT the stale top button!)
    await c.click('1');
    const clickedWhich = await c.evaluate('window.__clicked');
    assert.strictEqual(clickedWhich.result, 'BOTTOM', `Expected BOTTOM button to be clicked, but got: ${clickedWhich.result}`);
    console.log('SUCCESS: Clicked target in new viewport was indeed:', clickedWhich.result);

    // Regression 4: Hover & Select Option
    console.log('\n--- 4. Testing Hover & Select Option ---');
    const formHtml = `
      <!DOCTYPE html>
      <html>
        <body>
          <select id="country-select">
            <option value="us">United States</option>
            <option value="vn">Vietnam</option>
            <option value="fr">France</option>
          </select>
          <div id="hover-box" onmouseenter="this.innerText = 'Hovered!'" style="padding:10px;">Idle</div>
        </body>
      </html>
    `;
    await c.navigate(`data:text/html,${encodeURIComponent(formHtml)}`);

    const hoverRes = await c.hover('#hover-box');
    assert.strictEqual(hoverRes.success, true);
    const hoverText = await c.evaluate('document.getElementById("hover-box").innerText');
    assert.strictEqual(hoverText.result, 'Hovered!');
    console.log('Hover verified successfully:', hoverText.result);

    const selectRes = await c.selectOption('#country-select', 'Vietnam');
    assert.strictEqual(selectRes.success, true);
    const selectedVal = await c.evaluate('document.getElementById("country-select").value');
    assert.strictEqual(selectedVal.result, 'vn');
    console.log('Select option verified successfully. Value:', selectedVal.result);

    // Regression 5: Navigation Context Destruction Resilience
    console.log('\n--- 5. Testing Navigation Context Destruction Resilience ---');
    const navClickHtml = `
      <!DOCTYPE html>
      <html>
        <body>
          <a id="nav-link" href="about:blank" onclick="document.body.innerHTML='Navigating...';">Navigate Away</a>
        </body>
      </html>
    `;
    await c.navigate(`data:text/html,${encodeURIComponent(navClickHtml)}`);
    const clickNavRes = await c.click('#nav-link');
    assert.strictEqual(clickNavRes.success, true);
    console.log('Link click completed without throwing:', clickNavRes);

    // Regression 6: Alert / Confirm Dialog Auto-handling
    console.log('\n--- 6. Testing Alert Auto-handling ---');
    const p = await c.getPage();
    setTimeout(() => {
      p.evaluate(() => alert('Auto handled alert')).catch(() => {});
    }, 100);
    await c.waitFor({ timeMs: 300 });
    assert.ok(c.lastDialog, 'Dialog should have been recorded');
    console.log(`Dialog was intercepted without freezing: [${c.lastDialog.type}] "${c.lastDialog.message}"`);

    console.log('\n>>> ALL 6 REGRESSION SUITES PASSED FLAWLESSLY! <<<');
  } finally {
    await c.close();
  }
}

runRegressionTests().catch(err => {
  console.error('REGRESSION TEST FAILED:', err);
  process.exit(1);
});
