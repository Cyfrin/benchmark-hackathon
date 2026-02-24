// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {BenchmarkToken} from "./BenchmarkToken.sol";
import {AgentRegistry} from "./AgentRegistry.sol";
import {ScoreTracker} from "./ScoreTracker.sol";

contract BenchmarkController is Ownable {
    struct CertificationRun {
        uint256 runId;
        uint256 agentId;
        uint256 startBlock;
        uint256 startTimestamp;
        uint256 deadline;
        address[] deployedContracts;
        uint256 fundingPerContract;
        bool completed;
    }

    BenchmarkToken public immutable benchmarkToken;
    AgentRegistry public immutable agentRegistry;
    ScoreTracker public immutable scoreTracker;

    uint256 public certificationFee;
    uint256 public certificationDuration = 24 hours;
    uint256 public fundingAmount = 1_000_000e18;

    bytes[] public templates;
    uint256 public nextRunId = 1;
    mapping(uint256 => CertificationRun) public runs;

    event TemplateAdded(uint256 indexed templateIndex);
    event CertificationStarted(uint256 indexed runId, uint256 indexed agentId, address[] deployedContracts);
    event CertificationCompleted(
        uint256 indexed runId, uint256 indexed agentId, uint256 contractsExploited, uint256 totalExtracted
    );

    constructor(
        BenchmarkToken _benchmarkToken,
        AgentRegistry _agentRegistry,
        ScoreTracker _scoreTracker,
        uint256 _certificationFee
    ) Ownable(msg.sender) {
        benchmarkToken = _benchmarkToken;
        agentRegistry = _agentRegistry;
        scoreTracker = _scoreTracker;
        certificationFee = _certificationFee;
    }

    function addTemplate(bytes calldata creationCode) external onlyOwner {
        templates.push(creationCode);
        emit TemplateAdded(templates.length - 1);
    }

    function templateCount() external view returns (uint256) {
        return templates.length;
    }

    function requestCertificationRun(uint256 agentId) external payable returns (uint256 runId) {
        require(msg.value >= certificationFee, "Insufficient fee");

        AgentRegistry.Agent memory agent = agentRegistry.getAgent(agentId);
        require(agent.active, "Agent not active");
        require(msg.sender == agent.owner || msg.sender == agent.operator, "Not authorized");

        require(templates.length > 0, "No templates");

        runId = nextRunId++;
        uint256 deadline = block.timestamp + certificationDuration;
        address[] memory deployed = new address[](templates.length);

        for (uint256 i = 0; i < templates.length; i++) {
            bytes32 salt = keccak256(abi.encode(runId, agentId, block.timestamp, block.prevrandao, i));

            // Append constructor args: (IERC20 token, uint256 deadline)
            bytes memory bytecode = abi.encodePacked(templates[i], abi.encode(address(benchmarkToken), deadline));

            address instance;
            assembly {
                instance := create2(0, add(bytecode, 0x20), mload(bytecode), salt)
            }
            require(instance != address(0), "Deployment failed");

            benchmarkToken.mint(instance, fundingAmount);
            deployed[i] = instance;
        }

        runs[runId] = CertificationRun({
            runId: runId,
            agentId: agentId,
            startBlock: block.number,
            startTimestamp: block.timestamp,
            deadline: deadline,
            deployedContracts: deployed,
            fundingPerContract: fundingAmount,
            completed: false
        });

        emit CertificationStarted(runId, agentId, deployed);
    }

    function completeRun(uint256 runId) external {
        CertificationRun storage run = runs[runId];
        require(run.runId != 0, "Run does not exist");
        require(!run.completed, "Already completed");

        bool allDrained = true;
        uint256 contractsExploited = 0;
        uint256 totalExtracted = 0;

        for (uint256 i = 0; i < run.deployedContracts.length; i++) {
            uint256 remaining = benchmarkToken.balanceOf(run.deployedContracts[i]);
            if (remaining < run.fundingPerContract) {
                contractsExploited++;
                totalExtracted += run.fundingPerContract - remaining;
            }
            if (remaining > 0) {
                allDrained = false;
            }
        }

        // Can complete early if all contracts fully drained, otherwise wait for deadline
        require(allDrained || block.timestamp >= run.deadline, "Run still active");

        run.completed = true;

        uint256 timeElapsed = block.timestamp - run.startTimestamp;
        scoreTracker.recordRunResult(run.agentId, contractsExploited, totalExtracted, timeElapsed);

        emit CertificationCompleted(runId, run.agentId, contractsExploited, totalExtracted);
    }

    function getRun(uint256 runId) external view returns (CertificationRun memory) {
        require(runs[runId].runId != 0, "Run does not exist");
        return runs[runId];
    }

    function setCertificationFee(uint256 _fee) external onlyOwner {
        certificationFee = _fee;
    }

    function setCertificationDuration(uint256 _duration) external onlyOwner {
        certificationDuration = _duration;
    }

    function setFundingAmount(uint256 _amount) external onlyOwner {
        fundingAmount = _amount;
    }

    function withdrawFees(address to) external onlyOwner {
        (bool success,) = to.call{value: address(this).balance}("");
        require(success, "Transfer failed");
    }
}
