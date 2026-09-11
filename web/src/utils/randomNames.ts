const orgAdjectives = [
  'Quantum', 'Apex', 'Cyber', 'Nova', 'Vanguard', 'Aether', 'Prism', 'Solar',
  'Nexus', 'Titan', 'Obsidian', 'Vertex', 'Helios', 'Ironclad', 'Hyperion', 'Zenith',
  'Stellar', 'Cortex', 'Astral', 'Vector', 'Pulse', 'Omega', 'Krypton', 'Synapse',
  'Aurora', 'Stratum', 'Eclipse', 'Spectra', 'Chronos', 'Aegis', 'Vortex', 'Radiant',
];

const orgNouns = [
  'Labs', 'Ventures', 'Dynamics', 'Systems', 'Foundry', 'Capital', 'DAO',
  'Networks', 'Robotics', 'Collective', 'Technologies', 'Studios', 'Protocol',
  'Research', 'Intelligence', 'Syndicate', 'Works', 'Holdings', 'Engines',
];

const projectPrefixes = [
  'quantum', 'cyber', 'neural', 'sonic', 'flux', 'matrix', 'orbit', 'hyper',
  'alpha', 'delta', 'pulse', 'shadow', 'turbo', 'nexus', 'zero', 'apex',
  'dex', 'yield', 'liquidity', 'market', 'strato', 'chrono', 'aero', 'omni',
  'spectral', 'vortex', 'titan', 'prism', 'helios', 'vector',
];

const projectSuffixes = [
  'scout', 'sentinel', 'oracle', 'engine', 'harvester', 'voyager', 'trader',
  'runner', 'vault', 'beacon', 'agent', 'arbiter', 'pilot', 'cipher', 'keeper',
  'router', 'matrix', 'craft', 'core', 'relay', 'weaver', 'watcher', 'forge',
];

export function generateOrgName(): string {
  const adj = orgAdjectives[Math.floor(Math.random() * orgAdjectives.length)];
  const noun = orgNouns[Math.floor(Math.random() * orgNouns.length)];
  return `${adj} ${noun}`;
}

export function generateProjectName(): string {
  const prefix = projectPrefixes[Math.floor(Math.random() * projectPrefixes.length)];
  const suffix = projectSuffixes[Math.floor(Math.random() * projectSuffixes.length)];
  return `${prefix}-${suffix}`;
}
