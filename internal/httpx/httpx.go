package httpx

import (
	"encoding/json"
	"net/http"
)

type ErrorEnvelope struct {
	Error ErrorBody `json:"error"`
}

type ErrorBody struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Details any    `json:"details,omitempty"`
}

func JSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if data != nil {
		_ = json.NewEncoder(w).Encode(data)
	}
}

func Err(w http.ResponseWriter, status int, code, message string, details ...any) {
	var det any
	if len(details) > 0 {
		det = details[0]
	}
	JSON(w, status, ErrorEnvelope{
		Error: ErrorBody{
			Code:    code,
			Message: message,
			Details: det,
		},
	})
}
