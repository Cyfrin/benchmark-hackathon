import "dotenv/config";
import { readFileSync } from "fs";
import { join } from "path";
import { createPublicClient, defineChain, http, parseAbiItem } from "viem";
import { TEMPLATES, isVerified, verifyContract } from "./verify.js";
import BenchmarkControllerAbi from "./abi/BenchmarkController.json" with { type: "json" };

interface Config {
  rpcUrl: string;
  explorerApiUrl: string;
  benchmarkControllerAddress: `0x${string}`;
  chainId: number;
  contractsDir: string;
  pollIntervalMs: number;
}

function loadConfig(): Config {
  const rpcUrl = process.env.RPC_URL;
  const explorerApiUrl = process.env.EXPLORER_API_URL;
  const contractsDir = process.env.CONTRACTS_DIR || "../contracts";
  const chainId = parseInt(process.env.CHAIN_ID || "31337", 10);
  const pollIntervalMs = parseInt(process.env.POLL_INTERVAL_MS || "5000", 10);

  if (!rpcUrl) throw new Error("RPC_URL is required");
  if (!explorerApiUrl) throw new Error("EXPLORER_API_URL is required");

  // Read contract address from deployments.json
  const deploymentsPath = process.env.DEPLOYMENTS_FILE
    || join(process.cwd(), "../deployments.json");
  let benchmarkControllerAddress: string;
  try {
    const deployments = JSON.parse(readFileSync(deploymentsPath, "utf-8"));
    benchmarkControllerAddress = deployments.contracts.BenchmarkController;
  } catch (e: any) {
    throw new Error(
      `Failed to read ${deploymentsPath}: ${e.message}. Run the deploy script first, or set DEPLOYMENTS_FILE.`
    );
  }

  return {
    rpcUrl,
    explorerApiUrl,
    benchmarkControllerAddress: benchmarkControllerAddress as `0x${string}`,
    chainId,
    contractsDir,
    pollIntervalMs,
  };
}

const CertificationStartedEvent = parseAbiItem(
  "event CertificationStarted(uint256 indexed runId, uint256 indexed agentId, address[] deployedContracts)"
);

async function processEvent(
  runId: bigint,
  agentId: bigint,
  deployedContracts: readonly string[],
  config: Config
): Promise<void> {
  console.log(`\n  Run ${runId} (agent ${agentId}): ${deployedContracts.length} contracts`);

  for (let i = 0; i < deployedContracts.length; i++) {
    const address = deployedContracts[i];
    const template = TEMPLATES[i];

    if (!template) {
      console.log(`  [${i}] ${address}: no template mapping for index ${i}, skipping`);
      continue;
    }

    console.log(`  [${i}] ${address} → ${template.name}`);

    // Check if already verified
    const alreadyVerified = await isVerified(address, config.explorerApiUrl);
    if (alreadyVerified) {
      console.log(`    Already verified, skipping`);
      continue;
    }

    // Verify
    const success = verifyContract(address, template, {
      explorerApiUrl: config.explorerApiUrl,
      rpcUrl: config.rpcUrl,
      contractsDir: config.contractsDir,
    });

    console.log(`    ${success ? "Verified" : "FAILED"}`);
  }
}

async function main(): Promise<void> {
  const config = loadConfig();

  const chain = defineChain({
    id: config.chainId,
    name: "BattleChain",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [config.rpcUrl] } },
  });

  const client = createPublicClient({ chain, transport: http(config.rpcUrl) });

  console.log("=== BattleChain Contract Verifier ===\n");
  console.log(`Controller: ${config.benchmarkControllerAddress}`);
  console.log(`Explorer:   ${config.explorerApiUrl}`);
  console.log(`Contracts:  ${config.contractsDir}`);
  console.log(`Poll:       ${config.pollIntervalMs}ms\n`);

  // Sweep historical events from block 0
  console.log("Scanning historical events...");
  const currentBlock = await client.getBlockNumber();

  const historicalLogs = await client.getContractEvents({
    address: config.benchmarkControllerAddress,
    abi: [CertificationStartedEvent],
    fromBlock: 0n,
    toBlock: currentBlock,
  });

  console.log(`Found ${historicalLogs.length} historical CertificationStarted events`);

  for (const log of historicalLogs) {
    const args = (log as any).args;
    await processEvent(args.runId, args.agentId, args.deployedContracts, config);
  }

  // Poll for new events
  let lastProcessedBlock = currentBlock;
  console.log(`\nWatching for new events from block ${lastProcessedBlock + 1n}...`);

  while (true) {
    await new Promise((resolve) => setTimeout(resolve, config.pollIntervalMs));

    try {
      const latestBlock = await client.getBlockNumber();
      if (latestBlock <= lastProcessedBlock) continue;

      const logs = await client.getContractEvents({
        address: config.benchmarkControllerAddress,
        abi: [CertificationStartedEvent],
        fromBlock: lastProcessedBlock + 1n,
        toBlock: latestBlock,
      });

      if (logs.length > 0) {
        console.log(`\n[Block ${lastProcessedBlock + 1n}..${latestBlock}] ${logs.length} new event(s)`);
        for (const log of logs) {
          const args = (log as any).args;
          await processEvent(args.runId, args.agentId, args.deployedContracts, config);
        }
      }

      lastProcessedBlock = latestBlock;
    } catch (error: any) {
      console.error(`Poll error: ${error.message}`);
    }
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
