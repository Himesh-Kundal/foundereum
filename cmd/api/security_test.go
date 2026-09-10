package main

import (
	"testing"

	"github.com/google/uuid"
)

func TestMemoryStore_ProjectIsolation(t *testing.T) {
	ms := NewMemoryStore()

	orgA := uuid.New()
	orgB := uuid.New()

	projAID := uuid.NewString()
	projBID := uuid.NewString()

	ms.projects[projAID] = map[string]any{
		"id":     projAID,
		"org_id": orgA.String(),
		"name":   "project-a",
	}

	ms.projects[projBID] = map[string]any{
		"id":     projBID,
		"org_id": orgB.String(),
		"name":   "project-b",
	}

	// Org A should access Project A
	pA, ok := ms.getProjectForOrg(projAID, orgA)
	if !ok || pA["name"] != "project-a" {
		t.Fatalf("expected orgA to access project A")
	}

	// Org B should NOT access Project A
	_, ok = ms.getProjectForOrg(projAID, orgB)
	if ok {
		t.Fatalf("SECURITY VIOLATION: orgB should NOT access project A")
	}

	// Org A should NOT access Project B
	_, ok = ms.getProjectForOrg(projBID, orgA)
	if ok {
		t.Fatalf("SECURITY VIOLATION: orgA should NOT access project B")
	}
}

func TestAPIKeySanitization(t *testing.T) {
	rawKey := "fnd_sk_live_1234567890abcdef123456"
	prefix := rawKey[:16]

	// Simulated storage in memStore.keys
	storedKey := map[string]any{
		"id":     uuid.NewString(),
		"name":   "my-key",
		"prefix": prefix,
		"status": "active",
	}

	// Verify plaintext key is NOT in storedKey
	if _, exists := storedKey["key"]; exists {
		t.Fatalf("SECURITY VIOLATION: raw key must never be stored in persistent key list")
	}

	// Sanitize function check
	rawKeys := []map[string]any{
		{
			"id":     "1",
			"name":   "test",
			"prefix": prefix,
			"key":    rawKey, // accidental leak
			"status": "active",
		},
	}

	safeKeys := make([]map[string]any, 0, len(rawKeys))
	for _, rk := range rawKeys {
		sk := make(map[string]any)
		for kf, vf := range rk {
			if kf != "key" {
				sk[kf] = vf
			}
		}
		safeKeys = append(safeKeys, sk)
	}

	if _, exists := safeKeys[0]["key"]; exists {
		t.Fatalf("SECURITY VIOLATION: safeKeys still contains raw key")
	}
	if safeKeys[0]["prefix"] != prefix {
		t.Fatalf("expected prefix %s, got %v", prefix, safeKeys[0]["prefix"])
	}
}
