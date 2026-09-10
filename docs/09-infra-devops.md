# 09 — Infra & DevOps

## 1. Local topology

```mermaid
flowchart LR
    subgraph docker-compose
      web[web :5173]
      api[api :8080]
      gw[gateway :8081]
      mcp[mcp :8082]
      wrk[worker]
      pg[(postgres :5432)]
      rd[(redis :6379)]
      sub[subgraph-mcp :7000]
    end
    claude[Claude Desktop] -->|npx foundereum-mcp| mcp
    browser --> web --> api
    mcp --> gw --> sub
    api & gw & wrk --> pg & rd
    gw & wrk & api -.-> hedera[(Hedera testnet + Blocky402)]
    sub -.-> graph[(The Graph gateway)]
```

`make dev` → `docker compose up --build`.

## 2. Production compose (`docker-compose.prod.yml`)

Uses pre-built GHCR images with `IMAGE_TAG` variable. Services:

| Service | Image | Port |
|---------|-------|------|
| caddy | caddy:2-alpine | 80 |
| postgres | postgres:16-alpine | 5432 (internal) |
| redis | redis:7-alpine | 6379 (internal) |
| api | `ghcr.io/himesh-kundal/foundereum-api` | 8080 |
| gateway | `ghcr.io/himesh-kundal/foundereum-gateway` | 8081 |
| mcp | `ghcr.io/himesh-kundal/foundereum-mcp` | 8082 |
| worker | `ghcr.io/himesh-kundal/foundereum-worker` | — |
| web | `ghcr.io/himesh-kundal/foundereum-web` | 80 |
| subgraph-mcp | built from `sidecars/` | 7000 |

Database URL constructed internally: `postgres://$POSTGRES_USER:$POSTGRES_PASSWORD@postgres:5432/$POSTGRES_DB`.

## 3. Dockerfiles

`deploy/Dockerfile.app`:
```dockerfile
FROM golang:1.25-alpine AS build
ARG CMD
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /out/app ./cmd/${CMD}

FROM alpine:3.20
RUN apk add --no-cache ca-certificates tzdata
COPY --from=build /out/app /app
COPY --from=build /src/internal/db/migrations /migrations
USER nobody
ENTRYPOINT ["/app"]
```

`deploy/Dockerfile.web`: node:20-alpine + pnpm → `pnpm build` → caddy:2-alpine with SPA fallback (`deploy/Caddyfile.web`). Accepts `VITE_API_URL` and `VITE_PRIVY_APP_ID` as build args.

`sidecars/subgraph-mcp/Dockerfile`: wraps The Graph's OSS Subgraph MCP on Streamable HTTP :7000.

## 4. Makefile

```
make dev              docker compose up --build
make migrate          goose up
make sqlc             sqlc generate
make abigen           forge inspect + abigen → internal/chain/bindings
make contracts        forge build && forge test
make deploy-hedera    forge script script/Deploy.s.sol --rpc-url $HEDERA_JSON_RPC --broadcast
make build            go build all four binaries into bin/
make seed             demo org/project with MOCK_CHAINS
make e2e              bash scripts/test_all_features_locally.sh
make clean            rm bin/ contracts/out contracts/cache
```

## 5. Environments

| Env | Where | Domain | Notes |
|-----|-------|--------|-------|
| local | compose | localhost | `MOCK_CHAINS=true` default; flip to testnet via `.env` |
| production | AWS VM (4+ vCPU) + Caddy | `foundereum.com` | Cloudflare proxy handles TLS; Caddy on HTTP :80 only |

Subdomains (all proxied through Cloudflare):

| Subdomain | Backend |
|-----------|---------|
| `app.foundereum.com` | web (SPA) |
| `api.foundereum.com` | api :8080 |
| `gw.foundereum.com` | gateway :8081 |
| `mcp.foundereum.com` | mcp :8082 |
| `foundereum.com` | redirect → `app.foundereum.com` |

## 6. CI/CD

