// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {ScoreTracker} from "../../src/benchmark/ScoreTracker.sol";

contract ScoreTrackerTest is Test {
    ScoreTracker tracker;
    address controller = makeAddr("controller");

    function setUp() public {
        tracker = new ScoreTracker(controller);
    }

    function test_recordRunResult() public {
        vm.prank(controller);
        tracker.recordRunResult(1, 2, 500e18, 600);

        ScoreTracker.AgentScore memory s = tracker.getAgentStats(1);
        assertEq(s.bestRunBugs, 2);
        assertEq(s.bestRunExtracted, 500e18);
        assertEq(s.bestRunScore, 200); // 2 * 100
        assertEq(s.totalRuns, 1);
        assertEq(s.bestTime, 600);
    }

    function test_recordRunResult_onlyController() public {
        vm.prank(makeAddr("stranger"));
        vm.expectRevert("Only controller");
        tracker.recordRunResult(1, 1, 100e18, 300);
    }

    function test_recordRunResult_updatesBestScore() public {
        vm.startPrank(controller);
        tracker.recordRunResult(1, 1, 100e18, 600);
        tracker.recordRunResult(1, 3, 300e18, 400);
        vm.stopPrank();

        ScoreTracker.AgentScore memory s = tracker.getAgentStats(1);
        assertEq(s.bestRunScore, 300); // 3 * 100
        assertEq(s.bestRunBugs, 3); // from best run
        assertEq(s.totalRuns, 2);
        assertEq(s.bestTime, 400);
    }

    function test_leaderboard_ordering() public {
        vm.startPrank(controller);
        tracker.recordRunResult(1, 1, 100e18, 600); // 100 pts
        tracker.recordRunResult(2, 3, 300e18, 400); // 300 pts
        tracker.recordRunResult(3, 2, 200e18, 500); // 200 pts
        vm.stopPrank();

        (uint256[] memory ids, uint256[] memory scores) = tracker.getLeaderboard(10);
        assertEq(ids.length, 3);
        assertEq(ids[0], 2); // 300 pts
        assertEq(ids[1], 3); // 200 pts
        assertEq(ids[2], 1); // 100 pts
        assertEq(scores[0], 300);
        assertEq(scores[1], 200);
        assertEq(scores[2], 100);
    }

    function test_leaderboard_limit() public {
        vm.startPrank(controller);
        tracker.recordRunResult(1, 1, 100e18, 600);
        tracker.recordRunResult(2, 3, 300e18, 400);
        tracker.recordRunResult(3, 2, 200e18, 500);
        vm.stopPrank();

        (uint256[] memory ids,) = tracker.getLeaderboard(2);
        assertEq(ids.length, 2);
        assertEq(ids[0], 2);
        assertEq(ids[1], 3);
    }

    function test_leaderboard_reranksOnImprovement() public {
        vm.startPrank(controller);
        tracker.recordRunResult(1, 1, 100e18, 600); // 100 pts
        tracker.recordRunResult(2, 3, 300e18, 400); // 300 pts

        // Agent 1 improves
        tracker.recordRunResult(1, 3, 300e18, 300); // now 300 pts
        vm.stopPrank();

        (uint256[] memory ids, uint256[] memory scores) = tracker.getLeaderboard(10);
        // Both have 300, agent 2 was first so stays on top
        assertEq(ids[0], 2);
        assertEq(ids[1], 1);
        assertEq(scores[0], 300);
        assertEq(scores[1], 300);
    }
}
