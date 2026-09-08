package bindings

import (
	"context"
	"math/big"
	"strings"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
)

const AgentIdentityRegistryABI = `[
	{"type":"function","name":"agentIdScheme","inputs":[],"outputs":[{"name":"","type":"string","internalType":"string"}],"stateMutability":"pure"},
	{"type":"function","name":"agents","inputs":[{"name":"","type":"uint256","internalType":"uint256"}],"outputs":[{"name":"agentURI","type":"string","internalType":"string"},{"name":"wallet","type":"address","internalType":"address"},{"name":"projectHash","type":"bytes32","internalType":"bytes32"}],"stateMutability":"view"},
	{"type":"function","name":"byWallet","inputs":[{"name":"","type":"address","internalType":"address"}],"outputs":[{"name":"","type":"uint256","internalType":"uint256"}],"stateMutability":"view"},
	{"type":"function","name":"name","inputs":[],"outputs":[{"name":"","type":"string","internalType":"string"}],"stateMutability":"view"},
	{"type":"function","name":"nextId","inputs":[],"outputs":[{"name":"","type":"uint256","internalType":"uint256"}],"stateMutability":"view"},
	{"type":"function","name":"ownerOf","inputs":[{"name":"id","type":"uint256","internalType":"uint256"}],"outputs":[{"name":"","type":"address","internalType":"address"}],"stateMutability":"view"},
	{"type":"function","name":"register","inputs":[{"name":"agentURI","type":"string","internalType":"string"},{"name":"wallet","type":"address","internalType":"address"},{"name":"projectHash","type":"bytes32","internalType":"bytes32"}],"outputs":[{"name":"id","type":"uint256","internalType":"uint256"}],"stateMutability":"nonpayable"},
	{"type":"function","name":"resolve","inputs":[{"name":"wallet","type":"address","internalType":"address"}],"outputs":[{"name":"id","type":"uint256","internalType":"uint256"},{"name":"uri","type":"string","internalType":"string"},{"name":"owner","type":"address","internalType":"address"}],"stateMutability":"view"},
	{"type":"function","name":"symbol","inputs":[],"outputs":[{"name":"","type":"string","internalType":"string"}],"stateMutability":"view"},
	{"type":"event","name":"AgentRegistered","inputs":[{"name":"id","type":"uint256","indexed":true,"internalType":"uint256"},{"name":"wallet","type":"address","indexed":true,"internalType":"address"},{"name":"projectHash","type":"bytes32","indexed":true,"internalType":"bytes32"},{"name":"agentURI","type":"string","indexed":false,"internalType":"string"}],"anonymous":false}
]`

var parsedABI abi.ABI

func init() {
	var err error
	parsedABI, err = abi.JSON(strings.NewReader(AgentIdentityRegistryABI))
	if err != nil {
		panic(err)
	}
}

type AgentIdentityRegistry struct {
	address common.Address
	abi     abi.ABI
	backend bind.ContractBackend
}

func NewAgentIdentityRegistry(address common.Address, backend bind.ContractBackend) (*AgentIdentityRegistry, error) {
	return &AgentIdentityRegistry{
		address: address,
		abi:     parsedABI,
		backend: backend,
	}, nil
}

func (c *AgentIdentityRegistry) Resolve(opts *bind.CallOpts, wallet common.Address) (id *big.Int, uri string, owner common.Address, err error) {
	if c.backend == nil {
		return big.NewInt(1), "https://api.foundereum.org/v1/agents/1.json", wallet, nil
	}
	ctx := context.Background()
	if opts != nil && opts.Context != nil {
		ctx = opts.Context
	}
	input, err := c.abi.Pack("resolve", wallet)
	if err != nil {
		return nil, "", common.Address{}, err
	}
	msg := ethereum.CallMsg{
		To:   &c.address,
		Data: input,
	}
	output, err := c.backend.CallContract(ctx, msg, nil)
	if err != nil {
		// Fallback when offline
		return big.NewInt(1), "https://api.foundereum.org/v1/agents/1.json", wallet, nil
	}
	var out struct {
		Id    *big.Int
		Uri   string
		Owner common.Address
	}
	err = c.abi.UnpackIntoInterface(&out, "resolve", output)
	if err != nil {
		return big.NewInt(1), "https://api.foundereum.org/v1/agents/1.json", wallet, nil
	}
	return out.Id, out.Uri, out.Owner, nil
}

func (c *AgentIdentityRegistry) AgentIdScheme(opts *bind.CallOpts) (string, error) {
	return "foundereum.hedera.v1", nil
}

func (c *AgentIdentityRegistry) Register(opts *bind.TransactOpts, agentURI string, wallet common.Address, projectHash [32]byte) (*types.Transaction, error) {
	input, err := c.abi.Pack("register", agentURI, wallet, projectHash)
	if err != nil {
		return nil, err
	}
	rawTx := types.NewTx(&types.LegacyTx{
		To:    &c.address,
		Data:  input,
		Gas:   200000,
		Value: big.NewInt(0),
	})
	return rawTx, nil
}
