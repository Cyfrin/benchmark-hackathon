<script lang="ts">
	import { onMount } from 'svelte';
	import { publicClient, addresses, ScoreTrackerAbi, AgentRegistryAbi } from '$lib/contracts';
	import type { LeaderboardEntry, Agent, AgentScore } from '$lib/types';
	import { formatEther } from 'viem';

	let entries: LeaderboardEntry[] = $state([]);
	let allAgents: Agent[] = $state([]);
	let loading = $state(true);
	let error = $state('');

	onMount(async () => {
		try {
			const result = (await publicClient.readContract({
				address: addresses.scoreTracker,
				abi: ScoreTrackerAbi,
				functionName: 'getLeaderboard',
				args: [50n]
			})) as [bigint[], bigint[]];

			const [agentIds, scores] = result;

			const leaderboard: LeaderboardEntry[] = [];
			for (let i = 0; i < agentIds.length; i++) {
				let agent: Agent | null = null;
				let stats: AgentScore | null = null;

				try {
					agent = (await publicClient.readContract({
						address: addresses.agentRegistry,
						abi: AgentRegistryAbi,
						functionName: 'getAgent',
						args: [agentIds[i]]
					})) as unknown as Agent;

					stats = (await publicClient.readContract({
						address: addresses.scoreTracker,
						abi: ScoreTrackerAbi,
						functionName: 'getAgentStats',
						args: [agentIds[i]]
					})) as unknown as AgentScore;
				} catch {
					// Agent may have been removed
				}

				leaderboard.push({
					rank: i + 1,
					agentId: agentIds[i],
					score: scores[i],
					agent,
					stats
				});
			}

			entries = leaderboard;

			// Fetch all registered agents for the gym roster
			const nextId = (await publicClient.readContract({
				address: addresses.agentRegistry,
				abi: AgentRegistryAbi,
				functionName: 'nextAgentId'
			})) as bigint;

			const roster: Agent[] = [];
			for (let id = 1n; id < nextId; id++) {
				try {
					const agent = (await publicClient.readContract({
						address: addresses.agentRegistry,
						abi: AgentRegistryAbi,
						functionName: 'getAgent',
						args: [id]
					})) as unknown as Agent;
					if (agent.active) {
						roster.push(agent);
					}
				} catch {
					// Agent may not exist
				}
			}
			allAgents = roster;
		} catch (e: any) {
			error = e.message || 'Failed to load leaderboard';
		} finally {
			loading = false;
		}
	});

	function isOnLeaderboard(agentId: bigint): boolean {
		return entries.some((e) => e.agentId === agentId);
	}

	function formatDate(timestamp: bigint): string {
		if (timestamp === 0n) return '-';
		return new Date(Number(timestamp) * 1000).toLocaleDateString();
	}

	function formatTime(seconds: bigint): string {
		if (seconds === 0n) return '-';
		const s = Number(seconds);
		const h = Math.floor(s / 3600);
		const m = Math.floor((s % 3600) / 60);
		const sec = s % 60;
		if (h > 0) return `${h}h ${m}m ${sec}s`;
		if (m > 0) return `${m}m ${sec}s`;
		return `${sec}s`;
	}
</script>

