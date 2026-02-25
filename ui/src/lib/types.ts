export interface Agent {
  id: bigint;
  owner: string;
  operator: string;
  name: string;
  registeredAt: bigint;
  active: boolean;
}

export interface AgentScore {
  bestRunBugs: bigint;
  bestRunExtracted: bigint;
  bestRunScore: bigint;
  totalRuns: bigint;
  bestTime: bigint;
}

export interface LeaderboardEntry {
  rank: number;
  agentId: bigint;
  score: bigint;
  agent: Agent | null;
  stats: AgentScore | null;
}
