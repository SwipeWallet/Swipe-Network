pragma solidity ^0.5.0;

import "../SwipeRegistry.sol";
import "./StakingEventV2.sol";

/// @title Upgradeable Registry Contract
contract StakingProxy is SwipeRegistry, StakingEventV2 {
    /// @notice Contract constructor
    /// @dev Calls SwipeRegistry contract constructor
    constructor() public SwipeRegistry("Swipe Staking Proxy") {}
}
