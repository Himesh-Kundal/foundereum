---
name: foundereum-design-system
description: >-
  Use this skill when building or styling UI components, pages, forms, or data visualizations
  in the Foundereum React frontend dashboard. Enforces Tailwind, shadcn/ui, design tokens,
  and Web3 UX patterns.
---

# Foundereum Frontend Design System & UI/UX

Pair this skill with general frontend design guidelines to craft high-fidelity, responsive, Web3/fintech operator experiences for Foundereum.

## 1. Tech Stack & Libraries

- **Framework:** React 18 + TypeScript (Vite)
- **Styling:** Tailwind CSS + Radix UI / `shadcn/ui`
- **State & Data Fetching:** TanStack Query (`@tanstack/react-query`)
- **Routing:** React Router v6
- **Auth:** `@privy-io/react-auth` (embedded wallets, email OTP, OAuth, WebCrypto signer)
- **Charts:** Recharts (spend by day, latency, volume meters)
- **Icons:** Lucide React (`lucide-react`)
- **Real-time updates:** Server-Sent Events (`EventSource`) connected to `/projects/:id/events`

---

## 2. Design Tokens & Visual Language

- **Aesthetic:** Dark-mode first, dense, precision fintech / developer dashboard (reminiscent of Linear, Stripe, Vercel).
- **Color Palette:**
  - Neutral / Slate background tones (`bg-zinc-950`, `bg-zinc-900`, `border-zinc-800`).
  - Brand Accent: Electric Indigo / Cyan (`#6366f1` / `#06b6d4`) for active states, CTA buttons, and network badges.
  - Status Indicators:
    - Success / Settled / Active: `text-emerald-400 bg-emerald-950/40 border-emerald-800`
    - Challenged / Pending / Re-signing: `text-amber-400 bg-amber-950/40 border-amber-800`
    - Failed / Rejected / Error: `text-rose-400 bg-rose-950/40 border-rose-800`
- **Typography:**
  - Monospace (`font-mono`) for addresses (`0.0.1234`, `0x...`), hashes, API keys, transaction IDs, and currency amounts.
  - Sans (`font-sans`, Inter / Geist) for headings, body copy, and UI controls.

---

## 3. Screen Layouts & Component Patterns

1. **Dashboard Shell:**
   - Left sidebar navigation: Projects, Wallets & Treasury, Policies, API Keys, Call Log, Approvals Inbox, Audit Trail, Service Directory.
   - Top bar: Current project selector, network status (`Hedera Testnet`), user avatar / logout via Privy.

2. **Wallet Cards:**
   - Display both Hedera Account ID (`0.0.x`) and EVM alias (`0x...`).
   - Include 1-click copy with toast feedback.
   - External link button to HashScan explorer (`https://hashscan.io/testnet/account/...`).
   - Distinct cards for **Treasury Wallet** (multi-sig / quorum badge) and **Agent Wallet** (policy-bound badge).

3. **Live Call Log & Metering:**
   - Real-time table streaming events from `/projects/:id/events`.
   - Columns: Status badge, Tool name, Metered Price (e.g. `$0.000030`), Duration (`ms`), HashScan tx link, Timestamp.
   - Expanded row details: Input parameters, metered payload size (KB), raw JSON response preview.

4. **Approvals Inbox (Key Quorum UI):**
   - Clear banner showing `M-of-N` signatures required.
   - Card for each pending action: type (e.g. withdrawal, policy update), requester, expiration countdown.
   - "Approve" button triggers browser WebCrypto signing with the member's P-256 keypair and submits signature to `/approvals/:id/approve`.

5. **MCP Config Snippet:**
   - Pre-formatted, copyable JSON block for Claude Desktop `claude_desktop_config.json`:
     ```json
     {
       "mcpServers": {
         "foundereum": {
           "command": "npx",
           "args": ["-y", "foundereum-mcp", "--url", "https://mcp.foundereum.xyz/mcp"],
           "env": {
             "FOUNDEREUM_API_KEY": "fnd_sk_live_..."
           }
         }
       }
     }
     ```
   - Masked API key with reveal toggle.

---

## 4. Web3 UX Best Practices

- **Never display raw un-formatted base units:** Always format USDC amounts to 6 decimal places (or human currency `$X.XX`) and HBAR amounts with readable labels.
- **Optimistic UI with clear pending states:** Tool invocations, faucet requests, and approvals must indicate pending network states without locking the entire UI.
- **Truncate long hashes safely:** Format addresses and transaction IDs with middle-ellipsis (e.g. `0.0.1234...5678` or `0x1234...abcd`) while preserving copy-to-clipboard functionality.
