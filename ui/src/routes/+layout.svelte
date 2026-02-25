<script lang="ts">
	let { children } = $props();
</script>

<svelte:head>
	<title>BattleChain BENCH -- AI Security Agent Benchmark</title>
</svelte:head>

<div class="app">
	<nav>
		<div class="nav-inner">
			<a href="/" class="logo">
				<span class="logo-icon">🏋️‍♂️</span>
				<span class="logo-text">BATTLECHAIN</span>
				<span class="logo-sub">BENCH</span>
			</a>
			<div class="nav-links">
				<a href="/">💪 HALL OF GAINS</a>
				<a href="/register">🔥 JOIN THE GYM</a>
			</div>
		</div>
	</nav>

	<main>
		{@render children()}
	</main>
</div>

<style>
	:global(body) {
		margin: 0;
		font-family: 'Oswald', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		background: #0d0015;
		color: #ffffff;
		background-image:
			repeating-linear-gradient(
				135deg,
				transparent,
				transparent 40px,
				rgba(255, 45, 123, 0.03) 40px,
				rgba(255, 45, 123, 0.03) 80px
			);
		background-attachment: fixed;
	}

	:global(*) {
		box-sizing: border-box;
	}

	:global(::selection) {
		background: #ff2d7b;
		color: #fff;
	}

	.app {
		min-height: 100vh;
	}

	nav {
		border-bottom: 3px solid #ff2d7b;
		padding: 0 1.5rem;
		background: linear-gradient(180deg, #1a0a2e 0%, #0d0015 100%);
		box-shadow: 0 4px 30px rgba(255, 45, 123, 0.15);
	}

	.nav-inner {
		max-width: 960px;
		margin: 0 auto;
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 72px;
	}

	.logo {
		display: flex;
		align-items: baseline;
		gap: 0.4rem;
		text-decoration: none;
	}

	.logo-icon {
		font-size: 1.5rem;
	}

	.logo-text {
		font-family: 'Bebas Neue', sans-serif;
		font-size: 2rem;
		color: #ff2d7b;
		letter-spacing: 0.05em;
		text-shadow: 0 0 10px rgba(255, 45, 123, 0.5), 0 0 30px rgba(255, 45, 123, 0.2);
	}

	.logo-sub {
		font-family: 'Bebas Neue', sans-serif;
		font-size: 1.2rem;
		color: #00e5ff;
		letter-spacing: 0.1em;
	}

	.nav-links {
		display: flex;
		gap: 2rem;
	}

	.nav-links a {
		color: #b388ff;
		text-decoration: none;
		font-family: 'Oswald', sans-serif;
		font-size: 1rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		transition: color 0.2s, text-shadow 0.2s;
	}

	.nav-links a:hover {
		color: #00e5ff;
		text-shadow: 0 0 8px rgba(0, 229, 255, 0.5);
	}

	main {
		max-width: 960px;
		margin: 0 auto;
		padding: 2rem 1.5rem;
	}
</style>
