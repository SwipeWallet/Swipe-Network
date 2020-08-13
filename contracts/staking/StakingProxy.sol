pragma solidity ^0.5.0;

import "../SwipeRegistry.sol";

/// @title Upgradeable Registry Contract
/// @author growlot (@growlot)
contract StakingProxy is SwipeRegistry {
    /// @notice Contract constructor
    /// @dev Calls SwipeRegistry contract constructor
    constructor(string memory contractName) public SwipeRegistry(contractName) {}
}
