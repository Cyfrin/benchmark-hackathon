"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compileSolidity = compileSolidity;
var child_process_1 = require("child_process");
var fs_1 = require("fs");
var path_1 = require("path");
var os_1 = require("os");
/**
 * Compiles a Solidity source file using forge and returns the ABI + bytecode.
 * Creates a temporary Foundry project to compile the exploit contract.
 * Optionally includes extra source files (e.g., the target contract) so the exploit can import them.
 */
function compileSolidity(sourceCode, contractName, extraSources) {
    var _a, _b;
    var tempDir = (0, fs_1.mkdtempSync)((0, path_1.join)((0, os_1.tmpdir)(), "exploit-"));
    // Create minimal foundry project structure
    var srcDir = (0, path_1.join)(tempDir, "src");
    var libDir = (0, path_1.join)(tempDir, "lib");
    (0, fs_1.mkdirSync)(srcDir, { recursive: true });
    (0, fs_1.mkdirSync)(libDir, { recursive: true });
    // Write foundry.toml
    (0, fs_1.writeFileSync)((0, path_1.join)(tempDir, "foundry.toml"), "[profile.default]\nsrc = \"src\"\nout = \"out\"\nlibs = [\"lib\"]\nsolc_version = \"0.8.30\"\nremappings = [\"@openzeppelin/contracts/=lib/openzeppelin-contracts/contracts/\"]\n");
    // Symlink OpenZeppelin from the main contracts project
    var contractsLibDir = (0, path_1.join)(process.cwd(), "..", "contracts", "lib", "openzeppelin-contracts");
    try {
        (0, child_process_1.execSync)("ln -s \"".concat(contractsLibDir, "\" \"").concat((0, path_1.join)(libDir, "openzeppelin-contracts"), "\""), {
            stdio: "pipe",
        });
    }
    catch (_c) {
        // If symlink fails, try copy
        (0, child_process_1.execSync)("cp -r \"".concat(contractsLibDir, "\" \"").concat((0, path_1.join)(libDir, "openzeppelin-contracts"), "\""), {
            stdio: "pipe",
        });
    }
    // Write the exploit source
    (0, fs_1.writeFileSync)((0, path_1.join)(srcDir, "".concat(contractName, ".sol")), sourceCode);
    // Write any extra source files (e.g., the target contract for imports)
    if (extraSources) {
        for (var _i = 0, extraSources_1 = extraSources; _i < extraSources_1.length; _i++) {
            var extra = extraSources_1[_i];
            (0, fs_1.writeFileSync)((0, path_1.join)(srcDir, extra.filename), extra.content);
        }
    }
    // Compile with forge
    try {
        (0, child_process_1.execSync)("forge build", {
            cwd: tempDir,
            stdio: "pipe",
            timeout: 30000,
        });
    }
    catch (error) {
        var stderr = ((_a = error.stderr) === null || _a === void 0 ? void 0 : _a.toString()) || "";
        var stdout = ((_b = error.stdout) === null || _b === void 0 ? void 0 : _b.toString()) || "";
        throw new Error("Forge compilation failed:\n".concat(stderr, "\n").concat(stdout));
    }
    // Read the compiled artifact
    var artifactPath = (0, path_1.join)(tempDir, "out", "".concat(contractName, ".sol"), "".concat(contractName, ".json"));
    var artifact;
    try {
        artifact = JSON.parse((0, fs_1.readFileSync)(artifactPath, "utf-8"));
    }
    catch (_d) {
        throw new Error("Could not read compiled artifact at ".concat(artifactPath, ". Contract name may not match filename."));
    }
    return {
        abi: artifact.abi,
        bytecode: artifact.bytecode.object,
    };
}
