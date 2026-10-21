#!/usr/bin/env node

const args = process.argv.slice(2);

if (args.includes('setup') || args.includes('install') || args.includes('--install') || args.includes('-i')) {
  await import('../scripts/setup.js');
} else {
  await import('../src/server.js');
}
