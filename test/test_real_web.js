import { BrowserController } from '../src/browser.js';

async function testRealWeb() {
  console.log('Testing BrowserController on real website in headless mode...');
  const controller = new BrowserController({ headless: true });

  try {
    console.log('Navigating to https://example.com ...');
    const res = await controller.navigate('https://example.com');
    console.log(`Navigation took: ${res.navigationTimeMs}ms`);
    console.log(`Page title: "${res.title}"`);
    console.log(`Interactive elements found (${res.elementCount}):\n${res.elements}`);

    if (res.elementCount > 0) {
      console.log('Clicking element 1...');
      const clickRes = await controller.click('1');
      console.log('Click took:', clickRes.latencyMs, 'ms. Clicked:', clickRes.text);
    }

    console.log('Taking screenshot...');
    const ss = await controller.takeScreenshot();
    console.log('Screenshot size:', ss.sizeBytes, 'bytes');

    console.log('Real website test PASSED!');
  } finally {
    await controller.close();
  }
}

testRealWeb().catch(err => {
  console.error('Real web test error:', err);
  process.exit(1);
});
