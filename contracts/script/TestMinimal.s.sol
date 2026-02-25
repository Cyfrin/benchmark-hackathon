// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Script, console} from "forge-std/Script.sol";

contract Minimal {
    uint256 public value;
    constructor() { value = 42; }
}

contract TestMinimal is Script {
    function run() external {
        address deployer = vm.envAddress("DEPLOYER_ADDRESS");
        vm.startBroadcast(deployer);
        Minimal m = new Minimal();
        console.log("Minimal deployed at:", address(m));
        vm.stopBroadcast();
    }
}
