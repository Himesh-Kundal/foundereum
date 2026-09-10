package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

var (
	ErrUnauthorized = errors.New("unauthorized")
	ErrInvalidToken = errors.New("invalid or expired token")
)

type SessionClaims struct {
	UserID uuid.UUID `json:"user_id"`
	OrgID  uuid.UUID `json:"org_id"`
	Role   string    `json:"role"`
	Email  string    `json:"email"`
	jwt.RegisteredClaims
}

type Service struct {
	jwtSecret     []byte
	authDevBypass bool
}

func NewService(jwtSecret string, authDevBypass bool) *Service {
	return &Service{
		jwtSecret:     []byte(jwtSecret),
		authDevBypass: authDevBypass,
	}
}

func (s *Service) IssueToken(userID, orgID uuid.UUID, email, role string) (string, error) {
	claims := SessionClaims{
		UserID: userID,
		OrgID:  orgID,
		Role:   role,
		Email:  email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * 7 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Subject:   userID.String(),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.jwtSecret)
}

func (s *Service) VerifyToken(tokenStr string) (*SessionClaims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &SessionClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return s.jwtSecret, nil
	})
	if err != nil {
		return nil, err
	}
	if claims, ok := token.Claims.(*SessionClaims); ok && token.Valid {
		return claims, nil
	}
	return nil, ErrInvalidToken
}

const base62Chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"

// GenerateAPIKey creates a cryptographically secure key matching Doc 08 spec:
// fnd_sk_{live|test}_{22 base62 characters}
func GenerateAPIKey(live bool) (string, error) {
	prefix := "fnd_sk_live_"
	if !live {
		prefix = "fnd_sk_test_"
	}
	randomBytes := make([]byte, 22)
	if _, err := rand.Read(randomBytes); err != nil {
		return "", err
	}
	chars := make([]byte, 22)
	for i, b := range randomBytes {
		chars[i] = base62Chars[int(b)%len(base62Chars)]
	}
	return prefix + string(chars), nil
}

func HashAPIKey(key string) []byte {
	h := sha256.Sum256([]byte(key))
	return h[:]
}

type ctxKey string

const SessionKey ctxKey = "session_claims"

func (s *Service) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		tokenStr := ""
		authHeader := r.Header.Get("Authorization")
		if authHeader != "" {
			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) == 2 && strings.EqualFold(parts[0], "Bearer") {
				tokenStr = parts[1]
			}
		}
		if tokenStr == "" {
			tokenStr = r.URL.Query().Get("token")
		}
		if tokenStr == "" {
			http.Error(w, `{"error":{"code":"UNAUTHORIZED","message":"missing authorization header or token"}}`, http.StatusUnauthorized)
			return
		}

		claims, err := s.VerifyToken(tokenStr)
		if err != nil {
			http.Error(w, `{"error":{"code":"UNAUTHORIZED","message":"invalid token"}}`, http.StatusUnauthorized)
			return
		}

		ctx := context.WithValue(r.Context(), SessionKey, claims)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func GetSession(ctx context.Context) (*SessionClaims, bool) {
	claims, ok := ctx.Value(SessionKey).(*SessionClaims)
	return claims, ok
}
