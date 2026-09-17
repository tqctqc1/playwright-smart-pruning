import { chromium } from 'playwright';
import { getViewportInteractiveElements } from '../src/pruner.js';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <body>
        <header>
          <button id="btn1">Search</button>
          <a href="https://example.com">Home</a>
        </header>
        <main>
          <input type="text" placeholder="Type query here..." />
        </main>
      </body>
    </html>
  `);

  const result = await page.evaluate(getViewportInteractiveElements, 'semantic');
  console.log('Result:\n' + result);
  await browser.close();
}

run().catch(console.error);
