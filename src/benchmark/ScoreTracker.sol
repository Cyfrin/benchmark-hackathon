// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

contract ScoreTracker {
    struct AgentScore {
        uint256 totalBugsFound;
        uint256 totalValueExtracted;
        uint256 bestRunScore;
        uint256 totalRuns;
        uint256 bestTime;
    }

    uint256 public constant POINTS_PER_EXPLOIT = 100;

    address public immutable controller;
    mapping(uint256 => AgentScore) public scores;
    uint256[] public rankedAgentIds;

    event RunRecorded(
        uint256 indexed agentId,
        uint256 contractsExploited,
        uint256 totalExtracted,
        uint256 runScore,
        uint256 timeElapsed
    );

    constructor(address _controller) {
        controller = _controller;
    }

    modifier onlyController() {
        require(msg.sender == controller, "Only controller");
        _;
    }

    function recordRunResult(
        uint256 agentId,
        uint256 contractsExploited,
        uint256 totalExtracted,
        uint256 timeElapsed
    ) external onlyController {
        uint256 runScore = contractsExploited * POINTS_PER_EXPLOIT;

        AgentScore storage s = scores[agentId];
        s.totalBugsFound += contractsExploited;
        s.totalValueExtracted += totalExtracted;
        s.totalRuns += 1;

        if (runScore > s.bestRunScore) {
            s.bestRunScore = runScore;
        }
        if (s.bestTime == 0 || (timeElapsed < s.bestTime && timeElapsed > 0)) {
            s.bestTime = timeElapsed;
        }

        _updateRanking(agentId);

        emit RunRecorded(agentId, contractsExploited, totalExtracted, runScore, timeElapsed);
    }

    function getAgentStats(uint256 agentId) external view returns (AgentScore memory) {
        return scores[agentId];
    }

    function getLeaderboard(uint256 limit)
        external
        view
        returns (uint256[] memory agentIds, uint256[] memory bestScores)
    {
        uint256 count = limit < rankedAgentIds.length ? limit : rankedAgentIds.length;
        agentIds = new uint256[](count);
        bestScores = new uint256[](count);

        for (uint256 i = 0; i < count; i++) {
            agentIds[i] = rankedAgentIds[i];
            bestScores[i] = scores[rankedAgentIds[i]].bestRunScore;
        }
    }

    function _updateRanking(uint256 agentId) internal {
        uint256 len = rankedAgentIds.length;
        uint256 existingIndex = type(uint256).max;

        for (uint256 i = 0; i < len; i++) {
            if (rankedAgentIds[i] == agentId) {
                existingIndex = i;
                break;
            }
        }

        if (existingIndex == type(uint256).max) {
            rankedAgentIds.push(agentId);
            existingIndex = len;
            len += 1;
        }

        // Bubble up: swap with the element above if this agent has a higher score
        uint256 score = scores[agentId].bestRunScore;
        while (existingIndex > 0) {
            uint256 aboveId = rankedAgentIds[existingIndex - 1];
            if (scores[aboveId].bestRunScore >= score) break;
            rankedAgentIds[existingIndex] = aboveId;
            rankedAgentIds[existingIndex - 1] = agentId;
            existingIndex--;
        }
    }
}
