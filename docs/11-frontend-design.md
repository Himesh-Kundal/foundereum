# 11 — Frontend Design

Theme, component system, and page-by-page content for the Foundereum web app (`web/`, React + Vite + Tailwind). Visual direction is set by the existing brand assets (cream/ink anvil-in-hexagon logo, mono wordmark) plus two references:

- **Turnable** (turnable.webflow.io): cream paper background, dotted grid texture, enormous chunky black display type, monospace body text, outlined pill buttons, almost no color.
- **ChainGPT Labs** (labs.chaingpt.org): everything lives inside a visible 1px grid of cells, corner-bracket markers on cells, monospace labels, numbered sections ("01 / 02"), checkbox-tick feature lists, one loud orange accent on CTAs.

The synthesis — call it **"Foundry Paper"**: a paper-brutalist marketing site and a machine-console dashboard, both built from the same tokens.

---

## 1. Design tokens

```js
// tailwind.config.js → theme.extend
colors: {
  paper:   '#F4F1E9',   // page background — matches the logo's cream
  paper2:  '#EDE9DE',   // alternate cells / hover fills
  ink:     '#16181D',   // near-black — text, borders, the logo mark
  inkMut:  '#6B6E76',   // secondary text
  line:    '#16181D',   // structural borders (used at full strength, 1px)
  lineSoft:'#D9D4C7',   // soft inner grid lines, dotted patterns
  forge:   '#F05423',   // THE accent. CTAs, live indicators, checks. Use sparingly.
  ok:      '#1E7F4F',   // dashboard-only: success states
  err:     '#C6402E',   // dashboard-only: failures/rejections
},
fontFamily: {
  display: ['"Archivo Black"', 'sans-serif'],   // hero headlines only, ALL CAPS
  mono:    ['"JetBrains Mono"', 'monospace'],   // literally everything else
},
```

Rules of the theme:

1. **Two fonts, and mono is the default.** Body, buttons, nav, labels, tables, forms — all JetBrains Mono. `font-display` appears only in marketing hero headlines and giant section titles, always uppercase, always `text-ink`.
2. **One accent.** `forge` orange is for: primary CTAs, the live "payment spark" indicator, checked ticks, active nav marker. It never fills large areas. If a screen has more than ~3 orange elements, remove some.
3. **Borders are the layout.** Sections and dashboard panels are separated by `1px solid ink` borders forming visible cells (ChainGPT style) — not by whitespace, shadows, or rounded cards. `border-radius: 0` everywhere except the two pill elements (marketing pill button, status pills).
4. **No shadows, no gradients, no glassmorphism.** Depth = border weight and fill (`paper` vs `paper2`).
5. **Dotted grid texture** on marketing hero/section backgrounds only: radial-gradient dots, `lineSoft`, 24px spacing, disabled in the dashboard (too noisy behind data).

```css
.dotted { background-image: radial-gradient(#D9D4C7 1.2px, transparent 1.2px); background-size: 24px 24px; }
```

## 2. Recurring motifs

| Motif | Spec | Source |
|---|---|---|
| **Corner brackets** | 10×10px L-shapes in `ink` at the 4 corners of interactive cells, drawn with `::before/::after` borders. On hover they turn `forge`. | ChainGPT |
| **Section numbers** | `01`, `02`… mono 12px `inkMut`, top-left of every marketing section and dashboard panel header. | ChainGPT |
| **The spark** | 8×8px `forge` square (not circle — matches the blocky logo). Pulses (opacity 1→0.3, 1s) wherever a payment is in flight; static as list bullet. | logo horn spark |
| **Tick list** | Feature lists use `✓` in `forge` + mono text, boxed rows. | ChainGPT |
| **Pill button** | Marketing CTAs: mono uppercase, `1px ink` border, fully rounded, transparent; hover = ink fill / paper text. | Turnable "START LISTENING" |
| **Block button** | App/primary CTAs: sharp rectangle, `forge` fill, ink text, mono uppercase; hover darkens. Exactly one per view. | ChainGPT "APPLY NOW" |
| **Terminal block** | Code/payloads: `ink` background, `paper` text, mono 13px, no rounding — the only dark surfaces in the whole product. Used for the 402 exchange demo, MCP config, policy JSON. | — |
| **Marquee ticker** | Thin strip between hero and first section: `swap_tokens $0.0075 · settled 0.0.x@… · execute_subgraph_query $0.00003 · …` scrolling slowly. Respect `prefers-reduced-motion`. | webflow-era sites |
| **ASCII caret labels** | Nav/section labels wrapped like `⌐ PROGRAMS ¬` → we use `[ CALLS ]` style brackets for active states. | ChainGPT nav |

