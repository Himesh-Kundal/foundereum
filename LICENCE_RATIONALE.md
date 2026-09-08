# Why Business Source License 1.1?

Foundereum is licensed under the **Business Source License 1.1 (BUSL-1.1)**, not a permissive or copyleft open source license. Here's the reasoning, so judges, contributors, and future users don't have to guess.

## What BUSL actually does

- **The full source is public, today, in this repo.** Anyone — a hackathon judge, a contributor, a curious developer — can read it, run it, fork it, modify it, and submit patches, with no restriction.
- **Production use is free for everyone except large commercial operators.** The Additional Use Grant in `LICENSE` explicitly permits free production use for individuals, students, researchers, hackathon judging, and any organization under $1M/year in revenue or under 100,000 metered tool-calls/month. That covers essentially every real user of a project at this stage — indie developers, other hackathon teams, small startups building on top of it.
- **On 2030-09-08 (or 4 years from first public release, whichever is sooner), the whole project automatically becomes Apache-2.0** — a fully permissive OSI license. This isn't a promise we can walk back; it's baked into the license text itself. BUSL is a *time-delayed* open source license, not a permanently closed one.
- **The only party who needs to pay is a large company** that wants to fold Foundereum into a commercial product or hosted service without contributing back or negotiating terms — exactly the "big corp forks it, ships it, we get nothing" scenario this license exists to prevent.

## Why not AGPL-3.0

AGPL is a real, OSI-approved open source license, and it does deter silent corporate forking (via its network-copyleft clause). But it doesn't stop a well-resourced company from complying with AGPL's letter — publishing a fork's source — while still outcompeting the original with more engineering resources, sales, and distribution. It also imposes copyleft obligations on *every* user, including the small developers and other hackathon builders we want using this freely. BUSL's revenue/usage-based Additional Use Grant protects against the specific outcome we're worried about (extraction by a large incumbent) without imposing any burden on everyone else.

## Why not MIT/Apache-2.0 today

Fully permissive licenses provide no protection at all — a company could take the repo as-is the day after submission. Given the design docs describe a metered-payments platform (the kind of infrastructure a large payments or cloud company would have obvious incentive to absorb), that felt like the wrong default for launch. Apache-2.0 is exactly where the project ends up anyway — in 2030, or sooner if we choose to relicense early.

## Is this "open source" for hackathon purposes?

BUSL is **source-available**, not OSI-approved open source, and we say so plainly — the license text itself contains that notice. If ETHOnline's rules require a strictly OSI-approved license, this doesn't satisfy that requirement, and you should swap to AGPL-3.0 or Apache-2.0 instead (see `LICENSE_ALTERNATIVES.md` if you generate one). If the rule is "public repository, judges can read and run the code" — the common practical meaning at ETHGlobal events — BUSL satisfies it: the full source is public in this repo from day one.

**Action item before submitting:** re-read ETHOnline 2026's and each sponsor track's exact eligibility language ("open source," "public repository," "public GitHub repo") and confirm which they mean. Several sponsor tracks above (Hedera, The Graph, Privy) say "public GitHub repo" / "open-source the code," which BUSL satisfies; none of them state "OSI-approved license" explicitly as of the brief we reviewed. If any do require OSI approval specifically, switch this file's contents to Apache-2.0 or AGPL-3.0 before the deadline — happy to generate either on request.

## Licensor is an individual, not a company

`LICENSE` lists **Himesh Kundal, an individual**, as Licensor — not a company or corporation. That's deliberate and legally sufficient: copyright in code vests in the person who wrote it the moment it's written, whether or not that person has ever registered a business. You don't need an LLC, a company, or any formal entity to hold copyright or to license your own work under BUSL — plenty of solo-developer and small-team BUSL projects list a person's name rather than an org. If you incorporate later, you (as the individual copyright holder) can assign or re-license the work to that entity at that point; nothing about today's license blocks that.

## What to fill in before publishing

In `LICENSE`, replace:
- `[YOUR EMAIL ADDRESS]` — where a would-be commercial licensee reaches you; a personal email is fine, no business email needed
- Adjust the `Change Date` if you don't want 2030-09-08
- Adjust the revenue ($1,000,000) or usage (100,000 calls/month) thresholds in the Additional Use Grant if you want them looser or tighter
