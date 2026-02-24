// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

interface IWithdrawCallback {
    function onWithdraw(uint256 amount) external;
}
