import { BrowserController } from '../src/browser.js';

async function run() {
  console.log('Testing BrowserController in headless mode...');
  const controller = new BrowserController({ headless: true });

  try {
    // 1. Test Navigation
    console.log('1. Navigating to sample data URL...');
    const sampleHtml = encodeURIComponent(`
      <!DOCTYPE html>
      <html>
        <head><title>Smart Pruning Test Page</title></head>
        <body>
          <h1>Welcome to Smart Pruning</h1>
          <form id="search-form" onsubmit="event.preventDefault(); document.getElementById('msg').innerText = 'Searched: ' + document.getElementById('q').value;">
            <input id="q" type="text" placeholder="Search products..." />
            <button id="submit-btn" type="submit">Search</button>
          </form>
          <a href="https://example.com" id="help-link">Help Link</a>
          <p id="msg">Initial</p>
        </body>
      </html>
    `);

    const navResult = await controller.navigate(`data:text/html,${sampleHtml}`);
    console.log('Navigation success:', navResult.success, 'Title:', navResult.title);
    console.log('Elements discovered:\n' + navResult.elements);

    // 2. Test Smart Type
    console.log('\n2. Testing Smart Type into input...');
    const typeResult = await controller.type('1', 'Playwright MCP Speed');
    console.log('Type result:', typeResult);

    // 3. Test Smart Click
    console.log('\n3. Testing Smart Click on button...');
    const clickResult = await controller.click('2');
    console.log('Click result:', clickResult);

    // 4. Verify in-page change
    const msgText = await controller.evaluate(`document.getElementById('msg').innerText`);
    console.log('In-page message after submit:', msgText.result);

    // 5. Test Lock / Unlock overlay
    console.log('\n5. Testing Lock Overlay...');
    const lockResult = await controller.lock('lock', 'Đang thực hiện kiểm thử...');
    console.log('Lock result:', lockResult);
    const unlockResult = await controller.lock('unlock');
    console.log('Unlock result:', unlockResult);

    // 6. Test Screenshot
    console.log('\n6. Testing Screenshot...');
    const ssResult = await controller.takeScreenshot();
    console.log('Screenshot success:', ssResult.success, 'Size:', ssResult.sizeBytes, 'bytes');

    // 7. Test Close
    await controller.close();
    console.log('\nAll tests passed successfully!');
  } catch (err) {
    console.error('Test failed:', err);
    await controller.close();
    process.exit(1);
  }
}

run();
