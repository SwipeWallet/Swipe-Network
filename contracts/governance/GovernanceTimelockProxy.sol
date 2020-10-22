pragma solidity ^0.5.0;

import "../SwipeRegistry.sol";
import "./GovernanceTimelockEvent.sol";

/// @title Governance Timelock Proxy Contract
contract GovernanceTimelockProxy is SwipeRegistry, GovernanceTimelockEvent {
    /// @notice Contract constructor
    /// @dev Calls SwipeRegistry contract constructor
    constructor() public SwipeRegistry("Swipe Governance Timelock Proxy") {}
}
