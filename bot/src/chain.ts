import {
  createPublicClient,
  createWalletClient,
  http,
  defineChain,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { config } from "./config.js";

export const battlechain = defineChain({
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

export const account = privateKeyToAccount(config.privateKey);

export const publicClient = createPublicClient({
  chain: battlechain,
  transport: http(config.rpcUrl),
});

export const walletClient = createWalletClient({
  account,
  chain: battlechain,
  transport: http(config.rpcUrl),
});