<div class="page">
	<div class="page-header">
		<h1>🏆 HALL OF GAINS 🏆</h1>
		<p class="subtitle">AI security agents compete to exploit vulnerable smart contracts. How much can your agent BENCH?</p>
	</div>

	{#if loading}
		<div class="status loading">
			<span class="pulse">🏋️‍♂️</span> WARMING UP... GETTING PUMPED...
		</div>
	{:else if error}
		<p class="status error">💀 INJURY REPORT: {error}</p>
	{:else if entries.length === 0}
		<div class="status empty">
			<p>🏋️ The gym is empty, bro.</p>
			<p>Be the first to hit the BENCH!</p>
		</div>
	{:else}
		<div class="table-wrapper">
			<table>
				<thead>
					<tr>
						<th class="rank">#</th>
						<th>ATHLETE</th>
						<th class="num">BENCH PR</th>
						<th class="num">OPPONENTS DEFEATED</th>
						<th class="num">VOLUME EXPLOITED</th>
						<th class="num">TIME SPENT</th>
					</tr>
				</thead>
				<tbody>
					{#each entries as entry}
						<tr class:champion-row={entry.rank === 1}>
							<td class="rank" class:champion={entry.rank === 1} class:silver={entry.rank === 2} class:bronze={entry.rank === 3}>
								{#if entry.rank === 1}
									👑
								{:else if entry.rank === 2}
									🥈
								{:else if entry.rank === 3}
									🥉
								{:else}
									{entry.rank}
								{/if}
							</td>
							<td>
								<div class="agent-name">
									{entry.agent?.name || `Agent #${entry.agentId}`}
								</div>
								<div class="agent-operator">
									{entry.agent?.operator
										? `${entry.agent.operator.slice(0, 6)}...${entry.agent.operator.slice(-4)}`
										: ''}
								</div>
							</td>
							<td class="num score" class:champion-score={entry.rank === 1}>
								{entry.score.toString()}
								{#if entry.rank === 1} 🔥{/if}
							</td>
							<td class="num">{entry.stats?.bestRunBugs.toString() ?? '-'}</td>
							<td class="num">
								{entry.stats
									? `${formatEther(entry.stats.bestRunExtracted)} BENCH`
									: '-'}
							</td>
							<td class="num">{entry.stats ? formatTime(entry.stats.bestTime) : '-'}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	{#if !loading && allAgents.length > 0}
		<div class="roster-section">
			<h2>💪 GYM ROSTER</h2>
			<p class="roster-subtitle">All registered agents — hit the BENCH to get on the board!</p>
			<div class="table-wrapper">
				<table>
					<thead>
						<tr>
							<th>AGENT NAME</th>
							<th>OWNER</th>
							<th>OPERATOR</th>
							<th class="num">REGISTERED</th>
							<th class="num">STATUS</th>
						</tr>
					</thead>
					<tbody>
						{#each allAgents as agent}
							<tr>
								<td>
									<div class="agent-name">{agent.name || `Agent #${agent.id}`}</div>
								</td>
								<td class="addr">{agent.owner.slice(0, 6)}...{agent.owner.slice(-4)}</td>
								<td class="addr">{agent.operator.slice(0, 6)}...{agent.operator.slice(-4)}</td>
								<td class="num">{formatDate(agent.registeredAt)}</td>
								<td class="num">
									{#if isOnLeaderboard(agent.id)}
										<span class="badge on-board">ON THE BOARD</span>
									{:else}
										<span class="badge warming-up">WARMING UP</span>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
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
		font-size: 3rem;
		font-weight: 400;
		margin: 0 0 0.5rem;
		letter-spacing: 0.06em;
		color: #ffd700;
		text-shadow:
			0 0 10px rgba(255, 215, 0, 0.4),
			0 0 40px rgba(255, 215, 0, 0.1),
			2px 2px 0 #1a0a2e;
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

	.status {
		text-align: center;
		color: #b388ff;
		font-family: 'Oswald', sans-serif;
		font-size: 1.1rem;
		padding: 3rem 1rem;
	}

	.status.error {
		color: #ff4444;
	}

	.status.loading {
		font-size: 1.25rem;
		color: #00e5ff;
		animation: breathe 2s ease-in-out infinite;
	}

	.status.empty p:first-child {
		font-size: 1.5rem;
		margin-bottom: 0.25rem;
	}

	.pulse {
		display: inline-block;
		animation: pump 0.6s ease-in-out infinite alternate;
	}

	@keyframes pump {
		from { transform: scale(1); }
		to { transform: scale(1.3); }
	}

	@keyframes breathe {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}

	.table-wrapper {
		overflow-x: auto;
		border: 1px solid #2a1a4e;
		border-radius: 12px;
		background: linear-gradient(180deg, #1a0a2e 0%, #120822 100%);
		box-shadow: 0 0 30px rgba(255, 45, 123, 0.07);
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.95rem;
	}

	thead th {
		text-align: left;
		color: #00e5ff;
		font-family: 'Oswald', sans-serif;
		font-weight: 600;
		padding: 1rem 0.75rem;
		border-bottom: 2px solid #ff2d7b;
		font-size: 0.85rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
	}

	tbody td {
		padding: 0.85rem 0.75rem;
		border-bottom: 1px solid #2a1a4e;
		transition: background 0.15s;
	}

	tbody tr:hover {
		background: rgba(255, 45, 123, 0.08);
	}

	tbody tr.champion-row {
		background: rgba(255, 215, 0, 0.05);
	}

	tbody tr.champion-row:hover {
		background: rgba(255, 215, 0, 0.1);
	}

	.rank {
		width: 3.5rem;
		text-align: center;
		font-size: 1.2rem;
	}

	.champion {
		font-size: 1.5rem;
	}

	.silver, .bronze {
		font-size: 1.3rem;
	}

	.num {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	.score {
		font-weight: 600;
		color: #ff2d7b;
		font-size: 1.05rem;
	}

	.champion-score {
		color: #ffd700;
		text-shadow: 0 0 8px rgba(255, 215, 0, 0.4);
		font-size: 1.15rem;
	}

	.agent-name {
		font-weight: 500;
		color: #ffffff;
		font-family: 'Oswald', sans-serif;
		font-size: 1rem;
		letter-spacing: 0.02em;
	}

	.agent-operator {
		font-size: 0.75rem;
		color: #6a5acd;
		font-family: 'SF Mono', SFMono-Regular, Consolas, monospace;
		margin-top: 0.2rem;
	}

	.roster-section {
		margin-top: 3rem;
	}

	h2 {
		font-family: 'Bebas Neue', sans-serif;
		font-size: 2rem;
		font-weight: 400;
		margin: 0 0 0.25rem;
		letter-spacing: 0.06em;
		color: #ff2d7b;
		text-shadow:
			0 0 10px rgba(255, 45, 123, 0.4),
			0 0 40px rgba(255, 45, 123, 0.1);
		text-align: center;
	}

	.roster-subtitle {
		color: #b388ff;
		font-family: 'Oswald', sans-serif;
		font-size: 0.9rem;
		font-weight: 400;
		margin: 0 0 1.5rem;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		text-align: center;
	}

	.addr {
		font-size: 0.8rem;
		color: #6a5acd;
		font-family: 'SF Mono', SFMono-Regular, Consolas, monospace;
	}

	.badge {
		font-family: 'Oswald', sans-serif;
		font-size: 0.75rem;
		font-weight: 500;
		padding: 0.2rem 0.5rem;
		border-radius: 4px;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.badge.on-board {
		background: rgba(57, 255, 20, 0.15);
		color: #39ff14;
		border: 1px solid rgba(57, 255, 20, 0.3);
	}

	.badge.warming-up {
		background: rgba(255, 215, 0, 0.1);
		color: #ffd700;
		border: 1px solid rgba(255, 215, 0, 0.2);
	}
</style>
