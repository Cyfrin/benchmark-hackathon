import { execSync } from "child_process";
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

export interface CompiledContract {
  abi: any[];
  bytecode: `0x${string}`;
}

/**
 * Compiles a Solidity source file using forge and returns the ABI + bytecode.
 * Creates a temporary Foundry project to compile the exploit contract.
 * Optionally includes extra source files (e.g., the target contract) so the exploit can import them.
 */
export function compileSolidity(
  sourceCode: string,
  contractName: string,
  extraSources?: { filename: string; content: string }[]
): CompiledContract {
  const tempDir = mkdtempSync(join(tmpdir(), "exploit-"));

  // Create minimal foundry project structure
  const srcDir = join(tempDir, "src");
  const libDir = join(tempDir, "lib");
  mkdirSync(srcDir, { recursive: true });
  mkdirSync(libDir, { recursive: true });

  // Write foundry.toml
  writeFileSync(
    join(tempDir, "foundry.toml"),
    `[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc_version = "0.8.30"
remappings = ["@openzeppelin/contracts/=lib/openzeppelin-contracts/contracts/"]
`
  );

  // Symlink OpenZeppelin from the main contracts project
  const contractsLibDir = join(
    process.cwd(),
    "..",
    "contracts",
    "lib",
    "openzeppelin-contracts"
  );
  try {
    execSync(`ln -s "${contractsLibDir}" "${join(libDir, "openzeppelin-contracts")}"`, {
      stdio: "pipe",
    });
  } catch {
    // If symlink fails, try copy
    execSync(`cp -r "${contractsLibDir}" "${join(libDir, "openzeppelin-contracts")}"`, {
      stdio: "pipe",
    });
  }

  // Write the exploit source
  writeFileSync(join(srcDir, `${contractName}.sol`), sourceCode);

  // Write any extra source files (e.g., the target contract for imports)
  if (extraSources) {
    for (const extra of extraSources) {
      writeFileSync(join(srcDir, extra.filename), extra.content);
    }
  }

  // Compile with forge
  try {
    execSync("forge build", {
      cwd: tempDir,
      stdio: "pipe",
      timeout: 30_000,
    });
  } catch (error: any) {
    const stderr = error.stderr?.toString() || "";
    const stdout = error.stdout?.toString() || "";
    throw new Error(
      `Forge compilation failed:\n${stderr}\n${stdout}`
    );
  }

  // Read the compiled artifact
  const artifactPath = join(
    tempDir,
    "out",
    `${contractName}.sol`,
    `${contractName}.json`
  );

  let artifact: any;
  try {
    artifact = JSON.parse(readFileSync(artifactPath, "utf-8"));
  } catch {
    throw new Error(
      `Could not read compiled artifact at ${artifactPath}. Contract name may not match filename.`
    );
  }

  return {
    abi: artifact.abi,
    bytecode: artifact.bytecode.object as `0x${string}`,
  };
}
