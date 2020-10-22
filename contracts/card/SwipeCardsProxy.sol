pragma solidity ^0.5.0;

import "../SwipeRegistry.sol";
import "./SwipeCardsEvent.sol";

/// @title Swipe Cards Proxy Contract
contract SwipeCardsProxy is SwipeRegistry, SwipeCardsEvent {
    /// @notice Contract constructor
    /// @dev Calls SwipeRegistry contract constructor
    constructor() public SwipeRegistry("Swipe Cards Proxy") {}
}