Logo usage: the uploaded mark sits directly on `paper` (its native background — no box needed). Nav uses mark-only at 32px + `Foundereum` wordmark in mono 500. Favicon = mark only. The uploaded cover photo is the GitHub social preview and the README banner, unchanged.

## 3. Component inventory (`web/src/components/`)

| Component | Notes |
|---|---|
| `Cell` | The building block: `border border-ink`, optional corner brackets, optional `01` number, `paper`/`paper2` fill. Dashboard = grids of Cells. |
| `PillButton` / `BlockButton` | As above. Block accepts `danger` variant (err fill) for revoke/reject. |
| `StatCell` | Label (12px mono uppercase `inkMut`) over value (28px mono 500 ink). Optional delta. |
| `SpendMeter` | Horizontal bar: `paper2` track, `forge` fill, ink border; `$4.31 / $25.00 · 24h` caption. Turns `err` at >90%. |
| `TerminalBlock` | Dark code block + copy button. `lang` prop for minimal highlighting (keys `forge`). |
| `CallRow` | One gateway call: spark (status), tool name, metered price, rail tx link (HashScan ↗), latency, time. New rows via SSE slide in with spark pulsing. |
| `PricePill` | `$0.00003` mono in a bordered pill; used in the tool directory. |
| `StatusPill` | `settled` (ok) / `pending` / `rejected` (err) / `failed` — mono lowercase, tinted border only, no fills. |
| `PolicyEditor` | Two-pane Cell: form left, live-rendered JSON right in TerminalBlock, "PUSH TO PRIVY" BlockButton. |
| `CopyField` | Mono value + copy icon; used for account IDs, API key (shown once), MCP config. |
| `ApprovalCard` | Cell with corner brackets, action summary, `n/threshold` signature counter as filled/empty squares, APPROVE / REJECT buttons. |
| `AuditRow` | HCS message: seq #, tool, amount, consensus timestamp, ✓ `matched` when cross-checked against DB. |
| `EmptyState` | Big dotted Cell, mono headline ("No calls yet"), one instruction line, one button. |
| `NavSide` (app) | Left rail of bordered cells: OVERVIEW / WALLETS / POLICY / KEYS / CALLS / AUDIT / APPROVALS. Active item = `[ CALLS ]` brackets + forge left edge. |

## 4. Pages — structure and content

### 4.1 `/` — Landing (public, marketing)

Full-bleed `paper`, dotted hero, ink-bordered sections stacked. Copy below is final draft, not lorem.

**Nav** (top border + bottom border, 3 zones like Turnable): left `DOCS  SERVICES`, center logo mark + `FOUNDEREUM`, right `GITHUB` + BlockButton `LAUNCH APP`.

**Hero** — display font, stacked, huge (clamp 64–140px):

> **PAY-PER-CALL**
> **TOOLS FOR**
> **AI AGENTS**
>
> mono subline: `Give your agent a wallet, a policy, and a metered toolbelt. Every call settled on Hedera for fractions of a cent.`
>
> PillButton `CREATE A PROJECT` · mono link `READ THE DOCS ↗`

