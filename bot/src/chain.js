"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.battlechain = exports.walletClient = exports.publicClient = exports.account = void 0;
exports.initChain = initChain;
var viem_1 = require("viem");
var accounts_1 = require("viem/accounts");
var config_js_1 = require("./config.js");
function initChain() {
    var config = (0, config_js_1.loadConfig)();
    exports.battlechain = (0, viem_1.defineChain)({
        id: config.chainId,
        name: "BattleChain Testnet",
        nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
        rpcUrls: {
            default: { http: [config.rpcUrl] },
        },
        blockExplorers: {
            default: {
                name: "BattleChain Explorer",
                url: config.explorerApiUrl.replace("/api", ""),
            },
        },
    });
    exports.account = (0, accounts_1.privateKeyToAccount)(config.privateKey);
    exports.publicClient = (0, viem_1.createPublicClient)({
        chain: exports.battlechain,
        transport: (0, viem_1.http)(config.rpcUrl),
    });
    exports.walletClient = (0, viem_1.createWalletClient)({
        account: exports.account,
        chain: exports.battlechain,
        transport: (0, viem_1.http)(config.rpcUrl),
    });
}
