package httpx

import (
	"net/http"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

var (
	ToolCallsTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "fnd_tool_calls_total",
			Help: "Total count of tool calls processed by Foundereum",
		},
		[]string{"tool", "status"},
	)

	ToolLatencySeconds = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "fnd_tool_latency_seconds",
			Help:    "Latency in seconds of tool execution",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"tool"},
	)

	PaymentsTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "fnd_payments_total",
			Help: "Total number of x402 payment attempts and settlements",
		},
		[]string{"status"},
	)

	MeteredUSDTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "fnd_metered_usd_total",
			Help: "Total metered USD volume processed per tool",
		},
		[]string{"tool"},
	)

	HCSLagSeconds = prometheus.NewGauge(
		prometheus.GaugeOpts{
			Name: "fnd_hcs_lag_seconds",
			Help: "Current lag in seconds between settlement and HCS audit publishing",
		},
	)
)

func init() {
	prometheus.MustRegister(ToolCallsTotal)
	prometheus.MustRegister(ToolLatencySeconds)
	prometheus.MustRegister(PaymentsTotal)
	prometheus.MustRegister(MeteredUSDTotal)
	prometheus.MustRegister(HCSLagSeconds)
}

func MetricsHandler() http.Handler {
	return promhttp.Handler()
}
