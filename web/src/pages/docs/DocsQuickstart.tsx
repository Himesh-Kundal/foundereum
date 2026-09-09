import { Cell } from '../../components/Cell';
import { TerminalBlock } from '../../components/TerminalBlock';

export interface DocsQuickstartProps {
  mcpConfigText?: string;
}

export function DocsQuickstart({ mcpConfigText }: DocsQuickstartProps) {
  const configSnippet = mcpConfigText || `{
  "mcpServers": {
    "foundereum": {
      "command": "npx",
      "args": ["-y", "foundereum-mcp", "--url", "http://localhost:8082/mcp"],
      "env": {
        "FOUNDEREUM_API_KEY": "fnd_sk_live_your_api_key_here"
      }
    }
  }
}`;

  return (
    <div className="flex flex-col gap-8">
      {/* Header Banner */}
      <div className="border border-ink bg-paper2 p-6 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-forge inline-block"></span>
          <span className="text-xs uppercase tracking-wider text-ink-mut font-bold">Integration Guide</span>
        </div>
        <h2 className="text-2xl md:text-3xl font-display uppercase tracking-tight text-ink">
          Agent Setup & Client Quickstart
        </h2>
        <p className="text-sm md:text-base text-ink leading-relaxed">
          Connect Claude Desktop, Claude Code, or your own custom autonomous agent framework (LangChain, AutoGen, 
          CrewAI) to Foundereum in under 4 minutes.
        </p>
      </div>

      {/* 4-Minute Walkthrough */}
      <Cell title="4-MINUTE INTEGRATION WALKTHROUGH" number="01">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className="border border-ink p-3 bg-paper flex flex-col gap-2">
            <span className="font-bold text-forge uppercase">1. Sign In & Provision</span>
            <p className="text-ink-mut leading-relaxed">
              Authenticate using email OTP or Google via Privy. A new project automatically provisions a Treasury and Agent 
              wallet pair on Hedera testnet.
            </p>
          </div>

          <div className="border border-ink p-3 bg-paper flex flex-col gap-2">
            <span className="font-bold text-forge uppercase">2. Fund Treasury</span>
            <p className="text-ink-mut leading-relaxed">
              Click <strong>Faucet</strong> in the Wallets tab to receive testnet USDC and HBAR, or send funds directly 
              to your project's Hedera account ID.
            </p>
          </div>

          <div className="border border-ink p-3 bg-paper flex flex-col gap-2">
            <span className="font-bold text-forge uppercase">3. Configure Policy</span>
            <p className="text-ink-mut leading-relaxed">
              Set your daily USD spend ceiling, per-call maximums, and contract allowlists in the Policy tab. Click 
              <strong> Push to Privy</strong>.
            </p>
          </div>

          <div className="border border-ink p-3 bg-paper flex flex-col gap-2">
            <span className="font-bold text-forge uppercase">4. Connect MCP</span>
            <p className="text-ink-mut leading-relaxed">
              Issue an API key (<code>fnd_sk_live_...</code>) in the Keys tab, paste the JSON config into Claude Desktop, 
              and begin executing tools.
            </p>
          </div>
        </div>
      </Cell>

      {/* Claude Desktop Configuration */}
      <Cell title="1. CLAUDE DESKTOP INTEGRATION" number="02">
        <div className="flex flex-col gap-4 text-xs leading-relaxed">
          <p className="text-ink">
            Add the Foundereum MCP server to your Claude Desktop configuration file:
          </p>

          <div className="border border-ink p-3 bg-paper">
            <span className="font-bold text-ink uppercase block mb-1">Configuration File Locations</span>
            <ul className="list-disc list-inside text-ink-mut flex flex-col gap-1 pl-1">
              <li><strong>macOS:</strong> <code>~/Library/Application Support/Claude/claude_desktop_config.json</code></li>
              <li><strong>Windows:</strong> <code>%APPDATA%\Claude\claude_desktop_config.json</code></li>
              <li><strong>Linux:</strong> <code>~/.config/Claude/claude_desktop_config.json</code></li>
            </ul>
          </div>

          <TerminalBlock>{configSnippet}</TerminalBlock>

          <p className="text-ink-mut">
            Restart Claude Desktop. 13 new tools will automatically appear in Claude's toolbelt (prefixed with 
            <code>foundereum__</code>).
          </p>
        </div>
      </Cell>

      {/* Custom Agent Integration */}
      <Cell title="2. CUSTOM AGENT INTEGRATION (TYPESCRIPT & PYTHON)" number="03">
        <div className="flex flex-col gap-6 text-xs">
          <div>
            <span className="font-bold uppercase text-ink block mb-2">TypeScript / Node.js (Direct Gateway Ingestion)</span>
            <TerminalBlock>{`import axios from 'axios';

const GATEWAY_URL = 'http://localhost:8081';
const API_KEY = process.env.FOUNDEREUM_API_KEY;

async function executeAgentTool(toolName: string, toolParams: object) {
  try {
    // 1. Send initial call
    const res = await axios.post(\`\${GATEWAY_URL}/v1/tools/\${toolName}\`, toolParams, {
      headers: {
        'Authorization': \`Bearer \${API_KEY}\`,
        'Idempotency-Key': crypto.randomUUID()
      }
    });
    return res.data;
  } catch (err: any) {
    if (err.response?.status === 402) {
      const challenge = err.response.data;
      
      // 2. Request Privy TEE payment signature
      const payRes = await axios.post(\`\${GATEWAY_URL}/v1/payments/build\`, {
        nonce: challenge.nonce
      }, {
        headers: { 'Authorization': \`Bearer \${API_KEY}\` }
      });
      
      // 3. Retry with X-PAYMENT authorization header
      const retryRes = await axios.post(\`\${GATEWAY_URL}/v1/tools/\${toolName}\`, toolParams, {
        headers: {
          'Authorization': \`Bearer \${API_KEY}\`,
          'X-PAYMENT': payRes.data.x_payment
        }
      });
      return retryRes.data;
    }
    throw err;
  }
}`}</TerminalBlock>
          </div>

          <div>
            <span className="font-bold uppercase text-ink block mb-2">Python (LangChain / AutoGen / CrewAI)</span>
            <TerminalBlock>{`import os
import uuid
import requests

GATEWAY_URL = "http://localhost:8081"
API_KEY = os.environ.get("FOUNDEREUM_API_KEY")

def call_tool(tool_name: str, payload: dict):
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Idempotency-Key": str(uuid.uuid4())
    }
    
    # 1. Attempt tool call
    r = requests.post(f"{GATEWAY_URL}/v1/tools/{tool_name}", json=payload, headers=headers)
    
    # 2. Handle HTTP 402 challenge
    if r.status_code == 402:
        nonce = r.json().get("nonce")
        
        # Build payment signature in Privy TEE
        pay_res = requests.post(
            f"{GATEWAY_URL}/v1/payments/build",
            json={"nonce": nonce},
            headers={"Authorization": f"Bearer {API_KEY}"}
        ).json()
        
        # Settle payment and retrieve result
        headers["X-PAYMENT"] = pay_res["x_payment"]
        final_res = requests.post(f"{GATEWAY_URL}/v1/tools/{tool_name}", json=payload, headers=headers)
        return final_res.json()
        
    return r.json()`}</TerminalBlock>
          </div>
        </div>
      </Cell>

      {/* Real-time SSE Streams */}
      <Cell title="3. REAL-TIME SERVER-SENT EVENTS (SSE)" number="04">
        <div className="flex flex-col gap-4 text-xs leading-relaxed">
          <p className="text-ink">
            Foundereum streams high-frequency live events over SSE at <code>GET /v1/projects/:id/events</code>:
          </p>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-ink bg-paper2 text-left">
                  <th className="p-2.5 font-bold uppercase">Event Name</th>
                  <th className="p-2.5 font-bold uppercase">Payload Description</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-ink">
                  <td className="p-2.5 font-mono text-forge font-bold">call.challenged</td>
                  <td className="p-2.5 text-ink-mut">Emitted when a 402 challenge is created with estimated price and nonce.</td>
                </tr>
                <tr className="border-b border-ink">
                  <td className="p-2.5 font-mono text-ok font-bold">call.paid</td>
                  <td className="p-2.5 text-ink-mut">Emitted when Blocky402 settles the HTS transfer on Hedera testnet.</td>
                </tr>
                <tr className="border-b border-ink">
                  <td className="p-2.5 font-mono text-ok font-bold">call.completed</td>
                  <td className="p-2.5 text-ink-mut">Emitted when upstream tool execution finishes, including latency and actual bytes.</td>
                </tr>
                <tr className="border-b border-ink">
                  <td className="p-2.5 font-mono text-ink font-bold">wallet.balance</td>
                  <td className="p-2.5 text-ink-mut">Emitted when Hedera mirror node reports an updated USDC or HBAR balance.</td>
                </tr>
                <tr className="border-b border-ink">
                  <td className="p-2.5 font-mono text-forge font-bold">audit.published</td>
                  <td className="p-2.5 text-ink-mut">Emitted when the payment receipt is committed to the project's HCS topic.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </Cell>
    </div>
  );
}
