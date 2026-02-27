"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfig = loadConfig;
exports.getConfig = getConfig;
require("dotenv/config");
var child_process_1 = require("child_process");
function requireEnv(name) {
    var value = process.env[name];
    if (!value)
        throw new Error("Missing required env var: ".concat(name));
    return value;
}
function resolvePrivateKey() {
    var privateKey = process.env.PRIVATE_KEY;
    if (privateKey)
        return privateKey;
    var keystoreName = process.env.KEYSTORE_NAME;
    if (!keystoreName) {
        throw new Error("Must set either PRIVATE_KEY or KEYSTORE_NAME");
    }
    // Let cast handle its own password prompt via inherited stdio
    var key = (0, child_process_1.execSync)("cast wallet decrypt-keystore ".concat(keystoreName), { encoding: "utf-8", stdio: ["inherit", "pipe", "inherit"] }).trim();
    return key;
}
var baseConfig = {
    rpcUrl: requireEnv("RPC_URL"),
    explorerApiUrl: requireEnv("EXPLORER_API_URL"),
    agentRegistryAddress: requireEnv("AGENT_REGISTRY_ADDRESS"),
    benchmarkControllerAddress: requireEnv("BENCHMARK_CONTROLLER_ADDRESS"),
    scoreTrackerAddress: requireEnv("SCORE_TRACKER_ADDRESS"),
    openrouterApiKey: requireEnv("OPENROUTER_API_KEY"),
    llmModel: process.env.LLM_MODEL || "anthropic/claude-sonnet-4.6",
    chainId: parseInt(process.env.CHAIN_ID || "31337", 10),
};
var _config = null;
function loadConfig() {
    if (_config)
        return _config;
    var privateKey = resolvePrivateKey();
    _config = __assign(__assign({}, baseConfig), { privateKey: privateKey });
    return _config;
}
// Synchronous access after loadConfig() has been called
function getConfig() {
    if (!_config)
        throw new Error("Config not loaded. Call loadConfig() first.");
    return _config;
}
