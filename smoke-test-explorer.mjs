/**
 * Mock Etherscan-compatible API server for smoke testing.
 * Identifies deployed template contracts by matching their runtime bytecode
 * against known artifacts from forge build output.
 */

import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.MOCK_EXPLORER_PORT || "4000", 10);
const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";

// Template definitions: name → source path + artifact path
const TEMPLATES = [
  {
    name: "VulnerableVault",
    sourcePath: "contracts/src/benchmark/templates/VulnerableVault.sol",
    artifactPath: "contracts/out/VulnerableVault.sol/VulnerableVault.json",
    // VulnerableVault imports IWithdrawCallback — flatten for the mock response
    extraSources: ["contracts/src/benchmark/IWithdrawCallback.sol"],
  },
  {
    name: "WeakAccessControl",
    sourcePath: "contracts/src/benchmark/templates/WeakAccessControl.sol",
    artifactPath: "contracts/out/WeakAccessControl.sol/WeakAccessControl.json",
    extraSources: [],
  },
  {
    name: "IntegerOverflow",
    sourcePath: "contracts/src/benchmark/templates/IntegerOverflow.sol",
    artifactPath: "contracts/out/IntegerOverflow.sol/IntegerOverflow.json",
    extraSources: [],
  },
];

// Load known bytecodes and source from build artifacts
const knownTemplates = TEMPLATES.map((t) => {
  const artifact = JSON.parse(readFileSync(join(__dirname, t.artifactPath), "utf-8"));
  // deployedBytecode is the runtime code (what eth_getCode returns)
  // Strip immutable placeholders — compare only the first 64 bytes as a fingerprint
  const deployedBytecode = artifact.deployedBytecode.object;

  // Read source code
  let source = readFileSync(join(__dirname, t.sourcePath), "utf-8");

  // Flatten imports: inline extra source files
  for (const extra of t.extraSources) {
    const extraSource = readFileSync(join(__dirname, extra), "utf-8");
    // Remove the import line and prepend the interface
    source = source.replace(/import\s*\{[^}]*\}\s*from\s*"[^"]*IWithdrawCallback\.sol"\s*;/, "");
    source = extraSource + "\n" + source;
    // Remove duplicate pragma/license from inlined file
    const lines = source.split("\n");
    let seenPragma = false;
    let seenLicense = false;
    source = lines
      .filter((line) => {
        if (line.startsWith("// SPDX-License-Identifier:")) {
          if (seenLicense) return false;
          seenLicense = true;
        }
        if (line.startsWith("pragma solidity")) {
          if (seenPragma) return false;
          seenPragma = true;
        }
        return true;
      })
      .join("\n");
  }

  const abi = JSON.stringify(artifact.abi);

  return {
    name: t.name,
    // Use first 128 hex chars (64 bytes) as fingerprint — enough to uniquely identify
    fingerprint: deployedBytecode.slice(2, 130),
    source,
    abi,
  };
});

console.log(`Loaded ${knownTemplates.length} template fingerprints`);

async function getCode(address) {
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "eth_getCode",
      params: [address, "latest"],
      id: 1,
    }),
  });
  const data = await res.json();
  return data.result || "0x";
}

function matchTemplate(code) {
  if (!code || code === "0x") return null;
  const codeFingerprint = code.slice(2, 130);
  return knownTemplates.find((t) => codeFingerprint === t.fingerprint) || null;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // Only handle getsourcecode requests
  if (url.searchParams.get("module") !== "contract" || url.searchParams.get("action") !== "getsourcecode") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "0", message: "Unsupported action", result: null }));
    return;
  }

  const address = url.searchParams.get("address");
  if (!address) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "0", message: "Missing address", result: null }));
    return;
  }

  console.log(`Looking up source for ${address}...`);

  try {
    const code = await getCode(address);
    const template = matchTemplate(code);

    if (!template) {
      console.log(`  No match found (code length: ${code.length})`);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "0", message: "Contract not verified", result: null }));
      return;
    }

    console.log(`  Matched: ${template.name}`);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "1",
        message: "OK",
        result: [
          {
            ContractName: template.name,
            SourceCode: template.source,
            ABI: template.abi,
            ConstructorArguments: "",
            CompilerVersion: "v0.8.30",
          },
        ],
      })
    );
  } catch (err) {
    console.error(`  Error: ${err.message}`);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "0", message: err.message, result: null }));
  }
});

server.listen(PORT, () => {
  console.log(`Mock explorer listening on http://localhost:${PORT}`);
});
