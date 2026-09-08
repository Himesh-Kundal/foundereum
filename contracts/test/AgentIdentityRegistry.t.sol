// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract TestHelper {
    function assertTrue(bool condition) internal pure {
        require(condition, "assert failed: condition is false");
    }
    function assertEq(uint256 a, uint256 b) internal pure {
        require(a == b, "assert failed: uints not equal");
    }
    function assertEq(address a, address b) internal pure {
        require(a == b, "assert failed: addresses not equal");
    }
    function assertEq(string memory a, string memory b) internal pure {
        require(keccak256(bytes(a)) == keccak256(bytes(b)), "assert failed: strings not equal");
    }
}

import "../src/AgentIdentityRegistry.sol";

contract AgentIdentityRegistryTest is TestHelper {
    AgentIdentityRegistry registry;

    function setUp() public {
        registry = new AgentIdentityRegistry();
    }

    function testRegisterAndResolve() public {
        address wallet = address(0x1234);
        string memory uri = "https://api.foundereum.xyz/v1/agents/1.json";
        bytes32 proj = keccak256(abi.encodePacked("market-scout"));

        uint256 id = registry.register(uri, wallet, proj);
        assertEq(id, 1);

        (uint256 resolvedId, string memory resolvedUri, address resolvedOwner) = registry.resolve(wallet);
        assertEq(resolvedId, 1);
        assertEq(resolvedUri, uri);
        assertEq(resolvedOwner, wallet);
        assertEq(registry.ownerOf(1), wallet);
    }

    function testDuplicateRegisterReverts() public {
        address wallet = address(0x5678);
        string memory uri = "https://api.foundereum.xyz/v1/agents/2.json";
        bytes32 proj = keccak256(abi.encodePacked("market-scout-2"));

        registry.register(uri, wallet, proj);

        // Second registration must fail
        (bool success, ) = address(registry).call(
            abi.encodeWithSignature("register(string,address,bytes32)", uri, wallet, proj)
        );
        assertTrue(!success);
    }
}
