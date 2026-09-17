import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { BrowserController } from './browser.js';

// Create a single shared browser controller
const controller = new BrowserController();

// Initialize MCP Server
const server = new McpServer({
  name: 'playwright-smart-pruning',
  version: '3.2.0'
});

// 1. Tool: browser_navigate
server.tool(
  'browser_navigate',
  'Navigate to a specified URL with anti-hang timeouts and automatic viewport DOM element extraction',
  {
    url: z.string().describe('The URL to navigate to (e.g. "youtube.com" or "https://github.com")'),
    waitUntil: z.enum(['domcontentloaded', 'load', 'networkidle', 'commit'])
      .optional()
      .default('domcontentloaded')
      .describe('Wait condition. Defaults to "domcontentloaded" to prevent hanging on SPA analytics/websockets'),
    timeout: z.number().optional().default(15000).describe('Navigation timeout in milliseconds (default: 15000)'),
    autoSnapshot: z.boolean().optional().default(true).describe('Automatically return smart pruned viewport elements in response')
  },
  async ({ url, waitUntil, timeout, autoSnapshot }) => {
    try {
      const res = await controller.navigate(url, { waitUntil, timeout, autoSnapshot });
      const summary = [
        `Navigated to: ${res.url}`,
        `Title: ${res.title}`,
        `Latency: ${res.navigationTimeMs}ms`,
        `Interactive elements found in viewport: ${res.elementCount}`
      ].join('\n');

      const contentText = autoSnapshot && res.elements
        ? `${summary}\n\n--- Visible Interactive Elements ---\n${res.elements}`
        : summary;

      return {
        content: [{ type: 'text', text: contentText }]
      };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Navigation failed: ${err.message}` }]
      };
    }
  }
);

// 2. Tool: browser_snapshot
server.tool(
  'browser_snapshot',
  'Execute Smart Viewport DOM Pruner (v3.1): Extracts only visible, high-intent interactive elements tagged with data-ag-id, slashing token usage by 95% vs accessibility snapshots',
  {
    format: z.enum(['semantic', 'json']).optional().default('semantic').describe('Format: "semantic" (compact lines) or "json"')
  },
  async ({ format }) => {
    try {
      const res = await controller.snapshot(format);
      const elementsOutput = format === 'semantic' ? res.elements : JSON.stringify(res.elements, null, 2);
      const text = [
        `Page: ${res.title} (${res.url})`,
        `Scan Latency: ${res.scanTimeMs}ms | Items: ${res.count}`,
        `\n${elementsOutput}`
      ].join('\n');

      return {
        content: [{ type: 'text', text }]
      };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Snapshot failed: ${err.message}` }]
      };
    }
  }
);

// 3. Tool: browser_click
server.tool(
  'browser_click',
  'Click an element using in-page synthetic pointer events + native fallback (<15ms latency). Target with data-ag-id number, CSS selector, or element text',
  {
    target: z.union([z.string(), z.number()]).describe('Target element ID (e.g. 1 or "1" from data-ag-id), CSS selector (e.g. "button#submit", "input"), or text'),
    element: z.string().optional().describe('Optional human-readable description for clarity'),
    doubleClick: z.boolean().optional().default(false).describe('Perform double-click if true'),
    autoSnapshot: z.boolean().optional().default(false).describe('Automatically return newly visible interactive elements in response after click')
  },
  async ({ target, doubleClick, autoSnapshot }) => {
    try {
      const res = await controller.click(target, { doubleClick, autoSnapshot });
      const navInfo = res.navigated ? ` (triggered navigation to ${res.url || 'new page'})` : '';
      let text = `Clicked [${res.id || res.target}] <${res.tag || 'element'}> "${res.text || ''}" in ${res.latencyMs}ms${navInfo}.`;
      if (autoSnapshot && res.elements) {
        text += `\n\n--- Visible Interactive Elements (${res.elementCount || 0}) ---\n${res.elements}`;
      }
      return {
        content: [{ type: 'text', text }]
      };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Click failed: ${err.message}` }]
      };
    }
  }
);

// 4. Tool: browser_type
server.tool(
  'browser_type',
  'Type text into an input field or textarea with React 18/Vue 3 prototype setter synchronization and optional form submission/Enter',
  {
    target: z.union([z.string(), z.number()]).describe('Target element ID (e.g. 1 or "1" from data-ag-id), CSS selector (e.g. "input#q"), or text'),
    text: z.string().describe('Text to type into the element'),
    element: z.string().optional().describe('Optional human-readable element description'),
    submit: z.boolean().optional().default(false).describe('Submit form or press Enter after typing'),
    clear: z.boolean().optional().default(true).describe('Clear existing input text before typing'),
    autoSnapshot: z.boolean().optional().default(false).describe('Automatically return newly visible interactive elements in response after typing/submitting')
  },
  async ({ target, text, submit, clear, autoSnapshot }) => {
    try {
      const res = await controller.type(target, text, { submit, clear, autoSnapshot });
      let textOutput = `Typed into [${res.id || res.target}] <${res.tag || 'input'}>: "${text}"${submit ? ' (submitted)' : ''} in ${res.latencyMs}ms.`;
      if (autoSnapshot && res.elements) {
        textOutput += `\n\n--- Visible Interactive Elements (${res.elementCount || 0}) ---\n${res.elements}`;
      }
      return {
        content: [{ type: 'text', text: textOutput }]
      };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Type failed: ${err.message}` }]
      };
    }
  }
);

