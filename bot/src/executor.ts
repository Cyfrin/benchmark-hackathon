import {
  type Abi,
  type Hash,
  parseAbi,
  getContract,
  encodeFunctionData,
} from "viem";
import { publicClient, walletClient, account } from "./chain.js";
import type { ExploitPlan, ExploitStep } from "./analyzer.js";
import type { CompiledContract } from "./compiler.js";

/**
 * Executes an exploit plan against a target contract.
 * Handles both deploying exploit contracts and making direct calls.
 */
export async function executeExploit(
  plan: ExploitPlan,
  targetAddress: `0x${string}`,
  targetAbi: any[],
  compiled: CompiledContract | null,
  operatorAddress: `0x${string}`,
  tokenBalance: bigint,
  seedBalance: bigint,
  tokenAddress: `0x${string}`,
  tokenAbi: any[]
): Promise<{ success: boolean; txHashes: Hash[] }> {
  const txHashes: Hash[] = [];
  let exploitAddress: `0x${string}` | null = null;

  for (const step of plan.exploitSteps) {
    console.log(`  Step: ${step.description}`);

    if (step.type === "deploy_contract" && compiled) {
      // Deploy the exploit contract
      const hash = await walletClient.deployContract({
        abi: compiled.abi,
        bytecode: compiled.bytecode,
        args: resolveArgs(step.args, targetAddress, exploitAddress, operatorAddress, tokenBalance, seedBalance, tokenAddress),
        account,
        gas: 3_000_000n,
        gasPrice: 2_000_000_000n,
      });
      txHashes.push(hash);

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      exploitAddress = receipt.contractAddress!;
      console.log(`  Deployed exploit contract at: ${exploitAddress}`);
    } else if (step.type === "call_function") {
      let target: `0x${string}`;
      let abi: any[];

      if (step.target === "EXPLOIT") {
        target = exploitAddress!;
        abi = compiled!.abi;
      } else if (step.target === "TOKEN") {
        target = tokenAddress;
        abi = tokenAbi;
      } else {
        target = targetAddress;
        abi = targetAbi;
      }

      const resolvedArgs = resolveArgs(
        step.args,
        targetAddress,
        exploitAddress,
        operatorAddress,
        tokenBalance,
        seedBalance,
        tokenAddress
      );

      const hash = await walletClient.writeContract({
        address: target,
        abi,
        functionName: step.functionName,
        args: resolvedArgs,
        account,
        gas: 3_000_000n,
        gasPrice: 2_000_000_000n,
      });
      txHashes.push(hash);

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status === "reverted") {
        console.log(`  REVERTED: ${step.functionName} on ${target} (tx: ${hash})`);
      } else {
        console.log(`  Called ${step.functionName} on ${target}`);
      }
    }
  }

  return { success: true, txHashes };
}

function resolveArgs(
  args: string[],
  targetAddress: string,
  exploitAddress: string | null,
  operatorAddress: string,
  tokenBalance: bigint,
  seedBalance: bigint,
  tokenAddress: string
): any[] {
  return args.map((arg) => {
    if (arg === "OPERATOR_ADDRESS") return operatorAddress;
    if (arg === "TARGET_ADDRESS") return targetAddress;
    if (arg === "EXPLOIT_ADDRESS") return exploitAddress;
    if (arg === "TOKEN_ADDRESS") return tokenAddress;
    if (arg === "TOKEN_BALANCE") return tokenBalance;
    if (arg === "SEED_BALANCE") return seedBalance;
    // Try to parse as BigInt if it looks like a number
    if (/^\d+$/.test(arg)) return BigInt(arg);
    return arg;
  });
}
