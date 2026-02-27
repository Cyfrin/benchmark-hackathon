import { execSync } from "child_process";

export interface Template {
  name: string;
  path: string;
}

export const TEMPLATES: Template[] = [
  { name: "VulnerableVault", path: "src/benchmark/templates/VulnerableVault.sol:VulnerableVault" },
  { name: "WeakAccessControl", path: "src/benchmark/templates/WeakAccessControl.sol:WeakAccessControl" },
  { name: "IntegerOverflow", path: "src/benchmark/templates/IntegerOverflow.sol:IntegerOverflow" },
];

/**
 * Check if a contract is already verified on the explorer.
 */
export async function isVerified(address: string, explorerApiUrl: string): Promise<boolean> {
  const url = new URL(explorerApiUrl);
  url.searchParams.set("module", "contract");
  url.searchParams.set("action", "getsourcecode");
  url.searchParams.set("address", address);

  try {
    const response = await fetch(url.toString());
    if (!response.ok) return false;

    const data = await response.json();
    if (data.status !== "1" || !data.result?.[0]) return false;

    return !!data.result[0].SourceCode && !!data.result[0].ContractName;
  } catch {
    return false;
  }
}

/**
 * Verify a contract using forge verify-contract.
 */
export function verifyContract(
  address: string,
  template: Template,
  config: { explorerApiUrl: string; rpcUrl: string; contractsDir: string }
): boolean {
  const cmd = [
    "forge", "verify-contract",
    `"${address}"`,
    template.path,
    "--verifier", "custom",
    "--verifier-url", `"${config.explorerApiUrl}"`,
    "--etherscan-api-key", '"1234"',
    "--rpc-url", `"${config.rpcUrl}"`,
    "--root", `"${config.contractsDir}"`,
  ].join(" ");

  try {
    const output = execSync(cmd, { encoding: "utf-8", timeout: 60_000 });
    console.log(`    ${output.trim()}`);
    return true;
  } catch (error: any) {
    const stderr = error.stderr?.toString() || error.message;
    console.error(`    Verification failed: ${stderr.trim()}`);
    return false;
  }
}
