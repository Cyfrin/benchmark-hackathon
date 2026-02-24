// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {BenchmarkToken} from "../../src/benchmark/BenchmarkToken.sol";
import {AgentRegistry} from "../../src/benchmark/AgentRegistry.sol";
import {ScoreTracker} from "../../src/benchmark/ScoreTracker.sol";
import {BenchmarkController} from "../../src/benchmark/BenchmarkController.sol";
import {VulnerableVault} from "../../src/benchmark/templates/VulnerableVault.sol";
import {WeakAccessControl} from "../../src/benchmark/templates/WeakAccessControl.sol";
import {IntegerOverflow} from "../../src/benchmark/templates/IntegerOverflow.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract BenchmarkControllerTest is Test {
    BenchmarkToken token;
    AgentRegistry registry;
    ScoreTracker scoreTracker;
    BenchmarkController controller;

    address admin = makeAddr("admin");
    address agentOwner = makeAddr("agentOwner");
    address operator = makeAddr("operator");

    uint256 constant FEE = 0.01 ether;

    function setUp() public {
        vm.startPrank(admin);

        token = new BenchmarkToken();
        registry = new AgentRegistry();
        // We need controller address for ScoreTracker, but controller needs scoreTracker address.
        // Deploy controller first, then scoreTracker, then set up.
        // Actually: ScoreTracker takes controller address. So we need to predict or deploy controller first.
        // Solution: deploy a placeholder, or compute address. Let's use CREATE with nonce prediction.

        // Compute future controller address (admin nonce = 2 after token + registry deployments)
        // Actually nonces: token=0, registry=1, scoreTracker=2, controller=3
        uint256 controllerNonce = vm.getNonce(admin) + 1; // +1 because scoreTracker is next
        address predictedController = vm.computeCreateAddress(admin, controllerNonce);

        scoreTracker = new ScoreTracker(predictedController);
        controller = new BenchmarkController(token, registry, scoreTracker, FEE);
        assertEq(address(controller), predictedController);

        // Transfer token ownership to controller so it can mint
        token.transferOwnership(address(controller));

        // Add templates
        controller.addTemplate(type(VulnerableVault).creationCode);
        controller.addTemplate(type(WeakAccessControl).creationCode);
        controller.addTemplate(type(IntegerOverflow).creationCode);

        vm.stopPrank();

        // Register an agent
        vm.prank(agentOwner);
        registry.registerAgent(operator, "ipfs://test-agent");
    }

    function test_addTemplate() public view {
        assertEq(controller.templateCount(), 3);
    }

    function test_addTemplate_onlyOwner() public {
        vm.prank(makeAddr("stranger"));
        vm.expectRevert();
        controller.addTemplate(type(VulnerableVault).creationCode);
    }

    function test_requestCertificationRun() public {
        vm.deal(agentOwner, 1 ether);
        vm.prank(agentOwner);
        uint256 runId = controller.requestCertificationRun{value: FEE}(1);

        assertEq(runId, 1);

        BenchmarkController.CertificationRun memory run = controller.getRun(runId);
        assertEq(run.agentId, 1);
        assertEq(run.deployedContracts.length, 3);
        assertFalse(run.completed);

        // Each deployed contract should have funding
        for (uint256 i = 0; i < run.deployedContracts.length; i++) {
            assertEq(token.balanceOf(run.deployedContracts[i]), controller.fundingAmount());
        }
    }

    function test_requestCertificationRun_operatorCanStart() public {
        vm.deal(operator, 1 ether);
        vm.prank(operator);
        uint256 runId = controller.requestCertificationRun{value: FEE}(1);
        assertEq(runId, 1);
    }

    function test_requestCertificationRun_insufficientFee() public {
        vm.deal(agentOwner, 1 ether);
        vm.prank(agentOwner);
        vm.expectRevert("Insufficient fee");
        controller.requestCertificationRun{value: FEE - 1}(1);
    }

    function test_requestCertificationRun_inactiveAgent() public {
        vm.prank(agentOwner);
        registry.deactivateAgent(1);

        vm.deal(agentOwner, 1 ether);
        vm.prank(agentOwner);
        vm.expectRevert("Agent not active");
        controller.requestCertificationRun{value: FEE}(1);
    }

    function test_completeRun_afterDeadline() public {
        vm.deal(agentOwner, 1 ether);
        vm.prank(agentOwner);
        uint256 runId = controller.requestCertificationRun{value: FEE}(1);

        // Warp past deadline
        vm.warp(block.timestamp + 24 hours + 1);

        controller.completeRun(runId);

        BenchmarkController.CertificationRun memory run = controller.getRun(runId);
        assertTrue(run.completed);
    }

    function test_completeRun_revertBeforeDeadlineIfNotDrained() public {
        vm.deal(agentOwner, 1 ether);
        vm.prank(agentOwner);
        uint256 runId = controller.requestCertificationRun{value: FEE}(1);

        vm.expectRevert("Run still active");
        controller.completeRun(runId);
    }

    function test_completeRun_revertsAlreadyCompleted() public {
        vm.deal(agentOwner, 1 ether);
        vm.prank(agentOwner);
        uint256 runId = controller.requestCertificationRun{value: FEE}(1);

        vm.warp(block.timestamp + 24 hours + 1);
        controller.completeRun(runId);

        vm.expectRevert("Already completed");
        controller.completeRun(runId);
    }

    function test_withdrawFees() public {
        vm.deal(agentOwner, 1 ether);
        vm.prank(agentOwner);
        controller.requestCertificationRun{value: FEE}(1);

        address recipient = makeAddr("recipient");
        vm.prank(admin);
        controller.withdrawFees(recipient);
        assertEq(recipient.balance, FEE);
    }
}
