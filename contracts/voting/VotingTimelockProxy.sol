pragma solidity ^0.5.0;

import "../SwipeRegistry.sol";

/// @title Voting Timelock Proxy Contract
/// @author blockplus (@blockplus)
contract VotingTimelockProxy is SwipeRegistry {
    /// @notice Contract constructor
    /// @dev Calls SwipeRegistry contract constructor
    constructor() public SwipeRegistry("Swipe Voting Timelock Proxy") {}
}
