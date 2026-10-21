import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const serverPath = path.resolve(rootDir, 'src', 'server.js');
const nodeBin = process.execPath;
const homeDir = os.homedir();

console.log('🚀 Setting up Playwright Smart Pruning for Antigravity & Claude...\n');

// Helper to safely read and update JSON file
function updateJsonConfig(filePath, updater) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    let data = {};
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8').trim();
      if (content) {
        data = JSON.parse(content);
      }
    }
    const updated = updater(data);
    fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error(`❌ Failed to update ${filePath}:`, err.message);
    return false;
  }
}

// 1. Antigravity MCP Config
const agConfigPaths = [
  path.join(homeDir, '.gemini', 'antigravity', 'mcp_config.json'),
  path.join(homeDir, '.gemini', 'antigravity-ide', 'mcp_config.json'),
  path.join(homeDir, '.gemini', 'antigravity-cli', 'mcp_config.json')
];

for (const cfgPath of agConfigPaths) {
  const dir = path.dirname(cfgPath);
  if (fs.existsSync(dir) || cfgPath.includes('antigravity')) {
    const success = updateJsonConfig(cfgPath, (cfg) => {
      if (!cfg.mcpServers) cfg.mcpServers = {};
      cfg.mcpServers['playwright-smart-pruning'] = {
        command: nodeBin,
        args: [serverPath]
      };
      return cfg;
    });
    if (success) {
      console.log(`✅ [Antigravity] Configured MCP server in: ${cfgPath}`);
    }
  }
}

// 2. Claude Desktop Config
let claudeDesktopPath = null;
if (process.platform === 'win32') {
  const appData = process.env.APPDATA || path.join(homeDir, 'AppData', 'Roaming');
  claudeDesktopPath = path.join(appData, 'Claude', 'claude_desktop_config.json');
} else if (process.platform === 'darwin') {
  claudeDesktopPath = path.join(homeDir, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
} else {
  claudeDesktopPath = path.join(homeDir, '.config', 'Claude', 'claude_desktop_config.json');
}

if (claudeDesktopPath) {
  const success = updateJsonConfig(claudeDesktopPath, (cfg) => {
    if (!cfg.mcpServers) cfg.mcpServers = {};
    cfg.mcpServers['playwright-smart-pruning'] = {
      command: nodeBin,
      args: [serverPath]
    };
    return cfg;
  });
  if (success) {
    console.log(`✅ [Claude Desktop] Configured MCP server in: ${claudeDesktopPath}`);
  }
}

// 3. Claude Code CLI Config (~/.claude.json)
const claudeCodeConfigPath = path.join(homeDir, '.claude.json');
const claudeCodeSuccess = updateJsonConfig(claudeCodeConfigPath, (cfg) => {
  if (!cfg.mcpServers) cfg.mcpServers = {};
  cfg.mcpServers['playwright-smart-pruning'] = {
    command: nodeBin,
    args: [serverPath]
  };
  return cfg;
});
if (claudeCodeSuccess) {
  console.log(`✅ [Claude Code] Configured MCP server in: ${claudeCodeConfigPath}`);
}

// 4. Claude Code Global Slash Command (~/.claude/commands/browser.md)
const globalClaudeCommandsDir = path.join(homeDir, '.claude', 'commands');
try {
  if (!fs.existsSync(globalClaudeCommandsDir)) {
    fs.mkdirSync(globalClaudeCommandsDir, { recursive: true });
  }
  const claudeCommandSrc = path.join(rootDir, '.claude', 'commands', 'browser.md');
  const claudeCommandDest = path.join(globalClaudeCommandsDir, 'browser.md');
  if (fs.existsSync(claudeCommandSrc)) {
    fs.copyFileSync(claudeCommandSrc, claudeCommandDest);
    console.log(`✅ [Claude Code] Installed global slash command /browser at: ${claudeCommandDest}`);
  }
} catch (err) {
  console.warn(`⚠️ Could not install Claude global slash command: ${err.message}`);
}

// 5. Antigravity Global Skills (~/.gemini/config/skills/)
const agGlobalSkillsDir = path.join(homeDir, '.gemini', 'config', 'skills');
const skillsToCopy = ['playwright-smart-pruning', 'browser'];

for (const skillName of skillsToCopy) {
  try {
    const src = path.join(rootDir, '.agents', 'skills', skillName, 'SKILL.md');
    const targetDir = path.join(agGlobalSkillsDir, skillName);
    const targetFile = path.join(targetDir, 'SKILL.md');
    if (fs.existsSync(src)) {
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      fs.copyFileSync(src, targetFile);
      console.log(`✅ [Antigravity] Installed global skill /${skillName} at: ${targetFile}`);
    }
  } catch (err) {
    console.warn(`⚠️ Could not copy skill ${skillName}: ${err.message}`);
  }
}

// 6. Export Schemas to AG MCP schema directories
try {
  const exportSchemasScript = path.join(__dirname, 'export_schemas.js');
  if (fs.existsSync(exportSchemasScript)) {
    import('./export_schemas.js').then(() => {
      console.log('✅ [Antigravity] Exported tool schemas successfully.');
      printSummary();
    });
  } else {
    printSummary();
  }
} catch (err) {
  printSummary();
}

function printSummary() {
  console.log('\n🎉 Setup Completed Successfully!');
  console.log('--------------------------------------------------');
  console.log('⚡ Quick Commands Ready to Use:');
  console.log('  👉 In Antigravity:');
  console.log('     /playwright-smart-pruning  - Activate detailed skill instructions');
  console.log('     /browser                   - Quick browser navigation & automation');
  console.log('  👉 In Claude Code:');
  console.log('     /browser <url>             - Direct browser automation');
  console.log('  👉 In Claude Desktop:');
  console.log('     Restart Claude Desktop to load "playwright-smart-pruning" tools.');
  console.log('--------------------------------------------------\n');
}