**Ticker strip** — live-ish marquee of recent calls/prices (from `/services` + demo data).

**01 — HOW IT WORKS** — 4 bracketed Cells in a row:
1. `CREATE` — Sign in, name a project. Treasury + agent wallets are provisioned in Privy's TEE. *(mono, 2 lines max each)*
2. `FUND` — Send test USDC, or hit the faucet. Balances sync from the mirror node.
3. `RESTRICT` — Set a daily cap, allowlist contracts. Default is deny.
4. `CONNECT` — Paste one MCP config line into Claude. Done.

**02 — THE TOOLBELT** — price-list grid (this doubles as the `/services` teaser). Rows: tool name mono + one-line description + PricePill. Show 6: `swap_tokens $0.005+5bps`, `transfer_token $0.002`, `execute_subgraph_query $0.00001+/KB`, `analyze_pool_health ~$0.0006`, `compare_protocol_tvl ~$0.0006`, `deploy_contract $0.02+`. Footer link: `FULL DIRECTORY ↗ /services`.

**03 — EVERY CALL IS A PAYMENT** — split Cell: left copy, right TerminalBlock showing an abridged real exchange:

```
POST /v1/tools/swap_tokens        → 402 payment required
  amount: 7500 (0.0.429274 USDC)
  payTo:  0.0.5551234
POST /v1/payments/build           → X-PAYMENT (signed in Privy TEE)
POST /v1/tools/swap_tokens        → 200 ok
  settled: 0.0.1234@1757300212.4  ↗ hashscan
```

Left copy: `No API keys to meter. No subscriptions to manage. The HTTP 402 status code, an HTS transfer, and the Blocky402 facilitator paying the gas. Your agent never touches a private key.`

**04 — GUARDRAILS, NOT VIBES** — split Cell: left tick-list (`✓ Daily spend caps` / `✓ Contract + selector allowlists` / `✓ default_action: DENY in Privy's TEE` / `✓ m-of-n quorum on withdrawals` / `✓ Public audit trail on HCS`), right TerminalBlock with the policy JSON excerpt.

**05 — BUILT ON** — one bordered strip, mono: `HEDERA — settlement · PRIVY — custody + policy · THE GRAPH — live data`. Text only, no partner logos (avoids brand misuse).

**Footer** — giant display `FOUNDEREUM` cropped at the bottom edge (Turnable-style), then mono row: `BUSL-1.1 · © 2026 Himesh Kundal · docs · github · /services`.

### 4.2 `/services` — public tool directory

The price list, full. Header: `THE DIRECTORY` + mono note `Machine-readable: GET /v1/services`. Table of Cells: tool / description / pricing rule / rail. This page is intentionally boring and dense — it's for agents and judges.

### 4.3 `/login`

Centered mark at 96px on dotted paper, `SIGN IN` PillButton → Privy modal, mono footnote: `Email or Google via Privy. No seed phrases.` Dev-mode shows a second ghost button `DEV BYPASS` when `AUTH_DEV_BYPASS`.

### 4.4 App shell (everything under `/projects`)

Console layout: top bar (mark, project switcher as mono dropdown, spend-today mini meter, user), left `NavSide`, main = grid of Cells. Dotted texture OFF. Every panel has its `01`-style number and uppercase mono title.

### 4.5 `/projects` — list

Grid of project Cells: name, `0.0.x` treasury id, USDC balance, spend 24h, status pill, `identity: ready` badge. One BlockButton `NEW PROJECT` → modal (name, policy template select, quorum threshold).

### 4.6 `/projects/:id` — Overview

- Row of 4 StatCells: `TREASURY USDC` / `AGENT USDC` / `SPEND 24H` (with SpendMeter) / `CALLS TODAY`.
- `MCP CONFIG` Cell: TerminalBlock with the generated Claude Desktop JSON + copy. This is the page's hero — it's the product's "aha".
- `RECENT CALLS` Cell: last 8 CallRows, link to full log.
- `IDENTITY` Cell: ERC-8004 id, HCS topic id ↗ HashScan.

