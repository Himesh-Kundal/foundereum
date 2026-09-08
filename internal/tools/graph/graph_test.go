package graph

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/foundereum/foundereum/internal/tools"
	"github.com/google/uuid"
)

func TestAnalyzePoolHealth(t *testing.T) {
	spec, ok := tools.Get("analyze_pool_health")
	if !ok {
		t.Fatalf("analyze_pool_health not found in registry")
	}

	in := tools.Input{
		ProjectID: uuid.New(),
		Args:      json.RawMessage(`{"protocol":"uniswap-v3","network":"base","pool":"USDC/WETH 0.05%"}`),
	}
	out, err := spec.Executor.Execute(context.Background(), in)
	if err != nil {
		t.Fatalf("execute analyze_pool_health failed: %v", err)
	}

	resMap, ok := out.Result.(map[string]any)
	if !ok || resMap["score"] == nil {
		t.Fatalf("expected score in verdict, got: %v", out.Result)
	}
}

func TestGetSubgraphSchema(t *testing.T) {
	spec, ok := tools.Get("get_subgraph_schema")
	if !ok {
		t.Fatalf("get_subgraph_schema not found in registry")
	}

	in := tools.Input{
		ProjectID: uuid.New(),
		Args:      json.RawMessage(`{"deployment_id":"QmZb8x9y7zMessariUniswapV3Base"}`),
	}
	out, err := spec.Executor.Execute(context.Background(), in)
	if err != nil {
		t.Fatalf("execute get_subgraph_schema failed: %v", err)
	}

	resMap, ok := out.Result.(map[string]any)
	if !ok || resMap["entities"] == nil {
		t.Fatalf("expected entities in schema, got: %v", out.Result)
	}
}

func TestCompareProtocolTVL(t *testing.T) {
	spec, ok := tools.Get("compare_protocol_tvl")
	if !ok {
		t.Fatalf("compare_protocol_tvl not found in registry")
	}

	in := tools.Input{
		ProjectID: uuid.New(),
		Args:      json.RawMessage(`{"network":"base","protocols":["aerodrome","uniswap-v3"]}`),
	}
	out, err := spec.Executor.Execute(context.Background(), in)
	if err != nil {
		t.Fatalf("execute compare_protocol_tvl failed: %v", err)
	}

	resMap, ok := out.Result.(map[string]any)
	if !ok || resMap["ranked_table"] == nil {
		t.Fatalf("expected ranked_table in response, got: %v", out.Result)
	}
}

func TestDeploySubstreamsPipeline(t *testing.T) {
	spec, ok := tools.Get("deploy_substreams_pipeline")
	if !ok {
		t.Fatalf("deploy_substreams_pipeline not found in registry")
	}

	in := tools.Input{
		ProjectID: uuid.New(),
		Args:      json.RawMessage(`{"prompt":"Index USDC transfers on Base into Postgres","network":"base"}`),
	}
	out, err := spec.Executor.Execute(context.Background(), in)
	if err != nil {
		t.Fatalf("execute deploy_substreams_pipeline failed: %v", err)
	}

	resMap, ok := out.Result.(map[string]any)
	if !ok || resMap["pipeline_id"] == nil || resMap["status"] != "active" {
		t.Fatalf("expected active pipeline_id, got: %v", out.Result)
	}
}

func TestExecutePipelineQuery(t *testing.T) {
	spec, ok := tools.Get("execute_pipeline_query")
	if !ok {
		t.Fatalf("execute_pipeline_query not found in registry")
	}

	in := tools.Input{
		ProjectID: uuid.New(),
		Args:      json.RawMessage(`{"pipeline_id":"pipe_sub_test","query":"SELECT sender_addr, SUM(volume_usd) FROM hourly_sender_volume GROUP BY sender_addr"}`),
	}
	out, err := spec.Executor.Execute(context.Background(), in)
	if err != nil {
		t.Fatalf("execute execute_pipeline_query failed: %v", err)
	}

	resMap, ok := out.Result.(map[string]any)
	if !ok || resMap["rows"] == nil {
		t.Fatalf("expected rows in query result, got: %v", out.Result)
	}
}


