import fs from 'fs';
import path from 'path';

const schemas = {
  browser_navigate: {
    name: 'browser_navigate',
    description: 'Navigate to a specified URL with anti-hang timeouts and automatic viewport DOM element extraction',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'The URL to navigate to (e.g. "youtube.com" or "https://github.com")' },
        waitUntil: { type: 'string', enum: ['domcontentloaded', 'load', 'networkidle', 'commit'], default: 'domcontentloaded', description: 'Wait condition' },
        timeout: { type: 'number', default: 15000, description: 'Navigation timeout in ms' },
        autoSnapshot: { type: 'boolean', default: true, description: 'Automatically return smart pruned viewport elements' }
      },
      required: ['url']
    }
  },
  browser_snapshot: {
    name: 'browser_snapshot',
    description: 'Execute Smart Viewport DOM Pruner (v3.1): Extracts visible, high-intent interactive elements tagged with data-ag-id (95% token savings)',
    parameters: {
      type: 'object',
      properties: {
        format: { type: 'string', enum: ['semantic', 'json'], default: 'semantic', description: 'Format: "semantic" (compact lines) or "json"' }
      }
    }
  },
  browser_click: {
    name: 'browser_click',
    description: 'Click an element using in-page synthetic pointer events + native fallback (<15ms latency). Target with data-ag-id number, CSS selector, or element text',
    parameters: {
      type: 'object',
      properties: {
        target: { type: 'string', description: 'Target element ID (e.g. "1" from data-ag-id), CSS selector, or element text' },
        element: { type: 'string', description: 'Optional human-readable element description' },
        doubleClick: { type: 'boolean', default: false, description: 'Perform double click' }
      },
      required: ['target']
    }
  },
  browser_type: {
    name: 'browser_type',
    description: 'Type text into an input field or textarea with React 18/Vue 3 prototype setter synchronization and optional submit/Enter',
    parameters: {
      type: 'object',
      properties: {
        target: { type: 'string', description: 'Target element ID (e.g. "1" from data-ag-id), CSS selector, or element text' },
        text: { type: 'string', description: 'Text to type into the element' },
        element: { type: 'string', description: 'Optional human-readable element description' },
        submit: { type: 'boolean', default: false, description: 'Submit form or press Enter after typing' },
        clear: { type: 'boolean', default: true, description: 'Clear existing text before typing' }
      },
      required: ['target', 'text']
    }
  },
  browser_hover: {
    name: 'browser_hover',
    description: 'Hover cursor over an element to trigger dropdowns, menus, tooltips, or hover animations (<15ms latency)',
    parameters: {
      type: 'object',
      properties: {
        target: { type: 'string', description: 'Target element ID (e.g. "1" from data-ag-id), CSS selector, or element text' },
        element: { type: 'string', description: 'Optional human-readable element description' }
      },
      required: ['target']
    }
  },
  browser_select_option: {
    name: 'browser_select_option',
    description: 'Select an option from a dropdown (<select>) element by option value or visible text label',
    parameters: {
      type: 'object',
      properties: {
        target: { type: 'string', description: 'Target <select> element ID or CSS selector' },
        value: { type: 'string', description: 'Option value or visible text label to select' }
      },
      required: ['target', 'value']
    }
  },
  browser_press_key: {
    name: 'browser_press_key',
    description: 'Press a keyboard key on the active page (e.g. "Enter", "Tab", "Escape", "ArrowDown", "PageDown", "Control+A")',
    parameters: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Key name to press (e.g. "Enter", "Escape", "Tab")' }
      },
      required: ['key']
    }
  },
  browser_wait_for: {
    name: 'browser_wait_for',
    description: 'Wait for an element, text, or specific duration before taking further action',
    parameters: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'Wait for a CSS selector or data-ag-id to appear' },
        text: { type: 'string', description: 'Wait for specific text to appear anywhere in the page' },
        timeMs: { type: 'number', description: 'Wait for specific duration in milliseconds (e.g. 1000)' },
        state: { type: 'string', enum: ['visible', 'attached', 'hidden'], default: 'visible', description: 'Target element state' }
      }
    }
  },
  browser_handle_dialog: {
    name: 'browser_handle_dialog',
    description: 'Configure automated handling policy for JavaScript alert/confirm/prompt dialogs or inspect the last dialog message',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['accept', 'dismiss'], default: 'accept', description: 'Action: "accept" or "dismiss"' },
        promptText: { type: 'string', description: 'Optional text to submit for window.prompt dialogs' }
      }
    }
  },
  browser_scroll: {
    name: 'browser_scroll',
    description: 'Scroll the viewport smoothly and automatically extract newly visible interactive elements',
    parameters: {
      type: 'object',
      properties: {
        direction: { type: 'string', enum: ['down', 'up', 'top', 'bottom'], default: 'down', description: 'Scroll direction' },
        amount: { type: 'number', default: 600, description: 'Pixels to scroll' },
        autoSnapshot: { type: 'boolean', default: true, description: 'Automatically return updated pruned elements' }
      }
    }
  },
  browser_take_screenshot: {
    name: 'browser_take_screenshot',
    description: 'Take a screenshot of the current page or viewport (locks overlay is automatically hidden for clean captures)',
    parameters: {
      type: 'object',
      properties: {
        fullPage: { type: 'boolean', default: false, description: 'Capture entire scrollable page height' },
        path: { type: 'string', description: 'Optional local file path to save screenshot' }
      }
    }
  },
  browser_tabs: {
    name: 'browser_tabs',
    description: 'Manage browser tabs: list active tabs, open new tab, switch tabs, or close tabs',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['list', 'new', 'switch', 'close'], description: 'Action to perform' },
        index: { type: 'number', description: 'Tab index for switch or close' },
        url: { type: 'string', description: 'Initial URL when opening new tab' }
      },
      required: ['action']
    }
  },
  browser_evaluate: {
    name: 'browser_evaluate',
    description: 'Execute arbitrary JavaScript code or arrow function in the webpage context',
    parameters: {
      type: 'object',
      properties: {
        function: { type: 'string', description: 'JavaScript code string or arrow function to evaluate (e.g. "() => document.title")' }
      },
      required: ['function']
    }
  },
  browser_lock: {
    name: 'browser_lock',
    description: 'Display or remove a non-intrusive HUD interaction lock overlay preventing accidental user interference',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['lock', 'unlock'], default: 'lock', description: 'Action: "lock" or "unlock"' },
        message: { type: 'string', default: 'AI Agent đang thực hiện tác vụ', description: 'Custom message on HUD overlay' }
      }
    }
  },
  browser_close: {
    name: 'browser_close',
    description: 'Cleanly close the browser session and release all system resources',
    parameters: {
      type: 'object',
      properties: {}
    }
  }
};

const targetDirs = [
  'C:\\Users\\cuong1\\.gemini\\antigravity\\mcp\\playwright-smart-pruning',
  'C:\\Users\\cuong1\\.gemini\\antigravity-ide\\mcp\\playwright-smart-pruning'
];

for (const dir of targetDirs) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  for (const [toolName, schema] of Object.entries(schemas)) {
    const filePath = path.join(dir, `${toolName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(schema, null, 2), 'utf-8');
  }
  console.log(`Exported ${Object.keys(schemas).length} tool schemas to ${dir}`);
}
