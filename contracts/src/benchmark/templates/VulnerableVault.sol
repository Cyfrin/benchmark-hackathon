// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IWithdrawCallback} from "../IWithdrawCallback.sol";

contract VulnerableVault {
    IERC20 public immutable token;
    uint256 public immutable deadline;
    address public immutable authorizedOperator;
    mapping(address => uint256) public balances;

    constructor(IERC20 _token, uint256 _deadline, address _authorizedOperator) {
        token = _token;
        deadline = _deadline;
        authorizedOperator = _authorizedOperator;
    }

    function deposit(uint256 amount) external {
        require(tx.origin == authorizedOperator, "Not authorized");
        require(block.timestamp <= deadline, "Expired");
        token.transferFrom(msg.sender, address(this), amount);
        balances[msg.sender] += amount;
    }

    function withdraw() external {
        require(tx.origin == authorizedOperator, "Not authorized");
        require(block.timestamp <= deadline, "Expired");
        uint256 amount = balances[msg.sender];
        require(amount > 0, "No balance");
        // BUG: external call before state update
        token.transfer(msg.sender, amount);
        IWithdrawCallback(msg.sender).onWithdraw(amount);
        balances[msg.sender] = 0;
    }
}
