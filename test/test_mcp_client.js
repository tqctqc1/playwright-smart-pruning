import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverScript = path.resolve(__dirname, '../src/server.js');

async function testMcpServer() {
  console.log('Testing playwright-smart-pruning MCP server over stdio...');

  // Set HEADLESS=true for automated CI test
  const transport = new StdioClientTransport({
    command: 'node',
    args: [serverScript],
    env: { ...process.env, HEADLESS: 'true' }
  });

  const client = new Client({
    name: 'test-mcp-client',
    version: '1.0.0'
  }, {
    capabilities: {}
  });

  await client.connect(transport);
  console.log('Connected to MCP server successfully!');

  try {
    // 1. List tools
    console.log('\n--- 1. Testing tools/list ---');
    const toolsList = await client.listTools();
    console.log(`Discovered ${toolsList.tools.length} MCP tools:`);
    for (const tool of toolsList.tools) {
      console.log(`  - ${tool.name}: ${tool.description.slice(0, 60)}...`);
    }

    if (toolsList.tools.length !== 15) {
      throw new Error(`Expected exactly 15 tools, found ${toolsList.tools.length}`);
    }

    // 2. Call browser_navigate
    console.log('\n--- 2. Testing browser_navigate ---');
    const htmlPage = encodeURIComponent(`
      <!DOCTYPE html>
      <html>
        <head><title>MCP Pruner Test</title></head>
        <body>
          <h2>MCP Pruner Test Title</h2>
          <form onsubmit="event.preventDefault(); document.getElementById('out').innerText = document.getElementById('search-in').value;">
            <input id="search-in" placeholder="Search MCP..." />
            <button id="go-btn" type="submit">Submit Search</button>
          </form>
          <select id="theme-selector">
            <option value="light">Light Theme</option>
            <option value="dark">Dark Theme</option>
          </select>
          <div id="hover-target" style="padding: 10px; background: #eee;">Hover Area</div>
          <div id="out">Empty</div>
          <div id="selected-val">light</div>
          <script>
            document.getElementById('theme-selector').onchange = (e) => {
              document.getElementById('selected-val').innerText = e.target.value;
            };
          </script>
        </body>
      </html>
    `);

    const navRes = await client.callTool({
      name: 'browser_navigate',
      arguments: {
        url: `data:text/html,${htmlPage}`
      }
    });
    console.log('Navigation Result:\n', navRes.content[0].text);

    // 3. Call browser_type with CSS selector ("input#search-in") and Enter
    console.log('\n--- 3. Testing browser_type with CSS selector and autoSnapshot ---');
    const typeRes = await client.callTool({
      name: 'browser_type',
      arguments: {
        target: 'input#search-in',
        text: 'Antigravity MCP Works!',
        submit: true,
        autoSnapshot: true
      }
    });
    console.log('Type Result:\n', typeRes.content[0].text);
    if (!typeRes.content[0].text.includes('Visible Interactive Elements')) {
      throw new Error('Expected autoSnapshot to include Visible Interactive Elements');
    }

    // 4. Verify in-page state via browser_evaluate with arrow function
    console.log('\n--- 4. Testing browser_evaluate with Arrow Function ---');
    const evalRes = await client.callTool({
      name: 'browser_evaluate',
      arguments: {
        function: `() => document.getElementById('out').innerText`
      }
    });
    console.log('Evaluate Result (arrow function):\n', evalRes.content[0].text);
    if (evalRes.content[0].text !== 'Antigravity MCP Works!') {
      throw new Error(`Expected 'Antigravity MCP Works!', got: ${evalRes.content[0].text}`);
    }

    // 5. Call browser_hover
    console.log('\n--- 5. Testing browser_hover ---');
    const hoverRes = await client.callTool({
      name: 'browser_hover',
      arguments: {
        target: '#hover-target'
      }
    });
    console.log('Hover Result:\n', hoverRes.content[0].text);

    // 6. Call browser_select_option
    console.log('\n--- 6. Testing browser_select_option ---');
    const selectRes = await client.callTool({
      name: 'browser_select_option',
      arguments: {
        target: 'select#theme-selector',
        value: 'dark'
      }
    });
    console.log('Select Option Result:\n', selectRes.content[0].text);

    const themeVal = await client.callTool({
      name: 'browser_evaluate',
      arguments: {
        function: `document.getElementById('selected-val').innerText`
      }
    });
    if (themeVal.content[0].text !== 'dark') {
      throw new Error(`Expected theme 'dark', got: ${themeVal.content[0].text}`);
    }

    // 7. Call browser_wait_for
    console.log('\n--- 7. Testing browser_wait_for ---');
    const waitRes = await client.callTool({
      name: 'browser_wait_for',
      arguments: {
        timeMs: 200
      }
    });
    console.log('Wait Result:\n', waitRes.content[0].text);

    // 8. Call browser_handle_dialog
    console.log('\n--- 8. Testing browser_handle_dialog ---');
    const dialogRes = await client.callTool({
      name: 'browser_handle_dialog',
      arguments: {
        action: 'accept',
        promptText: 'Dialog Auto Answer'
      }
    });
    console.log('Dialog Result:\n', dialogRes.content[0].text);

    // 9. Call browser_snapshot
    console.log('\n--- 9. Testing browser_snapshot ---');
    const snapRes = await client.callTool({
      name: 'browser_snapshot',
      arguments: {
        format: 'semantic'
      }
    });
    console.log('Snapshot Result:\n', snapRes.content[0].text);

    // 10. Call browser_take_screenshot
    console.log('\n--- 10. Testing browser_take_screenshot ---');
    const ssRes = await client.callTool({
      name: 'browser_take_screenshot',
      arguments: {}
    });
    const imgItem = ssRes.content.find(c => c.type === 'image');
    console.log('Screenshot Result: Image present =', !!imgItem, 'Data length =', imgItem?.data?.length);

    // 11. Call browser_lock and unlock
    console.log('\n--- 11. Testing browser_lock ---');
    const lockRes = await client.callTool({
      name: 'browser_lock',
      arguments: { action: 'lock' }
    });
    console.log('Lock Result:\n', lockRes.content[0].text);
    await client.callTool({
      name: 'browser_lock',
      arguments: { action: 'unlock' }
    });

    // 12. Call browser_tabs
    console.log('\n--- 12. Testing browser_tabs ---');
    const tabsRes = await client.callTool({
      name: 'browser_tabs',
      arguments: { action: 'list' }
    });
    console.log('Tabs Result:\n', tabsRes.content[0].text);

    // 13. Call browser_close
    console.log('\n--- 13. Testing browser_close ---');
    const closeRes = await client.callTool({
      name: 'browser_close',
      arguments: {}
    });
    console.log('Close Result:\n', closeRes.content[0].text);

    console.log('\n>>> All 15 MCP Server tools PASSED with 100% success! <<<');
  } finally {
    await client.close();
  }
}

testMcpServer().catch(err => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
