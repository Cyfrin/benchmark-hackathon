import {
  createPublicClient,
  createWalletClient,
  http,
  defineChain,
} from "viem";
import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import { loadConfig } from "./config.js";

export let account: PrivateKeyAccount;
export let publicClient: ReturnType<typeof createPublicClient>;
export let walletClient: ReturnType<typeof createWalletClient>;
export let battlechain: ReturnType<typeof defineChain>;

export function initChain(): void {
  const config = loadConfig();

  battlechain = defineChain({
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

  account = privateKeyToAccount(config.privateKey);

  publicClient = createPublicClient({
    chain: battlechain,
    transport: http(config.rpcUrl),
  });

  walletClient = createWalletClient({
    account,
    chain: battlechain,
    transport: http(config.rpcUrl),
  });
}
