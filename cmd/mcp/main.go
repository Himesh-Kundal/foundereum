package main

import (
	"fmt"
	"net/http"

	"github.com/foundereum/foundereum/internal/config"
	"github.com/foundereum/foundereum/internal/mcpserver"
	_ "github.com/foundereum/foundereum/internal/tools/graph"
	_ "github.com/foundereum/foundereum/internal/tools/identity"
	_ "github.com/foundereum/foundereum/internal/tools/swap"
	_ "github.com/foundereum/foundereum/internal/tools/wallet"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		panic(err)
	}
	logger := config.SetupLogger(cfg.LogLevel)
	logger.Info("starting foundereum mcp server", "port", cfg.PortMCP, "gateway_port", cfg.PortGateway)

	gwURL := fmt.Sprintf("http://localhost:%d", cfg.PortGateway)
	server := mcpserver.New(gwURL)

	mux := http.NewServeMux()
	mux.HandleFunc("/mcp", server.HandleStreamableHTTP)
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"service":"foundereum-mcp","protocol":"modelcontextprotocol","streamable_http":"/mcp"}`))
	})

	httpServer := &http.Server{
		Addr:    fmt.Sprintf(":%d", cfg.PortMCP),
		Handler: mux,
	}
	logger.Info("mcp server listening", "addr", httpServer.Addr)
	if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		logger.Error("mcp server exited", "err", err)
	}
}
