import "dotenv/config";
import { execSync } from "child_process";
import { readFileSync } from "fs";
import { join } from "path";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function resolvePrivateKey(): `0x${string}` {
  const privateKey = process.env.PRIVATE_KEY;
  if (privateKey) return privateKey as `0x${string}`;

  const keystoreName = process.env.KEYSTORE_NAME;
  if (!keystoreName) {
    throw new Error("Must set either PRIVATE_KEY or KEYSTORE_NAME");
  }

  // Let cast handle its own password prompt via inherited stdio
  const raw = execSync(
    `cast wallet decrypt-keystore ${keystoreName}`,
    { encoding: "utf-8", stdio: ["inherit", "pipe", "inherit"] }
  );
  // Extract the hex private key from the output (skip any prompt text)
  const match = raw.match(/(0x[0-9a-fA-F]{64})|([0-9a-fA-F]{64})/);
  if (!match) {
    throw new Error(`Could not parse private key from cast output: ${JSON.stringify(raw)}`);
  }
  const key = match[1] || `0x${match[2]}`;
  return key as `0x${string}`;
}

interface Deployments {
  chainId: number;
  contracts: {
    BenchmarkToken: string;
    AgentRegistry: string;
    ScoreTracker: string;
    BenchmarkController: string;
  };
}

function loadDeployments(): Deployments {
  const deploymentsPath = process.env.DEPLOYMENTS_FILE
    || join(process.cwd(), "../deployments.json");
  try {
    return JSON.parse(readFileSync(deploymentsPath, "utf-8"));
  } catch (e: any) {
    throw new Error(
      `Failed to read ${deploymentsPath}: ${e.message}. Run the deploy script first, or set DEPLOYMENTS_FILE.`
    );
  }
}

const deployments = loadDeployments();

const baseConfig = {
  rpcUrl: requireEnv("RPC_URL"),
  explorerApiUrl: requireEnv("EXPLORER_API_URL"),
  agentRegistryAddress: deployments.contracts.AgentRegistry as `0x${string}`,
  benchmarkControllerAddress: deployments.contracts.BenchmarkController as `0x${string}`,
  scoreTrackerAddress: deployments.contracts.ScoreTracker as `0x${string}`,
  openrouterApiKey: requireEnv("OPENROUTER_API_KEY"),
  llmModel: process.env.LLM_MODEL || "anthropic/claude-sonnet-4.6",
  chainId: parseInt(process.env.CHAIN_ID || "31337", 10),
};

export type Config = typeof baseConfig & { privateKey: `0x${string}` };

let _config: Config | null = null;

export function loadConfig(): Config {
  if (_config) return _config;
  const privateKey = resolvePrivateKey();
  _config = { ...baseConfig, privateKey };
  return _config;
}

// Synchronous access after loadConfig() has been called
export function getConfig(): Config {
  if (!_config) throw new Error("Config not loaded. Call loadConfig() first.");
  return _config;
}
