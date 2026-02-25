import { parseAbiItem, formatEther, type Hash } from "viem";
import { config } from "./config.js";
import { publicClient, walletClient, account } from "./chain.js";
import { getVerifiedSource } from "./explorer.js";
import { analyzeContract } from "./analyzer.js";
import { compileSolidity } from "./compiler.js";
import { executeExploit } from "./executor.js";

// Import ABIs
import AgentRegistryAbi from "./abi/AgentRegistry.json" with { type: "json" };
import BenchmarkControllerAbi from "./abi/BenchmarkController.json" with { type: "json" };
import BenchmarkTokenAbi from "./abi/BenchmarkToken.json" with { type: "json" };
import ScoreTrackerAbi from "./abi/ScoreTracker.json" with { type: "json" };

async function main() {
  console.log("=== BattleChain Hacker Bot ===\n");
  console.log(`Operator: ${account.address}`);
  console.log(`RPC: ${config.rpcUrl}\n`);

  // Step 1: Register agent (skip if already registered)
  const agentId = await registerAgent();
  console.log(`Agent ID: ${agentId}\n`);

  // Step 2: Request certification run
  const { runId, contracts } = await requestCertificationRun(agentId);
  console.log(`Run ID: ${runId}`);
  console.log(`Deployed contracts: ${contracts.length}\n`);

  // Step 3: Get token info
  const tokenAddress = await publicClient.readContract({
    address: config.benchmarkControllerAddress,
    abi: BenchmarkControllerAbi,
    functionName: "benchmarkToken",
  }) as `0x${string}`;

  // Step 4: Exploit each contract
  let exploited = 0;
  for (let i = 0; i < contracts.length; i++) {
    const contractAddr = contracts[i] as `0x${string}`;
    console.log(`\n--- Contract ${i + 1}/${contracts.length}: ${contractAddr} ---`);

    try {
      const success = await exploitContract(contractAddr, tokenAddress);
      if (success) {
        exploited++;
        console.log(`  Result: EXPLOITED`);
      } else {
        console.log(`  Result: FAILED`);
      }
    } catch (error: any) {
      console.error(`  Error: ${error.message}`);
    }
  }

  // Step 5: Complete the run
  console.log(`\n--- Completing Run ---`);
  try {
    await completeRun(runId);
  } catch (error: any) {
    console.log(`  Could not complete run: ${error.shortMessage || error.message}`);
  }

  // Step 6: Check scores
  const stats = await publicClient.readContract({
    address: config.scoreTrackerAddress,
    abi: ScoreTrackerAbi,
    functionName: "getAgentStats",
    args: [BigInt(agentId)],
  }) as any;

  console.log(`\n=== Results ===`);
  console.log(`Contracts exploited: ${exploited}/${contracts.length}`);
  console.log(`Total bugs found: ${stats.totalBugsFound}`);
  console.log(`Total value extracted: ${formatEther(stats.totalValueExtracted)} BENCH`);
  console.log(`Best run score: ${stats.bestRunScore}`);
  console.log(`Total runs: ${stats.totalRuns}`);
}

