import { useState } from 'react';
import { Cell } from '../../components/Cell';
import { TerminalBlock } from '../../components/TerminalBlock';
import { PricePill } from '../../components/Pills';

interface ToolDoc {
  name: string;
  category: 'wallet' | 'defi' | 'graph' | 'identity';
  description: string;
  pricing: string;
  priceRule: string;
  inputs: Record<string, { type: string; required: boolean; description: string }>;
  sampleRequest: object;
  sampleResponse: object;
}

const TOOLS: ToolDoc[] = [
  {
    name: 'get_project_info',
    category: 'wallet',
    description: 'Returns the current project summary, treasury and agent wallet addresses, HCS audit topic ID, and ERC-8004 identity status.',
    pricing: 'Free',
    priceRule: '0.00 USD (No 402 challenge issued)',
    inputs: {},
    sampleRequest: {},
    sampleResponse: {
      project_id: 'prj_982f1b4a',
      name: 'market-scout',
      wallets: {
        treasury: { hedera_account: '0.0.5551234', evm_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18' },
        agent: { hedera_account: '0.0.5559876', evm_address: '0x18cbafe512839210984210398402194012948012' }
      },
      hcs_topic_id: '0.0.4478291',
      identity: { registered: true, agent_id: 'fnd:agent:8004:1' }
    }
  },
  {
    name: 'get_balances',
    category: 'wallet',
    description: 'Queries live HTS USDC and HBAR balances across Treasury and Agent wallets directly from the Hedera mirror node.',
    pricing: 'Free',
    priceRule: '0.00 USD (Real-time Mirror Node query)',
    inputs: {},
    sampleRequest: {},
    sampleResponse: {
      treasury: { usdc: '12.500000', hbar: '45.12000000', status: 'ready' },
      agent: { usdc: '9.240000', hbar: '10.00000000', status: 'ready' }
    }
  },
  {
    name: 'transfer_token',
    category: 'wallet',
    description: 'Initiates an HTS token transfer from the agent wallet to a recipient. Policy engine validates the destination against allowlists.',
    pricing: '$0.002 flat',
    priceRule: '0.002 USD per transfer',
    inputs: {
      to_account: { type: 'string', required: true, description: 'Hedera account ID (e.g. 0.0.12345)' },
      token: { type: 'string', required: true, description: 'Token symbol (USDC or HBAR)' },
      amount: { type: 'string', required: true, description: 'Decimal amount to transfer (e.g. "1.5")' }
    },
    sampleRequest: {
      to_account: '0.0.5558888',
      token: 'USDC',
      amount: '1.5'
    },
    sampleResponse: {
      status: 'settled',
      hedera_tx_id: '0.0.5559876@1757301290.000000000',
      hashscan_url: 'https://hashscan.io/testnet/transaction/0.0.5559876@1757301290.000000000'
    }
  },
  {
    name: 'get_swap_quote',
    category: 'defi',
    description: 'Fetches real-time price quotes, route paths, and expected slippage from the SaucerSwap DEX router on Hedera EVM.',
    pricing: '$0.0001 flat',
    priceRule: '0.0001 USD per quote',
    inputs: {
      token_in: { type: 'string', required: true, description: 'Input token symbol (e.g. "USDC")' },
      token_out: { type: 'string', required: true, description: 'Output token symbol (e.g. "HBAR")' },
      amount_in: { type: 'string', required: true, description: 'Input amount as decimal string (e.g. "5.0")' }
    },
    sampleRequest: {
      token_in: 'USDC',
      token_out: 'HBAR',
      amount_in: '5.0'
    },
    sampleResponse: {
      amount_out: '62.50000000',
      path: ['0x0000000000000000000000000000000000068cd2', '0x0000000000000000000000000000000000000163'],
      price_impact_bps: 12
    }
  },
  {
    name: 'swap_tokens',
    category: 'defi',
    description: 'Executes an on-chain automated token swap on SaucerSwap V2 router via Hedera EVM (Chain ID 296). Enforces allowlists in Privy TEE.',
    pricing: '$0.005 + 5bps',
    priceRule: '0.005 USD base + 5 basis points notional (capped at 0.05 USD)',
    inputs: {
      token_in: { type: 'string', required: true, description: 'Token to sell (e.g. "USDC")' },
      token_out: { type: 'string', required: true, description: 'Token to buy (e.g. "HBAR")' },
      amount_in: { type: 'string', required: true, description: 'Amount to swap' },
      slippage_bps: { type: 'number', required: false, description: 'Max slippage in bps (default: 50)' }
    },
    sampleRequest: {
      token_in: 'USDC',
      token_out: 'HBAR',
      amount_in: '5.0',
      slippage_bps: 50
    },
    sampleResponse: {
      tx_hash: '0x5fa10b991823901b23901f...8',
      amount_out: '62.38192000',
      hashscan_url: 'https://hashscan.io/testnet/transaction/0.0.5559876@1757301300.000000000'
    }
  },
  {
    name: 'deploy_contract',
    category: 'defi',
    description: 'Compiles and deploys smart contracts to Hedera EVM. Calldata and bytecode size are metered dynamically.',
    pricing: '$0.02 + $0.001/KB',
    priceRule: '0.02 USD base + 0.001 USD per KB of compiled bytecode',
    inputs: {
      bytecode: { type: 'string', required: true, description: 'Hex bytecode string with 0x prefix' },
      abi: { type: 'string', required: true, description: 'JSON ABI string' },
      constructor_args: { type: 'array', required: false, description: 'Constructor parameters' }
    },
    sampleRequest: {
      bytecode: '0x608060405234801561001057600080fd5b50...',
      abi: '[{"inputs":[],"stateMutability":"nonpayable","type":"constructor"}]'
    },
    sampleResponse: {
      contract_address: '0x9948201289a01928301982039182039120938102',
      tx_hash: '0x381902830192830192830192830192830192830192',
      hashscan_url: 'https://hashscan.io/testnet/contract/0.0.5559899'
    }
  },
  {
    name: 'search_subgraphs',
    category: 'graph',
    description: 'Discovers published subgraphs across The Graph Network matching user-specified keywords and network tags.',
    pricing: '$0.00001 flat',
    priceRule: '0.00001 USD per search',
    inputs: {
      keyword: { type: 'string', required: true, description: 'Search term (e.g. "uniswap-v3", "aave")' }
    },
    sampleRequest: { keyword: 'uniswap-v3' },
    sampleResponse: {
      deployments: [
        { id: 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco', network: 'mainnet', name: 'Uniswap V3' }
      ]
    }
  },
  {
    name: 'get_subgraph_schema',
    category: 'graph',
    description: 'Introspects and returns the full GraphQL Schema Definition Language (SDL) for an indexed subgraph deployment.',
    pricing: '$0.00001 flat',
    priceRule: '0.00001 USD per schema introspection',
    inputs: {
      deployment_id: { type: 'string', required: true, description: 'IPFS deployment hash (Qm...)' }
    },
    sampleRequest: { deployment_id: 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco' },
    sampleResponse: {
      sdl: 'type Pool @entity { id: ID! token0: Token! token1: Token! totalValueLockedUSD: BigDecimal! }'
    }
  },
  {
    name: 'execute_subgraph_query',
    category: 'graph',
    description: 'Executes a raw GraphQL query against The Graph decentralized network. Result payload is metered per kilobyte.',
    pricing: '$0.00001 + $0.000002/KB',
    priceRule: '0.00001 USD base + 0.000002 USD per KB of JSON response payload',
    inputs: {
      deployment_id: { type: 'string', required: true, description: 'Target subgraph deployment ID' },
      query: { type: 'string', required: true, description: 'GraphQL query string' },
      variables: { type: 'object', required: false, description: 'Optional GraphQL query variables' }
    },
    sampleRequest: {
      deployment_id: 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco',
      query: '{ pools(first: 2) { id symbol totalValueLockedUSD } }'
    },
    sampleResponse: {
      data: {
        pools: [
          { id: '0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640', symbol: 'USDC/WETH', totalValueLockedUSD: '184920412.50' }
        ]
      }
    }
  },
  {
    name: 'analyze_pool_health',
    category: 'graph',
    description: 'Analyzes DEX liquidity pools using Messari standardized subgraphs, returning a 0-100 risk score and recommended trade sizing.',
    pricing: '~$0.0006',
    priceRule: '0.0005 USD base + Graph pass-through fee',
    inputs: {
      protocol: { type: 'string', required: true, description: 'DEX protocol ("uniswap-v3", "sushiswap", "aerodrome", "curve")' },
      network: { type: 'string', required: true, description: 'Network ("mainnet", "base", "arbitrum", "optimism")' },
      pool: { type: 'string', required: true, description: 'Pool address or pair name e.g. "USDC/WETH 0.05%"' }
    },
    sampleRequest: {
      protocol: 'uniswap-v3',
      network: 'base',
      pool: 'USDC/WETH 0.05%'
    },
    sampleResponse: {
      score: 94,
      verdict: 'HEALTHY',
      tvl_usd: '184920412.50',
      vol_tvl_24h: '0.42',
      top_swap_share: '0.038',
      suggested_max_notional_usd: '250000.00',
      risks: []
    }
  },
  {
    name: 'compare_protocol_tvl',
    category: 'graph',
    description: 'Compares total value locked and 7-day velocity across multiple decentralized protocols in parallel.',
    pricing: '~$0.0006',
    priceRule: '0.0005 USD base + Graph pass-through fee',
    inputs: {
      protocols: { type: 'array', required: true, description: 'Array of protocols to compare' },
      network: { type: 'string', required: true, description: 'Target blockchain network' }
    },
    sampleRequest: {
      protocols: ['uniswap-v3', 'sushiswap', 'aerodrome'],
      network: 'base'
    },
    sampleResponse: {
      rankings: [
        { protocol: 'aerodrome', tvl_usd: '684200110.00', delta_7d_pct: '+4.12%' },
        { protocol: 'uniswap-v3', tvl_usd: '421900880.00', delta_7d_pct: '-1.20%' }
      ]
    }
  },
  {
    name: 'verify_agent',
    category: 'identity',
    description: 'Inspects on-chain ERC-8004 agent registry smart contracts to verify the identity and ownership credentials of an autonomous agent.',
    pricing: '$0.00001 flat',
    priceRule: '0.00001 USD per verification call',
    inputs: {
      agent_id: { type: 'string', required: true, description: 'Agent registry token ID or EVM address' }
    },
    sampleRequest: { agent_id: '0x18cbafe512839210984210398402194012948012' },
    sampleResponse: {
      registered: true,
      owner: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18',
      uri: 'ipfs://QmAgentIdentityMetadata...'
    }
  },
  {
    name: 'list_services',
    category: 'identity',
    description: 'Returns the complete machine-readable service directory, including all tool definitions, JSON schemas, and x402 payment addresses.',
    pricing: 'Free',
    priceRule: '0.00 USD (Open discovery endpoint)',
    inputs: {},
    sampleRequest: {},
    sampleResponse: {
      name: 'Foundereum',
      x402: {
        scheme: 'hedera-exact',
        network: 'hedera-testnet',
        asset: '0.0.429274',
        payTo: '0.0.5551234'
      },
      tools_count: 13
    }
  }
];

export function DocsMcpCatalog() {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedTool, setSelectedTool] = useState<ToolDoc>(TOOLS[0]);

  const filteredTools = selectedCategory === 'ALL' 
    ? TOOLS 
    : TOOLS.filter(t => t.category.toUpperCase() === selectedCategory);

  return (
    <div className="flex flex-col gap-8">
      {/* Header Banner */}
      <div className="border border-ink bg-paper2 p-6 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-forge inline-block"></span>
          <span className="text-xs uppercase tracking-wider text-ink-mut font-bold">API Reference</span>
        </div>
        <h2 className="text-2xl md:text-3xl font-display uppercase tracking-tight text-ink">
          MCP Tool Catalog & Schemas
        </h2>
        <p className="text-sm md:text-base text-ink leading-relaxed">
          Complete machine-readable and developer reference for all 13 tools exposed across the Foundereum MCP server 
          and x402 gateway. Each tool specifies exact parameter constraints, JSON Schemas, dynamic pricing rules, 
          and verifiable sample payloads.
        </p>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs font-bold uppercase mr-2 text-ink-mut">Filter:</span>
        {['ALL', 'WALLET', 'DEFI', 'GRAPH', 'IDENTITY'].map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-3 py-1 border border-ink text-xs uppercase font-mono transition-colors cursor-pointer ${
              selectedCategory === category 
                ? 'bg-ink text-paper font-bold' 
                : 'bg-paper text-ink hover:bg-paper2'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Two Pane Catalog: List Left, Inspector Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Tool List Pane */}
        <div className="lg:col-span-5 flex flex-col gap-2">
          {filteredTools.map(tool => {
            const isSelected = selectedTool.name === tool.name;
            return (
              <button
                key={tool.name}
                onClick={() => setSelectedTool(tool)}
                className={`text-left p-3 border border-ink transition-all cursor-pointer flex flex-col gap-1.5 ${
                  isSelected ? 'bg-paper2 border-l-4 border-l-forge' : 'bg-paper hover:bg-paper2'
                }`}
              >
                <div className="flex justify-between items-center w-full">
                  <span className="font-mono font-bold text-xs text-ink">{tool.name}</span>
                  <PricePill price={tool.pricing} />
                </div>
                <p className="text-[11px] text-ink-mut line-clamp-2">{tool.description}</p>
              </button>
            );
          })}
        </div>

        {/* Selected Tool Details Pane */}
        <div className="lg:col-span-7">
          <Cell title={`TOOL: ${selectedTool.name.toUpperCase()}`} number="SPEC">
            <div className="flex flex-col gap-6 text-xs leading-relaxed p-1">
              <div>
                <span className="text-[10px] uppercase font-bold text-ink-mut block mb-1">Description</span>
                <p className="text-ink">{selectedTool.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 border-y border-ink py-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-ink-mut block mb-1">Pricing Rule</span>
                  <span className="font-mono font-bold text-forge">{selectedTool.pricing}</span>
                  <span className="text-[11px] text-ink-mut block mt-0.5">{selectedTool.priceRule}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-ink-mut block mb-1">Gateway Endpoint</span>
                  <span className="font-mono text-ink">POST /v1/tools/{selectedTool.name}</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-ink-mut block mb-2">Input Parameters</span>
                {Object.keys(selectedTool.inputs).length === 0 ? (
                  <p className="text-ink-mut italic">No input parameters required.</p>
                ) : (
                  <div className="border border-ink divide-y divide-ink">
                    {Object.entries(selectedTool.inputs).map(([paramName, paramInfo]) => (
                      <div key={paramName} className="p-2.5 flex flex-col gap-0.5 bg-paper">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-ink">{paramName}</span>
                          <span className="text-[10px] px-1.5 py-0.2 border border-ink bg-paper2">{paramInfo.type}</span>
                          {paramInfo.required && (
                            <span className="text-[10px] text-forge uppercase font-bold">required</span>
                          )}
                        </div>
                        <p className="text-[11px] text-ink-mut">{paramInfo.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-ink-mut block mb-2">Sample Request Payload</span>
                <TerminalBlock>{JSON.stringify(selectedTool.sampleRequest, null, 2)}</TerminalBlock>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-ink-mut block mb-2">Sample Output Payload</span>
                <TerminalBlock>{JSON.stringify(selectedTool.sampleResponse, null, 2)}</TerminalBlock>
              </div>
            </div>
          </Cell>
        </div>
      </div>
    </div>
  );
}
