// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IWithdrawCallback {
    function onWithdraw(uint256 amount) external;
}