async function registerAgent(): Promise<bigint> {
  // Check if already registered
  try {
    const agent = await publicClient.readContract({
      address: config.agentRegistryAddress,
      abi: AgentRegistryAbi,
      functionName: "getAgentByOperator",
      args: [account.address],
    }) as any;
    console.log("Agent already registered.");
    return agent.id;
  } catch {
    // Not registered yet
  }

  console.log("Registering agent...");
  const hash = await walletClient.writeContract({
    address: config.agentRegistryAddress,
    abi: AgentRegistryAbi,
    functionName: "registerAgent",
    args: [account.address, "BattleChain Hacker Bot"],
    account,
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  // Parse AgentRegistered event to get agentId
  const event = parseAbiItem(
    "event AgentRegistered(uint256 indexed agentId, address indexed owner, address indexed operator)"
  );
  const logs = await publicClient.getContractEvents({
    address: config.agentRegistryAddress,
    abi: [event],
    fromBlock: receipt.blockNumber,
    toBlock: receipt.blockNumber,
  });

  return (logs[0] as any).args.agentId;
}

async function requestCertificationRun(
  agentId: bigint
): Promise<{ runId: bigint; contracts: string[] }> {
  console.log("Requesting certification run...");

  // Get certification fee
  const fee = await publicClient.readContract({
    address: config.benchmarkControllerAddress,
    abi: BenchmarkControllerAbi,
    functionName: "certificationFee",
  }) as bigint;

  const hash = await walletClient.writeContract({
    address: config.benchmarkControllerAddress,
    abi: BenchmarkControllerAbi,
    functionName: "requestCertificationRun",
    args: [agentId],
    value: fee,
    account,
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  // Parse CertificationStarted event
  const event = parseAbiItem(
    "event CertificationStarted(uint256 indexed runId, uint256 indexed agentId, address[] deployedContracts)"
  );
  const logs = await publicClient.getContractEvents({
    address: config.benchmarkControllerAddress,
    abi: [event],
    fromBlock: receipt.blockNumber,
    toBlock: receipt.blockNumber,
  });

  const args = (logs[0] as any).args;
  return { runId: args.runId, contracts: args.deployedContracts };
}

async function exploitContract(
  contractAddress: `0x${string}`,
  tokenAddress: `0x${string}`
): Promise<boolean> {
  // 1. Fetch verified source code
  console.log("  Fetching verified source code...");
  const verified = await getVerifiedSource(contractAddress);
  console.log(`  Contract: ${verified.contractName}`);

  // 2. Get token balances
  const tokenBalance = await publicClient.readContract({
    address: tokenAddress,
    abi: BenchmarkTokenAbi,
    functionName: "balanceOf",
    args: [contractAddress],
  }) as bigint;

  const seedBalance = await publicClient.readContract({
    address: tokenAddress,
    abi: BenchmarkTokenAbi,
    functionName: "balanceOf",
    args: [account.address],
  }) as bigint;

  console.log(`  Contract token balance: ${formatEther(tokenBalance)} BENCH`);
  console.log(`  Operator seed balance: ${formatEther(seedBalance)} BENCH`);

  if (tokenBalance === 0n) {
    console.log("  Contract already drained, skipping.");
    return false;
  }

  // 3. Analyze with Claude
  console.log("  Analyzing with Claude...");
  const plan = await analyzeContract(
    verified.sourceCode,
    verified.contractName,
    contractAddress,
    tokenBalance.toString(),
    seedBalance.toString()
  );
  console.log(`  Vulnerability: ${plan.vulnerability}`);
  console.log(`  Description: ${plan.description}`);

  // 4. Compile exploit contract if needed
  let compiled = null;
  if (plan.exploitContract) {
    console.log("  Compiling exploit contract...");
    // Extract contract name from source
    const nameMatch = plan.exploitContract.match(/contract\s+(\w+)/);
    const exploitName = nameMatch ? nameMatch[1] : "Exploit";
    // Include the target contract source so exploit can import it by name
    compiled = compileSolidity(plan.exploitContract, exploitName, [
      { filename: `${verified.contractName}.sol`, content: verified.sourceCode },
    ]);
    console.log(`  Compiled: ${exploitName}`);
  }

  // 5. Execute exploit
  console.log("  Executing exploit...");
  const targetAbi = JSON.parse(verified.abi);
  const result = await executeExploit(
    plan,
    contractAddress,
    targetAbi,
    compiled,
    account.address,
    tokenBalance,
    seedBalance,
    tokenAddress,
    BenchmarkTokenAbi as any[]
  );

  // 6. Verify drain
  const remainingBalance = await publicClient.readContract({
    address: tokenAddress,
    abi: BenchmarkTokenAbi,
    functionName: "balanceOf",
    args: [contractAddress],
  }) as bigint;

  console.log(`  Remaining balance: ${formatEther(remainingBalance)} BENCH`);
  return remainingBalance < tokenBalance;
}

async function completeRun(runId: bigint): Promise<void> {
  const hash = await walletClient.writeContract({
    address: config.benchmarkControllerAddress,
    abi: BenchmarkControllerAbi,
    functionName: "completeRun",
    args: [runId],
    account,
  });

  await publicClient.waitForTransactionReceipt({ hash });
  console.log("Run completed.");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
