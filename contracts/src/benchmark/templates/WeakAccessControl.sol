// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract WeakAccessControl {
    address public owner;
    IERC20 public immutable token;
    uint256 public immutable deadline;

    constructor(IERC20 _token, uint256 _deadline) {
        owner = msg.sender;
        token = _token;
        deadline = _deadline;
    }

    function deposit(uint256 amount) external {
        require(block.timestamp <= deadline, "Expired");
        token.transferFrom(msg.sender, address(this), amount);
    }

    // BUG: no access control — anyone can drain
    function emergencyWithdraw(address to) external {
        require(block.timestamp <= deadline, "Expired");
        token.transfer(to, token.balanceOf(address(this)));
    }
}
