---
name: solidity-foundry-conventions
description: >-
  Use this skill when developing, testing, deploying, or binding Solidity smart contracts
  in Foundereum, particularly with Foundry and Hedera EVM quirks.
---

# Solidity & Foundry Conventions (Hedera EVM)

## 1. Minimal Smart Contract Footprint

Foundereum relies on native Hedera capabilities (HTS transfers, HCS topics) for money and audit. Only one smart contract is deployed by Foundereum:
- **`AgentIdentityRegistry.sol`** (ERC-8004 identity registry for agents on Hedera EVM).
- Other contracts are external (SaucerSwap testnet router, standard HTS ERC-20 precompiles).

Directory layout:
```
contracts/
├── foundry.toml
├── src/
│   └── AgentIdentityRegistry.sol
├── script/
│   └── Deploy.s.sol
├── test/
│   └── AgentIdentityRegistry.t.sol
└── deployments/
    └── hedera-testnet.json
```

---

## 2. Hedera EVM (Chain ID 296) Quirks & Best Practices

1. **EVM Compatibility & Gas:**
   - Chain ID is `296` for Hedera Testnet (`295` for Mainnet).
   - Hedera EVM supports standard Solidity versions (e.g. `^0.8.24` with Paris/Cancun EVM target).
   - Hedera transaction fees use gas denominated in tinybars.

2. **HTS Token Precompile (ERC-20 Compatibility):**
   - Hedera HTS tokens appear on the EVM as ERC-20 contracts at address `0x0000000000000000000000000000000000000000` + 32-bit Hedera entity num (e.g. token `0.0.429274` → `0x0000000000000000000000000000000000068cDa`).
   - Standard OpenZeppelin `IERC20` interfaces and abigen bindings work directly against these EVM aliases.
   - Note: Before an account can receive an HTS token, it must be **associated** with the token (handled via Hedera native `TokenAssociateTransaction` during wallet bootstrap).

3. **RPC Relay & Deployments:**
   - Use Hashio JSON-RPC: `https://testnet.hashio.io/api`.
   - When using `forge script`, pass `--legacy` because EIP-1559 dynamic fee transactions may behave unexpectedly depending on relay version.
   ```bash
   forge script script/Deploy.s.sol:DeployScript \
     --rpc-url https://testnet.hashio.io/api \
     --legacy \
     --broadcast
   ```

---

## 3. Testing Conventions (`forge test`)

All tests must be deterministic and runnable in CI:
1. **Unit tests (`test/AgentIdentityRegistry.t.sol`):**
   - Test registration mints ERC-721 token with incrementing ID.
   - Test `byWallet` mapping stores correctly.
   - Test registering the same wallet address twice reverts (`"registered"`).
   - Test `resolve(wallet)` returns correct `(id, uri, owner)`.
   - Test querying an un-registered wallet reverts (`"unknown"`).

2. **Fork tests (optional / integration):**
   - When testing SaucerSwap router interaction, fork Hedera testnet RPC:
     `forge test --fork-url https://testnet.hashio.io/api`
   - Test `approve` and `getAmountsOut` against the router address defined in `deployments/hedera-testnet.json`.

---

## 4. Contract Configuration & Deployments

- Contract addresses must **never** be hardcoded in Solidity source code or Go files.
- Store deployed addresses in `contracts/deployments/hedera-testnet.json`.
- When generating Go bindings:
  ```bash
  make contracts # or abigen --abi=... --pkg=... --out=...
  ```
- Any new contract or function called by the agent wallet must have its EVM address added to the Privy policy `allowlisted-contracts` and its 4-byte selector added to `allowlisted-selectors` (`docs/08-security.md §3`).
