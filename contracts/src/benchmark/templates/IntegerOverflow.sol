// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract IntegerOverflow {
    IERC20 public immutable token;
    uint256 public immutable deadline;
    mapping(address => uint256) public balances;

    constructor(IERC20 _token, uint256 _deadline) {
        token = _token;
        deadline = _deadline;
    }

    function deposit(uint256 amount) external {
        require(block.timestamp <= deadline, "Expired");
        token.transferFrom(msg.sender, address(this), amount);
        balances[msg.sender] += amount;
    }

    function withdraw(uint256 amount) external {
        require(block.timestamp <= deadline, "Expired");
        // BUG: unchecked underflow allows draining without deposit
        unchecked {
            balances[msg.sender] -= amount;
        }
        token.transfer(msg.sender, amount);
    }
}