### 4.7 `/projects/:id/wallets`

Two big Cells (TREASURY / AGENT): Hedera account id + EVM alias (CopyFields), USDC + HBAR balances, ↗ HashScan. Actions: `FAUCET` (block), `TOP UP AGENT` (treasury→agent modal), `WITHDRAW` (opens approval flow if over threshold — say so inline: `Withdrawals over $100 need 2 approvals`).

### 4.8 `/projects/:id/policy`

`PolicyEditor`. Form groups: Velocity (max/24h, max/call sliders + inputs), Contract allowlist (add address rows), Selector allowlist (checkbox list of known selectors + custom), Payment (read-only payTo). Right pane always shows the exact JSON that will be pushed. Footer: version, `pushed 12m ago`, `PUSH TO PRIVY` BlockButton. If quorum enabled, pushing creates an approval instead — banner explains.

### 4.9 `/projects/:id/keys`

Table Cells: name, `fnd_sk_live_ab12…` prefix, status pill, last used, carry. `NEW KEY` → modal → key shown ONCE in a TerminalBlock with copy + red mono warning `This is the only time you'll see it.` Revoke = danger BlockButton with confirm.

### 4.10 `/projects/:id/calls` — the live log (demo centerpiece)

Full-width terminal-table of CallRows, newest first, SSE-driven. Filters as mono pill toggles (tool / status / rail). Row expands to show: args JSON, metering breakdown (`base 0.00001 + 0.000002×9.1KB`), payment tx ↗, error envelope if failed. A `POLICY_REJECTED` row renders the reason in `err` — this row is what you screenshot for the Privy judges.

### 4.11 `/projects/:id/audit`

Header Cell: HCS topic id + ↗ `View raw topic on HashScan`. Then AuditRows fetched from the mirror node, each cross-checked: `✓ matched payment` or `⚠ unmatched`. One-line explainer: `Every settled payment is mirrored to a public Hedera Consensus Service topic. We can't edit it. That's the point.`

### 4.12 `/projects/:id/approvals`

Pending ApprovalCards first (`WITHDRAW 500 USDC → 0.0.9999`, signatures `■ □ 1/2`, expiry countdown), then history. Approving triggers the member-key signature in-browser.

## 5. Motion & responsiveness

- Motion budget: ticker marquee, spark pulse, hover invert on buttons/brackets, CallRow slide-in. Nothing else. All gated on `prefers-reduced-motion`.
- Breakpoints: marketing stacks Cells vertically < 900px; hero clamps down; dashboard collapses NavSide to a top mono tab row. Mobile is "readable", not optimized — judges review on laptops.
- Fonts via Google Fonts (`Archivo Black`, `JetBrains Mono` 400/500/700), `display=swap`, preconnect.

## 6. Accessibility & quality bar

- Ink on paper is ~13:1 contrast — fine. `forge` on paper passes for large/bold text and UI elements; never use forge for body copy. Ink text on forge fills (BlockButton) passes.
- All-caps display text gets `aria-label` with normal-case equivalents where it matters.
- Focus states: 2px `forge` outline offset 2px — visible on every interactive element (keyboard demo-ability matters on stage).
- Empty states everywhere (fresh project = no calls, no keys, no approvals) — judges will see empty states before full ones.

## 7. Build order (fits lane D in `10-hackathon-plan.md`)

1. Tokens + `Cell`/buttons/`TerminalBlock` → 4.3 login → app shell.
2. 4.5 → 4.6 → 4.9 (project → overview → key + MCP config): the golden path.
3. 4.10 calls log with SSE (demo centerpiece), 4.8 policy.
4. 4.7 wallets, 4.11 audit, 4.12 approvals.
5. Landing page last (it's static; can be built while backend integrates) — but the hero + 01 + 03 sections are the minimum for the video intro.
