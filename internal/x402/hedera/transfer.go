package hedera

import (
	"crypto/sha256"
	"fmt"
	"time"

	hedera "github.com/hiero-ledger/hiero-sdk-go/v2/sdk"
)

// BuildTransfer constructs an HTS token transfer, sets memo and valid duration,
// freezes it with the Hedera client, and returns frozen transaction bytes and body hash for signing.
func BuildTransfer(client *hedera.Client, agentAccount string, platformAccount string, tokenID string, baseUnits int64, memo string) ([]byte, []byte, error) {
	agentID, err := hedera.AccountIDFromString(agentAccount)
	if err != nil {
		return nil, nil, fmt.Errorf("invalid agent account id: %w", err)
	}

	platformID, err := hedera.AccountIDFromString(platformAccount)
	if err != nil {
		return nil, nil, fmt.Errorf("invalid platform account id: %w", err)
	}

	tokID, err := hedera.TokenIDFromString(tokenID)
	if err != nil {
		return nil, nil, fmt.Errorf("invalid token id: %w", err)
	}

	tx := hedera.NewTransferTransaction().
		AddTokenTransfer(tokID, agentID, -baseUnits).
		AddTokenTransfer(tokID, platformID, baseUnits).
		SetTransactionMemo(memo).
		SetTransactionValidDuration(120 * time.Second)

	if client != nil {
		_, err = tx.FreezeWith(client)
		if err != nil {
			return nil, nil, fmt.Errorf("failed to freeze transaction: %w", err)
		}
	}

	bytes, err := tx.ToBytes()
	if err != nil {
		return nil, nil, fmt.Errorf("failed to serialize transaction: %w", err)
	}

	hash := sha256.Sum256(bytes)
	return bytes, hash[:], nil
}

// AttachSignature attaches a raw secp256k1 signature to a serialized frozen transaction.
func AttachSignature(frozenBytes []byte, pubKeyBytes []byte, sigBytes []byte) ([]byte, error) {
	tx, err := hedera.TransactionFromBytes(frozenBytes)
	if err != nil {
		return nil, fmt.Errorf("failed to deserialize transaction: %w", err)
	}

	pubKey, err := hedera.PublicKeyFromBytesECDSA(pubKeyBytes)
	if err != nil {
		// Fallback to generic public key parser
		pubKey, err = hedera.PublicKeyFromBytes(pubKeyBytes)
		if err != nil {
			return nil, fmt.Errorf("invalid public key: %w", err)
		}
	}

	transferTx, ok := tx.(*hedera.TransferTransaction)
	if !ok {
		return nil, fmt.Errorf("transaction is not a TransferTransaction")
	}

	transferTx.AddSignature(pubKey, sigBytes)
	return transferTx.ToBytes()
}
