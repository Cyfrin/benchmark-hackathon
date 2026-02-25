// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {AgentRegistry} from "../../src/benchmark/AgentRegistry.sol";

contract AgentRegistryTest is Test {
    AgentRegistry registry;
    address owner = makeAddr("owner");
    address operator = makeAddr("operator");

    function setUp() public {
        registry = new AgentRegistry();
    }

    function test_registerAgent() public {
        vm.prank(owner);
        uint256 agentId = registry.registerAgent(operator, "Test Agent");

        assertEq(agentId, 1);

        AgentRegistry.Agent memory agent = registry.getAgent(agentId);
        assertEq(agent.id, 1);
        assertEq(agent.owner, owner);
        assertEq(agent.operator, operator);
        assertEq(agent.name, "Test Agent");
        assertTrue(agent.active);
    }

    function test_registerAgent_incrementsId() public {
        vm.prank(owner);
        uint256 id1 = registry.registerAgent(operator, "Agent 1");

        address operator2 = makeAddr("operator2");
        vm.prank(owner);
        uint256 id2 = registry.registerAgent(operator2, "Agent 2");

        assertEq(id1, 1);
        assertEq(id2, 2);
    }

    function test_registerAgent_revertsDuplicateOperator() public {
        vm.prank(owner);
        registry.registerAgent(operator, "Agent 1");

        vm.prank(owner);
        vm.expectRevert("Operator already registered");
        registry.registerAgent(operator, "Agent 2");
    }

    function test_getAgentByOperator() public {
        vm.prank(owner);
        uint256 agentId = registry.registerAgent(operator, "Test Agent");

        AgentRegistry.Agent memory agent = registry.getAgentByOperator(operator);
        assertEq(agent.id, agentId);
        assertEq(agent.operator, operator);
    }

    function test_getAgentByOperator_revertsForUnknown() public {
        vm.expectRevert("No agent for operator");
        registry.getAgentByOperator(makeAddr("unknown"));
    }

    function test_deactivateAgent() public {
        vm.prank(owner);
        uint256 agentId = registry.registerAgent(operator, "Test Agent");

        vm.prank(owner);
        registry.deactivateAgent(agentId);

        AgentRegistry.Agent memory agent = registry.getAgent(agentId);
        assertFalse(agent.active);
    }

    function test_deactivateAgent_revertsNotOwner() public {
        vm.prank(owner);
        uint256 agentId = registry.registerAgent(operator, "Test Agent");

        vm.prank(makeAddr("stranger"));
        vm.expectRevert("Not agent owner");
        registry.deactivateAgent(agentId);
    }

    function test_deactivateAgent_revertsAlreadyDeactivated() public {
        vm.prank(owner);
        uint256 agentId = registry.registerAgent(operator, "Test Agent");

        vm.prank(owner);
        registry.deactivateAgent(agentId);

        vm.prank(owner);
        vm.expectRevert("Already deactivated");
        registry.deactivateAgent(agentId);
    }

    function test_getAgent_revertsForNonexistent() public {
        vm.expectRevert("Agent does not exist");
        registry.getAgent(999);
    }
}
