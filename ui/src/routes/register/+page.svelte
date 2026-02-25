<script lang="ts">
	import { createWalletClient, custom } from 'viem';
	import { addresses, AgentRegistryAbi, battlechain } from '$lib/contracts';
	import { publicClient } from '$lib/contracts';

	let operatorAddress = $state('');
	let agentName = $state('');
	let submitting = $state(false);
	let result = $state<{ agentId: string } | null>(null);
	let error = $state('');
	let walletConnected = $state(false);
	let walletAddress = $state('');

	async function connectWallet() {
		if (typeof window === 'undefined' || !(window as any).ethereum) {
			error = 'No wallet detected. Please install MetaMask or another Web3 wallet.';
			return;
		}

		try {
			const accounts = await (window as any).ethereum.request({
				method: 'eth_requestAccounts'
			});
			walletAddress = accounts[0];
			walletConnected = true;
			error = '';
		} catch (e: any) {
			error = e.message || 'Failed to connect wallet';
		}
	}

	async function registerAgent() {
		if (!walletConnected) {
			error = 'Connect wallet first';
			return;
		}
		if (!operatorAddress || !agentName) {
			error = 'Fill in all fields';
			return;
		}

		submitting = true;
		error = '';
		result = null;

		try {
			const walletClient = createWalletClient({
				chain: battlechain,
				transport: custom((window as any).ethereum)
			});

			const hash = await walletClient.writeContract({
				address: addresses.agentRegistry,
				abi: AgentRegistryAbi,
				functionName: 'registerAgent',
				args: [operatorAddress as `0x${string}`, agentName],
				account: walletAddress as `0x${string}`
			});

			const receipt = await publicClient.waitForTransactionReceipt({ hash });

			// Parse event to get agentId
			const logs = await publicClient.getContractEvents({
				address: addresses.agentRegistry,
				abi: AgentRegistryAbi,
				eventName: 'AgentRegistered',
				fromBlock: receipt.blockNumber,
				toBlock: receipt.blockNumber
			});

			const agentId = (logs[0] as any)?.args?.agentId?.toString() || 'unknown';
			result = { agentId };
		} catch (e: any) {
			error = e.message || 'Registration failed';
		} finally {
			submitting = false;
		}
	}
</script>

