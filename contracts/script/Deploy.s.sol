// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Script, console} from "forge-std/Script.sol";
import {BenchmarkToken} from "../src/benchmark/BenchmarkToken.sol";
import {AgentRegistry} from "../src/benchmark/AgentRegistry.sol";
import {ScoreTracker} from "../src/benchmark/ScoreTracker.sol";
import {BenchmarkController} from "../src/benchmark/BenchmarkController.sol";
import {VulnerableVault} from "../src/benchmark/templates/VulnerableVault.sol";
import {WeakAccessControl} from "../src/benchmark/templates/WeakAccessControl.sol";
import {IntegerOverflow} from "../src/benchmark/templates/IntegerOverflow.sol";

contract Deploy is Script {
    uint256 constant CERTIFICATION_FEE = 0.01 ether;

    function run() external {
        // Deployer address passed via env so we can predict nonces correctly.
        // This must match the --account used with forge script.
        address deployer = vm.envAddress("DEPLOYER_ADDRESS");

        vm.startBroadcast(deployer);

        // 1. Deploy BenchmarkToken
        BenchmarkToken token = new BenchmarkToken();
        console.log("BenchmarkToken:", address(token));

        // 2. Deploy AgentRegistry
        AgentRegistry registry = new AgentRegistry();
        console.log("AgentRegistry:", address(registry));

        // 3. Predict BenchmarkController address so ScoreTracker can reference it
        //    After deploying token + registry, deployer nonce has advanced by 2.
        //    Next deploy (ScoreTracker) uses current nonce, Controller uses current+1.
        uint256 controllerNonce = vm.getNonce(deployer) + 1;
        address predictedController = vm.computeCreateAddress(deployer, controllerNonce);

        // 4. Deploy ScoreTracker (needs controller address)
        ScoreTracker scoreTracker = new ScoreTracker(predictedController);
        console.log("ScoreTracker:", address(scoreTracker));

        // 5. Deploy BenchmarkController
        BenchmarkController controller = new BenchmarkController(
            token, registry, scoreTracker, CERTIFICATION_FEE
        );
        require(address(controller) == predictedController, "Controller address mismatch");
        console.log("BenchmarkController:", address(controller));

        // 6. Transfer token ownership to controller (so it can mint)
        token.transferOwnership(address(controller));
        console.log("Token ownership transferred to controller");

        // 7. Add vulnerable contract templates
        controller.addTemplate(type(VulnerableVault).creationCode);
        console.log("Added template: VulnerableVault");

        controller.addTemplate(type(WeakAccessControl).creationCode);
        console.log("Added template: WeakAccessControl");

        controller.addTemplate(type(IntegerOverflow).creationCode);
        console.log("Added template: IntegerOverflow");

        vm.stopBroadcast();

        console.log("");
        console.log("=== Deployment Complete ===");
        console.log("BenchmarkToken:      ", address(token));
        console.log("AgentRegistry:       ", address(registry));
        console.log("ScoreTracker:        ", address(scoreTracker));
        console.log("BenchmarkController: ", address(controller));
        console.log("");
        console.log("Next steps:");
        console.log("1. Request a certification run to deploy template instances");
        console.log("2. Run ./script/verify-templates.sh with the deployed template addresses");
    }
}
