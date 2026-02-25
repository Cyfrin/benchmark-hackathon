import "dotenv/config";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export const config = {
  rpcUrl: requireEnv("RPC_URL"),
  explorerApiUrl: requireEnv("EXPLORER_API_URL"),
  agentRegistryAddress: requireEnv("AGENT_REGISTRY_ADDRESS") as `0x${string}`,
  benchmarkControllerAddress: requireEnv("BENCHMARK_CONTROLLER_ADDRESS") as `0x${string}`,
  scoreTrackerAddress: requireEnv("SCORE_TRACKER_ADDRESS") as `0x${string}`,
  privateKey: requireEnv("PRIVATE_KEY") as `0x${string}`,
  openrouterApiKey: requireEnv("OPENROUTER_API_KEY"),
  llmModel: process.env.LLM_MODEL || "anthropic/claude-sonnet-4.6",
  chainId: parseInt(process.env.CHAIN_ID || "31337", 10),
};
