"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var viem_1 = require("viem");
var config_js_1 = require("./config.js");
var chain_js_1 = require("./chain.js");
var explorer_js_1 = require("./explorer.js");
var analyzer_js_1 = require("./analyzer.js");
var compiler_js_1 = require("./compiler.js");
var executor_js_1 = require("./executor.js");
// Import ABIs
var AgentRegistry_json_1 = require("./abi/AgentRegistry.json");
var BenchmarkController_json_1 = require("./abi/BenchmarkController.json");
var BenchmarkToken_json_1 = require("./abi/BenchmarkToken.json");
var ScoreTracker_json_1 = require("./abi/ScoreTracker.json");
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var agentId, _a, runId, contracts, tokenAddress, exploited, i, contractAddr, success, error_1, error_2, stats;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, (0, chain_js_1.initChain)()];
                case 1:
                    _b.sent();
                    console.log("=== BattleChain Hacker Bot ===\n");
                    console.log("Operator: ".concat(chain_js_1.account.address));
                    console.log("RPC: ".concat((0, config_js_1.getConfig)().rpcUrl, "\n"));
                    return [4 /*yield*/, registerAgent()];
                case 2:
                    agentId = _b.sent();
                    console.log("Agent ID: ".concat(agentId, "\n"));
                    return [4 /*yield*/, requestCertificationRun(agentId)];
                case 3:
                    _a = _b.sent(), runId = _a.runId, contracts = _a.contracts;
                    console.log("Run ID: ".concat(runId));
                    console.log("Deployed contracts: ".concat(contracts.length, "\n"));
                    return [4 /*yield*/, chain_js_1.publicClient.readContract({
                            address: (0, config_js_1.getConfig)().benchmarkControllerAddress,
                            abi: BenchmarkController_json_1.default,
                            functionName: "benchmarkToken",
                        })];
                case 4:
                    tokenAddress = _b.sent();
                    exploited = 0;
                    i = 0;
                    _b.label = 5;
                case 5:
                    if (!(i < contracts.length)) return [3 /*break*/, 10];
                    contractAddr = contracts[i];
                    console.log("\n--- Contract ".concat(i + 1, "/").concat(contracts.length, ": ").concat(contractAddr, " ---"));
                    _b.label = 6;
                case 6:
                    _b.trys.push([6, 8, , 9]);
                    return [4 /*yield*/, exploitContract(contractAddr, tokenAddress)];
                case 7:
                    success = _b.sent();
                    if (success) {
                        exploited++;
                        console.log("  Result: EXPLOITED");
                    }
                    else {
                        console.log("  Result: FAILED");
                    }
                    return [3 /*break*/, 9];
                case 8:
                    error_1 = _b.sent();
                    console.error("  Error: ".concat(error_1.message));
                    return [3 /*break*/, 9];
                case 9:
                    i++;
                    return [3 /*break*/, 5];
                case 10:
                    // Step 5: Complete the run
                    console.log("\n--- Completing Run ---");
                    _b.label = 11;
                case 11:
                    _b.trys.push([11, 13, , 14]);
                    return [4 /*yield*/, completeRun(runId)];
                case 12:
                    _b.sent();
                    return [3 /*break*/, 14];
                case 13:
                    error_2 = _b.sent();
                    console.log("  Could not complete run: ".concat(error_2.shortMessage || error_2.message));
                    return [3 /*break*/, 14];
                case 14: return [4 /*yield*/, chain_js_1.publicClient.readContract({
                        address: (0, config_js_1.getConfig)().scoreTrackerAddress,
                        abi: ScoreTracker_json_1.default,
                        functionName: "getAgentStats",
                        args: [BigInt(agentId)],
                    })];
                case 15:
                    stats = _b.sent();
                    console.log("\n=== Results ===");
                    console.log("Contracts exploited: ".concat(exploited, "/").concat(contracts.length));
                    console.log("Total bugs found: ".concat(stats.totalBugsFound));
                    console.log("Total value extracted: ".concat((0, viem_1.formatEther)(stats.totalValueExtracted), " BENCH"));
                    console.log("Best run score: ".concat(stats.bestRunScore));
                    console.log("Total runs: ".concat(stats.totalRuns));
                    return [2 /*return*/];
            }
        });
    });
}
function registerAgent() {
    return __awaiter(this, void 0, void 0, function () {
        var agent, _a, hash, receipt, event, logs;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, chain_js_1.publicClient.readContract({
                            address: (0, config_js_1.getConfig)().agentRegistryAddress,
                            abi: AgentRegistry_json_1.default,
                            functionName: "getAgentByOperator",
                            args: [chain_js_1.account.address],
                        })];
                case 1:
                    agent = _b.sent();
                    console.log("Agent already registered.");
                    return [2 /*return*/, agent.id];
                case 2:
                    _a = _b.sent();
                    return [3 /*break*/, 3];
                case 3:
                    console.log("Registering agent...");
                    return [4 /*yield*/, chain_js_1.walletClient.writeContract({
                            address: (0, config_js_1.getConfig)().agentRegistryAddress,
                            abi: AgentRegistry_json_1.default,
                            functionName: "registerAgent",
                            args: [chain_js_1.account.address, "BattleChain Hacker Bot"],
                            account: chain_js_1.account,
                        })];
                case 4:
                    hash = _b.sent();
                    return [4 /*yield*/, chain_js_1.publicClient.waitForTransactionReceipt({ hash: hash })];
                case 5:
                    receipt = _b.sent();
                    event = (0, viem_1.parseAbiItem)("event AgentRegistered(uint256 indexed agentId, address indexed owner, address indexed operator)");
                    return [4 /*yield*/, chain_js_1.publicClient.getContractEvents({
                            address: (0, config_js_1.getConfig)().agentRegistryAddress,
                            abi: [event],
                            fromBlock: receipt.blockNumber,
                            toBlock: receipt.blockNumber,
                        })];
                case 6:
                    logs = _b.sent();
                    return [2 /*return*/, logs[0].args.agentId];
            }
        });
    });
}
function requestCertificationRun(agentId) {
    return __awaiter(this, void 0, void 0, function () {
        var fee, hash, receipt, event, logs, args;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("Requesting certification run...");
                    return [4 /*yield*/, chain_js_1.publicClient.readContract({
                            address: (0, config_js_1.getConfig)().benchmarkControllerAddress,
                            abi: BenchmarkController_json_1.default,
                            functionName: "certificationFee",
                        })];
                case 1:
                    fee = _a.sent();
                    return [4 /*yield*/, chain_js_1.walletClient.writeContract({
                            address: (0, config_js_1.getConfig)().benchmarkControllerAddress,
                            abi: BenchmarkController_json_1.default,
                            functionName: "requestCertificationRun",
                            args: [agentId],
                            value: fee,
                            account: chain_js_1.account,
                        })];
                case 2:
                    hash = _a.sent();
                    return [4 /*yield*/, chain_js_1.publicClient.waitForTransactionReceipt({ hash: hash })];
                case 3:
                    receipt = _a.sent();
                    event = (0, viem_1.parseAbiItem)("event CertificationStarted(uint256 indexed runId, uint256 indexed agentId, address[] deployedContracts)");
                    return [4 /*yield*/, chain_js_1.publicClient.getContractEvents({
                            address: (0, config_js_1.getConfig)().benchmarkControllerAddress,
                            abi: [event],
                            fromBlock: receipt.blockNumber,
                            toBlock: receipt.blockNumber,
                        })];
                case 4:
                    logs = _a.sent();
                    args = logs[0].args;
                    return [2 /*return*/, { runId: args.runId, contracts: args.deployedContracts }];
            }
        });
    });
}
function exploitContract(contractAddress, tokenAddress) {
    return __awaiter(this, void 0, void 0, function () {
        var verified, tokenBalance, seedBalance, plan, compiled, nameMatch, exploitName, targetAbi, result, remainingBalance;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    // 1. Fetch verified source code
                    console.log("  Fetching verified source code...");
                    return [4 /*yield*/, (0, explorer_js_1.getVerifiedSource)(contractAddress)];
                case 1:
                    verified = _a.sent();
                    console.log("  Contract: ".concat(verified.contractName));
                    return [4 /*yield*/, chain_js_1.publicClient.readContract({
                            address: tokenAddress,
                            abi: BenchmarkToken_json_1.default,
                            functionName: "balanceOf",
                            args: [contractAddress],
                        })];
                case 2:
                    tokenBalance = _a.sent();
                    return [4 /*yield*/, chain_js_1.publicClient.readContract({
                            address: tokenAddress,
                            abi: BenchmarkToken_json_1.default,
                            functionName: "balanceOf",
                            args: [chain_js_1.account.address],
                        })];
                case 3:
                    seedBalance = _a.sent();
                    console.log("  Contract token balance: ".concat((0, viem_1.formatEther)(tokenBalance), " BENCH"));
                    console.log("  Operator seed balance: ".concat((0, viem_1.formatEther)(seedBalance), " BENCH"));
                    if (tokenBalance === 0n) {
                        console.log("  Contract already drained, skipping.");
                        return [2 /*return*/, false];
                    }
                    // 3. Analyze with Claude
                    console.log("  Analyzing with Claude...");
                    return [4 /*yield*/, (0, analyzer_js_1.analyzeContract)(verified.sourceCode, verified.contractName, contractAddress, tokenBalance.toString(), seedBalance.toString())];
                case 4:
                    plan = _a.sent();
                    console.log("  Vulnerability: ".concat(plan.vulnerability));
                    console.log("  Description: ".concat(plan.description));
                    compiled = null;
                    if (plan.exploitContract) {
                        console.log("  Compiling exploit contract...");
                        nameMatch = plan.exploitContract.match(/contract\s+(\w+)/);
                        exploitName = nameMatch ? nameMatch[1] : "Exploit";
                        // Include the target contract source so exploit can import it by name
                        compiled = (0, compiler_js_1.compileSolidity)(plan.exploitContract, exploitName, [
                            { filename: "".concat(verified.contractName, ".sol"), content: verified.sourceCode },
                        ]);
                        console.log("  Compiled: ".concat(exploitName));
                    }
                    // 5. Execute exploit
                    console.log("  Executing exploit...");
                    targetAbi = JSON.parse(verified.abi);
                    return [4 /*yield*/, (0, executor_js_1.executeExploit)(plan, contractAddress, targetAbi, compiled, chain_js_1.account.address, tokenBalance, seedBalance, tokenAddress, BenchmarkToken_json_1.default)];
                case 5:
                    result = _a.sent();
                    return [4 /*yield*/, chain_js_1.publicClient.readContract({
                            address: tokenAddress,
                            abi: BenchmarkToken_json_1.default,
                            functionName: "balanceOf",
                            args: [contractAddress],
                        })];
                case 6:
                    remainingBalance = _a.sent();
                    console.log("  Remaining balance: ".concat((0, viem_1.formatEther)(remainingBalance), " BENCH"));
                    return [2 /*return*/, remainingBalance < tokenBalance];
            }
        });
    });
}
function completeRun(runId) {
    return __awaiter(this, void 0, void 0, function () {
        var hash;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, chain_js_1.walletClient.writeContract({
                        address: (0, config_js_1.getConfig)().benchmarkControllerAddress,
                        abi: BenchmarkController_json_1.default,
                        functionName: "completeRun",
                        args: [runId],
                        account: chain_js_1.account,
                    })];
                case 1:
                    hash = _a.sent();
                    return [4 /*yield*/, chain_js_1.publicClient.waitForTransactionReceipt({ hash: hash })];
                case 2:
                    _a.sent();
                    console.log("Run completed.");
                    return [2 /*return*/];
            }
        });
    });
}
main().catch(function (error) {
    console.error("Fatal error:", error);
    process.exit(1);
});
