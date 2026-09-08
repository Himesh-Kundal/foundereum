.PHONY: all dev migrate sqlc contracts test e2e seed abigen deploy-hedera bridge-link clean

all: contracts test build

dev:
	docker compose up --build

migrate:
	goose -dir internal/db/migrations postgres "$(DATABASE_URL)" up

sqlc:
	sqlc generate

contracts:
	cd contracts && forge build && forge test

abigen: contracts
	go test -v ./internal/chain/bindings/...

deploy-hedera:
	cd contracts && forge script script/Deploy.s.sol --rpc-url https://testnet.hashio.io/api --broadcast

test:
	go test -v ./...

e2e:
	bash scripts/test_all_features_locally.sh

seed:
	PGPASSWORD=fnd psql -h localhost -U fnd -d foundereum -c "SELECT count(*) FROM projects;"

bridge-link:
	node bridge/bin/index.js --help

build:
	go build -o bin/api ./cmd/api
	go build -o bin/gateway ./cmd/gateway
	go build -o bin/mcp ./cmd/mcp
	go build -o bin/worker ./cmd/worker

clean:
	rm -rf bin/ contracts/out contracts/cache
