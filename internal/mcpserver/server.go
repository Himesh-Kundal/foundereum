package mcpserver

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/foundereum/foundereum/internal/tools"
	"github.com/foundereum/foundereum/internal/x402"
	"github.com/google/uuid"
)

type Server struct {
	gatewayURL string
	httpClient *http.Client
	sessions   sync.Map // sessionID -> apiKey
}

func New(gatewayURL string) *Server {
	return &Server{
		gatewayURL: strings.TrimRight(gatewayURL, "/"),
		httpClient: &http.Client{Timeout: 30 * time.Second},
	}
}

type CallToolRequest struct {
	Name      string          `json:"name"`
	Arguments json.RawMessage `json:"arguments"`
}

type CallToolResult struct {
	Content []ContentItem `json:"content"`
	IsError bool          `json:"isError,omitempty"`
}

type ContentItem struct {
	Type string `json:"type"`
	Text string `json:"text"`
}

func (s *Server) HandleStreamableHTTP(w http.ResponseWriter, r *http.Request) {
	// CORS and Streamable HTTP support for Claude / MCP clients
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, Mcp-Session-Id")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	sessionID := r.Header.Get("Mcp-Session-Id")
	if sessionID == "" {
		sessionID = uuid.NewString()
		w.Header().Set("Mcp-Session-Id", sessionID)
	}

	authHeader := r.Header.Get("Authorization")
	if authHeader != "" {
		s.sessions.Store(sessionID, authHeader)
	}

	// Fetch API key for this session
	storedAuth, ok := s.sessions.Load(sessionID)
	apiKeyHeader := ""
	if ok {
		apiKeyHeader = storedAuth.(string)
	}

	if r.Method == "GET" {
		// List available tools
		specs := tools.List()
		var toolDefs []map[string]any
		for _, sp := range specs {
			var schema any
			_ = json.Unmarshal(sp.InputSchema, &schema)
			toolDefs = append(toolDefs, map[string]any{
				"name":        sp.Name,
				"description": sp.Description,
				"inputSchema": schema,
			})
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{"tools": toolDefs})
		return
	}

	if r.Method == "POST" {
		var req CallToolRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, `{"error":"invalid JSON"}`, http.StatusBadRequest)
			return
		}

		res := s.executeToolLoop(r.Context(), req.Name, req.Arguments, apiKeyHeader)
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(res)
	}
}

// executeToolLoop performs the automated x402 client loop:
// call -> 402 challenge -> /v1/payments/build -> retry with X-PAYMENT -> parse result
func (s *Server) executeToolLoop(ctx context.Context, name string, args json.RawMessage, apiKeyHeader string) CallToolResult {
	idemKey := uuid.NewString()
	endpoint := fmt.Sprintf("%s/v1/tools/%s", s.gatewayURL, name)

	// Step 1: Initial call
	httpReq, err := http.NewRequestWithContext(ctx, "POST", endpoint, bytes.NewReader(args))
	if err != nil {
		return CallToolResult{IsError: true, Content: []ContentItem{{Type: "text", Text: err.Error()}}}
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Idempotency-Key", idemKey)
	if apiKeyHeader != "" {
		httpReq.Header.Set("Authorization", apiKeyHeader)
	}

	resp, err := s.httpClient.Do(httpReq)
	if err != nil {
		return CallToolResult{IsError: true, Content: []ContentItem{{Type: "text", Text: fmt.Sprintf("gateway connection error: %v", err)}}}
	}
	defer resp.Body.Close()

	bodyBytes, _ := io.ReadAll(resp.Body)

	// Step 2: If 402 challenge received, build payment and retry
	if resp.StatusCode == http.StatusPaymentRequired {
		var challenge x402.Challenge
		if err := json.Unmarshal(bodyBytes, &challenge); err != nil {
			return CallToolResult{IsError: true, Content: []ContentItem{{Type: "text", Text: "invalid 402 challenge response"}}}
		}

		// Call /v1/payments/build
		buildReqData, _ := json.Marshal(map[string]string{"nonce": challenge.Nonce})
		buildReq, _ := http.NewRequestWithContext(ctx, "POST", s.gatewayURL+"/v1/payments/build", bytes.NewReader(buildReqData))
		buildReq.Header.Set("Content-Type", "application/json")
		if apiKeyHeader != "" {
			buildReq.Header.Set("Authorization", apiKeyHeader)
		}

		buildResp, err := s.httpClient.Do(buildReq)
		if err != nil || buildResp.StatusCode != http.StatusOK {
			return CallToolResult{IsError: true, Content: []ContentItem{{Type: "text", Text: "payment signing failed (agent wallet may need a top-up)"}}}
		}
		defer buildResp.Body.Close()

		var buildRes struct {
			XPayment string `json:"x_payment"`
		}
		_ = json.NewDecoder(buildResp.Body).Decode(&buildRes)

		// Step 3: Retry request with X-PAYMENT
		retryReq, _ := http.NewRequestWithContext(ctx, "POST", endpoint, bytes.NewReader(args))
		retryReq.Header.Set("Content-Type", "application/json")
		retryReq.Header.Set("Idempotency-Key", idemKey)
		retryReq.Header.Set("X-PAYMENT", buildRes.XPayment)
		if apiKeyHeader != "" {
			retryReq.Header.Set("Authorization", apiKeyHeader)
		}

		retryResp, err := s.httpClient.Do(retryReq)
		if err != nil {
			return CallToolResult{IsError: true, Content: []ContentItem{{Type: "text", Text: err.Error()}}}
		}
		defer retryResp.Body.Close()

		bodyBytes, _ = io.ReadAll(retryResp.Body)
		if retryResp.StatusCode >= 400 {
			return CallToolResult{IsError: true, Content: []ContentItem{{Type: "text", Text: string(bodyBytes)}}}
		}
	}

	// Prefix untrusted third-party data
	text := string(bodyBytes)
	if strings.Contains(name, "subgraph") || strings.Contains(name, "pool") {
		text = "data (untrusted): " + text
	}

	return CallToolResult{
		Content: []ContentItem{{Type: "text", Text: text}},
	}
}
