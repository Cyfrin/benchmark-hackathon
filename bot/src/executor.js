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
exports.executeExploit = executeExploit;
var chain_js_1 = require("./chain.js");
/**
 * Executes an exploit plan against a target contract.
 * Handles both deploying exploit contracts and making direct calls.
 */
function executeExploit(plan, targetAddress, targetAbi, compiled, operatorAddress, tokenBalance, seedBalance, tokenAddress, tokenAbi) {
    return __awaiter(this, void 0, void 0, function () {
        var txHashes, exploitAddress, _i, _a, step, hash, receipt, target, abi, resolvedArgs, hash;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    txHashes = [];
                    exploitAddress = null;
                    _i = 0, _a = plan.exploitSteps;
                    _b.label = 1;
                case 1:
                    if (!(_i < _a.length)) return [3 /*break*/, 8];
                    step = _a[_i];
                    console.log("  Step: ".concat(step.description));
                    if (!(step.type === "deploy_contract" && compiled)) return [3 /*break*/, 4];
                    return [4 /*yield*/, chain_js_1.walletClient.deployContract({
                            abi: compiled.abi,
                            bytecode: compiled.bytecode,
                            args: resolveArgs(step.args, targetAddress, exploitAddress, operatorAddress, tokenBalance, seedBalance, tokenAddress),
                            account: chain_js_1.account,
                        })];
                case 2:
                    hash = _b.sent();
                    txHashes.push(hash);
                    return [4 /*yield*/, chain_js_1.publicClient.waitForTransactionReceipt({ hash: hash })];
                case 3:
                    receipt = _b.sent();
                    exploitAddress = receipt.contractAddress;
                    console.log("  Deployed exploit contract at: ".concat(exploitAddress));
                    return [3 /*break*/, 7];
                case 4:
                    if (!(step.type === "call_function")) return [3 /*break*/, 7];
                    target = void 0;
                    abi = void 0;
                    if (step.target === "EXPLOIT") {
                        target = exploitAddress;
                        abi = compiled.abi;
                    }
                    else if (step.target === "TOKEN") {
                        target = tokenAddress;
                        abi = tokenAbi;
                    }
                    else {
                        target = targetAddress;
                        abi = targetAbi;
                    }
                    resolvedArgs = resolveArgs(step.args, targetAddress, exploitAddress, operatorAddress, tokenBalance, seedBalance, tokenAddress);
                    return [4 /*yield*/, chain_js_1.walletClient.writeContract({
                            address: target,
                            abi: abi,
                            functionName: step.functionName,
                            args: resolvedArgs,
                            account: chain_js_1.account,
                        })];
                case 5:
                    hash = _b.sent();
                    txHashes.push(hash);
                    return [4 /*yield*/, chain_js_1.publicClient.waitForTransactionReceipt({ hash: hash })];
                case 6:
                    _b.sent();
                    console.log("  Called ".concat(step.functionName, " on ").concat(target));
                    _b.label = 7;
                case 7:
                    _i++;
                    return [3 /*break*/, 1];
                case 8: return [2 /*return*/, { success: true, txHashes: txHashes }];
            }
        });
    });
}
function resolveArgs(args, targetAddress, exploitAddress, operatorAddress, tokenBalance, seedBalance, tokenAddress) {
    return args.map(function (arg) {
        if (arg === "OPERATOR_ADDRESS")
            return operatorAddress;
        if (arg === "TARGET_ADDRESS")
            return targetAddress;
        if (arg === "EXPLOIT_ADDRESS")
            return exploitAddress;
        if (arg === "TOKEN_ADDRESS")
            return tokenAddress;
        if (arg === "TOKEN_BALANCE")
            return tokenBalance;
        if (arg === "SEED_BALANCE")
            return seedBalance;
        // Try to parse as BigInt if it looks like a number
        if (/^\d+$/.test(arg))
            return BigInt(arg);
        return arg;
    });
}
