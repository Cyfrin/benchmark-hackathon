// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

contract AgentRegistry {
    struct Agent {
        uint256 id;
        address owner;
        address operator;
        string name;
        uint256 registeredAt;
        bool active;
    }

    uint256 public nextAgentId = 1;
    mapping(uint256 => Agent) public agents;
    mapping(address => uint256) public operatorToAgentId;

    event AgentRegistered(uint256 indexed agentId, address indexed owner, address indexed operator);
    event AgentDeactivated(uint256 indexed agentId);

    function registerAgent(address operator, string calldata name) external returns (uint256 agentId) {
        require(operatorToAgentId[operator] == 0, "Operator already registered");

        agentId = nextAgentId++;
        agents[agentId] = Agent({
            id: agentId,
            owner: msg.sender,
            operator: operator,
            name: name,
            registeredAt: block.timestamp,
            active: true
        });
        operatorToAgentId[operator] = agentId;

        emit AgentRegistered(agentId, msg.sender, operator);
    }

    function deactivateAgent(uint256 agentId) external {
        Agent storage agent = agents[agentId];
        require(agent.id != 0, "Agent does not exist");
        require(msg.sender == agent.owner, "Not agent owner");
        require(agent.active, "Already deactivated");

        agent.active = false;
        emit AgentDeactivated(agentId);
    }

    function getAgent(uint256 agentId) external view returns (Agent memory) {
        require(agents[agentId].id != 0, "Agent does not exist");
        return agents[agentId];
    }

    function getAgentByOperator(address operator) external view returns (Agent memory) {
        uint256 agentId = operatorToAgentId[operator];
        require(agentId != 0, "No agent for operator");
        return agents[agentId];
    }
}
