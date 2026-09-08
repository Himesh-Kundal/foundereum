package graph

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"
)

type ProxyClient struct {
	baseURL    string
	httpClient *http.Client
}

func NewProxyClient(baseURL string) *ProxyClient {
	if baseURL == "" {
		baseURL = os.Getenv("SUBGRAPH_MCP_URL")
	}
	if baseURL == "" {
		baseURL = "http://localhost:7000"
	}
	return &ProxyClient{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: 10 * time.Second, // 10 second timeout per Doc 04 / Doc 08
		},
	}
}

// Query executes a query against the subgraph-mcp sidecar.
// Enforces max query size <= 8KB per Doc 08 §6.
func (c *ProxyClient) Query(ctx context.Context, deploymentID string, query string) (map[string]any, int, error) {
	if len(query) > 8192 {
		return nil, 0, fmt.Errorf("query exceeds maximum allowed size of 8 KB")
	}

	payload, _ := json.Marshal(map[string]any{
		"jsonrpc": "2.0",
		"id":      1,
		"method":  "tools/call",
		"params": map[string]any{
			"name": "execute_query_by_deployment_id",
			"arguments": map[string]any{
				"deployment_id": deploymentID,
				"query":         query,
			},
		},
	})

	req, err := http.NewRequestWithContext(ctx, "POST", c.baseURL+"/mcp", bytes.NewReader(payload))
	if err != nil {
		return nil, 0, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		// Network error / sidecar not running - return fallback data
		return nil, 0, err
	}
	defer resp.Body.Close()

	var result map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, 0, err
	}

	rawBytes, _ := json.Marshal(result)
	return result, len(rawBytes), nil
}
