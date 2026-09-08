# 07 — Smart Contracts (minimal by design)

Almost everything Foundereum does is **native Hedera** (HTS transfers, HCS messages) or calls **existing** contracts (SaucerSwap router). We deploy exactly one contract, and only for Hedera's ERC-8004 extra-points item.

```
contracts/
├── foundry.toml
├── src/AgentIdentityRegistry.sol
├── script/Deploy.s.sol
├── test/AgentIdentityRegistry.t.sol
└── deployments/hedera-testnet.json
```

Deploy target: Hedera testnet EVM (chainId 296) via Hashio JSON-RPC. `forge script … --rpc-url https://testnet.hashio.io/api --legacy --broadcast`. Verify on HashScan (Sourcify).

## 1. `AgentIdentityRegistry` (ERC-8004-style)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract AgentIdentityRegistry is ERC721 {
    struct Agent { string agentURI; address wallet; bytes32 projectHash; }
    uint256 public nextId = 1;
    mapping(uint256 => Agent) public agents;
    mapping(address => uint256) public byWallet;

    event AgentRegistered(uint256 indexed id, address indexed wallet, bytes32 indexed projectHash, string agentURI);

    constructor() ERC721("Foundereum Agent", "FNDA") {}

    function register(string calldata agentURI, address wallet, bytes32 projectHash) external returns (uint256 id) {
        require(byWallet[wallet] == 0, "registered");
        id = nextId++;
        agents[id] = Agent(agentURI, wallet, projectHash);
        byWallet[wallet] = id;
        _mint(wallet, id);
        emit AgentRegistered(id, wallet, projectHash, agentURI);
    }

    function agentIdScheme() external pure returns (string memory) { return "foundereum.hedera.v1"; }

    function resolve(address wallet) external view returns (uint256 id, string memory uri, address owner) {
        id = byWallet[wallet];
        require(id != 0, "unknown");
        return (id, agents[id].agentURI, ownerOf(id));
    }
}
```

- `agentURI` = `https://<api>/v1/agents/<id>.json` — a public JSON with project name, HCS audit topic, x402 payTo, tools allowed. Other agents can fetch it (A2A trust).
- Registered by the `bootstrap_hedera` worker right after the agent wallet is ready (agent wallet signs via Privy `eth_signTransaction`; `register` must be in the selector allowlist).
- `verify_agent` tool calls `resolve`.

## 2. External contracts we call (addresses in `deployments/hedera-testnet.json`)

```json
{
  "chainId": 296,
  "rpc": "https://testnet.hashio.io/api",
  "usdc": { "tokenId": "0.0.429274", "evm": "0x0000000000000000000000000000000000068cDa" },
  "whbar": "0x…",
  "saucerswapRouter": "0x…",
  "agentIdentityRegistry": "0x…"
}
```

Fill in from SaucerSwap testnet docs + Hedera testnet USDC on day 0. HTS tokens are ERC-20-compatible through the HTS precompile, so standard `IERC20` ABI bindings work.

## 3. Tests
- `register` mints, `resolve` returns, duplicate wallet reverts.
- Fork test (optional): `approve` + `getAmountsOut` against SaucerSwap testnet router to validate the ABI we bound.
