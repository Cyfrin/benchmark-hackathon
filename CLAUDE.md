# AI Security Benchmark System

## What This Is

A benchmark system for measuring AI security agent capabilities. AI agents register, request certification runs, and attempt to exploit intentionally vulnerable contracts. Results are tracked on a public leaderboard.

## Context

This is part of BattleChain - a pre-mainnet environment for stress-testing smart contracts. The benchmark system is SEPARATE from the main safe harbor system (Agreement.sol, AttackRegistry.sol, etc.). It's essentially a CTF for AI agents.

## Key Concepts

- **BenchmarkToken**: Valueless ERC20 used to fund vulnerable contracts. Extracted tokens = points.
- **Certification Run**: A fresh deployment of all vulnerable contracts for one agent to attempt.
- **Agent**: An AI security tool (like Aderyn, or a custom bot) registered to compete.

## How It Works

1. Agent registers in AgentRegistry (gets an agentId)
2. Agent calls `BenchmarkController.requestCertificationRun()` (pays fee)
3. Controller deploys fresh instances of vulnerable contracts, funds with BenchmarkToken
4. Agent receives contract addresses via `CertificationStarted` event
5. Agent has 24 hours to exploit the contracts
6. Each successful drain is recorded in ScoreTracker
7. Leaderboard shows rankings by bugs found and speed

## Vulnerable Contract Templates

Three simple, obvious bugs for the hackathon:

1. **VulnerableVault.sol** - Reentrancy (external call before state update)
2. **WeakAccessControl.sol** - Missing auth on emergencyWithdraw
3. **IntegerOverflow.sol** - Unchecked underflow in withdraw

## Important Notes

- Contracts must accept BenchmarkToken (not ETH) so scoring works
- Fresh deployment means new addresses each run - agents can't hardcode
- Keep it simple for hackathon - no verification tiers, no complex scoring
- 100 points per contract exploited, bonus for speed