import { config } from "./config.js";

export interface VerifiedSource {
  contractName: string;
  sourceCode: string;
  abi: string;
  constructorArguments: string;
  compilerVersion: string;
}

/**
 * Fetches verified source code from the block explorer API.
 * Uses the Etherscan-compatible API format.
 */
export async function getVerifiedSource(
  contractAddress: string
): Promise<VerifiedSource> {
  const url = new URL(config.explorerApiUrl);
  url.searchParams.set("module", "contract");
  url.searchParams.set("action", "getsourcecode");
  url.searchParams.set("address", contractAddress);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(
      `Explorer API error: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();

  if (data.status !== "1" || !data.result?.[0]) {
    throw new Error(
      `Contract not verified or not found: ${contractAddress}. Response: ${JSON.stringify(data)}`
    );
  }

  const result = data.result[0];
  return {
    contractName: result.ContractName,
    sourceCode: result.SourceCode,
    abi: result.ABI,
    constructorArguments: result.ConstructorArguments,
    compilerVersion: result.CompilerVersion,
  };
}
