package names

import (
	"crypto/rand"
	"fmt"
	"math/big"
	"strings"
)

var orgAdjectives = []string{
	"Quantum", "Apex", "Cyber", "Nova", "Vanguard", "Aether", "Prism", "Solar",
	"Nexus", "Titan", "Obsidian", "Vertex", "Helios", "Ironclad", "Hyperion", "Zenith",
	"Stellar", "Cortex", "Astral", "Vector", "Pulse", "Omega", "Krypton", "Synapse",
	"Aurora", "Stratum", "Eclipse", "Spectra", "Chronos", "Aegis", "Vortex", "Radiant",
}

var orgNouns = []string{
	"Labs", "Ventures", "Dynamics", "Systems", "Foundry", "Capital", "DAO",
	"Networks", "Robotics", "Collective", "Technologies", "Studios", "Protocol",
	"Research", "Intelligence", "Syndicate", "Works", "Holdings", "Engines",
}

var projectPrefixes = []string{
	"quantum", "cyber", "neural", "sonic", "flux", "matrix", "orbit", "hyper",
	"alpha", "delta", "pulse", "shadow", "turbo", "nexus", "zero", "apex",
	"dex", "yield", "liquidity", "market", "strato", "chrono", "aero", "omni",
	"spectral", "vortex", "titan", "prism", "helios", "vector",
}

var projectSuffixes = []string{
	"scout", "sentinel", "oracle", "engine", "harvester", "voyager", "trader",
	"runner", "vault", "beacon", "agent", "arbiter", "pilot", "cipher", "keeper",
	"router", "matrix", "craft", "core", "relay", "weaver", "watcher", "forge",
}

func secureRandInt(max int) int {
	if max <= 0 {
		return 0
	}
	nBig, err := rand.Int(rand.Reader, big.NewInt(int64(max)))
	if err != nil {
		return 0
	}
	return int(nBig.Int64())
}

// RandomOrgName generates a distinct organization name like "Apex Dynamics" or "Quantum Foundry"
func RandomOrgName() string {
	adj := orgAdjectives[secureRandInt(len(orgAdjectives))]
	noun := orgNouns[secureRandInt(len(orgNouns))]
	return fmt.Sprintf("%s %s", adj, noun)
}

// RandomProjectName generates a slug-friendly agent/project name like "neural-scout" or "flux-oracle"
func RandomProjectName() string {
	prefix := projectPrefixes[secureRandInt(len(projectPrefixes))]
	suffix := projectSuffixes[secureRandInt(len(projectSuffixes))]
	return fmt.Sprintf("%s-%s", prefix, suffix)
}

// IsGenericOrgName checks if an org name is a legacy hardcoded placeholder
func IsGenericOrgName(name string) bool {
	trimmed := strings.TrimSpace(strings.ToLower(name))
	return trimmed == "" ||
		trimmed == "acme ventures" ||
		trimmed == "acme" ||
		trimmed == "workspace" ||
		trimmed == "default workspace" ||
		trimmed == "my workspace"
}

// IsGenericProjectName checks if a project name is a legacy hardcoded placeholder
func IsGenericProjectName(name string) bool {
	trimmed := strings.TrimSpace(strings.ToLower(name))
	return trimmed == "" ||
		trimmed == "market-scout" ||
		trimmed == "default-project" ||
		trimmed == "my project"
}