### CI (`.github/workflows/ci.yml`)

Triggers on push/PR to `main`. Four jobs:

1. **backend** — `go vet` + `golangci-lint` + `goose up` + `go test -race` (services: postgres, redis, `MOCK_CHAINS=true`) + `make build`
2. **contracts** — `forge build --sizes` + `forge test -vvv`
3. **frontend** — pnpm install + `pnpm build` (typecheck included)
4. **docker** — build & push all 5 images to GHCR (only on `main` push, after jobs 1-3 pass). Uses matrix strategy + Docker layer caching via GitHub Actions cache.

### CD (`.github/workflows/deploy.yml`)

Triggers when CI completes on `main`, or via manual `workflow_dispatch`.

1. Determines image tag (commit SHA or manual input)
2. SSHs into production VM
3. `git pull` latest compose config
4. `docker compose pull` new images
5. `docker compose up -d --remove-orphans` (rolling restart)
6. Verifies health of api and gateway

### Required GitHub Secrets

| Secret | Purpose |
|--------|---------|
| `SSH_HOST` | AWS VM public IP or hostname |
| `SSH_USER` | Deploy user (default: `ubuntu`) |
| `SSH_PRIVATE_KEY` | SSH private key for deploy user |
| `SSH_PORT` | SSH port (default: 22) |
| `GHCR_USER` | GitHub username for pulling images on VM |
| `GHCR_TOKEN` | GitHub PAT with `read:packages` scope |

## 7. VM Setup

Run `deploy/setup-vm.sh` on a fresh Ubuntu 22.04+ instance:

```bash
sudo bash deploy/setup-vm.sh
```

This script:
- Installs Docker + Docker Compose plugin
- Configures UFW (SSH + HTTP only)
- Enables fail2ban + SSH key-only auth
- Clones repo to `~/foundereum`
- Creates `.env` from `deploy/.env.production.example`
- Creates `foundereum.service` systemd unit (auto-start on boot)
- Configures Docker log rotation (10MB × 3 files)
- Creates 2GB swap on instances with < 4GB RAM

## 8. Cloudflare Configuration

| Setting | Value |
|---------|-------|
| SSL/TLS mode | **Full (Strict)** — or **Full** if no origin cert |
| Proxy status | **Proxied** (orange cloud) for all subdomains |
| Always Use HTTPS | **ON** |
| Minimum TLS | **1.2** |
| HSTS | Enable with `max-age=31536000` |
| Caching | Standard, but bypass for `api.*`, `gw.*`, `mcp.*` |

DNS records (all proxied):

| Type | Name | Content |
|------|------|---------|
| A | `app` | `<VM_IP>` |
| A | `api` | `<VM_IP>` |
| A | `gw` | `<VM_IP>` |
| A | `mcp` | `<VM_IP>` |
| A | `@` | `<VM_IP>` |
| A | `www` | `<VM_IP>` |

Page Rule (optional): `api.foundereum.com/*` → Cache Level: Bypass, SSL: Full.

## 9. Day-0 resource checklist

- [ ] Hedera testnet portal account → operator/faucet account with ≥ 1000 HBAR
- [ ] Hedera testnet USDC token id (0.0.429274); associate platform account
- [ ] Blocky402 facilitator URL confirmed
- [ ] Privy app: server wallets + policies enabled; `secp256k1_sign` method via `/v1/wallets/{id}/rpc`
- [ ] The Graph: Subgraph Studio API key; real deployment IDs configured in subgraph-mcp
- [ ] SaucerSwap testnet router (`0x...4b40`) + WHBAR (`0x...3ad2`) addresses
- [ ] Hashio JSON-RPC reachable (`https://testnet.hashio.io/api`)
- [ ] AWS VM provisioned, `setup-vm.sh` run, `.env` configured
- [ ] Cloudflare DNS records + SSL mode configured
- [ ] GitHub secrets configured for CI/CD
- [ ] GHCR PAT created for VM image pulls
- [ ] Record fallback videos of every flow
