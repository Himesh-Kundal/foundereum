const http = require('http');

const PORT = parseInt(process.env.PORT || '7000', 10);
const GRAPH_API_KEY = process.env.GRAPH_API_KEY || '';

const MOCK_SUBGRAPHS = [
  {
    display_name: 'Uniswap v3 Ethereum',
    deployment_id: 'QmTZ8ejXJxRo7vDBS4uwqBeGoxLSWbhaA7oXa1RvxunLy7',
    subgraph_id: '5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV',
    network: 'mainnet',
    protocol: 'uniswap-v3',
    schema: 'type Pool { id: ID!, token0: Token!, token1: Token!, totalValueLockedUSD: BigDecimal!, volumeUSD: BigDecimal! }'
  },
  {
    display_name: 'Uniswap v4 Protocol',
    deployment_id: 'Qmbsc6XQWbiv4DfLVfaNciScqYLyDWUYjWzrFBbzzmRsMB',
    subgraph_id: 'Gqm2b5J85n1bhCyDMpGbtbVn4935EvvdyHdHrx3dibyj',
    network: 'mainnet',
    protocol: 'uniswap-v4',
    schema: 'type Pool { id: ID!, poolManager: PoolManager!, currency0: Bytes!, currency1: Bytes! }'
  },
  {
    display_name: 'The Graph Network Arbitrum',
    deployment_id: 'DZz4kDTdmzWLWsV373w2bSmoar3umKKH9y82SUKr5qmp',
    subgraph_id: 'DZz4kDTdmzWLWsV373w2bSmoar3umKKH9y82SUKr5qmp',
    network: 'arbitrum',
    protocol: 'the-graph-network',
    schema: 'type Subgraph { id: ID!, currentSignalledTokens: BigInt!, currentVersion: SubgraphVersion }'
  }
];

async function handleToolsCall(name, args) {
  if (name === 'search_subgraphs_by_keyword' || name === 'search_subgraphs') {
    const keyword = (args.keyword || '').toLowerCase();
    const matches = MOCK_SUBGRAPHS.filter(s => 
      s.display_name.toLowerCase().includes(keyword) || 
      s.protocol.toLowerCase().includes(keyword) || 
      s.network.toLowerCase().includes(keyword)
    );
    return {
      subgraphs: matches.length > 0 ? matches : MOCK_SUBGRAPHS
    };
  }

  if (name === 'get_schema_by_deployment_id') {
    const match = MOCK_SUBGRAPHS.find(s => s.deployment_id === args.deployment_id || s.subgraph_id === args.deployment_id);
    return {
      schema: match ? match.schema : 'type Query { ping: String }'
    };
  }

  if (name === 'execute_query_by_deployment_id') {
    const deploymentId = args.deployment_id;
    const query = args.query;

    if (GRAPH_API_KEY && deploymentId && query) {
      try {
        const isDeployment = deploymentId.startsWith('Qm');
        const url = isDeployment
          ? `https://gateway.thegraph.com/api/${GRAPH_API_KEY}/deployments/id/${deploymentId}`
          : `https://gateway.thegraph.com/api/${GRAPH_API_KEY}/subgraphs/id/${deploymentId}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        const upstreamRes = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
          signal: controller.signal
        });
        clearTimeout(timeout);

        if (upstreamRes.ok) {
          const json = await upstreamRes.json();
          return json;
        }
      } catch (err) {
        console.warn(`Upstream Graph gateway error: ${err.message}, falling back to mock response`);
      }
    }

    return {
      data: {
        liquidityPools: [
          {
            id: "0xd0b53d9277642d899df5c87a3966a349a798f224",
            name: "USDC / WETH 0.05%",
            totalValueLockedUSD: "45250000.00",
            cumulativeVolumeUSD: "1250000000.00",
            feesUSD: "625000.00",
            protocol: {
              name: "Uniswap v3",
              network: "base"
            }
          }
        ]
      }
    };
  }

  return { error: `unknown tool: ${name}` };
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'GET' && (req.url === '/health' || req.url === '/')) {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok', service: 'subgraph-mcp', version: '1.0.0' }));
    return;
  }

  if (req.method === 'POST' && (req.url === '/mcp' || req.url === '/')) {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const id = payload.id !== undefined ? payload.id : 1;
        const method = payload.method;

        if (method === 'tools/list') {
          res.writeHead(200);
          res.end(JSON.stringify({
            jsonrpc: '2.0',
            id,
            result: {
              tools: [
                {
                  name: 'search_subgraphs_by_keyword',
                  description: 'Search subgraphs by keyword on The Graph network',
                  inputSchema: {
                    type: 'object',
                    properties: { keyword: { type: 'string' } }
                  }
                },
                {
                  name: 'get_schema_by_deployment_id',
                  description: 'Get GraphQL schema for a subgraph deployment',
                  inputSchema: {
                    type: 'object',
                    required: ['deployment_id'],
                    properties: { deployment_id: { type: 'string' } }
                  }
                },
                {
                  name: 'execute_query_by_deployment_id',
                  description: 'Execute GraphQL query against a subgraph deployment',
                  inputSchema: {
                    type: 'object',
                    required: ['deployment_id', 'query'],
                    properties: {
                      deployment_id: { type: 'string' },
                      query: { type: 'string' }
                    }
                  }
                }
              ]
            }
          }));
          return;
        }

        if (method === 'tools/call') {
          const toolName = payload.params?.name;
          const toolArgs = payload.params?.arguments || {};
          const result = await handleToolsCall(toolName, toolArgs);

          res.writeHead(200);
          res.end(JSON.stringify({
            jsonrpc: '2.0',
            id,
            result
          }));
          return;
        }

        res.writeHead(200);
        res.end(JSON.stringify({
          jsonrpc: '2.0',
          id,
          result: { acknowledged: true }
        }));
      } catch (err) {
        res.writeHead(400);
        res.end(JSON.stringify({
          jsonrpc: '2.0',
          error: { code: -32700, message: `Parse error: ${err.message}` }
        }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'not found' }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`subgraph-mcp streamable HTTP server listening on port ${PORT}`);
});
