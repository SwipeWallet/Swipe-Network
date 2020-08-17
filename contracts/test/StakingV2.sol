pragma solidity ^0.5.0;

import "../staking/Staking.sol";
import "./StakingStorageV2.sol";
import "./StakingEventV2.sol";

/// @title StakingV2 Contract
/// @author growlot (@growlot)
contract StakingV2 is Staking, StakingStorageV2, StakingEventV2 {

    function upcomingFunction(uint256 newValue) external {
        require(
            msg.sender == _guardian,
            "Only the guardian can call"
        );

        uint256 oldValue = _upcomingValue;
        _upcomingValue = newValue;

        emit UpcomingEvent(
            oldValue,
            _upcomingValue
        );
    }
}