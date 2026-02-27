import { readFileSync } from "fs";
import { join } from "path";
import { getConfig } from "./config.js";

export interface VerifiedSource {
  contractName: string;
  sourceCode: string;
  abi: string;
  constructorArguments: string;
  compilerVersion: string;
  /** Additional source files from the Standard JSON (e.g. imports). Filenames are flat (just the .sol name). */
  additionalSources: { filename: string; content: string }[];
}

/**
 * Template names in deploy order (matches BenchmarkController.templates[]).
 */
const TEMPLATE_NAMES = ["VulnerableVault", "WeakAccessControl", "IntegerOverflow"] as const;

/**
 * Additional source files needed by each template (relative to contracts/src/benchmark/).
 */
const TEMPLATE_DEPS: Record<string, string[]> = {
  VulnerableVault: ["IWithdrawCallback.sol"],
};

/**
 * Reads source code and ABI from the local contracts/ build output.
 * Used as a fallback when the block explorer is unavailable (e.g. Anvil).
 */
export function getLocalSource(contractIndex: number): VerifiedSource {
  const name = TEMPLATE_NAMES[contractIndex];
  if (!name) {
    throw new Error(`Unknown template index: ${contractIndex}. Expected 0-${TEMPLATE_NAMES.length - 1}`);
  }

  const contractsDir = process.env.CONTRACTS_DIR
    || join(process.cwd(), "../contracts");

  // Read source from src/
  const sourceCode = readFileSync(
    join(contractsDir, `src/benchmark/templates/${name}.sol`),
    "utf-8"
  );

  // Read ABI from forge build output
  const buildJson = JSON.parse(
    readFileSync(join(contractsDir, `out/${name}.sol/${name}.json`), "utf-8")
  );

  // Read additional dependency sources
  const additionalSources: { filename: string; content: string }[] = [];
  for (const dep of TEMPLATE_DEPS[name] || []) {
    const depSource = readFileSync(
      join(contractsDir, `src/benchmark/${dep}`),
      "utf-8"
    );
    additionalSources.push({ filename: dep, content: depSource });
  }

  return {
    contractName: name,
    sourceCode,
    abi: JSON.stringify(buildJson.abi),
    constructorArguments: "",
    compilerVersion: buildJson.metadata?.compiler?.version || "0.8.30",
    additionalSources,
  };
}

/**
 * Fetches verified source code from the block explorer API.
 * Uses the Etherscan-compatible API format.
 *
 * Handles the Solidity Standard JSON format (double-braced `{{...}}`) returned
 * by Sourcify-backed explorers — extracts the main contract source and any
 * additional imported files.
 */
export async function getVerifiedSource(
  contractAddress: string
): Promise<VerifiedSource> {
  const url = new URL(getConfig().explorerApiUrl);
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

  if (!result.SourceCode || !result.ContractName) {
    throw new Error(
      `Contract source not verified: ${contractAddress}`
    );
  }

  // ContractName may be "src/benchmark/templates/Foo.sol:Foo" — extract just "Foo"
  const contractName = result.ContractName.includes(":")
    ? result.ContractName.split(":").pop()!
    : result.ContractName;

  // Parse source code — may be plain Solidity or Solidity Standard JSON (double-braced)
  const { mainSource, additionalSources } = parseSourceCode(
    result.SourceCode,
    result.ContractName
  );

  return {
    contractName,
    sourceCode: mainSource,
    abi: result.ABI,
    constructorArguments: result.ConstructorArguments,
    compilerVersion: result.CompilerVersion,
    additionalSources,
  };
}

/**
 * Parses the SourceCode field from the explorer API.
 * Etherscan/Sourcify returns Standard JSON wrapped in double braces: `{{...}}`
 * This extracts the main contract source and any imported files.
 */
function parseSourceCode(
  rawSource: string,
  contractPath: string
): { mainSource: string; additionalSources: { filename: string; content: string }[] } {
  // Check for Solidity Standard JSON format (double-braced)
  if (!rawSource.startsWith("{{")) {
    return { mainSource: rawSource, additionalSources: [] };
  }

  // Strip outer braces: `{{...}}` → `{...}`
  const jsonStr = rawSource.slice(1, -1);
  const standardJson = JSON.parse(jsonStr);
  const sources: Record<string, { content: string }> = standardJson.sources || {};

  // The contractPath from ContractName is like "src/benchmark/templates/Foo.sol:Foo"
  // Extract the file path part (before the colon)
  const mainFilePath = contractPath.includes(":")
    ? contractPath.split(":")[0]
    : contractPath;

  // Build a map of original paths → flat filenames for all source files
  const pathToFlat: Record<string, string> = {};
  for (const filePath of Object.keys(sources)) {
    pathToFlat[filePath] = filePath.split("/").pop()!;
  }

  // Find the main source file
  let mainSource = "";
  const additionalSources: { filename: string; content: string }[] = [];

  for (const [filePath, source] of Object.entries(sources)) {
    const flatName = pathToFlat[filePath];
    // Rewrite relative import paths to use flat filenames (e.g., "../Foo.sol" → "./Foo.sol")
    const rewritten = rewriteImports(source.content, pathToFlat);
    if (filePath === mainFilePath) {
      mainSource = rewritten;
    } else {
      additionalSources.push({ filename: flatName, content: rewritten });
    }
  }

  if (!mainSource) {
    // Fallback: use the first source file
    const firstKey = Object.keys(sources)[0];
    if (firstKey) {
      mainSource = rewriteImports(sources[firstKey].content, pathToFlat);
    }
  }

  return { mainSource, additionalSources };
}

/**
 * Rewrites relative import paths in Solidity source to use flat filenames.
 * e.g., `import {Foo} from "../Foo.sol"` → `import {Foo} from "./Foo.sol"`
 * This allows all source files to live in a single flat directory for compilation.
 */
function rewriteImports(
  source: string,
  pathToFlat: Record<string, string>
): string {
  // Match Solidity import statements with relative paths
  // Handles: import "path"; import {X} from "path"; import * as X from "path";
  return source.replace(
    /(import\s+(?:\{[^}]*\}\s+from\s+|[^"']*)?)(["'])(\.[^"']+)(["'])/g,
    (match, prefix, q1, importPath, q2) => {
      // Extract just the filename from the import path
      const filename = importPath.split("/").pop()!;
      return `${prefix}${q1}./${filename}${q2}`;
    }
  );
}