// 5. Tool: browser_hover
server.tool(
  'browser_hover',
  'Hover cursor over an element to trigger dropdowns, menus, tooltips, or hover animations (<15ms latency)',
  {
    target: z.union([z.string(), z.number()]).describe('Target element ID (e.g. 1 or "1" from data-ag-id), CSS selector, or text'),
    element: z.string().optional().describe('Optional human-readable element description')
  },
  async ({ target }) => {
    try {
      const res = await controller.hover(target);
      return {
        content: [{
          type: 'text',
          text: `Hovered over [${res.id || res.target}] <${res.tag || 'element'}> "${res.text || ''}" in ${res.latencyMs}ms.`
        }]
      };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Hover failed: ${err.message}` }]
      };
    }
  }
);

// 6. Tool: browser_select_option
server.tool(
  'browser_select_option',
  'Select an option from a dropdown (<select>) element by option value or visible text label',
  {
    target: z.union([z.string(), z.number()]).describe('Target <select> element ID (e.g. 1 from data-ag-id) or CSS selector'),
    value: z.string().describe('Option value or visible text label to select')
  },
  async ({ target, value }) => {
    try {
      const res = await controller.selectOption(target, value);
      return {
        content: [{
          type: 'text',
          text: `Selected option "${res.selectedText || res.value}" on [${res.id || res.target}] in ${res.latencyMs}ms.`
        }]
      };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Select option failed: ${err.message}` }]
      };
    }
  }
);

// 7. Tool: browser_press_key
server.tool(
  'browser_press_key',
  'Press a keyboard key on the active page (e.g. "Enter", "Tab", "Escape", "ArrowDown", "PageDown", "Control+A")',
  {
    key: z.string().describe('Key name to press (e.g. "Enter", "Escape", "Tab", "ArrowDown", "PageDown")'),
    autoSnapshot: z.boolean().optional().default(false).describe('Automatically return newly visible interactive elements in response after pressing key')
  },
  async ({ key, autoSnapshot }) => {
    try {
      const res = await controller.pressKey(key, { autoSnapshot });
      let text = `Pressed key "${res.key}" in ${res.latencyMs}ms.`;
      if (autoSnapshot && res.elements) {
        text += `\n\n--- Visible Interactive Elements (${res.elementCount || 0}) ---\n${res.elements}`;
      }
      return {
        content: [{ type: 'text', text }]
      };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Key press failed: ${err.message}` }]
      };
    }
  }
);

// 8. Tool: browser_wait_for
server.tool(
  'browser_wait_for',
  'Wait for an element, text, or specific duration before taking further action',
  {
    selector: z.string().optional().describe('Wait for a CSS selector or data-ag-id to appear'),
    text: z.string().optional().describe('Wait for specific text to appear anywhere in the page'),
    timeMs: z.number().optional().describe('Wait for specific time in milliseconds (e.g. 1000)'),
    state: z.enum(['visible', 'attached', 'hidden']).optional().default('visible').describe('Target element state')
  },
  async ({ selector, text, timeMs, state }) => {
    try {
      const res = await controller.waitFor({ selector, text, timeMs, state });
      const msg = res.waitedMs ? `Waited ${res.waitedMs}ms.` : `Waited for ${res.selector || res.text} (${res.state}) in ${res.latencyMs}ms.`;
      return {
        content: [{ type: 'text', text: msg }]
      };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Wait for failed: ${err.message}` }]
      };
    }
  }
);

