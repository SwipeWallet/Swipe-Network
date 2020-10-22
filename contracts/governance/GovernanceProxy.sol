pragma solidity ^0.5.0;

import "../SwipeRegistry.sol";
import "./GovernanceEvent.sol";

/// @title Governance Proxy Contract
contract GovernanceProxy is SwipeRegistry, GovernanceEvent {
    /// @notice Contract constructor
    /// @dev Calls SwipeRegistry contract constructor
    constructor() public SwipeRegistry("Swipe Governance Proxy") {}
}
