import { createPublicClient, http, defineChain } from "viem";
import { env } from "$env/dynamic/public";
import AgentRegistryAbi from "./abi/AgentRegistry.json";
import ScoreTrackerAbi from "./abi/ScoreTracker.json";
import BenchmarkControllerAbi from "./abi/BenchmarkController.json";

export { AgentRegistryAbi, ScoreTrackerAbi, BenchmarkControllerAbi };

export const battlechain = defineChain({
  id: parseInt(env.PUBLIC_CHAIN_ID || "31337", 10),
  name: "BattleChain Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: [env.PUBLIC_RPC_URL || "http://localhost:8545"] },
  },
});

export const publicClient = createPublicClient({
  chain: battlechain,
  transport: http(env.PUBLIC_RPC_URL || "http://localhost:8545"),
});

export const addresses = {
  agentRegistry: (env.PUBLIC_AGENT_REGISTRY_ADDRESS || "0x") as `0x${string}`,
  benchmarkController: (env.PUBLIC_BENCHMARK_CONTROLLER_ADDRESS ||
    "0x") as `0x${string}`,
  scoreTracker: (env.PUBLIC_SCORE_TRACKER_ADDRESS || "0x") as `0x${string}`,
};
