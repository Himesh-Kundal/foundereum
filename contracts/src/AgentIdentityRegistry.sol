// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC721Receiver {
    function onERC721Received(address operator, address from, uint256 tokenId, bytes calldata data) external returns (bytes4);
}

contract AgentIdentityRegistry {
    string public name = "Foundereum Agent";
    string public symbol = "FNDA";

    struct Agent {
        string agentURI;
        address wallet;
        bytes32 projectHash;
    }

    uint256 public nextId = 1;
    mapping(uint256 => Agent) public agents;
    mapping(address => uint256) public byWallet;
    mapping(uint256 => address) public owners;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event AgentRegistered(uint256 indexed id, address indexed wallet, bytes32 indexed projectHash, string agentURI);

    function register(string calldata agentURI, address wallet, bytes32 projectHash) external returns (uint256 id) {
        require(wallet != address(0), "zero_address");
        require(byWallet[wallet] == 0, "registered");
        id = nextId++;
        agents[id] = Agent(agentURI, wallet, projectHash);
        byWallet[wallet] = id;
        owners[id] = wallet;

        emit Transfer(address(0), wallet, id);
        emit AgentRegistered(id, wallet, projectHash, agentURI);
    }

    function agentIdScheme() external pure returns (string memory) {
        return "foundereum.hedera.v1";
    }

    function ownerOf(uint256 id) public view returns (address) {
        address owner = owners[id];
        require(owner != address(0), "unknown_token");
        return owner;
    }

    function resolve(address wallet) external view returns (uint256 id, string memory uri, address owner) {
        id = byWallet[wallet];
        require(id != 0, "unknown");
        return (id, agents[id].agentURI, owners[id]);
    }
}
