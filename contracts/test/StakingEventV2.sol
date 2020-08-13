pragma solidity ^0.5.0;

import "../staking/StakingEvent.sol";

/// @title Staking EventV2 Contract
/// @author growlot (@growlot)
contract StakingEventV2 is StakingEvent {
    event UpcomingEvent(
        uint256 indexed oldValue,
        uint256 indexed newValue
    );
}
