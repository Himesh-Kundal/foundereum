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

## 2. `deploy/docker-compose.yml`

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment: { POSTGRES_USER: fnd, POSTGRES_PASSWORD: fnd, POSTGRES_DB: foundereum }
    ports: ["5432:5432"]
    volumes: [pgdata:/var/lib/postgresql/data]
    healthcheck: { test: ["CMD-SHELL","pg_isready -U fnd"], interval: 5s, retries: 10 }
  redis:
    image: redis:7-alpine
    command: ["redis-server","--appendonly","yes"]
    ports: ["6379:6379"]
  api:
    build: { context: .., dockerfile: deploy/Dockerfile.go, args: { CMD: api } }
    env_file: ../.env
    environment: { DATABASE_URL: postgres://fnd:fnd@postgres:5432/foundereum?sslmode=disable, REDIS_URL: redis://redis:6379 }
    ports: ["8080:8080"]
    depends_on: { postgres: { condition: service_healthy }, redis: { condition: service_started } }
  gateway:
    build: { context: .., dockerfile: deploy/Dockerfile.go, args: { CMD: gateway } }
    env_file: ../.env
    environment: { DATABASE_URL: …, REDIS_URL: …, SUBGRAPH_MCP_URL: http://subgraph-mcp:7000 }
    ports: ["8081:8081"]
    depends_on: [api, subgraph-mcp]
  mcp:
    build: { context: .., dockerfile: deploy/Dockerfile.go, args: { CMD: mcp } }
    environment: { GATEWAY_URL: http://gateway:8081 }
    ports: ["8082:8082"]
    depends_on: [gateway]
  worker:
    build: { context: .., dockerfile: deploy/Dockerfile.go, args: { CMD: worker } }
    env_file: ../.env
    environment: { DATABASE_URL: …, REDIS_URL: … }
    depends_on: [api]
  subgraph-mcp:
    build: ../sidecars/subgraph-mcp
    environment: { GRAPH_API_KEY: ${GRAPH_API_KEY} }
  web:
    build: { context: ../web, dockerfile: ../deploy/Dockerfile.web, target: dev }
    ports: ["5173:5173"]
    environment: { VITE_API_URL: http://localhost:8080, VITE_PRIVY_APP_ID: ${PRIVY_APP_ID} }
    volumes: ["../web:/app", "/app/node_modules"]
volumes: { pgdata: {} }
```

## 3. Dockerfiles

`deploy/Dockerfile.go`:
```dockerfile
FROM golang:1.23-alpine AS build
ARG CMD
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /out/app ./cmd/${CMD}

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/app /app
COPY internal/db/migrations /migrations
COPY contracts/deployments /deployments
USER nonroot
ENTRYPOINT ["/app"]
```

`deploy/Dockerfile.web`: node:20-alpine `dev` target (`vite --host`) → `build` → caddy:2-alpine serving `dist`.

`sidecars/subgraph-mcp/Dockerfile`: wraps The Graph's OSS Subgraph MCP (upstream image if published, else clone + `npm ci` + start on Streamable HTTP :7000).

## 4. Makefile

```
make dev              docker compose up --build
make migrate          goose up
make sqlc             sqlc generate
make abigen           forge inspect + abigen → internal/chain/bindings (router, ERC20, registry)
make contracts        forge build && forge test
make deploy-hedera    forge script script/Deploy.s.sol --rpc-url $HEDERA_JSON_RPC --legacy --broadcast
make seed             demo org/project with MOCK_CHAINS
make e2e              go test ./... -tags=e2e
make bridge-link      cd bridge && npm link
```

## 5. Environments

| Env | Where | Notes |
|-----|-------|-------|
| local | compose | `MOCK_CHAINS=true` default; flip to testnet via `.env` |
| demo | one VM (4 vCPU) + Caddy | `app.`, `api.`, `gw.`, `mcp.foundereum.xyz`; public MCP URL so `npx foundereum-mcp` works from any laptop |

Caddyfile:
```
app.foundereum.xyz { reverse_proxy web:80 }
api.foundereum.xyz { reverse_proxy api:8080 }
gw.foundereum.xyz  { reverse_proxy gateway:8081 }
mcp.foundereum.xyz { reverse_proxy mcp:8082 }
```

## 6. CI
`go vet` + `golangci-lint` + `go test` (services: postgres, redis) · `forge test` · `tsc --noEmit` + `vite build` · `docker compose build` on main.

## 7. Day-0 resource checklist

- [ ] Hedera testnet portal account → operator/faucet account with ≥ 1000 HBAR (top up via portal)
- [ ] Hedera testnet USDC token id; associate platform account; get test USDC (Circle faucet / Hedera portal)
- [ ] Blocky402 facilitator URL + confirm request/response shape against Hedera's x402 PoC repo; prepare `self` mode fee-payer as fallback
- [ ] Privy app: server wallets + policies enabled; authorization key generated; confirm `raw_sign` availability on ethereum wallets (else `WALLET_SIGNER=local` for native txs)
- [ ] The Graph: Subgraph Studio API key; note Messari standardized deployment ids (uniswap-v3 base/mainnet, aerodrome, sushiswap)
- [ ] SaucerSwap testnet router + WHBAR addresses
- [ ] Hashio JSON-RPC reachable; HashScan verification set up
- [ ] Record fallback videos of every flow
