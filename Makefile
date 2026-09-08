.PHONY: all dev migrate sqlc contracts test e2e clean

all: contracts test build

dev:
	docker compose up --build

migrate:
	goose -dir internal/db/migrations postgres "$(DATABASE_URL)" up

sqlc:
	sqlc generate

contracts:
	cd contracts && forge build && forge test

test:
	go test -v ./...

build:
	go build -o bin/api ./cmd/api
	go build -o bin/gateway ./cmd/gateway
	go build -o bin/mcp ./cmd/mcp
	go build -o bin/worker ./cmd/worker

clean:
	rm -rf bin/ contracts/out contracts/cache
