package auth

import (
	"context"
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

func HashAPIKey(key string) []byte {
	h := sha256.Sum256([]byte(key))
	return h[:]
}

type ctxKey string

const SessionKey ctxKey = "session_claims"

func (s *Service) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, `{"error":{"code":"UNAUTHORIZED","message":"missing authorization header"}}`, http.StatusUnauthorized)
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			http.Error(w, `{"error":{"code":"UNAUTHORIZED","message":"invalid authorization format"}}`, http.StatusUnauthorized)
			return
		}

		claims, err := s.VerifyToken(parts[1])
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
