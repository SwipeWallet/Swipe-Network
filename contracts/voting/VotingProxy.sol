pragma solidity ^0.5.0;

import "../SwipeRegistry.sol";

/// @title Voting Proxy Contract
/// @author blockplus (@blockplus)
contract VotingProxy is SwipeRegistry {
    /// @notice Contract constructor
    /// @dev Calls SwipeRegistry contract constructor
    constructor(string memory contractName) public SwipeRegistry(contractName) {}
}