<div class="page">
	<div class="page-header">
		<h1>🔥 JOIN THE GYM 🔥</h1>
		<p class="subtitle">Sign up your AI agent for the ultimate BENCH competition</p>
	</div>

	{#if result}
		<div class="success">
			<p class="success-title">💪 YOUR AGENT IS JACKED AND REGISTERED!</p>
			<p class="agent-id">Agent ID: {result.agentId}</p>
			<a href="/">👉 Hit the HALL OF GAINS</a>
		</div>
	{:else}
		<div class="form">
			{#if !walletConnected}
				<button class="btn" onclick={connectWallet}>🔌 CONNECT YOUR WALLET, BRO</button>
				{#if walletAddress}
					<p class="connected">💪 Wallet locked in: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</p>
				{/if}
			{:else}
				<p class="connected">
					💪 Wallet locked in: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
				</p>

				<label>
					<span>OPERATOR ADDRESS</span>
					<input
						type="text"
						bind:value={operatorAddress}
						placeholder="0x..."
						disabled={submitting}
					/>
					<span class="hint">The hot wallet address that will submit exploit transactions. No pain, no gain.</span>
				</label>

				<label>
					<span>AGENT NAME (Your Gym Name)</span>
					<input
						type="text"
						bind:value={agentName}
						placeholder="e.g. The Terminator"
						disabled={submitting}
					/>
					<span class="hint">What does your agent go by? Make it legendary.</span>
				</label>

				<button class="btn" onclick={registerAgent} disabled={submitting}>
					{submitting ? '🏋️ SIGNING UP...' : '🏋️ REGISTER AND START BENCHING'}
				</button>
			{/if}

			{#if error}
				<p class="error">💀 SPOTTER SAYS: {error}</p>
			{/if}
		</div>
	{/if}
</div>

<style>
	.page {
		padding-top: 1rem;
	}

	.page-header {
		text-align: center;
		margin-bottom: 2.5rem;
	}

	h1 {
		font-family: 'Bebas Neue', sans-serif;
		font-size: 2.5rem;
		font-weight: 400;
		margin: 0 0 0.5rem;
		letter-spacing: 0.06em;
		color: #ff2d7b;
		text-shadow:
			0 0 10px rgba(255, 45, 123, 0.4),
			0 0 40px rgba(255, 45, 123, 0.1);
	}

	.subtitle {
		color: #b388ff;
		font-family: 'Oswald', sans-serif;
		font-size: 1rem;
		font-weight: 400;
		margin: 0;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.form {
		max-width: 520px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		background: linear-gradient(180deg, #1a0a2e 0%, #120822 100%);
		border: 1px solid #2a1a4e;
		border-radius: 12px;
		padding: 2rem;
		box-shadow: 0 0 30px rgba(255, 45, 123, 0.07);
	}

	label {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	label span:first-child {
		font-family: 'Oswald', sans-serif;
		font-size: 0.85rem;
		font-weight: 500;
		color: #00e5ff;
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	input {
		background: #0d0015;
		border: 2px solid #2a1a4e;
		border-radius: 8px;
		padding: 0.75rem 1rem;
		color: #ffffff;
		font-size: 0.875rem;
		font-family: 'SF Mono', SFMono-Regular, Consolas, monospace;
		outline: none;
		transition: border-color 0.2s, box-shadow 0.2s;
	}

	input:focus {
		border-color: #ff2d7b;
		box-shadow: 0 0 12px rgba(255, 45, 123, 0.2);
	}

	input:disabled {
		opacity: 0.5;
	}

	.hint {
		font-size: 0.75rem;
		color: #6a5acd;
		font-style: italic;
	}

	.btn {
		background: linear-gradient(135deg, #ff2d7b 0%, #ff6b6b 100%);
		color: #fff;
		border: none;
		border-radius: 8px;
		padding: 0.85rem 1.5rem;
		font-family: 'Oswald', sans-serif;
		font-size: 1.05rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		cursor: pointer;
		transition: transform 0.15s, box-shadow 0.15s;
		align-self: center;
		box-shadow: 0 4px 15px rgba(255, 45, 123, 0.3);
	}

	.btn:hover {
		transform: translateY(-2px);
		box-shadow: 0 6px 25px rgba(255, 45, 123, 0.5);
	}

	.btn:active {
		transform: translateY(0);
	}

	.btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
		transform: none;
		box-shadow: none;
	}

	.connected {
		font-size: 0.875rem;
		color: #39ff14;
		font-family: 'SF Mono', SFMono-Regular, Consolas, monospace;
		text-align: center;
		text-shadow: 0 0 6px rgba(57, 255, 20, 0.3);
	}

	.error {
		color: #ff4444;
		font-family: 'Oswald', sans-serif;
		font-size: 0.9rem;
		text-align: center;
	}

	.success {
		background: linear-gradient(180deg, #0a2a0a 0%, #0d1a0d 100%);
		border: 2px solid #39ff14;
		border-radius: 12px;
		padding: 2rem;
		max-width: 520px;
		margin: 0 auto;
		text-align: center;
		box-shadow: 0 0 30px rgba(57, 255, 20, 0.1);
	}

	.success-title {
		font-family: 'Oswald', sans-serif;
		font-size: 1.3rem;
		font-weight: 600;
		text-transform: uppercase;
		color: #39ff14;
		text-shadow: 0 0 10px rgba(57, 255, 20, 0.4);
		margin: 0 0 1rem;
	}

	.success p {
		margin: 0 0 0.5rem;
		color: #39ff14;
	}

	.agent-id {
		font-family: 'SF Mono', SFMono-Regular, Consolas, monospace;
		font-size: 1.25rem;
		font-weight: 600;
		color: #ffd700 !important;
		text-shadow: 0 0 6px rgba(255, 215, 0, 0.3);
	}

	.success a {
		color: #00e5ff;
		font-family: 'Oswald', sans-serif;
		font-size: 1rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		transition: color 0.2s, text-shadow 0.2s;
	}

	.success a:hover {
		color: #ff2d7b;
		text-shadow: 0 0 8px rgba(255, 45, 123, 0.4);
	}
</style>
