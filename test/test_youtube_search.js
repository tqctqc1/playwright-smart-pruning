import { BrowserController } from '../src/browser.js';

async function testYouTubeSearch() {
  console.log('Testing YouTube search query and click in headless mode...');
  const controller = new BrowserController({ headless: true });

  try {
    const nav = await controller.navigate('https://www.youtube.com');
    console.log(`Loaded YouTube in ${nav.navigationTimeMs}ms`);

    // Target input [2]
    console.log('Typing query into YouTube search box...');
    const typeRes = await controller.type('2', 'lofi hip hop radio', { submit: true });
    console.log('Type result:', typeRes);

    // Wait a brief moment for search results page
    await (await controller.getPage()).waitForTimeout(2000);

    // Snapshot results page
    const snap = await controller.snapshot('semantic');
    console.log(`Discovered ${snap.count} elements in search results:`);
    const lines = snap.elements.split('\n').slice(0, 10);
    console.log(lines.join('\n'));

    console.log('\nYouTube search test PASSED!');
  } finally {
    await controller.close();
  }
}

testYouTubeSearch().catch(err => {
  console.error('YouTube search error:', err);
  process.exit(1);
});
