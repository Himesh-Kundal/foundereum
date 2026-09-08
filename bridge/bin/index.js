#!/usr/bin/env node

/**
 * Foundereum Stdio to Streamable-HTTP proxy bridge for Claude Desktop.
 * Relays stdin/stdout JSON-RPC directly to the Foundereum MCP Server with
 * the project's FOUNDEREUM_API_KEY.
 */

import http from 'http';
import readline from 'readline';

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log('Foundereum Claude Desktop MCP Bridge');
  console.log('Usage: foundereum-mcp [--url <mcp-http-url>]');
  console.log('Env: FOUNDEREUM_API_KEY=<key>');
  process.exit(0);
}

let mcpUrl = 'http://localhost:8082/mcp';
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--url' && args[i + 1]) {
    mcpUrl = args[i + 1];
    i++;
  }
}

const apiKey = process.env.FOUNDEREUM_API_KEY || '';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on('line', (line) => {
  if (!line.trim()) return;

  try {
    const url = new URL(mcpUrl);
    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiKey ? `Bearer ${apiKey}` : '',
        'Content-Length': Buffer.byteLength(line)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (data) {
          process.stdout.write(data + '\n');
        }
      });
    });

    req.on('error', (e) => {
      const errResp = JSON.stringify({
        jsonrpc: '2.0',
        error: { code: -32603, message: `Bridge error: ${e.message}` }
      });
      process.stdout.write(errResp + '\n');
    });

    req.write(line);
    req.end();
  } catch (err) {
    const errResp = JSON.stringify({
      jsonrpc: '2.0',
      error: { code: -32700, message: `Parse error: ${err.message}` }
    });
    process.stdout.write(errResp + '\n');
  }
});
