pragma solidity ^0.5.0;

import "../Staking.sol";
import "./StorageV2.sol";
import "./EventV2.sol";

/// @title StakingV2 Contract
/// @author growlot (@growlot)
contract StakingV2 is Staking, StorageV2, EventV2 {

    function upcomingFunction(uint256 newValue) external {
        require(
            msg.sender == _owner,
            "Only the owner can call"
        );

        uint256 oldValue = _upcomingValue;
        _upcomingValue = newValue;

        emit UpcomingEvent(
            oldValue,
            _upcomingValue
        );
    }
}