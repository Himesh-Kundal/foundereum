// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../src/AgentIdentityRegistry.sol";

contract DeployScript {
    function run() external returns (AgentIdentityRegistry registry) {
        registry = new AgentIdentityRegistry();
    }
}
