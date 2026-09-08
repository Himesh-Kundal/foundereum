package auth

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
)

func TestAuthService_IssueAndVerifyToken(t *testing.T) {
	svc := NewService("super_secret_test_key_32_bytes_long!!", false)
	uid := uuid.New()
	oid := uuid.New()

	tok, err := svc.IssueToken(uid, oid, "agent@foundereum.org", "owner")
	if err != nil {
		t.Fatalf("failed to issue token: %v", err)
	}

	claims, err := svc.VerifyToken(tok)
	if err != nil {
		t.Fatalf("failed to verify token: %v", err)
	}

	if claims.UserID != uid || claims.OrgID != oid || claims.Role != "owner" || claims.Email != "agent@foundereum.org" {
		t.Errorf("claims mismatch: got %+v", claims)
	}
}

func TestAuthService_HashAPIKey(t *testing.T) {
	raw := "fnd_live_1234567890abcdef"
	hash1 := HashAPIKey(raw)
	if len(hash1) != 32 {
		t.Fatalf("unexpected hash length: %d", len(hash1))
	}

	hash2 := HashAPIKey(raw)
	if !bytes.Equal(hash1, hash2) {
		t.Fatal("hash should be deterministic")
	}
}

func TestAuthService_MiddlewareValidToken(t *testing.T) {
	svc := NewService("super_secret_test_key_32_bytes_long!!", false)
	uid := uuid.New()
	oid := uuid.New()
	tok, _ := svc.IssueToken(uid, oid, "agent@foundereum.org", "owner")

	handler := svc.Middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims, ok := GetSession(r.Context())
		if !ok || claims == nil || claims.Email != "agent@foundereum.org" {
			t.Errorf("expected valid claims in context")
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("Authorization", "Bearer "+tok)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 OK with valid token, got %d", rec.Code)
	}
}
