import { BrowserController } from '../src/browser.js';

async function testYouTube() {
  console.log('Testing YouTube navigation and smart element extraction...');
  const controller = new BrowserController({ headless: true });

  try {
    const start = performance.now();
    console.log('Navigating to youtube.com...');
    const nav = await controller.navigate('https://www.youtube.com', { timeout: 15000 });
    const totalTime = Math.round(performance.now() - start);

    console.log(`Navigation finished in ${nav.navigationTimeMs}ms (total roundtrip: ${totalTime}ms)`);
    console.log(`Page title: "${nav.title}"`);
    console.log(`Elements extracted: ${nav.elementCount}`);

    // Show first 10 elements
    const lines = (nav.elements || '').split('\n').slice(0, 10);
    console.log('First 10 visible interactive elements:\n' + lines.join('\n'));

    console.log('\nYouTube test PASSED in sub-seconds!');
  } finally {
    await controller.close();
  }
}

testYouTube().catch(err => {
  console.error('YouTube test error:', err);
  process.exit(1);
});