// 9. Tool: browser_handle_dialog
server.tool(
  'browser_handle_dialog',
  'Configure automated handling policy for JavaScript alert/confirm/prompt dialogs or inspect the last dialog message',
  {
    action: z.enum(['accept', 'dismiss']).optional().default('accept').describe('Action: "accept" or "dismiss"'),
    promptText: z.string().optional().describe('Optional text to submit for window.prompt dialogs')
  },
  async ({ action, promptText }) => {
    try {
      const res = await controller.handleDialog(action, promptText);
      const lastInfo = res.lastDialog ? ` (Last dialog was [${res.lastDialog.type}]: "${res.lastDialog.message}")` : '';
      return {
        content: [{ type: 'text', text: `Dialog policy set to "${res.policy}"${lastInfo}.` }]
      };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Handle dialog failed: ${err.message}` }]
      };
    }
  }
);

// 10. Tool: browser_scroll
server.tool(
  'browser_scroll',
  'Scroll the viewport smoothly and automatically extract newly visible interactive elements',
  {
    direction: z.enum(['down', 'up', 'top', 'bottom']).optional().default('down').describe('Scroll direction'),
    amount: z.number().optional().default(600).describe('Pixels to scroll (default: 600)'),
    autoSnapshot: z.boolean().optional().default(true).describe('Automatically return updated pruned elements after scrolling')
  },
  async ({ direction, amount, autoSnapshot }) => {
    try {
      const res = await controller.scroll(direction, amount, autoSnapshot);
      const summary = `Scrolled ${direction} by ${amount}px (scrollY: ${res.scroll.scrollY}/${res.scroll.scrollHeight})`;
      const text = autoSnapshot && res.elements
        ? `${summary}\n\n--- Newly Visible Elements ---\n${res.elements}`
        : summary;

      return {
        content: [{ type: 'text', text }]
      };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Scroll failed: ${err.message}` }]
      };
    }
  }
);

// 11. Tool: browser_take_screenshot
server.tool(
  'browser_take_screenshot',
  'Take a screenshot of the current page or viewport (locks overlay is automatically hidden for clean captures)',
  {
    fullPage: z.boolean().optional().default(false).describe('Capture entire scrollable page height if true'),
    path: z.string().optional().describe('Optional local file path to save screenshot')
  },
  async ({ fullPage, path }) => {
    try {
      const res = await controller.takeScreenshot({ fullPage, path });
      const content = [
        {
          type: 'image',
          data: res.base64,
          mimeType: 'image/png'
        },
        {
          type: 'text',
          text: `Screenshot captured (${Math.round(res.sizeBytes / 1024)} KB)${path ? ` saved to ${path}` : ''}`
        }
      ];

      return { content };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Screenshot failed: ${err.message}` }]
      };
    }
  }
);

// 12. Tool: browser_tabs
server.tool(
  'browser_tabs',
  'Manage browser tabs: list active tabs, open new tab, switch tabs, or close tabs',
  {
    action: z.enum(['list', 'new', 'switch', 'close']).describe('Action: "list", "new", "switch", or "close"'),
    index: z.number().optional().describe('Tab index (0-based) for switch or close actions'),
    url: z.string().optional().describe('Initial URL when opening a new tab')
  },
  async ({ action, index, url }) => {
    try {
      const res = await controller.tabs(action, { index, url });
      let message = res.message || 'Success';
      if (action === 'list' && res.tabs) {
        message = res.tabs.map(t => `[${t.index}] ${t.isActive ? '* ' : '  '}${t.title || 'Untitled'} - ${t.url}`).join('\n');
      }
      return {
        content: [{ type: 'text', text: message }]
      };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Tabs action failed: ${err.message}` }]
      };
    }
  }
);

// 13. Tool: browser_evaluate
server.tool(
  'browser_evaluate',
  'Execute arbitrary JavaScript code or arrow function in the webpage context',
  {
    function: z.string().describe('JavaScript code string or arrow function to evaluate (e.g. "() => document.title")')
  },
  async ({ function: code }) => {
    try {
      const res = await controller.evaluate(code);
      const resultText = typeof res.result === 'object' ? JSON.stringify(res.result, null, 2) : String(res.result);
      return {
        content: [{ type: 'text', text: resultText ?? 'undefined' }]
      };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Evaluate failed: ${err.message}` }]
      };
    }
  }
);

// 14. Tool: browser_lock
server.tool(
  'browser_lock',
  'Display or remove a non-intrusive HUD interaction lock overlay preventing accidental user mouse/keyboard interference during automation',
  {
    action: z.enum(['lock', 'unlock']).optional().default('lock').describe('Action: "lock" or "unlock"'),
    message: z.string().optional().default('AI Agent đang thực hiện tác vụ').describe('Custom message on the HUD overlay')
  },
  async ({ action, message }) => {
    try {
      const res = await controller.lock(action, message);
      return {
        content: [{ type: 'text', text: `Interaction lock ${res.locked ? 'ACTIVE' : 'RELEASED'}.` }]
      };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Lock failed: ${err.message}` }]
      };
    }
  }
);

// 15. Tool: browser_close
server.tool(
  'browser_close',
  'Cleanly close the browser session and release all system resources',
  {},
  async () => {
    try {
      const res = await controller.close();
      return {
        content: [{ type: 'text', text: res.message }]
      };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Close failed: ${err.message}` }]
      };
    }
  }
);

// Start server on stdio transport
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Log to stderr so stdout remains clean for MCP JSON-RPC protocol messages
  console.error('playwright-smart-pruning MCP server running on stdio');
}

// Clean shutdown handlers
process.on('SIGINT', async () => {
  await controller.close();
  process.exit(0);
});
process.on('SIGTERM', async () => {
  await controller.close();
  process.exit(0);
});

main().catch(err => {
  console.error('Fatal MCP server error:', err);
  process.exit(1);
});
