pragma solidity ^0.5.0;

import "../SwipeRegistry.sol";
import "./VotingEvent.sol";

/// @title Voting Proxy Contract
/// @author blockplus (@blockplus)
contract VotingProxy is SwipeRegistry, VotingEvent {
    /// @notice Contract constructor
    /// @dev Calls SwipeRegistry contract constructor
    constructor() public SwipeRegistry("Swipe Voting Proxy") {}
}
